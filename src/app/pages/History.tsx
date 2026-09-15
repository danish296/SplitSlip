import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useApp, currentUserId } from "@/app/store/AppContext";
import { formatINR, relativeDate } from "@/app/lib/money";
import { ScreenShell } from "@/app/components/Shell";
import { EmptyState, TactileButton } from "@/app/components/paper";
import { cn } from "@/lib/utils";
import type { Bill } from "@/app/lib/types";

type Filter = "all" | "paid" | "collected" | "pending";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "paid", label: "You paid" },
  { id: "collected", label: "You collected" },
  { id: "pending", label: "Pending" },
];

export default function History() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { bills, refreshBills } = useApp();
  const filter = (params.get("filter") as Filter) || "all";

  const list = useMemo(() => {
    switch (filter) {
      case "paid":
        // Bills where you put money down: you paid the restaurant, or you settled a share of a friend's bill.
        return bills.filter(
          (b) =>
            b.paidByUserId === currentUserId() ||
            b.events.some((e) => e.type === "paid" && e.contactId === currentUserId()),
        );
      case "collected":
        // Bills where friends paid their shares back to you.
        return bills.filter(
          (b) =>
            b.paidByUserId === currentUserId() &&
            (b.split?.participants ?? []).some(
              (p) => p.contactId !== currentUserId() && p.status === "paid",
            ),
        );
      case "pending":
        return bills.filter((b) =>
          (b.split?.participants ?? []).some(
            (p) => p.status !== "paid" && p.contactId !== b.paidByUserId,
          ),
        );
      default:
        return bills;
    }
  }, [bills, filter]);

  return (
    <ScreenShell
      title="Receipt archive"
      overline={`${bills.length} bills`}
      onBack={() => navigate("/home")}
      onRefresh={refreshBills}
      navActive="/history"
    >
      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Filter bills">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setParams(f.id === "all" ? {} : { filter: f.id })}
            className={cn(
              "tactile h-9 shrink-0 rounded-[4px] border px-3 font-receipt text-[11px] uppercase tracking-[0.12em]",
              filter === f.id
                ? "border-ink bg-ink text-card"
                : "border-ink-line bg-card text-ink-soft",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        filter === "pending" ? (
          <EmptyState
            className="mt-8"
            message="Nothing waiting on the table."
            hint="When friends owe you from a bill, it shows up here."
          />
        ) : (
          <EmptyState
            className="mt-8"
            message="Your receipt drawer is empty."
            hint="Scan your first bill to start the archive."
            action={<TactileButton variant="stamp" onClick={() => navigate("/scan")}>Scan your first bill</TactileButton>}
          />
        )
      ) : (
        <ul className="mt-4 space-y-2.5">
          {list.map((bill, i) => (
            <li key={bill.id}>
              <HistoryRow bill={bill} tilt={(i % 3 - 1) * 0.5} />
            </li>
          ))}
        </ul>
      )}
    </ScreenShell>
  );
}

function HistoryRow({ bill, tilt }: { bill: Bill; tilt?: number }) {
  const navigate = useNavigate();
  const people = bill.split?.participants.length ?? 0;
  const pending = (bill.split?.participants ?? []).filter(
    (p) => p.status !== "paid" && p.contactId !== currentUserId(),
  ).length;
  return (
    <button
      type="button"
      onClick={() => navigate(`/bills/${bill.id}`)}
      style={{ rotate: `${tilt}deg` }}
      className="tactile flex w-full items-stretch border border-ink bg-card text-left shadow-paper"
    >
      <div className="flex w-10 shrink-0 flex-col items-center justify-center border-r border-dashed border-ink-line bg-paper-2 py-3 font-receipt text-[8px] uppercase tracking-[0.2em] text-ink-faint">
        <span>{new Date(bill.createdAt).getDate()}</span>
        <span>{new Date(bill.createdAt).toLocaleDateString("en-IN", { month: "short" })}</span>
      </div>
      <div className="min-w-0 flex-1 px-3 py-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-receipt text-[13px] font-semibold uppercase tracking-[0.12em]">
            {bill.restaurant}
          </p>
          <p className="shrink-0 font-receipt text-[14px] font-semibold tabular-nums">
            {formatINR(bill.totalMinor)}
          </p>
        </div>
        <p className="mt-0.5 text-[11px] text-ink-soft">
          {people} {people === 1 ? "person" : "people"} · {bill.paidByUserId === currentUserId() ? "you paid" : "friend paid"} ·{" "}
          {relativeDate(bill.createdAt)}
        </p>
      </div>
      <div className="flex w-14 shrink-0 items-center justify-center border-l border-dashed border-ink-line">
        <span
          className={cn(
            "font-receipt text-[8px] uppercase tracking-[0.15em]",
            pending > 0 ? "text-destructive" : "text-stamp",
          )}
        >
          {pending > 0 ? `${pending} due` : "done"}
        </span>
      </div>
    </button>
  );
}
