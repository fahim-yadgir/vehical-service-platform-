import AppShell from "../layout/AppShell";
import Topbar from "../navbar/Topbar";
import KpiCard from "../cards/KpiCard";
import RevenueChart from "../charts/RevenueChart";

export default function Dashboard() {
  return (
    <AppShell role="admin">
      <Topbar
        title="Platform Admin"
        subtitle="Global tenant, revenue and system health monitoring"
      />

      <div className="container space-y-7">
        <div className="grid-auto">
          <KpiCard
            icon="building"
            label="Active tenants"
            value="2,184"
            change="+6.4%"
          />

          <KpiCard
            icon="users"
            label="Total users"
            value="148,920"
          />

          <KpiCard
            icon="rupee"
            label="Monthly revenue"
            value="₹1.84Cr"
            change="+11.8%"
          />

          <KpiCard
            icon="activity"
            label="System uptime"
            value="99.99%"
          />
        </div>

        <section className="card p-6">
          <h2 className="text-xl font-black">
            Revenue overview
          </h2>

          <p className="muted mt-1 text-sm">
            Platform-level revenue trend
          </p>

          <RevenueChart />
        </section>
      </div>
    </AppShell>
  );
}