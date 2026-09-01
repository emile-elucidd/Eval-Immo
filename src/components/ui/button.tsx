import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "accent" | "outline" | "ghost";
type Size = "sm" | "md" | "lg" | "xl" | "icon";

const base =
  "inline-flex items-center justify-center gap-3 rounded-md font-medium transition-all hover:brightness-95 focus:outline-dashed focus:outline-2 focus:outline-offset-2 focus:outline-primary focus-visible:outline-dashed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground",
  accent: "bg-accent text-accent-foreground",
  outline: "border border-input bg-background hover:text-accent-foreground",
  ghost: "hover:bg-accent hover:text-accent-foreground",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 py-2 text-sm",
  md: "h-9 px-4 py-[22px] text-base",
  lg: "h-12 px-8 text-lg",
  xl: "h-12 px-8 text-xl md:h-14",
  icon: "h-10 w-10",
};

type CommonProps = { variant?: Variant; size?: Size; className?: string };

export function buttonClasses({ variant = "primary", size = "sm", className }: CommonProps) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant,
  size,
  className,
  ...props
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={buttonClasses({ variant, size, className })} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  href,
  ...props
}: CommonProps & React.ComponentProps<typeof Link>) {
  return (
    <Link href={href} role="link" className={buttonClasses({ variant, size, className })} {...props} />
  );
}
