import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Require an authenticated user ID or throw an error.
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthorized: Please sign in to continue.");
  }
  return userId;
}

/**
 * Get the authenticated user ID if one exists, otherwise null.
 */
export async function getOptionalAuth(ctx: QueryCtx | MutationCtx): Promise<Id<"users"> | null> {
  return await getAuthUserId(ctx);
}

/**
 * Verify if a user is allowed to access a bill (owner or participant).
 */
export async function canAccessBill(
  ctx: QueryCtx | MutationCtx,
  billId: Id<"bills">,
  userId: Id<"users">,
): Promise<boolean> {
  const bill = await ctx.db.get(billId);
  if (!bill) return false;
  if (bill.paidByUserId === userId) return true;

  // Check if user is a participant
  const participant = await ctx.db
    .query("splitParticipants")
    .withIndex("by_bill", (q) => q.eq("billId", billId))
    .filter((q) => q.eq(q.field("userId"), userId))
    .first();

  return participant !== null;
}

/**
 * Rate limit / abuse check helper.
 * Ensures an action is not repeated excessively in a short window.
 */
export async function checkRateLimit(
  ctx: MutationCtx,
  identifier: string,
  maxAttempts: number,
  windowMs: number,
): Promise<void> {
  // Simple in-DB rate limiter check against recent audit events or claims
  // (Prevents spamming claims or requests)
  const now = Date.now();
  const recentEvents = await ctx.db
    .query("paymentEvents")
    .filter((q) =>
      q.and(
        q.eq(q.field("contactId"), identifier),
        q.gte(q.field("createdAt"), now - windowMs),
      ),
    )
    .take(maxAttempts + 1);

  if (recentEvents.length >= maxAttempts) {
    throw new Error("Rate limit exceeded: Too many requests. Please try again shortly.");
  }
}
