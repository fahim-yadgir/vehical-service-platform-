import Topbar from "../../../components/navbar/Topbar";
import DataTable from "../../../components/tables/DataTable";
import Badge from "../../../components/ui/Badge";
import { bookings } from "../../../lib/mock-data";
export default function Invoices() {
  return (
    <>
      <Topbar
        title="Invoices & Payments"
        subtitle="Review service estimates and payment status"
      />
      <div className="container space-y-6">
        <div className="grid-auto">
          <div className="card p-5">
            <p className="muted text-sm">Outstanding</p>
            <p className="mt-2 text-3xl font-black">₹4,800</p>
            <p className="mt-2 text-xs font-bold text-amber-600">
              Payment pending
            </p>
          </div>
          <div className="card p-5">
            <p className="muted text-sm">Paid this year</p>
            <p className="mt-2 text-3xl font-black">₹18,420</p>
            <p className="mt-2 text-xs font-bold text-emerald-600">
              Up to date
            </p>
          </div>
        </div>
        <DataTable
          headers={["Invoice", "Vehicle", "Service", "Amount", "Status"]}
          rows={bookings.map((b) => [
            <b key="id">INV-{b.id.slice(2)}</b>,
            b.vehicle,
            b.service,
            b.amount,
            <Badge key="s" tone={b.status === "completed" ? "green" : "yellow"}>
              {b.status === "completed" ? "Paid" : "Pending"}
            </Badge>,
          ])}
        />
      </div>
    </>
  );
}
