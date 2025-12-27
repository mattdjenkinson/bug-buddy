export function getBaseUrlClient() {
  if (typeof window === "undefined") {
    throw new Error("getBaseUrlClient can only be called on the client side");
  }
  return `${window?.location?.protocol}//${window?.location?.host}`;
}
