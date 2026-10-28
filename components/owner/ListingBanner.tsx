"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { useOwnerSubscription } from "../../lib/ownerTenant";
import { isListedOnApp, useOwnerProfile } from "../../lib/ownerProfile";

/** Shown to the owner until the centre profile and map pin are saved. */
export default function ListingBanner() {
  const sub = useOwnerSubscription();
  const { profile, loaded } = useOwnerProfile(sub?.tenant.id);
  if (!sub || !loaded || isListedOnApp(profile)) return null;
  return (
    <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800">
      <span className="flex items-center gap-2">
        <MapPin size={16} /> Your centre is not visible to customers yet. Add your address and map pin.
      </span>
      <Link href="/owner/profile" className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-700">
        Complete profile
      </Link>
    </div>
  );
}