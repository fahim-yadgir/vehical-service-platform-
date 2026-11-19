"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import Topbar from "../../../../components/navbar/Topbar";
import Button from "../../../../components/ui/Button";
import { TIERS, TRIAL_PLAN, paidPlans, plansOfTier, usePlanLimits, usePlanPrices } from "../../../../lib/plans";

/** The dropdown: the three tiers and the free trial. */
const TYPES = [...TIERS, TRIAL_PLAN];
const DAYS_OF_TRIAL = 14;

export default function AdminPlans() {
  const { prices, loaded: pricesLoaded, save: savePrices } = usePlanPrices();
  const { limits, loaded: limitsLoaded, save: saveLimits } = usePlanLimits();
  const [selected, setSelected] = useState(TIERS[0]);
  // prices are kept per plan ("Silver 3 Months"), limits per tier ("Silver"); everything is saved together
  const [form, setForm] = useState<Record<string, string>>({});
  const [limitForm, setLimitForm] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!pricesLoaded) return;
    setForm(Object.fromEntries(paidPlans.map((p) => [p.name, prices[p.name] ? String(prices[p.name]) : "0"])));
  }, [pricesLoaded, prices]);

  useEffect(() => {
    if (!limitsLoaded) return;
    setLimitForm(Object.fromEntries(TYPES.map((t) => [t, limits[t] ? String(limits[t]) : "0"])));
  }, [limitsLoaded, limits]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    // merged with what is saved, so plans sold earlier keep their price and limit
    savePrices({ ...prices, ...Object.fromEntries(paidPlans.map((p) => [p.name, Number(form[p.name]) || 0])) });
    saveLimits({ ...limits, ...Object.fromEntries(TYPES.map((t) => [t, Number(limitForm[t]) || 0])) });
    setSaved(true);
  };

  const isTrial = selected === TRIAL_PLAN;

  return (
    <>
      <Topbar title="Plans & pricing" subtitle="Set the price and monthly order limit of each subscription plan" />
      <div className="container">
        <form onSubmit={submit} className="card max-w-2xl space-y-5 p-6">
          <div>
            <h2 className="text-lg font-black text-slate-900">Plan prices &amp; limits</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a plan type, then set the order limit and the price of each duration. A price of 0 means the price
              is not set yet. Revenue reports count a plan only after its price is set. Order limit is per month; 0 means
              unlimited.
            </p>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">Plan type</span>
            <select
              className="input"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              aria-label="Plan type"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          {saved && (
            <p role="status" className="flex items-center gap-1.5 text-sm font-bold text-emerald-600">
              <CheckCircle2 size={16} /> Saved.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <div>
              <p className="font-bold text-slate-900">Orders per month</p>
              <p className="text-xs text-slate-500">
                {isTrial ? "For the whole free trial" : `Applies to every ${selected} duration`}
              </p>
            </div>
            <input
                  type="text"
                  aria-label={`${selected} orders per month limit`}
                  inputMode="numeric"
                  maxLength={6}
                  pattern="[0-9]*"
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
              The free trial lasts {DAYS_OF_TRIAL} days and is always free, so it has no price.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {plansOfTier(selected).map((p) => (
                <li key={p.name} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-bold text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      {p.months} month{p.months === 1 ? "" : "s"}
                    </p>
                  </div>
                  <label className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-500">₹</span>
                    <input
                          type="text"
                          aria-label={`${p.name} price`}
                          inputMode="numeric"
                          maxLength={7}
                          pattern="[0-9]*"
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

          <Button type="submit">Save prices &amp; limits</Button>
          <p className="muted text-xs">Save covers every plan type, not only the one shown.</p>
        </form>
      </div>
    </>
  );
}