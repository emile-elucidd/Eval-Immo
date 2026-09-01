import "server-only";

import type { Agency } from "@/lib/tenant/types";

/**
 * The secrets half of a client's configuration.
 *
 * A client record splits in two: what is safe to read — name, town, photos,
 * legal identifiers — and what is not — the CRM token, the inbound webhook.
 * The first half lives in the registry, wherever that is; the second lives in
 * environment variables, named after the agency's slug so that onboarding a
 * client never means writing code.
 *
 *     slug "rive-ouest"  →  AGENCY_RIVE_OUEST_…
 *
 * | Variable                            | Effet                                   |
 * |-------------------------------------|-----------------------------------------|
 * | `AGENCY_<SLUG>_CALENDAR_URL`        | Le calendrier embarqué sur /rendez-vous |
 * | `AGENCY_<SLUG>_WEBHOOK_URL`         | Webhook entrant qui reçoit le lead      |
 * | `AGENCY_<SLUG>_GHL_LOCATION_ID`     | Sous-compte Go High Level destinataire  |
 * | `AGENCY_<SLUG>_GHL_TOKEN`           | Token propre à ce client (sinon `GHL_TOKEN`) |
 *
 * These only ever *fill in* what the registry left empty, so an entry that sets
 * a field explicitly keeps it.
 */

/** `rive-ouest` → `AGENCY_RIVE_OUEST`. */
export function envPrefix(slug: string): string {
  return `AGENCY_${slug.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
}

function read(prefix: string, name: string): string | undefined {
  return process.env[`${prefix}_${name}`]?.trim() || undefined;
}

/** The agency, with its calendar and CRM destinations filled in from the environment. */
export function withEnvSecrets(agency: Agency): Agency {
  const prefix = envPrefix(agency.slug);

  const webhookUrl = agency.crm?.webhookUrl || read(prefix, "WEBHOOK_URL");
  const locationId = agency.crm?.ghl?.locationId || read(prefix, "GHL_LOCATION_ID");
  const token =
    agency.crm?.ghl?.token || read(prefix, "GHL_TOKEN") || process.env.GHL_TOKEN?.trim();

  return {
    ...agency,
    calendarUrl: agency.calendarUrl || read(prefix, "CALENDAR_URL"),
    crm: {
      ...agency.crm,
      webhookUrl,
      // Both halves are required: a location without a token, or the reverse,
      // would fail on every lead and is better treated as "not configured".
      ...(locationId && token
        ? {
            ghl: {
              tags: ["estimation-en-ligne"],
              ...agency.crm?.ghl,
              locationId,
              token,
            },
          }
        : {}),
    },
  };
}
