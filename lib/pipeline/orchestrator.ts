// ============================================================
// Sargam AI — Pipeline Orchestrator
// Coordinates STT → LLM → TTS in a cascading pipeline
// ============================================================

import { SpeechToTextEngine } from './stt';
import { LLMEngine, LLMMessage } from './llm';
import { TextToSpeechEngine } from './tts';
import { getSystemPrompt } from '../prompts';
import { TranscriptEntry, PipelineConfig } from '@/types';

export type PipelineState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export interface PipelineCallbacks {
  onStateChange: (state: PipelineState) => void;
  onTranscript: (entry: TranscriptEntry) => void;
  onInterimTranscript: (text: string) => void;
  onSentimentUpdate: (sentiment: number) => void;
  onIntentDetected: (intent: string) => void;
  onError: (error: string) => void;
  onEscalation: () => void;
}

export class PipelineOrchestrator {
  private stt: SpeechToTextEngine | null = null;
  private llm: LLMEngine;
  private tts: TextToSpeechEngine | null = null;
  private config: PipelineConfig;
  private callbacks: PipelineCallbacks;
  private conversationHistory: LLMMessage[] = [];
  private state: PipelineState = 'idle';
  private isRunning: boolean = false;
  private lowConfidenceCount: number = 0;
  private sameIntentCount: number = 0;
  private lastIntent: string = '';
  private turnCount: number = 0;

  constructor(config: PipelineConfig, callbacks: PipelineCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
    this.llm = new LLMEngine({ maxTokens: 200 });

    // Initialize conversation with system prompt
    const systemPrompt = getSystemPrompt(
      config.useCase === 'outbound_survey' ? 'outbound_survey'
        : config.useCase === 'outbound_outreach' ? 'outbound_outreach'
          : config.useCase === 'grievance' ? 'grievance'
            : 'inbound',
      config.campaignScript
    );

    this.conversationHistory = [
      { role: 'system', content: systemPrompt },
    ];
  }

  private setState(state: PipelineState) {
    this.state = state;
    this.callbacks.onStateChange(state);
  }

  async start(): Promise<boolean> {
    if (this.isRunning) return true;

    // Initialize STT
    if (!SpeechToTextEngine.isSupported()) {
      this.callbacks.onError('Speech recognition not supported. Please use Chrome.');
      return false;
    }

    this.stt = new SpeechToTextEngine({
      language: this.config.language,
      continuous: true,
      interimResults: true,
      onResult: (text, isFinal) => this.handleSTTResult(text, isFinal),
      onError: (error) => this.callbacks.onError(error),
      onEnd: () => {
        if (this.isRunning && this.state === 'listening') {
          // Restart listening if we should still be active
          this.stt?.start();
        }
      },
    });

    // Initialize TTS
    this.tts = new TextToSpeechEngine({
      language: this.config.language,
      rate: 1.0,
      voiceGender: this.config.voiceGender,
      onStart: () => this.setState('speaking'),
      onEnd: () => {
        if (this.isRunning) {
          this.setState('listening');
          this.stt?.start();
        }
      },
      onError: (error) => this.callbacks.onError(error),
    });

    this.isRunning = true;
    this.setState('listening');

    // Start with an AI greeting
    await this.generateGreeting();

    return true;
  }

  private async generateGreeting() {
    this.setState('processing');

    // Stop listening while processing
    this.stt?.stop();

    try {
      const greetingPrompt = this.config.useCase.startsWith('outbound')
        ? 'The call has connected. Introduce yourself and state the purpose of your call briefly.'
        : 'A caller has connected. Greet them warmly and ask how you can help.';

      this.conversationHistory.push({ role: 'user', content: greetingPrompt });

      const response = await this.llm.chat(this.conversationHistory);
      this.conversationHistory.push({ role: 'assistant', content: response });

      // Add to transcript
      const entry: TranscriptEntry = {
        role: 'agent',
        text: response,
        timestamp: Date.now(),
        language: this.config.language,
      };
      this.callbacks.onTranscript(entry);

      // Speak the greeting
      this.tts?.speak(response);
    } catch (error) {
      this.callbacks.onError(`Failed to generate greeting: ${error}`);
      this.setState('listening');
      this.stt?.start();
    }
  }

  private async handleSTTResult(text: string, isFinal: boolean) {
    if (!isFinal) {
      this.callbacks.onInterimTranscript(text);
      return;
    }

    if (text.trim().length < 2) return; // Ignore very short utterances

    // Stop listening while processing
    this.stt?.stop();
    this.setState('processing');

    // Add user message to transcript
    const userEntry: TranscriptEntry = {
      role: 'user',
      text: text.trim(),
      timestamp: Date.now(),
      language: this.config.language,
    };
    this.callbacks.onTranscript(userEntry);

    // Analyze sentiment and intent
    const sentiment = LLMEngine.analyzeSentiment(text);
    this.callbacks.onSentimentUpdate(sentiment);

    const intent = LLMEngine.detectIntent(text);
    this.callbacks.onIntentDetected(intent);

    // Check escalation conditions
    if (this.shouldEscalate(intent, sentiment)) {
      await this.handleEscalation();
      return;
    }

    // Process with LLM
    try {
      this.conversationHistory.push({ role: 'user', content: text.trim() });

      const response = await this.llm.chat(this.conversationHistory);
      this.conversationHistory.push({ role: 'assistant', content: response });

      // Add agent response to transcript
      const agentEntry: TranscriptEntry = {
        role: 'agent',
        text: response,
        timestamp: Date.now(),
        language: this.config.language,
      };
      this.callbacks.onTranscript(agentEntry);

      this.turnCount++;

      // Speak response
      this.tts?.speak(response);
    } catch (error) {
      this.callbacks.onError(`LLM processing failed: ${error}`);
      this.setState('listening');
      this.stt?.start();
    }
  }

  private shouldEscalate(intent: string, sentiment: number): boolean {
    // User explicitly requests human
    if (intent === 'escalation') return true;

    // Sentiment too negative for 2+ turns
    if (sentiment < -0.5) {
      this.lowConfidenceCount++;
      if (this.lowConfidenceCount >= 2) return true;
    } else {
      this.lowConfidenceCount = 0;
    }

    // Same intent repeated 3+ times (loop detection)
    if (intent === this.lastIntent && intent !== 'greeting' && intent !== 'closing') {
      this.sameIntentCount++;
      if (this.sameIntentCount >= 3) return true;
    } else {
      this.sameIntentCount = 0;
    }
    this.lastIntent = intent;

    // Max conversation length
    if (this.turnCount > 20) return true;

    return false;
  }

  private async handleEscalation() {
    const escalationMessage = "I understand you'd like to speak with a human agent. Let me transfer you now. Your conversation details will be shared with the agent so you don't have to repeat yourself. Please hold for a moment.";

    const entry: TranscriptEntry = {
      role: 'agent',
      text: escalationMessage,
      timestamp: Date.now(),
      language: this.config.language,
    };
    this.callbacks.onTranscript(entry);
    this.callbacks.onEscalation();

    this.tts?.speak(escalationMessage);
  }

  stop(): void {
    this.isRunning = false;
    this.stt?.stop();
    this.tts?.stop();
    this.setState('idle');
  }

  mute(): void {
    this.stt?.stop();
  }

  unmute(): void {
    if (this.isRunning && this.state === 'listening') {
      this.stt?.start();
    }
  }

  getState(): PipelineState {
    return this.state;
  }

  getConversationHistory(): LLMMessage[] {
    return [...this.conversationHistory];
  }

  getTurnCount(): number {
    return this.turnCount;
  }
}
