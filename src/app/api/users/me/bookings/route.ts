import { NextRequest, NextResponse } from "next/server";
import { getDbState } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  const db = getDbState();

  const bookings = db.bookings
    .filter((b) => (!session ? true : b.userId === session.sub || b.customerEmail === session.email))
    .map((b) => {
      const show = db.shows.find((s) => s.id === b.showId);
      const movie = db.movies.find((m) => m.id === show?.movieId);
      const auditorium = db.auditoriums.find((a) => a.id === show?.auditoriumId);
      const cinema = db.cinemas.find((c) => c.id === auditorium?.cinemaId);
      const ticket = db.tickets.find((t) => t.bookingId === b.id);
      return { ...b, show, movie, auditorium, cinema, ticket };
    });

  return NextResponse.json({ bookings });
}
