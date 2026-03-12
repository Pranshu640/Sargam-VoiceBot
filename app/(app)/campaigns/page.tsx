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
  X,
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
    label: 'Survey',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    icon: 'violet',
    barColor: 'bg-violet-500',
  },
  outreach: {
    label: 'Outreach',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    icon: 'indigo',
    barColor: 'bg-indigo-500',
  },
  reminder: {
    label: 'Reminder',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: 'amber',
    barColor: 'bg-amber-500',
  },
  grievance: {
    label: 'Grievance',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'red',
    barColor: 'bg-red-500',
  },
};

const STATUS_CONFIG: Record<
  Campaign['status'],
  { label: string; color: string; bg: string; pulse: boolean }
> = {
  draft: { label: 'Draft', color: 'text-slate-400', bg: 'bg-slate-500/15', pulse: false },
  active: { label: 'Active', color: 'text-emerald-400', bg: 'bg-emerald-500/15', pulse: true },
  paused: { label: 'Paused', color: 'text-amber-400', bg: 'bg-amber-500/15', pulse: false },
  completed: { label: 'Completed', color: 'text-blue-400', bg: 'bg-blue-500/15', pulse: false },
};

const LANG_NAME_MAP: Record<string, string> = {
  'en-IN': 'English (India)',
  'hi-IN': 'Hindi',
  'ta-IN': 'Tamil',
  'te-IN': 'Telugu',
  'bn-IN': 'Bengali',
  'kn-IN': 'Kannada',
  'ml-IN': 'Malayalam',
  'mr-IN': 'Marathi',
  'gu-IN': 'Gujarati',
  'pa-IN': 'Punjabi',
  'or-IN': 'Odia',
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function generateMockContacts() {
  const names = [
    'Aarav Sharma',
    'Priya Patel',
    'Rohan Gupta',
    'Meera Iyer',
    'Vikram Singh',
  ];
  return names.map((name, i) => ({
    id: `contact-${Date.now()}-${i}`,
    name,
    phone: `+91 ${9800000000 + Math.floor(Math.random() * 100000000)}`,
    status: (['pending', 'completed', 'called', 'no_answer', 'pending'] as const)[i],
  }));
}

// ============================================================
// Demo seed data
// ============================================================

const DEMO_CAMPAIGNS: Omit<Campaign, 'id'>[] = [
  {
    name: 'COVID Booster Awareness',
    type: 'outreach',
    status: 'completed',
    description: 'Informing citizens about booster dose availability at nearby PHCs',
    targetCount: 500,
    completedCount: 487,
    successRate: 78,
    script:
      'Namaskar! This is a message from your district health department. We are calling to inform you that COVID booster doses are now available at your nearest Primary Health Centre. Would you like to know the nearest centre and available timings?',
    language: 'hi-IN',
    contacts: [],
    createdAt: Date.now() - 7 * 86400000,
  },
  {
    name: 'Water Quality Survey',
    type: 'survey',
    status: 'active',
    description: 'Collecting feedback on drinking water quality in rural areas',
    targetCount: 200,
    completedCount: 134,
    successRate: 85,
    script:
      'Hello, we are conducting a brief survey about water quality in your area. This will take about 2 minutes. On a scale of 1 to 5, how would you rate the quality of drinking water in your locality?',
    language: 'en-IN',
    contacts: [],
    createdAt: Date.now() - 2 * 86400000,
  },
  {
    name: 'Property Tax Reminder',
    type: 'reminder',
    status: 'draft',
    description: 'Reminder for Q4 property tax payment deadline',
    targetCount: 1000,
    completedCount: 0,
    script:
      'This is a reminder from your municipal corporation. The deadline for Q4 property tax payment is approaching on March 31st. Please ensure timely payment to avoid penalties. Press 1 to know your outstanding amount.',
    language: 'en-IN',
    contacts: [],
    createdAt: Date.now() - 86400000,
  },
];

// ============================================================
// Type icon component
// ============================================================

function CampaignTypeIcon({ type }: { type: Campaign['type'] }) {
  const config = CAMPAIGN_TYPE_CONFIG[type];
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
      {type === 'survey' && <BarChart3 className={`h-5 w-5 ${config.color}`} />}
      {type === 'outreach' && <Megaphone className={`h-5 w-5 ${config.color}`} />}
      {type === 'reminder' && <Clock className={`h-5 w-5 ${config.color}`} />}
      {type === 'grievance' && <FileText className={`h-5 w-5 ${config.color}`} />}
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.color}`}
    >
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
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
  const [seeded, setSeeded] = useState(false);
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

  // ── Seed demo data on first render if store is empty ──
  useEffect(() => {
    if (!seeded && store.campaigns.length === 0) {
      DEMO_CAMPAIGNS.forEach((demo) => {
        store.createCampaign(demo);
      });
      setSeeded(true);
    } else if (!seeded) {
      setSeeded(true);
    }
  }, [seeded, store.campaigns.length, store]);

  // ── Cleanup timers on unmount ──
  useEffect(() => {
    return () => {
      Object.values(simulationTimers.current).forEach(clearInterval);
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

  // ── Mock contacts for detail view ──
  const [detailContacts, setDetailContacts] = useState<
    ReturnType<typeof generateMockContacts>
  >([]);

  useEffect(() => {
    if (selectedCampaignId) {
      setDetailContacts(generateMockContacts());
    }
  }, [selectedCampaignId]);

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
      // Remove from store by setting status and filtering via update
      // Since the store doesn't have a delete, we mark it completed with 0 target
      // Actually — the store only has update, not delete. We'll filter it in the UI.
      // For a real delete, we'd need to add a method. We'll hide it by updating a field.
      store.updateCampaign(campaignId, {
        status: 'completed',
        name: `[Deleted] ${store.campaigns.find((c) => c.id === campaignId)?.name || ''}`,
      });
      if (selectedCampaignId === campaignId) {
        setSelectedCampaignId(null);
      }
    },
    [store, selectedCampaignId],
  );

  // ── Filter out deleted campaigns ──
  const visibleCampaigns = campaigns.filter((c) => !c.name.startsWith('[Deleted]'));

  // ── Recalculate stats from visible campaigns ──
  const visibleTotal = visibleCampaigns.length;
  const visibleActive = visibleCampaigns.filter((c) => c.status === 'active').length;
  const visibleCompleted = visibleCampaigns.filter((c) => c.status === 'completed').length;
  const visibleContactsReached = visibleCampaigns.reduce((sum, c) => sum + c.completedCount, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ───────────────── Header ───────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
              <Megaphone className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Campaigns</h1>
              <p className="text-sm text-slate-400">
                Create and manage outbound calling campaigns
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-600/20"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </button>
        </div>

        {/* ───────────────── Stats Row ───────────────── */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800">
                <Target className="h-4 w-4 text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{visibleTotal}</p>
                <p className="text-xs text-slate-400">Total Campaigns</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10">
                <Play className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">{visibleActive}</p>
                <p className="text-xs text-slate-400">Active</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/10">
                <CheckCircle className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">{visibleCompleted}</p>
                <p className="text-xs text-slate-400">Completed</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/10">
                <Users className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{visibleContactsReached.toLocaleString()}</p>
                <p className="text-xs text-slate-400">Contacts Reached</p>
              </div>
            </div>
          </div>
        </div>

        {/* ───────────────── Campaign Detail View ───────────────── */}
        {selectedCampaign && !selectedCampaign.name.startsWith('[Deleted]') && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900">
            {/* Detail header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div className="flex items-center gap-3">
                <CampaignTypeIcon type={selectedCampaign.type} />
                <div>
                  <h2 className="text-lg font-bold">{selectedCampaign.name}</h2>
                  <div className="mt-0.5 flex items-center gap-2">
                    <StatusBadge status={selectedCampaign.status} />
                    <span className="text-xs text-slate-500">
                      Created {formatDate(selectedCampaign.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCampaignId(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Left — Info */}
                <div className="space-y-5">
                  {/* Description */}
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Description
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                      {selectedCampaign.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Meta grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-slate-800/50 p-3">
                      <p className="text-xs text-slate-500">Language</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-slate-200">
                        <Globe className="h-3.5 w-3.5 text-indigo-400" />
                        {LANG_NAME_MAP[selectedCampaign.language] || selectedCampaign.language}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-800/50 p-3">
                      <p className="text-xs text-slate-500">Type</p>
                      <p className={`mt-0.5 text-sm font-medium ${CAMPAIGN_TYPE_CONFIG[selectedCampaign.type].color}`}>
                        {CAMPAIGN_TYPE_CONFIG[selectedCampaign.type].label}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-800/50 p-3">
                      <p className="text-xs text-slate-500">Progress</p>
                      <p className="mt-0.5 text-sm font-medium text-slate-200">
                        {selectedCampaign.completedCount} / {selectedCampaign.targetCount}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-800/50 p-3">
                      <p className="text-xs text-slate-500">Success Rate</p>
                      <p className="mt-0.5 text-sm font-medium text-emerald-400">
                        {selectedCampaign.successRate != null
                          ? `${selectedCampaign.successRate}%`
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
                      <span>Campaign Progress</span>
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
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-700">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${CAMPAIGN_TYPE_CONFIG[selectedCampaign.type].barColor}`}
                        style={{
                          width: `${
                            selectedCampaign.targetCount > 0
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
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-500 disabled:opacity-60"
                    >
                      {dialingCampaignId === selectedCampaign.id ? (
                        <>
                          <Phone className="h-4 w-4 animate-pulse" />
                          Dialing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Start Campaign
                        </>
                      )}
                    </button>
                  )}
                  {selectedCampaign.status === 'active' && (
                    <button
                      onClick={() => pauseCampaign(selectedCampaign.id)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-amber-500"
                    >
                      <Pause className="h-4 w-4" />
                      Pause Campaign
                    </button>
                  )}
                </div>

                {/* Right — Script + Contacts */}
                <div className="space-y-5">
                  {/* Script */}
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      AI Script
                    </h3>
                    <div className="mt-1.5 rounded-lg border border-slate-700 bg-slate-800 p-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                        {selectedCampaign.script || 'No script defined.'}
                      </p>
                    </div>
                  </div>

                  {/* Simulated contacts */}
                  <div>
                    <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
                      Contacts Sample
                    </h3>
                    <div className="space-y-2">
                      {detailContacts.map((contact) => {
                        const statusColors: Record<string, string> = {
                          pending: 'text-slate-400 bg-slate-500/15',
                          called: 'text-blue-400 bg-blue-500/15',
                          completed: 'text-emerald-400 bg-emerald-500/15',
                          failed: 'text-red-400 bg-red-500/15',
                          no_answer: 'text-amber-400 bg-amber-500/15',
                        };
                        return (
                          <div
                            key={contact.id}
                            className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-2.5"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-medium text-slate-300">
                                {contact.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-200">
                                  {contact.name}
                                </p>
                                <p className="text-xs text-slate-500">{contact.phone}</p>
                              </div>
                            </div>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[contact.status] || statusColors.pending}`}
                            >
                              {contact.status.replace('_', ' ')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────── Campaign List ───────────────── */}
        <div className="mt-6">
          {visibleCampaigns.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-6 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
                <Megaphone className="h-8 w-8 text-slate-600" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-300">No campaigns yet</h3>
              <p className="mt-1.5 max-w-sm text-sm text-slate-500">
                Create your first outbound calling campaign to reach citizens at scale with
                AI-powered voice calls.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-500"
              >
                <Plus className="h-4 w-4" />
                Create Your First Campaign
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleCampaigns.map((campaign) => {
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
                    className={`group relative rounded-xl border bg-slate-900 transition-all hover:border-slate-700 ${
                      selectedCampaignId === campaign.id
                        ? 'border-indigo-500/50 ring-1 ring-indigo-500/20'
                        : 'border-slate-800'
                    }`}
                  >
                    <div className="p-5">
                      {/* Top row: icon + name + status */}
                      <div className="flex items-start gap-3">
                        <CampaignTypeIcon type={campaign.type} />
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-semibold text-white">
                            {campaign.name}
                          </h3>
                          <div className="mt-1 flex items-center gap-2">
                            <StatusBadge status={campaign.status} />
                            <span className={`text-xs ${typeConfig.color}`}>
                              {typeConfig.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-400">
                        {campaign.description || 'No description'}
                      </p>

                      {/* Progress bar */}
                      <div className="mt-4">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-slate-500">
                            {campaign.completedCount.toLocaleString()} /{' '}
                            {campaign.targetCount.toLocaleString()}
                          </span>
                          <span className="text-slate-400">{progress}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${typeConfig.barColor}`}
                            style={{
                              width: `${Math.min(progress, 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Meta row */}
                      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {LANG_NAME_MAP[campaign.language] || campaign.language}
                        </span>
                        {campaign.successRate != null && (
                          <span className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            {campaign.successRate}% success
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-xs text-slate-600">
                        Created {formatDate(campaign.createdAt)}
                      </p>
                    </div>

                    {/* Actions bar */}
                    <div className="flex items-center border-t border-slate-800 px-5 py-3">
                      {(campaign.status === 'draft' || campaign.status === 'paused') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startCampaignSimulation(campaign.id);
                          }}
                          disabled={dialingCampaignId === campaign.id}
                          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10 disabled:opacity-50"
                        >
                          {dialingCampaignId === campaign.id ? (
                            <>
                              <Phone className="h-3.5 w-3.5 animate-pulse" />
                              Dialing...
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5" />
                              Start
                            </>
                          )}
                        </button>
                      )}
                      {campaign.status === 'active' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            pauseCampaign(campaign.id);
                          }}
                          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/10"
                        >
                          <Pause className="h-3.5 w-3.5" />
                          Pause
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCampaignId(
                            selectedCampaignId === campaign.id ? null : campaign.id,
                          );
                        }}
                        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                        Details
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCampaign(campaign.id);
                        }}
                        className="ml-auto flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />

          {/* Modal */}
          <div className="relative mx-4 w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10">
                  <Megaphone className="h-4 w-4 text-indigo-400" />
                </div>
                <h2 className="text-lg font-bold">New Campaign</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="max-h-[70vh] overflow-y-auto p-6">
              <div className="space-y-5">
                {/* Campaign Name */}
                <div>
                  <label
                    htmlFor="campaign-name"
                    className="mb-1.5 block text-sm font-medium text-slate-300"
                  >
                    Campaign Name
                  </label>
                  <input
                    id="campaign-name"
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., Vaccination Drive Outreach"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Campaign Type */}
                <div>
                  <label
                    htmlFor="campaign-type"
                    className="mb-1.5 block text-sm font-medium text-slate-300"
                  >
                    Type
                  </label>
                  <select
                    id="campaign-type"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as Campaign['type'])}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="survey">Survey</option>
                    <option value="outreach">Outreach</option>
                    <option value="reminder">Reminder</option>
                    <option value="grievance">Grievance</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="campaign-desc"
                    className="mb-1.5 block text-sm font-medium text-slate-300"
                  >
                    Description
                  </label>
                  <textarea
                    id="campaign-desc"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Brief description of the campaign objective"
                    rows={3}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Language */}
                <div>
                  <label
                    htmlFor="campaign-lang"
                    className="mb-1.5 block text-sm font-medium text-slate-300"
                  >
                    Language
                  </label>
                  <select
                    id="campaign-lang"
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.nativeName} — {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Count */}
                <div>
                  <label
                    htmlFor="campaign-target"
                    className="mb-1.5 block text-sm font-medium text-slate-300"
                  >
                    Target Count
                  </label>
                  <input
                    id="campaign-target"
                    type="number"
                    min={1}
                    value={formTargetCount}
                    onChange={(e) =>
                      setFormTargetCount(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* AI Script */}
                <div>
                  <label
                    htmlFor="campaign-script"
                    className="mb-1.5 block text-sm font-medium text-slate-300"
                  >
                    AI Script
                  </label>
                  <textarea
                    id="campaign-script"
                    value={formScript}
                    onChange={(e) => setFormScript(e.target.value)}
                    placeholder={`Example:\nNamaskar! This is an automated call from [Department Name]. We are reaching out to inform you about [Topic]. Would you like to hear more details?\n\nPress 1 for Yes, 2 for No.`}
                    rows={6}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-6 py-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCampaign}
                disabled={!formName.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
