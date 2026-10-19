import RoleGuard from "../../../components/auth/RoleGuard";
import AppShell from "../../../components/layout/AppShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="admin">
      <AppShell role="admin">{children}</AppShell>
    </RoleGuard>
  );
}