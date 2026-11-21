"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getSessionRole, roleRoutes, saveSession, type Role } from "../../lib/auth";

// Jin roles ka login backend se chalta hai, unka check server se hota hai.
// Baaki roles ka backend bante hi unhe yahan jodte jao.
const SERVER_ROLES: Role[] = ["admin"];

type Status = "checking" | "allowed" | "error";

export default function RoleGuard({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loginPath = role === "admin" ? "/admin/login" : "/login";

    async function check() {
      setStatus("checking");

      // Purana tareeka: jab tak is role ka backend nahi banta
      if (!SERVER_ROLES.includes(role)) {
        const current = getSessionRole();
        if (!current) {
          router.replace(loginPath);
          return;
        }
        if (current !== role) {
          router.replace(roleRoutes[current]);
          return;
        }
        setStatus("allowed");
        return;
      }

      // Server se poocho: cookie ke hisaab se kaun logged in hai
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (cancelled) return;

        if (res.status === 401) {
          clearSession();
          router.replace(loginPath);
          return;
        }
        if (!res.ok) {
          // Server error ko "logged out" mat samjho, retry ka option do
          setStatus("error");
          return;
        }

        const data = (await res.json().catch(() => null)) as { user?: { role?: Role } } | null;
const serverRole = data?.user?.role;
        if (!serverRole) {
          clearSession();
          router.replace(loginPath);
          return;
        }
        if (serverRole !== role) {
          // Logged in hai, par kisi aur role me
          saveSession(serverRole);
          router.replace(roleRoutes[serverRole]);
          return;
        }

        saveSession(serverRole); // UserMenu aur Sidebar abhi localStorage ka role padhte hain
        setStatus("allowed");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [role, router, attempt]);

  if (status === "allowed") return <>{children}</>;

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50">
      <div className="text-center">
        {status === "checking" ? (
          <>
            <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
            <p className="text-sm text-slate-500">Checking workspace access...</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-700">
              Could not verify your session. Please check your connection.
            </p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </main>
  );
}