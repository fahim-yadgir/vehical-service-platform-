"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Car, ShieldCheck } from "lucide-react";

import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";

export default function AdminLogin() {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: mobile.trim(),
          password,
          portal: "admin",
        }),
      });
      const data = await res.json().catch(() => null)as { error?: string } | null;

      if (!res.ok) {
        setError(data?.error ?? "Login failed. Please try again.");
        setLoading(false);
        return;
      }

      window.location.href = "/admin/dashboard";
    } catch {
      setError("Network error. Please check your connection.");
      setLoading(false);
    }
  };

  return (
    <main className="mesh min-h-screen">
      <div className="container flex min-h-screen items-center justify-center px-6">
        <div className="card w-full max-w-md p-7 sm:p-9">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-slate-950 text-orange-400">
              <Car />
            </div>

            <div>
              <p className="font-black">AutoServe</p>
              <p className="text-xs text-slate-400">Platform Administration</p>
            </div>
          </div>

          <h1 className="text-3xl font-black text-slate-900">Platform Admin</h1>

          <p className="muted mt-1">
            Sign in to access the platform administration panel.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {error}
              </div>
            )}

            <Input
              inputMode="numeric"
              maxLength={10}
              required
              label="Mobile Number"
              type="tel"
              placeholder="Enter admin mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />

            <Input
              required
              label="Password"
              type="password"
              maxLength={32}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button type="submit" loading={loading} className="w-full">
              Admin Login
              <ArrowRight size={17} />
            </Button>
          </form>

          <div className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            <ShieldCheck size={16} className="shrink-0 text-emerald-500" />

            <span>Secure platform administration access.</span>
          </div>

          <Link
            href="/login"
            className="mt-6 block w-full text-center text-sm font-bold text-orange-600 hover:text-orange-700"
          >
            Back to normal login
          </Link>
        </div>
      </div>
    </main>
  );
}