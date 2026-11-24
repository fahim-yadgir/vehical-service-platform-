"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Topbar from "@/components/navbar/Topbar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import WhatsAppCredentialsModal from "@/components/admin/WhatsAppCredentialsModal";
import { describeSubscription } from "@/lib/ownerTenant";
import {
  restoreStaff,
  restoreTenants,
  store,
  type Tenant,
} from "@/lib/redux-store";

type Notice = { tone: "ok" | "warn"; text: string };

type TenantApiDetail = {
  id: string;
  name: string;
  owner: string;
  ownerId: string | null;
  status: "Active" | "Suspended";
  plan: string;
  planId: string | null;
  mobile: string | null;
  email: string | null;
  createdAt: string;
  subscriptionExpiresAt: string | null;
  team: {
    managers: number;
    staff: number;
    total: number;
  };
  lastSubscription: {
    plan: string;
    amount: number;
    payDate: string | null;
    startsOn: string | null;
    endsOn: string | null;
  } | null;
  profile: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    gstin: string;
    lat: number | null;
    lng: number | null;
  };
};

type TenantGetResponse = {
  tenant?: TenantApiDetail;
  error?: string;
};

type PlanItem = {
  id: string;
  name: string;
  tier: string | null;
  months: number;
  days: number;
  price: number;
  orderLimit: number;
  isActive: boolean;
};

type PlansGetResponse = {
  plans?: PlanItem[];
  error?: string;
};

type PatchTenantResponse = {
  ok?: boolean;
  tenant?: TenantApiDetail;
  error?: string;
};

type ResetPasswordResponse = {
  ownerName?: string;
  mobile?: string;
  temporaryPassword?: string;
  error?: string;
};

type DeleteTenantResponse = {
  ok?: boolean;
  error?: string;
};

const API = `${process.env.NEXT_PUBLIC_APP_URL}`;
const PLANS_PATH = "/api/plans";

const pad2 = (n: number) => String(n).padStart(2, "0");

function localYmd(d = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addPlanDurationYmd(startYmd: string, months: number, days: number): string {
  const parts = startYmd.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return "";
  const [y, m, day] = parts;
  const dt = new Date(y, m - 1, day);
  if (Number.isNaN(dt.getTime())) return "";

  if (months > 0) {
    const targetMonth = dt.getMonth() + months;
    const maxDayInMonth = new Date(dt.getFullYear(), targetMonth + 1, 0).getDate();
    dt.setDate(1);
    dt.setMonth(targetMonth);
    dt.setDate(Math.min(day, maxDayInMonth));
  }
  if (days > 0) {
    dt.setDate(dt.getDate() + days);
  }
  return localYmd(dt);
}

function formatIsoDate(iso: string | null | undefined, fallback = "—"): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getRemainingDays(
  expiresAt: string | null | undefined,
  subDaysLeft: unknown
): { daysLeft: number | null; isExpired: boolean } {
  if (expiresAt) {
    const expDate = new Date(expiresAt);
    if (!Number.isNaN(expDate.getTime())) {
      const diffMs = expDate.getTime() - Date.now();
      if (diffMs <= 0) {
        return { daysLeft: 0, isExpired: true };
      }
      return {
        daysLeft: Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
        isExpired: false,
      };
    }
  }

  if (typeof subDaysLeft === "number" && Number.isFinite(subDaysLeft)) {
    return {
      daysLeft: Math.max(0, Math.floor(subDaysLeft)),
      isExpired: subDaysLeft <= 0,
    };
  }

  return { daysLeft: null, isExpired: false };
}

function toWorkspaceTenant(d: TenantApiDetail): Tenant {
  return {
    id: d.id,
    name: d.name,
    owner: d.owner,
    status: d.status,
    plan: d.plan,
    mobile: d.mobile ?? undefined,
    email: d.email ?? undefined,
    createdAt: d.createdAt,
    subscriptionExpiresAt: d.subscriptionExpiresAt ?? "",
  } as Tenant;
}

async function patchTenantApi(
  id: string,
  payload: Record<string, unknown>
): Promise<{ tenant?: TenantApiDetail; error?: string }> {
  const res = await fetch(`${API}/api/admin/tenants/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const raw: unknown = await res.json().catch(() => null);
  const data = (raw && typeof raw === "object" ? raw : null) as PatchTenantResponse | null;

  if (!res.ok || !data?.tenant) {
    return { error: data?.error ?? "Unable to update service centre." };
  }

  return { tenant: data.tenant };
}

export default function EditTenantPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [tenantDetail, setTenantDetail] = useState<TenantApiDetail | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadTenant() {
      if (!id) {
        if (active) {
          setTenantDetail(null);
          setFetchError("Invalid tenant id");
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setFetchError(null);

      try {
        const res = await fetch(`${API}/api/admin/tenants/${encodeURIComponent(id)}`, {
          method: "GET",
          cache: "no-store",
        });
        const raw: unknown = await res.json().catch(() => null);
        const data = (raw && typeof raw === "object" ? raw : null) as TenantGetResponse | null;
        if (!active) return;

        if (!res.ok || !data?.tenant) {
          setTenantDetail(null);
          setFetchError(data?.error ?? "This service centre does not exist or was deleted");
          setLoading(false);
          return;
        }

        setTenantDetail(data.tenant);
        setLoading(false);
      } catch {
        if (!active) return;
        setTenantDetail(null);
        setFetchError("Unable to load service centre details right now.");
        setLoading(false);
      }
    }

    loadTenant();

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <>
        <Topbar title="Tenant" subtitle="Loading…" />
        <div className="container" />
      </>
    );
  }

  if (!tenantDetail) {
    return (
      <>
        <Topbar
          title="Tenant not found"
          subtitle={fetchError ?? "This service centre does not exist or was deleted"}
        />
        <div className="container">
          <Link href="/admin/tenants" className="btn btn-secondary">← Back to tenants</Link>
        </div>
      </>
    );
  }

  return (
    <Workspace
      detail={tenantDetail}
      onDetailUpdated={(nextDetail) => setTenantDetail(nextDetail)}
    />
  );
}

function Workspace({
  detail,
  onDetailUpdated,
}: {
  detail: TenantApiDetail;
  onDetailUpdated: (nextDetail: TenantApiDetail) => void;
}) {
  const router = useRouter();
  const tenant = toWorkspaceTenant(detail);
  const sub = describeSubscription(tenant);
  const team = detail.team;
  const lastSub = detail.lastSubscription;

  const [editing, setEditing] = useState(false);
  const [pendingDetails, setPendingDetails] = useState<{
    centreName: string;
    ownerName: string;
  } | null>(null);
  const [confirmSaveDetails, setConfirmSaveDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  const [pendingStatus, setPendingStatus] = useState<"Active" | "Suspended" | null>(null);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const [confirmReset, setConfirmReset] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [notice, setNotice] = useState<Notice | null>(null);
  const [credentials, setCredentials] = useState<{
    owner: string;
    centre: string;
    mobile: string;
    password: string;
    reset?: boolean;
  } | null>(null);

  useEffect(() => {
    restoreTenants();
    restoreStaff();
  }, []);

  const { daysLeft, isExpired } = getRemainingDays(detail.subscriptionExpiresAt, sub.daysLeft);
  const expired = Boolean(sub.expired) || isExpired;

  function requestSaveDetails(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const centreName = String(form.get("name") ?? "").trim();
    const ownerName = String(form.get("owner") ?? "").trim();
    if (!centreName || !ownerName) {
      setNotice({ tone: "warn", text: "Service centre name and owner name are required." });
      return;
    }
    setPendingDetails({ centreName, ownerName });
    setConfirmSaveDetails(true);
  }

  async function confirmAndSaveDetails() {
    if (!pendingDetails) return;
    setSavingDetails(true);
    try {
      const result = await patchTenantApi(detail.id, {
        centreName: pendingDetails.centreName,
        ownerName: pendingDetails.ownerName,
      });
      if (!result.tenant) {
        setConfirmSaveDetails(false);
        setSavingDetails(false);
        setNotice({ tone: "warn", text: result.error ?? "Failed to save details." });
        return;
      }

      onDetailUpdated(result.tenant);
      store.dispatch({
        type: "tenants/updated",
        payload: {
          ...toWorkspaceTenant(result.tenant),
          name: result.tenant.name,
          owner: result.tenant.owner,
        },
      });
      setConfirmSaveDetails(false);
      setPendingDetails(null);
      setEditing(false);
      setSavingDetails(false);
      setNotice({ tone: "ok", text: "Details saved." });
    } catch {
      setConfirmSaveDetails(false);
      setSavingDetails(false);
      setNotice({ tone: "warn", text: "Network error while saving details." });
    }
  }

  function requestToggleStatus() {
    if (detail.status === "Suspended" && expired) {
      setNotice({
        tone: "warn",
        text: `${detail.name}'s subscription has expired. Renew the plan below before activating.`,
      });
      return;
    }
    const nextStatus: "Active" | "Suspended" =
      detail.status === "Active" ? "Suspended" : "Active";
    setPendingStatus(nextStatus);
    setConfirmStatus(true);
  }

  async function confirmAndToggleStatus() {
    if (!pendingStatus) return;
    setTogglingStatus(true);
    try {
      const result = await patchTenantApi(detail.id, { status: pendingStatus });
      if (!result.tenant) {
        setConfirmStatus(false);
        setPendingStatus(null);
        setTogglingStatus(false);
        setNotice({ tone: "warn", text: result.error ?? "Unable to update status." });
        return;
      }

      onDetailUpdated(result.tenant);
      store.dispatch({
        type: "tenants/updated",
        payload: {
          ...toWorkspaceTenant(result.tenant),
          status: result.tenant.status,
        },
      });
      setConfirmStatus(false);
      setPendingStatus(null);
      setTogglingStatus(false);
      setNotice({
        tone: "ok",
        text: `${result.tenant.name} is now ${result.tenant.status.toLowerCase()}.`,
      });
    } catch {
      setConfirmStatus(false);
      setPendingStatus(null);
      setTogglingStatus(false);
      setNotice({ tone: "warn", text: "Network error while updating status." });
    }
  }

  function askReset() {
    if (!detail.mobile) {
      setNotice({
        tone: "warn",
        text: `${detail.name} has no owner mobile number on file, so the login cannot be reset.`,
      });
      return;
    }
    setConfirmReset(true);
  }

  async function resetPassword() {
    const mobile = detail.mobile;
    if (!mobile) return;
    setConfirmReset(false);
    setResettingPassword(true);

    try {
      const res = await fetch(
        `${API}/api/admin/tenants/${encodeURIComponent(detail.id)}/reset-password`,
        {
          method: "POST",
          cache: "no-store",
        }
      );

      const raw: unknown = await res.json().catch(() => null);
      const data = (raw && typeof raw === "object" ? raw : null) as ResetPasswordResponse | null;

      if (!res.ok || !data?.temporaryPassword) {
        setResettingPassword(false);
        setNotice({
          tone: "warn",
          text: data?.error ?? "Unable to reset owner password right now.",
        });
        return;
      }

      setResettingPassword(false);
      setCredentials({
        owner: data.ownerName ?? detail.owner,
        centre: detail.name,
        mobile: data.mobile ?? mobile,
        password: data.temporaryPassword,
        reset: true,
      });
      setNotice({
        tone: "ok",
        text: `Temporary password generated for ${detail.name}.`,
      });
    } catch {
      setResettingPassword(false);
      setNotice({
        tone: "warn",
        text: "Network error while resetting owner password.",
      });
    }
  }

  function openDeleteModal() {
    if (detail.status !== "Suspended") {
      setNotice({
        tone: "warn",
        text: "Suspend the service centre before deleting it.",
      });
      return;
    }
    setConfirmDelete(true);
  }

  async function deleteTenant() {
    setDeleting(true);
    try {
      const res = await fetch(`${API}/api/admin/tenants/${encodeURIComponent(detail.id)}`, {
        method: "DELETE",
      });
      const raw: unknown = await res.json().catch(() => null);
      const data = (raw && typeof raw === "object" ? raw : null) as DeleteTenantResponse | null;

      if (!res.ok) {
        setConfirmDelete(false);
        setDeleting(false);
        setNotice({ tone: "warn", text: data?.error ?? "Unable to delete tenant." });
        return;
      }

      store.dispatch({ type: "tenants/deleted", payload: detail.id });
      store.dispatch({ type: "staff/removedForTenant", payload: detail.id });
      router.push("/admin/tenants");
    } catch {
      setConfirmDelete(false);
      setDeleting(false);
      setNotice({ tone: "warn", text: "Network error while deleting tenant." });
    }
  }

  const planBadge = expired
    ? { tone: "red" as const, text: "Expired" }
    : sub.isTrial
      ? { tone: "yellow" as const, text: "Free trial" }
      : { tone: "green" as const, text: "Active plan" };

  const info: [string, string][] = [
    ["Tenant ID", detail.id],
    ["Service centre", detail.name],
    ["Owner", detail.owner || "—"],
    ["Owner mobile", detail.mobile ?? "—"],
    ["Email", detail.email ?? "—"],
    ["Created on", formatIsoDate(detail.createdAt)],
    [
      "Team",
      `${team.total} (1 owner, ${team.managers} manager${team.managers === 1 ? "" : "s"}, ${team.staff} staff)`,
    ],
  ];

  const lastPaymentAmount = lastSub
    ? lastSub.amount === 0
      ? "Free"
      : `₹${lastSub.amount.toLocaleString("en-IN")}`
    : "—";
  const lastPaymentDate = formatIsoDate(lastSub?.payDate, "No payment recorded");

  const daysLeftText = expired
    ? "Expired"
    : daysLeft !== null
      ? String(daysLeft)
      : "—";

  return (
    <>
      <Topbar title={detail.name} subtitle="View, edit and manage this service centre" />
      <div className="container max-w-4xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/tenants" className="btn btn-secondary">← Back to tenants</Link>
          <Link href={`/admin/tenants/${detail.id}/history`} className="btn btn-secondary">Subscription history</Link>
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
            <form onSubmit={requestSaveDetails} className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Service centre name</span>
                <input
                  name="name"
                  maxLength={100}
                  required
                  disabled={savingDetails}
                  className="input"
                  defaultValue={detail.name}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Owner name</span>
                <input
                  name="owner"
                  maxLength={100}
                  required
                  disabled={savingDetails}
                  className="input"
                  defaultValue={detail.owner}
                />
              </label>
              <p className="muted text-xs sm:col-span-2">
                The owner mobile number is the owner&apos;s login, so it cannot be changed here.
              </p>
              <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                <Button type="submit" disabled={savingDetails}>
                  {savingDetails ? "Saving…" : "Save changes"}
                </Button>
                <button
                  type="button"
                  disabled={savingDetails}
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
              <p className="mt-1 font-black">{detail.plan || "—"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="muted text-xs">Last payment</p>
              <p className="mt-1 font-black">{lastPaymentAmount}</p>
              <p className="muted mt-1 text-xs">{lastPaymentDate}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="muted text-xs">Expires on</p>
              <p className="mt-1 font-black">{formatIsoDate(detail.subscriptionExpiresAt)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="muted text-xs">Days left</p>
              <p className="mt-1 font-black">{daysLeftText}</p>
            </div>
          </div>
          <RenewForm
            key={`${detail.id}-${detail.planId ?? ""}-${detail.subscriptionExpiresAt ?? ""}`}
            detail={detail}
            onUpdated={(nextDetail) => {
              onDetailUpdated(nextDetail);
              store.dispatch({
                type: "tenants/updated",
                payload: toWorkspaceTenant(nextDetail),
              });
              setNotice({ tone: "ok", text: "Plan updated and added to the subscription history." });
            }}
          />
        </section>

        {/* Manage: suspend, reset password, delete */}
        <section className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="manage-heading">
          <h2 id="manage-heading" className="text-lg font-bold text-slate-900">Manage</h2>
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Status: <Badge tone={detail.status === "Active" ? "green" : "red"}>{detail.status}</Badge>
                </p>
                <p className="muted mt-1 text-xs">
                  {detail.status === "Active"
                    ? "Suspending blocks the owner, manager and staff of this centre and hides it from customers."
                    : "Activating opens the centre again."}
                </p>
              </div>
              <button
                type="button"
                disabled={togglingStatus}
                onClick={requestToggleStatus}
                className={`rounded-lg border px-4 py-2.5 text-sm font-bold ${detail.status === "Active" ? "border-rose-200 text-rose-700 hover:bg-rose-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
              >
                {togglingStatus
                  ? "Updating…"
                  : detail.status === "Active"
                    ? "Suspend"
                    : "Activate"}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div>
                <p className="text-sm font-bold text-slate-900">Reset owner password</p>
                <p className="muted mt-1 text-xs">Creates a new temporary password and sends it on WhatsApp.</p>
              </div>
              <button
                type="button"
                disabled={resettingPassword}
                onClick={askReset}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                {resettingPassword ? "Resetting…" : "Reset password"}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div>
                <p className="text-sm font-bold text-red-700">Delete tenant</p>
                <p className="muted mt-1 text-xs">
                  {detail.status === "Suspended"
                    ? "Removes this centre, its owner login and its staff. This cannot be undone."
                    : "Suspend this service centre first before deleting it."}
                </p>
              </div>
              <button
                type="button"
                disabled={deleting}
                onClick={openDeleteModal}
                className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Confirm before saving edited details */}
      {confirmSaveDetails && pendingDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" aria-label="Save details confirmation" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Confirm changes</h3>
            <p className="mt-2 text-sm text-slate-600">
              Save updated details for <strong className="text-slate-900">{pendingDetails.centreName}</strong> (Owner: <strong className="text-slate-900">{pendingDetails.ownerName}</strong>)?
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={savingDetails}
                onClick={() => {
                  setConfirmSaveDetails(false);
                  setPendingDetails(null);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingDetails}
                onClick={confirmAndSaveDetails}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700"
              >
                {savingDetails ? "Saving…" : "Confirm & save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm before suspend / activate */}
      {confirmStatus && pendingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" aria-label="Status change confirmation" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">
              {pendingStatus === "Suspended" ? "Suspend service centre" : "Activate service centre"}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {pendingStatus === "Suspended" ? (
                <>
                  Are you sure you want to suspend <strong className="text-slate-900">{detail.name}</strong>? Owner, manager, and staff access will be blocked.
                </>
              ) : (
                <>
                  Are you sure you want to activate <strong className="text-slate-900">{detail.name}</strong>?
                </>
              )}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={togglingStatus}
                onClick={() => {
                  setConfirmStatus(false);
                  setPendingStatus(null);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={togglingStatus}
                onClick={confirmAndToggleStatus}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white ${pendingStatus === "Suspended" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
              >
                {togglingStatus
                  ? "Updating…"
                  : pendingStatus === "Suspended"
                    ? "Confirm suspend"
                    : "Confirm activate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm before reset password */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" aria-label="Reset password confirmation" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Reset owner password</h3>
            <p className="mt-2 text-sm text-slate-600">
              Reset the password for <strong className="text-slate-900">{detail.owner}</strong> ({detail.name})? The old password and active sessions will stop working and a new temporary one will be generated.
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

      {/* Confirm before delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" aria-label="Delete confirmation" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Delete tenant</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete <strong className="text-slate-900">{detail.name}</strong>? This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDelete(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={deleteTenant}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"
              >
                {deleting ? "Deleting…" : "Delete tenant"}
              </button>
            </div>
          </div>
        </div>
      )}

      {credentials && <WhatsAppCredentialsModal {...credentials} onClose={() => setCredentials(null)} />}
    </>
  );
}

/** Renew or change the plan using rates/durations from the plans API and persist via PATCH. */
function RenewForm({
  detail,
  onUpdated,
}: {
  detail: TenantApiDetail;
  onUpdated: (nextDetail: TenantApiDetail) => void;
}) {
  const [today] = useState(() => localYmd());
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [planId, setPlanId] = useState("");
  const [amount, setAmount] = useState("");
  const [payDate, setPayDate] = useState(today);
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPlans() {
      setPlansLoading(true);
      setError("");

      try {
        const res = await fetch(`${API}${PLANS_PATH}`, {
          method: "GET",
          cache: "no-store",
        });
        const raw: unknown = await res.json().catch(() => null);
        const data = (raw && typeof raw === "object" ? raw : null) as PlansGetResponse | null;
        if (!active) return;

        if (!res.ok || !Array.isArray(data?.plans)) {
          setPlans([]);
          setPlanId("");
          setAmount("");
          setEndsOn("");
          setError(data?.error ?? `Plans could not be loaded (${res.status}).`);
          setPlansLoading(false);
          return;
        }

        const selectablePlans = data.plans.filter(
          (p) => Boolean(p.id) && Boolean(p.name) && p.isActive !== false && p.tier !== null
        );
        setPlans(selectablePlans);

        if (selectablePlans.length === 0) {
          setPlanId("");
          setAmount("");
          setEndsOn("");
          setError("No active paid plans found.");
          setPlansLoading(false);
          return;
        }

        const initialPlan =
          selectablePlans.find((p) => p.id === detail.planId) ??
          selectablePlans.find((p) => p.name === detail.plan) ??
          selectablePlans[0];

        setPlanId(initialPlan.id);
        setAmount(String(Number(initialPlan.price) || 0));
        setEndsOn(addPlanDurationYmd(today, initialPlan.months ?? 0, initialPlan.days ?? 0));
        setPlansLoading(false);
      } catch {
        if (!active) return;
        setPlans([]);
        setPlanId("");
        setAmount("");
        setEndsOn("");
        setError("Unable to fetch plans right now.");
        setPlansLoading(false);
      }
    }

    loadPlans();

    return () => {
      active = false;
    };
  }, [detail.plan, detail.planId, today]);

  function changePlan(nextPlanId: string) {
    setPlanId(nextPlanId);
    setError("");
    const selected = plans.find((p) => p.id === nextPlanId);
    if (!selected) {
      setAmount("");
      setEndsOn("");
      return;
    }
    setAmount(String(Number(selected.price) || 0));
    if (startsOn) {
      setEndsOn(addPlanDurationYmd(startsOn, selected.months ?? 0, selected.days ?? 0));
    }
  }

  function changeStart(value: string) {
    setStartsOn(value);
    setError("");
    const selected = plans.find((p) => p.id === planId);
    if (selected && value) {
      setEndsOn(addPlanDurationYmd(value, selected.months ?? 0, selected.days ?? 0));
    }
  }

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const paid = Number(amount);
    if (!planId) return setError("Choose a plan.");
    if (!Number.isFinite(paid) || paid <= 0) return setError("Enter the amount received.");
    if (!payDate || !startsOn || !endsOn) return setError("Fill in the pay date and the plan dates.");
    if (endsOn <= startsOn) return setError("The plan must end after it starts.");

    setSubmitting(true);
    setError("");

    try {
      const result = await patchTenantApi(detail.id, {
        subscription: {
          planId,
          amount: Math.round(paid),
          payDate,
          startsOn,
          endsOn,
        },
      });

      if (!result.tenant) {
        setError(result.error ?? "Unable to save plan and payment.");
        setSubmitting(false);
        return;
      }

      onUpdated(result.tenant);
      setSubmitting(false);
    } catch {
      setError("Network error while saving plan and payment.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-6 border-t border-slate-100 pt-5">
      <h3 className="font-black text-slate-900">Renew or change plan</h3>
      <p className="muted mt-1 text-xs">
        The amount is filled from the plans API rate. Change it if the centre paid something different.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">Plan</span>
          <select
            className="input"
            value={planId}
            disabled={plansLoading || submitting}
            onChange={(e) => changePlan(e.target.value)}
          >
            <option value="">
              {plansLoading ? "Loading plans…" : "Select a plan"}
            </option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">Amount received (₹)</span>
          <input
            inputMode="numeric"
            className="input"
            value={amount}
            disabled={submitting}
            onChange={(e) => {
              setAmount(e.target.value.replace(/\D/g, "").slice(0, 7));
              setError("");
            }}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">Pay date</span>
          <input
            type="date"
            className="input"
            value={payDate}
            disabled={submitting}
            onChange={(e) => setPayDate(e.target.value)}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">Plan starts on</span>
          <input
            type="date"
            className="input"
            value={startsOn}
            disabled={submitting}
            onChange={(e) => changeStart(e.target.value)}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">Plan ends on</span>
          <input
            type="date"
            className="input"
            value={endsOn}
            disabled={submitting}
            onChange={(e) => {
              setEndsOn(e.target.value);
              setError("");
            }}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}
      <div className="mt-4">
        <Button type="submit" disabled={submitting || plansLoading}>
          {submitting ? "Saving…" : "Save plan & payment"}
        </Button>
      </div>
    </form>
  );
}