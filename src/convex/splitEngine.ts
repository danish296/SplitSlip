/**
 * Split Engine — trusted server-side integer-paise split calculation.
 * Never trust client calculations. All arithmetic is in integer minor units (paise).
 * Guarantees: sum(participant amounts) === bill total.
 */

export interface ParticipantInput {
  id: string; // contactId or userId
  name: string;
}

export interface ComputedShare {
  id: string;
  name: string;
  amountMinor: number;
}

/**
 * Split `total` into `n` integer parts; the remainder is spread 1 paisa at a time.
 */
export function splitEvenly(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  const parts: number[] = [];
  for (let i = 0; i < n; i++) {
    parts.push(base + (i < remainder ? 1 : 0));
  }
  return parts;
}

/**
 * Distribute a total across weights proportionally in integers using the largest-remainder method (Hamilton-Hare),
 * strictly preserving the total.
 */
export function distributeByWeights(total: number, weights: number[]): number[] {
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum <= 0) {
    // If no weights, split evenly
    return splitEvenly(total, weights.length);
  }
  const raw = weights.map((w) => (total * w) / weightSum);
  const floors = raw.map(Math.floor);
  let leftover = total - floors.reduce((a, b) => a + b, 0);
  
  // Order by largest fractional remainder first
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  const result = [...floors];
  let idx = 0;
  while (leftover > 0 && order.length > 0) {
    result[order[idx % order.length].i] += 1;
    leftover -= 1;
    idx += 1;
  }
  return result;
}

/**
 * Equal Split: divides totalMinor exactly among participants.
 */
export function computeEqualSplit(
  totalMinor: number,
  participants: ParticipantInput[],
): ComputedShare[] {
  if (participants.length === 0) {
    throw new Error("Cannot split among zero participants.");
  }
  const parts = splitEvenly(totalMinor, participants.length);
  const result = participants.map((p, i) => ({
    id: p.id,
    name: p.name,
    amountMinor: parts[i] ?? 0,
  }));

  const sum = result.reduce((a, b) => a + b.amountMinor, 0);
  if (sum !== totalMinor) {
    throw new Error(`Equal split reconciliation failed: ${sum} != ${totalMinor}`);
  }

  return result;
}

/**
 * Item Split:
 * Each item's amount is divided evenly among its assignees.
 * Taxes and service charges are scaled proportionally using the largest remainder method.
 */
export function computeItemSplit(
  totalMinor: number,
  items: Array<{ id: string; amountMinor: number }>,
  assignments: Record<string, string[]>,
  participants: ParticipantInput[],
): ComputedShare[] {
  if (participants.length === 0) {
    throw new Error("Cannot split among zero participants.");
  }

  const itemsTotal = items.reduce((a, b) => a + b.amountMinor, 0);
  if (itemsTotal <= 0 && totalMinor <= 0) {
    return participants.map((p) => ({ id: p.id, name: p.name, amountMinor: 0 }));
  }

  // Calculate base share per participant from item assignments
  const totals = new Map<string, number>();
  participants.forEach((p) => totals.set(p.id, 0));

  for (const item of items) {
    const assignees = assignments[item.id] ?? [];
    if (assignees.length === 0) {
      throw new Error(`Item ${item.id} is unassigned. All items must be assigned.`);
    }
    const parts = splitEvenly(item.amountMinor, assignees.length);
    assignees.forEach((cid, idx) => {
      totals.set(cid, (totals.get(cid) ?? 0) + (parts[idx] ?? 0));
    });
  }

  const baseShares = participants.map((p) => totals.get(p.id) ?? 0);
  const baseSum = baseShares.reduce((a, b) => a + b, 0);

  let finalShares: number[];
  if (baseSum === totalMinor || baseSum === 0) {
    finalShares = baseShares;
  } else {
    // Proportional scaling of entire bill (items + tax + service - discount)
    finalShares = distributeByWeights(totalMinor, baseShares);
  }

  const result = participants.map((p, i) => ({
    id: p.id,
    name: p.name,
    amountMinor: finalShares[i] ?? 0,
  }));

  const sum = result.reduce((a, b) => a + b.amountMinor, 0);
  if (sum !== totalMinor) {
    throw new Error(`Item split reconciliation failed: ${sum} != ${totalMinor}`);
  }

  return result;
}

/**
 * Custom Split: validates client-provided amounts and guarantees sum matches total.
 */
export function validateCustomSplit(
  totalMinor: number,
  customAmounts: Record<string, number>,
  participants: ParticipantInput[],
): ComputedShare[] {
  if (participants.length === 0) {
    throw new Error("Cannot split among zero participants.");
  }

  const result = participants.map((p) => {
    const amt = customAmounts[p.id];
    if (amt === undefined || amt < 0 || !Number.isInteger(amt)) {
      throw new Error(`Invalid custom amount for participant ${p.name}`);
    }
    return {
      id: p.id,
      name: p.name,
      amountMinor: amt,
    };
  });

  const sum = result.reduce((a, b) => a + b.amountMinor, 0);
  if (sum !== totalMinor) {
    throw new Error(
      `Custom split sum (${sum} paise) does not equal bill total (${totalMinor} paise). Difference: ${totalMinor - sum} paise`,
    );
  }

  return result;
}
