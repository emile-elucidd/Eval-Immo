import { Funnel } from "@/components/estimation/funnel";
import { fromAddressQuery, type AddressParams } from "@/lib/address-params";

export const metadata = {
  title: "Estimation en ligne",
  description:
    "Estimez votre bien en 1 minute à partir des ventes réelles enregistrées chez le notaire.",
};

/**
 * The generic funnel — the same one a client's landing runs.
 *
 * It prices any address in France, so a visitor arriving from the apex gets a
 * real estimate; the lead simply has no agency to be attributed to and goes to
 * `LEADS_WEBHOOK_URL`.
 */
export default async function EstimationPage({
  searchParams,
}: {
  searchParams: Promise<AddressParams>;
}) {
  const params = await searchParams;

  return <Funnel initialAddress={fromAddressQuery(params)} initialQuery={params.adresse ?? ""} />;
}
