import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import type { Product } from "@/lib/abraaj-data";
// Put any water / texture / pattern image here. Used by the "image background" designs.
import cardBg from "@/assets/card-bg-4.png";

export const CARD_DESIGNS = [
  { id: "classic", label: "Classic" },
  { id: "photo", label: "Photo" },
  { id: "glass", label: "Glass" },
  { id: "brand", label: "Brand" },
  { id: "wide", label: "Wide" },
  { id: "minimal", label: "Minimal" },
  { id: "ribbon", label: "Ribbon" },
] as const;

export type CardDesign = (typeof CARD_DESIGNS)[number]["id"];
export const DEFAULT_CARD_DESIGN: CardDesign = "classic";

const STORAGE_KEY = "abraaj.cardDesign";

export function loadCardDesign(): CardDesign {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as CardDesign | null;
    if (v && CARD_DESIGNS.some((d) => d.id === v)) return v;
  } catch {}
  return DEFAULT_CARD_DESIGN;
}

export function saveCardDesign(d: CardDesign) {
  try {
    localStorage.setItem(STORAGE_KEY, d);
  } catch {}
}

/** Horizontal chip selector for choosing the card model. */
export function CardDesignPicker({
  value,
  onChange,
}: {
  value: CardDesign;
  onChange: (d: CardDesign) => void;
}) {
  return (
    <div className="no-scrollbar mx-screen-neg px-screen mt-3 flex items-center gap-2 overflow-x-auto">
      <span className="shrink-0 text-f-2xs font-bold text-muted-foreground uppercase">Card style</span>
      {CARD_DESIGNS.map((d) => (
        <button
          key={d.id}
          onClick={() => onChange(d.id)}
          aria-pressed={value === d.id}
          className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-f-2xs font-semibold transition-colors ${
            value === d.id ? "bg-brand text-primary-foreground" : "bg-secondary text-muted-foreground"
          }`}
        >
          {value === d.id && <Check className="h-3 w-3" />}
          {d.label}
        </button>
      ))}
    </div>
  );
}

/** Dropdown selector for choosing the card model (used on the home page). */
export function CardDesignDropdown({
  value,
  onChange,
}: {
  value: CardDesign;
  onChange: (d: CardDesign) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = CARD_DESIGNS.find((d) => d.id === value) ?? CARD_DESIGNS[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative mt-3 flex items-center justify-end gap-2">
      <span className="text-f-2xs font-bold text-muted-foreground uppercase">Card style</span>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex min-w-[7.5rem] items-center justify-between gap-2 rounded-full bg-secondary px-3.5 py-2 text-f-xs font-semibold text-brand"
      >
        <span className="truncate">{current.label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="animate-rise absolute top-full right-0 z-20 mt-2 w-44 overflow-hidden rounded-2xl border border-border bg-background py-1 shadow-[0_16px_32px_-12px_rgba(13,42,110,0.45)]"
        >
          {CARD_DESIGNS.map((d) => (
            <li key={d.id}>
              <button
                role="option"
                aria-selected={value === d.id}
                onClick={() => {
                  onChange(d.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-f-xs font-semibold ${
                  value === d.id ? "bg-brand-soft text-brand" : "text-foreground"
                }`}
              >
                {d.label}
                {value === d.id && <Check className="h-4 w-4 shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Tone = "light" | "dark"; // "dark" = text sits on a dark/brand surface

function AddButton({ product, onAdd, tone }: { product: Product; onAdd: () => void; tone: Tone }) {
  return (
    <button
      aria-label={`Add ${product.name}`}
      onClick={onAdd}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition-transform active:scale-90 ${
        tone === "dark" ? "bg-background text-brand" : "bg-brand text-primary-foreground"
      }`}
    >
      <Plus className="h-4 w-4" />
    </button>
  );
}

function Price({ product, tone }: { product: Product; tone: Tone }) {
  return (
    <span className={`truncate text-f-sm font-extrabold ${tone === "dark" ? "text-white" : "text-brand"}`}>
      AED {product.price}
    </span>
  );
}

function PackBadge({ product, className = "" }: { product: Product; className?: string }) {
  return (
    <span
      className={`max-w-[80%] truncate rounded-full px-2 py-0.5 text-[9px] font-semibold backdrop-blur-sm xs:text-f-2xs ${className}`}
    >
      {product.pack}
    </span>
  );
}

function Texts({ product, tone }: { product: Product; tone: Tone }) {
  return (
    <>
      <p
        className={`line-clamp-2 text-f-xs leading-snug font-bold ${
          tone === "dark" ? "text-white" : "text-foreground"
        }`}
      >
        {product.name}
      </p>
      <p className={`mt-0.5 truncate text-f-2xs ${tone === "dark" ? "text-white/75" : "text-muted-foreground"}`}>
        {product.size}
      </p>
    </>
  );
}

const bgStyle = { backgroundImage: `url(${cardBg})`, backgroundSize: "cover", backgroundPosition: "center" } as const;

export function ProductCard({
  product,
  onOpen,
  onAdd,
  delay,
  design = DEFAULT_CARD_DESIGN,
}: {
  product: Product;
  onOpen: () => void;
  onAdd: () => void;
  delay: number;
  design?: CardDesign;
}) {
  const anim = { animationDelay: `${delay}ms` };
  const img = (cls: string) => <img src={product.image} alt={product.name} className={cls} />;

  switch (design) {
    // 2. Photo: full-bleed image background, info over a gradient.
    case "photo":
      return (
        <div
          className="animate-rise relative flex aspect-[3/4] min-w-0 flex-col overflow-hidden rounded-2xl"
          style={{ ...anim, ...bgStyle }}
        >
          <button onClick={onOpen} aria-label={product.name} className="absolute inset-0 z-0" />
          <PackBadge product={product} className="absolute top-2 left-2 z-10 bg-white/85 text-brand" />
          <div className="pointer-events-none grid flex-1 place-items-center p-3">
            {img("max-h-[85%] w-auto object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.35)]")}
          </div>
          <div className="pointer-events-none relative z-10 bg-gradient-to-t from-brand/95 via-brand/70 to-transparent p-2.5 pt-8">
            <Texts product={product} tone="dark" />
            <div className="pointer-events-auto mt-2 flex items-center justify-between gap-1">
              <Price product={product} tone="dark" />
              <AddButton product={product} onAdd={onAdd} tone="dark" />
            </div>
          </div>
        </div>
      );

    // 3. Glass: image background with a frosted info panel.
    case "glass":
      return (
        <div
          className="animate-rise relative flex min-w-0 flex-col overflow-hidden rounded-2xl p-2"
          style={{ ...anim, ...bgStyle }}
        >
          <button onClick={onOpen} className="relative flex-1 text-left" aria-label={product.name}>
            <PackBadge product={product} className="absolute top-0 left-0 z-10 bg-white/80 text-brand" />
            <div className="grid aspect-square place-items-center">
              {img("max-h-[82%] w-auto object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.25)]")}
            </div>
          </button>
          <div className="rounded-xl bg-white/70 p-2.5 ring-1 ring-white/60 backdrop-blur-md">
            <Texts product={product} tone="light" />
            <div className="mt-2 flex items-center justify-between gap-1">
              <Price product={product} tone="light" />
              <AddButton product={product} onAdd={onAdd} tone="light" />
            </div>
          </div>
        </div>
      );

    // 4. Brand: solid brand gradient surface.
    case "brand":
      return (
        <div
          className="animate-rise flex h-full min-w-0 flex-col rounded-2xl bg-gradient-to-br from-brand to-aqua p-2.5 xs:p-3"
          style={anim}
        >
          <button onClick={onOpen} className="flex w-full min-w-0 flex-1 flex-col text-left">
            <div className="relative grid aspect-square place-items-center">
              {img("max-h-[82%] w-auto object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.3)]")}
              <PackBadge product={product} className="absolute top-0 left-0 bg-white/20 text-white" />
            </div>
            <div className="mt-2.5 flex-1">
              <Texts product={product} tone="dark" />
            </div>
          </button>
          <div className="mt-2.5 flex items-center justify-between gap-1">
            <Price product={product} tone="dark" />
            <AddButton product={product} onAdd={onAdd} tone="dark" />
          </div>
        </div>
      );

    // 5. Wide: horizontal card, spans both grid columns.
    case "wide":
      return (
        <div
          className="card-soft animate-rise col-span-2 flex min-w-0 items-stretch gap-3 rounded-2xl p-2.5"
          style={anim}
        >
          <button
            onClick={onOpen}
            aria-label={product.name}
            className="relative grid w-32 shrink-0 place-items-center overflow-hidden rounded-xl"
            style={bgStyle}
          >
            {img("max-h-[85%] w-auto object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.25)]")}
            <PackBadge product={product} className="absolute top-1.5 left-1.5 bg-white/85 text-brand" />
          </button>
          <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
            <button onClick={onOpen} className="text-left">
              <Texts product={product} tone="light" />
            </button>
            <div className="mt-3 flex items-center justify-between gap-1">
              <Price product={product} tone="light" />
              <AddButton product={product} onAdd={onAdd} tone="light" />
            </div>
          </div>
        </div>
      );

    // 6. Minimal: no surface, clean and airy.
    case "minimal":
      return (
        <div className="animate-rise flex h-full min-w-0 flex-col" style={anim}>
          <button onClick={onOpen} className="flex w-full min-w-0 flex-1 flex-col text-left">
            <div className="relative grid aspect-square place-items-center rounded-2xl bg-secondary/60">
              {img("max-h-[82%] w-auto object-contain")}
              <PackBadge product={product} className="absolute top-1.5 left-1.5 bg-background/90 text-muted-foreground" />
            </div>
            <div className="mt-2 flex-1 px-0.5">
              <Texts product={product} tone="light" />
            </div>
          </button>
          <div className="mt-2 flex items-center justify-between gap-1 px-0.5">
            <Price product={product} tone="light" />
            <AddButton product={product} onAdd={onAdd} tone="light" />
          </div>
        </div>
      );

    // 7. Ribbon: image-textured top, corner ribbon for the pack size.
    case "ribbon":
      return (
        <div
          className="card-soft animate-rise relative flex h-full min-w-0 flex-col overflow-hidden rounded-3xl"
          style={anim}
        >
          <button onClick={onOpen} className="flex w-full min-w-0 flex-1 flex-col text-left">
            <div className="relative grid aspect-[4/3] place-items-center" style={bgStyle}>
              {img("max-h-[85%] w-auto object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.25)]")}
              <span className="absolute top-0 right-0 max-w-[75%] truncate rounded-bl-2xl bg-brand px-2.5 py-1 text-[9px] font-bold text-primary-foreground xs:text-f-2xs">
                {product.pack}
              </span>
            </div>
            <div className="flex-1 p-2.5 xs:p-3">
              <Texts product={product} tone="light" />
            </div>
          </button>
          <div className="flex items-center justify-between gap-1 px-2.5 pb-2.5 xs:px-3 xs:pb-3">
            <Price product={product} tone="light" />
            <AddButton product={product} onAdd={onAdd} tone="light" />
          </div>
        </div>
      );

    // 1. Classic: your current design, unchanged.
    default:
      return (
        <div
          className="card-soft animate-rise flex h-full min-w-0 flex-col rounded-2xl p-2.5 xs:p-3"
          style={anim}
        >
          <button onClick={onOpen} className="flex w-full min-w-0 flex-1 flex-col text-left">
            <div className="relative grid aspect-square place-items-center overflow-hidden rounded-xl">
              {img("max-h-[82%] w-auto object-contain")}
              <PackBadge product={product} className="absolute top-1.5 left-1.5 bg-secondary/90 text-muted-foreground" />
            </div>
            <div className="mt-2.5 min-h-0 flex-1">
              <Texts product={product} tone="light" />
            </div>
          </button>
          <div className="mt-2.5 flex items-center justify-between gap-1">
            <Price product={product} tone="light" />
            <AddButton product={product} onAdd={onAdd} tone="light" />
          </div>
        </div>
      );
  }
}