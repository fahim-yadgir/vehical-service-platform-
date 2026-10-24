"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import {
  ArrowLeft, BadgeCheck, Check, Clock, MapPin, Navigation, Phone, ShieldCheck, ThumbsUp, Truck, Users, X,
} from "lucide-react";
import Topbar from "../../../../components/navbar/Topbar";
import Badge from "../../../../components/ui/Badge";
import { serviceCenters } from "../../../../lib/serviceCenters";
import { getCenterProfile, isOpenAt, type VehicleKind } from "../../../../lib/serviceCenterProfiles";
import { distanceKm, formatKm } from "../../../../lib/geo";
import CenterCharges from "../../../../components/customer/CenterCharges";
import { loadOwnerRates, rateAppliesTo, rateLabel, tenantIdForCenter, type OwnerRates } from "../../../../lib/ownerRates";
import { DEFAULT_LOCATION, loadLocation, type SavedLocation } from "../../../../lib/customerLocation";

const ServiceCentersMap = dynamic(() => import("../../../../components/map/ServiceCentersMap"), {
  ssr: false,
  loading: () => <div className="grid h-[280px] place-items-center rounded-2xl bg-slate-100 text-sm text-slate-400">Loading map...</div>,
});

const inr = (value: number) => `₹${value.toLocaleString("en-IN")}`;

const sections = [
  { id: "overview", label: "Overview" },
  { id: "plans", label: "Plans" },
  { id: "charges", label: "Charges" },
  { id: "team", label: "Team & facilities" },
  { id: "reviews", label: "Reviews" },
];

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24" aria-hidden className={n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}>
          <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" fill="currentColor" />
        </svg>
      ))}
    </span>
  );
}

function Section({ id, title, subtitle, children }: { id: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-24 p-5 sm:p-7">
      <h2 className="text-xl font-black text-slate-900">{title}</h2>
      {subtitle && <p className="muted mt-1 text-sm">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function ServiceCenterProfile() {
  const { id } = useParams<{ id: string }>();
  const center = serviceCenters.find((c) => c.id === id);

  const [location, setLocation] = useState<SavedLocation>(DEFAULT_LOCATION);
  const [now, setNow] = useState<Date | null>(null);
  const [kind, setKind] = useState<VehicleKind>("Car");
  const [starFilter, setStarFilter] = useState(0);
  const [sort, setSort] = useState<"helpful" | "recent" | "high" | "low">("helpful");
  const [voted, setVoted] = useState<string[]>([]);
  // Rates the centre's owner fixed in My Rates. Falls back to the standard prices below when none are saved.
  const [ownerRates, setOwnerRates] = useState<OwnerRates | null>(null);

  useEffect(() => {
    const saved = loadLocation();
    if (saved) setLocation(saved);
    setNow(new Date());
  }, []);

  const profile = useMemo(() => (center ? getCenterProfile(center) : null), [center]);

  useEffect(() => {
    setOwnerRates(center ? loadOwnerRates(tenantIdForCenter(center.id)) : null);
  }, [center]);

  const reviews = useMemo(() => {
    if (!profile) return [];
    const list = profile.reviews.filter((r) => !starFilter || r.rating === starFilter);
    const time = (date: string) => new Date(date).getTime();
    return [...list].sort((a, b) =>
      sort === "helpful" ? b.helpful - a.helpful
      : sort === "recent" ? time(b.date) - time(a.date)
      : sort === "high" ? b.rating - a.rating
      : a.rating - b.rating,
    );
  }, [profile, starFilter, sort]);

  if (!center || !profile) {
    return (
      <>
        <Topbar title="Service Center" />
        <div className="container">
          <div className="card p-10 text-center">
            <p className="font-black">Service center not found</p>
            <Link href="/customer/serviceCenters" className="btn btn-secondary mt-4">Back to service centers</Link>
          </div>
        </div>
      </>
    );
  }

  const ownerServices = ownerRates?.services.length ? ownerRates.services : null;
  const ownerFacilities = ownerRates?.facilities.length ? ownerRates.facilities : null;
  // The owner's rates show for the vehicle type the customer picked (Car / Bike). Rates for "Both" show under each.
  const serviceRows = ownerServices
    ? ownerServices.filter((s) => rateAppliesTo(s, kind)).map((s) => ({ name: s.name, note: s.note, price: rateLabel(s.price) }))
    : profile.serviceCharges.map((s) => ({ name: s.name, note: undefined as string | undefined, price: `from ${inr(s.from)}` }));
  const facilityRows = ownerFacilities
    ? ownerFacilities.filter((f) => rateAppliesTo(f, kind)).map((f) => ({ name: f.name, note: f.note, price: rateLabel(f.price) }))
    : profile.facilityCharges;

  const distance = distanceKm(location, center.location);
  const today = now ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()] : null;
  const todayHours = profile.hours.find((h) => h.day === today);
  const open = now && todayHours ? isOpenAt(todayHours.time, now) : null;
  const tel = `tel:${center.phone.replaceAll(" ", "")}`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${center.location.lat},${center.location.lng}`;
  const reviewTotal = center.reviewCount;

  const scrollTo = (sectionId: string) => document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const gallery = [
    { label: "Service bays", emoji: "🔧", bg: "from-slate-800 to-slate-600" },
    { label: "Reception", emoji: "🏢", bg: "from-orange-500 to-amber-400" },
    { label: "Waiting lounge", emoji: "🛋️", bg: "from-sky-600 to-cyan-400" },
    { label: "Wash bay", emoji: "🚿", bg: "from-emerald-600 to-lime-400" },
  ];

  return (
    <>
      <Topbar title={center.name} subtitle={`${center.area}, Pune`} />

      <div className="container space-y-6">
        <Link href="/customer/serviceCenters" className="btn btn-secondary text-sm">
          <ArrowLeft size={16} /> All service centers
        </Link>

        {/* Summary */}
        <section id="overview" className="card scroll-mt-24 overflow-hidden">
          <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-4">
            {gallery.map((g) => (
              <div key={g.label} className={`grid h-28 place-items-center rounded-2xl bg-gradient-to-br ${g.bg} text-center text-white sm:h-36`}>
                <div>
                  <div className="text-3xl">{g.emoji}</div>
                  <p className="mt-1 text-xs font-bold">{g.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4 p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="flex flex-wrap items-center gap-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {center.name}
                  <BadgeCheck size={22} className="text-sky-500" aria-label="Verified center" />
                </h1>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1.5"><MapPin size={15} />{center.address}</span>
                  <span className="font-bold text-slate-700">{formatKm(distance)} away</span>
                </p>
              </div>
              <div className="text-right">
                <p className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xl font-black text-white">{center.rating.toFixed(1)} ★</p>
                <p className="mt-1 text-xs text-slate-500">{reviewTotal} reviews</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge tone={center.category === "Authorized Brand Center" ? "blue" : "gray"}>{center.category}</Badge>
              {center.pickupDrop && <Badge tone="green"><Truck size={12} className="mr-1 self-center" />Pickup &amp; drop</Badge>}
              {open !== null && <Badge tone={open ? "green" : "red"}>{open ? "Open now" : "Closed now"}</Badge>}
              {center.offer && <Badge tone="yellow">🏷️ {center.offer}</Badge>}
            </div>

            <p className="max-w-3xl text-sm leading-6 text-slate-600">{profile.about}</p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "In business since", value: String(profile.since) },
                { label: "Vehicles serviced", value: `${(profile.vehiclesServiced / 1000).toFixed(0)}k+` },
                { label: "Service bays", value: String(profile.bays) },
                { label: "Team size", value: String(profile.staff.total) },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xl font-black text-slate-900">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <a href={tel} className="btn btn-primary"><Phone size={16} /> Call {center.phone}</a>
              <a href={directions} target="_blank" rel="noreferrer" className="btn btn-secondary"><Navigation size={16} /> Get directions</a>
            </div>
          </div>
        </section>

        {/* Section nav */}
        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Page sections">
          {sections.map((s) => (
            <button key={s.id} type="button" onClick={() => scrollTo(s.id)} className="whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-orange-300 hover:text-orange-700">
              {s.label}
            </button>
          ))}
        </nav>

        {/* Location + timings */}
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Section id="location" title="Location">
            <ServiceCentersMap centers={[center]} user={location} selectedId={center.id} onSelect={() => {}} height={280} />
            <p className="mt-3 flex items-start gap-2 text-sm text-slate-600"><MapPin size={16} className="mt-0.5 shrink-0 text-orange-500" />{center.address}</p>
          </Section>
          <Section id="hours" title="Timings">
            <ul className="divide-y divide-slate-100 text-sm">
              {profile.hours.map((h) => (
                <li key={h.day} className={`flex justify-between py-2.5 ${h.day === today ? "font-black text-slate-900" : "text-slate-600"}`}>
                  <span className="inline-flex items-center gap-2">{h.day === today && <Clock size={14} className="text-orange-500" />}{h.day}</span>
                  <span className={h.time === "Closed" ? "text-rose-600" : ""}>{h.time}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        {/* Plans */}
        <Section id="plans" title="Service plans" subtitle="Ready-made packages. Final price is confirmed after inspection.">
          <div className="mb-5 inline-flex rounded-xl border bg-white p-1" role="group" aria-label="Vehicle type">
            {(["Car", "Bike"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`rounded-lg px-4 py-2 text-sm font-bold ${kind === k ? "bg-slate-950 text-white" : "text-slate-600"}`}>
                {k === "Car" ? "🚗 Car" : "🏍️ Bike"}
              </button>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {profile.plans[kind].map((plan) => (
              <div key={plan.id} className={`relative flex flex-col rounded-2xl border p-5 ${plan.popular ? "border-orange-300 bg-orange-50/50 shadow-lg shadow-orange-100" : "border-slate-200 bg-white"}`}>
                {plan.popular && <span className="absolute -top-3 left-5 rounded-full bg-orange-500 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white">Most booked</span>}
                <p className="text-lg font-black">{plan.name}</p>
                <p className="text-xs text-slate-500">{plan.tagline}</p>
                <p className="mt-3 text-3xl font-black text-slate-900">{inr(plan.price)}</p>
                <p className="mt-1 text-xs text-slate-500">{plan.duration} · Warranty: {plan.warranty}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-700">
                  {plan.includes.map((item) => (
                    <li key={item} className="flex items-start gap-2"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />{item}</li>
                  ))}
                </ul>
                <a href={tel} className={`btn mt-5 w-full text-sm ${plan.popular ? "btn-primary" : "btn-secondary"}`}>Call to book</a>
              </div>
            ))}
          </div>
        </Section>

        {/* Charges */}
        <Section id="charges" title="Charges" subtitle={ownerServices || ownerFacilities ? "Rates fixed by this service centre." : "Starting prices for individual services and facilities."}>
          <CenterCharges
            services={serviceRows}
            facilities={facilityRows}
            kind={kind}
            onKindChange={setKind}
            servicesEmpty={ownerServices ? `No ${kind === "Car" ? "car" : "bike"} service rates added yet. Please call the centre.` : undefined}
            facilitiesEmpty={ownerFacilities ? `No ${kind === "Car" ? "car" : "bike"} facility rates added yet.` : undefined}
          />
        </Section>

        {/* Team + facilities */}
        <Section id="team" title="Team & facilities">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 flex items-center gap-2 font-black"><Users size={17} className="text-orange-500" /> Manpower ({profile.staff.total} people)</h3>
              <ul className="space-y-3 text-sm">
                {[
                  ["Service advisors", profile.staff.advisors],
                  ["Mechanics", profile.staff.mechanics],
                  ["Technicians", profile.staff.technicians],
                  ["Pickup & drop drivers", profile.staff.drivers],
                ].map(([label, count]) => (
                  <li key={label as string}>
                    <div className="flex justify-between"><span>{label}</span><span className="font-bold">{count}</span></div>
                    <div className="progress-track mt-1.5"><div className="progress-fill" style={{ width: `${((count as number) / profile.staff.total) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.staff.certifications.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700"><ShieldCheck size={14} />{c}</span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-3 font-black">Facilities</h3>
              <ul className="grid grid-cols-2 gap-3 text-sm">
                {profile.facilities.map((f) => (
                  <li key={f.name} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${f.available ? "border-slate-200 text-slate-800" : "border-slate-100 text-slate-400 line-through"}`}>
                    <span aria-hidden>{f.icon}</span>{f.name}
                    {f.available ? <Check size={15} className="ml-auto text-emerald-600" /> : <X size={15} className="ml-auto" />}
                  </li>
                ))}
              </ul>
              <h3 className="mb-2 mt-6 font-black">Brands serviced</h3>
              <div className="flex flex-wrap gap-2">
                {center.brands.map((b) => <Badge key={b} tone="gray">{b}</Badge>)}
              </div>
            </div>
          </div>
        </Section>

        {/* Reviews */}
        <Section id="reviews" title="Customer reviews">
          <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
            <div>
              <p className="text-5xl font-black text-slate-900">{center.rating.toFixed(1)}</p>
              <div className="mt-1"><Stars value={center.rating} size={20} /></div>
              <p className="mt-1 text-sm text-slate-500">{reviewTotal} ratings</p>

              <ul className="mt-5 space-y-2">
                {profile.breakdown.map((pct, index) => {
                  const stars = 5 - index;
                  return (
                    <li key={stars}>
                      <button type="button" onClick={() => setStarFilter(starFilter === stars ? 0 : stars)} aria-pressed={starFilter === stars} className="flex w-full items-center gap-3 text-sm hover:text-orange-700">
                        <span className={`w-12 text-left font-bold ${starFilter === stars ? "text-orange-600" : "text-slate-600"}`}>{stars} star</span>
                        <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} /></span>
                        <span className="w-9 text-right text-slate-500">{pct}%</span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <h3 className="mb-3 mt-7 font-black">Rating by aspect</h3>
              <ul className="space-y-3 text-sm">
                {profile.aspects.map((a) => (
                  <li key={a.label}>
                    <div className="flex justify-between"><span>{a.label}</span><span className="font-bold">{a.value.toFixed(1)}</span></div>
                    <div className="progress-track mt-1"><div className="progress-fill" style={{ width: `${(a.value / 5) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-600">
                  Showing {reviews.length} of {reviewTotal} reviews{starFilter ? ` · ${starFilter} star` : ""}
                  {starFilter ? <button type="button" onClick={() => setStarFilter(0)} className="ml-2 text-orange-600">Clear</button> : null}
                </p>
                <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort reviews" className="input" style={{ width: "auto" }}>
                  <option value="helpful">Most helpful</option>
                  <option value="recent">Most recent</option>
                  <option value="high">Highest rating</option>
                  <option value="low">Lowest rating</option>
                </select>
              </div>

              {reviews.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">No reviews with this rating yet.</p>
              ) : (
                <ul className="space-y-5">
                  {reviews.map((review) => {
                    const didVote = voted.includes(review.id);
                    return (
                      <li key={review.id} className="rounded-2xl border border-slate-100 p-5">
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 place-items-center rounded-full bg-slate-900 text-sm font-black text-white">{review.name[0]}</span>
                          <div>
                            <p className="text-sm font-bold">{review.name}</p>
                            <p className="text-xs text-slate-400">{review.date}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Stars value={review.rating} />
                          <p className="font-black text-slate-900">{review.title}</p>
                        </div>
                        <p className="mt-1.5 text-xs text-slate-500">
                          {review.verified && <span className="mr-2 inline-flex items-center gap-1 font-bold text-emerald-700"><BadgeCheck size={13} />Verified booking</span>}
                          {review.service} · {review.vehicle}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-slate-700">{review.text}</p>
                        {review.reply && (
                          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
                            <p className="text-xs font-black text-slate-500">Response from {center.name}</p>
                            <p className="mt-1 text-slate-600">{review.reply}</p>
                          </div>
                        )}
                        <button
                          type="button"
                          aria-pressed={didVote}
                          onClick={() => setVoted(didVote ? voted.filter((v) => v !== review.id) : [...voted, review.id])}
                          className={`mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${didVote ? "border-orange-300 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-600 hover:border-orange-200"}`}
                        >
                          <ThumbsUp size={14} /> Helpful ({review.helpful + (didVote ? 1 : 0)})
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}