import Topbar from "../../../components/navbar/Topbar";
import RevenueChart from "../../../components/charts/RevenueChart";
import SectionHeading from "../../../components/ui/SectionHeading";

const rows = [
  ["Completed", "72%"],
  ["Repair in progress", "16%"],
  ["Waiting approval", "8%"],
  ["Cancelled", "4%"],
];

export default function OwnerReports() {
  return (
    <>
      <Topbar title="Reports" subtitle="Revenue, bookings and service performance analytics" />
      <div className="container grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <SectionHeading title="Revenue trend" description="Six-month performance" />
          <RevenueChart />
        </section>

        <section className="card p-6">
          <SectionHeading title="Booking mix" description="Current service pipeline" />
          <div className="space-y-6">
            {rows.map((x) => (
              <div key={x[0]}>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{x[0]}</span>
                  <b>{x[1]}</b>
                </div>
                <div className="mt-2 progress-track">
                  <div className="progress-fill" style={{ width: x[1] }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}