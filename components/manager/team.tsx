"use client";

import { useEffect } from "react";
import { Users } from "lucide-react";
import AppShell from "../layout/AppShell";
import Topbar from "../navbar/Topbar";
import Badge from "../ui/Badge";
import SectionHeading from "../ui/SectionHeading";
import { useOwnerSubscription } from "../../lib/ownerTenant";
import { restoreStaff, useAppSelector } from "../../lib/redux-store";

/** Shows the people the owner added in "My Staff", for the manager's own service centre. */
export default function Team() {
  const sub = useOwnerSubscription();
  const staff = useAppSelector((s) => s.staff);
  useEffect(() => restoreStaff(), []);
  const team = staff.filter((m) => m.tenantId === sub?.tenant.id);

  return (
    <AppShell role="manager">
      <Topbar title="Team" subtitle="Your service centre's managers and staff" />
      <div className="container">
        <SectionHeading eyebrow="People" title="Team" description="Added by the owner from My Staff" />
        {team.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">No team members yet. Your owner can add them from My Staff.</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {team.map((m) => (
              <article key={m.id} className="card p-5 transition hover:-translate-y-1 hover:shadow-lg">
                <div className="grid size-12 place-items-center rounded-2xl bg-slate-950 text-orange-400"><Users /></div>
                <h3 className="mt-5 font-black">{m.name}</h3>
                <p className="muted mt-1 text-sm">{m.role === "Driver" ? "Staff / Driver" : "Manager"}</p>
                <p className="muted mt-1 text-xs">{m.mobile}</p>
                <div className="mt-5">
                  <Badge tone={m.status === "Active" ? "green" : "red"}>{m.status}</Badge>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
