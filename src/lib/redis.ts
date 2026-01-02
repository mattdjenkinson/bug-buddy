import { serverEnv } from "@/env";
import { createClient } from "redis";

const globalForRedis = global as unknown as {
  redis: ReturnType<typeof createClient>;
};

const redis =
  globalForRedis.redis ||
  createClient({
    url: serverEnv.REDIS_URL ?? "redis://localhost:6379",
  });

// Ensure the client is connected
if (!redis.isOpen) {
  redis.connect().catch(console.error);
}

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

export { redis };
