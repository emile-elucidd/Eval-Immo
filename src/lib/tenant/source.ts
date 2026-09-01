import "server-only";

import { cache } from "react";

import { AGENCIES } from "@/lib/tenant/agencies";
import { withEnvSecrets } from "@/lib/tenant/env";
import { isAgencySlug, isSlug } from "@/lib/tenant/host";
import type { Agency, City } from "@/lib/tenant/types";

/**
 * Where the client registry is read from.
 *
 * Two sources, one shape. `local` is the file in the repository and needs no
 * configuration. `http` fetches the same array of {@link Agency} objects as
 * JSON, which is what lets a CMS — or a Go High Level export pushed to a small
 * endpoint — own the data without a deploy. Nothing else in the app knows which
 * one is in use.
 *
 * A word on Go High Level: its `{{custom_values.…}}` placeholders only expand
 * inside pages GHL itself serves, so they cannot reach this app. Feeding the
 * landings from GHL means publishing its sub-account values as JSON at
 * `TENANT_SOURCE_URL` — a workflow, a Make/Zapier scenario, or a route of your
 * own that calls the GHL API — not templating the HTML.
 */

const SOURCE_URL = process.env.TENANT_SOURCE_URL;
const SOURCE_TOKEN = process.env.TENANT_SOURCE_TOKEN;
/** Seconds an `http` registry is reused before being fetched again. */
const TTL = Number(process.env.TENANT_SOURCE_TTL ?? 300);

async function fetchAgencies(): Promise<Agency[]> {
  if (!SOURCE_URL) {
    console.error("[tenant] TENANT_SOURCE=http but TENANT_SOURCE_URL is unset");
    return AGENCIES;
  }

  try {
    const response = await fetch(SOURCE_URL, {
      headers: SOURCE_TOKEN ? { authorization: `Bearer ${SOURCE_TOKEN}` } : undefined,
      next: { revalidate: TTL, tags: ["tenants"] },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`registry responded ${response.status}`);

    const payload: unknown = await response.json();
    // Both `[…]` and `{ agencies: […] }` are accepted: CMSes disagree on this.
    const raw = Array.isArray(payload)
      ? payload
      : (payload as { agencies?: unknown })?.agencies;
    if (!Array.isArray(raw)) throw new Error("registry is not an array of agencies");

    const agencies = raw
      .map(normaliseAgency)
      .filter((agency): agency is Agency => agency !== null);
    if (agencies.length === 0) throw new Error("registry holds no usable agency");
    return agencies;
  } catch (error) {
    // A registry that cannot be read must not take every landing offline: the
    // file in the repository is the floor, even if it is only the demo agency.
    console.error("[tenant] remote registry unavailable, falling back to the local file", error);
    return AGENCIES;
  }
}

/**
 * A remote registry is hand-filled, so it will be half-filled at some point.
 *
 * What a landing genuinely cannot render around — a usable slug, a name, at
 * least one commune — makes the entry unusable and it is dropped. Everything
 * else is given a defensible default, so one blank field in a CMS costs a line
 * of copy rather than a client's whole site.
 */
function normaliseAgency(value: unknown): Agency | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Partial<Agency>;

  if (typeof raw.slug !== "string" || !isAgencySlug(raw.slug)) return null;
  if (typeof raw.name !== "string" || raw.name.trim() === "") return null;
  if (!Array.isArray(raw.cities)) return null;

  const cities = raw.cities
    .map(normaliseCity)
    .filter((city): city is City => city !== null);
  if (cities.length === 0) return null;

  return {
    ...raw,
    slug: raw.slug,
    name: raw.name,
    cities,
    description: raw.description ?? "",
    phone: raw.phone ?? "",
    email: raw.email ?? "",
    address: raw.address ?? "",
    legal: raw.legal ?? {},
  };
}

function normaliseCity(value: unknown): City | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Partial<City>;

  if (typeof raw.slug !== "string" || !isSlug(raw.slug)) return null;
  if (typeof raw.name !== "string" || raw.name.trim() === "") return null;

  return {
    ...raw,
    slug: raw.slug,
    name: raw.name,
    preposition: raw.preposition?.trim() || "à",
    coverImage: raw.coverImage || "/hero-cover.jpg",
  };
}

/**
 * Every agency on file. Memoised for the lifetime of a request, so the twenty
 * components of a page share one read.
 */
export const listAgencies = cache(async (): Promise<Agency[]> => {
  const agencies = process.env.TENANT_SOURCE === "http" ? await fetchAgencies() : AGENCIES;
  // Whichever source the records came from, their secrets come from the
  // environment — a CMS holds a client's copy, never its CRM token.
  return agencies.map(withEnvSecrets);
});

export async function findAgency(slug: string): Promise<Agency | null> {
  if (!isAgencySlug(slug)) return null;
  const agencies = await listAgencies();
  return agencies.find((agency) => agency.slug === slug) ?? null;
}
