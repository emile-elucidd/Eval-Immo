import type { Estimation } from "@/components/last-estimations";
import type { FaqItem } from "@/components/faq";
import { FaqLink } from "@/components/faq";
import type { Feature } from "@/components/feature-row";
import type { Agency as AgencyBlock } from "@/components/agency-section";
import type { Step } from "@/components/steps";
import { Strong, type Article } from "@/components/seo-content";
import { fillTokens, inCity } from "@/lib/tenant/format";
import type { Landing } from "@/lib/tenant/types";

/**
 * The copy of the home page.
 *
 * Everything that names a town or an agency is a function of the current
 * {@link Landing} rather than a constant, because one deployment serves every
 * client: the same file renders "à Boulogne-Billancourt" for one agency and
 * "au Havre" for the next. What stays a constant is what is true of the product
 * itself, whoever sells it.
 */

/**
 * Sample rail data. Swap for a real feed when the estimations API is wired up.
 * `lat`/`lon` centre the map thumbnail: these are approximate commune centres,
 * not the estimated addresses — a real feed should send the geocoded point.
 */
export const ESTIMATIONS: Estimation[] = [
  { id: "1", badge: "il y a 5 minutes", location: "Paris (75008)", pricePerSqm: 11533, detail: "Appartement - 30 m²", lat: 48.8725, lon: 2.3125 },
  { id: "2", badge: "il y a 5 minutes", location: "Courbevoie (92400)", pricePerSqm: 8385, detail: "Appartement - 26 m²", lat: 48.8975, lon: 2.2564 },
  { id: "3", badge: "il y a 12 minutes", location: "Boulogne-Billancourt (92100)", pricePerSqm: 10515, detail: "Appartement - 99 m²", lat: 48.8354, lon: 2.2410 },
  { id: "4", badge: "il y a 26 minutes", location: "Issy-les-Moulineaux (92130)", pricePerSqm: 9240, detail: "Appartement - 54 m²", lat: 48.8243, lon: 2.2700 },
  { id: "5", badge: "il y a 41 minutes", location: "Saint-Cloud (92210)", pricePerSqm: 8970, detail: "Maison - 112 m²", lat: 48.8459, lon: 2.2189 },
  { id: "6", badge: "il y a 1 heure", location: "Vanves (92170)", pricePerSqm: 8120, detail: "Appartement - 52 m²", lat: 48.8226, lon: 2.2900 },
];

export const FEATURE: Feature = {
  title: "Une estimation que la moyenne du quartier ne donne pas",
  lead:
    // "Dix ans" was the original claim; the published record (geo-dvf "latest")
    // starts in 2021, so the copy now promises what the panel beside it can
    // actually draw.
    "Nous partons des actes notariés plutôt que des annonces, puis nous calibrons le prix sur votre bien précis et sur l'historique récent de votre rue.",
  points: [
    "Des prix de vente effectifs, pas des prix affichés surévalués de 5 à 10 %",
    "Surface, étage, exposition et état pondérés : l'écart dépasse 30 % à une même adresse",
    "L'évolution année par année de votre commune pour arbitrer entre vendre, attendre ou valoriser",
  ],
  cta: "Estimer mon bien",
  href: "/estimation",
};

/** The block beside the agency photo: name, description, and how to reach them. */
export function agencyBlock({ agency, city }: Landing): AgencyBlock {
  return {
    name: agency.name,
    description: fillTokens(agency.description, { agency, city }),
    photo: agency.photo,
    phone: agency.phone,
    email: agency.email,
    address: agency.address,
  };
}

export const STEPS_TITLE = "Votre estimation en 3 étapes";
export const STEPS_SUBTITLE =
  "Deux minutes en ligne pour une fourchette fiable, un expert sur place si votre projet se concrétise.";

export const STEPS: Step[] = [
  {
    title: "Entrez votre adresse",
    description:
      "Notre moteur retrouve les ventes notariales enregistrées à votre adresse et dans les rues voisines.",
  },
  {
    title: "Précisez votre bien",
    description:
      "Surface, étage, extérieur, état général : quelques questions pour calibrer le prix au plus près de la réalité.",
  },
  {
    title: "Recevez votre fourchette",
    description:
      "Une estimation immédiate et gratuite, affinable par un agent expert de votre quartier si vous le souhaitez.",
  },
];

export function seoTitle({ city }: Landing): string {
  return `Prix de l'immobilier ${inCity(city)} : ce que disent les ventes notariales`;
}

/** The city name opening a sentence — "votre commune" has to become "Votre commune". */
function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function seoIntro({ city }: Landing): React.ReactNode[] {
  return [
    <>
      {`${capitalise(city.name)} n'a pas un prix au m², elle en a des dizaines. `}
      {"Deux biens de même surface, distants de quelques centaines de mètres, peuvent s'échanger avec "}
      <Strong>{"plusieurs milliers d'euros d'écart au m²"}</Strong>
      {
        ". Raisonner à l'échelle de la commune revient donc à mélanger des marchés qui n'ont pas grand-chose en commun."
      }
    </>,
    <>
      {"Chaque vente signée chez le notaire alimente la base DVF publiée par l'État. "}
      <Strong>{"Ces données sont publiques, mais brutes"}</Strong>
      {
        " : adresses approximatives, biens mal qualifiés, ventes entre proches ou lots atypiques qui tirent les moyennes. Nous les nettoyons et les recoupons pour en sortir un prix lisible à l'adresse."
      }
    </>,
  ];
}

export function seoArticles({ city }: Landing): Article[] {
  return [
    {
      title: "Pourquoi le prix change d'une adresse à l'autre",
      paragraphs: [
        <>
          {"À chaque adresse, la proximité des transports et des commerces, le calme de la rue et l'étage pèsent souvent plus lourd que la surface seule. "}
          {"Un même appartement peut perdre "}
          <Strong>10 à 15 %</Strong>
          {
            " en passant d'une rue calme à un axe passant, et autant en descendant du dernier étage au premier. Ce sont ces micro-écarts, invisibles dans une moyenne communale, que nos données restituent."
          }
        </>,
      ],
    },
    {
      title: "Comparer au bon échantillon, pas à la moyenne",
      paragraphs: [
        <>
          {
            "Deux biens comparables sur le papier peuvent se vendre à des prix différents selon leur état général, les charges de la copropriété ou leur performance énergétique. "
          }
          <Strong>{"Comparer un bien aux mauvaises références fausse l'estimation d'entrée de jeu"}</Strong>
          {" — c'est l'erreur la plus fréquente des estimateurs qui se contentent d'une moyenne au m²."}
        </>,
      ],
    },
    {
      title: "Choisir le bon moment pour vendre",
      paragraphs: [
        <>
          {`Le marché local a ses rythmes ${inCity(city)} : les mises en vente se concentrent au printemps et à la rentrée, et un bien lancé à contretemps met mécaniquement plus longtemps à trouver preneur. `}
          <Strong>{"Lire l'historique de votre rue plutôt que les gros titres nationaux"}</Strong>
          {
            " permet d'arbitrer sereinement entre vendre maintenant, patienter un trimestre ou engager des travaux qui repositionneront le bien."
          }
        </>,
      ],
    },
  ];
}

export function faqItems({ agency, generic }: Landing): FaqItem[] {
  // On the generic landing there is no named agency yet — the visitor is matched
  // with one after the estimate, so the answers say "notre agence partenaire".
  const team = generic ? "l'agence partenaire de votre commune" : `l'équipe ${agency.name}`;

  return [
    {
      question: "D'où viennent vos prix de vente ?",
      answer:
        "Des transactions enregistrées par les notaires. Nous avons compilé plus de 1 000 ventes sur les deux dernières années pour établir un prix à chaque adresse de votre commune.",
    },
    {
      question: "Comment fonctionne l'estimation en ligne ?",
      answer:
        "Notre algorithme part des ventes notariales récentes autour de votre adresse, puis ajuste ce prix de référence avec les caractéristiques que vous renseignez — surface, étage, extérieur, état — pour produire la fourchette la plus fiable possible.",
    },
    {
      question: "Votre estimation est-elle fiable ?",
      answer: (
        <>
          {
            "C'est une pré-estimation, la plus fiable possible sur la base des critères renseignés. Pour un projet concret, elle gagne à être affinée sur place par un professionnel de notre agence. Vous pouvez prendre rendez-vous via "
          }
          <FaqLink>ce lien</FaqLink>.
        </>
      ),
    },
    {
      question: "Combien de temps cela prend-il ?",
      answer:
        "Environ deux minutes. La fourchette de prix s'affiche dès que vous avez renseigné les caractéristiques de votre bien.",
    },
    {
      question: "Le service est-il payant ?",
      answer: `Non. L'estimation en ligne comme le rendez-vous sur place avec ${team} sont gratuits et sans engagement.`,
    },
    {
      question: "Puis-je obtenir une estimation plus précise ?",
      answer: (
        <>
          {"Oui. Prenez rendez-vous via "}
          <FaqLink>ce lien</FaqLink>
          {
            " : un agent expert de votre quartier se déplace pour évaluer les éléments qu'aucune donnée ne capture — cachet, vue, prestations, travaux à prévoir."
          }
        </>
      ),
    },
  ];
}
