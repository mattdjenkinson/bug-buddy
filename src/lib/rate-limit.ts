import { Ratelimit } from "@upstash/ratelimit";
import { headers } from "next/headers";
import { redis } from "./redis";

// Interface that matches what @upstash/ratelimit expects
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

// Adapter wrapper to convert standard redis client to @upstash/ratelimit compatible interface
// The standard redis package uses different method names and signatures than @upstash/redis
const redisClient: RatelimitRedis = {
  evalsha: async <TArgs extends unknown[] = unknown[], TData = unknown>(
    sha1: string,
    keys: string[],
    args: TArgs,
  ): Promise<TData> => {
    // Redis v5 uses evalSha (camelCase) method
    // Type assertion needed because the Redis client types don't expose evalSha in the type definition
    // but it exists at runtime
    // Convert all arguments to strings as Redis requires string or Buffer
    const stringArgs = args.map((arg) => String(arg));
    type RedisWithEvalSha = typeof redis & {
      evalSha: (
        sha1: string,
        options: { keys: string[]; arguments: string[] },
      ) => Promise<TData>;
    };
    const redisWithEvalSha = redis as RedisWithEvalSha;
    if (typeof redisWithEvalSha.evalSha === "function") {
      return redisWithEvalSha.evalSha(sha1, {
        keys,
        arguments: stringArgs,
      }) as Promise<TData>;
    }
    // Fallback: use eval if evalSha is not available
    // This is less efficient but will work
    throw new Error("evalSha method not available on Redis client");
  },
  eval: async <TArgs extends unknown[] = unknown[], TData = unknown>(
    script: string,
    keys: string[],
    args: TArgs,
  ): Promise<TData> => {
    // Convert all arguments to strings as Redis requires string or Buffer
    const stringArgs = args.map((arg) => String(arg));
    return redis.eval(script, {
      keys,
      arguments: stringArgs,
    }) as Promise<TData>;
  },
  script: async (command: "LOAD", script: string): Promise<string> => {
    if (command === "LOAD") {
      return redis.scriptLoad(script);
    }
    throw new Error(`Unsupported script command: ${command}`);
  },
  get: async <TData = string>(key: string): Promise<TData | null> => {
    return redis.get(key) as Promise<TData | null>;
  },
  set: async <TData = string>(
    key: string,
    value: TData,
    opts?: { ex?: number; px?: number },
  ): Promise<"OK" | TData | null> => {
    const valueStr = String(value);
    if (opts?.ex) {
      return redis.setEx(key, opts.ex, valueStr) as Promise<
        "OK" | TData | null
      >;
    }
    if (opts?.px) {
      return redis.pSetEx(key, opts.px, valueStr) as Promise<
        "OK" | TData | null
      >;
    }
    return redis.set(key, valueStr) as Promise<"OK" | TData | null>;
  },
};

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
