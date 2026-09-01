"use client";

import { CalendarCheck, MapPin, ShieldCheck, TrendingUp } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { useLanding, useLandingHref } from "@/lib/tenant/context";
import type { Address, EstimationResult } from "@/lib/estimation";

/**
 * The payoff screen.
 *
 * A single number invites an argument; a bracket, the sales it came from, and
 * the adjustments that were applied invite a conversation — which is the point,
 * since the appointment is what the funnel is actually for.
 */

const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const CONFIDENCE_LABEL: Record<EstimationResult["confidence"], string> = {
  high: "Fiabilité élevée",
  medium: "Fiabilité correcte",
  low: "Fiabilité indicative",
};

function formatDate(iso: string) {
  const [year, month] = iso.split("-");
  return `${month}/${year}`;
}

function formatFactor(value: number) {
  const percent = (value - 1) * 100;
  const rounded = Math.abs(percent) < 1 ? percent.toFixed(1) : Math.round(percent).toString();
  return `${percent > 0 ? "+" : "−"}${rounded.replace("-", "").replace(".", ",")} %`;
}

export function ResultView({
  address,
  result,
  firstName,
}: {
  address: Address;
  result: EstimationResult;
  firstName: string;
}) {
  const { agency } = useLanding();
  const href = useLandingHref();

  return (
    <div className="flex w-full flex-col gap-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <p className="text-base text-muted-foreground">
          {firstName}, voici la pré-estimation de votre bien
        </p>
        <h1 className="flex items-center gap-2 text-lg font-medium text-foreground">
          <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          {address.label}
        </h1>
      </header>

      <section className="flex flex-col items-center gap-4 rounded-md bg-muted/60 px-6 py-10 text-center">
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Fourchette d&apos;estimation
        </p>
        <p className="text-3xl leading-tight font-black tabular-nums text-foreground sm:text-4xl">
          {euros.format(result.low)} – {euros.format(result.high)}
        </p>
        <p className="text-base text-muted-foreground tabular-nums">
          soit {new Intl.NumberFormat("fr-FR").format(result.pricePerSqm)} €/m²
        </p>
        <p className="mt-2 inline-flex items-center gap-2 rounded-md bg-card px-3 py-1.5 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
          {CONFIDENCE_LABEL[result.confidence]} · {result.sampleSize} ventes réelles dans un rayon de{" "}
          {result.radius < 1000
            ? `${result.radius} m`
            : `${(result.radius / 1000).toFixed(1).replace(".", ",")} km`}
        </p>
        {result.method === "derived" ? (
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Aucun terrain nu n&apos;a été vendu récemment dans ce secteur : ce prix est déduit de la
            valeur du bâti alentour. Un rendez-vous sur place le fiabilisera nettement.
          </p>
        ) : null}
      </section>

      <section>
        <dl className="flex flex-col divide-y divide-border rounded-md border border-border">
          <div className="flex items-baseline justify-between gap-4 px-5 py-4">
            <dt className="text-base text-muted-foreground">Prix net vendeur</dt>
            <dd className="text-lg font-bold tabular-nums text-foreground">
              {euros.format(result.netPrice)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 bg-secondary/40 px-5 py-4">
            <dt className="text-base font-medium text-foreground">Prix de marché</dt>
            <dd className="text-xl font-black tabular-nums text-primary">
              {euros.format(result.marketPrice)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 px-5 py-4">
            <dt className="text-base text-muted-foreground">Prix coup de cœur</dt>
            <dd className="text-lg font-bold tabular-nums text-foreground">
              {euros.format(result.heartPrice)}
            </dd>
          </div>
        </dl>
      </section>

      {result.comparables.length > 0 ? (
        <section>
          <h2 className="text-lg font-black text-foreground">Transactions récentes à proximité</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ventes réellement enregistrées chez le notaire, publiées dans la base DVF.
          </p>
          <ul className="mt-4 flex flex-col divide-y divide-border rounded-md border border-border">
            {result.comparables.map((sale) => (
              <li key={`${sale.date}-${sale.price}-${sale.distance}`} className="px-5 py-4">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-base font-medium text-foreground">
                    {sale.surface} m² · {sale.street || "voie non renseignée"}
                  </span>
                  <span className="shrink-0 text-base font-bold tabular-nums text-foreground">
                    {euros.format(sale.price)}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-4 text-sm text-muted-foreground tabular-nums">
                  <span>
                    Vendu {formatDate(sale.date)} · à {sale.distance} m
                  </span>
                  <span>{new Intl.NumberFormat("fr-FR").format(sale.pricePerSqm)} €/m²</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="flex items-center gap-2 text-lg font-black text-foreground">
          <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
          Comment ce prix est obtenu
        </h2>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">
          {result.method === "derived"
            ? "Le point de départ est déduit du marché bâti autour de votre adresse, soit "
            : "Le point de départ est le prix médian des ventes comparables autour de votre adresse, soit "}
          <strong className="font-semibold text-foreground tabular-nums">
            {new Intl.NumberFormat("fr-FR").format(result.basePricePerSqm)} €/m²
          </strong>
          , réindexé sur le marché d&apos;aujourd&apos;hui. Les caractéristiques de votre bien
          l&apos;ajustent ensuite :
        </p>
        {result.adjustments.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {result.adjustments.map((adjustment) => (
              <li
                key={adjustment.label}
                className="flex items-baseline gap-2 rounded-md bg-muted/70 px-3 py-1.5 text-sm"
              >
                <span className="text-muted-foreground">{adjustment.label}</span>
                <span className="font-bold tabular-nums text-foreground">
                  {formatFactor(adjustment.value)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Aucun ajustement notable : votre bien correspond au profil moyen du quartier.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-md bg-primary/5 p-6">
        <h2 className="text-lg font-black text-foreground">
          Affinez cette estimation avec notre expert du quartier
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Ce prix est une pré-estimation donnée à titre indicatif. Dans le cadre d&apos;une mise en
          vente, {agency.name} réalise une estimation complète de votre bien en prenant en compte de
          nombreux facteurs supplémentaires (agencement, performance énergétique, vue, exposition,
          état de la copropriété…).
        </p>
        <ButtonLink href={href("/rendez-vous")} size="lg" className="w-full font-bold sm:w-fit">
          <CalendarCheck className="h-5 w-5 shrink-0" aria-hidden />
          Prendre rendez-vous — gratuit et sans engagement
        </ButtonLink>
      </section>
    </div>
  );
}
