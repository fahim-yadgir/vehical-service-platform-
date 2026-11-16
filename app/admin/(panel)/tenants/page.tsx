"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Topbar from "../../../../components/navbar/Topbar";
import DataTable from "../../../../components/tables/DataTable";
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
  tenantHeadcount,
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

export default function Tenants() {
  const items = useAppSelector((state) => state.tenants);
  const staff = useAppSelector((state) => state.staff);
  const selectedFilter = useAppSelector((state) => state.tenantFilter);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [credentials, setCredentials] = useState<{
    owner: string;
    centre: string;
    mobile: string;
    password: string;
    reset?: boolean;
  } | null>(null);

  const pageSize = 10;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const filteredItems = items.filter((tenant) =>
    matchesFilter(tenant, selectedFilter, todayTime, thirtyDays),
  );

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
        // the first entry of the subscription history
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
        <div className="min-w-0">
          {/* The table pages, searches, sorts and exports ALL filtered tenants itself.
              key={selectedFilter}: a new filter starts the table again from page 1. */}
          <DataTable
            key={selectedFilter}
            pageSize={pageSize}
            headers={[
              "Tenant",
              "Owner",
              "Users",
              "Plan",
              "Pay date",
              "Amount",
              "Subscription expiry",
              "Status",
              "Action",
            ]}
            exportName="tenants"
            rows={filteredItems.map((tenant) => {
              // Pay date and Amount come from the tenant's latest subscription
              const last = latestRecord(tenant);
              return [
                <b key="name">{tenant.name}</b>,
                tenant.owner,
                String(tenantHeadcount(staff, tenant.id).total),
                tenant.plan,
                payDateLabel(last),
                amountLabel(last),
                formatDate(tenant.subscriptionExpiresAt),
                <Badge
                  key="status"
                  tone={tenant.status === "Active" ? "green" : "red"}
                >
                  {tenant.status}
                </Badge>,
                <Link
                  key="actions"
                  href={`/admin/tenants/${tenant.id}`}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold !text-white hover:bg-slate-700"
                >
                  Edit
                </Link>,
              ];
            })}
          />
          {filteredItems.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">
              {items.length === 0
                ? 'No service centres yet. Click "Add service centre" to create the first one.'
                : "No tenants match this filter."}
            </p>
          )}
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