import { Field, LegalList, Strong, type LegalSection } from "@/components/legal";
import type { Landing } from "@/lib/tenant/types";

/**
 * Who publishes the site. On a client landing it is the agency, always named in
 * the registry. On the apex it is the operator, and there is no honest name to
 * print until `NEXT_PUBLIC_SITE_NAME` is set — so it renders as a loud
 * placeholder, exactly like every other legal identifier left blank.
 */
function Editor({ name }: { name?: string }) {
  return <Field value={name}>nom de l&apos;éditeur</Field>;
}

/**
 * The copy of the two legal pages.
 *
 * Everything that identifies the client — name, address, contact — comes from
 * the agency record; every legal identifier only the operator can supply —
 * SIREN, carte professionnelle, garant financier, assureur, médiateur — comes
 * from its `legal` block and renders as a red placeholder for as long as it is
 * missing. Publishing a landing for a new client is therefore filling in that
 * block, not editing this file.
 */

/** Falls back to today's date rather than claiming a revision that never happened. */
export function legalUpdatedOn({ agency }: Landing): string {
  return (
    agency.legal.updatedOn?.trim() ||
    new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
  );
}

export function legalNotice(landing: Landing): LegalSection[] {
  const { agency, generic } = landing;
  const { legal } = agency;
  const mailto = (
    <a href={`mailto:${agency.email}`} className="underline underline-offset-2">
      {agency.email}
    </a>
  );

  /**
   * Loi Hoguet applies to whoever carries out the transaction, which on a
   * client's landing is the agency. The generic landing is published by the
   * operator of the estimator, who is not necessarily an estate agent — so the
   * section is omitted there rather than claiming a card that may not exist.
   * Re-enable it by setting `professionalCard` on the generic landing.
   */
  const regulated = !generic || Boolean(legal.professionalCard);

  return [
    {
      heading: "Éditeur du site",
      body: [
        <p key="p">
          Le présent site est édité par <Strong><Editor name={agency.name} /></Strong>,{" "}
          <Field value={legal.legalForm}>forme juridique</Field> au capital de{" "}
          <Field value={legal.capital}>montant</Field> euros, dont le siège social est situé{" "}
          {agency.address}.
        </p>,
        <LegalList
          key="l"
          items={[
            <>
              Immatriculée au Registre du commerce et des sociétés de{" "}
              <Field value={legal.rcsCity}>ville du greffe</Field> sous le numéro SIREN{" "}
              <Field value={legal.siren}>000 000 000</Field> (SIRET{" "}
              <Field value={legal.siret}>000 000 000 00000</Field>, code APE{" "}
              <Field value={legal.ape}>6831Z</Field>).
            </>,
            <>
              Numéro de TVA intracommunautaire : <Field value={legal.vat}>FR00 000000000</Field>.
            </>,
            <>
              Téléphone : {agency.phone} — Courriel : {mailto}.
            </>,
            <>
              Directeur de la publication :{" "}
              <Field value={legal.publisher}>nom du représentant légal</Field>.
            </>,
          ]}
        />,
      ],
    },
    ...(regulated ? [regulatedSection(landing)] : []),
    {
      heading: "Hébergement",
      body: [
        <p key="p">
          Le site est hébergé par <Strong>Vercel Inc.</Strong>, 440&nbsp;N Barranca Avenue
          #4133, Covina, CA&nbsp;91723, États-Unis. Assistance :{" "}
          <a
            href="https://vercel.com/help"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            vercel.com/help
          </a>
          .
        </p>,
      ],
    },
    {
      heading: "Propriété intellectuelle",
      body: [
        <p key="p1">
          L&apos;ensemble des contenus du site — textes, éléments graphiques, logo, interface et
          code — est la propriété exclusive de <Editor name={agency.name} /> ou de ses partenaires et est protégé
          par le Code de la propriété intellectuelle. Toute reproduction, représentation,
          adaptation ou exploitation, totale ou partielle, sans autorisation écrite préalable, est
          interdite.
        </p>,
        <p key="p2">
          Les prix de vente proviennent de la base «&nbsp;Demande de valeurs foncières&nbsp;» (DVF)
          publiée par la Direction générale des finances publiques sous Licence ouverte Etalab 2.0.
          La recherche d&apos;adresse s&apos;appuie sur la Base Adresse Nationale, également sous
          licence ouverte. Le fond cartographique est fourni par OpenStreetMap et ses contributeurs
          (licence ODbL) ou, lorsqu&apos;une clé est configurée, par Google&nbsp;Maps.
        </p>,
      ],
    },
    {
      heading: "Estimation en ligne",
      body: [
        <p key="p">
          L&apos;estimation proposée est une évaluation <Strong>indicative et automatique</Strong>,
          calculée à partir de ventes passées enregistrées dans la base DVF. Elle ne constitue ni
          une expertise, ni un avis de valeur, ni un engagement de <Editor name={agency.name} /> sur un prix de
          vente ou d&apos;achat. Seule la visite du bien par un conseiller permet une évaluation
          ferme. <Editor name={agency.name} /> ne saurait être tenue responsable d&apos;une décision prise sur le
          seul fondement de la fourchette affichée.
        </p>,
      ],
    },
    {
      heading: "Responsabilité",
      body: [
        <p key="p">
          <Editor name={agency.name} /> s&apos;efforce d&apos;assurer l&apos;exactitude et la mise à jour des
          informations diffusées, sans pouvoir le garantir. L&apos;éditeur ne peut être tenu
          responsable des erreurs ou omissions, d&apos;une indisponibilité temporaire du service,
          ni des dommages résultant de l&apos;utilisation du site ou de sites tiers vers lesquels
          des liens sont proposés.
        </p>,
      ],
    },
    {
      heading: "Données personnelles et cookies",
      body: [
        <p key="p1">
          Les traitements de données à caractère personnel réalisés à partir de ce site sont
          détaillés dans la{" "}
          <a href={`${landing.basePath}/privacy`} className="underline underline-offset-2">
            politique de confidentialité
          </a>
          . Conformément au Règlement général sur la protection des données (RGPD) et à la loi
          «&nbsp;Informatique et Libertés&nbsp;», vous disposez de droits d&apos;accès, de
          rectification, d&apos;effacement, d&apos;opposition, de limitation et de portabilité, que
          vous pouvez exercer à l&apos;adresse {mailto}.
        </p>,
        <p key="p2">
          Le site ne dépose que les traceurs strictement nécessaires à son fonctionnement, qui ne
          requièrent pas votre consentement préalable&nbsp;; aucun cookie de mesure d&apos;audience
          ou de publicité n&apos;est utilisé. Lorsqu&apos;une carte Google&nbsp;Maps est affichée,
          ou lorsque le module de prise de rendez-vous est chargé, ces services sont susceptibles de
          déposer leurs propres traceurs, relevant de leurs politiques de confidentialité
          respectives.
        </p>,
      ],
    },
    {
      heading: "Médiation de la consommation",
      body: [
        <p key="p">
          Conformément aux articles L.612-1 et suivants du Code de la consommation, tout client
          ayant la qualité de consommateur peut recourir gratuitement au médiateur de la
          consommation dont relève <Editor name={agency.name} /> :{" "}
          <Field value={legal.mediator}>nom du médiateur, adresse postale, site internet</Field>. La
          saisine du médiateur doit être précédée d&apos;une réclamation écrite adressée à{" "}
          <Editor name={agency.name} /> restée sans réponse satisfaisante sous deux mois.
        </p>,
      ],
    },
    {
      heading: "Droit applicable",
      body: [
        <p key="p">
          Le présent site et les présentes mentions légales sont soumis au droit français. À
          défaut de résolution amiable, tout litige relève de la compétence des tribunaux
          français.
        </p>,
      ],
    },
    {
      heading: "Contact",
      body: [
        <p key="p">
          <Editor name={agency.name} />, {agency.address}. Téléphone : {agency.phone}. Courriel : {mailto}.
        </p>,
      ],
    },
  ];
}

/**
 * Loi Hoguet — only for a landing whose publisher actually carries out the
 * transaction, which is every client agency but not necessarily the operator of
 * the generic page.
 */
function regulatedSection({ agency }: Landing): LegalSection {
  const { legal } = agency;

  return {
    heading: "Activité réglementée",
    body: [
      <p key="p1">
        <Editor name={agency.name} /> exerce l&apos;activité de transaction sur immeubles et fonds de commerce,
        encadrée par la loi n&nbsp;° 70-9 du 2&nbsp;janvier 1970 dite «&nbsp;loi Hoguet&nbsp;» et
        par son décret d&apos;application n&nbsp;° 72-678 du 20&nbsp;juillet 1972.
      </p>,
      <LegalList
        key="l"
        items={[
          <>
            Carte professionnelle «&nbsp;Transactions sur immeubles et fonds de commerce&nbsp;»
            n&nbsp;° <Field value={legal.professionalCard}>numéro de carte</Field>, délivrée par la
            CCI de <Field value={legal.cardIssuer}>CCI émettrice</Field>.
          </>,
          <>
            Garantie financière souscrite auprès de{" "}
            <Field value={legal.guarantor}>organisme garant, adresse</Field> pour un montant de{" "}
            <Field value={legal.guarantorAmount}>montant</Field> euros.
          </>,
          <>
            Assurance de responsabilité civile professionnelle souscrite auprès de{" "}
            <Field value={legal.insurer}>assureur, adresse</Field>, police n&nbsp;°{" "}
            <Field value={legal.insurancePolicy}>numéro</Field>, couvrant le territoire français.
          </>,
          <>
            Maniement de fonds :{" "}
            <Field value={legal.fundsHandling}>
              préciser si l&apos;agence est ou non habilitée à recevoir des fonds
            </Field>
            .
          </>,
        ]}
      />,
    ],
  };
}

export function privacyPolicy(landing: Landing): LegalSection[] {
  const { agency } = landing;
  const { legal } = agency;
  const crmName = legal.crmName?.trim() || "Go High Level";
  const mailto = (
    <a href={`mailto:${agency.email}`} className="underline underline-offset-2">
      {agency.email}
    </a>
  );

  return [
    {
      heading: "Responsable du traitement",
      body: [
        <p key="p1">
          Le responsable des traitements décrits ci-dessous est <Strong><Editor name={agency.name} /></Strong>,{" "}
          {agency.address}.
        </p>,
        <p key="p2">
          Pour toute question relative à vos données ou pour exercer vos droits : {mailto} ou{" "}
          {agency.phone}. Le cas échéant, un délégué à la protection des données peut être contacté
          à la même adresse : <Field value={legal.dpo}>coordonnées du DPO, si désigné</Field>.
        </p>,
      ],
    },
    {
      heading: "Données que nous collectons",
      body: [
        <p key="p1">Lorsque vous demandez une estimation, nous recueillons :</p>,
        <LegalList
          key="l1"
          items={[
            <>
              <Strong>Identité et coordonnées</Strong> : prénom, nom, adresse électronique, numéro
              de téléphone.
            </>,
            <>
              <Strong>Informations sur le bien</Strong> : adresse, type (appartement, maison,
              terrain), surface, étage et caractère de dernier étage, surface du terrain, état
              général, équipements (ascenseur, parking, extérieur, garage, piscine, vue mer),
              viabilisation.
            </>,
            <>
              <Strong>Contexte du projet</Strong> : qualité de propriétaire, échéance de vente
              envisagée.
            </>,
            <>
              <Strong>Résultat calculé</Strong> : fourchette de prix et éléments de calcul associés
              à votre demande.
            </>,
          ]}
        />,
        <p key="p2">
          Nous collectons également des <Strong>données techniques</Strong> (adresse IP, journaux
          de connexion, type de navigateur et d&apos;appareil) strictement nécessaires à la
          sécurité et au bon fonctionnement du service.
        </p>,
        <p key="p3">
          Le parcours d&apos;estimation conserve temporairement vos réponses dans la mémoire de
          session de votre navigateur afin de ne pas les perdre si vous revenez à une étape
          précédente. Ces informations restent sur votre appareil et sont effacées à la fermeture
          de l&apos;onglet.
        </p>,
      ],
    },
    {
      heading: "Pourquoi nous les utilisons",
      body: [
        <LegalList
          key="l"
          items={[
            <>
              Calculer et vous transmettre votre estimation en ligne — exécution de mesures
              précontractuelles prises à votre demande (art.&nbsp;6.1.b RGPD).
            </>,
            <>
              Vous recontacter afin d&apos;affiner cette estimation lors d&apos;un rendez-vous et
              vous accompagner dans votre projet — votre consentement, recueilli à l&apos;envoi du
              formulaire (art.&nbsp;6.1.a), et l&apos;intérêt légitime de l&apos;agence à
              développer son activité (art.&nbsp;6.1.f).
            </>,
            <>
              Assurer par courriel, téléphone ou message le suivi de votre demande et vous informer
              de l&apos;évolution du marché — mêmes bases légales.
            </>,
            <>
              Améliorer et sécuriser le service et produire des statistiques internes agrégées —
              intérêt légitime.
            </>,
            <>
              Respecter nos obligations légales et comptables — obligation légale
              (art.&nbsp;6.1.c).
            </>,
          ]}
        />,
        <p key="p">
          Vous pouvez retirer votre consentement à tout moment&nbsp;; ce retrait ne remet pas en
          cause les traitements effectués auparavant.
        </p>,
      ],
    },
    {
      heading: "Qui a accès à vos données",
      body: [
        <LegalList
          key="l"
          items={[
            <>Les équipes habilitées de <Editor name={agency.name} />.</>,
            <>
              Nos sous-traitants techniques, agissant sur nos seules instructions : notre hébergeur
              Vercel&nbsp;Inc. (hébergement et journalisation) et notre outil de gestion de la
              relation client, {crmName}, qui reçoit votre demande et héberge également le module
              de prise de rendez-vous.
            </>,
            <>
              Le service public de la Base Adresse Nationale, qui reçoit le texte saisi dans le
              champ de recherche d&apos;adresse pour renvoyer des suggestions, sans accès à
              aucune autre donnée.
            </>,
          ]}
        />,
        <p key="p">
          Nous ne vendons ni ne louons vos données. Elles peuvent être communiquées aux autorités
          administratives ou judiciaires lorsque la loi l&apos;impose.
        </p>,
      ],
    },
    {
      heading: "Transferts hors de l'Union européenne",
      body: [
        <p key="p">
          L&apos;hébergement est assuré par Vercel&nbsp;Inc. et la gestion de la relation client
          par {crmName}, établis aux États-Unis. Les transferts qui en résultent sont encadrés par
          les clauses contractuelles types de la Commission européenne et, le cas échéant, par
          l&apos;adhésion de l&apos;importateur au Data Privacy Framework UE–États-Unis.
        </p>,
      ],
    },
    {
      heading: "Combien de temps nous les conservons",
      body: [
        <LegalList
          key="l"
          items={[
            <>
              Coordonnées et données de projet des prospects : trois ans à compter de votre dernier
              contact.
            </>,
            <>
              Demandes ayant donné lieu à une relation contractuelle : durée de la relation, puis
              archivage selon les délais légaux (notamment dix ans pour les pièces comptables).
            </>,
            <>Journaux techniques : jusqu&apos;à douze mois.</>,
          ]}
        />,
        <p key="p">À l&apos;issue de ces durées, les données sont supprimées ou anonymisées.</p>,
      ],
    },
    {
      heading: "Vos droits",
      body: [
        <p key="p1">
          Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de
          limitation, d&apos;opposition — notamment à la prospection commerciale —, de portabilité,
          du droit de retirer votre consentement et de celui de définir des directives relatives au
          sort de vos données après votre décès.
        </p>,
        <p key="p2">
          Pour les exercer, écrivez à {mailto} ou à {agency.address}. Une preuve d&apos;identité
          peut être demandée en cas de doute raisonnable. Nous répondons dans un délai d&apos;un
          mois.
        </p>,
        <p key="p3">
          Vous pouvez également introduire une réclamation auprès de la CNIL — 3&nbsp;place de
          Fontenoy, TSA&nbsp;80715, 75334&nbsp;Paris Cedex&nbsp;07,{" "}
          <a
            href="https://www.cnil.fr"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            www.cnil.fr
          </a>
          .
        </p>,
      ],
    },
    {
      heading: "Sécurité",
      body: [
        <p key="p">
          Nous mettons en œuvre des mesures techniques et organisationnelles appropriées :
          chiffrement des échanges (HTTPS), accès restreint aux seules personnes habilitées,
          hébergement dans des centres de données sécurisés.
        </p>,
      ],
    },
    {
      heading: "Modifications",
      body: [
        <p key="p">
          La présente politique peut être mise à jour pour refléter une évolution du service ou de
          la réglementation. La date de dernière mise à jour figure en tête de page.
        </p>,
      ],
    },
  ];
}
