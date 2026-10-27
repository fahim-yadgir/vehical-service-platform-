"use client";

import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Topbar from "../../../../components/navbar/Topbar";
import Button from "../../../../components/ui/Button";
import LocationPicker, { type PickedLocation } from "../../../../components/map/LocationPicker";
import { useVehicles } from "../../../../lib/customerVehicles";
import { useLiveCenters } from "../../../../lib/liveCenters";
import { loadOwnerRates, rateAppliesTo, rateLabel, type OwnerRates } from "../../../../lib/ownerRates";
import { DEFAULT_LOCATION, loadLocation } from "../../../../lib/customerLocation";
import { loadProfile } from "../../../../lib/customerProfile";
import { createOrder, restoreOrders } from "../../../../lib/orders";

const today = () => new Date().toISOString().slice(0, 10);

function NewBooking() {
  const router = useRouter();
  const params = useSearchParams();
  const { centers } = useLiveCenters();
  const { vehicles } = useVehicles();

  const [centerId, setCenterId] = useState(params.get("center") ?? "");
  const [vehicleId, setVehicleId] = useState("");
  const [serviceKey, setServiceKey] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [pickup, setPickup] = useState<PickedLocation | null>(null);
  const [rates, setRates] = useState<OwnerRates | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    restoreOrders(); // must run before creating, so saved orders aren't overwritten
    setPickup(loadLocation() ?? DEFAULT_LOCATION);
  }, []);

  const center = centers.find((c) => c.id === centerId);
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const kind = vehicle && /bike|scooter|motorcycle/i.test(vehicle.type) ? "Bike" : "Car";

  useEffect(() => {
    setRates(centerId ? loadOwnerRates(centerId) : null);
    setServiceKey("");
  }, [centerId, vehicleId]);

  // the owner's fixed rates for this kind of vehicle
  const services = useMemo(() => (rates?.services ?? []).filter((r) => rateAppliesTo(r, kind)), [rates, kind]);
  const service = services.find((s) => s.id === serviceKey);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!center) return setError("Choose a service centre.");
    if (!vehicle) return setError("Choose your vehicle.");
    if (!service) return setError("Choose a service.");
    if (!date) return setError("Choose a date.");
    if (!pickup || pickup.address === "Finding address...") return setError("Set your pickup location on the map.");

    const profile = loadProfile();
    const id = createOrder({
      tenantId: center.id,
      customer: { name: profile.fullName, mobile: profile.mobile },
      vehicle: { type: vehicle.type, brand: vehicle.brand, model: vehicle.model, registrationNo: vehicle.registration, year: vehicle.year },
      service: service.name,
      date: new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      amount: service.price,
      notes: notes.trim() || undefined,
      pickup,
      source: "customer",
    });
    router.push(`/customer/bookings/${id}`);
  };

  return (
    <>
      <Topbar title="Book a service" subtitle="Choose a centre, your vehicle and where we should pick it up" />
      <div className="container max-w-3xl space-y-5 md:!pl-6">
        <Link href="/customer/bookings" className="btn btn-secondary">← My bookings</Link>

        <form onSubmit={submit} noValidate className="card space-y-6 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2 sm:col-span-2">
              <span className="text-sm font-bold text-slate-700">Service centre</span>
              <select className="input" value={centerId} onChange={(e) => setCenterId(e.target.value)}>
                <option value="">Choose a centre…</option>
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.area}</option>
                ))}
              </select>
              {centers.length === 0 && <span className="block text-xs text-slate-500">No service centres are available yet.</span>}
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">Your vehicle</span>
              <select className="input" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                <option value="">Choose a vehicle…</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.brand} {v.model} · {v.registration}</option>
                ))}
              </select>
              {vehicles.length === 0 && (
                <span className="block text-xs text-slate-500">
                  No vehicles yet. <Link href="/customer/vehicles" className="font-bold text-orange-600 underline">Add one</Link>.
                </span>
              )}
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">Service</span>
              <select className="input" value={serviceKey} onChange={(e) => setServiceKey(e.target.value)} disabled={!center || !vehicle}>
                <option value="">{center && vehicle ? "Choose a service…" : "Choose centre and vehicle first"}</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {rateLabel(s.price)}</option>
                ))}
              </select>
              {center && vehicle && services.length === 0 && (
                <span className="block text-xs text-amber-700">This centre has no {kind === "Car" ? "car" : "bike"} service rates yet. Please call the centre.</span>
              )}
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">Preferred date</span>
              <input type="date" min={today()} className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">Notes (optional)</span>
              <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Strange noise from the front" />
            </label>
          </div>

          <section className="space-y-3">
            <div>
              <b>Pickup location</b>
              <p className="muted text-xs">Our staff will come here to collect your vehicle.</p>
            </div>
            <LocationPicker value={pickup} onChange={setPickup} height={280} />
          </section>

          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
          <Button type="submit">Confirm booking</Button>
        </form>
      </div>
    </>
  );
}

// useSearchParams needs a Suspense boundary
export default function NewBookingPage() {
  return (
    <Suspense>
      <NewBooking />
    </Suspense>
  );
}