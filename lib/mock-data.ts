export const vehicles = [
  {
    id: "V001",
    brand: "Honda",
    model: "City",
    registration: "MH12AB1234",
    type: "Car",
    year: 2023,
    lastService: "18 Sep 2026",
    chassisNo: "MA3EYA3S100123456",
    engineNo: "L15B7-9876543",
  },
  {
    id: "V002",
    brand: "TVS",
    model: "Ntorq",
    registration: "MH12XY9876",
    type: "Scooter",
    year: 2022,
    lastService: "04 Aug 2026",
    chassisNo: "MD623456789012345",
    engineNo: "RT-FI-5432109",
  },
];

export const bookings = [
  {
    id: "BK1001",
    vehicle: "Honda City",
    service: "Full Service",
    centre: "AutoCare Pune",
    status: "repair_in_progress",
    amount: "₹4,800",
    date: "08 Oct 2026",
    progress: 68,
  },
  {
    id: "BK1002",
    vehicle: "TVS Ntorq",
    service: "Oil Change",
    centre: "Speed Motors",
    status: "completed",
    amount: "₹1,200",
    date: "22 Sep 2026",
    progress: 100,
  },
];

export const centres = [
  {
    name: "AutoCare Pune",
    rating: 4.7,
    distance: "2.1 km",
    address: "Viman Nagar, Pune",
    slots: "4 slots",
  },
  {
    name: "Speed Motors",
    rating: 4.5,
    distance: "3.4 km",
    address: "Kalyani Nagar, Pune",
    slots: "7 slots",
  },
  {
    name: "Prime Auto",
    rating: 4.8,
    distance: "4.2 km",
    address: "Kharadi, Pune",
    slots: "2 slots",
  },
];
export const tenants = [
  {
    id: "TEN001",
    name: "AutoCare Pune",
    owner: "Rahul Patil",
    status: "Active",
    plan: "1 Year",
    users: 42,
    createdAt: "2025-06-10",
    subscriptionExpiresAt: "2027-06-10",
  },
  {
    id: "TEN002",
    name: "Speed Motors",
    owner: "Amit Shah",
    status: "Active",
    plan: "6 Months",
    users: 28,
    createdAt: "2026-10-05",
    subscriptionExpiresAt: "2026-10-28",
  },
  {
    id: "TEN003",
    name: "Prime Auto",
    owner: "Sameer Khan",
    status: "Suspended",
    plan: "1 Month",
    users: 11,
    createdAt: "2026-07-01",
    subscriptionExpiresAt: "2026-10-10",
  },
];
export const jobCards = [
  {
    id: "JC001",
    booking: "BK1001",
    customer: "Fahim Yadgir",
    vehicle: "Honda City",
    status: "in_progress",
    estimate: "₹4,800",
  },
  {
    id: "JC002",
    booking: "BK1004",
    customer: "Ayesha Khan",
    vehicle: "Hyundai i20",
    status: "waiting_approval",
    estimate: "₹7,250",
  },
];
export const revenue = [
  { month: "May", value: 11.2 },
  { month: "Jun", value: 13.8 },
  { month: "Jul", value: 15.1 },
  { month: "Aug", value: 16.4 },
  { month: "Sep", value: 18.2 },
  { month: "Oct", value: 20.1 },
];
export const team = [
  { name: "Aarav Mehta", role: "Service Advisor", status: "Online", jobs: 18 },
  { name: "Riya Sharma", role: "Mechanic Lead", status: "Busy", jobs: 14 },
  { name: "Vikram Singh", role: "Pickup Driver", status: "Online", jobs: 9 },
  { name: "Neha Khan", role: "Mechanic", status: "Offline", jobs: 12 },
];
