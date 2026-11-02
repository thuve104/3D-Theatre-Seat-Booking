import { NextRequest, NextResponse } from "next/server";
import { getDbState } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDbState();
  const auditorium = db.auditoriums.find((a) => a.id === id);

  if (!auditorium) {
    return NextResponse.json({ error: "Auditorium not found" }, { status: 404 });
  }

  const seats = db.seats.filter((s) => s.auditoriumId === id);
  return NextResponse.json({
    auditorium,
    layout: auditorium.layout,
    seats,
  });
}
