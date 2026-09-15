import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ScreenShell } from "@/app/components/Shell";
import { TactileButton, EmptyState } from "@/app/components/paper";
import { initialsOf } from "@/app/lib/money";
import { Search, UserPlus, Check, X, UserX, Clock, Users, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Friends() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"friends" | "requests">("friends");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Queries
  const friends = useQuery(api.connections.listConnections) ?? [];
  const pending = useQuery(api.connections.listPendingRequests) ?? { incoming: [], outgoing: [] };
  const searchResults = useQuery(
    api.users.searchUsers,
    searchQuery.trim().length >= 2 ? { query: searchQuery.trim() } : "skip",
  ) ?? [];

  // Mutations
  const sendRequest = useMutation(api.connections.sendConnectionRequest);
  const respondRequest = useMutation(api.connections.respondConnectionRequest);
  const removeConnection = useMutation(api.connections.removeConnection);

  const pendingIncomingCount = pending.incoming.length;

  // Relationship helper
  function getRelationStatus(userId: string) {
    const isFriend = friends.find((f) => f.id === userId);
    if (isFriend) return { status: "Connected", connectionId: isFriend.connectionId };

    const incomingReq = pending.incoming.find((r) => r.user?.id === userId);
    if (incomingReq) return { status: "Pending request", connectionId: incomingReq.connectionId, isIncoming: true };

    const outgoingReq = pending.outgoing.find((r) => r.user?.id === userId);
    if (outgoingReq) return { status: "Request sent", connectionId: outgoingReq.connectionId, isOutgoing: true };

    return { status: "Not connected" };
  }

  async function handleSendRequest(recipientId: Id<"users">) {
    setActionLoading(recipientId);
    try {
      await sendRequest({ recipientId });
    } catch (err) {
      console.error("Failed to send request:", err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRespond(connectionId: Id<"connections">, accept: boolean) {
    setActionLoading(connectionId);
    try {
      await respondRequest({ connectionId, accept });
    } catch (err) {
      console.error("Failed to respond to request:", err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemove(connectionId: Id<"connections">) {
    if (!confirm("Are you sure you want to remove this friend?")) return;
    setActionLoading(connectionId);
    try {
      await removeConnection({ connectionId });
    } catch (err) {
      console.error("Failed to remove connection:", err);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <ScreenShell
      title="Friends & Connections"
      overline="Directory"
      onBack={() => navigate(-1)}
    >
      {/* Search Box */}
      <div className="mb-4 flex items-center gap-2 border border-ink bg-card px-3 shadow-paper">
        <Search className="size-4 text-ink-faint" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, username (@), or phone"
          className="h-11 w-full bg-transparent font-receipt text-sm outline-none placeholder:text-ink-faint"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-xs font-semibold text-ink-faint hover:text-ink"
          >
            Clear
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {searchQuery.trim().length >= 2 && (
        <div className="mb-6 border border-ink bg-card p-3 font-receipt shadow-paper">
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            Search Results ({searchResults.length})
          </p>
          {searchResults.length === 0 ? (
            <p className="py-2 text-center text-xs text-ink-soft">
              No users found matching "{searchQuery}".
            </p>
          ) : (
            <div className="divide-y divide-ink-line">
              {searchResults.map((u) => {
                const relation = getRelationStatus(u._id);
                return (
                  <div key={u._id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-9 items-center justify-center border border-ink bg-stamp text-xs font-bold text-stamp-foreground">
                        {initialsOf(u.name)}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-ink">{u.name}</p>
                        <p className="text-[11px] text-ink-faint">
                          {u.username ? `@${u.username}` : u.phone || u.email || ""}
                        </p>
                      </div>
                    </div>

                    <div>
                      {relation.status === "Connected" ? (
                        <span className="inline-flex items-center gap-1 border border-stamp px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-stamp">
                          <ShieldCheck className="size-3" /> Connected
                        </span>
                      ) : relation.status === "Request sent" ? (
                        <span className="inline-flex items-center gap-1 border border-ink-line px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-ink-faint">
                          <Clock className="size-3" /> Request Sent
                        </span>
                      ) : relation.status === "Pending request" ? (
                        <div className="flex items-center gap-1.5">
                          <TactileButton
                            variant="stamp"
                            size="sm"
                            disabled={actionLoading === relation.connectionId}
                            onClick={() => handleRespond(relation.connectionId as Id<"connections">, true)}
                          >
                            Accept
                          </TactileButton>
                          <TactileButton
                            variant="outline"
                            size="sm"
                            disabled={actionLoading === relation.connectionId}
                            onClick={() => handleRespond(relation.connectionId as Id<"connections">, false)}
                          >
                            Reject
                          </TactileButton>
                        </div>
                      ) : (
                        <TactileButton
                          variant="stamp"
                          size="sm"
                          disabled={actionLoading === u._id}
                          onClick={() => handleSendRequest(u._id)}
                        >
                          <UserPlus className="mr-1 size-3" /> Connect
                        </TactileButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 grid grid-cols-2 border border-ink bg-paper-2 p-0.5 font-receipt text-xs font-semibold uppercase tracking-[0.15em]">
        <button
          type="button"
          onClick={() => setActiveTab("friends")}
          className={cn(
            "py-2 transition-colors",
            activeTab === "friends"
              ? "border border-ink bg-card text-ink shadow-[0_1px_0_0_black]"
              : "text-ink-faint hover:text-ink",
          )}
        >
          Friends ({friends.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={cn(
            "relative py-2 transition-colors",
            activeTab === "requests"
              ? "border border-ink bg-card text-ink shadow-[0_1px_0_0_black]"
              : "text-ink-faint hover:text-ink",
          )}
        >
          Requests
          {pendingIncomingCount > 0 && (
            <span className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full bg-stamp text-[9px] font-bold text-stamp-foreground">
              {pendingIncomingCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content: Friends */}
      {activeTab === "friends" && (
        <div>
          {friends.length === 0 ? (
            <div className="border border-ink bg-card p-6 text-center font-receipt shadow-paper">
              <Users className="mx-auto size-8 text-ink-faint" />
              <p className="mt-2 text-sm font-semibold tracking-wider text-ink">
                NO FRIENDS YET
              </p>
              <div className="my-2 rule-dashed" />
              <p className="text-xs text-ink-soft">
                Search above using username, phone, or email to connect with friends on SplitSlip.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between border border-ink bg-card p-3 shadow-paper"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center border border-ink bg-stamp font-receipt text-sm font-bold text-stamp-foreground">
                      {initialsOf(friend.name)}
                    </span>
                    <div>
                      <p className="font-receipt text-sm font-bold text-ink">{friend.name}</p>
                      <p className="font-receipt text-xs text-ink-faint">
                        {friend.username ? `@${friend.username}` : friend.phone || friend.email || ""}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    title="Remove connection"
                    aria-label="Remove friend"
                    disabled={actionLoading === friend.connectionId}
                    onClick={() => handleRemove(friend.connectionId as Id<"connections">)}
                    className="p-2 text-ink-faint hover:text-destructive transition-colors"
                  >
                    <UserX className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Pending Requests */}
      {activeTab === "requests" && (
        <div className="space-y-5">
          {/* Incoming */}
          <div>
            <p className="mb-2 font-receipt text-[10px] uppercase tracking-[0.2em] text-ink-faint">
              Incoming Requests ({pending.incoming.length})
            </p>
            {pending.incoming.length === 0 ? (
              <p className="border border-dashed border-ink-line p-4 text-center font-receipt text-xs text-ink-faint">
                No incoming friend requests.
              </p>
            ) : (
              <div className="space-y-2">
                {pending.incoming.map((req) => (
                  <div
                    key={req.connectionId}
                    className="flex items-center justify-between border border-ink bg-card p-3 shadow-paper"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-9 items-center justify-center border border-ink bg-paper-2 font-receipt text-xs font-bold text-ink">
                        {initialsOf(req.user?.name ?? "F")}
                      </span>
                      <div>
                        <p className="font-receipt text-sm font-bold text-ink">
                          {req.user?.name ?? "Friend"}
                        </p>
                        <p className="font-receipt text-[11px] text-ink-faint">
                          {req.user?.username ? `@${req.user.username}` : req.user?.phone || ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <TactileButton
                        variant="stamp"
                        size="sm"
                        disabled={actionLoading === req.connectionId}
                        onClick={() => handleRespond(req.connectionId as Id<"connections">, true)}
                      >
                        <Check className="mr-1 size-3.5" /> Accept
                      </TactileButton>
                      <TactileButton
                        variant="outline"
                        size="sm"
                        disabled={actionLoading === req.connectionId}
                        onClick={() => handleRespond(req.connectionId as Id<"connections">, false)}
                      >
                        <X className="mr-1 size-3.5" /> Reject
                      </TactileButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing */}
          <div>
            <p className="mb-2 font-receipt text-[10px] uppercase tracking-[0.2em] text-ink-faint">
              Outgoing Requests ({pending.outgoing.length})
            </p>
            {pending.outgoing.length === 0 ? (
              <p className="border border-dashed border-ink-line p-4 text-center font-receipt text-xs text-ink-faint">
                No outgoing requests.
              </p>
            ) : (
              <div className="space-y-2">
                {pending.outgoing.map((req) => (
                  <div
                    key={req.connectionId}
                    className="flex items-center justify-between border border-ink-line bg-card p-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 items-center justify-center border border-ink-line bg-paper-2 font-receipt text-xs text-ink-soft">
                        {initialsOf(req.user?.name ?? "F")}
                      </span>
                      <div>
                        <p className="font-receipt text-sm font-medium text-ink">
                          {req.user?.name ?? "Friend"}
                        </p>
                        <p className="font-receipt text-[10px] text-ink-faint">
                          {req.user?.username ? `@${req.user.username}` : req.user?.phone || ""}
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 font-receipt text-[10px] uppercase tracking-[0.15em] text-ink-faint">
                      <Clock className="size-3" /> Pending
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </ScreenShell>
  );
}
