"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Ticket, QrCode, Calendar, MapPin } from "lucide-react";

interface BookingHistoryItem {
  id: string;
  referenceCode: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  status: string;
  seatLabels: string[];
  createdAt: string;
  movie?: { title: string; posterUrl: string };
  cinema?: { name: string };
  auditorium?: { name: string };
  show?: { id: string; startTime: string };
  ticket?: { id: string; ticketCode: string };
}

export default function CustomerBookingsPage() {
  const [bookings, setBookings] = useState<BookingHistoryItem[]>([]);

  useEffect(() => {
    fetch("/api/users/me/bookings")
      .then((res) => res.json())
      .then((d) => setBookings(d.bookings || []));
  }, []);

  return (
    <div className="min-h-screen bg-cinema-obsidian text-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <Ticket className="w-6 h-6 text-cinema-gold" />
              My Booking History & Digital QR Tickets
            </h1>
            <p className="text-xs text-gray-400">
              Access your confirmed seat reservations and verifiable QR passes
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="bg-cinema-charcoal border border-white/10 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                {b.movie?.posterUrl && (
                  <img
                    src={b.movie.posterUrl}
                    alt={b.movie.title}
                    className="w-16 h-24 object-cover rounded-xl border border-white/10"
                  />
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-cinema-gold font-bold">
                      {b.referenceCode}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.status === "CONFIRMED"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{b.movie?.title}</h3>
                  <div className="text-xs text-gray-400 flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-cinema-crimson" />
                      {b.cinema?.name} • {b.auditorium?.name}
                    </span>
                    {b.show && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-cinema-gold" />
                        {new Date(b.show.startTime).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white pt-1">
                    Seats: <strong className="text-cinema-gold">{b.seatLabels.join(", ")}</strong> •
                    Total: <strong>${Number(b.totalAmount).toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={`/tickets/${b.ticket?.id || b.id}`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cinema-crimson hover:bg-cinema-crimsonDark text-xs font-bold text-white shadow-crimson-glow transition"
                >
                  <QrCode className="w-4 h-4" />
                  Open QR Ticket
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
