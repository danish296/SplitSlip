import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, Shield } from "lucide-react";
import { useApp } from "@/app/store/AppContext";
import { ScreenShell } from "@/app/components/Shell";
import { Switch } from "@/components/ui/switch";
import { TactileButton } from "@/app/components/paper";

export default function Settings() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useApp();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [upi, setUpi] = useState(user?.upiId ?? "");
  const [saved, setSaved] = useState(false);
  const [reqNotif, setReqNotif] = useState(true);
  const [settleNotif, setSettleNotif] = useState(true);
  const [contactsPerm, setContactsPerm] = useState(true);

  async function save() {
    await updateUser({ name, phone, upiId: upi, username: username.toLowerCase() });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  async function handleLogout() {
    await logout();
    navigate("/auth", { replace: true });
  }

  return (
    <ScreenShell title="Settings" overline="Preferences" onBack={() => navigate("/profile")}>
      <Section title="Account">
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Username" value={username} onChange={setUsername} mono />
        <Field label="Phone" value={phone} onChange={setPhone} />
      </Section>

      <Section title="Payment">
        <Field label="My UPI ID" value={upi} onChange={setUpi} mono />
        <p className="mt-2 px-3 text-[11px] leading-relaxed text-ink-faint">
          This is the only payment destination you configure. Friends never
          enter theirs.
        </p>
      </Section>

      <Section title="Notifications">
        <ToggleRow label="Payment requests" hint="When someone sends you a split" checked={reqNotif} onChange={setReqNotif} />
        <ToggleRow label="Settlement updates" hint="When a friend pays their share" checked={settleNotif} onChange={setSettleNotif} />
      </Section>

      {user?.role === "admin" && (
        <Section title="Administration">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="flex w-full items-center justify-between border-b border-ink-line bg-card px-3 py-3 text-left transition-colors hover:bg-paper-warm"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <Shield className="size-4" /> Admin Panel
            </span>
            <ChevronRight className="size-4 text-ink-faint" />
          </button>
        </Section>
      )}

      <Section title="About">
        <div className="flex items-center justify-between border-b border-ink-line bg-card px-3 py-3">
          <span className="text-sm">App version</span>
          <span className="font-receipt text-[11px] tracking-[0.15em] text-ink-faint">
            1.0.0 — SPLITSLIP CONVEX BACKEND
          </span>
        </div>
      </Section>

      <div className="mt-6 space-y-2 pb-4">
        <TactileButton variant="stamp" full onClick={() => void save()} disabled={saved}>
          {saved ? "Saved ✓" : "Save changes"}
        </TactileButton>

        <TactileButton variant="outline" full onClick={() => void handleLogout()}>
          Log Out
        </TactileButton>
      </div>
    </ScreenShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="mt-5 first:mt-2">
      <h2 className="mb-1.5 px-1 font-receipt text-[10px] uppercase tracking-[0.3em] text-ink-faint">
        {title}
      </h2>
      <div className="border border-ink-line">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-3 border-b border-ink-line bg-card px-3 py-2.5 last:border-b-0">
      <span className="shrink-0 text-sm text-ink-soft">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 w-full min-w-0 border-b border-dashed border-ink-line bg-transparent text-right text-sm outline-none focus:border-stamp ${mono ? "font-receipt" : ""}`}
      />
    </label>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink-line bg-card px-3 py-3 last:border-b-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[11px] text-ink-faint">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
