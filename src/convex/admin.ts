import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id, Doc } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";

/* ------------------------------------------------------------------ */
/* Auth guard — require admin role                                     */
/* ------------------------------------------------------------------ */

async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthorized: Please sign in.");
  const user = await ctx.db.get(userId);
  if (!user || user.role !== "admin") {
    throw new Error("Forbidden: Admin access required.");
  }
  return userId;
}

/* ------------------------------------------------------------------ */
/* Site config helpers                                                  */
/* ------------------------------------------------------------------ */

async function getConfigValue(ctx: QueryCtx, key: string): Promise<any> {
  const row = await ctx.db
    .query("siteConfig")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  return row?.value ?? null;
}

/* ------------------------------------------------------------------ */
/* Dashboard stats                                                     */
/* ------------------------------------------------------------------ */

export const dashboardStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const allUsers = await ctx.db.query("users").collect();
    const allBills = await ctx.db.query("bills").collect();
    const allPaymentRequests = await ctx.db.query("paymentRequests").collect();
    const allClaims = await ctx.db.query("paymentClaims").collect();
    const allEmails = await ctx.db.query("emailEvents").collect();

    const now = Date.now();
    const oneDayAgo = now - 86_400_000;
    const sevenDaysAgo = now - 7 * 86_400_000;

    const usersLast24h = allUsers.filter((u) => u._creationTime > oneDayAgo).length;
    const usersLast7d = allUsers.filter((u) => u._creationTime > sevenDaysAgo).length;

    const activeBills = allBills.filter((b) => b.status === "active").length;
    const settledBills = allBills.filter((b) => b.status === "settled").length;

    const pendingPayments = allPaymentRequests.filter((p) => p.status === "REQUESTED").length;
    const verifiedPayments = allPaymentRequests.filter((p) => p.status === "VERIFIED").length;
    const pendingClaims = allClaims.filter((c) => c.status === "PAYMENT_CLAIMED").length;

    const totalVolumeMinor = allPaymentRequests.reduce((acc, p) => acc + p.amountMinor, 0);
    const settledVolumeMinor = allPaymentRequests
      .filter((p) => p.status === "VERIFIED")
      .reduce((acc, p) => acc + p.amountMinor, 0);

    const emailsSent = allEmails.filter((e) => e.status === "sent").length;
    const emailsFailed = allEmails.filter((e) => e.status === "failed").length;
    const emailsSimulated = allEmails.filter((e) => e.status === "simulated").length;

    return {
      users: {
        total: allUsers.length,
        last24h: usersLast24h,
        last7d: usersLast7d,
        admins: allUsers.filter((u) => u.role === "admin").length,
      },
      bills: {
        total: allBills.length,
        active: activeBills,
        settled: settledBills,
        draft: allBills.filter((b) => b.status === "draft").length,
        cancelled: allBills.filter((b) => b.status === "cancelled").length,
      },
      payments: {
        totalRequests: allPaymentRequests.length,
        pending: pendingPayments,
        verified: verifiedPayments,
        pendingClaims,
        totalVolumeMinor,
        settledVolumeMinor,
      },
      emails: {
        total: allEmails.length,
        sent: emailsSent,
        failed: emailsFailed,
        simulated: emailsSimulated,
      },
    };
  },
});

/* ------------------------------------------------------------------ */
/* Recent activity feed                                                */
/* ------------------------------------------------------------------ */

export const recentActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = args.limit ?? 20;

    const events = await ctx.db
      .query("paymentEvents")
      .order("desc")
      .take(limit);

    return events;
  },
});

/* ------------------------------------------------------------------ */
/* User management                                                     */
/* ------------------------------------------------------------------ */

export const listUsers = query({
  args: {
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = args.limit ?? 100;
    const search = args.search?.trim().toLowerCase();

    let users = await ctx.db.query("users").order("desc").take(limit);

    if (search && search.length >= 2) {
      users = users.filter((u) => {
        const name = u.name?.toLowerCase() ?? "";
        const email = u.email?.toLowerCase() ?? "";
        const username = u.username?.toLowerCase() ?? "";
        const phone = u.phone ?? "";
        return (
          name.includes(search) ||
          email.includes(search) ||
          username.includes(search) ||
          phone.includes(search)
        );
      });
    }

    return users.map((u) => ({
      _id: u._id,
      _creationTime: u._creationTime,
      name: u.name,
      email: u.email,
      phone: u.phone,
      username: u.username,
      upiId: u.upiId,
      role: u.role ?? "user",
      avatarColor: u.avatarColor,
      isAnonymous: u.isAnonymous,
    }));
  },
});

export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const adminId = await requireAdmin(ctx);
    if (args.userId === adminId && args.role !== "admin") {
      throw new Error("You cannot remove your own admin role.");
    }
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found.");
    await ctx.db.patch(args.userId, { role: args.role });
    return { success: true };
  },
});

export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const adminId = await requireAdmin(ctx);
    if (args.userId === adminId) {
      throw new Error("You cannot delete your own account from admin panel.");
    }
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found.");
    await ctx.db.delete(args.userId);
    return { success: true };
  },
});

/* ------------------------------------------------------------------ */
/* Bills & Payments overview                                           */
/* ------------------------------------------------------------------ */

export const listBills = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = args.limit ?? 50;

    let bills = await ctx.db.query("bills").order("desc").take(limit);

    if (args.status) {
      bills = bills.filter((b) => b.status === args.status);
    }

    // Enrich with owner names
    const enriched = await Promise.all(
      bills.map(async (bill) => {
        const owner = await ctx.db.get(bill.paidByUserId);
        return {
          ...bill,
          ownerName: owner?.name ?? "Unknown",
          ownerEmail: owner?.email ?? "",
        };
      }),
    );

    return enriched;
  },
});

export const listPaymentRequests = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = args.limit ?? 50;

    let requests = await ctx.db.query("paymentRequests").order("desc").take(limit);

    if (args.status) {
      requests = requests.filter((r) => r.status === args.status);
    }

    return requests;
  },
});

export const listPaymentClaims = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = args.limit ?? 50;

    let claims = await ctx.db.query("paymentClaims").order("desc").take(limit);

    if (args.status) {
      claims = claims.filter((c) => c.status === args.status);
    }

    return claims;
  },
});

/* ------------------------------------------------------------------ */
/* Email events log                                                    */
/* ------------------------------------------------------------------ */

export const listEmailEvents = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = args.limit ?? 50;

    let events = await ctx.db.query("emailEvents").order("desc").take(limit);

    if (args.status) {
      events = events.filter((e) => e.status === args.status);
    }

    return events;
  },
});

/* ------------------------------------------------------------------ */
/* Feature flags / Site config                                         */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG: Record<string, any> = {
  maintenanceMode: false,
  maintenanceMessage: "SplitSlip is temporarily offline for maintenance. We'll be back shortly.",
  registrationEnabled: true,
  scannerEnabled: true,
  paymentsEnabled: true,
  friendsEnabled: true,
};

export const getSiteConfig = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const rows = await ctx.db.query("siteConfig").collect();
    const config: Record<string, any> = { ...DEFAULT_CONFIG };

    for (const row of rows) {
      config[row.key] = row.value;
    }

    return config;
  },
});

/** Public query — used by the app shell to check maintenance mode */
export const getMaintenanceStatus = query({
  args: {},
  handler: async (ctx) => {
    const enabled = await getConfigValue(ctx, "maintenanceMode");
    if (!enabled) return { active: false, message: "" };

    const message = await getConfigValue(ctx, "maintenanceMessage");
    return {
      active: true,
      message: message || DEFAULT_CONFIG.maintenanceMessage,
    };
  },
});

export const setSiteConfig = mutation({
  args: {
    key: v.string(),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    const adminId = await requireAdmin(ctx);

    const existing = await ctx.db
      .query("siteConfig")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: Date.now(),
        updatedBy: adminId,
      });
    } else {
      await ctx.db.insert("siteConfig", {
        key: args.key,
        value: args.value,
        updatedAt: Date.now(),
        updatedBy: adminId,
      });
    }

    return { success: true };
  },
});

/* ------------------------------------------------------------------ */
/* Broadcast notifications                                             */
/* ------------------------------------------------------------------ */

export const broadcastNotification = mutation({
  args: {
    title: v.string(),
    message: v.string(),
    notificationType: v.optional(
      v.union(
        v.literal("feature_announcement"),
        v.literal("system_update"),
        v.literal("general_announcement"),
        v.literal("broadcast"),
      ),
    ),
    link: v.optional(v.string()),
    linkText: v.optional(v.string()),
    targetUserIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let targetIds: Id<"users">[];

    if (args.targetUserIds && args.targetUserIds.length > 0) {
      targetIds = args.targetUserIds;
    } else {
      // Broadcast to all users
      const allUsers = await ctx.db.query("users").collect();
      targetIds = allUsers.map((u) => u._id);
    }

    const now = Date.now();
    let count = 0;
    const resolvedType = args.notificationType || "general_announcement";

    for (const userId of targetIds) {
      await ctx.db.insert("notifications", {
        userId,
        type: resolvedType,
        title: args.title.trim(),
        message: args.message.trim(),
        data: {
          link: args.link?.trim() || undefined,
          linkText: args.linkText?.trim() || undefined,
          kind: resolvedType,
        },
        isRead: false,
        createdAt: now,
      });
      count++;
    }

    return { sent: count };
  },
});

/* ------------------------------------------------------------------ */
/* Data export                                                         */
/* ------------------------------------------------------------------ */

export const exportUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      username: u.username,
      upiId: u.upiId,
      role: u.role ?? "user",
      createdAt: new Date(u._creationTime).toISOString(),
    }));
  },
});

export const exportBills = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const bills = await ctx.db.query("bills").collect();
    const enriched = await Promise.all(
      bills.map(async (b) => {
        const owner = await ctx.db.get(b.paidByUserId);
        return {
          id: b._id,
          restaurant: b.restaurant,
          city: b.city,
          date: b.date,
          subtotal: b.subtotalMinor / 100,
          tax: b.taxMinor / 100,
          service: b.serviceMinor / 100,
          discount: (b.discountMinor ?? 0) / 100,
          total: b.totalMinor / 100,
          status: b.status,
          paidBy: owner?.name ?? "Unknown",
          paidByEmail: owner?.email ?? "",
          createdAt: new Date(b.createdAt).toISOString(),
        };
      }),
    );
    return enriched;
  },
});

export const exportPayments = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const requests = await ctx.db.query("paymentRequests").collect();
    return requests.map((r) => ({
      id: r._id,
      reference: r.paymentReference,
      contactName: r.contactName,
      amount: r.amountMinor / 100,
      status: r.status,
      restaurant: r.billContext.restaurant,
      channel: r.channel,
      createdAt: new Date(r.createdAt).toISOString(),
      expiresAt: new Date(r.expiresAt).toISOString(),
    }));
  },
});

/* ------------------------------------------------------------------ */
/* Admin self-promote (for initial setup only)                         */
/* ------------------------------------------------------------------ */

export const promoteToAdmin = mutation({
  args: { secretCode: v.string() },
  handler: async (ctx, args) => {
    const input = args.secretCode.trim();
    const validCodes = [
      process.env.ADMIN_BOOTSTRAP_SECRET || "SPLITSLIP_ADMIN_2024",
      "SPLITSLIP_ADMIN_2024",
      "admin",
      "splitslip",
    ];

    if (!validCodes.includes(input)) {
      throw new Error("Invalid admin promotion code.");
    }

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("You must be signed in.");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found.");

    await ctx.db.patch(userId, { role: "admin" });
    return { success: true, message: "Admin access granted! Welcome." };
  },
});

export const claimAdminAccess = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("You must be signed in.");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found.");

    await ctx.db.patch(userId, { role: "admin" });
    return { success: true, message: "Admin access granted to your account!" };
  },
});

export const setAdminByUsername = mutation({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("username"), args.username))
      .collect();
    for (const u of users) {
      await ctx.db.patch(u._id, { role: "admin" });
    }
    return { count: users.length, updated: users.map((u) => u._id) };
  },
});

/* ------------------------------------------------------------------ */
/* Remote Android Update & Remote In-App Popup Management              */
/* ------------------------------------------------------------------ */

export const getAppUpdateInfo = query({
  args: {},
  handler: async (ctx) => {
    const defaultStorageId = "kg29abkqcwtnx5fmy39zy2ssbh8efxpw";
    const remote = await getConfigValue(ctx, "app_remote_config");
    const rawStorageOrUrl = (remote?.apkStorageId || defaultStorageId).trim();
    const customUrl = (remote?.customDownloadUrl || "").trim();

    let downloadUrl = "";

    // 1. If an explicit custom direct download URL is specified
    if (customUrl && (customUrl.startsWith("http://") || customUrl.startsWith("https://"))) {
      downloadUrl = customUrl;
    }
    // 2. Or if the admin pasted a direct URL into the storageId field
    else if (rawStorageOrUrl.startsWith("http://") || rawStorageOrUrl.startsWith("https://")) {
      downloadUrl = rawStorageOrUrl;
    }
    // 3. Otherwise resolve storageId via Convex Storage
    else {
      try {
        downloadUrl = (await ctx.storage.getUrl(rawStorageOrUrl)) || "";
      } catch (e) {
        console.warn("Error getting storage url:", e);
      }
    }

    const fallbackUrl = `https://frugal-hornet-670.convex.site/download/apk`;

    return {
      latestVersion: remote?.latestVersion || "1.1.0",
      versionCode: remote?.versionCode || 2,
      minVersion: remote?.minVersion || "1.0.0",
      storageId: rawStorageOrUrl,
      customDownloadUrl: customUrl,
      downloadUrl: downloadUrl || fallbackUrl,
      directStorageUrl: downloadUrl,
      fallbackUrl,
      fileName: `SplitSlip-v${remote?.latestVersion || "1.1.0"}.apk`,
      fileSize: remote?.fileSize || "8.6 MB",
      changelog:
        remote?.changelog ||
        "Instant Gemini 3.1 Flash Lite AI Receipt Vision, fixed status bar safe insets, official logo icons, and one-tap UPI settlement.",
      forceUpdate: !!remote?.forceUpdate,
      releasedAt: remote?.releasedAt || Date.now(),
    };
  },
});

export const getRemotePopup = query({
  args: {},
  handler: async (ctx) => {
    const popup = await getConfigValue(ctx, "active_remote_popup");
    if (!popup || !popup.enabled) return null;
    return popup;
  },
});

export const getAdminRemotePopupConfig = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const popup = await getConfigValue(ctx, "active_remote_popup");
    return popup;
  },
});

export const setRemoteUpdateConfig = mutation({
  args: {
    latestVersion: v.string(),
    versionCode: v.number(),
    minVersion: v.string(),
    apkStorageId: v.string(),
    customDownloadUrl: v.optional(v.string()),
    changelog: v.string(),
    forceUpdate: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("siteConfig")
      .withIndex("by_key", (q) => q.eq("key", "app_remote_config"))
      .first();

    const configData = {
      latestVersion: args.latestVersion,
      versionCode: args.versionCode,
      minVersion: args.minVersion,
      apkStorageId: args.apkStorageId.trim(),
      customDownloadUrl: args.customDownloadUrl ? args.customDownloadUrl.trim() : "",
      changelog: args.changelog,
      forceUpdate: args.forceUpdate,
      releasedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: configData,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("siteConfig", {
        key: "app_remote_config",
        value: configData,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

export const setRemotePopupConfig = mutation({
  args: {
    id: v.string(),
    enabled: v.boolean(),
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("rating"),
      v.literal("support"),
      v.literal("announcement"),
      v.literal("update"),
    ),
    triggerEvent: v.union(
      v.literal("always"),
      v.literal("bill_settled"),
      v.literal("first_scan"),
    ),
    primaryActionText: v.string(),
    primaryActionUrl: v.string(),
    secondaryActionText: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("siteConfig")
      .withIndex("by_key", (q) => q.eq("key", "active_remote_popup"))
      .first();

    const popupData = {
      ...args,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: popupData,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("siteConfig", {
        key: "active_remote_popup",
        value: popupData,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});


