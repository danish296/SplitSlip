import { useState } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Send,
  Github,
  Copy,
  Check,
  ArrowLeft,
  MessageSquare,
  Bug,
  Lightbulb,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type FeedbackCategory = "general" | "bug" | "feature" | "scanner";

export default function Contact() {
  const authorEmail = "221fa04296@vignan.ac.in";
  const repoUrl = "https://github.com/danish296/splitslip";

  const [copied, setCopied] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [satisfaction, setSatisfaction] = useState<number | null>(5);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState("");

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(authorEmail);
      setCopied(true);
      toast.success("Email address copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy automatically. Email: " + authorEmail);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all required fields (Name, Email, Message).");
      return;
    }

    setSubmitting(true);
    // Simulated dispatch (wire backend mutation later as requested)
    setTimeout(() => {
      setSubmitting(false);
      setTicketNumber(`FEED-${Math.floor(1000 + Math.random() * 9000)}`);
      setSubmitted(true);
      toast.success("Feedback slip created successfully!");
    }, 600);
  };

  const handleResetForm = () => {
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
    setSubmitted(false);
    setCategory("general");
    setSatisfaction(5);
  };

  return (
    <div className="paper-grain min-h-screen bg-background text-ink selection:bg-stamp selection:text-white">
      {/* Top Bar */}
      <header className="border-b border-ink bg-card px-5 py-4 sticky top-0 z-30 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 font-receipt text-xs font-bold uppercase tracking-[0.18em] text-ink transition-colors hover:text-stamp"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            <span>SplitSlip Home</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden font-receipt text-[11px] uppercase tracking-[0.25em] text-ink-faint sm:inline">
              DISPATCH · DESK
            </span>
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tactile inline-flex items-center gap-1.5 rounded-[4px] border border-ink bg-card px-2.5 py-1.5 font-receipt text-[11px] font-bold uppercase tracking-[0.14em] text-ink hover:border-stamp"
            >
              <Github className="size-3.5" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 md:py-12">
        {/* Page Title & Stamp */}
        <div className="mb-8 border-b border-ink/40 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-receipt text-[10px] uppercase tracking-[0.35em] text-stamp">
                DIRECT COMMUNICATION · LEDGER #09
              </p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Contact &amp; Feedback
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft max-w-xl">
                Have questions, encountered a glitch with your receipts, or want to contribute to
                SplitSlip? Reach out directly to the creator or file a feedback slip below.
              </p>
            </div>

            {/* Visual Paper Stamp */}
            <div className="flex shrink-0 items-center justify-center self-start border border-dashed border-stamp bg-stamp/5 px-3 py-2 font-receipt text-[9px] uppercase tracking-[0.2em] text-stamp rotate-1 sm:rotate-2">
              <ShieldCheck className="mr-1.5 size-3.5" />
              <span>OFFICIAL FEED</span>
            </div>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-12">
          {/* Left Column: Direct Contact & Social Cards */}
          <div className="space-y-6 md:col-span-5">
            {/* Primary Email Card */}
            <div className="border border-ink bg-card p-5 shadow-paper">
              <div className="flex items-center gap-2 font-receipt text-[10px] uppercase tracking-[0.25em] text-ink-faint">
                <Mail className="size-3.5 text-stamp" />
                <span>Primary Developer Inbox</span>
              </div>

              <div className="mt-3">
                <p className="text-xs text-ink-soft">Danish Akhtar</p>
                <p className="mt-1 font-receipt text-sm font-bold tracking-tight text-ink select-all break-all">
                  {authorEmail}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="tactile inline-flex flex-1 items-center justify-center gap-1.5 rounded-[4px] border border-ink bg-card px-3 py-2 font-receipt text-xs font-semibold uppercase tracking-[0.1em] text-ink hover:bg-background"
                >
                  {copied ? (
                    <>
                      <Check className="size-3.5 text-stamp" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      <span>Copy Mail</span>
                    </>
                  )}
                </button>

                <a
                  href={`mailto:${authorEmail}?subject=SplitSlip%20Inquiry`}
                  className="tactile inline-flex flex-1 items-center justify-center gap-1.5 rounded-[4px] border border-ink bg-ink px-3 py-2 font-receipt text-xs font-semibold uppercase tracking-[0.1em] text-card hover:opacity-90"
                >
                  <Send className="size-3.5" />
                  <span>Mail Client</span>
                </a>
              </div>
            </div>

            {/* Source Code & Repository Card */}
            <div className="border border-ink bg-card p-5 shadow-paper">
              <div className="flex items-center gap-2 font-receipt text-[10px] uppercase tracking-[0.25em] text-ink-faint">
                <Github className="size-3.5 text-ink" />
                <span>Open Source Repository</span>
              </div>

              <div className="mt-3">
                <p className="font-receipt text-xs font-bold text-ink">
                  danish296 / splitslip
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  SplitSlip is open-source. Check commits, raise issues, submit pull requests, or
                  star the repo on GitHub.
                </p>
              </div>

              <div className="mt-4">
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tactile flex w-full items-center justify-center gap-2 rounded-[4px] border border-ink bg-card px-3 py-2 font-receipt text-xs font-semibold uppercase tracking-[0.1em] text-ink hover:border-stamp"
                >
                  <span>github.com/danish296/splitslip</span>
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </div>

            {/* Receipt Inspection Note */}
            <div className="border border-dashed border-ink-line bg-card/60 p-4 font-receipt text-[11px] leading-relaxed text-ink-soft">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-[0.2em] text-ink mb-1.5">
                <FileCheck className="size-3.5 text-stamp" />
                <span>Thermal Feed Specs</span>
              </div>
              <p>
                Engineered with React 19, Convex Reactive Cloud, and Tailwind CSS.
                Tested on direct thermal paper printouts and real restaurant GST receipts.
              </p>
            </div>
          </div>

          {/* Right Column: Feedback Slip Form */}
          <div className="md:col-span-7">
            <div className="border border-ink bg-card shadow-paper relative">
              {/* Slip Header */}
              <div className="border-b border-ink bg-card p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-block size-2 rounded-full bg-stamp" />
                    <span className="font-receipt text-[11px] font-bold uppercase tracking-[0.25em] text-ink">
                      FEEDBACK DISPATCH SLIP
                    </span>
                  </div>
                  <span className="font-receipt text-[10px] tracking-[0.2em] text-ink-faint">
                    FORM · v1.0
                  </span>
                </div>
                <div className="mt-2 rule-dashed" />
              </div>

              {/* Form Content */}
              <div className="p-5 sm:p-6">
                <AnimatePresence mode="wait">
                  {submitted ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      className="py-6 text-center space-y-4"
                    >
                      <div className="mx-auto flex size-14 items-center justify-center rounded-full border-2 border-dashed border-stamp bg-stamp/10">
                        <Check className="size-7 text-stamp" />
                      </div>

                      <div>
                        <p className="font-receipt text-[10px] uppercase tracking-[0.3em] text-stamp">
                          VOUCHER CREATED
                        </p>
                        <h3 className="mt-1 text-2xl font-bold tracking-tight text-ink">
                          Feedback Registered!
                        </h3>
                        <p className="mt-2 font-receipt text-xs text-ink-soft">
                          Reference ID: <span className="font-bold text-ink">{ticketNumber}</span>
                        </p>
                      </div>

                      <div className="mx-auto max-w-sm border border-dashed border-ink-line bg-background p-4 text-left font-receipt text-xs leading-relaxed text-ink-soft">
                        <p className="font-bold text-ink">Dispatched Note:</p>
                        <p className="mt-1 truncate">Name: {name}</p>
                        <p className="truncate">Email: {email}</p>
                        <p className="truncate">Type: {category.toUpperCase()}</p>
                        {subject && <p className="truncate">Subject: {subject}</p>}
                        <p className="mt-2 text-[10px] text-ink-faint">
                          Note: Form submission will be wired directly into Convex mutations in an
                          upcoming release.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleResetForm}
                        className="tactile inline-flex items-center gap-2 rounded-[4px] border border-ink bg-ink px-5 py-2.5 font-receipt text-xs font-semibold uppercase tracking-[0.15em] text-card shadow-[0_2px_0_0_var(--ink-rule)]"
                      >
                        Submit Another Slip
                      </button>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      {/* Category Selection */}
                      <div>
                        <label className="block font-receipt text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint mb-2">
                          1. Category / Reason
                        </label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {[
                            { id: "general", label: "General", icon: MessageSquare },
                            { id: "bug", label: "Bug Report", icon: Bug },
                            { id: "feature", label: "Suggestion", icon: Lightbulb },
                            { id: "scanner", label: "Scanner", icon: Sparkles },
                          ].map((item) => {
                            const isSelected = category === item.id;
                            const Icon = item.icon;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setCategory(item.id as FeedbackCategory)}
                                className={cn(
                                  "tactile flex flex-col items-center justify-center gap-1.5 rounded-[4px] border p-2.5 font-receipt text-xs transition-colors",
                                  isSelected
                                    ? "border-stamp bg-stamp text-stamp-foreground shadow-[0_2px_0_0_color-mix(in_srgb,var(--stamp)_70%,black)] font-bold"
                                    : "border-ink-line bg-card text-ink-soft hover:border-ink hover:text-ink",
                                )}
                              >
                                <Icon className="size-4" />
                                <span className="text-[10px] uppercase tracking-[0.1em]">
                                  {item.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Name & Email Row */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="feedback-name"
                            className="block font-receipt text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint mb-1"
                          >
                            2. Your Name *
                          </label>
                          <input
                            id="feedback-name"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Danish Akhtar"
                            className="h-11 w-full border border-ink bg-card px-3 font-receipt text-xs outline-none placeholder:text-ink-faint focus:outline-2 focus:outline-stamp"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="feedback-email"
                            className="block font-receipt text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint mb-1"
                          >
                            3. Your Email *
                          </label>
                          <input
                            id="feedback-email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. you@example.com"
                            className="h-11 w-full border border-ink bg-card px-3 font-receipt text-xs outline-none placeholder:text-ink-faint focus:outline-2 focus:outline-stamp"
                          />
                        </div>
                      </div>

                      {/* Subject */}
                      <div>
                        <label
                          htmlFor="feedback-subject"
                          className="block font-receipt text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint mb-1"
                        >
                          4. Subject / Summary (Optional)
                        </label>
                        <input
                          id="feedback-subject"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="e.g. Scanner alignment on thermal receipt"
                          className="h-11 w-full border border-ink bg-card px-3 font-receipt text-xs outline-none placeholder:text-ink-faint focus:outline-2 focus:outline-stamp"
                        />
                      </div>

                      {/* Message Textarea */}
                      <div>
                        <label
                          htmlFor="feedback-message"
                          className="block font-receipt text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint mb-1"
                        >
                          5. Detailed Message / Feedback *
                        </label>
                        <textarea
                          id="feedback-message"
                          required
                          rows={4}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Write your note, idea, bug description, or question here..."
                          className="w-full resize-y border border-ink bg-card p-3 font-receipt text-xs leading-relaxed outline-none placeholder:text-ink-faint focus:outline-2 focus:outline-stamp"
                        />
                      </div>

                      {/* Satisfaction / Rating */}
                      <div>
                        <label className="block font-receipt text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint mb-1.5">
                          6. How is your experience with SplitSlip?
                        </label>
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((stars) => (
                            <button
                              key={stars}
                              type="button"
                              onClick={() => setSatisfaction(stars)}
                              className={cn(
                                "tactile size-8 rounded-[3px] border font-receipt text-xs font-bold transition-colors",
                                satisfaction === stars
                                  ? "border-stamp bg-stamp text-stamp-foreground"
                                  : "border-ink-line bg-card text-ink-soft hover:border-ink",
                              )}
                              title={`${stars} star${stars > 1 ? "s" : ""}`}
                            >
                              {stars}★
                            </button>
                          ))}
                          <span className="ml-2 font-receipt text-[10px] uppercase tracking-wider text-ink-faint">
                            {satisfaction === 5
                              ? "Excellent"
                              : satisfaction === 4
                                ? "Great"
                                : satisfaction === 3
                                  ? "Okay"
                                  : satisfaction === 2
                                    ? "Poor"
                                    : "Needs Work"}
                          </span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="rule-dashed" />

                      {/* Submit Button */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-receipt text-[9px] uppercase tracking-[0.2em] text-ink-faint">
                          DISPATCH READY · NO SPAM
                        </span>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="tactile inline-flex items-center gap-2 rounded-[4px] border border-ink bg-stamp px-6 py-2.5 font-receipt text-xs font-bold uppercase tracking-[0.15em] text-stamp-foreground shadow-[0_2px_0_0_color-mix(in_srgb,var(--stamp)_70%,black)] hover:brightness-105 disabled:opacity-50"
                        >
                          {submitting ? (
                            <span>Registering...</span>
                          ) : (
                            <>
                              <span>Submit Slip</span>
                              <Send className="size-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </AnimatePresence>
              </div>

              {/* Torn Bottom Effect */}
              <div className="torn-bottom h-3 bg-card border-b border-ink/40" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-ink bg-card py-6 text-center">
        <div className="mx-auto max-w-4xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-faint font-receipt">
          <span>SPLITSLIP · OSS EDITION</span>
          <span>DEVELOPED BY DANISH AKHTAR</span>
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink underline"
          >
            github.com/danish296/splitslip
          </a>
        </div>
      </footer>
    </div>
  );
}
