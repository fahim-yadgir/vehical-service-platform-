"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Car, CheckCircle2, MapPin, ShieldCheck, Sparkles } from "lucide-react";

import Input from "../../components/ui/Input";
import PasswordInput from "../../components/ui/PasswordInput";
import Button from "../../components/ui/Button";

import { roleLabels, roleRoutes, saveSession, type Role } from "../../lib/auth";
import { clearAccountSession, findAccount, saveAccountSession, verifyPassword } from "../../lib/tenantAccounts";
import { resolveManagerLogin, resolveOwnerTenantId, saveOwnerTenantId } from "../../lib/ownerTenant";
import { isMobileOrEmail } from "../../lib/validators";

// Demo only: once the backend is connected the role will come from the API,
// and this list (plus the role selector below) can be removed.
const loginRoles: Role[] = ["customer", "manager", "owner"];

const highlights = [
  "Book service at garages near you",
  "Track your vehicle live, from pickup to delivery",
  "Pay and download invoices in one place",
];

export default function Login() {
  const router = useRouter();

  const [role, setRole] = useState<Role>("customer");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isMobileOrEmail(identifier)) {
      setError("Enter a valid 10-digit mobile number or email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setError("");
    setLoading(true);

    // A centre owner/manager created from the admin or My Staff pages has a saved login.
    // Its temporary password is checked here; the "set a new password" popup then opens inside the workspace.
    const account = findAccount(identifier);
    if (account && !(await verifyPassword(account, password))) {
      setLoading(false);
      setError("Incorrect mobile number or password.");
      return;
    }

    if (account?.role === "driver") {
      setLoading(false);
      setError("Driver accounts don't have a web workspace. Please use the driver app.");
      return;
    }

    // The saved account decides the role; demo logins use the role picked on this page.
    const signInRole: Role = account?.role ?? role;
    let tenantId: string | null = account?.tenantId ?? null;

    if (signInRole === "manager") {
      // Blocks suspended, admin-blocked and driver accounts.
      const result = resolveManagerLogin(identifier);
      if (result.error) {
        setLoading(false);
        setError(result.error);
        return;
      }
      tenantId ??= result.tenantId ?? null;
    }
    if (signInRole === "owner" && !tenantId) tenantId = resolveOwnerTenantId(identifier);

    saveSession(signInRole);
    // A demo login must not inherit the previous person's account, or their password popup would open.
    if (account) saveAccountSession(account.mobile);
    else clearAccountSession();
    // Remember the tenant so its trial/plan can be shown and enforced.
    if (tenantId) saveOwnerTenantId(tenantId);

    setTimeout(() => {
      router.push(roleRoutes[signInRole]);
    }, 500);
  };

  return (
    <main className="mesh min-h-screen">
      <div className="container grid min-h-screen items-center gap-10 lg:grid-cols-2">
        {/* LEFT SECTION */}
        <section className="fade-up hidden lg:block">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700">
            <Sparkles size={16} />
            Vehicle service, simplified
          </div>

          <h1 className="text-6xl font-black leading-[.98] tracking-[-0.05em]">
            Your vehicle.
            <br />
            <span className="text-orange-500">Serviced smarter.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Sign in to book, track and manage your vehicle service.
          </p>

          <ul className="mt-8 max-w-md space-y-3">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3 text-slate-700">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-10 inline-flex items-center gap-2 text-sm text-slate-500">
            <MapPin size={16} className="text-orange-500" />
            Workshops near you, just a tap away
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
                <p className="font-black">AutoServe</p>
                <p className="text-xs text-slate-400">Service OS</p>
              </div>
            </div>

            <h2 className="text-3xl font-black">Welcome back</h2>
            <p className="muted mt-1">Sign in with your mobile number or email.</p>

            <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
              <Input
                required
                label="Mobile number or email"
                placeholder="9876543210 or you@example.com"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />

              <div>
                <PasswordInput
                  required
                  label="Password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="mt-2 text-right">
                  <Link
                    href="/forgot-password"
                    className="text-xs font-bold text-orange-600 hover:text-orange-700"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {/* DEMO ROLE SELECT */}
              <div className="space-y-2">
                <span className="text-sm font-bold text-slate-700">Sign in as (demo)</span>
                <div className="grid grid-cols-3 gap-2">
                  {loginRoles.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      aria-pressed={role === r}
                      className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition ${
                        role === r
                          ? "border-orange-300 bg-orange-50 text-orange-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-orange-200"
                      }`}
                    >
                      {r === "manager" ? "Manager" : r === "owner" ? "Owner" : "Customer"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400">Opens the {roleLabels[role]} workspace.</p>
              </div>

              {error && (
                <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </p>
              )}

              <Button type="submit" loading={loading} className="w-full">
                Sign in
                <ArrowRight size={17} />
              </Button>
            </form>

            <div className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              <ShieldCheck size={16} className="shrink-0 text-emerald-500" />
              <span>Demo authentication only. Backend auth will connect later.</span>
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              New here?{" "}
              <Link className="font-bold text-orange-600 hover:text-orange-700" href="/register">
                Create account
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}