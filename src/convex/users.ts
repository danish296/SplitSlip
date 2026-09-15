import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, getOptionalAuth } from "./authHelpers";

/**
 * Get the current signed in user. Returns null if the user is not signed in.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      return null;
    }
    return user;
  },
});

/**
 * Internal helper to get current user data.
 */
export const getCurrentUser = async (ctx: QueryCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return null;
  }
  return await ctx.db.get(userId);
};

/**
 * Validate registration uniqueness before signing up.
 * Enforces unique email, phone, and username.
 */
export const validateRegistration = mutation({
  args: {
    email: v.string(),
    phone: v.optional(v.string()),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const username = args.username.trim().toLowerCase();
    const phone = args.phone?.trim();

    if (!email || !email.includes("@")) {
      throw new Error("Please enter a valid email address.");
    }
    if (!username || username.length < 3) {
      throw new Error("Username must be at least 3 characters.");
    }

    // Check email uniqueness
    const existingEmail = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    if (existingEmail) {
      throw new Error("An account with this email address already exists. Please log in.");
    }

    // Check username uniqueness
    const existingUsername = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", username))
      .first();
    if (existingUsername) {
      throw new Error("This username is already taken. Please choose another username.");
    }

    // Check phone uniqueness if provided
    if (phone && phone.length >= 10) {
      const existingPhone = await ctx.db
        .query("users")
        .withIndex("phone", (q) => q.eq("phone", phone))
        .first();
      if (existingPhone) {
        throw new Error("An account with this phone number already exists.");
      }
    }

    return { valid: true };
  },
});

/**
 * Update the current user's profile (name, phone, upiId, username).
 */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    upiId: v.optional(v.string()),
    username: v.optional(v.string()),
    avatarColor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let userId = await getOptionalAuth(ctx);
    if (!userId) {
      const newId = await ctx.db.insert("users", {
        name: args.name?.trim() ?? "Friend",
        phone: args.phone?.trim(),
        upiId: args.upiId?.trim(),
        username: args.username?.trim().toLowerCase(),
        avatarColor: args.avatarColor,
        role: "user",
        isAnonymous: true,
      });
      return await ctx.db.get(newId);
    }
    const existing = await ctx.db.get(userId);
    if (!existing) {
      throw new Error("User not found.");
    }

    const updates: Record<string, any> = {};
    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.phone !== undefined) updates.phone = args.phone.trim();
    if (args.upiId !== undefined) updates.upiId = args.upiId.trim();
    if (args.username !== undefined) updates.username = args.username.trim().toLowerCase();
    if (args.avatarColor !== undefined) updates.avatarColor = args.avatarColor;

    await ctx.db.patch(userId, updates);
    return await ctx.db.get(userId);
  },
});

/**
 * Search registered users by email, phone, or username.
 * Never exposes UPI ID in general searches.
 */
export const searchUsers = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    const q = args.query.trim().toLowerCase();
    if (q.length < 2) return [];

    // Search users by email, phone, or username
    const allUsers = await ctx.db.query("users").take(100);
    const filtered = allUsers
      .filter((u) => {
        if (currentUserId && u._id === currentUserId) return false;
        const emailMatch = u.email?.toLowerCase().includes(q);
        const phoneMatch = u.phone?.includes(q);
        const nameMatch = u.name?.toLowerCase().includes(q);
        const usernameMatch = u.username?.toLowerCase().includes(q);
        return emailMatch || phoneMatch || nameMatch || usernameMatch;
      })
      .slice(0, 10);

    // Return sanitized public profiles without sensitive upiId
    return filtered.map((u) => ({
      _id: u._id,
      name: u.name ?? "Friend",
      email: u.email,
      phone: u.phone,
      username: u.username,
      avatarColor: u.avatarColor,
      isRegistered: true,
    }));
  },
});

/**
 * Get safe user profile by ID. Never reveals UPI ID unless user is self.
 */
export const getUserById = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) return null;

    const isSelf = currentUserId === args.userId;
    return {
      _id: targetUser._id,
      name: targetUser.name ?? "Friend",
      email: targetUser.email,
      phone: targetUser.phone,
      username: targetUser.username,
      avatarColor: targetUser.avatarColor,
      upiId: isSelf ? targetUser.upiId : undefined,
    };
  },
});

/**
 * Look up registered email by username, phone, or email identifier.
 */
export const lookupEmailForIdentifier = query({
  args: { identifier: v.string() },
  handler: async (ctx, args) => {
    const raw = args.identifier.trim();
    if (!raw) return null;
    if (raw.includes("@")) return raw.toLowerCase();

    // Try finding by username
    const byUsername = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", raw.toLowerCase()))
      .first();
    if (byUsername?.email) return byUsername.email;

    // Try finding by phone
    const byPhone = await ctx.db
      .query("users")
      .withIndex("phone", (q) => q.eq("phone", raw))
      .first();
    if (byPhone?.email) return byPhone.email;

    return null;
  },
});

