import { serverEnv } from "@/env";
import Redis from "ioredis";

const globalForRedis = global as unknown as {
  redis: Redis;
};

const redis =
  globalForRedis.redis ||
  new Redis(serverEnv.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

export { redis };
