import { NextRequest, NextResponse } from "next/server";
import { runSerializableTransaction } from "@/lib/db";
import { hashPassword, signSessionToken } from "@/lib/auth";
import { z } from "zod";
import crypto from "crypto";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  phone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password, fullName, phone } = parsed.data;
  const passwordHash = await hashPassword(password);

  try {
    const newUser = await runSerializableTransaction((db) => {
      if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error("An account with this email already exists.");
      }

      const user = {
        id: `usr-${crypto.randomBytes(6).toString("hex")}`,
        email: email.toLowerCase(),
        passwordHash,
        role: "CUSTOMER" as const,
        fullName,
        phone: phone || "+1 (800) 555-0199",
        savedCinemaIds: ["cin-grand-downtown"],
        preferences: {
          preferredSeatCategory: "PREMIUM" as const,
          enableSpatialAudio: true,
        },
        createdAt: new Date().toISOString(),
      };
      db.users.push(user);
      return user;
    });

    const token = await signSessionToken({
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role,
      fullName: newUser.fullName,
      phone: newUser.phone,
    });

    const res = NextResponse.json(
      {
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          fullName: newUser.fullName,
          phone: newUser.phone,
        },
      },
      { status: 201 }
    );
    res.cookies.set("cineverse_session", token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
