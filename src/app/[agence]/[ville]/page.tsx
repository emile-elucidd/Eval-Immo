import { LandingPage } from "@/components/landing-page";
import { requireLanding, type LandingParams } from "@/lib/tenant/landing";

export default async function Home({ params }: { params: Promise<LandingParams> }) {
  return <LandingPage landing={await requireLanding(await params)} />;
}
