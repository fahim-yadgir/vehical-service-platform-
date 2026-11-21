"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Topbar from "../../../../components/navbar/Topbar";
import Badge from "../../../../components/ui/Badge";
import Button from "../../../../components/ui/Button";
import AddTenantForm, {
  type NewTenant,
} from "../../../../components/admin/AddTenantForm";
import WhatsAppCredentialsModal from "../../../../components/admin/WhatsAppCredentialsModal";
import { generateTempPassword } from "../../../../lib/tempPassword";
import { formatDate, ymd } from "../../../../lib/revenue";
import { createAccount } from "../../../../lib/tenantAccounts";
import {
  restoreStaff,
  restoreTenants,
  store,
  useAppSelector,
  type Tenant,
  type TenantFilter,
} from "../../../../lib/redux-store";
import { planExpiry, planPriceOf } from "../../../../lib/plans";
import {
  amountLabel,
  latestRecord,
  newSubscriptionRecord,
  payDateLabel,
} from "../../../../lib/subscriptionHistory";

const filters: { value: TenantFilter; label: string }[] = [
  { value: "all", label: "All tenants" },
  { value: "new", label: "New added" },
  { value: "old", label: "Old tenants" },
  { value: "expiring", label: "Expiry near" },
  { value: "expired", label: "Expired" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

function matchesFilter(
  tenant: Tenant,
  filter: TenantFilter,
  todayTime: number,
  thirtyDays: number,
) {
  const createdAt = new Date(`${tenant.createdAt}T00:00:00`).getTime();
  const expiresAt = new Date(
    `${tenant.subscriptionExpiresAt}T00:00:00`,
  ).getTime();
  switch (filter) {
    case "new":
      return createdAt >= todayTime - thirtyDays && createdAt <= todayTime;
    case "old":
      return createdAt < todayTime - thirtyDays;
    case "expiring":
      return expiresAt >= todayTime && expiresAt <= todayTime + thirtyDays;
    case "expired":
      return expiresAt < todayTime;
    case "active":
      return tenant.status === "Active";
    case "suspended":
      return tenant.status === "Suspended";
    default:
      return true;
  }
}

const pageSize = 10;

export default function Tenants() {
  const items = useAppSelector((state) => state.tenants);
  const staff = useAppSelector((state) => state.staff);
  const selectedFilter = useAppSelector((state) => state.tenantFilter);
  const [page, setPage] = useState(1);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [credentials, setCredentials] = useState<{
    owner: string;
    centre: string;
    mobile: string;
    password: string;
    reset?: boolean;
  } | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const filteredItems = items.filter((tenant) =>
    matchesFilter(tenant, selectedFilter, todayTime, thirtyDays),
  );

  const offset = (page - 1) * pageSize;
  const pagedItems = filteredItems.slice(offset, offset + pageSize);
  const hasNextPage = offset + pageSize < filteredItems.length;

  useEffect(() => {
    restoreStaff();
    restoreTenants();
  }, []);

  function createTenant(data: NewTenant) {
    const latestId = items.reduce(
      (latest, tenant) =>
        Math.max(latest, Number(tenant.id.replace(/\D/g, "")) || 0),
      0,
    );
    const id = `TEN${String(latestId + 1).padStart(3, "0")}`;
    const password = generateTempPassword();
    const now = new Date();
    const expires = planExpiry(data.plan, now);
    store.dispatch({
      type: "tenants/added",
      payload: {
        id,
        name: data.name,
        owner: data.owner,
        mobile: data.mobile,
        email: data.email || undefined,
        status: "Active",
        plan: data.plan,
        users: 1,
        createdAt: ymd(now),
        subscriptionExpiresAt: expires,
        subscriptionHistory: [
          newSubscriptionRecord({
            plan: data.plan,
            amount: planPriceOf(data.plan),
            payDate: ymd(now),
            startsOn: ymd(now),
            endsOn: expires,
          }),
        ],
      },
    });
    setPage(1);
    setShowTenantForm(false);
    void createAccount({
      mobile: data.mobile,
      email: data.email || undefined,
      name: data.owner,
      role: "owner",
      tenantId: id,
      password,
    });
    setCredentials({
      owner: data.owner,
      centre: data.name,
      mobile: data.mobile,
      password,
    });
  }

  function changeFilter(filter: TenantFilter) {
    setPage(1);
    store.dispatch({ type: "tenants/filterChanged", payload: filter });
  }

  return (
    <>
      <Topbar
        title="Tenants"
        subtitle="Service centres registered on the platform"
      />
      <div className="container">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label htmlFor="tenant-filter" className="sr-only">
            Filter tenants
          </label>
          <select
            id="tenant-filter"
            value={selectedFilter}
            onChange={(event) =>
              changeFilter(event.target.value as TenantFilter)
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 lg:hidden"
          >
            {filters.map((filter) => {
              const count = items.filter((tenant) =>
                matchesFilter(tenant, filter.value, todayTime, thirtyDays),
              ).length;
              return (
                <option key={filter.value} value={filter.value}>
                  {filter.label} ({count})
                </option>
              );
            })}
          </select>
          <div
            className="hidden flex-wrap items-center gap-1.5 lg:flex"
            aria-label="Tenant filters"
          >
            {filters.map((filter) => {
              const count = items.filter((tenant) =>
                matchesFilter(tenant, filter.value, todayTime, thirtyDays),
              ).length;
              return (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={selectedFilter === filter.value}
                  title={filter.label}
                  onClick={() => changeFilter(filter.value)}
                  className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-semibold transition ${selectedFilter === filter.value ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  {filter.label} <span className="opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
          <Button onClick={() => setShowTenantForm((open) => !open)}>
            {showTenantForm ? "Close form" : "Add service centre"}
          </Button>
        </div>

        {showTenantForm && (
          <AddTenantForm
            existingMobiles={[
              ...items.flatMap((tenant) =>
                tenant.mobile ? [tenant.mobile] : [],
              ),
              ...staff.map((member) => member.mobile),
            ]}
            onCreate={createTenant}
            onCancel={() => setShowTenantForm(false)}
          />
        )}

        <div className="min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Pay date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Subscription expiry</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {pagedItems.map((tenant) => {
                const last = latestRecord(tenant);
                return (
                  <tr key={tenant.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-bold">{tenant.name}</td>
                    <td className="px-4 py-3">{tenant.owner}</td>
                    <td className="px-4 py-3">{tenant.plan}</td>
                    <td className="px-4 py-3">{payDateLabel(last)}</td>
                    <td className="px-4 py-3">{amountLabel(last)}</td>
                    <td className="px-4 py-3">
                      {formatDate(tenant.subscriptionExpiresAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={tenant.status === "Active" ? "green" : "red"}>
                        {tenant.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/tenants/${tenant.id}`}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold !text-white hover:bg-slate-700"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredItems.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">
              {items.length === 0
                ? 'No service centres yet. Click "Add service centre" to create the first one.'
                : "No tenants match this filter."}
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">
            Page {page}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              disabled={!hasNextPage}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {credentials && (
        <WhatsAppCredentialsModal
          {...credentials}
          onClose={() => setCredentials(null)}
        />
      )}
    </>
  );
}