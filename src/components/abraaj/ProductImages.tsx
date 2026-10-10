import { useEffect, useState } from "react";
import type { Product } from "@/lib/abraaj-data";

const CYCLE_MS = 3200;

/** Small stable number from an id, so neighbouring cards don't all flip on the same beat. */
function seedOf(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 1200;
}

/**
 * Index of the photo currently showing. Auto-advances through `count` photos, starts
 * after a per-product offset (staggered), pauses while the tab is hidden, and does not
 * slow down for people who prefer reduced motion.
 */
export function useImageCycle(count: number, id: string) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (count < 2) return;
    // Reduced-motion users still get the photos rotating (the swap is instant, no fade /
    // scale — see `motion-reduce:transition-none`), just at a calmer pace.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const every = reduced ? CYCLE_MS * 2 : CYCLE_MS;
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      setIndex((i) => (i + 1) % count);
      interval = setInterval(() => {
        if (!document.hidden) setIndex((i) => (i + 1) % count);
      }, every);
    }, every - seedOf(id));
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [count, id]);

  return index;
}

/**
 * All of a product's photos stacked in one spot; only the active one is visible, the rest
 * crossfade (with a slight scale) underneath. `className` is applied to every <img>, so
 * the caller controls position and size exactly as it did for the single image.
 */
export function ProductImageStack({
  product,
  index,
  className,
}: {
  product: Product;
  index: number;
  className: string;
}) {
  return (
    <>
      {product.images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={i === 0 ? product.name : ""}
          aria-hidden={i === 0 ? undefined : true}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={`${className} transition-[opacity,transform] duration-700 ease-in-out motion-reduce:transition-none ${
            i === index ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />
      ))}
    </>
  );
}

/** Little pager dots for the current photo. Decorative — not interactive. */
export function ImageDots({
  count,
  index,
  className = "",
  on = "bg-brand",
  off = "bg-brand/25",
}: {
  count: number;
  index: number;
  className?: string;
  on?: string;
  off?: string;
}) {
  if (count < 2) return null;
  return (
    <div aria-hidden="true" className={`absolute inset-x-0 z-10 flex justify-center gap-1 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={`h-1 rounded-full transition-all duration-500 ${i === index ? `w-3.5 ${on}` : `w-1 ${off}`}`}
        />
      ))}
    </div>
  );
}

/**
 * A product photo that auto-cycles through ALL of the product's photos, for any place that
 * used to show a single static `product.image` (cart lines, thumbnails, mosque / about cards).
 * The wrapper is `relative`; size it with `className` (e.g. "h-16 w-16"). Photos fill it and
 * keep their aspect ratio. Pass `dots` to show the little pager dots.
 */
export function CyclingImage({
  product,
  className = "",
  imgClassName = "",
  dots = false,
  dotsClassName = "bottom-0",
}: {
  product: Product;
  className?: string;
  imgClassName?: string;
  dots?: boolean;
  dotsClassName?: string;
}) {
  const index = useImageCycle(product.images.length, product.id);
  return (
    <div className={`relative ${className}`}>
      <ProductImageStack
        product={product}
        index={index}
        className={`absolute inset-0 h-full w-full object-contain ${imgClassName}`}
      />
      {dots && <ImageDots count={product.images.length} index={index} className={dotsClassName} />}
    </div>
  );
}
