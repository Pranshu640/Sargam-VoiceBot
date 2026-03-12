'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Phone,
  Volume2,
  VolumeX,
  Brain,
  Globe,
  Clock,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Loader2,
  Radio,
} from 'lucide-react';
import { PipelineOrchestrator, PipelineState } from '@/lib/pipeline/orchestrator';
import { LLMEngine } from '@/lib/pipeline/llm';
import { TranscriptEntry, SUPPORTED_LANGUAGES, PipelineConfig } from '@/types';
import { useStore } from '@/lib/store';

// ============================================================
// Use-case options
// ============================================================

const USE_CASES = [
  { value: 'inbound' as const, label: 'Inbound Helpline', description: 'Handle incoming citizen / customer queries' },
  { value: 'outbound_survey' as const, label: 'Outbound Survey', description: 'Conduct automated phone surveys' },
  { value: 'grievance' as const, label: 'Grievance Redressal', description: 'Register and track complaints' },
];

// ============================================================
// Helper: format seconds as MM:SS
// ============================================================

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ============================================================
// Status badge configuration per pipeline state
// ============================================================

function getStatusConfig(state: PipelineState) {
  switch (state) {
    case 'idle':
      return { label: 'Ready', color: 'bg-slate-600', text: 'text-slate-200', ring: '' };
    case 'listening':
      return { label: 'Listening...', color: 'bg-emerald-500/20', text: 'text-emerald-400', ring: 'ring-2 ring-emerald-400/60 animate-pulse' };
    case 'processing':
      return { label: 'Thinking...', color: 'bg-amber-500/20', text: 'text-amber-400', ring: '' };
    case 'speaking':
      return { label: 'Speaking...', color: 'bg-blue-500/20', text: 'text-blue-400', ring: '' };
    case 'error':
      return { label: 'Error', color: 'bg-red-500/20', text: 'text-red-400', ring: '' };
    default:
      return { label: 'Ready', color: 'bg-slate-600', text: 'text-slate-200', ring: '' };
  }
}

// ============================================================
// Sentiment label helper
// ============================================================

function getSentimentInfo(value: number) {
  if (value > 0.2) return { label: 'Positive', color: 'bg-emerald-500', width: `${50 + value * 50}%` };
  if (value < -0.2) return { label: 'Negative', color: 'bg-red-500', width: `${50 + Math.abs(value) * 50}%` };
  return { label: 'Neutral', color: 'bg-amber-500', width: '50%' };
}

// ============================================================
// Main Call Page
// ============================================================

export default function CallPage() {
  const store = useStore();

  // ── Pre-call setup state ──
  const [language, setLanguage] = useState('hi-IN');
  const [useCase, setUseCase] = useState<PipelineConfig['useCase']>('inbound');

  // ── Call state ──
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isTTSMuted, setIsTTSMuted] = useState(false);
  const [pipelineState, setPipelineState] = useState<PipelineState>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [interimText, setInterimText] = useState('');
  const [currentSentiment, setCurrentSentiment] = useState(0);
  const [currentIntent, setCurrentIntent] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [callId, setCallId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [escalationMessage, setEscalationMessage] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<{ duration: number; turns: number; sentiment: number } | null>(null);

  // ── Refs ──
  const pipelineRef = useRef<PipelineOrchestrator | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Auto-scroll transcript ──
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, interimText]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      pipelineRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Start call ──
  const startCall = useCallback(async () => {
    setErrorMessage('');
    setEscalationMessage('');
    setShowSummary(false);
    setSummaryData(null);

    // Determine call type
    const callType = useCase.startsWith('outbound') ? 'outbound' : 'inbound';

    // Persist to store
    const call = store.createCall({
      type: callType,
      status: 'active',
      language,
      duration: 0,
      transcript: [],
      sentiment: 0,
      escalated: false,
      startedAt: Date.now(),
    });
    setCallId(call.id);

    // Build pipeline config
    const config: PipelineConfig = {
      language,
      useCase,
      voiceGender: 'female',
    };

    // Create orchestrator
    const pipeline = new PipelineOrchestrator(config, {
      onStateChange: (state) => setPipelineState(state),
      onTranscript: (entry) => {
        setTranscript((prev) => [...prev, entry]);
        setInterimText('');
        store.addTranscriptEntry(call.id, entry);
      },
      onInterimTranscript: (text) => setInterimText(text),
      onSentimentUpdate: (sentiment) => setCurrentSentiment(sentiment),
      onIntentDetected: (intent) => setCurrentIntent(intent),
      onError: (error) => setErrorMessage(error),
      onEscalation: () => {
        setEscalationMessage('Escalating to a human agent. Your conversation context will be transferred.');
        // Auto-end call after a short delay
        setTimeout(() => {
          endCall();
        }, 4000);
      },
    });

    pipelineRef.current = pipeline;

    // Start the pipeline
    const started = await pipeline.start();
    if (!started) {
      setErrorMessage('Failed to start call pipeline. Check microphone permissions and use Chrome.');
      store.endCall(call.id, 'failed');
      return;
    }

    setIsInCall(true);
    setCallDuration(0);

    // Start duration timer
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, [language, useCase, store]);

  // ── End call ──
  const endCall = useCallback(() => {
    // Capture summary before resetting
    const turns = transcript.length;
    const duration = callDuration;
    const sentiment = currentSentiment;

    pipelineRef.current?.stop();
    pipelineRef.current = null;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (callId) {
      store.endCall(callId);
    }

    setIsInCall(false);
    setPipelineState('idle');
    setIsMuted(false);
    setInterimText('');

    // Show summary
    setSummaryData({ duration, turns, sentiment });
    setShowSummary(true);

    // Hide summary after 8 seconds
    setTimeout(() => setShowSummary(false), 8000);
  }, [callId, store, transcript.length, callDuration, currentSentiment]);

  // ── Mute / unmute ──
  const toggleMute = useCallback(() => {
    if (isMuted) {
      pipelineRef.current?.unmute();
      setIsMuted(false);
    } else {
      pipelineRef.current?.mute();
      setIsMuted(true);
    }
  }, [isMuted]);

  // ── TTS mute toggle ──
  const toggleTTSMute = useCallback(() => {
    setIsTTSMuted((prev) => !prev);
  }, []);

  // ── Find selected language label ──
  const selectedLang = SUPPORTED_LANGUAGES.find((l) => l.code === language);
  const statusConfig = getStatusConfig(pipelineState);
  const sentimentInfo = getSentimentInfo(currentSentiment);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ───────────────── Header ───────────────── */}
      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <a href="/" className="text-xl font-bold">
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                Sargam
              </span>
            </a>
            <ChevronRight className="h-4 w-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-400">Live Call</span>
          </div>
          {isInCall && (
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 animate-pulse text-red-400" />
              <span className="text-sm font-medium text-red-400">LIVE</span>
            </div>
          )}
        </div>
      </header>

      {/* ───────────────── Main Layout ───────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* ━━━━━━━━━━━━━━━ LEFT PANEL — Call Area ━━━━━━━━━━━━━━━ */}
          <div className="flex flex-col gap-6 lg:w-2/3">
            {/* ── Error banner ── */}
            {errorMessage && (
              <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-300">{errorMessage}</p>
                </div>
                <button
                  onClick={() => setErrorMessage('')}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* ── Escalation banner ── */}
            {escalationMessage && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <p className="text-sm font-medium text-amber-300">{escalationMessage}</p>
              </div>
            )}

            {/* ── Post-call summary ── */}
            {showSummary && summaryData && !isInCall && (
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-6">
                <h3 className="text-lg font-semibold text-indigo-300">Call Summary</h3>
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-slate-900/60 p-3 text-center">
                    <Clock className="mx-auto h-5 w-5 text-slate-400" />
                    <p className="mt-1 text-lg font-bold">{formatDuration(summaryData.duration)}</p>
                    <p className="text-xs text-slate-400">Duration</p>
                  </div>
                  <div className="rounded-lg bg-slate-900/60 p-3 text-center">
                    <TrendingUp className="mx-auto h-5 w-5 text-slate-400" />
                    <p className="mt-1 text-lg font-bold">{summaryData.turns}</p>
                    <p className="text-xs text-slate-400">Messages</p>
                  </div>
                  <div className="rounded-lg bg-slate-900/60 p-3 text-center">
                    <Brain className="mx-auto h-5 w-5 text-slate-400" />
                    <p className="mt-1 text-lg font-bold">
                      {summaryData.sentiment > 0.2 ? 'Positive' : summaryData.sentiment < -0.2 ? 'Negative' : 'Neutral'}
                    </p>
                    <p className="text-xs text-slate-400">Sentiment</p>
                  </div>
                </div>
              </div>
            )}

            {/* ━━━━━━━━ PRE-CALL SETUP ━━━━━━━━ */}
            {!isInCall && !showSummary && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
                <h2 className="text-xl font-bold">Start a Live Call</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Configure the AI agent and begin a voice conversation.
                </p>

                <div className="mt-6 space-y-5">
                  {/* Language selector */}
                  <div>
                    <label htmlFor="language" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-300">
                      <Globe className="h-4 w-4 text-indigo-400" />
                      Language
                    </label>
                    <select
                      id="language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.nativeName} — {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Use-case selector */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-300">
                      <Brain className="h-4 w-4 text-violet-400" />
                      Use Case
                    </label>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {USE_CASES.map((uc) => (
                        <button
                          key={uc.value}
                          onClick={() => setUseCase(uc.value)}
                          className={`rounded-lg border p-3 text-left transition-all ${
                            useCase === uc.value
                              ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/40'
                              : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                          }`}
                        >
                          <p className={`text-sm font-medium ${useCase === uc.value ? 'text-indigo-300' : 'text-slate-200'}`}>
                            {uc.label}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">{uc.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Start call button */}
                  <button
                    onClick={startCall}
                    className="group flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 active:scale-[0.98]"
                  >
                    <Phone className="h-6 w-6 transition-transform group-hover:scale-110" />
                    Start Call
                  </button>

                  <p className="text-center text-xs text-slate-500">
                    Uses your browser microphone and speakers. Best in Chrome.
                  </p>
                </div>
              </div>
            )}

            {/* ━━━━━━━━ ACTIVE CALL DISPLAY ━━━━━━━━ */}
            {isInCall && (
              <div className="flex flex-1 flex-col gap-6">
                {/* Status card */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
                  <div className="flex flex-col items-center text-center">
                    {/* Pipeline state badge */}
                    <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${statusConfig.color} ${statusConfig.text} ${statusConfig.ring}`}>
                      {pipelineState === 'processing' && <Loader2 className="h-4 w-4 animate-spin" />}
                      {pipelineState === 'listening' && <Radio className="h-4 w-4" />}
                      {pipelineState === 'speaking' && <Volume2 className="h-4 w-4" />}
                      {statusConfig.label}
                    </div>

                    {/* Audio visualization bars */}
                    <div className="mt-6 flex items-end justify-center gap-1.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`w-2 rounded-full transition-all ${
                            pipelineState === 'listening'
                              ? 'bg-emerald-400 animate-pulse'
                              : pipelineState === 'speaking'
                                ? 'bg-blue-400 animate-pulse'
                                : pipelineState === 'processing'
                                  ? 'bg-amber-400 animate-pulse'
                                  : 'bg-slate-700'
                          }`}
                          style={{
                            height:
                              pipelineState === 'idle'
                                ? '12px'
                                : `${20 + Math.random() * 28}px`,
                            animationDelay: `${i * 0.15}s`,
                            animationDuration: '0.8s',
                          }}
                        />
                      ))}
                    </div>

                    {/* Duration timer */}
                    <p className="mt-5 font-mono text-4xl font-bold tracking-wider text-white">
                      {formatDuration(callDuration)}
                    </p>

                    {/* Language + Meta row */}
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                        <Globe className="h-3.5 w-3.5 text-indigo-400" />
                        {selectedLang?.nativeName || language}
                      </span>

                      {currentIntent && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
                          <Brain className="h-3.5 w-3.5" />
                          {currentIntent.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>

                    {/* Sentiment bar */}
                    <div className="mt-5 w-full max-w-xs">
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                        <span>Sentiment</span>
                        <span className={
                          currentSentiment > 0.2 ? 'text-emerald-400' :
                          currentSentiment < -0.2 ? 'text-red-400' :
                          'text-amber-400'
                        }>
                          {sentimentInfo.label}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${sentimentInfo.color}`}
                          style={{ width: sentimentInfo.width }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Call controls bar */}
                <div className="flex items-center justify-center gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                  {/* Mute toggle */}
                  <button
                    onClick={toggleMute}
                    className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
                      isMuted
                        ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500/40 hover:bg-red-500/30'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                  </button>

                  {/* End call */}
                  <button
                    onClick={endCall}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/30 transition-all hover:bg-red-500 hover:shadow-red-500/40 active:scale-95"
                    title="End Call"
                  >
                    <PhoneOff className="h-7 w-7" />
                  </button>

                  {/* TTS mute toggle */}
                  <button
                    onClick={toggleTTSMute}
                    className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
                      isTTSMuted
                        ? 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/40 hover:bg-amber-500/30'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                    title={isTTSMuted ? 'Unmute Agent' : 'Mute Agent'}
                  >
                    {isTTSMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ━━━━━━━━━━━━━━━ RIGHT PANEL — Transcript ━━━━━━━━━━━━━━━ */}
          <div className="flex flex-col lg:w-1/3">
            <div className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900/50">
              {/* Transcript header */}
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-200">Transcript</h3>
                <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400">
                  {transcript.length} message{transcript.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Transcript body */}
              <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 200px)', minHeight: '400px' }}>
                {transcript.length === 0 && !interimText && (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <Mic className="h-10 w-10 text-slate-700" />
                    <p className="mt-3 text-sm text-slate-500">
                      {isInCall ? 'Waiting for conversation...' : 'Start a call to see the transcript here.'}
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  {transcript.map((entry, idx) => {
                    const isUser = entry.role === 'user';
                    return (
                      <div
                        key={idx}
                        className={`rounded-lg p-3 ${
                          isUser
                            ? 'border border-slate-700/50 bg-slate-800/60'
                            : 'border border-indigo-500/20 bg-indigo-500/10'
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          {isUser ? (
                            <Mic className="h-3.5 w-3.5 text-slate-400" />
                          ) : (
                            <Brain className="h-3.5 w-3.5 text-indigo-400" />
                          )}
                          <span className={`text-xs font-medium ${isUser ? 'text-slate-300' : 'text-indigo-300'}`}>
                            {isUser ? 'You' : 'Sargam AI'}
                          </span>
                          <span className="ml-auto text-xs text-slate-500">
                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-200">{entry.text}</p>
                      </div>
                    );
                  })}

                  {/* Interim (partial) transcript */}
                  {interimText && (
                    <div className="rounded-lg border border-slate-700/30 bg-slate-800/30 p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <Mic className="h-3.5 w-3.5 text-slate-500" />
                        <span className="text-xs font-medium text-slate-500">You</span>
                        <Loader2 className="ml-auto h-3 w-3 animate-spin text-slate-600" />
                      </div>
                      <p className="text-sm italic text-slate-500">{interimText}</p>
                    </div>
                  )}

                  <div ref={transcriptEndRef} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
