import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownUp,
  Check,
  ChevronRight,
  Coins,
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
  Ticket,
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
import { HomeCategories, type HomeCategoryId } from "@/components/abraaj/HomeCategories";
import { PopularCarousel } from "@/components/abraaj/PopularCarousel";
import { AboutScreen } from "@/components/abraaj/AboutScreen";
import { MosqueScreen } from "@/components/abraaj/MosqueScreen";
import { SubscriptionCartScreen, SubscriptionCheckoutScreen } from "@/components/abraaj/SubscriptionCart";
import { NotificationsPanel } from "@/components/abraaj/NotificationsPanel";
import { CheckoutScreen } from "@/components/abraaj/Checkout";
import { CartCoupon } from "@/components/abraaj/Coupons";
import { BookletBanner, BookletScreen, BookletViewer, CartBookletCoupons } from "@/components/abraaj/Booklet";
import {
  ProductCard,
  CardDesignPicker,
  CardDesignDropdown,
  loadCardDesign,
  saveCardDesign,
  type CardDesign,
} from "@/components/abraaj/ProductCard";
import { couponByCode, type Coupon } from "@/lib/coupons";
import { availableCoupons, bookletStats, bookletsApi, pickCoupons, type Booklet } from "@/lib/booklets";
import { OrderDetailsScreen, OrdersScreen, TrackOrderScreen } from "@/components/abraaj/Orders";
import {
  cartPricing,
  couponEligibleUnits,
  formatPrice,
  isDigital,
  isSubscription,
  lineKey,
  lineLabel,
  lineTotal,
  lineUnitPrice,
  type CartLine,
} from "@/lib/cart";
import { formatDate, ordersApi, subscriptionDates, subscriptionsApi, type Order } from "@/lib/orders";
import { DateChips, DateField, SubscriptionsScreen, WeekdayPicker } from "@/components/abraaj/Schedule";
import { PLAN_RULES, START_WINDOW_DAYS, dateKey, defaultDays, fitDaysToPlan, parseDateKey, scheduleLabel, type Weekday } from "@/lib/schedule";
import { subLineKey, subTotals, type SubLine } from "@/lib/mosque-data";
import { initialNotifications, type AppNotification } from "@/lib/notifications-data";
import {
  BASE_COINS,
  DEFAULT_DURATION,
  GALLON_ID,
  byId,
  categories,
  durations,
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
// Full-screen pages that aren't in the tab bar. Kept in the same `tab` state so
// they share the header, bottom nav and cart state with the rest of the app.
type Screen = Tab | "about" | "mosque" | "subcart" | "subcheckout" | "checkout" | "orders" | "order" | "track" | "coupons" | "subscriptions";

// Shared between the header logo and the travelling boot logo so the flight always
// lands on the exact size and position of the real one, at any screen width.
const HEADER_TOP = "top-[max(0.75rem,env(safe-area-inset-top))]";
const LOGO_SIZE = "h-[clamp(3.25rem,14vw,4.5rem)]";
// Keeps the header row exactly as tall as the logo so the logo sits flush with the top padding.
const LOGO_ROW = "min-h-[clamp(3.25rem,14vw,4.5rem)]";

// Coin → Kuwaiti Dinar conversion used by the looping coin chip in the header.
// Change this rate to whatever 1 coin is worth in KWD.
const COINS_TO_KWD = 0.01;
const COIN_LOOP_MS = 2500;

// Phases of the boot logo:
// "center"   -> big logo centered on screen, sitting on top of the splash
// "toHeader" -> logo is animating/shrinking into the header's exact slot
// "done"     -> animation finished, overlay is unmounted, the real header logo is shown
type LogoPhase = "center" | "toHeader" | "done";

/** Header coin balance that loops between the coin count and its Kuwaiti Dinar value. */
function CoinChip({ coins, onClick }: { coins: number; onClick: () => void }) {
  const [showKwd, setShowKwd] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setShowKwd((v) => !v), COIN_LOOP_MS);
    return () => clearInterval(id);
  }, []);

  const kwd = (coins * COINS_TO_KWD).toFixed(2);

  return (
    <button
      aria-label={showKwd ? `Your coins, worth ${kwd} Kuwaiti dinar` : `Your coins: ${coins}`}
      onClick={onClick}
      className="flex h-7 shrink-0 items-center gap-1 rounded-full bg-secondary px-2.5 text-brand xs:h-8 xs:px-3"
    >
      <Coins className="h-3 w-3 shrink-0" />
      <span key={showKwd ? "kwd" : "coins"} className="animate-fade text-f-2xs font-bold whitespace-nowrap">
        {showKwd ? `${kwd} KWD` : coins}
      </span>
    </button>
  );
}

function App() {
  const [booting, setBooting] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [logoPhase, setLogoPhase] = useState<LogoPhase>("center");
  const [logoMounted, setLogoMounted] = useState(false);
  const [tab, setTab] = useState<Screen>("home");
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [planId, setPlanId] = useState("biweekly");
  const [menuOpen, setMenuOpen] = useState(false);
  // Notification system — opened from the sidebar now (no longer in the navbar).
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications);
  // Subscription Cart — deliberately separate from `cart` above.
  const [subCart, setSubCart] = useState<SubLine[]>([]);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [booklets, setBooklets] = useState<Booklet[]>([]);
  const [couponPicks, setCouponPicks] = useState<string[]>([]);
  const [viewer, setViewer] = useState<{ id: string; code?: string | undefined } | null>(null);
  const [couponsFocus, setCouponsFocus] = useState<"codes" | null>(null);
  const [subFocus, setSubFocus] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [justPlaced, setJustPlaced] = useState(false);
  const selectedOrder = orders.find((o) => o.id === orderId) ?? null;

  // Product card design chosen by the customer (saved in localStorage).
  const [cardDesign, setCardDesign] = useState<CardDesign>("classic");

  useEffect(() => {
    setCardDesign(loadCardDesign()); // read after mount so SSR and hydration match
  }, []);

  function changeCardDesign(d: CardDesign) {
    setCardDesign(d);
    saveCardDesign(d);
  }

  // Floating header: hides on scroll-down, reappears on scroll-up.
  const [headerHidden, setHeaderHidden] = useState(false);
  const [headerElevated, setHeaderElevated] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    function handleScroll() {
      const y = window.scrollY;
      setHeaderElevated(y > 4);

      if (y < 24) {
        setHeaderHidden(false);
      } else if (y > lastScrollY.current + 4) {
        setHeaderHidden(true);
      } else if (y < lastScrollY.current - 4) {
        setHeaderHidden(false);
      }
      lastScrollY.current = y;
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setLogoMounted(true));
    const a = setTimeout(() => setLeaving(true), 2200);
    const b = setTimeout(() => setLogoPhase("toHeader"), 2200);
    const c = setTimeout(() => setBooting(false), 2800);
    const d = setTimeout(() => setLogoPhase("done"), 3000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(a);
      clearTimeout(b);
      clearTimeout(c);
      clearTimeout(d);
    };
  }, []);

  useEffect(() => {
    setOrders(ordersApi.list());
    setBooklets(bookletsApi.list());
  }, []);

  // Keep per-item tracking live while an orders screen is open.
  useEffect(() => {
    if (tab !== "orders" && tab !== "order" && tab !== "track") return;
    setOrders(ordersApi.list());
    const id = setInterval(() => setOrders(ordersApi.list()), 30_000);
    return () => clearInterval(id);
  }, [tab]);

  const list = useMemo(
    () =>
      products.filter(
        (p) =>
          (category === "All" || p.category === category) &&
          p.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [category, query],
  );

  // One pricing function for the cart and checkout, so their totals always match.
  const coupon = couponCode ? (couponByCode(couponCode) ?? null) : null;
  const now = new Date();
  const usableCoupons = availableCoupons(booklets, now);
  const usableCodes = new Set(usableCoupons.map((c) => c.code));
  const validPicks = couponPicks.filter((c) => usableCodes.has(c));
  const eligibleGallons = couponEligibleUnits(cart);
  const appliedPicks = validPicks.slice(0, eligibleGallons);
  const pricing = cartPricing(cart, coupon, appliedPicks.length);
  const count = pricing.count;

  // Coins system.
  const cartCoins = pricing.coins;
  const orderCoins = orders.reduce((n, o) => n + o.coinsEarned, 0);
  const totalCoins = BASE_COINS + orderCoins + cartCoins;

  // E-coupons left — shown as a badge on the bottom-bar E-coupons tab.
  const couponsLeft = bookletStats(booklets).available;

  function add(product: Product, sub?: string, durationId: string = DEFAULT_DURATION, days?: Weekday[]) {
    const incoming: CartLine = {
      product,
      qty: 1,
      planId: sub,
      durationId: sub ? durationId : undefined,
      days: sub ? fitDaysToPlan(days ?? defaultDays(), sub) : undefined,
    };
    setCart((c) => {
      const i = c.findIndex((l) => lineKey(l) === lineKey(incoming));
      if (i > -1) {
        const next = [...c];
        const line = next[i]!;
        next[i] = { ...line, qty: line.qty + 1 };
        return next;
      }
      return [...c, incoming];
    });
  }

  function setDuration(index: number, durationId: string) {
    setCart((c) => {
      const line = c[index];
      if (!line || !line.planId || line.durationId === durationId) return c;
      const updated = { ...line, durationId };
      const j = c.findIndex((l, n) => n !== index && lineKey(l) === lineKey(updated));
      if (j > -1) {
        return c.map((l, n) => (n === j ? { ...l, qty: l.qty + line.qty } : l)).filter((_, n) => n !== index);
      }
      return c.map((l, n) => (n === index ? updated : l));
    });
  }

  function setSchedule(index: number, patch: { days?: Weekday[]; startDate?: string | undefined }) {
    setCart((c) => {
      const line = c[index];
      if (!line?.planId) return c;
      const updated: CartLine = { ...line, ...patch };
      const j = c.findIndex((l, n) => n !== index && lineKey(l) === lineKey(updated));
      if (j > -1) return c.map((l, n) => (n === j ? { ...l, qty: l.qty + line.qty } : l)).filter((_, n) => n !== index);
      return c.map((l, n) => (n === index ? updated : l));
    });
  }

  function openSubscriptions(focus: string | null = null) {
    setOrders(ordersApi.list());
    setSubFocus(focus);
    openScreen("subscriptions");
  }

  function applyCoupon(c: Coupon) {
    setCouponCode(c.code);
  }

  // ---- E-coupon booklets ----
  function setCouponCount(n: number) {
    const want = Math.max(0, Math.min(n, eligibleGallons, usableCoupons.length));
    const kept = validPicks.slice(0, want);
    setCouponPicks([...kept, ...pickCoupons(booklets, want - kept.length, kept, now)]);
  }

  function payWithCoupon(code?: string) {
    const pick = code ?? pickCoupons(booklets, 1, validPicks, now)[0];
    if (!pick || !usableCodes.has(pick)) return;
    const picks = validPicks.includes(pick) ? validPicks : [...validPicks, pick];
    if (picks.length > eligibleGallons) {
      const gallon = byId(GALLON_ID);
      for (let i = eligibleGallons; i < picks.length; i++) if (gallon) add(gallon);
    }
    setCouponPicks(picks);
    setViewer(null);
    openScreen("cart");
  }

  function removeBookletCoupon(code: string) {
    setCouponPicks((p) => p.filter((c) => c !== code));
  }

  function openBooklet(id: string, code?: string) {
    setBooklets(bookletsApi.list());
    setViewer({ id, code });
  }

  function openCoupons(focus: "codes" | null = null) {
    setCouponsFocus(focus);
    openScreen("coupons");
  }

  function buyBooklet(product: Product) {
    add(product);
    setViewer(null);
    openScreen("cart");
  }

  function placeOrder(order: Order) {
    setOrders(ordersApi.list());
    setBooklets(bookletsApi.list());
    setCouponPicks([]);
    setCart([]);
    setCouponCode(null);
    setOrderId(order.id);
    setJustPlaced(true);
    openScreen("order");
  }

  function openOrder(id: string, screen: "order" | "track") {
    setOrderId(id);
    setJustPlaced(false);
    openScreen(screen);
  }

  function setQty(index: number, delta: number) {
    setCart((c) =>
      c
        .map((l, i) => (i === index ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );
  }

  // ---- Subscription cart (mosque / place deliveries) ----
  function addSub(product: Product, place: string, plan: string) {
    setSubCart((c) => {
      const key = subLineKey({ product, placeId: place, planId: plan });
      const i = c.findIndex((l) => subLineKey(l) === key);
      if (i > -1) return c.map((l, n) => (n === i ? { ...l, qty: l.qty + 1 } : l));
      return [...c, { product, placeId: place, planId: plan, qty: 1 }];
    });
  }

  function setSubQty(key: string, delta: number) {
    setSubCart((c) =>
      c.map((l) => (subLineKey(l) === key ? { ...l, qty: l.qty + delta } : l)).filter((l) => l.qty > 0),
    );
  }

  function setSubPlan(key: string, plan: string) {
    setSubCart((c) => {
      const line = c.find((l) => subLineKey(l) === key);
      if (!line || line.planId === plan) return c;
      const targetKey = subLineKey({ ...line, planId: plan });
      const rest = c.filter((l) => subLineKey(l) !== key);
      const j = rest.findIndex((l) => subLineKey(l) === targetKey);
      if (j > -1) return rest.map((l, n) => (n === j ? { ...l, qty: l.qty + line.qty } : l));
      return c.map((l) => (subLineKey(l) === key ? { ...l, planId: plan } : l));
    });
  }

  function removeSub(key: string) {
    setSubCart((c) => c.filter((l) => subLineKey(l) !== key));
  }

  const subCount = subTotals(subCart).count;
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  function markNotificationRead(id: string) {
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function markAllNotificationsRead() {
    setNotifications((list) => list.map((n) => ({ ...n, read: true })));
  }

  function clearAllNotifications() {
    setNotifications([]);
  }

  function openScreen(s: Screen) {
    setTab(s);
    window.scrollTo({ top: 0 });
  }

  // Home "Categories" grid.
  function handleHomeCategory(id: HomeCategoryId) {
    if (id === "offers") openScreen("deals");
    else if (id === "bottles") goToShop("Bottles");
    else if (id === "gallons") goToShop("Gallons");
    else if (id === "tissue-ice") goToShop("Essentials");
    else if (id === "subscription") openScreen("plan");
    else if (id === "mosque") openScreen("mosque");
  }

  function subscribeNow(product: Product) {
    add(product, planId);
    setTab("cart");
  }

  function addOnceAndOpenCart(product: Product) {
    add(product);
    setTab("cart");
  }

  function goToShop(filter?: string) {
    if (filter) setCategory(filter);
    setQuery("");
    setTab("shop");
    window.scrollTo({ top: 0 });
  }

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
        {/* Left group: menu + search. Search opens the Shop screen; the cart now
            lives in the bottom bar. */}
        <div className={`flex shrink-0 items-center gap-1.5 xs:gap-2 ${LOGO_ROW}`}>
          <button
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-brand xs:h-8 xs:w-8"
          >
            <Menu className="h-3.5 w-3.5" />
            {/* Dot so unread notifications stay discoverable now that the bell is in the drawer. */}
            {unreadNotifCount > 0 && (
              <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-secondary bg-brand" />
            )}
          </button>
          <button
            aria-label="Search products"
            onClick={() => goToShop()}
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full xs:h-8 xs:w-8 ${
              tab === "shop" ? "bg-brand text-primary-foreground" : "bg-secondary text-brand"
            }`}
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Real header logo — invisible until the boot animation lands on this exact
            spot, then it silently takes over from the travelling overlay logo below. */}
        <img
          src={logo}
          alt="Abraaj Water"
          className={`pointer-events-none absolute left-1/2 w-auto max-w-[42vw] -translate-x-1/2 object-contain transition-opacity duration-300 ${LOGO_SIZE} ${
            logoPhase === "done" ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Right group: coins (loops coins ↔ KWD). Profile now lives in the bottom bar. */}
        <div className="flex shrink-0 items-center gap-1.5 xs:gap-2">
          <CoinChip coins={totalCoins} onClick={() => setTab("account")} />
        </div>
      </header>

      <main className="px-screen pb-shell flex-1">
        {tab === "home" && (
          <HomeScreen
            onSeeAll={() => goToShop()}
            onOpen={setActive}
            onAdd={add}
            onSubscribe={subscribeNow}
            onOneTime={addOnceAndOpenCart}
            onCategory={goToShop}
            onHeroLink={handleHeroLink}
            onCategoryTile={handleHomeCategory}
            subCount={subCount}
            booklets={booklets}
            onSeeBooklets={() => openCoupons()}
            cardDesign={cardDesign}
            onCardDesign={changeCardDesign}
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

            {/* Card style selector */}
            <CardDesignPicker value={cardDesign} onChange={changeCardDesign} />

            <div className="mt-5 grid grid-cols-2 gap-2.5 xs:gap-3">
              {list.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  delay={i * 40}
                  design={cardDesign}
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

        {tab === "deals" && (
          <DealsScreen onOpen={setActive} onSubscribe={subscribeNow} onOneTime={addOnceAndOpenCart} />
        )}

        {tab === "plan" && (
          <PlanScreen
            planId={planId}
            setPlanId={setPlanId}
            onShop={() => goToShop()}
            subscriptionCount={orders.reduce((n, o) => n + o.items.filter((i) => i.subscription).length, 0)}
            onManage={() => openSubscriptions()}
          />
        )}

        {tab === "cart" && (
          <CartScreen
            cart={cart}
            setQty={setQty}
            setDuration={setDuration}
            setSchedule={setSchedule}
            pricing={pricing}
            coins={totalCoins}
            onShop={() => goToShop()}
            onSubscribe={() => setTab("plan")}
            onCheckout={() => openScreen("checkout")}
            couponCode={couponCode}
            onApplyCoupon={applyCoupon}
            onRemoveCoupon={() => setCouponCode(null)}
            onBrowseCoupons={() => openCoupons("codes")}
            bookletCoupons={
              <CartBookletCoupons
                available={usableCoupons.length}
                eligible={eligibleGallons}
                used={pricing.couponsUsed}
                discount={pricing.bookletDiscount}
                codes={appliedPicks}
                onSet={setCouponCount}
                onAddGallon={() => payWithCoupon()}
                onOpenBooklets={() => openCoupons()}
              />
            }
          />
        )}

        {tab === "coupons" && (
          <BookletScreen
            booklets={booklets}
            now={now}
            cartQty={Object.fromEntries(cart.filter((l) => !l.planId).map((l) => [l.product.id, l.qty]))}
            focus={couponsFocus}
            onOpenBooklet={(id) => openBooklet(id)}
            onBuy={buyBooklet}
            onUseNext={() => payWithCoupon()}
            onBack={() => openScreen("home")}
            appliedPromo={couponCode}
            onApplyPromo={applyCoupon}
            onRemovePromo={() => setCouponCode(null)}
          />
        )}

        {tab === "checkout" && (
          <CheckoutScreen
            lines={cart}
            coupon={coupon}
            bookletCoupons={appliedPicks}
            onRedeemFailed={() => setBooklets(bookletsApi.list())}
            onBack={() => openScreen("cart")}
            onShop={() => goToShop()}
            onPlaced={placeOrder}
          />
        )}

        {tab === "orders" && (
          <OrdersScreen
            orders={orders}
            onView={(id) => openOrder(id, "order")}
            onTrack={(id) => openOrder(id, "track")}
            onShop={() => goToShop()}
            onBack={() => openScreen("account")}
          />
        )}

        {tab === "order" &&
          (selectedOrder ? (
            <OrderDetailsScreen
              order={selectedOrder}
              justPlaced={justPlaced}
              onBack={() => openScreen("orders")}
              onTrack={() => openOrder(selectedOrder.id, "track")}
              onOpenBooklet={(id) => openBooklet(id)}
              onManageSubscription={(itemId) => openSubscriptions(`${selectedOrder.id}:${itemId}`)}
            />
          ) : (
            <OrderMissing onBack={() => openScreen("orders")} />
          ))}

        {tab === "track" &&
          (selectedOrder ? (
            <TrackOrderScreen
              order={selectedOrder}
              onBack={() => openScreen("orders")}
              onView={() => openOrder(selectedOrder.id, "order")}
              onOpenBooklet={(id) => openBooklet(id)}
              onManageSubscription={(itemId) => openSubscriptions(`${selectedOrder.id}:${itemId}`)}
            />
          ) : (
            <OrderMissing onBack={() => openScreen("orders")} />
          ))}

        {tab === "account" && (
          <AccountScreen
            coins={totalCoins}
            orderCount={orders.length}
            couponsLeft={couponsLeft}
            onPlan={() => openSubscriptions()}
            onOrders={() => openScreen("orders")}
            onBooklets={() => openCoupons()}
          />
        )}

        {tab === "subscriptions" && (
          <SubscriptionsScreen
            entries={subscriptionsApi.list()}
            focusId={subFocus}
            onChanged={() => setOrders(ordersApi.list())}
            onBack={() => openScreen("account")}
            onSubscribe={() => setTab("plan")}
          />
        )}

        {tab === "about" && (
          <AboutScreen
            onBack={() => openScreen("home")}
            onShop={() => goToShop()}
            onMosque={() => openScreen("mosque")}
            onHelp={() => openScreen("account")}
          />
        )}

        {tab === "mosque" && (
          <MosqueScreen
            placeId={placeId}
            onPlace={setPlaceId}
            subLines={subCart}
            onSubscribe={addSub}
            onBuyOnce={(p) => add(p)}
            onOpenSubCart={() => openScreen("subcart")}
            onBack={() => openScreen("home")}
          />
        )}

        {tab === "subcart" && (
          <SubscriptionCartScreen
            lines={subCart}
            setQty={setSubQty}
            setPlan={setSubPlan}
            remove={removeSub}
            onBrowse={() => openScreen("mosque")}
            onCheckout={() => openScreen("subcheckout")}
            onBack={() => openScreen("mosque")}
          />
        )}

        {tab === "subcheckout" && (
          <SubscriptionCheckoutScreen
            lines={subCart}
            onConfirm={() => setSubCart([])}
            onBack={() => openScreen("subcart")}
            onHome={() => openScreen("home")}
            onMosque={() => openScreen("mosque")}
          />
        )}
      </main>

      {active && (
        <ProductSheet
          product={active}
          planId={planId}
          setPlanId={setPlanId}
          onClose={() => setActive(null)}
          onAdd={(sub, durationId, days) => {
            add(active, sub, durationId, days);
            setActive(null);
            setTab("cart");
          }}
        />
      )}

      {/* Promo bar + tab bar share one fixed shell. */}
      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2">
        <PromoBar onCta={(go) => setTab(go as Tab)} />

        <nav className="border-t border-border bg-background/95 px-2 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md xs:px-4">
          <ul className="flex items-end justify-between">
            <li className="flex-1">
              <TabButton active={tab === "home"} Icon={Home} label="Home" onClick={() => setTab("home")} />
            </li>

            {/* Cart — takes the spot Shop used to have (Shop opens from the header search icon). */}
            <li className="flex-1">
              <TabButton
                active={tab === "cart"}
                Icon={ShoppingBag}
                label="Cart"
                badge={count}
                onClick={() => setTab("cart")}
              />
            </li>

            {/* Raised deals button — stays in the true center of the 5-slot bar. */}
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

            {/* E-coupons. Badge shows how many e-coupons the customer has left. */}
            <li className="flex-1">
              <TabButton
                active={tab === "coupons"}
                Icon={Ticket}
                label="E-coupons"
                badge={couponsLeft}
                onClick={() => openCoupons()}
              />
            </li>

            {/* Profile — moved here from the top navbar. */}
            <li className="flex-1">
              <TabButton
                active={tab === "account"}
                Icon={User}
                label="Profile"
                onClick={() => setTab("account")}
              />
            </li>
          </ul>
        </nav>
      </div>

      {viewer &&
        (() => {
          const b = booklets.find((x) => x.id === viewer.id);
          return b ? (
            <BookletViewer
              key={b.id}
              booklet={b}
              now={now}
              focusCode={viewer.code}
              picks={validPicks}
              knownOrders={new Set(orders.map((o) => o.id))}
              onClose={() => setViewer(null)}
              onUse={(code) => payWithCoupon(code)}
              onUnuse={removeBookletCoupon}
              onBuyMore={() => {
                setViewer(null);
                openCoupons();
              }}
              onOpenOrder={(id) => {
                setViewer(null);
                openOrder(id, "order");
              }}
            />
          ) : null;
        })()}

      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onViewAll={() => goToShop("All")}
        unreadCount={unreadNotifCount}
        onSelect={(id) => {
          if (id === "search") goToShop();
          if (id === "notifications") setNotifOpen(true);
          if (id === "about") openScreen("about");
          if (id === "help") setTab("account");
          if (id === "orders") openScreen("orders");
          if (id === "coupons") openCoupons();
        }}
      />

      <NotificationsPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        onMarkAllRead={markAllNotificationsRead}
        onClearAll={clearAllNotifications}
        onOpenNotification={markNotificationRead}
      />

      {/* Travelling boot logo. */}
      {logoPhase !== "done" && (
        <img
          src={logo}
          alt=""
          aria-hidden="true"
          className={`pointer-events-none fixed z-50 w-auto object-contain transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            logoPhase === "toHeader"
              ? `${HEADER_TOP} ${LOGO_SIZE} left-1/2 max-w-[42vw] -translate-x-1/2 translate-y-0 opacity-100 drop-shadow-none`
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
  onOneTime,
  onCategory,
  onHeroLink,
  onCategoryTile,
  subCount,
  booklets,
  onSeeBooklets,
  cardDesign,
  onCardDesign,
}: {
  onSeeAll: () => void;
  onOpen: (p: Product) => void;
  onAdd: (p: Product) => void;
  onSubscribe: (p: Product) => void;
  onOneTime: (p: Product) => void;
  onCategory: (filter: string) => void;
  onHeroLink: (link: HeroLink) => void;
  onCategoryTile: (id: HomeCategoryId) => void;
  subCount: number;
  booklets: Booklet[];
  onSeeBooklets: () => void;
  cardDesign: CardDesign;
  onCardDesign: (d: CardDesign) => void;
}) {
  return (
    <div className="animate-rise">
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

      <BookletBanner booklets={booklets} now={new Date()} onOpen={onSeeBooklets} />

      <HomeCategories onSelect={onCategoryTile} badges={{ mosque: subCount }} />

      <div className="mt-7 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="shrink-0 text-f-base font-bold text-foreground">Popular now</h3>
          <span className="bg-aqua-soft flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-f-2xs font-bold whitespace-nowrap text-brand">
            <Truck className="h-3 w-3 shrink-0" /> Delivered in 1 day
          </span>
        </div>
        <button onClick={onSeeAll} className="shrink-0 text-f-xs font-semibold text-brand">
          See all
        </button>
      </div>
      <CardDesignDropdown value={cardDesign} onChange={onCardDesign} />

      <PopularCarousel
        items={products}
        renderItem={(p) => (
          <ProductCard
            product={p}
            delay={0}
            // "wide" spans two grid columns, so it falls back to classic inside the carousel.
            design={cardDesign === "wide" ? "classic" : cardDesign}
            onOpen={() => onOpen(p)}
            onAdd={() => onAdd(p)}
          />
        )}
      />

      {showcases.map((s) => (
        <ShowcaseSection
          key={s.id}
          showcase={s}
          onOpen={onOpen}
          onSubscribe={onSubscribe}
          onOneTime={onOneTime}
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

function DealsScreen({
  onOpen,
  onSubscribe,
  onOneTime,
}: {
  onOpen: (p: Product) => void;
  onSubscribe: (p: Product) => void;
  onOneTime: (p: Product) => void;
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
            onOneTime={() => onOneTime(p)}
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
    <div className="mt-0">
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
  onAdd: (sub?: string, durationId?: string, days?: Weekday[]) => void;
}) {
  const [mode, setMode] = useState<"once" | "sub">("once");
  const [durationId, setDurationId] = useState(DEFAULT_DURATION);
  const [days, setDays] = useState<Weekday[]>(() => defaultDays());
  const subDays = fitDaysToPlan(days, planId);
  const preview = subscriptionDates({ planId, durationId, days: subDays });
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/40">
      <button aria-label="Close" className="absolute inset-0" onClick={onClose} />
      <div className="animate-sheet no-scrollbar px-screen relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[22px] bg-background pt-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        {/* Full-height product image: the box has a real height and the image fills it
            with object-contain, so nothing is cropped at any screen size. */}
        <div className="mt-6 flex h-[clamp(16rem,68vw,22rem)] items-center justify-center rounded-2xl bg-secondary/50 p-4">
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-contain drop-shadow-[0_14px_18px_rgba(13,42,110,0.25)]"
          />
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
              ["sub", "Subscribe", formatPrice(lineUnitPrice({ product, planId: planId }))],
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
          <div className="animate-rise">
            <p className="mt-4 text-f-xs font-bold text-foreground">Delivery frequency</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5 xs:gap-2">
              {plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlanId(p.id)}
                  aria-pressed={planId === p.id}
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
            <p className="mt-3 text-f-xs font-bold text-foreground">Subscription length</p>
            <div className="mt-2 grid grid-cols-4 gap-1.5 xs:gap-2">
              {durations.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDurationId(d.id)}
                  aria-pressed={durationId === d.id}
                  className={`min-w-0 truncate rounded-xl px-1 py-2 text-center text-f-2xs font-semibold ${
                    durationId === d.id
                      ? "bg-brand text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <WeekdayPicker planId={planId} value={subDays} onChange={setDays} />
            </div>
            <div className="mt-2.5">
              <p className="mb-1.5 text-f-2xs font-semibold text-muted-foreground">
                First deliveries · {preview.dates.length} in total
              </p>
              <DateChips dates={preview.dates.slice(0, 4)} />
            </div>
          </div>
        )}

        <button
          onClick={() => (mode === "sub" ? onAdd(planId, durationId, subDays) : onAdd())}
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
  subscriptionCount,
  onManage,
}: {
  planId: string;
  setPlanId: (v: string) => void;
  onShop: () => void;
  subscriptionCount: number;
  onManage: () => void;
}) {
  return (
    <section className="animate-rise">
      <h1 className="mt-1 text-f-xl font-extrabold tracking-tight text-foreground">Your plan</h1>
      <p className="mt-1 text-f-sm text-muted-foreground">
        Choose how often we refill your home or office, then pick your delivery days.
      </p>
      {subscriptionCount > 0 && (
        <button
          onClick={onManage}
          className="card-soft mt-4 flex w-full items-center gap-3 rounded-2xl p-3.5 text-left focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          <span className="bg-aqua-soft grid h-10 w-10 shrink-0 place-items-center rounded-full">
            <Repeat className="h-5 w-5 text-brand" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-f-sm font-bold text-foreground">Manage my subscriptions</span>
            <span className="block text-f-2xs text-muted-foreground">
              {subscriptionCount} {subscriptionCount === 1 ? "subscription" : "subscriptions"} · change days, pause or cancel
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      )}

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
              <p className="text-f-xs text-muted-foreground">
                {PLAN_RULES[p.id] ? `${PLAN_RULES[p.id]!.label}, on ${PLAN_RULES[p.id]!.maxDays > 1 ? "the days" : "the day"} you choose` : p.every}
              </p>
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
  setDuration,
  setSchedule,
  pricing,
  coins,
  onShop,
  onSubscribe,
  onCheckout,
  couponCode,
  onApplyCoupon,
  onRemoveCoupon,
  onBrowseCoupons,
  bookletCoupons,
}: {
  cart: CartLine[];
  setQty: (i: number, d: number) => void;
  setDuration: (i: number, durationId: string) => void;
  setSchedule: (i: number, patch: { days?: Weekday[]; startDate?: string | undefined }) => void;
  pricing: ReturnType<typeof cartPricing>;
  coins: number;
  onShop: () => void;
  onSubscribe: () => void;
  onCheckout: () => void;
  couponCode: string | null;
  onApplyCoupon: (c: Coupon) => void;
  onRemoveCoupon: () => void;
  onBrowseCoupons: () => void;
  /** "Pay with e-coupons" card. */
  bookletCoupons?: React.ReactNode;
}) {
  const { subtotal, saving, delivery, total, coins: earnedCoins, couponDiscount, couponReason, bookletDiscount, couponsUsed } = pricing;
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
      <div className="mt-1 flex items-center justify-between gap-2">
        <h1 className="text-f-xl font-extrabold tracking-tight text-foreground">Cart</h1>
        <span className="bg-aqua-soft flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-f-2xs font-bold text-brand">
          <Coins className="h-3.5 w-3.5" /> {coins} coins
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {cart.map((l, i) => (
          <div key={lineKey(l)} className="card-soft rounded-2xl p-2.5 xs:p-3">
          <div className="flex items-center gap-2.5 xs:gap-3">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl">
              <img src={l.product.image} alt={l.product.name} className="max-h-[86%] w-auto object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-f-sm font-bold text-foreground">{l.product.name}</p>
              <p className="truncate text-f-2xs text-muted-foreground">
                {isDigital(l)
                  ? `Digital booklet · ${l.product.size}, issued instantly`
                  : isSubscription(l)
                    ? `Subscription · ${lineLabel(l)}`
                    : "One-time · within 1 day"}
              </p>
              <p className="mt-1 text-f-sm font-extrabold text-brand">{formatPrice(lineTotal(l))}</p>
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
          {isSubscription(l) && (
            <div className="mt-2.5 flex items-center gap-1.5" role="group" aria-label={`Subscription length for ${l.product.name}`}>
              {durations.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDuration(i, d.id)}
                  aria-pressed={(l.durationId ?? DEFAULT_DURATION) === d.id}
                  className={`min-w-0 flex-1 truncate rounded-lg px-1.5 py-1.5 text-center text-f-2xs font-semibold transition-colors ${
                    (l.durationId ?? DEFAULT_DURATION) === d.id
                      ? "bg-brand text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}
          {isSubscription(l) && <CartSchedule line={l} onChange={(patch) => setSchedule(i, patch)} />}
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 xs:gap-3">
        <button
          onClick={onShop}
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-background py-3 text-f-sm font-bold text-foreground"
        >
          <Plus className="h-4 w-4 shrink-0" /> Add Product
        </button>
        <button
          onClick={onSubscribe}
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-brand py-3 text-f-sm font-bold text-primary-foreground"
        >
          <Repeat className="h-4 w-4 shrink-0" /> Subscribe
        </button>
      </div>

      {bookletCoupons}

      <CartCoupon
        appliedCode={couponCode}
        discount={couponDiscount}
        reason={couponReason}
        onApply={onApplyCoupon}
        onRemove={onRemoveCoupon}
        onBrowse={onBrowseCoupons}
      />

      <div className="card-soft mt-5 space-y-2 rounded-2xl p-4 text-f-sm">
        <Row label="Subtotal" value={formatPrice(subtotal)} />
        {saving > 0 && <Row label="Subscription saving" value={`− ${formatPrice(saving)}`} accent />}
        {bookletDiscount > 0 && (
          <Row label={`E-coupons (${couponsUsed} × 5 Gallon)`} value={`− ${formatPrice(bookletDiscount)}`} accent />
        )}
        {couponDiscount > 0 && <Row label={`Coupon ${couponCode}`} value={`− ${formatPrice(couponDiscount)}`} accent />}
        <Row label="Delivery" value={delivery === 0 ? "Free" : formatPrice(delivery)} />
        {earnedCoins > 0 && <Row label="Coins you'll earn" value={`+${earnedCoins}`} accent />}
        <div className="my-2 h-px bg-border" />
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-foreground">Total</span>
          <span className="text-f-lg font-extrabold text-brand">{formatPrice(total)}</span>
        </div>
      </div>

      <button
        onClick={onCheckout}
        className="mt-5 w-full rounded-2xl bg-brand py-4 text-f-sm font-bold text-primary-foreground"
      >
        Checkout
      </button>
    </section>
  );
}

/** Delivery days, start date and the next few dates for a subscription line in the cart. */
function CartSchedule({
  line,
  onChange,
}: {
  line: CartLine;
  onChange: (patch: { days?: Weekday[]; startDate?: string | undefined }) => void;
}) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const days = line.days?.length ? line.days : defaultDays();
  const plan = subscriptionDates(line, now);
  const today = dateKey(now);
  const max = new Date(now);
  max.setDate(max.getDate() + START_WINDOW_DAYS);
  return (
    <div className="mt-2.5 rounded-xl bg-secondary/60 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-f-xs font-bold text-brand">{scheduleLabel(line.planId!, days)}</p>
        <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="shrink-0 text-f-2xs font-bold text-brand underline-offset-2 hover:underline">
          {open ? "Done" : "Change days"}
        </button>
      </div>
      {open && (
        <div className="mt-2.5 space-y-2.5">
          <WeekdayPicker planId={line.planId!} value={days} onChange={(d) => onChange({ days: d })} compact />
          <DateField
            label="Start date"
            value={line.startDate ?? today}
            min={today}
            max={dateKey(max)}
            onChange={(v) => onChange({ startDate: !v || v === today ? undefined : v })}
          />
        </div>
      )}
      <p className="mt-2 mb-1.5 text-f-2xs text-muted-foreground">
        {parseDateKey(line.startDate) ? `Starts ${formatDate(plan.start)} · ` : ""}
        {plan.dates.length} deliveries until {formatDate(plan.end)}
      </p>
      <DateChips dates={plan.dates.slice(0, 4)} now={now} more={Math.max(0, plan.dates.length - 4)} />
    </div>
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

function AccountScreen({
  coins,
  orderCount,
  couponsLeft,
  onPlan,
  onOrders,
  onBooklets,
}: {
  coins: number;
  orderCount: number;
  couponsLeft: number;
  onPlan: () => void;
  onOrders: () => void;
  onBooklets: () => void;
}) {
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

      <div className="card-soft mt-3 flex items-center gap-3 rounded-3xl p-3.5 xs:p-4">
        <div className="bg-aqua-soft grid h-11 w-11 shrink-0 place-items-center rounded-full">
          <Coins className="h-5 w-5 text-brand" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-f-sm font-bold text-foreground">{coins} coins</p>
          <p className="truncate text-f-xs text-muted-foreground">Earned from your orders</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {["My subscriptions", "E-coupon booklets", "Delivery addresses", "Order history", "Payment methods", "Help & support"].map(
          (item) => (
            <button
              key={item}
              onClick={
                item === "My subscriptions"
                  ? onPlan
                  : item === "Order history"
                    ? onOrders
                    : item === "E-coupon booklets"
                      ? onBooklets
                      : undefined
              }
              className="card-soft flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-3.5 text-f-sm font-semibold text-foreground"
            >
              <span className="truncate">{item}</span>
              <span className="flex shrink-0 items-center gap-2">
                {item === "Order history" && orderCount > 0 && (
                  <span className="bg-aqua-soft rounded-full px-2 py-0.5 text-f-2xs font-bold text-brand">{orderCount}</span>
                )}
                {item === "E-coupon booklets" && couponsLeft > 0 && (
                  <span className="bg-aqua-soft rounded-full px-2 py-0.5 text-f-2xs font-bold text-brand">{couponsLeft} left</span>
                )}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </span>
            </button>
          ),
        )}
      </div>
    </section>
  );
}

function OrderMissing({ onBack }: { onBack: () => void }) {
  return (
    <section className="animate-rise pt-16 text-center">
      <h1 className="text-f-lg font-bold text-foreground">Order not found</h1>
      <p className="mt-1 text-f-sm text-muted-foreground">It may have been placed on another device.</p>
      <button
        onClick={onBack}
        className="mt-5 rounded-2xl bg-brand px-6 py-3 text-f-sm font-bold text-primary-foreground"
      >
        See my orders
      </button>
    </section>
  );
}