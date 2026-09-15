import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AdminLayout } from "../AdminLayout";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<string, string> = {
  sent: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/20 text-red-400",
  simulated: "bg-amber-500/20 text-amber-400",
};

export default function AdminEmails() {
  const emails = useQuery(api.admin.listEmailEvents, { limit: 100 });

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-100 sm:text-2xl">Email Log</h1>
        <p className="mt-1 text-sm text-gray-500">
          All email delivery attempts — sent, failed, and simulated
        </p>
      </div>

      {!emails ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg border border-gray-800 bg-[#161b22]" />
          ))}
        </div>
      ) : emails.length === 0 ? (
        <p className="rounded-lg border border-gray-800 bg-[#161b22] p-8 text-center text-sm text-gray-600">
          No email events recorded yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-800 bg-[#161b22]">
              <tr>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Recipient</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Type</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Subject</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {emails.map((ev) => (
                <tr key={ev._id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-300">{ev.recipientEmail}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{ev.type}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate">{ev.subject}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", STATUS_BADGE[ev.status] ?? "bg-gray-700 text-gray-400")}>
                      {ev.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums text-gray-500">
                    {new Date(ev.createdAt).toLocaleString("en-IN", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
