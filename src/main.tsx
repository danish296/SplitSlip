import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { AppStoreProvider, SplashGate } from "@/app/store/AppContext";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Onboarding = lazy(() => import("./app/pages/Onboarding.tsx"));
const Home = lazy(() => import("./app/pages/Home.tsx"));
const Scanner = lazy(() => import("./app/pages/Scanner.tsx"));
const ReceiptReview = lazy(() => import("./app/pages/ReceiptReview.tsx"));
const SplitMethod = lazy(() => import("./app/pages/SplitMethod.tsx"));
const EqualSplit = lazy(() => import("./app/pages/EqualSplit.tsx"));
const ItemSplit = lazy(() => import("./app/pages/ItemSplit.tsx"));
const CustomSplit = lazy(() => import("./app/pages/CustomSplit.tsx"));
const SelectContacts = lazy(() => import("./app/pages/SelectContacts.tsx"));
const ReviewRequest = lazy(() => import("./app/pages/ReviewRequest.tsx"));
const Sending = lazy(() => import("./app/pages/Sending.tsx"));
const Sent = lazy(() => import("./app/pages/Sent.tsx"));
const BillDetails = lazy(() => import("./app/pages/BillDetails.tsx"));
const History = lazy(() => import("./app/pages/History.tsx"));
const Settings = lazy(() => import("./app/pages/Settings.tsx"));
const Profile = lazy(() => import("./app/pages/Profile.tsx"));
const PublicRequest = lazy(() => import("./app/pages/PublicRequest.tsx"));
const Friends = lazy(() => import("./app/pages/Friends.tsx"));
const Notifications = lazy(() => import("./app/pages/Notifications.tsx"));
import { ProtectedRoute } from "@/app/components/ProtectedRoute";

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Loading…</div>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in WebContainer environment). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[WebContainer preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import { convex } from "@/lib/convexClient";

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

/** Splash wrapper for in-app routes only — public routes render immediately. */
function SplashRoutes() {
  const { pathname } = useLocation();
  const isPublic =
    pathname === "/" ||
    pathname === "/auth" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/r/");
  if (isPublic) return null;
  return <SplashGate />;
}

function AndroidBackHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let sub: any = null;
    const register = async () => {
      sub = await CapApp.addListener("backButton", ({ canGoBack }) => {
        if (location.pathname === "/home" || location.pathname === "/" || !canGoBack) {
          CapApp.exitApp();
        } else {
          navigate(-1);
        }
      });
    };
    void register();

    return () => {
      if (sub && sub.remove) sub.remove();
    };
  }, [navigate, location.pathname]);

  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <AndroidBackHandler />
          <RouteSyncer />
          <AppStoreProvider>
            <Suspense fallback={<RouteLoading />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route
                  path="/auth"
                  element={<AuthPage redirectAfterAuth="/home" />}
                />
                <Route path="/onboarding" element={<AuthPage redirectAfterAuth="/home" />} />
                <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="/scan" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
                <Route path="/review" element={<ProtectedRoute><ReceiptReview /></ProtectedRoute>} />
                <Route path="/split" element={<ProtectedRoute><SplitMethod /></ProtectedRoute>} />
                <Route path="/split/equal" element={<ProtectedRoute><EqualSplit /></ProtectedRoute>} />
                <Route path="/split/items" element={<ProtectedRoute><ItemSplit /></ProtectedRoute>} />
                <Route path="/split/custom" element={<ProtectedRoute><CustomSplit /></ProtectedRoute>} />
                <Route path="/people" element={<ProtectedRoute><SelectContacts /></ProtectedRoute>} />
                <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/review-request" element={<ProtectedRoute><ReviewRequest /></ProtectedRoute>} />
                <Route path="/sending" element={<ProtectedRoute><Sending /></ProtectedRoute>} />
                <Route path="/sent" element={<ProtectedRoute><Sent /></ProtectedRoute>} />
                <Route path="/bills/:billId" element={<ProtectedRoute><BillDetails /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/r/:requestId" element={<PublicRequest />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <SplashRoutes />
          </AppStoreProvider>
        </BrowserRouter>
        <Toaster position="top-center" />
      </ConvexAuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
