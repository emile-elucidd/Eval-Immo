# Estimation immobilière — landing multi-agence + tunnel d'estimation

Landing de pré-estimation immobilière et son tunnel complet, adossé aux **ventes réelles
enregistrées chez le notaire** (base DVF publiée par Etalab). Un déploiement sert
**plusieurs agences clientes**, chacune sur son sous-domaine et ses communes — voir
[Multi-agence](#multi-agence).

## Démarrer

```bash
npm run dev     # http://localhost:3000 → la landing générique
                # http://localhost:3000/rive-ouest/boulogne-billancourt → une landing client
npm run build
npm run start
```

Copier `.env.example` en `.env.local` si vous branchez Go High Level, un registre distant
ou une clé Google Maps — tout fonctionne sans.

## Stack

- **Next.js 16** (App Router) + React 19
- **Tailwind CSS v4** — tokens type shadcn
- **Radix Accordion** (FAQ), **lucide-react** (icônes)
- Police **Roboto** servie depuis `src/fonts/` via `next/font/local`

## Le tunnel d'estimation

`/estimation` enchaîne une question par écran, dans l'ordre suivant :

| # | Étape | Question |
|---|---|---|
| 1 | `address` | Adresse du bien (autocomplétion France entière) |
| 2 | `address-validation` | Validation sur carte |
| 3 | `property-type` | Appartement / Maison / Terrain constructible |
| 4 | `property-size` | Surface habitable (ou surface du terrain) |
| 5 | `property-details` | Étage + dernier étage · terrain (maison) · viabilisation (terrain) |
| 6 | `property-condition` | À rénover / Standard / Refait à neuf |
| 7 | `property-annex` | Ascenseur, parking, extérieur, garage, piscine, vue mer |
| 8 | `owner` | Êtes-vous propriétaire ? |
| 9 | `project` | Projet de vente et échéance |
| 10 | `calculation` | Animation de calcul |
| 11 | `contact` | **Prénom, nom, email, téléphone — obligatoires** |
| 12 | `result` | Fourchette, prix net vendeur / marché / coup de cœur, comparables |

### Le verrou

Le prix n'est **jamais** calculé côté navigateur. `POST /api/estimation` rejette toute requête
dont le contact est absent ou invalide **avant** de charger la moindre donnée : on ne peut donc
pas contourner le formulaire en lisant le source ou en rejouant la requête. Le lead est
enregistré au moment même où le prix est produit.

## Le modèle de prix

`src/lib/estimation.ts` — pur, sans I/O, donc lisible et corrigible isolément.

1. **Comparables** : les ventes de même nature autour de l'adresse, rayon élargi par paliers
   (250 m → 5 km) jusqu'à obtenir un échantillon significatif. Si la commune n'en contient
   pas assez — un village enregistre deux ventes d'appartement en quatre ans — la recherche
   s'étend aux **16 communes les plus proches** (`neighbourhoodSales`, `src/lib/dvf.ts`) :
   c'est ce que fait un agent, et la pondération par la distance replace chaque vente à sa
   juste place. Le rayon réellement retenu est affiché au visiteur avec le résultat.
2. **Réindexation** : chaque vente est repositionnée au marché d'aujourd'hui via la médiane
   annuelle de la commune.
3. **Nettoyage** : les valeurs aberrantes (ventes entre proches, lots incomplets) sont écartées
   par la règle de Tukey.
4. **Pondération** : médiane pondérée par la distance et par l'écart de surface.
5. **Ajustements** : surface, étage et dernier étage, état général, annexes, terrain,
   viabilisation. Chacun est renvoyé au visiteur avec son pourcentage.
6. **Sortie** : prix de marché, prix net vendeur (−5 %), prix coup de cœur (+8 %), et une
   fourchette dont la largeur suit la dispersion réelle du quartier.

Les départements 57, 67, 68 et 976 relèvent du livre foncier : leurs ventes ne figurent pas dans
DVF, le tunnel le dit explicitement plutôt que d'inventer un prix. Même chose si, commune et
voisines réunies, rien de comparable n'a changé de main : le tunnel propose alors un
rendez-vous sur place au lieu d'un chiffre approximatif.

L'élargissement ne regarde que le département de l'adresse — la liste des communes est
chargée département par département. Une adresse collée à une limite départementale regarde
donc du mauvais côté ; elle obtient un prix quand même, simplement tiré de communes moins
proches qu'elles ne pourraient l'être.

## Services externes

| Service | Usage | Clé |
|---|---|---|
| [Base Adresse Nationale](https://adresse.data.gouv.fr) | Autocomplétion et géocodage, via `/api/adresse` | aucune |
| [DVF / Etalab](https://files.data.gouv.fr/geo-dvf/) | Ventes réelles, un CSV par commune et par an | aucune |
| [API Découpage administratif](https://geo.api.gouv.fr) | Centre et superficie des communes d'un département, pour l'élargissement aux communes voisines | aucune |
| Google Maps Embed | Carte de validation d'adresse | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, sinon repli OpenStreetMap |

## Multi-agence

Un seul déploiement sert toutes les agences clientes. Une **landing** = une agence × une
commune, et une agence peut en couvrir plusieurs.

```
rive-ouest.estimation-immo.fr/boulogne-billancourt
└── agence ──┘                └──── ville ────┘
```

`src/proxy.ts` réécrit le sous-domaine dans le chemin, donc la route interne est
`/[agence]/[ville]/…` et le visiteur ne voit jamais le segment agence. Sans sous-domaine
reconnu (développement, preview Vercel), la même URL fonctionne en chemin complet :
`localhost:3000/rive-ouest/boulogne-billancourt`.

### La page générique, et les liens cassés

L'apex — `tondomaine.fr`, sans sous-domaine ni ville — est une **landing de capture à part
entière** : « Estimation immobilière dans votre commune », photo générique, même tunnel.
Elle appartient à aucun client, donc pas de bloc agence, pas de calendrier, et ses leads
partent vers `LEADS_WEBHOOK_URL`.

C'est aussi le filet de sécurité. Une URL erronée n'affiche jamais un 404 :

| URL | Destination |
|---|---|
| Agence inconnue | `/` — la page générique |
| Agence connue, ville inconnue | La ville par défaut **de cette agence** |
| `agence.tondomaine.fr` seul | La ville par défaut de l'agence |
| N'importe quoi d'autre | `/` — la page générique |

Une ville mal orthographiée garde donc le visiteur sur le site du client, et son lead avec
lui ; seule une agence inconnue retombe sur la page générique.

Les slugs `estimation`, `mentions`, `privacy` et `rendez-vous` sont réservés : ce sont les
pages de la landing générique, une agence ne peut pas porter ces noms.

### Ce qui varie d'un client à l'autre

Tout est dans un objet `Agency` (`src/lib/tenant/types.ts`) :

| Champ | Ce qu'il pilote |
|---|---|
| `name`, `description` | Le bloc agence, le tunnel, les mentions légales |
| `logo`, `photo` | Header, footer, bloc agence — chemin `/public` ou URL absolue |
| `phone`, `email`, `address` | Coordonnées, mentions légales, confidentialité |
| `calendarUrl` | Le calendrier embarqué sur `/rendez-vous` (widget GHL ou autre) |
| `cities[]` | Une landing par commune |
| `cities[].name` + `preposition` | « à Boulogne-Billancourt », « **au** Havre », « **aux** Lilas » |
| `cities[].coverImage` | La photo de couverture du hero |
| `legal` | SIREN, carte professionnelle, garant, assureur, médiateur… |
| `crm` | Où part le lead : webhook et/ou sous-compte Go High Level |

`description` accepte les mêmes jetons que les *custom values* de GHL —
`{{ville}}`, `{{a_ville}}`, `{{agence}}` — pour qu'un même paragraphe serve toutes les
communes d'une agence.

Les champs de `legal` laissés vides s'affichent en rouge sur `/mentions` et `/privacy` :
une landing incomplète est impossible à publier sans le voir.

### Ajouter un client

1. **Une entrée** dans `src/lib/tenant/agencies.ts` — copier `havre-immo`, changer le
   `slug`, le nom, les coordonnées, les villes et le bloc `legal`.
2. **Trois variables d'environnement**, nommées d'après le slug — aucun code à écrire,
   `src/lib/tenant/env.ts` les trouve tout seul :

   ```
   AGENCY_<SLUG>_GHL_LOCATION_ID   # le sous-compte GHL qui reçoit les leads
   AGENCY_<SLUG>_CALENDAR_URL      # le calendrier embarqué sur /rendez-vous
   AGENCY_<SLUG>_WEBHOOK_URL       # optionnel, en plus ou à la place de l'API
   ```

   `slug: "havre-immo"` → `AGENCY_HAVRE_IMMO_…`

3. **Un CNAME** `<slug>.tondomaine.fr` vers le déploiement, ajouté dans les domaines du
   projet Vercel.

Le `slug` est donc la clé unique : sous-domaine, préfixe des variables, et attribution du
lead. Les secrets ne sont jamais dans le registre — un CMS peut tenir la fiche d'un client
sans jamais tenir son token.

### Où vit le registre

| `TENANT_SOURCE` | Source | Ajouter un client |
|---|---|---|
| *(défaut)* `local` | `src/lib/tenant/agencies.ts` | Une entrée + un déploiement |
| `http` | JSON à `TENANT_SOURCE_URL` | Sans déploiement — CMS, ou export des sous-comptes GHL |

Même forme dans les deux cas, et repli automatique sur le fichier local si la source
distante est injoignable.

### Go High Level

Les `{{custom_values.…}}` de GHL ne s'interprètent que dans les pages hébergées **par**
GHL : elles ne peuvent pas s'injecter ici. GHL tient donc trois rôles :

1. **CRM destinataire** — `crm.ghl` crée/met à jour le contact (API v2, `/contacts/upsert`)
   dans le sous-compte de l'agence, puis y attache l'estimation en note. `crm.webhookUrl`
   fait la même chose en no-code : le lead arrive à plat dans `fields`, prêt à mapper.
2. **Calendrier** — `calendarUrl` embarque le widget de réservation du sous-compte.
3. **Source du registre**, si vous publiez ses valeurs en JSON sur `TENANT_SOURCE_URL`.

Les champs personnalisés d'un sous-compte GHL ayant des identifiants propres à chaque
client, rien n'est supposé : `crm.ghl.customFields` mappe explicitement ce que vous avez
créé, et la note passe de toute façon.

## Structure

| Fichier | Rôle |
|---|---|
| `src/lib/tenant/types.ts` | Ce qui change d'un client à l'autre |
| `src/lib/tenant/agencies.ts` | Le registre local — les clients |
| `src/lib/tenant/env.ts` | Les secrets par client, nommés d'après le slug |
| `src/lib/tenant/generic.ts` | La landing de l'apex — celle qui n'a pas de client |
| `src/app/(generic)/` | Ses pages, à la racine des URLs |
| `src/components/landing-page.tsx` | L'accueil, générique ou client — la même page |
| `src/lib/tenant/source.ts` | Registre local ou distant |
| `src/lib/tenant/landing.ts` | Résolution agence × ville, et ce qui part au navigateur |
| `src/lib/tenant/host.ts` | Lecture de l'agence dans le nom d'hôte |
| `src/proxy.ts` | Réécriture sous-domaine → chemin |
| `src/content/home.tsx` | Textes de l'accueil, en fonction de la landing |
| `src/content/legal.tsx` | Mentions légales et confidentialité, idem |
| `src/lib/crm/ghl.ts` | Livraison du lead dans Go High Level |
| `src/lib/leads.ts` | Aiguillage du lead vers le CRM de la bonne agence |
| `src/lib/estimation.ts` | Le modèle de prix |
| `src/lib/market.ts` | Le marché d'une commune : médiane, courbe, ventes récentes |
| `src/lib/dvf.ts` | Chargement et nettoyage des ventes notariales |
| `src/app/api/adresse/route.ts` | Autocomplétion proxifiée, biaisée sur la ville de la landing |
| `src/app/api/estimation/route.ts` | Le calcul, le verrou contact, et l'attribution du lead |
| `src/components/estimation/` | Le tunnel : étapes, carte, animation, résultat |

## Ce qui se saisit, et ce qui se calcule

Créer une landing ne demande **aucun chiffre**. Les prix, les adresses et la courbe se
déduisent du nom de la commune.

| Champ | Qui le renseigne |
|---|---|
| `slug`, `name`, `preposition`, `postcode`, `coverImage` | **Vous** — 5 champs par ville |
| `insee` | Personne : résolu depuis le nom via la Base Adresse Nationale. À ne renseigner que pour forcer une commune homonyme |
| Prix au m², fourchette, courbe, années | **Calculés** depuis les ventes notariales de la commune |
| Adresse en tête du panneau de prix | **Calculée** : la rue de la vente la plus récente |
| Rail des ventes récentes | **Calculé** : rues, surfaces, dates, €/m², coordonnées |
| `sampleAddress` | Optionnel — sert seulement de repli si la commune n'a pas de registre publié |

Preuve dans le registre : `boulogne-billancourt` fixe son `insee`, `issy-les-moulineaux` ne
le fait pas. Les deux affichent les mêmes chiffres que leur commune.

## Les chiffres de la page d'accueil

Le rail de ventes et le panneau de prix lisent le **registre notarial de la commune**
(`src/lib/market.ts`), via le même DVF que le tunnel :

| Ce qui est affiché | D'où ça vient |
|---|---|
| Rues, surfaces, dates, €/m² du rail | Les dernières ventes de la commune |
| Fourchette du panneau | 1ᵉʳ et 3ᵉ quartile des ventes de la dernière année |
| « Prix de vente réel » | Médiane de la dernière année publiée |
| Courbe et années de l'axe | Une médiane par année publiée |
| **« Prix affiché en annonce »** | **Déduit** : `LISTING_PREMIUM` (+8 %) dans `price-panel.tsx` |

La dernière ligne est la seule qui ne vient pas de DVF — le registre contient des actes, pas
des annonces, donc aucune donnée ici ne connaît le prix demandé par le vendeur. C'est une
hypothèse éditoriale, isolée dans une constante pour être changée ou la ligne supprimée.

Ces deux blocs sont derrière un `<Suspense>` : le hero s'affiche immédiatement, ils arrivent
ensuite. Une commune sans registre publié (la page générique, l'Alsace-Moselle, Mayotte)
retombe sur un échantillon illustratif, annoncé comme tel.

`geo-dvf/latest` ne publie qu'à partir de **2021** — les années antérieures répondent par une
redirection qui n'aboutit pas. `FIRST_YEAR` dans `src/lib/dvf.ts` borne la plage ; à relever
si Etalab republie plus loin.

## À savoir
- Les leads partent vers le webhook de l'agence puis vers son sous-compte GHL ; à défaut vers
  `LEADS_WEBHOOK_URL` ; sinon dans `.leads/leads.jsonl` (ignoré par git, sans effet sur un
  hébergement en lecture seule). Une panne CRM ne coûte jamais son estimation au visiteur.
- La landing d'où vient le lead voyage dans le corps de la requête, faute d'accès aux segments
  d'URL dans un Route Handler, et est revérifiée contre le registre côté serveur.
- Sans `logo`, le header et le footer affichent le nom de l'agence en toutes lettres.
