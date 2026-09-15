import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Search, MessageSquareText, BadgeCheck, UserPlus } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useApp, currentUserId } from "@/app/store/AppContext";
import { formatINR, initialsOf } from "@/app/lib/money";
import { ScreenShell } from "@/app/components/Shell";
import { TactileButton } from "@/app/components/paper";
import { cn } from "@/lib/utils";
import type { Contact } from "@/app/lib/types";

export default function SelectContacts() {
  const navigate = useNavigate();
  const { draft, updateDraft } = useApp();
  const liveFriends = useQuery(api.connections.listConnections);
  const [query, setQuery] = useState("");

  const friendsList = useMemo<Contact[]>(() => {
    if (liveFriends) {
      return liveFriends.map((f) => ({
        id: f.id,
        name: f.name,
        phone: f.phone || "",
        isRegistered: true,
      }));
    }
    return [];
  }, [liveFriends]);

  const [selected, setSelected] = useState<string[]>(() =>
    draft ? draft.participants.filter((p) => p.id !== currentUserId()).map((p) => p.id) : [],
  );

  const total = draft
    ? draft.items.reduce((a, b) => a + b.amountMinor, 0) + draft.taxMinor + draft.serviceMinor
    : 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friendsList;
    return friendsList.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [friendsList, query]);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function confirm() {
    if (!draft) return;
    const chosen: Contact[] = [
      { id: currentUserId(), name: "You", phone: "", isRegistered: true },
      ...friendsList.filter((c) => selected.includes(c.id)),
    ];
    // Keep item-split assignments consistent with the final roster.
    const roster = new Set(chosen.map((c) => c.id));
    const assignments = Object.fromEntries(
      Object.entries(draft.assignments).map(([itemId, ids]) => [
        itemId,
        ids.filter((id) => roster.has(id)),
      ]),
    );
    updateDraft({ participants: chosen, assignments });
    navigate("/review-request");
  }

  if (!draft) {
    return (
      <ScreenShell title="No bill yet" onBack={() => navigate("/home")}>
        <p className="text-sm text-ink-soft">Scan a bill first.</p>
      </ScreenShell>
    );
  }

  const chosen = friendsList.filter((c) => selected.includes(c.id));
  const collect = total - Math.round(total / (selected.length + 1));

  return (
    <ScreenShell
      title="Who was at the table?"
      overline="Step 4 of 4 · People"
      onBack={() => navigate(draft.splitMethod === "equal" ? "/split/equal" : draft.splitMethod === "items" ? "/split/items" : "/split/custom")}
      footer={
        <div className="space-y-2">
          {selected.length > 0 && (
            <p className="text-center font-receipt text-[11px] uppercase tracking-[0.15em] text-ink-soft">
              Collect ≈ {formatINR(collect)} from {selected.length}{" "}
              {selected.length === 1 ? "person" : "people"}
            </p>
          )}
          <TactileButton
            variant="stamp"
            size="lg"
            full
            disabled={selected.length === 0}
            onClick={confirm}
          >
            {selected.length === 0 ? "Pick at least one person" : "Make the slips"}
          </TactileButton>
        </div>
      }
    >
      <div className="flex items-center gap-2 border border-ink bg-card px-3">
        <Search className="size-4 text-ink-faint" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search connected friends"
          aria-label="Search connected friends"
          className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-ink-faint"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 border border-ink bg-card p-6 text-center font-receipt shadow-paper">
          <p className="text-sm font-semibold tracking-wider text-ink">NO CONNECTED FRIENDS YET</p>
          <div className="my-2.5 rule-dashed" />
          <p className="text-xs text-ink-soft">
            To split bills and send payment requests, connect with your friends on SplitSlip first.
          </p>
          <div className="mt-4">
            <TactileButton variant="stamp" size="md" onClick={() => navigate("/friends")}>
              <UserPlus className="mr-1.5 size-4" /> Find &amp; Connect Friends
            </TactileButton>
          </div>
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {filtered.map((c) => {
            const isSel = selected.includes(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isSel}
                  onClick={() => toggle(c.id)}
                  className={cn(
                    "tactile flex w-full items-center gap-3 border px-3 py-2.5 text-left",
                    isSel
                      ? "border-stamp bg-mint"
                      : "border-ink-line bg-card hover:border-ink",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center border font-receipt text-[11px] font-semibold",
                      isSel ? "border-stamp bg-stamp text-stamp-foreground" : "border-ink-line bg-paper-2 text-ink-soft",
                    )}
                  >
                    {initialsOf(c.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{c.name}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-soft">
                      {c.isRegistered ? (
                        <>
                          <BadgeCheck className="size-3 text-stamp" aria-hidden="true" />
                          On SplitSlip
                        </>
                      ) : (
                        <>
                          <MessageSquareText className="size-3" aria-hidden="true" />
                          Share Link (SMS Soon)
                        </>
                      )}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-5 items-center justify-center border font-receipt text-[10px]",
                      isSel ? "border-stamp bg-stamp text-stamp-foreground" : "border-ink-line",
                    )}
                  >
                    {isSel ? "✓" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {chosen.length > 0 && (
        <p className="mt-4 text-center text-[11px] leading-relaxed text-ink-faint">
          No UPI IDs needed — friends on the app get a request, everyone else
          gets a shareable payment link (SMS delivery coming soon).
        </p>
      )}
    </ScreenShell>
  );
}

