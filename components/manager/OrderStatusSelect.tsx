"use client";

import { nextStatuses, statusLabel } from "../../lib/orderOps";

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
  );
}