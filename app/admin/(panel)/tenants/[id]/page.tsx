"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Topbar from "@/components/navbar/Topbar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import WhatsAppCredentialsModal from "@/components/admin/WhatsAppCredentialsModal";
import { generateTempPassword } from "@/lib/tempPassword";
import { createAccount, findAccount, removeTenantAccounts } from "@/lib/tenantAccounts";
import { describeSubscription } from "@/lib/ownerTenant";
import { formatDate, ymd } from "@/lib/revenue";
import { paidPlans, planExpiry, planPriceOf } from "@/lib/plans";
import { amountLabel, latestRecord, newSubscriptionRecord, payDateLabel, tenantHistory } from "@/lib/subscriptionHistory";
import {
  restoreStaff,
  restoreTenants,
  store,
  tenantHeadcount,
  useAppSelector,
  type Tenant,
} from "@/lib/redux-store";

type Notice = { tone: "ok" | "warn"; text: string };

const startDate = (s: string) => new Date(`${s}T00:00:00`);

export default function EditTenantPage() {
  const { id } = useParams<{ id: string }>();
  const tenants = useAppSelector((s) => s.tenants);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    restoreTenants();
    restoreStaff();
    setReady(true);
  }, []);

  const tenant = tenants.find((t) => t.id === id);

  if (!ready) {
    return (
      <>
        <Topbar title="Tenant" subtitle="Loading…" />
        <div className="container" />
      </>
    );
  }

  if (!tenant) {
    return (
      <>
        <Topbar title="Tenant not found" subtitle="This service centre does not exist or was deleted" />
        <div className="container">
          <Link href="/admin/tenants" className="btn btn-secondary">← Back to tenants</Link>
        </div>
      </>
    );
  }

  return <Workspace tenant={tenant} />;
}

function Workspace({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const staff = useAppSelector((s) => s.staff);
  const sub = describeSubscription(tenant);
  const team = tenantHeadcount(staff, tenant.id);
  const last = latestRecord(tenant);

  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [credentials, setCredentials] = useState<{
    owner: string;
    centre: string;
    mobile: string;
    password: string;
    reset?: boolean;
  } | null>(null);

  function saveDetails(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name")).trim();
    const owner = String(form.get("owner")).trim();
    if (!name || !owner) return;
    store.dispatch({ type: "tenants/updated", payload: { ...tenant, name, owner } });
    setEditing(false);
    setNotice({ tone: "ok", text: "Details saved." });
  }

  function toggleStatus() {
    if (tenant.status === "Suspended" && sub.expired) {
      setNotice({
        tone: "warn",
        text: `${tenant.name}'s subscription has expired. Renew the plan below before activating.`,
      });
      return;
    }
    const next = tenant.status === "Active" ? "Suspended" : "Active";
    store.dispatch({ type: "tenants/updated", payload: { ...tenant, status: next } });
    setNotice({ tone: "ok", text: `${tenant.name} is now ${next.toLowerCase()}.` });
  }

  function askReset() {
    if (!tenant.mobile) {
      setNotice({
        tone: "warn",
        text: `${tenant.name} has no owner mobile number on file, so the login cannot be reset.`,
      });
      return;
    }
    setConfirmReset(true);
  }

  // New temporary password, shown once and sent on WhatsApp. The owner must change it on next sign-in.
  async function resetPassword() {
    const mobile = tenant.mobile;
    if (!mobile) return;
    setConfirmReset(false);
    const password = generateTempPassword();
    await createAccount({
      mobile,
      email: tenant.email,
      name: tenant.owner,
      role: "owner",
      tenantId: tenant.id,
      password,
      createdAt: findAccount(mobile)?.createdAt,
    });
    setCredentials({ owner: tenant.owner, centre: tenant.name, mobile, password, reset: true });
  }

  function deleteTenant() {
    removeTenantAccounts(tenant.id);
    store.dispatch({ type: "tenants/deleted", payload: tenant.id });
    store.dispatch({ type: "staff/removedForTenant", payload: tenant.id });
    router.push("/admin/tenants");
  }

  const planBadge = sub.expired
    ? { tone: "red" as const, text: "Expired" }
    : sub.isTrial
      ? { tone: "yellow" as const, text: "Free trial" }
      : { tone: "green" as const, text: "Active plan" };

  const info: [string, string][] = [
    ["Tenant ID", tenant.id],
    ["Service centre", tenant.name],
    ["Owner", tenant.owner],
    ["Owner mobile", tenant.mobile ?? "—"],
    ["Email", tenant.email ?? "—"],
    ["Created on", formatDate(tenant.createdAt)],
    ["Team", `${team.total} (1 owner, ${team.managers} manager${team.managers === 1 ? "" : "s"}, ${team.staff} staff)`],
  ];

  return (
    <>
      <Topbar title={tenant.name} subtitle="View, edit and manage this service centre" />
      <div className="container max-w-4xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/tenants" className="btn btn-secondary">← Back to tenants</Link>
          <Link href={`/admin/tenants/${tenant.id}/history`} className="btn btn-secondary">Subscription history</Link>
        </div>

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
        

        {/* Details: view, then edit */}
        <section className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="details-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="details-heading" className="text-lg font-bold text-slate-900">Details</h2>
            {!editing && (
              <button type="button" onClick={() => setEditing(true)} className="btn btn-secondary">
                Edit details
              </button>
            )}
          </div>
          {!editing ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              {info.map(([label, value]) => (
                <div key={label}>
                  <dt className="muted text-xs">{label}</dt>
                  <dd className="mt-1 text-sm font-bold text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <form onSubmit={saveDetails} className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Service centre name</span>
                <input name="name" maxLength={32} required className="input" defaultValue={tenant.name} />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Owner name</span>
                <input name="owner" maxLength={32} required className="input" defaultValue={tenant.owner} />
              </label>
              <p className="muted text-xs sm:col-span-2">
                The owner mobile number is the owner&apos;s login, so it cannot be changed here.
              </p>
              <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                <Button type="submit">Save changes</Button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Current subscription */}
        <section className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="plan-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="plan-heading" className="text-lg font-bold text-slate-900">Current subscription</h2>
            <Badge tone={planBadge.tone}>{planBadge.text}</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="muted text-xs">Plan</p>
              <p className="mt-1 font-black">{tenant.plan}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="muted text-xs">Last payment</p>
              <p className="mt-1 font-black">{amountLabel(last)}</p>
              <p className="muted mt-1 text-xs">{payDateLabel(last)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="muted text-xs">Expires on</p>
              <p className="mt-1 font-black">{formatDate(tenant.subscriptionExpiresAt)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="muted text-xs">Days left</p>
              <p className="mt-1 font-black">{sub.expired ? "Expired" : sub.daysLeft}</p>
            </div>
          </div>
          <RenewForm
            key={`${tenant.plan}-${tenant.subscriptionExpiresAt}`}
            tenant={tenant}
            onDone={() => setNotice({ tone: "ok", text: "Plan updated and added to the subscription history." })}
          />
        </section>

        {/* Manage: suspend, reset password, delete */}
        <section className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="manage-heading">
          <h2 id="manage-heading" className="text-lg font-bold text-slate-900">Manage</h2>
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Status: <Badge tone={tenant.status === "Active" ? "green" : "red"}>{tenant.status}</Badge>
                </p>
                <p className="muted mt-1 text-xs">
                  {tenant.status === "Active"
                    ? "Suspending blocks the owner, manager and staff of this centre and hides it from customers."
                    : "Activating opens the centre again."}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleStatus}
                className={`rounded-lg border px-4 py-2.5 text-sm font-bold ${tenant.status === "Active" ? "border-rose-200 text-rose-700 hover:bg-rose-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
              >
                {tenant.status === "Active" ? "Suspend" : "Activate"}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div>
                <p className="text-sm font-bold text-slate-900">Reset owner password</p>
                <p className="muted mt-1 text-xs">Creates a new temporary password and sends it on WhatsApp.</p>
              </div>
              <button type="button" onClick={askReset} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                Reset password
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div>
                <p className="text-sm font-bold text-red-700">Delete tenant</p>
                <p className="muted mt-1 text-xs">Removes this centre, its owner login and its staff. This cannot be undone.</p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50"
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
            <h3 className="text-lg font-bold text-slate-900">Delete tenant</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete <strong className="text-slate-900">{tenant.name}</strong>? This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={deleteTenant} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700">
                Delete tenant
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" aria-label="Reset password confirmation" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Reset owner password</h3>
            <p className="mt-2 text-sm text-slate-600">
              Reset the password for <strong className="text-slate-900">{tenant.owner}</strong> ({tenant.name})? The old password will stop working and a new temporary one will be shown.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setConfirmReset(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={resetPassword} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700">
                Reset password
              </button>
            </div>
          </div>
        </div>
      )}

      {credentials && <WhatsAppCredentialsModal {...credentials} onClose={() => setCredentials(null)} />}
    </>
  );
}

/** Renew or change the plan: records the payment in the subscription history and moves the expiry date. */
function RenewForm({ tenant, onDone }: { tenant: Tenant; onDone: () => void }) {
  const today = ymd(new Date());
  const firstPlan = paidPlans.some((p) => p.name === tenant.plan) ? tenant.plan : "";
  const [plan, setPlan] = useState(firstPlan);
  const [amount, setAmount] = useState(firstPlan ? String(planPriceOf(firstPlan) || "") : "");
  const [payDate, setPayDate] = useState(today);
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState(firstPlan ? planExpiry(firstPlan, new Date()) : "");
  const [error, setError] = useState("");

  function changePlan(name: string) {
    setPlan(name);
    setAmount(String(planPriceOf(name) || "")); // the price the admin set on the Plans page
    if (name && startsOn) setEndsOn(planExpiry(name, startDate(startsOn)));
    setError("");
  }

  function changeStart(value: string) {
    setStartsOn(value);
    if (plan && value) setEndsOn(planExpiry(plan, startDate(value)));
    setError("");
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const paid = Number(amount) || 0;
    if (!plan) return setError("Choose a plan.");
    if (paid <= 0) return setError("Enter the amount received.");
    if (!payDate || !startsOn || !endsOn) return setError("Fill in the pay date and the plan dates.");
    if (endsOn <= startsOn) return setError("The plan must end after it starts.");

    const record = newSubscriptionRecord({ plan, amount: paid, payDate, startsOn, endsOn });
    store.dispatch({
      type: "tenants/updated",
      payload: {
        ...tenant,
        plan,
        subscriptionExpiresAt: endsOn,
        subscriptionHistory: [...tenantHistory(tenant), record],
      },
    });
    setError("");
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="mt-6 border-t border-slate-100 pt-5">
      <h3 className="font-black text-slate-900">Renew or change plan</h3>
      <p className="muted mt-1 text-xs">
        The amount is filled from the Plans page price. Change it if the centre paid something different.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">Plan</span>
          <select className="input" value={plan} onChange={(e) => changePlan(e.target.value)}>
            <option value="">Select a plan</option>
            {paidPlans.map((p) => (
              <option key={p.name}>{p.name}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">Amount received (₹)</span>
          <input
            inputMode="numeric"
            className="input"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value.replace(/\D/g, "").slice(0, 7));
              setError("");
            }}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">Pay date</span>
          <input type="date" className="input" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">Plan starts on</span>
          <input type="date" className="input" value={startsOn} onChange={(e) => changeStart(e.target.value)} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">Plan ends on</span>
          <input type="date" className="input" value={endsOn} onChange={(e) => { setEndsOn(e.target.value); setError(""); }} />
        </label>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
      <div className="mt-4">
        <Button type="submit">Save plan &amp; payment</Button>
      </div>
    </form>
  );
}