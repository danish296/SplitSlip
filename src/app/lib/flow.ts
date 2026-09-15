/* Flow helpers — turn a DraftBill into a final, reconciled Split. */

import { currentUserId } from "@/app/store/AppContext";
import { calculateEqualSplit, calculateCustomSplit, calculateItemSplit } from "./splits";
import type { DraftBill, Split } from "./types";

export function buildSplitFromDraft(draft: DraftBill): Split {
  const itemsTotal = draft.items.reduce((a, b) => a + b.amountMinor, 0);
  const total = itemsTotal + draft.taxMinor + draft.serviceMinor - (draft.discountMinor ?? 0);

  const people = draft.participants.map((p) => ({
    contactId: p.id,
    displayName: p.id === currentUserId() ? "You" : p.name,
  }));

  if (draft.splitMethod === "equal") {
    return calculateEqualSplit(total, people, currentUserId(), "You");
  }
  if (draft.splitMethod === "custom") {
    return calculateCustomSplit(total, draft.customAmounts, people, currentUserId(), "You");
  }

  // items — recompute from assignments, then distribute taxes proportionally.
  const base = calculateItemSplit(draft.items, draft.assignments, people, currentUserId(), "You");
  const extras = total - itemsTotal;
  if (itemsTotal > 0 && extras !== 0) {
    // Scale each participant's share by itemsTotal -> total using largest-remainder.
    const scaled = scaleShares(base.participants.map((p) => p.amountMinor), total, itemsTotal);
    return {
      method: "items",
      participants: base.participants.map((p, i) => ({
        ...p,
        amountMinor: scaled[i] ?? 0,
      })),
    };
  }
  return base;
}


/** Integer scaling of shares so sum(shares) becomes targetTotal. */
function scaleShares(shares: number[], targetTotal: number, currentTotal: number): number[] {
  if (currentTotal <= 0) return shares.map(() => 0);
  const raw = shares.map((s) => (s / currentTotal) * targetTotal);
  const floors = raw.map(Math.floor);
  let leftover = targetTotal - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...floors];
  let idx = 0;
  while (leftover > 0) {
    out[order[idx % order.length].i] += 1;
    leftover -= 1;
    idx += 1;
  }
  return out;
}
