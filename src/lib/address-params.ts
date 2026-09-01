import type { Address } from "@/lib/estimation";

/**
 * How a geocoded address travels from the home page banner to the funnel.
 *
 * The visitor picks an address once; carrying the coordinates in the URL rather
 * than re-geocoding on arrival means the next screen can open straight on the
 * map, and a shared link reopens on the same address.
 */

export type AddressParams = Partial<Record<"adresse" | "voie" | "ville" | "cp" | "insee" | "lat" | "lon", string>>;

export function toAddressQuery(address: Address) {
  return new URLSearchParams({
    adresse: address.label,
    voie: address.street,
    ville: address.city,
    cp: address.postcode,
    insee: address.citycode,
    lat: String(address.lat),
    lon: String(address.lon),
  }).toString();
}

/** Returns the address only when every part the model needs made it through. */
export function fromAddressQuery(params: AddressParams): Address | null {
  const lat = Number(params.lat);
  const lon = Number(params.lon);
  if (!params.adresse || !params.insee || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    label: params.adresse,
    street: params.voie ?? "",
    city: params.ville ?? "",
    postcode: params.cp ?? "",
    citycode: params.insee,
    lat,
    lon,
  };
}
