const SLUG_MAX_LENGTH = 64;

export function slugify(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    // Replace any run of non-alphanumeric with a single dash
    .replace(/[^a-z0-9]+/g, "-")
    // Trim leading/trailing dashes
    .replace(/^-+|-+$/g, "");

  const slug = (base || "project").slice(0, SLUG_MAX_LENGTH);
  return slug || "project";
}
