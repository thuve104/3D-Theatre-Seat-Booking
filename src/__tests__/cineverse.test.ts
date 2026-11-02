import { describe, it, expect, beforeEach } from "vitest";
import {
  generateAuditoriumSeats,
  calculateSeatPOV,
  AuditoriumConfigInput,
} from "../lib/theatre-engine";
import { signTicketPayload, verifyTicketToken } from "../lib/qr-ticket";
import {
  acquireAtomicSeatLocks,
  releaseAtomicSeatLocks,
  clearAllMemoryLocksForTest,
} from "../lib/redis";
import { extractYouTubeId, isYouTubeUrl, getYouTubeEmbedUrl } from "../lib/youtube";

const sampleConfig: AuditoriumConfigInput = {
  width: 24,
  length: 30,
  height: 12,
  screenWidth: 18,
  screenHeight: 7.6,
  screenPositionZ: -13.5,
  screenElevationY: 5.2,
  screenCurve: 0.08,
  numRows: 10,
  seatsPerRow: 16,
  rowSpacing: 1.35,
  seatSpacing: 0.68,
  baseElevation: 0.4,
  seatElevationInc: 0.32,
  curveFactor: 0.15,
  aislePositions: [4, 12],
  rowCategoryMap: {
    A: "ACCESSIBLE",
    B: "STANDARD",
    E: "PREMIUM",
    F: "VIP",
    J: "RECLINER",
  },
  categoryBasePrices: {
    STANDARD: 14,
    PREMIUM: 18,
    VIP: 24,
    RECLINER: 28,
    COUPLE: 52,
    ACCESSIBLE: 14,
  },
};

describe("CINEVERSE Acceptance Test Suite", () => {
  beforeEach(() => {
    clearAllMemoryLocksForTest();
  });

  it("Scenario 1 & 5: Concurrent users attempting to lock the same seat cannot double-book", async () => {
    const showId = "show-concurrency-test";
    const targetSeats = ["seat-F-8", "seat-F-9"];

    const [userAResult, userBResult] = await Promise.all([
      acquireAtomicSeatLocks(showId, targetSeats, "user-A", 60),
      acquireAtomicSeatLocks(showId, ["seat-F-9", "seat-F-10"], "user-B", 60),
    ]);

    expect(userAResult).toBe(true);
    expect(userBResult).toBe(false);
  });

  it("Scenario 2: Expired seat locks automatically allow a new customer to reserve the seat", async () => {
    const showId = "show-ttl-test";
    const seatId = ["seat-G-8"];

    const firstLock = await acquireAtomicSeatLocks(showId, seatId, "user-A", -1);
    expect(firstLock).toBe(true);

    const secondLock = await acquireAtomicSeatLocks(showId, seatId, "user-B", 60);
    expect(secondLock).toBe(true);
  });

  it("Scenario 4: Releasing seat locks on failed/cancelled payment frees the seats immediately", async () => {
    const showId = "show-release-test";
    const seatIds = ["seat-E-5", "seat-E-6"];

    await acquireAtomicSeatLocks(showId, seatIds, "user-A", 60);
    await releaseAtomicSeatLocks(showId, seatIds, "user-A");

    const lockedByOther = await acquireAtomicSeatLocks(showId, seatIds, "user-B", 60);
    expect(lockedByOther).toBe(true);
  });

  it("Scenario 7, 8 & 9: Every seat produces unique 3D camera coordinates and distinct front/back/side POV angles", () => {
    const seats = generateAuditoriumSeats("aud-test", sampleConfig);
    expect(seats.length).toBe(160);

    const frontRowSeat = seats.find((s) => s.rowLabel === "A" && s.seatNumber === 8)!;
    const backRowSeat = seats.find((s) => s.rowLabel === "J" && s.seatNumber === 8)!;
    const leftSideSeat = seats.find((s) => s.rowLabel === "E" && s.seatNumber === 1)!;
    const rightSideSeat = seats.find((s) => s.rowLabel === "E" && s.seatNumber === 16)!;
    const centerSeat = seats.find((s) => s.rowLabel === "E" && s.seatNumber === 8)!;

    const frontPOV = calculateSeatPOV(frontRowSeat, sampleConfig);
    const backPOV = calculateSeatPOV(backRowSeat, sampleConfig);
    const leftPOV = calculateSeatPOV(leftSideSeat, sampleConfig);
    const rightPOV = calculateSeatPOV(rightSideSeat, sampleConfig);
    const centerPOV = calculateSeatPOV(centerSeat, sampleConfig);

    // Camera positions are unique for every seat
    expect(frontPOV.cameraPosition).not.toEqual(backPOV.cameraPosition);
    expect(leftPOV.cameraPosition[0]).toBeLessThan(-4);
    expect(rightPOV.cameraPosition[0]).toBeGreaterThan(4);

    // Front row is closer and looks steeper upward than back row
    expect(frontPOV.distanceToScreenMeters).toBeLessThan(backPOV.distanceToScreenMeters);
    expect(frontPOV.horizontalViewingAngleDeg).toBeGreaterThan(backPOV.horizontalViewingAngleDeg);
    expect(frontPOV.verticalTiltAngleDeg).toBeGreaterThan(backPOV.verticalTiltAngleDeg);

    // Side seats have a much larger horizontal off-axis angle than center seat
    expect(leftPOV.lateralOffsetAngleDeg).toBeGreaterThan(centerPOV.lateralOffsetAngleDeg + 15);
    expect(rightPOV.lateralOffsetAngleDeg).toBeGreaterThan(centerPOV.lateralOffsetAngleDeg + 15);
  });

  it("Scenario 10: Parses YouTube watch, short, and share URLs for 3D Cinema Screen projection", () => {
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=YoHD9XEInc0")).toBe(true);
    expect(extractYouTubeId("https://youtu.be/YoHD9XEInc0?si=1234")).toBe("YoHD9XEInc0");
    expect(getYouTubeEmbedUrl("https://www.youtube.com/watch?v=YoHD9XEInc0")).toContain(
      "https://www.youtube.com/embed/YoHD9XEInc0"
    );
    expect(isYouTubeUrl("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4")).toBe(false);
  });

  it("Scenario 11 & 12: Cryptographic HMAC-SHA256 QR Ticket signing and tamper rejection", () => {
    const token = signTicketPayload({
      ticketCode: "TKT-CV-2026-99001",
      bookingReference: "CV-2026-99001",
      showId: "show-chronos-imax-1930",
      movieTitle: "CHRONOS PROTOCOL: ECLIPSE",
      cinemaName: "CINEVERSE Grand Obsidian Downtown",
      auditoriumName: "Auditorium 1 • IMAX Laser 3D",
      startTime: "2026-11-02T19:30:00.000Z",
      customerName: "Julian Vance",
      seats: ["F-7", "F-8"],
      issuedAt: Date.now(),
    });

    const verified = verifyTicketToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.seats).toEqual(["F-7", "F-8"]);

    const tampered = token.slice(0, -5) + "ABCDE";
    expect(verifyTicketToken(tampered)).toBeNull();
  });
});
