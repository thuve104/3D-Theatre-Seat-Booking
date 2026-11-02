"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { isYouTubeUrl, getYouTubeEmbedUrl } from "@/lib/youtube";
import { Clock, Calendar, Globe, Subtitles, UserCheck, Eye, Sparkles } from "lucide-react";

interface MovieDetailData {
  movie: {
    id: string;
    title: string;
    description: string;
    genres: string[];
    durationMinutes: number;
    releaseDate: string;
    language: string;
    subtitles: string[];
    ageRating: string;
    director: string;
    cast: { name: string; role: string }[];
    posterUrl: string;
    backdropUrl: string;
    trailerUrl: string;
  };
  shows: {
    id: string;
    startTime: string;
    basePrice: number;
    auditorium: { id: string; name: string; totalCapacity: number };
    cinema: { id: string; name: string; city: string; address: string; facilities: string[] };
  }[];
}

export default function MovieDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<MovieDetailData | null>(null);

  useEffect(() => {
    fetch(`/api/movies/${id}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.movie) setData(d);
      });
  }, [id]);

  if (!data) {
    return (
      <div className="min-h-screen bg-cinema-obsidian text-white">
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 py-24 text-center text-gray-400">
          Loading movie details...
        </div>
      </div>
    );
  }

  const { movie, shows } = data;
  const ytEmbed = isYouTubeUrl(movie.trailerUrl)
    ? getYouTubeEmbedUrl(movie.trailerUrl, { autoplay: false, controls: true })
    : null;

  return (
    <div className="min-h-screen bg-cinema-obsidian text-white">
      <Navbar />

      {/* Backdrop Banner */}
      <div className="relative py-12 border-b border-white/10 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 blur-sm"
          style={{ backgroundImage: `url(${movie.backdropUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-cinema-obsidian via-cinema-obsidian/80 to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 grid md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-4 lg:col-span-3">
            <img
              src={movie.posterUrl}
              alt={movie.title}
              className="w-full rounded-2xl border border-white/15 shadow-2xl"
            />
          </div>

          <div className="md:col-span-8 lg:col-span-9 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-md bg-cinema-crimson text-xs font-bold">
                {movie.ageRating}
              </span>
              {movie.genres.map((g) => (
                <span
                  key={g}
                  className="px-3 py-1 rounded-md bg-white/10 text-xs text-cinema-gold font-medium"
                >
                  {g}
                </span>
              ))}
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white">{movie.title}</h1>

            <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-3xl">
              {movie.description}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="bg-cinema-charcoal/80 border border-white/10 p-3 rounded-xl">
                <div className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-cinema-gold" /> Duration
                </div>
                <div className="text-sm font-bold mt-0.5">{movie.durationMinutes} mins</div>
              </div>
              <div className="bg-cinema-charcoal/80 border border-white/10 p-3 rounded-xl">
                <div className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-cinema-gold" /> Release Date
                </div>
                <div className="text-sm font-bold mt-0.5">{movie.releaseDate}</div>
              </div>
              <div className="bg-cinema-charcoal/80 border border-white/10 p-3 rounded-xl">
                <div className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-cinema-gold" /> Audio Language
                </div>
                <div className="text-sm font-bold mt-0.5">{movie.language}</div>
              </div>
              <div className="bg-cinema-charcoal/80 border border-white/10 p-3 rounded-xl">
                <div className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Subtitles className="w-3.5 h-3.5 text-cinema-gold" /> Subtitles
                </div>
                <div className="text-sm font-bold mt-0.5">{movie.subtitles.join(", ")}</div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-cinema-charcoal/60 border border-white/10 rounded-xl p-4">
                <div className="text-xs text-cinema-gold uppercase font-semibold mb-2 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" /> Director & Cast
                </div>
                <div className="text-xs text-gray-300 mb-2">
                  <strong>Director:</strong> {movie.director}
                </div>
                <div className="flex flex-wrap gap-2">
                  {movie.cast.map((actor) => (
                    <span
                      key={actor.name}
                      className="px-2.5 py-1 rounded bg-black/50 border border-white/10 text-xs text-gray-200"
                    >
                      {actor.name} <span className="text-gray-400">as {actor.role}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Direct Trailer Player (Supports YouTube & MP4) */}
              <div className="bg-cinema-charcoal/60 border border-white/10 rounded-xl p-3">
                <div className="text-xs text-cinema-gold uppercase font-semibold mb-2">
                  Official Trailer Preview (Supports YouTube & MP4)
                </div>
                {ytEmbed ? (
                  <iframe
                    src={ytEmbed}
                    title={movie.title}
                    className="w-full h-44 rounded-lg bg-black border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={movie.trailerUrl}
                    controls
                    className="w-full h-44 object-cover rounded-lg bg-black"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Showtime & 3D Auditorium Selection */}
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cinema-crimson" />
              Available Cinemas, Auditoriums & 3D Showtimes
            </h2>
            <p className="text-xs text-gray-400">
              Select a showtime to enter the interactive 3D auditorium and preview the screen from your seat
            </p>
          </div>
        </div>

        {shows.length === 0 ? (
          <div className="p-8 rounded-2xl bg-cinema-charcoal border border-white/10 text-center text-gray-400">
            No active showtimes scheduled yet for this title.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {shows.map((s) => (
              <div
                key={s.id}
                className="bg-cinema-charcoal border border-white/10 rounded-2xl p-6 flex flex-col justify-between gap-4 hover:border-cinema-gold/50 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-cinema-gold">
                      {s.cinema?.city}
                    </span>
                    <span className="text-xs text-gray-400">
                      From ${Number(s.basePrice).toFixed(2)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{s.cinema?.name}</h3>
                  <p className="text-xs text-gray-400">
                    {s.auditorium?.name} • {s.auditorium?.totalCapacity} 3D Seats
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {s.cinema?.facilities.map((f) => (
                      <span
                        key={f}
                        className="px-2 py-0.5 rounded bg-black/40 text-[11px] text-gray-300 border border-white/10"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-400">Showtime</div>
                    <div className="text-sm font-bold text-white">
                      {new Date(s.startTime).toLocaleString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <Link
                    href={`/shows/${s.id}/book`}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cinema-crimson hover:bg-cinema-crimsonDark text-xs font-bold text-white shadow-crimson-glow transition"
                  >
                    <Eye className="w-4 h-4" />
                    Enter 3D Theatre
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
