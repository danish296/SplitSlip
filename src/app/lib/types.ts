/* ============================================================
   SplitSlip — shared types
   All monetary amounts are integer minor units (paise).
   ============================================================ */

export type SplitMethodType = "equal" | "items" | "custom";

export type ParticipantStatus = "pending" | "paid" | "invited_sms";

export type DeliveryChannel = "app" | "sms";

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  username?: string;
  upiId?: string;
  avatarColor?: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  username?: string;
  isRegistered: boolean;
  upiId?: string;
}

export interface BillItem {
  id: string;
  name: string;
  quantity: number;
  amountMinor: number;
}

export interface SplitParticipant {
  contactId: string;
  displayName: string;
  amountMinor: number;
  status: ParticipantStatus;
  rawStatus?: string;
  channel?: DeliveryChannel;
}

export interface Split {
  method: SplitMethodType;
  participants: SplitParticipant[];
}

export interface PaymentEvent {
  id: string;
  billId: string;
  contactId: string;
  contactName: string;
  type:
    | "request_sent"
    | "paid"
    | "reminder"
    | "claim_submitted"
    | "verified"
    | "rejected"
    | "expired"
    | "cancelled";
  amountMinor: number;
  at: string; // ISO
  channel?: DeliveryChannel;
}

export interface PaymentRequest {
  id: string;
  billId: string;
  payer: { name: string; upiId?: string };
  contact: {
    id: string;
    name: string;
    isRegistered: boolean;
    channel: DeliveryChannel;
  };
  amountMinor: number;
  billContext: {
    restaurant: string;
    totalMinor: number;
    date: string;
    itemCount: number;
  };
  createdAt: string;
  expiresAt: string;
  status: "sent" | "paid" | "expired" | "failed";
  rawStatus?: string;
  paymentReference?: string;
  upiLink?: string;
  claim?: {
    id: string;
    utr: string;
    claimedAmountMinor: number;
    status: string;
    createdAt: string;
  } | null;
}

export interface Bill {
  id: string;
  restaurant: string;
  city?: string;
  createdAt: string;
  items: BillItem[];
  subtotalMinor: number;
  taxMinor: number;
  serviceMinor?: number;
  discountMinor?: number;
  totalMinor: number;
  paidByUserId: string;
  split?: Split;
  events: PaymentEvent[];
  requests: PaymentRequest[];
}

export type DraftStage =
  | "scanning"
  | "review"
  | "method"
  | "splitting"
  | "contacts"
  | "review-request";

export interface DraftBill {
  restaurant: string;
  city?: string;
  items: BillItem[];
  taxMinor: number;
  serviceMinor: number;
  discountMinor: number;
  splitMethod: SplitMethodType | null;
  assignments: Record<string, string[]>;
  customAmounts: Record<string, number>;
  customAmountsRaw?: Record<string, string>;
  participants: Contact[];
}

export interface Settlement {
  billId: string;
  restaurant: string;
  totalMinor: number;
  youPaidMinor: number;
  participants: SplitParticipant[];
  events: PaymentEvent[];
}
