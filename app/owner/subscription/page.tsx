"use client";

import { useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import Topbar from "../../../components/navbar/Topbar";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";

export default function OwnerSubscription() {
  const [requested, setRequested] = useState(false);

  return (
    <>
      <Topbar title="Subscription" subtitle="Plan, usage and renewal controls" />
      <div className="container">
        <div className="card glow max-w-2xl overflow-hidden">
          <div className="bg-slate-950 p-7 text-white">
            <div className="flex items-center justify-between">
              <div>
                <Badge tone="green">Active plan</Badge>
                <h2 className="mt-4 text-3xl font-black">1 Year Business</h2>
                <p className="mt-2 text-slate-400">Active until 02 July 2027</p>
              </div>
              <Sparkles className="text-orange-400" size={32} />
            </div>
          </div>
          <div className="p-7">
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
              <Button onClick={() => setRequested(true)}>Renew / Upgrade</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}