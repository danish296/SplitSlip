import { useConvexAuth } from "convex/react";
import { Navigate, useLocation } from "react-router";
import type { ReactNode } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="paper-grain flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="border border-ink bg-card p-6 text-center font-receipt shadow-paper">
          <p className="text-xs uppercase tracking-[0.25em] text-ink animate-pulse">
            Verifying session…
          </p>
          <div className="my-2 rule-dashed" />
          <p className="text-[10px] text-ink-faint">SplitSlip</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const returnTo = location.pathname + location.search;
    return <Navigate to={`/auth?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  return <>{children}</>;
}
