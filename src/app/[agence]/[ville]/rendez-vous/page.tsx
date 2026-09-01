import Script from "next/script";
import { Mail, MapPin, Phone } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { ButtonLink } from "@/components/ui/button";
import { inCity, landingHref } from "@/lib/tenant/format";
import { requireLanding, type LandingParams } from "@/lib/tenant/landing";

export const metadata = { title: "Prendre rendez-vous" };

/** Only an https page is embedded, and only from the agency's own configuration. */
function bookingUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Go High Level ships this to size its booking iframe to its content. */
const GHL_RESIZE_SCRIPT = "https://link.msgsndr.com/js/form_embed.js";

function isGoHighLevel(url: string): boolean {
  const { hostname } = new URL(url);
  return hostname.endsWith("leadconnectorhq.com") || hostname.endsWith("msgsndr.com");
}

/**
 * The appointment page.
 *
 * The calendar itself belongs to the agency — a Go High Level booking widget
 * for a client whose CRM is GHL, any bookable https page otherwise — so it is a
 * field of the registry, not something wired into the build. An agency that has
 * not supplied one yet still gets a usable page: its phone number, its address
 * and the online estimate.
 */
export default async function AppointmentPage({ params }: { params: Promise<LandingParams> }) {
  const landing = await requireLanding(await params);
  const { agency, city } = landing;
  const calendar = bookingUrl(agency.calendarUrl);

  return (
    <PageShell title="Prendre rendez-vous" landing={landing}>
      <p>
        Un conseiller {agency.name} se déplace {inCity(city)} pour évaluer sur place ce
        qu&apos;aucune donnée ne capture. Le rendez-vous est gratuit et sans engagement.
      </p>

      {calendar ? (
        <>
          <div className="mt-2 overflow-hidden rounded-md border border-border">
            <iframe
              src={calendar}
              title={`Prendre rendez-vous avec ${agency.name}`}
              className="h-[750px] w-full"
              scrolling="no"
            />
          </div>
          {isGoHighLevel(calendar) ? (
            <Script src={GHL_RESIZE_SCRIPT} strategy="lazyOnload" />
          ) : null}
        </>
      ) : (
        <div className="mt-2 flex flex-col gap-4 rounded-md bg-muted/60 p-6">
          <p className="text-foreground">
            La prise de rendez-vous en ligne n&apos;est pas encore ouverte pour cette agence.
            Contactez-nous directement, nous fixons un créneau avec vous&nbsp;:
          </p>
          <dl className="flex flex-col gap-2 text-base text-foreground">
            <div className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <dt className="sr-only">Téléphone</dt>
              <dd>
                <a href={`tel:${agency.phone.replace(/\s+/g, "")}`} className="hover:underline">
                  {agency.phone}
                </a>
              </dd>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <dt className="sr-only">Email</dt>
              <dd>
                <a href={`mailto:${agency.email}`} className="hover:underline">
                  {agency.email}
                </a>
              </dd>
            </div>
            <div className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <dt className="sr-only">Adresse</dt>
              <dd>{agency.address}</dd>
            </div>
          </dl>
        </div>
      )}

      <ButtonLink
        href={landingHref(landing.basePath, "/estimation")}
        size="lg"
        className="mt-2 w-fit font-bold"
      >
        Commencer par une estimation en ligne
      </ButtonLink>
    </PageShell>
  );
}
