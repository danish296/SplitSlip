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
  ExternalLink,
  Megaphone,
  CheckCircle2,
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
  const [broadcastType, setBroadcastType] = useState<
    "feature_announcement" | "system_update" | "general_announcement" | "broadcast"
  >("feature_announcement");
  const [broadcastLink, setBroadcastLink] = useState("");
  const [broadcastLinkText, setBroadcastLinkText] = useState("Learn More");
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
        notificationType: broadcastType,
        link: broadcastLink.trim() || undefined,
        linkText: broadcastLinkText.trim() || undefined,
      });
      setLastResult(result);
      toast.success(`Broadcast sent to ${result.sent} users`);
      setTitle("");
      setMessage("");
      setBroadcastLink("");
      setBroadcastLinkText("Learn More");
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
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6 max-w-5xl">
          <form onSubmit={handleSendBroadcast} className="rounded-lg border border-gray-800 bg-[#161b22] p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-200">Compose Broadcast Notification</h2>
              <p className="text-xs text-gray-500">
                Delivered directly to user in-app notification inboxes across web and Android devices.
              </p>
            </div>

            {/* Notification Kind / Type Selector */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Notification Category / Kind
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBroadcastType("feature_announcement");
                    if (!broadcastLinkText || broadcastLinkText === "Download Update") {
                      setBroadcastLinkText("Explore Feature");
                    }
                  }}
                  className={cn(
                    "flex flex-col items-start gap-1 p-3 rounded border text-left transition-all",
                    broadcastType === "feature_announcement"
                      ? "border-amber-500 bg-amber-500/10 text-amber-300 shadow-sm"
                      : "border-gray-800 bg-[#0d1117] text-gray-400 hover:border-gray-700 hover:text-gray-200"
                  )}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Sparkles className="size-3.5 text-amber-400" />
                    Feature Update
                  </div>
                  <span className="text-[10px] text-gray-500 leading-tight">
                    Announce new features, improvements & tools
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBroadcastType("system_update");
                    if (!broadcastLink && updateInfo?.downloadUrl) {
                      setBroadcastLink(updateInfo.downloadUrl);
                    }
                    setBroadcastLinkText("Download Update");
                  }}
                  className={cn(
                    "flex flex-col items-start gap-1 p-3 rounded border text-left transition-all",
                    broadcastType === "system_update"
                      ? "border-blue-500 bg-blue-500/10 text-blue-300 shadow-sm"
                      : "border-gray-800 bg-[#0d1117] text-gray-400 hover:border-gray-700 hover:text-gray-200"
                  )}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Download className="size-3.5 text-blue-400" />
                    App / System Update
                  </div>
                  <span className="text-[10px] text-gray-500 leading-tight">
                    Notify users of new APK releases or OTA updates
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBroadcastType("general_announcement");
                    if (!broadcastLinkText || broadcastLinkText === "Download Update") {
                      setBroadcastLinkText("Read More");
                    }
                  }}
                  className={cn(
                    "flex flex-col items-start gap-1 p-3 rounded border text-left transition-all",
                    broadcastType === "general_announcement" || broadcastType === "broadcast"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-300 shadow-sm"
                      : "border-gray-800 bg-[#0d1117] text-gray-400 hover:border-gray-700 hover:text-gray-200"
                  )}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Megaphone className="size-3.5 text-emerald-400" />
                    Announcement
                  </div>
                  <span className="text-[10px] text-gray-500 leading-tight">
                    Service alerts, general notices & maintenance
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Notification Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. SplitSlip v1.1.1 is Live with Gemini AI OCR!"
                className="h-10 w-full rounded border border-gray-700 bg-[#0d1117] px-3 text-sm text-gray-200 outline-none placeholder:text-gray-600 focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Message Body
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="The notification message shown to all users. Supports multiline notes..."
                className="w-full rounded border border-gray-700 bg-[#0d1117] px-3 py-2 text-sm text-gray-200 outline-none placeholder:text-gray-600 focus:border-emerald-500/50 resize-y"
              />
            </div>

            {/* Optional Action Link & Button Text */}
            <div className="rounded border border-gray-800 bg-[#0d1117]/60 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Attached Action Link (Optional)
                </span>
                <span className="text-[10px] text-gray-500">Tapping notification opens this link</span>
              </div>

              <div>
                <input
                  value={broadcastLink}
                  onChange={(e) => setBroadcastLink(e.target.value)}
                  placeholder="https://... or /home or /contact"
                  className="h-9 w-full rounded border border-gray-700 bg-[#0d1117] px-3 text-xs text-gray-200 outline-none placeholder:text-gray-600 focus:border-emerald-500/50 font-mono"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-[10px] text-gray-500 mr-1">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setBroadcastLink(updateInfo?.downloadUrl || "https://frugal-hornet-670.convex.site/download/apk");
                    setBroadcastLinkText("Download APK (v" + (updateInfo?.latestVersion || "1.1.1") + ")");
                    setBroadcastType("system_update");
                  }}
                  className="rounded bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[10px] font-medium text-blue-300 hover:bg-blue-500/20"
                >
                  Latest APK Download
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBroadcastLink("/contact");
                    setBroadcastLinkText("Contact Support");
                  }}
                  className="rounded bg-gray-800 border border-gray-700 px-2 py-0.5 text-[10px] font-medium text-gray-300 hover:bg-gray-700"
                >
                  Contact Desk
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBroadcastLink("/home");
                    setBroadcastLinkText("Start Splitting");
                  }}
                  className="rounded bg-gray-800 border border-gray-700 px-2 py-0.5 text-[10px] font-medium text-gray-300 hover:bg-gray-700"
                >
                  App Home
                </button>
                {broadcastLink && (
                  <button
                    type="button"
                    onClick={() => {
                      setBroadcastLink("");
                      setBroadcastLinkText("");
                    }}
                    className="rounded text-gray-500 hover:text-gray-400 text-[10px] underline ml-1"
                  >
                    Clear link
                  </button>
                )}
              </div>

              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-500">
                  Button / Link Label
                </label>
                <input
                  value={broadcastLinkText}
                  onChange={(e) => setBroadcastLinkText(e.target.value)}
                  placeholder="e.g. Download Now, Try It Out, View Details"
                  className="h-9 w-full rounded border border-gray-700 bg-[#0d1117] px-3 text-xs text-gray-200 outline-none placeholder:text-gray-600 focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-[10px] text-gray-500">
                Delivered in real-time to all user devices.
              </p>
              <button
                type="submit"
                disabled={sending}
                className="flex items-center gap-2 rounded bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {sending ? (
                  "Broadcasting…"
                ) : (
                  <>
                    <Send className="size-3.5" />
                    Send Broadcast
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Live Preview Side Box */}
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-800 bg-[#161b22] p-5 sm:p-6">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-2">
                Live In-App Notification Preview
              </span>
              <p className="text-xs text-gray-500 mb-4">
                This is how the notification card appears inside user notification inboxes:
              </p>

              {/* Notification Card Preview */}
              <div className="rounded-md border border-gray-700 bg-[#0d1117] p-3.5 flex items-start gap-3 shadow-md">
                <span className="flex size-8 shrink-0 items-center justify-center rounded border border-gray-700 bg-[#161b22]">
                  {broadcastType === "system_update" && <Download className="size-4 text-blue-400" />}
                  {broadcastType === "feature_announcement" && <Sparkles className="size-4 text-amber-400" />}
                  {(broadcastType === "general_announcement" || broadcastType === "broadcast") && <Megaphone className="size-4 text-emerald-400" />}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-xs font-bold text-gray-200 truncate">
                        {title || "SplitSlip Announcement Title"}
                      </p>
                      {broadcastType === "system_update" && (
                        <span className="shrink-0 rounded bg-blue-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-blue-400 border border-blue-500/20">
                          Update
                        </span>
                      )}
                      {broadcastType === "feature_announcement" && (
                        <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-400 border border-amber-500/20">
                          New
                        </span>
                      )}
                      {(broadcastType === "general_announcement" || broadcastType === "broadcast") && (
                        <span className="shrink-0 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                          Notice
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-gray-500 shrink-0">
                      Just now
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs text-gray-400 leading-relaxed whitespace-pre-line">
                    {message || "The notification message preview will update here as you type..."}
                  </p>

                  {broadcastLink && (
                    <div className="mt-3 inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                      <ExternalLink className="size-3" />
                      <span>{broadcastLinkText || "View Details"}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {lastResult && (
              <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-300">Broadcast Sent Successfully</p>
                  <p className="text-[11px] text-emerald-400/80">
                    Delivered to <span className="font-bold">{lastResult.sent}</span> registered user inboxes.
                  </p>
                </div>
              </div>
            )}
          </div>
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
