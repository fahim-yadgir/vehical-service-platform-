import { Star } from "lucide-react";

/** Read-only stars. */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span role="img" aria-label={`${value} out of 5 stars`} className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          aria-hidden
          className={n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-slate-300"}
        />
      ))}
    </span>
  );
}

const WORDS = ["Poor", "Fair", "Good", "Very good", "Excellent"];

/** Tap a star to choose 1 to 5. */
export function StarInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Your rating" className="flex flex-wrap items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange(n)}
          className="rounded-lg p-1 transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400"
        >
          <Star size={34} aria-hidden className={n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
        </button>
      ))}
      {value > 0 && <span className="ml-2 text-sm font-bold text-slate-600">{WORDS[value - 1]}</span>}
    </div>
  );
}