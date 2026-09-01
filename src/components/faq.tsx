"use client";

import * as Accordion from "@radix-ui/react-accordion";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { useLandingHref } from "@/lib/tenant/context";

export type FaqItem = { question: string; answer: React.ReactNode };

export function Faq({ items }: { items: FaqItem[] }) {
  const href = useLandingHref();

  return (
    <div className="py-12 lg:py-16">
      <div className="mx-auto w-full max-w-6xl px-4">
        {/* Title column stays put while the questions scroll past it on desktop. */}
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-20">
          <div className="flex flex-col items-start gap-6 lg:w-1/3">
            <h2 className="text-2xl leading-tight font-black tracking-tight text-balance sm:text-3xl lg:text-4xl">
              Questions fréquentes
            </h2>
            <ButtonLink
              href={href("/rendez-vous")}
              variant="outline"
              size="lg"
              className="font-bold"
            >
              Parler à un expert
            </ButtonLink>
          </div>

          <div className="lg:w-2/3">
            <Accordion.Root
              type="single"
              collapsible
              className="flex flex-col gap-1"
            >
              {items.map((item, index) => (
                <Accordion.Item key={item.question} value={`item-${index}`}>
                  <Accordion.Header className="flex">
                    <Accordion.Trigger className="group flex flex-1 items-center justify-between gap-4 py-5 text-left text-[15px] font-bold focus:outline-none sm:text-base md:text-lg">
                      {item.question}
                      <Plus className="h-4 w-4 shrink-0 text-primary group-data-[state=open]:hidden" />
                      <Minus className="hidden h-4 w-4 shrink-0 text-primary group-data-[state=open]:block" />
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content className="overflow-hidden text-base data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                    <div className="pb-5 leading-relaxed text-muted-foreground">{item.answer}</div>
                  </Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion.Root>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FaqLink({ children }: { children: React.ReactNode }) {
  const href = useLandingHref();

  return (
    <Link href={href("/rendez-vous")} className="text-primary underline hover:opacity-80">
      {children}
    </Link>
  );
}
