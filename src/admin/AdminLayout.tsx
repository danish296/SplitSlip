import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  Mail,
  Download,
  Bell,
  Shield,
  ChevronLeft,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Users", path: "/admin/users", icon: Users },
  { label: "Bills & Payments", path: "/admin/bills", icon: FileText },
  { label: "Feature Flags", path: "/admin/config", icon: Settings },
  { label: "Email Log", path: "/admin/emails", icon: Mail },
  { label: "Data Export", path: "/admin/export", icon: Download },
  { label: "Broadcast", path: "/admin/broadcast", icon: Bell },
];

export function AdminGuard() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const currentUser = useQuery(api.users.currentUser);
  const promote = useMutation(api.admin.promoteToAdmin);
  const [promoCode, setPromoCode] = useState("");
  const [promoting, setPromoting] = useState(false);

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    setPromoting(true);
    try {
      const res = await promote({ secretCode: promoCode.trim() });
      toast.success(res.message || "Admin access granted!");
      setPromoCode("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to claim admin access.");
    } finally {
      setPromoting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d1117] text-gray-400">
        <div className="animate-pulse font-mono text-sm">Loading admin…</div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0d1117] p-6 text-center text-gray-300">
        <Shield className="size-10 text-red-400" />
        <p className="font-mono text-sm">Please sign in to access the admin panel.</p>
        <button
          onClick={() => navigate("/auth")}
          className="mt-2 rounded border border-gray-600 bg-gray-800 px-4 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-700"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (currentUser.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0d1117] p-6 text-center text-gray-300">
        <Shield className="size-10 text-amber-400" />
        <p className="font-mono text-sm font-bold text-gray-100">Admin Access Required</p>
        <p className="max-w-sm text-xs text-gray-400">
          Your account does not have admin privileges. If you are setting up this system, enter the admin secret key below.
        </p>

        <form onSubmit={handlePromote} className="mt-2 flex w-full max-w-xs flex-col gap-2">
          <input
            type="password"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Enter admin secret key"
            className="h-9 w-full rounded border border-gray-700 bg-[#161b22] px-3 text-xs text-gray-200 outline-none placeholder:text-gray-600 focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={promoting || !promoCode.trim()}
            className="h-9 rounded bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors"
          >
            {promoting ? "Verifying…" : "Claim Admin Access"}
          </button>
        </form>

        <button
          onClick={() => navigate("/home")}
          className="mt-4 rounded border border-gray-700 bg-gray-800/80 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-700 transition-colors"
        >
          Back to App
        </button>
      </div>
    );
  }

  return <Outlet />;
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const currentUser = useQuery(api.users.currentUser);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d1117] text-gray-400">
        <div className="animate-pulse font-mono text-sm">Loading admin…</div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0d1117] p-6 text-center text-gray-300">
        <Shield className="size-10 text-red-400" />
        <p className="font-mono text-sm">Please sign in to access the admin panel.</p>
        <button
          onClick={() => navigate("/auth")}
          className="mt-2 rounded border border-gray-600 bg-gray-800 px-4 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-700"
        >
          Sign In
        </button>
      </div>
    );
  }

  const promote = useMutation(api.admin.promoteToAdmin);
  const [promoCode, setPromoCode] = useState("");
  const [promoting, setPromoting] = useState(false);

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    setPromoting(true);
    try {
      const res = await promote({ secretCode: promoCode.trim() });
      toast.success(res.message || "Admin access granted!");
      setPromoCode("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to claim admin access.");
    } finally {
      setPromoting(false);
    }
  };

  if (currentUser.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0d1117] p-6 text-center text-gray-300">
        <Shield className="size-10 text-amber-400" />
        <p className="font-mono text-sm font-bold text-gray-100">Admin Access Required</p>
        <p className="max-w-sm text-xs text-gray-400">
          Your account does not have admin privileges. If you are setting up this system, enter the admin secret key below.
        </p>

        <form onSubmit={handlePromote} className="mt-2 flex w-full max-w-xs flex-col gap-2">
          <input
            type="password"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Enter admin secret key"
            className="h-9 w-full rounded border border-gray-700 bg-[#161b22] px-3 text-xs text-gray-200 outline-none placeholder:text-gray-600 focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={promoting || !promoCode.trim()}
            className="h-9 rounded bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors"
          >
            {promoting ? "Verifying…" : "Claim Admin Access"}
          </button>
        </form>

        <button
          onClick={() => navigate("/home")}
          className="mt-4 rounded border border-gray-700 bg-gray-800/80 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-700 transition-colors"
        >
          Back to App
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0d1117] text-gray-200">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-800 bg-[#161b22] transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Sidebar header */}
        <div className="flex h-14 items-center justify-between border-b border-gray-800 px-4">
          <Link to="/admin" className="flex items-center gap-2">
            <Shield className="size-5 text-emerald-400" />
            <span className="text-sm font-bold tracking-wide text-gray-100">
              Admin Panel
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded p-1 text-gray-500 hover:text-gray-300 lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active =
                item.path === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "text-gray-400 hover:bg-gray-800 hover:text-gray-200",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-gray-800 p-3 space-y-2">
          <div className="flex items-center gap-2 rounded-md bg-gray-800/50 px-3 py-2">
            <div
              className="flex size-7 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: currentUser.avatarColor || "#6366f1" }}
            >
              {(currentUser.name?.[0] ?? "A").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-gray-200">
                {currentUser.name ?? "Admin"}
              </p>
              <p className="truncate text-[10px] text-gray-500">
                {currentUser.email ?? ""}
              </p>
            </div>
          </div>
          <Link
            to="/home"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-gray-500 hover:bg-gray-800 hover:text-gray-300"
          >
            <ChevronLeft className="size-3.5" />
            Back to App
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top bar (mobile) */}
        <header className="flex h-14 items-center gap-3 border-b border-gray-800 bg-[#161b22] px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded p-1 text-gray-400 hover:text-gray-200"
          >
            <Menu className="size-5" />
          </button>
          <Shield className="size-4 text-emerald-400" />
          <span className="text-sm font-bold text-gray-100">Admin</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
