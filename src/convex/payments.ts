import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, getOptionalAuth } from "./authHelpers";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

/**
 * Generate standard RFC/NPCI compliant UPI deep link.
 * Opens any installed UPI app (GPay, PhonePe, Paytm, BHIM, etc.)
 */
export function buildUpiDeepLink(params: {
  payerUpi: string;
  payerName: string;
  amountMinor: number;
  ref: string;
  note?: string;
}): string {
  const amountRupees = (params.amountMinor / 100).toFixed(2);
  const cleanUpi = params.payerUpi.trim();
  const cleanName = encodeURIComponent(params.payerName.trim());
  const cleanNote = encodeURIComponent(params.note ?? `SplitSlip ${params.ref}`);
  const cleanRef = encodeURIComponent(params.ref);

  return `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${amountRupees}&cu=INR&tr=${cleanRef}&tn=${cleanNote}`;
}

/**
 * Send payment requests for a finalized bill and split.
 * Generates paymentRequests, audit events, and notifications.
 */
export const sendPaymentRequests = mutation({
  args: {
    billId: v.id("bills"),
  },
  handler: async (ctx, args) => {
    const authId = await getOptionalAuth(ctx);
    const bill = await ctx.db.get(args.billId);
    if (!bill) throw new Error("Bill not found.");

    let userId: Id<"users">;
    if (authId) {
      userId = authId;
      if (bill.paidByUserId !== userId) {
        const creator = await ctx.db.get(bill.paidByUserId);
        if (creator?.isAnonymous) {
          await ctx.db.patch(bill._id, { paidByUserId: userId });
        } else {
          throw new Error("Unauthorized: Only the bill owner can send payment requests.");
        }
      }
    } else {
      userId = bill.paidByUserId;
    }

    const payer = await ctx.db.get(userId);
    if (!payer) throw new Error("Payer not found.");

    const participants = await ctx.db
      .query("splitParticipants")
      .withIndex("by_bill", (q) => q.eq("billId", args.billId))
      .collect();

    const items = await ctx.db
      .query("billItems")
      .withIndex("by_bill", (q) => q.eq("billId", args.billId))
      .collect();

    const now = Date.now();
    const expiresAt = now + 7 * 86400000; // 7 days expiry
    const createdRequests = [];

    for (const p of participants) {
      // Don't send request to the payer themselves
      if (p.userId === userId || p.contactId === userId || p.displayName.toLowerCase() === "you") {
        continue;
      }

      // Check if a request was already created
      const existing = await ctx.db
        .query("paymentRequests")
        .withIndex("by_bill", (q) => q.eq("billId", args.billId))
        .filter((q) => q.eq(q.field("contactId"), p.contactId))
        .first();

      if (existing) {
        createdRequests.push(existing);
        continue;
      }

      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const paymentReference = `SS-${randomSuffix}`;

      const reqId = await ctx.db.insert("paymentRequests", {
        billId: args.billId,
        payerId: userId,
        recipientId: p.userId,
        contactId: p.contactId,
        contactName: p.displayName,
        amountMinor: p.amountMinor,
        status: "REQUESTED",
        paymentReference,
        billContext: {
          restaurant: bill.restaurant,
          totalMinor: bill.totalMinor,
          date: bill.date,
          itemCount: items.length,
        },
        channel: p.channel,
        createdAt: now,
        expiresAt,
      });

      // Audit event
      await ctx.db.insert("paymentEvents", {
        billId: args.billId,
        paymentRequestId: reqId,
        contactId: p.contactId,
        contactName: p.displayName,
        type: "request_sent",
        amountMinor: p.amountMinor,
        channel: p.channel,
        at: new Date(now).toISOString(),
        createdAt: now,
      });

      // In-app notification to recipient if registered
      if (p.userId) {
        await ctx.db.insert("notifications", {
          userId: p.userId,
          type: "payment_request",
          title: `Payment Request from ${payer.name ?? "Friend"}`,
          message: `${payer.name ?? "Friend"} requested ₹${(p.amountMinor / 100).toFixed(2)} for ${bill.restaurant}.`,
          data: { paymentRequestId: reqId, billId: bill._id },
          isRead: false,
          createdAt: now,
        });
        const recipientUser = await ctx.db.get(p.userId);
        if (recipientUser?.email) {
          await ctx.scheduler.runAfter(0, api.emails.sendNotificationEmail, {
            to: recipientUser.email,
            type: "payment_request",
            subject: `SplitSlip: Payment request for ${bill.restaurant} (₹${(p.amountMinor / 100).toFixed(2)})`,
            bodyText: `Hi ${recipientUser.name ?? "there"},\n\n${payer.name ?? "Your friend"} has requested ₹${(p.amountMinor / 100).toFixed(2)} for dinner at ${bill.restaurant}.\n\nReference: ${paymentReference}\n\nPlease open SplitSlip to pay via UPI and submit your UTR.`,
          });
        }
      }

      // Log email delivery event
      if (p.phone || p.userId) {
        await ctx.db.insert("emailEvents", {
          recipientEmail: p.userId ? (await ctx.db.get(p.userId))?.email ?? "simulated@splitslip.app" : "simulated@splitslip.app",
          type: "payment_request",
          subject: `SplitSlip: Payment request from ${payer.name ?? "Friend"} for ${bill.restaurant}`,
          status: "simulated",
          createdAt: now,
        });
      }

      const created = await ctx.db.get(reqId);
      if (created) createdRequests.push(created);
    }

    return createdRequests;
  },
});

/**
 * Get payment request details for public URL `/r/:requestId` or in-app payment.
 * Returns safe details necessary to make payment without leaking private data.
 */
export const getPaymentRequest = query({
  args: {
    requestId: v.string(), // can be _id or paymentReference
  },
  handler: async (ctx, args) => {
    let req = null;
    try {
      req = await ctx.db.get(args.requestId as Id<"paymentRequests">);
    } catch {
      // not a valid ID format, try querying by reference
    }

    if (!req) {
      req = await ctx.db
        .query("paymentRequests")
        .withIndex("by_reference", (q) => q.eq("paymentReference", args.requestId))
        .first();
    }

    if (!req) return null;

    const payer = await ctx.db.get(req.payerId);
    if (!payer) return null;

    const payerName = payer.name ?? "SplitSlip User";
    const payerUpi = payer.upiId ?? "danish@okhdfc";

    // Generate UPI deep link
    const upiLink = buildUpiDeepLink({
      payerUpi,
      payerName,
      amountMinor: req.amountMinor,
      ref: req.paymentReference,
      note: `SplitSlip for ${req.billContext.restaurant}`,
    });

    // Check if there is an existing claim
    const claim = await ctx.db
      .query("paymentClaims")
      .withIndex("by_request", (q) => q.eq("paymentRequestId", req!._id))
      .first();

    return {
      id: req._id,
      billId: req.billId,
      payer: {
        name: payerName,
        upiId: payerUpi,
      },
      contact: {
        id: req.contactId,
        name: req.contactName,
        isRegistered: req.recipientId !== undefined,
        channel: req.channel,
      },
      amountMinor: req.amountMinor,
      billContext: req.billContext,
      createdAt: new Date(req.createdAt).toISOString(),
      expiresAt: new Date(req.expiresAt).toISOString(),
      status: req.status === "VERIFIED" ? ("paid" as const) : req.status === "EXPIRED" ? ("expired" as const) : ("sent" as const),
      rawStatus: req.status,
      paymentReference: req.paymentReference,
      upiLink,
      claim: claim
        ? {
            id: claim._id,
            utr: claim.utr,
            claimedAmountMinor: claim.claimedAmountMinor,
            status: claim.status,
            createdAt: new Date(claim.createdAt).toISOString(),
          }
        : null,
    };
  },
});

/**
 * Submit UTR Payment Claim.
 * Recipient submits a transaction reference / UTR after paying.
 * Transitions state: REQUESTED -> PAYMENT_CLAIMED.
 */
export const claimPayment = mutation({
  args: {
    requestId: v.string(), // ID or reference
    utr: v.string(), // 12-digit transaction ID or reference
    claimedAmountMinor: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let req = null;
    try {
      req = await ctx.db.get(args.requestId as Id<"paymentRequests">);
    } catch {
      // fallback
    }

    if (!req) {
      req = await ctx.db
        .query("paymentRequests")
        .withIndex("by_reference", (q) => q.eq("paymentReference", args.requestId))
        .first();
    }

    if (!req) {
      throw new Error("Payment request not found.");
    }

    if (req.status === "VERIFIED") {
      throw new Error("This payment has already been verified.");
    }

    const cleanUtr = args.utr.trim();
    if (cleanUtr.length < 6) {
      throw new Error("Please provide a valid UTR / transaction reference (at least 6 characters).");
    }

    if (args.claimedAmountMinor !== req.amountMinor) {
      throw new Error(`Claimed amount (₹${(args.claimedAmountMinor / 100).toFixed(2)}) must match requested amount (₹${(req.amountMinor / 100).toFixed(2)}).`);
    }

    // Check duplicate claim by UTR
    const existingUtr = await ctx.db
      .query("paymentClaims")
      .withIndex("by_utr", (q) => q.eq("utr", cleanUtr))
      .first();

    if (existingUtr && existingUtr.paymentRequestId !== req._id) {
      throw new Error("This UTR has already been claimed for another payment request.");
    }

    const now = Date.now();

    // Check or upsert claim
    let claimId;
    const existingClaim = await ctx.db
      .query("paymentClaims")
      .withIndex("by_request", (q) => q.eq("paymentRequestId", req._id))
      .first();

    if (existingClaim) {
      await ctx.db.patch(existingClaim._id, {
        utr: cleanUtr,
        claimedAmountMinor: args.claimedAmountMinor,
        status: "PAYMENT_CLAIMED",
        notes: args.notes?.trim(),
        createdAt: now,
      });
      claimId = existingClaim._id;
    } else {
      claimId = await ctx.db.insert("paymentClaims", {
        paymentRequestId: req._id,
        billId: req.billId,
        payerId: req.payerId,
        recipientId: req.recipientId,
        claimantName: req.contactName,
        utr: cleanUtr,
        claimedAmountMinor: args.claimedAmountMinor,
        status: "PAYMENT_CLAIMED",
        notes: args.notes?.trim(),
        createdAt: now,
      });
    }

    // Update payment request status
    await ctx.db.patch(req._id, {
      status: "PAYMENT_CLAIMED",
    });

    // Update participant status
    const participant = await ctx.db
      .query("splitParticipants")
      .withIndex("by_bill", (q) => q.eq("billId", req.billId))
      .filter((q) => q.eq(q.field("contactId"), req.contactId))
      .first();

    if (participant) {
      await ctx.db.patch(participant._id, {
        status: "PAYMENT_CLAIMED",
      });
    }

    // Emit paymentEvent
    await ctx.db.insert("paymentEvents", {
      billId: req.billId,
      paymentRequestId: req._id,
      contactId: req.contactId,
      contactName: req.contactName,
      type: "claim_submitted",
      amountMinor: args.claimedAmountMinor,
      at: new Date(now).toISOString(),
      createdAt: now,
    });

    // Notify payer that a claim was submitted
    await ctx.db.insert("notifications", {
      userId: req.payerId,
      type: "payment_claimed",
      title: `Payment Claimed by ${req.contactName}`,
      message: `${req.contactName} claimed payment of ₹${(args.claimedAmountMinor / 100).toFixed(2)} (UTR: ${cleanUtr}). Please verify.`,
      data: { paymentRequestId: req._id, claimId, utr: cleanUtr, billId: req.billId },
      isRead: false,
      createdAt: now,
    });

    const payer = await ctx.db.get(req.payerId);
    if (payer?.email) {
      await ctx.scheduler.runAfter(0, api.emails.sendNotificationEmail, {
        to: payer.email,
        type: "payment_claimed",
        subject: `SplitSlip: Payment claim submitted by ${req.contactName} (₹${(args.claimedAmountMinor / 100).toFixed(2)})`,
        bodyText: `Hi ${payer.name ?? "there"},\n\n${req.contactName} has submitted a payment claim of ₹${(args.claimedAmountMinor / 100).toFixed(2)} with UTR: ${cleanUtr}.\n\nPlease review and verify this payment in SplitSlip.`,
      });
    }

    return {
      success: true,
      claimId,
      status: "PAYMENT_CLAIMED",
    };
  },
});

/**
 * Payer Verification:
 * Only the original payer can verify or reject a payment claim!
 * On confirm: PAYMENT_CLAIMED -> VERIFIED.
 * On reject: PAYMENT_CLAIMED -> REJECTED.
 */
export const verifyPayment = mutation({
  args: {
    paymentRequestId: v.id("paymentRequests"),
    approved: v.boolean(),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const req = await ctx.db.get(args.paymentRequestId);
    if (!req) throw new Error("Payment request not found.");

    // Strict authorization: Only the bill owner / payer can verify!
    if (req.payerId !== userId) {
      throw new Error("Unauthorized: Only the original payer can verify or reject this payment.");
    }

    const claim = await ctx.db
      .query("paymentClaims")
      .withIndex("by_request", (q) => q.eq("paymentRequestId", args.paymentRequestId))
      .first();

    const now = Date.now();
    const newStatus = args.approved ? "VERIFIED" : "REJECTED";

    // Update payment request
    await ctx.db.patch(req._id, {
      status: newStatus,
    });

    // Update claim
    if (claim) {
      await ctx.db.patch(claim._id, {
        status: newStatus,
        verifiedAt: now,
        rejectionReason: args.rejectionReason,
      });
    }

    // Update splitParticipant
    const participant = await ctx.db
      .query("splitParticipants")
      .withIndex("by_bill", (q) => q.eq("billId", req.billId))
      .filter((q) => q.eq(q.field("contactId"), req.contactId))
      .first();

    if (participant) {
      await ctx.db.patch(participant._id, {
        status: newStatus,
      });
    }

    // Log audit event
    await ctx.db.insert("paymentEvents", {
      billId: req.billId,
      paymentRequestId: req._id,
      contactId: req.contactId,
      contactName: req.contactName,
      type: args.approved ? "verified" : "rejected",
      amountMinor: req.amountMinor,
      at: new Date(now).toISOString(),
      createdAt: now,
    });

    // Check if entire bill is now settled
    const allParticipants = await ctx.db
      .query("splitParticipants")
      .withIndex("by_bill", (q) => q.eq("billId", req.billId))
      .collect();

    const allSettled = allParticipants.every((p) => p.status === "VERIFIED");
    if (allSettled) {
      await ctx.db.patch(req.billId, { status: "settled" });
    }

    // Notify recipient if registered
    if (req.recipientId) {
      await ctx.db.insert("notifications", {
        userId: req.recipientId,
        type: args.approved ? "payment_verified" : "payment_rejected",
        title: args.approved ? "Payment Confirmed! ✓" : "Payment Rejected",
        message: args.approved
          ? `Your payment of ₹${(req.amountMinor / 100).toFixed(2)} for ${req.billContext.restaurant} was verified.`
          : `Your payment claim was rejected: ${args.rejectionReason || "UTR could not be verified."}`,
        data: { paymentRequestId: req._id, billId: req.billId },
        isRead: false,
        createdAt: now,
      });

      const recipient = await ctx.db.get(req.recipientId);
      if (recipient?.email) {
        await ctx.scheduler.runAfter(0, api.emails.sendNotificationEmail, {
          to: recipient.email,
          type: args.approved ? "payment_verified" : "payment_rejected",
          subject: args.approved
            ? `SplitSlip: Payment confirmed for ${req.billContext.restaurant}`
            : `SplitSlip: Payment claim rejected for ${req.billContext.restaurant}`,
          bodyText: args.approved
            ? `Hi ${recipient.name ?? "there"},\n\nYour payment of ₹${(req.amountMinor / 100).toFixed(2)} for ${req.billContext.restaurant} was verified and confirmed by the payer.\n\nThank you!`
            : `Hi ${recipient.name ?? "there"},\n\nYour payment claim for ${req.billContext.restaurant} was rejected: ${args.rejectionReason || "UTR could not be verified."}.\n\nPlease check your UPI transaction details and re-submit your claim.`,
        });
      }
    }

    return {
      success: true,
      status: newStatus,
    };
  },
});

/**
 * Settlement tracking for a bill.
 * Calculates total bill, total verified, total claimed, total pending, and lists all participants.
 */
export const getSettlement = query({
  args: {
    billId: v.id("bills"),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuth(ctx);
    if (!userId) return null;
    const bill = await ctx.db.get(args.billId);
    if (!bill) return null;

    const participants = await ctx.db
      .query("splitParticipants")
      .withIndex("by_bill", (q) => q.eq("billId", args.billId))
      .collect();

    const events = await ctx.db
      .query("paymentEvents")
      .withIndex("by_bill", (q) => q.eq("billId", args.billId))
      .collect();

    const claims = await ctx.db
      .query("paymentClaims")
      .withIndex("by_bill", (q) => q.eq("billId", args.billId))
      .collect();

    const requests = await ctx.db
      .query("paymentRequests")
      .withIndex("by_bill", (q) => q.eq("billId", args.billId))
      .collect();

    let totalVerifiedMinor = 0;
    let totalClaimedMinor = 0;
    let totalPendingMinor = 0;

    for (const p of participants) {
      const isPayer = p.userId === bill.paidByUserId || p.contactId === bill.paidByUserId;
      if (isPayer) continue;

      if (p.status === "VERIFIED") {
        totalVerifiedMinor += p.amountMinor;
      } else if (p.status === "PAYMENT_CLAIMED") {
        totalClaimedMinor += p.amountMinor;
        totalPendingMinor += p.amountMinor;
      } else {
        totalPendingMinor += p.amountMinor;
      }
    }

    return {
      billId: bill._id,
      restaurant: bill.restaurant,
      totalMinor: bill.totalMinor,
      youPaidMinor: bill.totalMinor,
      isOwner: bill.paidByUserId === userId,
      settlementMetrics: {
        totalBillMinor: bill.totalMinor,
        totalVerifiedMinor,
        totalClaimedMinor,
        totalPendingMinor,
      },
      participants: participants.map((p) => {
        const claim = claims.find((c) => c.recipientId === p.userId || c.claimantName === p.displayName);
        const req = requests.find((r) => r.contactId === p.contactId);
        return {
          contactId: p.contactId,
          displayName: p.displayName,
          amountMinor: p.amountMinor,
          status: p.status === "VERIFIED" ? ("paid" as const) : ("pending" as const),
          rawStatus: p.status,
          channel: p.channel,
          claim: claim
            ? {
                id: claim._id,
                utr: claim.utr,
                status: claim.status,
                notes: claim.notes,
              }
            : null,
          paymentRequestId: req?._id,
        };
      }),
      events: events.map((e) => ({
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
    };
  },
});

/**
 * List payment requests for current user:
 * 1. incoming: where user is the recipient (to pay)
 * 2. outgoing: where user is the payer (to collect)
 */
export const listMyPaymentRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getOptionalAuth(ctx);
    if (!userId) return { incoming: [], outgoing: [] };

    const incoming = await ctx.db
      .query("paymentRequests")
      .withIndex("by_recipient", (q) => q.eq("recipientId", userId))
      .order("desc")
      .take(50);

    const outgoing = await ctx.db
      .query("paymentRequests")
      .withIndex("by_payer", (q) => q.eq("payerId", userId))
      .order("desc")
      .take(50);

    return { incoming, outgoing };
  },
});

