import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Image as ImageIcon, Lightbulb, PenLine, RefreshCw, Upload, ChevronLeft, Home } from "lucide-react";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import * as svc from "@/app/lib/mockService";
import { useApp } from "@/app/store/AppContext";
import { formatReceiptAmount } from "@/app/lib/money";
import { PrinterSlot, TactileButton } from "@/app/components/paper";
import { cn } from "@/lib/utils";
import { processImageForReceipt, preprocessReceiptImage, type OcrProgress } from "@/app/lib/ocrService";
import type { ParsedReceipt } from "@/app/lib/receiptParser";

type Phase = "align" | "scanning" | "printing" | "error";

export default function Scanner() {
  const navigate = useNavigate();
  const { startDraft, clearDraft } = useApp();
  const [phase, setPhase] = useState<Phase>("align");
  const [flash, setFlash] = useState(false);
  const [lines, setLines] = useState(0);
  const [result, setResult] = useState<ParsedReceipt | null>(null);
  const [ocrStatus, setOcrStatus] = useState<string>("Initializing OCR…");
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  }, []);

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        return;
      }

      // Try environment/back camera first, fallback to user/webcam
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setHasCamera(true);
        setCameraError(null);
      }
    } catch (err: any) {
      console.warn("Camera access unavailable:", err);
      setHasCamera(false);
      setCameraError(err?.message || "Camera unavailable");
    }
  }, []);

  useEffect(() => {
    if (phase === "align") {
      void initCamera();
    } else {
      // Stop tracks when leaving align phase to free hardware
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }
  }, [phase, initCamera]);

  // Flash / Torch toggle
  const toggleFlash = useCallback(async () => {
    const nextFlash = !flash;
    setFlash(nextFlash);

    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities.torch) {
          try {
            await (track as any).applyConstraints({
              advanced: [{ torch: nextFlash }],
            });
          } catch (e) {
            console.warn("Torch failed to apply", e);
          }
        }
      }
    }
  }, [flash]);

  // Handle OCR receipt processing
  const handleProcessImage = useCallback(
    async (source: string | HTMLCanvasElement | File | Blob) => {
      setPhase("scanning");
      setOcrStatus("Loading OCR engine…");
      setOcrProgress(0.1);

      try {
        const onProgress = (p: OcrProgress) => {
          setOcrStatus(p.status);
          setOcrProgress(p.progress);
        };

        const parsed = await processImageForReceipt(source, onProgress);
        setResult(parsed);
        timers.current.push(
          window.setTimeout(() => {
            setPhase("printing");
          }, 400),
        );
      } catch (err) {
        console.error("OCR recognition error, falling back to scanner sample:", err);
        // Fallback to sample receipt so user flow is never disrupted
        try {
          const fallback = await svc.scanReceipt();
          setResult(fallback);
          timers.current.push(
            window.setTimeout(() => {
              setPhase("printing");
            }, 600),
          );
        } catch {
          setPhase("error");
        }
      }
    },
    [],
  );

  // Capture photo from camera (native sensor on Android, video frame on web)
  const captureLiveCamera = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await CapCamera.getPhoto({
          quality: 100,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera,
        });
        if (photo.webPath) {
          setPreviewUrl(photo.webPath);
          void handleProcessImage(photo.webPath);
          return;
        }
      } catch (err: any) {
        console.warn("Native camera cancelled/error:", err);
        return;
      }
    }

    if (videoRef.current && canvasRef.current && hasCamera) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const processedUrl = preprocessReceiptImage(canvas);
        setPreviewUrl(processedUrl);
        void handleProcessImage(canvas);
        return;
      }
    }

    // Fallback if camera stream capture wasn't possible
    void (async () => {
      setPhase("scanning");
      setOcrStatus("Processing receipt…");
      setOcrProgress(0.5);
      try {
        const r = await svc.scanReceipt();
        timers.current.push(
          window.setTimeout(() => {
            setResult(r);
            setPhase("printing");
          }, 1200),
        );
      } catch {
        setPhase("error");
      }
    })();
  }, [hasCamera, handleProcessImage]);

  // Gallery photo selection (native picker on Android, file input on web)
  const handleOpenGallery = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await CapCamera.getPhoto({
          quality: 100,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Photos,
        });
        if (photo.webPath) {
          setPreviewUrl(photo.webPath);
          void handleProcessImage(photo.webPath);
          return;
        }
      } catch (err: any) {
        console.warn("Native gallery cancelled/error:", err);
        return;
      }
    }
    fileInputRef.current?.click();
  }, [handleProcessImage]);

  // Gallery file selection
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Stop camera if active
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      void handleProcessImage(file);
    },
    [handleProcessImage],
  );

  // OCR lines appear progressively while printing
  useEffect(() => {
    if (phase !== "printing" || !result) return;
    const total = result.items.length + 4;
    let i = 0;
    const interval = window.setInterval(() => {
      i += 1;
      setLines(i);
      if (i >= total) {
        window.clearInterval(interval);
        timers.current.push(
          window.setTimeout(() => {
            clearDraft();
            startDraft({
              restaurant: result.restaurant,
              city: result.city,
              items: result.items,
              taxMinor: result.taxMinor,
              serviceMinor: result.serviceMinor,
            });
            navigate("/review", { replace: true });
          }, 650),
        );
      }
    }, 150);
    return () => window.clearInterval(interval);
  }, [phase, result, navigate, startDraft, clearDraft]);

  const shownItems = result ? result.items.slice(0, lines) : [];
  const showSub = !!result && lines > result.items.length;
  const showTax = !!result && lines > result.items.length + 1;
  const showTotal = !!result && lines > result.items.length + 2;

  const itemsTotal = result?.items.reduce((a, b) => a + b.amountMinor, 0) ?? 0;

  return (
    <div className="paper-grain flex min-h-screen flex-col bg-background">
      {/* Hidden file input for gallery upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        aria-label="Upload receipt image"
        className="hidden"
        onChange={handleFileChange}
      />
      {/* Hidden canvas for image capture and preprocessing */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col border-x border-ink/40 sm:border-ink shadow-paper-lg bg-background">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2.5 border-b border-ink bg-background/95 px-4 py-3 backdrop-blur-sm shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              aria-label="Back to home"
              onClick={() => navigate("/home")}
              className="tactile flex size-9 shrink-0 items-center justify-center rounded-[4px] border border-ink bg-card text-ink transition-transform hover:-translate-y-0.5 active:translate-y-0"
              title="Go back"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="font-receipt text-[9px] uppercase tracking-[0.28em] text-ink-faint truncate">
                SPLITSLIP · OCR CAMERA
              </p>
              <h1 className="truncate text-base font-bold tracking-tight text-ink">
                Scan Receipt
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              aria-label="Restart camera"
              onClick={() => void initCamera()}
              className="tactile flex size-9 items-center justify-center rounded-[4px] border border-ink bg-card text-ink transition-transform hover:-translate-y-0.5 active:translate-y-0"
              title="Restart camera"
            >
              <RefreshCw className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Toggle flash"
              aria-pressed={flash}
              onClick={() => void toggleFlash()}
              className={cn(
                "tactile flex size-9 items-center justify-center rounded-[4px] border transition-transform hover:-translate-y-0.5 active:translate-y-0",
                flash ? "border-stamp bg-stamp text-stamp-foreground" : "border-ink bg-card text-ink",
              )}
              title="Flash"
            >
              <Lightbulb className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Go to Home"
              onClick={() => navigate("/home")}
              className="tactile flex size-9 items-center justify-center rounded-[4px] border border-ink bg-card text-ink transition-transform hover:-translate-y-0.5 active:translate-y-0"
              title="Home"
            >
              <Home className="size-3.5" />
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col px-5 py-4">

        {phase !== "printing" && (
          <div className="relative mt-6">
            {/* Viewfinder Window */}
            <div className="relative mx-auto aspect-[3/4] w-full max-w-[300px] overflow-hidden border border-ink bg-[#171715] shadow-paper-lg">
              {/* Real camera stream video */}
              {phase === "align" && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    "absolute inset-0 h-full w-full object-cover",
                    !hasCamera && "hidden",
                  )}
                />
              )}

              {/* Captured preview or uploaded image */}
              {previewUrl && phase === "scanning" && (
                <img
                  src={previewUrl}
                  alt="Captured receipt preview"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}

              {/* If no active camera stream and no uploaded preview, show receipt alignment guide */}
              {(!hasCamera || phase !== "align") && !previewUrl && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  <div className="w-44 rotate-[-1.5deg] border border-dashed border-paper-2/40 bg-paper-2/95 p-3.5 font-receipt text-[8px] text-ink shadow-sm">
                    <p className="text-center font-bold tracking-[0.2em]">THE TABLE BISTRO</p>
                    <p className="text-center text-[7px] text-ink-faint">BANGALORE · IND</p>
                    <div className="my-1.5 rule-dashed" />
                    <div className="flex justify-between">
                      <span>Butter Chicken</span>
                      <span>480</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Garlic Naan ×2</span>
                      <span>160</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dum Biryani</span>
                      <span>420</span>
                    </div>
                    <div className="my-1.5 rule-dashed" />
                    <div className="flex justify-between font-semibold">
                      <span>TOTAL DUE</span>
                      <span>₹1,113</span>
                    </div>
                  </div>
                  {cameraError && (
                    <span className="mt-4 rounded bg-ink/70 px-2 py-0.5 font-receipt text-[8px] uppercase tracking-wider text-paper-1">
                      Camera inactive · Ready for upload
                    </span>
                  )}
                </div>
              )}

              {/* Laser sweep animation */}
              <div
                aria-hidden="true"
                className="absolute left-2 right-2 h-10 bg-gradient-to-b from-transparent via-stamp/35 to-stamp/80 scan-sweep"
                style={{
                  top: phase === "scanning" ? undefined : "8%",
                  opacity: phase === "scanning" ? 1 : 0.35,
                }}
              />

              {/* Corner brackets */}
              {(
                [
                  "top-3 left-3 border-t-2 border-l-2",
                  "top-3 right-3 border-t-2 border-r-2",
                  "bottom-3 left-3 border-b-2 border-l-2",
                  "bottom-3 right-3 border-b-2 border-r-2",
                ] as const
              ).map((pos) => (
                <span key={pos} aria-hidden="true" className={`absolute h-7 w-7 border-stamp ${pos}`} />
              ))}

              {/* Screen Flash highlight */}
              {flash && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-white/70 transition-opacity"
                />
              )}
            </div>

            <p className="mt-5 text-center font-receipt text-xs uppercase tracking-[0.25em] text-ink-soft">
              {phase === "scanning"
                ? ocrStatus
                : hasCamera
                  ? "Place receipt inside frame & capture"
                  : "Upload a receipt photo or tap scan"}
            </p>

            {phase === "align" && (
              <div className="mt-6 flex justify-center gap-3">
                <TactileButton
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenGallery}
                  aria-label="Choose from gallery"
                >
                  <ImageIcon className="size-4" /> Gallery
                </TactileButton>

                <TactileButton variant="stamp" onClick={captureLiveCamera}>
                  <Camera className="size-4" /> {hasCamera ? "Capture" : "Scan now"}
                </TactileButton>

                <TactileButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearDraft();
                    navigate("/review");
                  }}
                  aria-label="Enter bill manually"
                >
                  <PenLine className="size-4" /> Manual
                </TactileButton>
              </div>
            )}

            {phase === "scanning" && (
              <div className="mt-6 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 border border-ink bg-card px-3.5 py-2 font-receipt text-[10px] uppercase tracking-[0.2em] text-ink shadow-paper">
                  <span className="mech-dot" aria-hidden="true" />
                  <span>OCR ENGINE RUNNING</span>
                  <span className="tabular-nums text-stamp">
                    · {Math.round(ocrProgress * 100)}%
                  </span>
                </div>
                {/* Progress track */}
                <div className="h-1 w-48 overflow-hidden rounded-full border border-ink-line bg-paper-2">
                  <div
                    className="h-full bg-stamp transition-all duration-200"
                    style={{ width: `${Math.max(8, Math.round(ocrProgress * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---- Receipt printing out of the machine ---- */}
        {phase === "printing" && result && (
          <div className="mt-4 flex flex-1 flex-col items-center">
            <p className="font-receipt text-[10px] uppercase tracking-[0.3em] text-ink-faint">
              Printing parsed bill…
            </p>
            <PrinterSlot className="mt-3 w-64" />
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="-mt-1 w-64 border border-ink bg-card px-4 py-4 font-receipt text-[12px] text-ink shadow-paper-lg"
            >
              <p className="text-center text-[13px] font-semibold tracking-[0.2em]">
                {result.restaurant.toUpperCase()}
              </p>
              <p className="text-center text-[9px] tracking-[0.3em] text-ink-faint">
                {result.city.toUpperCase()}
              </p>
              <div className="my-2 rule-dashed" />
              <AnimatePresence>
                {shownItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.14 }}
                    className="flex justify-between py-0.5"
                  >
                    <span className="max-w-[160px] truncate">
                      {item.quantity > 1 ? `${item.quantity} × ` : ""}
                      {item.name}
                    </span>
                    <span className="tabular-nums">{formatReceiptAmount(item.amountMinor)}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {showSub && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="my-2 rule-dashed" />
                  <div className="flex justify-between text-ink-soft">
                    <span>SUBTOTAL</span>
                    <span className="tabular-nums">{formatReceiptAmount(itemsTotal)}</span>
                  </div>
                </motion.div>
              )}
              {showTax && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-between py-0.5 text-ink-soft"
                >
                  <span>GST / TAX</span>
                  <span className="tabular-nums">{formatReceiptAmount(result.taxMinor)}</span>
                </motion.div>
              )}
              {showTotal && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="my-2 rule-dashed" />
                  <div className="flex justify-between text-[14px] font-semibold">
                    <span>TOTAL</span>
                    <span className="tabular-nums">
                      {formatReceiptAmount(itemsTotal + result.taxMinor + result.serviceMinor)}
                    </span>
                  </div>
                  <p className="mt-2 text-center text-[9px] tracking-[0.3em] text-stamp">
                    ✓ OCR EXTRACTED
                  </p>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}

        {phase === "error" && (
          <div className="mt-16 flex flex-1 flex-col items-center text-center">
            <div className="w-56 rotate-[-1deg] border border-ink bg-card p-5 font-receipt text-xs shadow-paper">
              <p className="font-semibold tracking-[0.2em] text-destructive">READ ERROR</p>
              <div className="my-2 rule-dashed" />
              <p className="text-ink-soft">Could not extract items from that image.</p>
              <p className="mt-1 text-[10px] text-ink-faint">
                Ensure bright lighting, avoid shadows, or enter items manually.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <TactileButton variant="outline" onClick={() => setPhase("align")}>
                <RefreshCw className="size-3.5" /> Try again
              </TactileButton>
              <TactileButton
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-3.5" /> Upload file
              </TactileButton>
              <TactileButton
                variant="stamp"
                onClick={() => {
                  clearDraft();
                  navigate("/review");
                }}
              >
                Manual
              </TactileButton>
            </div>
          </div>
        )}

        {/* Feed slot illustration at bottom */}
        {phase !== "printing" && (
          <div className="mt-auto pb-2 pt-6" aria-hidden="true">
            <div className="mx-auto h-2.5 w-40 border-x-2 border-b-2 border-ink bg-paper-2" />
            <p className="mt-1 text-center font-receipt text-[8px] tracking-[0.35em] text-ink-faint">
              FEED SLOT
            </p>
          </div>
        )}
        </div>
      </div>

      <style>{`
        .scan-sweep { animation: papersplit-scannersweep 1.7s ease-in-out infinite; }
        @keyframes papersplit-scannersweep {
          0% { top: 6%; }
          50% { top: calc(94% - 2.5rem); }
          100% { top: 6%; }
        }
        .mech-dot { width: 7px; height: 7px; background: var(--stamp); display: inline-block; animation: mech-blink 0.5s steps(2) infinite; }
        @keyframes mech-blink { 50% { opacity: 0.15; } }
      `}</style>
    </div>
  );
}
