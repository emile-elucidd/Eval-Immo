import { LandingPage } from "@/components/landing-page";
import { GENERIC_LANDING } from "@/lib/tenant/generic";

/**
 * The apex domain: the same estimate, offered "dans votre commune".
 *
 * It is a real lead capture, not a holding page — the funnel behind it prices
 * any address in France — and it is where every broken link ends up, so a
 * mistyped agency or commune still meets a working offer.
 */
export default function Home() {
  return <LandingPage landing={GENERIC_LANDING} />;
}
