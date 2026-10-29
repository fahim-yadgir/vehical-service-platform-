"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Topbar from "../../../components/navbar/Topbar";
import KpiCard from "../../../components/cards/KpiCard";
import Badge from "../../../components/ui/Badge";
import SectionHeading from "../../../components/ui/SectionHeading";
import { ordersForVehicle, useVehicles, vehicleName } from "../../../lib/customerVehicles";
import { useCustomerOrders } from "../../../lib/customerOrders";
import { liveServiceOptions, useLiveCenters } from "../../../lib/liveCenters";
import { isClosed, money, statusLabel, statusProgress, statusTone } from "../../../lib/orders";
import { distanceKm, formatKm } from "../../../lib/geo";
import { loadProfile } from "../../../lib/customerProfile";
import { DEFAULT_LOCATION, loadLocation } from "../../../lib/customerLocation";

import { ArrowRight, Battery, Bike, Car, Clock, Disc3, Droplets, MapPin, Navigation, Plus, Star, Truck, Wind, Wrench, type LucideIcon } from "lucide-react";

/** Icon for a service name that an owner typed in My Rates. Falls back to a wrench. */
const serviceIcon = (name: string): LucideIcon =>
  /wash|clean|detail/i.test(name) ? Droplets
  : /ac|air|cool/i.test(name) ? Wind
  : /brake/i.test(name) ? Disc3
  : /batter/i.test(name) ? Battery
  : /full|complete/i.test(name) ? Car
  : Wrench;

export default function DashboardPage() {
  const { vehicles } = useVehicles();
  const { orders } = useCustomerOrders();
  const { centers: liveCenters } = useLiveCenters();
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    setFirstName(loadProfile().fullName.trim().split(" ")[0]);
    const saved = loadLocation();
    if (saved) setLocation(saved);
  }, []);

  // Only centres that are live (active plan, listed, with a map pin), nearest first.
  const centers = useMemo(
    () => liveCenters.map((c) => ({ ...c, km: distanceKm(location, c.location) })).sort((a, z) => a.km - z.km),
    [location, liveCenters],
  );
  const nearby = centers.slice(0, 4);
  const nearbyCount = centers.filter((c) => c.km <= 10).length;

  // Services that at least one live centre has really put rates on, with how many centres offer each.
  const services = useMemo(
    () => liveServiceOptions(liveCenters).map((name) => ({ name, count: liveCenters.filter((c) => c.services.includes(name)).length })),
    [liveCenters],
  );

  const vehicle = vehicles[0];
  const VehicleIcon = vehicle && /bike|scooter/i.test(vehicle.type) ? Bike : Car;
  const openOrders = orders.filter((o) => !isClosed(o.status));
  const completed = orders.filter((o) => o.status === "completed");
  const active = ordersForVehicle(orders, vehicle).find((o) => !isClosed(o.status)) ?? openOrders[0];
  const lastDone = completed[0];
  const centreOf = (tenantId?: string) => liveCenters.find((c) => c.id === tenantId);
  const activeCentre = active && centreOf(active.tenantId);
  const findCenters = (service?: string) =>
    service ? `/customer/serviceCenters?service=${encodeURIComponent(service)}` : "/customer/serviceCenters";

  return (
    <>
      <Topbar title="Customer Dashboard" subtitle="Your vehicles, bookings and nearby service centres" />

      <div className="container space-y-7">
        {/* HERO */}
        <section className="card mesh fade-up overflow-hidden p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <Badge tone="yellow">Welcome back{firstName ? `, ${firstName}` : ""}</Badge>
              <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
                Everything your vehicle needs, in one place.
              </h2>
              <p className="mt-3 max-w-xl text-slate-600">
                Find service centres near you, book a service and follow your vehicle from pickup to delivery.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={findCenters()} className="btn btn-primary"><Wrench size={17} /> Book a Service</Link>
                <Link href="/customer/vehicles" className="btn btn-secondary"><Car size={17} /> My Vehicles</Link>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Current vehicle</span>
                {vehicles.length > 1 && (
                  <Link href="/customer/vehicles" className="text-xs font-bold text-orange-300 hover:text-orange-200">+{vehicles.length - 1} more</Link>
                )}
              </div>

              {vehicle ? (
                <>
                  <Link href="/customer/vehicles" className="mt-5 flex items-center gap-4">
                    <div className="grid size-14 place-items-center rounded-2xl bg-white/10"><VehicleIcon size={28} className="text-orange-400" /></div>
                    <div>
                      <p className="text-xl font-black">{vehicleName(vehicle)}</p>
                      <p className="font-mono text-sm text-slate-400">{vehicle.registration}</p>
                    </div>
                  </Link>

                  <div className="mt-5 rounded-2xl bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Service status</span>
                      {active && <span className="pulse-dot size-3 rounded-full bg-orange-400" />}
                    </div>
                    {active ? (
                      <>
                        <p className="mt-2 font-black capitalize">{statusLabel(active.status)}</p>
                        <div className="mt-4 progress-track bg-white/10"><div className="progress-fill" style={{ width: `${statusProgress(active.status)}%` }} /></div>
                        <div className="mt-2 flex justify-between text-xs text-slate-400">
                          <span>{statusProgress(active.status)}% complete</span>
                          <span>{activeCentre?.name ?? "Service centre"}</span>
                        </div>
                      </>
                    ) : (
                      <p className="mt-2 font-black">No active service</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="mt-5 rounded-2xl bg-white/5 p-5 text-center">
                  <p className="font-black">No vehicle added yet</p>
                  <Link href="/customer/vehicles" className="btn btn-primary mt-4"><Plus size={16} /> Add vehicle</Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* KPI CARDS */}
        <div className="grid-auto">
          <KpiCard icon="car" label="Vehicles" value={vehicles.length} />
          <KpiCard icon="clock" label="Active bookings" value={openOrders.length} />
          <KpiCard icon="map" label="Centres within 10 km" value={nearbyCount} />
          <KpiCard icon="check" label="Services completed" value={completed.length} />
        </div>

        {/* SERVICES THAT CENTRES REALLY OFFER */}
        {services.length > 0 && (
          <section className="card fade-up-2 p-6">
            <SectionHeading eyebrow="Services" title="What does your vehicle need?" description="Services offered by centres on AutoServe" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {services.map(({ name, count }) => {
                const Icon = serviceIcon(name);
                return (
                  <Link
                    key={name}
                    href={findCenters(name)}
                    className="group rounded-2xl border border-slate-100 p-4 text-center transition hover:-translate-y-1 hover:border-orange-100 hover:bg-orange-50/50 hover:shadow-md"
                  >
                    <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-orange-50 text-orange-500 transition group-hover:bg-orange-500 group-hover:text-white"><Icon size={22} /></div>
                    <p className="mt-3 text-sm font-black">{name}</p>
                    <p className="muted mt-1 text-xs">{count} centre{count === 1 ? "" : "s"}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* CURRENT SERVICE + NEARBY */}
        <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <section className="card fade-up-2 p-6">
            {active ? (
              <>
                <SectionHeading
                  eyebrow="Current service"
                  title={`${active.id} · ${active.vehicle.brand} ${active.vehicle.model}`}
                  description={`${active.service} at ${activeCentre?.name ?? "service centre"}`}
                  action={
                    <Link href={`/customer/bookings/${active.id}`} className="btn btn-secondary">
                      Track booking <Navigation size={15} />
                    </Link>
                  }
                />
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-400">Progress</p><p className="mt-2 text-xl font-black">{statusProgress(active.status)}%</p></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-400">Booked on</p><p className="mt-2 text-xl font-black">{active.date}</p></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-400">Estimate</p><p className="mt-2 text-xl font-black">{money(active.amount)}</p></div>
                </div>
                <div className="mt-6 flex items-center gap-3 text-sm capitalize text-slate-600">
                  <span className="grid size-9 place-items-center rounded-xl bg-orange-50 text-orange-500"><Clock size={17} /></span>
                  Status: {statusLabel(active.status)}
                </div>
              </>
            ) : (
              <SectionHeading
                eyebrow="Current service"
                title="No active service"
                description={lastDone ? `Last completed: ${lastDone.service} on ${lastDone.date}` : "Pick a service centre near you to book your first service"}
                action={<Link href="/customer/serviceCenters" className="btn btn-primary">Find service centre</Link>}
              />
            )}
          </section>

          <section className="card fade-up-3 p-6">
            <SectionHeading eyebrow="Nearby" title="Service centres" description={`Closest to ${location.address}`} />
            {nearby.length === 0 ? (
              <p className="muted rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm">
                No centres are listed yet. They appear here once an owner adds a location and lists the centre.
              </p>
            ) : (
              nearby.map((c) => (
                <Link key={c.id} href={`/customer/serviceCenters/${c.id}`} className="flex items-center justify-between gap-3 border-b border-slate-100 py-4 last:border-0 hover:opacity-80">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-500"><MapPin size={17} /></div>
                    <div>
                      <p className="font-bold">{c.name}</p>
                      <p className="muted flex items-center gap-1.5 text-xs">
                        {c.area} · {formatKm(c.km)}
                        {c.pickupDrop && <span className="inline-flex items-center gap-1 text-emerald-700"><Truck size={11} /> Pickup</span>}
                      </p>
                    </div>
                  </div>
                  {c.rating > 0 ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-500"><Star size={13} fill="currentColor" />{c.rating.toFixed(1)}</span>
                  ) : (
                    <Badge tone="blue">New</Badge>
                  )}
                </Link>
              ))
            )}
            <Link href="/customer/serviceCenters" className="btn btn-secondary mt-4 w-full">See all service centres <ArrowRight size={15} /></Link>
          </section>
        </div>

        {/* RECENT ACTIVITY */}
        <section className="card p-6">
          <SectionHeading
            title="Recent activity"
            action={<Link href="/customer/bookings" className="btn btn-secondary">All bookings <ArrowRight size={15} /></Link>}
          />
          {orders.length === 0 ? (
            <p className="muted rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm">
              No bookings yet. <Link href="/customer/bookings/new" className="font-bold text-orange-600 underline">Book your first service</Link>.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {orders.slice(0, 4).map((o) => (
                <Link key={o.id} href={`/customer/bookings/${o.id}`} className="rounded-2xl border border-slate-100 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-bold">{o.id} · {o.service}</p>
                      <p className="muted mt-1 text-sm">{o.vehicle.brand} {o.vehicle.model} · {o.date}</p>
                      <p className="muted mt-0.5 text-xs">{centreOf(o.tenantId)?.name ?? "Service centre"} · {money(o.amount)}</p>
                    </div>
                    <Badge tone={statusTone(o.status)}>{statusLabel(o.status)}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}