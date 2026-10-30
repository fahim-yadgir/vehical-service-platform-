import type { Order } from "./orders";

// Har tab = ek ya zyada order statuses. `statuses` na ho to "saare orders".
export const orderTabs: { value: string; label: string; statuses?: string[] }[] = [
  { value: "all", label: "All" },
  { value: "pickup", label: "New & pickup", statuses: ["pending", "driver_assigned", "pickup_otp_verified", "in_transit"] },
  { value: "at_centre", label: "Reached at centre", statuses: ["at_centre"] },
  { value: "working", label: "Working", statuses: ["inspection", "repair_in_progress", "quality_check"] },
  { value: "delivery", label: "Delivery ready", statuses: ["ready_for_delivery", "delivery_otp_verified"] },
  { value: "completed", label: "Completed", statuses: ["completed"] },
  { value: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
];

export const inOrderTab = (o: Order, tab: string) => {
  const statuses = orderTabs.find((t) => t.value === tab)?.statuses;
  return !statuses || statuses.includes(o.status);
};