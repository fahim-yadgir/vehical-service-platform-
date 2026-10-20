"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

import Input from "../../components/ui/Input";
import PasswordInput from "../../components/ui/PasswordInput";
import Button from "../../components/ui/Button";
import LocationPicker, { type PickedLocation } from "../../components/map/LocationPicker";
import { isEmail, isMobile } from "../../lib/validators";

const addressLabels = ["Home", "Office", "Other"] as const;
const stepTitles = ["Your details", "Your address", "Verify mobile"];

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Mandatory
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  // Optional
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  // Address
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [house, setHouse] = useState("");
  const [label, setLabel] = useState<(typeof addressLabels)[number]>("Home");
  // OTP
  const [otp, setOtp] = useState("");

  function next(e: React.FormEvent) {
    e.preventDefault();

    if (step === 1) {
      if (name.trim().length < 2) return setError("Enter your full name.");
      if (!isMobile(mobile)) return setError("Enter a valid 10-digit mobile number.");
      if (password.length < 6) return setError("Password must be at least 6 characters.");
      if (email && !isEmail(email)) return setError("Enter a valid email address or leave it empty.");
      if (age && (Number(age) < 14 || Number(age) > 100)) return setError("Enter a valid age.");
      setError("");
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!location || location.address === "Finding address...") {
        return setError("Select your address on the map.");
      }
      if (house.trim().length < 2) return setError("Enter your house / flat / building details.");
      setError("");
      setStep(3);
      return;
    }

    if (otp.length !== 6) return setError("Enter the 6-digit OTP.");
    setError("");
    setLoading(true);
    // Demo only: the backend will verify the OTP and create the account.
    setTimeout(() => {
      setLoading(false);
      setDone(true);
    }, 700);
  }

  return (
    <main className="mesh min-h-screen">
      <div className="container flex min-h-screen items-center justify-center">
        <div className="card w-full max-w-2xl p-7 sm:p-10">
          {done ? (
            <div className="text-center">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={34} />
              </div>
              <h1 className="mt-5 text-2xl font-black">Account created</h1>
              <p className="muted mx-auto mt-2 max-w-md text-sm">
                Welcome, {name.split(" ")[0]}! Sign in to book your first service.
              </p>
              <Button className="mt-7" onClick={() => router.push("/login")}>
                Go to login <ArrowRight size={17} />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                {step === 1 ? (
                  <Link href="/login" className="btn btn-secondary">
                    <ArrowLeft size={16} />
                    Back
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setError("");
                      setStep(step - 1);
                    }}
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                )}
                <span className="text-xs font-black uppercase tracking-widest text-orange-500">
                  Step {step} / 3 · {stepTitles[step - 1]}
                </span>
              </div>

              <div className="mt-5 flex gap-2" aria-hidden>
                {[1, 2, 3].map((n) => (
                  <span
                    key={n}
                    className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-orange-500" : "bg-slate-200"}`}
                  />
                ))}
              </div>

              <h1 className="mt-7 text-3xl font-black">Create your AutoServe account</h1>

              <form onSubmit={next} noValidate>
                {step === 1 && (
                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <Input
                      required
                      label="Full name *"
                      placeholder="Your name"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <Input
                      required
                      label="Mobile number *"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      autoComplete="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                    />
                    <div className="sm:col-span-2">
                      <PasswordInput
                        required
                        label="Create password *"
                        placeholder="At least 6 characters"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>

                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 sm:col-span-2">
                      Optional
                    </p>

                    <Input
                      label="Age"
                      type="number"
                      min={14}
                      max={100}
                      placeholder="e.g. 28"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                    <label className="block space-y-2">
                      <span className="text-sm font-bold text-slate-700">Gender</span>
                      <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
                        <option value="">Prefer not to say</option>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </label>
                    <div className="sm:col-span-2">
                      <Input
                        label="Email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="mt-7 space-y-5">
                    <p className="muted text-sm">
                      Set your location so we can show workshops near you and arrange pickup.
                    </p>

                    <LocationPicker value={location} onChange={setLocation} />

                    <Input
                      required
                      label="House / flat / building *"
                      placeholder="e.g. Flat 402, Sunrise Apartments"
                      value={house}
                      onChange={(e) => setHouse(e.target.value)}
                    />

                    <div className="space-y-2">
                      <span className="text-sm font-bold text-slate-700">Save as</span>
                      <div className="flex gap-2">
                        {addressLabels.map((item) => (
                          <button
                            key={item}
                            type="button"
                            aria-pressed={label === item}
                            onClick={() => setLabel(item)}
                            className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                              label === item
                                ? "border-orange-300 bg-orange-50 text-orange-700"
                                : "border-slate-200 bg-white text-slate-600 hover:border-orange-200"
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="mt-8 text-center">
                    <p className="muted text-sm">
                      We sent a 6-digit OTP to <b className="text-slate-700">+91 {mobile}</b>
                    </p>
                    <input
                      inputMode="numeric"
                      maxLength={6}
                      autoFocus
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="• • • • • •"
                      aria-label="OTP"
                      className="input mx-auto mt-5 max-w-xs text-center text-2xl font-black tracking-[0.5em]"
                    />
                    <p className="mt-3 text-xs text-slate-400">Demo only: enter any 6 digits.</p>
                  </div>
                )}

                {error && (
                  <p role="alert" className="mt-5 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {error}
                  </p>
                )}

                <div className="mt-8 flex justify-end">
                  <Button type="submit" loading={loading}>
                    {step === 3 ? "Verify & create account" : "Continue"}
                    <ArrowRight size={17} />
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}