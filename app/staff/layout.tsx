import RoleLayout from "../../components/layout/RoleLayout";
import StaffAccessGate from "../../components/staff/StaffAccessGate";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayout role="staff">
      <StaffAccessGate>{children}</StaffAccessGate>
    </RoleLayout>
  );
}