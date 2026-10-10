import { useEffect, useState } from "react";
import { Check, ChevronLeft, MapPin, ShoppingBag } from "lucide-react";
import mosqueVideo from "@/assets/side-video-2.mp4";
import mosquePoster from "@/assets/video/video-1-poster.jpg";
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
import { money, type Product } from "@/lib/abraaj-data";
import { CyclingImage } from "@/components/abraaj/ProductImages";
import { placeById, placeProducts, places } from "@/lib/mosque-data";

export function MosqueScreen({
  placeId,
  onPlace,
  onBuy,
  onBack,
}: {
  placeId: string | null;
  onPlace: (id: string) => void;
  /** One-off purchase: adds to the normal cart, exactly like the Shop "+" button. */
  onBuy: (product: Product) => void;
  onBack: () => void;
}) {
  const place = placeById(placeId);
  const list = place ? placeProducts(place) : [];
  const mosques = places.filter((p) => p.kind === "mosque");
  const others = places.filter((p) => p.kind === "place");

  return (
    <section className="animate-rise">
      {/* Banner at the very top of the page: full-bleed video, same treatment as About. */}
      <div className="mx-screen-neg relative mt-1 h-[clamp(12rem,52vw,15rem)] overflow-hidden">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={mosqueVideo}
          poster={mosquePoster}
          preload="metadata"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand/90 via-brand/45 to-brand/15" />
        <button
          onClick={onBack}
          className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 rounded-full bg-white/90 py-1.5 pr-3 pl-2 text-f-xs font-semibold text-brand shadow-sm backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          <ChevronLeft className="h-4 w-4" /> Home
        </button>
        <div className="px-screen absolute inset-x-0 bottom-0 pb-5">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-white/15 p-2.5 text-white ring-1 ring-white/30 backdrop-blur-sm">
            <MosqueIcon />
          </div>
          <h1 className="mt-2.5 text-f-xl font-extrabold tracking-tight text-white">Mosque & community</h1>
          <p className="mt-0.5 max-w-[88%] text-f-xs text-white/85">
            Keep prayer halls and community spaces supplied with fresh water.
          </p>
        </div>
      </div>

      <p className="mt-4 text-f-sm text-muted-foreground">
        Choose where the water should go, then add the products it needs to your cart.
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
                onBuy={() => onBuy(p)}
              />
            ))}
          </div>
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

function PlaceProductCard({ product, onBuy }: { product: Product; onBuy: () => void }) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1400);
    return () => clearTimeout(t);
  }, [added]);

  return (
    <div className="card-soft rounded-2xl p-3">
      <div className="flex items-start gap-3">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl">
          <CyclingImage product={product} className="h-[88%] w-full" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-f-sm leading-snug font-bold text-foreground">{product.name}</p>
          <p className="truncate text-f-2xs text-muted-foreground">
            {product.size} · {product.pack}
          </p>
          <p className="mt-1.5 text-f-base font-extrabold text-brand">AED {money(product.price)}</p>
        </div>
      </div>

      <button
        onClick={() => {
          onBuy();
          setAdded(true);
        }}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand py-2.5 text-f-xs font-bold text-primary-foreground transition-transform active:scale-[0.98]"
      >
        {added ? <Check className="h-4 w-4 shrink-0" /> : <ShoppingBag className="h-4 w-4 shrink-0" />}
        <span className="truncate">{added ? "Added to cart" : "Add to cart"}</span>
      </button>
    </div>
  );
}