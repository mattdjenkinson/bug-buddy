import { headers } from "next/headers";

export async function getBaseUrl() {
  const h = await headers();
  const host = h.get("host");

  // In development, use http if localhost
  if (host?.includes("localhost") || host?.includes("127.0.0.1")) {
    return `http://${host}`;
  }

  // In production, use https (or x-forwarded-proto if available)
  const protocol = h.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}
