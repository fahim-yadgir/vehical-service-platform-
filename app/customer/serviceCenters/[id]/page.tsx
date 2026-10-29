"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { ArrowLeft, BadgeCheck, MapPin, Navigation, Phone, Truck, Users } from "lucide-react";
import Topbar from "@/components/navbar/Topbar";
import Badge from "@/components/ui/Badge";
import CenterCharges from "@/components/customer/CenterCharges";
import { useLiveCenters } from "@/lib/liveCenters";
import { loadOwnerRates, rateAppliesTo, rateLabel, type OwnerRates } from "@/lib/ownerRates";
import type { VehicleKind } from "@/lib/serviceCenterProfiles";
import { distanceKm, formatKm } from "@/lib/geo";
import { DEFAULT_LOCATION, loadLocation, type SavedLocation } from "@/lib/customerLocation";
import { restoreOrders, useOrders } from "@/lib/orders";

const ServiceCentersMap = dynamic(() => import("@/components/map/ServiceCentersMap"), {
  ssr: false,
  loading: () => <div className="grid h-[280px] place-items-center rounded-2xl bg-slate-100 text-sm text-slate-400">Loading map...</div>,
});

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-7">
      <h2 className="text-xl font-black text-slate-900">{title}</h2>
      {subtitle && <p className="muted mt-1 text-sm">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function ServiceCenterProfile() {
  const { id } = useParams<{ id: string }>();
  const { centers, ready } = useLiveCenters();
  const center = centers.find((c) => c.id === id);
  const orders = useOrders();

  const [location, setLocation] = useState<SavedLocation>(DEFAULT_LOCATION);
  const [kind, setKind] = useState<VehicleKind>("Car");
  const [rates, setRates] = useState<OwnerRates | null>(null);

  useEffect(() => {
    restoreOrders();
    const saved = loadLocation();
    if (saved) setLocation(saved);
  }, []);

  useEffect(() => {
    setRates(center ? loadOwnerRates(center.id) : null);
  }, [center?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) {
    return <Topbar title="Service Center" subtitle="Loading…" />;
  }

  if (!center) {
    return (
      <>
        <Topbar title="Service Center" />
        <div className="container">
          <div className="card p-10 text-center">
            <p className="font-black">Service center not found</p>
            <p className="muted mt-1 text-sm">It may be paused or not yet listed.</p>
            <Link href="/customer/serviceCenters" className="btn btn-secondary mt-4">Back to service centers</Link>
          </div>
        </div>
      </>
    );
  }

  const completed = orders.filter((o) => o.tenantId === center.id && o.status === "completed").length;
  const serviceRows = (rates?.services ?? []).filter((r) => rateAppliesTo(r, kind)).map((r) => ({ name: r.name, note: r.note, price: rateLabel(r.price) }));
  const facilityRows = (rates?.facilities ?? []).filter((r) => rateAppliesTo(r, kind)).map((r) => ({ name: r.name, note: r.note, price: rateLabel(r.price) }));
  const hasRates = (rates?.services.length ?? 0) > 0;

  const tel = `tel:${center.phone.replaceAll(" ", "")}`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${center.location.lat},${center.location.lng}`;

  return (
    <>
      <Topbar title={center.name} subtitle={center.area} />

      <div className="container space-y-6">
        <Link href="/customer/serviceCenters" className="btn btn-secondary text-sm">
          <ArrowLeft size={16} /> All service centers
        </Link>

        <section className="card space-y-4 p-5 sm:p-7">
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {center.name}
              <BadgeCheck size={22} className="text-sky-500" aria-label="Verified on AutoServe" />
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5"><MapPin size={15} />{center.address}</span>
              <span className="font-bold text-slate-700">{formatKm(distanceKm(location, center.location))} away</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge tone="blue">New on AutoServe</Badge>
            {center.pickupDrop && <Badge tone="green"><Truck size={12} className="mr-1 self-center" />Pickup &amp; drop</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "On AutoServe since", value: String(center.since) },
              { label: "Services completed", value: String(completed) },
              { label: "Services offered", value: String(center.services.length) },
              { label: "Team on app", value: String(center.managers + center.staff + 1) },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xl font-black text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href={`/customer/bookings/new?center=${center.id}`} className="btn btn-primary">Book service</Link>
            <a href={tel} className="btn btn-secondary"><Phone size={16} /> Call {center.phone}</a>
            <a href={directions} target="_blank" rel="noreferrer" className="btn btn-secondary"><Navigation size={16} /> Get directions</a>
          </div>
        </section>

        <Section title="Location">
          <ServiceCentersMap centers={[center]} user={location} selectedId={center.id} onSelect={() => {}} height={280} />
          <p className="mt-3 flex items-start gap-2 text-sm text-slate-600"><MapPin size={16} className="mt-0.5 shrink-0 text-orange-500" />{center.address}</p>
        </Section>

        <Section title="Charges" subtitle="Rates fixed by this service centre.">
          {hasRates ? (
            <CenterCharges
              services={serviceRows}
              facilities={facilityRows}
              kind={kind}
              onKindChange={setKind}
              servicesEmpty={`No ${kind === "Car" ? "car" : "bike"} service rates added yet. Please call the centre.`}
              facilitiesEmpty={`No ${kind === "Car" ? "car" : "bike"} facility rates added yet.`}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
              This centre has not added its rates yet. Please call the centre to book.
            </p>
          )}
        </Section>

        <Section title="Team">
          <ul className="grid gap-3 text-sm sm:grid-cols-3">
            <li className="rounded-2xl bg-slate-50 p-4"><p className="text-xl font-black">1</p><p className="text-xs text-slate-500">Owner</p></li>
            <li className="rounded-2xl bg-slate-50 p-4"><p className="text-xl font-black">{center.managers}</p><p className="text-xs text-slate-500">Managers</p></li>
            <li className="rounded-2xl bg-slate-50 p-4"><p className="text-xl font-black">{center.staff}</p><p className="flex items-center gap-1 text-xs text-slate-500"><Users size={12} /> Pickup &amp; drop staff</p></li>
          </ul>
        </Section>

        <Section title="Customer reviews">
          <p className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
            No reviews yet. Reviews will appear here after customers complete a booking.
          </p>
        </Section>
      </div>
    </>
  );
}