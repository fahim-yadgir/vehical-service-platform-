"use client";

import { Lock } from "lucide-react";
import { useStaffWorkspace } from "../../lib/staffSession";
import { describeSubscription } from "../../lib/ownerTenant";

/** Blocks the staff workspace when the person was removed or suspended, or the centre's plan has ended. */
export default function StaffAccessGate({ children }: { children: React.ReactNode }) {
  const { ready, me, tenant } = useStaffWorkspace();
  if (!ready) return null;

  const sub = tenant ? describeSubscription(tenant) : null;
  let message = "";
  if (!me) message = "We couldn't find your staff account. Please contact your service centre.";
  else if (me.status === "Suspended") message = "Your account is suspended. Please contact your service centre owner.";
  else if (sub?.locked) message = `${sub.tenant.name} is currently paused. Please contact your owner.`;

  if (!message) return <>{children}</>;
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="card max-w-md p-8 text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-600"><Lock size={24} /></div>
        <h1 className="text-2xl font-black">Access paused</h1>
        <p className="muted mt-2 text-sm">{message}</p>
      </div>
    </div>
  );
}