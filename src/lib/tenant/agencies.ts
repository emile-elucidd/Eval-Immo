import type { Agency } from "@/lib/tenant/types";

/**
 * The client registry, as a file in the repository.
 *
 * Adding a client is adding an entry below and deploying — copy the second one,
 * which exists to be copied. Nothing here is code: the calendar URL, the
 * inbound webhook and the Go High Level sub-account are *not* named in this
 * file, they are read from `AGENCY_<SLUG>_…` environment variables by
 * `src/lib/tenant/env.ts`, so a new client never means editing logic.
 *
 * Point `TENANT_SOURCE=http` at a CMS or at a Go High Level export (see
 * `src/lib/tenant/source.ts`) to manage these same objects without a deploy;
 * the shape is identical either way, secrets still come from the environment,
 * and nothing else in the app changes.
 */

export const AGENCIES: Agency[] = [
  {
    slug: "rive-ouest",
    name: "Rive Ouest Immobilier",
    description:
      "C'est notre équipe qui reprend votre estimation en ligne pour la confronter au terrain. " +
      "Installés {{a_ville}} depuis 2009, nous connaissons les écarts que la donnée seule ne voit " +
      "pas : l'exposition d'une cour intérieure, l'état d'une copropriété, la réputation d'une rue. " +
      "Le rendez-vous est gratuit et sans engagement.",
    phone: "01 46 00 00 00",
    email: "contact@rive-ouest-immobilier.fr",
    address: "14 rue Marcel Sembat, 92100 Boulogne-Billancourt",

    cities: [
      {
        slug: "boulogne-billancourt",
        name: "Boulogne-Billancourt",
        preposition: "à",
        postcode: "92100",
        insee: "92012",
        coverImage: "/hero-cover.jpg",
        sampleAddress: "12 rue du Château, Boulogne-Billancourt",
      },
      // No `insee` on purpose: the name and the postcode are enough, the Base
      // Adresse Nationale resolves the rest. This is the shape to copy.
      {
        slug: "issy-les-moulineaux",
        name: "Issy-les-Moulineaux",
        preposition: "à",
        postcode: "92130",
        coverImage: "/hero-cover.jpg",
        sampleAddress: "8 avenue Victor Cresson, Issy-les-Moulineaux",
      },
    ],

    // Everything the operator alone can supply. What is left out renders as a
    // red placeholder on /mentions and /privacy until it is filled in.
    legal: {
      updatedOn: "31 août 2026",
      crmName: "Go High Level",
    },
  },

  // The entry to copy for a new client. It differs from the first on purpose,
  // to show what the fields are for: a commune whose preposition is not "à",
  // and a legal block left empty so both legal pages show their placeholders.
  {
    slug: "havre-immo",
    name: "Havre Immobilier",
    description:
      "Notre équipe reprend votre estimation en ligne et la confronte au terrain. " +
      "Installés {{a_ville}}, nous connaissons les écarts que la donnée seule ne voit pas : " +
      "l'exposition, l'état d'une copropriété, la réputation d'une rue. " +
      "Le rendez-vous est gratuit et sans engagement.",
    phone: "02 35 00 00 00",
    email: "contact@havre-immobilier.fr",
    address: "3 quai George V, 76600 Le Havre",

    cities: [
      {
        slug: "le-havre",
        name: "Le Havre",
        // Not "à": French has no rule for this, which is exactly why it is a field.
        preposition: "au",
        postcode: "76600",
        insee: "76351",
        coverImage: "/hero-cover.jpg",
        sampleAddress: "12 rue de Paris, Le Havre",
      },
    ],

    legal: {},
  },
];
