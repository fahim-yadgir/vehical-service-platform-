"use client";
import { useState } from "react";
import { Check, Copy, MessageCircle, X } from "lucide-react";

type Props = {
  owner: string;
  centre: string;
  mobile: string;
  password: string;
  trialDays?: number;
  /** "owner" (default): admin created a service centre. "staff": an owner added a team member. */
  variant?: "owner" | "staff";
  /** Staff only: the role given, e.g. "Manager". */
  staffRole?: string;
  /** Staff only: true when a new password was generated for an existing member. */
  reset?: boolean;
  onClose: () => void;
};

export default function WhatsAppCredentialsModal({ owner, centre, mobile, password, trialDays = 14, variant = "owner", staffRole, reset = false, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const message =
    variant === "staff"
      ? (reset
          ? `Hi ${owner}, your AutoServe password for "${centre}" has been reset.\n\n`
          : `Welcome to AutoServe, ${owner}! 🎉\n\nYou have been added as ${staffRole ?? "staff"} at "${centre}".\n\n`) +
        `Login mobile: ${mobile}\nTemporary password: ${password}\n\n` +
        `Please log in and change your password when asked.`
      : `Welcome to AutoServe, ${owner}! 🎉\n\n` +
        `Your service centre "${centre}" is now on AutoServe. Your ${trialDays}-day free trial has started.\n\n` +
        `Login mobile: ${mobile}\nTemporary password: ${password}\n\n` +
        `Please log in and change your password when asked. Then complete your centre profile (location, services and price list) so customers can find you.`;

  const link = `https://wa.me/91${mobile}?text=${encodeURIComponent(message)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-label="Send login details" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900">{variant === "staff" ? (reset ? "Password reset" : "Staff added") : "Tenant created"}</h3>
            <p className="mt-1 text-sm text-slate-500">Send the login details to {owner} on WhatsApp.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
          <div className="flex justify-between gap-3"><span className="text-slate-500">Mobile</span><b className="font-mono">{mobile}</b></div>
          <div className="mt-2 flex justify-between gap-3"><span className="text-slate-500">Temporary password</span><b className="font-mono">{password}</b></div>
        </div>

        <p className="mb-1 mt-4 text-xs font-black uppercase tracking-wider text-slate-400">Message preview</p>
        <pre className="whitespace-pre-wrap rounded-xl border border-emerald-100 bg-emerald-50 p-3 font-sans text-xs leading-relaxed text-slate-700">{message}</pre>

        <p className="mt-3 text-xs font-semibold text-amber-700">The password is shown only now. {variant === "staff" ? "They" : "The owner"} must change it on first login.</p>

        <div className="mt-5 flex flex-wrap gap-2">
          <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700" style={{ color: "#fff" }}>
            <MessageCircle size={17} /> Send on WhatsApp
          </a>
          <button type="button" onClick={copy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <button type="button" onClick={onClose} className="mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Done</button>
      </div>
    </div>
  );
}