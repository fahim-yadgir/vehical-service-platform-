"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Topbar from "../../../../components/navbar/Topbar";
import Button from "../../../../components/ui/Button";
import Input from "../../../../components/ui/Input";
import { vehicles, centres } from "../../../../lib/mock-data";
import { CalendarDays, CheckCircle2 } from "lucide-react";
export default function NewBooking() {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setDone(true);
    setTimeout(() => router.push("/customer/bookings"), 900);
  };
  return (
    <>
      <Topbar
        title="Create Booking"
        subtitle="Choose your vehicle, service and preferred centre"
      />
      <div className="container">
        <div className="mx-auto max-w-3xl">
          {done ? (
            <div className="card glow p-10 text-center fade-up">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={34} />
              </div>
              <h2 className="mt-5 text-2xl font-black">Booking created</h2>
              <p className="muted mt-2">
                Demo booking confirmed. Redirecting to bookings...
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="card p-6 sm:p-8">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-bold">Vehicle</span>
                  <select className="input">
                    {vehicles.map((v) => (
                      <option key={v.id}>
                        {v.brand} {v.model} · {v.registration}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-bold">Service</span>
                  <select className="input">
                    <option>Full Service</option>
                    <option>Oil Change</option>
                    <option>AC Service</option>
                    <option>Brake Inspection</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-bold">Preferred centre</span>
                  <select className="input">
                    {centres.map((c) => (
                      <option key={c.name}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <Input
                  label="Preferred date"
                  type="date"
                  defaultValue="2026-10-12"
                />
                <Input
                  label="Pickup address"
                  placeholder="Enter pickup location"
                />
                <label className="space-y-2">
                  <span className="text-sm font-bold">Notes</span>
                  <textarea
                    className="input min-h-28"
                    placeholder="Any issue or special request?"
                  />
                </label>
              </div>
              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <Button
                  type="button"
                  className="btn-secondary"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  <CalendarDays size={17} />
                  Confirm booking
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
