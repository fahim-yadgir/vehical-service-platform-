"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type SidebarState = {
  /** true only when rendered inside <SidebarProvider> */
  available: boolean;
  /** desktop (md and up): sidebar visible or fully hidden */
  desktopOpen: boolean;
  /** mobile: drawer open or closed */
  mobileOpen: boolean;
  toggleDesktop: () => void;
  toggleMobile: () => void;
  closeMobile: () => void;
};

const noop = () => {};

const SidebarContext = createContext<SidebarState>({
  available: false,
  desktopOpen: true,
  mobileOpen: false,
  toggleDesktop: noop,
  toggleMobile: noop,
  closeMobile: noop,
});

const STORAGE_KEY = "sidebar-desktop-open";

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Remember the desktop choice (read after mount to avoid hydration mismatch).
  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "false") setDesktopOpen(false);
    } catch {}
  }, []);

  const toggleDesktop = useCallback(() => {
    setDesktopOpen((open) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(!open));
      } catch {}
      return !open;
    });
  }, []);

  const toggleMobile = useCallback(() => setMobileOpen((open) => !open), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const value = useMemo(
    () => ({ available: true, desktopOpen, mobileOpen, toggleDesktop, toggleMobile, closeMobile }),
    [desktopOpen, mobileOpen, toggleDesktop, toggleMobile, closeMobile],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export const useSidebar = () => useContext(SidebarContext);