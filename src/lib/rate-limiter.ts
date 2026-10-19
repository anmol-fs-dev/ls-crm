// Free-tier high-performance sliding window rate limiter
// Operates in memory without requiring external paid Redis infrastructure

interface RateLimitRecord {
  timestamps: number[];
}

const store = new Map<string, RateLimitRecord>();

// Periodic garbage collection to prevent memory leaks on long-running instances
let lastGc = Date.now();
const GC_INTERVAL_MS = 60 * 1000;

function cleanupExpired(windowMs: number) {
  const now = Date.now();
  if (now - lastGc < GC_INTERVAL_MS) return;
  lastGc = now;

  for (const [key, record] of store.entries()) {
    const valid = record.timestamps.filter((ts) => now - ts < windowMs);
    if (valid.length === 0) {
      store.delete(key);
    } else {
      record.timestamps = valid;
    }
  }
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

/**
 * Checks whether an incoming request identifier is within rate limits.
 * @param identifier IP address or user ID
 * @param limit Max requests permitted per window
 * @param windowMs Window duration in milliseconds (default: 60,000ms = 1 minute)
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60 * 1000
): RateLimitResult {
  cleanupExpired(windowMs);

  const now = Date.now();
  let record = store.get(identifier);

  if (!record) {
    record = { timestamps: [] };
    store.set(identifier, record);
  }

  // Remove timestamps outside current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const resetMs = Math.max(0, windowMs - (now - oldest));
    return {
      success: false,
      limit,
      remaining: 0,
      resetMs,
    };
  }

  // Record this request
  record.timestamps.push(now);

  const oldest = record.timestamps[0];
  const resetMs = Math.max(0, windowMs - (now - oldest));

  return {
    success: true,
    limit,
    remaining: limit - record.timestamps.length,
    resetMs,
  };
}

/**
 * Generates standard HTTP rate limit headers
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetMs / 1000).toString(),
  };

  if (!result.success) {
    headers['Retry-After'] = Math.ceil(result.resetMs / 1000).toString();
  }

  return headers;
}

/**
 * Reset memory store (useful for testing)
 */
export function resetRateLimiterStore() {
  store.clear();
}
