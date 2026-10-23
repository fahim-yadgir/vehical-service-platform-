"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, Lock } from "lucide-react";
import { useOwnerSubscription } from "../../lib/ownerTenant";
import { isProfileComplete, useOwnerProfile } from "../../lib/ownerProfile";

/** Shows the free-trial countdown and blocks the owner workspace once the trial/plan has expired. */
export default function OwnerAccessGate({ children }: { children: React.ReactNode }) {
  const sub = useOwnerSubscription();
  const { profile, loaded } = useOwnerProfile(sub?.tenant.id);
  const pathname = usePathname();
  const onSubscriptionPage = pathname.startsWith("/owner/subscription");

  if (sub?.locked && !onSubscriptionPage) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <div className="card max-w-md p-8 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-600"><Lock size={24} /></div>
          <h1 className="text-2xl font-black">
            {sub.suspended ? "Account suspended" : sub.isTrial ? "Your free trial has ended" : "Your subscription has expired"}
          </h1>
          <p className="muted mt-2 text-sm">
            {sub.suspended
              ? "Your service centre has been suspended. Please contact AutoServe support."
              : "Choose a plan to keep using your dashboard, bookings and reports."}
          </p>
          <Link href="/owner/subscription" className="mt-6 inline-block rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600">
            {sub.suspended ? "View account" : "Choose a plan"}
          </Link>
        </div>
      </div>
    );
  }

  const showTrialBanner = sub && sub.isTrial && !sub.locked;
  const showProfileBanner = sub && !sub.locked && loaded && !isProfileComplete(profile) && !pathname.startsWith("/owner/profile");
  return (
    <>
      {showTrialBanner && (
        <div role="status" className={`flex items-center justify-center gap-2 px-4 py-2 text-center text-sm font-semibold ${sub.daysLeft <= 3 ? "bg-amber-100 text-amber-900" : "bg-orange-50 text-orange-800"}`}>
          <Clock size={16} className="shrink-0" />
          <span>
            Free trial: {sub.daysLeft === 0 ? "ends today" : `${sub.daysLeft} day${sub.daysLeft === 1 ? "" : "s"} left`}.{" "}
            <Link href="/owner/subscription" className="underline">Choose a plan</Link>
          </span>
        </div>
      )}
      {showProfileBanner && (
        <div role="status" className="flex items-center justify-center gap-2 bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white">
          <span>Add your service centre details (address, GST number). <Link href="/owner/profile" className="underline">Complete profile</Link></span>
        </div>
      )}
      {children}
    </>
  );
}
