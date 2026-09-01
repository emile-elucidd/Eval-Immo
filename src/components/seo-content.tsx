export type Article = { title: string; paragraphs: React.ReactNode[] };

export function SeoContent({
  title,
  intro,
  articles,
}: {
  title: string;
  intro: React.ReactNode[];
  articles: Article[];
}) {
  return (
    <div className="py-12 lg:py-16">
      <div className="mx-auto w-full max-w-3xl px-4">
        <section className="flex flex-col gap-10 lg:gap-14">
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl leading-tight font-black tracking-tight sm:text-3xl">
              {title}
            </h2>
            {intro.map((paragraph, i) => (
              <p key={i} className="leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="flex flex-col gap-8">
            {articles.map((article) => (
              <article key={article.title} className="flex flex-col gap-3">
                <h3 className="text-lg font-black sm:text-xl">{article.title}</h3>
                {article.paragraphs.map((paragraph, i) => (
                  <p key={i} className="leading-relaxed text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}
