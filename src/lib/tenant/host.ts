/**
 * Reading the agency out of the hostname.
 *
 * Shared by `src/proxy.ts`, which rewrites `agence.exemple.fr/ville` onto the
 * internal `/agence/ville` route, and by the server components that build
 * links: both must agree on whether the agency is in the host or in the path,
 * or the header would link to URLs the visitor never asked for.
 *
 * Imported by the proxy, so: no Node APIs, no `server-only`.
 */

/**
 * Names an agency slug may never take.
 *
 * Two reasons, both real: the first group are hostnames that mean something
 * else, and the second are the generic landing's own pages, which sit at the
 * root and would shadow `/[agence]` — an agency called "estimation" would find
 * its landing replaced by the funnel.
 */
export const RESERVED_SLUGS = new Set([
  "www",
  "app",
  "admin",
  "api",
  "cdn",
  "mail",
  "static",
  "estimation",
  "mentions",
  "privacy",
  "rendez-vous",
]);

/** Hosts that carry a deployment name in the first label, not an agency. */
const PLATFORM_SUFFIXES = [".vercel.app", ".now.sh"];

/**
 * The agency slug a request's host points at, or `null` when the host carries
 * no agency — the apex domain, `localhost`, a Vercel preview URL.
 *
 * Set `NEXT_PUBLIC_ROOT_DOMAIN` (for example `estimation-immo.fr`) as soon as
 * the real domain exists: without it the split falls back to "anything before
 * the last two labels", which is right for `agence.exemple.fr` but wrong for a
 * domain like `agence.exemple.co.uk`.
 */
export function subdomainOf(rawHost: string | null | undefined): string | null {
  if (!rawHost) return null;

  const host = rawHost.split(":")[0].trim().toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost") return null;
  // A bare IP address has no subdomain to read.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim().toLowerCase().replace(/^\.+/, "");

  let prefix: string;
  if (root) {
    if (host === root) return null;
    if (!host.endsWith(`.${root}`)) return null;
    prefix = host.slice(0, -(root.length + 1));
  } else if (host.endsWith(".localhost")) {
    // `rive-ouest.localhost:3000` — the local equivalent of a real subdomain.
    prefix = host.slice(0, -".localhost".length);
  } else if (PLATFORM_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    return null;
  } else {
    const labels = host.split(".");
    if (labels.length < 3) return null;
    prefix = labels.slice(0, -2).join(".");
  }

  // `a.b.exemple.fr` is not a shape we hand out; the leftmost label wins.
  const slug = prefix.split(".")[0];
  return slug && isAgencySlug(slug) ? slug : null;
}

/** The alphabet every agency and city slug is restricted to, in URLs and in the registry. */
export function isSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/** The same, minus the names that already mean something else. */
export function isAgencySlug(value: string): boolean {
  return isSlug(value) && !RESERVED_SLUGS.has(value);
}
