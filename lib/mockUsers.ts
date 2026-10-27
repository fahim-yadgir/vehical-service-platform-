import type { StaffMember, Tenant } from "./redux-store";

export type UserRole = "Customer" | "Owner" | "Manager" | "staff";
export type PlatformUser = {
  id: string;
  name: string;
  mobile: string;
  email: string;
  role: UserRole;
  /** Staff: the tenant they work for. Customer: the centre they last used. */
  tenant: string;
  joined: string; // yyyy-mm-dd
};

export const roles: UserRole[] = ["Customer", "Owner", "Manager", "staff"];

const first = ["Aarav", "Vihaan", "Ishaan", "Rohan", "Kunal", "Neha", "Priya", "Sneha", "Pooja", "Tanvi", "Imran", "Zoya", "Sahil", "Nikhil", "Divya", "Omkar", "Rutuja", "Yash", "Mitali", "Farhan"];
const last = ["Patil", "Shaikh", "Kulkarni", "Deshmukh", "Jadhav", "Khan", "More", "Pawar", "Joshi", "Shinde", "Gaikwad", "Sayyed"];

const person = (i: number) => `${first[i % first.length]} ${last[(i * 7 + 3) % last.length]}`;
const mobile = (i: number) => `98${String(20000000 + ((i * 7919) % 79999999)).padStart(8, "0")}`;
const emailOf = (name: string, i: number) => `${name.toLowerCase().replace(/\s+/g, ".")}${i % 9}@example.com`;
const joined = (i: number) => `2026-${String(1 + (i % 10)).padStart(2, "0")}-${String(1 + ((i * 5) % 27)).padStart(2, "0")}`;

/**
 * Mock directory built from the tenants, so the Users page and the Tenants page agree:
 * tenant.users = owner + managers + drivers. Replace with an API call later.
 */
export function buildUsers(tenants: Tenant[], staffList: StaffMember[] = []): PlatformUser[] {
  const users: PlatformUser[] = [];
  let n = 0;

  tenants.forEach((t) => {
    users.push({ id: `${t.id}-OWN`, name: t.owner, mobile: t.mobile ?? mobile(n), email: t.email ?? emailOf(t.owner, n), role: "Owner", tenant: t.name, joined: t.createdAt });
    n++;
    // Real staff added by the owner come first; the rest of t.users is demo data.
    const real = staffList.filter((m) => m.tenantId === t.id);
    real.forEach((m) => {
      users.push({ id: m.id, name: m.name, mobile: m.mobile, email: m.email ?? "–", role: m.role, tenant: t.name, joined: m.createdAt });
    });
    const staff = Math.max(0, t.users - 1 - real.length);
    const managers = staff === 0 ? 0 : Math.max(1, Math.round(staff * 0.15));
    for (let i = 0; i < staff; i++) {
      const name = person(n * 3 + 1);
      users.push({
        id: `${t.id}-S${String(i + 1).padStart(2, "0")}`,
        name,
        mobile: mobile(n),
        email: emailOf(name, n),
        role: i < managers ? "Manager" : "staff",
        tenant: t.name,
        joined: joined(n),
      });
      n++;
    }
  });

  const names = tenants.map((t) => t.name);
  for (let i = 0; i < 24; i++) {
    const name = i === 0 ? "Fahim Yadgir" : person(i * 5 + 2);
    users.push({
      id: `CUS${String(i + 1).padStart(3, "0")}`,
      name,
      mobile: i === 0 ? "9876543210" : mobile(n),
      email: i === 0 ? "fahim@example.com" : emailOf(name, n),
      role: "Customer",
      tenant: names.length ? names[i % names.length] : "-",
      joined: joined(n),
    });
    n++;
  }
  return users;
}