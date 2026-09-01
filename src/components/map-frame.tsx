import { MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Le cadre de carte partagé par l'étape de confirmation d'adresse et les
 * estimations récentes. Avec `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` c'est l'Embed API
 * de Google, sinon une mosaïque de tuiles OpenStreetMap composée en `<img>` —
 * les deux marchent sans clé, et le jour où la clé arrive les deux
 * s'améliorent ensemble.
 *
 * Le repli OSM n'est plus l'iframe `export/embed.html` d'OpenStreetMap : leur
 * widget charge désormais un moteur de rendu WebGL et affiche un message de
 * repli (« WebGL, une technologie permettant de rendre des graphismes 3D... »)
 * dès que le contexte WebGL est indisponible — navigateurs avec la protection
 * anti-fingerprinting activée, certains postes d'entreprise, Tor Browser. Ce
 * texte s'affiche par-dessus la carte elle-même : aucun recadrage ne peut le
 * cacher. Une mosaïque de tuiles PNG classiques n'a pas ce problème : c'est de
 * l'image pure, sans JS et sans rendu 3D.
 */

const TILE = 256;

export type MapPoint = { lat: number; lon: number; label: string };

/** Web Mercator : projette lat/lon en pixels absolus à un zoom donné. */
function project(lat: number, lon: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lon + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function googleSrc({ lat, lon }: MapPoint, zoom: number, key: string) {
  const params = new URLSearchParams({
    key,
    q: `${lat},${lon}`,
    zoom: String(zoom),
    maptype: "roadmap",
  });
  return `https://www.google.com/maps/embed/v1/place?${params}`;
}

export function MapFrame({
  point,
  zoom,
  widthPx,
  heightPx,
  pinSize = "h-9 w-9",
  className,
}: {
  point: MapPoint;
  zoom: number;
  /**
   * Taille approximative du cadre à l'écran, en px. Le rendu OSM est
   * server-side (pas de mesure au runtime) : on ajoute une tuile de marge de
   * chaque côté pour absorber l'écart avec la taille réelle à l'affichage.
   */
  widthPx: number;
  heightPx: number;
  pinSize?: string;
  className?: string;
}) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (key) {
    return (
      <div className={cn("relative overflow-hidden bg-muted", className)}>
        <iframe
          key={`${point.lat},${point.lon}`}
          title={`Localisation de ${point.label}`}
          src={googleSrc(point, zoom, key)}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    );
  }

  const center = project(point.lat, point.lon, zoom);
  const left = center.x - widthPx / 2;
  const top = center.y - heightPx / 2;
  // Marge pour absorber l'écart entre la taille estimée et la taille réelle du
  // cadre (rendu SSR, pas de mesure au runtime). Proportionnelle plutôt qu'une
  // tuile fixe : sur une vignette de 150 px, une tuile entière de chaque côté
  // triplait le nombre de requêtes sans rien ajouter de visible.
  const margin = Math.min(TILE, Math.round(Math.max(widthPx, heightPx) * 0.6));
  const minTx = Math.floor((left - margin) / TILE);
  const maxTx = Math.floor((left + widthPx + margin) / TILE);
  const minTy = Math.floor((top - margin) / TILE);
  const maxTy = Math.floor((top + heightPx + margin) / TILE);
  const tileCount = 2 ** zoom;

  const tiles: { x: number; y: number; src: string }[] = [];
  for (let ty = minTy; ty <= maxTy; ty++) {
    if (ty < 0 || ty >= tileCount) continue;
    for (let tx = minTx; tx <= maxTx; tx++) {
      // Le monde boucle en longitude : on ramène tx dans [0, tileCount).
      const wrapped = ((tx % tileCount) + tileCount) % tileCount;
      tiles.push({
        x: tx * TILE - left,
        y: ty * TILE - top,
        src: `https://tile.openstreetmap.org/${zoom}/${wrapped}/${ty}.png`,
      });
    }
  }

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {tiles.map((tile) => (
        <img
          // Keyer par `src` (z/x/y) et non par la position : deux points voisins
          // partagent des tuiles, et réutiliser le `<img>` en changeant seulement
          // le `src` laisserait l'ancienne tuile affichée le temps du chargement.
          key={tile.src}
          src={tile.src}
          alt=""
          width={TILE}
          height={TILE}
          // Pas de `loading="lazy"` : ces tuiles sont en `position:absolute` sous
          // un `overflow:hidden`, celles qui débordent du cadre gardent un ratio
          // d'intersection nul et ne se chargeraient jamais — d'où des cartes à
          // moitié rendues. Une mosaïque fait ~12 tuiles, autant tout charger.
          decoding="async"
          // `max-w-none` : le Preflight de Tailwind pose `img { max-width: 100% }`,
          // qui l'emporte sur le `width` inline et écrasait chaque tuile à la
          // largeur du cadre (~120 px) au lieu de 256 — carte déformée « à moitié ».
          className="absolute max-w-none"
          style={{ left: tile.x, top: tile.y, width: TILE, height: TILE }}
        />
      ))}

      <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full text-primary drop-shadow">
        <MapPin className={cn("fill-primary/25", pinSize)} aria-hidden />
      </span>

      {/* Attribution ODbL, obligatoire pour toute réutilisation des données OpenStreetMap. */}
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        className="absolute right-0 bottom-0 bg-card/85 px-1.5 py-0.5 text-[10px] leading-tight text-muted-foreground hover:underline"
      >
        © OpenStreetMap
      </a>
    </div>
  );
}
