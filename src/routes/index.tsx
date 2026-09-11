import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Check,
  ChevronRight,
  Droplets,
  Home,
  Minus,
  Plus,
  Repeat,
  Search,
  ShoppingBag,
  Truck,
  User,
  X,
} from "lucide-react";
import logo from "@/assets/logo.jpg";
import { Splash } from "@/components/abraaj/Splash";
import { categories, plans, products, type Product } from "@/lib/abraaj-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Abraaj Water — Order & Subscribe in the UAE" },
      {
        name: "description",
        content:
          "Shop Abraaj bottled water and 5 gallon refills, then subscribe for automatic delivery across the UAE.",
      },
      { property: "og:title", content: "Abraaj Water — Order & Subscribe in the UAE" },
      {
        property: "og:description",
        content: "Bottles, gallons and alkaline water delivered on your schedule.",
      },
    ],
  }),
  component: App,
});

type Tab = "home" | "shop" | "plan" | "cart" | "account";
type CartLine = { product: Product; qty: number; planId?: string | undefined };

function App() {
  const [booting, setBooting] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [planId, setPlanId] = useState("biweekly");

  useEffect(() => {
    const a = setTimeout(() => setLeaving(true), 2200);
    const b = setTimeout(() => setBooting(false), 2800);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  const list = useMemo(
    () =>
      products.filter(
        (p) =>
          (category === "All" || p.category === category) &&
          p.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [category, query],
  );

  const count = cart.reduce((n, l) => n + l.qty, 0);
  const subtotal = cart.reduce((n, l) => n + l.qty * l.product.price, 0);
  const saving = cart.some((l) => l.planId) ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
  const delivery = subtotal > 50 || subtotal === 0 ? 0 : 5;

  function add(product: Product, sub?: string) {
    setCart((c) => {
      const i = c.findIndex((l) => l.product.id === product.id && l.planId === sub);
      if (i > -1) {
        const next = [...c];
        const line = next[i]!;
        next[i] = { ...line, qty: line.qty + 1 };
        return next;
      }
      return [...c, { product, qty: 1, planId: sub }];
    });
  }

  function setQty(index: number, delta: number) {
    setCart((c) =>
      c
        .map((l, i) => (i === index ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );
  }

  if (booting) return <Splash leaving={leaving} />;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-background/90 px-5 pt-5 pb-3 backdrop-blur-md">
        <img src={logo} alt="Abraaj Water" className="h-7" />
        <div className="flex items-center gap-2">
          <button
            aria-label="Notifications"
            className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-brand"
          >
            <Bell className="h-[18px] w-[18px]" />
          </button>
          <button
            aria-label="Cart"
            onClick={() => setTab("cart")}
            className="relative grid h-10 w-10 place-items-center rounded-full bg-secondary text-brand"
          >
            <ShoppingBag className="h-[18px] w-[18px]" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 px-5 pb-32">
        {tab === "home" && (
          <HomeScreen
            onSeeAll={() => setTab("shop")}
            onOpen={setActive}
            onPlan={() => setTab("plan")}
          />
        )}

        {tab === "shop" && (
          <section className="animate-rise">
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">Shop water</h1>
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search bottles, gallons…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                    category === c
                      ? "bg-brand text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {list.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  delay={i * 40}
                  onOpen={() => setActive(p)}
                  onAdd={() => add(p)}
                />
              ))}
            </div>
            {list.length === 0 && (
              <p className="mt-10 text-center text-sm text-muted-foreground">Nothing matches that search.</p>
            )}
          </section>
        )}

        {tab === "plan" && (
          <PlanScreen planId={planId} setPlanId={setPlanId} onShop={() => setTab("shop")} />
        )}

        {tab === "cart" && (
          <CartScreen
            cart={cart}
            setQty={setQty}
            subtotal={subtotal}
            saving={saving}
            delivery={delivery}
            onShop={() => setTab("shop")}
          />
        )}

        {tab === "account" && <AccountScreen />}
      </main>

      {active && (
        <ProductSheet
          product={active}
          planId={planId}
          setPlanId={setPlanId}
          onClose={() => setActive(null)}
          onAdd={(sub) => {
            add(active, sub);
            setActive(null);
            setTab("cart");
          }}
        />
      )}

      <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-border bg-background/95 px-4 pt-2 pb-5 backdrop-blur-md">
        <ul className="flex items-center justify-between">
          {(
            [
              ["home", Home, "Home"],
              ["shop", Droplets, "Shop"],
              ["plan", Repeat, "Plan"],
              ["cart", ShoppingBag, "Cart"],
              ["account", User, "Me"],
            ] as const
          ).map(([key, Icon, label]) => (
            <li key={key} className="flex-1">
              <button
                onClick={() => setTab(key)}
                className={`flex w-full flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold transition-colors ${
                  tab === key ? "text-brand" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={tab === key ? 2.4 : 1.8} />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function HomeScreen({
  onSeeAll,
  onOpen,
  onPlan,
}: {
  onSeeAll: () => void;
  onOpen: (p: Product) => void;
  onPlan: () => void;
}) {
  return (
    <div className="animate-rise">
      <p className="mt-1 text-sm text-muted-foreground">Good morning</p>
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
        Fresh water, on your schedule
      </h1>

      <div className="bg-water card-soft mt-5 overflow-hidden rounded-3xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="rounded-full bg-brand px-2.5 py-1 text-[10px] font-bold tracking-wide text-primary-foreground uppercase">
              Subscribe & save
            </span>
            <h2 className="mt-3 text-lg leading-snug font-bold text-foreground">
              Up to 15% off every delivery
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Pause or skip any time.</p>
            <button
              onClick={onPlan}
              className="mt-4 inline-flex items-center gap-1 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              Start a plan <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <img
            src={products[0]!.image}
            alt="Abraaj 5 gallon bottle"
            className="animate-float h-32 w-auto"
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          [Truck, "Same day", "in Dubai"],
          [Droplets, "Sealed", "at source"],
          [Repeat, "Auto", "refills"],
        ].map(([Icon, a, b]) => {
          const I = Icon as typeof Truck;
          return (
            <div key={a as string} className="card-soft rounded-2xl px-3 py-4 text-center">
              <I className="mx-auto h-5 w-5 text-aqua" />
              <p className="mt-2 text-xs font-bold text-foreground">{a as string}</p>
              <p className="text-[10px] text-muted-foreground">{b as string}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-7 flex items-center justify-between">
        <h3 className="text-base font-bold text-foreground">Popular now</h3>
        <button onClick={onSeeAll} className="text-xs font-semibold text-brand">
          See all
        </button>
      </div>
      <div className="no-scrollbar -mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-1">
        {products.slice(0, 5).map((p) => (
          <button
            key={p.id}
            onClick={() => onOpen(p)}
            className="card-soft w-36 shrink-0 rounded-3xl p-3 text-left"
          >
            <div className="bg-aqua-soft grid h-28 place-items-center rounded-2xl">
              <img src={p.image} alt={p.name} className="h-24 w-auto object-contain" />
            </div>
            <p className="mt-2 truncate text-xs font-bold text-foreground">{p.name}</p>
            <p className="text-[10px] text-muted-foreground">{p.pack}</p>
            <p className="mt-1 text-sm font-extrabold text-brand">AED {p.price}</p>
          </button>
        ))}
      </div>

      <div className="card-soft mt-6 flex items-center gap-3 rounded-3xl p-4">
        <div className="bg-aqua-soft grid h-11 w-11 place-items-center rounded-full">
          <Truck className="h-5 w-5 text-brand" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">Next delivery</p>
          <p className="text-xs text-muted-foreground">Tomorrow, 9:00 – 12:00 · Al Barsha</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

function ProductCard({
  product,
  onOpen,
  onAdd,
  delay,
}: {
  product: Product;
  onOpen: () => void;
  onAdd: () => void;
  delay: number;
}) {
  return (
    <div className="card-soft animate-rise rounded-3xl p-3" style={{ animationDelay: `${delay}ms` }}>
      <button onClick={onOpen} className="w-full text-left">
        <div className="bg-aqua-soft grid h-32 place-items-center rounded-2xl">
          <img src={product.image} alt={product.name} className="h-28 w-auto object-contain" />
        </div>
        <p className="mt-2 truncate text-xs font-bold text-foreground">{product.name}</p>
        <p className="text-[10px] text-muted-foreground">{product.pack}</p>
      </button>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-extrabold text-brand">AED {product.price}</span>
        <button
          aria-label={`Add ${product.name}`}
          onClick={onAdd}
          className="grid h-8 w-8 place-items-center rounded-full bg-brand text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ProductSheet({
  product,
  planId,
  setPlanId,
  onClose,
  onAdd,
}: {
  product: Product;
  planId: string;
  setPlanId: (v: string) => void;
  onClose: () => void;
  onAdd: (sub?: string) => void;
}) {
  const [mode, setMode] = useState<"once" | "sub">("once");
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/40">
      <button aria-label="Close" className="absolute inset-0" onClick={onClose} />
      <div className="animate-sheet relative w-full max-w-md rounded-t-[28px] bg-background p-5 pb-8">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="bg-aqua-soft grid h-52 place-items-center rounded-3xl">
          <img src={product.image} alt={product.name} className="h-44 w-auto object-contain" />
        </div>
        <h2 className="mt-4 text-xl font-extrabold text-foreground">{product.name}</h2>
        <p className="text-xs text-muted-foreground">
          {product.size} · {product.pack}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{product.blurb}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {(
            [
              ["once", "One time", `AED ${product.price}`],
              ["sub", "Subscribe", `AED ${Math.round(product.price * 0.9 * 10) / 10}`],
            ] as const
          ).map(([key, label, price]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`rounded-2xl border p-3 text-left transition-colors ${
                mode === key ? "border-brand bg-brand-soft" : "border-border bg-background"
              }`}
            >
              <p className="text-xs font-bold text-foreground">{label}</p>
              <p className="text-sm font-extrabold text-brand">{price}</p>
            </button>
          ))}
        </div>

        {mode === "sub" && (
          <div className="animate-rise mt-3 flex gap-2">
            {plans.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlanId(p.id)}
                className={`flex-1 rounded-2xl px-2 py-2 text-[11px] font-semibold ${
                  planId === p.id
                    ? "bg-brand text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => onAdd(mode === "sub" ? planId : undefined)}
          className="mt-5 w-full rounded-2xl bg-brand py-4 text-sm font-bold text-primary-foreground"
        >
          {mode === "sub" ? "Subscribe & add" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}

function PlanScreen({
  planId,
  setPlanId,
  onShop,
}: {
  planId: string;
  setPlanId: (v: string) => void;
  onShop: () => void;
}) {
  return (
    <section className="animate-rise">
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">Your plan</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose how often we refill your home or office.
      </p>

      <div className="mt-5 space-y-3">
        {plans.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlanId(p.id)}
            className={`flex w-full items-center gap-3 rounded-3xl border p-4 text-left transition-colors ${
              planId === p.id ? "border-brand bg-brand-soft" : "border-border bg-background"
            }`}
          >
            <div
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                planId === p.id ? "border-brand bg-brand" : "border-border"
              }`}
            >
              {planId === p.id && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">
                {p.name} <span className="text-xs font-medium text-muted-foreground">· {p.note}</span>
              </p>
              <p className="text-xs text-muted-foreground">{p.every}</p>
            </div>
            <span className="rounded-full bg-aqua-soft px-2.5 py-1 text-[10px] font-bold text-brand">
              {p.discount}
            </span>
          </button>
        ))}
      </div>

      <div className="card-soft mt-6 rounded-3xl p-4">
        <p className="text-sm font-bold text-foreground">What's included</p>
        <ul className="mt-3 space-y-2">
          {["Free delivery on every refill", "Skip, pause or cancel anytime", "Priority support on WhatsApp"].map(
            (t) => (
              <li key={t} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="h-4 w-4 text-aqua" /> {t}
              </li>
            ),
          )}
        </ul>
      </div>

      <button
        onClick={onShop}
        className="mt-6 w-full rounded-2xl bg-brand py-4 text-sm font-bold text-primary-foreground"
      >
        Pick your bottles
      </button>
    </section>
  );
}

function CartScreen({
  cart,
  setQty,
  subtotal,
  saving,
  delivery,
  onShop,
}: {
  cart: CartLine[];
  setQty: (i: number, d: number) => void;
  subtotal: number;
  saving: number;
  delivery: number;
  onShop: () => void;
}) {
  if (cart.length === 0) {
    return (
      <section className="animate-rise pt-16 text-center">
        <div className="bg-aqua-soft mx-auto grid h-20 w-20 place-items-center rounded-full">
          <ShoppingBag className="h-8 w-8 text-brand" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-foreground">Your cart is empty</h2>
        <p className="mt-1 text-sm text-muted-foreground">Add water and we'll bring it to your door.</p>
        <button
          onClick={onShop}
          className="mt-5 rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-primary-foreground"
        >
          Browse products
        </button>
      </section>
    );
  }

  return (
    <section className="animate-rise">
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">Cart</h1>
      <div className="mt-4 space-y-3">
        {cart.map((l, i) => (
          <div key={`${l.product.id}-${l.planId ?? "once"}`} className="card-soft flex items-center gap-3 rounded-3xl p-3">
            <div className="bg-aqua-soft grid h-16 w-16 shrink-0 place-items-center rounded-2xl">
              <img src={l.product.image} alt={l.product.name} className="h-14 w-auto object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{l.product.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {l.planId ? `Subscription · ${plans.find((p) => p.id === l.planId)?.every}` : "One time"}
              </p>
              <p className="mt-1 text-sm font-extrabold text-brand">AED {l.product.price * l.qty}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                aria-label="Decrease"
                onClick={() => setQty(i, -1)}
                className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-foreground"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-4 text-center text-sm font-bold">{l.qty}</span>
              <button
                aria-label="Increase"
                onClick={() => setQty(i, 1)}
                className="grid h-7 w-7 place-items-center rounded-full bg-brand text-primary-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card-soft mt-5 space-y-2 rounded-3xl p-4 text-sm">
        <Row label="Subtotal" value={`AED ${subtotal}`} />
        {saving > 0 && <Row label="Subscription saving" value={`− AED ${saving}`} accent />}
        <Row label="Delivery" value={delivery === 0 ? "Free" : `AED ${delivery}`} />
        <div className="my-2 h-px bg-border" />
        <div className="flex items-center justify-between">
          <span className="font-bold text-foreground">Total</span>
          <span className="text-lg font-extrabold text-brand">
            AED {Math.round((subtotal - saving + delivery) * 100) / 100}
          </span>
        </div>
      </div>

      <button className="mt-5 w-full rounded-2xl bg-brand py-4 text-sm font-bold text-primary-foreground">
        Checkout
      </button>
    </section>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={accent ? "font-semibold text-aqua" : "font-semibold text-foreground"}>{value}</span>
    </div>
  );
}

function AccountScreen() {
  return (
    <section className="animate-rise">
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">Account</h1>
      <div className="card-soft mt-4 flex items-center gap-3 rounded-3xl p-4">
        <div className="bg-brand-soft grid h-12 w-12 place-items-center rounded-full text-sm font-extrabold text-brand">
          AH
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Ahmed H.</p>
          <p className="text-xs text-muted-foreground">Al Barsha 2, Dubai</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {["My subscriptions", "Delivery addresses", "Order history", "Payment methods", "Help & support"].map(
          (item) => (
            <button
              key={item}
              className="card-soft flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-semibold text-foreground"
            >
              {item}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ),
        )}
      </div>
    </section>
  );
}
