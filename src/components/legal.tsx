import { Strong } from "@/components/seo-content";

export { Strong };

export type LegalSection = { heading: string; body: React.ReactNode[] };

/**
 * The shared skeleton of the two legal pages: a "last updated" line, then a
 * stack of headed sections. The prose lives in `@/content/legal`; this only
 * lays it out, matching the muted body text `PageShell` already sets.
 */
export function LegalDoc({
  updatedOn,
  sections,
}: {
  updatedOn: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <p className="text-sm text-muted-foreground/80">Dernière mise à jour : {updatedOn}</p>

      {sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-3">
          <h2 className="mt-4 text-lg font-bold text-foreground">{section.heading}</h2>
          {section.body.map((node, i) => (
            <div key={i}>{node}</div>
          ))}
        </section>
      ))}
    </>
  );
}

/** A bulleted list, styled for the muted body copy of the legal pages. */
export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-muted-foreground/50">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * One registration detail of the agency, as held in the client registry.
 *
 * Filled in, it reads as ordinary prose. Left empty — which is the state every
 * new client starts in — it falls back to a loud {@link Blank} naming what is
 * missing, so an unfinished `mentions légales` page is impossible to publish by
 * accident.
 */
export function Field({
  value,
  children,
}: {
  value?: string;
  children: React.ReactNode;
}) {
  const filled = value?.trim();
  return filled ? <>{filled}</> : <Blank>{children}</Blank>;
}

/**
 * A value that must be filled in with the agency's real registration data
 * before the site goes live. Rendered loud on purpose so it cannot be missed
 * in review.
 */
export function Blank({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="rounded-sm bg-destructive/10 px-1 font-medium text-destructive"
      title="À compléter avant la mise en ligne"
    >
      [{children}]
    </span>
  );
}
