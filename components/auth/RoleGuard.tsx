"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSessionRole, roleRoutes, type Role } from "../../lib/auth";
export default function RoleGuard({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const current = getSessionRole();
    if (!current) {
      router.replace("/login");
      return;
    }
    if (current !== role) {
      router.replace(roleRoutes[current]);
      return;
    }
    setAllowed(true);
  }, [role, router]);
  if (!allowed)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
          <p className="text-sm text-slate-500">Checking workspace access...</p>
        </div>
      </main>
    );
  return <>{children}</>;
}
