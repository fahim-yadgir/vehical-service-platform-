"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
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
  store,
  useAppSelector,
  type TenantFilter,
} from "../../../../lib/redux-store";

const TENANTS_API_URL =
  `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/tenants`;

const pageSize = 10;

const filters: { value: TenantFilter; label: string }[] = [
  { value: "all", label: "All tenants" },
  { value: "new", label: "New added" },
  { value: "old", label: "Old tenants" },
  { value: "expiring", label: "Expiry near" },
  { value: "expired", label: "Expired" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

export type ApiTenantRow = {
  id: string;
  name: string;
  owner: string;
  status: "Active" | "Suspended";
  plan: string;
  mobile: string | null;
  email: string | null;
  createdAt: string;
  subscriptionExpiresAt: string | null;
  lastPayment: {
    payDate: string;
    amount: number;
  } | null;
};

type TenantsListResponse = {
  tenants: ApiTenantRow[];
  page: number;
  limit: number;
  hasNextPage: boolean;
  counts: Record<TenantFilter, number>;
  error?: string;
  message?: string;
};

const EMPTY_COUNTS: Record<TenantFilter, number> = {
  all: 0,
  new: 0,
  old: 0,
  expiring: 0,
  expired: 0,
  active: 0,
  suspended: 0,
};

const tenantsFetcher = async (url: string): Promise<TenantsListResponse> => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = (await res
    .json()
    .catch((): Partial<TenantsListResponse> => ({}))) as Partial<TenantsListResponse>;

  if (!res.ok) {
    throw new Error(
      data.error || data.message || `Failed to load tenants (${res.status}).`,
    );
  }

  return {
    tenants: Array.isArray(data.tenants) ? data.tenants : [],
    page: data.page ?? 1,
    limit: data.limit ?? pageSize,
    hasNextPage: Boolean(data.hasNextPage),
    counts: { ...EMPTY_COUNTS, ...(data.counts ?? {}) },
  };
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function Tenants() {
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

  const queryUrl = `${TENANTS_API_URL}?page=${page}&limit=${pageSize}&filter=${selectedFilter}`;

  const {
    data,
    error: apiError,
    isLoading: apiLoading,
    mutate,
  } = useSWR<TenantsListResponse>(queryUrl, tenantsFetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    keepPreviousData: true,
    dedupingInterval: 60_000,
  });

  const tenants = data?.tenants ?? [];
  const counts = data?.counts ?? EMPTY_COUNTS;
  const hasNextPage = data?.hasNextPage ?? false;

  useEffect(() => {
    restoreStaff();
  }, []);

  function createTenant(formData: NewTenant, apiResponse?: unknown) {
    const apiData = apiResponse as
      | { tenantId?: string; mobile?: string; temporaryPassword?: string; password?: string }
      | undefined;

    const id = apiData?.tenantId ?? crypto.randomUUID();
    const password =
      apiData?.temporaryPassword ||
      apiData?.password ||
      generateTempPassword();

    setPage(1);
    setShowTenantForm(false);

    // SWR cache ko server se refresh karein
    void mutate();

    void createAccount({
      mobile: formData.mobile,
      email: formData.email || undefined,
      name: formData.owner,
      role: "owner",
      tenantId: id,
      password,
    });

    setCredentials({
      owner: formData.owner,
      centre: formData.name,
      mobile: formData.mobile,
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
            {filters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label} ({counts[filter.value] ?? 0})
              </option>
            ))}
          </select>
          <div
            className="hidden flex-wrap items-center gap-1.5 lg:flex"
            aria-label="Tenant filters"
          >
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={selectedFilter === filter.value}
                title={filter.label}
                onClick={() => changeFilter(filter.value)}
                className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-semibold transition ${selectedFilter === filter.value ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {filter.label}{" "}
                <span className="opacity-70">{counts[filter.value] ?? 0}</span>
              </button>
            ))}
          </div>
          <Button onClick={() => setShowTenantForm((open) => !open)}>
            {showTenantForm ? "Close form" : "Add service centre"}
          </Button>
        </div>

        {apiError && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800"
          >
            {apiError instanceof Error
              ? apiError.message
              : "Failed to load tenants from server."}
          </div>
        )}

        {showTenantForm && (
          <AddTenantForm
            existingMobiles={[
              ...tenants.flatMap((tenant) =>
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
              {tenants.map((tenant) => {
                const payDate = tenant.lastPayment?.payDate
                  ? formatDate(tenant.lastPayment.payDate.slice(0, 10))
                  : "—";
                const amount =
                  tenant.lastPayment !== null
                    ? tenant.lastPayment.amount === 0
                      ? "Free"
                      : formatCurrency(tenant.lastPayment.amount)
                    : "—";
                const expiry = tenant.subscriptionExpiresAt
                  ? formatDate(tenant.subscriptionExpiresAt.slice(0, 10))
                  : "—";

                return (
                  <tr key={tenant.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-bold">{tenant.name}</td>
                    <td className="px-4 py-3">{tenant.owner || "—"}</td>
                    <td className="px-4 py-3">{tenant.plan || "—"}</td>
                    <td className="px-4 py-3">{payDate}</td>
                    <td className="px-4 py-3">{amount}</td>
                    <td className="px-4 py-3">{expiry}</td>
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
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {apiLoading && tenants.length === 0 ? (
            <p className="py-10 text-center text-sm font-semibold text-slate-500">
              Loading tenants from server...
            </p>
          ) : (
            tenants.length === 0 && (
              <p className="py-10 text-center text-sm text-slate-500">
                {counts.all === 0
                  ? 'No service centres yet. Click "Add service centre" to create the first one.'
                  : "No tenants match this filter."}
              </p>
            )
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