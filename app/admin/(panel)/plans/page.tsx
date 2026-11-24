"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import useSWR from "swr";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import Topbar from "../../../../components/navbar/Topbar";
import Button from "../../../../components/ui/Button";
import { TIERS, TRIAL_PLAN } from "../../../../lib/plans";

/** The dropdown: the three tiers and the free trial. */
const TYPES = [...TIERS, TRIAL_PLAN];
const DAYS_OF_TRIAL = 14;
const PLANS_API_URL =
  `${process.env.NEXT_PUBLIC_APP_URL}/api/plans`;

export type ApiPlanItem = {
  id: string;
  name: string;
  tier: string | null;
  months: number;
  days: number;
  price: number;
  orderLimit: number;
  isActive: boolean;
};

type PlansApiResponse = {
  plans?: ApiPlanItem[];
  message?: string;
  error?: string;
};

type PatchPlansPayload = {
  prices?: Record<string, number>;
  limits?: Record<string, number>;
};

const plansFetcher = async (url: string): Promise<PlansApiResponse> => {
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
    .catch((): PlansApiResponse => ({}))) as PlansApiResponse;

  if (!res.ok) {
    throw new Error(
      data.message || data.error || `Failed to load plans (${res.status}).`,
    );
  }

  return data;
};

export default function AdminPlans() {
  const [selected, setSelected] = useState<string>(TIERS[0]);

  const {
    data: swrData,
    error: swrError,
    isLoading: apiLoading,
    mutate,
  } = useSWR<PlansApiResponse>(PLANS_API_URL, plansFetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    dedupingInterval: 60_000,
  });

  const apiPlans: ApiPlanItem[] = Array.isArray(swrData?.plans)
    ? swrData.plans
    : [];

  // prices are kept per plan ("Silver 3 Months"), limits per tier ("Silver")
  const [form, setForm] = useState<Record<string, string>>({});
  const [limitForm, setLimitForm] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Confirmation Popup State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingPayload, setPendingPayload] =
    useState<PatchPlansPayload | null>(null);

  const syncFormWithApiPlans = (list: ApiPlanItem[]) => {
    if (list.length === 0) return;

    const nextPrices: Record<string, string> = {};
    const nextLimits: Record<string, string> = {};

    for (const plan of list) {
      nextPrices[plan.name] = String(plan.price ?? 0);
      const limitKey = plan.tier ?? TRIAL_PLAN;
      nextLimits[limitKey] = String(plan.orderLimit ?? 0);
    }

    setForm(nextPrices);
    setLimitForm(nextLimits);
  };

  useEffect(() => {
    if (apiPlans.length > 0) {
      syncFormWithApiPlans(apiPlans);
    }
  }, [apiPlans]);

  // Step 1: Validate and open confirmation popup
  const handleOpenConfirm = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);

    if (apiPlans.length === 0) {
      setSaveError("Plans are still loading or unavailable. Please try again.");
      return;
    }

    // 1. Prices payload (only paid plans where tier !== null)
    const pricesPayload: Record<string, number> = {};
    const paidApiPlans = apiPlans.filter(
      (p) => p.tier !== null && p.months > 0,
    );

    for (const plan of paidApiPlans) {
      const val = Math.min(9_999_999, Math.max(0, Number(form[plan.name]) || 0));
      pricesPayload[plan.id] = val;
    }

    // 2. Limits payload (Silver, Golden, Diamond & Free Trial — min 1 required by backend)
    const limitsPayload: Record<string, number> = {};
    for (const typeName of TYPES) {
      const val = Number(limitForm[typeName]) || 0;
      if (val >= 1) {
        limitsPayload[typeName] = Math.min(100_000, val);
      }
    }

    const payload: PatchPlansPayload = {};
    if (Object.keys(pricesPayload).length > 0) {
      payload.prices = pricesPayload;
    }
    if (Object.keys(limitsPayload).length > 0) {
      payload.limits = limitsPayload;
    }

    if (!payload.prices && !payload.limits) {
      setSaveError("Please enter at least one valid price or limit (min 1).");
      return;
    }

    setPendingPayload(payload);
    setShowConfirmModal(true);
  };

  // Step 2: Execute PATCH request after confirmation
  const handleConfirmSave = async () => {
    if (!pendingPayload) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const res = await fetch(PLANS_API_URL, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(pendingPayload),
      });

      const data = (await res
        .json()
        .catch((): PlansApiResponse => ({}))) as PlansApiResponse;

      if (!res.ok) {
        throw new Error(
          data.error ||
            data.message ||
            `Failed to save plans (${res.status}).`,
        );
      }

      if (Array.isArray(data.plans)) {
        await mutate({ plans: data.plans }, { revalidate: false });
        syncFormWithApiPlans(data.plans);
      }

      setSaved(true);
      setShowConfirmModal(false);
      setPendingPayload(null);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Network or CORS error while updating plans.",
      );
      setShowConfirmModal(false);
    } finally {
      setIsSaving(false);
    }
  };

  const isTrial = selected === TRIAL_PLAN;
  const trialPlan = apiPlans.find((p) => p.id === "trial" || p.tier === null);
  const trialDays = trialPlan?.days || DAYS_OF_TRIAL;
  const displayedDurations = apiPlans.filter(
    (p) => p.tier === selected && p.months > 0,
  );

  const displayError =
    saveError || (swrError instanceof Error ? swrError.message : null);

  return (
    <>
      <Topbar
        title="Plans & pricing"
        subtitle="Set the price and monthly order limit of each subscription plan"
      />
      <div className="container">
        <form
          onSubmit={handleOpenConfirm}
          className="card max-w-2xl space-y-5 p-6"
        >
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Plan prices &amp; limits
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a plan type, then set the order limit and the price of each
              duration. A price of 0 means the price is not set yet. Revenue
              reports count a plan only after its price is set. Order limit is
              per month (1 to 100,000).
            </p>
          </div>

          {apiLoading && apiPlans.length === 0 && (
            <p className="text-xs font-semibold text-slate-500">
              Loading plans from server...
            </p>
          )}

          {displayError && (
            <div
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-800"
            >
              {displayError}
            </div>
          )}

          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">Plan type</span>
            <select
              className="input"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              aria-label="Plan type"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          {saved && (
            <p
              role="status"
              className="flex items-center gap-1.5 text-sm font-bold text-emerald-600"
            >
              <CheckCircle2 size={16} /> Saved successfully.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <div>
              <p className="font-bold text-slate-900">Orders per month</p>
              <p className="text-xs text-slate-500">
                {isTrial
                  ? "For the whole free trial (min 1)"
                  : `Applies to every ${selected} duration (min 1)`}
              </p>
            </div>
            <input
              aria-label={`${selected} orders per month limit`}
              inputMode="numeric"
              className="input w-28 text-right"
              value={limitForm[selected] ?? "0"}
              onChange={(e) => {
                setLimitForm({
                  ...limitForm,
                  [selected]: e.target.value.replace(/\D/g, "").slice(0, 6),
                });
                setSaved(false);
              }}
            />
          </div>

          {isTrial ? (
            <p className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
              The free trial lasts {trialDays} days and is always free, so it
              has no price.
            </p>
          ) : displayedDurations.length === 0 && !apiLoading ? (
            <p className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-500">
              No durations found for {selected}.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {displayedDurations.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="font-bold text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      {p.months} month{p.months === 1 ? "" : "s"}
                    </p>
                  </div>
                  <label className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-500">₹</span>
                    <input
                      aria-label={`${p.name} price`}
                      inputMode="numeric"
                      className="input w-36 text-right"
                      value={form[p.name] ?? "0"}
                      onChange={(e) => {
                        setForm({
                          ...form,
                          [p.name]: e.target.value.replace(/\D/g, "").slice(0, 7),
                        });
                        setSaved(false);
                      }}
                    />
                  </label>
                </li>
              ))}
            </ul>
          )}

          <Button type="submit" disabled={isSaving || apiLoading}>
            Save prices &amp; limits
          </Button>
          <p className="muted text-xs">
            Save covers every plan type, not only the one shown.
          </p>
        </form>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3
                    id="confirm-modal-title"
                    className="text-base font-black text-slate-900"
                  >
                    Confirm pricing &amp; limits update
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    This will update prices and monthly order limits across all
                    plan tiers.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setShowConfirmModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 max-h-48 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3 text-xs">
              <p className="font-bold text-slate-700">Monthly Order Limits:</p>
              <div className="grid grid-cols-2 gap-1.5 text-slate-600">
                {TYPES.map((t) => (
                  <div
                    key={t}
                    className="flex justify-between rounded bg-white px-2 py-1"
                  >
                    <span>{t}:</span>
                    <span className="font-bold text-slate-900">
                      {pendingPayload?.limits?.[t] ?? "Unchanged"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <Button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmSave}
              >
                {isSaving ? "Saving..." : "Yes, update plans"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}