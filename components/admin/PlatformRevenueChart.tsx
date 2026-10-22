"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatINR, formatINRShort } from "../../lib/revenue";

export default function PlatformRevenueChart({ data }: { data: { label: string; amount: number }[] }) {
  return (
    <div className="mt-4 h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%" debounce={150}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} />
          <YAxis axisLine={false} tickLine={false} tickFormatter={(v: number) => formatINRShort(v)} width={56} />
          <Tooltip formatter={(v) => formatINR(Number(v))} cursor={{ fill: "#fff7ed" }} />
          <Bar dataKey="amount" name="Revenue" fill="#f97316" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}