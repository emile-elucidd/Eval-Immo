/**
 * What changes from one client agency to the next.
 *
 * A *landing* is an agency crossed with one of the towns it covers: the same
 * agency can run several landings — one per commune — and each one gets its own
 * URL, its own cover photo and its own SEO copy. Everything the site renders
 * that is not boilerplate comes from here, so onboarding a client is filling in
 * one object rather than editing components.
 *
 * The shape is deliberately flat and string-only: it has to survive a round
 * trip through JSON when the registry is served by a CMS or by Go High Level
 * rather than by the local file.
 */

/** Fields the operator alone can supply. Anything left empty renders as a loud placeholder. */
export type LegalIdentity = {
  /** SARL, SAS, SASU… */
  legalForm?: string;
  /** Share capital, in euros, already formatted ("10 000"). */
  capital?: string;
  /** Town of the commercial court the company is registered with. */
  rcsCity?: string;
  siren?: string;
  siret?: string;
  /** APE / NAF code — "6831Z" for estate agents. */
  ape?: string;
  vat?: string;
  /** Directeur de la publication. */
  publisher?: string;

  /** Loi Hoguet: "Transactions sur immeubles et fonds de commerce" card number. */
  professionalCard?: string;
  /** The CCI that issued it. */
  cardIssuer?: string;
  /** Name and address of the financial guarantor. */
  guarantor?: string;
  /** Amount guaranteed, in euros, already formatted. */
  guarantorAmount?: string;
  /** Name and address of the professional liability insurer. */
  insurer?: string;
  insurancePolicy?: string;
  /** Whether the agency may hold client funds — a sentence, not a boolean. */
  fundsHandling?: string;

  /** Consumer mediator: name, postal address, website. */
  mediator?: string;
  /** Data protection officer, when one has been appointed. */
  dpo?: string;
  /** Named in the privacy policy as a processor. Defaults to "Go High Level". */
  crmName?: string;

  /** Shown as "dernière mise à jour" on both legal pages. */
  updatedOn?: string;
};

/** Where a captured lead is delivered. Never leaves the server. */
export type CrmConfig = {
  /** Inbound webhook (Go High Level, Zapier, Make…). Receives the whole lead as JSON. */
  webhookUrl?: string;
  /** Go High Level API v2 — creates or updates the contact in this sub-account. */
  ghl?: {
    locationId: string;
    /** Private Integration token or sub-account API key. Server-side only. */
    token: string;
    /** Applied to the contact so workflows can route on it. */
    tags?: string[];
    /**
     * Estimation values to copy into GHL custom fields, keyed by the custom
     * field's `fieldKey` or id in that sub-account. Left empty, only the
     * standard contact fields and a note are sent.
     */
    customFields?: Partial<Record<LeadField, string>>;
  };
};

/** The estimation values that can be mapped onto a CRM custom field. */
export type LeadField =
  | "address"
  | "city"
  | "postcode"
  | "propertyType"
  | "surface"
  | "condition"
  | "project"
  | "marketPrice"
  | "priceRange"
  | "pricePerSqm"
  | "landingUrl";

/** One commune an agency covers — one landing. */
export type City = {
  /** URL segment: lowercase, no accents ("boulogne-billancourt"). */
  slug: string;
  /** Displayed as written, accents included ("Boulogne-Billancourt", "Le Havre"). */
  name: string;
  /**
   * The preposition that goes in front of the name — "à Boulogne-Billancourt",
   * but "au Havre", "aux Lilas", "à Paris". French has no rule for this, so it
   * is data, not logic.
   */
  preposition: string;
  /**
   * Postcode. Optional, but worth setting: it disambiguates the commune when
   * several share a name, and it labels the cards in the recent-sales rail.
   */
  postcode?: string;
  /**
   * INSEE code. Optional — leave it out and the name is resolved against the
   * Base Adresse Nationale. Set it only to override that, for a name the BAN
   * reads differently than intended.
   */
  insee?: string;
  /**
   * Hero cover photo: a path under /public ("/hero-cover.jpg") or an absolute
   * URL served by a CMS or a CDN.
   */
  coverImage: string;
  /** An address in the commune, used as the placeholder of the address field. */
  sampleAddress?: string;
};

/** One client agency. */
export type Agency = {
  /** URL segment and subdomain: "rive-ouest". */
  slug: string;
  name: string;
  /**
   * The paragraph shown next to the agency photo. Supports the tokens listed in
   * {@link fillTokens} — `{{ville}}`, `{{a_ville}}`, `{{agence}}` — so one
   * description can serve every commune the agency covers.
   */
  description: string;
  /** Portrait or storefront photo: /public path or absolute URL. Falls back to a monogram. */
  photo?: string;
  /** Header and footer logo: /public path or absolute URL. Falls back to the agency name. */
  logo?: string;

  phone: string;
  email: string;
  address: string;

  /**
   * The booking page embedded on /rendez-vous. A Go High Level calendar embed
   * URL (https://api.leadconnectorhq.com/widget/booking/…) or any bookable
   * page. Empty: the appointment page falls back to phone and email.
   */
  calendarUrl?: string;

  /** The communes this agency has a landing for. The first one is its default. */
  cities: City[];

  legal: LegalIdentity;
  crm?: CrmConfig;
};

/** An agency crossed with one of its towns — everything one page needs. */
export type Landing = {
  agency: Agency;
  city: City;
  /**
   * True for the one landing that belongs to no client: the page at the apex
   * domain, which offers the same estimate "dans votre commune" and is where a
   * broken link lands. It has no agency to introduce and no calendar, so the
   * few blocks that presuppose one are skipped.
   */
  generic?: boolean;
  /**
   * The prefix every in-site link must carry, as the *visitor* sees it:
   * `/boulogne-billancourt` behind a per-agency subdomain, or
   * `/rive-ouest/boulogne-billancourt` when the agency is a path segment.
   */
  basePath: string;
};

/**
 * The part of a landing that is safe to send to the browser.
 *
 * {@link CrmConfig} carries API tokens and webhook URLs, and
 * {@link LegalIdentity} is only ever rendered on the server, so neither is in
 * here. Client components receive this and nothing else.
 */
export type PublicLanding = {
  agency: Pick<Agency, "slug" | "name" | "phone" | "email" | "address" | "logo"> & {
    description: string;
  };
  city: City;
  basePath: string;
  hasCalendar: boolean;
  generic?: boolean;
};
