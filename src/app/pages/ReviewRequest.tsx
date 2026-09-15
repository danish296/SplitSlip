import { useMemo } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { useApp, currentUserId } from "@/app/store/AppContext";
import { buildSplitFromDraft } from "@/app/lib/flow";
import { formatReceiptAmount } from "@/app/lib/money";
import { ScreenShell } from "@/app/components/Shell";
import {
  PaymentSlip,
  TactileButton,
  PrinterSlot,
  PrintedLine,
} from "@/app/components/paper";

export default function ReviewRequest() {
  const navigate = useNavigate();
  const { draft, contacts, user } = useApp();

  const split = useMemo(() => (draft ? buildSplitFromDraft(draft) : null), [draft]);
  if (!draft || !split) {
    return (
      <ScreenShell title="Nothing to review" onBack={() => navigate("/home")}>
        <p className="text-sm text-ink-soft">Scan a bill first.</p>
      </ScreenShell>
    );
  }

  const itemsTotal = draft.items.reduce((a, b) => a + b.amountMinor, 0);
  const total = itemsTotal + draft.taxMinor + draft.serviceMinor;
  const mine = split.participants.find((p) => p.contactId === currentUserId());
  const others = split.participants.filter((p) => p.contactId !== currentUserId());
  const toCollect = others.reduce((a, b) => a + b.amountMinor, 0);
  const splitSum = split.participants.reduce((a, b) => a + b.amountMinor, 0);
  const reconciled = splitSum === total;

  return (
    <ScreenShell
      title="The bill"
      overline="Final check"
      onBack={() => navigate("/people")}
      footer={
        <div className="space-y-2">
          {!reconciled && (
            <p className="text-center font-receipt text-[11px] uppercase tracking-[0.15em] text-destructive">
              Split doesn't match the bill — go back and fix it
            </p>
          )}
          <TactileButton
            variant="stamp"
            size="lg"
            full
            disabled={toCollect <= 0 || !reconciled}
            onClick={() => navigate("/sending")}
          >
            Send requests · ₹{formatReceiptAmount(toCollect)}
          </TactileButton>
        </div>
      }
    >
      {/* The final bill prints out of the printer */}
      <div className="flex flex-col items-center">
        <PrinterSlot className="w-64" />
      </div>
      <PrintedLine delay={0.15} className="mt-3">
        <div className="border border-ink bg-card px-5 py-5 font-receipt text-[13px] text-ink shadow-paper torn-bottom">
          <p className="text-center text-[14px] font-semibold tracking-[0.22em]">
            {draft.restaurant.toUpperCase()}
          </p>
          <p className="mt-0.5 text-center text-[10px] tracking-[0.3em] text-ink-faint">
            {(draft.city ?? "BANGALORE").toUpperCase()} · {draft.items.length} ITEMS
          </p>
          <div className="my-3 rule-dashed" />
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] tracking-[0.2em] text-ink-faint">TOTAL</span>
            <span className="text-xl font-semibold tabular-nums">₹{formatReceiptAmount(total)}</span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-[11px] tracking-[0.2em] text-ink-faint">YOU PAID</span>
            <span className="font-semibold tabular-nums">₹{formatReceiptAmount(mine?.amountMinor ?? 0)}</span>
          </div>
          <div className="my-3 rule-dashed" />
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-semibold tracking-[0.2em]">TO COLLECT</span>
            <motion.span
              initial={{ scale: 1.25, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block text-lg font-semibold tabular-nums text-stamp"
            >
              ₹{formatReceiptAmount(toCollect)}
            </motion.span>
          </div>
        </div>
      </PrintedLine>

      {/* Individual slips feed out one by one */}
      <p className="mt-6 font-receipt text-[10px] uppercase tracking-[0.3em] text-ink-faint">
        Payment slips
      </p>
      <ul className="mt-2 space-y-2.5">
        {others.map((p, i) => {
          const contact = contacts.find((c) => c.id === p.contactId);
          return (
            <li key={p.contactId}>
              <PrintedLine delay={1.0 + i * 0.28}>
                <PaymentSlip
                  name={p.displayName}
                  minor={p.amountMinor}
                  channel={contact?.isRegistered ? "app" : "sms"}
                />
              </PrintedLine>
              <p className="mt-1 px-1 text-[10px] leading-relaxed text-ink-faint">
                {contact?.isRegistered
                  ? `${contact.name.split(" ")[0]} gets an in-app request.`
                  : `${contact?.name.split(" ")[0] ?? p.displayName} isn't on SplitSlip — they'll get an SMS link.`}
              </p>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-center text-[11px] text-ink-faint">
        Every slip lands in your UPI — {user?.upiId ?? "your UPI"}. Friends
        never enter payment details.
      </p>
    </ScreenShell>
  );
}
