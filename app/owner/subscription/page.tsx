"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import Topbar from "../../../components/navbar/Topbar";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import { TRIAL_DAYS, useOwnerSubscription } from "../../../lib/ownerTenant";
import { orderLimitStatus, plans, planLimitOf, planPriceOf, planTierOf, usePlanLimits, usePlanPrices } from "../../../lib/plans";
import { restoreOrders, useOrders } from "../../../lib/orders";
import { restoreStaff, tenantHeadcount, useAppSelector } from "../../../lib/redux-store";

const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/** Colours of the plan card. Silver, Golden and Diamond have their own; every other plan keeps the dark default. */
type Theme = { header: string; accent: string; bar: string; dot: string };
const DEFAULT_THEME: Theme = { header: "#020617", accent: "#fb923c", bar: "", dot: "#cbd5e1" };
const TIER_THEMES: Record<string, Theme> = {
  Silver: {
    header: "linear-gradient(135deg, #475569 0%, #94a3b8 55%, #e2e8f0 100%)",
    accent: "#f1f5f9",
    bar: "#64748b",
    dot: "#94a3b8",
  },
  Golden: {
    header: "linear-gradient(135deg, #78350f 0%, #d97706 55%, #fcd34d 100%)",
    accent: "#fef3c7",
    bar: "#f59e0b",
    dot: "#f59e0b",
  },
  Diamond: {
    header: "linear-gradient(135deg, #0c4a6e 0%, #0891b2 45%, #7c3aed 100%)",
    accent: "#a5f3fc",
    bar: "#06b6d4",
    dot: "#06b6d4",
  },
};
/** The theme of a plan tier ("Silver"). Plans without a tier get the dark default. */
const themeOf = (tier?: string): Theme => (tier && TIER_THEMES[tier]) || DEFAULT_THEME;

export default function OwnerSubscription() {
  const [requested, setRequested] = useState(false);
  const { prices } = usePlanPrices();
  const { limits, loaded: limitsLoaded } = usePlanLimits();
  // The plan comes from the tenant the admin created.
  const sub = useOwnerSubscription();
  const orders = useOrders();
  const staff = useAppSelector((state) => state.staff);
  useEffect(() => {
    restoreOrders();
    restoreStaff();
  }, []);

  // Real usage of this centre, taken from its own orders (cancelled ones are not counted) and team.
  const usage = sub && limitsLoaded ? orderLimitStatus(sub.tenant.plan, sub.tenant.subscriptionExpiresAt, orders, sub.tenant.id, limits) : null;
  const team = sub ? tenantHeadcount(staff, sub.tenant.id) : null;
  const theme = themeOf(sub ? planTierOf(sub.tenant.plan) : undefined);
  const coloured = theme !== DEFAULT_THEME;

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
      <div className="container grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="card glow overflow-hidden">
          <div className="p-7 text-white" style={{ background: theme.header }}>
            <div className="flex items-center justify-between">
              <div>
                {badge && <Badge tone={badge.tone}>{badge.text}</Badge>}
                <h2 className="mt-4 text-3xl font-black">{heading}</h2>
                <p className={`mt-2 ${coloured ? "text-white/80" : "text-slate-400"}`}>{subtitle}</p>
              </div>
              <Sparkles size={32} style={{ color: theme.accent }} />
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
            {usage?.reached && !sub?.locked && (
              <p role="alert" className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                You have used all {usage.limit} orders of this month. New orders open again on {fmtDate(usage.resetsOn)}, or upgrade your plan to take more now.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="muted text-xs">Orders this month</p>
                <p className="mt-2 text-xl font-black">
                  {usage ? usage.used : "…"}
                  {usage && usage.limit > 0 ? ` / ${usage.limit}` : ""}
                </p>
                <p className="muted mt-1 text-xs">
                  {!usage ? "" : usage.limit > 0 ? `Counts again from zero on ${fmtDate(usage.resetsOn)}` : "No order limit on this plan"}
                </p>
                {usage && usage.limit > 0 && (
                  <div className="mt-2 progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(100, (usage.used / usage.limit) * 100)}%`,
                        ...(theme.bar ? { background: theme.bar } : {}),
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="muted text-xs">Team members</p>
                <p className="mt-2 text-xl font-black">{team?.total ?? 0}</p>
                <p className="muted mt-1 text-xs">{team ? `1 owner, ${team.managers} manager${team.managers === 1 ? "" : "s"}, ${team.staff} staff` : ""}</p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-emerald-600">{requested ? "Demo renewal request captured" : "Frontend-only subscription flow"}</p>
              <Button onClick={() => setRequested(true)}>{sub?.isTrial ? "Choose a plan" : "Renew / Upgrade"}</Button>
            </div>
          </div>
        </div>

        <section className="card p-6">
          <h3 className="font-black text-slate-900">Plans</h3>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {plans.map((p) => {
              const price = planPriceOf(p.name, prices);
              const limit = limitsLoaded ? planLimitOf(p.name, limits) : 0;
              const current = sub?.tenant.plan === p.name;
              const tier = p.tier ? TIER_THEMES[p.tier] : undefined;
              return (
                <li key={p.name} className="flex items-center justify-between gap-3 py-3">
                  <span className="flex items-start gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: tier ? tier.dot : "#e2e8f0" }}
                    />
                    <span>
                      <span className={current ? "font-black text-orange-600" : "font-semibold"}>
                        {p.name}{current ? " (current)" : ""}
                      </span>
                      {limitsLoaded && (
                        <span className="muted block text-xs">{limit > 0 ? `Up to ${limit} orders / month` : "Unlimited orders"}</span>
                      )}
                    </span>
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