import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { useApp, currentUserId } from "@/app/store/AppContext";
import { buildSplitFromDraft } from "@/app/lib/flow";
import * as svc from "@/app/lib/mockService";
import { formatINR, formatReceiptAmount } from "@/app/lib/money";
import { ScreenShell } from "@/app/components/Shell";
import {
  EmptyState,
  StatusBadge,
  TactileButton,
  useBarcodeGradient,
} from "@/app/components/paper";
import { cn } from "@/lib/utils";

export default function Sent() {
  const navigate = useNavigate();
  const { draft, activeBill, setActiveBill, clearDraft, contacts } = useApp();

  const bill = activeBill;
  const split = useMemo(() => {
    if (bill?.split) return bill.split;
    return draft ? buildSplitFromDraft(draft) : null;
  }, [bill, draft]);
  const barcode = useBarcodeGradient();

  // Clear the finished draft on unmount — the flow is done.
  useEffect(() => {
    return () => clearDraft();
  }, [clearDraft]);



  if (!split) {
    return (
      <ScreenShell title="Requests sent" onBack={() => navigate("/home")}>
        <EmptyState
          message="No requests in flight."
          hint="Scan a bill and send your first slips."
          action={<TactileButton onClick={() => navigate("/scan")}>Scan a bill</TactileButton>}
        />
      </ScreenShell>
    );
  }

  const others = split.participants.filter((p) => p.contactId !== currentUserId());
  const toCollect = others.reduce((a, b) => a + (b.status === "paid" ? 0 : b.amountMinor), 0);
  const paidSoFar = others
    .filter((p) => p.status === "paid")
    .reduce((a, b) => a + b.amountMinor, 0);
  const requested = toCollect + paidSoFar;
  const restaurant = bill?.restaurant ?? draft?.restaurant ?? "The bill";
  const allSettled = toCollect === 0;

  return (
    <ScreenShell
      title="Requests sent."
      overline={restaurant.toUpperCase()}
      onBack={() => navigate("/home")}
      footer={
        <div className="space-y-2">
          <TactileButton
            variant="stamp"
            size="lg"
            full
            onClick={() => (bill ? navigate(`/bills/${bill.id}`) : navigate("/home"))}
          >
            Track who pays
          </TactileButton>
          <div className="grid grid-cols-2 gap-2">
            <TactileButton variant="outline" size="sm" full onClick={() => navigate("/home", { replace: true })}>
              Back to home
            </TactileButton>
            <TactileButton variant="ghost" size="sm" full onClick={() => navigate("/history")}>
              View history
            </TactileButton>
          </div>
        </div>
      }
    >
      {/* Stamp-like confirmation — dead straight */}
      <motion.div
        initial={{ scale: 1.08, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-[16rem] border-2 border-stamp bg-card px-4 py-4 text-center font-receipt shadow-paper"
      >
        <p className="text-[9px] uppercase tracking-[0.3em] text-ink-faint">
          {allSettled ? "All settled" : "Requests sent"}
        </p>
        <p className="mt-1.5 text-3xl font-bold tabular-nums text-stamp">
          {formatINR(requested)}
        </p>
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-ink-soft">
          {allSettled
            ? "nothing left on the table"
            : paidSoFar > 0
              ? `${formatReceiptAmount(toCollect)} still to come back`
              : "waiting to come back"}
        </p>
        <div aria-hidden="true" className="mt-3 h-6 w-full opacity-70" style={{ backgroundImage: barcode, backgroundSize: "100% 100%" }} />
      </motion.div>

      {/* Summary tiles */}
      <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden border border-ink bg-ink-line text-center">
        {[
          { label: "Requested", value: formatReceiptAmount(requested) },
          { label: "Paid", value: formatReceiptAmount(paidSoFar) },
          { label: "Waiting", value: formatReceiptAmount(toCollect) },
        ].map((t) => (
          <div key={t.label} className="bg-card px-2 py-3">
            <p className="font-receipt text-sm font-semibold tabular-nums">₹{t.value}</p>
            <p className="mt-0.5 text-[9px] uppercase tracking-[0.2em] text-ink-faint">
              {t.label}
            </p>
          </div>
        ))}
      </div>

      {/* Per-person status slips */}
      <p className="mt-6 font-receipt text-[10px] uppercase tracking-[0.3em] text-ink-faint">
        Each slip
      </p>
      <ul className="mt-2 space-y-2">
        {others.map((p, i) => {
          const contact = contacts.find((c) => c.id === p.contactId);
          const viaSms = contact ? !contact.isRegistered : p.channel === "sms";
          return (
            <motion.li
              key={p.contactId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.28 }}
              className="flex items-center justify-between border border-ink-line bg-card px-3 py-2.5"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{p.displayName}</span>
                <span className="block text-[10px] uppercase tracking-[0.15em] text-ink-faint">
                  {viaSms ? "Payment link (SMS soon)" : "In-app request"}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="font-receipt text-sm tabular-nums">
                  ₹{formatReceiptAmount(p.amountMinor)}
                </span>
                <StatusBadge status={p.status === "paid" ? "paid" : "sent"} />
              </span>
            </motion.li>
          );
        })}
      </ul>

      <p
        className={cn(
          "mt-5 text-center text-[11px] leading-relaxed text-ink-faint",
        )}
      >
        {others.some((p) => p.status !== "paid")
          ? "You'll see statuses update here in real time the moment a payment request is claimed and verified."
          : "Everyone paid — that was quick."}
      </p>
    </ScreenShell>
  );
}
