"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { AuditoriumConfigInput } from "@/lib/theatre-engine";
import {
  BarChart3,
  Film,
  Sliders,
  Ticket,
  Plus,
  RefreshCw,
  CheckCircle2,
  Eye,
  Trash2,
} from "lucide-react";

interface AdminAnalyticsPayload {
  metrics: {
    totalBookings: number;
    totalRevenue: number;
    activeMovies: number;
    upcomingShows: number;
    occupancyPercent: number;
    totalCustomers: number;
  };
  auditoriums: {
    id: string;
    cinemaId: string;
    name: string;
    totalCapacity: number;
    layout: AuditoriumConfigInput;
  }[];
  movies: {
    id: string;
    title: string;
    genres: string[];
    durationMinutes: number;
    status: string;
    ageRating: string;
  }[];
  shows: {
    id: string;
    movieId: string;
    auditoriumId: string;
    startTime: string;
    basePrice: number;
  }[];
  recentBookings: {
    id: string;
    referenceCode: string;
    customerName: string;
    customerEmail: string;
    totalAmount: number;
    status: string;
    seatLabels: string[];
    createdAt: string;
  }[];
}

export default function AdminStudioPage() {
  const [data, setData] = useState<AdminAnalyticsPayload | null>(null);
  const [activeTab, setActiveTab] = useState<
    "OVERVIEW" | "AUDITORIUM_ENGINE" | "MOVIES" | "BOOKINGS"
  >("AUDITORIUM_ENGINE");

  const [selectedAuditoriumId, setSelectedAuditoriumId] = useState("aud-imax-1");
  const [layoutForm, setLayoutForm] = useState<AuditoriumConfigInput | null>(null);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  // New Movie Form state
  const [newMovieTitle, setNewMovieTitle] = useState("");
  const [newMovieGenre, setNewMovieGenre] = useState("Sci-Fi");
  const [newMovieDuration, setNewMovieDuration] = useState(135);
  const [newMoviePoster, setNewMoviePoster] = useState(
    "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=900&q=80"
  );
  const [newMovieTrailer, setNewMovieTrailer] = useState(
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
  );

  const loadAnalytics = async () => {
    const res = await fetch("/api/admin/analytics");
    const d = await res.json();
    setData(d);
    const aud = d.auditoriums?.find(
      (a: { id: string }) => a.id === selectedAuditoriumId
    ) || d.auditoriums?.[0];
    if (aud && !layoutForm) {
      setLayoutForm(aud.layout);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleSelectAuditorium = (audId: string) => {
    setSelectedAuditoriumId(audId);
    const found = data?.auditoriums.find((a) => a.id === audId);
    if (found) {
      setLayoutForm({ ...found.layout });
    }
  };

  const handleSaveAuditoriumLayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!layoutForm) return;
    setSaveBanner(null);

    const res = await fetch(`/api/admin/auditoriums/${selectedAuditoriumId}/layout`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout: layoutForm }),
    });

    const result = await res.json();
    if (res.ok) {
      setSaveBanner(
        `Regenerated 3D Auditorium with ${result.totalSeatsGenerated} seats (${layoutForm.numRows} rows × ${layoutForm.seatsPerRow} seats/row).`
      );
      await loadAnalytics();
    }
  };

  const handleAddMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/movies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newMovieTitle,
        description:
          "Experience this theatrical release in full 3D seat perspective with synchronized auditorium acoustics.",
        genres: [newMovieGenre],
        durationMinutes: Number(newMovieDuration),
        releaseDate: "2026-11-15",
        language: "English",
        posterUrl: newMoviePoster,
        trailerUrl: newMovieTrailer,
      }),
    });
    if (res.ok) {
      setNewMovieTitle("");
      await loadAnalytics();
    }
  };

  const handleDeleteMovie = async (id: string) => {
    await fetch(`/api/admin/movies/${id}`, { method: "DELETE" });
    await loadAnalytics();
  };

  const handleRefundBooking = async (bookingId: string) => {
    await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CANCEL_AND_REFUND" }),
    });
    await loadAnalytics();
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-cinema-obsidian text-white">
        <Navbar />
        <div className="p-20 text-center text-gray-400">Loading Admin Studio...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cinema-obsidian text-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Top Metrics Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-cinema-gold font-bold">
              CINEVERSE ADMINISTRATION & 3D LAYOUT ENGINE
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Theatre Operations & Parametric 3D Studio
            </h1>
          </div>

          <div className="flex flex-wrap gap-2 bg-cinema-charcoal p-1.5 rounded-xl border border-white/10">
            {[
              { id: "AUDITORIUM_ENGINE", label: "3D Auditorium Layout Engine", icon: Sliders },
              { id: "OVERVIEW", label: "Revenue & Analytics", icon: BarChart3 },
              { id: "MOVIES", label: "Movie Management", icon: Film },
              { id: "BOOKINGS", label: "Bookings & Refunds", icon: Ticket },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as typeof activeTab)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                    activeTab === t.id
                      ? "bg-cinema-crimson text-white shadow-crimson-glow"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-cinema-charcoal border border-white/10 p-4 rounded-2xl">
            <div className="text-xs text-gray-400">Total Revenue</div>
            <div className="text-2xl font-extrabold text-cinema-gold mt-1">
              ${data.metrics.totalRevenue.toFixed(2)}
            </div>
          </div>
          <div className="bg-cinema-charcoal border border-white/10 p-4 rounded-2xl">
            <div className="text-xs text-gray-400">Confirmed Bookings</div>
            <div className="text-2xl font-extrabold text-white mt-1">
              {data.metrics.totalBookings}
            </div>
          </div>
          <div className="bg-cinema-charcoal border border-white/10 p-4 rounded-2xl">
            <div className="text-xs text-gray-400">Active Movies</div>
            <div className="text-2xl font-extrabold text-white mt-1">
              {data.metrics.activeMovies}
            </div>
          </div>
          <div className="bg-cinema-charcoal border border-white/10 p-4 rounded-2xl">
            <div className="text-xs text-gray-400">Scheduled Shows</div>
            <div className="text-2xl font-extrabold text-white mt-1">
              {data.metrics.upcomingShows}
            </div>
          </div>
          <div className="bg-cinema-charcoal border border-white/10 p-4 rounded-2xl">
            <div className="text-xs text-gray-400">Seat Occupancy</div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1">
              {data.metrics.occupancyPercent}%
            </div>
          </div>
        </div>

        {/* TAB 1: Parametric 3D Auditorium Configuration Engine */}
        {activeTab === "AUDITORIUM_ENGINE" && layoutForm && (
          <div className="bg-cinema-charcoal border border-cinema-gold/30 rounded-2xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Parametric 3D Theatre Configuration Engine
                </h2>
                <p className="text-xs text-gray-400">
                  Modify auditorium dimensions, screen size/elevation, rows, seats per row, and stadium rake. Saving dynamically rebuilds the 3D seat coordinates in the database.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedAuditoriumId}
                  onChange={(e) => handleSelectAuditorium(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-black border border-white/15 text-xs text-cinema-gold font-bold"
                >
                  {data.auditoriums.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.totalCapacity} seats)
                    </option>
                  ))}
                </select>

                <Link
                  href="/shows/show-chronos-imax-1930/book"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cinema-slate hover:bg-white/15 text-xs font-bold text-white border border-white/15"
                >
                  <Eye className="w-3.5 h-3.5 text-cinema-gold" /> Preview in 3D Theatre
                </Link>
              </div>
            </div>

            {saveBanner && (
              <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {saveBanner}
              </div>
            )}

            <form onSubmit={handleSaveAuditoriumLayout} className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Number of Rows (A–Z)
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={20}
                    value={layoutForm.numRows}
                    onChange={(e) =>
                      setLayoutForm({ ...layoutForm, numRows: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Seats Per Row</label>
                  <input
                    type="number"
                    min={6}
                    max={30}
                    value={layoutForm.seatsPerRow}
                    onChange={(e) =>
                      setLayoutForm({ ...layoutForm, seatsPerRow: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Screen Width (Meters)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={layoutForm.screenWidth}
                    onChange={(e) =>
                      setLayoutForm({ ...layoutForm, screenWidth: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Screen Height (Meters)
                  </label>
                  <input
                    type="number"
                    step="0.2"
                    value={layoutForm.screenHeight}
                    onChange={(e) =>
                      setLayoutForm({ ...layoutForm, screenHeight: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Auditorium Width (m)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={layoutForm.width}
                    onChange={(e) =>
                      setLayoutForm({ ...layoutForm, width: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Auditorium Length (m)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={layoutForm.length}
                    onChange={(e) =>
                      setLayoutForm({ ...layoutForm, length: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Row Spacing (Meters)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={layoutForm.rowSpacing}
                    onChange={(e) =>
                      setLayoutForm({ ...layoutForm, rowSpacing: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Stadium Elevation Rise / Row (m)
                  </label>
                  <input
                    type="number"
                    step="0.02"
                    value={layoutForm.seatElevationInc}
                    onChange={(e) =>
                      setLayoutForm({
                        ...layoutForm,
                        seatElevationInc: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-gray-400">
                  Computed Capacity:{" "}
                  <strong className="text-cinema-gold">
                    {layoutForm.numRows * layoutForm.seatsPerRow} 3D Seats
                  </strong>{" "}
                  • Aisles after seats: {layoutForm.aislePositions.join(", ")}
                </div>

                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cinema-crimson hover:bg-cinema-crimsonDark text-xs font-bold text-white shadow-crimson-glow transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  Save & Regenerate 3D Auditorium
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: Movie Management */}
        {activeTab === "MOVIES" && (
          <div className="grid lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleAddMovie}
              className="lg:col-span-5 bg-cinema-charcoal border border-white/10 rounded-2xl p-6 space-y-4"
            >
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cinema-crimson" /> Add New Movie Title
              </h2>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Movie Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., NEBULA DRIFT 2049"
                  value={newMovieTitle}
                  onChange={(e) => setNewMovieTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Primary Genre</label>
                  <input
                    type="text"
                    value={newMovieGenre}
                    onChange={(e) => setNewMovieGenre(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    value={newMovieDuration}
                    onChange={(e) => setNewMovieDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-sm text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Poster Image URL</label>
                <input
                  type="url"
                  required
                  value={newMoviePoster}
                  onChange={(e) => setNewMoviePoster(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  MP4 / HLS Trailer Video URL
                </label>
                <input
                  type="url"
                  required
                  value={newMovieTrailer}
                  onChange={(e) => setNewMovieTrailer(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-cinema-crimson hover:bg-cinema-crimsonDark text-xs font-bold text-white"
              >
                Publish Movie to Catalog
              </button>
            </form>

            <div className="lg:col-span-7 bg-cinema-charcoal border border-white/10 rounded-2xl p-6 space-y-3">
              <h2 className="text-base font-bold text-white">Active Movie Catalog</h2>
              {data.movies.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5"
                >
                  <div>
                    <div className="text-sm font-bold text-white">{m.title}</div>
                    <div className="text-xs text-gray-400">
                      {m.genres.join(", ")} • {m.durationMinutes} mins • {m.ageRating}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteMovie(m.id)}
                    className="p-2 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3 & 4: Bookings, Refunds & Revenue Analytics */}
        {(activeTab === "BOOKINGS" || activeTab === "OVERVIEW") && (
          <div className="bg-cinema-charcoal border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white">
              Customer Bookings, Ticket Verification & Refund Management
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400">
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Reserved Seats</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.recentBookings.map((b) => (
                    <tr key={b.id}>
                      <td className="py-3 px-3 font-mono font-bold text-cinema-gold">
                        {b.referenceCode}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">{b.customerName}</div>
                        <div className="text-gray-400">{b.customerEmail}</div>
                      </td>
                      <td className="py-3 px-3 font-mono">{b.seatLabels.join(", ")}</td>
                      <td className="py-3 px-3 font-bold">${Number(b.totalAmount).toFixed(2)}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            b.status === "CONFIRMED"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <Link
                          href={`/tickets/${b.id}`}
                          className="px-2.5 py-1 rounded bg-cinema-slate text-white hover:bg-white/15"
                        >
                          Verify QR
                        </Link>
                        {b.status === "CONFIRMED" && (
                          <button
                            onClick={() => handleRefundBooking(b.id)}
                            className="px-2.5 py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30"
                          >
                            Cancel & Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
