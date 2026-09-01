import type { City, PublicLanding } from "@/lib/tenant/types";

/**
 * The small conversions both sides of the network need: turning a city into
 * prose, filling the tokens an operator typed into a description, and building
 * a link that stays inside the current landing.
 *
 * No `server-only` here — the funnel is a Client Component and needs all three.
 */

/**
 * The locative form of a commune: "à Boulogne-Billancourt", "au Havre",
 * "aux Lilas", "à La Rochelle".
 *
 * French has no rule that derives the preposition from the name, so it is a
 * field of the registry. It does have a rule for what follows: "au" and "aux"
 * are already `à` contracted with the article, so a name that carries one — "Le
 * Havre", "Les Lilas" — must shed it, or the page reads "au Le Havre". "à"
 * contracts with nothing, so "La Rochelle" keeps its article.
 */
export function inCity(city: Pick<City, "name" | "preposition">): string {
  const preposition = city.preposition?.trim() || "à";
  const name = /^(au|aux)$/i.test(preposition)
    ? city.name.replace(/^(le|les)\s+/i, "")
    : city.name;
  return `${preposition} ${name}`;
}

/**
 * Expands the placeholders an operator may put in any free-text field of the
 * registry — the agency description above all, so one paragraph can serve every
 * commune the agency covers.
 *
 * Deliberately the same `{{…}}` spelling as Go High Level's custom values, so
 * the two do not have to be held in mind differently.
 */
export function fillTokens(
  text: string,
  landing: Pick<PublicLanding, "agency" | "city">,
): string {
  const tokens: Record<string, string> = {
    ville: landing.city.name,
    a_ville: inCity(landing.city),
    code_postal: landing.city.postcode ?? "",
    agence: landing.agency.name,
    telephone: landing.agency.phone,
    email: landing.agency.email,
    adresse: landing.agency.address,
  };

  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, name: string) => {
    const value = tokens[name.toLowerCase()];
    return value === undefined ? match : value;
  });
}

/**
 * A link inside the current landing.
 *
 * `basePath` is what the *visitor* sees, which is not what the router matched:
 * behind a per-agency subdomain the proxy rewrites `/ville/estimation` onto
 * `/agence/ville/estimation`, and a link built from the internal path would
 * push the visitor onto a URL with the agency twice over.
 */
export function landingHref(basePath: string, path = "/"): string {
  if (path === "/" || path === "") return basePath || "/";
  return `${basePath}${path.startsWith("/") ? path : `/${path}`}`;
}
