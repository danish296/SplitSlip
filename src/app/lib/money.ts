/* Money helpers — everything is integer minor units (paise).
   Never do floating-point math on money. */

export function toMinor(rupees: number): number {
  return Math.round(rupees * 100);
}

export function toMajor(minor: number): number {
  return minor / 100;
}

/** ₹1,240 or ₹1,240.50 when there are paise. */
export function formatINR(minor: number, opts?: { decimals?: boolean }): string {
  const major = minor / 100;
  const hasPaise = minor % 100 !== 0;
  const decimals = opts?.decimals ?? hasPaise;
  return `₹${major.toLocaleString("en-IN", {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/** "501.50" without the ₹ sign, always 2 decimals — for receipt lines. */
export function formatReceiptAmount(minor: number): string {
  return (minor / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Split `total` into `n` integer parts; the remainder is spread 1 paise at a time. */
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

/** Sum an array of minor-unit amounts. */
export function sumMinor(parts: number[]): number {
  return parts.reduce((a, b) => a + b, 0);
}

/** Distribute a total across weights proportionally in integers, preserving the total. */
export function distributeByWeights(
  total: number,
  weights: number[],
): number[] {
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / weightSum);
  const floors = raw.map(Math.floor);
  let leftover = total - floors.reduce((a, b) => a + b, 0);
  // Order by largest fractional remainder first.
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

/** Parse a user-typed amount string ("501.50", "501", "501,5") to minor units. */
export function parseAmountToMinor(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  if (cleaned === "" || cleaned === ".") return null;
  const [rupees, paise] = cleaned.split(".");
  const paisePart = ((paise ?? "") + "00").slice(0, 2);
  return parseInt(rupees, 10) * 100 + parseInt(paisePart || "0", 10);
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function relativeDate(iso: string | number | Date): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfThat.getTime()) / 86400000,
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}
