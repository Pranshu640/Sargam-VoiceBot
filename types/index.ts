// ============================================================
// Sargam AI Voice Agent — Core Type Definitions
// ============================================================

export interface TranscriptEntry {
  role: 'user' | 'agent' | 'system';
  text: string;
  timestamp: number;
  language?: string;
}

export interface Call {
  id: string;
  type: 'inbound' | 'outbound';
  status: 'ringing' | 'active' | 'completed' | 'failed' | 'escalated';
  language: string;
  duration: number; // seconds
  transcript: TranscriptEntry[];
  sentiment: number; // -1 to 1
  intent?: string;
  resolution?: string;
  escalated: boolean;
  campaignId?: string;
  callerPhone?: string;
  startedAt: number;
  endedAt?: number;
}

export interface Campaign {
  id: string;
  name: string;
  type: 'survey' | 'outreach' | 'reminder' | 'grievance';
  status: 'draft' | 'active' | 'paused' | 'completed';
  description: string;
  targetCount: number;
  completedCount: number;
  successRate?: number;
  script: string;
  language: string;
  contacts: CampaignContact[];
  createdAt: number;
}

export interface CampaignContact {
  id: string;
  name: string;
  phone: string;
  status: 'pending' | 'called' | 'completed' | 'failed' | 'no_answer';
  callId?: string;
}

export interface Grievance {
  id: string;
  ticketId: string;
  callId?: string;
  category: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: number;
  updatedAt: number;
}

export interface DashboardStats {
  totalCalls: number;
  activeCalls: number;
  avgDuration: number;
  resolutionRate: number;
  escalationRate: number;
  activeCampaigns: number;
  languageDistribution: Record<string, number>;
  sentimentAverage: number;
  callsToday: number;
  callsThisWeek: number;
}

export interface PipelineConfig {
  language: string;
  useCase: 'inbound' | 'outbound_survey' | 'outbound_outreach' | 'grievance';
  campaignScript?: string;
  voiceGender?: 'male' | 'female';
}

export type SupportedLanguage = {
  code: string;
  name: string;
  nativeName: string;
  sttSupported: boolean;
  ttsSupported: boolean;
};

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en-IN', name: 'English (India)', nativeName: 'English', sttSupported: true, ttsSupported: true },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', sttSupported: true, ttsSupported: true },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', sttSupported: true, ttsSupported: true },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', sttSupported: true, ttsSupported: true },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা', sttSupported: true, ttsSupported: true },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', sttSupported: true, ttsSupported: true },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം', sttSupported: true, ttsSupported: true },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', sttSupported: true, ttsSupported: true },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી', sttSupported: true, ttsSupported: true },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', sttSupported: true, ttsSupported: true },
  { code: 'or-IN', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', sttSupported: true, ttsSupported: true },
];
