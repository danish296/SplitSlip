import { useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ScreenShell } from "@/app/components/Shell";
import { TactileButton } from "@/app/components/paper";
import { relativeDate } from "@/app/lib/money";
import { Bell, CheckCheck, CreditCard, ShieldCheck, UserPlus, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const navigate = useNavigate();
  const notifications = useQuery(api.notifications.listNotifications) ?? [];
  const markAsRead = useMutation(api.notifications.markAsRead);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function handleNotificationClick(n: any) {
    if (!n.isRead) {
      await markAsRead({ notificationId: n._id });
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
                  <p className="font-receipt text-xs font-bold text-ink truncate">
                    {n.title}
                  </p>
                  <span className="font-receipt text-[9px] uppercase tracking-wider text-ink-faint shrink-0">
                    {relativeDate(n.createdAt)}
                  </span>
                </div>
                <p className="mt-1 font-receipt text-xs leading-relaxed text-ink-soft">
                  {n.message}
                </p>

                {!n.isRead && (
                  <span className="mt-2 inline-block font-receipt text-[9px] font-semibold uppercase tracking-[0.2em] text-stamp">
                    ● Tap to view
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </ScreenShell>
  );
}
