export function getBaseUrlClient() {
  if (typeof window === "undefined") {
    return null;
  }
  return `${window?.location?.protocol}//${window?.location?.host}`;
}
