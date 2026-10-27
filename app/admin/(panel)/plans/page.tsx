"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import Topbar from "../../../../components/navbar/Topbar";
import Button from "../../../../components/ui/Button";
import { paidPlans, plans, usePlanPrices } from "../../../../lib/plans";

export default function AdminPlans() {
  const { prices, loaded, save } = usePlanPrices();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    setForm(Object.fromEntries(paidPlans.map((p) => [p.name, prices[p.name] ? String(prices[p.name]) : "0"])));
  }, [loaded, prices]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save(Object.fromEntries(paidPlans.map((p) => [p.name, Number(form[p.name]) || 0])));
    setSaved(true);
  };

  return (
    <>
      <Topbar title="Plans & pricing" subtitle="Set the price of each subscription plan" />
      <div className="container">
        <form onSubmit={submit} className="card max-w-2xl space-y-5 p-6">
          <div>
            <h2 className="text-lg font-black text-slate-900">Plan prices</h2>
            <p className="mt-1 text-sm text-slate-500">
              A price of 0 means the price is not set yet. Revenue reports count a plan only after its price is set.
            </p>
          </div>

          {saved && (
            <p role="status" className="flex items-center gap-1.5 text-sm font-bold text-emerald-600">
              <CheckCircle2 size={16} /> Prices saved.
            </p>
          )}

          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {plans.map((p) => (
              <li key={p.name} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-bold text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    {p.months === 0 ? `${p.days} days, always free` : `${p.months} month${p.months === 1 ? "" : "s"}`}
                  </p>
                </div>
                {p.months === 0 ? (
                  <span className="text-sm font-bold text-slate-400">Free</span>
                ) : (
                  <label className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-500">₹</span>
                    <input
                      aria-label={`${p.name} price`}
                      inputMode="numeric"
                      className="input w-36 text-right"
                      value={form[p.name] ?? "0"}
                      onChange={(e) => {
                        setForm({ ...form, [p.name]: e.target.value.replace(/\D/g, "").slice(0, 7) });
                        setSaved(false);
                      }}
                    />
                  </label>
                )}
              </li>
            ))}
          </ul>

          <Button type="submit">Save prices</Button>
        </form>
      </div>
    </>
  );
}