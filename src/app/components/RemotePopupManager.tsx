import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router";
import {
  Download,
  Sparkles,
  Star,
  MessageCircleQuestion,
  Megaphone,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Current installed app version
export const CURRENT_APP_VERSION = "1.1.1";
export const CURRENT_VERSION_CODE = 3;

export function RemotePopupManager() {
  const navigate = useNavigate();
  const updateInfo = useQuery(api.admin.getAppUpdateInfo);
  const remotePopup = useQuery(api.admin.getRemotePopup);

  const [dismissedUpdate, setDismissedUpdate] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [starRating, setStarRating] = useState(5);

  // Check for Remote App Update (for native Android APK)
  const isOutdated =
    Capacitor.isNativePlatform() &&
    updateInfo &&
    updateInfo.versionCode > CURRENT_VERSION_CODE;

  const showUpdateBanner = isOutdated && !dismissedUpdate;

  // Remote popup trigger logic
  useEffect(() => {
    if (!remotePopup || !remotePopup.enabled) {
      setShowPopup(false);
      return;
    }

    const dismissedKey = `split_dismissed_popup_${remotePopup.id}`;
    if (localStorage.getItem(dismissedKey)) {
      setShowPopup(false);
      return;
    }

    // Delay presentation slightly so user feels welcomed, not interrupted
    const timer = setTimeout(() => {
      setShowPopup(true);
    }, 1800);

    return () => clearTimeout(timer);
  }, [remotePopup]);

  const handleDismissPopup = () => {
    if (remotePopup?.id) {
      localStorage.setItem(`split_dismissed_popup_${remotePopup.id}`, "true");
    }
    setShowPopup(false);
  };

  const handlePrimaryAction = () => {
    if (!remotePopup) return;
    handleDismissPopup();

    if (remotePopup.primaryActionUrl.startsWith("http")) {
      window.open(remotePopup.primaryActionUrl, "_blank");
    } else {
      navigate(remotePopup.primaryActionUrl);
    }
  };

  const handleDownloadUpdate = () => {
    if (updateInfo?.downloadUrl) {
      window.open(updateInfo.downloadUrl, "_system");
    }
  };

  return (
    <>
      {/* 1. Remote App Update Prompt Banner (for native Android app) */}
      <AnimatePresence>
        {showUpdateBanner && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed inset-x-0 top-0 z-50 mx-auto max-w-md bg-stamp px-4 py-2.5 text-stamp-foreground shadow-paper-lg"
            style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top, 0px))" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="size-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-tight truncate">
                    Update to SplitSlip v{updateInfo.latestVersion}
                  </p>
                  <p className="text-[10px] opacity-90 truncate">
                    {updateInfo.changelog || "New features and AI improvements"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadUpdate}
                  className="tactile flex items-center gap-1 rounded bg-background px-2.5 py-1 text-[11px] font-bold text-ink hover:opacity-90"
                >
                  <Download className="size-3" /> Update
                </button>
                {!updateInfo.forceUpdate && (
                  <button
                    type="button"
                    onClick={() => setDismissedUpdate(true)}
                    className="p-1 opacity-70 hover:opacity-100"
                    aria-label="Dismiss update"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Remote Modal Popup Trigger (Rating / Support / Announcement) */}
      <AnimatePresence>
        {showPopup && remotePopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              className="relative w-full max-w-sm border-2 border-ink bg-card p-6 shadow-paper-xl font-receipt"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={handleDismissPopup}
                className="absolute right-3 top-3 rounded p-1 text-ink-faint hover:text-ink"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>

              {/* Icon Header */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center border border-ink bg-stamp/10 text-stamp">
                  {remotePopup.type === "rating" && <Star className="size-5 fill-stamp" />}
                  {remotePopup.type === "support" && <MessageCircleQuestion className="size-5" />}
                  {remotePopup.type === "announcement" && <Megaphone className="size-5" />}
                  {remotePopup.type === "update" && <Sparkles className="size-5" />}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-ink-faint">
                    {remotePopup.type === "rating"
                      ? "FEEDBACK & RATING"
                      : remotePopup.type === "support"
                        ? "NEED SUPPORT?"
                        : "ANNOUNCEMENT"}
                  </p>
                  <h3 className="text-base font-bold text-ink leading-snug">
                    {remotePopup.title}
                  </h3>
                </div>
              </div>

              <div className="my-3 rule-dashed" />

              <p className="text-xs leading-relaxed text-ink-soft">
                {remotePopup.message}
              </p>

              {/* Star Rating Interactive Selector */}
              {remotePopup.type === "rating" && (
                <div className="my-4 flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStarRating(s)}
                      className="p-1 transition-transform hover:scale-115 active:scale-95"
                      aria-label={`Rate ${s} stars`}
                    >
                      <Star
                        className={cn(
                          "size-6",
                          s <= starRating
                            ? "fill-stamp text-stamp"
                            : "text-ink-line",
                        )}
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="my-4 rule-dashed" />

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  className="tactile flex w-full items-center justify-center gap-2 border border-ink bg-stamp py-2.5 text-xs font-bold text-stamp-foreground shadow-paper transition-transform active:translate-y-0.5"
                >
                  {remotePopup.primaryActionText || "Confirm"}
                  <ChevronRight className="size-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleDismissPopup}
                  className="py-1.5 text-center text-[11px] text-ink-faint hover:text-ink underline"
                >
                  {remotePopup.secondaryActionText || "Maybe later"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
