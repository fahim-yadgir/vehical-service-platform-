"use client";

import { useState } from "react";
import { ImageOff, MapPin } from "lucide-react";
import { usePhotoUrl } from "../../lib/photoStore";
import { formatOrderTime, type Order, type Proof, type ProofKind, type ProofPhoto } from "../../lib/orders";

const mapsUrl = (p: ProofPhoto) => `https://www.google.com/maps?q=${p.lat},${p.lng}`;

function Photo({ photo, label, onOpen }: { photo: ProofPhoto; label: string; onOpen: (url: string) => void }) {
  const { url, missing } = usePhotoUrl(photo.photoId);
  return (
    <li className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      {url ? (
        <button type="button" onClick={() => onOpen(url)} className="block w-full" aria-label={`Open ${label}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="h-32 w-full object-cover" />
        </button>
      ) : (
        <div className="grid h-32 place-items-center px-2 text-center text-[11px] text-slate-500">
          <span>
            <ImageOff size={18} className="mx-auto mb-1" aria-hidden />
            {missing ? "The picture is stored on the phone that took it." : "Loading…"}
          </span>
        </div>
      )}
      <div className="space-y-0.5 p-2 text-[11px] leading-snug text-slate-600">
        <p>{formatOrderTime(photo.takenAt)}</p>
        <a href={mapsUrl(photo)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-orange-700 hover:underline">
          <MapPin size={11} aria-hidden /> {photo.lat.toFixed(5)}, {photo.lng.toFixed(5)} (±{photo.accuracy} m)
        </a>
      </div>
    </li>
  );
}

function Block({ kind, proof, onOpen }: { kind: ProofKind; proof: Proof; onOpen: (url: string) => void }) {
  const title = kind === "pickup" ? "Photos at pickup" : "Photos at delivery";
  return (
    <section className="card space-y-3 p-6" aria-label={title}>
      <div>
        <b>{title}</b>
        <p className="muted text-xs">
          Recorded by {proof.by.name} ({proof.by.role}) · {formatOrderTime(proof.savedAt)}
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {proof.photos.map((photo, i) => (
          <Photo key={photo.photoId} photo={photo} label={`${title}, photo ${i + 1}`} onOpen={onOpen} />
        ))}
      </ul>
    </section>
  );
}

/** What staff recorded when they collected and returned the vehicle. Read-only, for the owner, manager, staff and customer. */
export default function ProofSection({ order }: { order: Order }) {
  const [big, setBig] = useState<string | null>(null);
  const { pickup, delivery } = order.proofs ?? {};
  if (!pickup && !delivery) return null;
  return (
    <>
      {pickup && <Block kind="pickup" proof={pickup} onOpen={setBig} />}
      {delivery && <Block kind="delivery" proof={delivery} onOpen={setBig} />}
      {big && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo"
          onClick={() => setBig(null)}
          className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={big} alt="Large view" className="max-h-full max-w-full rounded-xl object-contain" />
        </div>
      )}
    </>
  );
}