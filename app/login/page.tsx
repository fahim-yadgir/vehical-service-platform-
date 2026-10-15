"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Car,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

import {
  roleLabels,
  roleRoutes,
  roleDescriptions,
  saveSession,
  type Role,
} from "../../lib/auth";

const loginRoles: Role[] = [
  "customer",
  "manager",
  "owner",
];

export default function Login() {
  const router = useRouter();

  const [role, setRole] = useState<Role>("customer");
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    saveSession(role);

    setTimeout(() => {
      router.push(roleRoutes[role]);
    }, 500);
  };

  return (
    <main className="mesh min-h-screen">
      <div className="container grid min-h-screen items-center gap-10 lg:grid-cols-2">

        {/* LEFT SECTION */}
        <section className="hidden lg:block fade-up">

          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700">
            <Sparkles size={16} />
            Futuristic service workspace
          </div>

          <h1 className="text-6xl font-black leading-[.98] tracking-[-0.05em]">
            One platform.
            <br />

            <span className="text-orange-500">
              Three workspaces.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Choose your workspace to access your vehicle
            service management dashboard.
          </p>

          {/* ROLE CARDS */}
          <div className="mt-8 max-w-md space-y-3">

            {loginRoles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition duration-300 hover:-translate-y-1 ${
                  role === r
                    ? "border-orange-300 bg-orange-50 shadow-md"
                    : "border-slate-200 bg-white hover:border-orange-200"
                }`}
              >
                <p className="text-sm font-black text-slate-900">
                  {roleLabels[r]}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {roleDescriptions[r]}
                </p>
              </button>
            ))}

          </div>
        </section>

        {/* LOGIN SECTION */}
        <section className="fade-up-2">

          <div className="card mx-auto max-w-md p-7 sm:p-9">

            {/* LOGO */}
            <div className="mb-8 flex items-center gap-3">

              <div className="grid size-12 place-items-center rounded-2xl bg-slate-950 text-orange-400">
                <Car />
              </div>

              <div>
                <p className="font-black">
                  AutoServe
                </p>

                <p className="text-xs text-slate-400">
                  Service OS
                </p>
              </div>

            </div>

            {/* TITLE */}
            <h2 className="text-3xl font-black">
              Welcome back
            </h2>

            <p className="muted mt-1">
              Enter demo credentials and choose a workspace.
            </p>

            {/* LOGIN FORM */}
            <form
              onSubmit={submit}
              className="mt-7 space-y-4"
            >

              <Input
                required
                label="Email / Mobile"
                placeholder="you@example.com"
              />

              <Input
                required
                label="Password"
                type="password"
                placeholder="••••••••"
              />

              {/* ROLE SELECT */}
              <label className="block space-y-2">

                <span className="text-sm font-bold">
                  Workspace role
                </span>

                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as Role)
                  }
                  className="input"
                >
                  {loginRoles.map((r) => (
                    <option
                      key={r}
                      value={r}
                    >
                      {roleLabels[r]}
                    </option>
                  ))}
                </select>

              </label>

              {/* LOGIN BUTTON */}
              <Button
                type="submit"
                loading={loading}
                className="w-full"
              >
                Continue as {roleLabels[role]}
                <ArrowRight size={17} />
              </Button>

            </form>

            {/* DEMO MESSAGE */}
            <div className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">

              <ShieldCheck
                size={16}
                className="text-emerald-500"
              />

              <span>
                Demo authentication only. Backend auth will
                connect later.
              </span>

            </div>

            {/* REGISTER */}
            <p className="mt-6 text-center text-sm text-slate-500">

              New here?{" "}

              <Link
                className="font-bold text-orange-600 hover:text-orange-700"
                href="/register"
              >
                Create account
              </Link>

            </p>

          </div>

        </section>

      </div>
    </main>
  );
}