// ============================================================
// Sargam AI - Text-to-Speech Engine (Web Speech Synthesis)
// Free, browser-native, supports Indian language voices
//
// Fixed:
//   - Queue bug: speak() no longer clears queue when processing next sentence
//   - Chrome cancel+speak bug: deferred speak after cancel via setTimeout(0)
//   - Chrome 15-second bug: pause/resume keepalive interval
//   - Voice selection: voiceschanged listener for async voice loading
//   - Mute support: setMuted() controls volume without stopping speech
//   - Safety timeout: if onstart never fires, force onEnd after 5s
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
  private isMuted: boolean = false;
  private cachedVoice: SpeechSynthesisVoice | null = null;
  private voicesLoaded: boolean = false;
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;
  private safetyTimeout: ReturnType<typeof setTimeout> | null = null;
  private destroyed: boolean = false;
  /** Generation counter to cancel stale deferred speaks after stop() */
  private speakGeneration: number = 0;

  constructor(config: TTSConfig) {
    this.config = {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      ...config,
    };

    // Listen for voices to load (Chrome loads them async)
    if (TextToSpeechEngine.isSupported()) {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        this.voicesLoaded = true;
        this.cachedVoice = this.findBestVoice(voices);
      }

      window.speechSynthesis.addEventListener('voiceschanged', () => {
        this.voicesLoaded = true;
        const updatedVoices = window.speechSynthesis.getVoices();
        this.cachedVoice = this.findBestVoice(updatedVoices);
      });
    }
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
    const prefix = langCode.split('-')[0];
    return voices.filter(v => v.lang.startsWith(prefix));
  }

  /**
   * Find the best voice for the configured language and gender preference.
   */
  private findBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    const prefix = this.config.language.split('-')[0];
    const langVoices = voices.filter(v => v.lang.startsWith(prefix));

    if (langVoices.length === 0) return null;

    // Prefer voices matching gender preference
    if (this.config.voiceGender) {
      const genderMatch = langVoices.find(v => {
        const name = v.name.toLowerCase();
        return this.config.voiceGender === 'female'
          ? name.includes('female') || name.includes('woman') || name.includes('zira') || name.includes('samantha')
          : name.includes('male') || name.includes('man') || name.includes('david') || name.includes('ravi');
      });
      if (genderMatch) return genderMatch;
    }

    // Prefer local/native voices over network
    const localVoice = langVoices.find(v => v.localService);
    return localVoice || langVoices[0];
  }

  private getVoice(): SpeechSynthesisVoice | null {
    if (this.cachedVoice) return this.cachedVoice;
    // Fallback: try to find voice directly (for first call before voiceschanged)
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      this.cachedVoice = this.findBestVoice(voices);
    }
    return this.cachedVoice;
  }

  /**
   * Speak text immediately, canceling any current speech AND the queue.
   * Use this for user-initiated new speech that should replace everything.
   *
   * IMPORTANT: Uses setTimeout(0) between cancel() and speak() because
   * Chrome silently drops speak() calls in the same tick as cancel().
   */
  speak(text: string): void {
    if (!TextToSpeechEngine.isSupported()) {
      this.config.onError?.('Speech synthesis not supported');
      return;
    }

    // Cancel everything - current speech AND queued sentences
    this.stop();

    // CRITICAL: Mark isSpeaking = true SYNCHRONOUSLY after stop().
    // This ensures that any queue() calls that follow in the same tick
    // (e.g., from speakWithChunking) correctly push to speechQueue
    // instead of calling _speakUtterance directly.
    this.isSpeaking = true;

    // Capture the current generation so we can detect if stop() was called
    // between now and when the deferred speak fires.
    const gen = ++this.speakGeneration;

    // Defer the speak to next tick — Chrome drops speechSynthesis.speak()
    // if called synchronously right after speechSynthesis.cancel()
    setTimeout(() => {
      if (this.destroyed || this.speakGeneration !== gen) return;
      this._speakUtterance(text, true);
    }, 50);
  }

  /**
   * Internal method: create an utterance and speak it.
   * Does NOT clear the queue - that is the caller's responsibility.
   *
   * @param text - The text to speak
   * @param isFirstInSequence - If true, fire the onStart callback
   */
  private _speakUtterance(text: string, isFirstInSequence: boolean): void {
    if (this.destroyed) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.config.language;
    utterance.rate = this.config.rate || 1.0;
    utterance.pitch = this.config.pitch || 1.0;
    utterance.volume = this.isMuted ? 0 : (this.config.volume || 1.0);

    const voice = this.getVoice();
    if (voice) utterance.voice = voice;

    // Safety timeout: if onstart never fires within 5 seconds, assume TTS failed
    // and fire onEnd so the pipeline doesn't get stuck in 'processing' forever.
    this.clearSafetyTimeout();
    if (isFirstInSequence) {
      this.safetyTimeout = setTimeout(() => {
        if (!this.isSpeaking && !this.destroyed) {
          console.warn('[Sargam TTS] Safety timeout — onstart never fired, forcing onEnd');
          this.speechQueue = [];
          this.currentUtterance = null;
          this.config.onEnd?.();
        }
      }, 5000);
    }

    utterance.onstart = () => {
      this.clearSafetyTimeout();
      this.isSpeaking = true;
      // Start the Chrome keepalive workaround
      this.startKeepAlive();
      if (isFirstInSequence) {
        this.config.onStart?.();
      }
    };

    utterance.onend = () => {
      this.clearSafetyTimeout();
      // Process next in queue if available
      if (this.speechQueue.length > 0) {
        const next = this.speechQueue.shift()!;
        // NOT isFirstInSequence - we are continuing a sequence, no onStart/onEnd callbacks
        this._speakUtterance(next, false);
      } else {
        // Entire sequence is done
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.stopKeepAlive();
        this.config.onEnd?.();
      }
    };

    utterance.onerror = (event) => {
      this.clearSafetyTimeout();
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.stopKeepAlive();
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        this.config.onError?.('TTS error: ' + event.error);
      }
      // If there was an error on one sentence, try to continue with queue
      if (this.speechQueue.length > 0) {
        const next = this.speechQueue.shift()!;
        this._speakUtterance(next, false);
      } else {
        this.config.onEnd?.();
      }
    };

    this.currentUtterance = utterance;

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('[Sargam TTS] speechSynthesis.speak() threw:', err);
      this.clearSafetyTimeout();
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.config.onError?.('TTS speak failed: ' + String(err));
      this.config.onEnd?.();
    }
  }

  /**
   * Chrome has a bug where SpeechSynthesis stops working after ~15 seconds
   * without user interaction. The onend event never fires.
   * Workaround: periodically call pause() then resume() to keep it alive.
   */
  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAliveInterval = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000); // Every 10 seconds
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  private clearSafetyTimeout(): void {
    if (this.safetyTimeout) {
      clearTimeout(this.safetyTimeout);
      this.safetyTimeout = null;
    }
  }

  /**
   * Queue text to be spoken after current speech finishes.
   * If nothing is currently speaking, speak immediately.
   */
  queue(text: string): void {
    if (this.isSpeaking) {
      this.speechQueue.push(text);
    } else {
      this._speakUtterance(text, true);
    }
  }

  /**
   * Alias for queue - for streaming text chunks.
   */
  speakStreaming(textChunk: string): void {
    this.queue(textChunk);
  }

  /**
   * Stop all speech and clear the queue.
   */
  stop(): void {
    // Increment generation to cancel any pending deferred speak() calls
    this.speakGeneration++;
    this.speechQueue = [];
    this.isSpeaking = false;
    this.currentUtterance = null;
    this.stopKeepAlive();
    this.clearSafetyTimeout();
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

  /**
   * Mute/unmute the TTS output. Sets volume to 0 when muted.
   * Does NOT stop current speech - just silences it.
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
    // Update volume on the current utterance in real-time if one is playing
    if (this.currentUtterance) {
      this.currentUtterance.volume = muted ? 0 : (this.config.volume || 1.0);
    }
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }

  setLanguage(language: string): void {
    this.config.language = language;
    // Re-select voice for new language
    this.cachedVoice = null;
    this.voicesLoaded = false;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      this.cachedVoice = this.findBestVoice(voices);
      this.voicesLoaded = true;
    }
  }

  setRate(rate: number): void {
    this.config.rate = rate;
  }

  /**
   * Clean up resources. Call when done with the engine.
   */
  destroy(): void {
    this.destroyed = true;
    this.stop();
    this.stopKeepAlive();
  }
}
