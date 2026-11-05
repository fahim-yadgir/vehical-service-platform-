"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Stars, StarInput } from "./StarRating";
import { addReview, canReview, MAX_COMMENT, restoreReviews, reviewForOrder, useReviews } from "../../lib/reviews";
import type { Order } from "../../lib/orders";

/** Shown on a booking once the vehicle is delivered: the customer rates the service, once. */
export default function ReviewCard({ order }: { order: Order }) {
  const reviews = useReviews();
  const [ready, setReady] = useState(false); // wait for saved reviews, so a reviewed booking never flashes the form
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    restoreReviews();
    setReady(true);
  }, []);

  if (!ready) return null;

  const mine = reviewForOrder(reviews, order.id);
  if (mine) {
    return (
      <section className="card space-y-3 p-6">
        <h2 className="font-black text-slate-900">Your review</h2>
        <Stars value={mine.rating} size={22} />
        {mine.comment && <p className="whitespace-pre-line text-sm text-slate-700">{mine.comment}</p>}
        <p className="muted text-xs">Thank you for your feedback. It helps other customers choose a service centre.</p>
      </section>
    );
  }

  if (!canReview(order)) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = addReview(order, rating, comment);
    if (!result.ok) setError(result.error);
  };

  return (
    <section className="card space-y-4 border-amber-200 p-6">
      <div>
        <h2 className="font-black text-slate-900">How was your service?</h2>
        <p className="mt-1 text-sm text-slate-600">Your vehicle has been delivered. Rate your experience with this service centre.</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <StarInput
          value={rating}
          onChange={(value) => {
            setRating(value);
            setError("");
          }}
        />
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-slate-700">Tell us more (optional)</span>
          <textarea
            value={comment}
            maxLength={MAX_COMMENT}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="input w-full"
            placeholder="Was the vehicle returned on time? How was the work and the staff?"
          />
          <span className="muted mt-1 block text-right text-xs">
            {comment.length}/{MAX_COMMENT}
          </span>
        </label>
        {error && (
          <p role="alert" className="text-xs font-semibold text-rose-600">
            {error}
          </p>
        )}
        <button type="submit" disabled={rating === 0} className="btn btn-primary">
          Submit review
        </button>
      </form>
    </section>
  );
}