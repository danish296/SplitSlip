/* Papery component library — receipts, tactile buttons, chips, slips. */

import { motion, type HTMLMotionProps } from "framer-motion";
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { formatINR, formatReceiptAmount } from "@/app/lib/money";
import type { ParticipantStatus } from "@/app/lib/types";

/* ------------------------------------------------------------------ */
/* TactileButton — physical press, compressed shadow                   */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "outline" | "ghost" | "stamp" | "danger";

interface TactileButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  full?: boolean;
  mono?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-card shadow-[0_3px_0_0_var(--ink-rule)] hover:shadow-[0_4px_0_0_var(--ink-rule)]",
  stamp:
    "bg-stamp text-stamp-foreground shadow-[0_3px_0_0_color-mix(in_srgb,var(--stamp)_70%,black)] hover:shadow-[0_4px_0_0_color-mix(in_srgb,var(--stamp)_70%,black)]",
  outline:
    "bg-card text-ink border border-ink shadow-[0_2px_0_0_var(--ink)]",
  ghost: "bg-transparent text-ink hover:bg-muted/60",
  danger:
    "bg-card text-destructive border border-destructive/60 shadow-[0_2px_0_0_color-mix(in_srgb,var(--destructive)_70%,transparent)]",
};

const sizeClasses = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-14 px-6 text-base gap-2.5",
};

export const TactileButton = forwardRef<HTMLButtonElement, TactileButtonProps>(
  function TactileButton(
    { variant = "primary", size = "md", full, mono, className, children, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-[4px] font-medium uppercase tracking-[0.08em] transition-all duration-100",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          "disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none",
          "active:translate-y-[3px] active:shadow-none",
          variantClasses[variant],
          sizeClasses[size],
          full && "w-full",
          mono && "font-receipt tracking-[0.06em] normal-case",
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

/* ------------------------------------------------------------------ */
/* SectionHeader — small overline + serif-ish title                    */
/* ------------------------------------------------------------------ */

export function SectionHeader({
  overline,
  title,
  action,
  className,
}: {
  overline?: string;
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div>
        {overline && (
          <p className="font-receipt text-[10px] uppercase tracking-[0.25em] text-ink-faint">
            {overline}
          </p>
        )}
        <h2 className="mt-1 text-lg font-bold leading-tight tracking-tight text-ink">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PaperCard — a card with paper shadow, optional torn bottom          */
/* ------------------------------------------------------------------ */

export function PaperCard({
  className,
  children,
  torn,
  tilt,
  ...rest
}: HTMLMotionProps<"div"> & { torn?: boolean; tilt?: number }) {
  return (
    <motion.div
      className={cn(
        "border border-ink bg-card shadow-paper",
        torn && "torn-bottom pb-2",
        className,
      )}
      style={tilt ? { rotate: `${tilt}deg` } : undefined}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Receipt — the central receipt surface                               */
/* ------------------------------------------------------------------ */

export function Receipt({
  children,
  className,
  perforated = true,
}: {
  children: ReactNode;
  className?: string;
  perforated?: boolean;
}) {
  return (
    <div
      className={cn(
        "border border-ink bg-card px-5 py-5 font-receipt text-[13px] leading-relaxed text-ink shadow-paper",
        perforated && "torn-bottom",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ReceiptHeader({
  restaurant,
  city,
  meta,
  className,
}: {
  restaurant: string;
  city?: string;
  meta?: string;
  className?: string;
}) {
  return (
    <div className={cn("text-center", className)}>
      <p className="text-[15px] font-semibold uppercase tracking-[0.2em]">{restaurant}</p>
      {city && <p className="mt-0.5 text-[10px] uppercase tracking-[0.3em] text-ink-faint">{city}</p>}
      {meta && <p className="mt-1 text-[10px] tracking-[0.12em] text-ink-faint">{meta}</p>}
      <div className="my-3 rule-dashed" aria-hidden="true" />
    </div>
  );
}

export function ReceiptRow({
  left,
  right,
  strong,
  className,
}: {
  left: ReactNode;
  right: ReactNode;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3",
        strong && "font-semibold",
        className,
      )}
    >
      <span className="min-w-0 truncate">{left}</span>
      <span className="shrink-0 tabular-nums">{right}</span>
    </div>
  );
}

export function ReceiptDashes({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("my-2 rule-dashed", className)} />;
}

export function ReceiptTotal({
  label = "TOTAL",
  minor,
  big,
  className,
}: {
  label?: string;
  minor: number;
  big?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between", className)}>
      <span className={cn("font-semibold tracking-[0.15em]", big ? "text-sm" : "text-xs")}>
        {label}
      </span>
      <span
        className={cn(
          "font-semibold tabular-nums",
          big ? "text-2xl tracking-tight" : "text-base",
        )}
      >
        ₹{formatReceiptAmount(minor)}
      </span>
    </div>
  );
}

/** Big standalone amount, receipt-mono. */
export function Amount({
  minor,
  className,
  decimals = false,
}: {
  minor: number;
  className?: string;
  decimals?: boolean;
}) {
  return (
    <span className={cn("font-receipt tabular-nums", className)}>
      {formatINR(minor, { decimals })}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* ParticipantChip — physical press + selected state                   */
/* ------------------------------------------------------------------ */

export function ParticipantChip({
  name,
  selected,
  onClick,
  disabled,
  sub,
  className,
}: {
  name: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  sub?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "tactile inline-flex min-h-11 items-center gap-1.5 rounded-[4px] border px-3 py-1.5 text-[13px] transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        selected
          ? "border-stamp bg-stamp font-semibold text-stamp-foreground shadow-[0_2px_0_0_color-mix(in_srgb,var(--stamp)_70%,black)]"
          : "border-ink-line bg-card text-ink-soft hover:border-ink",
        disabled && "cursor-not-allowed opacity-40",
        className,
      )}
    >
      <span aria-hidden="true" className="text-[11px]">
        {selected ? "✓" : ""}
      </span>
      <span>{name}</span>
      {sub && <span className="text-[10px] opacity-70">{sub}</span>}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* StatusBadge — text-first status with shapes, not just color         */
/* ------------------------------------------------------------------ */

const STATUS_STYLE: Record<ParticipantStatus | "sent" | "expired" | "failed" | "overdue", string> = {
  pending: "border-ink text-ink bg-card",
  paid: "border-stamp bg-stamp text-stamp-foreground",
  invited_sms: "border-dashed border-ink text-ink-soft bg-paper-2",
  sent: "border-ink text-ink bg-card",
  expired: "border-ink-line border-dashed text-ink-faint bg-card",
  failed: "border-destructive text-destructive bg-card",
  overdue: "border-destructive text-destructive bg-card",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ParticipantStatus | "sent" | "expired" | "failed";
  className?: string;
}) {
  const label =
    status === "invited_sms" ? "SMS SENT" : status.toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-1.5 py-0.5 font-receipt text-[9px] font-semibold tracking-[0.18em]",
        STATUS_STYLE[status],
        className,
      )}
    >
      {status === "paid" && <span aria-hidden="true">●</span>}
      {status === "pending" && <span aria-hidden="true">○</span>}
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* PaymentSlip — small torn receipt naming one person's share          */
/* ------------------------------------------------------------------ */

export function PaymentSlip({
  name,
  minor,
  channel,
  status,
  className,
  compact,
}: {
  name: string;
  minor: number;
  channel?: "app" | "sms";
  status?: ParticipantStatus | "sent";
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "border border-ink bg-paper-2 font-receipt shadow-paper",
        compact ? "px-3 py-2" : "px-4 py-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">
          {name}
        </span>
        <span className="text-sm font-semibold tabular-nums">
          ₹{formatReceiptAmount(minor)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[9px] tracking-[0.15em] text-ink-faint">
        <span>
          {channel === "sms" ? "PAYMENT LINK · SMS SOON" : channel === "app" ? "IN-APP REQUEST" : "PAYMENT SLIP"}
        </span>
        {status && <StatusBadge status={status} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ScannerFrame — camera corner brackets + scan line                   */
/* ------------------------------------------------------------------ */

export function ScannerFrame({
  scanning,
  children,
  className,
}: {
  scanning?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-[3/4] w-full max-w-[280px] border border-ink/40 bg-[#1B1B18]",
        className,
      )}
    >
      {children}
      {/* corner brackets */}
      {(["top-2 left-2 border-t-2 border-l-2", "top-2 right-2 border-t-2 border-r-2", "bottom-2 left-2 border-b-2 border-l-2", "bottom-2 right-2 border-b-2 border-r-2"] as const).map(
        (pos) => (
          <span
            key={pos}
            aria-hidden="true"
            className={`absolute h-6 w-6 border-stamp ${pos}`}
          />
        ),
      )}
      {scanning && (
        <div
          aria-hidden="true"
          className="scan-line absolute left-2 right-2 h-10 bg-gradient-to-b from-transparent via-stamp/25 to-stamp/60"
        />
      )}
      <style>{`
        .scan-line { animation: papersplit-scan 1.6s linear infinite; }
        @keyframes papersplit-scan {
          0% { top: 4%; }
          50% { top: calc(96% - 2.5rem); }
          100% { top: 4%; }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* EmptyState                                                          */
/* ------------------------------------------------------------------ */

export function EmptyState({
  message,
  hint,
  action,
  className,
}: {
  message: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center py-10 text-center", className)}>
      <div
        aria-hidden="true"
        className="mb-4 flex h-12 w-10 rotate-[-2deg] items-center justify-center border border-dashed border-ink-line bg-paper-2 font-receipt text-[10px] text-ink-faint"
      >
        00
      </div>
      <p className="text-sm font-semibold text-ink">{message}</p>
      {hint && <p className="mt-1 max-w-[26ch] text-xs text-ink-faint">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AmountInput — money input bound to minor units                      */
/* ------------------------------------------------------------------ */

export const AmountInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
    value: string;
    onValueChange: (minor: number | null, raw: string) => void;
  }
>(function AmountInput({ value, onValueChange, className, ...rest }, ref) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 border border-ink bg-paper-2 px-2 font-receipt",
        className,
      )}
    >
      <span aria-hidden="true" className="text-sm text-ink-faint">
        ₹
      </span>
      <input
        ref={ref}
        inputMode="decimal"
        type="text"
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          onValueChange(rawToMinor(raw), raw);
        }}
        className="h-10 w-full bg-transparent text-sm tabular-nums outline-none"
        {...rest}
      />
    </div>
  );
});

function rawToMinor(raw: string): number | null {
  const cleaned = raw.replace(/[₹,\s]/g, "");
  if (!/^\d*(\.\d{0,2})?$/.test(cleaned) || cleaned === "" || cleaned === ".") return null;
  const [r, p] = cleaned.split(".");
  return parseInt(r || "0", 10) * 100 + parseInt(((p ?? "") + "00").slice(0, 2), 10);
}

/* ------------------------------------------------------------------ */
/* PrinterSlot — the mouth of a thermal printer                        */
/* ------------------------------------------------------------------ */

export function PrinterSlot({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative z-10 flex h-5 items-center justify-center border border-ink bg-ink shadow-[0_3px_0_0_var(--ink-rule)]",
        className,
      )}
    >
      <span className="h-[3px] w-3/5 rounded-[1px] bg-[#0B0B09]" />
      <span className="absolute left-2 size-1 rounded-full bg-card/40" />
      <span className="absolute right-2 size-1 rounded-full bg-card/40" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PrintedLine — content feeding out of a printer slot, mechanically   */
/* ------------------------------------------------------------------ */

export function PrintedLine({
  delay = 0,
  instant,
  className,
  children,
}: {
  delay?: number;
  /** Skip the feed animation (used when the ledger has already printed once). */
  instant?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={instant ? false : { clipPath: "inset(0 0 100% 0)", y: -8, opacity: 0 }}
      animate={{ clipPath: "inset(0 0 0% 0)", y: 0, opacity: 1 }}
      transition={{ delay: instant ? 0 : delay, duration: 0.4, ease: [0.85, 0, 0.15, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* ThermalReceiptPrinter — the CodePen receipt-feed machine, rebuilt    */
/* with React state + CSS. No scroll-driven animation.                  */
/*                                                                      */
/* States: idle → printing → printed → tearing → complete               */
/* The paper starts tucked inside the slot and feeds upward in stepped  */
/* increments while lines reveal one by one; on completion it can tear  */
/* off and the cycle can be re-run.                                     */
/* ------------------------------------------------------------------ */

export type PrinterPhase = "idle" | "printing" | "printed" | "tearing" | "complete";

export interface ThermalPrinterConfig {
  title: string;
  subtitle?: string;
  meta?: string;
  /** Receipt lines; rendered progressively while printing. */
  lines: Array<{ label: string; value: string; strong?: boolean }>; 
  /** The emphasized footer amount, revealed with the total. */
  totalLabel: string;
  totalValue: string;
  /** ms per printed line (paper-feed step). */
  lineInterval?: number;
  /** Auto-start printing on mount (used in the Send flow). */
  autoStart?: boolean;
  /** Hide the interactive start button (auto flows). */
  hideStartButton?: boolean;
  /** Start the feed when the machine is hovered (desktop) — tap still works. */
  hoverToStart?: boolean;
  /** Idle prompt under the slot. */
  idleHint?: string;
}

export function ThermalReceiptPrinter({
  config,
  onPhaseChange,
  onTearComplete,
  className,
}: {
  config: ThermalPrinterConfig;
  onPhaseChange?: (phase: PrinterPhase) => void;
  /** Fired after the tear-off animation ends (reset to idle by the parent). */
  onTearComplete?: () => void;
  className?: string;
}) {
  const [phase, setPhase] = useState<PrinterPhase>("idle");
  const [visibleLines, setVisibleLines] = useState(0);
  const timers = useRef<number[]>([]);
  const phaseRef = useRef<PrinterPhase>("idle");

  const lineInterval = config.lineInterval ?? 130;

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const go = useCallback(
    (p: PrinterPhase) => {
      phaseRef.current = p;
      setPhase(p);
      onPhaseChange?.(p);
    },
    [onPhaseChange],
  );

  const start = useCallback(() => {
    if (phaseRef.current === "printing" || phaseRef.current === "tearing") return;
    clearTimers();
    setVisibleLines(0);
    go("printing");
    const n = config.lines.length + 1; // +1 for the total
    for (let i = 1; i <= n; i++) {
      timers.current.push(
        window.setTimeout(() => {
          setVisibleLines(i);
          if (i === n) go("printed");
        }, i * lineInterval),
      );
    }
  }, [clearTimers, go, config.lines.length, lineInterval]);

  // Auto-start flows (Send Requests) fire the printer without interaction.
  // Cleanup resets state so React StrictMode re-mount can re-trigger cleanly.
  useEffect(() => {
    if (config.autoStart) {
      start();
    }
    return () => {
      clearTimers();
      phaseRef.current = "idle";
    };
  }, [config.autoStart, start, clearTimers]);

  const hoverStarted = useRef(false);
  const onMouseEnter = useCallback(() => {
    if (config.hoverToStart && phase === "idle" && !hoverStarted.current) {
      hoverStarted.current = true;
      start();
    }
  }, [config.hoverToStart, phase, start]);

  const tearOff = useCallback(() => {
    if (phase !== "printed") return;
    go("tearing");
    timers.current.push(
      window.setTimeout(() => {
        hoverStarted.current = false; // re-arm hover for the next print
        go("complete");
        onTearComplete?.();
      }, 650),
    );
  }, [phase, go, onTearComplete]);

  // Reset back to idle with fresh paper.
  const reset = useCallback(() => {
    clearTimers();
    setVisibleLines(0);
    go("idle");
  }, [clearTimers, go]);

  const printing = phase === "printing";
  const showPaper = phase === "printing" || phase === "printed" || phase === "tearing";
  const canStart = phase === "idle" || phase === "complete";
  const linesToShow = config.lines.slice(0, visibleLines);
  const totalShown = visibleLines > config.lines.length;

  return (
    <div
      className={cn("printer-machine relative flex w-full flex-col items-center", className)}
      data-phase={phase}
      onMouseEnter={onMouseEnter}
    >
      {/* ----- The receipt, emerging upward from the slot ----- */}
      <div className="relative flex w-full justify-center">
        {showPaper && (
          <div
            role="status"
            aria-label={printing ? "Printing receipt" : "Receipt printed"}
            className={cn(
              "printer-receipt relative w-[min(100%,19rem)] px-5 pb-6 pt-4 font-receipt text-[12px] leading-relaxed",
              printing && "is-printing",
              phase === "tearing" && "is-tearing",
            )}
            style={{
              transformOrigin: "center top",
            }}
          >
            {/* Progressive reveal wrapper — lines appear as the paper feeds */}
            <div>
              <p className="text-center text-[13px] font-semibold tracking-[0.24em]">
                {config.title.toUpperCase()}
              </p>
              {config.subtitle && (
                <p className="mt-0.5 text-center text-[9px] tracking-[0.28em] text-ink-faint">
                  {config.subtitle.toUpperCase()}
                </p>
              )}
              {config.meta && (
                <p className="mt-1 text-center text-[9px] tracking-[0.18em] text-ink-faint">
                  {config.meta}
                </p>
              )}
              <div className="my-2.5 rule-dashed" aria-hidden="true" />

              {linesToShow.map((l, i) => (
                <div
                  key={`${l.label}-${i}`}
                  className="flex items-baseline justify-between gap-3 py-px"
                >
                  <span className={cn("min-w-0 truncate", l.strong && "font-semibold")}>
                    {l.label}
                  </span>
                  <span className={cn("shrink-0 tabular-nums", l.strong && "font-semibold")}>
                    {l.value}
                  </span>
                </div>
              ))}

              {totalShown && (
                <div>
                  <div className="my-2.5 rule-dashed" aria-hidden="true" />
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold tracking-[0.18em]">{config.totalLabel}</span>
                    <span className="text-lg font-bold tabular-nums">{config.totalValue}</span>
                  </div>
                  <div
                    aria-hidden="true"
                    className="barcode mt-4 h-8 w-full opacity-80"
                  />
                  <p className="mt-2 text-center text-[9px] tracking-[0.3em] text-ink-faint">
                    THANK YOU · COME AGAIN
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ----- The machine: slot sits at the very top so the paper meets it ----- */}
      <div
        className={cn(
          "printer-body relative z-10 flex h-16 w-[min(100%,21rem)] flex-col items-center rounded-t-[10px] px-4 pt-2",
          printing && "is-printing",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "printer-led left-3 top-2",
            printing ? "is-blinking" : phase === "printed" || phase === "tearing" ? "is-done" : "",
          )}
        />
        <span aria-hidden="true" className="printer-slot h-[7px] w-[min(100%,17rem)]" />
        <div className="mt-2 flex w-full items-center justify-between font-receipt text-[8px] uppercase tracking-[0.25em] text-white/45">
          <span>SplitSlip POS-01</span>
          <span aria-hidden="true">{printing ? "▸▸ FEED" : phase === "printed" || phase === "tearing" ? "● READY" : "⏻"}</span>
        </div>
      </div>

      {/* ----- Controls ----- */}
      <div className="mt-3 flex h-11 items-center justify-center">
        {canStart && !config.hideStartButton && (
          <TactileButton variant="stamp" size="sm" onClick={start}>
            {config.idleHint ?? "Print receipt"}
          </TactileButton>
        )}
        {canStart && config.hideStartButton && (
          <p className="font-receipt text-[9px] uppercase tracking-[0.3em] text-ink-faint">
            {phase === "complete" ? "Receipt archived" : ""}
          </p>
        )}
        {phase === "printing" && (
          <p className="font-receipt text-[9px] uppercase tracking-[0.3em] text-ink-faint">
            Printing…
          </p>
        )}
        {phase === "printed" && (
          <div className="flex items-center gap-2">
            <TactileButton variant="outline" size="sm" onClick={tearOff}>
              Tear off
            </TactileButton>
            <TactileButton variant="ghost" size="sm" onClick={reset}>
              Print again
            </TactileButton>
          </div>
        )}
      </div>
    </div>
  );
}

/** Random thermal-printer barcode as a CSS gradient (CodePen-style). */
export function useBarcodeGradient(): string {
  return useMemo(() => {
    const QUIET = 5;
    let x = QUIET;
    const stops: string[] = [];
    while (x < 100 - QUIET) {
      const bar = (Math.floor(Math.random() * 4) + 1) * 0.6;
      const gap = (Math.floor(Math.random() * 3) + 1) * 0.6;
      const barEnd = Math.min(x + bar, 100 - QUIET);
      const gapEnd = Math.min(barEnd + gap, 100 - QUIET);
      stops.push(`var(--ink) ${x.toFixed(1)}% ${barEnd.toFixed(1)}%`);
      stops.push(`transparent ${barEnd.toFixed(1)}% ${gapEnd.toFixed(1)}%`);
      x = gapEnd;
    }
    return `linear-gradient(90deg, transparent 0 ${QUIET}%, ${stops.join(", ")}, transparent ${100 - QUIET}% 100%)`;
  }, []);
}
