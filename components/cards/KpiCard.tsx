"use client";

import {
  Car,
  Clock,
  MapPin,
  Wallet,
  IndianRupee,
  CalendarDays,
  Star,
  Users,
  CheckCircle2,
  Building2,
  Activity,
  Receipt,
} from "lucide-react";

type KpiCardProps = {
  icon:
    | "car"
    | "clock"
    | "map"
    | "wallet"
    | "rupee"
    | "calendar"
    | "star"
    | "users"
    | "check"
    | "building"
    | "activity"
    | "receipt";

  label: string;
  value: string | number;
  change?: string;
};

const icons = {
  car: Car,
  clock: Clock,
  map: MapPin,
  wallet: Wallet,
  rupee: IndianRupee,
  calendar: CalendarDays,
  star: Star,
  users: Users,
  check: CheckCircle2,
  building: Building2,
  activity: Activity,
  receipt: Receipt,
};

export default function KpiCard({
  icon,
  label,
  value,
  change,
}: KpiCardProps) {
  const Icon = icons[icon];

  return (
    <div className="card p-5 transition duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>

          <p className="mt-2 text-2xl font-black text-slate-900">
            {value}
          </p>

          {change && (
            <p className="mt-2 text-xs font-medium text-orange-500">
              {change}
            </p>
          )}
        </div>

        <div className="flex size-11 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
          <Icon size={21} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}