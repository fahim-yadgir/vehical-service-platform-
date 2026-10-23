"use client";

import { Lock } from "lucide-react";
import { useOwnerSubscription } from "../../lib/ownerTenant";

/** Blocks the manager workspace while the service centre's trial/plan has ended or the centre is suspended. */
export default function ManagerAccessGate({ children }: { children: React.ReactNode }) {
  const sub = useOwnerSubscription();
  if (!sub?.locked) return <>{children}</>;
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="card max-w-md p-8 text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-600"><Lock size={24} /></div>
        <h1 className="text-2xl font-black">{sub.suspended ? "Service centre suspended" : "Access paused"}</h1>
        <p className="muted mt-2 text-sm">
          {sub.suspended
            ? `${sub.tenant.name} has been suspended. Please contact your owner or AutoServe support.`
            : `${sub.tenant.name}'s trial or plan has ended. Please ask your owner to renew the subscription.`}
        </p>
      </div>
    </div>
  );
}
