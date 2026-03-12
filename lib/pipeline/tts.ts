// ============================================================
// Sargam AI — Text-to-Speech Engine (Web Speech Synthesis)
// Free, browser-native, supports Indian language voices
// ============================================================

export interface TTSConfig {
  language: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceGender?: 'male' | 'female';
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export class TextToSpeechEngine {
  private config: TTSConfig;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking: boolean = false;
  private speechQueue: string[] = [];

  constructor(config: TTSConfig) {
    this.config = {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      ...config,
    };
  }

  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  static getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!TextToSpeechEngine.isSupported()) return [];
    return window.speechSynthesis.getVoices();
  }

  static getVoicesForLanguage(langCode: string): SpeechSynthesisVoice[] {
    const voices = TextToSpeechEngine.getAvailableVoices();
    const prefix = langCode.split('-')[0]; // 'hi' from 'hi-IN'
    return voices.filter(v => v.lang.startsWith(prefix));
  }

  private selectVoice(): SpeechSynthesisVoice | null {
    const voices = TextToSpeechEngine.getVoicesForLanguage(this.config.language);
    if (voices.length === 0) return null;

    // Prefer voices matching gender preference
    if (this.config.voiceGender) {
      const genderMatch = voices.find(v => {
        const name = v.name.toLowerCase();
        return this.config.voiceGender === 'female'
          ? name.includes('female') || name.includes('woman') || name.includes('zira') || name.includes('samantha')
          : name.includes('male') || name.includes('man') || name.includes('david') || name.includes('ravi');
      });
      if (genderMatch) return genderMatch;
    }

    // Prefer local/native voices over network
    const localVoice = voices.find(v => v.localService);
    return localVoice || voices[0];
  }

  /**
   * Speak text immediately, canceling any current speech
   */
  speak(text: string): void {
    if (!TextToSpeechEngine.isSupported()) {
      this.config.onError?.('Speech synthesis not supported');
      return;
    }

    // Cancel current speech
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.config.language;
    utterance.rate = this.config.rate || 1.0;
    utterance.pitch = this.config.pitch || 1.0;
    utterance.volume = this.config.volume || 1.0;

    const voice = this.selectVoice();
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.config.onStart?.();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.config.onEnd?.();

      // Process queue
      if (this.speechQueue.length > 0) {
        const next = this.speechQueue.shift()!;
        this.speak(next);
      }
    };

    utterance.onerror = (event) => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        this.config.onError?.(`TTS error: ${event.error}`);
      }
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Queue text to be spoken after current speech finishes
   */
  queue(text: string): void {
    if (this.isSpeaking) {
      this.speechQueue.push(text);
    } else {
      this.speak(text);
    }
  }

  /**
   * Speak text in chunks for streaming (sentence by sentence)
   */
  speakStreaming(textChunk: string): void {
    // Buffer chunks and speak complete sentences
    this.queue(textChunk);
  }

  stop(): void {
    this.speechQueue = [];
    this.isSpeaking = false;
    this.currentUtterance = null;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  pause(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
  }

  resume(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume();
    }
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  setLanguage(language: string): void {
    this.config.language = language;
  }

  setRate(rate: number): void {
    this.config.rate = rate;
  }
}
