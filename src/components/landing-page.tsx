import { Suspense } from "react";

import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { FeatureRow } from "@/components/feature-row";
import { Steps } from "@/components/steps";
import { PricePanel } from "@/components/price-panel";
import { LastEstimations } from "@/components/last-estimations";
import { AgencySection } from "@/components/agency-section";
import { AppointmentCta } from "@/components/appointment-cta";
import { SeoContent } from "@/components/seo-content";
import { Faq } from "@/components/faq";
import { SiteFooter } from "@/components/site-footer";
import { communeMarket } from "@/lib/market";
import { landingHref } from "@/lib/tenant/format";
import type { Landing } from "@/lib/tenant/types";
import {
  ESTIMATIONS,
  FEATURE,
  STEPS,
  STEPS_SUBTITLE,
  STEPS_TITLE,
  agencyBlock,
  faqItems,
  seoArticles,
  seoIntro,
  seoTitle,
} from "@/content/home";

/**
 * The home page, whichever landing it belongs to.
 *
 * The generic landing at the apex and a client's landing are the same page
 * differing only by their data — that is the whole point of resolving a
 * {@link Landing} first. The one block that cannot be data is the agency
 * introduction: with no agency behind the generic page, there is nobody to
 * introduce, so it is left out rather than filled with something invented.
 *
 * The two blocks that quote figures read the commune's own notarial record, and
 * that is a network call against a dataset published as one CSV per year. They
 * are behind their own Suspense boundaries so the hero — the part that has to
 * be instant — never waits on them. A commune with no published record falls
 * back to an illustrative sample inside each component.
 */
export function LandingPage({ landing }: { landing: Landing }) {
  return (
    <div className="flex min-h-full flex-col">
      <Navbar />
      <Hero landing={landing} />

      <Suspense fallback={<RailSkeleton />}>
        <RecentSalesRail landing={landing} />
      </Suspense>

      {landing.generic ? null : <AgencySection agency={agencyBlock(landing)} />}

      <Suspense fallback={<FeatureSkeleton />}>
        <MarketFeature landing={landing} />
      </Suspense>

      <Steps title={STEPS_TITLE} subtitle={STEPS_SUBTITLE} steps={STEPS} />
      <AppointmentCta landing={landing} />
      <SeoContent
        title={seoTitle(landing)}
        intro={seoIntro(landing)}
        articles={seoArticles(landing)}
      />
      <Faq items={faqItems(landing)} />
      <SiteFooter landing={landing} />
    </div>
  );
}

async function RecentSalesRail({ landing }: { landing: Landing }) {
  const market = await communeMarket(landing.city);

  return (
    <LastEstimations
      sales={market?.recent ?? null}
      sample={ESTIMATIONS}
      city={landing.city}
      basePath={landing.basePath}
    />
  );
}

async function MarketFeature({ landing }: { landing: Landing }) {
  const market = await communeMarket(landing.city);

  return (
    <FeatureRow
      feature={{ ...FEATURE, href: landingHref(landing.basePath, FEATURE.href) }}
      media={<PricePanel city={landing.city} market={market} />}
    />
  );
}

/** Placeholders sized like the real thing, so the page does not jump. */
function RailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 lg:py-16">
      <div className="h-9 w-2/3 max-w-xl animate-pulse rounded-md bg-muted" />
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div key={index} className="h-[136px] animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    </div>
  );
}

function FeatureSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 lg:py-16">
      <div className="flex flex-col items-center gap-10 lg:flex-row lg:gap-20">
        <div className="flex w-full flex-col gap-4 lg:w-1/2">
          <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
          <div className="h-20 w-full animate-pulse rounded-md bg-muted" />
        </div>
        <div className="flex w-full justify-center lg:w-1/2">
          <div className="h-[380px] w-full max-w-md animate-pulse rounded-md bg-muted" />
        </div>
      </div>
    </div>
  );
}
