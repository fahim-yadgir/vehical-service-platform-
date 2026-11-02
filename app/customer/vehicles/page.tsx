"use client";

import { useState } from "react";
import Topbar from "../../../components/navbar/Topbar";
import Button from "../../../components/ui/Button";
import SectionHeading from "../../../components/ui/SectionHeading";
import { useVehicles } from "../../../lib/customerVehicles";
import { useCustomerOrders } from "../../../lib/customerOrders";
import { ordersForVehicle } from "../../../lib/customerVehicles";
import { Car, Bike, Truck, Plus, History, X, Store } from "lucide-react";
import Link from "next/link";
import { useBackHandler } from "@/lib/native/backStack";

export default function VehiclesPage() {
  const { vehicles: items, setVehicles } = useVehicles();
  const { orders } = useCustomerOrders();

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Back button handler for mobile native apps (closes modal on back press if open)
  useBackHandler(isModalOpen, () => setIsModalOpen(false));

  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    type: "",
    chassisNo: "",
    engineNo: "",
    year: "",
  });

  const getVehicleIcon = (type: string) => {
    const t = type?.toLowerCase() || "";

    if (
      t.includes("bike") ||
      t.includes("scooter") ||
      t.includes("motorcycle")
    ) {
      return <Bike size={27} />;
    }

    if (
      t.includes("truck") ||
      t.includes("lorry") ||
      t.includes("tempo") ||
      t.includes("pickup")
    ) {
      return <Truck size={27} />;
    }

    return <Car size={27} />;
  };

  // Get the latest completed service date for a vehicle
  const getLastServiceDate = (vehicle: (typeof items)[number]) => {
    const vehicleBookings = ordersForVehicle(orders, vehicle);

    const completedBookings = vehicleBookings.filter(
      (booking) => booking.status === "completed"
    );

    if (completedBookings.length === 0) {
      return vehicle.lastService || "No Service Yet";
    }

    const latestBooking = completedBookings.reduce((latest, current) => {
      const latestTime = new Date(latest.date).getTime();
      const currentTime = new Date(current.date).getTime();

      return currentTime > latestTime ? current : latest;
    });

    return latestBooking.date;
  };

  // Using React.SyntheticEvent instead of standard FormEvent
  const handleAddVehicle = (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!formData.brand || !formData.model || !formData.type.trim()) {
      alert("Please fill in Brand, Model, and Type.");
      return;
    }

    const newVehicle = {
      id: `V${Date.now()}`,
      brand: formData.brand,
      model: formData.model,
      type: formData.type.trim(),
      registration: `MH12DE${1000 + items.length}`,
      year: formData.year
        ? Number(formData.year)
        : new Date().getFullYear(),
      lastService: "No Service Yet",
      chassisNo: formData.chassisNo || "N/A",
      engineNo: formData.engineNo || "N/A",
    };

    setVehicles([...items, newVehicle]);
    setIsModalOpen(false);

    setFormData({
      brand: "",
      model: "",
      type: "",
      chassisNo: "",
      engineNo: "",
      year: "",
    });
  };

  return (
    <>
      <Topbar
        title="My Vehicles"
        subtitle="Keep your vehicle ready for the next service"
      />

      <div className="container md:!pl-6">
        <SectionHeading
          eyebrow="Vehicle"
          title="Your vehicles"
          description="Manage your registered vehicles, chassis/engine details and service history."
          action={
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus size={17} />
              Add vehicle
            </Button>
          }
        />

        {/* Vehicles Grid */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((v) => (
            <article
              key={v.id}
              className="card group overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:shadow-xl bg-white border border-slate-200 rounded-2xl"
            >
              <div className="flex items-start justify-between">
                <div className="grid size-14 place-items-center rounded-2xl bg-slate-950 text-orange-400">
                  {getVehicleIcon(v.type)}
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {v.type}
                </span>
              </div>

              <h3 className="mt-5 text-xl font-black">
                {v.brand} {v.model}
              </h3>

              <p className="mt-1 font-mono text-sm text-slate-500">
                {v.registration}
              </p>

              <div className="mt-5 space-y-2.5 text-xs border-t border-slate-100 pt-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Year</span>
                  <b className="text-slate-800">{v.year}</b>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Chassis No</span>
                  <b className="font-mono text-slate-800">
                    {v.chassisNo || "N/A"}
                  </b>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Engine No</span>
                  <b className="font-mono text-slate-800">
                    {v.engineNo || "N/A"}
                  </b>
                </div>

                <div className="flex justify-between pt-1 border-t border-slate-50">
                  <span className="text-slate-500">Last service</span>

                  <b className="text-slate-800">
                    {getLastServiceDate(v)}
                  </b>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={`/customer/vehicles/${v.id}/history`}
                  className="flex items-center gap-2 text-xs font-bold text-orange-600 hover:text-orange-700 transition"
                >
                  <History size={16} />
                  View Service History
                </Link>

                <Link
                  href="/customer/serviceCenters"
                  className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-orange-600 transition"
                >
                  <Store size={16} />
                  Find service center
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* Add Vehicle Modal / Form Popup */}
        {isModalOpen && (
          <div className="overlay-safe fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">
                  Add New Vehicle
                </h3>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddVehicle} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Brand <span className="text-red-500">*</span>
                    </label>

                    <input
                      maxLength={30}
                      type="text"
                      required
                      placeholder="e.g. Honda, Tata"
                      value={formData.brand}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          brand: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Model <span className="text-red-500">*</span>
                    </label>

                    <input
                      maxLength={30}
                      type="text"
                      required
                      placeholder="e.g. City, Nexon"
                      value={formData.model}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          model: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vehicle Type <span className="text-red-500">*</span>
                  </label>

                  <input
                    maxLength={30}
                    type="text"
                    required
                    placeholder="Type your vehicle type (e.g. Car, Bike, Rickshaw, Truck)"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Chassis No (Optional)
                    </label>

                    <input
                      maxLength={30}
                      type="text"
                      placeholder="Enter last 5 digit of chassis no"
                      value={formData.chassisNo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          chassisNo: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-mono focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Engine No (Optional)
                    </label>

                    <input
                      maxLength={30}
                      type="text"
                      placeholder="Enter last 5 digit of engine no"
                      value={formData.engineNo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          engineNo: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-mono focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Manufacturing Year (Optional)
                  </label>

                  <input
                    maxLength={30}
                    type="number"
                    placeholder="e.g. 2023"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        year: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>

                  <Button type="submit">Save Vehicle</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}