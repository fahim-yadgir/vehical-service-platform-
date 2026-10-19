import RoleLayout from "../../components/layout/RoleLayout";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <RoleLayout role="manager">{children}</RoleLayout>;
}
