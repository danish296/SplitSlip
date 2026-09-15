import { cronJobs } from "convex/server";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Scheduled mutation to expire payment requests that have passed their expiresAt timestamp.
 */
export const expireStaleRequests = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Query active requested payments past their expiry date
    const staleRequests = await ctx.db
      .query("paymentRequests")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "REQUESTED"),
          q.lt(q.field("expiresAt"), now),
        ),
      )
      .take(100);

    for (const req of staleRequests) {
      await ctx.db.patch(req._id, { status: "EXPIRED" });

      // Update splitParticipant
      const participant = await ctx.db
        .query("splitParticipants")
        .withIndex("by_bill", (q) => q.eq("billId", req.billId))
        .filter((q) => q.eq(q.field("contactId"), req.contactId))
        .first();

      if (participant && participant.status === "REQUESTED") {
        await ctx.db.patch(participant._id, { status: "EXPIRED" });
      }

      // Record audit event
      await ctx.db.insert("paymentEvents", {
        billId: req.billId,
        paymentRequestId: req._id,
        contactId: req.contactId,
        contactName: req.contactName,
        type: "expired",
        amountMinor: req.amountMinor,
        at: new Date(now).toISOString(),
        createdAt: now,
      });
    }

    return { expiredCount: staleRequests.length };
  },
});

const crons = cronJobs();

// Run every 2 hours to transition stale payment requests to EXPIRED
crons.interval(
  "expire stale payment requests",
  { hours: 2 },
  internal.crons.expireStaleRequests,
);

export default crons;
