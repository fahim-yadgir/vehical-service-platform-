import type { ServiceCenter } from "./serviceCenters";

export type VehicleKind = "Car" | "Bike";

export type Plan = {
  id: string;
  name: string;
  tagline: string;
  price: number;
  duration: string;
  warranty: string;
  includes: string[];
  popular?: boolean;
};

export type CenterReview = {
  id: string;
  name: string;
  rating: number;
  title: string;
  text: string;
  date: string;
  service: string;
  vehicle: string;
  verified: boolean;
  helpful: number;
  reply?: string;
};

export type CenterProfile = {
  about: string;
  since: number;
  vehiclesServiced: number;
  bays: number;
  staff: { total: number; advisors: number; mechanics: number; technicians: number; drivers: number; certifications: string[] };
  facilities: { name: string; icon: string; available: boolean }[];
  hours: { day: string; time: string }[];
  plans: Record<VehicleKind, Plan[]>;
  serviceCharges: { name: string; from: number }[];
  facilityCharges: { name: string; price: string; note?: string }[];
  aspects: { label: string; value: number }[];
  /** share of reviews per star, index 0 = 5 stars … index 4 = 1 star (sums to 100) */
  breakdown: number[];
  reviews: CenterReview[];
};

/* ---------- Mock details per center (replace with API data later) ---------- */

const extra: Record<
  string,
  {
    factor: number;
    about: string;
    since: number;
    serviced: number;
    bays: number;
    staff: [number, number, number, number]; // advisors, mechanics, technicians, drivers
    certs: string[];
    facilities: string[];
    sunday: string;
  }
> = {
  sc1: { factor: 1, about: "A trusted multi-brand garage in Viman Nagar known for on-time delivery and transparent estimates. Free pickup and drop within 8 km.", since: 2012, serviced: 48000, bays: 12, staff: [4, 14, 6, 5], certs: ["ASE-trained mechanics", "ISO 9001 certified"], facilities: ["lounge", "wifi", "pickup", "genuine", "insurance", "cashless", "wash"], sunday: "10:00 AM – 5:00 PM" },
  sc2: { factor: 0.92, about: "Family-run garage focusing on Maruti, Tata and Mahindra cars with quick turnaround for regular services.", since: 2015, serviced: 31000, bays: 8, staff: [3, 10, 4, 3], certs: ["Maruti-certified technicians"], facilities: ["lounge", "pickup", "genuine", "cashless", "wash"], sunday: "Closed" },
  sc3: { factor: 1.25, about: "Authorized Hyundai service center with factory-trained technicians, genuine parts and warranty-safe servicing.", since: 2009, serviced: 92000, bays: 20, staff: [8, 28, 14, 8], certs: ["Hyundai factory-trained", "Authorized dealer", "ISO 9001 certified"], facilities: ["lounge", "wifi", "pickup", "ev", "genuine", "insurance", "cashless", "wash"], sunday: "10:00 AM – 4:00 PM" },
  sc4: { factor: 1.2, about: "Authorized Honda service center in Wagholi. Walk-in service with a comfortable customer lounge.", since: 2014, serviced: 54000, bays: 14, staff: [5, 18, 8, 0], certs: ["Honda certified technicians", "Authorized dealer"], facilities: ["lounge", "wifi", "genuine", "insurance", "cashless"], sunday: "Closed" },
  sc5: { factor: 0.85, about: "Budget-friendly garage for quick jobs like oil change, tyres and battery replacement.", since: 2018, serviced: 12000, bays: 5, staff: [2, 6, 2, 2], certs: ["Local garage association member"], facilities: ["pickup", "cashless", "wash"], sunday: "11:00 AM – 4:00 PM" },
  sc6: { factor: 1.15, about: "Authorized Tata Motors service hub with EV-ready bays and certified technicians.", since: 2011, serviced: 67000, bays: 18, staff: [7, 24, 12, 6], certs: ["Tata Motors certified", "EV-trained technicians"], facilities: ["lounge", "wifi", "pickup", "ev", "genuine", "insurance", "cashless"], sunday: "10:00 AM – 4:00 PM" },
  sc7: { factor: 0.95, about: "Multi-brand workshop in Magarpatta serving the nearby residential community.", since: 2016, serviced: 22000, bays: 7, staff: [3, 9, 3, 3], certs: ["ASE-trained mechanics"], facilities: ["lounge", "wifi", "pickup", "genuine", "cashless", "wash"], sunday: "10:00 AM – 3:00 PM" },
  sc8: { factor: 1.1, about: "Authorized Maruti Suzuki center in Baner with express service and denting-painting facility.", since: 2013, serviced: 59000, bays: 16, staff: [6, 20, 9, 0], certs: ["Maruti Suzuki certified", "Authorized dealer"], facilities: ["lounge", "wifi", "genuine", "insurance", "cashless", "wash"], sunday: "Closed" },
};

const facilityCatalog = [
  { id: "lounge", name: "Waiting lounge", icon: "🛋️" },
  { id: "wifi", name: "Free WiFi", icon: "📶" },
  { id: "pickup", name: "Pickup & drop", icon: "🚚" },
  { id: "ev", name: "EV charging", icon: "🔌" },
  { id: "genuine", name: "Genuine parts", icon: "✅" },
  { id: "insurance", name: "Insurance claim support", icon: "🛡️" },
  { id: "cashless", name: "Cashless payments", icon: "💳" },
  { id: "wash", name: "Car wash", icon: "🚿" },
];

const baseServicePrice: Record<string, number> = {
  "Full Service": 4800, "Oil Change": 1200, "Car Wash": 500, "AC Repair": 1800,
  "Brake Service": 1500, "Tyres & Alignment": 900, "Battery": 3200, "Denting & Painting": 3500,
};

const round10 = (value: number) => Math.round(value / 10) * 10;

function buildPlans(factor: number): Record<VehicleKind, Plan[]> {
  const car = (price: number) => round10(price * factor);
  const bike = (price: number) => round10(price * factor);
  return {
    Car: [
      { id: "car-basic", name: "Basic", tagline: "Routine care", price: car(1999), duration: "3–4 hrs", warranty: "1 month / 1,000 km",
        includes: ["Engine oil & oil filter", "Exterior wash", "21-point inspection", "Tyre pressure check"] },
      { id: "car-standard", name: "Standard", tagline: "Most booked", price: car(3999), duration: "5–6 hrs", warranty: "3 months / 3,000 km", popular: true,
        includes: ["Everything in Basic", "Brake pad inspection", "AC performance check", "Battery health test", "40-point inspection"] },
      { id: "car-premium", name: "Premium", tagline: "Complete care", price: car(6499), duration: "1 day", warranty: "6 months / 6,000 km",
        includes: ["Everything in Standard", "Wheel alignment & balancing", "Coolant & brake fluid change", "Interior detailing", "Free pickup & drop"] },
    ],
    Bike: [
      { id: "bike-basic", name: "Basic", tagline: "Routine care", price: bike(599), duration: "1–2 hrs", warranty: "15 days",
        includes: ["Engine oil change", "Chain lubrication", "Brake check", "Tyre pressure check"] },
      { id: "bike-standard", name: "Standard", tagline: "Most booked", price: bike(1199), duration: "3 hrs", warranty: "1 month", popular: true,
        includes: ["Everything in Basic", "Air filter cleaning", "Spark plug check", "Battery test", "Wash"] },
      { id: "bike-premium", name: "Premium", tagline: "Complete care", price: bike(1999), duration: "5 hrs", warranty: "3 months",
        includes: ["Everything in Standard", "Carburettor / throttle body tune", "Brake pad replacement labour", "Full body polish"] },
    ],
  };
}

/** Rough star distribution from the average rating (interpolated between a 3.9 and a 4.8 centre). */
function buildBreakdown(rating: number): number[] {
  const low = [40, 28, 16, 9, 7];
  const high = [78, 15, 4, 2, 1];
  const t = Math.min(1, Math.max(0, (rating - 3.9) / 0.9));
  const raw = low.map((v, i) => v + (high[i] - v) * t);
  const total = raw.reduce((a, b) => a + b, 0);
  const pct = raw.map((v) => Math.round((v / total) * 100));
  pct[0] += 100 - pct.reduce((a, b) => a + b, 0);
  return pct;
}

const reviewNames = ["Rohit S.", "Neha K.", "Aman P.", "Sana M.", "Vivek J.", "Isha R.", "Dev T.", "Priya N.", "Karan B.", "Meera L."];

const reviewTemplates = [
  { rating: 5, title: "Excellent service, on time", text: "Booked for a full service and the car was ready exactly when they promised. The advisor explained every item on the estimate.", service: "Full Service", vehicle: "Hyundai i20", verified: true, helpful: 24, date: "14 Oct 2026" },
  { rating: 5, title: "Pickup and drop was smooth", text: "Driver arrived on time, shared the OTP, and the car came back washed. Very convenient for working people.", service: "Pickup & drop", vehicle: "Honda City", verified: true, helpful: 18, date: "09 Oct 2026" },
  { rating: 4, title: "Good work, fair pricing", text: "Prices matched the estimate. A small delay on a busy Saturday, but the quality of work was good.", service: "Oil Change", vehicle: "Maruti Swift", verified: true, helpful: 11, date: "28 Sep 2026" },
  { rating: 5, title: "Honest staff", text: "They told me the brake pads did not need replacing yet and saved me money. Will come back.", service: "Brake Service", vehicle: "Tata Nexon", verified: true, helpful: 31, date: "21 Sep 2026" },
  { rating: 3, title: "Okay experience", text: "Work was fine but I had to follow up twice for the invoice. Staff was polite though.", service: "AC Repair", vehicle: "Hyundai Creta", verified: false, helpful: 6, date: "12 Sep 2026" },
  { rating: 4, title: "Clean workshop, helpful team", text: "Waiting lounge was comfortable and they updated me during the service. Would like faster billing.", service: "Full Service", vehicle: "Kia Seltos", verified: true, helpful: 9, date: "30 Aug 2026" },
  { rating: 2, title: "Delayed by a day", text: "Car was promised in the evening but delivered the next morning. The work itself was fine.", service: "Denting & Painting", vehicle: "Maruti Baleno", verified: true, helpful: 14, date: "17 Aug 2026", reply: "Sorry for the delay. A paint-curing issue held up your car. We have added buffer time to our estimates since then." },
  { rating: 5, title: "Best for bikes too", text: "Got my scooter serviced in two hours. Chain, brakes and oil all done with a clear bill.", service: "Bike service", vehicle: "TVS Ntorq", verified: true, helpful: 7, date: "03 Aug 2026" },
];

const lowRatings = [4, 3, 5, 4, 2, 3, 4, 1];

function buildReviews(center: ServiceCenter): CenterReview[] {
  const offset = Number(center.id.replace(/\D/g, "")) || 0;
  const strong = center.rating >= 4.3;
  return reviewTemplates.map((t, i) => ({
    id: `${center.id}-r${i}`,
    name: reviewNames[(i + offset) % reviewNames.length],
    rating: strong ? t.rating : lowRatings[i],
    title: t.title,
    text: t.text,
    date: t.date,
    service: t.service,
    vehicle: t.vehicle,
    verified: t.verified,
    helpful: t.helpful + offset,
    reply: t.reply,
  }));
}

export function getCenterProfile(center: ServiceCenter): CenterProfile {
  const e = extra[center.id] ?? extra.sc1;
  const [advisors, mechanics, technicians, drivers] = e.staff;
  const r = center.rating;
  const clamp = (v: number) => Math.round(Math.min(5, Math.max(3, v)) * 10) / 10;

  return {
    about: e.about,
    since: e.since,
    vehiclesServiced: e.serviced,
    bays: e.bays,
    staff: { total: advisors + mechanics + technicians + drivers, advisors, mechanics, technicians, drivers, certifications: e.certs },
    facilities: facilityCatalog.map((f) => ({
      name: f.name,
      icon: f.icon,
      available: f.id === "pickup" ? center.pickupDrop : e.facilities.includes(f.id),
    })),
    hours: [
      ...["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => ({ day, time: center.hours })),
      { day: "Sunday", time: e.sunday },
    ],
    plans: buildPlans(e.factor),
    serviceCharges: center.services.map((name) => ({ name, from: round10((baseServicePrice[name] ?? 1000) * e.factor) })),
    facilityCharges: [
      center.pickupDrop
        ? { name: "Pickup & drop", price: "₹149", note: "Free on bookings above ₹3,000" }
        : { name: "Pickup & drop", price: "Not available" },
      { name: "Inspection / diagnosis", price: center.category === "Authorized Brand Center" ? "Free" : "₹199", note: "Adjusted in the final bill if you proceed" },
      { name: "Express service (same day)", price: "+20%", note: "Subject to bay availability" },
      center.pickupDrop
        ? { name: "Towing / roadside assistance", price: "₹799", note: "Within 10 km" }
        : { name: "Towing / roadside assistance", price: "Not available" },
      { name: "Car wash add-on", price: "₹299" },
      { name: "Waiting lounge", price: "Free" },
    ],
    aspects: [
      { label: "Quality of work", value: clamp(r + 0.1) },
      { label: "Pricing", value: clamp(r - 0.2) },
      { label: "Time taken", value: clamp(r - 0.1) },
      { label: "Staff behaviour", value: clamp(r + 0.05) },
      ...(center.pickupDrop ? [{ label: "Pickup & drop", value: clamp(r - 0.15) }] : []),
    ],
    breakdown: buildBreakdown(r),
    reviews: buildReviews(center),
  };
}

/* ---------- Opening hours helper ---------- */

function toMinutes(text: string) {
  const match = text.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return hour * 60 + Number(match[2]);
}

/** Returns true / false, or null when the time text can't be read (e.g. "Closed"). */
export function isOpenAt(time: string, now: Date): boolean | null {
  if (/closed/i.test(time)) return false;
  const [from, to] = time.split(/[–-]/).map((part) => toMinutes(part));
  if (from == null || to == null) return null;
  const current = now.getHours() * 60 + now.getMinutes();
  return current >= from && current < to;
}