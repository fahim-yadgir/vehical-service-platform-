import AppShell from "../layout/AppShell";
import Topbar from "../navbar/Topbar";
import KpiCard from "../cards/KpiCard";
import Badge from "../ui/Badge";
import SectionHeading from "../ui/SectionHeading";
import { bookings } from "../../lib/mock-data";

export default function DashboardPage() {
  const cols = ["Pending", "Inspection", "Repair", "Completed"];

  return (
    <AppShell role="manager">
      <Topbar
        title="Service Centre Dashboard"
        subtitle="Today’s workshop operations at a glance"
      />

      <div className="container space-y-7">
        <div className="grid-auto">
          <KpiCard
            icon="calendar"
            label="Today's bookings"
            value="24"
            change="+12%"
          />

          <KpiCard
            icon="clock"
            label="In progress"
            value="8"
          />

          <KpiCard
            icon="users"
            label="Waiting approval"
            value="4"
          />

          <KpiCard
            icon="check"
            label="Completed"
            value="12"
            change="+8%"
          />
        </div>

        <section className="card p-6">
          <SectionHeading
            eyebrow="Operations"
            title="Booking board"
            description="Move jobs through the workshop lifecycle."
          />

          <div className="grid gap-4 xl:grid-cols-4">
            {cols.map((s, i) => (
              <div
                key={s}
                className="rounded-2xl bg-slate-50 p-3"
              >
                <div className="mb-3 flex items-center justify-between">
                  <b>{s}</b>

                  <Badge
                    tone={
                      i === 2
                        ? "yellow"
                        : i === 3
                        ? "green"
                        : "gray"
                    }
                  >
                    {i + 2}
                  </Badge>
                </div>

                {bookings
                  .concat(bookings)
                  .slice(i, i + 2)
                  .map((b, j) => (
                    <div
                      key={j}
                      className="mb-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-1"
                    >
                      <div className="flex justify-between">
                        <b>{b.id}</b>

                        <span className="text-xs text-slate-400">
                          {b.amount}
                        </span>
                      </div>

                      <p className="mt-2 font-semibold">
                        {b.vehicle}
                      </p>

                      <p className="muted text-xs">
                        {b.service}
                      </p>

                      <div className="mt-3 progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.max(
                              22,
                              b.progress
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}