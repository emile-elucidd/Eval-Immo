import Link from "next/link";

import { TenantImage } from "@/components/tenant-image";
import { landingHref } from "@/lib/tenant/format";
import type { Landing } from "@/lib/tenant/types";

export function SiteFooter({ landing }: { landing: Landing }) {
  const { agency, basePath } = landing;
  const href = (path: string) => landingHref(basePath, path);

  return (
    <div>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12">
        {(agency.logo || agency.name) && (
          <Link href={href("/")} className="flex h-10 w-32 items-center" aria-label="Accueil">
            {agency.logo ? (
              <TenantImage
                src={agency.logo}
                alt={agency.name}
                height={40}
                width={128}
                className="h-full w-auto object-contain object-left"
              />
            ) : (
              <span className="text-base font-black tracking-tight text-foreground">
                {agency.name}
              </span>
            )}
          </Link>
        )}

        <div className="flex flex-col items-center gap-4 text-sm text-muted-foreground md:flex-row md:justify-between">
          <div className="flex items-center gap-6">
            <Link href={href("/mentions")} className="hover:text-foreground">
              Mentions légales
            </Link>
            <Link href={href("/privacy")} className="hover:text-foreground">
              Confidentialité
            </Link>
          </div>

          {!landing.generic && (
            <p>
              © {new Date().getFullYear()} {agency.name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
