import RoleGuard from "../../../components/auth/RoleGuard";
import PageComponent from "../../../components/customer/dashboard";
export default function Page() {
  return (
    <RoleGuard role="customer">
      <PageComponent />
    </RoleGuard>
  );
}
