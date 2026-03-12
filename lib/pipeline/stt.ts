// ============================================================
// Sargam AI - Speech-to-Text Engine (Web Speech API)
// Free, browser-native, supports multiple Indian languages
//
// Fixed:
//   - Removed internal auto-restart in onend handler
//   - Orchestrator is now the sole owner of restart logic
//   - This eliminates the double-restart race condition
//   - Added isStarting guard to prevent InvalidStateError
// ============================================================

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

export interface STTConfig {
  language: string; // BCP-47 language code e.g., 'hi-IN', 'en-IN'
  continuous: boolean;
  interimResults: boolean;
  onResult: (text: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}

export class SpeechToTextEngine {
  private recognition: SpeechRecognitionInstance | null = null;
  private isListening: boolean = false;
  private isStarting: boolean = false; // Guard against double-start
  private config: STTConfig;

  constructor(config: STTConfig) {
    this.config = config;
  }

  static isSupported(): boolean {
    return typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }

  start(): boolean {
    if (!SpeechToTextEngine.isSupported()) {
      this.config.onError('Speech recognition not supported in this browser. Use Chrome for best results.');
      return false;
    }

    // Prevent double-start which causes InvalidStateError
    if (this.isListening || this.isStarting) return true;

    this.isStarting = true;

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognitionClass();

    this.recognition.lang = this.config.language;
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript;
      const isFinal = lastResult.isFinal;
      this.config.onResult(transcript, isFinal);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') return;
      if (event.error === 'aborted') return;
      this.config.onError('Speech recognition error: ' + event.error);
    };

    // CRITICAL FIX: No auto-restart here.
    // The orchestrator is the sole owner of restart logic.
    // When recognition ends (for any reason), we just notify via onEnd.
    this.recognition.onend = () => {
      this.isListening = false;
      this.isStarting = false;
      this.config.onEnd();
    };

    try {
      this.recognition.start();
      this.isListening = true;
      this.isStarting = false;
      return true;
    } catch (err) {
      this.isStarting = false;
      this.config.onError('Failed to start speech recognition: ' + err);
      return false;
    }
  }

  stop(): void {
    this.isListening = false;
    this.isStarting = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch { /* ignore */ }
      this.recognition = null;
    }
  }

  setLanguage(language: string): void {
    this.config.language = language;
    if (this.isListening) {
      this.stop();
      this.start();
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }
}
