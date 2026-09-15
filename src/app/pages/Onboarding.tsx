import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Check, ChevronLeft, Smartphone, Wallet } from "lucide-react";
import { useApp } from "@/app/store/AppContext";
import { TactileButton } from "@/app/components/paper";
import { cn } from "@/lib/utils";

type Step = 0 | 1 | 2 | 3;

export default function Onboarding() {
  const navigate = useNavigate();
  const { finishOnboarding } = useApp();
  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [upiId, setUpiId] = useState("");
  const [saving, setSaving] = useState(false);

  const canNext =
    (step === 0) ||
    (step === 1 && name.trim().length >= 2) ||
    (step === 2 && /^[0-9+\s-]{10,15}$/.test(phone.trim())) ||
    (step === 3 && /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId.trim()));

  async function handleFinish() {
    setSaving(true);
    await finishOnboarding(name.trim(), phone.trim(), upiId.trim());
    navigate("/home", { replace: true });
  }

  return (
    <div className="paper-grain flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-5 py-4">
        {step > 0 ? (
          <button
            type="button"
            aria-label="Back"
            onClick={() => setStep((s) => (s - 1) as Step)}
            className="tactile flex size-9 items-center justify-center rounded-[4px] border border-ink bg-card"
          >
            <ChevronLeft className="size-4" />
          </button>
        ) : (
          <span className="font-receipt text-[10px] uppercase tracking-[0.3em] text-ink-faint">
            SplitSlip
          </span>
        )}
        <span className="font-receipt text-[10px] tracking-[0.3em] text-ink-faint">
          {step + 1} / 4
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-10">
        {step === 0 && <Intro />}
        {step === 1 && (
          <Question
            title="What should we call you?"
            hint="This is the name your friends see on payment requests."
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Danish Akhtar"
              autoComplete="name"
              autoFocus
              className="h-14 w-full border border-ink bg-card px-4 font-receipt text-base outline-none placeholder:text-ink-faint focus:outline-2 focus:outline-offset-2 focus:outline-stamp"
            />
          </Question>
        )}
        {step === 2 && (
          <Question
            title="Your phone number?"
            hint="Mock only — this prototype never sends a real SMS."
            icon={<Smartphone className="size-4" aria-hidden="true" />}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-14 items-center border border-ink bg-card px-3 font-receipt text-sm text-ink-soft">
                +91
              </span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="98450 41277"
                autoComplete="tel"
                autoFocus
                className="h-14 w-full border border-ink bg-card px-4 font-receipt text-base outline-none placeholder:text-ink-faint focus:outline-2 focus:outline-offset-2 focus:outline-stamp"
              />
            </div>
          </Question>
        )}
        {step === 3 && (
          <Question
            title="Where should your friends pay you?"
            hint="You only need to add your own UPI ID. Your friends don't need to enter theirs."
            icon={<Wallet className="size-4" aria-hidden="true" />}
          >
            <div className="border border-ink bg-card p-4">
              <p className="font-receipt text-[10px] uppercase tracking-[0.25em] text-ink-faint">
                Your payment destination
              </p>
              <input
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="danish@upi"
                inputMode="email"
                autoComplete="off"
                autoFocus
                className="mt-2 h-12 w-full border border-ink-line bg-paper-2 px-3 font-receipt text-base outline-none placeholder:text-ink-faint focus:outline-2 focus:outline-offset-2 focus:outline-stamp"
              />
              <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
                <Check className="mt-0.5 size-3.5 shrink-0 text-stamp" aria-hidden="true" />
                Every request you send collects straight into this one
                destination.
              </p>
            </div>
          </Question>
        )}

        <div className="mt-auto pt-8">
          <TactileButton
            variant="stamp"
            size="lg"
            full
            disabled={!canNext || saving}
            onClick={() => {
              if (step < 3) setStep((s) => (s + 1) as Step);
              else void handleFinish();
            }}
          >
            {step === 0 ? "Get started" : step === 3 ? (saving ? "Printing…" : "Looks good") : "Continue"}
          </TactileButton>
          <div className="mt-4 flex justify-center gap-1.5" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn(
                  "h-1 w-6",
                  i === step ? "bg-ink" : "bg-ink-line",
                )}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function Intro() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-1 flex-col items-center justify-center text-center"
    >
      {/* Animated receipt stack illustration */}
      <div aria-hidden="true" className="relative mb-10 flex items-end justify-center gap-3">
        {/* Background slip — faded, tilted */}
        <motion.div
          initial={{ opacity: 0, y: 20, rotate: -6 }}
          animate={{ opacity: 1, y: 0, rotate: -6 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-28 border border-ink-line bg-card p-3 font-receipt text-[8px] text-ink-faint shadow-paper"
        >
          <p className="text-center text-[9px] tracking-[0.2em]">SCAN</p>
          <div className="my-1.5 rule-dashed" />
          <div className="barcode h-5 w-full opacity-40" />
        </motion.div>

        {/* Main receipt — centered, upright */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative -mb-1 w-36 border border-ink bg-card p-4 font-receipt text-[9px] text-ink shadow-paper-lg torn-bottom"
        >
          <p className="text-center text-[11px] font-semibold tracking-[0.25em]">THE TABLE</p>
          <div className="my-2 rule-dashed" />
          <div className="flex justify-between"><span>Butter Chicken</span><span className="tabular-nums">480</span></div>
          <div className="flex justify-between"><span>Paneer Tikka</span><span className="tabular-nums">360</span></div>
          <div className="flex justify-between"><span>Naan × 4</span><span className="tabular-nums">160</span></div>
          <div className="my-2 rule-dashed" />
          <div className="flex justify-between font-semibold">
            <span>TOTAL</span><span className="tabular-nums">₹2,006</span>
          </div>
        </motion.div>

        {/* Payment slip — tilted right */}
        <motion.div
          initial={{ opacity: 0, y: 20, rotate: 5 }}
          animate={{ opacity: 1, y: 0, rotate: 5 }}
          transition={{ delay: 0.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-28 border border-ink bg-paper-2 p-3 font-receipt text-[8px] shadow-paper"
        >
          <p className="text-center text-[9px] tracking-[0.2em] text-stamp">SPLIT</p>
          <div className="my-1.5 rule-dashed" />
          <div className="flex justify-between text-ink-soft"><span>You</span><span className="tabular-nums text-stamp">✓</span></div>
          <div className="flex justify-between text-ink-soft"><span>Friend 1</span><span className="tabular-nums text-stamp">✓</span></div>
          <div className="flex justify-between text-ink-soft"><span>Friend 2</span><span className="tabular-nums text-stamp">✓</span></div>
        </motion.div>
      </div>

      <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-ink">
        Split the bill.
        <br />
        Not the friendship.
      </h1>
      <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
        Scan a restaurant receipt, tap who ate what, and send every friend an
        exact payment slip. Done in seconds.
      </p>
    </motion.div>
  );
}

function Question({
  title,
  hint,
  children,
  icon,
}: {
  title: string;
  hint: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-1 flex-col justify-center"
    >
      {icon && (
        <span className="mb-3 flex size-9 items-center justify-center border border-ink bg-card text-stamp">
          {icon}
        </span>
      )}
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{hint}</p>
      <div className="mt-6">{children}</div>
    </motion.div>
  );
}
