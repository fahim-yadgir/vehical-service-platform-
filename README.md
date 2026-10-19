# AutoServe — Vehicle Service Platform Frontend

Advanced role-based frontend for the Vehicle Servicing Booking Platform SaaS.

## Stack
- Next.js 16 + React + TypeScript
- Tailwind CSS v4
- Lucide React
- Recharts
- Mock frontend data / localStorage role session

## Roles
- Customer
- Service Centre Manager
- Owner
- Platform Admin

## Run
```bash
npm install
npm run dev
```

## Verify
```bash
npm run typecheck
npm run build
```

No backend, database, payment gateway, GPS backend, or real authentication is included. Those are represented by frontend-ready mock flows.

## Role-based route layouts

Each workspace now has its own Next.js route layout. The layout is responsible for the role guard and persistent sidebar, so child pages do not need to import `RoleGuard` or `Sidebar` individually.

```text
app/
├── admin/
│   ├── layout.tsx
│   ├── dashboard/page.tsx
│   ├── tenants/page.tsx
│   ├── users/page.tsx
│   └── revenue/page.tsx
├── customer/
│   ├── layout.tsx
│   ├── dashboard/page.tsx
│   ├── bookings/page.tsx
│   ├── bookings/new/page.tsx
│   ├── tracking/page.tsx
│   ├── invoices/page.tsx
│   ├── vehicles/page.tsx
│   └── profile/page.tsx
├── manager/
│   ├── layout.tsx
│   ├── dashboard/page.tsx
│   ├── bookings/page.tsx
│   ├── invoices/page.tsx
│   ├── job-cards/page.tsx
│   └── team/page.tsx
└── owner/
    ├── layout.tsx
    ├── dashboard/page.tsx
    ├── reports/page.tsx
    └── subscription/page.tsx
```

`components/layout/RoleLayout.tsx` combines `RoleGuard` + `AppShell`, while the existing `components/sidebar/Sidebar.tsx` supplies role-specific navigation.
