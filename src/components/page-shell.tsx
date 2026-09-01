import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import type { Landing } from "@/lib/tenant/types";

export function PageShell({
  title,
  landing,
  children,
}: {
  title: string;
  landing: Landing;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-36 pb-24">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
        <div className="mt-6 flex flex-col gap-4 leading-relaxed text-muted-foreground">{children}</div>
      </main>
      <SiteFooter landing={landing} />
    </div>
  );
}
