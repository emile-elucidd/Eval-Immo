"use client";

import { createContext, useContext } from "react";

import { landingHref } from "@/lib/tenant/format";
import type { PublicLanding } from "@/lib/tenant/types";

/**
 * How the client half of the site knows which agency it is running for.
 *
 * Server Components resolve the landing themselves and take it as a prop, but
 * the funnel is one large Client Component several levels deep, and the navbar
 * is interactive: threading the agency through both as props would touch every
 * file between. The layout publishes it once, sanitised
 * ({@link PublicLanding} carries no CRM token), and they read it here.
 */

const LandingContext = createContext<PublicLanding | null>(null);

export function LandingProvider({
  landing,
  children,
}: {
  landing: PublicLanding;
  children: React.ReactNode;
}) {
  return <LandingContext.Provider value={landing}>{children}</LandingContext.Provider>;
}

export function useLanding(): PublicLanding {
  const landing = useContext(LandingContext);
  if (!landing) {
    throw new Error("useLanding must be used inside the [agence]/[ville] layout");
  }
  return landing;
}

/** `href("/estimation")` → the same page on the current landing. */
export function useLandingHref(): (path?: string) => string {
  const { basePath } = useLanding();
  return (path = "/") => landingHref(basePath, path);
}
