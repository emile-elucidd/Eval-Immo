"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { TenantImage } from "@/components/tenant-image";
import { useLanding, useLandingHref } from "@/lib/tenant/context";
import { cn } from "@/lib/utils";

/** Past this many pixels the bar leaves the hero photo and needs its own surface. */
const SCROLL_THRESHOLD = 24;

/**
 * The agency's mark. A logo when the registry has one, the agency name
 * otherwise — a blank slot reads as a broken page on a landing that is
 * supposed to belong to a named business. The apex landing has no business
 * behind it, so with neither logo nor name it shows nothing at all.
 */
function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  const { agency } = useLanding();
  const href = useLandingHref();

  if (!agency.logo && !agency.name) return null;

  return (
    <Link href={href("/")} className={cn("flex items-center", className)} aria-label="Accueil">
      {agency.logo ? (
        <TenantImage
          src={agency.logo}
          alt={agency.name}
          height={40}
          width={128}
          priority
          className="h-full w-auto object-contain object-left"
        />
      ) : (
        <span
          className={cn(
            "text-base font-black tracking-tight",
            inverted ? "text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)]" : "text-foreground",
          )}
        >
          {agency.name}
        </span>
      )}
    </Link>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const href = useLandingHref();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll(); // catch a restored scroll position on mount
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-colors duration-300",
        scrolled ? "bg-background shadow-sm" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <Logo className="h-10 w-32" inverted={!scrolled} />

        <div className="flex items-center gap-2 [&:only-child]:ml-auto">
          <ButtonLink
            href={href("/rendez-vous")}
            id="navbar-appointment-cta"
            variant="ghost"
            size="md"
            className="border border-foreground bg-transparent px-4 font-bold text-foreground hover:bg-accent max-sm:hidden"
          >
            <CalendarCheck className="h-4 w-4 shrink-0" />
            Prendre rendez-vous
          </ButtonLink>

          <ButtonLink
            href={href("/estimation")}
            id="navbar-estimation-cta"
            variant="primary"
            size="md"
            className="px-5 font-bold"
          >
            Obtenir mon estimation
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
