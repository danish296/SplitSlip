/* Split math — pure integer minor-unit calculations. */

import { distributeByWeights, splitEvenly, sumMinor } from "./money";
import type { BillItem, SplitMethodType, SplitParticipant } from "./types";

export interface SplitPreview {
  method: SplitMethodType;
  participants: SplitParticipant[];
  assignedMinor: number;
  remainingMinor: number;
  isReconciled: boolean;
}

export interface ParticipantRef {
  contactId: string;
  displayName: string;
}

/** Equal split: divides totalMinor exactly among contact ids (incl. payer). */
export function calculateEqualSplit(
  totalMinor: number,
  participants: ParticipantRef[],
  payerId: string,
  payerName: string,
): SplitPreview {
  const parts = splitEvenly(totalMinor, participants.length);
  const rows: SplitParticipant[] = participants.map((p, i) => ({
    contactId: p.contactId,
    displayName: p.contactId === payerId ? "You" : p.displayName,
    amountMinor: parts[i] ?? 0,
    status: "pending" as const,
    channel: "app" as const,
  }));
  return {
    method: "equal",
    participants: rows,
    assignedMinor: sumMinor(parts),
    remainingMinor: 0,
    isReconciled: participants.length > 0,
  };
}

/** Item split: each item's amount is divided among its assignees. */
export function calculateItemSplit(
  items: BillItem[],
  assignments: Record<string, string[]>,
  participants: ParticipantRef[],
  payerId: string,
  payerName: string,
): SplitPreview {
  const totals = new Map<string, number>();
  const details = new Map<string, Map<string, number>>();

  for (const item of items) {
    const assignees = assignments[item.id] ?? [];
    if (assignees.length === 0) continue;
    const parts = splitEvenly(item.amountMinor, assignees.length);
    assignees.forEach((cid, i) => {
      totals.set(cid, (totals.get(cid) ?? 0) + (parts[i] ?? 0));
      if (!details.has(cid)) details.set(cid, new Map());
      const itemMap = details.get(cid)!;
      itemMap.set(item.id, (itemMap.get(item.id) ?? 0) + (parts[i] ?? 0));
    });
  }

  const rows: SplitParticipant[] = participants.map((p) => ({
    contactId: p.contactId,
    displayName: p.contactId === payerId ? "You" : p.displayName,
    amountMinor: totals.get(p.contactId) ?? 0,
    status: "pending" as const,
    channel: "app" as const,
  }));

  const assigned = sumMinor(rows.map((r) => r.amountMinor));
  const itemsTotal = items.reduce((a, b) => a + b.amountMinor, 0);

  return {
    method: "items",
    participants: rows,
    assignedMinor: assigned,
    remainingMinor: itemsTotal - assigned,
    isReconciled: itemsTotal > 0 && assigned === itemsTotal,
  };
}

/** Custom split: direct amounts, must equal the total exactly. */
export function calculateCustomSplit(
  totalMinor: number,
  amounts: Record<string, number>,
  participants: ParticipantRef[],
  payerId: string,
  payerName: string,
): SplitPreview {
  const rows: SplitParticipant[] = participants.map((p) => ({
    contactId: p.contactId,
    displayName: p.contactId === payerId ? "You" : p.displayName,
    amountMinor: amounts[p.contactId] ?? 0,
    status: "pending" as const,
    channel: "app" as const,
  }));
  const assigned = sumMinor(rows.map((r) => r.amountMinor));
  return {
    method: "custom",
    participants: rows,
    assignedMinor: assigned,
    remainingMinor: totalMinor - assigned,
    isReconciled: assigned === totalMinor,
  };
}

/** Distribute a number of paise across participants for "auto-assign remainder". */
export function distributeRemainder(
  remainingMinor: number,
  participants: ParticipantRef[],
): Record<string, number> {
  const weights = participants.map(() => 1);
  const parts = distributeByWeights(remainingMinor, weights);
  const out: Record<string, number> = {};
  participants.forEach((p, i) => {
    out[p.contactId] = parts[i] ?? 0;
  });
  return out;
}

/** Which items are not fully assigned. */
export function unassignedItemIds(
  items: BillItem[],
  assignments: Record<string, string[]>,
): string[] {
  return items.filter((i) => (assignments[i.id] ?? []).length === 0).map((i) => i.id);
}
