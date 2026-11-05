"use client";

import { useSyncExternalStore } from "react";
import type { Order } from "./orders";

/** A customer's review of one finished booking. Kept in localStorage for now: the backend will use a `reviews` table. */
export type Review = {
  id: string;
  orderId: string;
  tenantId: string;
  customerName: string;
  customerMobile: string; // used to match the review to its customer, never shown to other people
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
};

const KEY = "vehicle-service-platform.reviews";
export const MAX_COMMENT = 500;

/** A customer can review once the vehicle has been handed back (delivery OTP accepted) or the order is completed. */
const REVIEWABLE = ["delivery_otp_verified", "completed"];

const SEED: Review[] = [];
let state: Review[] = SEED;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

export function restoreReviews() {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    if (Array.isArray(saved)) {
      state = saved as Review[];
      emit();
    }
  } catch {}
}

export function useReviews() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => SEED,
  );
}

export const canReview = (order: Pick<Order, "status" | "tenantId">) =>
  !!order.tenantId && REVIEWABLE.includes(order.status);

export const reviewForOrder = (reviews: Review[], orderId: string) => reviews.find((r) => r.orderId === orderId);

/** Newest first. */
export const reviewsForTenant = (reviews: Review[], tenantId?: string) =>
  reviews.filter((r) => r.tenantId === tenantId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export function ratingStats(reviews: Review[]) {
  const count = reviews.length;
  const average = count ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10 : 0;
  return { count, average };
}

/** "Rahul Sharma" -> "Rahul S." Reviews are public, so the full name and the mobile number stay private. */
export function publicName(fullName: string) {
  const [first, ...rest] = fullName.trim().split(/\s+/).filter(Boolean);
  if (!first) return "Customer";
  const last = rest[rest.length - 1];
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

export function addReview(
  order: Order,
  rating: number,
  comment: string,
): { ok: true; review: Review } | { ok: false; error: string } {
  if (!order.tenantId || !canReview(order)) {
    return { ok: false, error: "You can review a service after your vehicle has been delivered." };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Please choose a rating from 1 to 5 stars." };
  }
  const text = comment.trim();
  if (text.length > MAX_COMMENT) return { ok: false, error: `Please keep your review under ${MAX_COMMENT} characters.` };
  if (state.some((r) => r.orderId === order.id)) {
    return { ok: false, error: "You have already reviewed this booking." };
  }
  const review: Review = {
    id: `RV${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    orderId: order.id,
    tenantId: order.tenantId,
    customerName: order.customer.name,
    customerMobile: order.customer.mobile,
    rating,
    comment: text,
    createdAt: new Date().toISOString(),
  };
  state = [review, ...state];
  persist();
  emit();
  return { ok: true, review };
}