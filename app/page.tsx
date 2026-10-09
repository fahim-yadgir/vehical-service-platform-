import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-3xl text-center">
        <div className="mb-6 inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-600">
          Vehicle Service Platform
        </div>

        <h1 className="text-5xl font-bold tracking-tight text-slate-900 md:text-7xl">
          Smart Vehicle
          <span className="block text-orange-500">
            Service Management
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          Manage vehicle servicing, bookings, service centres, job cards,
          invoices and business operations from one modern platform.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/login"
            className="rounded-xl bg-orange-500 px-7 py-3.5 font-semibold text-white shadow-lg shadow-orange-200 transition duration-300 hover:-translate-y-1 hover:bg-orange-600 hover:shadow-xl"
          >
            Get Started
          </Link>

          <Link
            href="/customer/dashboard"
            className="rounded-xl border border-slate-200 bg-white px-7 py-3.5 font-semibold text-slate-700 transition duration-300 hover:-translate-y-1 hover:border-orange-300 hover:text-orange-600"
          >
            Customer Demo
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            ["01", "Easy Booking"],
            ["02", "Live Tracking"],
            ["03", "Smart Management"],
          ].map(([number, title]) => (
            <div
              key={number}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-left transition duration-300 hover:-translate-y-2 hover:border-orange-200 hover:bg-orange-50"
            >
              <span className="text-sm font-bold text-orange-500">
                {number}
              </span>
              <h2 className="mt-2 font-semibold text-slate-900">{title}</h2>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}