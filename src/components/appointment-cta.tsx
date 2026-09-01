import { ButtonLink } from "@/components/ui/button";
import { landingHref } from "@/lib/tenant/format";
import type { Landing } from "@/lib/tenant/types";

/**
 * The mid-page call to action.
 *
 * On a client's landing it offers the visit, because there is a named agency
 * ready to make it. On the generic landing there is not, so it offers the one
 * thing that page can actually deliver — the online estimate — rather than
 * promising a meeting with nobody in particular.
 */
export function AppointmentCta({ landing }: { landing: Landing }) {
  const { basePath, generic } = landing;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 lg:py-16">
      <div className="flex flex-col items-center gap-6 rounded-md bg-primary px-6 py-14 text-center lg:gap-8 lg:py-20">
        <h2 className="max-w-2xl text-2xl leading-tight font-black tracking-tight text-balance text-primary-foreground sm:text-3xl lg:text-4xl">
          Une estimation sur place, gratuite et sans engagement
        </h2>
        <p className="max-w-xl text-base text-balance text-primary-foreground/70 lg:text-lg">
          {generic
            ? "Commencez par l'estimation en ligne : un agent expert de votre quartier peut ensuite se déplacer pour évaluer ce qu'aucune donnée ne capture."
            : "Un agent expert de votre quartier se déplace, évalue ce qu'aucune donnée ne capture et vous remet un dossier détaillé."}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {generic ? null : (
            <ButtonLink
              href={landingHref(basePath, "/rendez-vous")}
              id="schedule-meeting-cta"
              size="lg"
              className="bg-background px-7 font-bold text-foreground hover:brightness-95"
            >
              Prendre rendez-vous
            </ButtonLink>
          )}
          <ButtonLink
            href={landingHref(basePath, "/estimation")}
            id="appointment-cta-estimate"
            variant={generic ? "primary" : "ghost"}
            size="lg"
            className={
              generic
                ? "bg-background px-7 font-bold text-foreground hover:brightness-95"
                : "border border-primary-foreground/40 bg-transparent px-7 font-bold text-primary-foreground hover:bg-primary-foreground/10"
            }
          >
            Estimer mon bien
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
