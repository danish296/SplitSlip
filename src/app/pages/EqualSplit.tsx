import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Minus, Plus, Users, UserPlus, Sparkles } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useApp, currentUserId } from "@/app/store/AppContext";
import { calculateEqualSplit, type ParticipantRef } from "@/app/lib/splits";
import { formatINR, formatReceiptAmount, initialsOf, uid } from "@/app/lib/money";
import { ScreenShell } from "@/app/components/Shell";
import { TactileButton } from "@/app/components/paper";
import type { Contact } from "@/app/lib/types";

export default function EqualSplit() {
  const navigate = useNavigate();
  const { draft, contacts, updateDraft } = useApp();

  // Reactive friends list from Convex
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

  const [guestName, setGuestName] = useState("");

  const total = draft
    ? draft.items.reduce((a, b) => a + b.amountMinor, 0) +
      draft.taxMinor +
      draft.serviceMinor
    : 0;

  const preview = useMemo(
    () => calculateEqualSplit(total, people, currentUserId(), "You"),
    [total, people],
  );

  function addPerson(c: Contact) {
    if (people.some((p) => p.contactId === c.id)) return;
    setPeople((ps) => [...ps, { contactId: c.id, displayName: c.name }]);
  }

  function removePerson(id: string) {
    if (id === currentUserId()) return;
    setPeople((ps) => ps.filter((p) => p.contactId !== id));
  }

  function handleAddGuest(e: React.FormEvent) {
    e.preventDefault();
    const clean = guestName.trim();
    if (!clean) return;
    const guestId = uid("guest");
    setPeople((ps) => [...ps, { contactId: guestId, displayName: clean }]);
    setGuestName("");
  }

  const availableFriends = useMemo(() => {
    return friendsList.filter((c) => !people.some((p) => p.contactId === c.id));
  }, [friendsList, people]);

  function saveAndContinue() {
    if (!draft) return;
    // Persist chosen participants onto the draft
    const chosen: Contact[] = people.map((p) => {
      if (p.contactId === currentUserId()) {
        return { id: currentUserId(), name: "You", phone: "", isRegistered: true };
      }
      const existing = friendsList.find((c) => c.id === p.contactId);
      if (existing) return existing;
      return {
        id: p.contactId,
        name: p.displayName,
        phone: "",
        isRegistered: false,
      };
    });
    updateDraft({ participants: chosen, splitMethod: "equal" });
    navigate("/people");
  }

  return (
    <ScreenShell
      title="Split equally"
      overline="Step 3 of 4 · Proportions"
      onBack={() => navigate("/split")}
      footer={
        <div className="space-y-2">
          {people.length < 2 && (
            <p className="text-center font-receipt text-[11px] uppercase tracking-[0.2em] text-stamp">
              Add at least 1 friend or guest below
            </p>
          )}
          <TactileButton
            variant="stamp"
            size="lg"
            full
            disabled={people.length < 2}
            onClick={saveAndContinue}
          >
            {people.length < 2 ? "Add someone to continue" : "Looks right · continue"}
          </TactileButton>
        </div>
      }
    >
      {/* Top Total & Per-Person Card */}
      <div className="border border-ink bg-card p-5 text-center font-receipt shadow-paper">
        <p className="text-[10px] uppercase tracking-[0.3em] text-ink-faint">Total Bill</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{formatINR(total)}</p>
        <div className="my-3 rule-dashed" />
        <p className="text-[10px] uppercase tracking-[0.3em] text-ink-faint">
          {people.length} {people.length === 1 ? "person" : "people"}
        </p>
        <p className="mt-1 text-4xl font-bold tabular-nums text-stamp">
          ₹{people.length ? formatReceiptAmount(Math.floor(total / people.length)) : "0.00"}
        </p>
        <p className="text-[10px] uppercase tracking-[0.3em] text-ink-faint">each</p>
      </div>

      {/* People at the Table */}
      <section aria-label="People on this bill" className="mt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-ink">
            At the table ({people.length})
          </h2>
          <span className="font-receipt text-[10px] uppercase tracking-wider text-ink-faint">
            Tap minus to remove
          </span>
        </div>

        <ul className="mt-2 space-y-1.5">
          {people.map((p) => {
            const row = preview.participants.find((x) => x.contactId === p.contactId);
            const isSelf = p.contactId === currentUserId();
            return (
              <li
                key={p.contactId}
                className="flex items-center justify-between border border-ink-line bg-card px-3 py-2 shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full border border-ink bg-paper-2 font-receipt text-xs font-bold text-ink">
                    {initialsOf(p.displayName)}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {p.displayName} {isSelf && <span className="text-xs text-ink-faint">(You)</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-receipt text-sm tabular-nums text-ink">
                    ₹{formatReceiptAmount(row?.amountMinor ?? 0)}
                  </span>
                  {!isSelf && (
                    <button
                      type="button"
                      aria-label={`Remove ${p.displayName}`}
                      onClick={() => removePerson(p.contactId)}
                      className="tactile flex size-7 items-center justify-center border border-ink-line bg-background text-ink-soft transition-colors hover:border-ink hover:text-red-600"
                    >
                      <Minus className="size-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Add from Friends Section */}
      <section aria-label="Add from friends" className="mt-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-[0.12em] text-ink">
            <Users className="size-4 text-stamp" />
            <span>Add from Friend List</span>
          </h2>
          <button
            type="button"
            onClick={() => navigate("/friends")}
            className="flex items-center gap-1 font-receipt text-[11px] text-stamp underline hover:text-ink"
          >
            <UserPlus className="size-3" />
            <span>Find Friends</span>
          </button>
        </div>

        {availableFriends.length > 0 ? (
          <div className="mt-2 space-y-1.5">
            {availableFriends.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between border border-ink-line bg-paper-2 px-3 py-2 transition-colors hover:bg-card"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-full border border-ink bg-card font-receipt text-xs font-bold text-ink">
                    {initialsOf(c.name)}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">{c.name}</p>
                    {c.username && (
                      <p className="font-receipt text-[11px] text-ink-faint">@{c.username}</p>
                    )}
                  </div>
                </div>

                <TactileButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addPerson(c)}
                  className="gap-1 text-xs"
                >
                  <Plus className="size-3.5 text-stamp" />
                  <span>Add</span>
                </TactileButton>
              </div>
            ))}
          </div>
        ) : friendsList.length > 0 ? (
          <div className="mt-2 border border-dashed border-ink-line bg-card p-3 text-center font-receipt text-xs text-ink-soft">
            ✓ All connected friends have been added to the table.
          </div>
        ) : (
          <div className="mt-2 border border-dashed border-ink-line bg-card p-4 text-center">
            <p className="text-xs text-ink-soft leading-relaxed">
              No connected friends found yet. You can connect with friends in the directory, or add a guest below.
            </p>
            <TactileButton
              variant="outline"
              size="sm"
              className="mt-2.5"
              onClick={() => navigate("/friends")}
            >
              <UserPlus className="mr-1.5 size-3.5" /> Open Friends Directory
            </TactileButton>
          </div>
        )}
      </section>

      {/* Quick Add Guest Form */}
      <section aria-label="Add guest" className="mt-5">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-ink">
          Add Guest / Custom Person
        </h2>
        <form onSubmit={handleAddGuest} className="mt-2 flex gap-2">
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="e.g. Rahul, Tanya, or Mom"
            className="h-10 flex-1 border border-ink bg-card px-3 font-receipt text-xs outline-none placeholder:text-ink-faint focus:border-stamp focus:outline-none"
          />
          <TactileButton
            type="submit"
            variant="outline"
            size="sm"
            disabled={!guestName.trim()}
          >
            <Plus className="mr-1 size-3.5" /> Add Guest
          </TactileButton>
        </form>
      </section>

      {/* Summary Reconciliation Slip */}
      <div className="mt-6 border border-ink bg-card px-4 py-3 font-receipt text-[13px] shadow-paper">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-ink-faint">
          SUMMARY SLIP
        </p>
        <div className="my-2 rule-dashed" />
        {preview.participants.map((p) => (
          <div key={p.contactId} className="flex justify-between py-0.5">
            <span className="truncate">{p.displayName}</span>
            <span className="tabular-nums">₹{formatReceiptAmount(p.amountMinor)}</span>
          </div>
        ))}
        <div className="my-2 rule-dashed" />
        <div className="flex justify-between font-semibold">
          <span>TOTAL</span>
          <span className="tabular-nums">₹{formatReceiptAmount(preview.assignedMinor)}</span>
        </div>
        <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-stamp">
          ✓ Reconciles exactly
        </p>
      </div>
    </ScreenShell>
  );
}
