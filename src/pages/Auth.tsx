import { useState, useEffect, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TactileButton } from "@/app/components/paper";
import {
  ChevronLeft,
  User,
  Mail,
  Smartphone,
  AtSign,
  Wallet,
  Lock,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(returnTo: string | null, fallback = "/home") {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email;
  const [localPart, domainPart] = email.split("@");
  if (!domainPart) return email;

  let maskedLocal = localPart;
  if (localPart.length <= 2) {
    maskedLocal = `${localPart[0]}*`;
  } else if (localPart.length <= 4) {
    maskedLocal = `${localPart[0]}**${localPart.slice(-1)}`;
  } else {
    maskedLocal = `${localPart.slice(0, 2)}***${localPart.slice(-1)}`;
  }

  const domainParts = domainPart.split(".");
  if (domainParts.length >= 2) {
    const domainName = domainParts[0];
    const tld = domainParts.slice(1).join(".");
    let maskedDomain = domainName;
    if (domainName.length <= 3) {
      maskedDomain = `${domainName[0]}*`;
    } else {
      maskedDomain = `${domainName.slice(0, 1)}***${domainName.slice(-1)}`;
    }
    return `${maskedLocal}@${maskedDomain}.${tld}`;
  }

  return `${maskedLocal}@${domainPart}`;
}

type SignUpStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type SignInStep = 1 | 2;

export default function AuthPage({ redirectAfterAuth }: AuthProps = {}) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { signIn } = useAuthActions();
  const validateRegistration = useMutation(api.users.validateRegistration);
  const updateProfile = useMutation(api.users.updateProfile);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth || "/home",
  );

  const [mode, setMode] = useState<"signUp" | "signIn">("signUp");
  const [signupStep, setSignupStep] = useState<SignUpStep>(0);
  const [signinStep, setSigninStep] = useState<SignInStep>(1);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [upiId, setUpiId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Sign In fields
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Resolved email lookup for login
  const resolvedEmail = useQuery(
    api.users.lookupEmailForIdentifier,
    loginIdentifier.trim() ? { identifier: loginIdentifier.trim() } : "skip",
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect, { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  // Validation conditions for Sign Up
  const canNextSignUp =
    signupStep === 0 ||
    (signupStep === 1 && name.trim().length >= 2) ||
    (signupStep === 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) ||
    (signupStep === 3 && username.trim().length >= 3 && /^[a-zA-Z0-9_.]+$/.test(username.trim())) ||
    (signupStep === 4 && /^[0-9+\s-]{10,15}$/.test(phone.trim())) ||
    (signupStep === 5 && /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId.trim())) ||
    (signupStep === 6 && password.length >= 8);

  // Validation conditions for Sign In
  const canNextSignIn =
    (signinStep === 1 && loginIdentifier.trim().length >= 3) ||
    (signinStep === 2 && loginPassword.length >= 6);

  async function handleNextSignUp() {
    setError(null);
    if (signupStep < 6) {
      // If moving past username/email step, perform a quick pre-validation check
      if (signupStep === 3) {
        setLoading(true);
        try {
          await validateRegistration({
            email: email.trim().toLowerCase(),
            username: username.trim().toLowerCase(),
            phone: phone.trim() || undefined,
          });
        } catch (err: any) {
          setError(err?.message || "Validation failed. Username or email may already be registered.");
          setLoading(false);
          return;
        }
        setLoading(false);
      }
      setSignupStep((s) => (s + 1) as SignUpStep);
    } else {
      await handleCompleteSignUp();
    }
  }

  async function handleCompleteSignUp() {
    setError(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanUpi = upiId.trim();
    const cleanName = name.trim() || "SplitSlip User";

    try {
      // 1. Final uniqueness check
      await validateRegistration({
        email: cleanEmail,
        username: cleanUsername,
        phone: cleanPhone || undefined,
      });

      // 2. Convex Auth Sign Up
      await signIn("password", {
        email: cleanEmail,
        password: password,
        name: cleanName,
        phone: cleanPhone,
        username: cleanUsername,
        upiId: cleanUpi,
        flow: "signUp",
      });

      // 3. Ensure profile fields are patched
      try {
        await updateProfile({
          name: cleanName,
          phone: cleanPhone,
          username: cleanUsername,
          upiId: cleanUpi,
        });
      } catch (patchErr) {
        console.warn("Profile auto-patch notice:", patchErr);
      }

      navigate(redirect, { replace: true });
    } catch (err: any) {
      console.error("Sign up failed:", err);
      setError(err?.message || "Failed to create account. Please check your details.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteSignIn() {
    setError(null);
    setLoading(true);

    try {
      // Resolve email from identifier
      const targetEmail = (resolvedEmail || loginIdentifier.trim()).toLowerCase();
      await signIn("password", {
        email: targetEmail,
        password: loginPassword,
        flow: "signIn",
      });

      navigate(redirect, { replace: true });
    } catch (err: any) {
      console.error("Sign in failed:", err);
      const msg = err?.message || "";
      if (msg.includes("Invalid credentials") || msg.includes("Could not find")) {
        setError("Invalid credentials. Please verify your email/username and password.");
      } else {
        setError(msg || "Failed to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setError(null);
    if (mode === "signUp") {
      if (signupStep > 0) setSignupStep((s) => (s - 1) as SignUpStep);
    } else {
      if (signinStep > 1) {
        setSigninStep((s) => (s - 1) as SignInStep);
      } else {
        setMode("signUp");
        setSignupStep(0);
      }
    }
  }

  return (
    <div className="paper-grain flex min-h-[100dvh] flex-col bg-background text-ink">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-1 flex-col justify-between sm:border-x sm:border-ink sm:shadow-paper-lg bg-background">
        {/* Main Body */}
        <main className="flex flex-1 flex-col px-5 sm:px-6 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.75rem,env(safe-area-inset-bottom))]">
        <AnimatePresence mode="wait">
          {mode === "signUp" ? (
            <motion.div
              key={`signup-${signupStep}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-1 flex-col justify-between"
            >
              {signupStep === 0 && (
                <Intro onStart={() => setSignupStep(1)} onSignIn={() => { setMode("signIn"); setSigninStep(1); }} />
              )}

              {signupStep === 1 && (
                <Question
                  overline="QUESTION 01 · PROFILE"
                  title="What should we call you?"
                  hint="This is the name your friends see on payment requests."
                  icon={<User className="size-4" />}
                  onBack={handleBack}
                  stepIndicator="1 / 6"
                >
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Danish Akhtar"
                    autoComplete="name"
                    autoFocus
                    className="h-14 w-full border border-ink bg-card px-4 font-receipt text-base outline-none placeholder:text-ink-faint focus:outline-2 focus:outline-offset-2 focus:outline-stamp"
                    onKeyDown={(e) => e.key === "Enter" && canNextSignUp && handleNextSignUp()}
                  />
                </Question>
              )}

              {signupStep === 2 && (
                <Question
                  overline="QUESTION 02 · CONTACT"
                  title="What's your email address?"
                  hint="We'll send your settlement slips, receipts, and verification notices here."
                  icon={<Mail className="size-4" />}
                  onBack={handleBack}
                  stepIndicator="2 / 6"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. danish@example.com"
                    autoComplete="email"
                    autoFocus
                    className="h-14 w-full border border-ink bg-card px-4 font-receipt text-base outline-none placeholder:text-ink-faint focus:outline-2 focus:outline-offset-2 focus:outline-stamp"
                    onKeyDown={(e) => e.key === "Enter" && canNextSignUp && handleNextSignUp()}
                  />
                </Question>
              )}

              {signupStep === 3 && (
                <Question
                  overline="QUESTION 03 · HANDLE"
                  title="Pick a unique username"
                  hint="Friends can search and connect with you on SplitSlip using your @handle."
                  icon={<AtSign className="size-4" />}
                  onBack={handleBack}
                  stepIndicator="3 / 6"
                >
                  <div className="flex items-center">
                    <span className="flex h-14 items-center border border-r-0 border-ink bg-paper-2 px-3.5 font-receipt text-base text-ink-soft">
                      @
                    </span>
                    <input
                      value={username}
                      onChange={(e) =>
                        setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))
                      }
                      placeholder="danish"
                      autoComplete="username"
                      autoFocus
                      className="h-14 w-full border border-ink bg-card px-4 font-receipt text-base outline-none placeholder:text-ink-faint focus:outline-2 focus:outline-offset-2 focus:outline-stamp"
                      onKeyDown={(e) => e.key === "Enter" && canNextSignUp && handleNextSignUp()}
                    />
                  </div>
                </Question>
              )}

              {signupStep === 4 && (
                <Question
                  overline="QUESTION 04 · MOBILE"
                  title="Your phone number?"
                  hint="Used for contact matching and notifications with your friends."
                  icon={<Smartphone className="size-4" />}
                  onBack={handleBack}
                  stepIndicator="4 / 6"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-14 items-center border border-ink bg-card px-3.5 font-receipt text-sm text-ink-soft">
                      +91
                    </span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      inputMode="tel"
                      placeholder="98765 43210"
                      autoComplete="tel"
                      autoFocus
                      className="h-14 w-full border border-ink bg-card px-4 font-receipt text-base outline-none placeholder:text-ink-faint focus:outline-2 focus:outline-offset-2 focus:outline-stamp"
                      onKeyDown={(e) => e.key === "Enter" && canNextSignUp && handleNextSignUp()}
                    />
                  </div>
                </Question>
              )}

              {signupStep === 5 && (
                <Question
                  overline="QUESTION 05 · SETTLEMENT"
                  title="Where should your friends pay you?"
                  hint="You only need to add your own UPI ID. Your friends don't need to enter theirs."
                  icon={<Wallet className="size-4" />}
                  onBack={handleBack}
                  stepIndicator="5 / 6"
                >
                  <div className="border border-ink bg-card p-4 shadow-paper">
                    <p className="font-receipt text-[10px] uppercase tracking-[0.25em] text-ink-faint">
                      Your payment destination
                    </p>
                    <input
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value.trim())}
                      placeholder="danish@okhdfc"
                      inputMode="email"
                      autoComplete="off"
                      autoFocus
                      className="mt-2 h-12 w-full border border-ink-line bg-paper-2 px-3 font-receipt text-base outline-none placeholder:text-ink-faint focus:outline-2 focus:outline-offset-2 focus:outline-stamp"
                      onKeyDown={(e) => e.key === "Enter" && canNextSignUp && handleNextSignUp()}
                    />
                    <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-stamp" aria-hidden="true" />
                      Every request you send collects straight into this one destination.
                    </p>
                  </div>
                </Question>
              )}

              {signupStep === 6 && (
                <Question
                  overline="FINAL STEP · SECURITY"
                  title="Set your secure password"
                  hint="At least 8 characters to safeguard your account and settlement ledger."
                  icon={<Lock className="size-4" />}
                  onBack={handleBack}
                  stepIndicator="6 / 6"
                >
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Choose a strong password"
                      autoComplete="new-password"
                      autoFocus
                      className="h-14 w-full border border-ink bg-card px-4 pr-12 font-receipt text-base outline-none placeholder:text-ink-faint focus:outline-2 focus:outline-offset-2 focus:outline-stamp"
                      onKeyDown={(e) => e.key === "Enter" && canNextSignUp && handleNextSignUp()}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>

                  {/* Summary preview slip */}
                  <div className="mt-6 border border-dashed border-ink bg-card p-4 font-receipt text-xs shadow-paper">
                    <p className="text-center font-bold uppercase tracking-[0.25em] text-ink">
                      REGISTRATION CARD
                    </p>
                    <div className="my-2.5 rule-dashed" />
                    <div className="space-y-1 text-ink-soft">
                      <div className="flex justify-between">
                        <span className="text-ink-faint uppercase tracking-wider">Name</span>
                        <span className="font-medium text-ink">{name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-faint uppercase tracking-wider">Email</span>
                        <span className="font-medium text-ink truncate max-w-[180px]">{email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-faint uppercase tracking-wider">Handle</span>
                        <span className="font-medium text-ink">@{username}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-faint uppercase tracking-wider">Phone</span>
                        <span className="font-medium text-ink">+91 {phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-faint uppercase tracking-wider">UPI ID</span>
                        <span className="font-medium text-stamp">{upiId}</span>
                      </div>
                    </div>
                  </div>
                </Question>
              )}

              {/* Error Message */}
              {error && (
                <div className="mt-4 flex items-start gap-2 border border-red-500 bg-red-50 p-3 text-xs font-receipt text-red-700">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Actions Footer */}
              {signupStep > 0 && (
                <div className="mt-auto pt-8">
                  <TactileButton
                    variant="stamp"
                    size="lg"
                    full
                    disabled={!canNextSignUp || loading}
                    onClick={handleNextSignUp}
                  >
                    {loading
                      ? "Printing Slip…"
                      : signupStep === 6
                      ? "Print Slip & Create Account"
                      : "Continue"}
                  </TactileButton>

                  {/* Progress bar pills */}
                  <div className="mt-4 flex justify-center gap-1.5" aria-hidden="true">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <span
                        key={i}
                        className={cn(
                          "h-1 w-6 transition-all duration-300",
                          i === signupStep
                            ? "bg-ink"
                            : i < signupStep
                            ? "bg-stamp"
                            : "bg-ink-line",
                        )}
                      />
                    ))}
                  </div>

                  {signupStep === 1 && (
                    <div className="mt-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setMode("signIn");
                          setSigninStep(1);
                        }}
                        className="font-receipt text-xs text-ink-soft underline hover:text-ink"
                      >
                        Already registered? Sign In
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={`signin-${signinStep}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-1 flex-col justify-between"
            >
              {signinStep === 1 && (
                <Question
                  overline="STEP 01 · ACCOUNT"
                  title="Welcome back. Who are you?"
                  hint="Enter your registered email address, phone, or @handle."
                  icon={<Mail className="size-4" />}
                  onBack={handleBack}
                  stepIndicator="1 / 2"
                >
                  <input
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. danish@example.com or danish"
                    autoComplete="username"
                    autoFocus
                    className="h-14 w-full border border-ink bg-card px-4 font-receipt text-base outline-none placeholder:text-ink-faint focus:outline-2 focus:outline-offset-2 focus:outline-stamp"
                    onKeyDown={(e) => e.key === "Enter" && canNextSignIn && setSigninStep(2)}
                  />
                  {resolvedEmail && resolvedEmail !== loginIdentifier && (
                    <p className="mt-2 font-receipt text-xs text-stamp">
                      ✓ Identified account: {maskEmail(resolvedEmail)}
                    </p>
                  )}
                </Question>
              )}

              {signinStep === 2 && (
                <Question
                  overline="STEP 02 · SECURITY"
                  title="Enter your password"
                  hint={
                    resolvedEmail
                      ? `Signing in as ${maskEmail(resolvedEmail)}`
                      : `Signing in as ${loginIdentifier}`
                  }
                  icon={<Lock className="size-4" />}
                  onBack={handleBack}
                  stepIndicator="2 / 2"
                >
                  <div className="relative">
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Account password"
                      autoComplete="current-password"
                      autoFocus
                      className="h-14 w-full border border-ink bg-card px-4 pr-12 font-receipt text-base outline-none placeholder:text-ink-faint focus:outline-2 focus:outline-offset-2 focus:outline-stamp"
                      onKeyDown={(e) => e.key === "Enter" && canNextSignIn && handleCompleteSignIn()}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                    >
                      {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Question>
              )}

              {/* Error Message */}
              {error && (
                <div className="mt-4 flex items-start gap-2 border border-red-500 bg-red-50 p-3 text-xs font-receipt text-red-700">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Actions Footer */}
              <div className="mt-auto pt-8">
                <TactileButton
                  variant="stamp"
                  size="lg"
                  full
                  disabled={!canNextSignIn || loading}
                  onClick={() => {
                    if (signinStep === 1) {
                      setError(null);
                      setSigninStep(2);
                    } else {
                      void handleCompleteSignIn();
                    }
                  }}
                >
                  {loading
                    ? "Verifying Ledger…"
                    : signinStep === 1
                    ? "Continue to Password"
                    : "Sign In to SplitSlip"}
                </TactileButton>

                {/* Progress bar pills */}
                <div className="mt-4 flex justify-center gap-1.5" aria-hidden="true">
                  {[1, 2].map((i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1 w-8 transition-all duration-300",
                        i === signinStep
                          ? "bg-ink"
                          : i < signinStep
                          ? "bg-stamp"
                          : "bg-ink-line",
                      )}
                    />
                  ))}
                </div>

                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode("signUp");
                      setSignupStep(1);
                    }}
                    className="font-receipt text-xs text-ink-soft underline hover:text-ink"
                  >
                    Don't have an account? Start onboarding
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  </div>
  );
}

function Intro({ onStart, onSignIn }: { onStart: () => void; onSignIn: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-between text-center py-2">
      <div className="flex flex-1 flex-col items-center justify-center">
        <span className="mb-6 border border-ink bg-card px-2.5 py-1 font-receipt text-[10px] font-bold uppercase tracking-[0.25em] text-ink shadow-xs">
          SplitSlip
        </span>

        {/* Animated receipt stack illustration */}
        <div aria-hidden="true" className="relative mb-8 flex items-end justify-center gap-3">
          {/* Background slip — faded, tilted */}
          <motion.div
            initial={{ opacity: 0, y: 20, rotate: -6 }}
            animate={{ opacity: 1, y: 0, rotate: -6 }}
            transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-24 border border-ink-line bg-card p-3 font-receipt text-[8px] text-ink-faint shadow-paper"
          >
            <p className="text-center text-[9px] tracking-[0.2em]">SCAN</p>
            <div className="my-1.5 rule-dashed" />
            <div className="barcode h-5 w-full opacity-40" />
          </motion.div>

          {/* Main receipt — centered, upright */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative -mb-1 w-36 border border-ink bg-card p-4 font-receipt text-[9px] text-ink shadow-paper-lg torn-bottom"
          >
            <p className="text-center text-[11px] font-semibold tracking-[0.25em]">THE TABLE</p>
            <div className="my-2 rule-dashed" />
            <div className="flex justify-between"><span>Butter Chicken</span><span className="tabular-nums">480</span></div>
            <div className="flex justify-between"><span>Paneer Tikka</span><span className="tabular-nums">360</span></div>
            <div className="flex justify-between"><span>Naan × 4</span><span className="tabular-nums">160</span></div>
            <div className="my-2 rule-dashed" />
            <div className="flex justify-between font-semibold">
              <span>TOTAL</span><span className="tabular-nums">₹2,006</span>
            </div>
          </motion.div>

          {/* Payment slip — tilted right */}
          <motion.div
            initial={{ opacity: 0, y: 20, rotate: 5 }}
            animate={{ opacity: 1, y: 0, rotate: 5 }}
            transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-24 border border-ink bg-paper-2 p-3 font-receipt text-[8px] shadow-paper"
          >
            <p className="text-center text-[9px] tracking-[0.2em] text-stamp">SPLIT</p>
            <div className="my-1.5 rule-dashed" />
            <div className="flex justify-between text-ink-soft"><span>You</span><span className="tabular-nums text-stamp">✓</span></div>
            <div className="flex justify-between text-ink-soft"><span>Friend 1</span><span className="tabular-nums text-stamp">✓</span></div>
            <div className="flex justify-between text-ink-soft"><span>Friend 2</span><span className="tabular-nums text-stamp">✓</span></div>
          </motion.div>
        </div>

        <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-4xl">
          Split the bill.
          <br />
          Not the friendship.
        </h1>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">
          Scan a restaurant receipt, tap who ate what, and send every friend an
          exact payment slip. Done in seconds.
        </p>
      </div>

      <div className="w-full space-y-2 pt-6">
        <TactileButton variant="stamp" size="lg" full onClick={onStart}>
          Create an Account
        </TactileButton>
        <TactileButton variant="outline" size="md" full onClick={onSignIn}>
          I already have an account
        </TactileButton>
      </div>
    </div>
  );
}

function Question({
  overline,
  title,
  hint,
  children,
  icon,
  onBack,
  stepIndicator,
}: {
  overline: string;
  title: string;
  hint: string;
  children: ReactNode;
  icon?: ReactNode;
  onBack?: () => void;
  stepIndicator?: string;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center py-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="tactile mr-1 flex size-8 items-center justify-center rounded-[4px] border border-ink bg-card text-ink transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
          {icon && (
            <span className="flex size-7 items-center justify-center border border-ink bg-card text-stamp">
              {icon}
            </span>
          )}
          <span className="font-receipt text-[10px] font-bold uppercase tracking-[0.25em] text-ink-faint">
            {overline}
          </span>
        </div>
        {stepIndicator && (
          <span className="font-receipt text-[10px] uppercase tracking-[0.25em] text-ink-faint">
            {stepIndicator}
          </span>
        )}
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{hint}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}
