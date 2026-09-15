import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, getOptionalAuth } from "./authHelpers";

/**
 * List reactive in-app notifications for the authenticated user.
 */
export const listNotifications = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getOptionalAuth(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

/**
 * Get count of unread notifications for badges/indicators.
 */
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getOptionalAuth(ctx);
    if (!userId) return 0;
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", userId).eq("isRead", false))
      .collect();
    return unread.length;
  },
});

/**
 * Mark a single notification or all notifications as read.
 */
export const markAsRead = mutation({
  args: {
    notificationId: v.optional(v.id("notifications")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    if (args.notificationId) {
      const n = await ctx.db.get(args.notificationId);
      if (n && n.userId === userId) {
        await ctx.db.patch(args.notificationId, { isRead: true });
      }
    } else {
      // Mark all as read
      const unread = await ctx.db
        .query("notifications")
        .withIndex("by_user_unread", (q) => q.eq("userId", userId).eq("isRead", false))
        .collect();

      for (const n of unread) {
        await ctx.db.patch(n._id, { isRead: true });
      }
    }
    return true;
  },
});
