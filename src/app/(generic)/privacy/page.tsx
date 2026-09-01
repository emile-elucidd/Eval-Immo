import { PageShell } from "@/components/page-shell";
import { LegalDoc } from "@/components/legal";
import { legalUpdatedOn, privacyPolicy } from "@/content/legal";
import { GENERIC_LANDING } from "@/lib/tenant/generic";

export const metadata = { title: "Confidentialité" };

export default function PrivacyPage() {
  return (
    <PageShell title="Politique de confidentialité" landing={GENERIC_LANDING}>
      <LegalDoc
        updatedOn={legalUpdatedOn(GENERIC_LANDING)}
        sections={privacyPolicy(GENERIC_LANDING)}
      />
    </PageShell>
  );
}
