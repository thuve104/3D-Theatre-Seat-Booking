import { NextRequest, NextResponse } from "next/server";
import { runSerializableTransaction } from "@/lib/db";
import { generateAuditoriumSeats, AuditoriumConfigInput } from "@/lib/theatre-engine";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: auditoriumId } = await params;
  const body = await req.json();
  const config = body.layout as AuditoriumConfigInput;

  if (!config || !config.numRows || !config.seatsPerRow) {
    return NextResponse.json({ error: "Valid layout parameters are required" }, { status: 400 });
  }

  const updated = await runSerializableTransaction((db) => {
    const audIndex = db.auditoriums.findIndex((a) => a.id === auditoriumId);
    if (audIndex === -1) return null;

    const generatedSeats = generateAuditoriumSeats(auditoriumId, config);
    db.auditoriums[audIndex].layout = config;
    db.auditoriums[audIndex].totalCapacity = generatedSeats.length;
    if (body.acousticProfile) {
      db.auditoriums[audIndex].acousticProfile = body.acousticProfile;
    }

    // Replace auditorium seats and regenerate ShowSeats for active shows in this auditorium
    db.seats = db.seats.filter((s) => s.auditoriumId !== auditoriumId);
    db.seats.push(...generatedSeats);

    const affectedShows = db.shows.filter((sh) => sh.auditoriumId === auditoriumId);
    for (const show of affectedShows) {
      db.showSeats = db.showSeats.filter((ss) => ss.showId !== show.id);
      for (const seat of generatedSeats) {
        db.showSeats.push({
          id: `${show.id}-${seat.id}`,
          showId: show.id,
          seatId: seat.id,
          status: "AVAILABLE",
          price: config.categoryBasePrices[seat.category] ?? show.basePrice,
          version: 1,
        });
      }
    }

    db.adminLogs.unshift({
      id: `log-${Date.now()}`,
      adminId: "usr-admin-1",
      action: "UPDATE_AUDITORIUM_LAYOUT",
      entityType: "Auditorium",
      entityId: auditoriumId,
      createdAt: new Date().toISOString(),
    });

    return {
      auditorium: db.auditoriums[audIndex],
      totalSeatsGenerated: generatedSeats.length,
    };
  });

  if (!updated) {
    return NextResponse.json({ error: "Auditorium not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
