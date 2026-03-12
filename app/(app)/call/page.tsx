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
  Loader2,
  Radio,
  MessageSquare,
  FileText,
  ToggleLeft,
  ToggleRight,
  Zap,
  Wrench,
} from 'lucide-react';
import { PipelineOrchestrator, PipelineState } from '@/lib/pipeline/orchestrator';
import {
  TranscriptEntry,
  SUPPORTED_LANGUAGES,
  PipelineConfig,
  LiveSheetData,
  LiveSheetField,
  LiveSheetNote,
  LiveSheetTicket,
  ToolCallResult,
  createEmptyLiveSheet,
} from '@/types';
import { AGENT_MODES, AgentMode } from '@/lib/prompts';
import { useStore } from '@/lib/store';
import React from 'react';

// ============================================================
// Fallback internal LiveInfoSheet Component for brutalism
// ============================================================
// Since I cannot rewrite LiveInfoSheet.tsx in one go, I'll provide a 
// minimalist brutalist wrapper or just use the existing one if it's fine,
// but the existing one uses colors. Let's import it anyway, and maybe 
// tweak it or just pass props.
import LiveInfoSheet from '@/components/LiveInfoSheet';

// ============================================================
// Helpers
// ============================================================

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getStatusConfig(state: PipelineState) {
  switch (state) {
    case 'idle':
      return { label: 'IDLE', color: 'bg-zinc-900', text: 'text-zinc-500', ring: '' };
    case 'listening':
      return { label: 'LISTENING...', color: 'bg-white', text: 'text-black', ring: 'shadow-[0_0_15px_white]' };
    case 'processing':
      return { label: 'PROCESSING...', color: 'bg-zinc-200', text: 'text-black', ring: '' };
    case 'speaking':
      return { label: 'SPEAKING...', color: 'bg-zinc-400', text: 'text-black', ring: '' };
    case 'error':
      return { label: 'ERROR', color: 'bg-zinc-800 line-through', text: 'text-zinc-500', ring: '' };
    default:
      return { label: 'IDLE', color: 'bg-zinc-900', text: 'text-zinc-500', ring: '' };
  }
}

// ============================================================
// Main Call Page
// ============================================================

export default function CallPage() {
  const store = useStore();

  // ── Pre-call setup ──
  const [language, setLanguage] = useState('hi-IN');
  const [agentMode, setAgentMode] = useState<AgentMode>('sargam_marketing');
  const [testerMode, setTesterMode] = useState(false);

  // ── Call state ──
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isTTSMuted, setIsTTSMuted] = useState(false);
  const [pipelineState, setPipelineState] = useState<PipelineState>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [interimText, setInterimText] = useState('');
  const [currentSentiment, setCurrentSentiment] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [callId, setCallId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [escalationMessage, setEscalationMessage] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    duration: number;
    turns: number;
    sentiment: number;
    endReason?: string;
    endSummary?: string;
  } | null>(null);

  // ── Live Info Sheet ──
  const [liveSheet, setLiveSheet] = useState<LiveSheetData>(createEmptyLiveSheet());
  const [toolCallLog, setToolCallLog] = useState<ToolCallResult[]>([]);

  // ── Disclaimer popup ──
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  // ── Right panel tab ──
  const [rightTab, setRightTab] = useState<'transcript' | 'infosheet'>('transcript');

  // ── Previous calls from this session (preserved across calls) ──
  const [previousTranscripts, setPreviousTranscripts] = useState<
    Array<{ callId: string; agentMode: AgentMode; language: string; transcript: TranscriptEntry[]; duration: number; timestamp: number }>
  >([]);

  // ── Refs ──
  const pipelineRef = useRef<PipelineOrchestrator | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endCallTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCleaningUpRef = useRef(false);

  // ── Auto-scroll transcript ──
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, interimText]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      pipelineRef.current?.stop().catch(() => {});
      if (timerRef.current) clearInterval(timerRef.current);
      if (endCallTimeoutRef.current) clearTimeout(endCallTimeoutRef.current);
    };
  }, []);

  // ── End call (extracted as stable ref) ──
  const endCallRef = useRef<() => void>(() => { });

  const endCall = useCallback(async () => {
    // Guard against double-cleanup
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    // Save current call transcript to history before clearing
    if (transcript.length > 0) {
      setPreviousTranscripts((prev) => [
        ...prev,
        {
          callId: callId || 'unknown',
          agentMode,
          language,
          transcript: [...transcript],
          duration: callDuration,
          timestamp: Date.now(),
        },
      ]);
    }

    // Await full pipeline cleanup (including VAD mic release)
    if (pipelineRef.current) {
      try {
        await pipelineRef.current.stop();
      } catch {
        // ignore stop errors
      }
      pipelineRef.current = null;
    }

    // Extra safety: cancel any lingering speech synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (endCallTimeoutRef.current) {
      clearTimeout(endCallTimeoutRef.current);
      endCallTimeoutRef.current = null;
    }

    if (callId) {
      store.endCall(callId);
      // Also save liveSheet to the call
      store.updateCall(callId, { liveSheet, sentiment: currentSentiment });
    }

    const turns = transcript.length;
    const duration = callDuration;
    const sentiment = currentSentiment;

    setIsInCall(false);
    setPipelineState('idle');
    setIsMuted(false);
    setIsTTSMuted(false);
    setInterimText('');
    setTranscript([]);
    setCallDuration(0);

    // Show summary
    setSummaryData((prev) => ({
      duration,
      turns,
      sentiment,
      endReason: prev?.endReason,
      endSummary: prev?.endSummary,
    }));
    setShowSummary(true);

    isCleaningUpRef.current = false;
  }, [callId, store, transcript, callDuration, currentSentiment, agentMode, language, liveSheet]);

  // Keep endCallRef in sync
  useEffect(() => {
    endCallRef.current = endCall;
  }, [endCall]);

  // ── Start call ──
  const startCall = useCallback(async () => {
    // Guard: don't start if still cleaning up from a previous call
    if (isCleaningUpRef.current) return;

    // Extra safety: clean up any orphaned pipeline
    if (pipelineRef.current) {
      try {
        await pipelineRef.current.stop();
      } catch { /* ignore */ }
      pipelineRef.current = null;
    }
    // Cancel any lingering speech synthesis from previous call
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setErrorMessage('');
    setEscalationMessage('');
    setShowSummary(false);
    setSummaryData(null);
    setLiveSheet(createEmptyLiveSheet());
    setToolCallLog([]);
    setTranscript([]);
    setCallDuration(0);
    setInterimText('');
    setCurrentSentiment(0);
    setRightTab('transcript');

    const callType = agentMode.startsWith('outbound') ? 'outbound' : 'inbound';

    const call = store.createCall({
      type: callType,
      status: 'active',
      language,
      duration: 0,
      transcript: [],
      sentiment: 0,
      escalated: false,
      startedAt: Date.now(),
      agentMode,
    });
    setCallId(call.id);

    const config: PipelineConfig = {
      language,
      useCase: agentMode,
      voiceGender: 'female',
    };

    const pipeline = new PipelineOrchestrator(config, {
      onStateChange: (state) => setPipelineState(state),
      onTranscript: (entry) => {
        setTranscript((prev) => [...prev, entry]);
        setInterimText('');
        store.addTranscriptEntry(call.id, entry);
      },
      onInterimTranscript: (text) => setInterimText(text),
      onSentimentUpdate: (sentiment) => {
        setCurrentSentiment(sentiment);
        store.updateCall(call.id, { sentiment });
      },
      onIntentDetected: () => {
        // Intent detection is handled internally
      },
      onError: (error) => setErrorMessage(error),
      onEscalation: (reason: string, priority: string) => {
        setEscalationMessage(`ESCALATION PROTOCOL INITIATED: ${reason} (PRIORITY: ${priority})`);
        store.updateCall(call.id, { escalated: true });
        endCallTimeoutRef.current = setTimeout(() => {
          endCallRef.current();
        }, 4000);
      },
      onEndCall: (reason: string, summary: string) => {
        setSummaryData({ duration: 0, turns: 0, sentiment: 0, endReason: reason, endSummary: summary });
        // Let the farewell TTS play, then end
        endCallTimeoutRef.current = setTimeout(() => {
          endCallRef.current();
        }, 3000);
      },
      onExtractedInfo: (field: LiveSheetField) => {
        setLiveSheet((prev) => ({
          ...prev,
          extractedFields: [...prev.extractedFields, field],
        }));
        // Auto-switch to info sheet tab when first info arrives
        setRightTab('infosheet');
      },
      onLiveSheetNote: (note: LiveSheetNote) => {
        setLiveSheet((prev) => ({
          ...prev,
          notes: [...prev.notes, note],
        }));
      },
      onTicketCreated: (ticket: LiveSheetTicket) => {
        setLiveSheet((prev) => ({
          ...prev,
          tickets: [...prev.tickets, ticket],
        }));
        // Also create grievance in store
        store.createGrievance({
          ticketId: ticket.ticketId,
          callId: call.id,
          category: ticket.category,
          description: ticket.description,
          status: 'open',
          priority: ticket.priority,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      },
      onToolCall: (tool: ToolCallResult) => {
        setToolCallLog((prev) => [...prev, tool]);
      },
    });

    pipelineRef.current = pipeline;

    const started = await pipeline.start();
    if (!started) {
      setErrorMessage('SYSTEM FAILURE: PIPELINE INITIALIZATION ABORTED. CHECK MIC PERMISSIONS.');
      store.endCall(call.id, 'failed');
      return;
    }

    setIsInCall(true);
    setCallDuration(0);

    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, [language, agentMode, store]);

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

  const toggleTTSMute = useCallback(() => {
    const newMuted = !isTTSMuted;
    setIsTTSMuted(newMuted);
    pipelineRef.current?.setTTSMuted(newMuted);
  }, [isTTSMuted]);

  // ── Derived values ──
  const selectedLang = SUPPORTED_LANGUAGES.find((l) => l.code === language);
  const statusConfig = getStatusConfig(pipelineState);
  const currentModeConfig = AGENT_MODES.find((m) => m.id === agentMode);

  // Which modes to show — default mode only, or all in tester mode
  const visibleModes = testerMode ? AGENT_MODES : AGENT_MODES.filter((m) => m.isDefault);

  const liveSheetItemCount =
    liveSheet.extractedFields.length + liveSheet.notes.length + liveSheet.tickets.length;

  return (
    <div className="animate-in pb-20">
      {/* ───────────────── Disclaimer Modal ───────────────── */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-brutal max-w-lg w-full p-8 relative" style={{ transform: 'none', boxShadow: '8px 8px 0px 0px #ffffff' }}>
            <div className="flex items-center gap-3 mb-6 border-b-[2px] border-white/20 pb-4">
              <AlertTriangle className="h-6 w-6 stroke-[2.5]" />
              <h2 className="text-2xl font-black tracking-tighter uppercase">SYSTEM NOTICE</h2>
            </div>

            <div className="space-y-4 mb-8">
              <p className="text-xs font-bold tracking-widest uppercase text-zinc-300 leading-loose">
                THIS IS A BASE DEMO / MVP BUILD OF THE SARGAM VOICE AI PLATFORM.
                SOME FEATURES MAY EXHIBIT UNEXPECTED BEHAVIOR. ACTIVE DEVELOPMENT
                IN PROGRESS.
              </p>
              <div className="border-l-[2px] border-white/30 pl-4 py-2 space-y-2">
                <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">
                  RECOMMENDED: CHROME DESKTOP WITH MICROPHONE
                </p>
                <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">
                  VOICE RECOGNITION QUALITY VARIES BY BROWSER
                </p>
                <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">
                  BEST RESULTS WITH A QUIET ENVIRONMENT
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowDisclaimer(false)}
              className="glass-brutal-btn w-full py-4 text-sm flex items-center justify-center gap-3"
            >
              ACKNOWLEDGED — PROCEED
            </button>
          </div>
        </div>
      )}

      {/* ───────────────── Header ───────────────── */}
      <div className="mb-12 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <div className="mb-4 inline-flex items-center gap-3 border-[2px] border-white/30 bg-black/50 px-5 py-2 text-sm font-bold tracking-widest uppercase">
            <Radio className="h-4 w-4" />
            LIVE VOICE ORCHESTRATOR
          </div>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter uppercase leading-none">
            VOICE LINK
          </h1>
          <p className="mt-4 text-sm font-bold tracking-widest text-zinc-400 uppercase">
            {currentModeConfig ? `PROFILE: ${currentModeConfig.label}` : 'SELECT AGENT PROFILE'}
          </p>
        </div>

        {/* Call Meta Header Action Area */}
        <div className="flex items-center gap-4">
          {isInCall && (
            <div className="flex items-center gap-3 glass-brutal px-4 py-2 border-white bg-white text-black">
              <Radio className="h-4 w-4 animate-pulse fill-black" />
              <span className="text-sm font-black tracking-widest uppercase">TRANSMITTING</span>
              <span className="font-mono text-sm font-bold ml-2">
                {formatDuration(callDuration)}
              </span>
            </div>
          )}
          {toolCallLog.length > 0 && (
            <div className="flex items-center gap-2 border-[2px] border-zinc-600 bg-zinc-900 px-4 py-2 text-xs font-bold tracking-widest text-white uppercase">
              <Wrench className="h-4 w-4" />
              {toolCallLog.length} TOOLS USED
            </div>
          )}
        </div>
      </div>

      {/* ───────────────── Main Layout ───────────────── */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* LEFT PANEL */}
        <div className="flex flex-col gap-6 lg:w-2/3">
          {/* Error banner */}
          {errorMessage && (
            <div className="glass-brutal border-white bg-white text-black p-6">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="h-6 w-6 stroke-[3]" />
                <h3 className="text-xl font-black tracking-tighter uppercase">CRITICAL ERROR</h3>
              </div>
              <p className="text-sm font-bold tracking-widest uppercase">{errorMessage}</p>
              <button onClick={() => setErrorMessage('')} className="mt-4 border-[2px] border-black px-4 py-2 text-xs font-bold tracking-widest uppercase hover:bg-black hover:text-white transition-colors">
                ACKNOWLEDGE
              </button>
            </div>
          )}

          {/* Escalation banner */}
          {escalationMessage && (
            <div className="glass-brutal border-zinc-500 bg-zinc-200 text-black p-6">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="h-6 w-6 stroke-[3]" />
                <h3 className="text-xl font-black tracking-tighter uppercase">ESCALATION EVENT</h3>
              </div>
              <p className="text-sm font-bold tracking-widest uppercase">{escalationMessage}</p>
            </div>
          )}

          {/* ── Post-call summary ── */}
          {showSummary && summaryData && !isInCall && (
            <div className="glass-brutal p-8">
              <div className="border-b-[2px] border-white/20 pb-4 mb-6 relative">
                <h3 className="text-3xl font-black tracking-tighter uppercase">CONNECTION TERMINATED</h3>
                <button
                  onClick={() => setShowSummary(false)}
                  className="absolute right-0 top-0 text-zinc-500 hover:text-white font-bold tracking-widest text-xs uppercase"
                >
                  [X] DISMISS
                </button>
              </div>

              {summaryData.endSummary && (
                <p className="text-sm font-bold tracking-widest uppercase text-white mb-4 border-l-[2px] border-white pl-4 py-1">{summaryData.endSummary}</p>
              )}
              {summaryData.endReason && (
                <p className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-8 mt-2">
                  CODE: {summaryData.endReason.replace(/_/g, ' ')}
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border-[2px] border-white/20 bg-zinc-900 p-6 flex flex-col justify-between h-32">
                  <Clock className="h-6 w-6 stroke-[2]" />
                  <div>
                    <p className="text-3xl font-black tracking-tighter">{formatDuration(summaryData.duration)}</p>
                    <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mt-1">DURATION</p>
                  </div>
                </div>
                <div className="border-[2px] border-white/20 bg-zinc-900 p-6 flex flex-col justify-between h-32">
                  <TrendingUp className="h-6 w-6 stroke-[2]" />
                  <div>
                    <p className="text-3xl font-black tracking-tighter">{summaryData.turns}</p>
                    <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mt-1">EXCHANGES</p>
                  </div>
                </div>
                <div className="border-[2px] border-white/20 bg-zinc-900 p-6 flex flex-col justify-between h-32">
                  <Brain className="h-6 w-6 stroke-[2]" />
                  <div>
                    <p className="text-3xl font-black tracking-tighter">
                      {summaryData.sentiment > 0.2 ? 'POSITIVE' : summaryData.sentiment < -0.2 ? 'NEGATIVE' : 'NEUTRAL'}
                    </p>
                    <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mt-1">SENTIMENT</p>
                  </div>
                </div>
              </div>

              {/* Info sheet summary from the ended call */}
              {liveSheetItemCount > 0 && (
                <div className="mt-8 border-t-[2px] border-white/20 pt-6">
                  <p className="text-xs font-bold tracking-widest uppercase text-white">
                    DATA EXTRACTED: {liveSheet.extractedFields.length} FIELD(S) | {liveSheet.notes.length} NOTE(S) | {liveSheet.tickets.length} TICKET(S)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* PRE-CALL SETUP */}
          {!isInCall && !showSummary && (
            <div className="glass-brutal p-8">
              <h2 className="text-3xl font-black tracking-tighter uppercase mb-2">INITIALIZE CONNECTION</h2>
              <p className="text-xs font-bold tracking-widest uppercase text-zinc-500 border-b-[2px] border-white/20 pb-6 mb-8">
                CONFIGURE PARAMETERS AND ESTABLISH VOICE LINK.
              </p>

              <div className="space-y-8">
                {/* Tester mode toggle */}
                <div className="flex items-center justify-between border-[2px] border-white/20 bg-black p-4">
                  <div className="flex items-center gap-4">
                    <Zap className="h-5 w-5 stroke-[2] text-white" />
                    <div>
                      <p className="text-sm font-black tracking-widest uppercase text-white">TESTER OVERRIDE</p>
                      <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">UNLOCK ALL PROFILES</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setTesterMode(!testerMode);
                      if (testerMode) setAgentMode('sargam_marketing');
                    }}
                    className="flex items-center gap-2"
                  >
                    {testerMode ? (
                      <ToggleRight className="h-8 w-8 text-white" />
                    ) : (
                      <ToggleLeft className="h-8 w-8 text-zinc-600" />
                    )}
                  </button>
                </div>

                {/* Agent mode selector */}
                <div>
                  <label className="mb-4 flex items-center gap-3 text-sm font-black tracking-widest uppercase text-white">
                    <Brain className="h-5 w-5 stroke-[2]" />
                    {testerMode ? 'AGENT PROFILE OVERRIDE' : 'SELECT EXPERIENCE'}
                  </label>
                  <div className={`grid gap-4 ${testerMode ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-1'}`}>
                    {visibleModes.map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setAgentMode(mode.id)}
                        className={`border-[2px] p-5 text-left transition-all ${agentMode === mode.id
                          ? 'border-white bg-white text-black scale-[1.02]'
                          : 'border-white/20 bg-zinc-900 text-white hover:border-white/50'
                          }`}
                      >
                        <p className={`text-sm font-black tracking-widest uppercase mb-2`}>
                          {mode.label}
                        </p>
                        <p className={`text-xs font-bold leading-relaxed ${agentMode === mode.id ? 'text-zinc-800' : 'text-zinc-500'}`}>{mode.description}</p>
                        {mode.isDefault && testerMode && (
                          <span className={`mt-4 inline-block border-[1px] px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${agentMode === mode.id ? 'border-black text-black' : 'border-white text-white'}`}>
                            DEFAULT
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language selector */}
                <div>
                  <label htmlFor="language" className="mb-4 flex items-center gap-3 text-sm font-black tracking-widest uppercase text-white">
                    <Globe className="h-5 w-5 stroke-[2]" />
                    OPERATIONAL LANGUAGE
                  </label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-none border-[2px] border-white/20 bg-black px-5 py-4 text-sm font-bold tracking-widest text-white outline-none focus:border-white focus:bg-zinc-900 uppercase transition-all appearance-none"
                    style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center' }}
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code} className="bg-black text-white font-bold uppercase">
                        {lang.nativeName} — {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start call button */}
                <button
                  onClick={startCall}
                  className="glass-brutal-btn w-full py-6 text-2xl flex items-center justify-center gap-4 group"
                >
                  <Phone className="h-8 w-8 stroke-[2.5]" />
                  ESTABLISH CONNECTION
                </button>

                <p className="text-center text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                  REQUIRES BROWSER MICROPHONE ACCESS. CHROMIUM ENGINE PREFERRED.
                </p>
              </div>
            </div>
          )}

          {/* ACTIVE CALL DISPLAY */}
          {isInCall && (
            <div className="flex flex-1 flex-col gap-6 animate-in">
              {/* Status card */}
              <div className="glass-brutal p-8">
                <div className="flex flex-col items-center justify-center text-center h-[300px] border-[2px] border-white/10 bg-black relative overflow-hidden">

                  {/* Subtle Background Shape */}
                  <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] blur-[100px] z-0 rounded-full opacity-30 ${pipelineState === 'listening' ? 'bg-white' : pipelineState === 'speaking' ? 'bg-zinc-400' : 'bg-transparent'}`} />

                  {/* Pipeline state badge */}
                  <div
                    className={`relative z-10 inline-flex items-center gap-3 border-[2px] border-black px-6 py-2 text-sm font-black tracking-widest uppercase ${statusConfig.color} ${statusConfig.text} ${statusConfig.ring} transition-all duration-300`}
                  >
                    {pipelineState === 'processing' && <Loader2 className="h-4 w-4 animate-spin" />}
                    {pipelineState === 'listening' && <Radio className="h-4 w-4" />}
                    {pipelineState === 'speaking' && <Volume2 className="h-4 w-4" />}
                    {statusConfig.label}
                  </div>

                  {/* Audio visualization bars */}
                  <div className="relative z-10 mt-12 flex items-end justify-center gap-2 h-[40px]">
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className={`w-3 transition-all duration-300 ${pipelineState === 'listening'
                          ? 'bg-white shadow-[0_0_10px_white]'
                          : pipelineState === 'speaking'
                            ? 'bg-zinc-400'
                            : pipelineState === 'processing'
                              ? 'bg-zinc-600'
                              : 'bg-zinc-800'
                          }`}
                        style={{
                          height: pipelineState === 'idle' ? '12px' : `${[24, 45, 30, 18, 40, 25, 35][i]}px`,
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Duration timer */}
                  <p className="relative z-10 mt-12 font-mono text-6xl font-black tracking-tighter text-white">
                    {formatDuration(callDuration)}
                  </p>
                </div>

                {/* Meta row */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                  <span className="inline-flex items-center gap-2 border-[1px] border-white/30 bg-black px-4 py-2 text-xs font-bold tracking-widest text-white uppercase">
                    <Globe className="h-4 w-4" />
                    {selectedLang?.nativeName || language}
                  </span>
                  <span className="inline-flex items-center gap-2 border-[1px] border-white/30 bg-black px-4 py-2 text-xs font-bold tracking-widest text-white uppercase">
                    <Brain className="h-4 w-4" />
                    {currentModeConfig?.label || agentMode}
                  </span>
                </div>
              </div>

              {/* Call controls bar */}
              <div className="flex items-center justify-center gap-6 glass-brutal p-6">
                <button
                  onClick={toggleMute}
                  className={`flex h-20 w-20 items-center justify-center border-[2px] transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0_white] ${isMuted
                    ? 'border-white bg-white text-black shadow-[4px_4px_0_white]'
                    : 'border-white/20 bg-black text-white'
                    }`}
                  title={isMuted ? 'UNMUTE MIC' : 'MUTE MIC'}
                >
                  {isMuted ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                </button>

                <button
                  onClick={endCall}
                  className="flex h-24 w-24 items-center justify-center bg-white text-black border-[4px] border-white transition-all hover:-translate-y-2 hover:shadow-[8px_8px_0_rgba(255,255,255,0.5)] active:translate-y-0 active:shadow-none"
                  title="TERMINATE CONNECTION"
                >
                  <PhoneOff className="h-10 w-10 fill-black" />
                </button>

                <button
                  onClick={toggleTTSMute}
                  className={`flex h-20 w-20 items-center justify-center border-[2px] transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0_white] ${isTTSMuted
                    ? 'border-white bg-white text-black shadow-[4px_4px_0_white]'
                    : 'border-white/20 bg-black text-white'
                    }`}
                  title={isTTSMuted ? 'UNMUTE AGENT' : 'MUTE AGENT'}
                >
                  {isTTSMuted ? <VolumeX className="h-8 w-8" /> : <Volume2 className="h-8 w-8" />}
                </button>
              </div>
            </div>
          )}

          {/* ── Previous Call History (shown below when not in call) ── */}
          {!isInCall && previousTranscripts.length > 0 && (
            <div className="glass-brutal p-8 animate-in">
              <h3 className="mb-6 text-2xl font-black tracking-tighter uppercase text-white border-b-[2px] border-white/20 pb-4">SESSION LOGS</h3>
              <div className="space-y-4">
                {previousTranscripts.map((prev, idx) => {
                  const modeLabel = AGENT_MODES.find((m) => m.id === prev.agentMode)?.label || prev.agentMode;
                  const langLabel = SUPPORTED_LANGUAGES.find((l) => l.code === prev.language)?.nativeName || prev.language;
                  return (
                    <details key={prev.callId + idx} className="group border-[2px] border-white/20 bg-black">
                      <summary className="flex cursor-pointer items-center justify-between p-4 hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <Phone className="h-5 w-5 text-zinc-500 stroke-[2]" />
                          <span className="text-xs font-black tracking-widest text-white uppercase">{modeLabel}</span>
                          <span className="text-[10px] font-bold tracking-widest text-zinc-500 border-l-[2px] border-zinc-700 pl-4 ml-2 uppercase">{langLabel}</span>
                          <span className="text-[10px] font-bold tracking-widest text-zinc-500 font-mono border-l-[2px] border-zinc-700 pl-4 ml-2">{formatDuration(prev.duration)}</span>
                        </div>
                        <span className="text-[10px] font-bold tracking-widest text-white bg-zinc-800 px-3 py-1 uppercase">
                          {prev.transcript.length} MSGS
                        </span>
                      </summary>
                      <div className="max-h-80 overflow-y-auto p-4 border-t-[2px] border-white/20 space-y-4 bg-zinc-950">
                        {prev.transcript.map((entry, i) => (
                          <div
                            key={i}
                            className={`p-4 border-[1px] ${entry.role === 'user'
                              ? 'border-zinc-700 bg-black text-zinc-300 ml-12'
                              : 'border-white bg-white text-black mr-12'
                              }`}
                          >
                            <span className={`block mb-2 text-[10px] font-black tracking-widest uppercase ${entry.role === 'user' ? 'text-zinc-500' : 'text-zinc-800'}`}>
                              {entry.role === 'user' ? 'YOU' : 'SYSTEM AI'}
                            </span>
                            <span className="text-sm font-bold uppercase tracking-wide leading-relaxed">
                              {entry.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL — Transcript + Info Sheet */}
        <div className="flex flex-col lg:w-1/3">
          <div className="flex h-full flex-col glass-brutal overflow-hidden">
            {/* Tab switcher */}
            <div className="flex border-b-[2px] border-white/20 bg-black">
              <button
                onClick={() => setRightTab('transcript')}
                className={`flex flex-1 items-center justify-center gap-3 px-4 py-6 text-xs font-black tracking-widest uppercase transition-colors border-b-[4px] ${rightTab === 'transcript'
                  ? 'border-white text-white bg-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-white hover:bg-zinc-900/50'
                  }`}
              >
                <MessageSquare className="h-4 w-4 stroke-[2]" />
                TRANSCRIPT
                {transcript.length > 0 && (
                  <span className="bg-white text-black px-2 py-0.5 text-[10px]">
                    {transcript.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setRightTab('infosheet')}
                className={`flex flex-1 items-center justify-center gap-3 px-4 py-6 text-xs font-black tracking-widest uppercase transition-colors border-b-[4px] ${rightTab === 'infosheet'
                  ? 'border-white text-white bg-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-white hover:bg-zinc-900/50'
                  }`}
              >
                <FileText className="h-4 w-4 stroke-[2]" />
                DATA STREAM
                {liveSheetItemCount > 0 && (
                  <span className="bg-zinc-300 text-black px-2 py-0.5 text-[10px]">
                    {liveSheetItemCount}
                  </span>
                )}
              </button>
            </div>

            {/* Tab content */}
            {rightTab === 'transcript' ? (
              <div className="flex-1 overflow-y-auto p-6 bg-zinc-950" style={{ maxHeight: 'calc(100vh - 200px)', minHeight: '500px' }}>
                {transcript.length === 0 && !interimText && (
                  <div className="flex h-full flex-col items-center justify-center text-center opacity-30">
                    <MessageSquare className="h-16 w-16 mb-6 stroke-[1]" />
                    <p className="text-sm font-bold tracking-widest text-white uppercase">
                      {isInCall ? 'AWAITING TRANSMISSION...' : 'LOG EMPTY. DEPLOY CALL TO INITIATE.'}
                    </p>
                  </div>
                )}

                <div className="space-y-6">
                  {transcript.map((entry, idx) => {
                    const isUser = entry.role === 'user';
                    return (
                      <div
                        key={idx}
                        className={`p-4 border-[2px] ${isUser
                          ? 'border-zinc-700 bg-black ml-8'
                          : 'border-white bg-white text-black mr-8'
                          }`}
                      >
                        <div className="mb-3 flex items-center justify-between border-b-[1px] pb-2 border-current opacity-50">
                          <div className="flex items-center gap-2">
                            {isUser ? (
                              <Mic className="h-4 w-4 stroke-[2]" />
                            ) : (
                              <Brain className="h-4 w-4 stroke-[2]" />
                            )}
                            <span className="text-[10px] font-black tracking-widest uppercase">
                              {isUser ? 'YOU' : 'SYSTEM AI'}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] font-bold tracking-widest">
                            {new Date(entry.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className={`text-xs font-bold uppercase tracking-widest leading-loose ${isUser ? 'text-zinc-300' : 'text-black'}`}>{entry.text}</p>
                      </div>
                    );
                  })}

                  {interimText && (
                    <div className="p-4 border-[2px] border-zinc-700 bg-black ml-8 border-dashed">
                      <div className="mb-3 flex items-center justify-between border-b-[1px] border-zinc-700 pb-2">
                        <div className="flex items-center gap-2 text-zinc-500">
                          <Mic className="h-4 w-4 stroke-[2]" />
                          <span className="text-[10px] font-black tracking-widest uppercase">YOU</span>
                        </div>
                        <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest leading-loose text-zinc-500 italic blur-[1px] hover:blur-none transition-all">{interimText}</p>
                    </div>
                  )}

                  <div ref={transcriptEndRef} />
                </div>
              </div>
            ) : (
              // If the LiveInfoSheet exists as a component, we render it. 
              // It might have non-brutalist styles but at least it's contained inside this tab.
              // To make it blend better, wrapping it in a container.
              <div className="flex-1 overflow-y-auto bg-zinc-950 p-4">
                <LiveInfoSheet data={liveSheet} isActive={isInCall} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
