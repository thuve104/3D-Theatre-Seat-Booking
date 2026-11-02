import { NextRequest, NextResponse } from "next/server";
import { getDbState } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDbState();
  const cinema = db.cinemas.find((c) => c.id === id || c.slug === id);
  if (!cinema) {
    return NextResponse.json({ error: "Cinema not found" }, { status: 404 });
  }

  const auditoriums = db.auditoriums.filter((a) => a.cinemaId === cinema.id);
  const auditoriumIds = auditoriums.map((a) => a.id);
  const shows = db.shows
    .filter((s) => auditoriumIds.includes(s.auditoriumId) && s.isActive)
    .map((s) => ({
      ...s,
      movie: db.movies.find((m) => m.id === s.movieId),
      auditorium: auditoriums.find((a) => a.id === s.auditoriumId),
    }));

  return NextResponse.json({ cinema, auditoriums, shows });
}
