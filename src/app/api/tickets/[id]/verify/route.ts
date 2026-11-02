import { NextRequest, NextResponse } from "next/server";
import { runSerializableTransaction } from "@/lib/db";
import { verifyTicketToken } from "@/lib/qr-ticket";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const qrToken: string | undefined = body.qrSignature;

  const verificationResult = await runSerializableTransaction((db) => {
    const ticket = db.tickets.find(
      (t) => t.id === id || t.ticketCode === id || t.bookingId === id
    );

    if (qrToken) {
      const verifiedPayload = verifyTicketToken(qrToken);
      if (!verifiedPayload) {
        return { valid: false, reason: "Invalid or tampered HMAC-SHA256 QR signature." };
      }
      if (ticket) {
        ticket.isUsed = true;
        ticket.verifiedAt = new Date().toISOString();
      }
      return {
        valid: true,
        payload: verifiedPayload,
        verifiedAt: new Date().toISOString(),
      };
    }

    if (!ticket) {
      return { valid: false, reason: "Ticket code not found in system." };
    }

    const decoded = verifyTicketToken(ticket.qrSignature);
    if (!decoded) {
      return { valid: false, reason: "QR cryptographic verification failed." };
    }

    const alreadyUsed = ticket.isUsed;
    ticket.isUsed = true;
    ticket.verifiedAt = new Date().toISOString();

    return {
      valid: true,
      alreadyScanned: alreadyUsed,
      payload: decoded,
      verifiedAt: ticket.verifiedAt,
    };
  });

  return NextResponse.json(verificationResult, {
    status: verificationResult.valid ? 200 : 400,
  });
}
