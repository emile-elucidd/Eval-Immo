import { redirect } from "next/navigation";

import { defaultCityOf, landingBasePath } from "@/lib/tenant/landing";

/**
 * `agence.exemple.fr` with nothing after it.
 *
 * An agency has no page of its own — a landing is always an agency *and* a
 * commune — so this sends the visitor to the first commune on file, which is
 * the one the registry treats as the agency's home town. An agency nobody knows
 * falls back to the generic landing, like every other broken link.
 */
export default async function AgencyRoot({ params }: { params: Promise<{ agence: string }> }) {
  const { agence } = await params;

  const ville = await defaultCityOf(agence);
  if (!ville) redirect("/");

  redirect(await landingBasePath(agence, ville));
}
