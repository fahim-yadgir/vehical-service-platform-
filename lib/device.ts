/** Where the device is, and when it said so (the device clock: the server will add its own time later). */
export type Fix = { lat: number; lng: number; accuracy: number; at: string };

/** A fix worse than this (in metres) is refused: the position would not prove anything. */
export const MAX_ACCURACY_M = 200;

/** One fresh GPS fix. Written so that a native plugin (@capacitor/geolocation) can replace the body later. */
export function getPosition(): Promise<Fix> {
  return new Promise<Fix>((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      return reject(new Error("This device cannot share its location."));
    }
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      return reject(new Error("Location works only on a secure (https) page."));
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const accuracy = Math.round(p.coords.accuracy);
        if (accuracy > MAX_ACCURACY_M) {
          return reject(new Error(`The GPS signal is weak (about ${accuracy} m off). Move to an open area and try again.`));
        }
        resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy, at: new Date().toISOString() });
      },
      (e) =>
        reject(
          new Error(
            e.code === 1
              ? "Location is blocked. Allow location for this app, then try again."
              : e.code === 3
                ? "Finding your location is taking too long. Try again."
                : "Could not find your location. Move to an open area and try again.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }, // maximumAge 0: never a remembered position
    );
  });
}

const MAX_SIDE = 1280;

/** Shrinks a camera photo (about 1280 px, JPEG) so a few of them fit in the browser storage and upload quickly. */
export async function processPhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Please take a photo.");
  try {
    const bitmap = await createImageBitmap(file); // also turns the picture upright when the phone was rotated
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no canvas");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.72));
    if (!blob) throw new Error("no blob");
    return blob;
  } catch {
    if (file.size <= 3_000_000) return file; // could not shrink it, but it is small enough to keep as it is
    throw new Error("This photo is too large and could not be reduced. Please try again.");
  }
}