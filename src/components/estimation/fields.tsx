"use client";

import { useId, type ReactNode } from "react";
import { Check, Info, LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The furniture every step of the funnel is built from. One question fills the
 * screen at a time, so these are sized for that: a large question, an answer
 * you can hit with a thumb, and a single button to move on.
 */

export function StepTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-center text-2xl leading-tight font-black tracking-tight text-balance text-foreground sm:text-3xl">
      {children}
    </h1>
  );
}

export function StepSubtitle({ children }: { children: ReactNode }) {
  return <p className="-mt-4 text-center text-base text-muted-foreground">{children}</p>;
}

/** The grey aside that explains why a question is being asked. */
export function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full gap-3 rounded-md bg-muted/70 p-4 text-sm leading-relaxed text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export type Choice<T extends string> = {
  value: T;
  label: string;
  hint?: string;
  icon?: ReactNode;
};

/**
 * A list of mutually exclusive answers. Picking one is the answer *and* the
 * submit, which is what makes the funnel feel like a conversation rather than a
 * form — so there is no continue button on these steps.
 */
export function ChoiceList<T extends string>({
  choices,
  value,
  onSelect,
  columns = 1,
}: {
  choices: Choice<T>[];
  value?: T;
  onSelect: (value: T) => void;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "grid w-full gap-3",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-3",
      )}
    >
      {choices.map((choice) => {
        const selected = value === choice.value;
        return (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(choice.value)}
            className={cn(
              "flex items-center gap-4 rounded-md border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-sm focus:outline-dashed focus:outline-2 focus:outline-offset-2 focus:outline-primary",
              selected ? "border-primary ring-1 ring-primary" : "border-border",
              columns > 1 && "flex-col items-center gap-3 p-6 text-center",
            )}
          >
            {choice.icon ? (
              <span className={cn("shrink-0 text-primary", columns > 1 && "text-3xl")}>
                {choice.icon}
              </span>
            ) : null}
            <span className="flex flex-col gap-1">
              <span className="text-base font-bold text-foreground">{choice.label}</span>
              {choice.hint ? (
                <span className="text-sm text-muted-foreground">{choice.hint}</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Non-exclusive answers — the "does it also have…" step. */
export function CheckList<T extends string>({
  choices,
  values,
  onToggle,
}: {
  choices: Choice<T>[];
  values: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="grid w-full gap-3 sm:grid-cols-2">
      {choices.map((choice) => {
        const checked = values.includes(choice.value);
        return (
          <button
            key={choice.value}
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => onToggle(choice.value)}
            className={cn(
              "flex items-center gap-3 rounded-md border bg-card p-4 text-left transition-all hover:border-primary focus:outline-dashed focus:outline-2 focus:outline-offset-2 focus:outline-primary",
              checked ? "border-primary ring-1 ring-primary" : "border-border",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border",
                checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
              )}
            >
              {checked ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
            </span>
            {choice.icon ? <span className="shrink-0 text-primary">{choice.icon}</span> : null}
            <span className="text-base font-medium text-foreground">{choice.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function NumberField({
  label,
  suffix,
  value,
  onChange,
  onEnter,
  error,
  autoFocus,
}: {
  label: string;
  suffix: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  onEnter?: () => void;
  error?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  return (
    <div className="w-full">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div
        className={cn(
          "flex items-center rounded-md border bg-card px-5",
          error ? "border-destructive" : "border-border focus-within:border-primary",
        )}
      >
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          autoFocus={autoFocus}
          value={value ?? ""}
          onChange={(event) => {
            const next = event.target.value;
            onChange(next === "" ? undefined : Number(next));
          }}
          onKeyDown={(event) => event.key === "Enter" && onEnter?.()}
          className="h-16 w-full appearance-none bg-transparent text-center text-3xl font-black tabular-nums text-foreground outline-none [appearance:textfield] placeholder:font-normal placeholder:text-muted-foreground [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          placeholder="0"
        />
        <span className="shrink-0 text-xl font-bold text-muted-foreground">{suffix}</span>
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

export function TextField({
  label,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
  icon,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  icon?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="w-full">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      <div
        className={cn(
          "flex items-center gap-3 rounded-md border bg-card px-4",
          error ? "border-destructive" : "border-border focus-within:border-primary",
        )}
      >
        {icon ? <span className="shrink-0 text-muted-foreground">{icon}</span> : null}
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
      {error ? <p className="mt-1.5 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

/** The one action on a step. Sticky at the bottom on mobile, where the fold is short. */
export function ContinueButton({
  children,
  onClick,
  loading,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-md bg-primary px-8 text-lg font-bold text-primary-foreground transition-all hover:brightness-110 focus:outline-dashed focus:outline-2 focus:outline-offset-2 focus:outline-primary disabled:pointer-events-none disabled:opacity-50"
    >
      {loading ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
