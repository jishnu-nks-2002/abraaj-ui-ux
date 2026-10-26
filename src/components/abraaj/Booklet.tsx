import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  BookOpen,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Droplets,
  History,
  Minus,
  Plus,
  Receipt,
  ShoppingBag,
  Ticket,
  X,
} from "lucide-react";
import logo from "@/assets/logo-2.png";
import gallonImg from "@/assets/p5gal.png";
import { GALLON_ID, bookletProducts, byId, type BookletSpec, type Product } from "@/lib/abraaj-data";
import { formatPrice } from "@/lib/cart";
import { daysUntil, formatDate, formatDateTime } from "@/lib/dates";
import {
  COUPON_STATUS_LABEL,
  EXPIRING_SOON_DAYS,
  bookletDaysLeft,
  bookletIsExpired,
  bookletProduct,
  bookletSaving,
  bookletStats,
  couponStatus,
  findCoupon,
  nextExpiringBooklet,
  pricePerCoupon,
  type Booklet,
  type BookletCoupon,
  type BookletCouponStatus,
  type BookletStats,
} from "@/lib/booklets";
import { coupons as promoCoupons, type Coupon } from "@/lib/coupons";
import { CouponTicket as PromoTicket } from "@/components/abraaj/Coupons";
import { BackLink } from "@/components/abraaj/order-ui";

/* ================================================================== */
/* Shared bits                                                         */
/* ================================================================== */

type Cover = BookletSpec["cover"];
const FALLBACK_COVER: Cover = { from: "#1c2f86", to: "#2f8fd6", foil: "#e9c46a" };
const coverFor = (productId: string) => bookletProduct({ productId })?.booklet?.cover ?? FALLBACK_COVER;
const gallonPrice = () => byId(GALLON_ID)?.price ?? 12;
const pad2 = (n: number) => String(n).padStart(2, "0");
/** "14 Oct" */
const shortDate = (iso: string) => formatDate(iso).replace(/ \d{4}$/, "");

function useMediaQuery(query: string, fallback = false) {
  const [match, setMatch] = useState(fallback);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

/** Small 3D booklet used on the shelf, buy cards and home banner. Size it with `className`. */
export function MiniBooklet({
  count,
  cover,
  faded = false,
  className = "w-16",
}: {
  count: number;
  cover: Cover;
  faded?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative aspect-[0.72] shrink-0 ${className}`} aria-hidden="true">
      <div className="bk-mini h-full w-full">
        {/* page block peeking out on the right */}
        <div className="absolute inset-y-[3%] -right-[5%] left-[8%] rounded-r-[6%] bg-[var(--paper)] shadow-[inset_-1px_0_0_var(--paper-edge),inset_-2.5px_0_0_white,inset_-3.5px_0_0_var(--paper-edge),inset_-5px_0_0_white,inset_-6px_0_0_var(--paper-edge)]" />
        <div
          className={`relative h-full w-full overflow-hidden rounded-[7%] rounded-l-[4%] text-white shadow-[0_10px_18px_-10px_rgba(8,20,60,0.75)] [container-type:inline-size] ${faded ? "grayscale-[0.7]" : ""}`}
          style={{ background: `radial-gradient(120% 70% at 90% 0%, rgba(255,255,255,0.25), transparent 55%), linear-gradient(155deg, ${cover.from}, ${cover.to})` }}
        >
          <div className="absolute inset-y-0 left-0 w-[9cqw] bg-gradient-to-r from-black/30 to-transparent" />
          <div className="absolute top-[12cqw] left-1/2 -translate-x-1/2 rounded-full bg-white px-[7cqw] py-[2.5cqw] text-[9cqw] leading-none font-extrabold tracking-wide text-brand">
            ABRAAJ
          </div>
          <div className="absolute inset-x-0 top-[44cqw] text-center">
            <p className="text-[46cqw] leading-[0.85] font-extrabold tracking-tight">{count}</p>
            <p className="mt-[3cqw] text-[8.5cqw] font-bold tracking-[0.12em]">COUPONS</p>
          </div>
          <div className="absolute bottom-[12cqw] left-1/2 h-[3cqw] w-[44cqw] -translate-x-1/2 rounded-full" style={{ background: cover.foil }} />
        </div>
      </div>
    </div>
  );
}

/** Donut of redeemed / expired / available coupons. */
function Donut({ stats, className = "", dark = false }: { stats: BookletStats; className?: string; dark?: boolean }) {
  const total = Math.max(1, stats.total);
  const segs = [
    { value: stats.redeemed, color: "var(--brand)" },
    { value: stats.expired, color: dark ? "rgba(255,255,255,0.35)" : "oklch(0.8 0.02 260)" },
    { value: stats.available, color: "var(--aqua)" },
  ];
  let offset = 25;
  return (
    <svg viewBox="0 0 42 42" className={className} role="img" aria-label={`${stats.available} of ${stats.total} coupons available`}>
      <circle cx="21" cy="21" r="15.915" fill="none" stroke={dark ? "rgba(255,255,255,0.15)" : "var(--secondary)"} strokeWidth="5" />
      {segs.map((s, i) => {
        const pct = (s.value / total) * 100;
        const el = (
          <circle
            key={i}
            cx="21"
            cy="21"
            r="15.915"
            fill="none"
            stroke={s.color}
            strokeWidth="5"
            strokeDasharray={`${pct} ${100 - pct}`}
            strokeDashoffset={offset}
          />
        );
        offset -= pct;
        return pct > 0 ? el : null;
      })}
    </svg>
  );
}

/** Segmented redeemed / expired / available bar. */
function UsageBar({ stats, className = "" }: { stats: BookletStats; className?: string }) {
  const pct = (n: number) => `${(n / Math.max(1, stats.total)) * 100}%`;
  return (
    <div className={`flex h-2 overflow-hidden rounded-full bg-secondary ${className}`} aria-hidden="true">
      <span className="bg-brand" style={{ width: pct(stats.redeemed) }} />
      <span className="bg-muted-foreground/35" style={{ width: pct(stats.expired) }} />
      <span className="bg-aqua" style={{ width: pct(stats.available) }} />
    </div>
  );
}

function statusTone(s: BookletCouponStatus, picked: boolean) {
  if (picked) return "bg-brand text-primary-foreground";
  if (s === "AVAILABLE") return "bg-aqua-soft text-brand";
  if (s === "REDEEMED") return "bg-brand-soft text-brand";
  return "bg-secondary text-muted-foreground";
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          /* clipboard can be blocked; the tick still confirms the tap */
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label={label}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

/* ================================================================== */
/* Booklet pages                                                       */
/* ================================================================== */

type PageDef =
  | { kind: "cover" }
  | { kind: "summary" }
  | { kind: "coupons"; coupons: BookletCoupon[]; from: number; to: number }
  | { kind: "history" }
  | { kind: "terms" }
  | { kind: "notes" }
  | { kind: "back" };

const PER_PAGE = 4;

function buildPages(b: Booklet, spread: boolean): PageDef[] {
  const pages: PageDef[] = [{ kind: "cover" }, { kind: "summary" }];
  for (let i = 0; i < b.coupons.length; i += PER_PAGE) {
    const chunk = b.coupons.slice(i, i + PER_PAGE);
    pages.push({ kind: "coupons", coupons: chunk, from: chunk[0]!.number, to: chunk[chunk.length - 1]!.number });
  }
  pages.push({ kind: "history" }, { kind: "terms" });
  // A two-page spread needs an even page count so the back cover lands on its own leaf.
  if (spread && (pages.length + 1) % 2 === 1) pages.push({ kind: "notes" });
  pages.push({ kind: "back" });
  return pages;
}

function pageLabel(p: PageDef) {
  switch (p.kind) {
    case "cover":
      return "Cover";
    case "summary":
      return "Summary";
    case "coupons":
      return p.from === p.to ? `Nº ${p.from}` : `Nº ${p.from}–${p.to}`;
    case "history":
      return "History";
    case "terms":
      return "How to use";
    case "notes":
      return "Notes";
    default:
      return "Back";
  }
}

type PageCtx = {
  b: Booklet;
  now: Date;
  cover: Cover;
  picks: Set<string>;
  onCoupon: (code: string) => void;
  onBuyMore: () => void;
  highlight: string | null;
};

function PageFrame({ title, right, folio, children }: { title: string; right?: ReactNode; folio: number; children: ReactNode }) {
  return (
    <div className="relative flex h-full flex-col px-[7cqw] pt-[7cqw] pb-[4.5cqw] text-foreground">
      <div className="flex items-baseline justify-between gap-[2cqw]">
        <h3 className="text-[4.6cqw] leading-tight font-extrabold text-brand">{title}</h3>
        {right && <span className="shrink-0 text-[2.9cqw] font-semibold text-muted-foreground">{right}</span>}
      </div>
      <div className="mt-[2.2cqw] mb-[3.5cqw] h-[0.45cqw] rounded-full bg-gradient-to-r from-brand via-aqua to-transparent" />
      <div className="min-h-0 flex-1">{children}</div>
      <p className="mt-[2cqw] text-center text-[2.7cqw] font-semibold tracking-widest text-muted-foreground/80">— {folio} —</p>
    </div>
  );
}

function CoverPage({ b, now, cover }: PageCtx) {
  const expired = bookletIsExpired(b, now);
  return (
    <div
      className={`absolute inset-0 overflow-hidden text-white ${expired ? "saturate-[0.35]" : ""}`}
      style={{ background: `radial-gradient(130% 80% at 85% 0%, rgba(255,255,255,0.22), transparent 55%), linear-gradient(155deg, ${cover.from}, ${cover.to})` }}
    >
      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.05)_0_1px,transparent_1px_5px)]" />
      <svg className="absolute inset-x-0 bottom-0 h-[45%] w-full" viewBox="0 0 400 180" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 70 C 80 35 160 105 240 70 S 360 35 400 58 V180 H0Z" fill="#fff" opacity="0.07" />
        <path d="M0 105 C 90 72 170 135 260 102 S 360 80 400 96 V180 H0Z" fill="#fff" opacity="0.09" />
        <path d="M0 140 C 100 118 190 160 280 138 S 370 124 400 132 V180 H0Z" fill="#fff" opacity="0.08" />
      </svg>
      <Droplets className="absolute -right-[8cqw] top-[52cqw] h-[48cqw] w-[48cqw] text-white/[0.07]" />
      <div className="absolute inset-y-0 left-0 w-[6cqw] bg-gradient-to-r from-black/35 via-black/10 to-transparent" />

      <div className="relative flex h-full flex-col px-[9cqw] pt-[9cqw] pb-[8cqw]">
        <div className="self-start rounded-[2.5cqw] bg-white px-[3cqw] py-[1.4cqw] shadow-[0_4px_14px_-6px_rgba(0,0,0,0.4)]">
          <img src={logo} alt="Abraaj Water" className="h-[8.5cqw] w-auto" />
        </div>
        <p className="mt-[11cqw] text-[3.3cqw] font-extrabold tracking-[0.32em] uppercase opacity-90">E-coupon booklet</p>
        <p className="mt-[1.5cqw] text-[8cqw] leading-none font-extrabold tracking-tight">{b.label} edition</p>
        <div className="mt-[8cqw] flex items-end gap-[3cqw]">
          <span className="text-[31cqw] leading-[0.78] font-extrabold tracking-tighter drop-shadow-[0_4px_10px_rgba(0,0,0,0.2)]">{b.couponCount}</span>
          <span className="pb-[1cqw] text-[4.4cqw] leading-tight font-bold">
            Gallon
            <br />
            coupons
          </span>
        </div>
        <div className="mt-[6cqw] h-[1cqw] w-[32cqw] rounded-full" style={{ background: cover.foil }} />
        <p className="mt-[3cqw] max-w-[70cqw] text-[3.4cqw] leading-snug opacity-90">
          Each coupon pays for one Abraaj 5 Gallon bottle (18.9 L).
        </p>
        <div className="mt-auto grid grid-cols-2 gap-[3cqw] border-t border-white/25 pt-[3.5cqw]">
          <div className="min-w-0">
            <p className="text-[2.6cqw] tracking-[0.18em] uppercase opacity-70">Holder</p>
            <p className="truncate text-[3.8cqw] font-bold">{b.holder}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[2.6cqw] tracking-[0.18em] uppercase opacity-70">{expired ? "Expired" : "Valid until"}</p>
            <p className="truncate text-[3.8cqw] font-bold">{formatDate(b.expiresAt)}</p>
          </div>
        </div>
        <p className="mt-[2.5cqw] font-mono text-[3.2cqw] tracking-wider opacity-80">Nº {b.id}</p>
      </div>

      {expired && (
        <div className="absolute top-[14cqw] -right-[15cqw] w-[60cqw] rotate-45 bg-white/95 py-[1.6cqw] text-center text-[3.6cqw] font-extrabold tracking-[0.3em] text-foreground shadow">
          EXPIRED
        </div>
      )}
    </div>
  );
}

function SummaryPage({ b, now }: PageCtx) {
  const stats = bookletStats(b);
  const days = bookletDaysLeft(b, now);
  const soon = days !== null && days <= EXPIRING_SOON_DAYS;
  return (
    <PageFrame title="Booklet summary" right={`Nº ${b.id}`} folio={1}>
      <div className="flex items-center gap-[4cqw]">
        <div className="relative w-[31cqw] shrink-0">
          <Donut stats={stats} className="w-full -rotate-90" />
          <div className="absolute inset-0 grid place-content-center text-center">
            <span className="text-[8cqw] leading-none font-extrabold text-brand">{stats.available}</span>
            <span className="text-[2.6cqw] font-semibold text-muted-foreground">left</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[5.2cqw] leading-tight font-extrabold">
            {stats.available} of {stats.total} gallons left
          </p>
          <p className="mt-[1cqw] text-[3cqw] text-muted-foreground">
            {stats.redeemed} redeemed{stats.expired ? `, ${stats.expired} expired` : ""}
          </p>
          <span
            className={`mt-[2.4cqw] inline-flex items-center gap-[1.2cqw] rounded-full px-[2.6cqw] py-[1cqw] text-[2.8cqw] font-bold ${
              days === null ? "bg-secondary text-muted-foreground" : soon ? "bg-destructive/10 text-destructive" : "bg-aqua-soft text-brand"
            }`}
          >
            <CalendarClock className="h-[3.2cqw] w-[3.2cqw]" />
            {days === null ? `Expired ${formatDate(b.expiresAt)}` : days === 0 ? "Expires today" : `Expires in ${days} ${days === 1 ? "day" : "days"}`}
          </span>
        </div>
      </div>

      <dl className="mt-[4.5cqw] grid grid-cols-2 gap-[2.4cqw]">
        {(
          [
            ["Total", stats.total, "text-foreground"],
            ["Available", stats.available, "text-aqua"],
            ["Redeemed", stats.redeemed, "text-brand"],
            ["Expired", stats.expired, "text-muted-foreground"],
          ] as const
        ).map(([label, value, cls]) => (
          <div key={label} className="rounded-[2.4cqw] bg-secondary/70 px-[3cqw] py-[2.4cqw]">
            <dt className="text-[2.7cqw] font-semibold text-muted-foreground">{label}</dt>
            <dd className={`text-[6.2cqw] leading-tight font-extrabold ${cls}`}>{value}</dd>
          </div>
        ))}
      </dl>

      <dl className="mt-[4.5cqw] space-y-[1.8cqw] text-[3.1cqw]">
        {(
          [
            ["Purchased", formatDate(b.purchasedAt)],
            ["Order", b.orderId ? `#${b.orderId}` : "Gift booklet"],
            ["Paid", `${formatPrice(b.pricePaid)} · ${formatPrice(b.pricePaid / b.couponCount)} a gallon`],
            [days === null ? "Expired on" : "Valid until", formatDate(b.expiresAt)],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-[3cqw] border-b border-dashed border-border pb-[1.6cqw]">
            <dt className="shrink-0 text-muted-foreground">{k}</dt>
            <dd className="min-w-0 truncate text-right font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </PageFrame>
  );
}

function CouponSlip({ c, ctx }: { c: BookletCoupon; ctx: PageCtx }) {
  const { b, now, cover, picks, onCoupon, highlight } = ctx;
  const status = couponStatus(c, b, now);
  const picked = picks.has(c.code) && status === "AVAILABLE";
  const used = status !== "AVAILABLE";
  return (
    <button
      type="button"
      onClick={() => onCoupon(c.code)}
      aria-label={`Coupon number ${c.number}, code ${c.code}, ${picked ? "in your cart" : COUPON_STATUS_LABEL[status]}. Open details.`}
      className={`relative flex h-full w-full overflow-hidden rounded-[2.6cqw] bg-white text-left shadow-[0_1.5cqw_3cqw_-2cqw_rgba(20,30,80,0.35)] transition-transform focus-visible:outline-none focus-visible:ring-[0.8cqw] focus-visible:ring-brand ${
        picked ? "ring-[0.7cqw] ring-brand" : "ring-1 ring-[color-mix(in_oklab,var(--brand)_14%,transparent)]"
      } ${highlight === c.code ? "animate-pulse" : ""} ${used ? "" : "hover:-translate-y-[0.4cqw]"}`}
    >
      <div
        className={`relative flex w-[19cqw] shrink-0 flex-col items-center justify-center text-white ${used ? "bg-[oklch(0.72_0.03_260)]" : ""}`}
        style={used ? undefined : { background: `linear-gradient(160deg, ${cover.from}, ${cover.to})` }}
      >
        <span className="text-[2.5cqw] font-bold tracking-[0.2em] opacity-80">Nº</span>
        <span className="text-[8.4cqw] leading-none font-extrabold">{pad2(c.number)}</span>
        <span className="mt-[1cqw] text-[2.3cqw] font-bold tracking-wider opacity-90">5 GAL</span>
      </div>
      <div className="relative w-0 border-l-[0.5cqw] border-dashed border-[var(--paper-edge)]">
        <span className="absolute -top-[1.7cqw] -left-[1.9cqw] h-[3.4cqw] w-[3.4cqw] rounded-full bg-[var(--paper)]" />
        <span className="absolute -bottom-[1.7cqw] -left-[1.9cqw] h-[3.4cqw] w-[3.4cqw] rounded-full bg-[var(--paper)]" />
      </div>
      <div className={`relative flex min-w-0 flex-1 items-center gap-[1.5cqw] py-[1.8cqw] pr-[2cqw] pl-[3.4cqw] ${used ? "opacity-60" : ""}`}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[3.8cqw] leading-tight font-extrabold text-foreground">1 × 5 Gallon refill</p>
          <p className="truncate text-[2.7cqw] text-muted-foreground">18.9 L bottle · worth {formatPrice(gallonPrice())}</p>
          <p className="mt-[1.2cqw] truncate font-mono text-[3.5cqw] font-bold tracking-wider text-brand">{c.code}</p>
          <span className={`mt-[1cqw] inline-block rounded-full px-[2cqw] py-[0.5cqw] text-[2.5cqw] font-bold ${statusTone(status, picked)}`}>
            {picked ? "In your cart" : COUPON_STATUS_LABEL[status]}
          </span>
        </div>
        <img src={gallonImg} alt="" className={`h-[16cqw] w-auto shrink-0 object-contain ${used ? "grayscale" : ""}`} />
      </div>
      {status !== "AVAILABLE" && (
        <span
          className={`bk-stamp pointer-events-none absolute top-1/2 right-[2.5cqw] -translate-y-1/2 -rotate-[13deg] rounded-[1.6cqw] bg-white/55 px-[2cqw] py-[0.8cqw] text-center leading-none font-extrabold tracking-[0.14em] uppercase ${
            status === "REDEEMED" ? "text-[var(--ink-stamp)]" : "text-[oklch(0.55_0.02_260)]"
          }`}
        >
          <span className="block text-[3.2cqw]">{status === "REDEEMED" ? "Redeemed" : "Expired"}</span>
          <span className="mt-[0.6cqw] block text-[2.4cqw] tracking-[0.12em]">
            {status === "REDEEMED" && c.redeemedAt ? shortDate(c.redeemedAt) : shortDate(b.expiresAt)}
          </span>
        </span>
      )}
    </button>
  );
}

function CouponsPage({ page, ctx, folio }: { page: Extract<PageDef, { kind: "coupons" }>; ctx: PageCtx; folio: number }) {
  return (
    <PageFrame title="Gallon coupons" right={`Nº ${page.from}–${page.to} of ${ctx.b.couponCount}`} folio={folio}>
      <div className="grid h-full grid-rows-4 gap-[3cqw] pb-[1cqw]">
        {page.coupons.map((c) => (
          <CouponSlip key={c.code} c={c} ctx={ctx} />
        ))}
      </div>
    </PageFrame>
  );
}

function HistoryPage({ b, folio }: PageCtx & { folio: number }) {
  const used = b.coupons
    .filter((c) => c.status === "REDEEMED" && c.redeemedAt)
    .sort((x, y) => y.redeemedAt!.localeCompare(x.redeemedAt!));
  const shown = used.slice(0, 11);
  return (
    <PageFrame title="Redemption history" right={`${used.length} used`} folio={folio}>
      {used.length === 0 ? (
        <div className="grid h-full place-content-center justify-items-center gap-[2cqw] text-center">
          <History className="h-[12cqw] w-[12cqw] text-aqua" />
          <p className="text-[3.8cqw] font-bold">No coupons used yet</p>
          <p className="max-w-[60cqw] text-[3cqw] text-muted-foreground">Every gallon you pay for with this booklet is recorded here.</p>
        </div>
      ) : (
        <ol className="space-y-[1.6cqw]">
          {shown.map((c) => (
            <li key={c.code} className="flex items-center gap-[2.4cqw] border-b border-dashed border-border pb-[1.6cqw] text-[3cqw]">
              <span className="grid h-[7cqw] w-[7cqw] shrink-0 place-items-center rounded-full bg-brand-soft text-[2.8cqw] font-extrabold text-brand">
                {pad2(c.number)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono font-bold text-foreground">{c.code}</span>
                <span className="block truncate text-[2.6cqw] text-muted-foreground">{c.orderId ? `Order #${c.orderId}` : "Redeemed"}</span>
              </span>
              <span className="shrink-0 text-right text-[2.7cqw] font-semibold text-muted-foreground">{formatDate(c.redeemedAt!)}</span>
            </li>
          ))}
          {used.length > shown.length && (
            <li className="pt-[1cqw] text-center text-[2.8cqw] font-semibold text-muted-foreground">+{used.length - shown.length} earlier</li>
          )}
        </ol>
      )}
    </PageFrame>
  );
}

function TermsPage({ b, now, folio }: PageCtx & { folio: number }) {
  const steps = [
    ["Add 5 Gallon to your cart", "One-time bottles, as many as you need."],
    ["Pay with e-coupons", "In the cart, choose how many coupons to use. One per bottle."],
    ["Coupon is stamped", "At checkout it's marked redeemed and linked to your order."],
  ];
  const terms = [
    "Each coupon pays for one Abraaj 5 Gallon (18.9 L) bottle on a one-time order.",
    "A redeemed coupon can't be used again.",
    `Unused coupons expire with the booklet on ${formatDate(b.expiresAt)} and can't be extended or refunded.`,
    "Coupons can't be exchanged for cash, other products or subscriptions.",
    "Delivery follows the usual rule: free on orders over AED 50.",
  ];
  return (
    <PageFrame title="How to use" right={bookletIsExpired(b, now) ? "Expired" : undefined} folio={folio}>
      <ol className="space-y-[3cqw]">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-[3cqw]">
            <span className="grid h-[7.5cqw] w-[7.5cqw] shrink-0 place-items-center rounded-full bg-brand text-[3.4cqw] font-extrabold text-primary-foreground">
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-[3.6cqw] font-bold">{t}</span>
              <span className="block text-[2.9cqw] leading-snug text-muted-foreground">{d}</span>
            </span>
          </li>
        ))}
      </ol>
      <h4 className="mt-[6cqw] text-[3.4cqw] font-extrabold tracking-[0.18em] text-brand uppercase">Terms</h4>
      <ul className="mt-[2cqw] space-y-[1.6cqw] text-[2.8cqw] leading-snug text-muted-foreground">
        {terms.map((t) => (
          <li key={t} className="flex gap-[2cqw]">
            <span className="mt-[1.2cqw] h-[1.2cqw] w-[1.2cqw] shrink-0 rounded-full bg-aqua" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </PageFrame>
  );
}

function NotesPage({ folio }: { folio: number }) {
  return (
    <PageFrame title="Notes" folio={folio}>
      <div className="h-full bg-[repeating-linear-gradient(180deg,transparent_0_7.6cqw,color-mix(in_oklab,var(--aqua)_30%,transparent)_7.6cqw_7.9cqw)]" />
    </PageFrame>
  );
}

function BackPage({ b, cover, onBuyMore }: PageCtx) {
  return (
    <div
      className="absolute inset-0 overflow-hidden text-white"
      style={{ background: `radial-gradient(120% 80% at 15% 100%, rgba(255,255,255,0.18), transparent 55%), linear-gradient(205deg, ${cover.from}, ${cover.to})` }}
    >
      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.05)_0_1px,transparent_1px_5px)]" />
      <div className="absolute inset-y-0 right-0 w-[6cqw] bg-gradient-to-l from-black/35 via-black/10 to-transparent" />
      <div className="relative flex h-full flex-col items-center justify-center px-[10cqw] text-center">
        <div className="grid h-[20cqw] w-[20cqw] place-items-center rounded-full bg-white/15 ring-1 ring-white/30">
          <Droplets className="h-[10cqw] w-[10cqw]" />
        </div>
        <p className="mt-[6cqw] text-[6.2cqw] leading-tight font-extrabold">Running low on water?</p>
        <p className="mt-[2cqw] text-[3.3cqw] opacity-85">Top up with another booklet and keep paying less per gallon.</p>
        <button
          type="button"
          onClick={onBuyMore}
          className="mt-[6cqw] rounded-full bg-white px-[6cqw] py-[2.6cqw] text-[3.4cqw] font-extrabold text-brand shadow-[0_8px_20px_-8px_rgba(0,0,0,0.5)] focus-visible:ring-[0.8cqw] focus-visible:ring-white/60 focus-visible:outline-none"
        >
          Buy another booklet
        </button>
        <div className="absolute inset-x-[10cqw] bottom-[8cqw] border-t border-white/25 pt-[3cqw] text-[2.7cqw] opacity-75">
          <p className="font-mono tracking-wider">Nº {b.id}</p>
          <p className="mt-[0.8cqw]">Abraaj Water · Issued digitally to {b.holder}</p>
        </div>
      </div>
    </div>
  );
}

function PageView({ page, index, ctx }: { page: PageDef; index: number; ctx: PageCtx }) {
  switch (page.kind) {
    case "cover":
      return <CoverPage {...ctx} />;
    case "summary":
      return <SummaryPage {...ctx} />;
    case "coupons":
      return <CouponsPage page={page} ctx={ctx} folio={index} />;
    case "history":
      return <HistoryPage {...ctx} folio={index} />;
    case "terms":
      return <TermsPage {...ctx} folio={index} />;
    case "notes":
      return <NotesPage folio={index} />;
    default:
      return <BackPage {...ctx} />;
  }
}

const isPaperPage = (p: PageDef | undefined) => !!p && p.kind !== "cover" && p.kind !== "back";

/* ================================================================== */
/* Flipbook viewer                                                     */
/* ================================================================== */

const TURN_MS = 820;

function useBookSize(spread: boolean) {
  const [vp, setVp] = useState({ w: 390, h: 760 });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const ratio = 0.71;
  const chrome = spread ? 190 : 196;
  const availW = spread ? (vp.w - 160) / 2 : vp.w - 40;
  const pageW = Math.max(220, Math.floor(Math.min(availW, (vp.h - chrome) * ratio, spread ? 420 : 430)));
  return { pageW, pageH: Math.round(pageW / ratio) };
}

export function BookletViewer({
  booklet,
  now,
  focusCode,
  picks,
  knownOrders,
  onClose,
  onUse,
  onUnuse,
  onBuyMore,
  onOpenOrder,
}: {
  booklet: Booklet;
  now: Date;
  /** Open on the page holding this coupon, and highlight it. */
  focusCode?: string | null | undefined;
  /** Coupon codes the customer has picked for the cart. */
  picks: string[];
  /** Orders that exist on this device (others are shown as plain text). */
  knownOrders: Set<string>;
  onClose: () => void;
  onUse: (code: string) => void;
  onUnuse: (code: string) => void;
  onBuyMore: () => void;
  onOpenOrder: (orderId: string) => void;
}) {
  const spread = useMediaQuery("(min-width: 760px) and (min-height: 540px)");
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const { pageW, pageH } = useBookSize(spread);
  const cover = coverFor(booklet.productId);
  const pages = useMemo(() => buildPages(booklet, spread), [booklet, spread]);
  const leaves = useMemo(
    () =>
      spread
        ? Array.from({ length: pages.length / 2 }, (_, i) => ({ front: 2 * i, back: 2 * i + 1 }))
        : pages.map((_, i) => ({ front: i, back: -1 })),
    [pages, spread],
  );
  const L = leaves.length;
  const maxFlip = spread ? L : L - 1;
  const flipForPage = useCallback((p: number) => (spread ? Math.ceil(p / 2) : p), [spread]);

  const startPage = useMemo(() => {
    if (!focusCode) return 0;
    const i = pages.findIndex((p) => p.kind === "coupons" && p.coupons.some((c) => c.code === focusCode));
    return i < 0 ? 0 : i;
    // Only for the first open of this booklet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booklet.id]);

  const [flipped, setFlipped] = useState(() => flipForPage(startPage));
  const flippedRef = useRef(flipped);
  // Which side of the spine each leaf is currently on, for stacking. Switches at
  // the middle of a turn, when the leaf stands upright.
  const [onLeft, setOnLeft] = useState<boolean[]>(() => leaves.map((_, i) => i < flipped));
  const [delays, setDelays] = useState<Record<number, number>>({});
  const [turns, setTurns] = useState<Record<number, number>>({});
  const timers = useRef<number[]>([]);
  const [sheet, setSheet] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(focusCode ?? null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const swipedAt = useRef(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const chipsRef = useRef<HTMLElement>(null);
  const dur = reduced ? 0 : TURN_MS;

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  // Keep the same page in view when switching between one page and a spread.
  const currentPage = spread ? Math.max(0, 2 * flipped - 1) : flipped;
  const lastPage = useRef(currentPage);
  const lastSpread = useRef(spread);
  useEffect(() => {
    if (lastSpread.current === spread) {
      lastPage.current = currentPage;
      return;
    }
    lastSpread.current = spread;
    clearTimers();
    const f = Math.min(spread ? Math.ceil(lastPage.current / 2) : lastPage.current, spread ? L : L - 1);
    flippedRef.current = f;
    setFlipped(f);
    setOnLeft(leaves.map((_, i) => i < f));
    setDelays({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spread, leaves]);

  const go = useCallback(
    (raw: number) => {
      const from = flippedRef.current;
      const target = Math.max(0, Math.min(maxFlip, raw));
      if (target === from) return;
      const dir = target > from ? 1 : -1;
      const moving = dir > 0 ? range(from, target) : range(target, from).reverse();
      const stagger = reduced ? 0 : Math.min(90, 480 / moving.length);
      const nextDelays: Record<number, number> = {};
      moving.forEach((leaf, i) => {
        nextDelays[leaf] = Math.round(i * stagger);
        timers.current.push(
          window.setTimeout(
            () => setOnLeft((s) => s.map((v, j) => (j === leaf ? dir > 0 : v))),
            nextDelays[leaf]! + dur / 2,
          ),
        );
      });
      const settle = (moving.length - 1) * stagger + dur + 40;
      timers.current.push(window.setTimeout(() => setOnLeft((s) => s.map((_, j) => j < flippedRef.current)), settle));
      flippedRef.current = target;
      setDelays(nextDelays);
      setTurns((t) => {
        const n = { ...t };
        moving.forEach((l) => (n[l] = (n[l] ?? 0) + 1));
        return n;
      });
      setFlipped(target);
      setHighlight(null);
    },
    [maxFlip, reduced, dur],
  );

  useEffect(() => () => clearTimers(), []);

  // Esc closes (the coupon sheet first), arrows turn pages; lock page scroll.
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (sheet) setSheet(null);
        else onClose();
      } else if (!sheet && e.key === "ArrowRight") go(flippedRef.current + 1);
      else if (!sheet && e.key === "ArrowLeft") go(flippedRef.current - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose, sheet]);

  useEffect(() => {
    if (!highlight) return;
    const t = window.setTimeout(() => setHighlight(null), 2600);
    return () => window.clearTimeout(t);
  }, [highlight]);

  const pickSet = useMemo(() => new Set(picks), [picks]);
  const ctx: PageCtx = {
    b: booklet,
    now,
    cover,
    picks: pickSet,
    highlight,
    onBuyMore,
    onCoupon: (code) => {
      if (Date.now() - swipedAt.current < 350) return;
      setSheet(code);
    },
  };

  const visible = spread ? [2 * flipped - 1, 2 * flipped].filter((p) => p >= 0 && p < pages.length) : [flipped];
  const stats = bookletStats(booklet);
  const shift = spread ? (flipped === 0 ? -pageW / 2 : flipped === L ? pageW / 2 : 0) : 0;
  const rightLeft = Math.max(0, L - flipped - 1);
  const leftLeft = Math.max(0, flipped - 1);
  const edges = (n: number, dir: 1 | -1) =>
    Array.from({ length: Math.min(6, n) }, (_, k) => `${dir * (k + 1)}px ${(k + 1) * 0.6}px 0 ${k % 2 ? "white" : "var(--paper-edge)"}`)
      .concat("0 30px 50px -18px rgba(0,0,0,0.55)")
      .join(", ");

  const contents = useMemo(() => {
    const seen = new Set<string>();
    return pages
      .map((p, i) => ({ label: pageLabel(p), page: i }))
      .filter((c) => (seen.has(c.label) ? false : (seen.add(c.label), true)));
  }, [pages]);

  const sheetHit = sheet ? findCoupon([booklet], sheet) : null;

  // Keep the chip for the open page scrolled into view.
  useEffect(() => {
    const el = chipsRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (el && chipsRef.current) chipsRef.current.scrollTo({ left: el.offsetLeft - chipsRef.current.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [flipped]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${booklet.label} booklet ${booklet.id}`}
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-[radial-gradient(120%_80%_at_50%_0%,#2b4ba6_0%,#10215a_55%,#081236_100%)] text-white"
    >
      {/* top bar */}
      <div className="flex items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 md:px-8">
        <MiniBooklet count={booklet.couponCount} cover={cover} className="w-8" faded={bookletIsExpired(booklet, now)} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold md:text-base">{booklet.label} gallon booklet</p>
          <p className="truncate text-xs text-white/70">
            Nº {booklet.id} · {stats.available} of {stats.total} left ·{" "}
            {bookletIsExpired(booklet, now) ? `expired ${formatDate(booklet.expiresAt)}` : `valid till ${formatDate(booklet.expiresAt)}`}
          </p>
        </div>
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Close booklet"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 ring-1 ring-white/15 transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* the book */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {spread && (
          <NavButton dir={-1} disabled={flipped === 0} onClick={() => go(flipped - 1)} className="absolute top-1/2 left-6 -translate-y-1/2" />
        )}
        <div
          className="animate-bk-in touch-pan-y select-none"
          style={{ clipPath: spread ? undefined : "inset(-20% 0 -20% 0)" }}
          onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
          onPointerUp={(e) => {
            const s = swipe.current;
            swipe.current = null;
            if (!s) return;
            const dx = e.clientX - s.x;
            const dy = e.clientY - s.y;
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
              swipedAt.current = Date.now();
              go(flippedRef.current + (dx < 0 ? 1 : -1));
            }
          }}
          onPointerCancel={() => (swipe.current = null)}
        >
          <div
            className="bk-book"
            style={{ width: spread ? pageW * 2 : pageW, height: pageH, transform: `translateX(${shift}px)` }}
          >
            {/* page edges under the open pages */}
            {flipped < L && (
              <div className="bk-stack" style={{ left: spread ? pageW : 0, width: pageW, height: pageH, boxShadow: edges(rightLeft, 1) }} />
            )}
            {spread && flipped > 0 && (
              <div className="bk-stack" style={{ left: 0, width: pageW, height: pageH, boxShadow: edges(leftLeft, -1) }} />
            )}

            {leaves.map((leaf, i) => {
              const isFlipped = i < flipped;
              const front = pages[leaf.front];
              const back = leaf.back >= 0 ? pages[leaf.back] : undefined;
              const showFront = visible.includes(leaf.front);
              const showBack = leaf.back >= 0 && visible.includes(leaf.back);
              const style: CSSProperties & Record<"--bk-dur" | "--bk-delay", string> = {
                left: spread ? pageW : 0,
                width: pageW,
                height: pageH,
                zIndex: onLeft[i] ? i + 1 : L - i,
                transform: `rotateY(${isFlipped ? -180 : 0}deg)`,
                transitionDuration: `${dur}ms`,
                transitionDelay: `${delays[i] ?? 0}ms`,
                "--bk-dur": `${dur}ms`,
                "--bk-delay": `${delays[i] ?? 0}ms`,
              };
              return (
                <div key={`${spread ? "s" : "p"}${i}`} className="bk-leaf" style={style}>
                  <div
                    className={`bk-face bk-face-front rounded-r-[6px] ${isPaperPage(front) ? "bk-paper" : ""}`}
                    aria-hidden={!showFront}
                    inert={!showFront}
                  >
                    {front && <PageView page={front} index={leaf.front} ctx={ctx} />}
                    {(turns[i] ?? 0) > 0 && !reduced && <div key={turns[i]} className="bk-shade bk-shade-front" />}
                  </div>
                  <div
                    className={`bk-face bk-face-back rounded-l-[6px] ${!back || isPaperPage(back) ? "bk-paper" : ""}`}
                    aria-hidden={!showBack}
                    inert={!showBack}
                  >
                    {back && <PageView page={back} index={leaf.back} ctx={ctx} />}
                    {(turns[i] ?? 0) > 0 && !reduced && <div key={turns[i]} className="bk-shade bk-shade-back" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {spread && (
          <NavButton dir={1} disabled={flipped >= maxFlip} onClick={() => go(flipped + 1)} className="absolute top-1/2 right-6 -translate-y-1/2" />
        )}
      </div>

      {/* controls */}
      <div className="px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-8">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          {!spread && <NavButton dir={-1} disabled={flipped === 0} onClick={() => go(flipped - 1)} />}
          <nav ref={chipsRef} aria-label="Booklet pages" className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto md:justify-center">
            {contents.map((c) => {
              const active = visible.includes(c.page) || (pages[c.page]?.kind === "coupons" && visible.some((v) => v === c.page));
              return (
                <button
                  key={c.label}
                  onClick={() => go(flipForPage(c.page))}
                  aria-current={active ? "page" : undefined}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none ${
                    active ? "bg-white text-brand" : "bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </nav>
          {!spread && <NavButton dir={1} disabled={flipped >= maxFlip} onClick={() => go(flipped + 1)} />}
        </div>
        <p className="mt-2 text-center text-[11px] text-white/60" aria-live="polite">
          {visible.length === 2
            ? `Pages ${visible[0]}–${visible[1]} of ${pages.length - 1}`
            : visible[0] === 0
              ? "Cover"
              : visible[0] === pages.length - 1
                ? "Back cover"
                : `Page ${visible[0]} of ${pages.length - 1}`}
          <span className="hidden sm:inline"> · {spread ? "Use ← → keys" : "Swipe to turn"} · tap a coupon for details</span>
        </p>
      </div>

      {sheetHit && (
        <CouponSheet
          booklet={booklet}
          coupon={sheetHit.coupon}
          now={now}
          picked={pickSet.has(sheetHit.coupon.code)}
          knownOrders={knownOrders}
          onClose={() => setSheet(null)}
          onUse={() => onUse(sheetHit.coupon.code)}
          onUnuse={() => {
            onUnuse(sheetHit.coupon.code);
            setSheet(null);
          }}
          onOpenOrder={onOpenOrder}
        />
      )}
    </div>
  );
}

function range(a: number, b: number) {
  return Array.from({ length: Math.max(0, b - a) }, (_, i) => a + i);
}

function NavButton({ dir, disabled, onClick, className = "" }: { dir: 1 | -1; disabled: boolean; onClick: () => void; className?: string }) {
  const Icon = dir > 0 ? ChevronRight : ChevronLeft;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir > 0 ? "Next page" : "Previous page"}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-brand shadow-[0_10px_24px_-10px_rgba(0,0,0,0.6)] transition-opacity focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand focus-visible:outline-none disabled:opacity-30 ${className}`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Coupon details                                                      */
/* ------------------------------------------------------------------ */

function CouponSheet({
  booklet,
  coupon,
  now,
  picked,
  knownOrders,
  onClose,
  onUse,
  onUnuse,
  onOpenOrder,
}: {
  booklet: Booklet;
  coupon: BookletCoupon;
  now: Date;
  picked: boolean;
  knownOrders: Set<string>;
  onClose: () => void;
  onUse: () => void;
  onUnuse: () => void;
  onOpenOrder: (id: string) => void;
}) {
  const status = couponStatus(coupon, booklet, now);
  const cover = coverFor(booklet.productId);
  const days = bookletDaysLeft(booklet, now);
  const gallon = byId(GALLON_ID);
  const rows: [string, ReactNode][] = [
    ["Booklet", `${booklet.label} · Nº ${booklet.id}`],
    ["Coupon", `${coupon.number} of ${booklet.couponCount}`],
    ["Pays for", `1 × ${gallon?.name ?? "5 Gallon"} (${gallon?.size ?? "18.9 L"})`],
    ["Value", formatPrice(gallon?.price ?? 12)],
  ];
  if (status === "REDEEMED") {
    rows.push(["Redeemed", coupon.redeemedAt ? formatDateTime(coupon.redeemedAt) : "Yes"]);
    if (coupon.orderId)
      rows.push([
        "Order",
        knownOrders.has(coupon.orderId) ? (
          <button onClick={() => onOpenOrder(coupon.orderId!)} className="font-bold text-brand underline-offset-2 hover:underline">
            #{coupon.orderId}
          </button>
        ) : (
          `#${coupon.orderId}`
        ),
      ]);
  } else if (status === "EXPIRED") {
    rows.push(["Expired on", formatDate(booklet.expiresAt)]);
  } else {
    rows.push(["Valid until", `${formatDate(booklet.expiresAt)}${days !== null ? ` · ${days} ${days === 1 ? "day" : "days"} left` : ""}`]);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 animate-fade md:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Coupon ${coupon.code}`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-background p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-foreground shadow-2xl animate-sheet md:rounded-3xl"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border md:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-f-2xs font-extrabold tracking-widest text-muted-foreground uppercase">E-coupon Nº {pad2(coupon.number)}</p>
            <h2 className="mt-0.5 text-f-lg font-extrabold">One 5 Gallon refill</h2>
          </div>
          <button onClick={onClose} aria-label="Close coupon details" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* the coupon itself */}
        <div className="relative mt-4 flex overflow-hidden rounded-2xl ring-1 ring-border">
          <div
            className={`flex w-24 shrink-0 flex-col items-center justify-center py-4 text-white ${status === "AVAILABLE" ? "" : "bg-[oklch(0.72_0.03_260)]"}`}
            style={status === "AVAILABLE" ? { background: `linear-gradient(160deg, ${cover.from}, ${cover.to})` } : undefined}
          >
            <img src={gallonImg} alt="" className={`h-14 w-auto object-contain drop-shadow ${status === "AVAILABLE" ? "" : "grayscale"}`} />
            <span className="mt-1 text-[10px] font-bold tracking-widest">18.9 L</span>
          </div>
          <div className="min-w-0 flex-1 border-l-2 border-dashed border-border p-3.5">
            <p className="text-f-2xs font-semibold text-muted-foreground">Coupon code</p>
            <div className="mt-0.5 flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate font-mono text-xl font-extrabold tracking-wider text-brand">{coupon.code}</p>
              <CopyButton text={coupon.code} label={`Copy code ${coupon.code}`} />
            </div>
            <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-f-2xs font-bold ${statusTone(status, picked && status === "AVAILABLE")}`}>
              {picked && status === "AVAILABLE" ? "In your cart" : COUPON_STATUS_LABEL[status]}
            </span>
          </div>
        </div>

        <dl className="mt-4 space-y-2 text-f-xs">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-3">
              <dt className="shrink-0 text-muted-foreground">{k}</dt>
              <dd className="min-w-0 text-right font-semibold">{v}</dd>
            </div>
          ))}
        </dl>

        {status === "AVAILABLE" ? (
          picked ? (
            <button onClick={onUnuse} className="mt-5 w-full rounded-2xl border border-border bg-background py-3.5 text-f-sm font-bold text-foreground">
              Remove from cart
            </button>
          ) : (
            <button
              onClick={onUse}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 text-f-sm font-bold text-primary-foreground focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <ShoppingBag className="h-4 w-4" /> Use for a 5 Gallon
            </button>
          )
        ) : (
          <p className="mt-5 rounded-xl bg-secondary px-3 py-2.5 text-center text-f-xs font-semibold text-muted-foreground">
            {status === "REDEEMED" ? "This coupon has been used and can't be used again." : "This coupon expired with its booklet and can no longer be used."}
          </p>
        )}
        {status === "AVAILABLE" && !picked && (
          <p className="mt-2 text-center text-f-2xs text-muted-foreground">We'll add a 5 Gallon to your cart and pay for it with this coupon.</p>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* E-coupons screen                                                    */
/* ================================================================== */

function ShelfItem({ b, now, onOpen }: { b: Booklet; now: Date; onOpen: () => void }) {
  const stats = bookletStats(b);
  const expired = bookletIsExpired(b, now);
  const days = bookletDaysLeft(b, now);
  return (
    <li>
      <button
        onClick={onOpen}
        className="group card-soft flex w-full items-center gap-3.5 rounded-3xl p-3.5 text-left transition-shadow hover:shadow-[0_14px_30px_-18px_rgba(13,42,110,0.6)] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none xs:p-4"
      >
        <MiniBooklet count={b.couponCount} cover={coverFor(b.productId)} faded={expired} className="w-[4.5rem] xs:w-20" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-f-sm font-extrabold text-foreground">{b.label} booklet</span>
            {expired ? (
              <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-f-2xs font-bold text-muted-foreground">Expired</span>
            ) : days !== null && days <= EXPIRING_SOON_DAYS ? (
              <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-f-2xs font-bold text-destructive">Expires soon</span>
            ) : null}
          </span>
          <span className="block font-mono text-f-2xs text-muted-foreground">Nº {b.id}</span>
          <UsageBar stats={stats} className="mt-2" />
          <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-f-2xs font-semibold">
            <span className="text-aqua">{stats.available} available</span>
            <span className="text-brand">{stats.redeemed} redeemed</span>
            {stats.expired > 0 && <span className="text-muted-foreground">{stats.expired} expired</span>}
          </span>
          <span className="mt-1 block text-f-2xs text-muted-foreground">
            {expired ? `Expired ${formatDate(b.expiresAt)}` : `Valid till ${formatDate(b.expiresAt)} · ${days} days left`}
          </span>
        </span>
        <span className="hidden shrink-0 items-center gap-1 rounded-full bg-brand-soft px-3 py-2 text-f-2xs font-bold text-brand xs:inline-flex">
          <BookOpen className="h-3.5 w-3.5" /> Open
        </span>
      </button>
    </li>
  );
}

function BuyCard({ p, inCart, onBuy }: { p: Product; inCart: number; onBuy: () => void }) {
  const spec = p.booklet!;
  const saving = bookletSaving(p);
  return (
    <li className="card-soft relative flex items-center gap-3.5 rounded-3xl p-3.5 xs:p-4">
      {spec.tag && (
        <span className="absolute -top-2 right-4 rounded-full bg-brand px-2.5 py-0.5 text-f-2xs font-bold text-primary-foreground shadow">{spec.tag}</span>
      )}
      <MiniBooklet count={spec.coupons} cover={spec.cover} className="w-16 xs:w-[4.5rem]" />
      <div className="min-w-0 flex-1">
        <p className="text-f-sm font-extrabold text-foreground">
          {spec.label} · {spec.coupons} coupons
        </p>
        <p className="text-f-2xs text-muted-foreground">
          {spec.coupons} × 5 Gallon · valid {spec.validityMonths} months
        </p>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span className="text-f-lg font-extrabold text-brand">{formatPrice(p.price)}</span>
          <s className="text-f-2xs text-muted-foreground">{formatPrice(gallonPrice() * spec.coupons)}</s>
        </div>
        <p className="text-f-2xs font-semibold text-aqua">
          {formatPrice(pricePerCoupon(p))} a gallon · save {formatPrice(saving)}
        </p>
      </div>
      <button
        onClick={onBuy}
        className="flex shrink-0 flex-col items-center gap-0.5 rounded-2xl bg-brand px-3 py-2.5 text-f-2xs font-bold text-primary-foreground focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
        aria-label={`Add the ${spec.label} booklet to your cart`}
      >
        <Plus className="h-4 w-4" />
        {inCart > 0 ? `In cart (${inCart})` : "Add"}
      </button>
    </li>
  );
}

export function BookletScreen({
  booklets,
  now,
  cartQty,
  focus,
  onOpenBooklet,
  onBuy,
  onUseNext,
  onBack,
  appliedPromo,
  onApplyPromo,
  onRemovePromo,
}: {
  booklets: Booklet[];
  now: Date;
  /** Quantity of each product currently in the cart. */
  cartQty: Record<string, number>;
  /** Scroll straight to a section, e.g. from the cart's "Browse codes". */
  focus?: "codes" | null;
  onOpenBooklet: (id: string) => void;
  onBuy: (p: Product) => void;
  onUseNext: () => void;
  onBack: () => void;
  appliedPromo: string | null;
  onApplyPromo: (c: Coupon) => void;
  onRemovePromo: () => void;
}) {
  useEffect(() => {
    if (focus === "codes") document.getElementById("discount-codes")?.scrollIntoView({ block: "start" });
  }, [focus]);

  const active = booklets.filter((b) => !bookletIsExpired(b, now));
  const expired = booklets.filter((b) => bookletIsExpired(b, now));
  const all = bookletStats(booklets);
  const next = nextExpiringBooklet(booklets, now);
  const nextDays = next ? bookletDaysLeft(next, now) : null;
  const latest = active.find((b) => b.coupons.some((c) => c.status === "AVAILABLE")) ?? booklets[0];

  return (
    <section className="animate-rise">
      <BackLink label="Back" onClick={onBack} />
      <h1 className="mt-2 text-f-xl font-extrabold tracking-tight text-foreground">E-coupon booklets</h1>
      <p className="mt-0.5 text-f-sm text-muted-foreground">Prepaid 5 Gallon refills. One coupon pays for one bottle.</p>

      {/* wallet */}
      <div className="relative mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand to-aqua p-4 text-primary-foreground shadow-[0_18px_36px_-22px_rgba(13,42,110,0.9)] xs:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_0%_0%,rgba(255,255,255,0.2),transparent_55%)]" />
        <Droplets className="pointer-events-none absolute -right-4 -bottom-6 h-32 w-32 text-white/10" />
        <div className="relative flex items-center gap-4">
          <div className="relative w-[5.5rem] shrink-0">
            <Donut stats={all} dark className="w-full -rotate-90" />
            <div className="absolute inset-0 grid place-content-center text-center">
              <span className="text-f-xl leading-none font-extrabold">{all.available}</span>
              <span className="text-[10px] font-semibold opacity-80">left</span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-f-2xs font-extrabold tracking-widest uppercase opacity-90">
              <Ticket className="h-3.5 w-3.5" /> Your gallon coupons
            </p>
            <p className="mt-1 text-f-lg leading-tight font-extrabold">
              {all.available} {all.available === 1 ? "gallon" : "gallons"} ready to use
            </p>
            <p className="mt-0.5 text-f-2xs opacity-85">
              {next && nextDays !== null
                ? `Next expiry ${formatDate(next.expiresAt)} (${nextDays} ${nextDays === 1 ? "day" : "days"})`
                : booklets.length
                  ? "No active coupons. Buy a booklet to top up."
                  : "Buy a booklet and pay less for every gallon."}
            </p>
          </div>
        </div>
        <dl className="relative mt-4 grid grid-cols-4 gap-1.5 text-center">
          {(
            [
              ["Total", all.total],
              ["Available", all.available],
              ["Redeemed", all.redeemed],
              ["Expired", all.expired],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white/12 px-1 py-2 ring-1 ring-white/15">
              <dd className="text-f-base leading-none font-extrabold">{v}</dd>
              <dt className="mt-1 truncate text-[10px] font-semibold opacity-80">{k}</dt>
            </div>
          ))}
        </dl>
        <div className="relative mt-4 flex flex-wrap gap-2">
          {all.available > 0 && (
            <button onClick={onUseNext} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-f-xs font-extrabold text-brand">
              <ShoppingBag className="h-3.5 w-3.5" /> Use a coupon
            </button>
          )}
          {latest && (
            <button
              onClick={() => onOpenBooklet(latest.id)}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-f-xs font-bold ring-1 ring-white/30"
            >
              <BookOpen className="h-3.5 w-3.5" /> Open booklet
            </button>
          )}
        </div>
      </div>

      {/* shelf */}
      <h2 className="mt-7 text-f-base font-bold text-foreground">My booklets</h2>
      {booklets.length === 0 ? (
        <div className="card-soft mt-3 flex items-center gap-3 rounded-3xl p-4">
          <div className="bg-aqua-soft grid h-11 w-11 shrink-0 place-items-center rounded-full">
            <BookOpen className="h-5 w-5 text-brand" />
          </div>
          <p className="text-f-xs text-muted-foreground">Booklets you buy appear here, ready to open and use at checkout.</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {[...active, ...expired].map((b) => (
            <ShelfItem key={b.id} b={b} now={now} onOpen={() => onOpenBooklet(b.id)} />
          ))}
        </ul>
      )}

      {/* buy */}
      <div className="mt-8 flex items-end justify-between gap-2">
        <h2 className="text-f-base font-bold text-foreground">Buy a booklet</h2>
        <span className="text-f-2xs font-semibold text-muted-foreground">Issued instantly · no delivery fee</span>
      </div>
      <ul className="mt-4 space-y-4">
        {bookletProducts.map((p) => (
          <BuyCard key={p.id} p={p} inCart={cartQty[p.id] ?? 0} onBuy={() => onBuy(p)} />
        ))}
      </ul>

      {/* how it works */}
      <div className="card-soft mt-6 rounded-3xl p-4">
        <h2 className="flex items-center gap-1.5 text-f-sm font-bold text-foreground">
          <Receipt className="h-4 w-4 text-brand" /> How it works
        </h2>
        <ol className="mt-3 grid gap-3 xs:grid-cols-3">
          {[
            ["Buy a booklet", "Pay once at checkout. Your coupons are issued straight away."],
            ["Order gallons", "Add 5 Gallon bottles and pay with coupons in the cart."],
            ["Track every coupon", "Each one is stamped redeemed with its order. No reuse."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-2.5 xs:flex-col xs:gap-1.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-f-xs font-extrabold text-primary-foreground">{i + 1}</span>
              <span className="min-w-0">
                <span className="block text-f-xs font-bold text-foreground">{t}</span>
                <span className="block text-f-2xs text-muted-foreground">{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* promo codes (the existing discount-code coupons) */}
      <div id="discount-codes" className="scroll-mt-20">
        <h2 className="mt-8 text-f-base font-bold text-foreground">Discount codes</h2>
        <p className="mt-0.5 text-f-xs text-muted-foreground">One code per order, on top of any e-coupons. Codes don't apply to booklets.</p>
        <div className="mt-3 space-y-3">
          {promoCoupons.map((c) => (
            <PromoTicket key={c.id} coupon={c} detailed applied={appliedPromo === c.code} onApply={onApplyPromo} onRemove={onRemovePromo} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* Home banner                                                         */
/* ================================================================== */

export function BookletBanner({ booklets, now, onOpen }: { booklets: Booklet[]; now: Date; onOpen: () => void }) {
  const stats = bookletStats(booklets.filter((b) => !bookletIsExpired(b, now)));
  const next = nextExpiringBooklet(booklets, now);
  const best = bookletProducts[bookletProducts.length - 1]!;
  const showcase = next ?? booklets[0];
  const cover = showcase ? coverFor(showcase.productId) : best.booklet!.cover;
  const count = showcase?.couponCount ?? best.booklet!.coupons;
  return (
    <section className="mt-6" aria-label="E-coupon booklets">
      <button
        onClick={onOpen}
        className="group relative flex w-full items-center gap-3 overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand to-aqua p-4 text-left text-primary-foreground shadow-[0_14px_30px_-18px_rgba(13,42,110,0.7)] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none xs:p-5"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_0%_0%,rgba(255,255,255,0.2),transparent_55%)]" />
        <span className="absolute top-1/2 -left-2.5 h-5 w-5 -translate-y-1/2 rounded-full bg-background" />
        <div className="relative min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-f-2xs font-extrabold tracking-widest uppercase opacity-90">
            <Ticket className="h-3.5 w-3.5" /> E-coupon booklet
          </p>
          {stats.available > 0 ? (
            <>
              <p className="mt-1.5 text-f-xl leading-tight font-extrabold tracking-tight">
                {stats.available} {stats.available === 1 ? "gallon" : "gallons"} prepaid
              </p>
              <p className="mt-0.5 text-f-xs opacity-90">
                {next ? `Use them by ${formatDate(next.expiresAt)}.` : ""} Pay with a coupon at checkout.
              </p>
            </>
          ) : (
            <>
              <p className="mt-1.5 text-f-xl leading-tight font-extrabold tracking-tight">Prepay your gallons</p>
              <p className="mt-0.5 text-f-xs opacity-90">Booklets from {formatPrice(pricePerCoupon(best))} a 5 Gallon. Save up to {formatPrice(bookletSaving(best))}.</p>
            </>
          )}
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-f-xs font-extrabold text-brand">
            {stats.available > 0 ? "Open my booklet" : "See booklets"} <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
        <MiniBooklet count={count} cover={cover} className="relative w-[5.5rem] xs:w-24" />
      </button>
    </section>
  );
}

/* ================================================================== */
/* Cart: pay with e-coupons                                            */
/* ================================================================== */

export function CartBookletCoupons({
  available,
  eligible,
  used,
  discount,
  codes,
  onSet,
  onAddGallon,
  onOpenBooklets,
}: {
  /** Usable coupons the customer owns. */
  available: number;
  /** One-time 5 Gallon bottles in the cart. */
  eligible: number;
  used: number;
  discount: number;
  codes: string[];
  onSet: (n: number) => void;
  onAddGallon: () => void;
  onOpenBooklets: () => void;
}) {
  const max = Math.min(available, eligible);
  if (available === 0 && eligible === 0) return null;

  if (available === 0) {
    return (
      <button
        onClick={onOpenBooklets}
        className="card-soft mt-5 flex w-full items-center gap-3 rounded-2xl p-3.5 text-left focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      >
        <MiniBooklet count={20} cover={bookletProducts[1]!.booklet!.cover} className="w-10" />
        <span className="min-w-0 flex-1">
          <span className="block text-f-sm font-bold text-foreground">Pay less for your gallons</span>
          <span className="block text-f-2xs text-muted-foreground">
            E-coupon booklets from {formatPrice(pricePerCoupon(bookletProducts[bookletProducts.length - 1]!))} a 5 Gallon.
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="card-soft mt-5 rounded-2xl p-3.5">
      <div className="flex items-center gap-3">
        <div className="bg-aqua-soft grid h-10 w-10 shrink-0 place-items-center rounded-full">
          <Ticket className="h-5 w-5 text-brand" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-f-sm font-bold text-foreground">Pay with e-coupons</p>
          <p className="text-f-2xs text-muted-foreground">
            {available} available · {eligible} {eligible === 1 ? "gallon" : "gallons"} in cart
          </p>
        </div>
        <button onClick={onOpenBooklets} className="shrink-0 text-f-xs font-semibold text-brand">
          Booklets
        </button>
      </div>

      {eligible === 0 ? (
        <button
          onClick={onAddGallon}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-soft py-2.5 text-f-xs font-bold text-brand"
        >
          <Plus className="h-3.5 w-3.5" /> Add a 5 Gallon to use a coupon
        </button>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-secondary/70 p-2">
            <button
              onClick={() => onSet(used - 1)}
              disabled={used === 0}
              aria-label="Use one coupon fewer"
              className="grid h-8 w-8 place-items-center rounded-full bg-background text-foreground disabled:opacity-40"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <p className="min-w-0 flex-1 text-center text-f-xs font-semibold text-foreground" aria-live="polite">
              <span className="text-f-base font-extrabold text-brand">{used}</span> of {eligible} {eligible === 1 ? "gallon" : "gallons"} paid by coupon
            </p>
            <button
              onClick={() => onSet(used + 1)}
              disabled={used >= max}
              aria-label="Use one more coupon"
              className="grid h-8 w-8 place-items-center rounded-full bg-brand text-primary-foreground disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {used < max && (
            <button onClick={() => onSet(max)} className="mt-2 w-full rounded-xl bg-brand py-2.5 text-f-xs font-bold text-primary-foreground">
              Use {max} {max === 1 ? "coupon" : "coupons"}, save {formatPrice((discount / Math.max(1, used)) * max || gallonPrice() * max)}
            </button>
          )}
          {used > 0 && (
            <p className="mt-2 text-f-2xs font-semibold text-aqua">
              You save {formatPrice(discount)}. {codes.length === 1 ? "Coupon" : "Coupons"} {codes.join(", ")}{" "}
              {codes.length === 1 ? "is" : "are"} stamped redeemed when you place the order.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** Days until a booklet expires, for the account row. */
export function bookletsSummary(booklets: Booklet[], now: Date) {
  const stats = bookletStats(booklets);
  const next = nextExpiringBooklet(booklets, now);
  return { ...stats, nextExpiry: next ? daysUntil(next.expiresAt, now) : null };
}
