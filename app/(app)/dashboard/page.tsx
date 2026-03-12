'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  TrendingUp,
  Globe,
  BarChart3,
  Activity,
  CheckCircle,
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
import Link from 'next/link';

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
  if (mins < 1) return 'JUST NOW';
  if (mins < 60) return `${mins}M AGO`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}H AGO`;
  return `${Math.floor(hours / 24)}D AGO`;
}

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#facc15', '#10b981'];

// ============================================================
// Custom Recharts Tooltip
// ============================================================

type PayloadEntry = { color?: string; name?: string; value?: number | string };

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: PayloadEntry[]; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="glass-brutal px-4 py-3 text-sm z-50">
      <p className="font-bold text-white tracking-widest uppercase mb-2">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} style={{ color: entry.color || '#ffffff' }} className="text-xs font-bold uppercase tracking-widest">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

function SentimentTooltip({ active, payload, label }: { active?: boolean; payload?: PayloadEntry[]; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  const val = payload[0]?.value as number;
  return (
    <div className="glass-brutal px-4 py-3 text-sm z-50">
      <p className="font-bold text-white tracking-widest uppercase mb-2">CALL #{label}</p>
      <p className={`text-xs font-bold tracking-widest ${val >= 0 ? 'text-white' : 'text-zinc-500'}`}>
        SENTIMENT: {val > 0 ? '+' : ''}{val?.toFixed(2)}
      </p>
    </div>
  );
}

// ============================================================
// Status Badge Component
// ============================================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: 'bg-white', text: 'text-black', label: 'ACTIVE' },
    completed: { bg: 'bg-zinc-800', text: 'text-zinc-300', label: 'COMPLETED' },
    escalated: { bg: 'bg-zinc-200', text: 'text-black', label: 'ESCALATED' },
    failed: { bg: 'bg-zinc-900 line-through', text: 'text-zinc-500', label: 'FAILED' },
    ringing: { bg: 'bg-transparent border border-white', text: 'text-white', label: 'RINGING' },
  };
  const c = config[status] || config.completed;
  return (
    <span className={`inline-flex items-center rounded-none px-2 py-1 text-[10px] font-bold tracking-widest uppercase ${c.bg} ${c.text}`}>
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
      ? 'bg-[#10b981] border-[#10b981] shadow-[0_0_5px_#10b981]'
      : value < -0.2
        ? 'bg-[#f43f5e] border-[#f43f5e] shadow-[0_0_5px_#f43f5e]'
        : 'bg-zinc-500 border-zinc-500';
  return <span className={`inline-block h-2 w-2 rounded-none border-[1px] ${color}`} />;
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const [now, setNow] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
  }, []);

  const stats = useMemo(() => store.getStats(), [store]);

  const filteredCalls = useMemo(() => {
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
  }, [store.calls, timeFilter, now]);

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

  const hasData = store.calls.length > 0;

  const callVolumeData = useMemo(() => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
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
  }, [store.calls]);

  const languageData = useMemo(() => {
    const dist = stats.languageDistribution;
    const entries = Object.entries(dist);
    if (entries.length === 0) return [];

    const langNameMap: Record<string, string> = {
      'hi-IN': 'HINDI',
      'en-IN': 'ENGLISH',
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

    return entries.map(([code, value]) => ({
      name: langNameMap[code] || code.toUpperCase(),
      value,
    }));
  }, [stats.languageDistribution]);

  const sentimentData = useMemo(() => {
    const completed = store.calls
      .filter((c) => c.status === 'completed')
      .sort((a, b) => a.startedAt - b.startedAt)
      .slice(-15);

    return completed.map((c, i) => ({
      call: i + 1,
      sentiment: c.sentiment,
    }));
  }, [store.calls]);

  const recentCalls = useMemo(() => {
    return [...store.calls]
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 10);
  }, [store.calls]);

  if (!mounted) {
    return (
      <div className="flex h-[80vh] items-center justify-center font-bold tracking-widest text-zinc-500 uppercase">
        LOADING ANALYTICS...
      </div>
    );
  }

  return (
    <div className="animate-in pb-20">
      {/* ───────────────── Header ───────────────── */}
      <div className="mb-12 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <div className="mb-4 inline-flex items-center gap-3 border-[2px] border-white/30 bg-black/50 px-5 py-2 text-sm font-bold tracking-widest uppercase">
            <Activity className="h-4 w-4" />
            TELEMETRY ONLINE
          </div>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter uppercase leading-none">
            DASHBOARD
          </h1>
          <p className="mt-4 text-sm font-bold tracking-widest text-zinc-400 uppercase">
            Raw Analytics & Process Execution
          </p>
        </div>

        {/* Time filter */}
        <div className="flex bg-zinc-900 border-[2px] border-white/20 p-1">
          {([
            { key: 'today' as TimeFilter, label: 'TODAY' },
            { key: 'week' as TimeFilter, label: 'WEEK' },
            { key: 'all' as TimeFilter, label: 'ALL TIME' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTimeFilter(key)}
              className={`px-6 py-3 text-xs font-bold tracking-widest uppercase transition-colors ${timeFilter === key
                ? 'bg-white text-black'
                : 'text-zinc-500 hover:text-white'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ───────────────── Stats Cards ───────────────── */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-12">
        {/* Total Calls */}
        <div className="glass-brutal p-8 flex flex-col justify-between delay-100 min-h-[160px]">
          <div className="flex items-center justify-between mb-8">
            <Phone className="h-6 w-6 stroke-[2]" />
            {stats.callsToday > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-black tracking-widest uppercase text-white border border-white px-2 py-1">
                <TrendingUp className="h-3 w-3" />
                {stats.callsToday} TODAY
              </span>
            )}
          </div>
          <div>
            <p className="text-5xl font-black tracking-tighter">{filteredStats.totalCalls}</p>
            <p className="mt-2 text-xs font-bold tracking-widest text-zinc-500">TOTAL CALLS</p>
          </div>
        </div>

        {/* Avg Duration */}
        <div className="glass-brutal p-8 flex flex-col justify-between delay-200 min-h-[160px]">
          <div className="flex items-center justify-between mb-8">
            <Clock className="h-6 w-6 stroke-[2]" />
          </div>
          <div>
            <p className="text-5xl font-black tracking-tighter">
              {filteredStats.avgDuration > 0 ? formatDuration(filteredStats.avgDuration) : '--:--'}
            </p>
            <p className="mt-2 text-xs font-bold tracking-widest text-zinc-500">AVG DURATION</p>
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="glass-brutal p-8 flex flex-col justify-between delay-300 min-h-[160px]">
          <div className="flex items-center justify-between mb-8">
            <CheckCircle className="h-6 w-6 stroke-[2]" />
          </div>
          <div>
            <p className="text-5xl font-black tracking-tighter">
              {hasData ? `${filteredStats.resolutionRate}%` : '--%'}
            </p>
            <p className="mt-2 text-xs font-bold tracking-widest text-zinc-500">RESOLUTION RATE</p>
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="glass-brutal p-8 flex flex-col justify-between delay-400 min-h-[160px] group cursor-pointer" onClick={() => window.location.href = '/campaigns'}>
          <div className="flex items-center justify-between mb-8">
            <Megaphone className="h-6 w-6 stroke-[2]" />
            <ArrowUpRight className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
          <div>
            <p className="text-5xl font-black tracking-tighter">{filteredStats.activeCampaigns}</p>
            <p className="mt-2 text-xs font-bold tracking-widest text-zinc-500">ACTIVE CAMPAIGNS</p>
          </div>
        </div>
      </div>

      {/* ───────────────── Charts Row ───────────────── */}
      {hasData && (
        <div className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Call Volume Bar Chart */}
          <div className="glass-brutal p-8">
            <div className="mb-8 flex items-center justify-between border-b-[2px] border-white/20 pb-4">
              <h3 className="text-xl font-black tracking-tighter uppercase">CALL VOLUME</h3>
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={callVolumeData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#ffffff', fontSize: 10, fontWeight: 'bold' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#ffffff', fontSize: 10, fontWeight: 'bold' }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} />
                  <Bar
                    dataKey="calls"
                    name="CALLS"
                    fill="#3b82f6"
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Language Distribution Pie Chart */}
          {languageData.length > 0 && (
            <div className="glass-brutal p-8">
              <div className="mb-8 flex items-center justify-between border-b-[2px] border-white/20 pb-4">
                <h3 className="text-xl font-black tracking-tighter uppercase">LANGUAGE SPREAD</h3>
                <Globe className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-8 h-[300px]">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={languageData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="rgba(0,0,0,1)"
                        strokeWidth={4}
                      >
                        {languageData.map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-4">
                  {languageData.map((entry, idx) => (
                    <div key={entry.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-none border-[1px] border-white/30"
                          style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                        />
                        <span className="text-xs font-bold tracking-widest text-zinc-300 uppercase">{entry.name}</span>
                      </div>
                      <span className="text-xs font-black text-white">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────── Sentiment Trend ───────────────── */}
      {sentimentData.length > 0 && (
        <div className="mb-12 glass-brutal p-8">
          <div className="mb-8 flex items-center justify-between border-b-[2px] border-white/20 pb-4">
            <h3 className="text-xl font-black tracking-tighter uppercase">SENTIMENT TREND</h3>
            <div className="flex items-center gap-6 text-[10px] font-bold tracking-widest uppercase">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 bg-[#10b981] rounded-none shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> POSITIVE
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 bg-[#f43f5e] rounded-none shadow-[0_0_8px_rgba(244,63,94,0.5)]" /> NEGATIVE
              </span>
            </div>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sentimentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="call"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#ffffff', fontSize: 10, fontWeight: 'bold' }}
                />
                <YAxis
                  domain={[-1, 1]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#ffffff', fontSize: 10, fontWeight: 'bold' }}
                  tickFormatter={(v: number) => (v > 0 ? `+${v}` : `${v}`)}
                />
                <Tooltip content={<SentimentTooltip />} />
                <Line
                  type="stepAfter"
                  dataKey="sentiment"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{
                    r: 0,
                  }}
                  activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 0, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ───────────────── Empty state ───────────────── */}
      {!hasData && (
        <div className="mb-12 glass-brutal px-8 py-24 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center border-[2px] border-zinc-700 bg-zinc-900 mb-6">
            <Phone className="h-8 w-8 text-zinc-500" />
          </div>
          <h3 className="text-3xl font-black tracking-tighter uppercase text-white">SYSTEM IDLE</h3>
          <p className="mt-4 max-w-md mx-auto text-sm font-bold tracking-widest text-zinc-500 uppercase leading-relaxed">
            No pipeline executions found. Trigger a live call to initialize telemetry and stream raw data.
          </p>
          <Link
            href="/call"
            className="mt-8 glass-brutal-btn inline-flex items-center gap-3 px-8 py-4"
          >
            INITIALIZE CALL PIPELINE
            <Phone className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* ───────────────── Recent Calls Table ───────────────── */}
      {recentCalls.length > 0 && (
        <div className="mb-12 glass-brutal overflow-hidden">
          <div className="flex items-center justify-between border-b-[2px] border-white/20 px-8 py-6">
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-black tracking-tighter uppercase">EXECUTION LOG</h3>
              <span className="border-[1px] border-zinc-600 bg-zinc-900 px-2 py-1 text-[10px] font-bold text-white tracking-widest">
                {recentCalls.length} RECENT
              </span>
            </div>
            <Link
              href="/call"
              className="text-xs font-bold tracking-widest uppercase hover:underline flex items-center gap-1"
            >
              NEW CALL <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-[1px] border-white/10 bg-black/40 text-[10px] font-bold tracking-widest uppercase text-zinc-500">
                  <th className="px-8 py-4">TYPE</th>
                  <th className="px-8 py-4">LANG</th>
                  <th className="px-8 py-4">DUR</th>
                  <th className="px-8 py-4">STATUS</th>
                  <th className="px-8 py-4">SENTIMENT</th>
                  <th className="px-8 py-4">TIMESTAMP</th>
                </tr>
              </thead>
              <tbody className="divide-y-[1px] divide-white/10 bg-black/20">
                {recentCalls.map((call) => {
                  const langNameMap: Record<string, string> = {
                    'hi-IN': 'HIN',
                    'en-IN': 'ENG',
                    'ta-IN': 'TAM',
                    'te-IN': 'TEL',
                    'bn-IN': 'BEN',
                    'kn-IN': 'KAN',
                    'ml-IN': 'MAL',
                    'mr-IN': 'MAR',
                    'gu-IN': 'GUJ',
                    'pa-IN': 'PUN',
                    'or-IN': 'ODI',
                  };

                  return (
                    <tr key={call.id} className="transition-colors hover:bg-white/5">
                      <td className="px-8 py-4">
                        <span className={`inline-flex items-center gap-2 border-[1px] px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${call.type === 'inbound'
                          ? 'border-white text-white'
                          : 'border-zinc-500 text-zinc-500'
                          }`}>
                          {call.type === 'inbound' ? (
                            <PhoneIncoming className="h-3 w-3" />
                          ) : (
                            <PhoneOutgoing className="h-3 w-3" />
                          )}
                          {call.type === 'inbound' ? 'IN' : 'OUT'}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-xs font-bold tracking-widest text-zinc-300">
                        {langNameMap[call.language] || call.language.toUpperCase()}
                      </td>
                      <td className="px-8 py-4 font-mono text-sm text-white font-bold">
                        {formatDuration(call.duration)}
                      </td>
                      <td className="px-8 py-4">
                        <StatusBadge status={call.status} />
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <SentimentDot value={call.sentiment} />
                          <span className="text-xs font-bold tracking-widest font-mono">
                            {call.sentiment > 0 ? '+' : ''}{call.sentiment.toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-[10px] font-bold tracking-widest text-zinc-500">
                        {timeAgo(call.startedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────── Quick Actions ───────────────── */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Link
          href="/call"
          className="glass-brutal p-6 flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <Phone className="h-6 w-6 stroke-[2]" />
            <div>
              <p className="font-black text-lg tracking-tighter uppercase text-white leading-none">START CALL</p>
              <p className="text-[10px] font-bold tracking-widest text-zinc-500 mt-1">INITIATE CONNECTION</p>
            </div>
          </div>
          <ArrowUpRight className="h-6 w-6 opacity-30 group-hover:opacity-100 transition-opacity" />
        </Link>

        <Link
          href="/campaigns"
          className="glass-brutal p-6 flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <Megaphone className="h-6 w-6 stroke-[2]" />
            <div>
              <p className="font-black text-lg tracking-tighter uppercase text-white leading-none">DEPLOY CAMPAIGN</p>
              <p className="text-[10px] font-bold tracking-widest text-zinc-500 mt-1">BATCH EXECUTION</p>
            </div>
          </div>
          <ArrowUpRight className="h-6 w-6 opacity-30 group-hover:opacity-100 transition-opacity" />
        </Link>

        <Link
          href="/"
          className="glass-brutal p-6 flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <BarChart3 className="h-6 w-6 stroke-[2]" />
            <div>
              <p className="font-black text-lg tracking-tighter uppercase text-white leading-none">DOCUMENTATION</p>
              <p className="text-[10px] font-bold tracking-widest text-zinc-500 mt-1">SYSTEM MANUAL</p>
            </div>
          </div>
          <ArrowUpRight className="h-6 w-6 opacity-30 group-hover:opacity-100 transition-opacity" />
        </Link>
      </div>
    </div>
  );
}
