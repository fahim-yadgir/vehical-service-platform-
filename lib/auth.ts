export type Role = "customer" | "manager" | "owner" | "admin";
export const roleRoutes: Record<Role, string> = {
  customer: "/customer/dashboard",
  manager: "/manager/dashboard",
  owner: "/owner/dashboard",
  admin: "/admin/dashboard",
};
export const roleLabels: Record<Role, string> = {
  customer: "Customer",
  manager: "Service Centre Manager",
  owner: "Business Owner",
  admin: "Platform Admin",
};
export const roleDescriptions: Record<Role, string> = {
  customer: "Vehicles, bookings, tracking and payments",
  manager: "Workshop operations and job cards",
  owner: "Business performance and subscriptions",
  admin: "Tenants, users, revenue and health",
};
export function saveSession(role: Role) {
  if (typeof window !== "undefined")
    localStorage.setItem("vehicle-service-role", role);
}
export function getSessionRole(): Role | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem("vehicle-service-role");
  return v === "customer" || v === "manager" || v === "owner" || v === "admin"
    ? v
    : null;
}
export function clearSession() {
  if (typeof window !== "undefined")
    {
      localStorage.removeItem("vehicle-service-role");
      localStorage.removeItem("vehicle-service-tenant");
    }
}
