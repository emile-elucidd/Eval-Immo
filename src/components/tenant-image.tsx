import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * A picture that comes from the client registry.
 *
 * Which means its host is not known at build time: an agency photo may sit in
 * `/public`, or be served by whatever CDN the CMS or Go High Level uses. Local
 * paths go through `next/image` and get optimised; absolute URLs are rendered
 * as a plain `<img>`, because putting them through the optimiser would mean
 * either declaring every possible host in `next.config.ts` or opening it to
 * all of them.
 */

export function isRemote(src: string): boolean {
  return /^https?:\/\//i.test(src);
}

export function TenantImage({
  src,
  alt,
  className,
  /** Fills the nearest positioned ancestor, like `next/image`'s own `fill`. */
  fill,
  priority,
  sizes,
  width,
  height,
}: {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
}) {
  if (isRemote(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        width={width}
        height={height}
        className={cn(fill && "absolute inset-0 h-full w-full", className)}
      />
    );
  }

  if (fill) {
    return (
      <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className={className} />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 800}
      height={height ?? 1000}
      priority={priority}
      sizes={sizes}
      className={className}
    />
  );
}
