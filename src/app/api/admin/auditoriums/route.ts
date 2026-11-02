import { NextRequest, NextResponse } from "next/server";
import { runSerializableTransaction } from "@/lib/db";
import { generateAuditoriumSeats, AuditoriumConfigInput } from "@/lib/theatre-engine";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { cinemaId, name, layout } = body as {
    cinemaId: string;
    name: string;
    layout: AuditoriumConfigInput;
  };

  if (!cinemaId || !name || !layout) {
    return NextResponse.json({ error: "cinemaId, name, and layout are required" }, { status: 400 });
  }

  const result = await runSerializableTransaction((db) => {
    const auditoriumId = `aud-${crypto.randomBytes(4).toString("hex")}`;
    const seats = generateAuditoriumSeats(auditoriumId, layout);

    const newAuditorium = {
      id: auditoriumId,
      cinemaId,
      name,
      totalCapacity: seats.length,
      acousticProfile: {
        reverbWetMix: 0.2,
        roomAmbienceDb: -42,
        audioLevel: 1.0,
        enableSurroundProcessing: true,
      },
      layout,
    };

    db.auditoriums.push(newAuditorium);
    db.seats.push(...seats);
    return { auditorium: newAuditorium, seatsCount: seats.length };
  });

  return NextResponse.json(result, { status: 201 });
}
