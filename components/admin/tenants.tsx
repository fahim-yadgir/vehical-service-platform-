"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AppShell from "../layout/AppShell";
import Topbar from "../navbar/Topbar";
import DataTable from "../tables/DataTable";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { store, useAppSelector, type Tenant, type TenantFilter } from "../../lib/redux-store";

const filters: { value: TenantFilter; label: string }[] = [
	{ value: "all", label: "All tenants" },
	{ value: "new", label: "New added" },
	{ value: "old", label: "Old tenants" },
	{ value: "expiring", label: "Expiry near" },
	{ value: "expired", label: "Expired" },
	{ value: "active", label: "Active" },
	{ value: "suspended", label: "Suspended" },
];

function matchesFilter(tenant: Tenant, filter: TenantFilter, todayTime: number, thirtyDays: number) {
	const createdAt = new Date(`${tenant.createdAt}T00:00:00`).getTime();
	const expiresAt = new Date(`${tenant.subscriptionExpiresAt}T00:00:00`).getTime();
	switch (filter) {
		case "new": return createdAt >= todayTime - thirtyDays && createdAt <= todayTime;
		case "old": return createdAt < todayTime - thirtyDays;
		case "expiring": return expiresAt >= todayTime && expiresAt <= todayTime + thirtyDays;
		case "expired": return expiresAt < todayTime;
		case "active": return tenant.status === "Active";
		case "suspended": return tenant.status === "Suspended";
		default: return true;
	}
}

export default function Tenants() {
	const items = useAppSelector((state) => state.tenants);
	const selectedFilter = useAppSelector((state) => state.tenantFilter);
	const [currentPage, setCurrentPage] = useState(1);
	const pageSize = 10;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todayTime = today.getTime();
	const thirtyDays = 30 * 24 * 60 * 60 * 1000;
	const filteredItems = items.filter((tenant) => matchesFilter(tenant, selectedFilter, todayTime, thirtyDays));
	const pageCount = Math.ceil(filteredItems.length / pageSize);
	const pageItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

	function addDemoTenant() {
		const tenant: Tenant = {
			id: `TEN00${items.length + 1}`,
			name: "New Service Centre",
			owner: "Demo Owner",
			status: "Active",
			plan: "1 Month",
			users: 3,
			createdAt: new Date().toISOString().slice(0, 10),
			subscriptionExpiresAt: new Date(Date.now() + thirtyDays).toISOString().slice(0, 10),
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
				<div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
					<aside className="self-start" aria-label="Tenant filters">
						<h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">Filters</h2>
						<div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
							{filters.map((filter) => {
								const count = items.filter((tenant) => matchesFilter(tenant, filter.value, todayTime, thirtyDays)).length;
								return (
									<button
										key={filter.value}
										type="button"
										aria-pressed={selectedFilter === filter.value}
										onClick={() => {
											store.dispatch({ type: "tenants/filterChanged", payload: filter.value });
											setCurrentPage(1);
										}}
										className={`flex shrink-0 items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${selectedFilter === filter.value ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-50"}`}
									>
										<span>{filter.label}</span>
										<span className="text-xs tabular-nums opacity-70">{count}</span>
									</button>
								);
							})}
						</div>
					</aside>

					<div className="min-w-0">
						<DataTable
							headers={["Tenant", "Owner", "Users", "Plan", "Subscription expiry", "Status", "Action"]}
							rows={pageItems.map((tenant) => [
								<b key="name">{tenant.name}</b>,
								tenant.owner,
								String(tenant.users),
								tenant.plan,
								new Date(`${tenant.subscriptionExpiresAt}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
								<Badge key="status" tone={tenant.status === "Active" ? "green" : "red"}>
									{tenant.status}
								</Badge>,
								<button key="action" className="rounded-xl border px-3 py-2 text-xs font-bold">
									Manage
								</button>,
							])}
						/>
						{filteredItems.length === 0 && (
							<p className="py-10 text-center text-sm text-slate-500">No tenants match this filter.</p>
						)}
						{pageCount > 1 && (
							<nav className="mt-4 flex flex-wrap items-center justify-between gap-3" aria-label="Tenant pagination">
								<p className="text-sm text-slate-500">
									Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredItems.length)} of {filteredItems.length} tenants
								</p>
								<div className="flex items-center gap-2">
									<button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} aria-label="Previous page" className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
										<ChevronLeft size={18} />
									</button>
									<span className="min-w-20 text-center text-sm font-semibold text-slate-700" aria-live="polite">Page {currentPage} of {pageCount}</span>
									<button type="button" onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))} disabled={currentPage === pageCount} aria-label="Next page" className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
										<ChevronRight size={18} />
									</button>
								</div>
							</nav>
						)}
					</div>
				</div>
			</div>
		</AppShell>
	);
}
