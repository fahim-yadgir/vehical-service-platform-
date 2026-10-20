import type { LatLng } from "./geo";

export type CenterCategory = "Authorized Brand Center" | "Multi-brand Garage";

export type ServiceCenter = {
  id: string;
  name: string;
  category: CenterCategory;
  brands: string[];
  services: string[];
  rating: number;
  reviewCount: number;
  location: LatLng;
  area: string;
  address: string;
  phone: string;
  hours: string;
  pickupDrop: boolean;
  offer?: string;
};

export const categories: CenterCategory[] = ["Authorized Brand Center", "Multi-brand Garage"];

export const serviceOptions = [
  "Full Service",
  "Oil Change",
  "Car Wash",
  "AC Repair",
  "Brake Service",
  "Tyres & Alignment",
  "Battery",
  "Denting & Painting",
];

/** Mock data. Replace with an API call once the backend is ready. */
export const serviceCenters: ServiceCenter[] = [
  {
    id: "sc1", name: "AutoCare Pune", category: "Multi-brand Garage",
    brands: ["Honda", "Hyundai", "Maruti", "TVS"],
    services: ["Full Service", "Oil Change", "Car Wash", "AC Repair", "Brake Service", "Tyres & Alignment", "Battery"],
    rating: 4.7, reviewCount: 612, location: { lat: 18.5587, lng: 73.9255 },
    area: "Viman Nagar", address: "Viman Nagar, Pune", phone: "+91 98220 11001",
    hours: "9:00 AM – 8:00 PM", pickupDrop: true, offer: "20% off on Full Service",
  },
  {
    id: "sc2", name: "Speed Motors", category: "Multi-brand Garage",
    brands: ["Maruti", "Tata", "Mahindra", "Bajaj"],
    services: ["Full Service", "Oil Change", "Car Wash", "Brake Service", "Tyres & Alignment", "Battery", "Denting & Painting"],
    rating: 4.5, reviewCount: 388, location: { lat: 18.5463, lng: 73.9022 },
    area: "Kalyani Nagar", address: "Kalyani Nagar, Pune", phone: "+91 98220 11002",
    hours: "8:30 AM – 7:30 PM", pickupDrop: true, offer: "Free car wash with oil change",
  },
  {
    id: "sc3", name: "Prime Auto Hyundai", category: "Authorized Brand Center",
    brands: ["Hyundai"],
    services: ["Full Service", "Oil Change", "AC Repair", "Brake Service", "Tyres & Alignment", "Battery", "Denting & Painting"],
    rating: 4.8, reviewCount: 904, location: { lat: 18.5515, lng: 73.9404 },
    area: "Kharadi", address: "Kharadi, Pune", phone: "+91 98220 11003",
    hours: "9:00 AM – 7:00 PM", pickupDrop: true, offer: "Free 40-point inspection",
  },
  {
    id: "sc4", name: "Honda Wagholi Service", category: "Authorized Brand Center",
    brands: ["Honda"],
    services: ["Full Service", "Oil Change", "AC Repair", "Brake Service", "Battery"],
    rating: 4.4, reviewCount: 521, location: { lat: 18.5808, lng: 73.9787 },
    area: "Wagholi", address: "Wagholi, Pune", phone: "+91 98220 11004",
    hours: "9:30 AM – 6:30 PM", pickupDrop: false,
  },
  {
    id: "sc5", name: "Shine & Fix Garage", category: "Multi-brand Garage",
    brands: ["All brands"],
    services: ["Oil Change", "Car Wash", "Tyres & Alignment", "Battery"],
    rating: 3.9, reviewCount: 143, location: { lat: 18.5362, lng: 73.8938 },
    area: "Koregaon Park", address: "Koregaon Park, Pune", phone: "+91 98220 11005",
    hours: "10:00 AM – 8:00 PM", pickupDrop: true, offer: "Flat ₹200 off on first booking",
  },
  {
    id: "sc6", name: "Tata Motors Service Hub", category: "Authorized Brand Center",
    brands: ["Tata"],
    services: ["Full Service", "Oil Change", "AC Repair", "Brake Service", "Tyres & Alignment", "Battery", "Denting & Painting"],
    rating: 4.6, reviewCount: 437, location: { lat: 18.6012, lng: 73.9013 },
    area: "Yerwada", address: "Yerwada, Pune", phone: "+91 98220 11006",
    hours: "9:00 AM – 7:00 PM", pickupDrop: true,
  },
  {
    id: "sc7", name: "Magarpatta Auto Works", category: "Multi-brand Garage",
    brands: ["Maruti", "Hyundai", "Renault", "Kia"],
    services: ["Full Service", "Oil Change", "Car Wash", "AC Repair", "Brake Service"],
    rating: 4.2, reviewCount: 256, location: { lat: 18.5167, lng: 73.9272 },
    area: "Magarpatta", address: "Magarpatta City, Hadapsar, Pune", phone: "+91 98220 11007",
    hours: "9:00 AM – 8:00 PM", pickupDrop: true,
  },
  {
    id: "sc8", name: "Maruti Suzuki Arena Baner", category: "Authorized Brand Center",
    brands: ["Maruti"],
    services: ["Full Service", "Oil Change", "Car Wash", "Brake Service", "Battery", "Denting & Painting"],
    rating: 4.3, reviewCount: 318, location: { lat: 18.5590, lng: 73.7868 },
    area: "Baner", address: "Baner, Pune", phone: "+91 98220 11008",
    hours: "9:00 AM – 7:00 PM", pickupDrop: false,
  },
];