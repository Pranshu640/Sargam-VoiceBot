'use client';

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Call, Campaign, Grievance, DashboardStats, TranscriptEntry } from '@/types';

// ============================================================
// Sargam Store — Convex-backed with same interface
// Provides reactive queries + mutations via Convex
// ============================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
  deleteCampaign: (id: string) => void;

  // Grievance actions
  createGrievance: (grievance: Omit<Grievance, 'id'>) => Grievance;
  updateGrievance: (id: string, updates: Partial<Grievance>) => void;

  // Analytics
  getStats: () => DashboardStats;
}

interface StoreState {
  calls: Call[];
  campaigns: Campaign[];
  grievances: Grievance[];
}

type Store = StoreState & StoreActions;

const StoreContext = createContext<Store | null>(null);

// ── Default empty stats ──
const EMPTY_STATS: DashboardStats = {
  totalCalls: 0,
  activeCalls: 0,
  avgDuration: 0,
  resolutionRate: 0,
  escalationRate: 0,
  activeCampaigns: 0,
  languageDistribution: {},
  sentimentAverage: 0,
  callsToday: 0,
  callsThisWeek: 0,
};

export function StoreProvider({ children }: { children: ReactNode }) {
  // ── Convex queries (reactive, real-time) ──
  const convexCalls = useQuery(api.calls.list) ?? [];
  const convexCampaigns = useQuery(api.campaigns.list) ?? [];
  const convexGrievances = useQuery(api.grievances.list) ?? [];
  const convexStats = useQuery(api.stats.getStats) ?? null;

  // ── Convex mutations ──
  const createCallMutation = useMutation(api.calls.create);
  const addTranscriptMutation = useMutation(api.calls.addTranscriptEntry);
  const updateCallMutation = useMutation(api.calls.update);
  const endCallMutation = useMutation(api.calls.endCall);
  const createCampaignMutation = useMutation(api.campaigns.create);
  const updateCampaignMutation = useMutation(api.campaigns.update);
  const deleteCampaignMutation = useMutation(api.campaigns.remove);
  const createGrievanceMutation = useMutation(api.grievances.create);
  const updateGrievanceMutation = useMutation(api.grievances.update);

  // ── Map Convex documents to our Call type ──
  const calls: Call[] = convexCalls.map((c) => ({
    id: c.callId,
    type: c.type,
    status: c.status,
    language: c.language,
    duration: c.duration,
    transcript: c.transcript,
    sentiment: c.sentiment,
    intent: c.intent,
    resolution: c.resolution,
    escalated: c.escalated,
    campaignId: c.campaignId,
    callerPhone: c.callerPhone,
    startedAt: c.startedAt,
    endedAt: c.endedAt,
    agentMode: c.agentMode as Call['agentMode'],
    liveSheet: c.liveSheet as Call['liveSheet'],
  }));

  // ── Map Convex documents to our Campaign type ──
  const campaigns: Campaign[] = convexCampaigns.map((c) => ({
    id: c._id,
    name: c.name,
    type: c.type,
    status: c.status,
    description: c.description,
    targetCount: c.targetCount,
    completedCount: c.completedCount,
    successRate: c.successRate,
    script: c.script,
    language: c.language,
    contacts: c.contacts,
    createdAt: c.createdAt,
  }));

  // ── Map Convex documents to our Grievance type ──
  const grievances: Grievance[] = convexGrievances.map((g) => ({
    id: g._id,
    ticketId: g.ticketId,
    callId: g.callId,
    category: g.category,
    description: g.description,
    status: g.status,
    priority: g.priority,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  }));

  // ── Actions ──

  const createCall = useCallback(
    (callData: Omit<Call, 'id'>): Call => {
      const callId = generateId();
      const call: Call = { ...callData, id: callId };

      // Fire-and-forget mutation
      createCallMutation({
        callId,
        type: callData.type,
        status: callData.status,
        language: callData.language,
        duration: callData.duration,
        transcript: callData.transcript,
        sentiment: callData.sentiment,
        escalated: callData.escalated,
        startedAt: callData.startedAt,
        agentMode: callData.agentMode,
      });

      return call;
    },
    [createCallMutation]
  );

  const updateCall = useCallback(
    (id: string, updates: Partial<Call>) => {
      updateCallMutation({
        callId: id,
        status: updates.status,
        duration: updates.duration,
        sentiment: updates.sentiment,
        intent: updates.intent,
        resolution: updates.resolution,
        escalated: updates.escalated,
        endedAt: updates.endedAt,
        liveSheet: updates.liveSheet
          ? {
              extractedFields: updates.liveSheet.extractedFields.map((f) => ({
                field: f.field,
                value: f.value,
                timestamp: f.timestamp,
              })),
              notes: updates.liveSheet.notes.map((n) => ({
                category: n.category,
                content: n.content,
                timestamp: n.timestamp,
              })),
              tickets: updates.liveSheet.tickets.map((t) => ({
                category: t.category,
                description: t.description,
                priority: t.priority,
                ticketId: t.ticketId,
                timestamp: t.timestamp,
              })),
            }
          : undefined,
      });
    },
    [updateCallMutation]
  );

  const addTranscriptEntry = useCallback(
    (callId: string, entry: TranscriptEntry) => {
      addTranscriptMutation({
        callId,
        entry: {
          role: entry.role,
          text: entry.text,
          timestamp: entry.timestamp,
          language: entry.language,
        },
      });
    },
    [addTranscriptMutation]
  );

  const endCallAction = useCallback(
    (id: string, resolution?: string) => {
      endCallMutation({
        callId: id,
        resolution,
      });
    },
    [endCallMutation]
  );

  const createCampaign = useCallback(
    (data: Omit<Campaign, 'id'>): Campaign => {
      const id = generateId();
      const campaign: Campaign = { ...data, id };

      createCampaignMutation({
        name: data.name,
        type: data.type,
        status: data.status,
        description: data.description,
        targetCount: data.targetCount,
        completedCount: data.completedCount,
        script: data.script,
        language: data.language,
        contacts: data.contacts,
        createdAt: data.createdAt,
      });

      return campaign;
    },
    [createCampaignMutation]
  );

  const updateCampaign = useCallback(
    (id: string, updates: Partial<Campaign>) => {
      // id here is the Convex _id since we mapped it
      updateCampaignMutation({
        id: id as never, // Convex Id type
        name: updates.name,
        status: updates.status,
        description: updates.description,
        targetCount: updates.targetCount,
        completedCount: updates.completedCount,
        successRate: updates.successRate,
        script: updates.script,
      });
    },
    [updateCampaignMutation]
  );

  const deleteCampaign = useCallback(
    (id: string) => {
      // id here is the Convex _id since we mapped it
      deleteCampaignMutation({ id: id as never });
    },
    [deleteCampaignMutation]
  );

  const createGrievance = useCallback(
    (data: Omit<Grievance, 'id'>): Grievance => {
      const id = generateId();
      const grievance: Grievance = { ...data, id };

      createGrievanceMutation({
        ticketId: data.ticketId,
        callId: data.callId,
        category: data.category,
        description: data.description,
        status: data.status,
        priority: data.priority,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });

      return grievance;
    },
    [createGrievanceMutation]
  );

  const updateGrievance = useCallback(
    (id: string, updates: Partial<Grievance>) => {
      updateGrievanceMutation({
        id: id as never, // Convex Id type
        status: updates.status,
        priority: updates.priority,
        updatedAt: Date.now(),
      });
    },
    [updateGrievanceMutation]
  );

  const getStats = useCallback((): DashboardStats => {
    if (convexStats) {
      return convexStats as DashboardStats;
    }
    return EMPTY_STATS;
  }, [convexStats]);

  return (
    <StoreContext.Provider
      value={{
        calls,
        campaigns,
        grievances,
        createCall,
        updateCall,
        addTranscriptEntry,
        endCall: endCallAction,
        createCampaign,
        updateCampaign,
        deleteCampaign,
        createGrievance,
        updateGrievance,
        getStats,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
