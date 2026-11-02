import { NextRequest, NextResponse } from "next/server";
import { getDbState } from "@/lib/db";
import { signTicketPayload, generateTicketQRDataUrl } from "@/lib/qr-ticket";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDbState();

  const ticket = db.tickets.find(
    (t) => t.id === id || t.ticketCode === id || t.bookingId === id
  );
  const booking = db.bookings.find(
    (b) => b.id === (ticket?.bookingId || id) || b.referenceCode === id
  );

  if (!booking) {
    return NextResponse.json({ error: "Ticket or booking not found" }, { status: 404 });
  }

  const show = db.shows.find((s) => s.id === booking.showId);
  const movie = db.movies.find((m) => m.id === show?.movieId);
  const auditorium = db.auditoriums.find((a) => a.id === show?.auditoriumId);
  const cinema = db.cinemas.find((c) => c.id === auditorium?.cinemaId);

  let resolvedTicket = ticket;
  if (!resolvedTicket && movie && auditorium && cinema && show) {
    const ticketCode = `TKT-${booking.referenceCode}`;
    const qrSignature = signTicketPayload({
      ticketCode,
      bookingReference: booking.referenceCode,
      showId: booking.showId,
      movieTitle: movie.title,
      cinemaName: cinema.name,
      auditoriumName: auditorium.name,
      startTime: show.startTime,
      customerName: booking.customerName,
      seats: booking.seatLabels,
      issuedAt: Date.now(),
    });
    const qrDataUrl = await generateTicketQRDataUrl(qrSignature);
    resolvedTicket = {
      id: booking.ticketId || `tkt-${booking.id}`,
      bookingId: booking.id,
      ticketCode,
      qrSignature,
      qrDataUrl,
      seatLabels: booking.seatLabels,
      isUsed: false,
      createdAt: booking.createdAt,
    };
  }

  return NextResponse.json({
    ticket: resolvedTicket,
    booking,
    show,
    movie,
    auditorium,
    cinema,
  });
}
