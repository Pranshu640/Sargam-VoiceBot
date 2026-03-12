'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  CheckCircle,
  Clock,
  Users,
  Globe,
  FileText,
  Phone,
  Trash2,
  ChevronRight,
  BarChart3,
  Target,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { Campaign, SUPPORTED_LANGUAGES } from '@/types';

// ============================================================
// Constants & Helpers
// ============================================================

const CAMPAIGN_TYPE_CONFIG: Record<
  Campaign['type'],
  { label: string; color: string; bg: string; border: string; icon: string; barColor: string }
> = {
  survey: {
    label: 'SURVEY',
    color: 'text-white',
    bg: 'bg-zinc-800',
    border: 'border-white',
    icon: 'white',
    barColor: 'bg-white',
  },
  outreach: {
    label: 'OUTREACH',
    color: 'text-white',
    bg: 'bg-zinc-800',
    border: 'border-white',
    icon: 'white',
    barColor: 'bg-white',
  },
  reminder: {
    label: 'REMINDER',
    color: 'text-white',
    bg: 'bg-zinc-800',
    border: 'border-white',
    icon: 'white',
    barColor: 'bg-white',
  },
  grievance: {
    label: 'GRIEVANCE',
    color: 'text-white',
    bg: 'bg-zinc-800',
    border: 'border-white',
    icon: 'white',
    barColor: 'bg-white',
  },
};

const STATUS_CONFIG: Record<
  Campaign['status'],
  { label: string; color: string; bg: string; pulse: boolean }
> = {
  draft: { label: 'DRAFT', color: 'text-zinc-500', bg: 'bg-zinc-900', pulse: false },
  active: { label: 'ACTIVE', color: 'text-black', bg: 'bg-white', pulse: true },
  paused: { label: 'PAUSED', color: 'text-white', bg: 'bg-zinc-600', pulse: false },
  completed: { label: 'COMPLETED', color: 'text-zinc-300', bg: 'bg-zinc-800', pulse: false },
};

const LANG_NAME_MAP: Record<string, string> = {
  'en-IN': 'ENGLISH',
  'hi-IN': 'HINDI',
  'ta-IN': 'TAMIL',
  'te-IN': 'TELUGU',
  'bn-IN': 'BENGALI',
  'kn-IN': 'KANNADA',
  'ml-IN': 'MALAYALAM',
  'mr-IN': 'MARATHI',
  'gu-IN': 'GUJARATI',
  'pa-IN': 'PUNJABI',
  'or-IN': 'ODIA',
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).toUpperCase();
}

// ============================================================
// Type icon component
// ============================================================

function CampaignTypeIcon({ type }: { type: Campaign['type'] }) {
  const config = CAMPAIGN_TYPE_CONFIG[type];
  return (
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center border-[2px] border-white/20 bg-black`}>
      {type === 'survey' && <BarChart3 className={`h-6 w-6 stroke-[2] ${config.color}`} />}
      {type === 'outreach' && <Megaphone className={`h-6 w-6 stroke-[2] ${config.color}`} />}
      {type === 'reminder' && <Clock className={`h-6 w-6 stroke-[2] ${config.color}`} />}
      {type === 'grievance' && <FileText className={`h-6 w-6 stroke-[2] ${config.color}`} />}
    </div>
  );
}

// ============================================================
// Status badge component
// ============================================================

function StatusBadge({ status }: { status: Campaign['status'] }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-2 border-[1px] px-2 py-1 text-[10px] font-black uppercase tracking-widest ${config.bg} ${config.color} ${status === 'active' ? 'border-transparent' : 'border-white/20'}`}
    >
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-none bg-black opacity-75" />
          <span className="relative inline-flex h-full w-full rounded-none bg-black" />
        </span>
      )}
      {config.label}
    </span>
  );
}

// ============================================================
// Campaigns Page
// ============================================================

export default function CampaignsPage() {
  const store = useStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [dialingCampaignId, setDialingCampaignId] = useState<string | null>(null);

  // Simulation timers — track by campaign id
  const simulationTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // ── Form state ──
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<Campaign['type']>('survey');
  const [formDescription, setFormDescription] = useState('');
  const [formLanguage, setFormLanguage] = useState('en-IN');
  const [formTargetCount, setFormTargetCount] = useState(100);
  const [formScript, setFormScript] = useState('');

  // ── Cleanup timers on unmount ──
  useEffect(() => {
    const timers = simulationTimers.current;
    return () => {
      Object.values(timers).forEach(clearInterval);
    };
  }, []);

  // ── Sorted campaigns (most recent first) ──
  const campaigns = [...store.campaigns].sort((a, b) => b.createdAt - a.createdAt);

  // ── Stats ──
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;
  const completedCampaigns = campaigns.filter((c) => c.status === 'completed').length;
  const totalContactsReached = campaigns.reduce((sum, c) => sum + c.completedCount, 0);

  // ── Selected campaign ──
  const selectedCampaign = selectedCampaignId
    ? campaigns.find((c) => c.id === selectedCampaignId) || null
    : null;

  // ── Create campaign handler ──
  const handleCreateCampaign = useCallback(() => {
    if (!formName.trim()) return;

    store.createCampaign({
      name: formName.trim(),
      type: formType,
      status: 'draft',
      description: formDescription.trim(),
      targetCount: formTargetCount,
      completedCount: 0,
      script: formScript.trim(),
      language: formLanguage,
      contacts: [],
      createdAt: Date.now(),
    });

    // Reset form
    setFormName('');
    setFormType('survey');
    setFormDescription('');
    setFormLanguage('en-IN');
    setFormTargetCount(100);
    setFormScript('');
    setShowCreateModal(false);
  }, [formName, formType, formDescription, formTargetCount, formScript, formLanguage, store]);

  // ── Start campaign simulation ──
  const startCampaignSimulation = useCallback(
    (campaignId: string) => {
      const campaign = store.campaigns.find((c) => c.id === campaignId);
      if (!campaign) return;

      // Update status to active
      store.updateCampaign(campaignId, { status: 'active' });
      setDialingCampaignId(campaignId);

      // Clear any existing timer for this campaign
      if (simulationTimers.current[campaignId]) {
        clearInterval(simulationTimers.current[campaignId]);
      }

      // Show dialing animation for 2 seconds before starting
      setTimeout(() => {
        setDialingCampaignId(null);

        simulationTimers.current[campaignId] = setInterval(() => {
          const current = store.campaigns.find((c) => c.id === campaignId);
          if (!current) {
            clearInterval(simulationTimers.current[campaignId]);
            delete simulationTimers.current[campaignId];
            return;
          }

          const newCompleted = current.completedCount + 1;
          const newSuccessRate = Math.floor(60 + Math.random() * 30);

          if (newCompleted >= current.targetCount) {
            store.updateCampaign(campaignId, {
              completedCount: current.targetCount,
              successRate: newSuccessRate,
              status: 'completed',
            });
            clearInterval(simulationTimers.current[campaignId]);
            delete simulationTimers.current[campaignId];
          } else {
            store.updateCampaign(campaignId, {
              completedCount: newCompleted,
              successRate: newSuccessRate,
            });
          }
        }, 2000);
      }, 2000);
    },
    [store],
  );

  // ── Pause campaign ──
  const pauseCampaign = useCallback(
    (campaignId: string) => {
      store.updateCampaign(campaignId, { status: 'paused' });
      if (simulationTimers.current[campaignId]) {
        clearInterval(simulationTimers.current[campaignId]);
        delete simulationTimers.current[campaignId];
      }
    },
    [store],
  );

  // ── Delete campaign ──
  const deleteCampaign = useCallback(
    (campaignId: string) => {
      // Stop any running simulation
      if (simulationTimers.current[campaignId]) {
        clearInterval(simulationTimers.current[campaignId]);
        delete simulationTimers.current[campaignId];
      }
      // Truly delete from Convex
      store.deleteCampaign(campaignId);
      if (selectedCampaignId === campaignId) {
        setSelectedCampaignId(null);
      }
    },
    [store, selectedCampaignId],
  );

  return (
    <div className="animate-in pb-20">
      <div className="mx-auto max-w-[1400px]">
        {/* ───────────────── Header ───────────────── */}
        <div className="mb-12 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-3 border-[2px] border-white/30 bg-black/50 px-5 py-2 text-sm font-bold tracking-widest uppercase">
              <Megaphone className="h-4 w-4" />
              BATCH OUTREACH MODULE
            </div>
            <h1 className="text-5xl sm:text-7xl font-black tracking-tighter uppercase leading-none">
              CAMPAIGNS
            </h1>
            <p className="mt-4 text-sm font-bold tracking-widest text-zinc-400 uppercase">
              MANAGE HIGH-VOLUME AUTOMATED COMMUNICATIONS
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="glass-brutal-btn inline-flex items-center gap-3 px-8 py-4 text-lg group"
          >
            <Plus className="h-5 w-5 stroke-[3] group-hover:rotate-90 transition-transform" />
            NEW DEPLOYMENT
          </button>
        </div>

        {/* ───────────────── Stats Row ───────────────── */}
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 mb-12">
          <div className="glass-brutal p-8 flex flex-col justify-between h-40">
            <div className="flex items-center gap-4 border-b-[2px] border-white/20 pb-4 mb-4">
              <Target className="h-5 w-5 stroke-[2] text-zinc-500" />
              <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">SYSTEM TARGETS</p>
            </div>
            <p className="text-5xl font-black tracking-tighter">{totalCampaigns}</p>
          </div>
          <div className="glass-brutal p-8 flex flex-col justify-between h-40">
            <div className="flex items-center gap-4 border-b-[2px] border-white/20 pb-4 mb-4">
              <Play className="h-5 w-5 stroke-[2] fill-white" />
              <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">ACTIVE BATCHES</p>
            </div>
            <p className="text-5xl font-black tracking-tighter text-white">{activeCampaigns}</p>
          </div>
          <div className="glass-brutal p-8 flex flex-col justify-between h-40">
            <div className="flex items-center gap-4 border-b-[2px] border-white/20 pb-4 mb-4">
              <CheckCircle className="h-5 w-5 stroke-[2] text-zinc-400" />
              <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">COMPLETED</p>
            </div>
            <p className="text-5xl font-black tracking-tighter text-zinc-300">{completedCampaigns}</p>
          </div>
          <div className="glass-brutal p-8 flex flex-col justify-between h-40">
            <div className="flex items-center gap-4 border-b-[2px] border-white/20 pb-4 mb-4">
              <Users className="h-5 w-5 stroke-[2] text-zinc-500" />
              <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">CONTACT REACH</p>
            </div>
            <p className="text-5xl font-black tracking-tighter text-zinc-100">{totalContactsReached.toLocaleString()}</p>
          </div>
        </div>

        {/* ───────────────── Campaign Detail View ───────────────── */}
        {selectedCampaign && (
          <div className="mb-12 glass-brutal animate-in">
            {/* Detail header */}
            <div className="flex items-center justify-between border-b-[2px] border-white/20 px-8 py-6">
              <div className="flex items-center gap-6">
                <CampaignTypeIcon type={selectedCampaign.type} />
                <div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase mb-2">{selectedCampaign.name}</h2>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={selectedCampaign.status} />
                    <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase border-l-[2px] border-zinc-700 pl-4">
                      INIT: {formatDate(selectedCampaign.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCampaignId(null)}
                className="text-[10px] font-bold tracking-widest text-zinc-500 hover:text-white transition-colors flex items-center gap-2 uppercase"
              >
                [X] CLOSE
              </button>
            </div>

            <div className="p-8">
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Left — Info */}
                <div className="space-y-8">
                  {/* Description */}
                  <div className="border-[2px] border-white/20 p-6 bg-black">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b-[2px] border-white/20 pb-4 mb-4">
                      OBJECTIVE // DESCRIPTION
                    </h3>
                    <p className="text-sm font-bold uppercase tracking-widest leading-loose text-white">
                      {selectedCampaign.description || 'NO DESCRIPTION CONFIGURED.'}
                    </p>
                  </div>

                  {/* Meta grid */}
                  <div className="grid grid-cols-2 gap-6 relative">
                    <div className="border-[2px] border-white/20 p-4 bg-black">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 border-b-[1px] border-zinc-700 pb-2">LOCALE</p>
                      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white mt-4">
                        <Globe className="h-4 w-4" />
                        {LANG_NAME_MAP[selectedCampaign.language] || selectedCampaign.language.toUpperCase()}
                      </p>
                    </div>
                    <div className="border-[2px] border-white/20 p-4 bg-black">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 border-b-[1px] border-zinc-700 pb-2">TYPE</p>
                      <p className="text-xs font-bold uppercase tracking-widest text-white mt-4">
                        {CAMPAIGN_TYPE_CONFIG[selectedCampaign.type].label}
                      </p>
                    </div>
                    <div className="border-[2px] border-white/20 p-4 bg-black">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 border-b-[1px] border-zinc-700 pb-2">BURNDOWN</p>
                      <p className="text-xs font-bold uppercase tracking-widest text-white mt-4 flex justify-between">
                        <span>{selectedCampaign.completedCount}</span> / <span>{selectedCampaign.targetCount}</span>
                      </p>
                    </div>
                    <div className="border-[2px] border-white/20 p-4 bg-black relative">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 border-b-[1px] border-zinc-700 pb-2">YIELD RATE</p>
                      <p className="text-2xl font-black uppercase tracking-tighter text-white mt-4">
                        {selectedCampaign.successRate != null
                          ? `${selectedCampaign.successRate}%`
                          : '--'}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="border-[2px] border-white/20 p-6 bg-black">
                    <div className="mb-4 flex items-center justify-between text-[10px] font-black tracking-widest text-zinc-500 uppercase border-b-[2px] border-zinc-700 pb-2">
                      <span>EXECUTION PROGRESS</span>
                      <span>
                        {selectedCampaign.targetCount > 0
                          ? Math.round(
                            (selectedCampaign.completedCount / selectedCampaign.targetCount) *
                            100,
                          )
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="h-6 w-full border-[1px] border-white/30 bg-black p-1">
                      <div
                        className={`h-full bg-white transition-all duration-500 ease-out`}
                        style={{
                          width: `${selectedCampaign.targetCount > 0
                            ? Math.min(
                              (selectedCampaign.completedCount /
                                selectedCampaign.targetCount) *
                              100,
                              100,
                            )
                            : 0
                            }%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Action button */}
                  {(selectedCampaign.status === 'draft' ||
                    selectedCampaign.status === 'paused') && (
                      <button
                        onClick={() => startCampaignSimulation(selectedCampaign.id)}
                        disabled={dialingCampaignId === selectedCampaign.id}
                        className="w-full glass-brutal-btn border-white px-6 py-6 text-xl flex items-center justify-center gap-4 bg-white text-black active:translate-y-0 disabled:opacity-50"
                      >
                        {dialingCampaignId === selectedCampaign.id ? (
                          <>
                            <Phone className="h-6 w-6 stroke-[3] animate-pulse" />
                            INITIATING...
                          </>
                        ) : (
                          <>
                            <Play className="h-6 w-6 stroke-[3] fill-black" />
                            DEPLOY CAMPAIGN BATCH
                          </>
                        )}
                      </button>
                    )}
                  {selectedCampaign.status === 'active' && (
                    <button
                      onClick={() => pauseCampaign(selectedCampaign.id)}
                      className="w-full border-[2px] border-white px-6 py-6 text-xl flex items-center justify-center gap-4 text-white hover:bg-white hover:text-black transition-colors bg-zinc-900 font-black tracking-tighter uppercase"
                    >
                      <Pause className="h-6 w-6 stroke-[3] fill-current" />
                      HALT EXECUTION
                    </button>
                  )}
                </div>

                {/* Right — Script */}
                <div className="flex flex-col h-full border-[2px] border-white/20 p-6 bg-black">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b-[2px] border-white/20 pb-4 mb-4">
                    AI INSTRUCTION PAYLOAD
                  </h3>
                  <div className="flex-1 rounded-none border-[1px] border-dashed border-zinc-700 bg-zinc-950 p-6 overflow-y-auto">
                    <p className="whitespace-pre-wrap text-xs font-bold uppercase tracking-widest leading-loose text-zinc-400 font-mono">
                      {selectedCampaign.script || '< EMPTY SCRIPT >'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────── Campaign List ───────────────── */}
        <div className="mt-12">
          {campaigns.length === 0 ? (
            /* Empty state */
            <div className="glass-brutal flex flex-col items-center justify-center px-8 py-32 text-center">
              <div className="flex h-24 w-24 items-center justify-center border-[2px] border-zinc-700 bg-zinc-900 mb-8">
                <Megaphone className="h-10 w-10 text-zinc-500 stroke-[1]" />
              </div>
              <h3 className="text-4xl font-black tracking-tighter uppercase text-white mb-4">NO BATCHES SCHEDULED</h3>
              <p className="max-w-xl text-sm font-bold tracking-widest uppercase text-zinc-500 leading-relaxed mx-auto border-t-[2px] border-zinc-800 pt-6">
                ORCHESTRATE HIGH-VOLUME AUTOMATED CALL CAMPAIGNS.
                DESIGNATE A TARGET AUDIENCE AND DEPLOY INSTANTANEOUSLY.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-12 glass-brutal-btn inline-flex items-center gap-4 px-10 py-5"
              >
                <Plus className="h-5 w-5 stroke-[3]" />
                INITIALIZE GENESIS BATCH
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign, idx) => {
                const typeConfig = CAMPAIGN_TYPE_CONFIG[campaign.type];
                const progress =
                  campaign.targetCount > 0
                    ? Math.round(
                      (campaign.completedCount / campaign.targetCount) * 100,
                    )
                    : 0;

                return (
                  <div
                    key={campaign.id}
                    className={`group relative glass-brutal flex flex-col transition-all cursor-pointer ${selectedCampaignId === campaign.id
                      ? 'border-white bg-zinc-900'
                      : 'border-white/20 hover:border-white/50'
                      }`}
                    style={{ animationDelay: `${idx * 80}ms` }}
                    onClick={() => setSelectedCampaignId(selectedCampaignId === campaign.id ? null : campaign.id)}
                  >
                    <div className="p-6 flex-1">
                      {/* Top row: icon + name + status */}
                      <div className="flex items-start gap-4 mb-6">
                        <CampaignTypeIcon type={campaign.type} />
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-lg font-black tracking-widest text-white uppercase">
                            {campaign.name}
                          </h3>
                          <div className="mt-2 flex items-center gap-3">
                            <StatusBadge status={campaign.status} />
                            <span className={`text-[10px] font-black uppercase tracking-widest text-zinc-500`}>
                              {typeConfig.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="mt-4 line-clamp-2 text-xs font-bold leading-relaxed text-zinc-500 uppercase tracking-widest border-l-[2px] border-zinc-700 pl-3 min-h-[40px]">
                        {campaign.description || 'N/A'}
                      </p>

                      {/* Progress bar */}
                      <div className="mt-6 border-[2px] border-white/10 p-4 bg-black">
                        <div className="mb-2 flex items-center justify-between text-[10px] font-black tracking-widest uppercase text-zinc-500">
                          <span>{campaign.completedCount} / {campaign.targetCount}</span>
                          <span className="text-white">{progress}%</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-900 border-[1px] border-zinc-700 overflow-hidden">
                          <div
                            className={`h-full ${typeConfig.barColor} transition-all duration-500 ease-out`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Meta row */}
                      <div className="mt-4 flex items-center gap-4 text-[10px] font-black tracking-widest uppercase text-zinc-500 pt-4 border-t-[1px] border-white/10">
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {LANG_NAME_MAP[campaign.language] || campaign.language.substring(0, 2)}
                        </span>
                        {campaign.successRate != null && (
                          <span className="flex items-center gap-1 border-l-[1px] border-zinc-700 pl-4">
                            <BarChart3 className="h-3 w-3" />
                            {campaign.successRate}% YIELD
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions bar */}
                    <div className="flex items-center justify-between border-t-[2px] border-white/20 p-4 bg-black group-hover:bg-zinc-900 transition-colors">
                      <div className="flex gap-2">
                        {(campaign.status === 'draft' || campaign.status === 'paused') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startCampaignSimulation(campaign.id);
                            }}
                            disabled={dialingCampaignId === campaign.id}
                            className="border-[1px] border-white p-2 hover:bg-white hover:text-black transition-colors text-white disabled:opacity-50"
                          >
                            {dialingCampaignId === campaign.id ? (
                              <Phone className="h-4 w-4 animate-pulse stroke-[3]" />
                            ) : (
                              <Play className="h-4 w-4 stroke-[3] fill-current" />
                            )}
                          </button>
                        )}
                        {campaign.status === 'active' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              pauseCampaign(campaign.id);
                            }}
                            className="border-[1px] border-white p-2 hover:bg-white hover:text-black transition-colors text-white"
                          >
                            <Pause className="h-4 w-4 stroke-[3] fill-current" />
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCampaign(campaign.id);
                          }}
                          className="border-[1px] border-zinc-700 p-2 text-zinc-500 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors ml-2"
                          title="TERMINATE"
                        >
                          <Trash2 className="h-4 w-4 stroke-[2]" />
                        </button>
                      </div>

                      <button
                        className="text-[10px] font-black tracking-widest uppercase text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ───────────────── Create Campaign Modal ───────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setShowCreateModal(false)}
          />

          <div className="relative w-full max-w-2xl glass-brutal bg-black animate-in shadow-[15px_15px_0px_white] z-10 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b-[2px] border-white/20 px-8 py-6 flex-shrink-0 bg-zinc-950">
              <div className="flex items-center gap-4">
                <Megaphone className="h-6 w-6 stroke-[3]" />
                <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">NEW BATCH COMMS</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 hover:text-white"
              >
                [X]
              </button>
            </div>

            <div className="overflow-y-auto p-8 space-y-8">
              {/* Campaign Name */}
              <div>
                <label
                  htmlFor="campaign-name"
                  className="mb-2 block text-[10px] font-black tracking-widest uppercase text-zinc-500"
                >
                  OPERATION ID // NAME
                </label>
                <input
                  id="campaign-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="EX: ALPHA OUTREACH Q1"
                  className="w-full border-[2px] border-white/20 bg-zinc-900 px-6 py-4 text-sm font-bold tracking-widest uppercase text-white placeholder:text-zinc-600 outline-none focus:border-white transition-colors"
                />
              </div>

              {/* Campaign Type */}
              <div>
                <label
                  htmlFor="campaign-type"
                  className="mb-2 block text-[10px] font-black tracking-widest uppercase text-zinc-500"
                >
                  VECTOR
                </label>
                <select
                  id="campaign-type"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as Campaign['type'])}
                  className="w-full border-[2px] border-white/20 bg-zinc-900 px-6 py-4 text-sm font-bold tracking-widest uppercase text-white outline-none focus:border-white appearance-none"
                  style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center' }}
                >
                  <option value="survey" className="bg-black text-white">SYSTEM SURVEY</option>
                  <option value="outreach" className="bg-black text-white">COLD OUTREACH</option>
                  <option value="reminder" className="bg-black text-white">COMPLIANCE REMINDER</option>
                  <option value="grievance" className="bg-black text-white">GRIEVANCE CAPTURE</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="campaign-desc"
                  className="mb-2 block text-[10px] font-black tracking-widest uppercase text-zinc-500"
                >
                  PARAMETERS // BRIEFING
                </label>
                <textarea
                  id="campaign-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="DELINEATE MISSION OBJECTIVES..."
                  rows={3}
                  className="w-full resize-y border-[2px] border-white/20 bg-zinc-900 px-6 py-4 text-sm font-bold tracking-widest uppercase text-white placeholder:text-zinc-600 outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Language */}
                <div>
                  <label
                    htmlFor="campaign-lang"
                    className="mb-2 block text-[10px] font-black tracking-widest uppercase text-zinc-500"
                  >
                    LANGUAGE PROTOCOL
                  </label>
                  <select
                    id="campaign-lang"
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value)}
                    className="w-full border-[2px] border-white/20 bg-zinc-900 px-6 py-4 text-sm font-bold tracking-widest uppercase text-white outline-none focus:border-white transition-colors appearance-none"
                    style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center' }}
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code} className="bg-black text-white">
                        {lang.nativeName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Count */}
                <div>
                  <label
                    htmlFor="campaign-target"
                    className="mb-2 block text-[10px] font-black tracking-widest uppercase text-zinc-500"
                  >
                    VOLUME CAP
                  </label>
                  <input
                    id="campaign-target"
                    type="number"
                    value={formTargetCount}
                    onChange={(e) => setFormTargetCount(Number(e.target.value))}
                    min={1}
                    className="w-full border-[2px] border-white/20 bg-zinc-900 px-6 py-4 text-sm font-bold tracking-widest uppercase text-white outline-none focus:border-white font-mono"
                  />
                </div>
              </div>

              {/* Script */}
              <div>
                <label
                  htmlFor="campaign-script"
                  className="mb-2 block text-[10px] font-black tracking-widest uppercase text-zinc-500"
                >
                  SYSTEM PAYLOAD // SCRIPT OVERRIDES
                </label>
                <textarea
                  id="campaign-script"
                  value={formScript}
                  onChange={(e) => setFormScript(e.target.value)}
                  placeholder="> INJECT CUSTOM DIRECTIVES HERE"
                  rows={4}
                  className="w-full resize-y border-[2px] border-white/20 bg-zinc-900 px-6 py-4 text-sm font-bold tracking-widest uppercase text-white placeholder:text-zinc-600 outline-none focus:border-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 border-t-[2px] border-white/20 p-8 flex-shrink-0 bg-black">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 glass-brutal-btn-alt py-5 text-sm"
              >
                ABORT CONFIG
              </button>
              <button
                onClick={handleCreateCampaign}
                disabled={!formName.trim()}
                className="flex-1 glass-brutal-btn bg-white text-black py-5 text-sm disabled:opacity-50 hover:bg-zinc-200"
              >
                COMMIT BATCH
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
