import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AdminLayout } from "../AdminLayout";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400",
  settled: "bg-blue-500/20 text-blue-400",
  draft: "bg-gray-500/20 text-gray-400",
  cancelled: "bg-red-500/20 text-red-400",
  REQUESTED: "bg-amber-500/20 text-amber-400",
  PAYMENT_CLAIMED: "bg-purple-500/20 text-purple-400",
  VERIFIED: "bg-emerald-500/20 text-emerald-400",
  REJECTED: "bg-red-500/20 text-red-400",
  EXPIRED: "bg-gray-500/20 text-gray-400",
  CANCELLED: "bg-gray-500/20 text-gray-400",
};

export default function AdminBills() {
  const [tab, setTab] = useState<"bills" | "requests" | "claims">("bills");
  const [statusFilter, setStatusFilter] = useState("");

  const bills = useQuery(api.admin.listBills, { status: statusFilter || undefined });
  const requests = useQuery(api.admin.listPaymentRequests, { status: statusFilter || undefined });
  const claims = useQuery(api.admin.listPaymentClaims, { status: statusFilter || undefined });

  const tabs = [
    { id: "bills" as const, label: "Bills" },
    { id: "requests" as const, label: "Payment Requests" },
    { id: "claims" as const, label: "Claims" },
  ];

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-100 sm:text-2xl">Bills & Payments</h1>
        <p className="mt-1 text-sm text-gray-500">View all bills, payment requests, and claims</p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border border-gray-800 bg-[#161b22] p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setStatusFilter(""); }}
            className={cn(
              "rounded-md px-4 py-2 text-xs font-semibold transition-colors",
              tab === t.id
                ? "bg-emerald-500/15 text-emerald-400"
                : "text-gray-500 hover:text-gray-300",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Bills table */}
      {tab === "bills" && (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-800 bg-[#161b22]">
              <tr>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Restaurant</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Owner</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Total</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {!bills ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600">Loading…</td></tr>
              ) : bills.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600">No bills found</td></tr>
              ) : bills.map((bill) => (
                <tr key={bill._id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-200">{bill.restaurant}</p>
                    <p className="text-xs text-gray-600">{bill.city ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{bill.ownerName}</td>
                  <td className="px-4 py-3 text-sm font-semibold tabular-nums text-gray-200">
                    ₹{(bill.totalMinor / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", STATUS_COLORS[bill.status] ?? "bg-gray-700 text-gray-400")}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums text-gray-500">{bill.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment requests table */}
      {tab === "requests" && (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-800 bg-[#161b22]">
              <tr>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Reference</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Contact</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Amount</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {!requests ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600">Loading…</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600">No requests found</td></tr>
              ) : requests.map((req) => (
                <tr key={req._id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">{req.paymentReference}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{req.contactName}</td>
                  <td className="px-4 py-3 text-sm font-semibold tabular-nums text-gray-200">₹{(req.amountMinor / 100).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", STATUS_COLORS[req.status] ?? "bg-gray-700 text-gray-400")}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums text-gray-500">
                    {new Date(req.createdAt).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Claims table */}
      {tab === "claims" && (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-800 bg-[#161b22]">
              <tr>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Claimant</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">UTR</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Amount</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {!claims ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600">Loading…</td></tr>
              ) : claims.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600">No claims found</td></tr>
              ) : claims.map((claim) => (
                <tr key={claim._id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-300">{claim.claimantName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{claim.utr}</td>
                  <td className="px-4 py-3 text-sm font-semibold tabular-nums text-gray-200">₹{(claim.claimedAmountMinor / 100).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", STATUS_COLORS[claim.status] ?? "bg-gray-700 text-gray-400")}>
                      {claim.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums text-gray-500">
                    {new Date(claim.createdAt).toLocaleDateString("en-IN")}
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
