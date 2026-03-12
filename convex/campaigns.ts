// ============================================================
// Sargam AI — Convex Functions: Campaigns
// ============================================================

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ── Queries ──

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("campaigns")
      .withIndex("by_createdAt")
      .order("desc")
      .take(50);
  },
});

export const getById = query({
  args: { id: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ── Mutations ──

export const create = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("campaigns", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("campaigns"),
    name: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("active"),
        v.literal("paused"),
        v.literal("completed")
      )
    ),
    description: v.optional(v.string()),
    targetCount: v.optional(v.number()),
    completedCount: v.optional(v.number()),
    successRate: v.optional(v.number()),
    script: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }
    if (Object.keys(cleanUpdates).length > 0) {
      await ctx.db.patch(id, cleanUpdates);
    }
  },
});

export const remove = mutation({
  args: { id: v.id("campaigns") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
