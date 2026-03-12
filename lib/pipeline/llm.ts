// ============================================================
// Sargam AI — LLM Engine (Groq API — Free Tier)
// Uses Llama 3.3 70B via Groq for ultra-fast inference
// Supports tool calling / function calling
// ============================================================

import { TOOL_DEFINITIONS } from '../prompts';
import type { ToolCallResult } from '@/types';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: GroqToolCall[];
  tool_call_id?: string;
}

export interface GroqToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface LLMConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  enableTools?: boolean;
}

export interface LLMResponse {
  content: string;
  toolCalls: ToolCallResult[];
  finishReason: string;
}

const DEFAULT_CONFIG: LLMConfig = {
  model: 'llama-3.3-70b-versatile',
  temperature: 0.7,
  maxTokens: 300,
  stream: false,
  enableTools: true,
};

export class LLMEngine {
  private config: LLMConfig;

  constructor(config?: Partial<LLMConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Send messages to Groq API via our Next.js API route.
   * Returns content + any tool calls the model wants to make.
   */
  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const body: Record<string, unknown> = {
      messages: messages.map((m) => {
        const msg: Record<string, unknown> = { role: m.role, content: m.content };
        if (m.tool_calls) msg.tool_calls = m.tool_calls;
        if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
        return msg;
      }),
      model: this.config.model,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      stream: false,
    };

    // Include tool definitions
    if (this.config.enableTools) {
      body.tools = TOOL_DEFINITIONS;
      body.tool_choice = 'auto';
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`LLM API error: ${response.status} — ${err}`);
    }

    const data = await response.json();

    // Parse tool calls
    const toolCalls: ToolCallResult[] = [];
    if (data.tool_calls && Array.isArray(data.tool_calls)) {
      for (const tc of data.tool_calls) {
        try {
          const args = JSON.parse(tc.function.arguments);
          toolCalls.push({
            name: tc.function.name,
            arguments: args,
          });
        } catch {
          // Skip malformed tool calls
        }
      }
    }

    return {
      content: data.content || '',
      toolCalls,
      finishReason: data.finish_reason || 'stop',
    };
  }

  /**
   * Get the raw tool_calls from the API response for conversation history
   */
  async chatRaw(messages: LLMMessage[]): Promise<{
    content: string | null;
    toolCalls: GroqToolCall[] | null;
    parsedToolCalls: ToolCallResult[];
    finishReason: string;
  }> {
    const body: Record<string, unknown> = {
      messages: messages.map((m) => {
        const msg: Record<string, unknown> = { role: m.role, content: m.content };
        if (m.tool_calls) msg.tool_calls = m.tool_calls;
        if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
        return msg;
      }),
      model: this.config.model,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      stream: false,
    };

    if (this.config.enableTools) {
      body.tools = TOOL_DEFINITIONS;
      body.tool_choice = 'auto';
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`LLM API error: ${response.status} — ${err}`);
    }

    const data = await response.json();

    const parsedToolCalls: ToolCallResult[] = [];
    if (data.tool_calls && Array.isArray(data.tool_calls)) {
      for (const tc of data.tool_calls) {
        try {
          const args = JSON.parse(tc.function.arguments);
          parsedToolCalls.push({
            name: tc.function.name,
            arguments: args,
          });
        } catch {
          // Skip malformed
        }
      }
    }

    return {
      content: data.content,
      toolCalls: data.tool_calls || null,
      parsedToolCalls,
      finishReason: data.finish_reason || 'stop',
    };
  }

  /**
   * Analyze sentiment of text (simple keyword-based for MVP)
   */
  static analyzeSentiment(text: string): number {
    const lower = text.toLowerCase();
    const positiveWords = [
      'thank', 'good', 'great', 'happy', 'excellent', 'helpful', 'nice', 'love', 'amazing', 'wonderful',
      'dhanyavaad', 'accha', 'bahut', 'shukriya', 'badiya', 'zabardast',
    ];
    const negativeWords = [
      'bad', 'terrible', 'angry', 'frustrated', 'worst', 'complaint', 'problem', 'issue', 'hate', 'awful',
      'shikayat', 'kharab', 'bura', 'galat', 'pareshan',
    ];

    let score = 0;
    positiveWords.forEach((w) => {
      if (lower.includes(w)) score += 0.2;
    });
    negativeWords.forEach((w) => {
      if (lower.includes(w)) score -= 0.2;
    });

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
    if (lower.match(/bye|goodbye|alvida|see you|done|that's all|bas/)) return 'closing';
    if (lower.match(/help|madad|sahayata/)) return 'help';
    if (lower.match(/human|agent|person|operator|insaan/)) return 'escalation';
    if (lower.match(/price|cost|pricing|kitna|rate/)) return 'pricing';
    if (lower.match(/feature|kya kar|what can|capable/)) return 'feature_inquiry';
    if (lower.match(/language|bhasha|hindi|tamil|telugu/)) return 'language_inquiry';
    return 'general_query';
  }
}
