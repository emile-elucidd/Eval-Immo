import "server-only";

import type { Sale } from "@/lib/estimation";

/**
 * Real settled sales, straight from the notarial record.
 *
 * Etalab publishes "Demandes de valeurs foncières" — every property transfer
 * registered in France — geocoded and split per commune. That is the same
 * source a professional valuation rests on, and the reason the estimate can
 * quote prices that were actually paid rather than prices that were asked.
 *
 * One CSV per commune per year, a few hundred kilobytes each. We pull the last
 * few years for the commune the address falls in, and keep the parsed result
 * around: the file only changes twice a year.
 */

const BASE_URL = "https://files.data.gouv.fr/geo-dvf/latest/csv";

/**
 * Alsace-Moselle and Mayotte keep their own land registry ("livre foncier"),
 * and their transfers are absent from DVF. No amount of retrying will find a
 * sale there, so the funnel says so rather than pretending the address is odd.
 */
const OUTSIDE_DVF = ["57", "67", "68", "976"];

export function isPublished(citycode: string) {
  return !OUTSIDE_DVF.includes(departmentOf(citycode));
}

/**
 * Years pulled per commune when pricing a property. Four is enough to weight
 * recent sales heavily without dragging in a different market.
 */
const YEARS = 4;

/**
 * How far back to look for the market curve on the home page. A ceiling, not a
 * promise: the panel labels whichever years actually came back.
 */
export const MARKET_YEARS = 6;

/**
 * The oldest year `geo-dvf/latest` serves.
 *
 * Asking for anything before it is not a cheap 404: the host answers 302 and
 * the redirect never resolves, so the request holds a connection until it times
 * out. Six of those in parallel starve the years that *are* published — which
 * is how a commune with five years on file ended up drawing three. Raise it
 * when Etalab republishes further back.
 */
const FIRST_YEAR = 2021;

/** How long a parsed commune stays in memory before it is fetched again. */
const MEMORY_TTL_MS = 60 * 60 * 1000;

/** Sales outside this €/m² band are data errors or non-market transfers. */
const MIN_PRICE_SQM = 800;
const MAX_PRICE_SQM = 40_000;

type Cached = { expires: number; sales: Sale[] };
const memory = new Map<string, Promise<Cached>>();

/**
 * The department folder in the DVF tree. Overseas codes are three digits long,
 * Corsica keeps its letter — everywhere else it is the first two characters.
 */
function departmentOf(citycode: string) {
  return citycode.startsWith("97") || citycode.startsWith("98")
    ? citycode.slice(0, 3)
    : citycode.slice(0, 2);
}

/** RFC 4180 enough for DVF: quoted fields, doubled quotes, no embedded newlines we care about. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") field += char;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * A mutation under construction. DVF spreads one sale over several lines — one
 * per lot, per outbuilding, per parcel — so the lines have to be folded back
 * together before a price per m² means anything.
 */
type Mutation = {
  date: string;
  value: number;
  kinds: Set<string>;
  surface: number;
  terrain: number;
  rooms: number;
  lat: number;
  lon: number;
  street: string;
};

function foldMutations(rows: string[][], into: Map<string, Mutation>) {
  const [header, ...body] = rows;
  if (!header) return;
  const at = Object.fromEntries(header.map((name, i) => [name, i]));

  for (const row of body) {
    if (row.length < header.length) continue;
    const get = (name: string) => row[at[name]] ?? "";
    if (get("nature_mutation") !== "Vente") continue;

    const id = get("id_mutation");
    let mutation = into.get(id);
    if (!mutation) {
      mutation = {
        date: get("date_mutation"),
        value: Number(get("valeur_fonciere")) || 0,
        kinds: new Set<string>(),
        surface: 0,
        terrain: 0,
        rooms: 0,
        lat: 0,
        lon: 0,
        street: [get("adresse_numero"), get("adresse_nom_voie")].filter(Boolean).join(" "),
      };
      into.set(id, mutation);
    }

    const kind = get("type_local");
    if (kind === "Appartement" || kind === "Maison") {
      mutation.kinds.add(kind);
      mutation.surface += Number(get("surface_reelle_bati")) || 0;
      mutation.rooms = Math.max(mutation.rooms, Number(get("nombre_pieces_principales")) || 0);
    } else if (kind) {
      // A shop or an industrial unit in the same deal: the sale is not comparable.
      mutation.kinds.add("other");
    }

    mutation.terrain += Number(get("surface_terrain")) || 0;
    if (!mutation.lat) {
      mutation.lat = Number(get("latitude")) || 0;
      mutation.lon = Number(get("longitude")) || 0;
    }
  }
}

/**
 * Keep only the mutations that price one thing. A deal bundling a flat with a
 * shop, or three flats at once, has a total that says nothing about a €/m².
 */
function toSales(mutations: Iterable<Mutation>): Sale[] {
  const sales: Sale[] = [];

  for (const mutation of mutations) {
    if (!mutation.lat || !mutation.lon || mutation.value < 5_000) continue;

    const kinds = [...mutation.kinds];
    const built = kinds.length === 1 ? kinds[0] : null;

    if (built === "Appartement" || built === "Maison") {
      if (mutation.surface < 9) continue;
      const pricePerSqm = mutation.value / mutation.surface;
      if (pricePerSqm < MIN_PRICE_SQM || pricePerSqm > MAX_PRICE_SQM) continue;
      sales.push({
        date: mutation.date,
        lat: mutation.lat,
        lon: mutation.lon,
        surface: mutation.surface,
        value: mutation.value,
        pricePerSqm,
        type: built === "Appartement" ? "apartment" : "house",
        street: mutation.street,
        rooms: mutation.rooms,
        terrain: mutation.terrain,
      });
      continue;
    }

    // Nothing built at all: a bare plot, priced on its land area.
    if (kinds.length === 0 && mutation.terrain >= 100) {
      const pricePerSqm = mutation.value / mutation.terrain;
      if (pricePerSqm < 5 || pricePerSqm > 5_000) continue;
      sales.push({
        date: mutation.date,
        lat: mutation.lat,
        lon: mutation.lon,
        surface: mutation.terrain,
        value: mutation.value,
        pricePerSqm,
        type: "land",
        street: mutation.street,
        rooms: 0,
        terrain: mutation.terrain,
      });
    }
  }

  return sales;
}

async function fetchYear(citycode: string, year: number): Promise<string[][] | null> {
  const url = `${BASE_URL}/${year}/communes/${departmentOf(citycode)}/${citycode}.csv`;
  try {
    const response = await fetch(url, {
      // The dataset is republished twice a year; a day-old copy is plenty fresh.
      next: { revalidate: 86_400 },
      // Short enough that one unresponsive year does not hold the others up.
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return null; // The year is not published yet, or the commune had no sale.
    return parseCsv(await response.text());
  } catch {
    return null;
  }
}

async function load(citycode: string, wanted: number): Promise<Cached> {
  // The current year is usually not published yet — asking costs one 404.
  const latest = new Date().getUTCFullYear();
  const years = Array.from({ length: wanted + 1 }, (_, i) => latest - i).filter(
    (year) => year >= FIRST_YEAR,
  );

  const files = await Promise.all(years.map((year) => fetchYear(citycode, year)));
  const published = files.filter((rows): rows is string[][] => rows !== null).slice(0, wanted);

  const mutations = new Map<string, Mutation>();
  for (const rows of published) foldMutations(rows, mutations);

  return { expires: Date.now() + MEMORY_TTL_MS, sales: toSales(mutations.values()) };
}

/**
 * Every usable sale recorded in a commune over the last few years.
 *
 * In-flight requests share one promise, so a burst of estimations on the same
 * town parses the CSVs once rather than once each. `years` is part of the key:
 * the funnel wants a recent window, the market curve on the home page wants the
 * whole published run, and neither should evict the other.
 */
export async function communeSales(citycode: string, years: number = YEARS): Promise<Sale[]> {
  const key = `${citycode}:${years}`;
  const pending = memory.get(key);
  if (pending) {
    const cached = await pending;
    if (cached.expires > Date.now()) return cached.sales;
  }

  const fresh = load(citycode, years);
  memory.set(key, fresh);
  try {
    return (await fresh).sales;
  } catch (error) {
    memory.delete(key);
    throw error;
  }
}
