"use client";

import { nextStatuses, statusLabel } from "../../lib/orders";

const waiting: Record<string, string> = {
  pending: "Assign staff to continue",
  driver_assigned: "Waiting for pickup OTP",
  ready_for_delivery: "Waiting for delivery OTP",
};

export default function OrderStatusSelect({
  status,
  onChange,
}: {
  status: string;
  onChange: (next: string) => void;
}) {
  const options = nextStatuses(status);
  if (options.length === 0) {
    return <span className="text-xs text-slate-400">No changes</span>;
  }
  return (
    <div className="space-y-1">
      {waiting[status] && <p className="text-[11px] font-semibold text-amber-700">{waiting[status]}</p>}
      <select
        aria-label="Change status"
        className="input py-2 text-xs capitalize"
        value=""
        onChange={(e) => e.target.value && onChange(e.target.value)}
      >
        <option value="">Change status…</option>
        {options.map((s) => (
          <option key={s} value={s}>
            {statusLabel(s)}
          </option>
        ))}
      </select>
    </div>
  );
}