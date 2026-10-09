import RoleGuard from "../../../components/auth/RoleGuard";
import PageComponent from "../../../components/owner/dashboard";
export default function Page() {
  return (
    <RoleGuard role="owner">
      <PageComponent />
    </RoleGuard>
  );
}
