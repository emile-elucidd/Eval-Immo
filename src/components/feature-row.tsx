import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Feature = {
  title: string;
  lead: string;
  points: string[];
  cta: string;
  href: string;
};

/**
 * A text column beside a visual, alternating sides down the page.
 * `media` is a node so each row can bring its own image, map or mockup.
 */
export function FeatureRow({
  feature,
  media,
  reversed,
}: {
  feature: Feature;
  media: React.ReactNode;
  reversed?: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 lg:py-16">
      <div
        className={cn(
          "flex flex-col items-center gap-10 lg:gap-20",
          reversed ? "lg:flex-row-reverse" : "lg:flex-row",
        )}
      >
        <div className="flex w-full flex-col items-start gap-6 lg:w-1/2">
          <h2 className="text-2xl leading-tight font-black tracking-tight text-balance text-foreground sm:text-3xl lg:text-4xl">
            {feature.title}
          </h2>
          <p className="text-lg leading-relaxed font-medium text-foreground">{feature.lead}</p>

          <ul className="flex flex-col gap-3">
            {feature.points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />
                <span className="text-base text-muted-foreground">{point}</span>
              </li>
            ))}
          </ul>

          <ButtonLink href={feature.href} variant="outline" size="lg" className="mt-2 font-bold">
            {feature.cta}
          </ButtonLink>
        </div>

        <div className="flex w-full items-center justify-center lg:w-1/2">{media}</div>
      </div>
    </div>
  );
}
