"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Topbar from "../../../components/navbar/Topbar";
import KpiCard from "../../../components/cards/KpiCard";
import Badge from "../../../components/ui/Badge";
import SectionHeading from "../../../components/ui/SectionHeading";
import { bookings } from "../../../lib/mock-data";
import { bookingsForVehicle, useVehicles, vehicleName } from "../../../lib/customerVehicles";
import { serviceCenters } from "../../../lib/serviceCenters";
import { distanceKm, formatKm } from "../../../lib/geo";
import { defaultProfile, loadProfile } from "../../../lib/customerProfile";
import { DEFAULT_LOCATION, loadLocation } from "../../../lib/customerLocation";

import {
  Clock,
  MapPin,
  ArrowRight,
  Navigation,
  Car,
  Droplets,
  Disc3,
  Wind,
  Battery,
  Wrench,
  Star,
  ShieldCheck,
  BadgeCheck,
  Truck,
  Tag,
  ChevronRight,
  Bike,
  Plus,
} from "lucide-react";

export default function DashboardPage() {
  const { vehicles } = useVehicles();
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [firstName, setFirstName] = useState(defaultProfile.fullName.split(" ")[0]);
  useEffect(() => {
    setFirstName(loadProfile().fullName.trim().split(" ")[0]);
    const saved = loadLocation();
    if (saved) setLocation(saved);
  }, []);

  // Same data as the Service Centers pages, sorted by distance from the saved location.
  const centers = useMemo(
    () =>
      serviceCenters
        .map((c) => ({ ...c, km: distanceKm(location, c.location) }))
        .sort((a, z) => a.km - z.km),
    [location]
  );
  const nearby = centers.slice(0, 4);
  const topRated = [...centers].sort((a, z) => z.rating - a.rating).slice(0, 3);
  const nearbyCount = centers.filter((c) => c.km <= 10).length;

  // Primary vehicle = first in "My Vehicles". Its active booking drives the hero + current service.
  const vehicle = vehicles[0];
  const VehicleIcon = vehicle && /bike|scooter/i.test(vehicle.type) ? Bike : Car;
  const vehicleBookings = bookingsForVehicle(vehicle);
  const completedCount = vehicles.reduce(
    (n, v) => n + bookingsForVehicle(v).filter((x) => x.status === "completed").length,
    0
  );
  const b = vehicleBookings.find((x) => x.status !== "completed");
  const bCenter = b && serviceCenters.find((c) => c.name === b.centre);
  const historyHref = vehicle ? `/customer/vehicles/${vehicle.id}/history` : "/customer/vehicles";
  const findCenters = (service?: string) =>
    service ? `/customer/serviceCenters?service=${encodeURIComponent(service)}` : "/customer/serviceCenters";

  const offers = [
    {
      title: "20% OFF",
      subtitle: "Oil Change Service",
      description: "Keep your engine running smoothly.",
      code: "OIL20",
      service: "Oil Change",
    },
    {
      title: "15% OFF",
      subtitle: "AC Service",
      description: "Beat the heat with a complete AC check.",
      code: "AC15",
      service: "AC Repair",
    },
    {
      title: "₹499",
      subtitle: "Premium Car Wash",
      description: "Exterior wash with interior cleaning.",
      code: "WASH499",
      service: "Car Wash",
    },
  ];

  const quickServices = [
    {
      name: "Car Wash",
      icon: Droplets,
      description: "Clean & shine",
    },
    {
      name: "Oil Change",
      icon: Wrench,
      description: "Engine care",
    },
    {
      name: "AC Repair",
      icon: Wind,
      description: "Cooling service",
    },
    {
      name: "Brake Service",
      icon: Disc3,
      description: "Brake inspection",
    },
    {
      name: "Battery",
      icon: Battery,
      description: "Battery check",
    },
    {
      name: "Full Service",
      icon: Car,
      description: "Complete vehicle care",
    },
  ];

  return (
    <>
      <Topbar
        title="Customer Dashboard"
        subtitle="Your vehicle health, bookings and service journey"
      />

      <div className="container space-y-7">
        {/* HERO SECTION */}
        <section className="card mesh fade-up overflow-hidden p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <Badge tone="yellow">Welcome back, {firstName}</Badge>

              <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
                Everything your vehicle needs, in one place.
              </h2>

              <p className="mt-3 max-w-xl text-slate-600">
                Book trusted services, discover nearby garages, track your
                vehicle and get the best offers for your car.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={findCenters()} className="btn btn-primary">
                  <Wrench size={17} />
                  Book a Service
                </Link>

                <Link href="/customer/vehicles" className="btn btn-secondary">
                  <Car size={17} />
                  My Vehicles
                </Link>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Current vehicle</span>
                {vehicles.length > 1 && (
                  <Link href="/customer/vehicles" className="text-xs font-bold text-orange-300 hover:text-orange-200">
                    +{vehicles.length - 1} more
                  </Link>
                )}
              </div>

              {vehicle ? (
                <>
                  <Link href="/customer/vehicles" className="mt-5 flex items-center gap-4">
                    <div className="grid size-14 place-items-center rounded-2xl bg-white/10">
                      <VehicleIcon size={28} className="text-orange-400" />
                    </div>
                    <div>
                      <p className="text-xl font-black">{vehicleName(vehicle)}</p>
                      <p className="font-mono text-sm text-slate-400">{vehicle.registration}</p>
                    </div>
                  </Link>

                  <div className="mt-5 rounded-2xl bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Service status</span>
                      {b && <span className="pulse-dot size-3 rounded-full bg-orange-400" />}
                    </div>

                    {b ? (
                      <>
                        <p className="mt-2 font-black capitalize">{b.status.replaceAll("_", " ")}</p>
                        <div className="mt-4 progress-track bg-white/10">
                          <div className="progress-fill" style={{ width: `${b.progress}%` }} />
                        </div>
                        <div className="mt-2 flex justify-between text-xs text-slate-400">
                          <span>{b.progress}% complete</span>
                          <span>{b.centre}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="mt-2 font-black">No active service</p>
                        <p className="mt-1 text-xs text-slate-400">Last service: {vehicle.lastService}</p>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="mt-5 rounded-2xl bg-white/5 p-5 text-center">
                  <p className="font-black">No vehicle added yet</p>
                  <Link href="/customer/vehicles" className="btn btn-primary mt-4">
                    <Plus size={16} /> Add vehicle
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* KPI CARDS */}
        <div className="grid-auto">
          <KpiCard
            icon="car"
            label="Vehicles"
            value={vehicles.length}
          />

          <KpiCard
            icon="clock"
            label="Active booking"
            value={b ? "1" : "0"}
            change={b ? "On track" : undefined}
          />

          <KpiCard
            icon="map"
            label="Centres within 10 km"
            value={nearbyCount}
          />

          <KpiCard
            icon="check"
            label="Services completed"
            value={completedCount}
          />
        </div>

        {/* OFFERS */}
        <section className="card fade-up-2 p-6">
          <SectionHeading
            eyebrow="Limited time"
            title="Latest offers & discounts"
            description="Save more on your next vehicle service"
            action={
              <Link href={findCenters()} className="btn btn-secondary">
                View all <ArrowRight size={15} />
              </Link>
            }
          />

          <div className="grid gap-4 md:grid-cols-3">
            {offers.map((offer) => (
              <div
                key={offer.code}
                className="group relative overflow-hidden rounded-3xl bg-slate-950 p-5 text-white transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="absolute -right-8 -top-8 size-28 rounded-full bg-orange-500/20 blur-2xl" />

                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-orange-500/15 text-orange-400">
                      <Tag size={19} />
                    </span>

                    <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-black">
                      {offer.code}
                    </span>
                  </div>

                  <p className="mt-5 text-3xl font-black text-orange-400">
                    {offer.title}
                  </p>

                  <h3 className="mt-1 text-lg font-black">
                    {offer.subtitle}
                  </h3>

                  <p className="mt-2 text-sm text-slate-400">
                    {offer.description}
                  </p>

                  <Link
                    href={findCenters(offer.service)}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-white transition group-hover:text-orange-400"
                  >
                    Use offer
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* QUICK SERVICES */}
        <section className="card fade-up-2 p-6">
          <SectionHeading
            eyebrow="Quick access"
            title="What does your vehicle need?"
            description="Choose a service and get started quickly"
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {quickServices.map((service) => {
              const Icon = service.icon;

              return (
                <Link
                  key={service.name}
                  href={findCenters(service.name)}
                  className="group rounded-2xl border border-slate-100 p-4 text-center transition hover:-translate-y-1 hover:border-orange-100 hover:bg-orange-50/50 hover:shadow-md"
                >
                  <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-orange-50 text-orange-500 transition group-hover:bg-orange-500 group-hover:text-white">
                    <Icon size={22} />
                  </div>

                  <p className="mt-3 text-sm font-black">
                    {service.name}
                  </p>

                  <p className="muted mt-1 text-xs">
                    {service.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* TOP RATED WORKSHOPS */}
        <section className="card fade-up-3 p-6">
          <SectionHeading
            eyebrow="Recommended"
            title="Top-rated workshops"
            description="Trusted garages selected for quality and service"
            action={
              <Link href="/customer/serviceCenters" className="btn btn-secondary">
                Explore garages <ArrowRight size={15} />
              </Link>
            }
          />

          <div className="grid gap-4 lg:grid-cols-3">
            {topRated.map((c) => (
              <div
                key={c.id}
                className="rounded-3xl border border-slate-100 p-5 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-orange-50 text-orange-500">
                    <Wrench size={22} />
                  </div>

                  {c.category === "Authorized Brand Center" && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                      <BadgeCheck size={13} />
                      Authorized
                    </span>
                  )}
                </div>

                <h3 className="mt-4 font-black">{c.name}</h3>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  <span className="flex items-center gap-1 font-bold text-amber-500">
                    <Star size={15} fill="currentColor" />
                    {c.rating.toFixed(1)}
                  </span>
                  <span className="muted">({c.reviewCount} reviews)</span>
                  <span className="muted">· {formatKm(c.km)}</span>
                </div>

                <p className="mt-4 text-sm text-slate-500">{c.services.slice(0, 3).join(" · ")}</p>

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-sm font-black">{c.area}</span>

                  <Link href={`/customer/serviceCenters/${c.id}`} className="btn btn-primary">
                    View &amp; book
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CURRENT SERVICE + NEARBY */}
        <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <section className="card fade-up-2 p-6">
            {b ? (
              <>
                <SectionHeading
                  eyebrow="Current service"
                  title={b.id + " · " + b.vehicle}
                  description={b.service + " at " + b.centre}
                  action={
                    bCenter && (
                      <Link href={`/customer/serviceCenters/${bCenter.id}`} className="btn btn-secondary">
                        View centre <Navigation size={15} />
                      </Link>
                    )
                  }
                />

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-400">Progress</p>
                    <p className="mt-2 text-xl font-black">{b.progress}%</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-400">Booked on</p>
                    <p className="mt-2 text-xl font-black">{b.date}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-400">Estimate</p>
                    <p className="mt-2 text-xl font-black">{b.amount}</p>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3 text-sm text-slate-600">
                  <span className="grid size-9 place-items-center rounded-xl bg-orange-50 text-orange-500">
                    <Clock size={17} />
                  </span>
                  Inspection complete · Repair underway · Quality check next
                </div>
              </>
            ) : (
              <>
                <SectionHeading
                  eyebrow="Current service"
                  title="No active service"
                  description="Pick a service center near you to book your next service"
                  action={
                    <Link href="/customer/serviceCenters" className="btn btn-primary">
                      Find service center
                    </Link>
                  }
                />
              </>
            )}
          </section>

          <section className="card fade-up-3 p-6">
            <SectionHeading
              eyebrow="Nearby"
              title="Service centres"
              description="Fast options around your location"
            />

            {nearby.map((c) => (
              <Link
                key={c.id}
                href={`/customer/serviceCenters/${c.id}`}
                className="flex items-center justify-between gap-3 border-b border-slate-100 py-4 last:border-0 hover:opacity-80"
              >
                <div className="flex items-center gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-500">
                    <MapPin size={17} />
                  </div>

                  <div>
                    <p className="font-bold">{c.name}</p>
                    <p className="muted text-xs">
                      {c.area} · {formatKm(c.km)}
                    </p>
                  </div>
                </div>

                <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                  <Star size={13} fill="currentColor" />
                  {c.rating.toFixed(1)}
                </span>
              </Link>
            ))}

            <Link href="/customer/serviceCenters" className="btn btn-secondary mt-4 w-full">
              See all service centers <ArrowRight size={15} />
            </Link>
          </section>
        </div>

        {/* RECOMMENDED */}
        <section className="card overflow-hidden p-6">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <Badge tone="yellow">Recommended for you</Badge>

              <h2 className="mt-3 text-2xl font-black">
                {vehicle ? `Your ${vehicleName(vehicle)} may be due for an oil change.` : "Keep your vehicle healthy with regular service."}
              </h2>

              <p className="muted mt-2 max-w-2xl">
                Regular oil changes help maintain engine performance and
                improve long-term vehicle health. Book your next service
                with a trusted nearby garage.
              </p>

              <Link href={findCenters("Oil Change")} className="btn btn-primary mt-5">
                Book oil change
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="grid size-24 place-items-center rounded-3xl bg-orange-50 text-orange-500">
              <Wrench size={40} />
            </div>
          </div>
        </section>

        {/* RECENT ACTIVITY */}
        <section className="card p-6">
          <SectionHeading
            title="Recent activity"
            action={
              <Link href={historyHref} className="btn btn-secondary">
                Service history <ArrowRight size={15} />
              </Link>
            }
          />

          <div className="grid gap-3 md:grid-cols-2">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-2xl border border-slate-100 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      {booking.id} · {booking.service}
                    </p>

                    <p className="muted mt-1 text-sm">
                      {booking.vehicle} · {booking.date}
                    </p>
                  </div>

                  <Badge
                    tone={
                      booking.status === "completed"
                        ? "green"
                        : "yellow"
                    }
                  >
                    {booking.status.replaceAll("_", " ")}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* WHY AUTOSERVE */}
        <section className="card p-6 sm:p-8">
          <SectionHeading
            eyebrow="Why AutoServe"
            title="Vehicle care you can trust"
            description="Everything you need for a simple and transparent service experience"
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="grid size-11 place-items-center rounded-xl bg-orange-50 text-orange-500">
                <ShieldCheck size={21} />
              </div>

              <h3 className="mt-4 font-black">
                Verified garages
              </h3>

              <p className="muted mt-2 text-sm">
                Find trusted workshops with verified service quality.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="grid size-11 place-items-center rounded-xl bg-orange-50 text-orange-500">
                <Tag size={21} />
              </div>

              <h3 className="mt-4 font-black">
                Transparent pricing
              </h3>

              <p className="muted mt-2 text-sm">
                See service estimates before confirming your booking.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="grid size-11 place-items-center rounded-xl bg-orange-50 text-orange-500">
                <Truck size={21} />
              </div>

              <h3 className="mt-4 font-black">
                Pickup & delivery
              </h3>

              <p className="muted mt-2 text-sm">
                Make servicing easier with convenient vehicle pickup.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="grid size-11 place-items-center rounded-xl bg-orange-50 text-orange-500">
                <BadgeCheck size={21} />
              </div>

              <h3 className="mt-4 font-black">
                Service tracking
              </h3>

              <p className="muted mt-2 text-sm">
                Follow your vehicle's service journey from start to finish.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}