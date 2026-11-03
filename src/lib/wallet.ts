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
 * Points are derived the same way: the balance is BASE_POINTS (points from
 * earlier orders) + points earned on placed orders - points redeemed to the wallet.
 */

/** 1,000 points = KWD 1.000, so 1 point = KWD 0.001. */
export const POINTS_PER_KWD = 1000;
export const POINT_VALUE_KWD = 1 / POINTS_PER_KWD;
/** Smallest amount of points that can be redeemed in one go. */
export const MIN_REDEEM_POINTS = 100;
/** Quick-pick amounts on the Points page. */
export const REDEEM_PRESETS = [100, 250, 500];

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

/** Points already turned into wallet money. */
export const redeemedPoints = (txns: WalletTxn[]) =>
  txns.reduce((n, t) => (t.kind === "POINTS" ? n + (t.points ?? 0) : n), 0);

/** Points earned on placed orders (not counting what is still sitting in the cart). */
export const orderPoints = (orders: Order[]) => orders.reduce((n, o) => n + o.pointsEarned, 0);

/** Points the customer can redeem right now. */
export const availablePoints = (orders: Order[], txns: WalletTxn[]) =>
  Math.max(0, BASE_POINTS + orderPoints(orders) - redeemedPoints(txns));

export type PointsEvent = {
  id: string;
  kind: "EARN" | "REDEEM" | "BROUGHT_FORWARD";
  /** Signed: positive when earned, negative when redeemed. */
  points: number;
  /** null for the balance brought forward, which has no single date. */
  createdAt: string | null;
  title: string;
  detail: string;
};

/** Every points movement, newest first. */
export function pointsEvents(orders: Order[], txns: WalletTxn[]): PointsEvent[] {
  const earned: PointsEvent[] = orders
    .filter((o) => o.pointsEarned > 0)
    .map((o) => {
      const first = o.items[0]?.product.name ?? "your order";
      const more = o.items.length - 1;
      return {
        id: `earn-${o.id}`,
        kind: "EARN" as const,
        points: o.pointsEarned,
        createdAt: o.createdAt,
        title: `Earned on order ${o.id}`,
        detail: more > 0 ? `${first} + ${more} more` : first,
      };
    });
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
  const list = [...earned, ...redeemed].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  if (BASE_POINTS > 0) {
    list.push({
      id: "brought-forward",
      kind: "BROUGHT_FORWARD",
      points: BASE_POINTS,
      createdAt: null,
      title: "Points from earlier orders",
      detail: "Balance brought forward",
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

  /** Turns points into wallet money. `available` is the customer's redeemable points right now. */
  redeemPoints(points: number, available: number): WalletTxn {
    if (!Number.isInteger(points) || points < MIN_REDEEM_POINTS) {
      throw new WalletError(`Redeem at least ${MIN_REDEEM_POINTS} points.`);
    }
    if (points > available) {
      throw new WalletError(`You only have ${available} points to redeem.`);
    }
    const txn: WalletTxn = {
      id: nextId(),
      kind: "POINTS",
      direction: "in",
      amount: pointsToKwd(points),
      createdAt: new Date().toISOString(),
      title: "Points redeemed",
      detail: `${points.toLocaleString("en-US")} points`,
      points,
    };
    write(WALLET_KEY, [txn, ...loadAll()]);
    return txn;
  },
};
