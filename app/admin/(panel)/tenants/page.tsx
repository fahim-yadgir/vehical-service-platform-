"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Topbar from "../../../../components/navbar/Topbar";
import DataTable from "../../../../components/tables/DataTable";
import Badge from "../../../../components/ui/Badge";
import Button from "../../../../components/ui/Button";
import AddTenantForm, { type NewTenant } from "../../../../components/admin/AddTenantForm";
import WhatsAppCredentialsModal from "../../../../components/admin/WhatsAppCredentialsModal";
import { generateTempPassword } from "../../../../lib/tempPassword";
import { ymd } from "../../../../lib/revenue";
import TenantDetailsModal, { subscriptionState } from "../../../../components/admin/TenantDetailsModal";
import { restoreStaff, store, tenantsStorageKey, useAppSelector, type Tenant, type TenantFilter } from "../../../../lib/redux-store";

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
	const staff = useAppSelector((state) => state.staff);
	const selectedFilter = useAppSelector((state) => state.tenantFilter);
	const [currentPage, setCurrentPage] = useState(1);
	const [showTenantForm, setShowTenantForm] = useState(false);
	const [tenantToEdit, setTenantToEdit] = useState<Tenant | null>(null);
	const [credentials, setCredentials] = useState<{ owner: string; centre: string; mobile: string; password: string } | null>(null);
	const [viewingId, setViewingId] = useState<string | null>(null);
	const [notice, setNotice] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);
	// Always read the latest copy, so the modal updates right after Suspend / Activate.
	const viewing = items.find((tenant) => tenant.id === viewingId) ?? null;
	const pageSize = 10;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todayTime = today.getTime();
	const thirtyDays = 30 * 24 * 60 * 60 * 1000;
	const filteredItems = items.filter((tenant) => matchesFilter(tenant, selectedFilter, todayTime, thirtyDays));
	const pageCount = Math.ceil(filteredItems.length / pageSize);
	const pageItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

	useEffect(() => {
		restoreStaff();
		try {
			const savedTenants = window.localStorage.getItem(tenantsStorageKey);
			if (savedTenants) {
				const tenants: unknown = JSON.parse(savedTenants);
				if (Array.isArray(tenants)) {
					store.dispatch({ type: "tenants/restored", payload: tenants as Tenant[] });
				}
			}
		} catch {
		}
	}, []);

	function saveTenant(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const tenantDetails = {
			name: String(formData.get("name")),
			owner: String(formData.get("owner")),
			status: String(formData.get("status")) as Tenant["status"],
			plan: String(formData.get("plan")),
			users: Number(formData.get("users")),
			subscriptionExpiresAt: String(formData.get("subscriptionExpiresAt")),
		};
		if (!tenantToEdit) return;
		store.dispatch({ type: "tenants/updated", payload: { ...tenantToEdit, ...tenantDetails } });
		setShowTenantForm(false);
		setTenantToEdit(null);
	}

	/** New tenant: 14-day free trial, one temporary password (shown once) for the owner. */
	function createTenant(data: NewTenant) {
		const latestId = items.reduce((latest, tenant) => Math.max(latest, Number(tenant.id.replace(/\D/g, "")) || 0), 0);
		const now = new Date();
		const trialEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14);
		store.dispatch({
			type: "tenants/added",
			payload: {
				id: `TEN${String(latestId + 1).padStart(3, "0")}`,
				name: data.name,
				owner: data.owner,
				mobile: data.mobile,
				email: data.email || undefined,
				status: "Active",
				plan: "Free Trial",
				users: 1,
				createdAt: ymd(now),
				subscriptionExpiresAt: ymd(trialEnd),
			},
		});
		setShowTenantForm(false);
		setCredentials({ owner: data.owner, centre: data.name, mobile: data.mobile, password: generateTempPassword() });
	}

	function openTenantForm(tenant?: Tenant) {
		setTenantToEdit(tenant ?? null);
		setShowTenantForm(true);
	}

	function toggleStatus(tenant: Tenant) {
		if (tenant.status === "Suspended" && subscriptionState(tenant).expired) {
			setNotice({ tone: "warn", text: `${tenant.name}'s subscription has expired. Extend the expiry date in Manage before activating.` });
			return;
		}
		const next = tenant.status === "Active" ? "Suspended" : "Active";
		store.dispatch({ type: "tenants/updated", payload: { ...tenant, status: next } });
		setNotice({ tone: "ok", text: `${tenant.name} is now ${next.toLowerCase()}.` });
	}

	function manageTenant(tenant: Tenant) {
		setViewingId(null);
		openTenantForm(tenant);
		window.scrollTo({ top: 0, behavior: "smooth" });
	}

	function deleteTenant(tenant: Tenant) {
		if (!window.confirm(`Delete ${tenant.name}? This cannot be undone.`)) return;
		setViewingId(null);
		store.dispatch({ type: "tenants/deleted", payload: tenant.id });
		store.dispatch({ type: "staff/removedForTenant", payload: tenant.id });
		if (tenantToEdit?.id === tenant.id) {
			setShowTenantForm(false);
			setTenantToEdit(null);
		}
		setCurrentPage(1);
	}

	function changeFilter(filter: TenantFilter) {
		store.dispatch({ type: "tenants/filterChanged", payload: filter });
		setCurrentPage(1);
	}

	return (
		<>
			<Topbar title="Tenants" subtitle="Service centres registered on the platform" />
			<div className="container">
				<div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<label htmlFor="tenant-filter" className="sr-only">Filter tenants</label>
					<select
						id="tenant-filter"
						value={selectedFilter}
						onChange={(event) => changeFilter(event.target.value as TenantFilter)}
						className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 lg:hidden"
					>
						{filters.map((filter) => {
							const count = items.filter((tenant) => matchesFilter(tenant, filter.value, todayTime, thirtyDays)).length;
							return <option key={filter.value} value={filter.value}>{filter.label} ({count})</option>;
						})}
					</select>
					<div className="hidden flex-wrap items-center gap-1.5 lg:flex" aria-label="Tenant filters">
						{filters.map((filter) => {
							const count = items.filter((tenant) => matchesFilter(tenant, filter.value, todayTime, thirtyDays)).length;
							return (
								<button
									key={filter.value}
									type="button"
									aria-pressed={selectedFilter === filter.value}
									title={filter.label}
									onClick={() => changeFilter(filter.value)}
									className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-semibold transition ${selectedFilter === filter.value ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-50"}`}
								>
									{filter.label} <span className="opacity-70">{count}</span>
								</button>
							);
						})}
					</div>
					<Button onClick={() => showTenantForm ? setShowTenantForm(false) : openTenantForm()}>
						{showTenantForm ? "Close form" : "Add service centre"}
					</Button>
				</div>
				{notice && (
					<div role="status" className={`mb-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${notice.tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
						<span>{notice.text}</span>
						<button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="font-black opacity-60 hover:opacity-100">×</button>
					</div>
				)}
				{showTenantForm && !tenantToEdit && (
					<AddTenantForm
						existingMobiles={[...items.flatMap((tenant) => (tenant.mobile ? [tenant.mobile] : [])), ...staff.map((member) => member.mobile)]}
						onCreate={createTenant}
						onCancel={() => setShowTenantForm(false)}
					/>
				)}
				{showTenantForm && tenantToEdit && (
					<section className="mb-5 rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="add-tenant-heading">
						<div className="mb-4">
							<h2 id="add-tenant-heading" className="text-lg font-bold text-slate-900">Manage tenant</h2>
							<p className="mt-1 text-sm text-slate-500">Update details for {tenantToEdit.name}.</p>
						</div>
						<form key={tenantToEdit.id} onSubmit={saveTenant} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<label className="block space-y-2">
								<span className="text-sm font-bold text-slate-700">Service centre name</span>
								<input name="name" required className="input" defaultValue={tenantToEdit?.name ?? ""} placeholder="e.g. City Auto Care" />
							</label>
							<label className="block space-y-2">
								<span className="text-sm font-bold text-slate-700">Owner name</span>
								<input name="owner" required className="input" defaultValue={tenantToEdit?.owner ?? ""} placeholder="e.g. Asha Mehta" />
							</label>
							<label className="block space-y-2">
								<span className="text-sm font-bold text-slate-700">Number of users</span>
								<input name="users" type="number" min="1" required className="input" defaultValue={tenantToEdit?.users ?? ""} placeholder="1" />
							</label>
							<label className="block space-y-2">
								<span className="text-sm font-bold text-slate-700">Subscription plan</span>
								<select name="plan" required defaultValue={tenantToEdit?.plan ?? ""} className="input">
									<option value="" disabled>Select a plan</option>
									<option>Free Trial</option>
									<option>1 Month</option>
									<option>6 Months</option>
									<option>1 Year</option>
								</select>
							</label>
							<label className="block space-y-2">
								<span className="text-sm font-bold text-slate-700">Subscription expiry</span>
								<input name="subscriptionExpiresAt" type="date" required className="input" defaultValue={tenantToEdit?.subscriptionExpiresAt ?? ""} />
							</label>
							<label className="block space-y-2">
								<span className="text-sm font-bold text-slate-700">Status</span>
								<select name="status" defaultValue={tenantToEdit?.status ?? "Active"} className="input">
									<option>Active</option>
									<option>Suspended</option>
								</select>
							</label>
							<div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-3">
								<Button type="submit">Save changes</Button>
								<button type="button" onClick={() => { setShowTenantForm(false); setTenantToEdit(null); }} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
							</div>
						</form>
					</section>
				)}
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
								<div key="actions" className="flex flex-wrap items-center gap-2">
									<button type="button" onClick={() => setViewingId(tenant.id)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700">View</button>
									<button type="button" onClick={() => toggleStatus(tenant)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${tenant.status === "Active" ? "border-rose-200 text-rose-700 hover:bg-rose-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}>{tenant.status === "Active" ? "Suspend" : "Activate"}</button>
									<button type="button" onClick={() => openTenantForm(tenant)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Manage</button>
									<button type="button" onClick={() => deleteTenant(tenant)} aria-label={`Delete ${tenant.name}`} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">Delete</button>
								</div>,
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
			{credentials && <WhatsAppCredentialsModal {...credentials} onClose={() => setCredentials(null)} />}
			{viewing && (
				<TenantDetailsModal tenant={viewing} onClose={() => setViewingId(null)} onToggleStatus={toggleStatus} onManage={manageTenant} />
			)}
		</>
	);
}