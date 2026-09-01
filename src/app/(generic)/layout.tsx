import type { Metadata } from "next";

import { LandingProvider } from "@/lib/tenant/context";
import { GENERIC_LANDING } from "@/lib/tenant/generic";
import { toPublicLanding } from "@/lib/tenant/landing";

/**
 * The apex domain's pages — the landing that belongs to no client.
 *
 * A route group, so the URLs stay at the root (`/`, `/estimation`, `/mentions`)
 * and never show the group's name. It mirrors `[agence]/[ville]/layout.tsx`
 * exactly: resolve a landing, publish it to the Client Components below. The
 * only difference is that this one is a constant rather than a lookup.
 */

const { agency, city } = GENERIC_LANDING;

export const metadata: Metadata = {
  title: {
    default: `Estimation immobilière dans votre commune | ${agency.name}`,
    template: `%s | ${agency.name}`,
  },
  description:
    "Estimation immobilière gratuite dans votre commune, calculée sur les ventes réelles enregistrées par les notaires. Résultat en 2 minutes.",
  keywords: [
    "estimation immobilière",
    "estimation immobilière gratuite",
    "prix au m2",
    "estimation appartement",
    "estimation maison",
    "prix immobilier commune",
  ],
  robots: "index, follow",
  openGraph: {
    title: `Estimation immobilière dans votre commune | ${agency.name}`,
    description: "Le prix de votre bien, à partir des ventes notariales.",
    type: "website",
    locale: "fr_FR",
    siteName: agency.name,
    images: city.coverImage.startsWith("http") ? [city.coverImage] : undefined,
  },
};

export default function GenericLayout({ children }: { children: React.ReactNode }) {
  return (
    <LandingProvider landing={toPublicLanding(GENERIC_LANDING)}>{children}</LandingProvider>
  );
}
