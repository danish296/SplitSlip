import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="paper-grain flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="w-56 rotate-[-2deg] border border-ink bg-card p-6 font-receipt text-xs text-ink shadow-paper-lg torn-bottom">
        <p className="text-[10px] uppercase tracking-[0.35em] text-ink-faint">
          SplitSlip
        </p>
        <div className="my-3 rule-dashed" />
        <p className="text-4xl font-bold tabular-nums">404</p>
        <p className="mt-2 text-xs text-ink-soft">
          This page slipped out of the drawer.
        </p>
        <div className="my-3 rule-dashed" />
        <p className="text-[9px] uppercase tracking-[0.25em] text-ink-faint">
          Void · not filed
        </p>
      </div>
      <Link
        to="/"
        className="tactile mt-8 inline-flex h-11 items-center rounded-[4px] border border-ink bg-ink px-6 text-xs font-semibold uppercase tracking-[0.15em] text-card shadow-[0_2px_0_0_var(--ink-rule)]"
      >
        Back to the front page
      </Link>
    </div>
  );
}
