"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";
import { App } from "@capacitor/app";
import { roleRoutes } from "../../lib/auth";
import { createBackButtonHandler } from "@/lib/native/backButton";
import { runTopBackHandler } from "@/lib/native/backStack";

const ROOTS = new Set<string>(["/", "/login", ...Object.values(roleRoutes)]);

/** Renders nothing on the web. Inside the Capacitor app it wires up the back button and the system bars. */
export default function NativeShell() {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const [toast, setToast] = useState("");

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    document.documentElement.dataset.native = Capacitor.getPlatform();
    // our headers are white, so the status and navigation bar icons must be dark
    SystemBars.setStyle({ style: SystemBarsStyle.Light }).catch(() => {});

    let timer: ReturnType<typeof setTimeout>;
    const onBack = createBackButtonHandler({
      runTopBackHandler,
      getPathname: () => pathRef.current,
      isRoot: (p) => ROOTS.has(p),
      goBack: () => router.back(),
      exitApp: () => void App.exitApp(),
      notify: (message) => {
        setToast(message);
        clearTimeout(timer);
        timer = setTimeout(() => setToast(""), 2000);
      },
    });

    let cancelled = false;
    let remove: (() => Promise<void>) | undefined;
    App.addListener("backButton", onBack).then((handle) => {
      if (cancelled) void handle.remove();
      else remove = () => handle.remove();
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      void remove?.();
    };
  }, [router]);

  if (!toast) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 z-[200] flex justify-center px-4"
      style={{ bottom: "calc(var(--sab) + 24px)" }}
    >
      <p className="rounded-full bg-slate-900/90 px-4 py-2 text-sm font-semibold text-white shadow-lg">{toast}</p>
    </div>
  );
}