import { mutation } from "./_generated/server";
import { getOptionalAuth } from "./authHelpers";

/**
 * Seed demo friends and bills in Convex for a new user,
 * allowing instant exploration of the real Convex backend.
 */
export const seedInitialData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getOptionalAuth(ctx);
    if (!userId) {
      return { seeded: false, message: "User not authenticated yet." };
    }
    const currentUser = await ctx.db.get(userId);

    // Check if user already has bills
    const existingBills = await ctx.db
      .query("bills")
      .withIndex("by_owner", (q) => q.eq("paidByUserId", userId))
      .first();

    if (existingBills) {
      return { seeded: false, message: "User already has bills." };
    }

    const now = Date.now();

    // 1. Create demo friends in users table if they don't exist
    const demoFriends = [
      { name: "Aarav Mehta", phone: "+91 98201 33450", email: "aarav@example.com", upiId: "aarav@okicici" },
      { name: "Riya Sharma", phone: "+91 99020 71164", email: "riya@example.com" },
      { name: "Kabir Singh", phone: "+91 97403 55228", email: "kabir@example.com", upiId: "kabirsingh@ybl" },
      { name: "Mira Iyer", phone: "+91 96864 41092", email: "mira@example.com", upiId: "miraiyer@paytm" },
    ];

    const friendUserIds = [];
    for (const friend of demoFriends) {
      let existing = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", friend.email))
        .first();

      if (!existing) {
        const id = await ctx.db.insert("users", {
          name: friend.name,
          phone: friend.phone,
          email: friend.email,
          upiId: friend.upiId,
          role: "user",
        });
        existing = await ctx.db.get(id);
      }

      if (existing) {
        friendUserIds.push(existing);

        // Create accepted connection between current user and friend
        const connExists = await ctx.db
          .query("connections")
          .withIndex("by_pair", (q) => q.eq("requesterId", userId).eq("recipientId", existing!._id))
          .first();

        if (!connExists) {
          await ctx.db.insert("connections", {
            requesterId: userId,
            recipientId: existing._id,
            status: "accepted",
            createdAt: now - 3600000,
            updatedAt: now - 3600000,
          });
        }
      }
    }

    // 2. Create seed bill: The Table
    const billTotal = 200600; // ₹2,006.00 in paise
    const billId = await ctx.db.insert("bills", {
      restaurant: "The Table",
      city: "Bangalore",
      date: new Date(now - 20 * 3600000).toISOString(),
      subtotalMinor: 170000,
      taxMinor: 30600,
      serviceMinor: 0,
      totalMinor: billTotal,
      paidByUserId: userId,
      status: "active",
      createdAt: now - 20 * 3600000,
      updatedAt: now - 20 * 3600000,
    });

    const items = [
      { name: "Butter Chicken", quantity: 2, amountMinor: 48000 },
      { name: "Paneer Tikka", quantity: 1, amountMinor: 36000 },
      { name: "Butter Naan", quantity: 4, amountMinor: 16000 },
      { name: "Hyderabadi Biryani", quantity: 1, amountMinor: 42000 },
      { name: "Coke", quantity: 4, amountMinor: 28000 },
    ];

    for (const item of items) {
      await ctx.db.insert("billItems", {
        billId,
        name: item.name,
        quantity: item.quantity,
        amountMinor: item.amountMinor,
        createdAt: now - 20 * 3600000,
      });
    }

    const splitId = await ctx.db.insert("splits", {
      billId,
      method: "items",
      createdAt: now - 20 * 3600000,
    });

    // 4 participants: You (verified), Aarav (verified), Kabir (verified), Riya (REQUESTED)
    const p1 = await ctx.db.insert("splitParticipants", {
      splitId,
      billId,
      userId,
      contactId: userId,
      displayName: "You",
      amountMinor: 50150,
      status: "VERIFIED",
      channel: "app",
      createdAt: now - 20 * 3600000,
    });

    const aarav = friendUserIds[0];
    const riya = friendUserIds[1];
    const kabir = friendUserIds[2];

    if (aarav) {
      await ctx.db.insert("splitParticipants", {
        splitId,
        billId,
        userId: aarav._id,
        contactId: aarav._id,
        displayName: aarav.name ?? "Aarav Mehta",
        phone: aarav.phone,
        amountMinor: 50150,
        status: "VERIFIED",
        channel: "app",
        createdAt: now - 20 * 3600000,
      });

      const rId = await ctx.db.insert("paymentRequests", {
        billId,
        payerId: userId,
        recipientId: aarav._id,
        contactId: aarav._id,
        contactName: aarav.name ?? "Aarav Mehta",
        amountMinor: 50150,
        status: "VERIFIED",
        paymentReference: "SS-AARAV1",
        billContext: {
          restaurant: "The Table",
          totalMinor: billTotal,
          date: new Date(now - 20 * 3600000).toISOString(),
          itemCount: 5,
        },
        channel: "app",
        createdAt: now - 20 * 3600000,
        expiresAt: now + 6 * 86400000,
      });

      await ctx.db.insert("paymentClaims", {
        paymentRequestId: rId,
        billId,
        payerId: userId,
        recipientId: aarav._id,
        claimantName: aarav.name ?? "Aarav Mehta",
        utr: "428901234567",
        claimedAmountMinor: 50150,
        status: "VERIFIED",
        createdAt: now - 18 * 3600000,
        verifiedAt: now - 17 * 3600000,
      });

      await ctx.db.insert("paymentEvents", {
        billId,
        paymentRequestId: rId,
        contactId: aarav._id,
        contactName: aarav.name ?? "Aarav Mehta",
        type: "verified",
        amountMinor: 50150,
        channel: "app",
        at: new Date(now - 17 * 3600000).toISOString(),
        createdAt: now - 17 * 3600000,
      });
    }

    if (kabir) {
      await ctx.db.insert("splitParticipants", {
        splitId,
        billId,
        userId: kabir._id,
        contactId: kabir._id,
        displayName: kabir.name ?? "Kabir Singh",
        phone: kabir.phone,
        amountMinor: 50150,
        status: "VERIFIED",
        channel: "app",
        createdAt: now - 20 * 3600000,
      });

      const rId = await ctx.db.insert("paymentRequests", {
        billId,
        payerId: userId,
        recipientId: kabir._id,
        contactId: kabir._id,
        contactName: kabir.name ?? "Kabir Singh",
        amountMinor: 50150,
        status: "VERIFIED",
        paymentReference: "SS-KABIR2",
        billContext: {
          restaurant: "The Table",
          totalMinor: billTotal,
          date: new Date(now - 20 * 3600000).toISOString(),
          itemCount: 5,
        },
        channel: "app",
        createdAt: now - 20 * 3600000,
        expiresAt: now + 6 * 86400000,
      });

      await ctx.db.insert("paymentClaims", {
        paymentRequestId: rId,
        billId,
        payerId: userId,
        recipientId: kabir._id,
        claimantName: kabir.name ?? "Kabir Singh",
        utr: "428901889900",
        claimedAmountMinor: 50150,
        status: "VERIFIED",
        createdAt: now - 16 * 3600000,
        verifiedAt: now - 15 * 3600000,
      });

      await ctx.db.insert("paymentEvents", {
        billId,
        paymentRequestId: rId,
        contactId: kabir._id,
        contactName: kabir.name ?? "Kabir Singh",
        type: "verified",
        amountMinor: 50150,
        channel: "app",
        at: new Date(now - 15 * 3600000).toISOString(),
        createdAt: now - 15 * 3600000,
      });
    }

    if (riya) {
      await ctx.db.insert("splitParticipants", {
        splitId,
        billId,
        userId: riya._id,
        contactId: riya._id,
        displayName: riya.name ?? "Riya Sharma",
        phone: riya.phone,
        amountMinor: 50150,
        status: "REQUESTED",
        channel: "sms",
        createdAt: now - 20 * 3600000,
      });

      const rId = await ctx.db.insert("paymentRequests", {
        billId,
        payerId: userId,
        recipientId: riya._id,
        contactId: riya._id,
        contactName: riya.name ?? "Riya Sharma",
        amountMinor: 50150,
        status: "REQUESTED",
        paymentReference: "SS-RIYA03",
        billContext: {
          restaurant: "The Table",
          totalMinor: billTotal,
          date: new Date(now - 20 * 3600000).toISOString(),
          itemCount: 5,
        },
        channel: "sms",
        createdAt: now - 20 * 3600000,
        expiresAt: now + 6 * 86400000,
      });

      await ctx.db.insert("paymentEvents", {
        billId,
        paymentRequestId: rId,
        contactId: riya._id,
        contactName: riya.name ?? "Riya Sharma",
        type: "request_sent",
        amountMinor: 50150,
        channel: "sms",
        at: new Date(now - 20 * 3600000).toISOString(),
        createdAt: now - 20 * 3600000,
      });
    }

    return { seeded: true, billId };
  },
});
