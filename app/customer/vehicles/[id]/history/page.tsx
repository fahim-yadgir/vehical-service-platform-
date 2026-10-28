"use client";
import { useParams } from "next/navigation";
import Topbar from "../../../../../components/navbar/Topbar";
import SectionHeading from "../../../../../components/ui/SectionHeading";
import { useVehicles, ordersForVehicle } from "../../../../../lib/customerVehicles";
import { useCustomerOrders } from "../../../../../lib/customerOrders";
import { useLiveCenters } from "../../../../../lib/liveCenters";
import { money, statusLabel } from "../../../../../lib/orders";
import { Wrench, Calendar, MapPin, ArrowLeft, CheckCircle2, Clock, Store } from "lucide-react";
import Link from "next/link";

export default function ServiceHistoryPage() {
  const params = useParams();
  const vehicleId = params.id;

  // 1. Find the vehicle using the ID from the URL
  const { vehicles, ready } = useVehicles();
  const vehicle = vehicles.find((v) => v.id === vehicleId);

  // 2. Filter bookings related to this vehicle
  const { orders } = useCustomerOrders();
  const { centers } = useLiveCenters();
  const vehicleBookings = ordersForVehicle(orders, vehicle);

  return (
    <>
      <Topbar
        title="Service History"
        subtitle={vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.registration})` : "Vehicle Records"}
      />
      <div className="container py-6">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/customer/vehicles"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-orange-600 transition"
          >
            <ArrowLeft size={16} /> Back to Vehicles
          </Link>
        </div>

        {vehicle ? (
          <>
            <SectionHeading
              eyebrow="Timeline"
              title="Past Services & Maintenance"
              description="Complete service logs, workshop details, and billing history."
            />

            {vehicleBookings.length > 0 ? (
              <div className="mt-6 space-y-4">
                {vehicleBookings.map((b) => (
                  <div
                    key={b.id}
                    className="card flex flex-col md:flex-row md:items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl shadow-sm gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="grid size-12 place-items-center rounded-xl bg-orange-50 text-orange-600 shrink-0">
                        <Wrench size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-slate-900">{b.service}</h4>
                          <span className="text-xs font-mono text-slate-400">({b.id})</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            <MapPin size={14} className="text-slate-400" />
                            {(() => {
                              const c = centers.find((x) => x.id === b.tenantId);
                              return c ? <Link href={`/customer/serviceCenters/${c.id}`} className="hover:text-orange-600 hover:underline">{c.name}</Link> : "Service centre";
                            })()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={14} className="text-slate-400" /> {b.date}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                      <div className="text-right">
                        <span className="block text-xs text-slate-400 font-medium">Amount</span>
                        <span className="text-base font-black text-slate-900">{money(b.amount)}</span>
                        <Link href={`/customer/bookings/${b.id}`} className="mt-1 block text-xs font-bold text-orange-600 hover:underline">View booking</Link>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold capitalize ${
                        b.status === "completed" 
                          ? "bg-emerald-50 text-emerald-700" 
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {b.status === "completed" ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                        {statusLabel(b.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-12 text-center rounded-2xl border border-dashed border-slate-300 p-12 bg-white">
                <Wrench size={40} className="mx-auto text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-700">No Service History Found</h3>
                <p className="text-sm text-slate-500 mt-1">This vehicle hasn't undergone any logged services yet.</p>
                <Link href="/customer/serviceCenters" className="btn btn-primary mt-5">
                  <Store size={16} /> Find a service center
                </Link>
              </div>
            )}
          </>
        ) : ready ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-700">Vehicle not found</h3>
            <p className="text-sm text-slate-500 mt-1">The vehicle ID in the URL does not exist.</p>
          </div>
        ) : null}
      </div>
    </>
  );
}