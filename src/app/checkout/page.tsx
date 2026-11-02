"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Seat3DItem, useBookingStore } from "@/store/useBookingStore";
import {
  CreditCard,
  ShieldCheck,
  Tag,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const showId = searchParams.get("showId") || "show-chronos-imax-1930";
  const seatParam = searchParams.get("seats") || "";

  const { selectedSeatIds, clearSelection } = useBookingStore();

  const [showMeta, setShowMeta] = useState<{
    movieTitle: string;
    posterUrl: string;
    cinemaName: string;
    auditoriumName: string;
    startTime: string;
  } | null>(null);
  const [seats, setSeats] = useState<Seat3DItem[]>([]);

  const [customerName, setCustomerName] = useState("Julian Vance");
  const [customerEmail, setCustomerEmail] = useState("guest@cineverse.io");
  const [customerPhone, setCustomerPhone] = useState("+1 (415) 890-3321");
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscountPercent, setAppliedDiscountPercent] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");

  const [paymentOutcome, setPaymentOutcome] = useState<
    "SUCCEEDED" | "FAILED" | "CANCELLED"
  >("SUCCEEDED");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/shows/${showId}/seats`)
      .then((res) => res.json())
      .then((data) => {
        if (data.meta) setShowMeta(data.meta);
        if (data.seats) setSeats(data.seats);
      });
  }, [showId]);

  const effectiveSeatIds =
    seatParam.split(",").filter(Boolean).length > 0
      ? seatParam.split(",").filter(Boolean)
      : selectedSeatIds;

  const chosenSeats = seats.filter((s) => effectiveSeatIds.includes(s.seatId));
  const subtotal = chosenSeats.reduce((sum, s) => sum + Number(s.price), 0);
  const discountAmount = Number(((subtotal * appliedDiscountPercent) / 100).toFixed(2));
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = Number((discountedSubtotal * 0.085).toFixed(2));
  const bookingFee = Number((chosenSeats.length * 1.75).toFixed(2));
  const finalTotal = Number((discountedSubtotal + taxAmount + bookingFee).toFixed(2));

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (code === "CINEVERSE20") {
      setAppliedDiscountPercent(20);
      setCouponMessage("20% CINEVERSE20 discount applied!");
    } else if (code === "IMAXVIP10") {
      setAppliedDiscountPercent(10);
      setCouponMessage("10% IMAXVIP10 discount applied!");
    } else {
      setAppliedDiscountPercent(0);
      setCouponMessage("Invalid code. Try CINEVERSE20 or IMAXVIP10.");
    }
  };

  const handleCompleteBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (chosenSeats.length === 0) {
      setErrorMsg("No seats selected. Please return to the 3D auditorium.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showId,
          seatIds: effectiveSeatIds,
          customerName,
          customerEmail,
          customerPhone,
          couponCode: appliedDiscountPercent > 0 ? couponCode.trim().toUpperCase() : undefined,
          paymentOutcome,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(
          typeof data.error === "string"
            ? data.error
            : "Payment verification failed. Seats have been released."
        );
        setSubmitting(false);
        return;
      }

      clearSelection();
      router.push(`/tickets/${data.ticket.id}`);
    } catch {
      setErrorMsg("Network error while processing payment.");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/shows/${showId}/book`}
          className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to 3D Seat Selection
        </Link>
        <span className="text-xs px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
          Temporary Seat Lock Active (10:00 TTL)
        </span>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Customer & Payment Form */}
        <form onSubmit={handleCompleteBooking} className="lg:col-span-7 space-y-6">
          <div className="bg-cinema-charcoal border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">1. Customer Details</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Email Address (For Digital QR Ticket Delivery)
              </label>
              <input
                type="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-sm text-white"
              />
            </div>
          </div>

          {/* Configurable Stripe Payment Gateway Section */}
          <div className="bg-cinema-charcoal border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-cinema-gold" />
                2. Payment Gateway (Stripe Integration)
              </h2>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Server-Verified
              </span>
            </div>

            <div className="grid sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPaymentOutcome("SUCCEEDED")}
                className={`p-3 rounded-xl border text-left transition ${
                  paymentOutcome === "SUCCEEDED"
                    ? "bg-emerald-500/20 border-emerald-500 text-white"
                    : "bg-black/40 border-white/10 text-gray-400"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> Authorize Payment
                </div>
                <div className="text-[11px] mt-1">
                  Simulates verified Stripe payment success & issues QR ticket
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentOutcome("FAILED")}
                className={`p-3 rounded-xl border text-left transition ${
                  paymentOutcome === "FAILED"
                    ? "bg-red-500/20 border-red-500 text-white"
                    : "bg-black/40 border-white/10 text-gray-400"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                  <XCircle className="w-4 h-4" /> Simulate Declined Card
                </div>
                <div className="text-[11px] mt-1">
                  Tests server rollback & automatic seat lock release
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentOutcome("CANCELLED")}
                className={`p-3 rounded-xl border text-left transition ${
                  paymentOutcome === "CANCELLED"
                    ? "bg-amber-500/20 border-amber-500 text-white"
                    : "bg-black/40 border-white/10 text-gray-400"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <AlertTriangle className="w-4 h-4" /> Simulate Cancelled
                </div>
                <div className="text-[11px] mt-1">
                  Tests user cancellation & returns seats to available pool
                </div>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-xs text-red-200">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || chosenSeats.length === 0}
              className="w-full py-3.5 rounded-xl bg-cinema-crimson hover:bg-cinema-crimsonDark text-white font-bold text-sm shadow-crimson-glow disabled:opacity-40 transition"
            >
              {submitting
                ? "Verifying Payment & Generating QR Ticket..."
                : `Pay $${finalTotal.toFixed(2)} & Issue Digital QR Ticket`}
            </button>
          </div>
        </form>

        {/* Order & Seat Breakdown Summary */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-cinema-charcoal border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white border-b border-white/10 pb-3">
              Booking Summary
            </h3>

            {showMeta && (
              <div className="flex gap-4">
                <img
                  src={showMeta.posterUrl}
                  alt={showMeta.movieTitle}
                  className="w-20 h-28 object-cover rounded-xl border border-white/10"
                />
                <div className="space-y-1 text-xs">
                  <div className="text-base font-bold text-white">{showMeta.movieTitle}</div>
                  <div className="text-cinema-gold font-medium">{showMeta.cinemaName}</div>
                  <div className="text-gray-300">{showMeta.auditoriumName}</div>
                  <div className="text-gray-400">
                    {new Date(showMeta.startTime).toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* Selected Seats Table */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="text-xs font-semibold text-gray-400 uppercase">
                Selected 3D Seats ({chosenSeats.length})
              </div>
              {chosenSeats.map((s) => (
                <div
                  key={s.seatId}
                  className="flex items-center justify-between text-xs bg-black/40 px-3 py-2 rounded-lg"
                >
                  <span>
                    Row <strong>{s.rowLabel}</strong>, Seat <strong>{s.seatNumber}</strong>{" "}
                    <span className="text-cinema-gold">({s.category})</span>
                  </span>
                  <span className="font-mono font-bold">${Number(s.price).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Discount Code Input */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-cinema-gold" /> Promo / Discount Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Try CINEVERSE20"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-xs text-white uppercase"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="px-4 py-2 rounded-lg bg-cinema-slate hover:bg-white/15 text-xs font-bold text-cinema-gold"
                >
                  Apply
                </button>
              </div>
              {couponMessage && (
                <div className="text-[11px] text-cinema-gold">{couponMessage}</div>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="pt-3 border-t border-white/10 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-300">
                <span>Tickets Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount ({appliedDiscountPercent}% Off)</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-400">
                <span>Entertainment Tax (8.5%)</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>3D Reservation & Service Fee</span>
                <span>${bookingFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-white/10">
                <span>Final Payable Total</span>
                <span className="text-cinema-gold">${finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-cinema-obsidian text-white">
      <Navbar />
      <Suspense fallback={<div className="p-12 text-center">Loading checkout...</div>}>
        <CheckoutContent />
      </Suspense>
    </div>
  );
}
