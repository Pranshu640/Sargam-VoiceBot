// ============================================================
// Sargam AI — Convex Functions: Calls
// ============================================================

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ── Queries ──

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("calls")
      .withIndex("by_startedAt")
      .order("desc")
      .take(100);
  },
});

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("calls")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});

export const getById = query({
  args: { callId: v.string() },
  handler: async (ctx, args) => {
    const calls = await ctx.db
      .query("calls")
      .filter((q) => q.eq(q.field("callId"), args.callId))
      .first();
    return calls;
  },
});

// ── Mutations ──

export const create = mutation({
  args: {
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
    escalated: v.boolean(),
    startedAt: v.number(),
    agentMode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("calls", {
      ...args,
    });
    return id;
  },
});

export const addTranscriptEntry = mutation({
  args: {
    callId: v.string(),
    entry: v.object({
      role: v.union(v.literal("user"), v.literal("agent"), v.literal("system")),
      text: v.string(),
      timestamp: v.number(),
      language: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db
      .query("calls")
      .filter((q) => q.eq(q.field("callId"), args.callId))
      .first();
    if (!call) return;

    await ctx.db.patch(call._id, {
      transcript: [...call.transcript, args.entry],
    });
  },
});

export const update = mutation({
  args: {
    callId: v.string(),
    status: v.optional(
      v.union(
        v.literal("ringing"),
        v.literal("active"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("escalated")
      )
    ),
    duration: v.optional(v.number()),
    sentiment: v.optional(v.number()),
    intent: v.optional(v.string()),
    resolution: v.optional(v.string()),
    escalated: v.optional(v.boolean()),
    endedAt: v.optional(v.number()),
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
  },
  handler: async (ctx, args) => {
    const call = await ctx.db
      .query("calls")
      .filter((q) => q.eq(q.field("callId"), args.callId))
      .first();
    if (!call) return;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { callId: _callId, ...updates } = args;
    // Remove undefined values
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    if (Object.keys(cleanUpdates).length > 0) {
      await ctx.db.patch(call._id, cleanUpdates);
    }
  },
});

export const endCall = mutation({
  args: {
    callId: v.string(),
    resolution: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db
      .query("calls")
      .filter((q) => q.eq(q.field("callId"), args.callId))
      .first();
    if (!call) return;

    await ctx.db.patch(call._id, {
      status: "completed",
      endedAt: Date.now(),
      duration: Math.round((Date.now() - call.startedAt) / 1000),
      resolution: args.resolution || call.resolution,
    });
  },
});
