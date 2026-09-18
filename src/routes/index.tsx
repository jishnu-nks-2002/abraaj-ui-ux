import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownUp,
  Bell,
  Check,
  ChevronRight,
  Droplets,
  Home,
  Menu,
  Minus,
  Plus,
  Repeat,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Tag,
  Truck,
  User,
  X,
} from "lucide-react";
import logo from "@/assets/logo-2.png";
import { Splash } from "@/components/abraaj/Splash";
import { Sidebar } from "@/components/abraaj/Sidebar";
import { DealCard, ShowcaseSection } from "@/components/abraaj/CategoryShowcase";
import { Moments } from "@/components/abraaj/Moments";
import { PromoBar } from "@/components/abraaj/PromoBar";
import {
  categories,
  heroSlides,
  plans,
  products,
  showcases,
  type HeroLink,
  type Product,
} from "@/lib/abraaj-data";

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

type Tab = "home" | "shop" | "deals" | "plan" | "cart" | "account";
type CartLine = { product: Product; qty: number; planId?: string | undefined };

// Shared between the header logo and the travelling boot logo so the flight always
// lands on the exact size and position of the real one, at any screen width.
const HEADER_TOP = "top-[max(0.75rem,env(safe-area-inset-top))]";
const LOGO_SIZE = "h-[clamp(2.25rem,10vw,3.25rem)]";

// Phases of the boot logo:
// "center"   -> big logo centered on screen, sitting on top of the splash
// "toHeader" -> logo is animating/shrinking into the header's exact slot
// "done"     -> animation finished, overlay is unmounted, the real header logo is shown
type LogoPhase = "center" | "toHeader" | "done";

function App() {
  const [booting, setBooting] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [logoPhase, setLogoPhase] = useState<LogoPhase>("center");
  // Controls the logo's initial fade+scale-in. Starts false so the very first paint
  // is invisible/slightly scaled down, then flips true a tick later so the browser
  // animates the transition instead of snapping straight to visible.
  const [logoMounted, setLogoMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [planId, setPlanId] = useState("biweekly");
  const [menuOpen, setMenuOpen] = useState(false);

  // Floating header: hides on scroll-down, reappears on scroll-up, and picks up a
  // soft shadow once the page has scrolled away from the very top so it visually
  // "floats" above the content instead of sitting flush against it.
  const [headerHidden, setHeaderHidden] = useState(false);
  const [headerElevated, setHeaderElevated] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    function handleScroll() {
      const y = window.scrollY;
      setHeaderElevated(y > 4);

      if (y < 24) {
        // Always show the header once we're back near the top.
        setHeaderHidden(false);
      } else if (y > lastScrollY.current + 4) {
        // Scrolling down -> hide.
        setHeaderHidden(true);
      } else if (y < lastScrollY.current - 4) {
        // Scrolling up -> reveal.
        setHeaderHidden(false);
      }
      lastScrollY.current = y;
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Flip on next frame so the fade+scale-in actually transitions instead of
    // rendering already-visible on the very first paint.
    const raf = requestAnimationFrame(() => setLogoMounted(true));
    // Splash starts leaving (and the logo starts flying to the header) at 2200ms.
    const a = setTimeout(() => setLeaving(true), 2200);
    const b = setTimeout(() => setLogoPhase("toHeader"), 2200);
    // Splash is fully unmounted at 2800ms, revealing the real app underneath.
    const c = setTimeout(() => setBooting(false), 2800);
    // The travelling logo lands exactly on the header logo and is swapped out.
    const d = setTimeout(() => setLogoPhase("done"), 3000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(a);
      clearTimeout(b);
      clearTimeout(c);
      clearTimeout(d);
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

  // "Subscribe now" on a deal card: adds the line on the currently selected plan and
  // takes the customer straight to the cart so the saving is visible immediately.
  function subscribeNow(product: Product) {
    add(product, planId);
    setTab("cart");
  }

  // Used by the showcase "see all" links and the drawer's "View all products".
  function goToShop(filter?: string) {
    if (filter) setCategory(filter);
    setQuery("");
    setTab("shop");
    window.scrollTo({ top: 0 });
  }

  // Central resolver for hero-slide CTAs, so each slide just declares a `link`
  // (product / category / tab) instead of wiring up its own onClick handler.
  function handleHeroLink(link: HeroLink) {
    if (link.type === "product") {
      const p = products.find((pr) => pr.id === link.productId);
      if (p) setActive(p);
    } else if (link.type === "category") {
      goToShop(link.category === "All" ? undefined : link.category);
    } else {
      setTab(link.tab as Tab);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-x-clip bg-background">
      <header
        className={`px-screen sticky top-0 z-20 flex items-center justify-between gap-2 bg-background/90 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5 backdrop-blur-md transition-transform duration-300 ease-out will-change-transform ${
          headerHidden ? "-translate-y-full" : "translate-y-0"
        } ${headerElevated ? "shadow-[0_8px_24px_-14px_rgba(13,42,110,0.4)]" : "shadow-none"}`}
      >
        {/* Left group: menu + search now live together on the left. */}
        <div className="flex shrink-0 items-center gap-1.5 xs:gap-2">
          <button
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-brand xs:h-10 xs:w-10"
          >
            <Menu className="h-[18px] w-[18px]" />
          </button>
          <button
            aria-label="Search"
            onClick={() => goToShop()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-brand xs:h-10 xs:w-10"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* Real header logo — invisible until the boot animation lands on this exact
            spot, then it silently takes over from the travelling overlay logo below.
            max-w keeps it clear of the buttons on narrow screens. */}
        <img
          src={logo}
          alt="Abraaj Water"
          className={`pointer-events-none absolute left-1/2 w-auto max-w-[36vw] -translate-x-1/2 object-contain transition-opacity duration-300 ${LOGO_SIZE} ${
            logoPhase === "done" ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Right group: notifications + cart. */}
        <div className="flex shrink-0 items-center gap-1.5 xs:gap-2">
          {/* Notifications are the least-used control, so they're the one that drops
              off on the smallest screens to keep the logo centred and legible. */}
          <button
            aria-label="Notifications"
            className="hidden h-9 w-9 place-items-center rounded-full bg-secondary text-brand xs:grid xs:h-10 xs:w-10"
          >
            <Bell className="h-[18px] w-[18px]" />
          </button>
          <button
            aria-label="Cart"
            onClick={() => setTab("cart")}
            className="relative grid h-9 w-9 place-items-center rounded-full bg-secondary text-brand xs:h-10 xs:w-10"
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

      <main className="px-screen pb-shell flex-1">
        {tab === "home" && (
          <HomeScreen
            onSeeAll={() => goToShop()}
            onOpen={setActive}
            onAdd={add}
            onSubscribe={subscribeNow}
            onCategory={goToShop}
            onHeroLink={handleHeroLink}
          />
        )}

        {tab === "shop" && (
          <section className="animate-rise">
            <h1 className="mt-1 text-f-xl font-extrabold tracking-tight text-foreground">Shop water</h1>
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search bottles, gallons…"
                /* 16px minimum stops iOS Safari zooming in on focus. */
                className="w-full min-w-0 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="no-scrollbar mx-screen-neg px-screen mt-4 flex gap-2 overflow-x-auto">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`shrink-0 rounded-full px-3.5 py-2 text-f-xs font-semibold transition-colors xs:px-4 ${
                    category === c
                      ? "bg-brand text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2.5 xs:gap-3">
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
              <p className="mt-10 text-center text-f-sm text-muted-foreground">Nothing matches that search.</p>
            )}
          </section>
        )}

        {tab === "deals" && <DealsScreen onOpen={setActive} onSubscribe={subscribeNow} />}

        {tab === "plan" && (
          <PlanScreen planId={planId} setPlanId={setPlanId} onShop={() => goToShop()} />
        )}

        {tab === "cart" && (
          <CartScreen
            cart={cart}
            setQty={setQty}
            subtotal={subtotal}
            saving={saving}
            delivery={delivery}
            onShop={() => goToShop()}
          />
        )}

        {tab === "account" && <AccountScreen onPlan={() => setTab("plan")} />}
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

      {/* Promo bar + tab bar share one fixed shell so the bar always sits directly on
          top of the navigation instead of being positioned against it by hand. */}
      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2">
        <PromoBar onCta={(go) => setTab(go as Tab)} />

        <nav className="border-t border-border bg-background/95 px-2 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md xs:px-4">
          <ul className="flex items-end justify-between">
            {(
              [
                ["home", Home, "Home"],
                ["shop", Droplets, "Shop"],
              ] as const
            ).map(([key, Icon, label]) => (
              <li key={key} className="flex-1">
                <TabButton active={tab === key} Icon={Icon} label={label} onClick={() => setTab(key)} />
              </li>
            ))}

            {/* Raised deals button — the promotional entry point, so it gets the one
                piece of visual weight in the bar. */}
            <li className="flex-1">
              <button
                onClick={() => setTab("deals")}
                className="flex w-full flex-col items-center gap-1"
                aria-label="Deals"
              >
                <span
                  className={`-mt-6 grid h-12 w-12 place-items-center rounded-full border-4 border-background shadow-[0_10px_22px_-8px_rgba(13,42,110,0.7)] transition-colors xs:-mt-7 xs:h-14 xs:w-14 ${
                    tab === "deals" ? "bg-brand text-primary-foreground" : "bg-aqua text-primary-foreground"
                  }`}
                >
                  <Tag className="h-5 w-5 -rotate-12 xs:h-6 xs:w-6" />
                </span>
                <span
                  className={`text-[9px] font-semibold xs:text-[10px] ${
                    tab === "deals" ? "text-brand" : "text-muted-foreground"
                  }`}
                >
                  Deals
                </span>
              </button>
            </li>

            {(
              [
                ["cart", ShoppingBag, "Cart"],
                ["account", User, "Me"],
              ] as const
            ).map(([key, Icon, label]) => (
              <li key={key} className="flex-1">
                <TabButton
                  active={tab === key}
                  Icon={Icon}
                  label={label}
                  onClick={() => setTab(key)}
                  badge={key === "cart" ? count : 0}
                />
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onViewAll={() => goToShop("All")}
        onSelect={(id) => {
          if (id === "about") setTab("home");
          if (id === "help") setTab("account");
        }}
      />

      {/* Travelling boot logo — this is now the ONLY logo shown during boot (Splash no
          longer renders its own). It fades/scales in centered, sits still, then flies
          and shrinks into the header's exact position before handing off to the real
          header logo. Both states share LOGO_SIZE / HEADER_TOP with the header, so the
          hand-off is pixel-accurate on every screen size. */}
      {logoPhase !== "done" && (
        <img
          src={logo}
          alt=""
          aria-hidden="true"
          className={`pointer-events-none fixed z-50 w-auto object-contain transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            logoPhase === "toHeader"
              ? `${HEADER_TOP} ${LOGO_SIZE} left-1/2 max-w-[36vw] -translate-x-1/2 translate-y-0 opacity-100 drop-shadow-none`
              : `top-1/2 left-1/2 h-[clamp(4.5rem,24vw,7rem)] max-w-[62vw] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_10px_28px_rgba(15,58,138,0.35)] ${
                  logoMounted ? "scale-100 opacity-100" : "scale-90 opacity-0"
                }`
          }`}
        />
      )}

      {booting && (
        <div className="fixed inset-0 z-40">
          <Splash leaving={leaving} />
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  Icon,
  label,
  onClick,
  badge = 0,
}: {
  active: boolean;
  Icon: typeof Home;
  label: string;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full flex-col items-center gap-1 rounded-xl py-1.5 text-[9px] font-semibold transition-colors xs:text-[10px] ${
        active ? "text-brand" : "text-muted-foreground"
      }`}
    >
      <span className="relative">
        <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[9px] font-bold text-primary-foreground">
            {badge}
          </span>
        )}
      </span>
      {label}
    </button>
  );
}

function HomeScreen({
  onSeeAll,
  onOpen,
  onAdd,
  onSubscribe,
  onCategory,
  onHeroLink,
}: {
  onSeeAll: () => void;
  onOpen: (p: Product) => void;
  onAdd: (p: Product) => void;
  onSubscribe: (p: Product) => void;
  onCategory: (filter: string) => void;
  onHeroLink: (link: HeroLink) => void;
}) {
  return (
    <div className="animate-rise">
      {/* "Good morning / Fresh water, on your schedule" heading removed so the hero
          banner is the very first thing on the home screen, right under the header. */}

      {/* Slides now come from abraaj-data.ts (heroSlides) — each one just declares a
          `link` (product / category / tab) instead of wiring its own onClick here. */}
      <HeroCarousel slides={heroSlides} onSlideClick={onHeroLink} />

      <div className="mt-5 grid grid-cols-3 gap-2 xs:gap-3">
        {[
          [Truck, "Same day", "in Dubai"],
          [Droplets, "Sealed", "at source"],
          [Repeat, "Auto", "refills"],
        ].map(([Icon, a, b]) => {
          const I = Icon as typeof Truck;
          return (
            <div key={a as string} className="card-soft rounded-2xl px-2 py-3.5 text-center xs:px-3 xs:py-4">
              <I className="mx-auto h-5 w-5 text-aqua" />
              <p className="mt-2 truncate text-f-xs font-bold text-foreground">{a as string}</p>
              <p className="truncate text-f-2xs text-muted-foreground">{b as string}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-7 flex items-center justify-between gap-2">
        <h3 className="text-f-base font-bold text-foreground">Popular now</h3>
        <button onClick={onSeeAll} className="shrink-0 text-f-xs font-semibold text-brand">
          See all
        </button>
      </div>
      {/* Two independent horizontal carousels stacked one above the other — see
          PopularCarousel below. */}
      <PopularCarousel products={products} onOpen={onOpen} onAdd={onAdd} />

      {/* Category showcases: video / gradient banner + two subscribe-and-save cards,
          one block per product family. */}
      {showcases.map((s) => (
        <ShowcaseSection
          key={s.id}
          showcase={s}
          onOpen={onOpen}
          onSubscribe={onSubscribe}
          onSeeAll={onCategory}
        />
      ))}

      <Moments onOpen={onSeeAll} />

      <div className="card-soft mt-8 flex items-center gap-3 rounded-3xl p-3.5 xs:p-4">
        <div className="bg-aqua-soft grid h-11 w-11 shrink-0 place-items-center rounded-full">
          <Truck className="h-5 w-5 text-brand" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-f-sm font-bold text-foreground">Next delivery</p>
          <p className="truncate text-f-xs text-muted-foreground">Tomorrow, 9:00 – 12:00 · Al Barsha</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </div>
  );
}

// "Popular now" is now TWO SEPARATE, independently auto-scrolling carousel rows
// (rather than one grid where both rows moved together). Products are split in
// half — the top row gets one set and scrolls left→right, the bottom row gets
// the other set and scrolls right→left — so the two rows visually drift apart,
// like a classic dual-lane marquee. Each row still pauses immediately on
// touch/drag and resumes automatically ~1.5s after release.
function PopularCarousel({
  products,
  onOpen,
  onAdd,
}: {
  products: Product[];
  onOpen: (p: Product) => void;
  onAdd: (p: Product) => void;
}) {
  const mid = Math.ceil(products.length / 2);
  const topRow = products.slice(0, mid);
  const bottomRow = products.length > 1 ? products.slice(mid) : products;

  return (
    <div className="mt-3 space-y-2.5 xs:space-y-3">
      <CarouselRow products={topRow.length ? topRow : products} onOpen={onOpen} onAdd={onAdd} direction="forward" />
      <CarouselRow
        products={bottomRow.length ? bottomRow : products}
        onOpen={onOpen}
        onAdd={onAdd}
        direction="reverse"
      />
    </div>
  );
}

// A single auto-scrolling row. "forward" drifts left→right (scrollLeft increases,
// wraps back to 0); "reverse" drifts right→left (scrollLeft decreases, wraps back
// to the end) — giving the two rows in PopularCarousel opposite motion. The list
// is duplicated once so either direction loops with no visible seam.
function CarouselRow({
  products,
  onOpen,
  onAdd,
  direction,
}: {
  products: Product[];
  onOpen: (p: Product) => void;
  onAdd: (p: Product) => void;
  direction: "forward" | "reverse";
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false);
  const resumeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    // Start the reverse row already scrolled to the midpoint so it has room to
    // decrement before hitting 0.
    if (direction === "reverse") {
      el.scrollLeft = el.scrollWidth / 2;
    }

    let raf: number;
    function step() {
      if (!pausedRef.current && el) {
        const half = el.scrollWidth / 2;
        if (direction === "forward") {
          if (el.scrollLeft >= half) {
            el.scrollLeft -= half;
          } else {
            el.scrollLeft += 0.5;
          }
        } else {
          if (el.scrollLeft <= 0) {
            el.scrollLeft += half;
          } else {
            el.scrollLeft -= 0.5;
          }
        }
      }
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [direction]);

  function pause() {
    pausedRef.current = true;
    if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
  }

  function scheduleResume() {
    if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
    resumeTimeout.current = setTimeout(() => {
      pausedRef.current = false;
    }, 1500);
  }

  // Duplicated once so the auto-scroll can loop with no visible seam or jump.
  const doubled = [...products, ...products];

  return (
    <div
      ref={trackRef}
      onPointerDown={pause}
      onPointerUp={scheduleResume}
      onPointerLeave={scheduleResume}
      onTouchStart={pause}
      onTouchEnd={scheduleResume}
      className="no-scrollbar mx-screen-neg px-screen flex gap-2.5 overflow-x-auto xs:gap-3"
      style={{ scrollSnapType: "x proximity" }}
    >
      {doubled.map((p, i) => (
        <div key={`${p.id}-${i}`} className="w-[42vw] max-w-[10.5rem] shrink-0" style={{ scrollSnapAlign: "start" }}>
          <ProductCard product={p} delay={0} onOpen={() => onOpen(p)} onAdd={() => onAdd(p)} />
        </div>
      ))}
    </div>
  );
}

function DealsScreen({
  onOpen,
  onSubscribe,
}: {
  onOpen: (p: Product) => void;
  onSubscribe: (p: Product) => void;
}) {
  const [filter, setFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<"recommended" | "low" | "high">("recommended");

  const sortLabel =
    sort === "low" ? "Price: low first" : sort === "high" ? "Price: high first" : "Recommended";

  const list = useMemo(() => {
    const l = products.filter((p) => filter === "All" || p.category === filter);
    if (sort === "low") return [...l].sort((a, b) => a.price - b.price);
    if (sort === "high") return [...l].sort((a, b) => b.price - a.price);
    return l;
  }, [filter, sort]);

  return (
    <section className="animate-rise">
      <h1 className="mt-1 text-center text-f-lg font-extrabold tracking-tight text-foreground">
        Deals and promotions
      </h1>

      <div className="mt-4 grid grid-cols-2 gap-2.5 xs:gap-3">
        <button
          onClick={() => setShowFilters((s) => !s)}
          className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-f-sm font-semibold transition-colors ${
            showFilters || filter !== "All"
              ? "bg-brand text-primary-foreground"
              : "bg-secondary text-foreground"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0" />
          <span className="truncate">{filter === "All" ? "Filter" : filter}</span>
        </button>
        <button
          onClick={() => setSort((s) => (s === "recommended" ? "low" : s === "low" ? "high" : "recommended"))}
          className="flex items-center justify-center gap-2 rounded-2xl bg-secondary px-3 py-3 text-f-sm font-semibold text-foreground"
        >
          <ArrowDownUp className="h-4 w-4 shrink-0 text-brand" />
          <span className="truncate">{sortLabel}</span>
        </button>
      </div>

      {showFilters && (
        <div className="no-scrollbar mx-screen-neg px-screen animate-rise mt-3 flex gap-2 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-f-xs font-semibold transition-colors xs:px-4 ${
                filter === c ? "bg-brand text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2.5 xs:gap-3">
        {list.map((p, i) => (
          <DealCard
            key={p.id}
            product={p}
            delay={i * 40}
            onOpen={() => onOpen(p)}
            onSubscribe={() => onSubscribe(p)}
          />
        ))}
      </div>

      {list.length === 0 && (
        <p className="mt-10 text-center text-f-sm text-muted-foreground">No deals in this category yet.</p>
      )}
    </section>
  );
}

function HeroCarousel({
  slides,
  interval = 4000,
  onSlideClick,
}: {
  slides: (typeof heroSlides)[number][];
  interval?: number;
  onSlideClick: (link: HeroLink) => void;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const dragDeltaX = useRef(0);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, interval);
    return () => clearInterval(id);
  }, [paused, interval, slides.length]);

  function goTo(i: number) {
    setIndex(((i % slides.length) + slides.length) % slides.length);
  }

  function onPointerDown(e: React.PointerEvent) {
    dragStartX.current = e.clientX;
    dragDeltaX.current = 0;
    setPaused(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (dragStartX.current === null) return;
    dragDeltaX.current = e.clientX - dragStartX.current;
  }

  function onPointerUp() {
    if (dragStartX.current === null) return;
    if (dragDeltaX.current > 40) goTo(index - 1);
    else if (dragDeltaX.current < -40) goTo(index + 1);
    dragStartX.current = null;
    dragDeltaX.current = 0;
    setPaused(false);
  }

  return (
    /* No top margin now — with the "Good morning" heading gone, this is the first
       element on the home screen and should sit flush under the sticky header. */
    <div className="mt-0">
      {/*
        Full-bleed banner: mx-screen-neg cancels the page's side padding (same trick
        used by the Moments rail) so the media runs edge to edge instead of sitting in
        a padded, rounded card. Banner height kept as a normal (not near-full-screen)
        proportion.
      */}
      <div
        className="mx-screen-neg relative touch-pan-y overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div
          className="flex transition-transform duration-500 ease-out will-change-transform [backface-visibility:hidden]"
          style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
        >
          {slides.map((s, i) => (
            <div
              key={i}
              className="relative h-[clamp(14rem,46vh,19rem)] w-full shrink-0 overflow-hidden"
            >
              {s.video ? (
                <video
                  className="absolute inset-0 h-full w-full object-cover"
                  src={s.video}
                  poster={s.poster}
                  preload="metadata"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img
                  src={s.image}
                  alt={s.imageAlt}
                  className="absolute inset-0 h-full w-full object-cover"
                  draggable={false}
                />
              )}

              {/* Tint + sheen over the media so text reads on any image/video. */}
              <div className="absolute inset-0 bg-gradient-to-t from-brand/85 via-brand/15 to-transparent" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_0%_0%,rgba(255,255,255,0.14),transparent_55%)]" />

              <div className="px-screen absolute inset-x-0 bottom-0 pb-6 xs:pb-8">
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-f-2xs font-bold tracking-wide text-white uppercase ring-1 ring-inset ring-white/25 backdrop-blur-sm">
                  {s.badge}
                </span>
                <h2 className="mt-2 max-w-[85%] text-f-lg leading-snug font-bold text-balance text-white">
                  {s.title}
                </h2>
                <p className="mt-0.5 max-w-[85%] text-f-xs text-white/80">{s.subtitle}</p>
                <button
                  onClick={() => onSlideClick(s.link)}
                  className="mt-3 inline-flex items-center gap-1 rounded-full bg-background px-3.5 py-2 text-f-2xs font-semibold whitespace-nowrap text-brand"
                >
                  {s.ctaLabel} <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {slides.length > 1 && (
          <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Tight, aligned mobile grid: the image sits in a plain (no fill-color) fixed
// aspect-square frame so rows line up regardless of name length, the pack size
// sits over the image as a small badge, and the name/size block is flex-1 so
// price + add button always land flush at the card's bottom.
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
    <div
      className="card-soft animate-rise flex h-full min-w-0 flex-col rounded-2xl p-2.5 xs:p-3"
      style={{ animationDelay: `${delay}ms` }}
    >
      <button onClick={onOpen} className="flex w-full min-w-0 flex-1 flex-col text-left">
        <div className="relative grid aspect-square place-items-center overflow-hidden rounded-xl">
          <img
            src={product.image}
            alt={product.name}
            className="max-h-[82%] w-auto object-contain"
          />
          <span className="absolute top-1.5 left-1.5 max-w-[80%] truncate rounded-full bg-secondary/90 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground backdrop-blur-sm xs:text-f-2xs">
            {product.pack}
          </span>
        </div>
        <div className="mt-2.5 min-h-0 flex-1">
          <p className="line-clamp-2 text-f-xs leading-snug font-bold text-foreground">{product.name}</p>
          <p className="mt-0.5 truncate text-f-2xs text-muted-foreground">{product.size}</p>
        </div>
      </button>
      <div className="mt-2.5 flex items-center justify-between gap-1">
        <span className="truncate text-f-sm font-extrabold text-brand">AED {product.price}</span>
        <button
          aria-label={`Add ${product.name}`}
          onClick={onAdd}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-primary-foreground transition-transform active:scale-90"
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
      {/* Capped at 92dvh and scrollable inside, so a long product blurb on a small
          screen never pushes the button under the fold. */}
      <div className="animate-sheet no-scrollbar px-screen relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[22px] bg-background pt-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="grid h-[clamp(11rem,45vw,13rem)] place-items-center overflow-hidden rounded-2xl py-2">
          <img src={product.image} alt={product.name} className="max-h-[78%] w-auto object-contain" />
        </div>
        <h2 className="mt-5 text-f-lg font-extrabold text-foreground">{product.name}</h2>
        <p className="text-f-xs text-muted-foreground">
          {product.size} · {product.pack}
        </p>
        <p className="mt-2 text-f-sm text-muted-foreground">{product.blurb}</p>

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
              className={`min-w-0 rounded-xl border p-3 text-left transition-colors ${
                mode === key ? "border-brand bg-brand-soft" : "border-border bg-background"
              }`}
            >
              <p className="truncate text-f-xs font-bold text-foreground">{label}</p>
              <p className="truncate text-f-sm font-extrabold text-brand">{price}</p>
            </button>
          ))}
        </div>

        {mode === "sub" && (
          <div className="animate-rise mt-3 grid grid-cols-3 gap-1.5 xs:gap-2">
            {plans.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlanId(p.id)}
                className={`min-w-0 truncate rounded-xl px-1.5 py-2 text-center text-f-2xs font-semibold xs:px-2 ${
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
          className="mt-5 w-full rounded-2xl bg-brand py-4 text-f-sm font-bold text-primary-foreground"
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
      <h1 className="mt-1 text-f-xl font-extrabold tracking-tight text-foreground">Your plan</h1>
      <p className="mt-1 text-f-sm text-muted-foreground">
        Choose how often we refill your home or office.
      </p>

      <div className="mt-5 space-y-3">
        {plans.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlanId(p.id)}
            className={`flex w-full items-center gap-3 rounded-3xl border p-3.5 text-left transition-colors xs:p-4 ${
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
            <div className="min-w-0 flex-1">
              <p className="text-f-sm font-bold text-foreground">
                {p.name} <span className="text-f-2xs font-medium text-muted-foreground">· {p.note}</span>
              </p>
              <p className="text-f-xs text-muted-foreground">{p.every}</p>
            </div>
            <span className="bg-aqua-soft shrink-0 rounded-full px-2 py-1 text-f-2xs font-bold whitespace-nowrap text-brand xs:px-2.5">
              {p.discount}
            </span>
          </button>
        ))}
      </div>

      <div className="card-soft mt-6 rounded-3xl p-4">
        <p className="text-f-sm font-bold text-foreground">What's included</p>
        <ul className="mt-3 space-y-2">
          {["Free delivery on every refill", "Skip, pause or cancel anytime", "Priority support on WhatsApp"].map(
            (t) => (
              <li key={t} className="flex items-center gap-2 text-f-xs text-muted-foreground">
                <Check className="h-4 w-4 shrink-0 text-aqua" /> {t}
              </li>
            ),
          )}
        </ul>
      </div>

      <button
        onClick={onShop}
        className="mt-6 w-full rounded-2xl bg-brand py-4 text-f-sm font-bold text-primary-foreground"
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
        <h2 className="mt-4 text-f-lg font-bold text-foreground">Your cart is empty</h2>
        <p className="mt-1 text-f-sm text-muted-foreground">Add water and we'll bring it to your door.</p>
        <button
          onClick={onShop}
          className="mt-5 rounded-2xl bg-brand px-6 py-3 text-f-sm font-bold text-primary-foreground"
        >
          Browse products
        </button>
      </section>
    );
  }

  return (
    <section className="animate-rise">
      <h1 className="mt-1 text-f-xl font-extrabold tracking-tight text-foreground">Cart</h1>
      <div className="mt-4 space-y-3">
        {cart.map((l, i) => (
          <div
            key={`${l.product.id}-${l.planId ?? "once"}`}
            className="card-soft flex items-center gap-2.5 rounded-2xl p-2.5 xs:gap-3 xs:p-3"
          >
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl">
              <img src={l.product.image} alt={l.product.name} className="max-h-[86%] w-auto object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-f-sm font-bold text-foreground">{l.product.name}</p>
              <p className="truncate text-f-2xs text-muted-foreground">
                {l.planId ? `Subscription · ${plans.find((p) => p.id === l.planId)?.every}` : "One time"}
              </p>
              <p className="mt-1 text-f-sm font-extrabold text-brand">AED {l.product.price * l.qty}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 xs:gap-2">
              <button
                aria-label="Decrease"
                onClick={() => setQty(i, -1)}
                className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-foreground"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-4 text-center text-f-sm font-bold">{l.qty}</span>
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

      <div className="card-soft mt-5 space-y-2 rounded-2xl p-4 text-f-sm">
        <Row label="Subtotal" value={`AED ${subtotal}`} />
        {saving > 0 && <Row label="Subscription saving" value={`− AED ${saving}`} accent />}
        <Row label="Delivery" value={delivery === 0 ? "Free" : `AED ${delivery}`} />
        <div className="my-2 h-px bg-border" />
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-foreground">Total</span>
          <span className="text-f-lg font-extrabold text-brand">
            AED {Math.round((subtotal - saving + delivery) * 100) / 100}
          </span>
        </div>
      </div>

      <button className="mt-5 w-full rounded-2xl bg-brand py-4 text-f-sm font-bold text-primary-foreground">
        Checkout
      </button>
    </section>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="truncate text-muted-foreground">{label}</span>
      <span
        className={`shrink-0 ${accent ? "font-semibold text-aqua" : "font-semibold text-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
}

function AccountScreen({ onPlan }: { onPlan: () => void }) {
  return (
    <section className="animate-rise">
      <h1 className="mt-1 text-f-xl font-extrabold tracking-tight text-foreground">Account</h1>
      <div className="card-soft mt-4 flex items-center gap-3 rounded-3xl p-3.5 xs:p-4">
        <div className="bg-brand-soft grid h-12 w-12 shrink-0 place-items-center rounded-full text-f-sm font-extrabold text-brand">
          AH
        </div>
        <div className="min-w-0">
          <p className="truncate text-f-sm font-bold text-foreground">Ahmed H.</p>
          <p className="truncate text-f-xs text-muted-foreground">Al Barsha 2, Dubai</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {["My subscriptions", "Delivery addresses", "Order history", "Payment methods", "Help & support"].map(
          (item) => (
            <button
              key={item}
              onClick={item === "My subscriptions" ? onPlan : undefined}
              className="card-soft flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-3.5 text-f-sm font-semibold text-foreground"
            >
              <span className="truncate">{item}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ),
        )}
      </div>
    </section>
  );
}