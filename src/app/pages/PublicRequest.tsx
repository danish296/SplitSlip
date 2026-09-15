import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import * as svc from "@/app/lib/mockService";
import { formatDateLong, formatINR } from "@/app/lib/money";
import { ScreenShell } from "@/app/components/Shell";
import { TactileButton } from "@/app/components/paper";
import {
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCw,
  Home,
  Copy,
  Check,
  QrCode,
} from "lucide-react";

type RequestData = {
  id: string;
  billId: string;
  payer: { name: string; upiId?: string };
  contact: { id: string; name: string; isRegistered: boolean; channel: string };
  amountMinor: number;
  billContext: { restaurant: string; totalMinor: number; date: string; itemCount: number };
  createdAt: string;
  expiresAt: string;
  status: "sent" | "paid" | "expired" | "failed";
  rawStatus?: string;
  paymentReference?: string;
  upiLink?: string;
  claim?: { id: string; utr: string; claimedAmountMinor: number; status: string; createdAt: string } | null;
};

export default function PublicRequest() {
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId: string }>();
  const [request, setRequest] = useState<RequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [utr, setUtr] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);

  function copyUpiId() {
    if (!request?.payer.upiId) return;
    navigator.clipboard.writeText(request.payer.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  }

  async function loadRequest() {
    if (!requestId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const r = await svc.getPaymentRequest(requestId);
    if (!r) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setRequest(r as unknown as RequestData);
    if (r.claim?.utr) setUtr(r.claim.utr);
    setLoading(false);
  }

  useEffect(() => {
    void loadRequest();
  }, [requestId]);

  async function handleClaimSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!request || !utr.trim()) return;
    setSubmittingClaim(true);
    setClaimError(null);
    setClaimSuccess(false);
    try {
      await svc.claimPayment(request.id, utr.trim(), request.amountMinor);
      await loadRequest();
      setClaimSuccess(true);
    } catch (err: any) {
      setClaimError(err?.message || "Failed to submit payment claim. Please check UTR.");
    } finally {
      setSubmittingClaim(false);
    }
  }

  if (loading) {
    return (
      <ScreenShell title="Payment Slip" overline="SPLITSLIP" onBack={() => navigate("/home")}>
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
          <RotateCw className="size-6 animate-spin text-stamp" />
          <p className="mt-3 font-receipt text-[11px] uppercase tracking-[0.3em] text-ink-faint">
            Fetching slip…
          </p>
        </div>
      </ScreenShell>
    );
  }

  if (notFound || !request) {
    return (
      <ScreenShell title="Slip Not Found" overline="SPLITSLIP" onBack={() => navigate("/home")}>
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
          <div className="w-64 border border-ink bg-card p-5 font-receipt text-xs shadow-paper">
            <p className="font-semibold tracking-[0.2em] text-ink">SLIP NOT FOUND</p>
            <div className="my-2 rule-dashed" />
            <p className="text-ink-soft">
              This payment link doesn't exist or has expired.
            </p>
            <div className="mt-4">
              <TactileButton variant="stamp" size="sm" full onClick={() => navigate("/home")}>
                Back to Home
              </TactileButton>
            </div>
          </div>
        </div>
      </ScreenShell>
    );
  }

  const expired = new Date(request.expiresAt) < new Date();
  const rawStatus = request.rawStatus ?? (request.status === "paid" ? "VERIFIED" : "REQUESTED");
  const upiLink =
    request.upiLink ||
    `upi://pay?pa=${request.payer.upiId || ""}&pn=${encodeURIComponent(request.payer.name)}&am=${(request.amountMinor / 100).toFixed(2)}&cu=INR&tr=${encodeURIComponent(request.paymentReference || request.id)}&tn=${encodeURIComponent(`SplitSlip ${request.billContext.restaurant}`)}`;

  return (
    <ScreenShell
      title="Payment Request"
      overline={`${request.billContext.restaurant.toUpperCase()} · SETTLEMENT`}
      onBack={() => navigate("/home")}
      onRefresh={loadRequest}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <TactileButton
            variant="outline"
            size="md"
            full
            onClick={() => navigate("/home")}
          >
            <Home className="mr-1.5 size-3.5" /> Back Home
          </TactileButton>
          <TactileButton
            variant="stamp"
            size="md"
            full
            onClick={loadRequest}
          >
            <RotateCw className="mr-1.5 size-3.5" /> Refresh Status
          </TactileButton>
        </div>
      }
    >
      <div className="flex flex-col py-2">
        {/* The Receipt Slip */}
        <div className="mx-auto w-full max-w-xs border border-ink bg-card px-5 py-6 text-center font-receipt shadow-paper-lg torn-bottom">
          <p className="text-[10px] uppercase tracking-[0.3em] text-ink-faint">
            {request.billContext.restaurant.toUpperCase()} · DINNER SPLIT
          </p>
          <p className="mt-4 text-sm text-ink-soft">
            <span className="font-semibold text-ink">{request.payer.name}</span> is requesting
          </p>
          <p className="mt-2 text-4xl font-bold tabular-nums text-stamp">
            {formatINR(request.amountMinor, { decimals: true })}
          </p>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
            for dinner at {request.billContext.restaurant}
            <br />
            {formatDateLong(request.billContext.date)}
          </p>
          <div className="my-4 rule-dashed" />
          <p className="text-[9px] uppercase tracking-[0.25em] text-ink-faint">
            Bill total {formatINR(request.billContext.totalMinor)} · your share{" "}
            {formatINR(request.amountMinor)}
          </p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-ink-faint">
            {expired ? "This request has expired" : `Valid until ${formatDateLong(request.expiresAt)}`}
          </p>
          {request.paymentReference && (
            <p className="mt-2 text-[9px] tracking-[0.2em] text-ink-soft">
              REF: {request.paymentReference}
            </p>
          )}
        </div>

        {/* Action / Payment / Claim Zone */}
        <div className="mt-6 space-y-4">
          {/* Status Banners */}
          {rawStatus === "VERIFIED" && (
            <div className="border-2 border-stamp bg-card p-5 text-center font-receipt shadow-paper">
              <CheckCircle2 className="mx-auto size-8 text-stamp" />
              <p className="mt-2 text-lg font-bold uppercase tracking-[0.15em] text-stamp">
                Payment Verified ✓
              </p>
              <div className="my-2.5 rule-dashed" />
              <p className="text-xs text-ink-soft">
                {formatINR(request.amountMinor, { decimals: true })} confirmed by {request.payer.name}.
              </p>
              {request.claim?.utr && (
                <p className="mt-1 text-[10px] text-ink-faint">UTR: {request.claim.utr}</p>
              )}
            </div>
          )}

          {rawStatus === "PAYMENT_CLAIMED" && (
            <div className="border border-ink bg-card p-5 text-center font-receipt shadow-paper">
              <Clock className="mx-auto size-8 text-stamp animate-pulse" />
              <p className="mt-2 text-sm font-bold uppercase tracking-[0.15em] text-ink">
                Payment Claim Submitted
              </p>
              <div className="my-2 rule-dashed" />
              <p className="text-xs text-ink-soft">
                Claim of {formatINR(request.amountMinor, { decimals: true })} submitted. Waiting for {request.payer.name} to confirm.
              </p>
              {request.claim?.utr && (
                <p className="mt-2 font-receipt text-xs font-semibold text-ink">
                  CLAIMED UTR: {request.claim.utr}
                </p>
              )}
            </div>
          )}

          {rawStatus === "REJECTED" && (
            <div className="border border-destructive bg-red-50 p-5 text-center font-receipt shadow-paper text-destructive">
              <AlertTriangle className="mx-auto size-8" />
              <p className="mt-2 text-sm font-bold uppercase tracking-[0.15em]">
                Payment Claim Rejected
              </p>
              <div className="my-2 rule-dashed border-destructive/40" />
              <p className="text-xs">
                {request.payer.name} rejected the previous claim. Please check your bank transaction and resubmit your UTR below.
              </p>
            </div>
          )}

          {/* UPI Intent Button */}
          {rawStatus !== "VERIFIED" && !expired && (
            <div>
              <a
                href={upiLink}
                onClick={() => setPaymentInitiated(true)}
                className="tactile flex h-14 w-full items-center justify-center gap-2 border border-ink bg-stamp font-receipt text-sm font-semibold uppercase tracking-wider text-stamp-foreground transition-all hover:brightness-105 active:scale-[0.99] shadow-paper"
              >
                <span>Pay {formatINR(request.amountMinor, { decimals: true })} via UPI</span>
                <ExternalLink className="size-4" />
              </a>
              <p className="mt-2 text-center text-[10px] text-ink-faint">
                Tapping opens GPay, PhonePe, Paytm, BHIM, or any installed UPI app.
              </p>
            </div>
          )}

          {/* Desktop Fallback: QR Code + Copy UPI ID */}
          {rawStatus !== "VERIFIED" && (
            <div className="border border-ink bg-card p-4 font-receipt text-xs shadow-paper">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint">
                  Desktop / Web Fallback
                </span>
                <button
                  type="button"
                  onClick={() => setShowQr(!showQr)}
                  className="font-receipt text-[10px] uppercase tracking-wider text-stamp underline hover:text-ink"
                >
                  {showQr ? "Hide QR" : "Show QR Code"}
                </button>
              </div>

              {request.payer.upiId && (
                <div className="mt-3 flex items-center justify-between border border-ink-line bg-paper-2 p-2 text-xs">
                  <span className="font-mono text-ink-soft">Payer UPI ID:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-ink">{request.payer.upiId}</span>
                    <button
                      type="button"
                      onClick={copyUpiId}
                      className="tactile border border-ink bg-card px-2 py-0.5 text-[10px] uppercase font-bold text-ink hover:text-stamp"
                    >
                      {copiedUpi ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {showQr && (
                <div className="mt-3 flex flex-col items-center justify-center p-3 border border-ink-line bg-paper-2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiLink)}`}
                    alt="UPI Payment QR Code"
                    className="size-44 border border-ink bg-card p-2"
                  />
                  <p className="mt-2 text-[10px] uppercase tracking-wider text-ink-faint">
                    Scan with any UPI App
                  </p>
                </div>
              )}
            </div>
          )}

          {/* UTR Submission Form */}
          {rawStatus !== "VERIFIED" && !expired && (
            <div className="border border-ink bg-card p-5 font-receipt shadow-paper">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink">
                  I've Paid · Submit UTR
                </p>
                <span className="text-[10px] uppercase tracking-wider text-ink-faint">Verification</span>
              </div>
              <div className="my-2 rule-dashed" />
              <p className="text-[11px] leading-relaxed text-ink-soft">
                Enter the 12-digit UTR (UPI reference number) from your bank/UPI app so {request.payer.name} can verify and mark you settled.
              </p>

              {claimSuccess && (
                <div className="mt-3 flex items-center gap-2 border border-stamp bg-emerald-50 p-2 text-xs text-stamp">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>UTR submitted! Payer has been notified to verify.</span>
                </div>
              )}

              {claimError && (
                <div className="mt-3 flex items-center gap-2 border border-destructive bg-red-50 p-2 text-xs text-destructive">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{claimError}</span>
                </div>
              )}

              <form onSubmit={handleClaimSubmit} className="mt-3 space-y-3">
                <input
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 18))}
                  placeholder="e.g. 428901234567"
                  className="h-11 w-full border border-ink bg-paper-2 px-3 font-receipt text-sm outline-none placeholder:text-ink-faint focus:border-stamp"
                  required
                  minLength={6}
                  maxLength={18}
                />
                <TactileButton
                  type="submit"
                  variant="stamp"
                  size="md"
                  full
                  disabled={submittingClaim || utr.trim().length < 6}
                >
                  {submittingClaim
                    ? "Submitting Claim…"
                    : rawStatus === "PAYMENT_CLAIMED"
                      ? "Update Payment Claim"
                      : "Submit UTR Claim"}
                </TactileButton>
              </form>
            </div>
          )}

          {expired && rawStatus !== "VERIFIED" && (
            <div className="border border-ink bg-card p-4 text-center font-receipt text-xs shadow-paper">
              <p className="font-semibold tracking-[0.2em]">EXPIRED</p>
              <div className="my-2 rule-dashed" />
              <p className="text-ink-soft">
                This payment slip has expired. Ask {request.payer.name} to send the request again.
              </p>
            </div>
          )}
        </div>
      </div>
    </ScreenShell>
  );
}
