// ============================================================
// Sargam AI — Convex Database Schema
// Real-time persistence for calls, campaigns, and grievances
// ============================================================

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  calls: defineTable({
    callId: v.string(),
    type: v.union(v.literal("inbound"), v.literal("outbound")),
    status: v.union(
      v.literal("ringing"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("escalated")
    ),
    language: v.string(),
    duration: v.number(),
    transcript: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("agent"), v.literal("system")),
        text: v.string(),
        timestamp: v.number(),
        language: v.optional(v.string()),
      })
    ),
    sentiment: v.number(),
    intent: v.optional(v.string()),
    resolution: v.optional(v.string()),
    escalated: v.boolean(),
    campaignId: v.optional(v.string()),
    callerPhone: v.optional(v.string()),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    agentMode: v.optional(v.string()),
    liveSheet: v.optional(
      v.object({
        extractedFields: v.array(
          v.object({
            field: v.string(),
            value: v.string(),
            timestamp: v.number(),
          })
        ),
        notes: v.array(
          v.object({
            category: v.string(),
            content: v.string(),
            timestamp: v.number(),
          })
        ),
        tickets: v.array(
          v.object({
            category: v.string(),
            description: v.string(),
            priority: v.string(),
            ticketId: v.string(),
            timestamp: v.number(),
          })
        ),
      })
    ),
  })
    .index("by_status", ["status"])
    .index("by_startedAt", ["startedAt"])
    .index("by_campaign", ["campaignId"]),

  campaigns: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("survey"),
      v.literal("outreach"),
      v.literal("reminder"),
      v.literal("grievance")
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed")
    ),
    description: v.string(),
    targetCount: v.number(),
    completedCount: v.number(),
    successRate: v.optional(v.number()),
    script: v.string(),
    language: v.string(),
    contacts: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        phone: v.string(),
        status: v.union(
          v.literal("pending"),
          v.literal("called"),
          v.literal("completed"),
          v.literal("failed"),
          v.literal("no_answer")
        ),
        callId: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),

  grievances: defineTable({
    ticketId: v.string(),
    callId: v.optional(v.string()),
    category: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("escalated")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_priority", ["priority"])
    .index("by_ticketId", ["ticketId"]),
});
