import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, MapPin, Plus, Repeat, ShoppingBag } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MosqueIcon } from "@/components/abraaj/HomeCategories";
import { money, plans, type Product } from "@/lib/abraaj-data";
import {
  DEFAULT_SUB_PLAN,
  PLAN_OFF,
  placeById,
  placeProducts,
  places,
  subTotals,
  subUnitPrice,
  type SubLine,
} from "@/lib/mosque-data";

export function MosqueScreen({
  placeId,
  onPlace,
  subLines,
  onSubscribe,
  onBuyOnce,
  onOpenSubCart,
  onBack,
}: {
  placeId: string | null;
  onPlace: (id: string) => void;
  subLines: SubLine[];
  /** Adds to the SUBSCRIPTION cart (never the normal cart). */
  onSubscribe: (product: Product, placeId: string, planId: string) => void;
  /** Adds a one-off purchase to the NORMAL cart, exactly like the Shop "+" button. */
  onBuyOnce: (product: Product) => void;
  onOpenSubCart: () => void;
  onBack: () => void;
}) {
  const place = placeById(placeId);
  const list = place ? placeProducts(place) : [];
  const totals = subTotals(subLines);
  const mosques = places.filter((p) => p.kind === "mosque");
  const others = places.filter((p) => p.kind === "place");

  return (
    <section className="animate-rise">
      <div className="mt-1 flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="-ml-1 inline-flex items-center gap-1 rounded-full py-1 pr-2 text-f-xs font-semibold text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Home
        </button>
        <button
          onClick={onOpenSubCart}
          aria-label="Subscription cart"
          className="relative flex h-9 items-center gap-1.5 rounded-full bg-secondary px-3 text-f-2xs font-bold text-brand xs:h-10"
        >
          <Repeat className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">Subscriptions</span>
          {totals.count > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-primary-foreground">
              {totals.count}
            </span>
          )}
        </button>
      </div>

      <h1 className="mt-3 text-f-xl font-extrabold tracking-tight text-foreground">Mosque & community</h1>
      <p className="mt-1 text-f-sm text-muted-foreground">
        Choose where the water should go, then subscribe to regular deliveries.
      </p>

      <label className="mt-4 block text-f-xs font-bold text-foreground" id="place-label">
        Mosque or place
      </label>
      <Select value={placeId ?? ""} onValueChange={onPlace}>
        <SelectTrigger
          aria-labelledby="place-label"
          className="mt-1.5 h-auto min-h-14 rounded-2xl border-0 bg-secondary px-4 py-3 text-left text-base shadow-none focus:ring-2 focus:ring-brand [&>svg]:opacity-100 [&>svg]:text-brand"
        >
          <SelectValue placeholder="Select a mosque or place">
            {place && (
              <span className="flex min-w-0 items-center gap-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-brand" />
                <span className="min-w-0">
                  <span className="block truncate text-f-sm font-bold text-foreground">{place.name}</span>
                  <span className="block truncate text-f-2xs text-muted-foreground">{place.area}</span>
                </span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[min(60dvh,24rem)] rounded-2xl">
          <SelectGroup>
            <SelectLabel className="text-f-2xs text-muted-foreground">Mosques</SelectLabel>
            {mosques.map((p) => (
              <PlaceItem key={p.id} id={p.id} name={p.name} area={p.area} />
            ))}
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel className="text-f-2xs text-muted-foreground">Other places</SelectLabel>
            {others.map((p) => (
              <PlaceItem key={p.id} id={p.id} name={p.name} area={p.area} />
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {!place && (
        <div className="mt-8 text-center">
          <div className="bg-aqua-soft mx-auto grid h-24 w-24 place-items-center rounded-full p-4 text-aqua">
            <MosqueIcon />
          </div>
          <p className="mt-3 text-f-sm font-bold text-foreground">Pick a mosque to get started</p>
          <p className="mx-auto mt-1 max-w-[16rem] text-f-xs text-muted-foreground">
            Each place shows the products it needs, so your delivery is actually useful.
          </p>
        </div>
      )}

      {place && (
        <div key={place.id} className="animate-rise">
          <p className="bg-aqua-soft mt-3 rounded-2xl px-3.5 py-2.5 text-f-xs text-foreground">{place.note}</p>

          <div className="mt-5 flex items-end justify-between gap-2">
            <h2 className="text-f-base font-bold text-foreground">Needed here</h2>
            <span className="text-f-2xs text-muted-foreground">{list.length} products</span>
          </div>
          <div className="mt-3 space-y-3">
            {list.map((p) => (
              <PlaceProductCard
                key={p.id}
                product={p}
                inSub={subLines
                  .filter((l) => l.placeId === place.id && l.product.id === p.id)
                  .reduce((n, l) => n + l.qty, 0)}
                onSubscribe={(planId) => onSubscribe(p, place.id, planId)}
                onBuyOnce={() => onBuyOnce(p)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sticky summary sits just above the promo bar + tab bar. */}
      {totals.count > 0 && (
        <div className="sticky bottom-[calc(var(--nav-h)+var(--promo-h)+0.75rem)] z-10 mt-5">
          <button
            onClick={onOpenSubCart}
            className="animate-rise flex w-full items-center gap-3 rounded-2xl bg-brand px-4 py-3 text-left text-primary-foreground shadow-[0_14px_30px_-12px_rgba(13,42,110,0.7)]"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15">
              <Repeat className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-f-sm font-bold">Subscription cart · {totals.count}</span>
              <span className="block truncate text-f-2xs text-primary-foreground/80">
                AED {money(totals.perDelivery)} per delivery round
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </button>
        </div>
      )}
    </section>
  );
}

function PlaceItem({ id, name, area }: { id: string; name: string; area: string }) {
  return (
    <SelectItem value={id} className="rounded-lg py-2.5 pr-8 pl-2">
      <span className="block">
        <span className="block text-sm font-semibold text-foreground">{name}</span>
        <span className="block text-xs text-muted-foreground">{area}</span>
      </span>
    </SelectItem>
  );
}

function PlaceProductCard({
  product,
  inSub,
  onSubscribe,
  onBuyOnce,
}: {
  product: Product;
  inSub: number;
  onSubscribe: (planId: string) => void;
  onBuyOnce: () => void;
}) {
  const [planId, setPlanId] = useState(DEFAULT_SUB_PLAN);
  const [flash, setFlash] = useState<"sub" | "once" | null>(null);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1400);
    return () => clearTimeout(t);
  }, [flash]);

  const price = subUnitPrice(product.price, planId);

  return (
    <div className="card-soft rounded-2xl p-3">
      <div className="flex items-start gap-3">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl">
          <img src={product.image} alt={product.name} className="max-h-[88%] w-auto object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-f-sm leading-snug font-bold text-foreground">{product.name}</p>
          <p className="truncate text-f-2xs text-muted-foreground">
            {product.size} · {product.pack}
          </p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
            <span className="text-f-base font-extrabold text-brand">AED {money(price)}</span>
            <span className="text-f-2xs text-muted-foreground line-through">AED {money(product.price)}</span>
          </div>
          <p className="text-f-2xs font-semibold text-aqua">Save {PLAN_OFF[planId]}% per delivery</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Delivery frequency">
        {plans.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={planId === p.id}
            onClick={() => setPlanId(p.id)}
            className={`min-w-0 truncate rounded-xl px-1.5 py-2 text-center text-f-2xs font-semibold transition-colors ${
              planId === p.id ? "bg-brand text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <button
          onClick={() => {
            onSubscribe(planId);
            setFlash("sub");
          }}
          className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand py-2.5 text-f-xs font-bold text-primary-foreground transition-transform active:scale-[0.98]"
        >
          {flash === "sub" ? <Check className="h-4 w-4 shrink-0" /> : <Repeat className="h-4 w-4 shrink-0" />}
          <span className="truncate">{flash === "sub" ? "Added to subscriptions" : "Subscribe"}</span>
          {inSub > 0 && flash !== "sub" && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white/20 px-1 text-[10px] font-bold">
              {inSub}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            onBuyOnce();
            setFlash("once");
          }}
          aria-label={`Buy ${product.name} once`}
          className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-background px-3 py-2.5 text-f-xs font-bold text-foreground"
        >
          {flash === "once" ? <Check className="h-4 w-4 text-aqua" /> : <ShoppingBag className="h-4 w-4" />}
          <span className="hidden xs:inline">{flash === "once" ? "In cart" : "Buy once"}</span>
          {flash !== "once" && <Plus className="h-3 w-3 xs:hidden" />}
        </button>
      </div>
    </div>
  );
}
