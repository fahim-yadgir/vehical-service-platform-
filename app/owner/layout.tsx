import RoleLayout from "../../components/layout/RoleLayout";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <RoleLayout role="owner">{children}</RoleLayout>;
}
