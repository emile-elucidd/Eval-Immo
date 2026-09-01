import "server-only";

import type { Lead } from "@/lib/leads";
import type { Agency, CrmConfig, LeadField } from "@/lib/tenant/types";

/**
 * Delivering a lead into a Go High Level sub-account.
 *
 * Two calls, in order: upsert the contact so a visitor who estimates twice does
 * not become two records, then attach the estimation itself as a note. The note
 * matters — a GHL sub-account's custom fields are created by whoever set it up
 * and their ids differ from one client to the next, so nothing here can assume
 * a field exists. An agency that *has* set them up maps them in
 * `crm.ghl.customFields` and gets structured values as well.
 *
 * Nothing in this file may throw into the request: a CRM that is down must cost
 * the agency a notification, never the visitor their estimate.
 */

const API = "https://services.leadconnectorhq.com";
/** The dated version header GHL's v2 API requires on every call. */
const API_VERSION = "2021-07-28";
const TIMEOUT_MS = 8_000;

/** GHL expects E.164; the funnel normalises to the French national format. */
function toE164(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0033")) return `+${digits.slice(2)}`;
  if (digits.startsWith("33")) return `+${digits}`;
  return `+33${digits.replace(/^0/, "")}`;
}

const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const PROPERTY_TYPES: Record<string, string> = {
  apartment: "Appartement",
  house: "Maison",
  field: "Terrain",
};

const CONDITIONS: Record<string, string> = {
  poor: "À rénover",
  standard: "Standard",
  excellent: "Refait à neuf",
};

const PROJECTS: Record<string, string> = {
  LESS_THREE_MONTHS: "Vente sous 3 mois",
  MORE_THREE_MONTHS: "Vente à plus de 3 mois",
  ON_SALE: "Déjà en vente",
  NON_SELLER: "Pas de projet de vente",
};

/** The estimation, flattened to the values a CRM can hold in a field. */
export function leadFields(lead: Lead, landingUrl?: string): Record<LeadField, string> {
  const { input, result } = lead;
  return {
    address: input.address.label,
    city: input.address.city,
    postcode: input.address.postcode,
    propertyType: PROPERTY_TYPES[input.property.type] ?? input.property.type,
    surface: `${input.property.surface} m²`,
    condition: CONDITIONS[input.property.condition] ?? input.property.condition,
    project: PROJECTS[input.project] ?? input.project,
    marketPrice: euros.format(result.marketPrice),
    priceRange: `${euros.format(result.low)} – ${euros.format(result.high)}`,
    pricePerSqm: `${Math.round(result.pricePerSqm)} €/m²`,
    landingUrl: landingUrl ?? "",
  };
}

/** What a salesperson wants to read at the top of the contact record. */
function note(fields: Record<LeadField, string>, agency: Agency): string {
  const lines = [
    `Estimation en ligne — ${agency.name}`,
    "",
    `Adresse : ${fields.address}`,
    `Type : ${fields.propertyType} · ${fields.surface} · ${fields.condition}`,
    `Projet : ${fields.project}`,
    "",
    `Prix de marché : ${fields.marketPrice} (${fields.pricePerSqm})`,
    `Fourchette : ${fields.priceRange}`,
  ];
  if (fields.landingUrl) lines.push("", `Landing : ${fields.landingUrl}`);
  return lines.join("\n");
}

async function call(
  path: string,
  token: string,
  body: unknown,
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; detail: string }> {
  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      version: API_VERSION,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const text = await response.text();
  if (!response.ok) return { ok: false, detail: `${response.status} ${text.slice(0, 300)}` };

  try {
    return { ok: true, data: JSON.parse(text) as Record<string, unknown> };
  } catch {
    return { ok: true, data: {} };
  }
}

/** The contact id, whichever shape the upsert response came back in. */
function contactIdOf(data: Record<string, unknown>): string | null {
  const contact = data.contact as { id?: unknown } | undefined;
  const id = contact?.id ?? data.id;
  return typeof id === "string" ? id : null;
}

export async function sendToGoHighLevel(
  lead: Lead,
  agency: Agency,
  landingUrl?: string,
): Promise<void> {
  const ghl: NonNullable<CrmConfig["ghl"]> | undefined = agency.crm?.ghl;
  if (!ghl?.locationId || !ghl.token) return;

  const fields = leadFields(lead, landingUrl);

  const customFields = Object.entries(ghl.customFields ?? {})
    .filter(([, key]) => Boolean(key))
    .map(([field, key]) => ({ key, field_value: fields[field as LeadField] }));

  const upsert = await call("/contacts/upsert", ghl.token, {
    locationId: ghl.locationId,
    firstName: lead.contact.firstName,
    lastName: lead.contact.lastName,
    email: lead.contact.email,
    phone: toE164(lead.contact.phone),
    source: "Estimation en ligne",
    tags: ghl.tags ?? [],
    address1: lead.input.address.street || undefined,
    city: lead.input.address.city || undefined,
    postalCode: lead.input.address.postcode || undefined,
    country: "FR",
    ...(customFields.length > 0 ? { customFields } : {}),
  });

  if (!upsert.ok) {
    console.error(`[crm] ${agency.slug}: GHL contact upsert failed — ${upsert.detail}`);
    return;
  }

  const contactId = contactIdOf(upsert.data);
  if (!contactId) {
    console.error(`[crm] ${agency.slug}: GHL upsert returned no contact id`);
    return;
  }

  const noted = await call(`/contacts/${contactId}/notes`, ghl.token, {
    body: note(fields, agency),
  });
  if (!noted.ok) {
    // The contact is in, which is the part that matters; say so and move on.
    console.error(`[crm] ${agency.slug}: GHL note failed — ${noted.detail}`);
  }
}
