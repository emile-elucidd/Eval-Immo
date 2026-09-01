@AGENTS.md

# eval-immo.com — landing multi-agence + tunnel d'estimation immobilière

**La doc de référence est [README.md](README.md).** Lis-la avant de toucher au tunnel, au
modèle de prix ou au multi-agence : elle décrit le comportement attendu écran par écran et
la provenance de chaque chiffre affiché. Ce fichier ne répète pas le README, il liste ce
qui se perd de vue.

## Domaine

- Domaine de production : **`eval-immo.com`** (acheté). Une agence = un sous-domaine :
  `agence.eval-immo.com/ville/slug`, le segment `agence` n'apparaît jamais dans l'URL.
- `NEXT_PUBLIC_ROOT_DOMAIN=eval-immo.com` doit être défini en prod et en preview : sans lui
  `subdomainOf()` (`src/lib/tenant/host.ts`) retombe sur « les deux derniers labels », ce
  qui marche ici par chance mais reste implicite.
- Les exemples `estimation-immo.fr` dans [README.md](README.md) et `.env.example` datent
  d'avant l'achat du domaine.
- C'est **un seul domaine enregistrable**. Les sous-domaines sont le même site : cookies
  partageables via `Domain=.eval-immo.com`, pas de cross-domain linker analytics, une seule
  licence CMP. Cela ne changerait que si une agence prenait un jour son propre domaine.

## Ce Next.js n'est pas celui que tu connais

- Next **16.3.3**, React **19.2**. Consulte `node_modules/next/dist/docs/` avant d'écrire
  du routing, du data-fetching ou du cache.
- Le middleware s'appelle **`src/proxy.ts`**, exporte `proxy()` + `config.matcher`, pas
  `middleware.ts`. Il réécrit `agence.host/ville` → `/[agence]/[ville]`. Le matcher exclut
  `/api/`, `_next/`, `favicon.ico` et tout fichier avec extension.
- Tailwind **v4** : configuration dans le CSS (`src/app/globals.css`), pas de
  `tailwind.config.js`.

## Règles dures

- **Le prix n'est jamais calculé côté navigateur.** `POST /api/estimation` rejette toute
  requête sans contact valide *avant* de charger la moindre donnée DVF ; le lead est
  enregistré à l'instant où le prix est produit. Ne déplace aucune partie de
  `src/lib/estimation.ts` dans un composant client, ne rends pas l'étape `result`
  atteignable sans passer par `contact`.
- **Aucune requête tierce au runtime.** Police en local (`src/fonts/`), carte avec repli
  OpenStreetMap sans clé, adresses et DVF via des API publiques de l'État proxifiées par
  nos routes. N'ajoute pas de CDN, de police distante ou de script tiers sans le signaler.
- **Slugs** : `^[a-z0-9]+(-[a-z0-9]+)*$`. `RESERVED_SLUGS` dans `src/lib/tenant/host.ts`
  (`estimation`, `mentions`, `privacy`, `rendez-vous`, `www`, `api`…) : une agence ne peut
  pas porter ces noms.
- **Secrets jamais dans le registre.** `src/lib/tenant/agencies.ts` et la source HTTP ne
  contiennent que du JSON public ; tokens GHL, webhooks et URLs de calendrier viennent des
  variables `AGENCY_<SLUG>_…` résolues par `src/lib/tenant/env.ts`.
- **`PublicLanding` est la seule forme qui part au navigateur** — jamais `Agency.crm` ni
  `Agency.legal`.
- Une URL erronée ne rend **jamais** un 404 : agence inconnue → page générique de l'apex,
  ville inconnue → ville par défaut de l'agence. Garde ce filet.
- La landing d'origine du lead voyage dans le corps de `POST /api/estimation` (pas d'accès
  aux segments d'URL dans un Route Handler) et est revérifiée contre le registre côté
  serveur. Ne fais pas confiance à cette valeur sans la revalider.

## Ajouter une agence cliente

1. Une entrée dans `src/lib/tenant/agencies.ts` (copier `rive-ouest`).
2. Trois variables nommées d'après le slug : `AGENCY_<SLUG>_GHL_LOCATION_ID`,
   `AGENCY_<SLUG>_CALENDAR_URL`, `AGENCY_<SLUG>_WEBHOOK_URL`.
3. Un CNAME `<slug>.eval-immo.com` ajouté aux domaines du projet Vercel.

Champs `legal` laissés vides = placeholders rouges sur `/mentions` et `/privacy`, volontaire.

## Prévu, pas encore construit — acquisition & tracking

Campagnes Google Ads / Meta / Bing, notamment sur « prix m2 [ville] ». Direction retenue :

- **Landing** : afficher le prix moyen de la ville (protège le Quality Score Ads et le SEO),
  réserver au formulaire la valeur personnalisée — estimation à l'adresse exacte, découpage
  par quartier / typologie. Ne pas masquer complètement le chiffre générique.
- **Consentement** : CMP certifiée Google + **Consent Mode v2**, implémentation *Advanced*,
  defaults `denied`, `url_passthrough: true` pour conserver le `gclid` quand `ad_storage`
  est refusé. Bannière conforme CNIL (« tout refuser » au même niveau que « tout accepter »).
  Le snippet `consent default` doit s'exécuter avant tout autre tag (tête de
  `src/app/layout.tsx`).
- **Attribution** : capter `gclid` / `gbraid` / `wbraid`, `fbclid`, `msclkid` et les UTM
  dans `src/proxy.ts`, les persister dans un cookie `attribution` sur `.eval-immo.com`
  (first-touch + last-touch), relu côté serveur dans `/api/estimation` et joint au lead
  envoyé au CRM.
- **Remontée offline** : Enhanced Conversions for Leads (Google, Bing) + Conversions API
  (Meta) via email / téléphone hachés, puis import périodique des leads devenus clients
  avec leur valeur réelle, pour optimiser sur la qualité et non le volume de formulaires.
