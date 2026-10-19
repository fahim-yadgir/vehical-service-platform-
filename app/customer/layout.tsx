import RoleLayout from "../../components/layout/RoleLayout";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleLayout role="customer">{children}</RoleLayout>;
}
