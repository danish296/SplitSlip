import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { BadgeCheck, History, Settings, Users, LogOut, Shield } from "lucide-react";
import { useApp } from "@/app/store/AppContext";
import { initialsOf } from "@/app/lib/money";
import { ScreenShell } from "@/app/components/Shell";
import { TactileButton } from "@/app/components/paper";
import { Skeleton } from "@/components/ui/skeleton";

export default function Profile() {
  const navigate = useNavigate();
  const { user, bills, logout, booted } = useApp();

  const myId = user?.id || "";
  const collected = bills
    .filter((b) => b.paidByUserId === myId)
    .reduce(
      (a, b) =>
        a +
        (b.split?.participants ?? [])
          .filter((p) => (p.status === "paid" || p.rawStatus === "VERIFIED") && p.contactId !== myId)
          .reduce((x, y) => x + y.amountMinor, 0),
      0,
    );

  async function handleLogout() {
    await logout();
    navigate("/auth", { replace: true });
  }

  return (
    <ScreenShell
      title="You"
      overline="Profile"
      onBack={() => navigate("/home")}
      navActive="/profile"
    >
      {!booted || !user ? (
        <ProfileSkeleton />
      ) : (
        <>
          {/* Identity card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="border border-ink bg-card p-5 text-center shadow-paper"
          >
            <span
              aria-hidden="true"
              className="mx-auto flex size-14 items-center justify-center border border-ink bg-stamp font-receipt text-lg font-semibold text-stamp-foreground"
            >
              {initialsOf(user?.name ?? "You")}
            </span>
            <p className="mt-3 text-lg font-bold tracking-tight">{user?.name ?? "You"}</p>
            <p className="font-receipt text-[11px] tracking-[0.12em] text-ink-faint">
              {user?.phone ? `+91 ${user.phone}` : user?.email ?? ""}
            </p>
          </motion.div>

          {/* Payment destination */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Your payment destination"
            className="mt-5"
          >
            <p className="mb-1.5 px-1 font-receipt text-[10px] uppercase tracking-[0.3em] text-ink-faint">
              Your payment destination
            </p>
            <div className="border border-ink bg-card p-4 font-receipt shadow-paper">
              <p className="text-[10px] uppercase tracking-[0.25em] text-ink-faint">UPI ID</p>
              <p className="mt-1 text-lg font-semibold tracking-tight">{user?.upiId || "Not configured"}</p>
              <div className="my-3 rule-dashed" />
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-stamp">
                <BadgeCheck className="size-4" aria-hidden="true" />
                Ready to receive payments
              </p>
            </div>
            <p className="mt-2 px-1 text-[11px] leading-relaxed text-ink-soft">
              This is the only UPI destination you configure. People you split with
              don't need to provide theirs — every request lands here.
            </p>
          </motion.section>

          {/* Stats */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Your stats"
            className="mt-5 grid grid-cols-2 gap-3"
          >
            <div className="border border-ink-line bg-card p-3 text-center">
              <p className="font-receipt text-lg font-semibold tabular-nums">{bills.length}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-faint">bills split</p>
            </div>
            <div className="border border-ink-line bg-card p-3 text-center">
              <p className="font-receipt text-lg font-semibold tabular-nums">
                ₹{(collected / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-faint">collected</p>
            </div>
          </motion.section>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 space-y-2"
          >
            <ActionRow icon={<Users className="size-4" />} label="Friends &amp; Connections" onClick={() => navigate("/friends")} />
            <ActionRow icon={<History className="size-4" />} label="Receipt archive" onClick={() => navigate("/history")} />
            <ActionRow icon={<Settings className="size-4" />} label="Settings" onClick={() => navigate("/settings")} />
            {user?.role === "admin" && (
              <ActionRow
                icon={<Shield className="size-4 text-emerald-600" />}
                label="Admin Panel"
                onClick={() => navigate("/admin")}
              />
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 pb-2"
          >
            <TactileButton
              variant="outline"
              full
              onClick={() => void handleLogout()}
            >
              <LogOut className="mr-1.5 size-4" /> Log Out
            </TactileButton>
          </motion.div>
        </>
      )}
    </ScreenShell>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-5">
      {/* Identity card skeleton */}
      <div className="border border-ink-line bg-card p-5 text-center shadow-paper">
        <Skeleton className="mx-auto size-14 border border-ink-line rounded-none" />
        <Skeleton className="mx-auto mt-3 h-5 w-32" />
        <Skeleton className="mx-auto mt-2 h-3.5 w-44" />
      </div>

      {/* Payment destination skeleton */}
      <div className="mt-5">
        <Skeleton className="mb-2 h-3 w-36" />
        <div className="border border-ink-line bg-card p-4 shadow-paper space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-44" />
          <div className="my-3 rule-dashed" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-ink-line bg-card p-3 text-center space-y-1">
          <Skeleton className="mx-auto h-6 w-12" />
          <Skeleton className="mx-auto h-3 w-20" />
        </div>
        <div className="border border-ink-line bg-card p-3 text-center space-y-1">
          <Skeleton className="mx-auto h-6 w-16" />
          <Skeleton className="mx-auto h-3 w-16" />
        </div>
      </div>

      {/* Action rows skeleton */}
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex h-12 w-full items-center gap-3 border border-ink-line bg-card px-3"
          >
            <Skeleton className="size-4" />
            <Skeleton className="h-4 flex-1 max-w-[180px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionRow({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tactile flex w-full items-center gap-3 border border-ink-line bg-card px-3 py-3 text-left hover:border-ink"
    >
      <span className="text-stamp">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span aria-hidden="true" className="text-ink-faint">›</span>
    </button>
  );
}
