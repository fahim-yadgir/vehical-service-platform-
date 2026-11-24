"use client";

import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import Button from "../ui/Button";
import { isEmail, isMobile } from "../../lib/validators";
import { plans } from "../../lib/plans";

type LocalPlanItem = (typeof plans)[number];

export type BackendPlan = {
  id: string;
  name: string;
  tier: string | null;
  months: number;
  days: number;
  price: number;
  orderLimit: number;
  isActive: boolean;
};

export type NewTenant = {
  name: string;
  owner: string;
  mobile: string;
  email: string;
  planId: string;
  planName?: string;
};

type Props = {
  existingMobiles: string[];
  availablePlans?: BackendPlan[];
  onCreate: (data: NewTenant, apiResponse?: unknown) => void;
  onCancel: () => void;
};

type ApiErrorResponse = {
  message?: string;
  error?: string;
};

const LOGIN_API_URL =
  "https://vehical-service-platform.fyfy3790.workers.dev/api/admin/tenants";

function fallbackPlanId(plan: LocalPlanItem): string {
  if (plan.name === "Free Trial") return "trial";
  const tierSlug = plan.tier?.toLowerCase() ?? "plan";
  if (plan.months === 12) return `${tierSlug}-12m`;
  return `${tierSlug}-${plan.months}m`;
}

export default function AddTenantForm({
  existingMobiles,
  availablePlans,
  onCreate,
  onCancel,
}: Props) {
  const planOptions: BackendPlan[] = useMemo(() => {
    if (availablePlans && availablePlans.length > 0) {
      return availablePlans.filter((p) => p.isActive !== false);
    }
    return plans.map((p) => ({
      id: fallbackPlanId(p),
      name: p.name === "Free Trial" ? `Free Trial (${p.days} days)` : p.name,
      tier: p.tier ?? null,
      months: p.months,
      days: p.days,
      price: 0,
      orderLimit: 0,
      isActive: true,
    }));
  }, [availablePlans]);

  const [form, setForm] = useState<NewTenant>(() => ({
    name: "",
    owner: "",
    mobile: "",
    email: "",
    planId: planOptions[0]?.id ?? "trial",
    planName: planOptions[0]?.name ?? "Free Trial",
  }));

  useEffect(() => {
    if (!planOptions.some((p) => p.id === form.planId) && planOptions[0]) {
      setForm((prev) => ({
        ...prev,
        planId: planOptions[0].id,
        planName: planOptions[0].name,
      }));
    }
  }, [planOptions, form.planId]);

  const [errors, setErrors] = useState<
    Partial<Record<keyof NewTenant | "api", string>>
  >({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) {
        onCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel, submitting]);

  const set = (field: "name" | "owner" | "mobile" | "email", value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]:
        field === "mobile" ? value.replace(/\D/g, "").slice(0, 10) : value,
    }));
    setErrors((prev) => ({ ...prev, [field]: undefined, api: undefined }));
  };

  const handlePlanChange = (nextPlanId: string) => {
    const matched = planOptions.find((p) => p.id === nextPlanId);
    setForm((prev) => ({
      ...prev,
      planId: nextPlanId,
      planName: matched?.name ?? nextPlanId,
    }));
    setErrors((prev) => ({ ...prev, planId: undefined, api: undefined }));
  };

  const submit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Enter the service centre name.";
    if (!form.owner.trim()) next.owner = "Enter the owner's name.";
    if (!isMobile(form.mobile))
      next.mobile = "Enter a valid 10-digit mobile number.";
    else if (existingMobiles.includes(form.mobile))
      next.mobile = "This mobile number is already registered.";
    if (form.email.trim() && !isEmail(form.email))
      next.email = "Enter a valid email address.";
    if (!form.planId) next.planId = "Please select a subscription plan.";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const selectedPlan = planOptions.find((p) => p.id === form.planId);
    const cleaned: NewTenant = {
      name: form.name.trim(),
      owner: form.owner.trim(),
      mobile: form.mobile,
      email: form.email.trim(),
      planId: form.planId,
      planName: selectedPlan?.name ?? form.planName ?? form.planId,
    };

    setSubmitting(true);
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const res = await fetch(LOGIN_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: cleaned.name,
          owner: cleaned.owner,
          mobile: cleaned.mobile,
          email: cleaned.email || undefined,
          planId: cleaned.planId,
        }),
      });

      const data = (await res
        .json()
        .catch((): ApiErrorResponse => ({}))) as ApiErrorResponse;

      if (!res.ok) {
        setErrors({
          api:
            data.message ||
            data.error ||
            `Request failed (${res.status}). Please check the API response.`,
        });
        setSubmitting(false);
        return;
      }

      onCreate(cleaned, data);
    } catch {
      setErrors({
        api: "Network or CORS error while calling the API.",
      });
      setSubmitting(false);
    }
  };

  const field = (
    key: "name" | "owner" | "mobile" | "email",
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input
        value={form[key]}
        disabled={submitting}
        onChange={(e) => set(key, e.target.value)}
        className="input"
        aria-invalid={!!errors[key]}
        {...props}
      />
      {errors[key] && (
        <span
          role="alert"
          className="block text-xs font-semibold text-rose-600"
        >
          {errors[key]}
        </span>
      )}
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-tenant-heading"
      onClick={() => {
        if (!submitting) onCancel();
      }}
    >
      <section
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2
              id="add-tenant-heading"
              className="text-lg font-bold text-slate-900"
            >
              Add service centre
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose the plan the centre starts on. A temporary password is
              created for the owner. The owner adds the rest (location, services,
              price list, staff) from their own profile.
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onCancel}
            aria-label="Close popup"
            className="rounded-lg px-2.5 py-1.5 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
          {field("name", "Service centre name", {
            placeholder: "e.g. City Auto Care",
          })}
          {field("owner", "Owner name", { placeholder: "e.g. Asha Mehta" })}
          {field("mobile", "Owner mobile number", {
            type: "tel",
            inputMode: "numeric",
            placeholder: "10-digit mobile",
          })}
          {field("email", "Email (optional)", {
            type: "email",
            placeholder: "owner@example.com",
          })}

          <label className="block space-y-2 sm:col-span-2">
            <span className="text-sm font-bold text-slate-700">
              Subscription plan
            </span>
            <select
              value={form.planId}
              disabled={submitting}
              onChange={(e) => handlePlanChange(e.target.value)}
              className="input"
            >
              {planOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.planId && (
              <span
                role="alert"
                className="block text-xs font-semibold text-rose-600"
              >
                {errors.planId}
              </span>
            )}
          </label>

          {errors.api && (
            <div
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 sm:col-span-2"
            >
              {errors.api}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 sm:col-span-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onCancel}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Create & get login details"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}