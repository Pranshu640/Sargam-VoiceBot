// ============================================================
// Sargam AI — LLM Engine (Groq API — Free Tier)
// Uses Llama 3.3 70B via Groq for ultra-fast inference
// ============================================================

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

const DEFAULT_CONFIG: LLMConfig = {
  model: 'llama-3.3-70b-versatile',
  temperature: 0.7,
  maxTokens: 300, // Keep responses short for voice
  stream: true,
};

export class LLMEngine {
  private config: LLMConfig;

  constructor(config?: Partial<LLMConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Send messages to Groq API via our Next.js API route (keeps API key server-side)
   */
  async chat(messages: LLMMessage[]): Promise<string> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`LLM API error: ${response.status} — ${err}`);
    }

    const data = await response.json();
    return data.content;
  }

  /**
   * Stream response from Groq API for real-time TTS
   */
  async *chatStream(messages: LLMMessage[]): AsyncGenerator<string> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`LLM API error: ${response.status} — ${err}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Ignore parse errors in stream
          }
        }
      }
    }
  }

  /**
   * Analyze sentiment of text (simple keyword-based for MVP)
   */
  static analyzeSentiment(text: string): number {
    const lower = text.toLowerCase();
    const positiveWords = ['thank', 'good', 'great', 'happy', 'excellent', 'helpful', 'nice', 'dhanyavaad', 'accha', 'bahut', 'shukriya'];
    const negativeWords = ['bad', 'terrible', 'angry', 'frustrated', 'worst', 'complaint', 'problem', 'issue', 'shikayat', 'kharab', 'bura'];

    let score = 0;
    positiveWords.forEach(w => { if (lower.includes(w)) score += 0.2; });
    negativeWords.forEach(w => { if (lower.includes(w)) score -= 0.2; });

    return Math.max(-1, Math.min(1, score));
  }

  /**
   * Detect intent from user message
   */
  static detectIntent(text: string): string {
    const lower = text.toLowerCase();
    if (lower.match(/complaint|grievance|shikayat|problem|issue/)) return 'grievance';
    if (lower.match(/bill|payment|amount|paisa|rupee/)) return 'billing';
    if (lower.match(/appointment|schedule|book|samay/)) return 'appointment';
    if (lower.match(/status|track|ticket|update/)) return 'status_check';
    if (lower.match(/scheme|yojana|subsidy|benefit/)) return 'scheme_inquiry';
    if (lower.match(/hello|hi|namaskar|namaste/)) return 'greeting';
    if (lower.match(/bye|thank|ok|end|done/)) return 'closing';
    if (lower.match(/help|madad|sahayata/)) return 'help';
    if (lower.match(/human|agent|person|operator/)) return 'escalation';
    return 'general_query';
  }
}
