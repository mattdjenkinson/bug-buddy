import { Ratelimit } from "@upstash/ratelimit";
import { headers } from "next/headers";
import { redis } from "./redis";

// Adapter to make ioredis compatible with @upstash/ratelimit
const redisAdapter = {
  eval: async <TArgs extends unknown[], TData = unknown>(
    script: string,
    keys: string[],
    args: TArgs,
  ): Promise<TData> => {
    return redis.eval(
      script,
      keys.length,
      ...keys,
      ...(args as (string | number)[]),
    ) as Promise<TData>;
  },
  evalsha: async <TArgs extends unknown[], TData = unknown>(
    sha1: string,
    keys: string[],
    args: TArgs,
  ): Promise<TData> => {
    return redis.evalsha(
      sha1,
      keys.length,
      ...keys,
      ...(args as (string | number)[]),
    ) as Promise<TData>;
  },
  get: async <TData = string>(key: string): Promise<TData | null> => {
    return redis.get(key) as Promise<TData | null>;
  },
  set: async <TData = string>(
    key: string,
    value: TData,
    options?: { ex?: number },
  ): Promise<TData | "OK" | null> => {
    const stringValue = String(value);
    if (options?.ex) {
      return redis.set(key, stringValue, "EX", options.ex) as Promise<
        TData | "OK" | null
      >;
    }
    return redis.set(key, stringValue) as Promise<TData | "OK" | null>;
  },
};

// Rate limiter for per-project submissions (more lenient)
export const projectRatelimit = new Ratelimit({
  redis: redisAdapter,
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute per project
  analytics: true,
  prefix: "ratelimit:project",
});

// Rate limiter for per-IP submissions (stricter)
export const ipRatelimit = new Ratelimit({
  redis: redisAdapter,
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 requests per minute per IP
  analytics: true,
  prefix: "ratelimit:ip",
});

// Rate limiter for combined IP + Project (most strict)
export const combinedRatelimit = new Ratelimit({
  redis: redisAdapter,
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
