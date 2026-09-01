import { PageShell } from "@/components/page-shell";
import { ButtonLink } from "@/components/ui/button";
import { GENERIC_LANDING } from "@/lib/tenant/generic";

export const metadata = { title: "Prendre rendez-vous" };

/**
 * The appointment page of the generic landing.
 *
 * There is no calendar to embed here: the apex belongs to no agency, and the
 * agency is only known once the address is. So this says so plainly and sends
 * the visitor to the estimate, which is the step that determines which agency
 * they belong to. It exists rather than 404ing because the footer, the FAQ and
 * the funnel all link to it.
 */
export default function AppointmentPage() {
  const { agency } = GENERIC_LANDING;

  return (
    <PageShell title="Prendre rendez-vous" landing={GENERIC_LANDING}>
      <p>
        Le rendez-vous se prend avec l&apos;agence qui couvre votre commune. Commencez par
        l&apos;estimation en ligne&nbsp;: elle prend deux minutes, vous donne immédiatement une
        fourchette de prix, et nous permet de vous mettre en relation avec l&apos;agence de votre
        secteur pour l&apos;affiner sur place.
      </p>

      <ButtonLink href="/estimation" size="lg" className="mt-2 w-fit font-bold">
        Estimer mon bien
      </ButtonLink>

      {agency.phone || agency.email ? (
        <p className="mt-2">
          Une question avant de commencer&nbsp;?{" "}
          {agency.phone ? (
            <a href={`tel:${agency.phone.replace(/\s+/g, "")}`} className="underline underline-offset-2">
              {agency.phone}
            </a>
          ) : null}
          {agency.phone && agency.email ? " — " : null}
          {agency.email ? (
            <a href={`mailto:${agency.email}`} className="underline underline-offset-2">
              {agency.email}
            </a>
          ) : null}
        </p>
      ) : null}
    </PageShell>
  );
}
