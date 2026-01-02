import { Ratelimit } from "@upstash/ratelimit";
import { headers } from "next/headers";
import { redis } from "./redis";
// Interface that matches what @upstash/ratelimit expects

// Rate limiter for per-project submissions (more lenient)
export const projectRatelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute per project
  analytics: true,
  prefix: "ratelimit:project",
});

// Rate limiter for per-IP submissions (stricter)
export const ipRatelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 requests per minute per IP
  analytics: true,
  prefix: "ratelimit:ip",
});

// Rate limiter for combined IP + Project (most strict)
export const combinedRatelimit = new Ratelimit({
  redis: redis,
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
