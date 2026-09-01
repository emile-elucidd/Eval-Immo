import type { Metadata } from "next";

import { LandingProvider } from "@/lib/tenant/context";
import { inCity } from "@/lib/tenant/format";
import { requireLanding, resolveLanding, toPublicLanding } from "@/lib/tenant/landing";
import type { LandingParams } from "@/lib/tenant/landing";

/**
 * The boundary every page of a client landing sits inside.
 *
 * It resolves the agency and the commune once — 404 if either is unknown — and
 * publishes the sanitised half of the result to the Client Components below,
 * which is how the navbar and the funnel know whose site they are rendering
 * without a prop crossing twenty files.
 */

type Props = { params: Promise<LandingParams>; children: React.ReactNode };

export async function generateMetadata({
  params,
}: {
  params: Promise<LandingParams>;
}): Promise<Metadata> {
  const landing = await resolveLanding(await params);
  if (!landing) return { title: "Page introuvable" };

  const { agency, city } = landing;
  const where = inCity(city);

  return {
    title: {
      default: `Estimation immobilière ${where} | ${agency.name}`,
      template: `%s | ${agency.name}`,
    },
    description: `Estimation immobilière gratuite ${where}, calculée sur les ventes réelles enregistrées par les notaires. ${agency.name} affine votre prix sur place.`,
    keywords: [
      `estimation immobilière ${city.name}`,
      `prix m2 ${city.name}`,
      `estimation appartement ${city.name}`,
      `estimation maison ${city.name}`,
      agency.name,
    ],
    robots: "index, follow",
    openGraph: {
      title: `Estimation immobilière ${where} | ${agency.name}`,
      description: `Le prix de votre bien ${where}, à partir des ventes notariales.`,
      type: "website",
      locale: "fr_FR",
      siteName: agency.name,
      images: city.coverImage.startsWith("http") ? [city.coverImage] : undefined,
    },
  };
}

export default async function LandingLayout({ params, children }: Props) {
  const landing = await requireLanding(await params);
  return <LandingProvider landing={toPublicLanding(landing)}>{children}</LandingProvider>;
}
