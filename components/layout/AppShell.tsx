"use client";

import Sidebar from "../sidebar/Sidebar";
import type { Role } from "../../lib/auth";

export default function AppShell({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f8fc] md:flex">
      <Sidebar role={role} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
