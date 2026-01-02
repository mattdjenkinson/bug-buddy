import { serverEnv } from "@/env";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: serverEnv.KV_REST_API_URL,
  token: serverEnv.KV_REST_API_TOKEN,
});

export { redis };
