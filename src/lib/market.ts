import "server-only";

import { cache } from "react";

import { MARKET_YEARS, communeSales, isPublished } from "@/lib/dvf";
import type { Sale } from "@/lib/estimation";
import type { City } from "@/lib/tenant/types";

/**
 * What the notarial record says about one commune, for the home page.
 *
 * The funnel already prices a single address from these sales; this is the same
 * data read the other way round — the commune as a whole, so the figures a
 * visitor sees before typing anything are their market and not a screenshot of
 * someone else's. Every number here comes out of DVF. The one exception is
 * flagged where it is computed.
 */

export type RecentSale = {
  id: string;
  /** ISO date of the deed. */
  date: string;
  /** "12 RUE DU CHATEAU", as the record spells it. */
  street: string;
  surface: number;
  pricePerSqm: number;
  type: Sale["type"];
  lat: number;
  lon: number;
};

export type MarketSummary = {
  /** Median €/m² over the most recent published year, built property only. */
  pricePerSqm: number;
  /** The interquartile band — where the middle half of the commune trades. */
  low: number;
  high: number;
  /** One median per published year, oldest first. At least two, or there is no curve. */
  history: { year: number; pricePerSqm: number }[];
  /** A real street from a recent sale, to head the panel. */
  street: string | null;
  /** The most recent sales, for the rail. */
  recent: RecentSale[];
  /** How many sales the medians rest on. */
  sampleSize: number;
};

/** Sales of a built property — a bare plot's €/m² is a different unit entirely. */
function built(sales: Sale[]): Sale[] {
  return sales.filter((sale) => sale.type !== "land");
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return lower === upper
    ? sorted[lower]
    : sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

const BAN_URL = "https://api-adresse.data.gouv.fr/search/";

/**
 * The INSEE code of the commune this landing targets.
 *
 * DVF is filed by INSEE code, but nobody onboarding a client knows one by
 * heart, and a mistyped code is the worst kind of error: it silently prices the
 * wrong town. So the name is enough — the Base Adresse Nationale resolves it,
 * with the postcode as a tie-breaker for the several dozen French communes that
 * share a name.
 *
 * Setting `insee` explicitly still wins, which is the escape hatch for a name
 * the BAN reads differently than intended.
 */
const communeCode = cache(async (city: City): Promise<string | null> => {
  const explicit = city.insee?.trim();
  if (explicit) return explicit;
  // The generic landing's "votre commune" is not a place; asking the BAN would
  // return whatever it matches loosest, which is how a national page ends up
  // quoting one random town's prices.
  if (!city.slug || !city.name.trim()) return null;

  const params = new URLSearchParams({ q: city.name, type: "municipality", limit: "1" });
  if (city.postcode?.trim()) params.set("postcode", city.postcode.trim());

  try {
    const response = await fetch(`${BAN_URL}?${params}`, {
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`BAN responded ${response.status}`);

    const data = (await response.json()) as {
      features?: { properties?: { citycode?: string; city?: string } }[];
    };
    const found = data.features?.[0]?.properties;
    if (!found?.citycode) {
      console.warn(`[market] "${city.name}" not found in the BAN — set insee on this city`);
      return null;
    }
    return found.citycode;
  } catch (error) {
    console.error(`[market] could not resolve "${city.name}"`, error);
    return null;
  }
});

/** Below this a median says more about the sample than about the commune. */
const MIN_SAMPLE = 12;
/** Enough points to draw a line rather than a segment. */
const MIN_YEARS = 2;
/** How many sales the rail shows. */
const RECENT_COUNT = 6;

/**
 * Memoised per request: the rail and the price panel both want this, and they
 * are two separate Suspense boundaries, so without it the page would compute
 * the same medians twice.
 */
export const communeMarket = cache(async (city: City): Promise<MarketSummary | null> => {
  const citycode = await communeCode(city);
  // No commune at all — the generic page — or one whose deeds are in the livre
  // foncier rather than in DVF.
  if (!citycode || !isPublished(citycode)) return null;

  let sales: Sale[];
  try {
    sales = built(await communeSales(citycode, MARKET_YEARS));
  } catch (error) {
    console.error(`[market] ${citycode}: sales unavailable`, error);
    return null;
  }

  if (sales.length < MIN_SAMPLE) return null;

  const byYear = new Map<number, number[]>();
  for (const sale of sales) {
    const year = Number(sale.date.slice(0, 4));
    if (!Number.isFinite(year)) continue;
    const bucket = byYear.get(year);
    if (bucket) bucket.push(sale.pricePerSqm);
    else byYear.set(year, [sale.pricePerSqm]);
  }

  const history = [...byYear.entries()]
    .filter(([, prices]) => prices.length >= MIN_SAMPLE)
    .sort(([a], [b]) => a - b)
    .map(([year, prices]) => ({ year, pricePerSqm: Math.round(median(prices)) }));

  if (history.length < MIN_YEARS) return null;

  // The headline price is the most recent full year, not the whole window: a
  // median across five years is a number the commune has not traded at for a
  // while.
  const latest = history[history.length - 1].year;
  const latestPrices = sales
    .filter((sale) => Number(sale.date.slice(0, 4)) === latest)
    .map((sale) => sale.pricePerSqm);

  const recent = [...sales]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((sale) => sale.street.trim() !== "")
    // One card per street, so the rail is not six sales in the same building.
    .filter(
      (sale, index, all) =>
        all.findIndex((other) => other.street === sale.street) === index,
    )
    .slice(0, RECENT_COUNT)
    .map(
      (sale, index): RecentSale => ({
        id: `${sale.date}-${index}`,
        date: sale.date,
        street: sale.street,
        surface: Math.round(sale.surface),
        pricePerSqm: Math.round(sale.pricePerSqm),
        type: sale.type,
        lat: sale.lat,
        lon: sale.lon,
      }),
    );

  return {
    pricePerSqm: Math.round(median(latestPrices)),
    low: Math.round(quantile(latestPrices, 0.25)),
    high: Math.round(quantile(latestPrices, 0.75)),
    history,
    street: recent[0]?.street ?? null,
    recent,
    sampleSize: sales.length,
  };
});
