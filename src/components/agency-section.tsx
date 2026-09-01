import { Mail, MapPin, Phone } from "lucide-react";

export type Agency = {
  name: string;
  description: string;
  /** Drop a real portrait in /public and set this to swap out the monogram. */
  photo?: string;
  /** Coordonnées affichées sous la description — varient d'un client à l'autre. */
  phone?: string;
  email?: string;
  address?: string;
};

function Monogram({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex aspect-4/5 w-full items-center justify-center bg-primary">
      <span className="text-6xl font-black tracking-tight text-primary-foreground lg:text-7xl">
        {initials}
      </span>
    </div>
  );
}

export function AgencySection({ agency }: { agency: Agency }) {
  return (
    <div>
      <div className="mx-auto w-full max-w-6xl px-4 py-12 lg:py-16">
        <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-20">
          <div className="w-full max-w-xs shrink-0 overflow-hidden rounded-md lg:max-w-sm">
            {agency.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={agency.photo}
                alt={agency.name}
                className="aspect-4/5 w-full object-cover"
              />
            ) : (
              <Monogram name={agency.name} />
            )}
          </div>

          <div className="flex flex-col items-start gap-5">
            <h2 className="text-2xl leading-tight font-black tracking-tight text-balance text-foreground sm:text-3xl lg:text-4xl">
              {agency.name}
            </h2>

            <p className="max-w-xl text-base leading-relaxed text-muted-foreground lg:text-lg">
              {agency.description}
            </p>

            {agency.phone || agency.email || agency.address ? (
              <dl className="flex flex-col gap-2 text-base text-foreground">
                {agency.phone ? (
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <dt className="sr-only">Téléphone</dt>
                    <dd>
                      <a href={`tel:${agency.phone.replace(/\s+/g, "")}`} className="hover:underline">
                        {agency.phone}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {agency.email ? (
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <dt className="sr-only">Email</dt>
                    <dd>
                      <a href={`mailto:${agency.email}`} className="hover:underline">
                        {agency.email}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {agency.address ? (
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <dt className="sr-only">Adresse</dt>
                    <dd>{agency.address}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
