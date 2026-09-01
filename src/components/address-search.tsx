"use client";

import { useRouter } from "next/navigation";

import { AddressAutocomplete } from "@/components/address-autocomplete";
import { toAddressQuery } from "@/lib/address-params";
import { useLanding, useLandingHref } from "@/lib/tenant/context";
import { cn } from "@/lib/utils";

/**
 * The home page banner. Picking a suggestion hands the funnel a fully geocoded
 * address, so the visitor lands on the map confirmation rather than being asked
 * for the same thing twice; free text still opens the funnel, on step one.
 */
export function AddressSearch({ className }: { className?: string }) {
  const router = useRouter();
  const { city } = useLanding();
  const href = useLandingHref();

  return (
    <section className={cn("w-full", className)}>
      <AddressAutocomplete
        placeholder="Adresse du bien à estimer"
        near={city.name}
        action={{ label: "Estimer en 1 minute" }}
        onSelect={(suggestion) =>
          router.push(`${href("/estimation")}?${toAddressQuery({ ...suggestion })}`)
        }
        onSubmitRaw={(query) =>
          router.push(`${href("/estimation")}?adresse=${encodeURIComponent(query)}`)
        }
      />
    </section>
  );
}
