import { NextRequest, NextResponse } from "next/server";
import { paymentProvider } from "@/lib/payment-provider";

export async function POST(req: NextRequest) {
  const { bookingId, amount, currency = "USD", customerEmail } = await req.json();
  if (!bookingId || !amount || !customerEmail) {
    return NextResponse.json({ error: "Missing required payment fields" }, { status: 400 });
  }

  const intent = await paymentProvider.createPaymentIntent({
    bookingId,
    amount: Number(amount),
    currency,
    customerEmail,
  });

  return NextResponse.json({ paymentIntent: intent }, { status: 201 });
}
