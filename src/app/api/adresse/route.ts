import { NextResponse } from "next/server";

import { distance } from "@/lib/estimation";

/**
 * Address autocomplete, proxied from the Base Adresse Nationale.
 *
 * The search covers the whole country — someone estimating a flat in Nantes
 * must find it — but it is *biased* towards the commune named by the `ville`
 * parameter, which the caller takes from the landing it is on: given those
 * coordinates the BAN blends relevance with proximity, so a bare "12 rue de la
 * Paix" offers the one down the road first while a query naming another town
 * still lands on it.
 *
 * The town arrives as a query parameter rather than being read from the URL
 * because `next/root-params` and the landing helpers are unavailable in Route
 * Handlers. Nothing is trusted from it beyond a geocoding lookup.
 */

const BAN_URL = "https://api-adresse.data.gouv.fr/search/";

export type Suggestion = {
  label: string;
  street: string;
  city: string;
  postcode: string;
  citycode: string;
  lat: number;
  lon: number;
  /** A "housenumber" hit is precise enough to price; a street or a town is not. */
  precise: boolean;
  /** Metres from the centre of the landing's commune, for ordering only. */
  distance: number;
};

type BanFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    label: string;
    name: string;
    street?: string;
    city: string;
    postcode: string;
    citycode: string;
    type: string;
  };
};

/**
 * Where each commune actually is, resolved against the BAN itself and kept for
 * the life of the instance. One entry per town served, which is one per landing
 * — a handful, not a cache that needs eviction.
 */
const centres = new Map<string, Promise<{ lat: number; lon: number } | null>>();

function cityCentre(city: string) {
  const key = city.toLowerCase();
  let centre = centres.get(key);
  if (!centre) {
    centre = (async () => {
      try {
        const response = await fetch(
          `${BAN_URL}?q=${encodeURIComponent(city)}&type=municipality&limit=1`,
          { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(5_000) },
        );
        if (!response.ok) return null;
        const data = (await response.json()) as { features: BanFeature[] };
        const [lon, lat] = data.features[0]?.geometry.coordinates ?? [];
        return lat && lon ? { lat, lon } : null;
      } catch {
        return null;
      }
    })();
    centres.set(key, centre);
  }
  return centre;
}

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const query = search.get("q")?.trim() ?? "";
  if (query.length < 3) return NextResponse.json({ suggestions: [] satisfies Suggestion[] });

  // Bounded on purpose: this string only ever reaches the BAN as a town name.
  const city = search.get("ville")?.trim().slice(0, 80);
  const from = city ? await cityCentre(city) : null;
  const params = new URLSearchParams({ q: query, limit: "8" });
  if (from) {
    // Proximity is a ranking hint here, never a filter: the BAN still returns
    // the best match nationally when the query points elsewhere.
    params.set("lat", String(from.lat));
    params.set("lon", String(from.lon));
  }

  let data: { features: BanFeature[] };
  try {
    const response = await fetch(`${BAN_URL}?${params}`, {
      next: { revalidate: 3_600 },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`BAN responded ${response.status}`);
    data = await response.json();
  } catch (error) {
    console.error("[adresse] lookup failed", error);
    return NextResponse.json({ suggestions: [] satisfies Suggestion[] }, { status: 502 });
  }

  const suggestions = data.features
    .map((feature): Suggestion => {
      const [lon, lat] = feature.geometry.coordinates;
      const { properties } = feature;
      return {
        label: properties.label,
        street: properties.street ?? properties.name,
        city: properties.city,
        postcode: properties.postcode,
        citycode: properties.citycode,
        lat,
        lon,
        precise: properties.type === "housenumber",
        distance: from ? Math.round(distance(from.lat, from.lon, lat, lon)) : 0,
      };
    })
    // A full street number ahead of a bare street; the BAN's own ranking otherwise.
    .sort((a, b) => Number(b.precise) - Number(a.precise))
    .slice(0, 6);

  return NextResponse.json({ suggestions });
}
