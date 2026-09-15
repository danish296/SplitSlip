import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AdminLayout } from "../AdminLayout";
import {
  Users,
  FileText,
  CreditCard,
  Mail,
  TrendingUp,
  TrendingDown,
  Activity,
  IndianRupee,
} from "lucide-react";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "emerald",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  color?: "emerald" | "blue" | "amber" | "rose" | "purple" | "cyan";
}) {
  const colorMap = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  };

  return (
    <div className="rounded-lg border border-gray-800 bg-[#161b22] p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-gray-100">
            {value}
          </p>
          {sub && (
            <p className="mt-1 text-xs text-gray-500">{sub}</p>
          )}
        </div>
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-lg border",
            colorMap[color],
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ event }: { event: any }) {
  const typeLabels: Record<string, string> = {
    request_sent: "Payment request sent",
    claim_submitted: "Payment claim submitted",
    verified: "Payment verified",
    rejected: "Payment rejected",
    paid: "Payment received",
    reminder: "Reminder sent",
    expired: "Request expired",
    cancelled: "Request cancelled",
  };
  const typeColors: Record<string, string> = {
    request_sent: "bg-blue-500/20 text-blue-400",
    claim_submitted: "bg-amber-500/20 text-amber-400",
    verified: "bg-emerald-500/20 text-emerald-400",
    rejected: "bg-rose-500/20 text-rose-400",
    paid: "bg-emerald-500/20 text-emerald-400",
    reminder: "bg-purple-500/20 text-purple-400",
    expired: "bg-gray-500/20 text-gray-400",
    cancelled: "bg-gray-500/20 text-gray-400",
  };

  return (
    <div className="flex items-center gap-3 rounded-md border border-gray-800/50 bg-[#0d1117] px-3 py-2.5">
      <span
        className={cn(
          "inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
          typeColors[event.type] ?? "bg-gray-700 text-gray-300",
        )}
      >
        {event.type.replace(/_/g, " ")}
      </span>
      <span className="flex-1 truncate text-xs text-gray-400">
        {event.contactName} — ₹{(event.amountMinor / 100).toFixed(2)}
      </span>
      <span className="shrink-0 text-[10px] tabular-nums text-gray-600">
        {new Date(event.createdAt).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}

export default function AdminDashboard() {
  const stats = useQuery(api.admin.dashboardStats);
  const activity = useQuery(api.admin.recentActivity, { limit: 15 });

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-100 sm:text-2xl">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your SplitSlip deployment
        </p>
      </div>

      {!stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-lg border border-gray-800 bg-[#161b22]"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Users"
              value={stats.users.total}
              sub={`+${stats.users.last24h} today · +${stats.users.last7d} this week`}
              icon={Users}
              color="blue"
            />
            <StatCard
              label="Total Bills"
              value={stats.bills.total}
              sub={`${stats.bills.active} active · ${stats.bills.settled} settled`}
              icon={FileText}
              color="emerald"
            />
            <StatCard
              label="Payment Requests"
              value={stats.payments.totalRequests}
              sub={`${stats.payments.pending} pending · ${stats.payments.verified} verified`}
              icon={CreditCard}
              color="amber"
            />
            <StatCard
              label="Pending Claims"
              value={stats.payments.pendingClaims}
              sub="Awaiting verification"
              icon={Activity}
              color="rose"
            />
            <StatCard
              label="Total Volume"
              value={`₹${(stats.payments.totalVolumeMinor / 100).toLocaleString("en-IN")}`}
              sub="All payment requests"
              icon={IndianRupee}
              color="purple"
            />
            <StatCard
              label="Settled Volume"
              value={`₹${(stats.payments.settledVolumeMinor / 100).toLocaleString("en-IN")}`}
              sub="Verified payments"
              icon={TrendingUp}
              color="cyan"
            />
            <StatCard
              label="Emails"
              value={stats.emails.total}
              sub={`${stats.emails.sent} sent · ${stats.emails.failed} failed · ${stats.emails.simulated} simulated`}
              icon={Mail}
              color="blue"
            />
            <StatCard
              label="Admins"
              value={stats.users.admins}
              sub="Admin-role users"
              icon={Users}
              color="amber"
            />
          </div>

          {/* Activity feed */}
          <div className="mt-8">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">
              Recent Activity
            </h2>
            {!activity || activity.length === 0 ? (
              <p className="rounded-lg border border-gray-800 bg-[#161b22] p-6 text-center text-sm text-gray-600">
                No recent payment activity found.
              </p>
            ) : (
              <div className="space-y-1.5">
                {activity.map((event) => (
                  <ActivityRow key={event._id} event={event} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
