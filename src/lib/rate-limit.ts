import { Ratelimit } from "@upstash/ratelimit";
import { headers } from "next/headers";
import { redis } from "./redis";

// Interface that matches what @upstash/ratelimit expects
// The standard redis client implements these methods at runtime
interface RatelimitRedis {
  evalsha: <TArgs extends unknown[] = unknown[], TData = unknown>(
    sha1: string,
    keys: string[],
    args: TArgs,
  ) => Promise<TData>;
  eval: <TArgs extends unknown[] = unknown[], TData = unknown>(
    script: string,
    keys: string[],
    args: TArgs,
  ) => Promise<TData>;
  script: (command: "LOAD", script: string) => Promise<string>;
  get: <TData = string>(key: string) => Promise<TData | null>;
  set: <TData = string>(
    key: string,
    value: TData,
    opts?: { ex?: number; px?: number },
  ) => Promise<"OK" | TData | null>;
  [key: string]: unknown;
}

// Type assertion: The standard redis client has evalsha method at runtime
// @upstash/ratelimit expects a Redis interface, but the standard redis package works fine
const redisClient = redis as unknown as RatelimitRedis;

// Rate limiter for per-project submissions (more lenient)
export const projectRatelimit = new Ratelimit({
  redis: redisClient,
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute per project
  analytics: true,
  prefix: "ratelimit:project",
});

// Rate limiter for per-IP submissions (stricter)
export const ipRatelimit = new Ratelimit({
  redis: redisClient,
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 requests per minute per IP
  analytics: true,
  prefix: "ratelimit:ip",
});

// Rate limiter for combined IP + Project (most strict)
export const combinedRatelimit = new Ratelimit({
  redis: redisClient,
  limiter: Ratelimit.slidingWindow(3, "1 m"), // 3 requests per minute per IP+Project combo
  analytics: true,
  prefix: "ratelimit:combined",
});

// Helper function to get client IP address
export async function getClientIP(): Promise<string> {
  const headersList = await headers();
  // Check various headers that might contain the real IP
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIP = headersList.get("x-real-ip");
  const cfConnectingIP = headersList.get("cf-connecting-ip"); // Cloudflare

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  if (realIP) {
    return realIP;
  }

  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return "unknown";
}
