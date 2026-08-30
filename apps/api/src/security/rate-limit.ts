import type { RequestHandler } from "express";

export const createRateLimitMiddleware = ({ limit, windowMs }: { limit: number; windowMs: number }): RequestHandler => {
  // ponytail: in-memory per-process limiter; replace with shared storage when horizontally scaling.
  const requests = new Map<string, { count: number; resetAt: number }>();
  return (request, response, next) => {
    const now = Date.now(); const key = request.ip || "unknown"; const current = requests.get(key);
    const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    entry.count += 1; requests.set(key, entry);
    response.setHeader("RateLimit-Reset", Math.ceil(entry.resetAt / 1000));
    if (entry.count > limit) {
      response.setHeader("Retry-After", Math.max(1, Math.ceil((entry.resetAt - now) / 1_000)));
      response.status(429).json({ error: { code: "RATE_LIMITED" } });
      return;
    }
    next();
  };
};
