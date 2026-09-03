import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { MapFrame } from "@/components/map-frame";
import type { RecentSale } from "@/lib/market";
import { inCity, landingHref } from "@/lib/tenant/format";
import type { City } from "@/lib/tenant/types";
import { formatPricePerSqm } from "@/lib/utils";

/**
 * The rail under the hero.
 *
 * When the commune is in the notarial record, these are its own most recent
 * sales — real streets, real prices, real dates, and a map thumbnail on the
 * actual coordinates. That is a stronger proof than an invented "il y a 5
 * minutes", and it is the same record the estimate itself is built on, so the
 * page opens by showing its working.
 *
 * The generic landing has no commune, so it keeps an illustrative sample and
 * says so.
 */

/** The illustrative sample, used only when there is no commune to read. */
export type Estimation = {
  id: string;
  badge: string;
  location: string;
  pricePerSqm: number;
  detail: string;
  lat: number;
  lon: number;
};

/** Vue à l'échelle du quartier, calée sur la taille rendue de la vignette. */
const CARD_ZOOM = 13;
const CARD_WIDTH_PX = 150;
const CARD_HEIGHT_PX = 150;

const MONTH_YEAR = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

function soldOn(date: string): string {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "Vente enregistrée" : `Vendu en ${MONTH_YEAR.format(parsed)}`;
}

const KINDS: Record<RecentSale["type"], string> = {
  apartment: "Appartement",
  house: "Maison",
  land: "Terrain",
};

type Card = {
  id: string;
  title: string;
  subtitle: string;
  pricePerSqm: number;
  badge: string;
  lat: number;
  lon: number;
};

/** "12 RUE DU CHATEAU" as the record spells it — sentence case reads better. */
function titleCase(street: string): string {
  return street.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, before, letter: string) =>
    `${before}${letter.toUpperCase()}`,
  );
}

function fromSales(sales: RecentSale[], city: City): Card[] {
  return sales.map((sale) => ({
    id: sale.id,
    title: titleCase(sale.street),
    subtitle: [city.postcode, KINDS[sale.type], `${sale.surface} m²`].filter(Boolean).join(" · "),
    pricePerSqm: sale.pricePerSqm,
    badge: soldOn(sale.date),
    lat: sale.lat,
    lon: sale.lon,
  }));
}

function fromSample(estimations: Estimation[]): Card[] {
  return estimations.map((estimation) => {
    const match = estimation.location.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    const [kind, ...rest] = estimation.detail.split(/\s*[-–·]\s*/);
    return {
      id: estimation.id,
      title: match ? match[1] : estimation.location,
      subtitle: [match?.[2], kind, rest.join(" ")].filter(Boolean).join(" · "),
      pricePerSqm: estimation.pricePerSqm,
      badge: estimation.badge,
      lat: estimation.lat,
      lon: estimation.lon,
    };
  });
}

export function LastEstimations({
  sales,
  sample,
  city,
  basePath,
}: {
  /** The commune's real recent sales, or `null` when there is no commune. */
  sales: RecentSale[] | null;
  sample: Estimation[];
  city: City;
  basePath: string;
}) {
  const real = sales !== null && sales.length > 0;
  const cards = real ? fromSales(sales, city) : fromSample(sample);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:py-16">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-xl flex-col gap-3">
          <h2 className="text-2xl leading-tight font-black tracking-tight text-balance text-foreground sm:text-3xl lg:text-4xl">
            {real ? `Ventes récentes ${inCity(city)}` : "Estimations récentes près de chez vous"}
          </h2>
          <p className="text-base text-muted-foreground lg:text-lg">
            {real
              ? "Les dernières transactions enregistrées chez le notaire, celles-là mêmes sur lesquelles repose votre estimation."
              : "Quelques exemples de fourchettes calculées à partir des ventes notariales."}
          </p>
        </div>

        <ButtonLink
          href={landingHref(basePath, "/estimation")}
          id="last-estimations-cta"
          variant="ghost"
          size="md"
          className="w-fit shrink-0 self-center border border-foreground bg-transparent px-4 font-bold text-foreground hover:bg-accent md:self-auto"
        >
          Estimer mon bien
          <ArrowRight className="h-4 w-4" />
        </ButtonLink>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3">
        {cards.map((card, index) => (
          <article
            key={card.id}
            className={`items-stretch overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-foreground/30 ${
              index < 3 ? "flex" : "hidden sm:flex"
            }`}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-3 p-5">
              <div className="min-w-0">
                <p className="truncate font-bold text-foreground">{card.title}</p>
                <p className="whitespace-nowrap text-[13px] text-muted-foreground tabular-nums">
                  {card.subtitle}
                </p>
              </div>

              <p className="text-2xl font-black tabular-nums text-foreground">
                {formatPricePerSqm(card.pricePerSqm)}
              </p>
              <span className="text-xs text-muted-foreground">{card.badge}</span>
            </div>

            <div className="w-1/3 shrink-0 border-l border-border">
              <MapFrame
                point={{ lat: card.lat, lon: card.lon, label: card.title }}
                zoom={CARD_ZOOM}
                widthPx={CARD_WIDTH_PX}
                heightPx={CARD_HEIGHT_PX}
                pinSize="h-6 w-6"
                className="h-full w-full"
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
