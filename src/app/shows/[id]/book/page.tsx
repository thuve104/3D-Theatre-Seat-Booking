"use client";

import React, { useEffect, useRef, useState, Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, AdaptiveEvents } from "@react-three/drei";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBookingStore, Seat3DItem } from "@/store/useBookingStore";
import { InstancedSeats } from "@/components/three/InstancedSeats";
import { CinemaScreen } from "@/components/three/CinemaScreen";
import { SeatPOVCamera } from "@/components/three/SeatPOVCamera";
import { AuditoriumShell } from "@/components/three/AuditoriumShell";
import { cinemaAudioEngine, AcousticProfileConfig } from "@/lib/audio-engine";
import { isYouTubeUrl } from "@/lib/youtube";
import {
  Eye,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Compass,
  ArrowLeft,
  Sparkles,
  Maximize2,
  Youtube,
  Grid,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface ShowMetaPayload {
  showId: string;
  movieId: string;
  movieTitle: string;
  posterUrl: string;
  backdropUrl: string;
  trailerUrl: string;
  durationMinutes: number;
  ageRating: string;
  cinemaId: string;
  cinemaName: string;
  city: string;
  auditoriumId: string;
  auditoriumName: string;
  acousticProfile: AcousticProfileConfig;
  startTime: string;
  layout: {
    width: number;
    length: number;
    height: number;
    screenWidth: number;
    screenHeight: number;
    screenPositionZ: number;
    screenElevationY: number;
  };
}

export default function Interactive3DTheatreBookingPage() {
  const { id: showId } = useParams<{ id: string }>();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null);

  const {
    seats,
    selectedSeatIds,
    activePreviewSeatId,
    hoveredSeat,
    cameraMode,
    povMetrics,
    isTrailerPlaying,
    isMuted,
    volume,
    spatialAudioEnabled,
    seatedFov,
    autoPovOnSeatClick,
    setShowData,
    toggleSeatSelection,
    enterSeatPOV,
    exitSeatPOV,
    resetViewingAngle,
    nudgeViewingAngle,
    setSeatedFov,
    setAutoPovOnSeatClick,
    setCameraMode,
    setTrailerPlaying,
    setVolume,
    toggleMute,
    toggleSpatialAudio,
  } = useBookingStore();

  const [showMeta, setShowMeta] = useState<ShowMetaPayload | null>(null);
  const [customTrailerUrl, setCustomTrailerUrl] = useState<string>("");
  const [trailerInputOpen, setTrailerInputOpen] = useState<boolean>(false);
  const [seatMapPanelOpen, setSeatMapPanelOpen] = useState<boolean>(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [audioReadyIndicator, setAudioReadyIndicator] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [lockingInProgress, setLockingInProgress] = useState(false);

  useEffect(() => {
    async function fetchSeats() {
      const res = await fetch(`/api/shows/${showId}/seats`);
      if (!res.ok) return;
      const data = await res.json();
      setShowMeta(data.meta);
      setCustomTrailerUrl(data.meta.trailerUrl || "");
      setShowData(showId, data.seats);
    }
    fetchSeats();
  }, [showId, setShowData]);

  const effectiveTrailerUrl = customTrailerUrl.trim() || showMeta?.trailerUrl || "";
  const isYouTube = isYouTubeUrl(effectiveTrailerUrl);

  // Send postMessage commands to YouTube IFrame API when controlling playback/audio
  const sendYouTubeCommand = (func: string, args: unknown[] = []) => {
    if (!youtubeIframeRef.current?.contentWindow) return;
    youtubeIframeRef.current.contentWindow.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*"
    );
  };

  // Synchronize Web Audio API stereo panning & distance air absorption whenever active seat changes
  useEffect(() => {
    if (!showMeta || !activePreviewSeatId || !povMetrics) return;
    const activeSeat = seats.find((s) => s.seatId === activePreviewSeatId);
    if (activeSeat) {
      cinemaAudioEngine.updateSeatAcoustics(
        activeSeat,
        showMeta.layout.width,
        povMetrics.distanceToScreenMeters,
        spatialAudioEnabled
      );
    }
  }, [activePreviewSeatId, povMetrics, seats, showMeta, spatialAudioEnabled]);

  const handleSeatClick = (seat: Seat3DItem) => {
    if (!showMeta) return;
    setLockError(null);
    toggleSeatSelection(seat, showMeta.layout);
  };

  const handleJumpToSeatPOV = (seat: Seat3DItem) => {
    if (!showMeta) return;
    setLockError(null);
    if (seat.status === "AVAILABLE" && !selectedSeatIds.includes(seat.seatId)) {
      toggleSeatSelection(seat, showMeta.layout);
    }
    enterSeatPOV(seat.seatId, showMeta.layout, isTrailerPlaying);
  };

  const handleExperienceThisSeat = () => {
    if (!showMeta) return;
    const targetSeatId =
      activePreviewSeatId ||
      selectedSeatIds[selectedSeatIds.length - 1] ||
      seats.find((s) => s.rowLabel === "E" && s.seatNumber === 8)?.seatId ||
      seats[0]?.seatId;
    if (!targetSeatId) return;
    enterSeatPOV(targetSeatId, showMeta.layout, isTrailerPlaying);
  };

  const handlePlayTrailerFromSeat = async () => {
    if (!showMeta) return;
    const targetSeatId =
      activePreviewSeatId ||
      selectedSeatIds[selectedSeatIds.length - 1] ||
      seats.find((s) => s.rowLabel === "E" && s.seatNumber === 8)?.seatId ||
      seats[0]?.seatId;
    if (!targetSeatId) return;

    enterSeatPOV(targetSeatId, showMeta.layout, true);
    setTrailerPlaying(true);
    setAudioReadyIndicator(true);

    if (!isYouTube && videoRef.current) {
      await cinemaAudioEngine.attachVideoElement(
        videoRef.current,
        showMeta.acousticProfile
      );
      const activeSeat = seats.find((s) => s.seatId === targetSeatId);
      if (activeSeat && povMetrics) {
        cinemaAudioEngine.updateSeatAcoustics(
          activeSeat,
          showMeta.layout.width,
          povMetrics.distanceToScreenMeters,
          spatialAudioEnabled
        );
      }
      cinemaAudioEngine.setVolume(volume, isMuted);
      await videoRef.current.play().catch(() => {});
    } else if (isYouTube) {
      if (videoRef.current) videoRef.current.pause();
      setTimeout(() => {
        sendYouTubeCommand("playVideo");
        sendYouTubeCommand("setVolume", [Math.round(volume * 100)]);
      }, 300);
    }
  };

  const handleTogglePlayPause = async () => {
    if (isYouTube) {
      if (isTrailerPlaying) {
        sendYouTubeCommand("pauseVideo");
        setTrailerPlaying(false);
      } else {
        setTrailerPlaying(true);
        setTimeout(() => sendYouTubeCommand("playVideo"), 150);
      }
      return;
    }

    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      await cinemaAudioEngine.attachVideoElement(
        videoRef.current,
        showMeta?.acousticProfile
      );
      setAudioReadyIndicator(true);
      await videoRef.current.play().catch(() => {});
      setTrailerPlaying(true);
    } else {
      videoRef.current.pause();
      setTrailerPlaying(false);
    }
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Group seats by row for the interactive 2D Mini Seat Map & Quick POV Switcher
  const seatsByRow = useMemo(() => {
    const map = new Map<string, Seat3DItem[]>();
    seats.forEach((s) => {
      const list = map.get(s.rowLabel) || [];
      list.push(s);
      map.set(s.rowLabel, list);
    });
    return Array.from(map.entries());
  }, [seats]);

  const selectedSeatsList = seats.filter((s) => selectedSeatIds.includes(s.seatId));
  const subtotal = selectedSeatsList.reduce((sum, s) => sum + Number(s.price), 0);
  const taxes = Number((subtotal * 0.085).toFixed(2));
  const bookingFee =
    selectedSeatsList.length > 0 ? Number((selectedSeatsList.length * 1.75).toFixed(2)) : 0;
  const totalPayable = Number((subtotal + taxes + bookingFee).toFixed(2));

  const activePreviewSeat = seats.find((s) => s.seatId === activePreviewSeatId);

  if (!showMeta) {
    return (
      <div className="min-h-screen bg-cinema-obsidian text-white flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-cinema-gold font-bold text-lg tracking-widest animate-pulse">
            CONSTRUCTING 3D AUDITORIUM GEOMETRY...
          </div>
          <p className="text-xs text-gray-400">
            Loading parametric seat coordinates & acoustic profile
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-cinema-obsidian text-white overflow-hidden select-none flex flex-col"
    >
      {/* Hidden synchronized HTML5 Video element for direct MP4/WebM streams */}
      {!isYouTube && (
        <video
          ref={videoRef}
          src={effectiveTrailerUrl}
          crossOrigin="anonymous"
          playsInline
          loop
          onTimeUpdate={() => {
            if (videoRef.current && videoRef.current.duration) {
              setVideoProgress(
                (videoRef.current.currentTime / videoRef.current.duration) * 100
              );
            }
          }}
          className="hidden"
        />
      )}

      {/* Top Navigation, Seat Perspective Presets & YouTube URL Switcher */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-cinema-obsidian/95 border-b border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-cinema-charcoal border border-white/10 text-gray-300 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-wide text-white">
                {showMeta.movieTitle}
              </h1>
              <span className="px-2 py-0.5 rounded bg-cinema-crimson/20 border border-cinema-crimson/40 text-[10px] font-bold text-cinema-gold">
                {showMeta.ageRating}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {showMeta.cinemaName} • {showMeta.auditoriumName}
            </p>
          </div>
        </div>

        {/* Distinct Seat Perspective Comparison Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-white/10 text-xs">
          <span className="px-2 text-[11px] text-cinema-gold font-semibold">
            Compare Perspectives:
          </span>
          {[
            { label: "Front Left (A-1)", row: "A", num: 1 },
            { label: "Front Center (A-8)", row: "A", num: 8 },
            { label: "VIP Center (F-8)", row: "F", num: 8 },
            { label: "Side Right (E-16)", row: "E", num: 16 },
            { label: "Back Row (J-8)", row: "J", num: 8 },
          ].map((preset) => {
            const target = seats.find(
              (s) => s.rowLabel === preset.row && s.seatNumber === preset.num
            );
            if (!target) return null;
            const isCurrent =
              activePreviewSeatId === target.seatId &&
              (cameraMode === "SEAT_POV" || cameraMode === "TRAILER_POV");
            return (
              <button
                key={preset.label}
                onClick={() => enterSeatPOV(target.seatId, showMeta.layout, isTrailerPlaying)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                  isCurrent
                    ? "bg-cinema-gold text-black font-bold shadow"
                    : "text-gray-300 hover:bg-white/10"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Camera Mode & YouTube URL Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTrailerInputOpen(!trailerInputOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              isYouTube || trailerInputOpen
                ? "bg-red-600/20 border-red-500 text-red-300"
                : "bg-cinema-charcoal border-white/10 text-gray-300 hover:text-white"
            }`}
          >
            <Youtube className="w-4 h-4 text-red-500" />
            {isYouTube ? "YouTube URL Active" : "Use YouTube URL"}
          </button>

          <button
            onClick={() => setSeatMapPanelOpen(!seatMapPanelOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              seatMapPanelOpen
                ? "bg-cinema-gold/20 border-cinema-gold text-cinema-gold"
                : "bg-cinema-charcoal border-white/10 text-gray-300"
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            Seat Picker
          </button>

          <button
            onClick={() => {
              if (videoRef.current) videoRef.current.pause();
              setCameraMode("ORBIT");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              cameraMode === "ORBIT"
                ? "bg-cinema-crimson text-white shadow-crimson-glow"
                : "bg-cinema-charcoal text-gray-300 border border-white/10 hover:text-white"
            }`}
          >
            3D Orbit
          </button>
          <button
            onClick={() => {
              if (videoRef.current) videoRef.current.pause();
              setCameraMode("TOP_DOWN");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              cameraMode === "TOP_DOWN"
                ? "bg-cinema-crimson text-white shadow-crimson-glow"
                : "bg-cinema-charcoal text-gray-300 border border-white/10 hover:text-white"
            }`}
          >
            Top View
          </button>

          {(cameraMode === "SEAT_POV" || cameraMode === "TRAILER_POV") && (
            <button
              onClick={() => {
                if (videoRef.current) videoRef.current.pause();
                exitSeatPOV();
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cinema-gold text-black hover:bg-cinema-goldLight transition"
            >
              Back to Full Theatre
            </button>
          )}
        </div>
      </header>

      {/* Collapsible YouTube / Custom Video URL Bar */}
      {trailerInputOpen && (
        <div className="relative z-20 bg-cinema-charcoal border-b border-white/15 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <Youtube className="w-4 h-4 text-red-500" />
            <span>Paste any YouTube URL or MP4 URL to project onto the 3D Cinema Screen:</span>
          </div>
          <div className="flex-1 max-w-2xl flex items-center gap-2">
            <input
              type="text"
              value={customTrailerUrl}
              onChange={(e) => setCustomTrailerUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ or MP4 URL..."
              className="flex-1 px-3 py-1.5 rounded-lg bg-black/60 border border-white/15 text-xs text-white"
            />
            <button
              onClick={() => {
                setCustomTrailerUrl("https://www.youtube.com/watch?v=YoHD9XEInc0");
                handlePlayTrailerFromSeat();
              }}
              className="px-3 py-1.5 rounded-lg bg-red-600/30 border border-red-500/50 text-xs font-semibold text-red-200 hover:bg-red-600/50 shrink-0"
            >
              Load Sample YouTube Trailer
            </button>
            <button
              onClick={handlePlayTrailerFromSeat}
              className="px-3.5 py-1.5 rounded-lg bg-cinema-crimson text-xs font-bold text-white shrink-0"
            >
              Project on 3D Screen
            </button>
          </div>
        </div>
      )}

      {/* Main 3D WebGL Canvas Area */}
      <div className="relative flex-1 w-full">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 12.5, 19.5], fov: 50 }}
          className="w-full h-full"
        >
          <AdaptiveDpr pixelated />
          <AdaptiveEvents />
          <color attach="background" args={["#050508"]} />
          <fog attach="fog" args={["#050508", 26, 56]} />

          <ambientLight intensity={isTrailerPlaying ? 0.16 : 0.55} />
          <directionalLight
            position={[0, showMeta.layout.height, 8]}
            intensity={isTrailerPlaying ? 0.25 : 1.1}
            castShadow
          />

          <Suspense fallback={null}>
            <AuditoriumShell
              width={showMeta.layout.width}
              length={showMeta.layout.length}
              height={showMeta.layout.height}
              screenPositionZ={showMeta.layout.screenPositionZ}
              isTrailerPlaying={isTrailerPlaying}
            />

            <CinemaScreen
              width={showMeta.layout.screenWidth}
              height={showMeta.layout.screenHeight}
              posZ={showMeta.layout.screenPositionZ}
              posY={showMeta.layout.screenElevationY}
              posterUrl={showMeta.backdropUrl || showMeta.posterUrl}
              trailerUrl={effectiveTrailerUrl}
              movieTitle={showMeta.movieTitle}
              videoElement={videoRef.current}
              youtubeIframeRef={youtubeIframeRef}
            />

            <InstancedSeats onSelectSeat={handleSeatClick} />

            <SeatPOVCamera />
          </Suspense>
        </Canvas>

        {/* Interactive 2D Mini Seat Map & Instant POV Switcher (Right Side Overlay) */}
        {seatMapPanelOpen && (
          <div className="absolute top-4 right-4 z-20 w-80 bg-cinema-charcoal/95 border border-white/15 rounded-2xl p-3.5 backdrop-blur-xl shadow-2xl space-y-2.5 max-h-[calc(100vh-180px)] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">
                  Interactive Seat POV Switcher
                </div>
                <div className="text-[10px] text-gray-400">
                  Click any seat below to jump directly to its 3D view
                </div>
              </div>
              <label className="flex items-center gap-1 text-[10px] text-cinema-gold cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPovOnSeatClick}
                  onChange={(e) => setAutoPovOnSeatClick(e.target.checked)}
                  className="accent-cinema-gold"
                />
                Auto-POV
              </label>
            </div>

            {/* Screen Curve Indicator */}
            <div className="w-full py-1 text-center text-[10px] font-bold tracking-widest uppercase text-cinema-gold bg-gradient-to-b from-cinema-gold/25 to-transparent rounded-t-full border-t-2 border-cinema-gold">
              CINEMA SCREEN ({showMeta.layout.screenWidth}m × {showMeta.layout.screenHeight}m)
            </div>

            {/* Seat Matrix */}
            <div className="space-y-1 pt-1">
              {seatsByRow.map(([rowLabel, rowSeats]) => (
                <div key={rowLabel} className="flex items-center gap-1 justify-center">
                  <span className="w-4 text-[10px] font-mono font-bold text-cinema-gold">
                    {rowLabel}
                  </span>
                  <div className="flex items-center gap-0.5 flex-wrap justify-center">
                    {rowSeats.map((s) => {
                      const isSelected = selectedSeatIds.includes(s.seatId);
                      const isActivePOV = activePreviewSeatId === s.seatId;
                      let bg = "bg-seat-available hover:brightness-125";
                      if (isSelected) bg = "bg-seat-selected text-black font-bold";
                      else if (s.status === "BOOKED") bg = "bg-seat-occupied opacity-70";
                      else if (s.status === "LOCKED") bg = "bg-seat-reserved";
                      else if (s.status === "UNAVAILABLE") bg = "bg-seat-unavailable opacity-50";

                      return (
                        <button
                          key={s.seatId}
                          onClick={() => handleJumpToSeatPOV(s)}
                          title={`Row ${s.rowLabel} Seat ${s.seatNumber} (${s.category} - $${s.price})`}
                          className={`w-3.5 h-3.5 rounded-[3px] text-[8px] flex items-center justify-center transition ${bg} ${
                            isActivePOV ? "ring-2 ring-white scale-125 z-10" : ""
                          }`}
                        >
                          {s.seatNumber}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {activePreviewSeat && povMetrics && (
              <div className="pt-2 border-t border-white/10 text-[11px] flex items-center justify-between text-gray-300">
                <span>
                  Viewing: <strong className="text-cinema-gold">{activePreviewSeat.rowLabel}-{activePreviewSeat.seatNumber}</strong>
                </span>
                <span className="font-mono text-[10px]">
                  Dist: {povMetrics.distanceToScreenMeters}m | Tilt: {povMetrics.verticalTiltAngleDeg}° | Off-Axis: {povMetrics.lateralOffsetAngleDeg}°
                </span>
              </div>
            )}
          </div>
        )}

        {/* Hovered Seat Floating Badge */}
        {hoveredSeat && (
          <div className="absolute top-4 left-6 z-20 bg-cinema-charcoal/95 border border-cinema-gold/40 rounded-xl px-4 py-2.5 backdrop-blur-md shadow-xl pointer-events-none">
            <div className="text-xs font-bold text-cinema-gold">
              Row {hoveredSeat.rowLabel} • Seat {hoveredSeat.seatNumber}
            </div>
            <div className="text-xs text-white font-semibold">
              {hoveredSeat.category} — ${Number(hoveredSeat.price).toFixed(2)}
            </div>
            <div className="text-[10px] text-gray-400">
              3D Pos: ({hoveredSeat.posX}m, {hoveredSeat.posY}m, {hoveredSeat.posZ}m) •{" "}
              {hoveredSeat.status}
            </div>
          </div>
        )}

        {/* Seated POV Telemetry & Synchronized Trailer Audio HUD */}
        {(cameraMode === "SEAT_POV" || cameraMode === "TRAILER_POV") &&
          activePreviewSeat &&
          povMetrics && (
            <div className="absolute bottom-4 left-6 z-20 w-full max-w-md bg-cinema-charcoal/95 border border-cinema-gold/40 rounded-2xl p-4 backdrop-blur-xl shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-cinema-gold font-bold block">
                    Seated Eye-Level Perspective (3D Coords: {activePreviewSeat.posX}m,{" "}
                    {activePreviewSeat.posY}m, {activePreviewSeat.posZ}m)
                  </span>
                  <h3 className="text-sm font-extrabold text-white">
                    Row {activePreviewSeat.rowLabel}, Seat {activePreviewSeat.seatNumber} •{" "}
                    {activePreviewSeat.category} (${Number(activePreviewSeat.price).toFixed(2)})
                  </h3>
                </div>
                {(audioReadyIndicator || isYouTube) && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <Volume2 className="w-3 h-3" /> {isYouTube ? "YouTube 3D" : "Audio Synced"}
                  </span>
                )}
              </div>

              {/* Optical & Acoustic Metrics */}
              <div className="grid grid-cols-4 gap-2 text-center bg-black/50 rounded-xl p-2 border border-white/5">
                <div>
                  <div className="text-[10px] text-gray-400">Screen Dist</div>
                  <div className="text-xs font-mono font-bold text-white">
                    {povMetrics.distanceToScreenMeters}m
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400">Horiz. FOV</div>
                  <div className="text-xs font-mono font-bold text-white">
                    {povMetrics.horizontalViewingAngleDeg}°
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400">Vert. Tilt</div>
                  <div className="text-xs font-mono font-bold text-white">
                    {povMetrics.verticalTiltAngleDeg > 0 ? "+" : ""}
                    {povMetrics.verticalTiltAngleDeg}°
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400">Off-Axis</div>
                  <div className="text-xs font-mono font-bold text-cinema-gold">
                    {povMetrics.lateralOffsetAngleDeg}°
                  </div>
                </div>
              </div>

              {/* Viewing Direction & Eye FOV Zoom Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-black/30 px-3 py-2 rounded-xl">
                <span className="text-[11px] text-gray-300 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-cinema-gold" /> Drag Canvas or Turn Head:
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => nudgeViewingAngle(0.14, 0)}
                    className="px-2 py-1 rounded bg-cinema-slate hover:bg-white/15 text-[11px]"
                  >
                    ← Left
                  </button>
                  <button
                    onClick={resetViewingAngle}
                    className="px-2 py-1 rounded bg-cinema-gold/20 text-cinema-gold hover:bg-cinema-gold/30 text-[11px] font-semibold"
                  >
                    Reset Center
                  </button>
                  <button
                    onClick={() => nudgeViewingAngle(-0.14, 0)}
                    className="px-2 py-1 rounded bg-cinema-slate hover:bg-white/15 text-[11px]"
                  >
                    Right →
                  </button>
                  <button
                    onClick={() => setSeatedFov(seatedFov - 6)}
                    title="Zoom In"
                    className="p-1 rounded bg-cinema-slate hover:bg-white/15"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSeatedFov(seatedFov + 6)}
                    title="Zoom Out (Wider Peripheral View)"
                    className="p-1 rounded bg-cinema-slate hover:bg-white/15"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Synchronized Trailer Playback & Web Audio API Controls */}
              <div className="space-y-2 pt-1 border-t border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleTogglePlayPause}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cinema-crimson hover:bg-cinema-crimsonDark text-xs font-bold text-white transition"
                    >
                      {isTrailerPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" /> Play Trailer
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        if (isYouTube) {
                          sendYouTubeCommand("seekTo", [0, true]);
                          sendYouTubeCommand("playVideo");
                          setTrailerPlaying(true);
                        } else if (videoRef.current) {
                          videoRef.current.currentTime = 0;
                          videoRef.current.play().catch(() => {});
                          setTrailerPlaying(true);
                        }
                      }}
                      title="Restart Trailer"
                      className="p-1.5 rounded-lg bg-cinema-slate hover:bg-white/15 text-gray-200"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        const nextMuted = !isMuted;
                        toggleMute();
                        if (isYouTube) {
                          sendYouTubeCommand(nextMuted ? "mute" : "unMute");
                        } else {
                          cinemaAudioEngine.setVolume(volume, nextMuted);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-cinema-slate hover:bg-white/15 text-gray-200"
                    >
                      {isMuted ? (
                        <VolumeX className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5 text-cinema-gold" />
                      )}
                    </button>

                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setVolume(v);
                        if (isYouTube) {
                          sendYouTubeCommand("unMute");
                          sendYouTubeCommand("setVolume", [Math.round(v * 100)]);
                        } else {
                          cinemaAudioEngine.setVolume(v, false);
                        }
                      }}
                      className="w-20 accent-cinema-crimson"
                    />
                  </div>

                  <button
                    onClick={handleFullscreen}
                    title="Fullscreen"
                    className="p-1.5 rounded-lg bg-cinema-slate hover:bg-white/15 text-gray-200"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {!isYouTube && (
                  <div
                    onClick={(e) => {
                      if (!videoRef.current || !videoRef.current.duration) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ratio = (e.clientX - rect.left) / rect.width;
                      videoRef.current.currentTime = ratio * videoRef.current.duration;
                    }}
                    className="w-full bg-white/15 h-1.5 rounded-full overflow-hidden cursor-pointer"
                  >
                    <div
                      className="bg-cinema-crimson h-full transition-all"
                      style={{ width: `${videoProgress}%` }}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={spatialAudioEnabled}
                      onChange={toggleSpatialAudio}
                      className="accent-cinema-gold"
                    />
                    Optional Spatial Room Acoustics (Stereo Pan + Reverb)
                  </label>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Bottom Dock: 5-Color Legend, Core POV Differentiators & Booking Summary */}
      <footer className="relative z-20 bg-cinema-charcoal/95 border-t border-white/10 px-6 py-4 backdrop-blur-xl">
        {lockError && (
          <div className="mb-3 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-xs text-red-200">
            {lockError}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* 5-State Seat Color System */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-seat-available inline-block" /> Green:
              Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-seat-selected inline-block" /> Yellow:
              Selected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-seat-reserved inline-block" /> Blue:
              Reserved
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-seat-occupied inline-block" /> Red:
              Sold
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-seat-unavailable inline-block" /> Grey:
              Unavailable
            </span>
          </div>

          {/* Core Differentiating Experience Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExperienceThisSeat}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-cinema-slate border border-cinema-gold/50 text-cinema-gold hover:bg-cinema-gold hover:text-black transition"
            >
              <Eye className="w-4 h-4" />
              Experience This Seat
            </button>

            <button
              onClick={handlePlayTrailerFromSeat}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gold-shimmer border border-cinema-gold text-white hover:shadow-gold-glow transition"
            >
              <Sparkles className="w-4 h-4 text-cinema-gold" />
              Play Trailer From This Seat
            </button>
          </div>

          {/* Booking Summary & Lock-to-Checkout Action */}
          <div className="flex items-center gap-5">
            <div className="text-right">
              <div className="text-xs text-gray-300 font-medium">
                {selectedSeatsList.length > 0
                  ? `${selectedSeatsList.length} Seat(s): ` +
                    selectedSeatsList
                      .map((s) => `${s.rowLabel}-${s.seatNumber} (${s.category})`)
                      .join(", ")
                  : "Click any 3D chair or seat map square"}
              </div>
              <div className="text-sm font-extrabold text-white">
                Total: ${totalPayable.toFixed(2)}{" "}
                <span className="text-[11px] font-normal text-gray-400">
                  (${subtotal.toFixed(2)} + ${taxes.toFixed(2)} tax + ${bookingFee.toFixed(2)} fee)
                </span>
              </div>
            </div>

            <button
              disabled={selectedSeatsList.length === 0 || lockingInProgress}
              onClick={async () => {
                setLockError(null);
                setLockingInProgress(true);
                try {
                  const sessionId =
                    typeof window !== "undefined"
                      ? window.sessionStorage.getItem("cv_session") ||
                        (() => {
                          const id = `sess_${Math.random().toString(36).slice(2)}`;
                          window.sessionStorage.setItem("cv_session", id);
                          return id;
                        })()
                      : "sess_default";

                  const res = await fetch(`/api/shows/${showId}/seat-locks`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      seatIds: selectedSeatIds,
                      sessionId,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    setLockError(data.error || "Could not lock selected seats.");
                    setLockingInProgress(false);
                    return;
                  }
                  router.push(
                    `/checkout?showId=${showId}&seats=${encodeURIComponent(
                      selectedSeatIds.join(",")
                    )}`
                  );
                } catch {
                  setLockError("Network error while locking seats.");
                  setLockingInProgress(false);
                }
              }}
              className="px-6 py-3 rounded-xl text-sm font-bold bg-cinema-crimson hover:bg-cinema-crimsonDark text-white shadow-crimson-glow disabled:opacity-40 transition"
            >
              {lockingInProgress ? "Locking Seats..." : "Proceed to Checkout →"}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
