"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, MapPin, X } from "lucide-react";
import { getPosition, processPhoto, type Fix } from "../../lib/device";
import { deletePhoto, savePhoto } from "../../lib/photoStore";
import {
  formatOrderTime,
  MAX_PROOF_PHOTOS,
  MIN_PROOF_PHOTOS,
  saveProof,
  type Order,
  type ProofKind,
  type ProofPhoto,
} from "../../lib/orders";

type Deps = { locate: () => Promise<Fix>; process: (file: File) => Promise<Blob> };
const realDeps: Deps = { locate: getPosition, process: processPhoto };

type Pending = { key: string; blob: Blob; url: string; fix: Fix };

const COPY: Record<ProofKind, { title: string; help: string }> = {
  pickup: {
    title: "Photograph the vehicle before you take it",
    help: "Take clear photos of the vehicle (all sides, any damage). The location and time are saved with every photo. The pickup OTP appears after you save them.",
  },
  delivery: {
    title: "Photograph the vehicle before you hand it over",
    help: "Take clear photos of the vehicle as you return it. The location and time are saved with every photo. The OTP box appears after you save them.",
  },
};

/** The staff member takes 1 to 6 photos. Each one is saved together with where and when it was taken. */
export default function ProofCapture({ order, kind, deps = realDeps }: { order: Order; kind: ProofKind; deps?: Deps }) {
  const input = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const photosRef = useRef<Pending[]>([]);
  photosRef.current = photos;

  // free the preview pictures when the card goes away
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const add = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      // the position is read right when the photo is added: no location, no photo
      const [fix, blob] = await Promise.all([deps.locate(), deps.process(file)]);
      setPhotos((list) => [
        ...list,
        { key: `${Date.now()}-${list.length}`, blob, url: URL.createObjectURL(blob), fix },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add this photo. Please try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = ""; // the same photo can be chosen again
    }
  };

  const remove = (key: string) => {
    const target = photos.find((p) => p.key === key);
    if (target) URL.revokeObjectURL(target.url);
    setPhotos((list) => list.filter((p) => p.key !== key));
  };

  const save = async () => {
    setError("");
    setSaving(true);
    const stored: string[] = [];
    try {
      const proofPhotos: ProofPhoto[] = [];
      for (const p of photos) {
        const photoId = await savePhoto(p.blob);
        stored.push(photoId);
        proofPhotos.push({ photoId, lat: p.fix.lat, lng: p.fix.lng, accuracy: p.fix.accuracy, takenAt: p.fix.at });
      }
      const result = saveProof(order.id, kind, proofPhotos);
      if (!result.ok) {
        await Promise.all(stored.map((id) => deletePhoto(id).catch(() => {})));
        setError(result.error);
      }
    } catch (e) {
      await Promise.all(stored.map((id) => deletePhoto(id).catch(() => {})));
      setError(e instanceof Error ? e.message : "Could not save the photos. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const full = photos.length >= MAX_PROOF_PHOTOS;

  return (
    <section className="card space-y-4 border-orange-200 p-6">
      <div>
        <h2 className="font-black text-slate-900">{COPY[kind].title}</h2>
        <p className="mt-1 text-sm text-slate-600">{COPY[kind].help}</p>
      </div>

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p, i) => (
            <li key={p.key} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`Photo ${i + 1}`} className="h-32 w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(p.key)}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-slate-900/80 text-white"
              >
                <X size={14} />
              </button>
              <p className="flex items-start gap-1 p-2 text-[11px] leading-snug text-slate-600">
                <MapPin size={12} className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  {p.fix.lat.toFixed(5)}, {p.fix.lng.toFixed(5)} (±{p.fix.accuracy} m)
                  <br />
                  {formatOrderTime(p.fix.at)}
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-label="Take a photo"
        onChange={(e) => add(e.target.files?.[0])}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => input.current?.click()} disabled={busy || saving || full} className="btn btn-secondary">
          <Camera size={16} /> {busy ? "Getting location…" : photos.length ? "Add another photo" : "Take photo"}
        </button>
        <button type="button" onClick={save} disabled={photos.length < MIN_PROOF_PHOTOS || busy || saving} className="btn btn-primary">
          {saving ? "Saving…" : photos.length === 0 ? "Save photos" : `Save ${photos.length} photo${photos.length === 1 ? "" : "s"}`}
        </button>
        <span className="muted text-xs">
          {photos.length}/{MAX_PROOF_PHOTOS} · cannot be changed after saving
        </span>
      </div>
      {error && (
        <p role="alert" className="text-xs font-semibold text-rose-600">
          {error}
        </p>
      )}
    </section>
  );
}