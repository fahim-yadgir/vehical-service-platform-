"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  House,
  Store,
  User,
  Car,
  LayoutDashboard,
  CalendarDays,
  FileText,
  Users,
  BarChart3,
  CreditCard,
  Building2,
  LogOut,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Settings,
  IndianRupee,
  type LucideIcon,
} from "lucide-react";
import { clearSession, roleLabels, type Role } from "../../lib/auth";
import { useSidebar } from "../layout/SidebarContext";

const menus: Record<Role, Array<[string, string, LucideIcon]>> = {
  customer: [
    ["Dashboard", "/customer/dashboard", LayoutDashboard],
    ["Service Centers", "/customer/serviceCenters", Store],
    ["Vehicles", "/customer/vehicles", Car],
    ["Profile", "/customer/profile", User],
  ],
  manager: [
    ["Dashboard", "/manager/dashboard", LayoutDashboard],
    ["Bookings", "/manager/bookings", CalendarDays],
    ["Job Cards", "/manager/job-cards", FileText],
    ["Invoices", "/manager/invoices", CreditCard],
    ["Team", "/manager/team", Users],
  ],
  owner: [
    ["Dashboard", "/owner/dashboard", LayoutDashboard],
    ["Reports", "/owner/reports", BarChart3],
    ["My Staff", "/owner/mystaff", Users],
    ["My Rates", "/owner/myrates", IndianRupee],
    ["Subscription", "/owner/subscription", CreditCard],
    ["Profile", "/owner/profile", User],
  ],
  admin: [
    ["Dashboard", "/admin/dashboard", LayoutDashboard],
    ["Tenants", "/admin/tenants", Building2],
    ["Users", "/admin/users", Users],
    ["Revenue", "/admin/revenue", BarChart3],
    ["Profile", "/admin/profile", User],
  ],
};

export default function Sidebar({ role }: { role: Role }) {
  const { desktopOpen, mobileOpen, closeMobile, toggleDesktop } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();

  const logout = () => {
    clearSession();
    router.push(role === "admin" ? "/admin/login" : "/login");
  };

  return (
    <>
      {/* Mobile: tap outside to close the drawer */}
      {mobileOpen && (
        <div
          onClick={closeMobile}
          className="fixed inset-0 z-30 bg-slate-950/30 md:hidden"
          aria-hidden
        />
      )}

      {/* Desktop: arrow on the sidebar edge. It stays on screen when the sidebar is closed. */}
      <button
        type="button"
        onClick={toggleDesktop}
        aria-label={desktopOpen ? "Close sidebar" : "Open sidebar"}
        aria-expanded={desktopOpen}
        className={`fixed top-5 z-50 hidden size-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-[left] duration-200 ease-out hover:bg-orange-50 hover:text-orange-600 md:grid ${
          desktopOpen ? "left-[272px]" : "left-3"
        }`}
      >
        {desktopOpen ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />}
      </button>

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white p-5 shadow-xl transition-[margin-left,transform,visibility] duration-200 ease-out md:sticky md:left-auto md:top-0 md:h-screen md:translate-x-0 md:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${desktopOpen ? "md:ml-0" : "md:invisible md:-ml-72"}`}
      >
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-200">
            <Car />
          </div>
          <div>
            <p className="font-black tracking-tight">AutoServe</p>
            <p className="text-xs text-slate-400">Service OS</p>
          </div>
        </div>

        <div className="mb-5 rounded-2xl bg-slate-950 p-4 text-white">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-orange-300">
            Workspace
          </p>
          <p className="mt-1 font-bold">{roleLabels[role]}</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <span className="size-2 rounded-full bg-emerald-400" /> System
            operational
          </div>
        </div>

        <nav className="space-y-1">
          {menus[role].map(([label, url, Icon]) => {
            const inside = (u: string) =>
              pathname === u || pathname.startsWith(u + "/");
            // A menu item that is a parent of another item (e.g. Home) only matches its own page.
            const hasMoreSpecific = menus[role].some(
              ([, other]) =>
                other !== url && other.startsWith(url + "/") && inside(other),
            );
            const active =
              pathname === url || (inside(url) && !hasMoreSpecific);
            return (
              <Link
                key={url}
                href={url}
                onClick={closeMobile}
                className={`sidebar-link flex items-center justify-between rounded-xl px-3 py-3 text-sm font-bold ${
                  active
                    ? "active bg-orange-50 text-orange-600"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon size={18} />
                  {label}
                </span>
                {active && <ChevronRight size={15} />}
              </Link>
            );
          })}
        </nav>

        {/* Phones only: on desktop, Logout lives in the avatar menu in the top bar. */}
        <button
          onClick={logout}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 md:hidden"
        >
          <LogOut size={18} />
          Logout
        </button>

        <div className="mt-auto pt-8">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50">
            <Settings size={18} />
            Preferences
          </button>
        </div>
      </aside>
    </>
  );
}