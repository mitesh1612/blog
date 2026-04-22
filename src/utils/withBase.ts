/**
 * Prepend the Astro base path to a given path.
 * Use this for all internal links to ensure they work
 * when the site is deployed under a subpath (e.g., /blog).
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
