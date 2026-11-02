import { NextRequest, NextResponse } from "next/server";
import { getDbState, runSerializableTransaction } from "@/lib/db";
import { paymentProvider } from "@/lib/payment-provider";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDbState();
  const booking = db.bookings.find((b) => b.id === id || b.referenceCode === id);

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const show = db.shows.find((s) => s.id === booking.showId);
  const movie = db.movies.find((m) => m.id === show?.movieId);
  const auditorium = db.auditoriums.find((a) => a.id === show?.auditoriumId);
  const cinema = db.cinemas.find((c) => c.id === auditorium?.cinemaId);
  const ticket = db.tickets.find((t) => t.bookingId === booking.id);

  return NextResponse.json({
    booking,
    show,
    movie,
    auditorium,
    cinema,
    ticket,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { action } = await req.json();

  if (action !== "CANCEL_AND_REFUND") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const updated = await runSerializableTransaction(async (db) => {
    const booking = db.bookings.find((b) => b.id === id);
    if (!booking) return null;

    if (booking.paymentId) {
      await paymentProvider.refundPayment(booking.paymentId, booking.totalAmount);
    }

    booking.status = "REFUNDED";
    booking.paymentStatus = "REFUNDED";

    // Release seats back to AVAILABLE
    for (const ss of db.showSeats) {
      if (ss.showId === booking.showId && booking.seatIds.includes(ss.seatId)) {
        ss.status = "AVAILABLE";
        ss.version += 1;
      }
    }

    return booking;
  });

  if (!updated) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json({ booking: updated });
}
