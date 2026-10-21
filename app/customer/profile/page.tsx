"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Topbar from "../../../components/navbar/Topbar";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import LocationPicker, { type PickedLocation } from "../../../components/map/LocationPicker";
import { DEFAULT_LOCATION, loadLocation, saveLocation } from "../../../lib/customerLocation";
import { useVehicles } from "../../../lib/customerVehicles";
import { defaultProfile, loadProfile, saveProfile } from "../../../lib/customerProfile";
import { CheckCircle2, UserRound, ShieldCheck, Edit3, X, MapPin, Car, ChevronRight } from "lucide-react";


export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const { vehicles } = useVehicles();
  const [profileData, setProfileData] = useState(defaultProfile);
  const [backup, setBackup] = useState(defaultProfile);
  // Map location is the same one Dashboard and Service Centers use for "nearby".
  const [location, setLocation] = useState<PickedLocation | null>(DEFAULT_LOCATION);
  const [locBackup, setLocBackup] = useState<PickedLocation | null>(DEFAULT_LOCATION);

  useEffect(() => {
    const p = loadProfile();
    setProfileData(p);
    setBackup(p);
    const loc = loadLocation();
    if (loc) {
      setLocation(loc);
      setLocBackup(loc);
    }
  }, []);

  const startEdit = () => {
    setBackup(profileData);
    setLocBackup(location);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setProfileData(backup);
    setLocation(locBackup);
    setIsEditing(false);
  };

  const handleChange = (field: string, value: string) => {
    setProfileData({ ...profileData, [field]: value });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Future me yahan API/Database call aayegi check karne ke liye ki mobile/email already used hai ya nahi
    if (location?.address === "Finding address...") return;
    saveProfile(profileData);
    if (location) saveLocation(location);
    setBackup(profileData);
    setLocBackup(location);
    setIsEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <Topbar title="Profile" subtitle="Manage your personal details and preferences" />
      <div className="container py-6 md:!pl-6">
        <div className="card mx-auto max-w-3xl p-6 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
          
          {/* Header Section */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-6">
            <div className="flex items-center gap-4">
              <div className="grid size-16 place-items-center rounded-2xl bg-slate-950 text-orange-400 text-xl font-black shadow-md">
                <UserRound size={28} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">{profileData.fullName}</h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                  <ShieldCheck size={14} className="text-emerald-500" /> Verified Customer Account
                </p>
              </div>
            </div>

            {/* Edit / Cancel Toggle Button */}
            {!isEditing ? (
              <button
                type="button"
                onClick={startEdit}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                <Edit3 size={15} /> Edit Profile
              </button>
            ) : (
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
              >
                <X size={15} /> Cancel
              </button>
            )}
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSave} className="mt-6 space-y-6">
            
            {/* Personal Info Grid */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">
                Personal Information
              </h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <Input
                  label="Full Name"
                  value={profileData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  disabled={!isEditing}
                  required
                />
                <Input
                  label="Mobile Number"
                  type="tel"
                  maxLength={10}
                  value={profileData.mobile}
                  onChange={(e) => handleChange("mobile", e.target.value.replace(/\D/g, ""))}
                  disabled={!isEditing}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  disabled={!isEditing}
                />
                <Input
                  label="Age"
                  type="number"
                  min={14}
                  max={100}
                  value={profileData.age}
                  onChange={(e) => handleChange("age", e.target.value)}
                  disabled={!isEditing}
                />
                <label className="block space-y-2">
                  <span className="text-sm font-bold text-slate-700">Gender</span>
                  <select
                    className={`w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-orange-500 focus:outline-none bg-white ${
                      !isEditing ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""
                    }`}
                    value={profileData.gender}
                    onChange={(e) => handleChange("gender", e.target.value)}
                    disabled={!isEditing}
                  >
                    <option value="">Prefer not to say</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
              </div>
            </div>

            {/* Address Details Section */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">
                Address
              </h3>
              <div>
                <Input
                  label="Flat / House / Building no."
                  value={profileData.address}
                  placeholder="e.g. Flat 402, Sunrise Apartments"
                  onChange={(e) => handleChange("address", e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="mt-5">
                <p className="mb-2 text-sm font-bold text-slate-700">Map location</p>
                {isEditing ? (
                  <LocationPicker value={location} onChange={setLocation} height={260} />
                ) : (
                  <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-orange-500" />
                    {location?.address ?? "No location set"}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-400">Used to show service centers near you on Dashboard and Service Centers.</p>
              </div>
            </div>

            {/* Save Button & Status Message (Only visible when editing) */}
            <div className="mt-8 flex items-center justify-between pt-4 border-t border-slate-100">
              <span
                className={`text-sm font-bold text-emerald-600 transition flex items-center gap-1.5 ${
                  saved ? "opacity-100" : "opacity-0"
                }`}
              >
                <CheckCircle2 size={16} /> Changes saved successfully!
              </span>

              {isEditing ? (
                <div className="flex gap-3">
                  <Button type="submit">
                    Save Changes
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-medium">Click "Edit Profile" to modify your details.</p>
              )}
            </div>

          </form>
        </div>

        <Link
          href="/customer/vehicles"
          className="card mx-auto mt-5 flex max-w-3xl items-center justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <span className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-orange-50 text-orange-500">
              <Car size={20} />
            </span>
            <span>
              <span className="block font-black text-slate-900">My Garage</span>
              <span className="block text-xs text-slate-500">
                {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"} · manage and view service history
              </span>
            </span>
          </span>
          <ChevronRight size={18} className="text-slate-400" />
        </Link>
      </div>
    </>
  );
}