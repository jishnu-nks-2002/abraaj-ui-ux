import { useState } from "react";
import { ChevronRight, Info } from "lucide-react";
import {
  DEAL_OFF,
  byId,
  dealPrices,
  money,
  type Product,
  type Showcase,
  type Tone,
} from "@/lib/abraaj-data";

/** Gradient + ribbon colours per product family. */
export const TONES: Record<
  Tone,
  { grad: string; ink: string; badge: string }
> = {
  blue: {
    grad: "from-[#0b2a6b] via-[#1a56b8] to-[#63c4ec]",
    ink: "text-[#0b2a6b]",
    badge: "bg-[#0b2a6b]",
  },

  red: {
    grad: "from-[#7d1024] via-[#c2213f] to-[#f5a7b4]",
    ink: "text-[#a5172f]",
    badge: "bg-[#a5172f]",
  },

  green: {
    grad: "from-[#04503b] via-[#0f8c5f] to-[#8fdcb4]",
    ink: "text-[#065c43]",
    badge: "bg-[#065c43]",
  },

  sand: {
    grad: "from-[#5c4626] via-[#a98753] to-[#ecdcc2]",
    ink: "text-[#6b5433]",
    badge: "bg-[#6b5433]",
  },
};

/**
 * Banner overlay is always blue-toned, regardless of the showcase's own tone.
 */
const BANNER_GRAD = TONES.blue.grad;

export function ShowcaseSection({
  showcase,
  onOpen,
  onSubscribe,
  onOneTime,
  onSeeAll,
}: {
  showcase: Showcase;
  onOpen: (p: Product) => void;
  onSubscribe: (p: Product) => void;
  onOneTime?: (p: Product) => void;
  onSeeAll: (filter: string) => void;
}) {
  const list = showcase.productIds
    .map(byId)
    .filter(Boolean) as Product[];

  return (
    <section className="mt-8 xs:mt-9">
      {/* Section heading */}
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />

        <h3 className="text-f-xs font-bold tracking-wide text-muted-foreground">
          {showcase.label}
        </h3>

        <span className="h-px flex-1 bg-border" />
      </div>

      {/* Full-bleed showcase banner */}
      <div className="mx-screen-neg relative mt-3 h-[clamp(13rem,54vw,16rem)] overflow-hidden xs:mt-4">
        {/* Background video */}
        {showcase.video && (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={showcase.video}
            poster={showcase.poster}
            preload="metadata"
            autoPlay
            muted
            loop
            playsInline
          />
        )}

        {/* Blue gradient overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-r ${BANNER_GRAD} ${
            showcase.video ? "opacity-70" : "opacity-90"
          }`}
          style={{
            maskImage:
              "linear-gradient(to right, black 35%, transparent 80%)",
            WebkitMaskImage:
              "linear-gradient(to right, black 35%, transparent 80%)",
          }}
        />

        {/* Subtle highlight */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_0%_0%,rgba(255,255,255,0.18),transparent_55%)]" />

        {/* Banner content */}
        <div className="px-screen relative flex h-full flex-col justify-center gap-3 pb-9 xs:pb-10">
          <div className="min-w-0 max-w-[80%]">
            <h4 className="text-f-base leading-snug font-bold text-balance text-white">
              {showcase.headline}
              <br />
              {showcase.headlineAccent}
            </h4>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={() => onSeeAll(showcase.filter)}
            className="inline-flex w-fit items-center gap-1 rounded-full bg-white px-3.5 py-2 text-f-2xs font-semibold whitespace-nowrap text-brand"
          >
            See all {showcase.label.toLowerCase()}
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {/* Bottom marquee strip */}
        <div className="absolute inset-x-0 bottom-0 overflow-hidden bg-black/20 py-1.5 backdrop-blur-sm">
          <div className="animate-marquee flex w-max items-center whitespace-nowrap">
            {[0, 1].map((dup) => (
              <div
                key={dup}
                className="flex shrink-0 items-center gap-10 pr-10"
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <span
                    key={i}
                    className="text-f-2xs font-bold tracking-wide text-white/90 uppercase"
                  >
                    {showcase.ribbon}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product cards */}
      <div className="mt-3 grid grid-cols-2 gap-2.5 xs:mt-4 xs:gap-3">
        {list.map((p, i) => (
          <DealCard
            key={`${showcase.id}-${p.id}`}
            product={p}
            delay={i * 60}
            onOpen={() => onOpen(p)}
            onSubscribe={() => onSubscribe(p)}
            onOneTime={() => onOneTime?.(p)}
          />
        ))}
      </div>

      {/* Bottom See All button */}
      <button
        type="button"
        onClick={() => onSeeAll(showcase.filter)}
        className="mt-3 flex w-full items-center justify-center gap-1 py-1 text-f-xs font-semibold text-brand"
      >
        See all {showcase.label.toLowerCase()}
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </section>
  );
}

export function DealCard({
  product,
  onOpen,
  onSubscribe,
  onOneTime,
  delay = 0,
}: {
  product: Product;
  onOpen: () => void;
  onSubscribe: () => void;
  onOneTime?: () => void;
  delay?: number;
}) {
  const { was, oneTime, sub } = dealPrices(product.price);

  const [purchaseType, setPurchaseType] = useState<
    "onetime" | "subscribe"
  >("subscribe");

  const handleCta = () => {
    if (purchaseType === "subscribe") {
      onSubscribe();
      return;
    }

    if (onOneTime) {
      onOneTime();
      return;
    }

    onSubscribe();
  };

  return (
    <div
      className="card-soft animate-rise relative flex min-w-0 flex-col rounded-2xl p-2.5 xs:p-3"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Discount badge */}
      <span className="absolute top-2.5 left-2.5 z-10 rounded-full bg-[#d31245] px-1.5 py-0.5 text-f-2xs font-extrabold tracking-wide text-white xs:px-2">
        {DEAL_OFF}% off
      </span>

      {/* Product information */}
      <button
        type="button"
        onClick={onOpen}
        className="w-full min-w-0 text-left"
      >
        {/* Product image */}
        <div className="grid h-[clamp(7.5rem,32vw,9.5rem)] place-items-center overflow-hidden rounded-xl px-2 pt-6 pb-1">
          <img
            src={product.image}
            alt={product.name}
            className="max-h-full w-auto object-contain"
          />
        </div>

        {/* Product name */}
        <p className="mt-2.5 line-clamp-2 min-h-[2.7em] text-f-xs font-bold text-brand">
          {product.name}
        </p>

        {/* Product pack */}
        <p className="truncate text-f-2xs text-muted-foreground">
          {product.pack}
        </p>
      </button>

      {/* Purchase options */}
      <div className="mt-2.5 overflow-hidden rounded-xl border border-border">
        {/* One time */}
        <button
          type="button"
          onClick={() => setPurchaseType("onetime")}
          aria-pressed={purchaseType === "onetime"}
          className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-1.5 px-2 py-1.5 text-left transition-colors xs:px-2.5 ${
            purchaseType === "onetime" ? "bg-brand-soft" : ""
          }`}
        >
          {/* Radio */}
          <span
            className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border-2 ${
              purchaseType === "onetime"
                ? "border-brand"
                : "border-border"
            }`}
          >
            {purchaseType === "onetime" && (
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            )}
          </span>

          {/* Label */}
          <span className="min-w-0 text-f-2xs text-muted-foreground">
            One time
          </span>

          {/* Price */}
          <span className="shrink-0 text-right leading-tight">
            <span className="block text-f-2xs text-muted-foreground line-through">
              {money(was)}
            </span>

            <span className="text-f-xs font-extrabold text-foreground">
              AED {money(oneTime)}
            </span>
          </span>
        </button>

        {/* Subscribe & save */}
        <button
          type="button"
          onClick={() => setPurchaseType("subscribe")}
          aria-pressed={purchaseType === "subscribe"}
          className={`grid w-full grid-cols-[auto_1fr_auto] items-start gap-x-1.5 gap-y-0.5 border-t border-border px-2 py-1.5 text-left transition-colors xs:px-2.5 ${
            purchaseType === "subscribe" ? "bg-brand-soft" : ""
          }`}
        >
          {/* Radio */}
          <span
            className={`mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border-2 ${
              purchaseType === "subscribe"
                ? "border-brand"
                : "border-border"
            }`}
          >
            {purchaseType === "subscribe" && (
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            )}
          </span>

          {/* Label + info icon */}
          <span className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5">
            <span className="text-f-2xs leading-tight font-semibold text-foreground">
              Subscribe &amp; save
            </span>

            <Info className="h-3 w-3 shrink-0 text-brand" />
          </span>

          {/* Subscription price */}
          <span className="shrink-0 text-f-xs font-extrabold text-brand">
            AED {money(sub)}
          </span>
        </button>
      </div>

      {/* Main CTA */}
      <button
        type="button"
        onClick={handleCta}
        className="mt-2.5 w-full rounded-xl bg-brand py-2.5 text-f-xs font-bold text-primary-foreground"
      >
        {purchaseType === "subscribe"
          ? "Subscribe now"
          : "Add to cart"}
      </button>
    </div>
  );
}