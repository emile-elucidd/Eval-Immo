"use client";

import { MapPin } from "lucide-react";

import { MapFrame } from "@/components/map-frame";
import type { Address } from "@/lib/estimation";

/**
 * The map on the address confirmation step.
 *
 * Seeing the pin land on the right building is what makes a visitor trust the
 * rest of the funnel, so the map is the step rather than an ornament on it.
 * The frame itself is shared with the recent-estimations cards — see
 * `MapFrame` for the Google / OpenStreetMap fallback.
 */

const ZOOM = 18;

export function AddressMap({ address }: { address: Address }) {
  return (
    <div className="w-full overflow-hidden rounded-md border border-border bg-muted">
      <MapFrame
        point={{ lat: address.lat, lon: address.lon, label: address.label }}
        zoom={ZOOM}
        widthPx={520}
        heightPx={290}
        className="aspect-[16/10] w-full sm:aspect-[16/9]"
      />

      <p className="flex items-center gap-2 border-t border-border bg-card px-4 py-3 text-sm text-foreground">
        <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span className="font-medium">{address.label}</span>
      </p>
    </div>
  );
}
