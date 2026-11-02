"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import {
  QrCode,
  Download,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  MapPin,
  Armchair,
} from "lucide-react";

interface TicketPageData {
  ticket: {
    id: string;
    ticketCode: string;
    qrSignature: string;
    qrDataUrl: string;
    seatLabels: string[];
    isUsed: boolean;
    verifiedAt?: string;
  };
  booking: {
    id: string;
    referenceCode: string;
    customerName: string;
    customerEmail: string;
    totalAmount: number;
    status: string;
  };
  movie: {
    title: string;
    posterUrl: string;
    durationMinutes: number;
    ageRating: string;
  };
  cinema: {
    name: string;
    city: string;
    address: string;
  };
  auditorium: {
    name: string;
  };
  show: {
    id: string;
    startTime: string;
  };
}

export default function DigitalTicketPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<TicketPageData | null>(null);
  const [verifyState, setVerifyState] = useState<{
    checked: boolean;
    valid?: boolean;
    message?: string;
  }>({ checked: false });
  const [emailDispatched, setEmailDispatched] = useState(false);

  useEffect(() => {
    fetch(`/api/tickets/${id}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.ticket) setData(d);
      });
  }, [id]);

  const handleVerifyQRBackend = async () => {
    if (!data) return;
    const res = await fetch(`/api/tickets/${data.ticket.id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrSignature: data.ticket.qrSignature }),
    });
    const result = await res.json();
    setVerifyState({
      checked: true,
      valid: result.valid,
      message: result.valid
        ? `HMAC-SHA256 Signature Verified at ${new Date(
            result.verifiedAt
          ).toLocaleTimeString()}`
        : result.reason,
    });
  };

  const handleDownloadTicket = () => {
    if (!data) return;
    const link = document.createElement("a");
    link.href = data.ticket.qrDataUrl;
    link.download = `${data.ticket.ticketCode}-QR.png`;
    link.click();
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-cinema-obsidian text-white">
        <Navbar />
        <div className="p-20 text-center text-gray-400">
          Generating cryptographic QR ticket...
        </div>
      </div>
    );
  }

  const { ticket, booking, movie, cinema, auditorium, show } = data;

  return (
    <div className="min-h-screen bg-cinema-obsidian text-white">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl px-6 py-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <div>
              <h1 className="text-base font-bold text-white">
                Booking Confirmed • Digital QR Ticket Issued
              </h1>
              <p className="text-xs text-gray-300">
                Reference: <strong className="text-cinema-gold">{booking.referenceCode}</strong> •
                Dispatched to {booking.customerEmail}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTicket}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cinema-charcoal border border-white/15 text-xs font-semibold hover:bg-white/10 transition"
            >
              <Download className="w-3.5 h-3.5 text-cinema-gold" /> Download QR
            </button>
            <button
              onClick={() => setEmailDispatched(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cinema-charcoal border border-white/15 text-xs font-semibold hover:bg-white/10 transition"
            >
              <Mail className="w-3.5 h-3.5 text-cinema-crimson" />{" "}
              {emailDispatched ? "Ticket Emailed ✓" : "Email Ticket"}
            </button>
          </div>
        </div>

        {/* Main Perforated Cinema Pass */}
        <div className="bg-cinema-charcoal border border-cinema-gold/40 rounded-3xl overflow-hidden shadow-gold-glow grid md:grid-cols-12">
          {/* Left Ticket Stub: Movie & Auditorium Info */}
          <div className="md:col-span-8 p-8 space-y-6 border-b md:border-b-0 md:border-r border-dashed border-white/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-widest text-cinema-gold font-bold">
                  CINEVERSE 3D ADMISSION PASS
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  {movie?.title}
                </h2>
              </div>
              <span className="px-3 py-1 rounded-lg bg-cinema-crimson text-xs font-bold">
                {movie?.ageRating}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-black/40 p-3.5 rounded-xl border border-white/5 space-y-1">
                <div className="text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-cinema-crimson" /> Cinema & Auditorium
                </div>
                <div className="font-bold text-white text-sm">{cinema?.name}</div>
                <div className="text-cinema-gold">{auditorium?.name}</div>
              </div>

              <div className="bg-black/40 p-3.5 rounded-xl border border-white/5 space-y-1">
                <div className="text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-cinema-gold" /> Show Date & Time
                </div>
                <div className="font-bold text-white text-sm">
                  {show ? new Date(show.startTime).toLocaleDateString() : ""}
                </div>
                <div className="text-cinema-gold">
                  {show
                    ? new Date(show.startTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </div>
              </div>
            </div>

            <div className="bg-black/50 p-4 rounded-2xl border border-cinema-gold/30 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[11px] text-gray-400 uppercase flex items-center gap-1">
                  <Armchair className="w-3.5 h-3.5 text-cinema-gold" /> Reserved 3D Seats
                </div>
                <div className="text-xl font-mono font-extrabold text-cinema-gold mt-0.5">
                  {ticket.seatLabels.join(", ")}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] text-gray-400 uppercase">Ticket Holder</div>
                <div className="text-sm font-bold text-white">{booking.customerName}</div>
                <div className="text-xs text-gray-400">
                  Total Paid: ${Number(booking.totalAmount).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400 pt-2">
              <span>Ticket ID: {ticket.ticketCode}</span>
              <Link
                href="/bookings"
                className="text-cinema-gold hover:underline font-semibold"
              >
                View All My Bookings →
              </Link>
            </div>
          </div>

          {/* Right Ticket Stub: Verifiable QR Code */}
          <div className="md:col-span-4 p-8 bg-black/50 flex flex-col items-center justify-center text-center space-y-4">
            <div className="bg-white p-3 rounded-2xl shadow-xl">
              <img
                src={ticket.qrDataUrl}
                alt={ticket.ticketCode}
                className="w-44 h-44 object-contain"
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs font-mono font-bold text-white">{ticket.ticketCode}</div>
              <p className="text-[11px] text-gray-400">
                Signed with HMAC-SHA256 • Present at Theatre Entrance
              </p>
            </div>

            <button
              onClick={handleVerifyQRBackend}
              className="w-full py-2.5 px-4 rounded-xl bg-cinema-slate hover:bg-cinema-gold hover:text-black border border-cinema-gold/40 text-xs font-bold text-cinema-gold flex items-center justify-center gap-1.5 transition"
            >
              <QrCode className="w-4 h-4" />
              Test Backend QR Verification
            </button>

            {verifyState.checked && (
              <div
                className={`p-2.5 rounded-xl text-[11px] border w-full ${
                  verifyState.valid
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    : "bg-red-500/20 border-red-500/40 text-red-300"
                }`}
              >
                <ShieldCheck className="w-4 h-4 inline mr-1" />
                {verifyState.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
