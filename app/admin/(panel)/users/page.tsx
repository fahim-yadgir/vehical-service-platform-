"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import Topbar from "../../../../components/navbar/Topbar";
import DataTable from "../../../../components/tables/DataTable";
import Badge from "../../../../components/ui/Badge";
import UserDetailsModal from "../../../../components/admin/UserDetailsModal";
import { restoreStaff, restoreTenants, useAppSelector } from "../../../../lib/redux-store";
import { loadAccounts, type TenantAccount } from "../../../../lib/tenantAccounts";
import { restoreOrders, useOrders } from "../../../../lib/orders";
import { buildUsers, roles, type PlatformUser, type UserRole } from "../../../../lib/mockUsers";

const BLOCKED_KEY = "vehicle-service-platform.blockedUsers";
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
  const [viewingId, setViewingId] = useState<string | null>(null);

  useEffect(() => {
    restoreTenants();
    restoreStaff();
    restoreOrders();
    setCustomers(loadAccounts().filter((a) => a.role === "customer"));
    try {
      const saved = JSON.parse(window.localStorage.getItem(BLOCKED_KEY) ?? "[]");
      if (Array.isArray(saved)) setBlocked(saved);
    } catch {}
  }, []);

  const toggleBlock = (u: PlatformUser) => {
    const next = blocked.includes(u.id) ? blocked.filter((id) => id !== u.id) : [...blocked, u.id];
    setBlocked(next);
    try {
      window.localStorage.setItem(BLOCKED_KEY, JSON.stringify(next));
    } catch {}
  };

  const q = query.trim().toLowerCase();
  const matches = (u: PlatformUser) =>
    (tenant === "all" || u.tenant === tenant) && (!q || u.name.toLowerCase().includes(q) || u.mobile.includes(q));
  const scoped = users.filter(matches);
  const filtered = scoped.filter((u) => role === "all" || u.role === role);
  const viewing = users.find((u) => u.id === viewingId) ?? null;

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
              <button type="button" onClick={() => setViewingId(u.id)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700">View</button>
              <button
                type="button"
                onClick={() => toggleBlock(u)}
                className={`rounded-lg border px-3 py-2 text-xs font-bold ${blocked.includes(u.id) ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-rose-200 text-rose-700 hover:bg-rose-50"}`}
              >
                {blocked.includes(u.id) ? "Unblock" : "Block"}
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

      {viewing && <UserDetailsModal user={viewing} blocked={blocked.includes(viewing.id)} onClose={() => setViewingId(null)} onToggleBlock={toggleBlock} />}
    </>
  );
}