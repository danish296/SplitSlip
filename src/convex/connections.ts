import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, getOptionalAuth } from "./authHelpers";
import { api } from "./_generated/api";

/**
 * List accepted connections (friends) for the authenticated user.
 */
export const listConnections = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getOptionalAuth(ctx);
    if (!userId) return [];

    // Queries where user is requester
    const sent = await ctx.db
      .query("connections")
      .withIndex("by_requester", (q) => q.eq("requesterId", userId).eq("status", "accepted"))
      .collect();

    // Queries where user is recipient
    const received = await ctx.db
      .query("connections")
      .withIndex("by_recipient", (q) => q.eq("recipientId", userId).eq("status", "accepted"))
      .collect();

    const friendIds = [
      ...sent.map((c) => ({ connectionId: c._id, friendId: c.recipientId, createdAt: c.createdAt })),
      ...received.map((c) => ({ connectionId: c._id, friendId: c.requesterId, createdAt: c.createdAt })),
    ];

    // Hydrate friend profiles
    const friends = await Promise.all(
      friendIds.map(async ({ connectionId, friendId, createdAt }) => {
        const u = await ctx.db.get(friendId);
        if (!u) return null;
        return {
          id: u._id,
          connectionId,
          name: u.name ?? "Friend",
          phone: u.phone ?? "",
          email: u.email,
          username: u.username,
          avatarColor: u.avatarColor,
          isRegistered: true,
          connectedAt: createdAt,
        };
      }),
    );

    return friends.filter((f): f is NonNullable<typeof f> => f !== null);
  },
});

/**
 * List incoming and outgoing pending connection requests.
 */
export const listPendingRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getOptionalAuth(ctx);
    if (!userId) return { incoming: [], outgoing: [] };

    const incoming = await ctx.db
      .query("connections")
      .withIndex("by_recipient", (q) => q.eq("recipientId", userId).eq("status", "pending"))
      .collect();

    const outgoing = await ctx.db
      .query("connections")
      .withIndex("by_requester", (q) => q.eq("requesterId", userId).eq("status", "pending"))
      .collect();

    const incomingWithUsers = await Promise.all(
      incoming.map(async (c) => {
        const u = await ctx.db.get(c.requesterId);
        return {
          connectionId: c._id,
          user: u
            ? {
                id: u._id,
                name: u.name ?? "Friend",
                phone: u.phone,
                email: u.email,
                username: u.username,
              }
            : null,
          createdAt: c.createdAt,
        };
      }),
    );

    const outgoingWithUsers = await Promise.all(
      outgoing.map(async (c) => {
        const u = await ctx.db.get(c.recipientId);
        return {
          connectionId: c._id,
          user: u
            ? {
                id: u._id,
                name: u.name ?? "Friend",
                phone: u.phone,
                email: u.email,
                username: u.username,
              }
            : null,
          createdAt: c.createdAt,
        };
      }),
    );

    return {
      incoming: incomingWithUsers.filter((i) => i.user !== null),
      outgoing: outgoingWithUsers.filter((o) => o.user !== null),
    };
  },
});

/**
 * Send a connection request to another user.
 */
export const sendConnectionRequest = mutation({
  args: {
    recipientId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    if (userId === args.recipientId) {
      throw new Error("You cannot send a connection request to yourself.");
    }

    const recipient = await ctx.db.get(args.recipientId);
    if (!recipient) {
      throw new Error("Recipient user not found.");
    }

    // Check existing connections in either direction
    const existing1 = await ctx.db
      .query("connections")
      .withIndex("by_pair", (q) => q.eq("requesterId", userId).eq("recipientId", args.recipientId))
      .first();

    const existing2 = await ctx.db
      .query("connections")
      .withIndex("by_pair", (q) => q.eq("requesterId", args.recipientId).eq("recipientId", userId))
      .first();

    const existing = existing1 || existing2;

    if (existing) {
      if (existing.status === "accepted") {
        throw new Error("You are already connected with this user.");
      }
      if (existing.status === "pending") {
        throw new Error("A connection request is already pending.");
      }
      // If rejected, allow re-request
      await ctx.db.patch(existing._id, {
        requesterId: userId,
        recipientId: args.recipientId,
        status: "pending",
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    const now = Date.now();
    const connId = await ctx.db.insert("connections", {
      requesterId: userId,
      recipientId: args.recipientId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    const sender = await ctx.db.get(userId);

    // Notify recipient
    await ctx.db.insert("notifications", {
      userId: args.recipientId,
      type: "connection_request",
      title: "New Friend Request",
      message: `${sender?.name ?? "Someone"} sent you a connection request.`,
      data: { connectionId: connId, requesterId: userId },
      isRead: false,
      createdAt: now,
    });

    if (recipient?.email) {
      await ctx.scheduler.runAfter(0, api.emails.sendNotificationEmail, {
        to: recipient.email,
        type: "connection_request",
        subject: `SplitSlip: New connection request from ${sender?.name ?? "a friend"}`,
        bodyText: `Hi ${recipient.name ?? "there"},\n\n${sender?.name ?? "A friend"} sent you a connection request on SplitSlip.\n\nOpen SplitSlip to accept and start splitting bills!`,
      });
    }

    return connId;
  },
});

/**
 * Accept or reject a connection request.
 */
export const respondConnectionRequest = mutation({
  args: {
    connectionId: v.id("connections"),
    accept: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const conn = await ctx.db.get(args.connectionId);
    if (!conn) {
      throw new Error("Connection request not found.");
    }

    if (conn.recipientId !== userId) {
      throw new Error("Unauthorized to respond to this request.");
    }

    if (conn.status !== "pending") {
      throw new Error(`Request has already been ${conn.status}.`);
    }

    const nextStatus = args.accept ? "accepted" : "rejected";
    const now = Date.now();
    await ctx.db.patch(conn._id, {
      status: nextStatus,
      updatedAt: now,
    });

    if (args.accept) {
      const user = await ctx.db.get(userId);
      await ctx.db.insert("notifications", {
        userId: conn.requesterId,
        type: "connection_accepted",
        title: "Connection Accepted",
        message: `${user?.name ?? "A friend"} accepted your connection request.`,
        data: { connectionId: conn._id, friendId: userId },
        isRead: false,
        createdAt: now,
      });

      const requester = await ctx.db.get(conn.requesterId);
      if (requester?.email) {
        await ctx.scheduler.runAfter(0, api.emails.sendNotificationEmail, {
          to: requester.email,
          type: "connection_accepted",
          subject: `SplitSlip: ${user?.name ?? "A friend"} accepted your connection request!`,
          bodyText: `Hi ${requester.name ?? "there"},\n\n${user?.name ?? "Your friend"} accepted your connection request. You can now split bills with each other directly!`,
        });
      }
    }

    return nextStatus;
  },
});

/**
 * Remove an existing connection.
 */
export const removeConnection = mutation({
  args: {
    connectionId: v.id("connections"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const conn = await ctx.db.get(args.connectionId);
    if (!conn) {
      throw new Error("Connection not found.");
    }

    if (conn.requesterId !== userId && conn.recipientId !== userId) {
      throw new Error("Unauthorized: you are not a party to this connection.");
    }

    await ctx.db.delete(conn._id);
    return true;
  },
});
