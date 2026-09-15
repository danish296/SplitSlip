import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { TriangleAlert } from "lucide-react";
import { useApp, currentUserId } from "@/app/store/AppContext";
import { calculateItemSplit, type ParticipantRef } from "@/app/lib/splits";
import { formatINR, formatReceiptAmount, splitEvenly } from "@/app/lib/money";
import { ScreenShell } from "@/app/components/Shell";
import { TactileButton, ParticipantChip } from "@/app/components/paper";
import type { Contact } from "@/app/lib/types";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, Minus, Users, UserPlus } from "lucide-react";

export default function ItemSplit() {
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

  const [assignments, setAssignments] = useState<Record<string, string[]>>(
    () => draft?.assignments ?? {},
  );

  const items = draft?.items ?? [];
  const itemsTotal = items.reduce((a, b) => a + b.amountMinor, 0);
  const extras = (draft?.taxMinor ?? 0) + (draft?.serviceMinor ?? 0);
  const grandTotal = itemsTotal + extras;

  // Distribute extras (GST/service) proportionally over assigned items at the end.
  const preview = useMemo(
    () => calculateItemSplit(items, assignments, people, currentUserId(), "You"),
    [items, assignments, people],
  );

  const unassigned = items.filter((i) => (assignments[i.id] ?? []).length === 0);
  const canContinue = items.length > 0 && unassigned.length === 0;

  function toggle(itemId: string, personId: string) {
    setAssignments((prev) => {
      const current = prev[itemId] ?? [];
      const next = current.includes(personId)
        ? current.filter((p) => p !== personId)
        : [...current, personId];
      return { ...prev, [itemId]: next };
    });
  }

  function assignAllTo(itemId: string) {
    setAssignments((prev) => ({ ...prev, [itemId]: people.map((p) => p.contactId) }));
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
    updateDraft({ assignments, participants: chosen, splitMethod: "items" });
    navigate("/people");
  }

  if (!draft) {
    return (
      <ScreenShell title="No bill yet" onBack={() => navigate("/home")}>
        <p className="text-sm text-ink-soft">Scan a bill first.</p>
      </ScreenShell>
    );
  }

  const itemsWithExtras = itemsTotal > 0 ? grandTotal / itemsTotal : 1;

  return (
    <ScreenShell
      title="Who had what?"
      overline="Step 3 of 4 · Item split"
      onBack={() => navigate("/split")}
      footer={
        <div className="space-y-2">
          {!canContinue && (
            <p className="flex items-center justify-center gap-1.5 text-center font-receipt text-[11px] uppercase tracking-[0.15em] text-destructive">
              <TriangleAlert className="size-3.5" aria-hidden="true" />
              {unassigned.length > 0
                ? `${unassigned.length} ${unassigned.length === 1 ? "item" : "items"} still unassigned`
                : "Assign every item to continue"}
            </p>
          )}
          <TactileButton
            variant="stamp"
            size="lg"
            full
            disabled={!canContinue}
            onClick={saveAndContinue}
          >
            {canContinue ? "Looks right · continue" : "Assign all items first"}
          </TactileButton>
        </div>
      }
    >
      {/* People on bill / Add friend chips */}
      <div className="mb-4 border border-ink bg-card p-3 shadow-paper">
        <div className="flex items-center justify-between">
          <p className="font-receipt text-[10px] font-bold uppercase tracking-[0.2em] text-ink">
            At the table ({people.length})
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
          {people.map((p) => (
            <span
              key={p.contactId}
              className="inline-flex items-center gap-1 border border-ink bg-paper-2 px-2 py-1 font-receipt text-xs text-ink"
            >
              <span>{p.displayName}</span>
              {p.contactId !== currentUserId() && (
                <button
                  type="button"
                  onClick={() => setPeople((ps) => ps.filter((x) => x.contactId !== p.contactId))}
                  className="text-ink-soft hover:text-red-600"
                >
                  <Minus className="size-3" />
                </button>
              )}
            </span>
          ))}

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

      <div className="flex items-baseline justify-between font-receipt">
        <span className="text-[10px] uppercase tracking-[0.25em] text-ink-faint">Bill total</span>
        <span className="text-lg font-semibold tabular-nums">{formatINR(grandTotal)}</span>
      </div>

      <ul className="mt-3 space-y-3">
        {items.map((item) => {
          const who = assignments[item.id] ?? [];
          const share = who.length ? splitEvenly(item.amountMinor, who.length) : [];
          return (
            <li key={item.id} className="border border-ink bg-card p-3 shadow-paper">
              <div className="flex items-baseline justify-between gap-2">
                <p className="min-w-0 truncate font-receipt text-[13px] font-semibold">
                  {item.quantity} × {item.name}
                </p>
                <p className="shrink-0 font-receipt text-[13px] tabular-nums">
                  ₹{formatReceiptAmount(item.amountMinor)}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {people.map((p) => (
                  <ParticipantChip
                    key={p.contactId}
                    name={p.displayName.split(" ")[0]}
                    selected={who.includes(p.contactId)}
                    onClick={() => toggle(item.id, p.contactId)}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="font-receipt text-[11px] text-ink-soft">
                  {who.length === 0 ? (
                    <span className="text-destructive">Nobody yet</span>
                  ) : (
                    who
                      .map((id, i) => {
                        const name =
                          people.find((p) => p.contactId === id)?.displayName.split(" ")[0] ?? "";
                        return `${name} ₹${formatReceiptAmount(share[i] ?? 0)}`;
                      })
                      .join(" · ")
                  )}
                </p>
                {who.length !== people.length && (
                  <button
                    type="button"
                    onClick={() => assignAllTo(item.id)}
                    className="tactile text-[10px] font-semibold uppercase tracking-[0.15em] text-stamp"
                  >
                    Everyone
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 border border-ink bg-card px-4 py-3 font-receipt text-[13px] shadow-paper">
        <p className="text-[10px] uppercase tracking-[0.25em] text-ink-faint">
          Running share (items + taxes)
        </p>
        <div className="mt-1.5">
          {preview.participants.map((p) => (
            <div key={p.contactId} className="flex justify-between py-0.5">
              <span className="truncate">{p.displayName}</span>
              <span className="tabular-nums">
                ₹{formatReceiptAmount(Math.round((p.amountMinor) * itemsWithExtras))}
              </span>
            </div>
          ))}
        </div>
        <div className="my-2 rule-dashed" />
        <div className="flex justify-between font-semibold">
          <span>ASSIGNED</span>
          <span className="tabular-nums">
            ₹{formatReceiptAmount(Math.round(preview.assignedMinor * itemsWithExtras))}
          </span>
        </div>
        <p
          className={`mt-1 text-[10px] uppercase tracking-[0.2em] ${
            unassigned.length === 0 ? "text-stamp" : "text-destructive"
          }`}
        >
          {unassigned.length === 0 ? "✓ Every item assigned" : `${unassigned.length} item(s) unassigned`}
        </p>
      </div>
    </ScreenShell>
  );
}
