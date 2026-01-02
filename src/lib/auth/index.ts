import { serverEnv } from "@/env";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmailWorkflow } from "@/server/queues/workflows/emails/send-welcome-email.workflow";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, lastLoginMethod } from "better-auth/plugins";
import { start } from "workflow/api";
import { redis } from "../redis";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secondaryStorage: {
    get: async (key: string) => {
      return redis.get(key);
    },
    set: async (key: string, value: string) => {
      return redis.set(key, value);
    },
    delete: async (key: string) => {
      await redis.del(key);
      return null;
    },
    clear: async () => {
      return redis.flushall();
    },
  },
  plugins: [lastLoginMethod(), admin()],
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    github: {
      clientId: serverEnv.GITHUB_CLIENT_ID,
      clientSecret: serverEnv.GITHUB_CLIENT_SECRET,
      scope: ["read:user", "user:email", "repo", "read:org", "admin:repo_hook"],
    },
    google: {
      prompt: "select_account",
      clientId: serverEnv.GOOGLE_CLIENT_ID,
      clientSecret: serverEnv.GOOGLE_CLIENT_SECRET,
    },
  },
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  secret: serverEnv.BETTER_AUTH_SECRET,
  // DB Hooks
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          start(sendWelcomeEmailWorkflow, [user.email]);
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
