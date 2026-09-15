/* ============================================================
   SplitSlip — Convex Service Layer
   Replaces mock in-memory stores with real Convex queries,
   mutations, and actions while preserving existing UI interfaces.
   ============================================================ */

import { convex } from "@/lib/convexClient";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  CURRENT_USER_ID,
  DEFAULT_USER,
  MOCK_CONTACTS,
  SCAN_RESULTS,
  TABLE_GROUP_IDS,
} from "./mockData";
import type {
  Bill,
  BillItem,
  Contact,
  PaymentRequest,
  Settlement,
  Split,
  User,
} from "./types";

/* ---------- User ---------- */

export async function getCurrentUser(): Promise<User | null> {
  try {
    const user = await convex.query(api.users.currentUser, {});
    if (user) {
      return {
        id: user._id,
        name: user.name ?? "Friend",
        phone: user.phone ?? "",
        email: user.email,
        username: user.username,
        upiId: user.upiId,
        avatarColor: user.avatarColor,
        role: user.role,
      };
    }
  } catch (err) {
    console.warn("Error fetching current user from Convex:", err);
  }
  return null;
}

export async function updateUser(patch: Partial<User>): Promise<User | null> {
  try {
    const updated = await convex.mutation(api.users.updateProfile, {
      name: patch.name,
      phone: patch.phone,
      upiId: patch.upiId,
      avatarColor: patch.avatarColor,
    });
    if (updated) {
      return {
        id: updated._id,
        name: updated.name ?? "Friend",
        phone: updated.phone ?? "",
        email: updated.email,
        username: updated.username,
        upiId: updated.upiId,
        avatarColor: updated.avatarColor,
        role: updated.role,
      };
    }
  } catch (err) {
    console.warn("Error updating user profile in Convex:", err);
  }
  return null;
}

/* ---------- Contacts / Connections ---------- */

export async function getContacts(): Promise<Contact[]> {
  try {
    const friends = await convex.query(api.connections.listConnections, {});
    if (friends && friends.length > 0) {
      return friends.map((f) => ({
        id: f.id,
        name: f.name,
        phone: f.phone,
        isRegistered: f.isRegistered,
      }));
    }
  } catch (err) {
    console.warn("Error listing connections from Convex:", err);
  }

  // Real friends from Convex only (no fake mock contacts)
  return [];
}


export async function searchRegisteredUsers(searchQuery: string) {
  try {
    return await convex.query(api.users.searchUsers, { query: searchQuery });
  } catch (err) {
    console.warn("Error searching users:", err);
    return [];
  }
}

export async function sendFriendRequest(recipientId: string) {
  return await convex.mutation(api.connections.sendConnectionRequest, {
    recipientId: recipientId as Id<"users">,
  });
}

export async function respondToFriendRequest(connectionId: string, accept: boolean) {
  return await convex.mutation(api.connections.respondConnectionRequest, {
    connectionId: connectionId as Id<"connections">,
    accept,
  });
}

/* ---------- Scanner / OCR ---------- */

export interface ScanResult {
  restaurant: string;
  city: string;
  items: BillItem[];
  taxMinor: number;
  serviceMinor: number;
}

export async function scanReceipt(): Promise<ScanResult> {
  const idx = Math.floor(Math.random() * SCAN_RESULTS.length);
  const result = SCAN_RESULTS[idx];
  return {
    restaurant: result.restaurant,
    city: result.city,
    items: result.items.map((i) => ({ ...i })),
    taxMinor: result.taxMinor,
    serviceMinor: result.serviceMinor,
  };
}

/* ---------- Bills ---------- */

export interface CreateBillInput {
  restaurant: string;
  city?: string;
  items: BillItem[];
  taxMinor: number;
  serviceMinor: number;
  discountMinor?: number;
  split: Split;
}

export async function createBill(input: CreateBillInput): Promise<Bill> {
  try {
    // Map split participants
    const participants = input.split.participants.map((p) => ({
      contactId: p.contactId,
      displayName: p.displayName,
      channel: p.channel ?? ("app" as const),
      customAmountMinor: input.split.method === "custom" ? p.amountMinor : undefined,
    }));

    const created = await convex.mutation(api.bills.createBill, {
      restaurant: input.restaurant,
      city: input.city,
      items: input.items.map((it) => ({
        name: it.name,
        quantity: it.quantity,
        amountMinor: it.amountMinor,
      })),
      taxMinor: input.taxMinor,
      serviceMinor: input.serviceMinor,
      discountMinor: input.discountMinor,
      split: {
        method: input.split.method,
        participants,
      },
    });

    if (created) {
      return created as unknown as Bill;
    }
  } catch (err) {
    console.error("Error creating bill in Convex:", err);
    throw err;
  }
  throw new Error("Failed to create bill");
}

export async function getBillHistory(): Promise<Bill[]> {
  try {
    const list = await convex.query(api.bills.listBills, {});
    if (list && list.length > 0) {
      return list as unknown as Bill[];
    }
  } catch (err) {
    console.warn("Error fetching bills from Convex:", err);
  }
  return [];
}

export async function getBill(billId: string): Promise<Bill | null> {
  try {
    const bill = await convex.query(api.bills.getBill, {
      billId: billId as Id<"bills">,
    });
    if (bill) return bill as unknown as Bill;
  } catch (err) {
    console.warn("Error fetching bill from Convex:", err);
  }
  return null;
}

/* ---------- Sending payment requests ---------- */

export interface SendRequestsInput {
  bill: Bill;
  split: Split;
}

export interface SendResult {
  bill: Bill;
  requests: PaymentRequest[];
}

export async function sendPaymentRequests(
  input: SendRequestsInput,
): Promise<SendResult> {
  try {
    const requests = await convex.mutation(api.payments.sendPaymentRequests, {
      billId: input.bill.id as Id<"bills">,
    });

    const refreshedBill = await getBill(input.bill.id);
    return {
      bill: refreshedBill ?? input.bill,
      requests: (requests ?? []) as unknown as PaymentRequest[],
    };
  } catch (err) {
    console.error("Error sending payment requests in Convex:", err);
    throw err;
  }
}

/* ---------- Settlements ---------- */

export async function getSettlement(billId: string): Promise<Settlement | null> {
  try {
    const s = await convex.query(api.payments.getSettlement, {
      billId: billId as Id<"bills">,
    });
    if (s) return s as unknown as Settlement;
  } catch (err) {
    console.warn("Error fetching settlement from Convex:", err);
  }
  return null;
}

/** Submit UTR payment claim */
export async function claimPayment(
  requestId: string,
  utr: string,
  amountMinor: number,
  notes?: string,
) {
  return await convex.mutation(api.payments.claimPayment, {
    requestId,
    utr,
    claimedAmountMinor: amountMinor,
    notes,
  });
}

/** Verify payment claim by original payer */
export async function verifyPayment(
  paymentRequestId: string,
  approved: boolean,
  rejectionReason?: string,
) {
  return await convex.mutation(api.payments.verifyPayment, {
    paymentRequestId: paymentRequestId as Id<"paymentRequests">,
    approved,
    rejectionReason,
  });
}

/** Simulates a friend paying / claiming and verifies for demo */
export async function simulatePayment(
  billId: string,
  contactId: string,
): Promise<Settlement | null> {
  try {
    // Find payment request for this contact
    const bill = await getBill(billId);
    const req = bill?.requests.find((r) => r.contact?.id === contactId || r.id === contactId);
    if (req) {
      // Claim
      const utr = Math.floor(100000000000 + Math.random() * 900000000000).toString();
      await convex.mutation(api.payments.claimPayment, {
        requestId: req.id,
        utr,
        claimedAmountMinor: req.amountMinor,
      });

      // Verify
      await convex.mutation(api.payments.verifyPayment, {
        paymentRequestId: req.id as Id<"paymentRequests">,
        approved: true,
      });
    }
  } catch (err) {
    console.warn("Simulate payment via Convex:", err);
  }
  return getSettlement(billId);
}

/* ---------- Public payment request (for /r/:id) ---------- */

export async function getPaymentRequest(requestId: string): Promise<PaymentRequest | null> {
  try {
    const r = await convex.query(api.payments.getPaymentRequest, {
      requestId,
    });
    if (r) return r as unknown as PaymentRequest;
  } catch (err) {
    console.warn("Error fetching public payment request from Convex:", err);
  }
  return null;
}

/** Submit real claim or simulate pay */
export async function simulatePayRequest(requestId: string): Promise<PaymentRequest | null> {
  try {
    const r = await getPaymentRequest(requestId);
    if (!r) return null;

    const utr = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    await convex.mutation(api.payments.claimPayment, {
      requestId,
      utr,
      claimedAmountMinor: r.amountMinor,
    });

    return await getPaymentRequest(requestId);
  } catch (err) {
    console.error("Error submitting claim for payment request:", err);
    return null;
  }
}

/* ---------- Seed initial data for new users ---------- */

export async function seedDemoDataIfNeeded(): Promise<boolean> {
  try {
    const result = await convex.mutation(api.seed.seedInitialData, {});
    return result.seeded;
  } catch (err) {
    console.warn("Seed demo data error:", err);
    return false;
  }
}

/* ---------- Helpers used by screens ---------- */

export function tableGroupContactIds(): string[] {
  return [...TABLE_GROUP_IDS];
}

export function defaultUserSnapshot(): User {
  return { ...DEFAULT_USER };
}
