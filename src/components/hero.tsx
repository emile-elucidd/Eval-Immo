import { AddressSearch } from "@/components/address-search";
import { TenantImage } from "@/components/tenant-image";
import { TrustRating } from "@/components/trust-rating";
import { inCity } from "@/lib/tenant/format";
import type { Landing } from "@/lib/tenant/types";

export function Hero({ landing }: { landing: Landing }) {
  const { city } = landing;

  return (
    <div className="relative flex h-fit w-full md:h-screen">
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

      <div className="relative z-10 mx-auto flex w-full flex-col justify-center px-5 pt-28 pb-16 md:h-screen md:px-14 md:pt-0 md:pb-0 lg:px-28 3xl:px-64">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-center lg:gap-8">
          <h1 className="flex flex-col items-center gap-3 text-4xl leading-[1.1] font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            <span className="drop-shadow-[0_2px_16px_rgba(0,0,0,0.65)]">Estimation immobilière</span>
            {/* A hand-drawn marker-stroke shape behind the text rather than a clean
                rectangle: an SVG blob, stretched to the label's box so it adapts to any
                city name. The text itself stays level and readable on top. */}
            <span className="relative inline-block px-6 py-3 sm:px-8 sm:py-4 lg:px-10 lg:py-5">
              <svg
                viewBox="0 0 200 64"
                preserveAspectRatio="none"
                className="absolute -inset-2 -z-10 h-[calc(100%+16px)] w-[calc(100%+16px)]"
                aria-hidden="true"
              >
                <path
                  d="M200.8,32.0 C201.2,39.2 203.0,49.2 196.0,53.9 C189.1,58.7 169.0,59.3 159.1,60.5 C149.2,61.7 142.5,61.1 136.4,61.0 C130.3,61.0 126.6,60.8 122.6,60.4 C118.7,60.0 115.6,59.0 112.8,58.6 C110.0,58.2 108.1,57.9 105.9,58.0 C103.8,58.1 102.1,58.8 100.0,59.2 C97.9,59.6 95.8,60.0 93.6,60.2 C91.3,60.4 89.2,60.1 86.4,60.2 C83.7,60.2 81.1,60.3 77.2,60.6 C73.2,60.9 69.1,61.6 62.7,61.7 C56.4,61.8 48.2,62.8 39.1,61.3 C30.0,59.9 13.1,57.9 8.1,53.0 C3.0,48.1 8.4,38.9 8.8,32.0 C9.2,25.1 4.7,16.1 10.5,11.6 C16.3,7.1 34.5,6.0 43.8,4.9 C53.0,3.8 60.5,5.1 66.2,5.1 C71.9,5.0 74.7,4.8 78.0,4.4 C81.3,4.0 83.3,3.0 85.9,2.6 C88.4,2.2 90.8,1.9 93.2,2.0 C95.5,2.1 97.8,2.8 100.0,3.2 C102.2,3.6 104.1,4.0 106.3,4.2 C108.6,4.4 110.8,4.1 113.4,4.2 C116.0,4.2 118.6,4.3 121.8,4.6 C125.1,4.9 127.5,5.6 132.9,5.7 C138.4,5.9 144.4,5.0 154.5,5.8 C164.6,6.6 185.9,6.3 193.6,10.6 C201.3,15.0 200.4,24.8 200.8,32.0 Z"
                  fill="hsl(var(--primary))"
                />
              </svg>
              <span className="relative text-primary-foreground">{inCity(city)}</span>
            </span>
          </h1>

          <p className="max-w-2xl text-lg leading-relaxed font-medium text-balance text-white drop-shadow-[0_1px_12px_rgba(0,0,0,0.7)] sm:text-xl lg:text-[22px]">
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
