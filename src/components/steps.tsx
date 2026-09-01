export type Step = { title: string; description: string };

/** Numbered "how it works" band — three columns on desktop, stacked on mobile. */
export function Steps({
  title,
  subtitle,
  steps,
}: {
  title: string;
  subtitle: string;
  steps: Step[];
}) {
  return (
    <div className="bg-muted/50">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 lg:py-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-2xl leading-tight font-black tracking-tight text-balance text-foreground sm:text-3xl lg:text-4xl">
            {title}
          </h2>
          <p className="max-w-2xl text-lg text-balance text-muted-foreground">{subtitle}</p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8 lg:mt-16">
          {steps.map((step, i) => (
            <div key={step.title} className="flex flex-col gap-3">
              <span className="text-3xl font-black text-primary">{i + 1}</span>
              <h3 className="text-lg font-black text-foreground">{step.title}</h3>
              <p className="text-base leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
