import { NextRequest, NextResponse } from "next/server";
import { runSerializableTransaction } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: showId } = await params;

  const payload = await runSerializableTransaction((db) => {
    const show = db.shows.find((s) => s.id === showId);
    if (!show) return null;

    // Automatically purge expired temporary seat locks
    const now = new Date().toISOString();
    const expiredLocks = db.seatLocks.filter(
      (l) => l.showId === showId && l.expiresAt < now
    );
    if (expiredLocks.length > 0) {
      const expiredSeatIds = new Set(expiredLocks.map((l) => l.seatId));
      db.seatLocks = db.seatLocks.filter(
        (l) => !(l.showId === showId && l.expiresAt < now)
      );
      for (const ss of db.showSeats) {
        if (ss.showId === showId && expiredSeatIds.has(ss.seatId) && ss.status === "LOCKED") {
          ss.status = "AVAILABLE";
        }
      }
    }

    const movie = db.movies.find((m) => m.id === show.movieId);
    const auditorium = db.auditoriums.find((a) => a.id === show.auditoriumId);
    const cinema = db.cinemas.find((c) => c.id === auditorium?.cinemaId);

    if (!movie || !auditorium || !cinema) return null;

    const audSeats = db.seats.filter((s) => s.auditoriumId === auditorium.id);
    const showSeatMap = new Map(
      db.showSeats.filter((ss) => ss.showId === showId).map((ss) => [ss.seatId, ss])
    );

    const seats = audSeats.map((seat) => {
      const ss = showSeatMap.get(seat.id);
      return {
        seatId: seat.id,
        showSeatId: ss?.id || `${showId}-${seat.id}`,
        rowLabel: seat.rowLabel,
        rowIndex: seat.rowIndex,
        seatNumber: seat.seatNumber,
        category: seat.category,
        price: ss?.price ?? seat.basePrice,
        status: ss?.status ?? "AVAILABLE",
        posX: seat.posX,
        posY: seat.posY,
        posZ: seat.posZ,
        rotX: seat.rotX,
        rotY: seat.rotY,
        rotZ: seat.rotZ,
      };
    });

    return {
      meta: {
        showId: show.id,
        movieId: movie.id,
        movieTitle: movie.title,
        posterUrl: movie.posterUrl,
        backdropUrl: movie.backdropUrl,
        trailerUrl: movie.trailerUrl,
        durationMinutes: movie.durationMinutes,
        ageRating: movie.ageRating,
        cinemaId: cinema.id,
        cinemaName: cinema.name,
        city: cinema.city,
        auditoriumId: auditorium.id,
        auditoriumName: auditorium.name,
        acousticProfile: auditorium.acousticProfile,
        startTime: show.startTime,
        layout: auditorium.layout,
      },
      seats,
    };
  });

  if (!payload) {
    return NextResponse.json({ error: "Show or auditorium layout not found" }, { status: 404 });
  }

  return NextResponse.json(payload);
}
