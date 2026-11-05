"use client";

import { useEffect, useMemo, useState } from "react";
import { describeSubscription } from "./ownerTenant";
import { isListedOnApp, loadOwnerProfile } from "./ownerProfile";
import { loadOwnerRates } from "./ownerRates";
import { restoreStaff, restoreTenants, useAppSelector, type StaffMember, type Tenant } from "./redux-store";
import type { ServiceCenter } from "./serviceCenters";
import { ratingStats, restoreReviews, reviewsForTenant, useReviews, type Review } from "./reviews";

/** A service centre as the customer sees it, built from what the admin and the owner entered. */
export type LiveCenter = ServiceCenter & { tenant: Tenant; since: number; managers: number; staff: number };

function build(t: Tenant, allStaff: StaffMember[], allReviews:Review[]): LiveCenter | null {
  if (describeSubscription(t).locked) return null; // suspended or plan ended
  const p = loadOwnerProfile(t.id);
  if (!p || !isListedOnApp(p) || p.lat === undefined || p.lng === undefined) return null;

  const rates = loadOwnerRates(t.id);
  const team = allStaff.filter((m) => m.tenantId === t.id && m.status === "Active");
  const mobile = t.mobile ?? "";
const stats = ratingStats(reviewsForTenant(allReviews, t.id));
  return {
    id: t.id, // the tenant id is the centre id
    name: t.name,
    category: "Multi-brand Garage",
    brands: [],
    services: [...new Set((rates?.services ?? []).map((r) => r.name))],
    rating: stats.average, // no reviews stored yet
    reviewCount: stats.count,
    location: { lat: p.lat, lng: p.lng },
    area: p.city,
    address: [p.address, p.city, p.state, p.pincode].filter(Boolean).join(", "),
    phone: mobile.length === 10 ? `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}` : mobile,
    hours: "Call to confirm",
    pickupDrop: team.some((m) => m.role === "staff"),
    tenant: t,
    since: Number(t.createdAt.slice(0, 4)),
    managers: team.filter((m) => m.role === "Manager").length,
    staff: team.filter((m) => m.role === "staff").length,
  };
}

/** Every centre a customer can see. `ready` is false until saved data has been read. */
export function useLiveCenters() {
  const tenants = useAppSelector((s) => s.tenants);
  const staff = useAppSelector((s) => s.staff);
  const reviews = useReviews();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    restoreTenants();
    restoreStaff();
    restoreReviews();
    setReady(true);
  }, []);

  const centers = useMemo(
    () => (ready ? tenants.flatMap((t) => { const c = build(t, staff, reviews); return c ? [c] : []; }) : []),
    [ready, tenants, staff, reviews],
  );
  return { centers, ready };
}

/** Service names that at least one live centre offers. */
export const liveServiceOptions = (centers: LiveCenter[]) => [...new Set(centers.flatMap((c) => c.services))].sort();