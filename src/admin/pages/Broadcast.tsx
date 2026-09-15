import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AdminLayout } from "../AdminLayout";
import { Send, Bell } from "lucide-react";
import { toast } from "sonner";

export default function AdminBroadcast() {
  const broadcast = useMutation(api.admin.broadcastNotification);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number } | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required.");
      return;
    }

    setSending(true);
    try {
      const result = await broadcast({
        title: title.trim(),
        message: message.trim(),
      });
      setLastResult(result);
      toast.success(`Broadcast sent to ${result.sent} users`);
      setTitle("");
      setMessage("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send broadcast");
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-100 sm:text-2xl">Broadcast Notification</h1>
        <p className="mt-1 text-sm text-gray-500">
          Send a notification to all registered users
        </p>
      </div>

      <div className="max-w-xl">
        <form onSubmit={handleSend} className="rounded-lg border border-gray-800 bg-[#161b22] p-5 sm:p-6">
          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Notification Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. System Update"
              className="h-10 w-full rounded border border-gray-700 bg-[#0d1117] px-3 text-sm text-gray-200 outline-none placeholder:text-gray-600 focus:border-emerald-500/50"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="The notification message shown to all users…"
              className="w-full rounded border border-gray-700 bg-[#0d1117] px-3 py-2 text-sm text-gray-200 outline-none placeholder:text-gray-600 focus:border-emerald-500/50 resize-y"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-600">
              This will be sent as an in-app notification to every user.
            </p>
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 rounded bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {sending ? (
                "Sending…"
              ) : (
                <>
                  <Send className="size-3.5" />
                  Broadcast
                </>
              )}
            </button>
          </div>
        </form>

        {lastResult && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <Bell className="size-4 text-emerald-400" />
            <p className="text-sm text-emerald-300">
              Successfully sent to <span className="font-bold">{lastResult.sent}</span> users.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
