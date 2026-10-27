"use client";

import { useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import Topbar from "../../../components/navbar/Topbar";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import { TRIAL_DAYS, useOwnerSubscription } from "../../../lib/ownerTenant";
import { plans, planPriceOf, usePlanPrices } from "../../../lib/plans";

const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

export default function OwnerSubscription() {
  const [requested, setRequested] = useState(false);
  const { prices } = usePlanPrices();
  // The plan comes from the tenant the admin created.
  const sub = useOwnerSubscription();

  const badge = !sub
    ? null
    : sub.suspended
      ? { tone: "red" as const, text: "Suspended" }
      : sub.expired
        ? { tone: "red" as const, text: sub.isTrial ? "Trial ended" : "Expired" }
        : sub.isTrial
          ? { tone: "yellow" as const, text: "Free trial" }
          : { tone: "green" as const, text: "Active plan" };
  const heading = !sub ? "Loading…" : sub.isTrial ? `${TRIAL_DAYS}-Day Free Trial` : sub.tenant.plan;
  const subtitle = !sub ? "" : sub.expired ? `Ended on ${fmt(sub.tenant.subscriptionExpiresAt)}` : `${sub.isTrial ? "Trial ends" : "Active until"} ${fmt(sub.tenant.subscriptionExpiresAt)}`;
  const daysUsed = sub?.isTrial ? Math.min(TRIAL_DAYS, Math.max(0, TRIAL_DAYS - sub.daysLeft)) : 0;

  return (
    <>
      <Topbar title="Subscription" subtitle="Plan, usage and renewal controls" />
      <div className="container space-y-5">
        <div className="card glow max-w-2xl overflow-hidden">
          <div className="bg-slate-950 p-7 text-white">
            <div className="flex items-center justify-between">
              <div>
                {badge && <Badge tone={badge.tone}>{badge.text}</Badge>}
                <h2 className="mt-4 text-3xl font-black">{heading}</h2>
                <p className="mt-2 text-slate-400">{subtitle}</p>
              </div>
              <Sparkles className="text-orange-400" size={32} />
            </div>
          </div>
          <div className="p-7">
            {sub?.isTrial && !sub.expired && (
              <div className="mb-4 rounded-2xl bg-orange-50 p-4">
                <p className="text-sm font-bold text-orange-800">
                  {sub.daysLeft === 0 ? "Your trial ends today" : `${sub.daysLeft} day${sub.daysLeft === 1 ? "" : "s"} left in your free trial`}
                </p>
                <div className="mt-3 progress-track"><div className="progress-fill" style={{ width: `${(daysUsed / TRIAL_DAYS) * 100}%` }} /></div>
                <p className="muted mt-2 text-xs">Day {daysUsed} of {TRIAL_DAYS}</p>
              </div>
            )}
            {sub?.locked && (
              <p role="alert" className="mb-4 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">
                {sub.suspended ? "This account is suspended. Contact AutoServe support." : "Your access is paused. Choose a plan to continue."}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="muted text-xs">Bookings this month</p>
                <p className="mt-2 text-xl font-black">386 / 1,000</p>
                <div className="mt-3 progress-track"><div className="progress-fill w-[39%]" /></div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="muted text-xs">Auto renewal</p>
                <p className="mt-2 flex items-center gap-2 font-black text-emerald-600"><CheckCircle2 size={18} /> Enabled</p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-emerald-600">{requested ? "Demo renewal request captured" : "Frontend-only subscription flow"}</p>
              <Button onClick={() => setRequested(true)}>{sub?.isTrial ? "Choose a plan" : "Renew / Upgrade"}</Button>
            </div>
          </div>
        </div>

        <section className="card max-w-2xl p-6">
          <h3 className="font-black text-slate-900">Plans</h3>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {plans.map((p) => {
              const price = planPriceOf(p.name, prices);
              const current = sub?.tenant.plan === p.name;
              return (
                <li key={p.name} className="flex items-center justify-between py-3">
                  <span className={current ? "font-black text-orange-600" : "font-semibold"}>
                    {p.name}{current ? " (current)" : ""}
                  </span>
                  <b>
                    {p.months === 0
                      ? `Free · ${p.days} days`
                      : price > 0
                        ? `₹${price.toLocaleString("en-IN")}`
                        : "Price not set yet"}
                  </b>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}