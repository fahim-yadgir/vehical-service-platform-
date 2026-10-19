"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
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
  Settings,
  type LucideIcon,
} from "lucide-react";
import { clearSession, roleLabels, type Role } from "../../lib/auth";
const menus: Record<Role, Array<[string, string, LucideIcon]>> = {
  customer: [
    ["Dashboard", "/customer/dashboard", LayoutDashboard],
    ["Vehicles", "/customer/vehicles", Car],
    ["Bookings", "/customer/bookings", CalendarDays],
    ["Tracking", "/customer/tracking", Car],
    ["Invoices", "/customer/invoices", FileText],
    ["Profile", "/customer/profile", Users],
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
    ["Subscription", "/owner/subscription", CreditCard],
  ],
  admin: [
    ["Dashboard", "/admin/dashboard", LayoutDashboard],
    ["Tenants", "/admin/tenants", Building2],
    ["Users", "/admin/users", Users],
    ["Revenue", "/admin/revenue", BarChart3],
  ],
};
export default function Sidebar({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const logout = () => {
    clearSession();
    router.push("/login");
  };
  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed left-4 top-4 z-50 rounded-xl border bg-white p-2.5 shadow-lg md:hidden"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white/95 p-5 shadow-xl backdrop-blur-xl transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 md:shadow-none ${open ? "translate-x-0" : "-translate-x-full"}`}
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
            const active = pathname === url || pathname.startsWith(url + "/");
            return (
              <Link
                key={url}
                href={url}
                onClick={() => setOpen(false)}
                className={`sidebar-link flex items-center justify-between rounded-xl px-3 py-3 text-sm font-bold ${active ? "active bg-orange-50 text-orange-600" : "text-slate-600 hover:bg-slate-50"}`}
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
        <div className="mt-auto space-y-2 pt-8">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50">
            <Settings size={18} />
            Preferences
          </button>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
