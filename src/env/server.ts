import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.url().optional(),
    BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  },
  // For Next.js >= 13.4.4, we can use experimental__runtimeEnv
  experimental__runtimeEnv: process.env,
});
