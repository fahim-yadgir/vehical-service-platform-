"use client";

import Sidebar from "../sidebar/Sidebar";
import { SidebarProvider } from "./SidebarContext";
import type { Role } from "../../lib/auth";

export default function AppShell({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="min-h-dvh bg-[#f7f8fc] md:flex">
        <Sidebar role={role} />
        <main className="safe-bottom min-w-0 flex-1">{children}</main>
      </div>
    </SidebarProvider>
  );
}