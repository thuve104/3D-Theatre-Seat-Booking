import { NextRequest, NextResponse } from "next/server";
import { getDbState } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDbState();
  const show = db.shows.find((s) => s.id === id);

  if (!show) {
    return NextResponse.json({ error: "Show not found" }, { status: 404 });
  }

  const movie = db.movies.find((m) => m.id === show.movieId);
  const auditorium = db.auditoriums.find((a) => a.id === show.auditoriumId);
  const cinema = db.cinemas.find((c) => c.id === auditorium?.cinemaId);

  return NextResponse.json({ show, movie, auditorium, cinema });
}
