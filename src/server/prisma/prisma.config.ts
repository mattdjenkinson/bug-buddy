import { config } from "dotenv";
import { resolve } from "path";
import { defineConfig, env } from "prisma/config";

// Load .env from project root (go up 3 levels from src/server/prisma/)
config({ path: resolve(process.cwd(), ".env") });

export default defineConfig({
  schema: "./schema.prisma",
  migrations: {
    path: "./migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
