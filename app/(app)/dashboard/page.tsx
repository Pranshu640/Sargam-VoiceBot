'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  Globe,
  BarChart3,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Megaphone,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { useStore } from '@/lib/store';

// ============================================================
// Utility Functions
// ============================================================

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ============================================================
// Mock Data (fallback when store is empty)
// ============================================================

const mockCallVolume = [
  { day: 'Mon', calls: 45 },
  { day: 'Tue', calls: 52 },
  { day: 'Wed', calls: 38 },
  { day: 'Thu', calls: 65 },
  { day: 'Fri', calls: 58 },
  { day: 'Sat', calls: 22 },
  { day: 'Sun', calls: 15 },
];

const mockLanguageDist = [
  { name: 'Hindi', value: 35 },
  { name: 'English', value: 25 },
  { name: 'Tamil', value: 15 },
  { name: 'Telugu', value: 10 },
  { name: 'Bengali', value: 8 },
  { name: 'Others', value: 7 },
];

const mockSentiment = [
  { call: 1, sentiment: 0.2 },
  { call: 2, sentiment: 0.5 },
  { call: 3, sentiment: -0.1 },
  { call: 4, sentiment: 0.7 },
  { call: 5, sentiment: 0.3 },
  { call: 6, sentiment: -0.4 },
  { call: 7, sentiment: 0.6 },
  { call: 8, sentiment: 0.8 },
  { call: 9, sentiment: 0.1 },
  { call: 10, sentiment: 0.4 },
];

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#4f46e5'];

// ============================================================
// Custom Recharts Tooltip
// ============================================================

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm shadow-xl">
      <p className="font-medium text-white">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} style={{ color: entry.color || '#a5b4fc' }} className="text-xs">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

function SentimentTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const val = payload[0]?.value;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm shadow-xl">
      <p className="font-medium text-white">Call #{label}</p>
      <p className={`text-xs ${val >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        Sentiment: {val > 0 ? '+' : ''}{val?.toFixed(2)}
      </p>
    </div>
  );
}

// ============================================================
// Status Badge Component
// ============================================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Active' },
    completed: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Completed' },
    escalated: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Escalated' },
    failed: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Failed' },
    ringing: { bg: 'bg-violet-500/15', text: 'text-violet-400', label: 'Ringing' },
  };
  const c = config[status] || config.completed;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

// ============================================================
// Sentiment Dot Component
// ============================================================

function SentimentDot({ value }: { value: number }) {
  const color =
    value > 0.2
      ? 'bg-emerald-400'
      : value < -0.2
        ? 'bg-red-400'
        : 'bg-amber-400';
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />;
}

// ============================================================
// Dashboard Page
// ============================================================

type TimeFilter = 'today' | 'week' | 'all';

export default function DashboardPage() {
  const store = useStore();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Compute stats ──
  const stats = useMemo(() => store.getStats(), [store.getStats, store.calls, store.campaigns]);

  // ── Filter calls based on time range ──
  const filteredCalls = useMemo(() => {
    const now = Date.now();
    const dayMs = 86400000;
    const weekMs = dayMs * 7;

    switch (timeFilter) {
      case 'today':
        return store.calls.filter((c) => c.startedAt > now - dayMs);
      case 'week':
        return store.calls.filter((c) => c.startedAt > now - weekMs);
      default:
        return store.calls;
    }
  }, [store.calls, timeFilter]);

  // ── Derived stats for filtered view ──
  const filteredStats = useMemo(() => {
    const completed = filteredCalls.filter((c) => c.status === 'completed');
    const avgDur = completed.length > 0
      ? Math.round(completed.reduce((s, c) => s + c.duration, 0) / completed.length)
      : 0;
    const resRate = completed.length > 0
      ? Math.round((completed.filter((c) => c.resolution).length / completed.length) * 100)
      : 0;
    const activeCampaigns = store.campaigns.filter((c) => c.status === 'active').length;

    return {
      totalCalls: filteredCalls.length,
      callsToday: stats.callsToday,
      avgDuration: avgDur,
      resolutionRate: resRate,
      activeCampaigns,
    };
  }, [filteredCalls, store.campaigns, stats.callsToday]);

  const hasRealData = store.calls.length > 0;

  // ── Call volume chart data ──
  const callVolumeData = useMemo(() => {
    if (!hasRealData) return mockCallVolume;

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const volume: { day: string; calls: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayLabel = days[d.getDay()];
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 86400000;
      const count = store.calls.filter((c) => c.startedAt >= dayStart && c.startedAt < dayEnd).length;
      volume.push({ day: dayLabel, calls: count });
    }

    return volume;
  }, [store.calls, hasRealData]);

  // ── Language distribution data ──
  const languageData = useMemo(() => {
    if (!hasRealData) return mockLanguageDist;

    const dist = stats.languageDistribution;
    const entries = Object.entries(dist);
    if (entries.length === 0) return mockLanguageDist;

    const langNameMap: Record<string, string> = {
      'hi-IN': 'Hindi',
      'en-IN': 'English',
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

    return entries.map(([code, value]) => ({
      name: langNameMap[code] || code,
      value,
    }));
  }, [stats.languageDistribution, hasRealData]);

  // ── Sentiment trend data ──
  const sentimentData = useMemo(() => {
    if (!hasRealData) return mockSentiment;

    const completed = store.calls
      .filter((c) => c.status === 'completed')
      .sort((a, b) => a.startedAt - b.startedAt)
      .slice(-15);

    if (completed.length === 0) return mockSentiment;

    return completed.map((c, i) => ({
      call: i + 1,
      sentiment: c.sentiment,
    }));
  }, [store.calls, hasRealData]);

  // ── Recent calls (max 10) ──
  const recentCalls = useMemo(() => {
    return [...store.calls]
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 10);
  }, [store.calls]);

  // ── Prevent hydration issues with recharts ──
  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
              <Activity className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-sm text-slate-400">Loading analytics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ───────────────── Header ───────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
              <Activity className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-sm text-slate-400">
                Real-time analytics for your AI calling operations
              </p>
            </div>
          </div>

          {/* Time filter */}
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900 p-1">
            {([
              { key: 'today' as TimeFilter, label: 'Today' },
              { key: 'week' as TimeFilter, label: 'This Week' },
              { key: 'all' as TimeFilter, label: 'All Time' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTimeFilter(key)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                  timeFilter === key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Demo data notice */}
        {!hasRealData && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-4 py-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-indigo-400" />
            <p className="text-sm text-indigo-300">
              Showing demo data. <a href="/call" className="underline hover:text-indigo-200">Start a live call</a> to see real analytics.
            </p>
          </div>
        )}

        {/* ───────────────── Stats Cards ───────────────── */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Calls */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <Phone className="h-5 w-5 text-blue-400" />
              </div>
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <TrendingUp className="h-3 w-3" />
                +{hasRealData ? stats.callsToday : 12}%
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold">
              {hasRealData ? filteredStats.totalCalls : 295}
            </p>
            <p className="mt-1 text-sm text-slate-400">Total Calls</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {hasRealData ? stats.callsToday : 42} calls today
            </p>
          </div>

          {/* Avg Duration */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10">
                <Clock className="h-5 w-5 text-violet-400" />
              </div>
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <TrendingDown className="h-3 w-3" />
                -8s
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold">
              {hasRealData ? formatDuration(filteredStats.avgDuration) : '3:24'}
            </p>
            <p className="mt-1 text-sm text-slate-400">Avg Duration</p>
            <p className="mt-0.5 text-xs text-slate-500">Per completed call</p>
          </div>

          {/* Resolution Rate */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <TrendingUp className="h-3 w-3" />
                +3%
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold">
              {hasRealData ? `${filteredStats.resolutionRate}%` : '87%'}
            </p>
            <p className="mt-1 text-sm text-slate-400">Resolution Rate</p>
            <p className="mt-0.5 text-xs text-slate-500">First-call resolution</p>
          </div>

          {/* Active Campaigns */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <Megaphone className="h-5 w-5 text-amber-400" />
              </div>
              <a href="/campaigns" className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
                View <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
            <p className="mt-4 text-3xl font-bold">
              {hasRealData ? filteredStats.activeCampaigns : 3}
            </p>
            <p className="mt-1 text-sm text-slate-400">Active Campaigns</p>
            <p className="mt-0.5 text-xs text-slate-500">Running now</p>
          </div>
        </div>

        {/* ───────────────── Charts Row ───────────────── */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Call Volume Bar Chart */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-200">Call Volume (Last 7 Days)</h3>
              </div>
              {!hasRealData && (
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  Demo
                </span>
              )}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={callVolumeData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} />
                  <Bar
                    dataKey="calls"
                    name="Calls"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Language Distribution Pie Chart */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-violet-400" />
                <h3 className="text-sm font-semibold text-slate-200">Language Distribution</h3>
              </div>
              {!hasRealData && (
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  Demo
                </span>
              )}
            </div>
            <div className="flex items-center gap-6">
              <div className="h-64 w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={languageData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {languageData.map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="flex flex-1 flex-col gap-2">
                {languageData.map((entry, idx) => (
                  <div key={entry.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                      <span className="text-xs text-slate-300">{entry.name}</span>
                    </div>
                    <span className="text-xs font-medium text-slate-400">
                      {hasRealData
                        ? entry.value
                        : `${entry.value}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ───────────────── Sentiment Trend ───────────────── */}
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-200">Sentiment Trend</h3>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Positive
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-400" /> Negative
              </span>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sentimentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="call"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  label={{ value: 'Call #', position: 'insideBottomRight', offset: -5, fill: '#64748b', fontSize: 11 }}
                />
                <YAxis
                  domain={[-1, 1]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(v: number) => (v > 0 ? `+${v}` : `${v}`)}
                />
                <Tooltip content={<SentimentTooltip />} />
                {/* Reference line at 0 */}
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <Line
                  type="monotone"
                  dataKey="sentiment"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{
                    r: 4,
                    strokeWidth: 2,
                    fill: '#0f172a',
                  }}
                  activeDot={{ r: 6, stroke: '#22c55e', strokeWidth: 2, fill: '#22c55e' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ───────────────── Recent Calls Table ───────────────── */}
        <div data-recent-calls className="mt-6 rounded-xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-200">Recent Calls</h3>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                {recentCalls.length}
              </span>
            </div>
            {recentCalls.length > 0 && (
              <a
                href="/call"
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Start new call <ArrowUpRight className="h-3 w-3" />
              </a>
            )}
          </div>

          {recentCalls.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800">
                <Phone className="h-6 w-6 text-slate-600" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-400">No calls yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Start a live demo to see data here.
              </p>
              <a
                href="/call"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-500"
              >
                <Phone className="h-4 w-4" />
                Start a Call
              </a>
            </div>
          ) : (
            /* Table */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Language</th>
                    <th className="px-6 py-3">Duration</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Intent</th>
                    <th className="px-6 py-3">Sentiment</th>
                    <th className="px-6 py-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {recentCalls.map((call) => {
                    const langNameMap: Record<string, string> = {
                      'hi-IN': 'Hindi',
                      'en-IN': 'English',
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

                    return (
                      <tr key={call.id} className="transition-colors hover:bg-slate-800/30">
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            call.type === 'inbound'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-violet-500/10 text-violet-400'
                          }`}>
                            {call.type === 'inbound' ? (
                              <PhoneIncoming className="h-3 w-3" />
                            ) : (
                              <PhoneOutgoing className="h-3 w-3" />
                            )}
                            {call.type === 'inbound' ? 'In' : 'Out'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-sm text-slate-300">
                          {langNameMap[call.language] || call.language}
                        </td>
                        <td className="px-6 py-3.5 font-mono text-sm text-slate-300">
                          {formatDuration(call.duration)}
                        </td>
                        <td className="px-6 py-3.5">
                          <StatusBadge status={call.status} />
                        </td>
                        <td className="px-6 py-3.5 text-sm text-slate-400">
                          {call.intent ? call.intent.replace(/_/g, ' ') : '—'}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <SentimentDot value={call.sentiment} />
                            <span className="text-xs text-slate-400">
                              {call.sentiment > 0 ? '+' : ''}{call.sentiment.toFixed(2)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-sm text-slate-500">
                          {timeAgo(call.startedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ───────────────── Quick Actions ───────────────── */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <a
            href="/call"
            className="group flex items-center gap-4 rounded-xl bg-indigo-600 p-5 transition-all hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-600/20"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10">
              <Phone className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white">Start Live Call</p>
              <p className="text-sm text-indigo-200">Begin a voice conversation</p>
            </div>
            <ArrowUpRight className="ml-auto h-5 w-5 text-indigo-200 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>

          <a
            href="/campaigns"
            className="group flex items-center gap-4 rounded-xl bg-violet-600 p-5 transition-all hover:bg-violet-500 hover:shadow-lg hover:shadow-violet-600/20"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10">
              <Megaphone className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white">Launch Campaign</p>
              <p className="text-sm text-violet-200">Automate outbound calls</p>
            </div>
            <ArrowUpRight className="ml-auto h-5 w-5 text-violet-200 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>

          <button
            onClick={() => {
              document.querySelector('[data-recent-calls]')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="group flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5 text-left transition-all hover:border-slate-700 hover:bg-slate-800"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-800 group-hover:bg-slate-700">
              <BarChart3 className="h-5 w-5 text-slate-300" />
            </div>
            <div>
              <p className="font-semibold text-white">View Calls</p>
              <p className="text-sm text-slate-400">See full call history</p>
            </div>
            <ArrowUpRight className="ml-auto h-5 w-5 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
