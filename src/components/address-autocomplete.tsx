"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LoaderCircle, MapPin } from "lucide-react";

import type { Suggestion } from "@/app/api/adresse/route";
import { cn } from "@/lib/utils";

/**
 * Address entry with live suggestions, shared by the home page banner and the
 * first step of the funnel.
 *
 * `/api/adresse` already biases the search towards the town of the landing the
 * visitor is on and drops anything out of reach, so what lands here is a short
 * list of addresses the estimator can actually price. Picking one carries the
 * coordinates along; typing without picking still lets the visitor through, and
 * the funnel asks again with the same box.
 */

export type { Suggestion };

const DEBOUNCE_MS = 200;
const MIN_QUERY = 3;

export function AddressAutocomplete({
  initialQuery = "",
  placeholder,
  autoFocus,
  near,
  action,
  onSelect,
  onSubmitRaw,
  className,
}: {
  initialQuery?: string;
  placeholder: string;
  autoFocus?: boolean;
  /**
   * The commune the current landing targets. Sent along so `/api/adresse` can
   * bias its ranking towards it — the search still covers the whole country.
   */
  near?: string;
  /** Rendered inside the field as its own button — the home page CTA. */
  action?: { label: string };
  onSelect: (suggestion: Suggestion) => void;
  /** Called when the visitor validates free text instead of picking a suggestion. */
  onSubmitRaw?: (query: string) => void;
  className?: string;
}) {
  const inputId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [fetched, setFetched] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const latest = useRef(0);

  const tooShort = query.trim().length < MIN_QUERY;
  // Derived rather than stored: a query the visitor has cut back below the
  // threshold must not keep showing the answers to the longer one.
  const suggestions = tooShort ? [] : fetched;

  useEffect(() => {
    // Bumping the counter here discards any answer still in flight.
    const request = ++latest.current;
    if (!dirty || tooShort) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query });
        if (near) params.set("ville", near);
        const response = await fetch(`/api/adresse?${params}`);
        const data = (await response.json()) as { suggestions?: Suggestion[] };
        if (request === latest.current) setFetched(data.suggestions ?? []);
      } catch {
        if (request === latest.current) setFetched([]);
      } finally {
        if (request === latest.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, dirty, tooShort, near]);

  function submit() {
    // Enter with a list open takes the best match — it is the one the visitor sees first.
    if (suggestions[0]) onSelect(suggestions[0]);
    else if (query.trim()) onSubmitRaw?.(query.trim());
  }

  const empty = dirty && !loading && !tooShort && suggestions.length === 0;

  return (
    <div className={cn("relative w-full", className)}>
      <label htmlFor={inputId} className="sr-only">
        Adresse du bien à estimer
      </label>

      <div
        className={cn(
          "flex w-full flex-col gap-2 rounded-md border border-transparent bg-white p-2 md:flex-row md:items-center md:gap-0 md:pl-5",
          !action && "flex-row items-center gap-0 border-border bg-card p-0 pr-2 pl-4 md:pr-0 md:pl-5",
        )}
      >
        <MapPin
          className={cn("h-5 w-5 shrink-0 text-muted-foreground", action && "hidden md:block")}
          aria-hidden
        />
        <input
          id={inputId}
          type="text"
          name="street-address"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setDirty(true);
          }}
          onKeyDown={(event) => event.key === "Enter" && submit()}
          placeholder={placeholder}
          className={cn(
            "h-12 w-full appearance-none bg-transparent px-4 text-base text-foreground outline-none placeholder:text-muted-foreground md:h-14 md:px-3",
            !action && "h-16 md:h-16",
          )}
        />
        {loading ? (
          <LoaderCircle
            className="mr-4 h-5 w-5 shrink-0 animate-spin text-muted-foreground"
            aria-hidden
          />
        ) : null}
        {action ? (
          <button
            type="button"
            onClick={submit}
            className="h-12 shrink-0 rounded-md bg-primary px-6 text-base font-bold whitespace-nowrap text-primary-foreground transition-all hover:brightness-110 md:h-12 md:px-7"
          >
            {action.label}
          </button>
        ) : null}
      </div>

      {suggestions.length > 0 ? (
        <ul
          className={cn(
            "z-20 mt-2 flex flex-col overflow-hidden rounded-md border border-border bg-card text-left shadow-lg",
            action && "absolute inset-x-0 top-full",
          )}
        >
          {suggestions.map((suggestion) => (
            <li key={`${suggestion.citycode}-${suggestion.label}`}>
              <button
                type="button"
                onClick={() => onSelect(suggestion)}
                className="flex w-full items-center justify-between gap-4 border-b border-border px-5 py-3.5 text-left transition-colors last:border-b-0 hover:bg-muted/60"
              >
                <span className="text-base text-foreground">{suggestion.label}</span>
                {!suggestion.precise ? (
                  <span className="shrink-0 text-xs text-muted-foreground">numéro manquant</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {empty ? (
        <p
          className={cn(
            "mt-3 text-sm text-muted-foreground",
            action && "absolute inset-x-0 top-full rounded-md bg-card px-5 py-3 shadow-lg",
          )}
        >
          Aucune adresse trouvée dans notre secteur. Vérifiez le numéro, la voie et la commune.
        </p>
      ) : null}
    </div>
  );
}
