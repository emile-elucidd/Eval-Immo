import { AddressSearch } from "@/components/address-search";
import { TenantImage } from "@/components/tenant-image";
import { TrustRating } from "@/components/trust-rating";
import { inCity } from "@/lib/tenant/format";
import type { Landing } from "@/lib/tenant/types";

export function Hero({ landing }: { landing: Landing }) {
  const { city } = landing;

  return (
    <div className="relative flex min-h-dvh w-full">
      {/* Cover photo behind a black veil, darkest at the bottom (see .gradient-hero in globals.css) */}
      <div className="gradient-hero absolute top-0 right-0 bottom-0 -z-10 h-full w-full overflow-hidden before:absolute before:left-0 before:z-10 before:h-full before:w-full">
        <TenantImage
          src={city.coverImage}
          alt={`${city.name} — photo de couverture`}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-dvh w-full flex-col justify-center px-5 pt-28 pb-16 md:px-14 md:pt-0 md:pb-0 lg:px-28 3xl:px-64">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center lg:gap-8">
          <h1 className="flex flex-col items-center gap-3 text-4xl leading-[1.1] font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            <span className="drop-shadow-[0_2px_16px_rgba(0,0,0,0.65)]">Estimation immobilière</span>
            {/* A plain trapezoid behind the city name — long edge on top, symmetric
                sides sloping gently in toward the base, corners just barely softened.
                Drawn as an SVG stretched to the label's box so it fits any commune
                name; opaque primary fill keeps the text readable over any cover photo
                and the drop-shadow lifts it off the image. */}
            <span className="relative inline-block px-5 py-1 text-primary-foreground sm:px-9 sm:py-1 lg:px-9 lg:py-1.5">
              <svg
                viewBox="0 0 200 64"
                preserveAspectRatio="none"
                className="absolute -inset-1 -z-10 h-[calc(100%+8px)] w-[calc(100%+8px)] drop-shadow-[0_10px_24px_rgba(0,0,0,0.5)]"
                aria-hidden="true"
              >
                <path
                  d="M1.66,8.85 Q0,0 4,0 L196,0 Q200,0 198.34,8.85 L189.66,55.15 Q188,64 184,64 L16,64 Q12,64 10.34,55.15 Z"
                  fill="hsl(var(--primary))"
                />
              </svg>
              {inCity(city)}
            </span>
          </h1>

          <p className="max-w-2xl text-[15px] leading-relaxed font-medium text-balance text-white drop-shadow-[0_1px_12px_rgba(0,0,0,0.7)] sm:text-xl lg:text-[22px]">
            Une estimation gratuite en 2 minutes, calculée sur les ventes réelles enregistrées
            par les notaires près de chez vous.
          </p>

          <AddressSearch className="w-full max-w-xl" />

          <TrustRating className="text-white" />
        </div>
      </div>
    </div>
  );
}
