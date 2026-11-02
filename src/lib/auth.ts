import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export type RoleName = "CUSTOMER" | "ADMIN" | "THEATRE_MANAGER" | "STAFF";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "cineverse-super-secret-jwt-key-2026-production-ready"
);

export interface SessionUser {
  sub: string;
  email: string;
  role: RoleName;
  fullName: string;
  phone?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSessionToken(payload: SessionUser): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function getSessionUser(req?: NextRequest): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token =
    req?.cookies.get("cineverse_session")?.value ||
    cookieStore.get("cineverse_session")?.value;

  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function requireAuth(
  req: NextRequest,
  allowedRoles?: RoleName[]
): Promise<{ user: SessionUser } | NextResponse> {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  return { user };
}
