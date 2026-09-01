import type { Landing } from "@/lib/tenant/types";

/**
 * The landing that belongs to no client.
 *
 * It is what sits at the apex domain, and what a broken link falls back to: the
 * same estimate, offered "dans votre commune" rather than in a named one, over
 * a generic photo. The funnel behind it already works nationwide — the address
 * base and the notarial record both cover the whole country — so the page is a
 * complete lead capture, not a placeholder.
 *
 * It is deliberately not an entry in the client registry. A registry entry gets
 * a subdomain, appears in listings and owns its leads; this one has no agency
 * behind it, which is exactly what `generic` tells the pages that would
 * otherwise introduce one.
 *
 * `basePath: ""` is what makes it work with no special-casing anywhere else:
 * every link helper builds `/estimation`, `/mentions`… at the root, the same
 * way it builds `/boulogne-billancourt/estimation` for a client.
 */

/** Leads from this page belong to nobody, so this name is the operator's own brand. */
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "Estimation Immobilière";

/** Swap for a neutral, recognisably-French cover: no skyline that names a city. */
const COVER = process.env.NEXT_PUBLIC_GENERIC_COVER?.trim() || "/hero-cover.jpg";

export const GENERIC_LANDING: Landing = {
  generic: true,
  basePath: "",

  agency: {
    slug: "",
    name: SITE_NAME,
    description: "",
    phone: process.env.NEXT_PUBLIC_SITE_PHONE?.trim() ?? "",
    email: process.env.NEXT_PUBLIC_SITE_EMAIL?.trim() ?? "",
    address: process.env.NEXT_PUBLIC_SITE_ADDRESS?.trim() ?? "",
    cities: [],
    // The operator's own identifiers, not a client's. Empty until filled, which
    // both legal pages then show in red.
    legal: {},
  },

  city: {
    slug: "",
    name: "votre commune",
    // The same preposition field a client city uses — here it happens to be
    // "dans", which is what turns the hero into "dans votre commune".
    preposition: "dans",
    coverImage: COVER,
    sampleAddress: "12 rue du Château",
  },
};
