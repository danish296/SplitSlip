import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AdminLayout } from "../AdminLayout";
import { Search, Shield, Trash2, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const users = useQuery(api.admin.listUsers, { search: search || undefined, limit: 200 });
  const updateRole = useMutation(api.admin.updateUserRole);
  const deleteUser = useMutation(api.admin.deleteUser);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleRoleChange = async (userId: any, newRole: "admin" | "user" | "member") => {
    try {
      await updateRole({ userId, role: newRole });
      toast.success(`Role updated to ${newRole}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update role");
    }
  };

  const handleDelete = async (userId: any) => {
    try {
      await deleteUser({ userId });
      toast.success("User deleted");
      setConfirmDelete(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete user");
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100 sm:text-2xl">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            {users ? `${users.length} users` : "Loading…"}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, username…"
            className="h-10 w-full rounded-md border border-gray-700 bg-[#0d1117] pl-10 pr-4 text-sm text-gray-200 outline-none placeholder:text-gray-600 focus:border-emerald-500/50 sm:w-72"
          />
        </div>
      </div>

      {!users ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-gray-800 bg-[#161b22]" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="rounded-lg border border-gray-800 bg-[#161b22] p-8 text-center text-sm text-gray-600">
          No users found.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-800 bg-[#161b22]">
              <tr>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">User</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Contact</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Role</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Joined</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex size-8 items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
                        style={{ backgroundColor: user.avatarColor || "#6366f1" }}
                      >
                        {(user.name?.[0] ?? "?").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-200">
                          {user.name ?? "Unnamed"}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          @{user.username ?? "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-400">{user.email ?? "—"}</p>
                    <p className="text-xs text-gray-600">{user.phone ?? ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role ?? "user"}
                      onChange={(e) =>
                        handleRoleChange(user._id, e.target.value as any)
                      }
                      className={cn(
                        "rounded border px-2 py-1 text-xs font-semibold outline-none",
                        user.role === "admin"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border-gray-700 bg-[#0d1117] text-gray-300",
                      )}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums text-gray-500">
                    {new Date(user._creationTime).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {confirmDelete === user._id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(user._id)}
                          className="rounded bg-red-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-red-700"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="rounded bg-gray-700 px-2 py-1 text-[10px] font-bold text-gray-300 hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(user._id)}
                        className="rounded p-1.5 text-gray-600 hover:bg-red-500/10 hover:text-red-400"
                        title="Delete user"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
