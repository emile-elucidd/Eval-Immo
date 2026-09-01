import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { communeSales, isPublished } from "@/lib/dvf";
import {
  NoDataError,
  estimate,
  type Annex,
  type Condition,
  type EstimationInput,
  type Project,
  type PropertyType,
} from "@/lib/estimation";
import { recordLead, type Contact } from "@/lib/leads";
import { landingBasePath } from "@/lib/tenant/landing";
import { findAgency } from "@/lib/tenant/source";
import type { Agency, City } from "@/lib/tenant/types";

/**
 * The only way to obtain a price.
 *
 * The estimate is computed here and nowhere else: the browser never receives
 * the model, the dataset, or a price for an anonymous visitor. A request
 * without a usable name, email and phone number is refused before any sale is
 * even loaded, so the contact form is a real gate rather than a screen the
 * curious can skip past.
 *
 * Any address in France is priced — the public record covers the whole country
 * — so the only reason to refuse is a commune whose sales are not in it.
 *
 * The landing the visitor came from arrives in the payload, because Route
 * Handlers see neither the route's dynamic segments nor `next/root-params`. It
 * decides one thing only — whose CRM receives the lead — and is checked against
 * the registry before it is used, so an unknown or forged pair falls back to
 * the deployment-wide destination rather than reaching another client.
 */

const PROPERTY_TYPES: PropertyType[] = ["apartment", "house", "field"];
const CONDITIONS: Condition[] = ["poor", "standard", "excellent"];
const ANNEXES: Annex[] = ["elevator", "parking", "exterior", "garage", "pool", "seaView"];
const PROJECTS: Project[] = ["LESS_THREE_MONTHS", "MORE_THREE_MONTHS", "ON_SALE", "NON_SELLER"];

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** French mobile or landline, however the visitor chose to space it out. */
function normalisePhone(raw: string) {
  const digits = raw.replace(/[^\d+]/g, "");
  const national = digits.replace(/^(?:\+33|0033)/, "0");
  return /^0[1-9]\d{8}$/.test(national) ? national : null;
}

type Body = { input?: unknown; contact?: unknown; landing?: unknown };

/**
 * The agency and commune named by the payload, when both exist on file.
 *
 * Unknown means the visitor is on a landing that has since been removed, or is
 * replaying the request by hand: neither is worth a 400 — the estimate is still
 * correct and the lead is still worth keeping — so it resolves to `null` and
 * delivery falls back to `LEADS_WEBHOOK_URL`.
 */
async function readLanding(
  value: unknown,
): Promise<{ agency: Agency; city: City } | null> {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as { agency?: unknown; city?: unknown };
  if (typeof raw.agency !== "string" || typeof raw.city !== "string") return null;

  const agency = await findAgency(raw.agency);
  const city = agency?.cities.find((candidate) => candidate.slug === raw.city);
  return agency && city ? { agency, city } : null;
}

function readContact(value: unknown): Contact | { error: string } {
  if (typeof value !== "object" || value === null) return { error: "missingContact" };
  const raw = value as Record<string, unknown>;

  const firstName = String(raw.firstName ?? "").trim();
  const lastName = String(raw.lastName ?? "").trim();
  const email = String(raw.email ?? "").trim();
  const phone = String(raw.phone ?? "").trim();

  if (firstName.length < 2 || lastName.length < 2) return { error: "missingName" };
  if (!EMAIL.test(email)) return { error: "invalidEmail" };

  const normalised = normalisePhone(phone);
  if (!normalised) return { error: "invalidPhone" };

  return { firstName, lastName, email: email.toLowerCase(), phone: normalised };
}

function readInput(value: unknown): EstimationInput | { error: string } {
  if (typeof value !== "object" || value === null) return { error: "missingInput" };
  const raw = value as Record<string, unknown>;

  const address = raw.address as Record<string, unknown> | undefined;
  const lat = Number(address?.lat);
  const lon = Number(address?.lon);
  const citycode = String(address?.citycode ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !/^\w{5}$/.test(citycode)) {
    return { error: "invalidAddress" };
  }

  const property = raw.property as Record<string, unknown> | undefined;
  const type = String(property?.type ?? "") as PropertyType;
  if (!PROPERTY_TYPES.includes(type)) return { error: "invalidType" };

  const surface = Number(property?.surface);
  if (!Number.isFinite(surface) || surface < 5 || surface > 100_000) return { error: "invalidSurface" };

  const condition = String(property?.condition ?? "standard") as Condition;
  const annexes = Array.isArray(property?.annexes)
    ? (property.annexes as unknown[]).filter((annex): annex is Annex =>
        ANNEXES.includes(annex as Annex),
      )
    : [];

  const project = String(raw.project ?? "NON_SELLER") as Project;

  return {
    address: {
      label: String(address?.label ?? ""),
      street: String(address?.street ?? ""),
      city: String(address?.city ?? ""),
      postcode: String(address?.postcode ?? ""),
      citycode,
      lat,
      lon,
    },
    property: {
      type,
      surface,
      floor: Number.isFinite(Number(property?.floor)) ? Number(property?.floor) : undefined,
      isLastFloor: property?.isLastFloor === true,
      fieldSurface: Number(property?.fieldSurface) || undefined,
      isServiced: property?.isServiced === true,
      condition: CONDITIONS.includes(condition) ? condition : "standard",
      annexes,
    },
    owner: raw.owner === true,
    project: PROJECTS.includes(project) ? project : "NON_SELLER",
  };
}

/**
 * The page the visitor was on, as they saw it — which is what a salesperson
 * opening the CRM record needs. Built from the request's own headers rather
 * than from `request.url`, whose host is the internal one once the proxy has
 * rewritten a subdomain away.
 */
async function publicLandingUrl(
  request: Request,
  agency: string,
  city: string,
): Promise<string | undefined> {
  const incoming = await headers();
  const host = incoming.get("host");
  if (!host) return undefined;

  const protocol =
    incoming.get("x-forwarded-proto")?.split(",")[0] ??
    new URL(request.url).protocol.replace(":", "");

  return `${protocol}://${host}${await landingBasePath(agency, city)}`;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalidBody" }, { status: 400 });
  }

  // The gate. Nothing below runs for a visitor who has not identified themselves.
  const contact = readContact(body.contact);
  if ("error" in contact) return NextResponse.json({ error: contact.error }, { status: 400 });

  const input = readInput(body.input);
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400 });

  if (!isPublished(input.address.citycode)) {
    return NextResponse.json({ error: "notPublished" }, { status: 422 });
  }

  let result;
  try {
    result = estimate(input, { sales: await communeSales(input.address.citycode) });
  } catch (error) {
    if (error instanceof NoDataError) {
      return NextResponse.json({ error: "notEnoughData" }, { status: 422 });
    }
    console.error("[estimation] failed", error);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }

  const landing = await readLanding(body.landing);
  const landingUrl = landing
    ? await publicLandingUrl(request, landing.agency.slug, landing.city.slug)
    : undefined;

  await recordLead(
    {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      landing: {
        agency: landing?.agency.slug ?? "inconnue",
        city: landing?.city.slug ?? input.address.city,
      },
      contact,
      input,
      result,
    },
    landing?.agency ?? null,
    landingUrl,
  );

  return NextResponse.json({ result });
}
