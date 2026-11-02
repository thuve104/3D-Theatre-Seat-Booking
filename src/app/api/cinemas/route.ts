import { NextResponse } from "next/server";
import { getDbState } from "@/lib/db";

export async function GET() {
  const db = getDbState();
  const cinemas = db.cinemas.map((cinema) => ({
    ...cinema,
    auditoriums: db.auditoriums.filter((a) => a.cinemaId === cinema.id),
  }));
  return NextResponse.json({ cinemas });
}
