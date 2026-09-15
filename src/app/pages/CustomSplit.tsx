import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useApp, currentUserId } from "@/app/store/AppContext";
import { formatINR, formatReceiptAmount, parseAmountToMinor } from "@/app/lib/money";
import { ScreenShell } from "@/app/components/Shell";
import { TactileButton } from "@/app/components/paper";
import type { Contact } from "@/app/lib/types";
import type { ParticipantRef } from "@/app/lib/splits";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, Minus, Users, UserPlus } from "lucide-react";

export default function CustomSplit() {
  const navigate = useNavigate();
  const { draft, contacts, updateDraft } = useApp();

  const liveFriends = useQuery(api.connections.listConnections);
  const friendsList = useMemo<Contact[]>(() => {
    if (liveFriends && liveFriends.length > 0) {
      return liveFriends.map((f) => ({
        id: f.id,
        name: f.name,
        phone: f.phone || "",
        username: f.username,
        isRegistered: true,
      }));
    }
    return contacts;
  }, [liveFriends, contacts]);

  const [people, setPeople] = useState<ParticipantRef[]>(() => {
    if (draft && draft.participants.length > 0) {
      return draft.participants.map((p) => ({ contactId: p.id, displayName: p.name }));
    }
    return [{ contactId: currentUserId(), displayName: "You" }];
  });

  const availableFriends = useMemo(() => {
    return friendsList.filter((c) => !people.some((p) => p.contactId === c.id));
  }, [friendsList, people]);

  function addPerson(c: Contact) {
    if (people.some((p) => p.contactId === c.id)) return;
    setPeople((ps) => [...ps, { contactId: c.id, displayName: c.name }]);
  }

  function removePerson(id: string) {
    if (id === currentUserId()) return;
    setPeople((ps) => ps.filter((p) => p.contactId !== id));
    setAmounts((a) => {
      const next = { ...a };
      delete next[id];
      return next;
    });
  }

  const total = draft
    ? draft.items.reduce((a, b) => a + b.amountMinor, 0) + draft.taxMinor + draft.serviceMinor
    : 0;

  const [amounts, setAmounts] = useState<Record<string, string>>(
    () =>
      draft?.customAmounts && draft.customAmountsRaw
        ? draft.customAmountsRaw
        : Object.fromEntries(people.map((p) => [p.contactId, ""])),
  );

  const assignedMinor = useMemo(
    () =>
      people.reduce((acc, p) => acc + (parseAmountToMinor(amounts[p.contactId] ?? "") ?? 0), 0),
    [amounts, people],
  );
  const remaining = total - assignedMinor;
  const canContinue = remaining === 0 && people.length >= 2;

  function setAmount(id: string, raw: string) {
    if (!/^\d{0,6}(\.\d{0,2})?$/.test(raw)) return;
    setAmounts((a) => ({ ...a, [id]: raw }));
  }

  function even() {
    const each = Math.floor(total / people.length);
    const next: Record<string, string> = {};
    people.forEach((p, i) => {
      const v = each + (i < total - each * people.length ? 1 : 0);
      next[p.contactId] = (v / 100).toFixed(2);
    });
    setAmounts(next);
  }

  function saveAndContinue() {
    if (!draft || !canContinue) return;
    const chosen: Contact[] = people.map((p) =>
      p.contactId === currentUserId()
        ? { id: currentUserId(), name: "You", phone: "", isRegistered: true }
        : contacts.find((c) => c.id === p.contactId) ?? {
            id: p.contactId,
            name: p.displayName,
            phone: "",
            isRegistered: true,
          },
    );
    updateDraft({
      participants: chosen,
      splitMethod: "custom",
      customAmounts: Object.fromEntries(
        people.map((p) => [p.contactId, parseAmountToMinor(amounts[p.contactId] ?? "") ?? 0]),
      ),
      customAmountsRaw: amounts,
    });
    navigate("/people");
  }

  if (!draft) {
    return (
      <ScreenShell title="No bill yet" onBack={() => navigate("/home")}>
        <p className="text-sm text-ink-soft">Scan a bill first.</p>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Set the amounts"
      overline="Step 3 of 4 · Custom split"
      onBack={() => navigate("/split")}
      footer={
        <div className="space-y-2">
          <p
            className={`text-center font-receipt text-[12px] font-semibold uppercase tracking-[0.15em] ${
              remaining === 0
                ? "text-stamp"
                : remaining > 0
                  ? "text-ink-soft"
                  : "text-destructive"
            }`}
            aria-live="polite"
          >
            {remaining === 0
              ? "✓ ₹0 remaining — perfectly split"
              : remaining > 0
                ? `₹${formatReceiptAmount(remaining)} still unassigned`
                : `₹${formatReceiptAmount(-remaining)} over the total`}
          </p>
          <TactileButton
            variant="stamp"
            size="lg"
            full
            disabled={!canContinue}
            onClick={saveAndContinue}
          >
            {canContinue ? "Looks right · continue" : "Match the total to continue"}
          </TactileButton>
        </div>
      }
    >
      <div className="flex items-baseline justify-between border border-ink bg-card px-4 py-3 font-receipt shadow-paper">
        <span className="text-[10px] uppercase tracking-[0.25em] text-ink-faint">Bill total</span>
        <span className="text-lg font-semibold tabular-nums">{formatINR(total)}</span>
      </div>

      <ul className="mt-3 space-y-2">
        {people.map((p) => {
          const value = amounts[p.contactId] ?? "";
          const minor = parseAmountToMinor(value) ?? 0;
          return (
            <li key={p.contactId} className="border border-ink bg-card px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {p.displayName}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 border border-ink bg-paper-2 px-2">
                    <span aria-hidden="true" className="text-sm text-ink-faint">₹</span>
                    <input
                      value={value}
                      onChange={(e) => setAmount(p.contactId, e.target.value)}
                      inputMode="decimal"
                      placeholder="0.00"
                      className="h-10 w-20 bg-transparent text-right font-receipt text-sm tabular-nums outline-none placeholder:text-ink-faint/70"
                    />
                  </div>
                  {p.contactId !== currentUserId() && (
                    <button
                      type="button"
                      onClick={() => removePerson(p.contactId)}
                      className="tactile flex size-7 items-center justify-center border border-ink-line text-ink-soft hover:text-red-600"
                    >
                      <Minus className="size-3" />
                    </button>
                  )}
                </div>
              </div>
              {minor > 0 && (
                <p className="mt-1 font-receipt text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                  {((minor / total) * 100).toFixed(1)}% of the bill
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/* Add from Friends */}
      {availableFriends.length > 0 && (
        <div className="mt-3 border border-ink bg-card p-3 shadow-paper">
          <div className="flex items-center justify-between">
            <p className="font-receipt text-[10px] font-bold uppercase tracking-[0.2em] text-ink">
              Add from Friend List
            </p>
            <button
              type="button"
              onClick={() => navigate("/friends")}
              className="font-receipt text-[11px] text-stamp underline hover:text-ink"
            >
              + Find Friends
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {availableFriends.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => addPerson(c)}
                className="tactile inline-flex items-center gap-1 border border-dashed border-ink bg-card px-2 py-1 font-receipt text-xs text-stamp hover:border-stamp"
              >
                <Plus className="size-3" />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={even}
          className="tactile border border-ink bg-card px-3 py-2 font-receipt text-[11px] uppercase tracking-[0.15em] shadow-paper"
        >
          Split evenly
        </button>
        <div className="h-1.5 flex-1 mx-3 overflow-hidden border border-ink-line bg-paper-2">
          <div
            className={`h-full ${remaining === 0 ? "bg-stamp" : remaining > 0 ? "bg-ink" : "bg-destructive"}`}
            style={{
              width: `${Math.min(100, Math.max(0, (assignedMinor / Math.max(total, 1)) * 100))}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-5 border border-ink bg-card px-4 py-3 font-receipt text-[13px] shadow-paper">
        {people.map((p) => (
          <div key={p.contactId} className="flex justify-between py-0.5">
            <span className="truncate">{p.displayName}</span>
            <span className="tabular-nums">
              ₹{formatReceiptAmount(parseAmountToMinor(amounts[p.contactId] ?? "") ?? 0)}
            </span>
          </div>
        ))}
        <div className="my-2 rule-dashed" />
        <div className="flex justify-between font-semibold">
          <span>TOTAL</span>
          <span className="tabular-nums">₹{formatReceiptAmount(assignedMinor)}</span>
        </div>
      </div>
    </ScreenShell>
  );
}
