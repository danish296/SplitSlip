import { useMemo, useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  Github,
  Lock,
  ScanLine,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatReceiptAmount } from "@/app/lib/money";
import {
  ThermalReceiptPrinter,
  type PrinterPhase,
} from "@/app/components/paper";

/* ------------------------------------------------------------------ */
/* Small landing-local primitives                                      */
/* ------------------------------------------------------------------ */

function LandingButton({
  children,
  href,
  variant = "stamp",
  big,
}: {
  children: React.ReactNode;
  href: string;
  variant?: "stamp" | "outline";
  big?: boolean;
}) {
  return (
    <Link
      to={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[4px] font-semibold uppercase tracking-[0.1em] transition-all duration-100 active:translate-y-[3px] active:shadow-none",
        big ? "h-14 px-8 text-sm" : "h-11 px-6 text-xs",
        variant === "stamp"
          ? "bg-stamp text-stamp-foreground shadow-[0_3px_0_0_color-mix(in_srgb,var(--stamp)_70%,black)]"
          : "border border-ink bg-card text-ink shadow-[0_2px_0_0_var(--ink)]",
      )}
    >
      {children}
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}

/** The hero's interactive thermal printer — hover/tap to feed the receipt. */
function HeroPrinter() {
  const [phase, setPhase] = useState<PrinterPhase>("idle");

  const config = useMemo(
    () => ({
      title: "The Table",
      subtitle: "Bangalore",
      meta: "FRI 8:42 PM · TABLE 12 · SPLIT 4 WAYS",
      lines: [
        { label: "2 × Butter Chicken", value: "480.00" },
        { label: "1 × Paneer Tikka", value: "360.00" },
        { label: "4 × Butter Naan", value: "160.00" },
        { label: "1 × Biryani", value: "420.00" },
        { label: "4 × Coke", value: "280.00" },
        { label: "GST 18%", value: "306.00" },
      ],
      totalLabel: "TOTAL",
      totalValue: "₹2,006.00",
      lineInterval: 170,
      autoStart: true,
      hideStartButton: true,
    }),
    [],
  );

  return (
    <div className="relative w-full max-w-[24rem]" style={{ minHeight: "26rem" }}>
      <ThermalReceiptPrinter
        config={config}
        onPhaseChange={setPhase}
        onTearComplete={() => setPhase("idle")}
      />
    </div>
  );
}

function Rule({ className }: { className?: string }) {
  return <hr aria-hidden="true" className={cn("border-t border-ink-line", className)} />;
}

function Overline({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-receipt text-[10px] uppercase tracking-[0.35em] text-ink-faint">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Interactive demo — assign an item, watch shares update              */
/* ------------------------------------------------------------------ */

const DEMO_PEOPLE = ["Danish", "Aarav", "Riya", "Kabir"];

function InteractiveDemo() {
  const [who, setWho] = useState<string[]>(["Danish", "Aarav"]);

  const share = useMemo(() => {
    const n = Math.max(who.length, 1);
    const total = 48000; // ₹480 in paise
    const base = Math.floor(total / n);
    const rem = total - base * n;
    return who.map((_, i) => base + (i < rem ? 1 : 0));
  }, [who]);

  return (
    <div className="grid items-center gap-10 md:grid-cols-2">
      <div>
        <Overline>Try it right here</Overline>
        <h3 className="mt-3 text-3xl font-bold tracking-tight text-ink">
          Tap who ate the butter chicken.
        </h3>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
          Every item on the receipt gets its own assignment. The bill does the
          arithmetic in the background — down to the last paisa, always
          reconciled to the total. This is the real engine, running live.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {DEMO_PEOPLE.map((name) => {
            const selected = who.includes(name);
            return (
              <button
                key={name}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  setWho((prev) =>
                    prev.includes(name)
                      ? prev.filter((p) => p !== name)
                      : [...prev, name],
                  )
                }
                className={cn(
                  "tactile min-h-11 rounded-[4px] border px-4 py-2 text-sm font-semibold transition-colors",
                  selected
                    ? "border-stamp bg-stamp text-stamp-foreground shadow-[0_2px_0_0_color-mix(in_srgb,var(--stamp)_70%,black)]"
                    : "border-ink-line bg-card text-ink-soft hover:border-ink",
                )}
              >
                {selected && <Check className="mr-1 inline size-3.5" aria-hidden="true" />}
                {name}
              </button>
            );
          })}
        </div>
        {who.length === 0 && (
          <p className="mt-4 font-receipt text-xs text-destructive">
            1 item still unassigned — tap at least one person.
          </p>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-sm border border-ink bg-card p-5 font-receipt text-[13px] shadow-paper-lg"
      >
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-[0.25em] text-ink-faint">
            Butter Chicken × 2
          </span>
          <span className="font-semibold tabular-nums">₹480.00</span>
        </div>
        <div className="my-3 rule-dashed" />
        {who.length === 0 ? (
          <p className="py-6 text-center text-xs text-ink-faint">
            — waiting for names —
          </p>
        ) : (
          who.map((name, i) => (
            <div key={name} className="flex items-baseline justify-between py-1">
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="text-stamp">✓</span>
                {name}
              </span>
              <span className="tabular-nums">₹{formatReceiptAmount(share[i] ?? 0)}</span>
            </div>
          ))
        )}
        <div className="my-3 rule-dashed" />
        <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.2em] text-ink-faint">
          <span>{who.length > 0 ? `${who.length} way split` : "Unassigned"}</span>
          <span className="tabular-nums text-ink">
            ₹{formatReceiptAmount(share.reduce((a, b) => a + b, 0))}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Landing page                                                        */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    n: "01",
    title: "Scan the bill",
    body: "One person pays. Photograph the paper receipt — the scanner reads the restaurant, items and GST like a cash register.",
    icon: ScanLine,
  },
  {
    n: "02",
    title: "Assign the items",
    body: "Tap who had what. Butter chicken for three, biryani for two, naan for everyone. Exact shares, no mental math.",
    icon: Users,
  },
  {
    n: "03",
    title: "Send the slips",
    body: "Each friend gets their own little slip with the exact amount. They pay to your UPI — no typing, no chasing.",
    icon: Wallet,
  },
];

const FEATURES = [
  {
    title: "Paisa-perfect splits",
    body: "All math runs in integer paise. The left-over single paisa is assigned fairly instead of vanishing.",
  },
  {
    title: "Items, not averages",
    body: "One friend had three coffees? They pay for three coffees. Split by item, or fall back to equal when it doesn't matter.",
  },
  {
    title: "One UPI. Yours.",
    body: "Friends never hand over their UPI IDs. They just tap Pay and the money lands in your account.",
  },
  {
    title: "SMS for the others",
    body: "Friends on the app get an in-app request. Everyone else gets a clean payment link over SMS.",
  },
  {
    title: "Settlement you can see",
    body: "Every bill is a tracking page: who was asked, who paid, who's still pending — like slips pinned to a corkboard.",
  },
  {
    title: "Built for the group chat",
    body: "Frequent splitters get a table group, so Friday dinner takes four taps, not forty.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "We used to argue about who owed what for days. Now the receipt does the talking and the app does the collecting.",
    name: "Aarav M.",
    detail: "Splits dinner every week, Bangalore",
  },
  {
    quote:
      "The item-by-item split is the killer feature. My veg friends stopped paying for my butter chicken.",
    name: "Riya S.",
    detail: "Office lunch group of 6",
  },
  {
    quote:
      "Sent requests to four people before the food even arrived. Two paid before we left the table.",
    name: "Kabir S.",
    detail: "Weekend biryani club",
  },
];

export default function Landing() {
  return (
    <div className="paper-grain min-h-screen bg-background text-ink">
      <div className="mx-auto max-w-5xl border-x border-ink/40 sm:border-ink shadow-paper-lg bg-background flex flex-col min-h-screen">
        {/* ---------- Masthead ---------- */}
        <header className="flex items-center justify-between border-b border-ink px-5 py-4">
        <div className="flex items-center gap-2">
          <img
            src="/logo.svg"
            alt="SplitSlip logo"
            className="size-8"
          />
          <span className="text-sm font-bold uppercase tracking-[0.2em]">SplitSlip</span>
        </div>
        <nav aria-label="Primary" className="flex items-center gap-2">
          <Link
            to="/onboarding"
            className="tactile hidden h-10 items-center rounded-[4px] px-4 text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft hover:text-ink sm:inline-flex"
          >
            Log in
          </Link>
          <Link
            to="/onboarding"
            className="tactile inline-flex h-10 items-center rounded-[4px] border border-ink bg-ink px-4 text-xs font-semibold uppercase tracking-[0.15em] text-card shadow-[0_2px_0_0_var(--ink-rule)]"
          >
            Start Splitting
          </Link>
        </nav>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative mx-auto max-w-5xl px-5 pb-16 pt-10 md:pt-16">
        <div className="grid items-center gap-12 md:grid-cols-[1.15fr_0.85fr]">
          <div>
            <Overline>A bill-splitting app that feels like paper</Overline>
            <h1 className="mt-4 text-[2.6rem] font-extrabold leading-[1.02] tracking-tight md:text-6xl">
              Split the bill.
              <br />
              Not the friendship.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-soft">
              You pay the restaurant. Your friends pay you. Scan the receipt,
              tap who ate what, and send each person an exact payment slip —
              down to the last paisa.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <LandingButton href="/onboarding" big>
                New Split
              </LandingButton>
              <LandingButton href="/onboarding" variant="outline">
                See how it works
              </LandingButton>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-receipt text-[10px] uppercase tracking-[0.2em] text-ink-faint">
              <span className="inline-flex items-center gap-1.5">
                <ScanLine className="size-3.5" aria-hidden="true" /> Scan → split in ~40s
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="size-3.5" aria-hidden="true" /> No UPI IDs to collect
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="size-3.5" aria-hidden="true" /> Contacts stay on device
              </span>
            </div>
          </div>
          <div className="relative flex justify-center overflow-hidden">
            <HeroPrinter />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5">
        <Rule />
      </div>

      {/* ---------- How it works ---------- */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <Overline>How it works</Overline>
        <div className="mt-8 grid gap-px overflow-hidden border border-ink bg-ink md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="bg-card p-6">
              <div className="flex items-center justify-between">
                <s.icon className="size-5 text-stamp" aria-hidden="true" />
                <span className="font-receipt text-[11px] tracking-[0.3em] text-ink-faint">
                  {s.n}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-bold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Interactive demo ---------- */}
      <section className="border-y border-ink bg-paper-2">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <InteractiveDemo />
        </div>
      </section>

      {/* ---------- Safety / privacy ---------- */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <Overline>Safety &amp; privacy</Overline>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              Your friends never hand over their UPI.
            </h2>
          </div>
          <ul className="space-y-4">
            {[
              "You add your own UPI ID once. Every request you send collects into your account — friends never enter payment details.",
              "Contacts are read on-device to find who's already on SplitSlip. We don't upload your address book.",
              "Non-registered friends receive a public link that shows only the amount, the bill name and you — nothing else.",
            ].map((line) => (
              <li key={line} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
                <Check className="mt-0.5 size-4 shrink-0 text-stamp" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section className="mx-auto max-w-5xl px-5 pb-14">
        <Overline>What's inside</Overline>
        <div className="mt-8 grid gap-px overflow-hidden border border-ink bg-ink sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-card p-5">
              <h3 className="text-sm font-bold uppercase tracking-[0.08em]">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Testimonials ---------- */}
      <section className="border-t border-ink bg-paper-2">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <Overline>From the table</Overline>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <figure
                key={t.name}
                className={cn(
                  "flex flex-col border border-ink bg-card p-5 font-receipt shadow-paper",
                  i === 1 && "rotate-[0.6deg]",
                  i === 0 && "rotate-[-0.5deg]",
                )}
              >
                <blockquote className="flex-1 text-[13px] leading-relaxed text-ink">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-4 border-t border-dashed border-ink-line pt-3 text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                  {t.name} — {t.detail}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Built by ---------- */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="flex flex-col items-start gap-4 border border-ink bg-card p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Overline>Built by</Overline>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
              SplitSlip was built by Danish Akhtar, after one spreadsheet too
              many after Friday dinner. Someone had to do the paise properly.
              Unfortunately, it had to be him.
            </p>
            <a
              href="https://github.com/danish296"
              target="_blank"
              rel="noreferrer"
              className="tactile mt-4 inline-flex h-11 items-center gap-2 rounded-[4px] border border-ink bg-ink px-4 text-xs font-semibold uppercase tracking-[0.12em] text-card shadow-[0_2px_0_0_var(--ink-rule)]"
            >
              <Github className="size-4" aria-hidden="true" />
              github.com/danish296
            </a>
          </div>
          <a
            href="https://github.com/danish296"
            target="_blank"
            rel="noreferrer"
            aria-label="Danish Akhtar on GitHub"
            className="shrink-0 border-2 border-stamp bg-stamp px-4 py-2 font-receipt text-[10px] font-semibold uppercase tracking-[0.3em] text-stamp-foreground shadow-paper"
          >
            Shipped by Danish, allegedly
          </a>
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="border-t border-ink bg-stamp">
        <div className="mx-auto flex max-w-5xl flex-col items-center px-5 py-16 text-center text-stamp-foreground">
          <p className="font-receipt text-[10px] uppercase tracking-[0.35em] opacity-80">
            Ready when the bill arrives
          </p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight md:text-4xl">
            Start splitting like it's paper.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed opacity-90">
            Takes under a minute to set up. Scan your first receipt and send
            your first slips tonight.
          </p>
          <div className="mt-8">
            <Link
              to="/onboarding"
              className="tactile inline-flex h-14 items-center gap-2 rounded-[4px] border border-stamp-foreground/30 bg-card px-8 text-sm font-bold uppercase tracking-[0.12em] text-ink shadow-[0_3px_0_0_color-mix(in_srgb,var(--stamp)_60%,black)]"
            >
              Start Splitting
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-ink bg-background">
        <div className="flex flex-col gap-3 px-5 py-8 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <span className="font-receipt tracking-[0.2em]">SPLITSLIP v1</span>
          <span>
            Scan. Split. Settle. — Built with Convex, React &amp; TypeScript.
          </span>
        </div>
      </footer>
    </div>
  </div>
  );
}
