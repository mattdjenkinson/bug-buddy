import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "./index";

export const getSession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
});

export const requireAuth = cache(async () => {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
});
