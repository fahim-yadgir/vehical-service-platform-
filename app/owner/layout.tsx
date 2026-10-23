import RoleLayout from "../../components/layout/RoleLayout";
import OwnerAccessGate from "../../components/owner/OwnerAccessGate";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayout role="owner">
      <OwnerAccessGate>{children}</OwnerAccessGate>
    </RoleLayout>
  );
}