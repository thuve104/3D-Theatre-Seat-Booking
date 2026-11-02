import crypto from "crypto";
import QRCode from "qrcode";

const QR_HMAC_SECRET =
  process.env.QR_HMAC_SECRET || "cineverse-qr-hmac-verification-secret-2026";

export interface TicketQRPayload {
  ticketCode: string;
  bookingReference: string;
  showId: string;
  movieTitle: string;
  cinemaName: string;
  auditoriumName: string;
  startTime: string;
  customerName: string;
  seats: string[];
  issuedAt: number;
}

export function signTicketPayload(payload: TicketQRPayload): string {
  const serialized = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", QR_HMAC_SECRET)
    .update(serialized)
    .digest("hex");
  return Buffer.from(JSON.stringify({ p: payload, s: signature })).toString("base64url");
}

export function verifyTicketToken(token: string): TicketQRPayload | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf-8"));
    if (!decoded || !decoded.p || !decoded.s) return null;

    const expectedSig = crypto
      .createHmac("sha256", QR_HMAC_SECRET)
      .update(JSON.stringify(decoded.p))
      .digest("hex");

    const actualBuf = Buffer.from(decoded.s, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");
    if (actualBuf.length !== expectedBuf.length) return null;

    if (!crypto.timingSafeEqual(actualBuf, expectedBuf)) {
      return null;
    }
    return decoded.p as TicketQRPayload;
  } catch {
    return null;
  }
}

export async function generateTicketQRDataUrl(signedToken: string): Promise<string> {
  return QRCode.toDataURL(signedToken, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 360,
    color: {
      dark: "#070709",
      light: "#FFFFFF",
    },
  });
}
