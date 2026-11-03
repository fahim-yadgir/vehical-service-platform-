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
import { CheckCircle2, UserRound, ShieldCheck, Edit3, X, MapPin, KeyRound } from "lucide-react";

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Password change states
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordToast, setPasswordToast] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  
  const { vehicles } = useVehicles();
  const [profileData, setProfileData] = useState(defaultProfile);
  const [backup, setBackup] = useState(defaultProfile);
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

  const handleLocationChange = (newLocation: PickedLocation) => {
    setLocation(newLocation);
    setProfileData((prev) => ({
      ...prev,
      address: newLocation.address || prev.address,
      city: newLocation.city || prev.city,
      state: newLocation.state || prev.state,
      pincode: newLocation.pincode || prev.pincode,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (location?.address === "Finding address...") return;
    saveProfile(profileData);
    if (location) saveLocation(location);
    setBackup(profileData);
    setLocBackup(location);
    setIsEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    // Simulate successful password update
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setIsChangingPassword(false);
    
    // Show toast popup
    setPasswordToast(true);
    setTimeout(() => {
      setPasswordToast(false);
    }, 3000);
  };

  return (
    <>
      <Topbar title="Profile" subtitle="Manage your personal details and preferences" />
      <div className="container py-6 md:!pl-6 relative">
        
        {/* Toast Popup for Password Change */}
        <div
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-slate-900 px-5 py-4 text-white shadow-xl transition-all duration-300 ${
            passwordToast ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
          }`}
        >
          <div className="grid size-8 place-items-center rounded-full bg-emerald-500 text-white">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Security</p>
            <p className="text-sm font-semibold text-white">Password changed successfully!</p>
          </div>
        </div>

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
            
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">
                Personal Information
              </h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <Input
                  type="text"
                  maxLength={32}
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
                  maxLength={40}
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
              </div>
            </div>

            {/* Address Details Section */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">
                Address Details
              </h3>
              
              <div className="space-y-4">
                <Input
                  maxLength={120}
                  label="Street Address / Flat / Building"
                  value={profileData.address}
                  placeholder="e.g. Flat 402, Sunrise Apartments"
                  onChange={(e) => handleChange("address", e.target.value)}
                  disabled={!isEditing}
                />
                
                <div className="grid gap-4 sm:grid-cols-3">
                  <Input
                    maxLength={40}
                    label="City"
                    value={profileData.city || ""}
                    placeholder="City"
                    onChange={(e) => handleChange("city", e.target.value)}
                    disabled={!isEditing}
                  />
                  <Input
                    maxLength={40}
                    label="State"
                    value={profileData.state || ""}
                    placeholder="State"
                    onChange={(e) => handleChange("state", e.target.value)}
                    disabled={!isEditing}
                  />
                  <Input
                    label="Pincode"
                    value={profileData.pincode || ""}
                    placeholder="Pincode"
                    maxLength={10}
                    onChange={(e) => handleChange("pincode", e.target.value.replace(/\D/g, ""))}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-sm font-bold text-slate-700">Map location</p>
                {isEditing ? (
                  <LocationPicker value={location} onChange={handleLocationChange} height={260} />
                ) : (
                  <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-orange-500" />
                    {location?.address ?? "No location set"}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-400">Select location on map to auto-fill address, city, state and pincode.</p>
              </div>
            </div>

            {/* Save Button */}
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

          {/* Change Password Section */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Security Settings
                </h3>
                <p className="text-sm font-bold text-slate-800 mt-0.5">Password</p>
              </div>
              {!isChangingPassword && (
                <button
                  type="button"
                  onClick={() => setIsChangingPassword(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  <KeyRound size={15} /> Change Password
                </button>
              )}
            </div>

            {isChangingPassword && (
              <form onSubmit={handlePasswordChange} className="mt-4 space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                {passwordError && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">
                    {passwordError}
                  </div>
                )}
                <Input
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <Input
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordError("");
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <Button type="submit">
                    Update Password
                  </Button>
                </div>
              </form>
            )}
          </div>

        </div>
      </div>
    </>
  );
}