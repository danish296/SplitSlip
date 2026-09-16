import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ScreenShell } from "@/app/components/Shell";
import { TactileButton } from "@/app/components/paper";
import { relativeDate } from "@/app/lib/money";
import {
  Bell,
  CheckCheck,
  CreditCard,
  ShieldCheck,
  UserPlus,
  AlertCircle,
  Clock,
  ExternalLink,
  Sparkles,
  Download,
  Megaphone,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const navigate = useNavigate();
  const notifications = useQuery(api.notifications.listNotifications) ?? [];
  const markAsRead = useMutation(api.notifications.markAsRead);
  const [selectedBroadcast, setSelectedBroadcast] = useState<any | null>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const isBroadcastKind = (type: string) =>
    type === "system_update" ||
    type === "feature_announcement" ||
    type === "general_announcement" ||
    type === "broadcast";

  async function handleNotificationClick(n: any) {
    if (!n.isRead) {
      await markAsRead({ notificationId: n._id });
    }

    // Broadcast messages & general announcements open an interactive popup window
    if (
      isBroadcastKind(n.type) ||
      (!n.data?.paymentRequestId &&
        !n.data?.billId &&
        n.type !== "connection_request" &&
        n.type !== "connection_accepted")
    ) {
      setSelectedBroadcast(n);
      return;
    }

    if (n.type === "payment_request" && n.data?.paymentRequestId) {
      navigate(`/r/${n.data.paymentRequestId}`);
    } else if (n.type === "payment_claimed" && n.data?.billId) {
      navigate(`/bills/${n.data.billId}`);
    } else if (n.type === "payment_verified" && n.data?.billId) {
      navigate(`/bills/${n.data.billId}`);
    } else if (n.type === "payment_rejected" && n.data?.paymentRequestId) {
      navigate(`/r/${n.data.paymentRequestId}`);
    } else if (n.type === "connection_request" || n.type === "connection_accepted") {
      navigate("/friends");
    }
  }

  const handleModalAction = (link: string) => {
    setSelectedBroadcast(null);
    if (link.startsWith("http://") || link.startsWith("https://")) {
      window.open(link, "_blank");
    } else {
      navigate(link);
    }
  };

  async function handleMarkAllRead() {
    await markAsRead({});
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case "payment_request":
        return <CreditCard className="size-4 text-stamp" />;
      case "payment_claimed":
        return <Clock className="size-4 text-amber-600" />;
      case "payment_verified":
        return <ShieldCheck className="size-4 text-stamp" />;
      case "payment_rejected":
        return <AlertCircle className="size-4 text-destructive" />;
      case "connection_request":
      case "connection_accepted":
        return <UserPlus className="size-4 text-ink" />;
      case "system_update":
        return <Download className="size-4 text-blue-600" />;
      case "feature_announcement":
        return <Sparkles className="size-4 text-amber-600" />;
      case "general_announcement":
      case "broadcast":
        return <Megaphone className="size-4 text-emerald-600" />;
      default:
        return <Bell className="size-4 text-ink-faint" />;
    }
  }

  return (
    <ScreenShell
      title="Notifications"
      overline="Alerts & Activity"
      onBack={() => navigate(-1)}
      footer={
        unreadCount > 0 ? (
          <TactileButton variant="outline" size="md" full onClick={handleMarkAllRead}>
            <CheckCheck className="mr-1.5 size-4" /> Mark all as read
          </TactileButton>
        ) : undefined
      }
    >
      {notifications.length === 0 ? (
        <div className="border border-ink bg-card p-6 text-center font-receipt shadow-paper">
          <Bell className="mx-auto size-8 text-ink-faint" />
          <p className="mt-2 text-sm font-semibold tracking-wider text-ink">
            ALL CAUGHT UP
          </p>
          <div className="my-2 rule-dashed" />
          <p className="text-xs text-ink-soft">
            You have no notifications right now.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => (
            <button
              key={n._id}
              type="button"
              onClick={() => void handleNotificationClick(n)}
              className={cn(
                "tactile flex w-full items-start gap-3 border p-3.5 text-left transition-all",
                n.isRead
                  ? "border-ink-line bg-card opacity-80"
                  : "border-ink bg-paper-2 shadow-paper",
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center border border-ink-line bg-card">
                {getNotificationIcon(n.type)}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="font-receipt text-xs font-bold text-ink truncate">
                      {n.title}
                    </p>
                    {n.type === "system_update" && (
                      <span className="shrink-0 rounded bg-blue-500/10 px-1.5 py-0.5 font-receipt text-[8px] font-black uppercase tracking-wider text-blue-700 border border-blue-500/20">
                        Update
                      </span>
                    )}
                    {n.type === "feature_announcement" && (
                      <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 font-receipt text-[8px] font-black uppercase tracking-wider text-amber-700 border border-amber-500/20">
                        New
                      </span>
                    )}
                    {(n.type === "general_announcement" || n.type === "broadcast") && (
                      <span className="shrink-0 rounded bg-emerald-500/10 px-1.5 py-0.5 font-receipt text-[8px] font-black uppercase tracking-wider text-emerald-700 border border-emerald-500/20">
                        Notice
                      </span>
                    )}
                  </div>
                  <span className="font-receipt text-[9px] uppercase tracking-wider text-ink-faint shrink-0">
                    {relativeDate(n.createdAt)}
                  </span>
                </div>
                <p className="mt-1 font-receipt text-xs leading-relaxed text-ink-soft whitespace-pre-line">
                  {n.message}
                </p>

                {/* Direct Action link if broadcast with link */}
                {n.data?.link && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 rounded border border-stamp/40 bg-stamp/5 px-2.5 py-1 font-receipt text-[10px] font-bold text-stamp transition-colors hover:bg-stamp/15">
                    <ExternalLink className="size-3" />
                    <span>{n.data.linkText || "View Details"}</span>
                  </div>
                )}

                {!n.isRead && !n.data?.link && (
                  <span className="mt-2 inline-block font-receipt text-[9px] font-semibold uppercase tracking-[0.2em] text-stamp">
                    ● Tap to view
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Broadcast / Announcement Interactive Popup Modal */}
      <AnimatePresence>
        {selectedBroadcast && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs"
            onClick={() => setSelectedBroadcast(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md border-2 border-ink bg-card p-6 shadow-paper-lg font-receipt text-ink"
            >
              {/* Close Button at top right */}
              <button
                type="button"
                onClick={() => setSelectedBroadcast(null)}
                aria-label="Close popup"
                className="absolute right-3.5 top-3.5 flex size-8 items-center justify-center rounded border border-ink/40 bg-paper-2 hover:bg-paper-3 hover:border-ink transition-colors text-ink"
              >
                <X className="size-4" />
              </button>

              {/* Header Icon + Category Badge */}
              <div className="flex items-center gap-2.5 mb-3 pr-8">
                <span className="flex size-9 shrink-0 items-center justify-center rounded border border-ink bg-paper-2">
                  {getNotificationIcon(selectedBroadcast.type)}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {selectedBroadcast.type === "system_update" && (
                      <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-blue-700 border border-blue-500/20">
                        System Update
                      </span>
                    )}
                    {selectedBroadcast.type === "feature_announcement" && (
                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-700 border border-amber-500/20">
                        Feature Announcement
                      </span>
                    )}
                    {(selectedBroadcast.type === "general_announcement" ||
                      selectedBroadcast.type === "broadcast") && (
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-700 border border-emerald-500/20">
                        Announcement
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-ink-faint">
                    {relativeDate(selectedBroadcast.createdAt)}
                  </span>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-base font-bold text-ink leading-snug">
                {selectedBroadcast.title}
              </h3>

              {/* Divider */}
              <div className="my-3.5 rule-dashed" />

              {/* Body Message */}
              <div className="max-h-64 overflow-y-auto pr-1 text-xs leading-relaxed text-ink-soft whitespace-pre-line">
                {selectedBroadcast.message}
              </div>

              {/* Actions Area */}
              <div className="mt-5 pt-3 border-t border-ink-line flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedBroadcast(null)}
                  className="tactile h-9 rounded border border-ink bg-paper-2 px-4 text-xs font-semibold text-ink hover:bg-paper-3 transition-colors"
                >
                  Close
                </button>

                {selectedBroadcast.data?.link && (
                  <button
                    type="button"
                    onClick={() => handleModalAction(selectedBroadcast.data.link)}
                    className="tactile inline-flex h-9 items-center gap-1.5 rounded border border-ink bg-stamp px-4 text-xs font-bold uppercase tracking-wider text-stamp-foreground shadow-[0_2px_0_0_color-mix(in_srgb,var(--stamp)_70%,black)] transition-all hover:bg-stamp/90"
                  >
                    <ExternalLink className="size-3.5" />
                    <span>{selectedBroadcast.data.linkText || "View Details"}</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ScreenShell>
  );
}
