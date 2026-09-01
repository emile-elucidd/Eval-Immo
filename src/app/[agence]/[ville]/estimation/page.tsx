import { Funnel } from "@/components/estimation/funnel";
import { fromAddressQuery, type AddressParams } from "@/lib/address-params";
import { inCity } from "@/lib/tenant/format";
import { requireLanding, type LandingParams } from "@/lib/tenant/landing";

export async function generateMetadata({ params }: { params: Promise<LandingParams> }) {
  const { city } = await requireLanding(await params);
  return {
    title: "Estimation en ligne",
    description: `Estimez votre bien ${inCity(city)} en 1 minute à partir des ventes réelles enregistrées chez le notaire.`,
  };
}

/**
 * The funnel has no chrome: no navbar, no footer, nothing to click on but the
 * question in front of you. An address picked on the home page arrives fully
 * geocoded and opens on the map; free text arrives as a prefilled search.
 *
 * The agency it belongs to comes from the layout's context rather than a prop —
 * `Funnel` is a Client Component and the value is needed several levels down.
 */
export default async function EstimationPage({
  searchParams,
}: {
  params: Promise<LandingParams>;
  searchParams: Promise<AddressParams>;
}) {
  const params = await searchParams;

  return (
    <Funnel initialAddress={fromAddressQuery(params)} initialQuery={params.adresse ?? ""} />
  );
}
