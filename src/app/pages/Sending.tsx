import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { useApp, currentUserId } from "@/app/store/AppContext";
import { buildSplitFromDraft } from "@/app/lib/flow";
import * as svc from "@/app/lib/mockService";
import { formatReceiptAmount } from "@/app/lib/money";
import {
  TactileButton,
  ThermalReceiptPrinter,
  type PrinterPhase,
} from "@/app/components/paper";
import { cn } from "@/lib/utils";
import { ChevronLeft, Home } from "lucide-react";
import type { Bill } from "@/app/lib/types";

type SendStage = "printing" | "tearing" | "sending" | "error";

export default function Sending() {
  const navigate = useNavigate();
  const { draft, user, setActiveBill, refreshBills } = useApp();
  const [stage, setStage] = useState<SendStage>("printing");
  const [tornCount, setTornCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const navigated = useRef(false);

  const split = useMemo(() => (draft ? buildSplitFromDraft(draft) : null), [draft]);
  const others = split?.participants.filter((p) => p.contactId !== currentUserId()) ?? [];
  const itemsTotal = draft ? draft.items.reduce((a, b) => a + b.amountMinor, 0) : 0;
  const total = draft
    ? itemsTotal + draft.taxMinor + draft.serviceMinor - (draft.discountMinor ?? 0)
    : 0;
  const mine = split?.participants.find((p) => p.contactId === currentUserId());

  /* ---------- The receipt printed by the machine (from real app state) ---------- */
  const printConfig = useMemo(
    () => ({
      title: draft?.restaurant || "THE BILL",
      subtitle: draft?.city ?? "Bangalore",
      meta: draft
        ? `${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} · ${draft.items.length} ITEMS · SPLIT ${draft.splitMethod ?? ""}`.toUpperCase()
        : undefined,
      lines: [
        ...(draft?.items ?? []).map((it) => ({
          label: `${it.quantity} × ${it.name}`,
          value: formatReceiptAmount(it.amountMinor),
        })),
        ...(draft && draft.taxMinor > 0
          ? [{ label: "GST", value: formatReceiptAmount(draft.taxMinor) }]
          : []),
        ...(draft && draft.serviceMinor > 0
          ? [{ label: "Service", value: formatReceiptAmount(draft.serviceMinor) }]
          : []),
        ...(draft && draft.discountMinor
          ? [{ label: "Discount", value: `-${formatReceiptAmount(draft.discountMinor)}` }]
          : []),
        ...(mine
          ? [{ label: "You paid", value: formatReceiptAmount(mine.amountMinor) }]
          : []),
      ],
      totalLabel: "TOTAL",
      totalValue: `₹${formatReceiptAmount(total)}`,
      lineInterval: 110,
      autoStart: true,
      hideStartButton: true,
    }),
    [draft, mine, total],
  );

  /* ---------- Tear slips one by one after printing completes ---------- */
  const beginTear = useCallback(() => {
    setStage((s) => (s === "printing" ? "tearing" : s));
  }, []);

  useEffect(() => {
    if (stage !== "tearing" || others.length === 0) return;
    const timers: number[] = [];
    others.forEach((_, i) => {
      timers.push(window.setTimeout(() => setTornCount(i + 1), 320 + i * 380));
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [stage, others.length]);

  /* ---------- Create + persist the bill, then send the requests ---------- */
  const doSend = useCallback(async () => {
    if (!draft || !split) return;
    setStage("sending");
    try {
      const created = await svc.createBill({
        restaurant: draft.restaurant || "The bill",
        city: draft.city,
        items: draft.items,
        taxMinor: draft.taxMinor,
        serviceMinor: draft.serviceMinor,
        discountMinor: draft.discountMinor ?? 0,
        split,
      });
      const result = await svc.sendPaymentRequests({ bill: created, split });
      if (navigated.current) return;
      navigated.current = true;
      const bill: Bill = { ...result.bill, restaurant: draft.restaurant || created.restaurant };
      setActiveBill(bill);
      await refreshBills();
      navigate("/sent", { replace: true });
    } catch {
      setStage("error");
    }
  }, [draft, split, setActiveBill, refreshBills, navigate]);

  useEffect(() => {
    if (stage !== "tearing") return;
    if (others.length > 0 && tornCount < others.length) return;
    const t = window.setTimeout(doSend, 500);
    return () => window.clearTimeout(t);
  }, [stage, tornCount, others.length, doSend]);

  const onPhaseChange = useCallback(
    (phase: PrinterPhase) => {
      if (phase === "printed") beginTear();
    },
    [beginTear],
  );

  if (!draft || !split) {
    return (
      <div className="paper-grain flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6">
        <p className="font-receipt text-xs uppercase tracking-[0.25em] text-ink-faint">
          Nothing to send
        </p>
        <TactileButton variant="outline" onClick={() => navigate("/home")}>
          Back to home
        </TactileButton>
      </div>
    );
  }

  return (
    <div className="paper-grain flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col border-x border-ink/40 sm:border-ink shadow-paper-lg bg-background">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2.5 border-b border-ink bg-background/95 px-4 py-3 backdrop-blur-sm shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              aria-label="Back to review"
              onClick={() => navigate("/review-request")}
              className="tactile flex size-9 shrink-0 items-center justify-center rounded-[4px] border border-ink bg-card text-ink transition-transform hover:-translate-y-0.5 active:translate-y-0"
              title="Go back"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="font-receipt text-[9px] uppercase tracking-[0.28em] text-ink-faint truncate">
                SPLITSLIP · DISPATCH
              </p>
              <h1 className="truncate text-base font-bold tracking-tight text-ink">
                Sending Slips
              </h1>
            </div>
          </div>
          <button
            type="button"
            aria-label="Go to Home"
            onClick={() => navigate("/home")}
            className="tactile flex size-9 items-center justify-center rounded-[4px] border border-ink bg-card text-ink transition-transform hover:-translate-y-0.5 active:translate-y-0"
            title="Home"
          >
            <Home className="size-3.5" />
          </button>
        </header>

        <div className="flex flex-1 flex-col items-center px-5 pb-16 pt-8">
          <p
            className="font-receipt text-[10px] uppercase tracking-[0.3em] text-ink-faint"
            role="status"
            aria-live="polite"
          >
            {stage === "printing" && "Printing your bill…"}
            {stage === "tearing" && "Tearing off the slips…"}
            {stage === "sending" && "Sending requests…"}
            {stage === "error" && "Send failed"}
          </p>

        {/* Thermal printer prints the actual bill */}
        <ThermalReceiptPrinter config={printConfig} onPhaseChange={onPhaseChange} />

        {/* Payment slips tear away — straight, physical, deliberate */}
        <div
          className="mt-8 w-full"
          aria-label={`Payment slips: ${tornCount} of ${others.length} sent`}
        >
          <div className="grid grid-cols-3 gap-2.5">
            {others.map((p, i) => {
              const contact = draft.participants.find((c) => c.id === p.contactId);
              const isSms = contact ? !contact.isRegistered : false;
              const torn = tornCount > i;
              return (
                <motion.div
                  key={p.contactId}
                  initial={false}
                  animate={
                    torn
                      ? { y: 0, x: 0, opacity: 1, rotate: 0 }
                      : { y: 26, x: -18, opacity: 0, rotate: 0 }
                  }
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="border border-ink bg-paper-2 px-2 py-2 font-receipt text-[10px] shadow-paper torn-bottom"
                >
                  <p className="truncate text-[9px] font-semibold uppercase tracking-[0.15em]">
                    {p.displayName.split(" ")[0]}
                  </p>
                  <p className="tabular-nums">₹{formatReceiptAmount(p.amountMinor)}</p>
                  <p
                    className={cn(
                      "mt-1 text-[8px] tracking-[0.15em]",
                      isSms ? "text-destructive" : "text-stamp",
                    )}
                  >
                    {isSms ? "SMS →" : "APP →"}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Mechanical progress */}
          {stage !== "error" && (
            <div className="mt-5 flex justify-center gap-1.5" aria-hidden="true">
              {others.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 w-6 border border-ink-line transition-colors duration-300",
                    tornCount > i ? "border-stamp bg-stamp" : "bg-card",
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Error state with real retry */}
        {stage === "error" && (
          <div className="mt-8 w-full border border-ink bg-card p-4 text-center font-receipt text-xs shadow-paper">
            <p className="font-semibold tracking-[0.2em] text-destructive">SEND ERROR</p>
            <div className="my-2 rule-dashed" />
            <p className="text-ink-soft">
              Couldn't send the request{failureCount > 0 ? " again" : ""}. Check
              your connection and try again — your split is safe.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <TactileButton
                variant="stamp"
                onClick={() => {
                  setFailureCount((c) => c + 1);
                  setTornCount(others.length);
                  setStage("tearing");
                }}
              >
                Try again
              </TactileButton>
              <TactileButton variant="outline" onClick={() => navigate("/review-request")}>
                Review bill
              </TactileButton>
            </div>
          </div>
        )}

        {stage === "sending" && (
          <p className="mt-6 text-center text-[11px] text-ink-faint">
            {user?.upiId ? `All slips collect into ${user.upiId}.` : "All slips collect into your UPI."}
          </p>
        )}
        </div>
      </div>
    </div>
  );
}
