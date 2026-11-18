import { DAY, startOfDay } from "@/lib/dates";
import type { Order } from "@/lib/orders";
import { BASE_POINTS } from "@/lib/abraaj-data";
import { hasStorage, read, write } from "@/lib/storage";

/* ================================================================== */
/* Wallet + points                                                      */
/* ================================================================== */
/*
 * Same idea as `ordersApi` / `bookletsApi`: there is no backend yet, so the
 * wallet ledger lives in localStorage behind `walletApi`. Screens only talk to
 * this file, so swapping the bodies below for fetch() calls to a real payment
 * backend won't touch any UI.
 *
 * The wallet is a ledger of transactions. The balance is never stored, it is
 * always the sum of the ledger, so the balance and the history can't disagree.
 *
 * Points are derived the same way, but they can no longer be turned into wallet
 * money. Every batch of points (one per order, plus BASE_POINTS from earlier
 * orders) is valid for POINTS_VALID_MONTHS and then expires. The balance is the
 * sum of the batches that haven't expired yet.
 */

/** Kept for older screens that show a points value; points can't be redeemed to the wallet. */
export const POINTS_PER_KWD = 1000;
export const POINT_VALUE_KWD = 1 / POINTS_PER_KWD;

/** How long earned points stay valid, counted from the order date. */
export const POINTS_VALID_MONTHS = 12;
/** Points expiring within this many days are flagged "expiring soon". */
export const POINTS_EXPIRING_SOON_DAYS = 30;

/** Wallet top-up limits and quick-pick amounts, in KWD. */
export const MIN_TOPUP = 1;
export const MAX_TOPUP = 500;
export const TOPUP_PRESETS = [5, 10, 20, 50];

export type WalletMethod = "knet" | "card" | "apple";

export const WALLET_METHOD_LABEL: Record<WalletMethod, string> = {
  knet: "KNET",
  card: "Credit / debit card",
  apple: "Apple Pay",
};

export type WalletTxnKind = "TOPUP" | "POINTS" | "PAYMENT" | "REFUND";

export type WalletTxn = {
  id: string;
  kind: WalletTxnKind;
  /** "in" adds to the balance, "out" takes from it. */
  direction: "in" | "out";
  /** Always positive, in KWD. */
  amount: number;
  createdAt: string;
  title: string;
  detail?: string;
  method?: WalletMethod;
  /** Points spent, for kind "POINTS". */
  points?: number;
  orderId?: string;
};

export class WalletError extends Error {}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export const pointsToKwd = (points: number) => round3(points / POINTS_PER_KWD);

/* ------------------------------------------------------------------ */
/* Pure helpers over a ledger                                           */
/* ------------------------------------------------------------------ */

export const walletBalance = (txns: WalletTxn[]) =>
  round3(txns.reduce((n, t) => n + (t.direction === "in" ? t.amount : -t.amount), 0));

export const walletTotals = (txns: WalletTxn[]) => ({
  added: round3(txns.filter((t) => t.direction === "in").reduce((n, t) => n + t.amount, 0)),
  used: round3(txns.filter((t) => t.direction === "out").reduce((n, t) => n + t.amount, 0)),
});

/** Points turned into wallet money by older versions of the app (redeeming is no longer offered). */
export const redeemedPoints = (txns: WalletTxn[]) =>
  txns.reduce((n, t) => (t.kind === "POINTS" ? n + (t.points ?? 0) : n), 0);

/** Points earned on placed orders (not counting what is still sitting in the cart). */
export const orderPoints = (orders: Order[]) => orders.reduce((n, o) => n + o.pointsEarned, 0);

/** `date` + `months`, keeping the day of the month where possible. */
function addMonths(date: Date, months: number) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d;
}

/** When points earned on `earnedAt` expire. */
export const pointsExpiryDate = (earnedAt: string | Date) =>
  addMonths(new Date(earnedAt), POINTS_VALID_MONTHS).toISOString();

/**
 * Expiry of the points brought forward from earlier orders. There's no backend
 * yet, so the demo puts it at the end of next month, which shows the
 * "expiring soon" state. Replace with the real date from the API.
 */
function broughtForwardExpiry(now: Date) {
  return new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59).toISOString();
}

/** One lot of points with its own expiry date. */
export type PointsBatch = {
  id: string;
  title: string;
  detail: string;
  /** null for the balance brought forward, which has no single date. */
  earnedAt: string | null;
  expiresAt: string;
  /** Points originally earned in this batch. */
  earned: number;
  /** Points still left in this batch (after expiry this is what was lost). */
  remaining: number;
  expired: boolean;
};

/**
 * Every batch of points, soonest expiry first. Older wallet redemptions (from
 * before redeeming was removed) are taken from the batches that expire first.
 */
export function pointsBatches(orders: Order[], txns: WalletTxn[], now = new Date()): PointsBatch[] {
  const batches: PointsBatch[] = orders
    .filter((o) => o.pointsEarned > 0)
    .map((o) => {
      const first = o.items[0]?.product.name ?? "your order";
      const more = o.items.length - 1;
      return {
        id: o.id,
        title: `Earned on order ${o.id}`,
        detail: more > 0 ? `${first} + ${more} more` : first,
        earnedAt: o.createdAt,
        expiresAt: pointsExpiryDate(o.createdAt),
        earned: o.pointsEarned,
        remaining: o.pointsEarned,
        expired: false,
      };
    });
  if (BASE_POINTS > 0) {
    batches.push({
      id: "brought-forward",
      title: "Points from earlier orders",
      detail: "Balance brought forward",
      earnedAt: null,
      expiresAt: broughtForwardExpiry(now),
      earned: BASE_POINTS,
      remaining: BASE_POINTS,
      expired: false,
    });
  }
  batches.sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));

  let used = redeemedPoints(txns);
  for (const b of batches) {
    const take = Math.min(used, b.remaining);
    b.remaining -= take;
    used -= take;
    b.expired = new Date(b.expiresAt).getTime() <= now.getTime();
  }
  return batches;
}

/** Points the customer has right now (earned and not yet expired). */
export const availablePoints = (orders: Order[], txns: WalletTxn[], now = new Date()) =>
  pointsBatches(orders, txns, now).reduce((n, b) => (b.expired ? n : n + b.remaining), 0);

/** The next lot of points to expire, or null when nothing is due. */
export function nextPointsExpiry(orders: Order[], txns: WalletTxn[], now = new Date()) {
  const next = pointsBatches(orders, txns, now).find((b) => !b.expired && b.remaining > 0);
  return next ? { points: next.remaining, expiresAt: next.expiresAt } : null;
}

export type PointsEvent = {
  id: string;
  kind: "EARN" | "REDEEM" | "BROUGHT_FORWARD" | "EXPIRE";
  /** Signed: positive when earned, negative when expired (or redeemed in older versions). */
  points: number;
  /** null for the balance brought forward, which has no single date. */
  createdAt: string | null;
  /** For earned points: when they expire. */
  expiresAt?: string;
  title: string;
  detail: string;
};

/** Every points movement, newest first. */
export function pointsEvents(orders: Order[], txns: WalletTxn[], now = new Date()): PointsEvent[] {
  const batches = pointsBatches(orders, txns, now);
  const earned: PointsEvent[] = batches
    .filter((b) => b.earnedAt)
    .map((b) => ({
      id: `earn-${b.id}`,
      kind: "EARN" as const,
      points: b.earned,
      createdAt: b.earnedAt,
      expiresAt: b.expiresAt,
      title: b.title,
      detail: b.detail,
    }));
  const expired: PointsEvent[] = batches
    .filter((b) => b.expired && b.remaining > 0)
    .map((b) => ({
      id: `expire-${b.id}`,
      kind: "EXPIRE" as const,
      points: -b.remaining,
      createdAt: b.expiresAt,
      title: "Points expired",
      detail: b.earnedAt ? `From order ${b.id}` : "Points from earlier orders",
    }));
  const redeemed: PointsEvent[] = txns
    .filter((t) => t.kind === "POINTS")
    .map((t) => ({
      id: `redeem-${t.id}`,
      kind: "REDEEM" as const,
      points: -(t.points ?? 0),
      createdAt: t.createdAt,
      title: "Redeemed to wallet",
      detail: `+KWD ${t.amount.toFixed(3)} added to your wallet`,
    }));
  const list = [...earned, ...expired, ...redeemed].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  const forward = batches.find((b) => !b.earnedAt);
  if (forward) {
    list.push({
      id: "brought-forward",
      kind: "BROUGHT_FORWARD",
      points: forward.earned,
      createdAt: null,
      expiresAt: forward.expiresAt,
      title: forward.title,
      detail: forward.detail,
    });
  }
  return list;
}

/** "Today", "Yesterday" or "27 Oct 2026", for grouping history lists. */
export function dayHeading(iso: string, now = new Date()) {
  const d = startOfDay(new Date(iso)).getTime();
  const today = startOfDay(now).getTime();
  if (d === today) return "Today";
  if (d === today - DAY) return "Yesterday";
  return null;
}

/* ------------------------------------------------------------------ */
/* Service                                                              */
/* ------------------------------------------------------------------ */

const WALLET_KEY = "abraaj.wallet.v1";
const SEQ_KEY = "abraaj.walletSeq.v1";
const FIRST_SEQ = 5001;

/**
 * Seeds two example top-ups the first time the app runs, so the wallet and its
 * history aren't empty on a fresh install. Set to false to start with KWD 0.
 */
const SEED_DEMO_WALLET = true;

function nextId() {
  const seq = read<number>(SEQ_KEY) ?? FIRST_SEQ;
  write(SEQ_KEY, seq + 1);
  return `TXN-${seq}`;
}

function demoLedger(): WalletTxn[] {
  const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();
  return [
    {
      id: nextId(),
      kind: "TOPUP",
      direction: "in",
      amount: 15,
      createdAt: ago(9),
      title: "Added money",
      detail: WALLET_METHOD_LABEL.knet,
      method: "knet",
    },
    {
      id: nextId(),
      kind: "TOPUP",
      direction: "in",
      amount: 10,
      createdAt: ago(3),
      title: "Added money",
      detail: WALLET_METHOD_LABEL.card,
      method: "card",
    },
  ];
}

function loadAll(): WalletTxn[] {
  let txns = read<WalletTxn[]>(WALLET_KEY);
  if (!txns) {
    txns = SEED_DEMO_WALLET && hasStorage() ? demoLedger() : [];
    write(WALLET_KEY, txns);
  }
  return txns;
}

export const walletApi = {
  /** The whole ledger, newest first. */
  list(): WalletTxn[] {
    return [...loadAll()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /**
   * Adds money from a payment method. In a real backend this is where the
   * payment gateway (KNET, card, Apple Pay) is charged before the ledger entry
   * is written. Here the charge is simulated by the screen.
   */
  topUp(input: { amount: number; method: WalletMethod }): WalletTxn {
    const amount = round3(input.amount);
    if (!Number.isFinite(amount) || amount < MIN_TOPUP) {
      throw new WalletError(`The smallest top-up is KWD ${MIN_TOPUP.toFixed(3)}.`);
    }
    if (amount > MAX_TOPUP) {
      throw new WalletError(`The most you can add at once is KWD ${MAX_TOPUP.toFixed(3)}.`);
    }
    const txn: WalletTxn = {
      id: nextId(),
      kind: "TOPUP",
      direction: "in",
      amount,
      createdAt: new Date().toISOString(),
      title: "Added money",
      detail: WALLET_METHOD_LABEL[input.method],
      method: input.method,
    };
    write(WALLET_KEY, [txn, ...loadAll()]);
    return txn;
  },
};
