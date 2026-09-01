/**
 * The pricing model.
 *
 * Everything here is pure: it takes the answers collected by the funnel plus a
 * batch of real notarial sales (see `@/lib/dvf`) and returns a price. Keeping
 * it free of I/O means the model can be reasoned about — and corrected — on its
 * own, and that the API route stays a thin shell around it.
 *
 * The method mirrors how an agent prices a flat by hand: take the sales that
 * actually settled around the address, re-price the older ones at today's
 * market, weigh them by how close and how comparable they are, then adjust for
 * what makes this particular property differ from that sample.
 */

export type PropertyType = "apartment" | "house" | "field";
export type Condition = "poor" | "standard" | "excellent";
export type Annex = "elevator" | "parking" | "exterior" | "garage" | "pool" | "seaView";
export type Project = "LESS_THREE_MONTHS" | "MORE_THREE_MONTHS" | "ON_SALE" | "NON_SELLER";

export type Address = {
  label: string;
  street: string;
  city: string;
  postcode: string;
  citycode: string;
  lat: number;
  lon: number;
};

export type Property = {
  type: PropertyType;
  /** Living area in m². For a plot, the plot area. */
  surface: number;
  /** Apartments only. 0 is the ground floor. */
  floor?: number;
  isLastFloor?: boolean;
  /** Houses only: land area in m². */
  fieldSurface?: number;
  /** Plots only: already connected to water/power/sewer/road. */
  isServiced?: boolean;
  condition: Condition;
  annexes: Annex[];
};

export type EstimationInput = {
  address: Address;
  property: Property;
  owner: boolean;
  project: Project;
};

/** One settled sale, as extracted from the DVF open data. */
export type Sale = {
  date: string;
  lat: number;
  lon: number;
  /** Built area in m², or plot area for a land sale. */
  surface: number;
  value: number;
  pricePerSqm: number;
  type: "apartment" | "house" | "land";
  street: string;
  rooms: number;
  /** Land area sold with the property, in m². */
  terrain: number;
};

export type Dataset = { sales: Sale[] };

/** A sale shown back to the user under "Transactions récentes". */
export type Comparable = {
  date: string;
  /** Metres between this sale and the estimated property. */
  distance: number;
  surface: number;
  price: number;
  pricePerSqm: number;
  street: string;
};

export type Adjustment = { label: string; value: number };

export type EstimationResult = {
  /** Market value — what the property is worth today, agency fees included. */
  marketPrice: number;
  /** What the seller actually pockets, once the agency fee is taken out. */
  netPrice: number;
  /** The ceiling a buyer who falls for the property may accept. */
  heartPrice: number;
  low: number;
  high: number;
  pricePerSqm: number;
  /** How wide the bracket is, as a share of the market price. */
  spread: number;
  confidence: "high" | "medium" | "low";
  /** Sales the estimate was built on. */
  sampleSize: number;
  /** Radius in metres those sales were drawn from. */
  radius: number;
  /** Local €/m² before the property's own characteristics are applied. */
  basePricePerSqm: number;
  /**
   * "comparables" when the price comes from sales of the same kind of property,
   * "derived" when none were on record and it had to be inferred from the local
   * built market — a plot in a town where no bare land changed hands.
   */
  method: "comparables" | "derived";
  adjustments: Adjustment[];
  comparables: Comparable[];
};

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in metres. */
export function distance(aLat: number, aLon: number, bLat: number, bLon: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function quantile(sorted: number[], q: number) {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/**
 * Median of `values` under `weights`. A median rather than a mean because a
 * single atypical sale — a bare-shell flat, a family transfer priced low — must
 * not drag the whole address with it.
 */
function weightedMedian(values: number[], weights: number[]) {
  const pairs = values
    .map((value, i) => ({ value, weight: weights[i] }))
    .sort((a, b) => a.value - b.value);
  const total = pairs.reduce((sum, p) => sum + p.weight, 0);
  if (total === 0) return 0;
  let running = 0;
  for (const pair of pairs) {
    running += pair.weight;
    if (running >= total / 2) return pair.value;
  }
  return pairs[pairs.length - 1].value;
}

/** Rounded the way a price is announced, not the way a computer stores it. */
function roundPrice(value: number) {
  const step = value >= 1_000_000 ? 10_000 : value >= 300_000 ? 5_000 : 1_000;
  return Math.round(value / step) * step;
}

/**
 * Yearly median €/m² for one property kind, normalised so the most recent year
 * is 1. A sale from 2022 is then re-priced at today's market before it is
 * compared to anything. Years with too few sales to have a stable median are
 * left at 1 rather than inventing a trend.
 */
function yearIndex(sales: Sale[]) {
  const byYear = new Map<string, number[]>();
  for (const sale of sales) {
    const year = sale.date.slice(0, 4);
    const bucket = byYear.get(year);
    if (bucket) bucket.push(sale.pricePerSqm);
    else byYear.set(year, [sale.pricePerSqm]);
  }

  const medians = new Map<string, number>();
  for (const [year, prices] of byYear) {
    if (prices.length < 20) continue;
    medians.set(year, quantile([...prices].sort((a, b) => a - b), 0.5));
  }

  const years = [...medians.keys()].sort();
  const latest = years.at(-1);
  if (!latest) return new Map<string, number>();

  const reference = medians.get(latest)!;
  const index = new Map<string, number>();
  for (const [year, median] of medians) {
    // A cap, because a thin year can otherwise swing the whole sample.
    index.set(year, clamp(reference / median, 0.8, 1.25));
  }
  return index;
}

/** Radii tried in turn until the sample is large enough to be meaningful. */
const RADII = [250, 500, 1_000, 2_000, 5_000];
const TARGET_SAMPLE = 25;
const MIN_SAMPLE = 8;
const MAX_SAMPLE = 60;

type Selection = { sales: (Sale & { distance: number })[]; radius: number };

function selectComparables(
  sales: Sale[],
  kind: Sale["type"],
  address: Address,
): Selection | null {
  const candidates = sales
    .filter((sale) => sale.type === kind)
    .map((sale) => ({ ...sale, distance: distance(address.lat, address.lon, sale.lat, sale.lon) }))
    .sort((a, b) => a.distance - b.distance);

  for (const radius of RADII) {
    const within = candidates.filter((sale) => sale.distance <= radius);
    if (within.length >= TARGET_SAMPLE) return { sales: within.slice(0, MAX_SAMPLE), radius };
  }

  // Nothing dense enough: fall back to the whole commune, if it holds enough.
  if (candidates.length >= MIN_SAMPLE) {
    const kept = candidates.slice(0, MAX_SAMPLE);
    return { sales: kept, radius: Math.round(kept.at(-1)!.distance) };
  }
  return null;
}

/**
 * How much a sale counts: a flat sold across the street matters more than one
 * a kilometre away, and one of roughly the same size more than a studio when
 * pricing a family flat.
 */
function weightFor(sale: Sale & { distance: number }, surface: number) {
  const byDistance = 1 / (1 + (sale.distance / 200) ** 2);
  const bySurface = 1 / (1 + ((sale.surface - surface) / Math.max(surface, 25)) ** 2);
  return byDistance * bySurface;
}

/** Ground floor is penalised, height is paid for — up to a point. */
function floorFactor(property: Property) {
  if (property.type !== "apartment") return 1;
  const floor = property.floor ?? 2;
  const hasElevator = property.annexes.includes("elevator");

  let factor = 1;
  if (floor === 0) factor *= 0.95;
  else if (floor === 1) factor *= 0.99;
  else factor *= 1 + Math.min(0.08, (floor - 2) * 0.008);

  if (property.isLastFloor) factor *= 1.03;
  // Above the third floor a walk-up is a real handicap on resale.
  if (!hasElevator && floor >= 3) factor *= 0.96;
  return factor;
}

const CONDITION_FACTOR: Record<Condition, number> = {
  poor: 0.92,
  standard: 1,
  excellent: 1.07,
};

const ANNEX_FACTOR: Record<Annex, number> = {
  elevator: 1.02,
  parking: 1.03,
  exterior: 1.04,
  garage: 1.03,
  pool: 1.05,
  seaView: 1.08,
};

/** Land beyond what the neighbourhood usually comes with adds value, slowly. */
function landFactor(property: Property, medianTerrain: number) {
  if (property.type !== "house") return 1;
  const terrain = property.fieldSurface;
  if (!terrain || !medianTerrain) return 1;
  return clamp((terrain / medianTerrain) ** 0.12, 0.92, 1.15);
}

/**
 * €/m² falls as a property gets bigger. The comparable weighting already leans
 * on similar sizes, so this only corrects the residual gap between the target
 * and the sample it was priced from.
 */
function surfaceFactor(surface: number, sampleSurface: number) {
  if (!sampleSurface) return 1;
  return clamp((sampleSurface / surface) ** 0.1, 0.92, 1.1);
}

export class NoDataError extends Error {}

/**
 * Price a property from the sales around it.
 *
 * @param dataset every usable sale of the commune, most recent years first.
 */
export function estimate(input: EstimationInput, dataset: Dataset): EstimationResult {
  const { address, property } = input;
  const kind: Sale["type"] =
    property.type === "apartment" ? "apartment" : property.type === "house" ? "house" : "land";

  const selection =
    selectComparables(dataset.sales, kind, address) ??
    // Too few plots or houses traded nearby: price off the built market instead
    // and let the plot ratio below bring it back to land value.
    (kind === "land" ? selectComparables(dataset.sales, "apartment", address) : null);

  if (!selection) throw new NoDataError("no comparable sales around this address");

  const usingProxy = kind === "land" && selection.sales[0]?.type !== "land";
  const index = yearIndex(dataset.sales.filter((sale) => sale.type === selection.sales[0].type));

  const priced = trimOutliers(
    selection.sales.map((sale) => ({
      sale,
      pricePerSqm: sale.pricePerSqm * (index.get(sale.date.slice(0, 4)) ?? 1),
      weight: weightFor(sale, property.surface),
    })),
  );

  const adjusted = priced.map((entry) => entry.pricePerSqm);
  const weights = priced.map((entry) => entry.weight);

  let basePricePerSqm = weightedMedian(adjusted, weights);
  // Plots priced off flats: built land trades at a fraction of finished floor.
  if (usingProxy) basePricePerSqm *= 0.3;

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const sampleSurface =
    totalWeight === 0
      ? 0
      : priced.reduce((sum, entry) => sum + entry.sale.surface * entry.weight, 0) / totalWeight;

  const adjustments: Adjustment[] = [];
  let factor = 1;

  const apply = (label: string, value: number) => {
    if (Math.abs(value - 1) < 0.0005) return;
    adjustments.push({ label, value });
    factor *= value;
  };

  if (property.type === "field") {
    apply("Terrain viabilisé", property.isServiced ? 1 : 0.82);
  } else {
    apply("Surface", surfaceFactor(property.surface, sampleSurface));
    apply(
      property.type === "apartment" ? "Étage" : "Terrain",
      property.type === "apartment"
        ? floorFactor(property)
        : landFactor(property, medianTerrainOf(selection.sales)),
    );
    apply("État général", CONDITION_FACTOR[property.condition]);
    for (const annex of property.annexes) {
      apply(ANNEX_LABEL[annex], ANNEX_FACTOR[annex]);
    }
  }

  const pricePerSqm = basePricePerSqm * factor;
  const marketPrice = pricePerSqm * property.surface;

  // How much the neighbourhood itself disagrees, widened when the sample is thin.
  const sorted = [...adjusted].sort((a, b) => a - b);
  const median = quantile(sorted, 0.5) || 1;
  const dispersion = (quantile(sorted, 0.75) - quantile(sorted, 0.25)) / (2 * median);
  const thinness = Math.max(0, TARGET_SAMPLE - priced.length) * 0.003;
  const spread = clamp(dispersion + thinness + (usingProxy ? 0.05 : 0), 0.05, 0.15);

  const confidence: EstimationResult["confidence"] =
    usingProxy || priced.length < 12 || spread > 0.12
      ? "low"
      : priced.length >= TARGET_SAMPLE && selection.radius <= 500 && spread <= 0.09
        ? "high"
        : "medium";

  return {
    marketPrice: roundPrice(marketPrice),
    netPrice: roundPrice(marketPrice / 1.05),
    heartPrice: roundPrice(marketPrice * 1.08),
    low: roundPrice(marketPrice * (1 - spread)),
    high: roundPrice(marketPrice * (1 + spread)),
    pricePerSqm: Math.round(pricePerSqm),
    spread,
    confidence,
    sampleSize: priced.length,
    radius: selection.radius,
    basePricePerSqm: Math.round(basePricePerSqm),
    method: usingProxy ? "derived" : "comparables",
    adjustments,
    // Flats are not comparable to a plot: showing them would undercut the number
    // rather than back it up.
    comparables: usingProxy ? [] : pickShowcase(priced),
  };
}

const ANNEX_LABEL: Record<Annex, string> = {
  elevator: "Ascenseur",
  parking: "Parking",
  exterior: "Espace extérieur",
  garage: "Garage",
  pool: "Piscine",
  seaView: "Vue mer",
};

/** Typical plot size a house comes with around here — the yardstick for "big garden". */
type Priced = { sale: Sale & { distance: number }; pricePerSqm: number; weight: number };

/**
 * Drop the sales that cannot be a market price for this street: a bare-shell
 * flat, a transfer between relatives, a lot sold with something not declared.
 * Tukey's fence rather than a fixed band, so it adapts to how spread out the
 * neighbourhood genuinely is — and it never trims the sample below what is
 * needed to still have an opinion.
 */
function trimOutliers(entries: Priced[]): Priced[] {
  if (entries.length < 8) return entries;

  const sorted = entries.map((entry) => entry.pricePerSqm).sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const fence = 1.5 * (q3 - q1);

  const kept = entries.filter(
    (entry) => entry.pricePerSqm >= q1 - fence && entry.pricePerSqm <= q3 + fence,
  );
  return kept.length >= MIN_SAMPLE ? kept : entries;
}

function medianTerrainOf(sales: (Sale & { distance: number })[]) {
  const values = sales
    .map((sale) => sale.terrain)
    .filter((terrain) => terrain > 0)
    .sort((a, b) => a - b);
  return values.length >= 5 ? quantile(values, 0.5) : 0;
}

/**
 * The three sales the estimate actually leaned on hardest — closest, and
 * closest in size. Showing the most *recent* ones instead would put a 12 m²
 * studio in front of someone selling a family flat, which reads as sloppy
 * rather than transparent.
 */
function pickShowcase(entries: Priced[]): Comparable[] {
  return [...entries]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .sort((a, b) => b.sale.date.localeCompare(a.sale.date))
    .map(({ sale }) => ({
      date: sale.date,
      distance: Math.round(sale.distance),
      surface: Math.round(sale.surface),
      price: Math.round(sale.value),
      pricePerSqm: Math.round(sale.pricePerSqm),
      street: sale.street,
    }));
}
