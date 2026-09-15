import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useApp, currentUserId } from "@/app/store/AppContext";
import * as svc from "@/app/lib/mockService";
import { formatDateLong, formatINR, formatReceiptAmount, formatTime } from "@/app/lib/money";
import { ScreenShell } from "@/app/components/Shell";
import { ReceiptDashes, StatusBadge, TactileButton } from "@/app/components/paper";
import { Check, X, ShieldCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Bill } from "@/app/lib/types";

export default function BillDetails() {
  const { billId } = useParams<{ billId: string }>();
  const navigate = useNavigate();
  const { bills, refreshBills } = useApp();
  const [busy, setBusy] = useState(false);

  const liveSettlement = useQuery(
    api.payments.getSettlement,
    billId ? { billId: billId as Id<"bills"> } : "skip",
  );
  const liveBill = useQuery(
    api.bills.getBill,
    billId ? { billId: billId as Id<"bills"> } : "skip",
  );
  const verifyMutation = useMutation(api.payments.verifyPayment);

  const bill: Bill | undefined = useMemo(() => {
    if (liveBill) return liveBill as unknown as Bill;
    return bills.find((b) => b.id === billId);
  }, [liveBill, bills, billId]);

  const settlement = liveSettlement;

  if (!bill) {
    return (
      <ScreenShell title="Bill not found" onBack={() => navigate("/history")}>
        <p className="text-sm text-ink-soft">
          This receipt isn't in the drawer. It may have been cleared or you don't have access.
        </p>
      </ScreenShell>
    );
  }

  const isOwner = bill.paidByUserId === currentUserId() || settlement?.isOwner;
  const metrics = settlement?.settlementMetrics ?? {
    totalBillMinor: bill.totalMinor,
    totalVerifiedMinor: 0,
    totalClaimedMinor: 0,
    totalPendingMinor: bill.totalMinor,
  };

  const pending = metrics.totalPendingMinor;
  const blocks = settlement?.participants?.length ?? 0;
  const filled = settlement
    ? settlement.participants.filter((p: any) => p.status === "paid" || p.rawStatus === "VERIFIED").length
    : 0;

  async function handleVerify(paymentRequestId: string, approved: boolean) {
    if (!paymentRequestId) return;
    setBusy(true);
    try {
      await verifyMutation({
        paymentRequestId: paymentRequestId as Id<"paymentRequests">,
        approved,
      });
      await refreshBills();
    } catch (err) {
      console.error("Verification error:", err);
    } finally {
      setBusy(false);
    }
  }

  async function markPaid(paymentRequestId?: string) {
    if (!paymentRequestId) return;
    await handleVerify(paymentRequestId, true);
  }

  return (
    <ScreenShell
      title={bill.restaurant}
      overline={bill.city ?? "Settlement"}
      onBack={() => navigate(-1)}
      onRefresh={refreshBills}
      footer={
        pending > 0 ? (
          <p className="text-center font-receipt text-[11px] uppercase tracking-[0.2em] text-ink-soft">
            ₹{formatReceiptAmount(pending)} still on the table
          </p>
        ) : (
          <p className="text-center font-receipt text-[11px] uppercase tracking-[0.2em] text-stamp">
            ✓ Fully settled — nice.
          </p>
        )
      }
    >
      {/* Full receipt */}
      <div className="border border-ink bg-card px-5 py-5 font-receipt text-[12.5px] text-ink shadow-paper">
        <p className="text-center text-[14px] font-semibold tracking-[0.22em]">
          {bill.restaurant.toUpperCase()}
        </p>
        <p className="mt-0.5 text-center text-[10px] tracking-[0.25em] text-ink-faint">
          {(bill.city ?? "").toUpperCase()}
        </p>
        <p className="mt-0.5 text-center text-[10px] tracking-[0.15em] text-ink-faint">
          {formatDateLong(bill.createdAt)}
        </p>
        <ReceiptDashes />
        {bill.items.map((i) => (
          <div key={i.id} className="flex justify-between py-0.5">
            <span className="truncate">
              {i.quantity} × {i.name}
            </span>
            <span className="tabular-nums">{formatReceiptAmount(i.amountMinor)}</span>
          </div>
        ))}
        <ReceiptDashes />
        <div className="flex justify-between text-ink-soft">
          <span>SUBTOTAL</span>
          <span className="tabular-nums">{formatReceiptAmount(bill.subtotalMinor)}</span>
        </div>
        {bill.taxMinor > 0 && (
          <div className="flex justify-between text-ink-soft">
            <span>GST</span>
            <span className="tabular-nums">{formatReceiptAmount(bill.taxMinor)}</span>
          </div>
        )}
        {!!bill.serviceMinor && bill.serviceMinor > 0 && (
          <div className="flex justify-between text-ink-soft">
            <span>SERVICE</span>
            <span className="tabular-nums">{formatReceiptAmount(bill.serviceMinor)}</span>
          </div>
        )}
        <ReceiptDashes />
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold tracking-[0.18em]">TOTAL</span>
          <span className="text-lg font-semibold tabular-nums">
            ₹{formatReceiptAmount(bill.totalMinor)}
          </span>
        </div>
        <ReceiptDashes />
        <p className="text-[10px] uppercase tracking-[0.2em] text-ink-faint">
          Split by {bill.split?.method ?? "—"} · paid by{" "}
          {isOwner ? "you" : "friend"}
        </p>
      </div>

      {/* Settlement tracking tiles */}
      <section aria-label="Settlement tracking" className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold uppercase tracking-[0.12em]">Settlement Tracking</h2>
          <span className="font-receipt text-[11px] tabular-nums text-ink-soft">
            {formatINR(metrics.totalVerifiedMinor)} of {formatINR(bill.totalMinor)}
          </span>
        </div>

        {/* Breakdown bar */}
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {Array.from({ length: Math.max(blocks, 1) }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-3 flex-1 border transition-colors",
                i < filled ? "border-stamp bg-stamp" : "border-ink-line bg-transparent",
              )}
            />
          ))}
        </div>

        {/* Participants status list */}
        <ul className="mt-3 space-y-2">
          {(settlement?.participants ?? []).map((p: any) => {
            const isPayerSelf = p.contactId === currentUserId() || p.displayName.toLowerCase() === "you";
            const isClaimed = p.rawStatus === "PAYMENT_CLAIMED";
            const isVerified = p.rawStatus === "VERIFIED" || p.status === "paid";

            return (
              <motion.li
                key={p.contactId}
                layout
                className={cn(
                  "border p-3 transition-colors",
                  isVerified
                    ? "border-stamp bg-mint/50"
                    : isClaimed
                      ? "border-amber-600 bg-amber-50/40"
                      : "border-ink-line bg-card",
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-sm font-semibold text-ink">{p.displayName}</span>
                    <span className="font-receipt text-[11px] tabular-nums text-ink-soft">
                      ₹{formatReceiptAmount(p.amountMinor)} · {p.channel === "sms" ? "via SMS link" : "in-app"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isVerified ? (
                      <span className="inline-flex items-center gap-1 font-receipt text-[10px] uppercase tracking-[0.15em] text-stamp">
                        <ShieldCheck className="size-3.5" /> VERIFIED
                      </span>
                    ) : isClaimed ? (
                      <span className="inline-flex items-center gap-1 font-receipt text-[10px] uppercase tracking-[0.15em] text-amber-700">
                        <Clock className="size-3.5 animate-pulse" /> CLAIMED
                      </span>
                    ) : (
                      <StatusBadge status="sent" />
                    )}

                    {!isPayerSelf && !isVerified && !isClaimed && (
                      <TactileButton
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => void markPaid(p.paymentRequestId)}
                      >
                        Mark paid
                      </TactileButton>
                    )}
                  </div>
                </div>

                {/* Payer Verification Card when UTR is claimed */}
                {isClaimed && p.claim && (
                  <div className="mt-2.5 rounded border border-ink-line bg-card p-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-receipt text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                        Claimed UTR
                      </span>
                      <span className="font-receipt font-semibold tracking-wider text-ink">
                        {p.claim.utr}
                      </span>
                    </div>

                    {isOwner && p.paymentRequestId && (
                      <div className="mt-2 flex items-center gap-2">
                        <TactileButton
                          variant="stamp"
                          size="sm"
                          full
                          disabled={busy}
                          onClick={() => void handleVerify(p.paymentRequestId, true)}
                        >
                          <Check className="mr-1 size-3.5" /> Confirm Payment
                        </TactileButton>
                        <TactileButton
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void handleVerify(p.paymentRequestId, false)}
                        >
                          <X className="mr-1 size-3.5" /> Reject
                        </TactileButton>
                      </div>
                    )}
                  </div>
                )}
              </motion.li>
            );
          })}
        </ul>
      </section>

      {/* Activity Events */}
      {bill.events.length > 0 && (
        <section aria-label="Activity" className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.12em]">Activity</h2>
          <ul className="mt-2 border border-ink-line bg-card">
            {[...bill.events].reverse().map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between border-b border-ink-line px-3 py-2 last:border-b-0"
              >
                <span className="text-[13px]">
                  <span className="font-semibold">{e.contactName}</span>{" "}
                  {e.type === "paid" || e.type === "verified"
                    ? "paid & verified"
                    : e.type === "claim_submitted"
                      ? "submitted payment claim"
                      : e.type === "reminder"
                        ? "was reminded"
                        : "was sent a request"}
                </span>
                <span className="font-receipt text-[10px] tabular-nums text-ink-faint">
                  {formatTime(e.at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </ScreenShell>
  );
}
