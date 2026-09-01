"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Car,
  CircleCheckBig,
  Droplet,
  Hammer,
  House,
  Layers,
  Mail,
  Phone,
  Sparkles,
  SquareParking,
  Trees,
  User,
  Waves,
} from "lucide-react";

import { AddressAutocomplete, type Suggestion } from "@/components/address-autocomplete";
import { AddressMap } from "@/components/estimation/address-map";
import { Calculating } from "@/components/estimation/calculating";
import { FloorPicker } from "@/components/estimation/floor-picker";
import {
  Callout,
  CheckList,
  ChoiceList,
  ContinueButton,
  NumberField,
  StepSubtitle,
  StepTitle,
  TextField,
  type Choice,
} from "@/components/estimation/fields";
import { ResultView } from "@/components/estimation/result-view";
import { ButtonLink } from "@/components/ui/button";
import { useLanding, useLandingHref } from "@/lib/tenant/context";
import type {
  Address,
  Annex,
  Condition,
  EstimationResult,
  Project,
  PropertyType,
} from "@/lib/estimation";

/**
 * The estimation funnel: one question per screen, in the order that keeps a
 * visitor moving — what and where before who, and the price only once we know
 * who is asking.
 *
 * The result is deliberately not computed here. The browser holds the answers;
 * `/api/estimation` holds the model and refuses to price anything until the
 * contact step has been filled in, so the gate cannot be walked around by
 * reading the page source or replaying a request.
 */

type Step =
  | "address"
  | "address-validation"
  | "property-type"
  | "property-size"
  | "property-details"
  | "property-condition"
  | "property-annex"
  | "owner"
  | "project"
  | "calculation"
  | "contact"
  | "result";

/** Progress shown in the bar, per step. */
const PROGRESS: Record<Step, number> = {
  address: 5,
  "address-validation": 10,
  "property-type": 20,
  "property-size": 30,
  "property-details": 40,
  "property-condition": 45,
  "property-annex": 50,
  owner: 65,
  project: 70,
  calculation: 75,
  contact: 80,
  result: 100,
};

const TYPE_CHOICES: Choice<PropertyType>[] = [
  { value: "apartment", label: "Appartement", icon: <Building2 className="h-8 w-8" aria-hidden /> },
  { value: "house", label: "Maison", icon: <House className="h-8 w-8" aria-hidden /> },
  { value: "field", label: "Terrain constructible", icon: <Trees className="h-8 w-8" aria-hidden /> },
];

const CONDITION_CHOICES: Choice<Condition>[] = [
  {
    value: "poor",
    label: "À rénover",
    hint: "Rénové il y a plus de 10 ans, pièces d'eau dégradées ou isolation médiocre.",
    icon: <Hammer className="h-6 w-6" aria-hidden />,
  },
  {
    value: "standard",
    label: "Standard",
    hint: "Rénové il y a plus de 5 ans, les peintures pourraient être rafraîchies.",
    icon: <CircleCheckBig className="h-6 w-6" aria-hidden />,
  },
  {
    value: "excellent",
    label: "Refait à neuf",
    hint: "Rénové il y a moins de 5 ans, prestations modernes et équipements récents.",
    icon: <Sparkles className="h-6 w-6" aria-hidden />,
  },
];

const APARTMENT_ANNEXES: Choice<Annex>[] = [
  { value: "elevator", label: "Ascenseur", icon: <Layers className="h-5 w-5" aria-hidden /> },
  { value: "parking", label: "Parking", icon: <SquareParking className="h-5 w-5" aria-hidden /> },
  { value: "exterior", label: "Espace extérieur", icon: <Trees className="h-5 w-5" aria-hidden /> },
  { value: "seaView", label: "Vue mer", icon: <Waves className="h-5 w-5" aria-hidden /> },
];

const HOUSE_ANNEXES: Choice<Annex>[] = [
  { value: "garage", label: "Garage", icon: <Car className="h-5 w-5" aria-hidden /> },
  { value: "parking", label: "Parking", icon: <SquareParking className="h-5 w-5" aria-hidden /> },
  { value: "pool", label: "Piscine", icon: <Droplet className="h-5 w-5" aria-hidden /> },
  { value: "exterior", label: "Espace extérieur", icon: <Trees className="h-5 w-5" aria-hidden /> },
  { value: "seaView", label: "Vue mer", icon: <Waves className="h-5 w-5" aria-hidden /> },
];

const PROJECT_CHOICES: Choice<Project>[] = [
  { value: "LESS_THREE_MONTHS", label: "Oui, dans moins de 3 mois" },
  { value: "MORE_THREE_MONTHS", label: "Oui, dans plus de 3 mois" },
  { value: "ON_SALE", label: "Le bien est déjà en vente" },
  { value: "NON_SELLER", label: "Je ne souhaite pas vendre" },
];

type Contact = { firstName: string; lastName: string; email: string; phone: string };

const EMPTY_CONTACT: Contact = { firstName: "", lastName: "", email: "", phone: "" };

const API_ERRORS: Record<string, string> = {
  missingName: "Veuillez renseigner votre nom et votre prénom",
  invalidEmail: "Veuillez renseigner un email valide",
  invalidPhone: "Veuillez renseigner un numéro de téléphone valide",
};

/** Refusals that deserve their own screen rather than a line under the form. */
const NO_RESULT: Record<string, string> = {
  notEnoughData:
    "Nous n'avons pas trouvé assez de ventes récentes autour de cette adresse pour calculer une pré-estimation fiable. Plutôt qu'un chiffre approximatif, nous préférons vous proposer une estimation sur place.",
  notPublished:
    "Les ventes de ce département ne sont pas publiées dans la base nationale des valeurs foncières : l'Alsace-Moselle et Mayotte relèvent du livre foncier. Nous ne pouvons donc pas calculer de pré-estimation en ligne à cette adresse.",
};

/**
 * The funnel lives at a single URL, so on its own the browser's back button —
 * or a phone's back gesture — walks straight out of it and every answer is
 * lost. Two things keep the work safe: each answer is mirrored to the tab's
 * session storage and restored on a reload or a return to the page, and each
 * step forward pushes a history entry so "back" lands on the previous question
 * instead of leaving the funnel.
 */
const STORAGE_KEY = "estimation:progress";

type Progress = {
  step: Step;
  address: Address | null;
  type?: PropertyType;
  surface?: number;
  floor: number;
  isLastFloor: boolean;
  fieldSurface?: number;
  isServiced?: boolean;
  condition?: Condition;
  annexes: Annex[];
  owner?: boolean;
  project?: Project;
  contact: Contact;
};

function readProgress(): Partial<Progress> {
  try {
    return JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Progress>;
  } catch {
    return {};
  }
}

function writeProgress(progress: Progress) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Private browsing or a full quota: the backup is a nicety, not worth a throw.
  }
}

function clearProgress() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // As above — nothing to do if the store is unavailable.
  }
}

export function Funnel({
  initialAddress,
  initialQuery = "",
}: {
  initialAddress: Address | null;
  initialQuery?: string;
}) {
  const { agency, city } = useLanding();
  const href = useLandingHref();

  // An address picked on the home page skips straight to its confirmation.
  const [step, setStep] = useState<Step>(initialAddress ? "address-validation" : "address");
  const [address, setAddress] = useState<Address | null>(initialAddress);

  const [type, setType] = useState<PropertyType>();
  const [surface, setSurface] = useState<number>();
  const [surfaceError, setSurfaceError] = useState<string>();
  const [floor, setFloor] = useState(2);
  const [isLastFloor, setIsLastFloor] = useState(false);
  const [fieldSurface, setFieldSurface] = useState<number>();
  const [isServiced, setIsServiced] = useState<boolean>();
  const [condition, setCondition] = useState<Condition>();
  const [annexes, setAnnexes] = useState<Annex[]>([]);
  const [owner, setOwner] = useState<boolean>();
  const [project, setProject] = useState<Project>();

  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT);
  const [contactError, setContactError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<EstimationResult>();
  const [noResult, setNoResult] = useState<string>();

  // Answers are only mirrored once the restore below has had its chance to run,
  // so the blank initial state never clobbers a saved funnel.
  const [hydrated, setHydrated] = useState(false);

  const goTo = useCallback((next: Step) => {
    setStep(next);
    if (typeof window !== "undefined") {
      window.history.pushState({ ...window.history.state, funnelStep: next }, "");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  // Bring a half-finished funnel back. Done in an effect rather than in the
  // initial state so the server and the first client render still agree; the
  // setState calls are a one-time sync from session storage, not a render loop.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from session storage */
    const saved = readProgress();
    // A fresh address picked on the home page starts a new estimation, even if
    // an older one is still sitting in session storage.
    const stale = initialAddress != null && saved.address?.label !== initialAddress.label;

    if (saved.step && !stale) {
      if (saved.address) setAddress(saved.address);
      if (saved.type) setType(saved.type);
      if (saved.surface !== undefined) setSurface(saved.surface);
      if (saved.floor !== undefined) setFloor(saved.floor);
      if (saved.isLastFloor !== undefined) setIsLastFloor(saved.isLastFloor);
      if (saved.fieldSurface !== undefined) setFieldSurface(saved.fieldSurface);
      if (saved.isServiced !== undefined) setIsServiced(saved.isServiced);
      if (saved.condition) setCondition(saved.condition);
      if (saved.annexes) setAnnexes(saved.annexes);
      if (saved.owner !== undefined) setOwner(saved.owner);
      if (saved.project) setProject(saved.project);
      if (saved.contact) setContact(saved.contact);
      // The calculation animation and the result screen are not places to land.
      setStep(saved.step === "calculation" || saved.step === "result" ? "contact" : saved.step);
    } else if (stale) {
      clearProgress();
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [initialAddress]);

  // Mirror every answer as it changes.
  useEffect(() => {
    if (!hydrated || step === "calculation" || step === "result") return;
    writeProgress({
      step,
      address,
      type,
      surface,
      floor,
      isLastFloor,
      fieldSurface,
      isServiced,
      condition,
      annexes,
      owner,
      project,
      contact,
    });
  }, [
    hydrated,
    step,
    address,
    type,
    surface,
    floor,
    isLastFloor,
    fieldSurface,
    isServiced,
    condition,
    annexes,
    owner,
    project,
    contact,
  ]);

  // Keep the current history entry tagged with the step on screen, so a back
  // that lands on it restores that step rather than a bare state object.
  useEffect(() => {
    window.history.replaceState({ ...window.history.state, funnelStep: step }, "");
  }, [step]);

  // The back button and the back gesture then move between steps, not off the page.
  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      const target = (event.state as { funnelStep?: Step } | null)?.funnelStep;
      if (!target) return;
      setNoResult(undefined);
      setStep(target);
      window.scrollTo({ top: 0 });
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function selectAddress(suggestion: Suggestion) {
    setAddress({ ...suggestion });
    goTo("address-validation");
  }

  /** The step before this one, given the answers so far. */
  const previous = useMemo<Step | null>(() => {
    switch (step) {
      case "address-validation":
        return "address";
      case "property-type":
        return "address-validation";
      case "property-size":
        return "property-type";
      case "property-details":
        return "property-size";
      case "property-condition":
        return type === "field" ? "property-size" : "property-details";
      case "property-annex":
        return "property-condition";
      case "owner":
        return type === "field" ? "property-details" : "property-annex";
      case "project":
        return "owner";
      case "contact":
        return "project";
      default:
        return null;
    }
  }, [step, type]);

  async function submit() {
    setContactError(undefined);

    if (contact.firstName.trim().length < 2 || contact.lastName.trim().length < 2) {
      return setContactError(API_ERRORS.missingName);
    }
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(contact.email.trim())) {
      return setContactError(API_ERRORS.invalidEmail);
    }
    if (!/^(?:\+33|0033|0)[1-9](?:[\s.-]?\d{2}){4}$/.test(contact.phone.trim())) {
      return setContactError(API_ERRORS.invalidPhone);
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/estimation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          // Which landing this lead came from, so the server knows whose CRM to
          // deliver it to. Re-checked there against the registry.
          landing: { agency: agency.slug, city: city.slug },
          contact,
          input: {
            address,
            property: {
              type,
              surface,
              floor: type === "apartment" ? floor : undefined,
              isLastFloor: type === "apartment" ? isLastFloor : undefined,
              fieldSurface: type === "house" ? fieldSurface : undefined,
              isServiced: type === "field" ? isServiced === true : undefined,
              condition: condition ?? "standard",
              annexes,
            },
            owner,
            project,
          },
        }),
      });

      const data = (await response.json()) as { result?: EstimationResult; error?: string };

      if (!response.ok || !data.result) {
        const blocking = NO_RESULT[data.error ?? ""];
        if (blocking) {
          // The lead is still worth having — the appointment is the way out.
          setNoResult(blocking);
          return;
        }
        setContactError(
          API_ERRORS[data.error ?? ""] ?? "Une erreur est survenue, veuillez réessayer.",
        );
        return;
      }

      // The estimation is done — a new one should start from a clean slate.
      clearProgress();
      setResult(data.result);
      goTo("result");
    } catch {
      setContactError("Une erreur est survenue, veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  if (noResult) {
    return (
      <Shell progress={100}>
        <StepTitle>Aucun résultat pour votre demande d&apos;estimation</StepTitle>
        <p className="text-center text-base leading-relaxed text-muted-foreground">{noResult}</p>
        <p className="text-center text-base leading-relaxed text-muted-foreground">
          Notre équipe reste joignable au {agency.phone} pour discuter de votre projet.
        </p>
        <ButtonLink href={href("/rendez-vous")} size="lg" className="font-bold">
          Prendre rendez-vous pour une estimation sur place
        </ButtonLink>
        <ButtonLink
          href={href("/")}
          variant="outline"
          size="lg"
          className="font-bold"
          onClick={clearProgress}
        >
          Estimer un bien à une autre adresse
        </ButtonLink>
      </Shell>
    );
  }

  if (step === "result" && result && address) {
    return (
      <Shell progress={100} wide>
        <ResultView address={address} result={result} firstName={contact.firstName.trim()} />
      </Shell>
    );
  }

  return (
    <Shell progress={PROGRESS[step]} onBack={previous ? () => goTo(previous) : undefined}>
      {step === "address" ? (
        <>
          <StepTitle>Quelle est l&apos;adresse du bien à estimer ?</StepTitle>
          <AddressAutocomplete
            autoFocus
            initialQuery={initialQuery}
            placeholder={city.sampleAddress ?? `12 rue du Château, ${city.name}`}
            near={city.name}
            onSelect={selectAddress}
          />
          <Callout>
            Nous avons besoin du numéro et de la voie : les prix varient fortement d&apos;une rue à
            l&apos;autre, et c&apos;est à cette précision que nous retrouvons les ventes réelles
            autour de chez vous.
          </Callout>
        </>
      ) : null}

      {step === "address-validation" && address ? (
        <>
          <StepTitle>Validez l&apos;adresse</StepTitle>
          <AddressMap address={address} />
          <ContinueButton onClick={() => goTo("property-type")}>Continuer</ContinueButton>
          <button
            type="button"
            onClick={() => goTo("address")}
            className="text-base font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Corriger l&apos;adresse
          </button>
        </>
      ) : null}

      {step === "property-type" ? (
        <>
          <StepTitle>De quel type de bien s&apos;agit-il ?</StepTitle>
          <ChoiceList
            columns={3}
            choices={TYPE_CHOICES}
            value={type}
            onSelect={(next) => {
              setType(next);
              setAnnexes([]);
              goTo("property-size");
            }}
          />
        </>
      ) : null}

      {step === "property-size" ? (
        <>
          <StepTitle>
            {type === "field"
              ? "Quelle est la surface de ce terrain ?"
              : type === "house"
                ? "Quelle est la surface habitable de cette maison ?"
                : "Quelle est la surface habitable de cet appartement ?"}
          </StepTitle>
          <NumberField
            autoFocus
            label="Surface"
            suffix="m²"
            value={surface}
            error={surfaceError}
            onChange={(next) => {
              setSurface(next);
              setSurfaceError(undefined);
            }}
            onEnter={validateSurface}
          />
          <Callout>
            {type === "field"
              ? "La surface du terrain correspond à la surface totale de la parcelle."
              : "Si vous avez un doute, une valeur approximative suffit. La surface demandée est celle des planchers d'une hauteur sous plafond supérieure à 1,80 m, hors sous-sols, greniers et espaces extérieurs."}
          </Callout>
          <ContinueButton onClick={validateSurface}>Continuer</ContinueButton>
        </>
      ) : null}

      {step === "property-details" ? (
        <>
          {type === "apartment" ? (
            <>
              <StepTitle>À quel étage se trouve cet appartement ?</StepTitle>
              <FloorPicker
                floor={floor}
                isLastFloor={isLastFloor}
                onFloorChange={setFloor}
                onLastFloorChange={setIsLastFloor}
              />
              <Callout>
                L&apos;étage pèse fortement sur le prix : il conditionne la luminosité, les
                nuisances sonores et la vue.
              </Callout>
              <ContinueButton onClick={() => goTo("property-condition")}>Continuer</ContinueButton>
            </>
          ) : type === "house" ? (
            <>
              <StepTitle>Quelle est la surface du terrain ?</StepTitle>
              <NumberField
                autoFocus
                label="Surface du terrain"
                suffix="m²"
                value={fieldSurface}
                onChange={setFieldSurface}
                onEnter={() => goTo("property-condition")}
              />
              <Callout>
                La surface du terrain comprend l&apos;emprise au sol de la maison et de ses annexes
                éventuelles.
              </Callout>
              <ContinueButton onClick={() => goTo("property-condition")}>Continuer</ContinueButton>
            </>
          ) : (
            <>
              <StepTitle>Ce terrain est-il déjà viabilisé ?</StepTitle>
              <ChoiceList
                columns={2}
                choices={[
                  { value: "yes", label: "Oui" },
                  { value: "no", label: "Non" },
                ]}
                value={isServiced === undefined ? undefined : isServiced ? "yes" : "no"}
                onSelect={(next) => {
                  setIsServiced(next === "yes");
                  goTo("owner");
                }}
              />
              <Callout>
                Un terrain viabilisé a été aménagé pour être prêt à la construction : accès aux
                réseaux d&apos;eau, d&apos;électricité et d&apos;assainissement, et accès routier.
              </Callout>
            </>
          )}
        </>
      ) : null}

      {step === "property-condition" ? (
        <>
          <StepTitle>Quel est l&apos;état de ce bien ?</StepTitle>
          <ChoiceList
            choices={CONDITION_CHOICES}
            value={condition}
            onSelect={(next) => {
              setCondition(next);
              goTo("property-annex");
            }}
          />
        </>
      ) : null}

      {step === "property-annex" ? (
        <>
          <StepTitle>
            {type === "house"
              ? "Cette maison possède-t-elle certaines de ces caractéristiques ?"
              : "Cet appartement possède-t-il certaines de ces caractéristiques ?"}
          </StepTitle>
          <StepSubtitle>Cochez les cases correspondantes</StepSubtitle>
          <CheckList
            choices={type === "house" ? HOUSE_ANNEXES : APARTMENT_ANNEXES}
            values={annexes}
            onToggle={(annex) =>
              setAnnexes((current) =>
                current.includes(annex)
                  ? current.filter((value) => value !== annex)
                  : [...current, annex],
              )
            }
          />
          <Callout>
            Ces caractéristiques sont facultatives, mais constituent des facteurs de plus-value à
            prendre en compte si le bien en est doté.
          </Callout>
          <ContinueButton onClick={() => goTo("owner")}>Continuer</ContinueButton>
        </>
      ) : null}

      {step === "owner" ? (
        <>
          <StepTitle>
            {type === "field"
              ? "Êtes-vous propriétaire de ce terrain ?"
              : type === "house"
                ? "Êtes-vous propriétaire de cette maison ?"
                : "Êtes-vous propriétaire de cet appartement ?"}
          </StepTitle>
          <ChoiceList
            columns={2}
            choices={[
              { value: "yes", label: "Oui" },
              { value: "no", label: "Non" },
            ]}
            value={owner === undefined ? undefined : owner ? "yes" : "no"}
            onSelect={(next) => {
              setOwner(next === "yes");
              goTo("project");
            }}
          />
        </>
      ) : null}

      {step === "project" ? (
        <>
          <StepTitle>
            {owner
              ? "Envisagez-vous de le vendre ?"
              : "Envisagez-vous de vendre un bien prochainement ?"}
          </StepTitle>
          <ChoiceList
            choices={PROJECT_CHOICES}
            value={project}
            onSelect={(next) => {
              setProject(next);
              // The animation is transient — no history entry, so "back" from the
              // contact step returns here rather than replaying the countdown.
              setStep("calculation");
              if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </>
      ) : null}

      {step === "calculation" ? <Calculating onDone={() => goTo("contact")} /> : null}

      {step === "contact" ? (
        <>
          <StepTitle>Votre estimation est prête</StepTitle>
          <StepSubtitle>
            Indiquez vos coordonnées pour l&apos;afficher et en recevoir une copie.
          </StepSubtitle>

          <div className="grid w-full gap-4 sm:grid-cols-2">
            <TextField
              label="Prénom"
              autoComplete="given-name"
              placeholder="Entrez votre prénom"
              icon={<User className="h-4 w-4" aria-hidden />}
              value={contact.firstName}
              onChange={(value) => setContact((c) => ({ ...c, firstName: value }))}
            />
            <TextField
              label="Nom"
              autoComplete="family-name"
              placeholder="Entrez votre nom"
              icon={<User className="h-4 w-4" aria-hidden />}
              value={contact.lastName}
              onChange={(value) => setContact((c) => ({ ...c, lastName: value }))}
            />
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="Entrez votre adresse email"
              icon={<Mail className="h-4 w-4" aria-hidden />}
              value={contact.email}
              onChange={(value) => setContact((c) => ({ ...c, email: value }))}
            />
            <TextField
              label="Numéro de téléphone"
              type="tel"
              autoComplete="tel"
              placeholder="Entrez votre numéro"
              icon={<Phone className="h-4 w-4" aria-hidden />}
              value={contact.phone}
              onChange={(value) => setContact((c) => ({ ...c, phone: value }))}
            />
          </div>

          {contactError ? (
            <p className="w-full text-sm text-destructive" role="alert">
              {contactError}
            </p>
          ) : null}

          <ContinueButton onClick={submit} loading={submitting}>
            Voir mon estimation
          </ContinueButton>

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            En cliquant sur « Voir mon estimation », vous obtenez votre pré-estimation en ligne et
            vous acceptez notre{" "}
            <a href={href("/privacy")} className="underline underline-offset-2">
              politique de confidentialité
            </a>
            . Vous acceptez que {agency.name} vous appelle pour affiner cette estimation avec vous,
            assure par courriel ou par texto le suivi de votre demande, vous conseille sur votre
            projet et vous informe de l&apos;évolution du marché.
          </p>
        </>
      ) : null}
    </Shell>
  );

  function validateSurface() {
    if (surface === undefined || Number.isNaN(surface)) {
      return setSurfaceError("Veuillez renseigner la surface");
    }
    if (surface < 5) return setSurfaceError("La surface doit être d'au moins 5 m²");
    if (surface > 100_000) return setSurfaceError("Veuillez renseigner une surface plus faible");
    setSurfaceError(undefined);
    goTo("property-details");
  }
}

/** Progress bar, back arrow, and the column every step is poured into. */
function Shell({
  progress,
  onBack,
  wide,
  children,
}: {
  progress: number;
  onBack?: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const { agency } = useLanding();
  const agencyName = agency.name;
  const homeHref = useLandingHref()("/");

  return (
    <div className="flex min-h-screen flex-col">
      <div className="sticky top-0 z-30 bg-background">
        <div className="h-1.5 w-full bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* The only way out of the funnel — everything else is the question at hand. */}
        <div className="mx-auto flex w-full max-w-2xl items-center px-4 py-4">
          <Link href={homeHref} className="flex h-8 items-center" aria-label="Accueil">
            <span className="text-sm font-black tracking-tight text-foreground">{agencyName}</span>
          </Link>
        </div>
      </div>

      <main
        className={`mx-auto flex w-full flex-1 flex-col items-center gap-6 px-4 pt-4 pb-24 ${
          wide ? "max-w-2xl" : "max-w-xl"
        }`}
      >
        <div className="flex h-6 w-full items-center">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Retour
            </button>
          ) : null}
        </div>
        {children}
      </main>
    </div>
  );
}
