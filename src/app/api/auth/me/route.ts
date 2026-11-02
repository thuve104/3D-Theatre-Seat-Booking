import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDbState } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ user: null });
  }
  const db = getDbState();
  const fullUser = db.users.find((u) => u.id === session.sub);
  return NextResponse.json({
    user: fullUser
      ? {
          id: fullUser.id,
          email: fullUser.email,
          role: fullUser.role,
          fullName: fullUser.fullName,
          phone: fullUser.phone,
          savedCinemaIds: fullUser.savedCinemaIds,
          preferences: fullUser.preferences,
        }
      : session,
  });
}
