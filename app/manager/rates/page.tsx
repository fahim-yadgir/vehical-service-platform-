"use client";

import Topbar from "../../../components/navbar/Topbar";
import { useOwnerSubscription } from "../../../lib/ownerTenant";
import { rateLabel, useOwnerRates, type RateItem } from "../../../lib/ownerRates";

function RateSection({ title, hint, list }: { title: string; hint: string; list: RateItem[] }) {
  return (
    <section className="card space-y-4 p-6">
      <div>
        <h2 className="text-lg font-black text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{hint}</p>
      </div>
      {list.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">The owner hasn&apos;t set these yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {list.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-4 py-3">
              <div>
                <p className="font-semibold text-slate-900">{r.name}</p>
                {r.note && <p className="text-xs text-slate-500">{r.note}</p>}
              </div>
              <b>{rateLabel(r.price)}</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ManagerRates() {
  const sub = useOwnerSubscription();
  const { rates } = useOwnerRates(sub?.tenant.id);

  return (
    <>
      <Topbar title="Rates" subtitle="Your service centre's rates, as set by the owner" />
      <div className="container space-y-5">
        <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
          View only. Only the owner can change these rates.
        </p>
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <RateSection title="Service rates" hint="Fixed price for each service." list={rates?.services ?? []} />
          <RateSection title="Facility & extra rates" hint="Pickup & drop, inspection, towing and other extras." list={rates?.facilities ?? []} />
        </div>
      </div>
    </>
  );
}