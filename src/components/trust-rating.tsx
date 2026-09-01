import { cn } from "@/lib/utils";

/**
 * Trustpilot-styled rating, following their brand rules: star tiles in the
 * score's bucket colour with a white star punched out, then the wordmark.
 *
 * This is a static reproduction — the live widget needs Trustpilot's external
 * script plus a businessunit-id. Swap it in once the profile is wired up, and
 * keep SCORE in sync with the real profile until then.
 */
const SCORE = 4.7;
const REVIEWS = 128;
const MAX = 5;

// Trustpilot's official star-rating palette, bucketed by score.
const BUCKETS: [number, string][] = [
  [4.3, "#00B67A"], // Excellent
  [3.8, "#73CF11"], // Great
  [2.8, "#FFCE00"], // Average
  [1.8, "#FF8622"], // Poor
  [0, "#FF3722"], // Bad
];
const TRACK = "#DCDCE6";
const STAR_COLOR = BUCKETS.find(([min]) => SCORE >= min)![1];

// 5-point stars, sized for a 46x46 tile and a 24x24 wordmark glyph.
const TILE_STAR =
  "23.00,3.00 28.64,16.23 42.97,17.51 32.13,26.97 35.34,40.99 23.00,33.60 10.66,40.99 13.87,26.97 3.03,17.51 17.36,16.23";
const LOGO_STAR =
  "12.00,1.10 15.12,8.31 22.94,9.05 17.04,14.24 18.76,21.90 12.00,17.90 5.24,21.90 6.96,14.24 1.06,9.05 8.88,8.31";

function StarTile({ fill }: { fill: number }) {
  return (
    <svg viewBox="0 0 46 46" className="h-[22px] w-[22px]" aria-hidden="true">
      <rect width="46" height="46" fill={TRACK} />
      {fill > 0 && <rect width={46 * fill} height="46" fill={STAR_COLOR} />}
      {/* The star is knocked out of the tile in white, Trustpilot-style. */}
      <polygon points={TILE_STAR} fill="#fff" />
    </svg>
  );
}

export function TrustRating({ className }: { className?: string }) {
  const label = SCORE.toLocaleString("fr-FR");
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-x-2 gap-y-1", className)}>
      <div className="flex gap-[3px]" role="img" aria-label={`Note de ${label} sur ${MAX}`}>
        {Array.from({ length: MAX }).map((_, i) => (
          <StarTile key={i} fill={Math.min(Math.max(SCORE - i, 0), 1)} />
        ))}
      </div>

      <span className="text-sm">
        <span className="font-semibold">TrustScore {label}</span>
        <span className="opacity-60"> · {REVIEWS} avis</span>
      </span>

      {/* Wordmark: star glyph + "Trustpilot", their dark-background variant. */}
      <span className="flex items-center gap-1">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <polygon points={LOGO_STAR} fill="currentColor" />
        </svg>
        <span className="text-sm font-bold tracking-tight">Trustpilot</span>
      </span>
    </div>
  );
}
