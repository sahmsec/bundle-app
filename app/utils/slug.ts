/**
 * Turn a human title into a URL-safe handle. Pure and dependency-free.
 * Uniqueness is enforced elsewhere (the service + the Phase-2 partial index);
 * this only produces the canonical base form.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumerics -> hyphen
    .replace(/^-+|-+$/g, "") // trim leading/trailing hyphens
    .slice(0, 80);
}
