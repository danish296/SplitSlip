import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AdminLayout } from "../AdminLayout";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const FLAG_META: Record<string, { label: string; description: string }> = {
  maintenanceMode: {
    label: "Maintenance Mode",
    description: "When enabled, non-admin users see a maintenance page and cannot use the app.",
  },
  registrationEnabled: {
    label: "User Registration",
    description: "Allow new user signups. Disabling this blocks new registrations.",
  },
  scannerEnabled: {
    label: "Receipt Scanner",
    description: "Enable the OCR receipt scanning feature.",
  },
  paymentsEnabled: {
    label: "Payments & Requests",
    description: "Enable sending payment requests and processing claims.",
  },
  friendsEnabled: {
    label: "Friends / Connections",
    description: "Enable the friend request and connections system.",
  },
};

export default function AdminConfig() {
  const config = useQuery(api.admin.getSiteConfig);
  const setConfig = useMutation(api.admin.setSiteConfig);

  const handleToggle = async (key: string, currentValue: boolean) => {
    try {
      await setConfig({ key, value: !currentValue });
      toast.success(`${FLAG_META[key]?.label ?? key} ${!currentValue ? "enabled" : "disabled"}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update config");
    }
  };

  const handleMessageUpdate = async (message: string) => {
    try {
      await setConfig({ key: "maintenanceMessage", value: message });
      toast.success("Maintenance message updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update message");
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-100 sm:text-2xl">Feature Flags</h1>
        <p className="mt-1 text-sm text-gray-500">
          Toggle features on or off across the entire platform
        </p>
      </div>

      {!config ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border border-gray-800 bg-[#161b22]" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(FLAG_META).map(([key, meta]) => {
            const value = !!config[key];
            const isDanger = key === "maintenanceMode";
            return (
              <div
                key={key}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-4 sm:p-5 transition-colors",
                  isDanger && value
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-gray-800 bg-[#161b22]",
                )}
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-200">{meta.label}</p>
                    {isDanger && value && (
                      <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-400">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">{meta.description}</p>
                </div>
                <button
                  onClick={() => handleToggle(key, value)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                    value
                      ? isDanger
                        ? "bg-red-500"
                        : "bg-emerald-500"
                      : "bg-gray-700",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200",
                      value ? "translate-x-5" : "translate-x-0",
                    )}
                  />
                </button>
              </div>
            );
          })}

          {/* Maintenance message */}
          {config.maintenanceMode && (
            <div className="rounded-lg border border-red-500/20 bg-[#161b22] p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Maintenance Message
              </p>
              <textarea
                defaultValue={config.maintenanceMessage as string}
                rows={3}
                className="w-full rounded border border-gray-700 bg-[#0d1117] px-3 py-2 text-sm text-gray-200 outline-none placeholder:text-gray-600 focus:border-red-500/50"
                onBlur={(e) => handleMessageUpdate(e.target.value)}
              />
              <p className="mt-1 text-[10px] text-gray-600">
                Changes are saved when you click outside the text area.
              </p>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
