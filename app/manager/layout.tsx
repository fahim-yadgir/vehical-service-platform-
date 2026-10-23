import RoleLayout from "../../components/layout/RoleLayout";
import ManagerAccessGate from "../../components/manager/ManagerAccessGate";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayout role="manager">
      <ManagerAccessGate>{children}</ManagerAccessGate>
    </RoleLayout>
  );
}
