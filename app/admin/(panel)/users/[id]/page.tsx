"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Topbar from "@/components/navbar/Topbar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { restoreStaff, restoreTenants, useAppSelector } from "@/lib/redux-store";
import { loadAccounts, type TenantAccount } from "@/lib/tenantAccounts";
import { restoreOrders, useOrders } from "@/lib/orders";
import { buildUsers } from "@/lib/mockUsers";
import { isEmail } from "@/lib/validators";
import { formatDate } from "@/lib/revenue";
import { deleteUser, loadBlocked, ownerTenantId, saveBlocked, updateUserDetails } from "@/lib/userActions";

export default function EditUserPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const userId = decodeURIComponent(id);

  const tenants = useAppSelector((s) => s.tenants);
  const staff = useAppSelector((s) => s.staff);
  const orders = useOrders();
  const [customers, setCustomers] = useState<TenantAccount[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    restoreTenants();
    restoreStaff();
    restoreOrders();
    setCustomers(loadAccounts().filter((a) => a.role === "customer"));
    setBlocked(loadBlocked());
    setReady(true);
  }, []);

  const users = useMemo(() => buildUsers(tenants, staff, customers, orders), [tenants, staff, customers, orders]);
  const user = users.find((u) => u.id === userId);

  if (!ready) {
    return (
      <>
        <Topbar title="User" subtitle="Loading…" />
        <div className="container" />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Topbar title="User not found" subtitle="This user does not exist or was deleted" />
        <div className="container">
          <Link href="/admin/users" className="btn btn-secondary">← Back to users</Link>
        </div>
      </>
    );
  }

  const isBlocked = blocked.includes(user.id);
  const isOwner = user.role === "Owner";
  const emailValue = user.email === "–" ? "" : user.email;

  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name")).trim();
    const email = String(form.get("email")).trim();
    if (!name) return setError("Enter the name.");
    if (email && !isEmail(email)) return setError("Enter a valid email address.");
    updateUserDetails(user, { name, email: email || undefined });
    setCustomers(loadAccounts().filter((a) => a.role === "customer"));
    setError("");
    setNotice({ tone: "ok", text: "Details saved." });
  }

  function toggleBlock() {
    if (!user) return;
    const next = isBlocked ? blocked.filter((x) => x !== user.id) : [...blocked, user.id];
    setBlocked(next);
    saveBlocked(next);
    setNotice({ tone: "ok", text: `${user.name} is now ${isBlocked ? "unblocked" : "blocked"}.` });
  }

  function remove() {
    if (!user) return;
    const result = deleteUser(user);
    if (!result.ok) {
      setConfirmDelete(false);
      setNotice({ tone: "warn", text: result.error });
      return;
    }
    router.push("/admin/users");
  }

  const info: [string, string][] = [
    ["User ID", user.id],
    ["Role", user.role],
    ["Mobile (login)", user.mobile],
    [user.role === "Customer" ? "Last used centre" : "Tenant", user.tenant],
    ["Joined", formatDate(user.joined)],
  ];

  return (
    <>
      <Topbar title={user.name} subtitle="Edit details, block or delete this user" />
      <div className="container max-w-3xl space-y-5">
        <Link href="/admin/users" className="btn btn-secondary">← Back to users</Link>

        {notice && (
          <div
            role="status"
            className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${notice.tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}
          >
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="font-black opacity-60 hover:opacity-100">
              ×
            </button>
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="details-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="details-heading" className="text-lg font-bold text-slate-900">Details</h2>
            <Badge tone={isBlocked ? "red" : "green"}>{isBlocked ? "Blocked" : "Active"}</Badge>
          </div>

          <dl className="mb-5 grid gap-4 sm:grid-cols-2">
            {info.map(([label, value]) => (
              <div key={label}>
                <dt className="muted text-xs">{label}</dt>
                <dd className="mt-1 break-all text-sm font-bold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>

          <form key={`${user.name}-${emailValue}`} onSubmit={save} noValidate className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">Name</span>
              <input name="name" maxLength={32} required className="input" defaultValue={user.name} />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">Email (optional)</span>
              <input name="email" type="email" className="input" defaultValue={emailValue} placeholder="name@example.com" />
            </label>
            <p className="muted text-xs sm:col-span-2">
              The mobile number is this user&apos;s login, so it cannot be changed here.
            </p>
            {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 sm:col-span-2">{error}</p>}
            <div className="sm:col-span-2">
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="manage-heading">
          <h2 id="manage-heading" className="text-lg font-bold text-slate-900">Manage</h2>
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">{isBlocked ? "Unblock user" : "Block user"}</p>
                <p className="muted mt-1 text-xs">
                  {isBlocked ? "Unblocking lets this user sign in again." : "A blocked user cannot sign in until you unblock them."}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleBlock}
                className={`rounded-lg px-4 py-2.5 text-sm font-bold text-white ${isBlocked ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}
              >
                {isBlocked ? "Unblock user" : "Block user"}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div>
                <p className="text-sm font-bold text-red-700">Delete user</p>
                <p className="muted mt-1 text-xs">
                  {isOwner ? (
                    <>
                      This is the owner of {user.tenant}. To remove an owner, delete the service centre from{" "}
                      <Link href={`/admin/tenants/${ownerTenantId(user)}`} className="font-bold underline">its Edit page</Link>.
                    </>
                  ) : (
                    "Removes this user and their login. This cannot be undone."
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={isOwner}
                className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          </div>
        </section>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" aria-label="Delete confirmation" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Delete user</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete <strong className="text-slate-900">{user.name}</strong> ({user.role})? Their login will be removed. This cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={remove} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700">
                Delete user
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}