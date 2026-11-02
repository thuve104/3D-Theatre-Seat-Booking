import { NextRequest, NextResponse } from "next/server";
import { getDbState } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const db = getDbState();
  const exists = db.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase());

  return NextResponse.json({
    success: true,
    message: exists
      ? "Password reset instructions and token generated."
      : "If that email is registered, a reset link has been dispatched.",
    resetTokenPreview: exists ? `rst_${crypto.randomBytes(12).toString("hex")}` : undefined,
  });
}
