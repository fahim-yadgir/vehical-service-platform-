# AutoServe — Vehicle Service Platform (Frontend)

A multi-tenant SaaS frontend where customers find and book vehicle servicing at nearby service centres, and each service centre (a *tenant*) runs its own orders, staff and rates. The platform admin onboards tenants and manages plans and revenue.

> **Status: frontend prototype.** There is no backend. All data (tenants, staff, accounts, orders, rates, profiles, plan prices) lives in the browser's `localStorage`. Auth, OTPs and password hashing are demo-grade. See [Known limitations](#known-limitations).

## Stack
- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 · lucide-react · Recharts
- Leaflet / react-leaflet (OpenStreetMap tiles, OSRM routing)
- Small Redux-style store (`lib/redux-store.ts`) + `localStorage` persistence
- `@supabase/ssr` / `supabase-js` are installed for the planned backend but are **not used yet**

## Run
```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck
npm run build
```

## Roles

| Role | Who | Login | Home |
|---|---|---|---|
| Platform Admin | Runs the SaaS | `/admin/login` (demo, no credentials checked) | `/admin/dashboard` |
| Owner | Owns a service centre (tenant) | `/login` → Owner | `/owner/dashboard` |
| Manager | Runs daily operations for a centre | `/login` → Manager | `/manager/dashboard` |
| Staff | Pickup & delivery driver | `/login` → Staff | `/staff/dashboard` |
| Customer | Vehicle owner | `/register`, then `/login` → Customer | `/customer/dashboard` |

Each role has its own route layout (`app/<role>/layout.tsx`) that applies `RoleGuard` and the sidebar (`components/sidebar/Sidebar.tsx`), so pages don't guard themselves.

### Pages per role
- **Admin** — dashboard, tenants, users, plans (set prices), revenue, profile
- **Owner** — dashboard, all orders (+ create order), my staff, my rates, profile (address and map pin), revenue, reports, subscription
- **Manager** — dashboard, orders (+ create order), staff, rates, profile
- **Staff** — dashboard, my orders (order detail with OTP entry), profile
- **Customer** — dashboard, service centres (list + detail), bookings (new / list / detail), vehicles (+ service history), profile

## Current workflow (end to end)

### 1. Admin onboards a service centre
1. Admin signs in at `/admin/login`.
2. **Tenants → Add tenant**: name, owner, mobile, plan. Plans are *Free Trial (14 days)*, 1, 3, 6 months and 1 year. Admin sets paid-plan prices on the **Plans** page.
3. The app creates the tenant and an **owner login** with a generated **temporary password** (`lib/tempPassword.ts`).
4. A modal shows the credentials and opens a pre-filled **WhatsApp link** (`wa.me`) so the admin can send them to the owner.
5. The admin can edit, suspend or delete a tenant, and filter by new / old / expiring / expired / active / suspended.

### 2. Owner sets up the centre
1. Owner logs in with mobile (or email) and the temporary password → a **forced password change** popup appears.
2. **Profile**: address, city, state, pincode, GSTIN and a **map pin** (location picker).
3. **My Rates**: services and facilities with prices, each for Car, Bike or Both.
4. **My Staff**: add managers and staff (drivers). Each gets their own temporary password and WhatsApp credentials message; the same forced password change applies.
5. **Subscription**: shows the plan, days left and expiry, and can request an upgrade.

### 3. The centre becomes visible to customers
A centre is listed on the customer side only when **all** of these are true (`lib/liveCenters.ts`):
- the tenant is not suspended and its plan has not ended
- the owner profile is complete **and** has a map pin
- (rates are optional; without them the page says "call the centre")

### 4. Customer registers and books
1. `/register` creates a customer account (own password) and saves their location; the map falls back to Pune if none is saved. Blocked customers (admin → Users) cannot log in.
2. **Service centres** (`/customer/serviceCenters`) lists live centres sorted by distance, with filters (service, distance, top rated) and a map. Each card opens the **centre detail** (`/customer/serviceCenters/[id]`) showing location, rates by vehicle type, team and Book / Call / Directions.
3. **Book** (`/customer/bookings/new?center=<id>`): choose vehicle, service, date and pickup location → an order is created with status `pending`.
4. Customers can also manage **vehicles** and view per-vehicle service history.

### 5. Order lifecycle (`lib/orders.ts`)
```
pending → driver_assigned → pickup_otp_verified → in_transit → at_centre
→ inspection → repair_in_progress → quality_check → ready_for_delivery
→ delivery_otp_verified → completed            (cancelled is possible until closed)
```
| Step | Who | How |
|---|---|---|
| `pending` → `driver_assigned` | Manager / Owner | **Assign staff** (creates a 4-digit pickup OTP) |
| → `pickup_otp_verified` | Customer | Types the OTP the staff member tells them |
| `in_transit`, `at_centre`, `inspection`, `repair_in_progress`, `quality_check`, `ready_for_delivery` | Manager / Owner | **Change status**, one step forward at a time |
| `ready_for_delivery` | system | Creates a delivery OTP shown to the customer |
| → `delivery_otp_verified` | Staff | Types the OTP the customer tells them |
| → `completed` | Manager / Owner | Final step |

- The three guarded steps (assign, pickup OTP, delivery OTP) can't be done by hand.
- OTPs are single-use and lock after **5 wrong attempts**.
- Every change is written to the order history with who did it and when; the first manager to handle an order becomes its supervisor.
- Orders can also be created by the centre (owner/manager) for walk-in customers (`source: "centre"`).

### 6. Money and reports
- Admin **Revenue**: platform revenue by range/preset and month.
- Owner **Revenue / Reports**: centre revenue and order stats. PDF export is not done yet.

## Project structure
```
app/            routes per role (admin, owner, manager, staff, customer) + login, register, forgot-password
components/     ui, layout, sidebar, navbar, auth gates, map, charts, tables, role-specific components
lib/            data + logic (orders, tenantAccounts, redux-store, liveCenters, ownerRates, ownerProfile,
                plans, revenue, geo, customerLocation, validators, tempPassword, ...)
features/       placeholder index files for future feature modules
types/ hooks/   shared types and thin hooks
FRONTEND_SCOPE.md   what is in / out of scope
TESTING.md          manual test checklist
```

### localStorage keys
`vehicle-service-role`, `vehicle-service-account` (session) · `vehicle-service-platform.tenants`, `.staff`, `.accounts`, `.orders`, `.plan-prices`, `.blockedUsers` · per-tenant owner profile and rates · `customer.serviceCenters.location[.<mobile>]`.
Clear these to reset the demo.

## Known limitations
- **No real auth.** The role is read from `localStorage`; guards are UI-only. Admin login accepts anything.
- Passwords are hashed in the browser (SHA-256) — demo only. A backend must use bcrypt/argon2 and issue sessions.
- OTPs are generated and stored client-side; the backend must generate, hash and expire them.
- WhatsApp is a `wa.me` deep link, not the WhatsApp API.
- Payments, invoices/PDF export, push notifications and live GPS tracking are not implemented.
- Centre detail no longer shows mock plans, opening hours or reviews; reviews show "No reviews yet" until a review flow exists.
- `lib/api.ts` and `app/api` are unused; Supabase is installed but not wired.
- No automated tests — follow `TESTING.md`.

## Next steps
1. Finish and verify remaining frontend screens (admin items, customer flow end to end).
2. Connect Supabase (auth, tenants, staff, orders, rates, profiles) and replace the `localStorage` reads in `lib/`.
3. Add payments, invoices/PDF, notifications and reviews.
4. Add automated tests (booking flow, OTP handover, subscription gating).