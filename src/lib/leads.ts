import "server-only";

import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { leadFields, sendToGoHighLevel } from "@/lib/crm/ghl";
import type { EstimationInput, EstimationResult } from "@/lib/estimation";
import type { Agency } from "@/lib/tenant/types";

/**
 * Where a captured lead goes.
 *
 * The estimate is the product; the lead is the point — and on a multi-agency
 * deployment the lead belongs to exactly one client, so delivery is a property
 * of the agency rather than of the build. Each one may declare an inbound
 * webhook, a Go High Level sub-account, or both; `LEADS_WEBHOOK_URL` stays as a
 * catch-all for the agencies that declare neither, which is how a new client is
 * never silently dropped on the floor.
 *
 * Nothing here is allowed to fail the request. A CRM outage costs a
 * notification, never the visitor their estimate.
 */

export type Contact = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type Lead = {
  id: string;
  createdAt: string;
  /** The landing the visitor came from — which agency, which commune. */
  landing: { agency: string; city: string };
  contact: Contact;
  input: EstimationInput;
  result: EstimationResult;
};

const LOCAL_FILE = path.join(process.cwd(), ".leads", "leads.jsonl");

async function appendLocally(lead: Lead) {
  try {
    await mkdir(path.dirname(LOCAL_FILE), { recursive: true });
    await appendFile(LOCAL_FILE, `${JSON.stringify(lead)}\n`, "utf8");
  } catch {
    // A read-only filesystem (any serverless host) is the normal case, not a failure.
  }
}

async function postWebhook(url: string, lead: Lead, agency: Agency | null, landingUrl?: string) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...lead,
        agencyName: agency?.name,
        landingUrl,
        // Flattened alongside the raw lead: an inbound webhook in a no-code tool
        // maps a flat object far more easily than a nested one.
        fields: leadFields(lead, landingUrl),
      }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch (error) {
    console.error(`[leads] ${lead.landing.agency}: webhook failed`, error);
  }
}

/**
 * `agency` is `null` when the payload named a landing that is not on file — a
 * replayed request, or a client removed between the page load and the submit.
 * The lead is still recorded and still forwarded to the deployment-wide
 * webhook; only the per-client destinations are skipped, since there is no
 * client to attribute it to.
 */
export async function recordLead(lead: Lead, agency: Agency | null, landingUrl?: string) {
  console.info(
    `[leads] ${lead.landing.agency}/${lead.landing.city} · ${lead.contact.email} · ${lead.input.address.label} · ${lead.result.marketPrice} €`,
  );

  const webhook = agency?.crm?.webhookUrl || process.env.LEADS_WEBHOOK_URL;

  // In parallel and each one guarded: one dead destination must not stop the others.
  await Promise.all([
    appendLocally(lead),
    webhook ? postWebhook(webhook, lead, agency, landingUrl) : undefined,
    agency
      ? sendToGoHighLevel(lead, agency, landingUrl).catch((error) => {
          console.error(`[leads] ${agency.slug}: Go High Level delivery failed`, error);
        })
      : undefined,
  ]);
}
