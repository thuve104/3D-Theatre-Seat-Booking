export type SeatCategory =
  | "STANDARD"
  | "PREMIUM"
  | "VIP"
  | "RECLINER"
  | "COUPLE"
  | "ACCESSIBLE";

export type ShowSeatStatus =
  | "AVAILABLE"
  | "LOCKED"
  | "BOOKED"
  | "UNAVAILABLE";

export interface AuditoriumConfigInput {
  width: number;
  length: number;
  height: number;
  screenWidth: number;
  screenHeight: number;
  screenPositionZ: number;
  screenElevationY: number;
  screenCurve: number;
  numRows: number;
  seatsPerRow: number;
  rowSpacing: number;
  seatSpacing: number;
  baseElevation: number;
  seatElevationInc: number;
  curveFactor: number;
  aislePositions: number[];
  rowCategoryMap: Record<string, SeatCategory>;
  categoryBasePrices: Record<SeatCategory, number>;
}

export interface GeneratedSeatNode {
  id: string;
  auditoriumId: string;
  rowLabel: string;
  rowIndex: number;
  seatNumber: number;
  category: SeatCategory;
  basePrice: number;
  posX: number;
  posY: number;
  posZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
}

export interface SeatPOVMetrics {
  cameraPosition: [number, number, number];
  lookAtTarget: [number, number, number];
  distanceToScreenMeters: number;
  horizontalViewingAngleDeg: number;
  lateralOffsetAngleDeg: number;
  verticalTiltAngleDeg: number;
  acousticSweetSpotScore: number;
}

const SEATED_EYE_HEIGHT_OFFSET = 1.12; // Realistic human eye height above seat base (meters)

export function generateAuditoriumSeats(
  auditoriumId: string,
  config: AuditoriumConfigInput
): GeneratedSeatNode[] {
  const generatedSeats: GeneratedSeatNode[] = [];
  const aisleGapWidth = config.seatSpacing * 1.35;
  const firstRowZ = config.screenPositionZ + 5.8;

  for (let r = 0; r < config.numRows; r++) {
    const rowLabel = String.fromCharCode(65 + r);
    const category: SeatCategory = config.rowCategoryMap[rowLabel] || "STANDARD";
    const isWideSeat = category === "RECLINER" || category === "VIP" || category === "COUPLE";
    const effectiveSeatSpacing = isWideSeat ? config.seatSpacing * 1.22 : config.seatSpacing;

    const totalAisles = config.aislePositions.filter((p) => p < config.seatsPerRow).length;
    const totalRowWidth =
      (config.seatsPerRow - 1) * effectiveSeatSpacing + totalAisles * aisleGapWidth;
    const startX = -totalRowWidth / 2;

    // Parabolic stadium rake for unobstructed sightlines
    const posY =
      config.baseElevation +
      r * config.seatElevationInc +
      Math.pow(r / Math.max(1, config.numRows), 1.35) * 0.65;

    const baseRowZ = firstRowZ + r * config.rowSpacing;

    for (let s = 1; s <= config.seatsPerRow; s++) {
      const aislesPassed = config.aislePositions.filter((aisleIdx) => s > aisleIdx).length;
      const posX = startX + (s - 1) * effectiveSeatSpacing + aislesPassed * aisleGapWidth;

      const normalizedX = totalRowWidth > 0 ? posX / (totalRowWidth / 2) : 0;
      const arcOffsetZ = -Math.pow(normalizedX, 2) * config.curveFactor * 1.8;
      const posZ = baseRowZ + arcOffsetZ;

      const deltaX = 0 - posX;
      const deltaY = config.screenElevationY - (posY + SEATED_EYE_HEIGHT_OFFSET);
      const deltaZ = config.screenPositionZ - posZ;

      const rotY = Math.atan2(deltaX, -deltaZ) * 0.65;
      const horizontalDist = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
      const rotX = Math.atan2(deltaY, horizontalDist) * 0.25;

      generatedSeats.push({
        id: `${auditoriumId}-seat-${rowLabel}-${s}`,
        auditoriumId,
        rowLabel,
        rowIndex: r,
        seatNumber: s,
        category,
        basePrice: config.categoryBasePrices[category] ?? 15.0,
        posX: Number(posX.toFixed(3)),
        posY: Number(posY.toFixed(3)),
        posZ: Number(posZ.toFixed(3)),
        rotX: Number(rotX.toFixed(4)),
        rotY: Number(rotY.toFixed(4)),
        rotZ: 0,
      });
    }
  }

  return generatedSeats;
}

export function calculateSeatPOV(
  seat: { posX: number; posY: number; posZ: number },
  layout: {
    screenWidth: number;
    screenHeight: number;
    screenPositionZ: number;
    screenElevationY: number;
  }
): SeatPOVMetrics {
  const eyeX = seat.posX;
  const eyeY = seat.posY + SEATED_EYE_HEIGHT_OFFSET;
  const eyeZ = seat.posZ;

  const dx = 0 - eyeX;
  const dy = layout.screenElevationY - eyeY;
  const dz = layout.screenPositionZ - eyeZ;

  const distanceToScreenMeters = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const horizontalDist = Math.sqrt(dx * dx + dz * dz);

  const leftEdgeX = -layout.screenWidth / 2;
  const rightEdgeX = layout.screenWidth / 2;

  const vecLeft = [leftEdgeX - eyeX, layout.screenPositionZ - eyeZ];
  const vecRight = [rightEdgeX - eyeX, layout.screenPositionZ - eyeZ];
  const dot = vecLeft[0] * vecRight[0] + vecLeft[1] * vecRight[1];
  const magLeft = Math.hypot(vecLeft[0], vecLeft[1]);
  const magRight = Math.hypot(vecRight[0], vecRight[1]);
  const horizontalViewingAngleDeg =
    (Math.acos(Math.min(1, Math.max(-1, dot / (magLeft * magRight)))) * 180) / Math.PI;

  const lateralOffsetAngleDeg = (Math.atan2(Math.abs(eyeX), Math.abs(dz)) * 180) / Math.PI;
  const verticalTiltAngleDeg = (Math.atan2(dy, horizontalDist) * 180) / Math.PI;

  // THX / SMPTE optimal viewing angle is ~36-45 deg horizontal FOV with minimal lateral offset
  const fovPenalty = Math.abs(horizontalViewingAngleDeg - 40) * 1.1;
  const lateralPenalty = lateralOffsetAngleDeg * 1.4;
  const tiltPenalty = Math.abs(verticalTiltAngleDeg) * 1.2;
  const acousticSweetSpotScore = Math.max(
    45,
    Math.min(99, Math.round(100 - (fovPenalty + lateralPenalty + tiltPenalty) * 0.6))
  );

  return {
    cameraPosition: [eyeX, eyeY, eyeZ],
    lookAtTarget: [0, layout.screenElevationY, layout.screenPositionZ],
    distanceToScreenMeters: Number(distanceToScreenMeters.toFixed(1)),
    horizontalViewingAngleDeg: Number(horizontalViewingAngleDeg.toFixed(1)),
    lateralOffsetAngleDeg: Number(lateralOffsetAngleDeg.toFixed(1)),
    verticalTiltAngleDeg: Number(verticalTiltAngleDeg.toFixed(1)),
    acousticSweetSpotScore,
  };
}
