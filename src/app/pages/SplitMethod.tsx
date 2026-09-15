import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useApp } from "@/app/store/AppContext";
import { ScreenShell } from "@/app/components/Shell";
import { cn } from "@/lib/utils";
import type { SplitMethodType } from "@/app/lib/types";

const METHODS: Array<{
  id: SplitMethodType;
  title: string;
  sub: string;
  art: "equal" | "items" | "custom";
}> = [
  { id: "equal", title: "Equally", sub: "Everyone pays the same.", art: "equal" },
  { id: "items", title: "By item", sub: "Choose who had what.", art: "items" },
  { id: "custom", title: "Custom", sub: "Set everyone's amount yourself.", art: "custom" },
];

function MethodArt({ kind }: { kind: "equal" | "items" | "custom" }) {
  if (kind === "equal") {
    return (
      <svg viewBox="0 0 96 56" className="h-14 w-24" aria-hidden="true">
        <rect x="18" y="4" width="60" height="34" fill="var(--card)" stroke="var(--ink)" />
        <line x1="18" y1="12" x2="78" y2="12" stroke="var(--ink)" strokeDasharray="2 2" />
        <line x1="48" y1="16" x2="48" y2="38" stroke="var(--stamp)" strokeWidth="2" strokeDasharray="3 2" />
        <rect x="30" y="40" width="16" height="12" fill="var(--mint)" stroke="var(--ink)" />
        <rect x="50" y="40" width="16" height="12" fill="var(--mint)" stroke="var(--ink)" />
        <line x1="33" y1="46" x2="43" y2="46" stroke="var(--ink)" />
        <line x1="53" y1="46" x2="63" y2="46" stroke="var(--ink)" />
      </svg>
    );
  }
  if (kind === "items") {
    return (
      <svg viewBox="0 0 96 56" className="h-14 w-24" aria-hidden="true">
        <rect x="14" y="4" width="44" height="40" fill="var(--card)" stroke="var(--ink)" />
        <line x1="18" y1="12" x2="54" y2="12" stroke="var(--ink)" />
        <line x1="18" y1="19" x2="50" y2="19" stroke="var(--ink)" />
        <line x1="18" y1="26" x2="54" y2="26" stroke="var(--ink)" />
        <line x1="18" y1="33" x2="46" y2="33" stroke="var(--ink)" />
        <path d="M58 18 L88 30 L88 40 L58 40 Z" fill="var(--mint)" stroke="var(--stamp)" />
        <path d="M58 8 L88 14 L88 24 L58 18 Z" fill="var(--card)" stroke="var(--stamp)" />
        <line x1="66" y1="30" x2="80" y2="30" stroke="var(--stamp)" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 96 56" className="h-14 w-24" aria-hidden="true">
      <rect x="16" y="4" width="64" height="40" fill="var(--card)" stroke="var(--ink)" />
      <line x1="22" y1="13" x2="52" y2="13" stroke="var(--ink)" />
      <rect x="56" y="9" width="18" height="8" fill="var(--mint)" stroke="var(--stamp)" />
      <line x1="22" y1="23" x2="48" y2="23" stroke="var(--ink)" />
      <rect x="56" y="19" width="18" height="8" fill="var(--card)" stroke="var(--stamp)" />
      <line x1="22" y1="33" x2="44" y2="33" stroke="var(--ink)" />
      <rect x="56" y="29" width="18" height="8" fill="var(--mint)" stroke="var(--stamp)" />
      <line x1="30" y1="48" x2="66" y2="48" stroke="var(--ink)" strokeDasharray="2 2" />
    </svg>
  );
}

export default function SplitMethod() {
  const navigate = useNavigate();
  const { draft, updateDraft } = useApp();

  if (!draft) {
    return (
      <ScreenShell title="No bill yet" onBack={() => navigate("/home")}>
        <p className="text-sm text-ink-soft">
          Scan a bill first — then we'll split it.
        </p>
      </ScreenShell>
    );
  }

  function choose(method: SplitMethodType) {
    updateDraft({ splitMethod: method });
    if (method === "equal") navigate("/split/equal");
    else if (method === "items") navigate("/split/items");
    else navigate("/split/custom");
  }

  return (
    <ScreenShell title="How are we splitting this?" overline="Step 2 of 4" onBack={() => navigate("/review")}>
      <div className="space-y-3">
        {METHODS.map((m, i) => (
          <motion.button
            key={m.id}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.28 }}
            onClick={() => choose(m.id)}
            className={cn(
              "tactile-hard flex w-full items-center gap-4 border p-4 text-left shadow-[0_3px_0_0_var(--ink-rule)] active:translate-y-[3px] active:shadow-none",
              draft.splitMethod === m.id
                ? "border-stamp bg-mint shadow-[0_3px_0_0_color-mix(in_srgb,var(--stamp)_70%,black)]"
                : "border-ink bg-card",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            )}
            aria-pressed={draft.splitMethod === m.id}
            aria-label={`${m.title} — ${m.sub}`}
          >
            <MethodArt kind={m.art} />
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold uppercase tracking-[0.1em] text-ink">
                {m.title}
              </span>
              <span className="mt-0.5 block text-[13px] text-ink-soft">{m.sub}</span>
            </span>
            {draft.splitMethod === m.id ? (
              <span className="flex size-5 items-center justify-center rounded-full bg-stamp text-[11px] text-stamp-foreground" aria-hidden="true">
                ✓
              </span>
            ) : (
              <Check className="size-5 text-ink-faint" aria-hidden="true" />
            )}
          </motion.button>
        ))}
      </div>

      <div className="mt-6 border border-ink-line bg-paper-2 p-3 font-receipt text-[11px] text-ink-soft">
        <span className="font-semibold tracking-[0.2em]">TIP</span>
        <div className="my-1.5 rule-dashed" />
        Split by item when orders differ a lot — it's the fairest way and the
        math always lands on the exact total.
      </div>
    </ScreenShell>
  );
}
