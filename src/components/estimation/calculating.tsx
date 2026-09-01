"use client";

import { useEffect, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";

import { useLanding } from "@/lib/tenant/context";
import { cn } from "@/lib/utils";

/**
 * The pause between the last question and the contact form.
 *
 * It is not decoration: the three lines name what the model is actually doing —
 * pulling the notarial record, comparing nearby sales, applying the property's
 * own traits — which is what makes the number that follows credible.
 */

const TICKS = [
  "Extraction des données historiques",
  "Analyse des ventes comparables dans le quartier",
  "Prise en compte des caractéristiques du bien",
];

const TICK_MS = 900;

export function Calculating({ onDone }: { onDone: () => void }) {
  const { agency } = useLanding();
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (done >= TICKS.length) {
      const timer = setTimeout(onDone, 600);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setDone((count) => count + 1), TICK_MS);
    return () => clearTimeout(timer);
  }, [done, onDone]);

  const finished = done >= TICKS.length;

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <h1 className="text-center text-2xl leading-tight font-black tracking-tight text-balance text-foreground sm:text-3xl">
        {finished
          ? "Calcul terminé"
          : `${agency.name || "Notre moteur"} calcule votre estimation…`}
      </h1>

      <ul className="flex w-full flex-col">
        {TICKS.map((tick, index) => {
          const complete = index < done;
          const active = index === done;
          return (
            <li
              key={tick}
              className={cn(
                "flex items-center gap-4 border-b border-border py-5 last:border-b-0 transition-opacity duration-500",
                complete || active ? "opacity-100" : "opacity-35",
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary text-primary">
                {complete ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : active ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                ) : null}
              </span>
              <span className="text-base text-foreground">{tick}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
