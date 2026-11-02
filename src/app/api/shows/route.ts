import { NextRequest, NextResponse } from "next/server";
import { getDbState, runSerializableTransaction } from "@/lib/db";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const movieId = searchParams.get("movieId");
  const cinemaId = searchParams.get("cinemaId");

  const db = getDbState();
  let shows = db.shows.filter((s) => s.isActive);

  if (movieId) {
    shows = shows.filter((s) => s.movieId === movieId);
  }

  const enriched = shows
    .map((s) => {
      const movie = db.movies.find((m) => m.id === s.movieId);
      const auditorium = db.auditoriums.find((a) => a.id === s.auditoriumId);
      const cinema = db.cinemas.find((c) => c.id === auditorium?.cinemaId);
      return {
        ...s,
        movie,
        auditorium,
        cinema,
      };
    })
    .filter((s) => (!cinemaId ? true : s.cinema?.id === cinemaId));

  return NextResponse.json({ shows: enriched });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { movieId, auditoriumId, startTime, basePrice } = body;

  if (!movieId || !auditoriumId || !startTime) {
    return NextResponse.json({ error: "Missing required show fields" }, { status: 400 });
  }

  const created = await runSerializableTransaction((db) => {
    const auditorium = db.auditoriums.find((a) => a.id === auditoriumId);
    if (!auditorium) throw new Error("Auditorium not found");

    const showId = `show-${crypto.randomBytes(4).toString("hex")}`;
    const start = new Date(startTime);
    const end = new Date(start.getTime() + 140 * 60 * 1000);

    const newShow = {
      id: showId,
      movieId,
      auditoriumId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      basePrice: Number(basePrice) || 15.0,
      categoryPricing: auditorium.layout.categoryBasePrices,
      isActive: true,
    };

    db.shows.push(newShow);
    const audSeats = db.seats.filter((s) => s.auditoriumId === auditoriumId);
    for (const seat of audSeats) {
      db.showSeats.push({
        id: `${showId}-${seat.id}`,
        showId,
        seatId: seat.id,
        status: "AVAILABLE",
        price: auditorium.layout.categoryBasePrices[seat.category] ?? newShow.basePrice,
        version: 1,
      });
    }
    return newShow;
  });

  return NextResponse.json({ show: created }, { status: 201 });
}
