import Topbar from "../../../components/navbar/Topbar";
import KpiCard from "../../../components/cards/KpiCard";
import SectionHeading from "../../../components/ui/SectionHeading";
import RevenueChart from "../../../components/charts/RevenueChart";
import { bookings } from "../../../lib/mock-data";

export default function OwnerDashboard() {
  return (
    <>
      <Topbar
        title="Owner Dashboard"
        subtitle="Business performance across your service centre"
      />

      <div className="container space-y-7">
        <div className="grid-auto">
          <KpiCard
            icon="rupee"
            label="Revenue"
            value="₹8.42L"
            change="+18.4%"
          />

          <KpiCard
            icon="calendar"
            label="Bookings"
            value="386"
            change="+9.2%"
          />

          <KpiCard
            icon="star"
            label="Average rating"
            value="4.7 / 5"
          />

          <KpiCard
            icon="users"
            label="Staff performance"
            value="92%"
            change="+4.1%"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <section className="card p-6">
            <SectionHeading
              title="Revenue trend"
              description="Monthly revenue in lakhs"
            />

            <RevenueChart />
          </section>

          <section className="card p-6">
            <SectionHeading
              title="Recent bookings"
              action={
                <span className="text-xs font-bold text-emerald-600">
                  Live-ready
                </span>
              }
            />

            <div className="space-y-3">
              {bookings.concat(bookings).map((b, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"
                >
                  <div>
                    <p className="font-bold">{b.id}</p>

                    <p className="muted text-xs">
                      {b.vehicle} · {b.service}
                    </p>
                  </div>

                  <b>{b.amount}</b>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}