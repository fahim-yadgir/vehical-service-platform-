"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { clearSession, getSessionRole, roleLabels, type Role } from "../../lib/auth";
import { loadProfile } from "../../lib/customerProfile";

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "U";

/** Avatar in the top bar with a small Profile / Logout menu. */
export default function UserMenu() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Read after mount (localStorage) so server and browser render the same first paint.
  useEffect(() => {
    const r = getSessionRole();
    setRole(r);
    setName(r === "customer" ? loadProfile().fullName : r ? roleLabels[r] : "");
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!role) return null;

  const logout = () => {
    clearSession();
    router.push(role === "admin" ? "/admin/login" : "/login");
  };

  return (
    <div ref={box} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid size-10 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white transition hover:bg-slate-800"
      >
        {initialsOf(name)}
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          <div className="border-b border-slate-100 px-3 pb-2 pt-1">
            <p className="truncate text-sm font-black text-slate-900">{name}</p>
            <p className="text-xs text-slate-500">{roleLabels[role]}</p>
          </div>
          {(role === "customer" || role === "admin") && (
            <Link
              role="menuitem"
              href={role === "admin" ? "/admin/profile" : "/customer/profile"}
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <User size={16} /> Profile
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}