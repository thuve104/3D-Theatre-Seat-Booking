import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  AuditoriumConfigInput,
  GeneratedSeatNode,
  SeatCategory,
  ShowSeatStatus,
  generateAuditoriumSeats,
} from "./theatre-engine";
import { hashPassword } from "./auth";

export interface MovieRecord {
  id: string;
  title: string;
  slug: string;
  description: string;
  genres: string[];
  durationMinutes: number;
  releaseDate: string;
  language: string;
  subtitles: string[];
  ageRating: string;
  imdbRating?: number;
  imdbSourceUrl?: string;
  director: string;
  cast: { name: string; role: string }[];
  status: "NOW_SHOWING" | "COMING_SOON";
  isFeatured: boolean;
  posterUrl: string;
  backdropUrl: string;
  trailerUrl: string;
}

export interface CinemaRecord {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  facilities: string[];
  phone: string;
  isActive: boolean;
}

export interface AuditoriumRecord {
  id: string;
  cinemaId: string;
  name: string;
  totalCapacity: number;
  acousticProfile: {
    reverbWetMix: number;
    roomAmbienceDb: number;
    audioLevel: number;
    enableSurroundProcessing: boolean;
  };
  layout: AuditoriumConfigInput;
}

export interface ShowRecord {
  id: string;
  movieId: string;
  auditoriumId: string;
  startTime: string;
  endTime: string;
  basePrice: number;
  categoryPricing: Record<SeatCategory, number>;
  isActive: boolean;
}

export interface ShowSeatRecord {
  id: string;
  showId: string;
  seatId: string;
  status: ShowSeatStatus;
  price: number;
  version: number;
}

export interface SeatLockRecord {
  id: string;
  showId: string;
  seatId: string;
  userId: string;
  sessionId: string;
  expiresAt: string;
}

export interface BookingRecord {
  id: string;
  referenceCode: string;
  userId: string;
  showId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  subtotal: number;
  taxAmount: number;
  bookingFee: number;
  discountTotal: number;
  totalAmount: number;
  couponCode?: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | "REFUNDED";
  seatIds: string[];
  seatLabels: string[];
  paymentId?: string;
  paymentStatus?: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "REFUNDED";
  ticketId?: string;
  createdAt: string;
}

export interface TicketRecord {
  id: string;
  bookingId: string;
  ticketCode: string;
  qrSignature: string;
  qrDataUrl: string;
  seatLabels: string[];
  isUsed: boolean;
  verifiedAt?: string;
  createdAt: string;
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: "CUSTOMER" | "ADMIN" | "THEATRE_MANAGER" | "STAFF";
  fullName: string;
  phone: string;
  savedCinemaIds: string[];
  preferences: {
    preferredSeatCategory: SeatCategory;
    enableSpatialAudio: boolean;
  };
  createdAt: string;
}

export interface CouponRecord {
  code: string;
  discountPercent: number;
  minOrderAmount: number;
  isActive: boolean;
}

export interface DatabaseState {
  users: UserRecord[];
  movies: MovieRecord[];
  cinemas: CinemaRecord[];
  auditoriums: AuditoriumRecord[];
  seats: GeneratedSeatNode[];
  shows: ShowRecord[];
  showSeats: ShowSeatRecord[];
  seatLocks: SeatLockRecord[];
  bookings: BookingRecord[];
  tickets: TicketRecord[];
  coupons: CouponRecord[];
  adminLogs: {
    id: string;
    adminId: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: string;
  }[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "cineverse-db.json");

function createInitialSeedData(): DatabaseState {
  const layoutImax: AuditoriumConfigInput = {
    width: 26,
    length: 32,
    height: 14,
    screenWidth: 20,
    screenHeight: 8.4,
    screenPositionZ: -14.0,
    screenElevationY: 5.4,
    screenCurve: 0.1,
    numRows: 10,
    seatsPerRow: 16,
    rowSpacing: 1.38,
    seatSpacing: 0.72,
    baseElevation: 0.4,
    seatElevationInc: 0.34,
    curveFactor: 0.16,
    aislePositions: [4, 12],
    rowCategoryMap: {
      A: "ACCESSIBLE",
      B: "STANDARD",
      C: "STANDARD",
      D: "PREMIUM",
      E: "PREMIUM",
      F: "VIP",
      G: "VIP",
      H: "RECLINER",
      I: "RECLINER",
      J: "COUPLE",
    },
    categoryBasePrices: {
      STANDARD: 14.5,
      PREMIUM: 18.5,
      VIP: 24.0,
      RECLINER: 28.0,
      COUPLE: 52.0,
      ACCESSIBLE: 14.5,
    },
  };

  const layoutBoutique: AuditoriumConfigInput = {
    width: 18,
    length: 22,
    height: 10,
    screenWidth: 13.5,
    screenHeight: 5.8,
    screenPositionZ: -10.0,
    screenElevationY: 4.2,
    screenCurve: 0.06,
    numRows: 7,
    seatsPerRow: 12,
    rowSpacing: 1.55,
    seatSpacing: 0.78,
    baseElevation: 0.35,
    seatElevationInc: 0.36,
    curveFactor: 0.12,
    aislePositions: [3, 9],
    rowCategoryMap: {
      A: "STANDARD",
      B: "PREMIUM",
      C: "PREMIUM",
      D: "VIP",
      E: "VIP",
      F: "RECLINER",
      G: "COUPLE",
    },
    categoryBasePrices: {
      STANDARD: 16.0,
      PREMIUM: 20.0,
      VIP: 26.0,
      RECLINER: 30.0,
      COUPLE: 56.0,
      ACCESSIBLE: 16.0,
    },
  };

  const auditoriums: AuditoriumRecord[] = [
    {
      id: "aud-imax-1",
      cinemaId: "cin-grand-downtown",
      name: "Auditorium 1 • IMAX Laser 3D",
      totalCapacity: 160,
      acousticProfile: {
        reverbWetMix: 0.2,
        roomAmbienceDb: -42,
        audioLevel: 1.0,
        enableSurroundProcessing: true,
      },
      layout: layoutImax,
    },
    {
      id: "aud-luxe-2",
      cinemaId: "cin-grand-downtown",
      name: "Auditorium 2 • Velvet Recliner Lounge",
      totalCapacity: 84,
      acousticProfile: {
        reverbWetMix: 0.14,
        roomAmbienceDb: -46,
        audioLevel: 0.95,
        enableSurroundProcessing: true,
      },
      layout: layoutBoutique,
    },
    {
      id: "aud-harbor-1",
      cinemaId: "cin-harbor-bay",
      name: "Prime Stage A • Grand Horizon",
      totalCapacity: 160,
      acousticProfile: {
        reverbWetMix: 0.22,
        roomAmbienceDb: -40,
        audioLevel: 1.05,
        enableSurroundProcessing: true,
      },
      layout: layoutImax,
    },
  ];

  const allSeats: GeneratedSeatNode[] = [];
  for (const aud of auditoriums) {
    const generated = generateAuditoriumSeats(aud.id, aud.layout);
    aud.totalCapacity = generated.length;
    allSeats.push(...generated);
  }

  // Real open-source HD blender / cinema trailers hosted on reliable Google Cloud Storage with CORS enabled
  const movies: MovieRecord[] = [
    {
      id: "mov-tears-of-steel",
      title: "CHRONOS PROTOCOL: ECLIPSE",
      slug: "chronos-protocol-eclipse",
      description:
        "In a neon-drenched cyberpunk metropolis, a team of rogue scientists and cybernetic pilots race to prevent a temporal singularity from erasing human memory.",
      genres: ["Sci-Fi", "Action", "Thriller"],
      durationMinutes: 142,
      releaseDate: "2026-10-15",
      language: "English",
      subtitles: ["English", "Spanish", "French"],
      ageRating: "PG-13",
      director: "Ian Hubert",
      cast: [
        { name: "Derek de Lint", role: "Commander Oude" },
        { name: "Berenice Bejo", role: "Celia" },
        { name: "Casper Crump", role: "Thom" },
      ],
      status: "NOW_SHOWING",
      isFeatured: true,
      posterUrl:
        "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=900&q=80",
      backdropUrl:
        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80",
      trailerUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    },
    {
      id: "mov-sintel-odyssey",
      title: "EMBER OF THE DRAGONKEEP",
      slug: "ember-of-the-dragonkeep",
      description:
        "Across frozen peaks and ancient desert citadels, a lone warrior embarks on a perilous quest to rescue her winged companion from an immortal warlord.",
      genres: ["Fantasy", "Adventure", "Drama"],
      durationMinutes: 128,
      releaseDate: "2026-10-22",
      language: "English",
      subtitles: ["English", "Japanese"],
      ageRating: "PG",
      director: "Colin Levy",
      cast: [
        { name: "Halina Reijn", role: "Sintel" },
        { name: "Thom Hoffman", role: "Shaman" },
      ],
      status: "NOW_SHOWING",
      isFeatured: true,
      posterUrl:
        "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=900&q=80",
      backdropUrl:
        "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80",
      trailerUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    },
    {
      id: "mov-velvet-horizon",
      title: "APEX VELOCITY: LE MANS",
      slug: "apex-velocity-le-mans",
      description:
        "Inside the high-stakes world of endurance night racing, a veteran engineer and a fearless rookie push an experimental hypercar beyond the limits of physics.",
      genres: ["Action", "Drama", "Sport"],
      durationMinutes: 136,
      releaseDate: "2026-10-28",
      language: "English",
      subtitles: ["English", "German", "Italian"],
      ageRating: "PG-13",
      director: "elena Vance",
      cast: [
        { name: "Marcus Sterling", role: "Julian Vance" },
        { name: "Clara Moreau", role: "Sora Lind" },
      ],
      status: "NOW_SHOWING",
      isFeatured: false,
      posterUrl:
        "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=900&q=80",
      backdropUrl:
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
      trailerUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    },
    {
      id: "mov-solaris-echo",
      title: "ORBITAL REQUIEM",
      slug: "orbital-requiem",
      description:
        "Stationed aboard a deep-space relay beyond Jupiter, an acoustic astrophysicist decodes a harmonic signal originating from inside the ice moon Europa.",
      genres: ["Sci-Fi", "Mystery"],
      durationMinutes: 149,
      releaseDate: "2026-12-10",
      language: "English",
      subtitles: ["English"],
      ageRating: "PG-13",
      director: "Denis K.",
      cast: [
        { name: "Aiden Cross", role: "Dr. Aris Thorne" },
        { name: "Linnea Lindstrom", role: "Commander Vera" },
      ],
      status: "COMING_SOON",
      isFeatured: false,
      posterUrl:
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=900&q=80",
      backdropUrl:
        "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1600&q=80",
      trailerUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    },
  ];

  const cinemas: CinemaRecord[] = [
    {
      id: "cin-grand-downtown",
      name: "CINEVERSE Grand Obsidian Downtown",
      slug: "cineverse-grand-obsidian-downtown",
      city: "Metropolis",
      address: "740 Crimson Avenue, Arts District",
      latitude: 37.789,
      longitude: -122.401,
      facilities: [
        "IMAX Laser 3D",
        "Spatial Acoustic Calibration",
        "Heated Zero-G Recliners",
        "Valet Parking",
        "Signature Cocktail Lounge",
      ],
      phone: "+1 (800) 555-0199",
      isActive: true,
    },
    {
      id: "cin-harbor-bay",
      name: "CINEVERSE Royal Harbor Bay",
      slug: "cineverse-royal-harbor-bay",
      city: "Harbor City",
      address: "1200 Waterfront Promenade",
      latitude: 37.804,
      longitude: -122.419,
      facilities: [
        "Prime Stage 4K",
        "VIP Private Pods",
        "Wheelchair Accessible",
        "Gourmet Dining Delivery",
      ],
      phone: "+1 (800) 555-0244",
      isActive: true,
    },
  ];

  const shows: ShowRecord[] = [
    {
      id: "show-chronos-imax-1930",
      movieId: "mov-tears-of-steel",
      auditoriumId: "aud-imax-1",
      startTime: "2026-11-02T19:30:00.000Z",
      endTime: "2026-11-02T21:52:00.000Z",
      basePrice: 14.5,
      categoryPricing: layoutImax.categoryBasePrices,
      isActive: true,
    },
    {
      id: "show-chronos-luxe-2100",
      movieId: "mov-tears-of-steel",
      auditoriumId: "aud-luxe-2",
      startTime: "2026-11-02T21:00:00.000Z",
      endTime: "2026-11-02T23:22:00.000Z",
      basePrice: 16.0,
      categoryPricing: layoutBoutique.categoryBasePrices,
      isActive: true,
    },
    {
      id: "show-sintel-imax-1800",
      movieId: "mov-sintel-odyssey",
      auditoriumId: "aud-imax-1",
      startTime: "2026-11-02T18:00:00.000Z",
      endTime: "2026-11-02T20:08:00.000Z",
      basePrice: 14.5,
      categoryPricing: layoutImax.categoryBasePrices,
      isActive: true,
    },
    {
      id: "show-apex-harbor-2015",
      movieId: "mov-velvet-horizon",
      auditoriumId: "aud-harbor-1",
      startTime: "2026-11-02T20:15:00.000Z",
      endTime: "2026-11-02T22:31:00.000Z",
      basePrice: 14.5,
      categoryPricing: layoutImax.categoryBasePrices,
      isActive: true,
    },
  ];

  const showSeats: ShowSeatRecord[] = [];
  for (const show of shows) {
    const audSeats = allSeats.filter((s) => s.auditoriumId === show.auditoriumId);
    for (const seat of audSeats) {
      // Pre-mark a realistic pattern of occupied & reserved seats so the 3D auditorium showcases all 5 states
      let status: ShowSeatStatus = "AVAILABLE";
      if (
        (seat.rowLabel === "F" && (seat.seatNumber === 7 || seat.seatNumber === 8)) ||
        (seat.rowLabel === "E" && (seat.seatNumber === 9 || seat.seatNumber === 10)) ||
        (seat.rowLabel === "G" && seat.seatNumber === 6)
      ) {
        status = "BOOKED";
      } else if (seat.rowLabel === "D" && seat.seatNumber === 8) {
        status = "LOCKED";
      } else if (seat.rowLabel === "A" && seat.seatNumber === 16) {
        status = "UNAVAILABLE";
      }

      showSeats.push({
        id: `${show.id}-${seat.id}`,
        showId: show.id,
        seatId: seat.id,
        status,
        price: show.categoryPricing[seat.category] ?? show.basePrice,
        version: 1,
      });
    }
  }

  return {
    users: [
      {
        id: "usr-admin-1",
        email: "admin@cineverse.io",
        passwordHash: "$2a$10$CwTycUXWue0Thq9StjUM0uJ8D0R/1E0eB5K.y6C2w9R.wG1x9x.1e", // password123
        role: "ADMIN",
        fullName: "Aria Montgomery (Cinema Director)",
        phone: "+1 (800) 555-0100",
        savedCinemaIds: ["cin-grand-downtown"],
        preferences: {
          preferredSeatCategory: "VIP",
          enableSpatialAudio: true,
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: "usr-customer-1",
        email: "guest@cineverse.io",
        passwordHash: "$2a$10$CwTycUXWue0Thq9StjUM0uJ8D0R/1E0eB5K.y6C2w9R.wG1x9x.1e",
        role: "CUSTOMER",
        fullName: "Julian Vance",
        phone: "+1 (415) 890-3321",
        savedCinemaIds: ["cin-grand-downtown", "cin-harbor-bay"],
        preferences: {
          preferredSeatCategory: "VIP",
          enableSpatialAudio: true,
        },
        createdAt: new Date().toISOString(),
      },
    ],
    movies,
    cinemas,
    auditoriums,
    seats: allSeats,
    shows,
    showSeats,
    seatLocks: [],
    bookings: [
      {
        id: "bkg-seed-101",
        referenceCode: "CV-2026-88412",
        userId: "usr-customer-1",
        showId: "show-chronos-imax-1930",
        customerName: "Julian Vance",
        customerEmail: "guest@cineverse.io",
        customerPhone: "+1 (415) 890-3321",
        subtotal: 48.0,
        taxAmount: 4.08,
        bookingFee: 3.5,
        discountTotal: 0,
        totalAmount: 55.58,
        status: "CONFIRMED",
        seatIds: ["aud-imax-1-seat-F-7", "aud-imax-1-seat-F-8"],
        seatLabels: ["F-7", "F-8"],
        paymentId: "pi_cv_seed_88412",
        paymentStatus: "SUCCEEDED",
        ticketId: "tkt-seed-101",
        createdAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
      },
    ],
    tickets: [],
    coupons: [
      {
        code: "CINEVERSE20",
        discountPercent: 20,
        minOrderAmount: 25,
        isActive: true,
      },
      {
        code: "IMAXVIP10",
        discountPercent: 10,
        minOrderAmount: 15,
        isActive: true,
      },
    ],
    adminLogs: [],
  };
}

const globalForDb = globalThis as unknown as {
  __cineverseDbState?: DatabaseState;
  __cineverseTxLock?: Promise<void>;
};

export function getDbState(): DatabaseState {
  if (globalForDb.__cineverseDbState) {
    return globalForDb.__cineverseDbState;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw) as DatabaseState;
      globalForDb.__cineverseDbState = parsed;
      return parsed;
    } catch {
      // Rebuild seed if corrupted
    }
  }

  const seeded = createInitialSeedData();
  fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), "utf-8");
  globalForDb.__cineverseDbState = seeded;
  return seeded;
}

export function saveDbState(state: DatabaseState): void {
  globalForDb.__cineverseDbState = state;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
}

/**
 * Executes a serialized ACID-like transaction over the database state so concurrent requests
 * cannot interleave or double-book the same seat.
 */
let txMutex: Promise<unknown> = Promise.resolve();

export async function runSerializableTransaction<T>(
  fn: (db: DatabaseState) => Promise<T> | T
): Promise<T> {
  const previous = txMutex;
  let release!: () => void;
  txMutex = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;
  try {
    const state = getDbState();
    // Clone snapshot for rollback safety if fn throws
    const snapshot = JSON.parse(JSON.stringify(state)) as DatabaseState;
    const result = await fn(snapshot);
    saveDbState(snapshot);
    return result;
  } finally {
    release();
  }
}

export async function ensureDefaultUserHash(): Promise<string> {
  return hashPassword("password123");
}

export function generateReferenceCode(): string {
  const num = crypto.randomInt(10000, 99999);
  return `CV-2026-${num}`;
}
