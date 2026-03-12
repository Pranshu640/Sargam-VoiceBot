// ============================================================
// Sargam AI - Pipeline Orchestrator
// Coordinates STT -> LLM -> TTS in a cascading pipeline
// Supports: tool calling, auto-terminate, interruption, VAD
//
// Fixed:
//   - Integrated VAD for accurate speech start/end detection
//   - Greeting prompt uses system-level instruction (not fake user message)
//   - Orchestrator is sole owner of STT restart logic (no double-restart)
//   - Added setTTSMuted() for actual mute control
//   - STT auto-restarts on end when in listening state
// ============================================================

import { SpeechToTextEngine } from './stt';
import { LLMEngine, LLMMessage, GroqToolCall } from './llm';
import { TextToSpeechEngine } from './tts';
import { VoiceActivityDetector } from './vad';
import { getSystemPrompt } from '../prompts';
import {
  TranscriptEntry,
  PipelineConfig,
  ToolCallResult,
  LiveSheetField,
  LiveSheetNote,
  LiveSheetTicket,
} from '@/types';

export type PipelineState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export interface PipelineCallbacks {
  onStateChange: (state: PipelineState) => void;
  onTranscript: (entry: TranscriptEntry) => void;
  onInterimTranscript: (text: string) => void;
  onSentimentUpdate: (sentiment: number) => void;
  onIntentDetected: (intent: string) => void;
  onError: (error: string) => void;
  onEscalation: (reason: string, priority: string) => void;
  onEndCall: (reason: string, summary: string) => void;
  onExtractedInfo: (field: LiveSheetField) => void;
  onLiveSheetNote: (note: LiveSheetNote) => void;
  onTicketCreated: (ticket: LiveSheetTicket) => void;
  onToolCall: (tool: ToolCallResult) => void;
}

export class PipelineOrchestrator {
  private stt: SpeechToTextEngine | null = null;
  private llm: LLMEngine;
  private tts: TextToSpeechEngine | null = null;
  private vad: VoiceActivityDetector | null = null;
  private config: PipelineConfig;
  private callbacks: PipelineCallbacks;
  private conversationHistory: LLMMessage[] = [];
  private state: PipelineState = 'idle';
  private isRunning: boolean = false;
  private turnCount: number = 0;
  private ticketCounter: number = 0;

  // Track whether we are currently processing a turn to avoid double-processing
  private isProcessingTurn: boolean = false;

  // Track the latest interim transcript from STT for VAD-assisted finalization
  private latestInterimText: string = '';

  constructor(config: PipelineConfig, callbacks: PipelineCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
    this.llm = new LLMEngine({ maxTokens: 300, enableTools: true });

    // Initialize conversation with system prompt
    const systemPrompt = getSystemPrompt(config.useCase, config.campaignScript);

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
        // STT ended (browser killed it after timeout, or other reason).
        // If we are still supposed to be listening, restart it.
        if (this.isRunning && this.state === 'listening') {
          // Small delay to avoid rapid restart loops
          setTimeout(() => {
            if (this.isRunning && this.state === 'listening') {
              this.stt?.start();
            }
          }, 100);
        }
      },
    });

    // Initialize TTS with interruption support
    this.tts = new TextToSpeechEngine({
      language: this.config.language,
      rate: 1.0,
      voiceGender: this.config.voiceGender,
      onStart: () => this.setState('speaking'),
      onEnd: () => {
        if (this.isRunning) {
          this.setState('listening');
          this.ensureSTTActive();
        }
      },
      onError: (error) => this.callbacks.onError(error),
    });

    // Initialize VAD
    this.vad = new VoiceActivityDetector(
      {
        onSpeechStart: () => {
          // User started speaking - interrupt AI if speaking
          if (this.state === 'speaking') {
            this.interrupt();
          }
          // Ensure STT is active to capture what the user is saying
          this.ensureSTTActive();
        },
        onSpeechEnd: () => {
          // VAD detected end of speech.
          // If STT hasn't produced a final result yet but we have interim text,
          // give STT a moment to finalize, then process what we have.
          if (this.latestInterimText && !this.isProcessingTurn && this.state === 'listening') {
            // Wait a short time for STT to produce a final result
            setTimeout(() => {
              // If still not processing and we still have unprocessed interim text
              if (!this.isProcessingTurn && this.latestInterimText && this.state === 'listening') {
                // Treat interim text as final
                this.handleSTTResult(this.latestInterimText, true);
              }
            }, 500);
          }
        },
        onVADMisfire: () => {
          // Speech was too short - just a noise/click. Ignore.
        },
        onError: (error) => {
          // VAD errors are non-fatal - the system works without VAD too
          console.warn('[Sargam VAD]', error);
        },
      },
      {
        // Tuned to reject background noise — only trigger on clear speech
        positiveSpeechThreshold: 0.8,
        negativeSpeechThreshold: 0.5,
        redemptionMs: 800,
        minSpeechMs: 400,
        preSpeechPadMs: 300,
      },
    );

    this.isRunning = true;
    this.setState('listening');

    // Start VAD (non-blocking - VAD failing should not block the pipeline)
    this.vad.start().catch((err) => {
      console.warn('[Sargam] VAD failed to start, continuing without it:', err);
    });

    // Start with an AI greeting
    await this.generateGreeting();

    return true;
  }

  /**
   * Ensure STT is active. Safe to call multiple times.
   */
  private ensureSTTActive(): void {
    if (this.stt && !this.stt.getIsListening() && this.isRunning) {
      this.stt.start();
    }
  }

  /**
   * Interrupt the AI - stop TTS immediately, resume STT.
   * Called when the user starts speaking while AI is talking.
   */
  interrupt(): void {
    if (this.state === 'speaking') {
      this.tts?.stop();
      this.setState('listening');
      this.ensureSTTActive();
    }
  }

  private async generateGreeting() {
    this.setState('processing');
    this.stt?.stop();

    try {
      // Generate a greeting by sending a temporary user message to the LLM.
      // This message is NOT added to conversationHistory — only the assistant
      // response is persisted, so the user's history stays clean.
      const greetingPrompt =
        this.config.useCase === 'sargam_marketing'
          ? '[System: A potential user/customer has connected to try the Sargam demo. Generate your opening greeting now. Introduce yourself briefly and let them know they can ask anything about Sargam.]'
          : this.config.useCase === 'outbound_survey' || this.config.useCase === 'outbound_outreach'
            ? '[System: The call has just connected. Generate your opening greeting now. Introduce yourself and state the purpose of your call briefly.]'
            : '[System: A caller has just connected. Generate your opening greeting now. Greet them warmly and ask how you can help.]';

      // Use a user message in a temporary array (not persisted to conversationHistory)
      const greetingMessages: LLMMessage[] = [
        ...this.conversationHistory,
        { role: 'user', content: greetingPrompt },
      ];

      let result = await this.llm.chatRaw(greetingMessages);

      // Handle tool calls from greeting (unlikely but possible)
      if (result.toolCalls && result.toolCalls.length > 0) {
        // Add assistant message with tool_calls to history
        this.conversationHistory.push({
          role: 'assistant',
          content: result.content,
          tool_calls: result.toolCalls,
        });
        await this.handleToolCalls(result.toolCalls, result.parsedToolCalls);

        // Follow-up call to get the actual greeting text
        result = await this.llm.chatRaw(this.conversationHistory);
      }

      const response = result.content || 'Hello! How can I help you today?';

      // Add the final assistant response to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: response,
        tool_calls: result.toolCalls || undefined,
      });

      const entry: TranscriptEntry = {
        role: 'agent',
        text: response,
        timestamp: Date.now(),
        language: this.config.language,
      };
      this.callbacks.onTranscript(entry);

      // Speak with sentence chunking
      this.speakWithChunking(response);
    } catch (error) {
      console.error('[Sargam Orchestrator] Greeting generation failed:', error);
      this.callbacks.onError('Failed to generate greeting: ' + String(error));
      this.setState('listening');
      this.ensureSTTActive();
    }
  }

  private async handleSTTResult(text: string, isFinal: boolean) {
    if (!isFinal) {
      this.latestInterimText = text;
      this.callbacks.onInterimTranscript(text);

      // Interruption: if user speaks while AI is speaking, interrupt
      if (this.state === 'speaking' && text.trim().length > 3) {
        this.interrupt();
      }
      return;
    }

    if (text.trim().length < 2) return;

    // Prevent double-processing
    if (this.isProcessingTurn) return;
    this.isProcessingTurn = true;

    // Clear interim text since we got a final result
    this.latestInterimText = '';

    // Interruption: stop any ongoing speech
    if (this.state === 'speaking') {
      this.interrupt();
    }

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

    // Analyze sentiment and intent locally
    const sentiment = LLMEngine.analyzeSentiment(text);
    this.callbacks.onSentimentUpdate(sentiment);

    const intent = LLMEngine.detectIntent(text);
    this.callbacks.onIntentDetected(intent);

    // Process with LLM (tool calling enabled)
    try {
      this.conversationHistory.push({ role: 'user', content: text.trim() });

      let result = await this.llm.chatRaw(this.conversationHistory);

      // Process tool calls if present
      let endCallTriggered = false;
      if (result.toolCalls && result.toolCalls.length > 0) {
        // Add assistant message with tool_calls to history (content may be null)
        this.conversationHistory.push({
          role: 'assistant',
          content: result.content,
          tool_calls: result.toolCalls,
        });

        endCallTriggered = await this.handleToolCalls(result.toolCalls, result.parsedToolCalls);

        // If the call is ending, use whatever farewell text the LLM gave us
        if (endCallTriggered) {
          const farewell = result.content || 'Thank you for calling. Goodbye!';
          const agentEntry: TranscriptEntry = {
            role: 'agent',
            text: farewell,
            timestamp: Date.now(),
            language: this.config.language,
          };
          this.callbacks.onTranscript(agentEntry);
          this.tts?.speak(farewell);
          this.turnCount++;
          return;
        }

        // Follow-up LLM call: now that tool results are in history,
        // ask the LLM to produce a conversational response.
        result = await this.llm.chatRaw(this.conversationHistory);

        // Handle any further tool calls from the follow-up (unlikely but possible)
        if (result.toolCalls && result.toolCalls.length > 0) {
          this.conversationHistory.push({
            role: 'assistant',
            content: result.content,
            tool_calls: result.toolCalls,
          });
          await this.handleToolCalls(result.toolCalls, result.parsedToolCalls);
        }
      }

      const response = result.content || '';

      // Only add to history if we didn't already add it above (tool call path)
      if (!result.toolCalls || result.toolCalls.length === 0) {
        this.conversationHistory.push({
          role: 'assistant',
          content: response,
        });
      } else {
        // Follow-up response after tool calls
        this.conversationHistory.push({
          role: 'assistant',
          content: response,
          tool_calls: result.toolCalls || undefined,
        });
      }

      // Add to transcript if there's text content
      if (response) {
        const agentEntry: TranscriptEntry = {
          role: 'agent',
          text: response,
          timestamp: Date.now(),
          language: this.config.language,
        };
        this.callbacks.onTranscript(agentEntry);
      }

      this.turnCount++;

      // Speak response
      if (response) {
        this.speakWithChunking(response);
      } else {
        // No text response — resume listening
        this.setState('listening');
        this.ensureSTTActive();
      }
    } catch (error) {
      this.callbacks.onError('LLM processing failed: ' + String(error));
      this.setState('listening');
      this.ensureSTTActive();
    } finally {
      this.isProcessingTurn = false;
    }
  }

  /**
   * Handle tool calls from the LLM response.
   * Returns true if end_call was triggered.
   */
  private async handleToolCalls(
    rawToolCalls: GroqToolCall[],
    parsedToolCalls: ToolCallResult[],
  ): Promise<boolean> {
    let endCallTriggered = false;

    for (const tc of parsedToolCalls) {
      this.callbacks.onToolCall(tc);

      switch (tc.name) {
        case 'extract_info': {
          const field: LiveSheetField = {
            field: tc.arguments.field as string,
            value: tc.arguments.value as string,
            timestamp: Date.now(),
          };
          this.callbacks.onExtractedInfo(field);
          break;
        }

        case 'update_live_sheet': {
          const note: LiveSheetNote = {
            category: tc.arguments.category as LiveSheetNote['category'],
            content: tc.arguments.content as string,
            timestamp: Date.now(),
          };
          this.callbacks.onLiveSheetNote(note);
          break;
        }

        case 'end_call': {
          endCallTriggered = true;
          this.callbacks.onEndCall(
            tc.arguments.reason as string,
            tc.arguments.summary as string,
          );
          break;
        }

        case 'escalate': {
          this.callbacks.onEscalation(
            tc.arguments.reason as string,
            (tc.arguments.priority as string) || 'medium',
          );
          break;
        }

        case 'create_ticket': {
          this.ticketCounter++;
          const ticket: LiveSheetTicket = {
            category: tc.arguments.category as string,
            description: tc.arguments.description as string,
            priority: tc.arguments.priority as LiveSheetTicket['priority'],
            ticketId: 'SRG-' + Date.now().toString(36).toUpperCase() + '-' + this.ticketCounter,
            timestamp: Date.now(),
          };
          this.callbacks.onTicketCreated(ticket);
          break;
        }
      }
    }

    // Add tool results to conversation history for the LLM
    for (const rawTc of rawToolCalls) {
      this.conversationHistory.push({
        role: 'tool',
        content: JSON.stringify({ success: true }),
        tool_call_id: rawTc.id,
      });
    }

    return endCallTriggered;
  }

  /**
   * Split text into sentences and speak them sequentially for smoother TTS.
   */
  private speakWithChunking(text: string): void {
    // Split on sentence boundaries (including Hindi danda)
    const sentences = text
      .split(/(?<=[.!?\u0964])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (sentences.length <= 1) {
      this.tts?.speak(text);
    } else {
      // Speak first sentence immediately, queue the rest
      this.tts?.speak(sentences[0]);
      for (let i = 1; i < sentences.length; i++) {
        this.tts?.queue(sentences[i]);
      }
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.isProcessingTurn = false;
    this.latestInterimText = '';

    this.stt?.stop();
    this.tts?.destroy();
    this.tts = null;
    this.stt = null;

    // Destroy VAD (async)
    if (this.vad) {
      try {
        await this.vad.destroy();
      } catch {
        // ignore
      }
      this.vad = null;
    }

    // Final safety: cancel any lingering browser speech synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    this.setState('idle');
  }

  mute(): void {
    this.stt?.stop();
    // Also pause VAD when muted to avoid false interrupts
    this.vad?.pause().catch(() => {});
  }

  unmute(): void {
    if (this.isRunning && this.state === 'listening') {
      this.ensureSTTActive();
      this.vad?.resume().catch(() => {});
    }
  }

  /**
   * Mute/unmute the AI voice output.
   */
  setTTSMuted(muted: boolean): void {
    this.tts?.setMuted(muted);
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
