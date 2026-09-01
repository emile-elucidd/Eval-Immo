import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { subdomainOf } from "@/lib/tenant/host";
import { fillTokens } from "@/lib/tenant/format";
import { findAgency, listAgencies } from "@/lib/tenant/source";
import type { Landing, PublicLanding } from "@/lib/tenant/types";

/**
 * Turning `{ agence, ville }` from the URL into the object every page renders
 * from.
 *
 * Both segments always exist internally — `src/proxy.ts` rewrites a subdomain
 * into the first one — so a landing resolves the same way whether the agency
 * came from `agence.exemple.fr` or from `/agence` in the path. The only thing
 * that differs is {@link basePath}, and only because links have to point at the
 * URL the visitor is actually on.
 */

export type LandingParams = { agence: string; ville: string };

/**
 * The link prefix for the current request.
 *
 * Reading the host rather than trusting a header the proxy sets keeps the two
 * from drifting apart, and means a request that reaches the app without going
 * through the proxy still builds correct links.
 */
export async function landingBasePath(agence: string, ville: string): Promise<string> {
  const host = (await headers()).get("host");
  return subdomainOf(host) === agence ? `/${ville}` : `/${agence}/${ville}`;
}

/** The landing for these segments, or `null` when either one is unknown. */
export const resolveLanding = cache(
  async ({ agence, ville }: LandingParams): Promise<Landing | null> => {
    const agency = await findAgency(agence);
    if (!agency) return null;

    const city = agency.cities.find((candidate) => candidate.slug === ville);
    if (!city) return null;

    return { agency, city, basePath: await landingBasePath(agence, ville) };
  },
);

/**
 * The same, but a redirect instead of a `null` — what pages want.
 *
 * A mistyped URL is a visitor who still wants an estimate, so neither case is a
 * dead end. The two are not sent to the same place, though: when the agency is
 * real and only the commune is wrong, staying inside that agency keeps the
 * visitor on the client's own site and the lead with the client. Only an
 * unknown agency falls all the way back to the generic page.
 */
export async function requireLanding({ agence, ville }: LandingParams): Promise<Landing> {
  const agency = await findAgency(agence);
  if (!agency) redirect("/");

  const city = agency.cities.find((candidate) => candidate.slug === ville);
  if (!city) {
    const fallback = agency.cities[0];
    // A registry entry with no commune cannot render at all; the source layer
    // drops those, so this only guards a local file edited by hand.
    if (!fallback) redirect("/");
    redirect(await landingBasePath(agence, fallback.slug));
  }

  return { agency, city, basePath: await landingBasePath(agence, ville) };
}

/** The agency's default commune — the one a bare subdomain lands on. */
export async function defaultCityOf(agence: string): Promise<string | null> {
  const agency = await findAgency(agence);
  return agency?.cities[0]?.slug ?? null;
}

/** Every landing on file, for `generateStaticParams` and the development index. */
export async function allLandingParams(): Promise<LandingParams[]> {
  const agencies = await listAgencies();
  return agencies.flatMap((agency) =>
    agency.cities.map((city) => ({ agence: agency.slug, ville: city.slug })),
  );
}

/**
 * The landing, stripped of everything the browser has no business holding —
 * CRM tokens, webhook URLs, and the legal identifiers that only ever render on
 * the server. This is what crosses into Client Components.
 */
export function toPublicLanding(landing: Landing): PublicLanding {
  const { agency, city, basePath: base } = landing;

  return {
    agency: {
      slug: agency.slug,
      name: agency.name,
      description: fillTokens(agency.description, { agency, city }),
      phone: agency.phone,
      email: agency.email,
      address: agency.address,
      logo: agency.logo,
    },
    city,
    basePath: base,
    hasCalendar: Boolean(agency.calendarUrl),
    generic: landing.generic,
  };
}
