import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// User roles
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

export const participantStatusValidator = v.union(
  v.literal("REQUESTED"),
  v.literal("PAYMENT_CLAIMED"),
  v.literal("VERIFIED"),
  v.literal("REJECTED"),
  v.literal("EXPIRED"),
  v.literal("CANCELLED"),
);

export const deliveryChannelValidator = v.union(
  v.literal("app"),
  v.literal("sms"),
);

const schema = defineSchema(
  {
    // Default auth tables using Convex Auth (users, authSessions, etc.)
    ...authTables,

    // Extended users table
    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),

      // SplitSlip custom profile attributes
      phone: v.optional(v.string()),
      upiId: v.optional(v.string()),
      username: v.optional(v.string()),
      avatarColor: v.optional(v.string()),
    })
      .index("email", ["email"])
      .index("phone", ["phone"])
      .index("username", ["username"]),

    // Friend / Connection relationships
    connections: defineTable({
      requesterId: v.id("users"),
      recipientId: v.id("users"),
      status: v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("rejected"),
      ),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_requester", ["requesterId", "status"])
      .index("by_recipient", ["recipientId", "status"])
      .index("by_pair", ["requesterId", "recipientId"]),

    // Bills
    bills: defineTable({
      restaurant: v.string(),
      city: v.optional(v.string()),
      date: v.string(),
      subtotalMinor: v.number(), // integer paise
      taxMinor: v.number(), // integer paise
      serviceMinor: v.number(), // integer paise
      discountMinor: v.optional(v.number()), // integer paise
      totalMinor: v.number(), // integer paise
      paidByUserId: v.id("users"),
      status: v.union(
        v.literal("draft"),
        v.literal("active"),
        v.literal("settled"),
        v.literal("cancelled"),
      ),
      receiptStorageId: v.optional(v.id("_storage")),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_owner", ["paidByUserId", "createdAt"])
      .index("by_status", ["status"]),

    // Bill line items
    billItems: defineTable({
      billId: v.id("bills"),
      name: v.string(),
      quantity: v.number(),
      amountMinor: v.number(), // integer paise
      createdAt: v.number(),
    }).index("by_bill", ["billId"]),

    // Splits configuration
    splits: defineTable({
      billId: v.id("bills"),
      method: v.union(
        v.literal("equal"),
        v.literal("items"),
        v.literal("custom"),
      ),
      createdAt: v.number(),
    }).index("by_bill", ["billId"]),

    // Split participants
    splitParticipants: defineTable({
      splitId: v.id("splits"),
      billId: v.id("bills"),
      userId: v.optional(v.id("users")),
      contactId: v.string(),
      displayName: v.string(),
      phone: v.optional(v.string()),
      amountMinor: v.number(), // integer paise
      status: participantStatusValidator,
      channel: deliveryChannelValidator,
      createdAt: v.number(),
    })
      .index("by_split", ["splitId"])
      .index("by_bill", ["billId"])
      .index("by_user", ["userId"])
      .index("by_status", ["status"]),

    // Payment requests
    paymentRequests: defineTable({
      billId: v.id("bills"),
      payerId: v.id("users"), // the one who paid the bill and wants to collect
      recipientId: v.optional(v.id("users")),
      contactId: v.string(),
      contactName: v.string(),
      amountMinor: v.number(), // integer paise
      status: participantStatusValidator,
      paymentReference: v.string(), // unique reference code e.g. SS-XXXXX
      billContext: v.object({
        restaurant: v.string(),
        totalMinor: v.number(),
        date: v.string(),
        itemCount: v.number(),
      }),
      channel: deliveryChannelValidator,
      createdAt: v.number(),
      expiresAt: v.number(),
    })
      .index("by_bill", ["billId"])
      .index("by_payer", ["payerId", "status"])
      .index("by_recipient", ["recipientId", "status"])
      .index("by_reference", ["paymentReference"])
      .index("by_status_expires", ["status", "expiresAt"]),

    // Payment claims submitted by recipient with UTR
    paymentClaims: defineTable({
      paymentRequestId: v.id("paymentRequests"),
      billId: v.id("bills"),
      payerId: v.id("users"),
      recipientId: v.optional(v.id("users")),
      claimantName: v.string(),
      utr: v.string(), // 12-digit UPI / bank transaction reference
      claimedAmountMinor: v.number(), // integer paise
      status: v.union(
        v.literal("PAYMENT_CLAIMED"),
        v.literal("VERIFIED"),
        v.literal("REJECTED"),
      ),
      notes: v.optional(v.string()),
      rejectionReason: v.optional(v.string()),
      createdAt: v.number(),
      verifiedAt: v.optional(v.number()),
    })
      .index("by_request", ["paymentRequestId"])
      .index("by_bill", ["billId"])
      .index("by_payer", ["payerId", "status"])
      .index("by_utr", ["utr"]),

    // Audit trail / payment events
    paymentEvents: defineTable({
      billId: v.id("bills"),
      paymentRequestId: v.optional(v.id("paymentRequests")),
      contactId: v.string(),
      contactName: v.string(),
      type: v.union(
        v.literal("request_sent"),
        v.literal("claim_submitted"),
        v.literal("verified"),
        v.literal("rejected"),
        v.literal("paid"),
        v.literal("reminder"),
        v.literal("expired"),
        v.literal("cancelled"),
      ),
      amountMinor: v.number(),
      channel: v.optional(v.string()),
      at: v.string(), // ISO string
      createdAt: v.number(),
    })
      .index("by_bill", ["billId"])
      .index("by_request", ["paymentRequestId"]),

    // In-app notifications
    notifications: defineTable({
      userId: v.id("users"),
      type: v.union(
        v.literal("connection_request"),
        v.literal("connection_accepted"),
        v.literal("payment_request"),
        v.literal("payment_claimed"),
        v.literal("payment_verified"),
        v.literal("payment_rejected"),
      ),
      title: v.string(),
      message: v.string(),
      data: v.optional(v.any()),
      isRead: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId", "createdAt"])
      .index("by_user_unread", ["userId", "isRead"]),

    // Email delivery records
    emailEvents: defineTable({
      recipientEmail: v.string(),
      type: v.string(),
      subject: v.string(),
      status: v.union(
        v.literal("sent"),
        v.literal("failed"),
        v.literal("simulated"),
      ),
      error: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_recipient", ["recipientEmail"])
      .index("by_status", ["status"]),

    // Site-wide configuration & feature flags (singleton-ish, keyed by "key")
    siteConfig: defineTable({
      key: v.string(),
      value: v.any(),
      updatedAt: v.number(),
      updatedBy: v.optional(v.id("users")),
    }).index("by_key", ["key"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
