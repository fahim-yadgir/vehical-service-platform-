"use client";
import Link from "next/link";
import Topbar from "../../../components/navbar/Topbar";
import SectionHeading from "../../../components/ui/SectionHeading";
import Badge from "../../../components/ui/Badge";
import { bookings } from "../../../lib/mock-data";
import { ArrowRight, CalendarDays } from "lucide-react";
export default function BookingsPage() {
  return (
    <>
      <Topbar
        title="Bookings"
        subtitle="Track every service request from pickup to delivery"
      />
      <div className="container">
        <SectionHeading
          eyebrow="Service history"
          title="Your bookings"
          action={
            <Link href="/customer/bookings/new" className="btn btn-primary">
              New booking
            </Link>
          }
        />
        <div className="space-y-4">
          {bookings.map((b) => (
            <article
              key={b.id}
              className="card p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="grid size-12 place-items-center rounded-2xl bg-orange-50 text-orange-500">
                    <CalendarDays />
                  </div>
                  <div>
                    <p className="font-black">
                      {b.id} · {b.service}
                    </p>
                    <p className="muted mt-1 text-sm">
                      {b.vehicle} · {b.centre} · {b.date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={b.status === "completed" ? "green" : "yellow"}>
                    {b.status.replaceAll("_", " ")}
                  </Badge>
                  <b>{b.amount}</b>
                  <Link
                    href={
                      b.status === "completed"
                        ? "/customer/invoices"
                        : "/customer/tracking"
                    }
                    className="rounded-xl border p-2 text-slate-500 hover:bg-slate-50"
                  >
                    <ArrowRight size={17} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
