// components/layout/RoleLayout.tsx
"use client";

import AppShell from "./AppShell";
import RoleGuard from "../auth/RoleGuard";
import ForcePasswordChange from "../auth/ForcePasswordChange";
import type { Role } from "../../lib/auth";

export default function RoleLayout({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  return (
    <RoleGuard role={role}>
      <AppShell role={role}>{children}</AppShell>
      <ForcePasswordChange />
    </RoleGuard>
  );
}