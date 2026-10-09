import Link from "next/link";
import AppShell from "../layout/AppShell";
import Topbar from "../navbar/Topbar";
import KpiCard from "../cards/KpiCard";
import Badge from "../ui/Badge";
import SectionHeading from "../ui/SectionHeading";
import { bookings, centres, vehicles } from "../../lib/mock-data";
import { Clock, MapPin, ArrowRight, Navigation } from "lucide-react";

export default function DashboardPage() {
  const b = bookings[0];

  return (
    <AppShell role="customer">
      <Topbar
        title="Customer Dashboard"
        subtitle="Your vehicle health, bookings and service journey"
      />

      <div className="container space-y-7">
        <section className="card mesh fade-up overflow-hidden p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <Badge tone="yellow">Live service</Badge>

              <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
                Your Honda City is getting the care it needs.
              </h2>

              <p className="mt-3 max-w-xl text-slate-600">
                Your current service is in progress. We will keep the pickup
                and delivery journey visible at every step.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/customer/tracking" className="btn btn-primary">
                  <Navigation size={17} />
                  Track service
                </Link>

                <Link
                  href="/customer/bookings/new"
                  className="btn btn-secondary"
                >
                  New booking
                </Link>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Live status</span>

                <span className="pulse-dot size-3 rounded-full bg-orange-400" />
              </div>

              <p className="mt-3 text-2xl font-black">
                Repair in progress
              </p>

              <div className="mt-5 progress-track bg-white/10">
                <div className="progress-fill w-[68%]" />
              </div>

              <div className="mt-2 flex justify-between text-xs text-slate-400">
                <span>68% complete</span>
                <span>ETA 18 min</span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid-auto">
          <KpiCard
            icon="car"
            label="Vehicles"
            value={vehicles.length}
          />

          <KpiCard
            icon="clock"
            label="Active booking"
            value="1"
            change="On track"
          />

          <KpiCard
            icon="map"
            label="Nearby centres"
            value={centres.length}
          />

          <KpiCard
            icon="wallet"
            label="Pending payment"
            value="₹4,800"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <section className="card fade-up-2 p-6">
            <SectionHeading
              eyebrow="Current service"
              title={b.id + " · " + b.vehicle}
              description={b.service + " at " + b.centre}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-400">
                  Progress
                </p>

                <p className="mt-2 text-xl font-black">
                  68%
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-400">
                  Driver ETA
                </p>

                <p className="mt-2 text-xl font-black">
                  18 min
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-400">
                  Estimate
                </p>

                <p className="mt-2 text-xl font-black">
                  {b.amount}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 text-sm text-slate-600">
              <span className="grid size-9 place-items-center rounded-xl bg-orange-50 text-orange-500">
                <Clock size={17} />
              </span>

              Inspection complete · Repair underway · Quality check next
            </div>
          </section>

          <section className="card fade-up-3 p-6">
            <SectionHeading
              eyebrow="Nearby"
              title="Service centres"
              description="Fast options around your location"
            />

            {centres.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between border-b border-slate-100 py-4 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-orange-50 text-orange-500">
                    <MapPin size={17} />
                  </div>

                  <div>
                    <p className="font-bold">{c.name}</p>

                    <p className="muted text-xs">
                      {c.address} · {c.distance}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-emerald-600">
                  {c.slots}
                </span>
              </div>
            ))}
          </section>
        </div>

        <section className="card p-6">
          <SectionHeading
            title="Recent activity"
            action={
              <Link
                href="/customer/bookings"
                className="btn btn-secondary"
              >
                View all <ArrowRight size={15} />
              </Link>
            }
          />

          <div className="grid gap-3 md:grid-cols-2">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-slate-100 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      {b.id} · {b.service}
                    </p>

                    <p className="muted mt-1 text-sm">
                      {b.vehicle} · {b.date}
                    </p>
                  </div>

                  <Badge
                    tone={
                      b.status === "completed"
                        ? "green"
                        : "yellow"
                    }
                  >
                    {b.status.replaceAll("_", " ")}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}