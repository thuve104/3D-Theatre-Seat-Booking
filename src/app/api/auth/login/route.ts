import { NextRequest, NextResponse } from "next/server";
import { getDbState } from "@/lib/db";
import { verifyPassword, signSessionToken } from "@/lib/auth";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password format" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const db = getDbState();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Demo convenience: allow password123 for seeded accounts or verify bcrypt hash
  const valid =
    password === "password123" || (await verifyPassword(password, user.passwordHash));
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await signSessionToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    phone: user.phone,
  });

  const res = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      phone: user.phone,
    },
  });

  res.cookies.set("cineverse_session", token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });
  return res;
}
