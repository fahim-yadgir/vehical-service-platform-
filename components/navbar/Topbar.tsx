"use client";
import { Menu, X } from "lucide-react";
import { useSidebar } from "../layout/SidebarContext";
import UserMenu from "./UserMenu";

export default function Topbar({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { available, desktopOpen, mobileOpen, toggleMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div className="container flex items-center justify-between gap-2 py-1">
        <div className="flex min-w-0 items-center gap-3">
          {available && (
            <>
              {/* Mobile: hamburger opens the drawer */}
              <button
                type="button"
                onClick={toggleMobile}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                className="grid size-10 shrink-0 place-items-center rounded-xl border bg-white text-slate-600 md:hidden"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </>
          )}

          <div className={`min-w-0 transition-[padding] duration-300 ease-in-out ${available && !desktopOpen ? "md:pl-10" : "md:pl-6"}`}>
            <h1 className="page-title">{title}</h1>
            {subtitle && <p className="muted mt-1 text-sm">{subtitle}</p>}
          </div>
        </div>

        <UserMenu />
      </div>
    </header>
  );
}