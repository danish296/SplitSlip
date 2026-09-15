import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AdminLayout } from "../AdminLayout";
import {
  Send,
  Bell,
  Sparkles,
  Smartphone,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Tab = "broadcast" | "popup" | "update";

export default function AdminBroadcast() {
  const [activeTab, setActiveTab] = useState<Tab>("broadcast");

  // Tab 1: Broadcast Notification
  const broadcast = useMutation(api.admin.broadcastNotification);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number } | null>(null);

  // Tab 2: Remote In-App Popup Config
  const currentPopupConfig = useQuery(api.admin.getAdminRemotePopupConfig);
  const setPopupMutation = useMutation(api.admin.setRemotePopupConfig);
  const [popupEnabled, setPopupEnabled] = useState(false);
  const [popupId, setPopupId] = useState("popup_v1");
  const [popupTitle, setPopupTitle] = useState("Enjoying SplitSlip?");
  const [popupMessage, setPopupMessage] = useState(
    "Your feedback helps us make bill splitting seamless. Rate us or let us know how we can improve!",
  );
  const [popupType, setPopupType] = useState<"rating" | "support" | "announcement" | "update">("rating");
  const [triggerEvent, setTriggerEvent] = useState<"always" | "bill_settled" | "first_scan">("bill_settled");
  const [primaryText, setPrimaryText] = useState("Share Feedback");
  const [primaryUrl, setPrimaryUrl] = useState("/contact");
  const [secondaryText, setSecondaryText] = useState("Maybe Later");
  const [savingPopup, setSavingPopup] = useState(false);

  // Tab 3: Android App Remote Update Config
  const updateInfo = useQuery(api.admin.getAppUpdateInfo);
  const setUpdateConfigMutation = useMutation(api.admin.setRemoteUpdateConfig);
  const [latestVersion, setLatestVersion] = useState("1.1.0");
  const [versionCode, setVersionCode] = useState(2);
  const [minVersion, setMinVersion] = useState("1.0.0");
  const [apkStorageId, setApkStorageId] = useState("kg29abkqcwtnx5fmy39zy2ssbh8efxpw");
  const [customDownloadUrl, setCustomDownloadUrl] = useState("");
  const [changelog, setChangelog] = useState(
    "Instant Gemini 3.1 Flash Lite AI Receipt Vision, fixed status bar safe insets, official logo icons, and one-tap UPI settlement.",
  );
  const [forceUpdate, setForceUpdate] = useState(false);
  const [savingUpdate, setSavingUpdate] = useState(false);

  // Sync state when popup config loads
  useEffect(() => {
    if (currentPopupConfig) {
      setPopupEnabled(!!currentPopupConfig.enabled);
      if (currentPopupConfig.id) setPopupId(currentPopupConfig.id);
      if (currentPopupConfig.title) setPopupTitle(currentPopupConfig.title);
      if (currentPopupConfig.message) setPopupMessage(currentPopupConfig.message);
      if (currentPopupConfig.type) setPopupType(currentPopupConfig.type);
      if (currentPopupConfig.triggerEvent) setTriggerEvent(currentPopupConfig.triggerEvent);
      if (currentPopupConfig.primaryActionText) setPrimaryText(currentPopupConfig.primaryActionText);
      if (currentPopupConfig.primaryActionUrl) setPrimaryUrl(currentPopupConfig.primaryActionUrl);
      if (currentPopupConfig.secondaryActionText) setSecondaryText(currentPopupConfig.secondaryActionText);
    }
  }, [currentPopupConfig]);

  // Sync state when update config loads
  useEffect(() => {
    if (updateInfo) {
      setLatestVersion(updateInfo.latestVersion);
      setVersionCode(updateInfo.versionCode);
      setMinVersion(updateInfo.minVersion);
      setApkStorageId(updateInfo.storageId);
      if (updateInfo.customDownloadUrl) setCustomDownloadUrl(updateInfo.customDownloadUrl);
      setChangelog(updateInfo.changelog);
      setForceUpdate(updateInfo.forceUpdate);
    }
  }, [updateInfo]);

  // Handler: Broadcast
  const handleSendBroadcast = async (e: React.FormEvent) => {
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

  // Handler: Save Remote Popup
  const handleSavePopup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPopup(true);
    try {
      await setPopupMutation({
        id: popupId.trim() || `popup_${Date.now()}`,
        enabled: popupEnabled,
        title: popupTitle.trim(),
        message: popupMessage.trim(),
        type: popupType,
        triggerEvent,
        primaryActionText: primaryText.trim(),
        primaryActionUrl: primaryUrl.trim(),
        secondaryActionText: secondaryText.trim(),
      });
      toast.success(popupEnabled ? "Remote popup activated!" : "Remote popup updated & disabled.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update popup configuration");
    } finally {
      setSavingPopup(false);
    }
  };

  // Handler: Save Remote Update
  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUpdate(true);
    try {
      await setUpdateConfigMutation({
        latestVersion: latestVersion.trim(),
        versionCode: Number(versionCode),
        minVersion: minVersion.trim(),
        apkStorageId: apkStorageId.trim(),
        customDownloadUrl: customDownloadUrl.trim(),
        changelog: changelog.trim(),
        forceUpdate,
      });
      toast.success("Android remote update config saved!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save update config");
    } finally {
      setSavingUpdate(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-100 sm:text-2xl">Broadcast &amp; Engagement</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage user broadcasts, remote in-app trigger popups (support/rating), and Android APK remote updates.
        </p>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("broadcast")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
            activeTab === "broadcast"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
              : "text-gray-400 hover:bg-gray-800 hover:text-gray-200",
          )}
        >
          <Bell className="size-4" />
          Broadcast Notification
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("popup")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
            activeTab === "popup"
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
              : "text-gray-400 hover:bg-gray-800 hover:text-gray-200",
          )}
        >
          <Sparkles className="size-4" />
          Remote In-App Popup
          {popupEnabled && (
            <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("update")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
            activeTab === "update"
              ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
              : "text-gray-400 hover:bg-gray-800 hover:text-gray-200",
          )}
        >
          <Smartphone className="size-4" />
          Android Remote Updates
        </button>
      </div>

      {/* Tab 1: Broadcast Notification */}
      {activeTab === "broadcast" && (
        <div className="max-w-xl">
          <form onSubmit={handleSendBroadcast} className="rounded-lg border border-gray-800 bg-[#161b22] p-5 sm:p-6">
            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Notification Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. SplitSlip v1.1 is Live!"
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
                Delivered directly to user in-app notification inboxes.
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
      )}

      {/* Tab 2: Remote In-App Popup */}
      {activeTab === "popup" && (
        <div className="max-w-2xl">
          <form onSubmit={handleSavePopup} className="rounded-lg border border-gray-800 bg-[#161b22] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-200">Remote Popup Controls</h2>
                <p className="text-xs text-gray-500">
                  Trigger rating prompts, support dialogs, or announcements inside active user sessions.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={popupEnabled}
                  onChange={(e) => setPopupEnabled(e.target.checked)}
                  className="size-4 rounded border-gray-700 bg-[#0d1117] text-amber-500 focus:ring-amber-400"
                />
                <span className="text-xs font-bold text-amber-400">
                  {popupEnabled ? "ACTIVE (Showing)" : "DISABLED"}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Popup Type
                </label>
                <select
                  value={popupType}
                  onChange={(e) => setPopupType(e.target.value as any)}
                  className="h-10 w-full rounded border border-gray-700 bg-[#0d1117] px-3 text-sm text-gray-200 outline-none focus:border-amber-500/50"
                >
                  <option value="rating">Rating &amp; Review</option>
                  <option value="support">Help &amp; Support</option>
                  <option value="announcement">Announcement / Alert</option>
                  <option value="update">App Update Announcement</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Trigger Event
                </label>
                <select
                  value={triggerEvent}
                  onChange={(e) => setTriggerEvent(e.target.value as any)}
                  className="h-10 w-full rounded border border-gray-700 bg-[#0d1117] px-3 text-sm text-gray-200 outline-none focus:border-amber-500/50"
                >
                  <option value="always">Always on launch</option>
                  <option value="bill_settled">After a bill is settled</option>
                  <option value="first_scan">After first receipt scan</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Campaign ID (Change to re-trigger for users who dismissed previous popup)
              </label>
              <input
                value={popupId}
                onChange={(e) => setPopupId(e.target.value)}
                placeholder="e.g. rating_prompt_sept2026"
                className="h-10 w-full rounded border border-gray-700 bg-[#0d1117] px-3 text-sm text-gray-200 outline-none focus:border-amber-500/50 font-mono text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Popup Title
              </label>
              <input
                value={popupTitle}
                onChange={(e) => setPopupTitle(e.target.value)}
                placeholder="e.g. How was your experience?"
                className="h-10 w-full rounded border border-gray-700 bg-[#0d1117] px-3 text-sm text-gray-200 outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Popup Message Body
              </label>
              <textarea
                value={popupMessage}
                onChange={(e) => setPopupMessage(e.target.value)}
                rows={3}
                placeholder="Explain the reason for the popup..."
                className="w-full rounded border border-gray-700 bg-[#0d1117] px-3 py-2 text-sm text-gray-200 outline-none focus:border-amber-500/50 resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Primary Action Button Text
                </label>
                <input
                  value={primaryText}
                  onChange={(e) => setPrimaryText(e.target.value)}
                  placeholder="e.g. Give 5 Stars / Contact Us"
                  className="h-10 w-full rounded border border-gray-700 bg-[#0d1117] px-3 text-sm text-gray-200 outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Primary Action Link / Route
                </label>
                <input
                  value={primaryUrl}
                  onChange={(e) => setPrimaryUrl(e.target.value)}
                  placeholder="e.g. /contact or https://..."
                  className="h-10 w-full rounded border border-gray-700 bg-[#0d1117] px-3 text-sm text-gray-200 outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-gray-800">
              <p className="text-[10px] text-gray-500">
                Popups remember dismissals locally so users are never spammed.
              </p>
              <button
                type="submit"
                disabled={savingPopup}
                className="flex items-center gap-2 rounded bg-amber-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {savingPopup ? "Saving…" : "Save Popup Config"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Android Remote Updates */}
      {activeTab === "update" && (
        <div className="max-w-2xl space-y-6">
          {/* Storage Details Banner */}
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Smartphone className="size-5 text-blue-400" />
                  <h3 className="text-sm font-bold text-blue-200">
                    SplitSlip Android App Distribution
                  </h3>
                </div>
                <p className="mt-1 text-xs text-blue-300/80 leading-relaxed">
                  APK is stored securely on Convex File Storage. Direct download is 100% available without login.
                </p>
              </div>

              {updateInfo?.downloadUrl && (
                <a
                  href={updateInfo.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex shrink-0 items-center gap-1.5 rounded border border-blue-500/30 bg-blue-500/20 px-3 py-1.5 text-xs font-semibold text-blue-200 hover:bg-blue-500/30"
                >
                  <Download className="size-3.5" />
                  Test Download APK
                </a>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px] text-gray-300 bg-[#0d1117] p-3 rounded border border-gray-800">
              <div>
                <span className="text-gray-500 block">Convex Storage ID:</span>
                <span className="text-amber-300 font-bold">{apkStorageId}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Permanent Vanity URL:</span>
                <span className="text-emerald-400 truncate block">
                  https://frugal-hornet-670.convex.site/download/apk
                </span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveUpdate} className="rounded-lg border border-gray-800 bg-[#161b22] p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-200 border-b border-gray-800 pb-3">
              Version &amp; OTA Update Settings
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Latest Version Name
                </label>
                <input
                  value={latestVersion}
                  onChange={(e) => setLatestVersion(e.target.value)}
                  placeholder="1.1.0"
                  className="h-10 w-full rounded border border-gray-700 bg-[#0d1117] px-3 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Version Code (Integer)
                </label>
                <input
                  type="number"
                  value={versionCode}
                  onChange={(e) => setVersionCode(Number(e.target.value))}
                  placeholder="2"
                  className="h-10 w-full rounded border border-gray-700 bg-[#0d1117] px-3 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                />
                <p className="mt-1 text-[10px] text-gray-500">Increments trigger update prompts</p>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Minimum Supported Version
                </label>
                <input
                  value={minVersion}
                  onChange={(e) => setMinVersion(e.target.value)}
                  placeholder="1.0.0"
                  className="h-10 w-full rounded border border-gray-700 bg-[#0d1117] px-3 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Direct APK Download Link (Overrides Storage ID if provided)
              </label>
              <input
                value={customDownloadUrl}
                onChange={(e) => setCustomDownloadUrl(e.target.value)}
                placeholder="https://... (e.g. GitHub Releases, Google Drive, or CDN URL)"
                className="h-10 w-full rounded border border-gray-700 bg-[#0d1117] px-3 text-sm text-gray-200 outline-none focus:border-blue-500/50 font-mono text-xs"
              />
              <p className="mt-1 text-[10px] text-gray-500">
                Instantly changes the download link on Landing Page, Footer, &amp; in-app update banner with zero code deployments.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                OR Convex Storage File ID
              </label>
              <input
                value={apkStorageId}
                onChange={(e) => setApkStorageId(e.target.value)}
                placeholder="kg29abkqcwtnx5fmy39zy2ssbh8efxpw"
                className="h-10 w-full rounded border border-gray-700 bg-[#0d1117] px-3 text-sm text-gray-200 outline-none focus:border-blue-500/50 font-mono text-xs"
              />
              <p className="mt-1 text-[10px] text-gray-500">
                Used if no custom direct link is entered above (Resolves via Convex File Storage API).
              </p>
            </div>

            {/* Live Effective URL Preview */}
            <div className="rounded border border-gray-800 bg-[#0d1117] p-3 text-xs">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block">
                Active Live Download URL (What users currently get):
              </span>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="font-mono text-emerald-400 truncate select-all">
                  {updateInfo?.downloadUrl || "https://frugal-hornet-670.convex.site/download/apk"}
                </span>
                {updateInfo?.downloadUrl && (
                  <a
                    href={updateInfo.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 rounded bg-gray-800 px-2.5 py-1 text-[11px] font-semibold text-gray-200 hover:bg-gray-700"
                  >
                    <Download className="size-3" />
                    Test Link
                  </a>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Release Notes / Changelog
              </label>
              <textarea
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                rows={3}
                placeholder="What's new in this version..."
                className="w-full rounded border border-gray-700 bg-[#0d1117] px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500/50 resize-y"
              />
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-gray-800">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={forceUpdate}
                  onChange={(e) => setForceUpdate(e.target.checked)}
                  className="size-4 rounded border-gray-700 bg-[#0d1117] text-red-500 focus:ring-red-400"
                />
                <span className="text-xs font-semibold text-gray-300">
                  Force Update (Blocks app usage until user updates)
                </span>
              </label>

              <button
                type="submit"
                disabled={savingUpdate}
                className="flex items-center gap-2 rounded bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingUpdate ? "Saving…" : "Save Update Settings"}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}
