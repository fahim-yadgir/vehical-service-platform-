"use client";

import AppShell from "../layout/AppShell";
import Topbar from "../navbar/Topbar";
import DataTable from "../tables/DataTable";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { store, useAppSelector, type Tenant } from "../../lib/redux-store";

export default function Tenants() {
	const items = useAppSelector((state) => state.tenants);

	function addDemoTenant() {
		const tenant: Tenant = {
			id: `TEN00${items.length + 1}`,
			name: "New Service Centre",
			owner: "Demo Owner",
			status: "Active",
			plan: "1 Month",
			users: 3,
		};
		store.dispatch({ type: "tenants/added", payload: tenant });
	}

	return (
		<AppShell role="admin">
			<Topbar title="Tenants" subtitle="Service centres registered on the platform" />
			<div className="container">
				<div className="mb-5 flex justify-end">
					<Button onClick={addDemoTenant}>Add demo tenant</Button>
				</div>
				<DataTable
					headers={["Tenant", "Owner", "Users", "Plan", "Status", "Action"]}
					rows={items.map((tenant) => [
						<b key="name">{tenant.name}</b>,
						tenant.owner,
						String(tenant.users),
						tenant.plan,
						<Badge key="status" tone={tenant.status === "Active" ? "green" : "red"}>
							{tenant.status}
						</Badge>,
						<button key="action" className="rounded-xl border px-3 py-2 text-xs font-bold">
							Manage
						</button>,
					])}
				/>
			</div>
		</AppShell>
	);
}
