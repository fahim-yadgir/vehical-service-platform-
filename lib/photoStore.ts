"use client";

import { useEffect, useState } from "react";

// Pictures are too big for localStorage (about 5 MB for everything), so they are kept in IndexedDB.
// When the backend exists, savePhoto/getPhoto become an upload and a download; nothing else changes.
const DB_NAME = "vsp-photos";
const STORE = "photos";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("This browser cannot store photos."));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the photo storage."));
  }).catch((e) => {
    dbPromise = null; // try again next time
    throw e;
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const request = work(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not use the photo storage."));
  });
}

export async function savePhoto(blob: Blob): Promise<string> {
  const id = `PH${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  await run("readwrite", (store) => store.put(blob, id));
  return id;
}

export async function getPhoto(id: string): Promise<Blob | undefined> {
  return (await run("readonly", (store) => store.get(id))) as Blob | undefined;
}

export async function deletePhoto(id: string): Promise<void> {
  await run("readwrite", (store) => store.delete(id));
}

/** A URL for <img src>. `missing` is true when the photo is not on this device (it was taken on another one). */
export function usePhotoUrl(id: string) {
  const [state, setState] = useState<{ url: string | null; missing: boolean }>({ url: null, missing: false });
  useEffect(() => {
    let objectUrl: string | undefined;
    let cancelled = false;
    getPhoto(id)
      .then((blob) => {
        if (cancelled) return;
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setState({ url: objectUrl, missing: false });
        } else setState({ url: null, missing: true });
      })
      .catch(() => !cancelled && setState({ url: null, missing: true }));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  return state;
}