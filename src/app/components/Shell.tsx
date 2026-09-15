import { useState, type ReactNode } from "react";
import { ChevronLeft, Home, ReceiptText, User, RotateCw } from "lucide-react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";

export function ScreenShell({
  title,
  overline,
  onBack,
  backTo,
  hideBack = false,
  hideHome = false,
  hideRefresh = false,
  onRefresh,
  headerAction,
  children,
  footer,
  navActive,
  wide,
}: {
  title?: string;
  overline?: string;
  onBack?: () => void;
  backTo?: string;
  hideBack?: boolean;
  hideHome?: boolean;
  hideRefresh?: boolean;
  onRefresh?: () => void | Promise<void>;
  headerAction?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  navActive?: "/home" | "/history" | "/profile";
  wide?: boolean;
}) {
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        await new Promise((r) => setTimeout(r, 450));
        window.location.reload();
      }
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  }

  const maxW = wide ? "max-w-lg" : "max-w-md";

  return (
    <div className="paper-grain min-h-[100dvh] bg-background text-ink">
      <div
        className={cn(
          "mx-auto flex min-h-[100dvh] w-full flex-col bg-background",
          "sm:border-x sm:border-ink sm:shadow-paper-lg",
          maxW,
        )}
      >
        {/* Sticky Header */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between gap-2.5 border-b border-ink bg-background/95 px-4 py-2.5 backdrop-blur-sm shadow-xs"
          style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top))" }}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {!hideBack && (
              <button
                type="button"
                aria-label="Go back"
                onClick={() => (onBack ? onBack() : backTo ? navigate(backTo) : navigate(-1))}
                className="tactile flex size-8 shrink-0 items-center justify-center rounded-[4px] border border-ink bg-card text-ink transition-transform hover:-translate-y-0.5 active:translate-y-0"
                title="Go back"
              >
                <ChevronLeft className="size-4" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              {overline && (
                <p className="font-receipt text-[9px] uppercase tracking-[0.28em] text-ink-faint truncate">
                  {overline}
                </p>
              )}
              {title && (
                <h1 className="truncate text-sm font-bold tracking-tight text-ink sm:text-base">
                  {title}
                </h1>
              )}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {!hideRefresh && (
              <button
                type="button"
                aria-label="Refresh page"
                onClick={handleRefresh}
                disabled={refreshing}
                className="tactile flex size-8 items-center justify-center rounded-[4px] border border-ink bg-card text-ink transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                title="Refresh page"
              >
                <RotateCw className={cn("size-3.5", refreshing && "animate-spin text-stamp")} />
              </button>
            )}

            {!hideHome && (
              <button
                type="button"
                aria-label="Go to Home"
                onClick={() => navigate("/home")}
                className="tactile flex size-8 items-center justify-center rounded-[4px] border border-ink bg-card text-ink transition-transform hover:-translate-y-0.5 active:translate-y-0"
                title="Home"
              >
                <Home className="size-3.5" />
              </button>
            )}

            {headerAction}
          </div>
        </header>

        {/* Main Content — leaves room for footer/nav */}
        <main className={cn(
          "flex-1 px-4 pt-4",
          footer || navActive ? "pb-24" : "pb-8",
        )}>
          {children}
        </main>

        {/* Fixed Footer */}
        {footer && (
          <div
            className={cn(
              "fixed inset-x-0 bottom-0 z-20 mx-auto w-full border-t sm:border-x border-ink bg-card px-4 py-3 shadow-paper-lg",
              "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
              maxW,
            )}
          >
            {footer}
          </div>
        )}

        {/* Optional Bottom Navigation */}
        {navActive && <BottomNav active={navActive} />}
      </div>
    </div>
  );
}

const TABS = [
  { to: "/home", label: "Home", Icon: Home },
  { to: "/history", label: "History", Icon: ReceiptText },
  { to: "/profile", label: "You", Icon: User },
] as const;

export function BottomNav({ active }: { active: "/home" | "/history" | "/profile" }) {
  const navigate = useNavigate();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md sm:border-x border-t border-ink bg-card shadow-paper-lg"
    >
      <div className="grid grid-cols-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {TABS.map((t) => {
          const isActive = active === t.to;
          return (
            <button
              key={t.to}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => navigate(t.to)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold uppercase tracking-[0.15em]",
                isActive ? "text-stamp" : "text-ink-faint",
              )}
            >
              <t.Icon className={cn("size-5", isActive && "stroke-[2.5]")} aria-hidden="true" />
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
