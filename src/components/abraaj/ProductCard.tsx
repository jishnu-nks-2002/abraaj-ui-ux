import { useState } from "react";
import { Info } from "lucide-react";
import { DEAL_OFF, dealPrices, money, type Product } from "@/lib/abraaj-data";
import { ImageDots, ProductImageStack, useImageCycle } from "@/components/abraaj/ProductImages";

/**
 * Premium product card used wherever products are listed (Popular now, Shop grid).
 *
 * Three looks share ONE behaviour — change `DEFAULT_VARIANT` below (or pass `variant`)
 * to switch the whole app:
 *
 *   "curve" – brand-colour panel cut by a big white circle, product across the seam.
 *   "halo"  – light aqua stage with soft rings and a glowing disc behind the product.
 *   "night" – full brand-navy card, product on a glowing aqua disc, glass option rows.
 *
 * Every product shows ALL of its photos (`product.images`) and auto-cycles through them
 * with a soft crossfade and little pager dots (see ProductImages.tsx).
 *
 * Behaviour (identical in every look, same as the category deal cards):
 *   - tap the image / name  -> onOpen (product sheet)
 *   - "One time" row        -> selects a one-time purchase, CTA = "Add to cart" -> onOneTime
 *   - "Subscribe & save"    -> selects a subscription, CTA = "Subscribe now"   -> onSubscribe
 */
export type ProductCardVariant = "curve" | "halo" | "night";
export const DEFAULT_VARIANT: ProductCardVariant = "curve";

/** Alkaline + Essentials get the aqua accent so a row has some rhythm (curve / halo). */
function isAqua(category: Product["category"]) {
  return category === "Alkaline" || category === "Essentials";
}

type Look = {
  card: string;
  title: string;
  muted: string;
  strike: string;
  price: string;
  optionBox: string;
  optionSelected: string;
  optionBorder: string;
  radioOff: string;
  radioOn: string;
  radioDot: string;
  subPrice: string;
  info: string;
  cta: string;
};

const LIGHT: Look = {
  card: "bg-card border-brand/10",
  title: "text-foreground",
  muted: "text-muted-foreground",
  strike: "text-muted-foreground",
  price: "text-foreground",
  optionBox: "border-border",
  optionSelected: "bg-brand-soft",
  optionBorder: "border-border",
  radioOff: "border-border",
  radioOn: "border-brand",
  radioDot: "bg-brand",
  subPrice: "text-brand",
  info: "text-brand",
  cta: "bg-brand text-primary-foreground",
};

const NIGHT: Look = {
  card: "border-white/10 bg-[linear-gradient(170deg,var(--brand)_0%,color-mix(in_oklab,var(--brand)_82%,black)_100%)]",
  title: "text-white",
  muted: "text-white/65",
  strike: "text-white/55",
  price: "text-white",
  optionBox: "border-white/20 bg-white/5",
  optionSelected: "bg-white/15",
  optionBorder: "border-white/15",
  radioOff: "border-white/40",
  radioOn: "border-white",
  radioDot: "bg-white",
  subPrice: "text-aqua-soft",
  info: "text-aqua",
  cta: "bg-white text-brand",
};

export function ProductCard({
  product,
  onOpen,
  onSubscribe,
  onOneTime,
  delay = 0,
  variant = DEFAULT_VARIANT,
}: {
  product: Product;
  onOpen: () => void;
  onSubscribe: () => void;
  onOneTime?: () => void;
  delay?: number;
  variant?: ProductCardVariant;
}) {
  const { was, oneTime, sub } = dealPrices(product.price);
  const [purchaseType, setPurchaseType] = useState<"onetime" | "subscribe">("subscribe");
  const look = variant === "night" ? NIGHT : LIGHT;
  const aqua = isAqua(product.category);

  const handleCta = () => {
    if (purchaseType === "subscribe") return onSubscribe();
    return onOneTime ? onOneTime() : onSubscribe();
  };

  return (
    <div
      className={`animate-rise group relative flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border shadow-[0_18px_34px_-22px_color-mix(in_oklab,var(--brand)_70%,transparent)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_24px_38px_-20px_color-mix(in_oklab,var(--brand)_75%,transparent)] ${look.card}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full min-w-0 flex-1 flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset"
      >
        <Media product={product} variant={variant} aqua={aqua} />

        <div className="min-h-0 flex-1 px-3 pt-1">
          <p className={`line-clamp-2 min-h-[2.6em] text-f-sm leading-snug font-extrabold ${look.title}`}>
            {product.name}
            {!product.name.toLowerCase().includes(product.size.toLowerCase()) && (
              <span className={`ml-1 text-f-2xs font-medium ${look.muted}`}>({product.size})</span>
            )}
          </p>
          <p className={`mt-1 line-clamp-2 text-f-2xs leading-snug ${look.muted}`}>{product.blurb}</p>
        </div>
      </button>

      {/* Purchase options — one time / subscribe & save */}
      <div className="px-3 pt-2.5 pb-3">
        <div className={`overflow-hidden rounded-xl border ${look.optionBox}`}>
          <button
            type="button"
            onClick={() => setPurchaseType("onetime")}
            aria-pressed={purchaseType === "onetime"}
            className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-1.5 px-2 py-1.5 text-left transition-colors xs:px-2.5 ${
              purchaseType === "onetime" ? look.optionSelected : ""
            }`}
          >
            <Radio on={purchaseType === "onetime"} look={look} />
            <span className={`min-w-0 text-f-2xs ${look.muted}`}>One time</span>
            <span className="shrink-0 text-right leading-tight">
              <span className={`block text-f-2xs line-through ${look.strike}`}>{money(was)}</span>
              <span className={`text-f-xs font-extrabold ${look.price}`}>AED {money(oneTime)}</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPurchaseType("subscribe")}
            aria-pressed={purchaseType === "subscribe"}
            className={`grid w-full grid-cols-[auto_1fr_auto] items-start gap-x-1.5 gap-y-0.5 border-t px-2 py-1.5 text-left transition-colors xs:px-2.5 ${look.optionBorder} ${
              purchaseType === "subscribe" ? look.optionSelected : ""
            }`}
          >
            <Radio on={purchaseType === "subscribe"} look={look} className="mt-0.5" />
            <span className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5">
              <span className={`text-f-2xs leading-tight font-semibold ${look.title}`}>Subscribe &amp; save</span>
              <Info className={`h-3 w-3 shrink-0 ${look.info}`} />
            </span>
            <span className={`ml-1 shrink-0 text-f-xs font-extrabold ${look.subPrice}`}>AED {money(sub)}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleCta}
          className={`mt-2.5 w-full rounded-xl py-2.5 text-f-xs font-bold shadow-[0_10px_16px_-10px_color-mix(in_oklab,var(--brand)_80%,transparent)] transition-transform active:scale-[0.98] ${look.cta}`}
        >
          {purchaseType === "subscribe" ? "Subscribe now" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}

function Radio({ on, look, className = "" }: { on: boolean; look: Look; className?: string }) {
  return (
    <span
      className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border-2 ${
        on ? look.radioOn : look.radioOff
      } ${className}`}
    >
      {on && <span className={`h-1.5 w-1.5 rounded-full ${look.radioDot}`} />}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Image areas — the only part that differs between the three looks    */
/* ------------------------------------------------------------------ */

function Media({
  product,
  variant,
  aqua,
}: {
  product: Product;
  variant: ProductCardVariant;
  aqua: boolean;
}) {
  const index = useImageCycle(product.images.length, product.id);
  const img = (cls: string) => (
    <ProductImageStack
      product={product}
      index={index}
      className={`absolute inset-x-0 mx-auto object-contain ${cls}`}
    />
  );
  const dots = (cls: string, on: string, off: string) => (
    <ImageDots count={product.images.length} index={index} className={cls} on={on} off={off} />
  );
  const badge = (cls: string) => (
    <span
      className={`absolute top-2.5 left-2.5 z-10 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide xs:px-2 xs:text-f-2xs ${cls}`}
    >
      {DEAL_OFF}% off
    </span>
  );
  const pack = (cls: string) => (
    <span
      className={`absolute top-2.5 right-2.5 z-10 max-w-[48%] truncate rounded-full px-2 py-0.5 text-[9px] font-semibold xs:text-f-2xs ${cls}`}
    >
      {product.pack}
    </span>
  );

  if (variant === "halo") {
    return (
      <div className="relative h-[clamp(10rem,46vw,12rem)] shrink-0 overflow-hidden bg-[linear-gradient(180deg,var(--aqua-soft)_0%,var(--card)_100%)]">
        {/* concentric rings */}
        <div
          aria-hidden="true"
          className={`absolute top-[46%] left-1/2 aspect-square w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full border ${
            aqua ? "border-aqua/30" : "border-brand/15"
          }`}
        />
        <div
          aria-hidden="true"
          className={`absolute top-[46%] left-1/2 aspect-square w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full ${
            aqua
              ? "bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--aqua)_38%,transparent),transparent)]"
              : "bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand)_20%,transparent),transparent)]"
          }`}
        />
        <div
          aria-hidden="true"
          className="absolute bottom-[7%] left-1/2 h-2.5 w-[44%] -translate-x-1/2 rounded-[50%] bg-brand/15 blur-md"
        />
        {badge("bg-[#d31245] text-white")}
        {pack("bg-card/90 text-brand shadow-sm")}
        {img(
          "bottom-2 h-[84%] w-[78%] drop-shadow-[0_12px_14px_color-mix(in_oklab,var(--brand)_30%,transparent)] group-hover:-translate-y-1 group-hover:scale-[1.05]",
        )}
        {dots("bottom-2", "bg-brand", "bg-brand/25")}
      </div>
    );
  }

  if (variant === "night") {
    return (
      <div className="relative h-[clamp(10rem,46vw,12rem)] shrink-0 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute top-[48%] left-1/2 aspect-square w-[84%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--aqua)_70%,transparent),color-mix(in_oklab,var(--aqua)_20%,transparent)_65%,transparent)]"
        />
        <div
          aria-hidden="true"
          className="absolute top-[48%] left-1/2 aspect-square w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25"
        />
        {badge("bg-white text-brand")}
        {pack("bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-sm")}
        {img(
          "bottom-1 h-[90%] w-[80%] scale-[1.05] drop-shadow-[0_16px_16px_rgba(0,0,0,0.4)] group-hover:scale-[1.12]",
        )}
        {dots("bottom-2", "bg-white", "bg-white/35")}
      </div>
    );
  }

  // "curve"
  return (
    <div className="relative h-[clamp(10rem,46vw,12rem)] shrink-0 overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-[64%] ${aqua ? "bg-aqua" : "bg-brand"}`} />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[64%] bg-[radial-gradient(90%_80%_at_20%_0%,rgba(255,255,255,0.22),transparent_60%)]"
      />
      <div
        aria-hidden="true"
        className="absolute top-[40%] left-1/2 aspect-square w-[135%] -translate-x-1/2 rounded-full bg-card"
      />
      {badge("bg-[#d31245] text-white")}
      {pack("bg-white/20 text-white ring-1 ring-white/30 backdrop-blur-sm")}
      {img(
        "bottom-0.5 h-[92%] w-[84%] scale-[1.08] drop-shadow-[0_14px_14px_rgba(10,25,70,0.35)] group-hover:scale-[1.16]",
      )}
      {dots("bottom-1.5", "bg-brand", "bg-brand/25")}
    </div>
  );
}
