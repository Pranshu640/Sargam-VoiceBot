'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Call, Campaign, Grievance, DashboardStats, TranscriptEntry } from '@/types';

// ============================================================
// Sargam Store — React Context + localStorage persistence
// Works immediately without Convex. Upgrade to Convex for real-time sync.
// ============================================================

interface StoreState {
  calls: Call[];
  campaigns: Campaign[];
  grievances: Grievance[];
}

interface StoreActions {
  // Call actions
  createCall: (call: Omit<Call, 'id'>) => Call;
  updateCall: (id: string, updates: Partial<Call>) => void;
  addTranscriptEntry: (callId: string, entry: TranscriptEntry) => void;
  endCall: (id: string, resolution?: string) => void;

  // Campaign actions
  createCampaign: (campaign: Omit<Campaign, 'id'>) => Campaign;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;

  // Grievance actions
  createGrievance: (grievance: Omit<Grievance, 'id'>) => Grievance;
  updateGrievance: (id: string, updates: Partial<Grievance>) => void;

  // Analytics
  getStats: () => DashboardStats;
}

type Store = StoreState & StoreActions;

const StoreContext = createContext<Store | null>(null);

const STORAGE_KEY = 'sargam_store';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function loadFromStorage(): StoreState {
  if (typeof window === 'undefined') return { calls: [], campaigns: [], grievances: [] };
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch { /* ignore */ }
  return { calls: [], campaigns: [], grievances: [] };
}

function saveToStorage(state: StoreState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage();
    setCalls(stored.calls);
    setCampaigns(stored.campaigns);
    setGrievances(stored.grievances);
    setLoaded(true);
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    if (loaded) {
      saveToStorage({ calls, campaigns, grievances });
    }
  }, [calls, campaigns, grievances, loaded]);

  const createCall = useCallback((callData: Omit<Call, 'id'>): Call => {
    const call: Call = { ...callData, id: generateId() };
    setCalls(prev => [call, ...prev]);
    return call;
  }, []);

  const updateCall = useCallback((id: string, updates: Partial<Call>) => {
    setCalls(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const addTranscriptEntry = useCallback((callId: string, entry: TranscriptEntry) => {
    setCalls(prev => prev.map(c =>
      c.id === callId
        ? { ...c, transcript: [...c.transcript, entry] }
        : c
    ));
  }, []);

  const endCall = useCallback((id: string, resolution?: string) => {
    setCalls(prev => prev.map(c =>
      c.id === id
        ? {
          ...c,
          status: 'completed' as const,
          endedAt: Date.now(),
          duration: Math.round((Date.now() - c.startedAt) / 1000),
          resolution: resolution || c.resolution,
        }
        : c
    ));
  }, []);

  const createCampaign = useCallback((data: Omit<Campaign, 'id'>): Campaign => {
    const campaign: Campaign = { ...data, id: generateId() };
    setCampaigns(prev => [campaign, ...prev]);
    return campaign;
  }, []);

  const updateCampaign = useCallback((id: string, updates: Partial<Campaign>) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const createGrievance = useCallback((data: Omit<Grievance, 'id'>): Grievance => {
    const grievance: Grievance = { ...data, id: generateId() };
    setGrievances(prev => [grievance, ...prev]);
    return grievance;
  }, []);

  const updateGrievance = useCallback((id: string, updates: Partial<Grievance>) => {
    setGrievances(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  }, []);

  const getStats = useCallback((): DashboardStats => {
    const now = Date.now();
    const dayMs = 86400000;
    const weekMs = dayMs * 7;

    const completedCalls = calls.filter(c => c.status === 'completed');
    const activeCalls = calls.filter(c => c.status === 'active');
    const todayCalls = calls.filter(c => c.startedAt > now - dayMs);
    const weekCalls = calls.filter(c => c.startedAt > now - weekMs);
    const escalatedCalls = calls.filter(c => c.escalated);

    const avgDuration = completedCalls.length > 0
      ? completedCalls.reduce((sum, c) => sum + c.duration, 0) / completedCalls.length
      : 0;

    const languageDistribution: Record<string, number> = {};
    calls.forEach(c => {
      languageDistribution[c.language] = (languageDistribution[c.language] || 0) + 1;
    });

    const sentimentAvg = completedCalls.length > 0
      ? completedCalls.reduce((sum, c) => sum + c.sentiment, 0) / completedCalls.length
      : 0;

    return {
      totalCalls: calls.length,
      activeCalls: activeCalls.length,
      avgDuration: Math.round(avgDuration),
      resolutionRate: completedCalls.length > 0
        ? Math.round((completedCalls.filter(c => c.resolution).length / completedCalls.length) * 100)
        : 0,
      escalationRate: calls.length > 0
        ? Math.round((escalatedCalls.length / calls.length) * 100)
        : 0,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      languageDistribution,
      sentimentAverage: Math.round(sentimentAvg * 100) / 100,
      callsToday: todayCalls.length,
      callsThisWeek: weekCalls.length,
    };
  }, [calls, campaigns]);

  return (
    <StoreContext.Provider value={{
      calls, campaigns, grievances,
      createCall, updateCall, addTranscriptEntry, endCall,
      createCampaign, updateCampaign,
      createGrievance, updateGrievance,
      getStats,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
