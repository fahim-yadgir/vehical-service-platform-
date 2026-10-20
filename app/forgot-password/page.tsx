"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Car, MailCheck } from "lucide-react";

import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { isEmail, isMobile } from "../../lib/validators";

export default function ForgotPassword() {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (name.trim().length < 2) return setError("Enter your full name.");
    if (!isMobile(mobile)) return setError("Enter a valid 10-digit mobile number.");
    if (!isEmail(email)) return setError("Enter a valid email address.");

    setError("");
    setLoading(true);
    // Demo only: the backend will verify the details and email the reset link.
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 700);
  };

  return (
    <main className="mesh min-h-screen">
      <div className="container flex min-h-screen items-center justify-center">
        <div className="card w-full max-w-md p-7 sm:p-9">
          <Link
            href="/login"
            className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={16} />
            Back to login
          </Link>

          <div className="mb-6 flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-slate-950 text-orange-400">
              <Car />
            </div>
            <div>
              <p className="font-black">AutoServe</p>
              <p className="text-xs text-slate-400">Account recovery</p>
            </div>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                <MailCheck size={32} />
              </div>
              <h1 className="mt-5 text-2xl font-black">Check your email</h1>
              <p className="muted mt-2 text-sm">
                If the details match an account, a password reset link has been sent to{" "}
                <b className="text-slate-700">{email}</b>.
              </p>
              <p className="mt-2 text-xs text-slate-400">Demo only: no email is actually sent yet.</p>
              <Link href="/login" className="btn btn-primary mt-7 w-full">
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-black">Forgot password?</h1>
              <p className="muted mt-1">
                Enter your details and we&apos;ll email you a link to reset your password.
              </p>

              <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
                <Input
                  required
                  label="Full name"
                  placeholder="Your name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  required
                  label="Mobile number"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  autoComplete="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                />
                <Input
                  required
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                {error && (
                  <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {error}
                  </p>
                )}

                <Button type="submit" loading={loading} className="w-full">
                  Send reset link
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}