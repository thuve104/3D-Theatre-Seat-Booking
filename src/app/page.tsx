"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { isYouTubeUrl, getYouTubeEmbedUrl } from "@/lib/youtube";
import {
  Play,
  Sparkles,
  MapPin,
  Calendar,
  Search,
  Clock,
  Eye,
  Volume2,
  Ticket,
  Building2,
} from "lucide-react";

interface ShowSummary {
  id: string;
  startTime: string;
  auditoriumName: string;
  cinemaName: string;
  cinemaId: string;
  city: string;
  basePrice: number;
}

interface MovieItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  genres: string[];
  durationMinutes: number;
  releaseDate: string;
  language: string;
  subtitles: string[];
  ageRating: string;
  director: string;
  status: "NOW_SHOWING" | "COMING_SOON";
  isFeatured: boolean;
  posterUrl: string;
  backdropUrl: string;
  trailerUrl: string;
  shows: ShowSummary[];
}

interface CinemaItem {
  id: string;
  name: string;
  city: string;
  address: string;
  facilities: string[];
  auditoriums: { id: string; name: string; totalCapacity: number }[];
}

export default function HomePage() {
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [cinemas, setCinemas] = useState<CinemaItem[]>([]);
  const [activeTab, setActiveTab] = useState<"ALL" | "NOW_SHOWING" | "COMING_SOON">("ALL");
  const [selectedGenre, setSelectedGenre] = useState<string>("ALL");
  const [selectedCity, setSelectedCity] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>("2026-11-02");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [trailerModalMovie, setTrailerModalMovie] = useState<MovieItem | null>(null);

  useEffect(() => {
    fetch("/api/movies")
      .then((res) => res.json())
      .then((data) => setMovies(data.movies || []));
    fetch("/api/cinemas")
      .then((res) => res.json())
      .then((data) => setCinemas(data.cinemas || []));
  }, []);

  const featuredMovie = movies.find((m) => m.isFeatured) || movies[0];

  const filteredMovies = movies.filter((m) => {
    if (activeTab !== "ALL" && m.status !== activeTab) return false;
    if (selectedGenre !== "ALL" && !m.genres.includes(selectedGenre)) return false;
    if (
      searchQuery &&
      !m.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !m.description.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (
      selectedCity !== "ALL" &&
      m.shows.length > 0 &&
      !m.shows.some((s) => s.city === selectedCity)
    ) {
      return false;
    }
    return true;
  });

  const allGenres = ["ALL", "Sci-Fi", "Action", "Fantasy", "Adventure", "Drama", "Thriller"];

  return (
    <div className="min-h-screen bg-cinema-obsidian text-white">
      <Navbar />

      {/* Cinematic Hero Section */}
      {featuredMovie && (
        <section className="relative w-full min-h-[540px] flex items-center overflow-hidden border-b border-white/10">
          <div
            className="absolute inset-0 bg-cover bg-center scale-105 opacity-35 transition-all duration-1000"
            style={{ backgroundImage: `url(${featuredMovie.backdropUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-cinema-obsidian via-cinema-obsidian/90 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-cinema-obsidian via-transparent to-black/50" />

          <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cinema-crimson/20 border border-cinema-crimson/40 text-cinema-gold text-xs font-semibold tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 text-cinema-crimson" />
                Interactive 3D Seat & Screen Preview Experience
              </div>

              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-none text-white">
                {featuredMovie.title}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300">
                <span className="px-2.5 py-1 rounded bg-white/10 font-semibold text-white">
                  {featuredMovie.ageRating}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-cinema-gold" />
                  {featuredMovie.durationMinutes} mins
                </span>
                <span>{featuredMovie.language}</span>
                <span>•</span>
                <span className="text-cinema-gold font-medium">
                  {featuredMovie.genres.join(" / ")}
                </span>
              </div>

              <p className="text-gray-300 text-sm sm:text-base max-w-2xl leading-relaxed">
                {featuredMovie.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                {featuredMovie.shows[0] && (
                  <Link
                    href={`/shows/${featuredMovie.shows[0].id}/book`}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-cinema-crimson hover:bg-cinema-crimsonDark text-white font-bold text-sm shadow-crimson-glow transition"
                  >
                    <Eye className="w-4 h-4" />
                    Explore 3D Theatre & Select Seats
                  </Link>
                )}

                <button
                  onClick={() => setTrailerModalMovie(featuredMovie)}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-cinema-charcoal/90 hover:bg-cinema-slate border border-cinema-gold/40 text-cinema-gold font-semibold text-sm transition"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Watch Trailer with Audio
                </button>

                <Link
                  href={`/movies/${featuredMovie.id}`}
                  className="px-4 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-200 transition"
                >
                  Movie Details & Showtimes
                </Link>
              </div>
            </div>

            {/* Interactive 3D Feature Highlight Card */}
            <div className="lg:col-span-5">
              <div className="bg-cinema-charcoal/85 border border-cinema-gold/30 rounded-2xl p-6 backdrop-blur-xl shadow-gold-glow space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-cinema-gold">
                    Why CINEVERSE 3D?
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    WebGL + YouTube 3D + Web Audio
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">
                  Sit In Your Seat Before You Buy It
                </h2>
                <ul className="space-y-2.5 text-xs text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-cinema-crimson font-bold">01.</span>
                    <span>
                      <strong>True Seated Eye-Height Camera:</strong> Compare front-row upward tilt, side-aisle angles, and VIP center sightlines calculated from exact 3D coordinates.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cinema-crimson font-bold">02.</span>
                    <span>
                      <strong>Play YouTube or MP4 Trailers From Your Seat:</strong> Project any YouTube or MP4 trailer directly onto the 3D cinema screen from your exact seat perspective.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cinema-crimson font-bold">03.</span>
                    <span>
                      <strong>Real-Time Seat Locks & QR Tickets:</strong> Instant 10-minute seat reservation locks and cryptographically signed QR tickets.
                    </span>
                  </li>
                </ul>
                {featuredMovie.shows[0] && (
                  <Link
                    href={`/shows/${featuredMovie.shows[0].id}/book`}
                    className="block w-full text-center py-2.5 rounded-xl bg-gold-shimmer border border-cinema-gold text-xs font-bold text-white hover:shadow-gold-glow transition"
                  >
                    Launch Interactive 3D Auditorium →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Search, Location, Date & Category Filters Bar */}
      <section className="max-w-7xl mx-auto px-6 -mt-7 relative z-20">
        <div className="bg-cinema-charcoal/95 border border-white/15 rounded-2xl p-4 shadow-2xl backdrop-blur-xl grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search movies, directors, or genres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/50 border border-white/10 text-sm text-white focus:outline-none focus:border-cinema-crimson"
            />
          </div>

          <div className="md:col-span-3 flex items-center gap-2 bg-black/50 border border-white/10 rounded-xl px-3 py-2">
            <MapPin className="w-4 h-4 text-cinema-crimson shrink-0" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-transparent text-xs text-white w-full focus:outline-none"
            >
              <option value="ALL" className="bg-cinema-charcoal">
                All Locations (Metropolis & Harbor City)
              </option>
              <option value="Metropolis" className="bg-cinema-charcoal">
                Metropolis • Grand Obsidian Downtown
              </option>
              <option value="Harbor City" className="bg-cinema-charcoal">
                Harbor City • Royal Harbor Bay
              </option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-center gap-2 bg-black/50 border border-white/10 rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-cinema-gold shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs text-white w-full focus:outline-none"
            />
          </div>

          <div className="md:col-span-3 flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10">
            {(["ALL", "NOW_SHOWING", "COMING_SOON"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                  activeTab === tab
                    ? "bg-cinema-crimson text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {tab === "ALL"
                  ? "All"
                  : tab === "NOW_SHOWING"
                  ? "Now Showing"
                  : "Coming Soon"}
              </button>
            ))}
          </div>
        </div>

        {/* Genre Pills */}
        <div className="flex items-center gap-2 overflow-x-auto py-4">
          {allGenres.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition shrink-0 ${
                selectedGenre === genre
                  ? "bg-cinema-gold text-black font-bold"
                  : "bg-cinema-charcoal border border-white/10 text-gray-300 hover:border-cinema-gold/40"
              }`}
            >
              {genre === "ALL" ? "All Categories" : genre}
            </button>
          ))}
        </div>
      </section>

      {/* Movie Grid */}
      <section className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Select a Movie to Enter the 3D Auditorium
            </h2>
            <p className="text-xs text-gray-400">
              Every showtime below links directly to its dynamically generated 3D theatre layout
            </p>
          </div>
          <span className="text-xs text-cinema-gold font-mono">
            Promo Code: CINEVERSE20 (20% Off)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredMovies.map((movie) => (
            <div
              key={movie.id}
              className="group bg-cinema-charcoal border border-white/10 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-cinema-crimson/60 transition shadow-xl"
            >
              <div>
                <div className="relative h-72 overflow-hidden bg-black">
                  <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-cinema-charcoal via-transparent to-black/40" />

                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-black/80 border border-white/15 text-[11px] font-bold text-cinema-gold">
                      {movie.ageRating}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-cinema-crimson/90 text-[10px] font-bold uppercase text-white">
                      {movie.status === "NOW_SHOWING" ? "Now Showing" : "Coming Soon"}
                    </span>
                  </div>

                  <button
                    onClick={() => setTrailerModalMovie(movie)}
                    className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/80 hover:bg-cinema-crimson text-xs font-semibold text-white border border-white/15 backdrop-blur-md transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Watch Trailer
                  </button>
                </div>

                <div className="p-4 space-y-2.5">
                  <Link href={`/movies/${movie.id}`}>
                    <h3 className="text-lg font-bold text-white group-hover:text-cinema-gold transition line-clamp-1">
                      {movie.title}
                    </h3>
                  </Link>

                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{movie.genres.join(", ")}</span>
                    <span>•</span>
                    <span>{movie.durationMinutes}m</span>
                    <span>•</span>
                    <span>{movie.language}</span>
                  </div>

                  <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">
                    {movie.description}
                  </p>

                  {/* Available Showtimes */}
                  {movie.shows.length > 0 ? (
                    <div className="pt-2 space-y-1.5">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-cinema-gold">
                        Available 3D Showtimes:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {movie.shows.map((s) => (
                          <Link
                            key={s.id}
                            href={`/shows/${s.id}/book`}
                            className="px-2.5 py-1 rounded-lg bg-cinema-slate hover:bg-cinema-crimson border border-white/10 text-[11px] font-medium text-white transition"
                          >
                            {new Date(s.startTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            • {s.auditoriumName.split("•")[0]}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 text-xs text-gray-500 italic">
                      Showtimes opening soon
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 pt-0 flex items-center gap-2">
                {movie.shows[0] ? (
                  <Link
                    href={`/shows/${movie.shows[0].id}/book`}
                    className="flex-1 text-center py-2.5 rounded-xl bg-cinema-crimson hover:bg-cinema-crimsonDark text-xs font-bold text-white shadow-crimson-glow transition"
                  >
                    Book Now in 3D
                  </Link>
                ) : (
                  <Link
                    href={`/movies/${movie.id}`}
                    className="flex-1 text-center py-2.5 rounded-xl bg-cinema-slate hover:bg-white/15 text-xs font-bold text-white transition"
                  >
                    View Details
                  </Link>
                )}
                <Link
                  href={`/movies/${movie.id}`}
                  className="px-3 py-2.5 rounded-xl bg-cinema-slate hover:bg-white/10 text-xs text-gray-300"
                >
                  Info
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Cinema Theatres & Auditorium Specs */}
      <section className="max-w-7xl mx-auto px-6 py-10 border-t border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cinema-gold" />
              Featured 3D Cinema Locations & Auditoriums
            </h2>
            <p className="text-xs text-gray-400">
              Each auditorium features its own parametric 3D geometry and custom acoustic profile
            </p>
          </div>
          <Link
            href="/admin"
            className="text-xs text-cinema-gold hover:underline font-medium"
          >
            Configure Auditorium Layouts in Admin Studio →
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {cinemas.map((cinema) => (
            <div
              key={cinema.id}
              className="bg-cinema-charcoal border border-white/10 rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-widest text-cinema-gold font-semibold">
                    {cinema.city}
                  </span>
                  <h3 className="text-lg font-bold text-white">{cinema.name}</h3>
                  <p className="text-xs text-gray-400">{cinema.address}</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-cinema-crimson/20 border border-cinema-crimson/40 text-xs text-white font-semibold">
                  {cinema.auditoriums.length} Auditoriums
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {cinema.facilities.map((fac) => (
                  <span
                    key={fac}
                    className="px-2.5 py-1 rounded-md bg-black/40 border border-white/10 text-[11px] text-gray-300"
                  >
                    {fac}
                  </span>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-2 pt-1">
                {cinema.auditoriums.map((aud) => (
                  <div
                    key={aud.id}
                    className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">{aud.name}</div>
                      <div className="text-[11px] text-gray-400">
                        Capacity: {aud.totalCapacity} 3D Seats
                      </div>
                    </div>
                    <Ticket className="w-4 h-4 text-cinema-gold" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trailer Player Modal with Audio Controls (Supports YouTube & MP4) */}
      {trailerModalMovie && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-cinema-charcoal border border-white/15 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-cinema-gold" />
                <h3 className="text-base font-bold text-white">
                  {trailerModalMovie.title} — Official Trailer (Audio Enabled)
                </h3>
              </div>
              <button
                onClick={() => setTrailerModalMovie(null)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white"
              >
                Close ✕
              </button>
            </div>

            <div className="aspect-video bg-black">
              {isYouTubeUrl(trailerModalMovie.trailerUrl) ? (
                <iframe
                  src={
                    getYouTubeEmbedUrl(trailerModalMovie.trailerUrl, {
                      autoplay: true,
                      controls: true,
                    }) || ""
                  }
                  title={trailerModalMovie.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={trailerModalMovie.trailerUrl}
                  controls
                  autoPlay
                  className="w-full h-full"
                />
              )}
            </div>

            <div className="px-6 py-4 bg-cinema-obsidian flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-gray-400">
                Want to see how this trailer looks and sounds from a specific cinema seat?
              </p>
              {trailerModalMovie.shows[0] && (
                <Link
                  href={`/shows/${trailerModalMovie.shows[0].id}/book`}
                  className="px-4 py-2 rounded-xl bg-cinema-crimson hover:bg-cinema-crimsonDark text-xs font-bold text-white shadow-crimson-glow transition"
                >
                  Preview Trailer Inside 3D Theatre →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
