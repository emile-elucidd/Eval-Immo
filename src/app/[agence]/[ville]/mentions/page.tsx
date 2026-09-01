import { PageShell } from "@/components/page-shell";
import { LegalDoc } from "@/components/legal";
import { legalNotice, legalUpdatedOn } from "@/content/legal";
import { requireLanding, type LandingParams } from "@/lib/tenant/landing";

export const metadata = { title: "Mentions légales" };

export default async function MentionsPage({ params }: { params: Promise<LandingParams> }) {
  const landing = await requireLanding(await params);

  return (
    <PageShell title="Mentions légales" landing={landing}>
      <LegalDoc updatedOn={legalUpdatedOn(landing)} sections={legalNotice(landing)} />
    </PageShell>
  );
}
