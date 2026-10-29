import Link from "next/link";
import { Clock, MapPin, Navigation, Phone, Truck } from "lucide-react";
import Badge from "../ui/Badge";
import { formatKm } from "../../lib/geo";
import type { ServiceCenter } from "../../lib/serviceCenters";

/** `distance` is only set once the customer has chosen a location. */
export type CenterWithDistance = ServiceCenter & { distance?: number };

export default function ServiceCenterCard({ center, selected = false }: { center: CenterWithDistance; selected?: boolean }) {
  return (
    <div className={`card p-5 ${selected ? "ring-2 ring-orange-400" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-black text-slate-900">{center.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <MapPin size={14} className="shrink-0" />
            <span className="truncate">{center.address}</span>
            {center.distance !== undefined && (
              <>
                <span aria-hidden>·</span>
                <span className="shrink-0 font-bold text-slate-700">{formatKm(center.distance)}</span>
              </>
            )}
          </p>
        </div>
        {center.rating > 0 ? (
          <span className="shrink-0 rounded-lg bg-emerald-600 px-2 py-1 text-sm font-black text-white">{center.rating.toFixed(1)} ★</span>
        ) : (
          <span className="shrink-0 rounded-lg bg-sky-50 px-2 py-1 text-xs font-black text-sky-700">New</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {center.pickupDrop && (
          <Badge tone="green">
            <Truck size={12} className="mr-1 self-center" />
            Pickup &amp; drop
          </Badge>
        )}
      </div>

      {center.services.length > 0 ? (
        <p className="mt-3 text-xs text-slate-500">
          <span className="font-bold text-slate-600">Services:</span> {center.services.slice(0, 4).join(", ")}
          {center.services.length > 4 ? ` +${center.services.length - 4} more` : ""}
        </p>
      ) : (
        <p className="mt-3 text-xs text-slate-400">Service rates not added yet. Call the centre.</p>
      )}
      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
        <Clock size={13} /> {center.hours}{center.reviewCount > 0 ? ` · ${center.reviewCount} reviews` : ""}
      </p>

      <Link href={`/customer/serviceCenters/${center.id}`} className="btn btn-primary mt-4 w-full text-sm">
        View centre, rates &amp; book
      </Link>

      <div className="mt-2 flex gap-2">
        <a href={`tel:${center.phone.replaceAll(" ", "")}`} className="btn btn-secondary flex-1 text-sm">
          <Phone size={15} /> Call
        </a>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${center.location.lat},${center.location.lng}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary flex-1 text-sm"
        >
          <Navigation size={15} /> Directions
        </a>
      </div>
    </div>
  );
}