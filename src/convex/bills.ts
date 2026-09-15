import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, getOptionalAuth, canAccessBill } from "./authHelpers";
import {
  computeEqualSplit,
  computeItemSplit,
  validateCustomSplit,
  ParticipantInput,
  ComputedShare,
} from "./splitEngine";
import { Id } from "./_generated/dataModel";

/**
 * Generate an upload URL for receipt images in Convex storage.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get public URL for a stored receipt image.
 */
export const getReceiptUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Create a new bill with items and split configuration.
 * All amounts must be in integer paise.
 * Validates the split server-side to guarantee sum(shares) === total.
 */
export const createBill = mutation({
  args: {
    restaurant: v.string(),
    city: v.optional(v.string()),
    date: v.optional(v.string()),
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        amountMinor: v.number(), // integer paise
      }),
    ),
    taxMinor: v.number(), // integer paise
    serviceMinor: v.number(), // integer paise
    discountMinor: v.optional(v.number()), // integer paise
    receiptStorageId: v.optional(v.id("_storage")),
    split: v.object({
      method: v.union(v.literal("equal"), v.literal("items"), v.literal("custom")),
      participants: v.array(
        v.object({
          contactId: v.string(),
          displayName: v.string(),
          phone: v.optional(v.string()),
          channel: v.optional(v.union(v.literal("app"), v.literal("sms"))),
          customAmountMinor: v.optional(v.number()),
        }),
      ),
      assignments: v.optional(v.record(v.string(), v.array(v.string()))),
    }),
  },
  handler: async (ctx, args) => {
    let userId: Id<"users">;
    const authId = await getOptionalAuth(ctx);
    if (authId) {
      userId = authId;
    } else {
      userId = await ctx.db.insert("users", {
        name: "You",
        role: "user",
        isAnonymous: true,
      });
    }
    const currentUser = await ctx.db.get(userId);

    if (args.items.length === 0) {
      throw new Error("Bill must contain at least one item.");
    }

    // Compute subtotal and total strictly in integer paise
    const subtotalMinor = args.items.reduce((acc, it) => acc + it.amountMinor, 0);
    const discountMinor = args.discountMinor ?? 0;
    const totalMinor = subtotalMinor + args.taxMinor + args.serviceMinor - discountMinor;

    if (totalMinor <= 0) {
      throw new Error("Bill total must be greater than zero.");
    }

    const now = Date.now();
    const dateStr = args.date ?? new Date(now).toISOString();

    // Insert bill
    const billId = await ctx.db.insert("bills", {
      restaurant: args.restaurant.trim() || "The Bill",
      city: args.city?.trim() || "Bangalore",
      date: dateStr,
      subtotalMinor,
      taxMinor: args.taxMinor,
      serviceMinor: args.serviceMinor,
      discountMinor: discountMinor > 0 ? discountMinor : undefined,
      totalMinor,
      paidByUserId: userId,
      status: "active",
      receiptStorageId: args.receiptStorageId,
      createdAt: now,
      updatedAt: now,
    });

    // Insert billItems
    const createdItems: Array<{ id: string; amountMinor: number }> = [];
    for (const item of args.items) {
      const itemId = await ctx.db.insert("billItems", {
        billId,
        name: item.name.trim(),
        quantity: item.quantity,
        amountMinor: item.amountMinor,
        createdAt: now,
      });
      createdItems.push({ id: itemId, amountMinor: item.amountMinor });
    }

    // Prepare participants list for split calculation
    // Ensure the current user (payer) is included if not already present
    const rawParticipants = [...args.split.participants];
    const hasPayer = rawParticipants.some(
      (p) => p.contactId === userId || p.displayName.toLowerCase() === "you",
    );
    if (!hasPayer) {
      const u = currentUser as any;
      rawParticipants.unshift({
        contactId: userId,
        displayName: u?.name ?? "You",
        phone: u?.phone,
        channel: "app",
      });
    }

    const participantInputs: ParticipantInput[] = rawParticipants.map((p) => ({
      id: p.contactId,
      name: p.displayName,
    }));

    // Perform server-side calculation using splitEngine
    let computedShares: ComputedShare[];
    if (args.split.method === "equal") {
      computedShares = computeEqualSplit(totalMinor, participantInputs);
    } else if (args.split.method === "custom") {
      const customAmounts: Record<string, number> = {};
      rawParticipants.forEach((p) => {
        customAmounts[p.contactId] = p.customAmountMinor ?? 0;
      });
      computedShares = validateCustomSplit(totalMinor, customAmounts, participantInputs);
    } else {
      // items split
      // Map assignments to newly created item IDs if needed or use provided mapping
      const assignments = args.split.assignments ?? {};
      computedShares = computeItemSplit(totalMinor, createdItems, assignments, participantInputs);
    }

    // Insert split metadata
    const splitId = await ctx.db.insert("splits", {
      billId,
      method: args.split.method,
      createdAt: now,
    });

    // Insert split participants
    for (const share of computedShares) {
      const original = rawParticipants.find((p) => p.contactId === share.id);
      const isPayer = share.id === userId || share.name.toLowerCase() === "you";
      const channel = original?.channel ?? (isPayer ? "app" : "sms");

      // Check if contactId corresponds to a registered user
      let matchedUserId: Id<"users"> | undefined = undefined;
      if (share.id === userId) {
        matchedUserId = userId;
      } else {
        // Try looking up registered user by id or phone
        try {
          const u = await ctx.db.get(share.id as Id<"users">);
          if (u) matchedUserId = u._id;
        } catch {
          // not a valid ID format, check phone
          if (original?.phone) {
            const byPhone = await ctx.db
              .query("users")
              .withIndex("phone", (q) => q.eq("phone", original.phone!))
              .first();
            if (byPhone) matchedUserId = byPhone._id;
          }
        }
      }

      await ctx.db.insert("splitParticipants", {
        splitId,
        billId,
        userId: matchedUserId,
        contactId: share.id,
        displayName: isPayer ? "You" : share.name,
        phone: original?.phone,
        amountMinor: share.amountMinor,
        status: isPayer ? "VERIFIED" : "REQUESTED",
        channel,
        createdAt: now,
      });
    }

    return await getBillDetails(ctx, billId);
  },
});

/**
 * Update an existing bill (draft/edit).
 */
export const editBill = mutation({
  args: {
    billId: v.id("bills"),
    restaurant: v.optional(v.string()),
    city: v.optional(v.string()),
    taxMinor: v.optional(v.number()),
    serviceMinor: v.optional(v.number()),
    discountMinor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const bill = await ctx.db.get(args.billId);
    if (!bill) throw new Error("Bill not found.");
    if (bill.paidByUserId !== userId) throw new Error("Unauthorized to edit this bill.");

    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (args.restaurant !== undefined) updates.restaurant = args.restaurant.trim();
    if (args.city !== undefined) updates.city = args.city.trim();
    if (args.taxMinor !== undefined) updates.taxMinor = args.taxMinor;
    if (args.serviceMinor !== undefined) updates.serviceMinor = args.serviceMinor;
    if (args.discountMinor !== undefined) updates.discountMinor = args.discountMinor;

    await ctx.db.patch(args.billId, updates);
    return await getBillDetails(ctx, args.billId);
  },
});

/**
 * Delete a draft or cancel a bill.
 */
export const deleteBill = mutation({
  args: {
    billId: v.id("bills"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const bill = await ctx.db.get(args.billId);
    if (!bill) throw new Error("Bill not found.");
    if (bill.paidByUserId !== userId) throw new Error("Unauthorized to delete this bill.");

    // Delete child items, split, splitParticipants, paymentRequests, paymentClaims, paymentEvents
    const items = await ctx.db.query("billItems").withIndex("by_bill", (q) => q.eq("billId", args.billId)).collect();
    for (const item of items) await ctx.db.delete(item._id);

    const splits = await ctx.db.query("splits").withIndex("by_bill", (q) => q.eq("billId", args.billId)).collect();
    for (const s of splits) await ctx.db.delete(s._id);

    const participants = await ctx.db.query("splitParticipants").withIndex("by_bill", (q) => q.eq("billId", args.billId)).collect();
    for (const p of participants) await ctx.db.delete(p._id);

    const requests = await ctx.db.query("paymentRequests").withIndex("by_bill", (q) => q.eq("billId", args.billId)).collect();
    for (const r of requests) await ctx.db.delete(r._id);

    const claims = await ctx.db.query("paymentClaims").withIndex("by_bill", (q) => q.eq("billId", args.billId)).collect();
    for (const c of claims) await ctx.db.delete(c._id);

    const events = await ctx.db.query("paymentEvents").withIndex("by_bill", (q) => q.eq("billId", args.billId)).collect();
    for (const e of events) await ctx.db.delete(e._id);

    await ctx.db.delete(args.billId);
    return true;
  },
});

/**
 * Retrieve a single bill with items, split, participants, and events.
 */
export const getBill = query({
  args: {
    billId: v.id("bills"),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuth(ctx);
    if (!userId) return null;
    const hasAccess = await canAccessBill(ctx, args.billId, userId);
    if (!hasAccess) return null;
    return await getBillDetails(ctx, args.billId);
  },
});

/**
 * List all bills the current user owns or is a participant in.
 */
export const listBills = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getOptionalAuth(ctx);
    if (!userId) return [];

    // Owned bills
    const ownedBills = await ctx.db
      .query("bills")
      .withIndex("by_owner", (q) => q.eq("paidByUserId", userId))
      .collect();

    // Participant bills
    const participating = await ctx.db
      .query("splitParticipants")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const participatingBillIds = new Set(participating.map((p) => p.billId));
    const allBillIds = new Set([
      ...ownedBills.map((b) => b._id),
      ...Array.from(participatingBillIds),
    ]);

    const populated = await Promise.all(
      Array.from(allBillIds).map(async (bId) => {
        return await getBillDetails(ctx, bId);
      }),
    );

    return populated
      .filter((b): b is NonNullable<typeof b> => b !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
});

/**
 * Internal helper to populate full bill object matching frontend type structure.
 */
export async function getBillDetails(ctx: any, billId: Id<"bills">) {
  const bill = await ctx.db.get(billId);
  if (!bill) return null;

  const items = await ctx.db
    .query("billItems")
    .withIndex("by_bill", (q: any) => q.eq("billId", billId))
    .collect();

  const splitRecord = await ctx.db
    .query("splits")
    .withIndex("by_bill", (q: any) => q.eq("billId", billId))
    .first();

  const participants = await ctx.db
    .query("splitParticipants")
    .withIndex("by_bill", (q: any) => q.eq("billId", billId))
    .collect();

  const events = await ctx.db
    .query("paymentEvents")
    .withIndex("by_bill", (q: any) => q.eq("billId", billId))
    .collect();

  const requests = await ctx.db
    .query("paymentRequests")
    .withIndex("by_bill", (q: any) => q.eq("billId", billId))
    .collect();

  // Map participants to frontend format
  const mappedParticipants = participants.map((p: any) => ({
    contactId: p.contactId,
    displayName: p.displayName,
    amountMinor: p.amountMinor,
    status: p.status === "VERIFIED" ? ("paid" as const) : ("pending" as const),
    rawStatus: p.status,
    channel: p.channel,
  }));

  const split = splitRecord
    ? {
        method: splitRecord.method,
        participants: mappedParticipants,
      }
    : undefined;

  let receiptUrl: string | undefined = undefined;
  if (bill.receiptStorageId) {
    receiptUrl = (await ctx.storage.getUrl(bill.receiptStorageId)) ?? undefined;
  }

  return {
    id: bill._id,
    restaurant: bill.restaurant,
    city: bill.city,
    createdAt: new Date(bill.createdAt).toISOString(),
    items: items.map((i: any) => ({
      id: i._id,
      name: i.name,
      quantity: i.quantity,
      amountMinor: i.amountMinor,
    })),
    subtotalMinor: bill.subtotalMinor,
    taxMinor: bill.taxMinor,
    serviceMinor: bill.serviceMinor,
    discountMinor: bill.discountMinor,
    totalMinor: bill.totalMinor,
    paidByUserId: bill.paidByUserId,
    status: bill.status,
    receiptUrl,
    split,
    events: events.map((e: any) => ({
      id: e._id,
      billId: e.billId,
      contactId: e.contactId,
      contactName: e.contactName,
      type: e.type === "verified" ? "paid" : e.type === "request_sent" ? "request_sent" : e.type,
      rawType: e.type,
      amountMinor: e.amountMinor,
      at: e.at,
      channel: e.channel,
    })),
    requests: requests.map((r: any) => ({
      id: r._id,
      billId: r.billId,
      payer: { name: r.contactName },
      contact: {
        id: r.contactId,
        name: r.contactName,
        isRegistered: true,
        channel: r.channel,
      },
      amountMinor: r.amountMinor,
      billContext: r.billContext,
      createdAt: new Date(r.createdAt).toISOString(),
      expiresAt: new Date(r.expiresAt).toISOString(),
      status: r.status === "VERIFIED" ? "paid" : "sent",
      paymentReference: r.paymentReference,
    })),
  };
}
