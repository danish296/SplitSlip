import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import * as svc from "@/app/lib/mockService";
import { CURRENT_USER_ID } from "@/app/lib/mockData";
import { uid } from "@/app/lib/money";
import type {
  Bill,
  Contact,
  DraftBill,
  Split,
  SplitMethodType,
  User,
} from "@/app/lib/types";

/* ------------------------------------------------------------------ */
/* App state                                                           */
/* ------------------------------------------------------------------ */

interface AppState {
  booted: boolean;
  user: User | null;
  onboarded: boolean;
  contacts: Contact[];
  bills: Bill[];
}

const initialState: AppState = {
  booted: false,
  user: null,
  onboarded: false,
  contacts: [],
  bills: [],
};

interface AppContextValue extends AppState {
  refreshBills: () => Promise<void>;
  finishOnboarding: (name: string, phone: string, upiId: string) => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  draft: DraftBill | null;
  startDraft: (d: Partial<DraftBill>) => void;
  updateDraft: (patch: Partial<DraftBill>) => void;
  clearDraft: () => void;
  activeBill: Bill | null;
  setActiveBill: (b: Bill | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function readOnboarding(): boolean {
  try {
    return localStorage.getItem("papersplit_onboarded") === "1";
  } catch {
    return false;
  }
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [draft, setDraft] = useState<DraftBill | null>(null);
  const [activeBill, setActiveBill] = useState<Bill | null>(null);

  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { signOut } = useAuthActions();

  const liveConnections = useQuery(
    api.connections.listConnections,
    isAuthenticated ? {} : "skip",
  );

  useEffect(() => {
    if (liveConnections) {
      const mapped = liveConnections.map((f) => ({
        id: f.id,
        name: f.name,
        phone: f.phone || "",
        isRegistered: true,
      }));
      setState((s) => ({ ...s, contacts: mapped }));
    }
  }, [liveConnections]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    if (!isAuthenticated) {
      activeUserId = "";
      setState({
        booted: true,
        user: null,
        onboarded: false,
        contacts: [],
        bills: [],
      });
      return;
    }

    (async () => {
      let [user, contacts, bills] = await Promise.all([
        svc.getCurrentUser(),
        svc.getContacts(),
        svc.getBillHistory(),
      ]);
      if (user?.id) {
        activeUserId = user.id;
      }
      if (cancelled) return;
      setState({
        booted: true,
        user,
        onboarded: true,
        contacts,
        bills,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  const refreshBills = useCallback(async () => {
    const bills = await svc.getBillHistory();
    setState((s) => ({ ...s, bills }));
  }, []);

  const finishOnboarding = useCallback(
    async (name: string, phone: string, upiId: string) => {
      const user = await svc.updateUser({ name, phone, upiId });
      if (user?.id) activeUserId = user.id;
      const [bills, contacts] = await Promise.all([
        svc.getBillHistory(),
        svc.getContacts(),
      ]);
      setState((s) => ({ ...s, user, bills, contacts, onboarded: true }));
    },
    [],
  );

  const updateUser = useCallback(async (patch: Partial<User>) => {
    const user = await svc.updateUser(patch);
    setState((s) => ({ ...s, user: user ?? s.user }));
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    activeUserId = "";
    setState({
      booted: true,
      user: null,
      onboarded: false,
      contacts: [],
      bills: [],
    });
  }, [signOut]);

  const startDraft = useCallback((d: Partial<DraftBill>) => {
    setDraft({
      restaurant: d.restaurant ?? "",
      city: d.city ?? "",
      items: d.items ?? [],
      taxMinor: d.taxMinor ?? 0,
      serviceMinor: d.serviceMinor ?? 0,
      discountMinor: d.discountMinor ?? 0,
      splitMethod: d.splitMethod ?? "equal",
      assignments: d.assignments ?? {},
      customAmounts: d.customAmounts ?? {},
      participants: d.participants ?? [],
    });
  }, []);

  const updateDraft = useCallback((patch: Partial<DraftBill>) => {
    setDraft((cur) => (cur ? { ...cur, ...patch } : null));
  }, []);

  const clearDraft = useCallback(() => setDraft(null), []);

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      refreshBills,
      finishOnboarding,
      updateUser,
      logout,
      draft,
      startDraft,
      updateDraft,
      clearDraft,
      activeBill,
      setActiveBill,
    }),
    [
      state,
      refreshBills,
      finishOnboarding,
      updateUser,
      logout,
      draft,
      startDraft,
      updateDraft,
      clearDraft,
      activeBill,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppStoreProvider");
  return ctx;
}

let activeUserId = "";

export function currentUserId(): string {
  return activeUserId;
}

/* ------------------------------------------------------------------ */
/* Splash gate — prints the app like a receipt on first load           */
/* ------------------------------------------------------------------ */

export function SplashGate() {
  const { booted } = useApp();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), 1150);
    return () => clearTimeout(t);
  }, []);

  if (booted && minTimeElapsed) return null;

  return (
    <div
      className="paper-grain fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
      data-path={location.pathname}
    >
      <div className="w-56 rotate-[-1.2deg] border border-ink bg-card px-5 py-6 text-center shadow-paper-lg">
        <p className="font-receipt text-[10px] tracking-[0.3em] text-ink-faint">
          SPLITSLIP
        </p>
        <div className="my-3 rule-dashed" aria-hidden="true" />
        <p className="font-receipt text-xs text-ink-soft">
          Warming up the printer…
        </p>
        <div className="mt-4 h-1 w-full overflow-hidden border border-ink-line bg-paper">
          <div className="loading-bar h-full bg-stamp" />
        </div>
      </div>
      <style>{`
        .loading-bar {
          animation: papersplit-load 1.1s steps(8) forwards;
          width: 0%;
        }
        @keyframes papersplit-load {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Misc helpers                                                        */
/* ------------------------------------------------------------------ */

export function makeParticipantRows(split: Split) {
  return split.participants.map((p) => ({
    contactId: p.contactId,
    amountMinor: p.amountMinor,
    status: p.status,
  }));
}

export function newRequestId(): string {
  return uid("pr");
}

export type { SplitMethodType };
