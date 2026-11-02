import { NextRequest, NextResponse } from "next/server";
import { getDbState } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDbState();
  const movie = db.movies.find((m) => m.id === id || m.slug === id);

  if (!movie) {
    return NextResponse.json({ error: "Movie not found" }, { status: 404 });
  }

  const shows = db.shows
    .filter((s) => s.movieId === movie.id && s.isActive)
    .map((s) => {
      const auditorium = db.auditoriums.find((a) => a.id === s.auditoriumId);
      const cinema = db.cinemas.find((c) => c.id === auditorium?.cinemaId);
      return {
        ...s,
        auditorium,
        cinema,
      };
    });

  return NextResponse.json({ movie, shows });
}
