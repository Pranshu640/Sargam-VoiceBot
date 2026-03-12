// ============================================================
// Sargam AI - Voice Activity Detection (VAD) Module
// Uses @ricky0123/vad-web with Silero VAD model
// Provides accurate speech start/end detection in the browser
//
// Note: onnxruntime-web threading is disabled (numThreads=1)
// to avoid requiring Cross-Origin-Embedder-Policy headers.
// ============================================================

export interface VADCallbacks {
  /** Fired when the user starts speaking */
  onSpeechStart: () => void;
  /** Fired when the user stops speaking. Audio segment is provided. */
  onSpeechEnd: (audio: Float32Array) => void;
  /** Fired when speech was too short to be considered real speech */
  onVADMisfire: () => void;
  /** Fired on errors during VAD initialization or processing */
  onError: (error: string) => void;
}

export interface VADConfig {
  /** Threshold for positive speech detection (0-1). Default 0.5 */
  positiveSpeechThreshold?: number;
  /** Threshold for negative speech detection (0-1). Default 0.35 */
  negativeSpeechThreshold?: number;
  /** How long to wait (ms) before considering speech has ended. Default 500 */
  redemptionMs?: number;
  /** Min speech duration (ms) to trigger onSpeechEnd vs onVADMisfire. Default 250 */
  minSpeechMs?: number;
  /** Milliseconds to prepend before speech start. Default 300 */
  preSpeechPadMs?: number;
}

interface MicVADInstance {
  start: () => Promise<void>;
  pause: () => Promise<void>;
  destroy: () => Promise<void>;
  listening: boolean;
}

export class VoiceActivityDetector {
  private vad: MicVADInstance | null = null;
  private callbacks: VADCallbacks;
  private config: VADConfig;
  private isInitialized: boolean = false;
  private isStarting: boolean = false;
  private _isListening: boolean = false;

  constructor(callbacks: VADCallbacks, config?: VADConfig) {
    this.callbacks = callbacks;
    this.config = {
      positiveSpeechThreshold: 0.8,
      negativeSpeechThreshold: 0.5,
      redemptionMs: 800,
      minSpeechMs: 400,
      preSpeechPadMs: 300,
      ...config,
    };
  }

  /**
   * Initialize and start the VAD.
   * This requests microphone access and loads the Silero ONNX model.
   */
  async start(): Promise<boolean> {
    if (this._isListening || this.isStarting) return true;
    this.isStarting = true;

    try {
      // Dynamic import to avoid SSR issues (vad-web uses browser APIs)
      const { MicVAD } = await import('@ricky0123/vad-web');

      this.vad = await MicVAD.new({
        positiveSpeechThreshold: this.config.positiveSpeechThreshold,
        negativeSpeechThreshold: this.config.negativeSpeechThreshold,
        redemptionMs: this.config.redemptionMs,
        minSpeechMs: this.config.minSpeechMs,
        preSpeechPadMs: this.config.preSpeechPadMs,

        // Serve ONNX model + worklet from public directory
        baseAssetPath: '/',
        onnxWASMBasePath: '/',

        // Use legacy model (smaller, faster, good enough for VAD)
        model: 'legacy',

        // Configure onnxruntime-web THROUGH vad-web's ortConfig callback.
        // This is critical because vad-web imports its own onnxruntime-web instance
        // (require("onnxruntime-web/wasm")), so setting ort.env on a separately
        // imported onnxruntime-web module has NO effect on vad-web's internal copy.
        ortConfig: (ort) => {
          ort.env.wasm.numThreads = 1;
          ort.env.wasm.wasmPaths = '/';
        },

        // Start immediately after loading
        startOnLoad: true,

        onSpeechStart: () => {
          this.callbacks.onSpeechStart();
        },

        onSpeechEnd: (audio: Float32Array) => {
          this.callbacks.onSpeechEnd(audio);
        },

        onVADMisfire: () => {
          this.callbacks.onVADMisfire();
        },
      });

      this.isInitialized = true;
      this._isListening = true;
      this.isStarting = false;
      return true;
    } catch (err) {
      this.isStarting = false;
      this.callbacks.onError('VAD initialization failed: ' + String(err));
      return false;
    }
  }

  /**
   * Pause VAD (stop listening without destroying).
   */
  async pause(): Promise<void> {
    if (this.vad && this._isListening) {
      try {
        await this.vad.pause();
        this._isListening = false;
      } catch (err) {
        this.callbacks.onError('VAD pause failed: ' + String(err));
      }
    }
  }

  /**
   * Resume VAD after pausing.
   */
  async resume(): Promise<void> {
    if (this.vad && !this._isListening) {
      try {
        await this.vad.start();
        this._isListening = true;
      } catch (err) {
        this.callbacks.onError('VAD resume failed: ' + String(err));
      }
    }
  }

  /**
   * Stop and destroy the VAD, releasing all resources.
   */
  async destroy(): Promise<void> {
    if (this.vad) {
      try {
        await this.vad.destroy();
      } catch {
        // Ignore errors during cleanup
      }
      this.vad = null;
    }
    this._isListening = false;
    this.isInitialized = false;
    this.isStarting = false;
  }

  get isListening(): boolean {
    return this._isListening;
  }

  get initialized(): boolean {
    return this.isInitialized;
  }
}
