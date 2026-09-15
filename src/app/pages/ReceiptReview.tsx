import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, Trash2 } from "lucide-react";
import { useApp } from "@/app/store/AppContext";
import { formatReceiptAmount, parseAmountToMinor, uid } from "@/app/lib/money";
import { ScreenShell } from "@/app/components/Shell";
import { TactileButton } from "@/app/components/paper";

export default function ReceiptReview() {
  const navigate = useNavigate();
  const { draft, startDraft, updateDraft } = useApp();

  // Fallback: manual entry (arriving from scanner "Manual" or direct).
  if (!draft) {
    return (
      <ScreenShell title="Enter the bill" overline="Manual entry" onBack={() => navigate("/home")}>
        <ManualEntry
          onSubmit={(d) => {
            startDraft(d);
            navigate("/split", { replace: true });
          }}
        />
      </ScreenShell>
    );
  }

  const itemsTotal = draft.items.reduce((a, b) => a + b.amountMinor, 0);
  const total = itemsTotal + draft.taxMinor + draft.serviceMinor - (draft.discountMinor ?? 0);
  const currentItems = draft.items;

  function patchItem(id: string, patch: Partial<{ name: string; quantity: number; amountMinor: number }>) {
    updateDraft({
      items: currentItems.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    });
  }

  return (
    <ScreenShell
      title="Review the receipt"
      overline="Step 1 of 4 · Looks right?"
      onBack={() => navigate("/scan")}
      footer={
        <TactileButton
          variant="stamp"
          size="lg"
          full
          disabled={draft.items.length === 0 || total <= 0}
          onClick={() => navigate("/split")}
        >
          Continue · ₹{formatReceiptAmount(total)}
        </TactileButton>
      }
    >
      {/* The receipt */}
      <div className="border border-ink bg-card px-4 py-4 font-receipt text-[13px] text-ink shadow-paper">
        <input
          value={draft.restaurant}
          onChange={(e) => updateDraft({ restaurant: e.target.value })}
          aria-label="Restaurant name"
          className="w-full bg-transparent text-center text-[14px] font-semibold uppercase tracking-[0.18em] outline-none focus:bg-paper-2"
        />
        <input
          value={draft.city ?? ""}
          onChange={(e) => updateDraft({ city: e.target.value })}
          aria-label="City"
          placeholder="CITY"
          className="w-full bg-transparent text-center text-[10px] uppercase tracking-[0.3em] text-ink-faint outline-none placeholder:text-ink-faint/60 focus:bg-paper-2"
        />
        <div className="my-3 rule-dashed" />

        <ul className="space-y-1">
          {draft.items.map((item) => (
            <li key={item.id} className="flex items-center gap-1.5">
              <input
                value={item.quantity}
                onChange={(e) => {
                  const q = Math.max(1, parseInt(e.target.value || "1", 10) || 1);
                  patchItem(item.id, { quantity: q });
                }}
                inputMode="numeric"
                aria-label={`Quantity of ${item.name}`}
                className="w-8 border border-ink-line bg-paper-2 px-1 text-center tabular-nums outline-none focus:outline-1 focus:outline-stamp"
              />
              <span aria-hidden="true" className="text-ink-faint">×</span>
              <input
                value={item.name}
                onChange={(e) => patchItem(item.id, { name: e.target.value })}
                aria-label="Item name"
                className="min-w-0 flex-1 border-b border-dashed border-ink-line bg-transparent px-1 outline-none focus:border-stamp"
              />
              <PriceInput
                minor={item.amountMinor}
                onMinor={(m) => patchItem(item.id, { amountMinor: m ?? 0 })}
                label={`Amount for ${item.name}`}
              />
              <button
                type="button"
                aria-label={`Delete ${item.name}`}
                onClick={() => updateDraft({ items: draft.items.filter((i) => i.id !== item.id) })}
                className="tactile flex size-8 shrink-0 items-center justify-center border border-ink-line bg-card text-ink-faint hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() =>
            updateDraft({
              items: [...draft.items, { id: uid("bi"), name: "New item", quantity: 1, amountMinor: 0 }],
            })
          }
          className="tactile mt-2 flex w-full items-center justify-center gap-1.5 border border-dashed border-ink py-2 text-[11px] uppercase tracking-[0.2em] text-ink-soft hover:border-ink"
        >
          <Plus className="size-3.5" /> Add item
        </button>

        <div className="my-3 rule-dashed" />
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.2em]">Subtotal</span>
          <span className="tabular-nums">{formatReceiptAmount(itemsTotal)}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-[0.2em]">GST</span>
          <PriceInput minor={draft.taxMinor} onMinor={(m) => updateDraft({ taxMinor: m ?? 0 })} label="GST amount" />
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-[0.2em]">Service</span>
          <PriceInput minor={draft.serviceMinor} onMinor={(m) => updateDraft({ serviceMinor: m ?? 0 })} label="Service charge" />
        </div>
        <div className="my-3 rule-dashed" />
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold tracking-[0.15em]">TOTAL</span>
          <span className="text-lg font-semibold tabular-nums">₹{formatReceiptAmount(total)}</span>
        </div>
      </div>

      <p className="mt-3 text-center text-[11px] text-ink-faint">
        Edit anything that looks wrong — tap a line to fix it, just like ink on paper.
      </p>
    </ScreenShell>
  );
}

function PriceInput({
  minor,
  onMinor,
  label,
}: {
  minor: number;
  onMinor: (m: number | null) => void;
  label: string;
}) {
  const [raw, setRaw] = useState<string | null>(null);
  const display = raw ?? (minor === 0 ? "" : formatReceiptAmount(minor));
  return (
    <input
      value={display}
      inputMode="decimal"
      aria-label={label}
      onChange={(e) => {
        const v = e.target.value;
        if (!/^\d{0,6}(\.\d{0,2})?$/.test(v)) return;
        setRaw(v);
        onMinor(parseAmountToMinor(v));
      }}
      onBlur={() => setRaw(null)}
      className="w-16 shrink-0 border-b border-dashed border-ink-line bg-transparent text-right tabular-nums outline-none focus:border-stamp"
    />
  );
}

/* ---------------- manual entry fallback ---------------- */

function ManualEntry({
  onSubmit,
}: {
  onSubmit: (d: {
    restaurant: string;
    city?: string;
    items: Array<{ id: string; name: string; quantity: number; amountMinor: number }>;
    taxMinor: number;
    serviceMinor: number;
  }) => void;
}) {
  const [restaurant, setRestaurant] = useState("");
  const [rows, setRows] = useState([
    { id: uid("bi"), name: "", quantity: 1, amountMinor: 0 },
  ]);
  const [taxRaw, setTaxRaw] = useState("");
  const itemsTotal = useMemo(() => rows.reduce((a, b) => a + b.amountMinor, 0), [rows]);
  const taxMinor = parseAmountToMinor(taxRaw) ?? 0;

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-ink-soft">
        No receipt to scan? Type the bill in — it works exactly the same
        afterwards.
      </p>
      <input
        value={restaurant}
        onChange={(e) => setRestaurant(e.target.value)}
        placeholder="Restaurant name"
        aria-label="Restaurant name"
        className="h-12 w-full border border-ink bg-card px-3 font-receipt text-sm outline-none placeholder:text-ink-faint focus:outline-2 focus:outline-offset-2 focus:outline-stamp"
      />
      <div className="border border-ink bg-card p-3 font-receipt text-[13px] shadow-paper">
        {rows.map((row) => (
          <div key={row.id} className="mb-2 flex items-center gap-1.5">
            <input
              value={row.name}
              onChange={(e) =>
                setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)))
              }
              placeholder="Item"
              aria-label="Item name"
              className="min-w-0 flex-1 border-b border-dashed border-ink-line bg-transparent px-1 outline-none focus:border-stamp"
            />
            <input
              value={row.amountMinor === 0 ? "" : formatReceiptAmount(row.amountMinor)}
              onChange={(e) => {
                const m = parseAmountToMinor(e.target.value);
                setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, amountMinor: m ?? 0 } : r)));
              }}
              inputMode="decimal"
              placeholder="0.00"
              aria-label="Item amount"
              className="w-20 border-b border-dashed border-ink-line bg-transparent text-right tabular-nums outline-none focus:border-stamp"
            />
            <button
              type="button"
              aria-label="Remove item"
              onClick={() => setRows((rs) => rs.filter((r) => r.id !== row.id))}
              className="tactile flex size-8 items-center justify-center border border-ink-line text-ink-faint hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRows((rs) => [...rs, { id: uid("bi"), name: "", quantity: 1, amountMinor: 0 }])}
          className="tactile flex w-full items-center justify-center gap-1.5 border border-dashed border-ink py-2 text-[11px] uppercase tracking-[0.2em] text-ink-soft"
        >
          <Plus className="size-3.5" /> Add item
        </button>
        <div className="my-3 rule-dashed" />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-[0.2em]">GST</span>
          <input
            value={taxRaw}
            onChange={(e) => {
              if (!/^\d{0,6}(\.\d{0,2})?$/.test(e.target.value)) return;
              setTaxRaw(e.target.value);
            }}
            inputMode="decimal"
            placeholder="0.00"
            aria-label="GST amount"
            className="w-20 border-b border-dashed border-ink-line bg-transparent text-right tabular-nums outline-none focus:border-stamp"
          />
        </div>
        <div className="my-3 rule-dashed" />
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold tracking-[0.15em]">TOTAL</span>
          <span className="text-lg font-semibold tabular-nums">
            ₹{formatReceiptAmount(itemsTotal + taxMinor)}
          </span>
        </div>
      </div>
      <TactileButton
        variant="stamp"
        size="lg"
        full
        disabled={!restaurant.trim() || itemsTotal <= 0}
        onClick={() =>
          onSubmit({
            restaurant: restaurant.trim(),
            city: "Bangalore",
            items: rows.filter((r) => r.name.trim()),
            taxMinor,
            serviceMinor: 0,
          })
        }
      >
        Use this bill
      </TactileButton>
    </div>
  );
}
