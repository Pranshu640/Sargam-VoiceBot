// ============================================================
// Sargam AI — Convex Functions: Dashboard Stats
// ============================================================

import { query } from "./_generated/server";

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const calls = await ctx.db.query("calls").collect();
    const campaigns = await ctx.db.query("campaigns").collect();

    const now = Date.now();
    const dayMs = 86400000;
    const weekMs = dayMs * 7;

    const completedCalls = calls.filter((c) => c.status === "completed");
    const activeCalls = calls.filter((c) => c.status === "active");
    const todayCalls = calls.filter((c) => c.startedAt > now - dayMs);
    const weekCalls = calls.filter((c) => c.startedAt > now - weekMs);
    const escalatedCalls = calls.filter((c) => c.escalated);

    const avgDuration =
      completedCalls.length > 0
        ? completedCalls.reduce((sum, c) => sum + c.duration, 0) / completedCalls.length
        : 0;

    const languageDistribution: Record<string, number> = {};
    calls.forEach((c) => {
      languageDistribution[c.language] = (languageDistribution[c.language] || 0) + 1;
    });

    const sentimentAvg =
      completedCalls.length > 0
        ? completedCalls.reduce((sum, c) => sum + c.sentiment, 0) / completedCalls.length
        : 0;

    return {
      totalCalls: calls.length,
      activeCalls: activeCalls.length,
      avgDuration: Math.round(avgDuration),
      resolutionRate:
        completedCalls.length > 0
          ? Math.round(
              (completedCalls.filter((c) => c.resolution).length / completedCalls.length) * 100
            )
          : 0,
      escalationRate:
        calls.length > 0 ? Math.round((escalatedCalls.length / calls.length) * 100) : 0,
      activeCampaigns: campaigns.filter((c) => c.status === "active").length,
      languageDistribution,
      sentimentAverage: Math.round(sentimentAvg * 100) / 100,
      callsToday: todayCalls.length,
      callsThisWeek: weekCalls.length,
    };
  },
});
