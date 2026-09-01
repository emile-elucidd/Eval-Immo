import { formatPricePerSqm } from "@/lib/utils";
import type { MarketSummary } from "@/lib/market";
import { inCity } from "@/lib/tenant/format";
import type { City } from "@/lib/tenant/types";

/**
 * What the estimator returns, for one commune: where the middle of the market
 * sits, how it has moved, and the gap between what is asked and what is paid.
 *
 * With a {@link MarketSummary} every figure here is the commune's own, read
 * from the notarial record. Without one — the generic landing, or a commune the
 * record does not cover — it falls back to the illustrative sample it has
 * always shown.
 */

/** The sample used when the commune has no published record. */
const SAMPLE = {
  pricePerSqm: 9710,
  low: 9240,
  high: 10180,
  history: [
    { year: 2021, pricePerSqm: 9180 },
    { year: 2022, pricePerSqm: 9640 },
    { year: 2023, pricePerSqm: 9380 },
    { year: 2024, pricePerSqm: 9520 },
    { year: 2025, pricePerSqm: 9710 },
  ],
} satisfies Pick<MarketSummary, "pricePerSqm" | "low" | "high" | "history">;

/**
 * How far above the settled price a listing typically starts.
 *
 * This is the one number on the panel that DVF cannot supply: the record holds
 * deeds, not advertisements, so no dataset here knows what the seller asked.
 * It is an editorial assumption — the same 5-10 % the copy beside it claims —
 * and it is a constant so it can be changed in one place, or the row dropped.
 */
const LISTING_PREMIUM = 0.08;

/** The history, drawn into a 320×88 box, scaled to its own min and max. */
function sparkline(history: MarketSummary["history"]) {
  const prices = history.map((point) => point.pricePerSqm);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  // A flat commune must not become a flat line at the top of the box.
  const span = max - min || Math.max(max * 0.1, 1);

  const points = history.map((point, index) => {
    const x = (index / Math.max(history.length - 1, 1)) * 320;
    const y = 82 - ((point.pricePerSqm - min) / span) * 76;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const line = `M${points.join(" L")}`;
  return { line, area: `${line} L320,88 L0,88 Z` };
}

export function PricePanel({ city, market }: { city: City; market: MarketSummary | null }) {
  const data = market ?? SAMPLE;
  const { line, area } = sparkline(data.history);

  const settled = data.pricePerSqm;
  const asking = Math.round(settled * (1 + LISTING_PREMIUM));

  const heading = market?.street
    ? `${market.street.toLowerCase()}, ${city.name}`
    : (city.sampleAddress ?? `12 rue du Château, ${city.name}`);

  const from = data.history[0].year;
  const to = data.history[data.history.length - 1].year;

  return (
    <div className="w-full max-w-md rounded-md bg-muted/60 p-6 lg:p-8">
      <p className="text-sm text-muted-foreground first-letter:uppercase">{heading}</p>

      <p className="mt-2 text-2xl font-black tabular-nums text-foreground lg:text-3xl">
        {new Intl.NumberFormat("fr-FR").format(data.low)} – {formatPricePerSqm(data.high)}
      </p>

      <div className="mt-8">
        <svg
          viewBox="0 0 320 88"
          className="h-24 w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Évolution du prix au m² de ${from} à ${to}`}
        >
          <path d={area} fill="hsl(var(--primary))" fillOpacity="0.12" />
          <path
            d={line}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>{from}</span>
          <span>{to}</span>
        </div>
      </div>

      <dl className="mt-8 flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-sm text-muted-foreground">Prix affiché en annonce</dt>
          <dd className="text-base tabular-nums text-muted-foreground line-through">
            {formatPricePerSqm(asking)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-sm font-medium text-foreground">Prix de vente réel</dt>
          <dd className="text-base font-black tabular-nums text-primary">
            {formatPricePerSqm(settled)}
          </dd>
        </div>
      </dl>

      {market ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Médiane des ventes notariales {to} {inCity(city)} —{" "}
          {market.sampleSize.toLocaleString("fr-FR")} ventes analysées.
        </p>
      ) : null}
    </div>
  );
}
