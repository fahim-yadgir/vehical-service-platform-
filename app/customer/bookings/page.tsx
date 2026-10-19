import RoleGuard from "../../../components/auth/RoleGuard";
import PageComponent from "../../../components/customer/bookings";

export default function Page() {
  return (
    <RoleGuard role="customer">
      <PageComponent />
    </RoleGuard>
  );
}