import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AdminLayout } from "../AdminLayout";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

function downloadJSON(data: any[], filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCSV(data: any[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(","),
    ),
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ExportCard({
  title,
  description,
  count,
  data,
  filename,
}: {
  title: string;
  description: string;
  count: number | null;
  data: any[] | undefined;
  filename: string;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-[#161b22] p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
          <p className="mt-2 text-lg font-bold tabular-nums text-gray-100">
            {count !== null ? count : "…"}
            <span className="ml-1 text-xs font-normal text-gray-500">records</span>
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => {
            if (!data) return;
            downloadJSON(data, filename);
            toast.success(`${title} exported as JSON`);
          }}
          disabled={!data}
          className="flex items-center gap-1.5 rounded border border-gray-700 bg-[#0d1117] px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-800 disabled:opacity-40"
        >
          <FileJson className="size-3.5" />
          JSON
        </button>
        <button
          onClick={() => {
            if (!data) return;
            downloadCSV(data, filename);
            toast.success(`${title} exported as CSV`);
          }}
          disabled={!data}
          className="flex items-center gap-1.5 rounded border border-gray-700 bg-[#0d1117] px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-800 disabled:opacity-40"
        >
          <FileSpreadsheet className="size-3.5" />
          CSV
        </button>
      </div>
    </div>
  );
}

export default function AdminExport() {
  const users = useQuery(api.admin.exportUsers);
  const bills = useQuery(api.admin.exportBills);
  const payments = useQuery(api.admin.exportPayments);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-100 sm:text-2xl">Data Export</h1>
        <p className="mt-1 text-sm text-gray-500">
          Download platform data as JSON or CSV files
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ExportCard
          title="Users"
          description="All registered user accounts with profile details"
          count={users ? users.length : null}
          data={users ?? undefined}
          filename="splitslip_users"
        />
        <ExportCard
          title="Bills"
          description="All bills with restaurant, amounts, and ownership"
          count={bills ? bills.length : null}
          data={bills ?? undefined}
          filename="splitslip_bills"
        />
        <ExportCard
          title="Payment Requests"
          description="All payment requests with status and references"
          count={payments ? payments.length : null}
          data={payments ?? undefined}
          filename="splitslip_payments"
        />
      </div>
    </AdminLayout>
  );
}
