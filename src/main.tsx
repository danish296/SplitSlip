import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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
import { StatusBar, Style } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";
import { AppStoreProvider, SplashGate } from "@/app/store/AppContext";
import { RemotePopupManager } from "@/app/components/RemotePopupManager";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));
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

// Admin pages
const AdminDashboard = lazy(() => import("./admin/pages/Dashboard.tsx"));
const AdminUsers = lazy(() => import("./admin/pages/Users.tsx"));
const AdminBills = lazy(() => import("./admin/pages/Bills.tsx"));
const AdminConfig = lazy(() => import("./admin/pages/Config.tsx"));
const AdminEmails = lazy(() => import("./admin/pages/Emails.tsx"));
const AdminExport = lazy(() => import("./admin/pages/Export.tsx"));
const AdminBroadcast = lazy(() => import("./admin/pages/Broadcast.tsx"));
const AdminGuard = lazy(() => import("./admin/AdminLayout.tsx").then((m) => ({ default: m.AdminGuard })));

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

/** On native (Capacitor), manage native lifecycle, restored results, and route restoration */
function NativeLandingRedirect() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Track active route
    if (pathname !== "/" && pathname !== "/auth" && pathname !== "/onboarding") {
      localStorage.setItem("split_last_native_route", pathname);
    }

    if (pathname === "/") {
      const restored = sessionStorage.getItem("split_restored_camera_image");
      if (restored) {
        navigate("/scan", { replace: true });
        return;
      }
      const lastRoute = localStorage.getItem("split_last_native_route");
      if (lastRoute && lastRoute !== "/" && lastRoute !== "/auth" && lastRoute !== "/onboarding") {
        navigate(lastRoute, { replace: true });
        return;
      }
      navigate("/auth", { replace: true });
    }
  }, [pathname, navigate]);

  return null;
}

function NativeLifecycleManager() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Configure status bar so it never overlays or clips app content
    void StatusBar.setOverlaysWebView({ overlay: false });
    void StatusBar.setBackgroundColor({ color: "#F0EEE6" });
    void StatusBar.setStyle({ style: Style.Dark });

    let sub: any = null;
    const register = async () => {
      sub = await CapApp.addListener("appRestoredResult", (data: any) => {
        console.log("[NativeLifecycle] appRestoredResult:", data);
        if (data?.pluginId === "Camera" && data?.data?.dataUrl) {
          sessionStorage.setItem("split_restored_camera_image", data.data.dataUrl);
          navigate("/scan", { replace: true });
        }
      });
    };
    void register();

    return () => {
      if (sub && sub.remove) sub.remove();
    };
  }, [navigate]);

  return null;
}

/** Splash wrapper for in-app routes only — public routes render immediately. */
function SplashRoutes() {
  const { pathname } = useLocation();
  const isPublic =
    pathname === "/" ||
    pathname === "/contact" ||
    pathname === "/auth" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/r/") ||
    pathname.startsWith("/admin");
  if (isPublic) return null;
  return <SplashGate />;
}

function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const maintenance = useQuery(api.admin.getMaintenanceStatus);
  const currentUser = useQuery(api.users.currentUser);

  // Admin routes and admins always bypass maintenance mode
  if (pathname.startsWith("/admin") || currentUser?.role === "admin") {
    return <>{children}</>;
  }

  if (maintenance?.active) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center text-ink">
        <div className="w-full max-w-sm border border-ink bg-card p-6 shadow-paper font-receipt">
          <div className="mb-3 inline-flex size-10 items-center justify-center border border-ink bg-stamp/10 font-bold text-stamp">
            !
          </div>
          <h1 className="text-base font-bold uppercase tracking-wider">Under Maintenance</h1>
          <div className="my-3 rule-dashed" />
          <p className="text-xs leading-relaxed text-ink-soft">
            {maintenance.message || "SplitSlip is temporarily offline for maintenance. We'll be back shortly."}
          </p>
          <div className="my-3 rule-dashed" />
          <p className="text-[10px] uppercase tracking-widest text-ink-faint">
            Please check back soon
          </p>
          <div className="mt-4">
            <a
              href="/admin"
              className="font-mono text-[11px] text-ink-faint hover:text-ink underline"
            >
              Admin Portal →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
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
          <RemotePopupManager />
          <NativeLifecycleManager />
          <AndroidBackHandler />
          <NativeLandingRedirect />
          <RouteSyncer />
          <AppStoreProvider>
            <MaintenanceGate>
              <Suspense fallback={<RouteLoading />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/contact" element={<Contact />} />
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
                  {/* Admin routes — protected by AdminGuard (prevents queries from running for non-admins) */}
                  <Route element={<AdminGuard />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/bills" element={<AdminBills />} />
                    <Route path="/admin/config" element={<AdminConfig />} />
                    <Route path="/admin/emails" element={<AdminEmails />} />
                    <Route path="/admin/export" element={<AdminExport />} />
                    <Route path="/admin/broadcast" element={<AdminBroadcast />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </MaintenanceGate>
            <SplashRoutes />
          </AppStoreProvider>
        </BrowserRouter>
        <Toaster position="top-center" />
      </ConvexAuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
