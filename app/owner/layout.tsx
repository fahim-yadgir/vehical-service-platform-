import RoleLayout from "../../components/layout/RoleLayout";
import ForcePasswordChange from "../../components/auth/ForcePasswordChange";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayout role="owner">
      {children}
      <ForcePasswordChange />
    </RoleLayout>
  );
}