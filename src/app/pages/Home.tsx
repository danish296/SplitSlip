import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { ScanLine, Settings, ChevronRight, Bell, Users, ExternalLink, Clock, ShieldCheck } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useApp, currentUserId } from "@/app/store/AppContext";
import { formatINR, relativeDate, initialsOf } from "@/app/lib/money";
import { BottomNav } from "@/app/components/Shell";
import {
  EmptyState,
  TactileButton,
} from "@/app/components/paper";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Bill } from "@/app/lib/types";

export default function Home() {
  const navigate = useNavigate();
  const { booted, user, bills, refreshBills } = useApp();

  const unreadCount = useQuery(api.notifications.unreadCount) ?? 0;
  const myRequests = useQuery(api.payments.listMyPaymentRequests) ?? { incoming: [], outgoing: [] };

  useEffect(() => {
    void refreshBills();
  }, [refreshBills]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const { owedToMe, pendingCount, activeBills } = useMemo(() => {
    let owedToMe = 0;
    let pendingCount = 0;
    const activeBills: Bill[] = [];
    for (const bill of bills) {
      const pending = (bill.split?.participants ?? []).filter(
        (p) => p.contactId !== currentUserId() && p.status !== "paid",
      );
      if (pending.length === 0) continue;
      activeBills.push(bill);
      if (bill.paidByUserId === currentUserId()) {
        owedToMe += pending.reduce((a, b) => a + b.amountMinor, 0);
        pendingCount += pending.length;
      }
    }
    return { owedToMe, pendingCount, activeBills };
  }, [bills]);

  const iOwe = useMemo(() => {
    // Sum from real incoming payment requests that are not yet verified
    const pendingIncoming = myRequests.incoming.filter(
      (r) => r.status !== "VERIFIED",
    );
    return pendingIncoming.reduce((sum, r) => sum + r.amountMinor, 0);
  }, [myRequests.incoming]);



  return (
    <div className="paper-grain flex min-h-[100dvh] flex-col bg-background text-ink">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-1 flex-col px-5 pb-24 pt-5 sm:border-x sm:border-ink sm:shadow-paper-lg bg-background">
        {!booted ? (
          <HomeSkeleton />
        ) : (
          <>
            {/* ---- Header: Logo + Greeting + Navigation Actions ---- */}
            <header className="sticky top-0 z-20 -mx-5 -mt-5 mb-3 flex items-center justify-between border-b border-ink bg-background/95 px-5 py-3.5 backdrop-blur-sm shadow-xs">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-10 items-center justify-center border border-ink bg-stamp font-receipt text-sm font-semibold text-stamp-foreground"
                >
                  {initialsOf(user?.name ?? "You")}
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-ink-faint">
                    {greeting},
                  </p>
                  <p className="text-base font-bold leading-tight tracking-tight text-ink">
                    {user?.name?.split(" ")[0] ?? "friend"}
                  </p>
                </div>
              </div>

          <div className="flex items-center gap-2">

            <button
              type="button"
              aria-label="Friends and Connections"
              onClick={() => navigate("/friends")}
              className="tactile flex size-10 items-center justify-center rounded-[4px] border border-ink bg-card"
              title="Friends & Connections"
            >
              <Users className="size-4" />
            </button>

            <button
              type="button"
              aria-label="Notifications"
              onClick={() => navigate("/notifications")}
              className="tactile relative flex size-10 items-center justify-center rounded-[4px] border border-ink bg-card"
              title="Notifications"
            >
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-stamp text-[9px] font-bold text-stamp-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              aria-label="Settings"
              onClick={() => navigate("/settings")}
              className="tactile flex size-10 items-center justify-center rounded-[4px] border border-ink bg-card"
              title="Settings"
            >
              <Settings className="size-4" />
            </button>
          </div>
        </header>

        {/* ---- Scan CTA ---- */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          type="button"
          onClick={() => navigate("/scan")}
          className="tactile-hard mt-6 flex w-full flex-col items-center gap-1 border-2 border-ink bg-ink px-6 py-8 text-card shadow-[0_5px_0_0_var(--ink-rule)] active:translate-y-[4px] active:shadow-none"
          aria-label="Scan a bill"
        >
          <span className="flex items-center gap-2 font-receipt text-[10px] uppercase tracking-[0.35em] text-card/60">
            <ScanLine className="size-3.5" aria-hidden="true" />
            Feed a receipt
          </span>
          <span className="mt-1 text-2xl font-extrabold uppercase tracking-[0.14em]">
            Scan Bill
          </span>
          <span className="mt-1 h-0.5 w-24 bg-card/30" aria-hidden="true" />
          <span className="font-receipt text-[10px] tracking-[0.2em] text-card/60">
            SPLIT BY ITEMS · SEND SLIPS
          </span>
        </motion.button>

        {/* ---- Outstanding cards ---- */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          aria-label="Outstanding balances"
          className="mt-5 grid grid-cols-2 gap-3"
        >
          <button
            type="button"
            onClick={() => navigate("/history?filter=pending")}
            className="tactile border border-ink bg-card p-4 text-left shadow-paper"
          >
            <p className="font-receipt text-[9px] uppercase tracking-[0.25em] text-ink-faint">
              Outstanding
            </p>
            <p className="mt-1 font-receipt text-xl font-semibold tabular-nums text-ink">
              {formatINR(owedToMe)}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-soft">
              {pendingCount > 0
                ? `${pendingCount} ${pendingCount === 1 ? "person owes" : "people owe"} you`
                : "Nothing pending"}
            </p>
          </button>
          <button
            type="button"
            onClick={() => navigate("/history?filter=paid")}
            className="tactile border border-ink-line bg-card p-4 text-left"
          >
            <p className="font-receipt text-[9px] uppercase tracking-[0.25em] text-ink-faint">
              You owe
            </p>
            <p className="mt-1 font-receipt text-xl font-semibold tabular-nums text-ink">
              {formatINR(iOwe)}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-soft">
              {iOwe > 0 ? "On bills friends paid" : "All settled up"}
            </p>
          </button>
        </motion.section>

        {/* ---- Incoming Payment Requests (You Owe) ---- */}
        {myRequests.incoming.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Incoming payment requests"
            className="mt-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-ink">
                Slips To Pay ({myRequests.incoming.length})
              </h2>
            </div>
            <div className="mt-3 space-y-2.5">
              {myRequests.incoming.map((req) => (
                <button
                  key={req._id}
                  type="button"
                  onClick={() => navigate(`/r/${req._id}`)}
                  className="tactile flex w-full items-center justify-between border border-ink bg-card p-3.5 text-left shadow-paper"
                >
                  <div className="min-w-0">
                    <p className="font-receipt text-xs font-bold uppercase tracking-wider text-ink truncate">
                      {req.billContext.restaurant}
                    </p>
                    <p className="font-receipt text-[11px] text-ink-soft">
                      Requested by {req.contactName} · {relativeDate(req.createdAt)}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 font-receipt text-[9px] uppercase tracking-wider">
                      {req.status === "VERIFIED" ? (
                        <span className="text-stamp flex items-center gap-1">
                          <ShieldCheck className="size-3" /> Paid &amp; Verified
                        </span>
                      ) : req.status === "PAYMENT_CLAIMED" ? (
                        <span className="text-amber-700 flex items-center gap-1">
                          <Clock className="size-3" /> Claimed (Waiting Verification)
                        </span>
                      ) : (
                        <span className="text-stamp flex items-center gap-1">
                          ● Pay via UPI
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-receipt text-base font-bold tabular-nums text-ink">
                      {formatINR(req.amountMinor)}
                    </p>
                    <span className="font-receipt text-[10px] uppercase text-stamp">
                      View Slip →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </motion.section>
        )}

        {/* ---- Recently split ---- */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          aria-label="Recently split"
          className="mt-8 flex-1"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-ink">
              Recently split
            </h2>
            <button
              type="button"
              onClick={() => navigate("/history")}
              className="tactile inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-stamp"
            >
              All bills <ChevronRight className="size-3.5" aria-hidden="true" />
            </button>
          </div>

          {bills.length === 0 ? (
            <EmptyState
              className="mt-4"
              message="Your receipt drawer is empty."
              hint="Scan your first bill and SplitSlip will do the math."
              action={
                <TactileButton variant="stamp" onClick={() => navigate("/scan")}>
                  Scan your first bill
                </TactileButton>
              }
            />
          ) : (
            <ul className="mt-3 space-y-2.5">
              {bills.slice(0, 5).map((bill) => (
                <li key={bill.id}>
                  <ReceiptRowCard bill={bill} />
                </li>
              ))}
            </ul>
          )}
        </motion.section>
        </>
        )}
      </div>
      <BottomNav active="/home" />
    </div>
  );
}

function ReceiptRowCard({ bill }: { bill: Bill }) {
  const navigate = useNavigate();
  const people = bill.split?.participants.length ?? 0;
  const pending = (bill.split?.participants ?? []).filter(
    (p) => p.status !== "paid" && p.contactId !== currentUserId(),
  );
  const youPaid = bill.paidByUserId === currentUserId();
  const payerName =
    bill.split?.participants.find((p) => p.contactId === bill.paidByUserId)?.displayName ??
    "friend";
  return (
    <button
      type="button"
      onClick={() => navigate(`/bills/${bill.id}`)}
      className="tactile block w-full border border-ink bg-card px-4 py-3 text-left shadow-paper"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-receipt text-[13px] font-semibold uppercase tracking-[0.12em] text-ink">
            {bill.restaurant}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-soft">
            {people} {people === 1 ? "person" : "people"}
            {youPaid ? " · you paid" : ` · ${payerName} paid`}
          </p>
        </div>
        <div className="text-right">
          <p className="font-receipt text-[15px] font-semibold tabular-nums text-ink">
            {formatINR(bill.totalMinor)}
          </p>
          <p className="text-[10px] uppercase tracking-[0.15em] text-ink-faint">
            {relativeDate(bill.createdAt)}
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-1" aria-hidden="true">
          {(bill.split?.participants ?? []).map((p) => (
            <span
              key={p.contactId}
              className={cn(
                "h-1.5 w-5",
                p.status === "paid" ? "bg-stamp" : "bg-ink-line",
              )}
            />
          ))}
        </div>
        <span className="font-receipt text-[9px] uppercase tracking-[0.2em] text-ink-faint">
          {pending.length > 0 ? `${pending.length} PENDING` : "SETTLED"}
        </span>
      </div>
    </button>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="-mx-5 -mt-5 mb-3 flex items-center justify-between border-b border-ink-line bg-background/95 px-5 py-3.5 shadow-xs">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-none border border-ink-line" />
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="size-10 rounded-[4px] border border-ink-line" />
          <Skeleton className="size-10 rounded-[4px] border border-ink-line" />
          <Skeleton className="size-10 rounded-[4px] border border-ink-line" />
        </div>
      </div>

      {/* Scan CTA skeleton */}
      <div className="mt-6 flex w-full flex-col items-center gap-2 border-2 border-ink-line bg-card p-8 shadow-xs">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-0.5 w-24" />
        <Skeleton className="h-3 w-40" />
      </div>

      {/* Outstanding cards skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-ink-line bg-card p-4 space-y-2 shadow-xs">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3 w-28" />
        </div>
        <div className="border border-ink-line bg-card p-4 space-y-2 shadow-xs">
          <Skeleton className="h-2.5 w-14" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      {/* Recent bills skeleton */}
      <div className="mt-6 space-y-2.5">
        <Skeleton className="h-4 w-28" />
        {[0, 1].map((i) => (
          <div key={i} className="border border-ink-line bg-card p-3.5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-3 w-48" />
          </div>
        ))}
      </div>
    </div>
  );
}
