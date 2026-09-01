import { PageShell } from "@/components/page-shell";
import { LegalDoc } from "@/components/legal";
import { legalUpdatedOn, privacyPolicy } from "@/content/legal";
import { requireLanding, type LandingParams } from "@/lib/tenant/landing";

export const metadata = { title: "Confidentialité" };

export default async function PrivacyPage({ params }: { params: Promise<LandingParams> }) {
  const landing = await requireLanding(await params);

  return (
    <PageShell title="Politique de confidentialité" landing={landing}>
      <LegalDoc updatedOn={legalUpdatedOn(landing)} sections={privacyPolicy(landing)} />
    </PageShell>
  );
}
