import { PageShell } from "@/components/page-shell";
import { LegalDoc } from "@/components/legal";
import { legalNotice, legalUpdatedOn } from "@/content/legal";
import { GENERIC_LANDING } from "@/lib/tenant/generic";

export const metadata = { title: "Mentions légales" };

/** The operator's own notice — this page belongs to no client agency. */
export default function MentionsPage() {
  return (
    <PageShell title="Mentions légales" landing={GENERIC_LANDING}>
      <LegalDoc
        updatedOn={legalUpdatedOn(GENERIC_LANDING)}
        sections={legalNotice(GENERIC_LANDING)}
      />
    </PageShell>
  );
}
