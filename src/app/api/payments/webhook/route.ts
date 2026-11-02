import { NextRequest, NextResponse } from "next/server";
import { runSerializableTransaction } from "@/lib/db";

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const { type, bookingId } = payload;

  if (!bookingId) {
    return NextResponse.json({ error: "Missing bookingId in webhook payload" }, { status: 400 });
  }

  await runSerializableTransaction((db) => {
    const booking = db.bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    if (type === "payment_intent.succeeded") {
      booking.status = "CONFIRMED";
      booking.paymentStatus = "SUCCEEDED";
      for (const ss of db.showSeats) {
        if (ss.showId === booking.showId && booking.seatIds.includes(ss.seatId)) {
          ss.status = "BOOKED";
        }
      }
    } else if (type === "payment_intent.payment_failed") {
      booking.status = "CANCELLED";
      booking.paymentStatus = "FAILED";
      for (const ss of db.showSeats) {
        if (ss.showId === booking.showId && booking.seatIds.includes(ss.seatId)) {
          ss.status = "AVAILABLE";
        }
      }
    }
  });

  return NextResponse.json({ received: true });
}
