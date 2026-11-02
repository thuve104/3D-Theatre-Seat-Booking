import { NextResponse } from "next/server";
import { getDbState } from "@/lib/db";

export async function GET() {
  const db = getDbState();
  const confirmedBookings = db.bookings.filter((b) => b.status === "CONFIRMED");
  const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.totalAmount, 0);

  const totalShowSeats = db.showSeats.length;
  const bookedShowSeats = db.showSeats.filter((s) => s.status === "BOOKED").length;
  const occupancyPercent =
    totalShowSeats > 0 ? Number(((bookedShowSeats / totalShowSeats) * 100).toFixed(1)) : 0;

  return NextResponse.json({
    metrics: {
      totalBookings: confirmedBookings.length,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      activeMovies: db.movies.filter((m) => m.status === "NOW_SHOWING").length,
      upcomingShows: db.shows.filter((s) => s.isActive).length,
      occupancyPercent,
      totalCustomers: db.users.filter((u) => u.role === "CUSTOMER").length,
    },
    auditoriums: db.auditoriums,
    cinemas: db.cinemas,
    movies: db.movies,
    shows: db.shows,
    recentBookings: db.bookings.slice(0, 15),
    customers: db.users,
  });
}
