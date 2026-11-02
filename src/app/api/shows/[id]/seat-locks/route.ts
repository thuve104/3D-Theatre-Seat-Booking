import { NextRequest, NextResponse } from "next/server";
import { runSerializableTransaction } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { acquireAtomicSeatLocks, releaseAtomicSeatLocks } from "@/lib/redis";
import { z } from "zod";

const lockSchema = z.object({
  seatIds: z.array(z.string()).min(1).max(12),
  sessionId: z.string().min(4),
  userId: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: showId } = await params;
  const session = await getSessionUser(req);
  const body = await req.json();
  const parsed = lockSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { seatIds, sessionId } = parsed.data;
  const effectiveUserId = session?.sub || parsed.data.userId || `guest-${sessionId}`;

  // 1. Atomic Redis / Memory lock acquisition
  const acquired = await acquireAtomicSeatLocks(showId, seatIds, effectiveUserId, 600);
  if (!acquired) {
    return NextResponse.json(
      { error: "One or more selected seats were just reserved by another customer." },
      { status: 409 }
    );
  }

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  try {
    const result = await runSerializableTransaction((db) => {
      const now = new Date().toISOString();
      // Clean up expired locks first
      const expired = db.seatLocks.filter((l) => l.showId === showId && l.expiresAt < now);
      if (expired.length > 0) {
        const expIds = new Set(expired.map((e) => e.seatId));
        db.seatLocks = db.seatLocks.filter((l) => !(l.showId === showId && l.expiresAt < now));
        for (const ss of db.showSeats) {
          if (ss.showId === showId && expIds.has(ss.seatId) && ss.status === "LOCKED") {
            ss.status = "AVAILABLE";
          }
        }
      }

      for (const seatId of seatIds) {
        const showSeat = db.showSeats.find(
          (ss) => ss.showId === showId && ss.seatId === seatId
        );
        if (!showSeat) {
          throw new Error(`Seat ${seatId} does not exist for this show.`);
        }
        if (showSeat.status === "BOOKED" || showSeat.status === "UNAVAILABLE") {
          throw new Error(`Seat is already booked or unavailable.`);
        }
        const existingLock = db.seatLocks.find(
          (l) => l.showId === showId && l.seatId === seatId
        );
        if (
          existingLock &&
          existingLock.expiresAt > now &&
          existingLock.userId !== effectiveUserId
        ) {
          throw new Error(`Seat is currently locked by another customer.`);
        }
      }

      const createdLocks = [];
      for (const seatId of seatIds) {
        db.seatLocks = db.seatLocks.filter(
          (l) => !(l.showId === showId && l.seatId === seatId)
        );
        const lockObj = {
          id: `lck-${showId}-${seatId}`,
          showId,
          seatId,
          userId: effectiveUserId,
          sessionId,
          expiresAt,
        };
        db.seatLocks.push(lockObj);
        createdLocks.push(lockObj);

        const ss = db.showSeats.find((s) => s.showId === showId && s.seatId === seatId);
        if (ss) {
          ss.status = "LOCKED";
          ss.version += 1;
        }
      }

      return createdLocks;
    });

    return NextResponse.json({ locks: result, expiresAt }, { status: 201 });
  } catch (err: unknown) {
    await releaseAtomicSeatLocks(showId, seatIds, effectiveUserId);
    const message = err instanceof Error ? err.message : "Seat lock conflict";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: showId } = await params;
  const session = await getSessionUser(req);
  const body = await req.json();
  const seatIds: string[] = body.seatIds || [];
  const effectiveUserId = session?.sub || body.userId;

  await releaseAtomicSeatLocks(showId, seatIds, effectiveUserId);

  await runSerializableTransaction((db) => {
    db.seatLocks = db.seatLocks.filter(
      (l) => !(l.showId === showId && seatIds.includes(l.seatId))
    );
    for (const ss of db.showSeats) {
      if (ss.showId === showId && seatIds.includes(ss.seatId) && ss.status === "LOCKED") {
        ss.status = "AVAILABLE";
      }
    }
  });

  return NextResponse.json({ released: seatIds });
}
