import { NextRequest, NextResponse } from "next/server";
import { getDbState } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const genre = searchParams.get("genre");
  const query = searchParams.get("q")?.toLowerCase();

  const db = getDbState();
  let movies = [...db.movies];

  if (status) {
    movies = movies.filter((m) => m.status === status);
  }
  if (genre && genre !== "ALL") {
    movies = movies.filter((m) =>
      m.genres.some((g) => g.toLowerCase() === genre.toLowerCase())
    );
  }
  if (query) {
    movies = movies.filter(
      (m) =>
        m.title.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query) ||
        m.director.toLowerCase().includes(query)
    );
  }

  const enriched = movies.map((m) => ({
    ...m,
    shows: db.shows
      .filter((s) => s.movieId === m.id && s.isActive)
      .map((s) => {
        const aud = db.auditoriums.find((a) => a.id === s.auditoriumId);
        const cin = db.cinemas.find((c) => c.id === aud?.cinemaId);
        return {
          ...s,
          auditoriumName: aud?.name || "Auditorium 1",
          cinemaName: cin?.name || "CINEVERSE Theatre",
          cinemaId: cin?.id || "",
          city: cin?.city || "",
        };
      }),
  }));

  return NextResponse.json({ movies: enriched });
}
