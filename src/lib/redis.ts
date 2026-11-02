import Redis from "ioredis";

const LOCK_TTL_SECONDS = 600; // 10-minute seat reservation TTL

// In-memory atomic lock map as seamless fallback when local redis-server daemon is not running
interface MemoryLockEntry {
  ownerId: string;
  expiresAt: number;
}
const globalForLocks = globalThis as unknown as {
  __cineverseMemoryLocks?: Map<string, MemoryLockEntry>;
  __cineverseRedisClient?: Redis | null;
  __cineverseRedisChecked?: boolean;
};

const memoryLocks =
  globalForLocks.__cineverseMemoryLocks ||
  (globalForLocks.__cineverseMemoryLocks = new Map<string, MemoryLockEntry>());

function getRedisClient(): Redis | null {
  if (globalForLocks.__cineverseRedisChecked) {
    return globalForLocks.__cineverseRedisClient ?? null;
  }
  globalForLocks.__cineverseRedisChecked = true;
  if (!process.env.REDIS_URL || process.env.USE_MEMORY_LOCKS === "true") {
    globalForLocks.__cineverseRedisClient = null;
    return null;
  }
  try {
    const client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 800,
      lazyConnect: true,
    });
    client.on("error", () => {
      // Silently fallback to atomic memory lock engine if local Redis daemon is offline
    });
    globalForLocks.__cineverseRedisClient = client;
    return client;
  } catch {
    globalForLocks.__cineverseRedisClient = null;
    return null;
  }
}

const ACQUIRE_MULTI_SEAT_LOCK_LUA = `
  for i = 1, #KEYS do
    local currentOwner = redis.call("GET", KEYS[i])
    if currentOwner and currentOwner ~= ARGV[1] then
      return 0
    end
  end
  for i = 1, #KEYS do
    redis.call("SET", KEYS[i], ARGV[1], "EX", tonumber(ARGV[2]))
  end
  return 1
`;

export async function acquireAtomicSeatLocks(
  showId: string,
  seatIds: string[],
  userId: string,
  ttlSeconds: number = LOCK_TTL_SECONDS
): Promise<boolean> {
  const keys = seatIds.map((seatId) => `lock:show:${showId}:seat:${seatId}`);
  const client = getRedisClient();

  if (client && client.status === "ready") {
    try {
      const result = await client.eval(
        ACQUIRE_MULTI_SEAT_LOCK_LUA,
        keys.length,
        ...keys,
        userId,
        ttlSeconds.toString()
      );
      return result === 1;
    } catch {
      // Fall through to in-memory atomic lock engine
    }
  }

  // Atomic synchronous check-and-set in Node event loop
  const now = Date.now();
  for (const key of keys) {
    const existing = memoryLocks.get(key);
    if (existing && existing.expiresAt > now && existing.ownerId !== userId) {
      return false;
    }
  }

  const expiresAt = now + ttlSeconds * 1000;
  for (const key of keys) {
    memoryLocks.set(key, { ownerId: userId, expiresAt });
  }
  return true;
}

export async function releaseAtomicSeatLocks(
  showId: string,
  seatIds: string[],
  userId?: string
): Promise<void> {
  const keys = seatIds.map((seatId) => `lock:show:${showId}:seat:${seatId}`);
  const client = getRedisClient();

  if (client && client.status === "ready") {
    try {
      const pipeline = client.pipeline();
      for (const key of keys) {
        if (!userId) {
          pipeline.del(key);
        } else {
          const owner = await client.get(key);
          if (owner === userId) pipeline.del(key);
        }
      }
      await pipeline.exec();
    } catch {
      // Fall through
    }
  }

  for (const key of keys) {
    const existing = memoryLocks.get(key);
    if (existing && (!userId || existing.ownerId === userId)) {
      memoryLocks.delete(key);
    }
  }
}

export function clearAllMemoryLocksForTest(): void {
  memoryLocks.clear();
}
