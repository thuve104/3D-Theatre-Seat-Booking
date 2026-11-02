import { NextRequest, NextResponse } from "next/server";
import { runSerializableTransaction, MovieRecord } from "@/lib/db";
import { z } from "zod";
import crypto from "crypto";

const createMovieSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(5),
  genres: z.array(z.string()).min(1),
  durationMinutes: z.number().int().positive(),
  releaseDate: z.string(),
  language: z.string().min(1),
  subtitles: z.array(z.string()).default(["English"]),
  ageRating: z.string().default("PG-13"),
  director: z.string().default("Director"),
  cast: z
    .array(z.object({ name: z.string(), role: z.string() }))
    .default([{ name: "Lead Actor", role: "Protagonist" }]),
  status: z.enum(["NOW_SHOWING", "COMING_SOON"]).default("NOW_SHOWING"),
  isFeatured: z.boolean().default(false),
  posterUrl: z.string().url(),
  backdropUrl: z.string().url().optional(),
  trailerUrl: z.string().url(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createMovieSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const slug =
    data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    crypto.randomBytes(2).toString("hex");

  const movie = await runSerializableTransaction((db) => {
    const newMovie: MovieRecord = {
      id: `mov-${crypto.randomBytes(4).toString("hex")}`,
      title: data.title,
      slug,
      description: data.description,
      genres: data.genres,
      durationMinutes: data.durationMinutes,
      releaseDate: data.releaseDate,
      language: data.language,
      subtitles: data.subtitles,
      ageRating: data.ageRating,
      director: data.director,
      cast: data.cast,
      status: data.status,
      isFeatured: data.isFeatured,
      posterUrl: data.posterUrl,
      backdropUrl: data.backdropUrl || data.posterUrl,
      trailerUrl: data.trailerUrl,
    };
    db.movies.unshift(newMovie);
    db.adminLogs.unshift({
      id: `log-${Date.now()}`,
      adminId: "usr-admin-1",
      action: "CREATE_MOVIE",
      entityType: "Movie",
      entityId: newMovie.id,
      createdAt: new Date().toISOString(),
    });
    return newMovie;
  });

  return NextResponse.json({ movie }, { status: 201 });
}
