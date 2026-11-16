"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import Topbar from "../../../../components/navbar/Topbar";
import DataTable from "../../../../components/tables/DataTable";
import Badge from "../../../../components/ui/Badge";
import { restoreStaff, restoreTenants, useAppSelector } from "../../../../lib/redux-store";
import { loadAccounts, type TenantAccount } from "../../../../lib/tenantAccounts";
import { restoreOrders, useOrders } from "../../../../lib/orders";
import { buildUsers, roles, type PlatformUser, type UserRole } from "../../../../lib/mockUsers";
import { deleteUser, loadBlocked } from "../../../../lib/userActions";

const PAGE_SIZE = 10;

export default function Users() {
  const tenants = useAppSelector((state) => state.tenants);
  const staff = useAppSelector((state) => state.staff);
  const [customers, setCustomers] = useState<TenantAccount[]>([]);
  const orders = useOrders();
  const users = useMemo(() => buildUsers(tenants, staff, customers, orders), [tenants, staff, customers, orders]);

  const [blocked, setBlocked] = useState<string[]>([]);
  const [role, setRole] = useState<UserRole | "all">("all");
  const [tenant, setTenant] = useState("all");
  const [query, setQuery] = useState("");
  const [userToDelete, setUserToDelete] = useState<PlatformUser | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);

  const refresh = () => {
    setCustomers(loadAccounts().filter((a) => a.role === "customer"));
    setBlocked(loadBlocked());
  };

  useEffect(() => {
    restoreTenants();
    restoreStaff();
    restoreOrders();
    refresh();
  }, []);

  // Delete asks first. An owner cannot be deleted here, the message says where to do it.
  const askDelete = (u: PlatformUser) => {
    if (u.role === "Owner") {
      const result = deleteUser(u);
      if (!result.ok) setNotice({ tone: "warn", text: result.error });
      return;
    }
    setUserToDelete(u);
  };

  const confirmDelete = () => {
    if (!userToDelete) return;
    const result = deleteUser(userToDelete);
    setNotice(result.ok ? { tone: "ok", text: `${userToDelete.name} was deleted.` } : { tone: "warn", text: result.error });
    setUserToDelete(null);
    refresh();
  };

  const q = query.trim().toLowerCase();
  const matches = (u: PlatformUser) =>
    (tenant === "all" || u.tenant === tenant) && (!q || u.name.toLowerCase().includes(q) || u.mobile.includes(q));
  const scoped = users.filter(matches);
  const filtered = scoped.filter((u) => role === "all" || u.role === role);

  const tab = (value: UserRole | "all", label: string) => (
    <button
      key={value}
      type="button"
      aria-pressed={role === value}
      onClick={() => setRole(value)}
      className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${role === value ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-50"}`}
    >
      {label} <span className="opacity-70">{value === "all" ? scoped.length : scoped.filter((u) => u.role === value).length}</span>
    </button>
  );

  return (
    <>
      <Topbar title="Users" subtitle="Everyone on the platform: customers and service centre staff" />
      <div className="container">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {tab("all", "All")}
            {roles.map((r) => tab(r, r === "Customer" ? "Customers" : r === "Staff" ? "Staff" : `${r}s`))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or mobile"
                aria-label="Search users"
                className="input"
                style={{ width: "auto", paddingLeft: "2.25rem" }}
              />
            </label>
            <select
              value={tenant}
              onChange={(e) => setTenant(e.target.value)}
              aria-label="Filter by tenant"
              className="input"
              style={{ width: "auto" }}
            >
              <option value="all">All tenants</option>
              {tenants.map((t) => <option key={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        {notice && (
          <div
            role="status"
            className={`mb-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${notice.tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}
          >
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="font-black opacity-60 hover:opacity-100">
              ×
            </button>
          </div>
        )}

        <DataTable
          key={role + tenant}
          pageSize={PAGE_SIZE}
          exportName="users"
          headers={["ID", "Name", "Role", "Mobile", "Tenant / Centre", "Status", "Action"]}
          rows={filtered.map((u) => [
            <span key="id" className="font-mono text-xs">{u.id}</span>,
            <b key="n">{u.name}</b>,
            <Badge key="r" tone={u.role === "Customer" ? "blue" : u.role === "Owner" ? "yellow" : "gray"}>{u.role}</Badge>,
            u.mobile,
            u.tenant,
            <Badge key="s" tone={blocked.includes(u.id) ? "red" : "green"}>{blocked.includes(u.id) ? "Blocked" : "Active"}</Badge>,
            <div key="a" className="flex flex-nowrap items-center gap-2 whitespace-nowrap *:shrink-0">
              <Link
                href={`/admin/users/${encodeURIComponent(u.id)}`}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold !text-white hover:bg-slate-700"
              >
                Edit details
              </Link>
              <button
                type="button"
                onClick={() => askDelete(u)}
                aria-label={`Delete ${u.name}`}
                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
            </div>,
          ])}
        />
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">
            {users.length === 0 ? "No users yet. They appear here as tenants are created, staff are added and customers register." : "No users match your search."}
          </p>
        )}
      </div>

      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" aria-label="Delete confirmation" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Delete user</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete <strong className="text-slate-900">{userToDelete.name}</strong> ({userToDelete.role})? Their login will be removed. This cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setUserToDelete(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={confirmDelete} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700">
                Delete user
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}