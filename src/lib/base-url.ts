import { headers } from "next/headers";

export async function getBaseUrl() {
  const h = await headers();
  const protocol = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host");
  return `${protocol}://${host}`;
}
