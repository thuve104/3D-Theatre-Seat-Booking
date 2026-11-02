import { create } from "zustand";
import { SeatCategory, ShowSeatStatus, SeatPOVMetrics, calculateSeatPOV } from "@/lib/theatre-engine";

export interface Seat3DItem {
  seatId: string;
  showSeatId: string;
  rowLabel: string;
  rowIndex: number;
  seatNumber: number;
  category: SeatCategory;
  price: number;
  status: ShowSeatStatus;
  posX: number;
  posY: number;
  posZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
}

export type CameraMode = "ORBIT" | "TOP_DOWN" | "SEAT_POV" | "TRAILER_POV";

interface LayoutScreenDims {
  screenWidth: number;
  screenHeight: number;
  screenPositionZ: number;
  screenElevationY: number;
}

interface BookingStoreState {
  showId: string | null;
  seats: Seat3DItem[];
  selectedSeatIds: string[];
  activePreviewSeatId: string | null;
  hoveredSeat: Seat3DItem | null;
  cameraMode: CameraMode;
  povMetrics: SeatPOVMetrics | null;
  isTrailerPlaying: boolean;
  isMuted: boolean;
  volume: number;
  spatialAudioEnabled: boolean;
  customAzimuthOffset: number;
  customPolarOffset: number;
  seatedFov: number;
  autoPovOnSeatClick: boolean;

  setShowData: (showId: string, seats: Seat3DItem[]) => void;
  toggleSeatSelection: (seat: Seat3DItem, layout: LayoutScreenDims) => void;
  selectSpecificSeatForPreview: (seatId: string, layout: LayoutScreenDims) => void;
  enterSeatPOV: (seatId: string, layout: LayoutScreenDims, playTrailer?: boolean) => void;
  exitSeatPOV: () => void;
  resetViewingAngle: () => void;
  nudgeViewingAngle: (dAzimuth: number, dPolar: number) => void;
  setSeatedFov: (fov: number) => void;
  setAutoPovOnSeatClick: (enabled: boolean) => void;
  setCameraMode: (mode: CameraMode) => void;
  setHoveredSeat: (seat: Seat3DItem | null) => void;
  setTrailerPlaying: (playing: boolean) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleSpatialAudio: () => void;
  clearSelection: () => void;
}

export const useBookingStore = create<BookingStoreState>((set, get) => ({
  showId: null,
  seats: [],
  selectedSeatIds: [],
  activePreviewSeatId: null,
  hoveredSeat: null,
  cameraMode: "ORBIT",
  povMetrics: null,
  isTrailerPlaying: false,
  isMuted: false,
  volume: 0.85,
  spatialAudioEnabled: true,
  customAzimuthOffset: 0,
  customPolarOffset: 0,
  seatedFov: 60,
  autoPovOnSeatClick: true,

  setShowData: (showId, seats) => {
    const currentShowId = get().showId;
    if (currentShowId !== showId) {
      set({
        showId,
        seats,
        selectedSeatIds: [],
        activePreviewSeatId: null,
        cameraMode: "ORBIT",
        povMetrics: null,
        isTrailerPlaying: false,
      });
    } else {
      set({ seats });
    }
  },

  toggleSeatSelection: (seat, layout) => {
    const { selectedSeatIds, cameraMode, autoPovOnSeatClick, isTrailerPlaying } = get();
    const metrics = calculateSeatPOV(seat, layout);

    // Even if a seat is booked/locked, allow previewing its perspective if clicked in POV mode
    if (seat.status !== "AVAILABLE") {
      set({
        activePreviewSeatId: seat.seatId,
        povMetrics: metrics,
        customAzimuthOffset: 0,
        customPolarOffset: 0,
        cameraMode:
          cameraMode === "SEAT_POV" || cameraMode === "TRAILER_POV"
            ? cameraMode
            : autoPovOnSeatClick
            ? "SEAT_POV"
            : cameraMode,
      });
      return;
    }

    const exists = selectedSeatIds.includes(seat.seatId);
    const nextSelected = exists
      ? selectedSeatIds.filter((id) => id !== seat.seatId)
      : [...selectedSeatIds, seat.seatId];

    // Always keep the clicked seat as the active preview seat so the user sees THIS seat's exact view
    const nextCameraMode: CameraMode =
      cameraMode === "SEAT_POV" || cameraMode === "TRAILER_POV"
        ? cameraMode
        : autoPovOnSeatClick
        ? isTrailerPlaying
          ? "TRAILER_POV"
          : "SEAT_POV"
        : cameraMode;

    set({
      selectedSeatIds: nextSelected,
      activePreviewSeatId: seat.seatId,
      povMetrics: metrics,
      customAzimuthOffset: 0,
      customPolarOffset: 0,
      cameraMode: nextCameraMode,
    });
  },

  selectSpecificSeatForPreview: (seatId, layout) => {
    const seat = get().seats.find((s) => s.seatId === seatId);
    if (!seat) return;
    set({
      activePreviewSeatId: seatId,
      povMetrics: calculateSeatPOV(seat, layout),
      customAzimuthOffset: 0,
      customPolarOffset: 0,
    });
  },

  enterSeatPOV: (seatId, layout, playTrailer = false) => {
    const seat = get().seats.find((s) => s.seatId === seatId);
    if (!seat) return;
    const metrics = calculateSeatPOV(seat, layout);
    set({
      activePreviewSeatId: seatId,
      povMetrics: metrics,
      cameraMode: playTrailer ? "TRAILER_POV" : "SEAT_POV",
      isTrailerPlaying: playTrailer ? true : get().isTrailerPlaying,
      customAzimuthOffset: 0,
      customPolarOffset: 0,
    });
  },

  exitSeatPOV: () =>
    set({
      cameraMode: "ORBIT",
      isTrailerPlaying: false,
      customAzimuthOffset: 0,
      customPolarOffset: 0,
    }),

  resetViewingAngle: () =>
    set({
      customAzimuthOffset: 0,
      customPolarOffset: 0,
      seatedFov: 60,
    }),

  nudgeViewingAngle: (dAzimuth, dPolar) =>
    set((s) => ({
      customAzimuthOffset: Math.max(-0.65, Math.min(0.65, s.customAzimuthOffset + dAzimuth)),
      customPolarOffset: Math.max(-0.4, Math.min(0.4, s.customPolarOffset + dPolar)),
    })),

  setSeatedFov: (fov) =>
    set({
      seatedFov: Math.max(35, Math.min(82, fov)),
    }),

  setAutoPovOnSeatClick: (autoPovOnSeatClick) => set({ autoPovOnSeatClick }),

  setCameraMode: (cameraMode) =>
    set({
      cameraMode,
      isTrailerPlaying: cameraMode === "TRAILER_POV" ? get().isTrailerPlaying : false,
    }),

  setHoveredSeat: (hoveredSeat) => set({ hoveredSeat }),
  setTrailerPlaying: (isTrailerPlaying) => set({ isTrailerPlaying }),
  setVolume: (volume) => set({ volume }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  toggleSpatialAudio: () => set((s) => ({ spatialAudioEnabled: !s.spatialAudioEnabled })),
  clearSelection: () =>
    set({
      selectedSeatIds: [],
      activePreviewSeatId: null,
      povMetrics: null,
      cameraMode: "ORBIT",
      isTrailerPlaying: false,
    }),
}));
