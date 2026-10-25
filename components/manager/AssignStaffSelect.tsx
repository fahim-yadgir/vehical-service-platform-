"use client";

import type { StaffMember } from "../../lib/redux-store";

export default function AssignStaffSelect({
  staff,
  value,
  disabled,
  onChange,
}: {
  staff: StaffMember[];
  value?: string;
  disabled?: boolean;
  onChange: (staffId: string) => void;
}) {
  // staff member removed or suspended after being assigned: keep showing the name
  const missing = value && !staff.some((m) => m.id === value);
  return (
    <select
      aria-label="Assign staff"
      className="input py-2 text-xs"
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => e.target.value && onChange(e.target.value)}
    >
      <option value="">Unassigned</option>
      {missing && <option value={value}>(no longer available)</option>}
      {staff.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}