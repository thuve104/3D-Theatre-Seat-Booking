import { NextRequest, NextResponse } from "next/server";
import { runSerializableTransaction, generateReferenceCode, getDbState } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { paymentProvider } from "@/lib/payment-provider";
import { signTicketPayload, generateTicketQRDataUrl } from "@/lib/qr-ticket";
import { releaseAtomicSeatLocks } from "@/lib/redis";
import { z } from "zod";
import crypto from "crypto";

const createBookingSchema = z.object({
  showId: z.string(),
  seatIds: z.array(z.string()).min(1),
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(5),
  couponCode: z.string().optional(),
  paymentOutcome: z.enum(["SUCCEEDED", "FAILED", "CANCELLED"]).default("SUCCEEDED"),
});

export async function GET() {
  const db = getDbState();
  const enriched = db.bookings.map((b) => {
    const show = db.shows.find((s) => s.id === b.showId);
    const movie = db.movies.find((m) => m.id === show?.movieId);
    const auditorium = db.auditoriums.find((a) => a.id === show?.auditoriumId);
    const cinema = db.cinemas.find((c) => c.id === auditorium?.cinemaId);
    const ticket = db.tickets.find((t) => t.bookingId === b.id);
    return { ...b, show, movie, auditorium, cinema, ticket };
  });
  return NextResponse.json({ bookings: enriched });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  const body = await req.json();
  const parsed = createBookingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    showId,
    seatIds,
    customerName,
    customerEmail,
    customerPhone,
    couponCode,
    paymentOutcome,
  } = parsed.data;
  const userId = session?.sub || "usr-customer-1";

  try {
    const result = await runSerializableTransaction(async (db) => {
      const show = db.shows.find((s) => s.id === showId);
      if (!show) throw new Error("Selected showtime does not exist.");

      const movie = db.movies.find((m) => m.id === show.movieId)!;
      const auditorium = db.auditoriums.find((a) => a.id === show.auditoriumId)!;
      const cinema = db.cinemas.find((c) => c.id === auditorium.cinemaId)!;

      // Verify seats are not already BOOKED by another confirmed booking
      const selectedSeatModels = [];
      let subtotal = 0;

      for (const seatId of seatIds) {
        const ss = db.showSeats.find((s) => s.showId === showId && s.seatId === seatId);
        const seatModel = db.seats.find((s) => s.id === seatId);
        if (!ss || !seatModel) {
          throw new Error(`Invalid seat ${seatId}`);
        }
        if (ss.status === "BOOKED" || ss.status === "UNAVAILABLE") {
          throw new Error(
            `Seat ${seatModel.rowLabel}-${seatModel.seatNumber} has already been sold.`
          );
        }
        selectedSeatModels.push(seatModel);
        subtotal += Number(ss.price);
      }

      let discountTotal = 0;
      if (couponCode) {
        const coupon = db.coupons.find(
          (c) => c.code.toUpperCase() === couponCode.trim().toUpperCase() && c.isActive
        );
        if (coupon && subtotal >= coupon.minOrderAmount) {
          discountTotal = Number(((subtotal * coupon.discountPercent) / 100).toFixed(2));
        }
      }

      const discountedSubtotal = Math.max(0, subtotal - discountTotal);
      const taxAmount = Number((discountedSubtotal * 0.085).toFixed(2));
      const bookingFee = Number((seatIds.length * 1.75).toFixed(2));
      const totalAmount = Number((discountedSubtotal + taxAmount + bookingFee).toFixed(2));

      const bookingId = `bkg-${crypto.randomBytes(6).toString("hex")}`;
      const referenceCode = generateReferenceCode();

      const intent = await paymentProvider.createPaymentIntent({
        bookingId,
        amount: totalAmount,
        currency: "USD",
        customerEmail,
      });

      const verifiedStatus = await paymentProvider.verifyAndConfirmPayment({
        providerPaymentId: intent.providerPaymentId,
        simulateOutcome: paymentOutcome,
      });

      const seatLabels = selectedSeatModels.map((s) => `${s.rowLabel}-${s.seatNumber}`);

      if (verifiedStatus !== "SUCCEEDED") {
        // Release locks and restore seats to AVAILABLE on payment failure/cancellation
        db.seatLocks = db.seatLocks.filter(
          (l) => !(l.showId === showId && seatIds.includes(l.seatId))
        );
        for (const ss of db.showSeats) {
          if (ss.showId === showId && seatIds.includes(ss.seatId) && ss.status === "LOCKED") {
            ss.status = "AVAILABLE";
          }
        }
        await releaseAtomicSeatLocks(showId, seatIds);
        throw new Error(
          verifiedStatus === "CANCELLED"
            ? "Payment was cancelled by customer. Seats have been released."
            : "Payment was declined by issuer. Please try another payment method."
        );
      }

      // Mark all ShowSeats as BOOKED and remove temporary locks
      for (const ss of db.showSeats) {
        if (ss.showId === showId && seatIds.includes(ss.seatId)) {
          ss.status = "BOOKED";
          ss.version += 1;
        }
      }
      db.seatLocks = db.seatLocks.filter(
        (l) => !(l.showId === showId && seatIds.includes(l.seatId))
      );

      // Generate cryptographic QR Ticket
      const ticketCode = `TKT-${referenceCode}`;
      const qrSignature = signTicketPayload({
        ticketCode,
        bookingReference: referenceCode,
        showId,
        movieTitle: movie.title,
        cinemaName: cinema.name,
        auditoriumName: auditorium.name,
        startTime: show.startTime,
        customerName,
        seats: seatLabels,
        issuedAt: Date.now(),
      });
      const qrDataUrl = await generateTicketQRDataUrl(qrSignature);

      const ticketId = `tkt-${crypto.randomBytes(6).toString("hex")}`;
      const ticket = {
        id: ticketId,
        bookingId,
        ticketCode,
        qrSignature,
        qrDataUrl,
        seatLabels,
        isUsed: false,
        createdAt: new Date().toISOString(),
      };
      db.tickets.unshift(ticket);

      const booking = {
        id: bookingId,
        referenceCode,
        userId,
        showId,
        customerName,
        customerEmail,
        customerPhone,
        subtotal: Number(subtotal.toFixed(2)),
        taxAmount,
        bookingFee,
        discountTotal,
        totalAmount,
        couponCode,
        status: "CONFIRMED" as const,
        seatIds,
        seatLabels,
        paymentId: intent.providerPaymentId,
        paymentStatus: "SUCCEEDED" as const,
        ticketId,
        createdAt: new Date().toISOString(),
      };
      db.bookings.unshift(booking);

      return { booking, ticket };
    });

    await releaseAtomicSeatLocks(showId, seatIds);
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Booking transaction failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
