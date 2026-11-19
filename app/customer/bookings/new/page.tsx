"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import Topbar from "../../../../components/navbar/Topbar";
import Button from "../../../../components/ui/Button";

import LocationPicker, {
  type PickedLocation,
} from "../../../../components/map/LocationPicker";

import { useVehicles } from "../../../../lib/customerVehicles";
import { useLiveCenters } from "../../../../lib/liveCenters";

import {
  loadOwnerRates,
  rateAppliesTo,
  rateLabel,
  type OwnerRates,
} from "../../../../lib/ownerRates";

import {
  DEFAULT_LOCATION,
  loadLocation,
} from "../../../../lib/customerLocation";

import { loadProfile } from "../../../../lib/customerProfile";

import {
  createOrder,
  restoreOrders,
  useOrders,
  formatTimeSlot,
} from "../../../../lib/orders";

import { orderLimitBlock } from "../../../../lib/orderLimit";

const today = () => new Date().toISOString().slice(0, 10);

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

const pad2 = (n: number) => String(n).padStart(2, "0");

/** The pick (hour 3, minute 05, PM) as the 24-hour "15:05" that is saved with the order. */
const to24Hour = (hour: string, minute: string, period: "AM" | "PM") =>
  `${pad2((Number(hour) % 12) + (period === "PM" ? 12 : 0))}:${minute}`;

/** Today's date and the time right now, on this phone's clock. */
const localNow = () => {
  const n = new Date();
  return {
    date: `${n.getFullYear()}-${pad2(n.getMonth() + 1)}-${pad2(n.getDate())}`,
    time: `${pad2(n.getHours())}:${pad2(n.getMinutes())}`,
  };
};

function NewBooking() {
  const router = useRouter();

  const params = useSearchParams();

  const { centers } = useLiveCenters();
  const { vehicles } = useVehicles();

  const orders = useOrders();

  const [centerId, setCenterId] = useState(
    params.get("center") ?? "",
  );

  const [vehicleId, setVehicleId] = useState("");

  const [serviceKey, setServiceKey] = useState("");

  const [date, setDate] = useState(today());

  // pickup time: hour, then minute, then AM / PM
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [period, setPeriod] = useState<"AM" | "PM">("AM");

  const [notes, setNotes] = useState("");

  const [pickup, setPickup] =
    useState<PickedLocation | null>(null);

  const [rates, setRates] =
    useState<OwnerRates | null>(null);

  const [error, setError] = useState("");

  useEffect(() => {
    restoreOrders();

    setPickup(loadLocation() ?? DEFAULT_LOCATION);
  }, []);

  const center = centers.find(
    (item) => item.id === centerId,
  );

  const vehicle = vehicles.find(
    (item) => item.id === vehicleId,
  );

  const kind =
    vehicle && /bike|scooter|motorcycle/i.test(vehicle.type)
      ? "Bike"
      : "Car";

  const limitMessage = center
    ? orderLimitBlock(center.id, orders, "customer")
    : null;

  useEffect(() => {
    setRates(
      centerId ? loadOwnerRates(centerId) : null,
    );

    setServiceKey("");
  }, [centerId, vehicleId]);

  const services = useMemo(
    () =>
      (rates?.services ?? []).filter((rate) =>
        rateAppliesTo(rate, kind),
      ),
    [rates, kind],
  );

  const service = services.find(
    (item) => item.id === serviceKey,
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();

    if (!center) {
      return setError("Choose a service centre.");
    }

    if (limitMessage) {
      return setError(limitMessage);
    }

    if (!vehicle) {
      return setError("Choose your vehicle.");
    }

    if (!service) {
      return setError("Choose a service.");
    }

    if (!date) {
      return setError("Choose a date.");
    }

    if (!hour || !minute) {
      return setError("Choose the pickup time: hour and minute.");
    }

    const timeSlot = to24Hour(hour, minute, period);
    const now = localNow();

    if (date === now.date && timeSlot <= now.time) {
      return setError("Choose a pickup time later than the current time.");
    }

    if (
      !pickup ||
      pickup.address === "Finding address..."
    ) {
      return setError(
        "Set your pickup location on the map.",
      );
    }

    const profile = loadProfile();

    const id = createOrder({
      tenantId: center.id,

      customer: {
        name: profile.fullName,
        mobile: profile.mobile,
      },

      vehicle: {
        type: vehicle.type,
        brand: vehicle.brand,
        model: vehicle.model,
        registrationNo: vehicle.registration,
        year: vehicle.year,
      },

      service: service.name,

      date: new Date(date).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        },
      ),

      timeSlot,

      amount: service.price,

      notes: notes.trim() || undefined,

      pickup,

      source: "customer",
    });

    router.push(`/customer/bookings/${id}`);
  };

  return (
    <>
      <Topbar
        title="Book a service"
        subtitle="Choose a centre, your vehicle and where we should pick it up"
      />

      <div className="container max-w-3xl space-y-5 md:!pl-6">

        <Link
          href="/customer/bookings"
          className="btn btn-secondary"
        >
          ← My bookings
        </Link>

        <form
          onSubmit={submit}
          noValidate
          className="card space-y-6 p-6"
        >

          <div className="grid gap-4 sm:grid-cols-2">

            {/* SERVICE CENTRE */}

            <label className="block space-y-2 sm:col-span-2">
              <span className="text-sm font-bold text-slate-700">
                Service centre
              </span>

              <select
                className="input"
                value={centerId}
                onChange={(event) => {
                  setCenterId(event.target.value);
                  setError("");
                }}
              >
                <option value="">
                  Choose a centre…
                </option>

                {centers.map((center) => (
                  <option
                    key={center.id}
                    value={center.id}
                    disabled={!center.acceptingOrders}
                  >
                    {center.name} · {center.area}
                    {center.acceptingOrders
                      ? ""
                      : " (not taking orders right now)"}
                  </option>
                ))}
              </select>

              {centers.length === 0 && (
                <span className="block text-xs text-slate-500">
                  No service centres are available yet.
                </span>
              )}

              {limitMessage && (
                <span
                  role="alert"
                  className="block text-xs font-semibold text-amber-700"
                >
                  {limitMessage}
                </span>
              )}
            </label>

            {/* VEHICLE */}

            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">
                Your vehicle
              </span>

              <select
                className="input"
                value={vehicleId}
                onChange={(event) =>
                  setVehicleId(event.target.value)
                }
              >
                <option value="">
                  Choose a vehicle…
                </option>

                {vehicles.map((vehicle) => (
                  <option
                    key={vehicle.id}
                    value={vehicle.id}
                  >
                    {vehicle.brand} {vehicle.model} ·{" "}
                    {vehicle.registration}
                  </option>
                ))}
              </select>

              {vehicles.length === 0 && (
                <span className="block text-xs text-slate-500">
                  No vehicles yet.{" "}
                  <Link
                    href="/customer/vehicles"
                    className="font-bold text-orange-600 underline"
                  >
                    Add one
                  </Link>
                  .
                </span>
              )}
            </label>

            {/* SERVICE */}

            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">
                Service
              </span>

              <select
                className="input"
                value={serviceKey}
                onChange={(event) =>
                  setServiceKey(event.target.value)
                }
                disabled={!center || !vehicle}
              >
                <option value="">
                  {center && vehicle
                    ? "Choose a service…"
                    : "Choose centre and vehicle first"}
                </option>

                {services.map((service) => (
                  <option
                    key={service.id}
                    value={service.id}
                  >
                    {service.name} —{" "}
                    {rateLabel(service.price)}
                  </option>
                ))}
              </select>

              {center &&
                vehicle &&
                services.length === 0 && (
                  <span className="block text-xs text-amber-700">
                    This centre has no{" "}
                    {kind === "Car" ? "car" : "bike"}{" "}
                    service rates yet. Please call the centre.
                  </span>
                )}
            </label>

            {/* DATE */}

            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">
                Preferred date
              </span>

              <input
                type="date"
                min={today()}
                className="input"
                value={date}
                onChange={(event) =>
                  setDate(event.target.value)
                }
              />
            </label>

            {/* PICKUP TIME: hour, then minute */}

            <fieldset className="space-y-2">
              <legend className="text-sm font-bold text-slate-700">
                Preferred pickup time
              </legend>

              <div className="grid grid-cols-3 gap-2">
                <select
                  aria-label="Hour"
                  className="input"
                  value={hour}
                  onChange={(event) => {
                    setHour(event.target.value);
                    setError("");
                  }}
                >
                  <option value="">Hour</option>

                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Minute"
                  className="input"
                  value={minute}
                  onChange={(event) => {
                    setMinute(event.target.value);
                    setError("");
                  }}
                >
                  <option value="">Minute</option>

                  {MINUTES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="AM or PM"
                  className="input"
                  value={period}
                  onChange={(event) => {
                    setPeriod(event.target.value as "AM" | "PM");
                    setError("");
                  }}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>

              {hour && minute && (
                <span className="block text-xs text-slate-500">
                  Pickup at {formatTimeSlot(to24Hour(hour, minute, period))}
                </span>
              )}
            </fieldset>

            {/* NOTES */}

            <label className="block space-y-2 sm:col-span-2">
              <span className="text-sm font-bold text-slate-700">
                Notes (optional)
              </span>

              <input
  type="text"
  className="input"
  maxLength={250}
  value={notes}
  onChange={(event) => setNotes(event.target.value)}
  placeholder="e.g. Strange noise from the front"
/>
            </label>

          </div>

          {/* PICKUP LOCATION */}

          <section className="space-y-3">
            <div>
              <b>Pickup location</b>

              <p className="muted text-xs">
                Our staff will come here to collect your vehicle.
              </p>
            </div>

            <LocationPicker
              value={pickup}
              onChange={setPickup}
              height={280}
            />
          </section>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
            >
              {error}
            </p>
          )}

          <Button type="submit" disabled={!!limitMessage}>
            Confirm booking
          </Button>

        </form>
      </div>
    </>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense>
      <NewBooking />
    </Suspense>
  );
}