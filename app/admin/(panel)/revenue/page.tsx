import Topbar from "../../../../components/navbar/Topbar";
import RevenueChart from "../../../../components/charts/RevenueChart";
import KpiCard from "../../../../components/cards/KpiCard";

export default function Revenue() {
  return (
    <>
      <Topbar
        title="Revenue Analytics"
        subtitle="Platform monetization and billing overview"
      />

      <div className="container space-y-6">
        <div className="grid-auto">
          <KpiCard
            icon="rupee"
            label="Gross revenue"
            value="₹21.4Cr"
            change="+14.2%"
          />

          <KpiCard
            icon="activity"
            label="Net growth"
            value="12.8%"
          />

          <KpiCard
            icon="receipt"
            label="Invoices"
            value="48,204"
          />
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-black">Revenue trend</h2>

          <p className="muted mt-1 text-sm">
            Platform revenue performance over time
          </p>

          <RevenueChart />
        </div>
      </div>
    </>
  );
}