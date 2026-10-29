import type { StaffMember, Tenant } from "./redux-store";
import { customerUserId, type TenantAccount } from "./tenantAccounts";
import type { Order } from "./orders";

export type UserRole = "Customer" | "Owner" | "Manager" | "Staff";
export type PlatformUser = {
  id: string;
  name: string;
  mobile: string;
  email: string;
  role: UserRole;
  /** Owner, manager, staff: the centre they work for. Customer: the centre they booked with last. */
  tenant: string;
  joined: string; // yyyy-mm-dd
};

export const roles: UserRole[] = ["Customer", "Owner", "Manager", "Staff"];

/**
 * The platform directory, built only from what really happened in the app:
 * admin creates a tenant (owner) -> owner or manager adds managers and staff -> customers register.
 * Nothing is invented. Replace with an API call later.
 */
export function buildUsers(
  tenants: Tenant[],
  staffList: StaffMember[] = [],
  customers: TenantAccount[] = [],
  orders: Order[] = [],
): PlatformUser[] {
  const users: PlatformUser[] = [];

  tenants.forEach((t) => {
    users.push({ id: `${t.id}-OWN`, name: t.owner, mobile: t.mobile ?? "–", email: t.email ?? "–", role: "Owner", tenant: t.name, joined: t.createdAt });
    staffList
      .filter((m) => m.tenantId === t.id)
      .forEach((m) => {
        users.push({ id: m.id, name: m.name, mobile: m.mobile, email: m.email ?? "–", role: m.role === "Manager" ? "Manager" : "Staff", tenant: t.name, joined: m.createdAt });
      });
  });

  customers.forEach((c) => {
    // orders are newest first, so the first match is the centre this customer booked with last
    const last = orders.find((o) => o.tenantId && o.customer.mobile === c.mobile);
    const centre = last ? tenants.find((t) => t.id === last.tenantId)?.name : undefined;
    users.push({
      id: customerUserId(c.mobile),
      name: c.name,
      mobile: c.mobile,
      email: c.email ?? "–",
      role: "Customer",
      tenant: centre ?? "–",
      joined: c.createdAt ?? new Date().toISOString().slice(0, 10),
    });
  });

  return users;
}