import { serverEnv } from "@/env";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: serverEnv.REDIS_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export { redis };
