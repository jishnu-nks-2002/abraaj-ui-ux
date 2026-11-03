import { useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  CreditCard,
  History,
  Plus,
  Smartphone,
  Star,
  Landmark,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { formatPrice } from "@/lib/cart";
import { formatDateTime } from "@/lib/dates";
import {
  MAX_TOPUP,
  MIN_TOPUP,
  TOPUP_PRESETS,
  WALLET_METHOD_LABEL,
  pointsToKwd,
  walletTotals,
  type WalletMethod,
  type WalletTxn,
  type WalletTxnKind,
} from "@/lib/wallet";
import { BackLink, SectionTitle } from "@/components/abraaj/order-ui";
import { DayGroups, EmptyState, FilterChips, StatCard } from "@/components/abraaj/ledger-ui";

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const KIND_ICON: Record<WalletTxnKind, LucideIcon> = {
  TOPUP: Plus,
  POINTS: Star,
  PAYMENT: ArrowUpRight,
  REFUND: ArrowDownLeft,
};

const METHODS: { id: WalletMethod; sub: string; Icon: LucideIcon }[] = [
  { id: "knet", sub: "Pay with your KNET bank card", Icon: Landmark },
  { id: "card", sub: "Visa or Mastercard", Icon: CreditCard },
  { id: "apple", sub: "Confirm on your device", Icon: Smartphone },
];

/** Keeps what the customer types a valid KWD amount: digits, one dot, at most 3 decimals. */
function cleanAmount(raw: string) {
  const [whole = "", ...rest] = raw.replace(/[^\d.]/g, "").split(".");
  const intPart = whole.slice(0, String(MAX_TOPUP).length);
  return rest.length ? `${intPart}.${rest.join("").slice(0, 3)}` : intPart;
}

/** One ledger row: icon, what happened, when, and the amount. */
export function WalletTxnRow({ txn }: { txn: WalletTxn }) {
  const Icon = KIND_ICON[txn.kind];
  const isIn = txn.direction === "in";
  return (
    <div className="card-soft flex items-center gap-3 rounded-2xl p-3">
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
          isIn ? "bg-aqua-soft text-brand" : "bg-secondary text-muted-foreground"
        }`}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-f-sm font-bold text-foreground">{txn.title}</p>
        <p className="truncate text-f-2xs text-muted-foreground">
          {txn.detail ? `${txn.detail} · ` : ""}
          {formatDateTime(txn.createdAt)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-f-sm font-extrabold ${isIn ? "text-aqua" : "text-foreground"}`}>
          <span className="sr-only">{isIn ? "Money in: " : "Money out: "}</span>
          {isIn ? "+" : "−"}
          {formatPrice(txn.amount)}
        </p>
        <p className="text-f-2xs text-muted-foreground">Completed</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Wallet page                                                          */
/* ------------------------------------------------------------------ */

export function WalletScreen({
  balance,
  txns,
  pointsAvailable,
  onBack,
  onTopUp,
  onHistory,
  onPoints,
}: {
  balance: number;
  txns: WalletTxn[];
  /** Points the customer could redeem into the wallet. */
  pointsAvailable: number;
  onBack: () => void;
  /** Adds money. Returns an error message to show, or null when it worked. */
  onTopUp: (amount: number, method: WalletMethod) => string | null;
  onHistory: () => void;
  onPoints: () => void;
}) {
  const [amountText, setAmountText] = useState("10");
  const [method, setMethod] = useState<WalletMethod>("knet");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const amount = Number(amountText);
  const valid = amountText !== "" && Number.isFinite(amount) && amount >= MIN_TOPUP && amount <= MAX_TOPUP;
  const hint =
    amountText === ""
      ? null
      : amount < MIN_TOPUP
        ? `The smallest top-up is ${formatPrice(MIN_TOPUP)}.`
        : amount > MAX_TOPUP
          ? `The most you can add at once is ${formatPrice(MAX_TOPUP)}.`
          : null;

  function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    setDone(null);
    // Stands in for the payment gateway handing back a result.
    timer.current = setTimeout(() => {
      const err = onTopUp(amount, method);
      setBusy(false);
      if (err) {
        setError(err);
      } else {
        setDone(`${formatPrice(amount)} added to your wallet.`);
        setAmountText("10");
      }
    }, 900);
  }

  const recent = txns.slice(0, 3);

  return (
    <section className="animate-rise">
      <BackLink label="Account" onClick={onBack} />
      <h1 className="mt-2 text-f-xl font-extrabold tracking-tight text-foreground">Wallet</h1>

      {/* Balance */}
      <div className="relative mt-4 overflow-hidden rounded-3xl bg-brand p-4 text-primary-foreground xs:p-5">
        <span aria-hidden="true" className="bg-aqua/30 absolute -top-10 -right-8 h-36 w-36 rounded-full blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-f-xs font-semibold opacity-80">Wallet balance</p>
            <p className="mt-1 truncate text-f-xl font-extrabold tracking-tight" aria-live="polite">
              {formatPrice(balance)}
            </p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15">
            <Wallet className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
        <button
          onClick={onHistory}
          className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-2 text-f-xs font-bold focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          <History className="h-3.5 w-3.5" aria-hidden="true" /> Wallet history
        </button>
      </div>

      {/* Add money */}
      <div className="card-soft mt-4 rounded-3xl p-3.5 xs:p-4">
        <SectionTitle Icon={Plus}>Add money</SectionTitle>

        <div className="mt-3 grid grid-cols-4 gap-2" role="group" aria-label="Quick amounts">
          {TOPUP_PRESETS.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={amountText === String(v)}
              onClick={() => {
                setAmountText(String(v));
                setError(null);
                setDone(null);
              }}
              className={`rounded-xl py-2.5 text-f-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                amountText === String(v) ? "bg-brand text-primary-foreground" : "bg-secondary text-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <label htmlFor="topup-amount" className="mt-3 block text-f-xs font-semibold text-muted-foreground">
          Or enter an amount (KWD)
        </label>
        <input
          id="topup-amount"
          value={amountText}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.000"
          aria-invalid={hint ? true : undefined}
          aria-describedby="topup-hint"
          onChange={(e) => {
            setAmountText(cleanAmount(e.target.value));
            setError(null);
            setDone(null);
          }}
          /* 16px minimum stops iOS Safari zooming in on focus. */
          className="mt-1 h-12 w-full rounded-2xl bg-secondary px-4 text-base font-semibold text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-brand"
        />
        <p
          id="topup-hint"
          className={`mt-1.5 text-f-2xs ${hint ? "font-semibold text-destructive" : "text-muted-foreground"}`}
        >
          {hint ?? `From ${formatPrice(MIN_TOPUP)} to ${formatPrice(MAX_TOPUP)} at a time.`}
        </p>

        <p className="mt-3 mb-2 text-f-xs font-semibold text-muted-foreground" id="topup-method">
          Pay with
        </p>
        <div className="grid gap-2" role="radiogroup" aria-labelledby="topup-method">
          {METHODS.map(({ id, sub, Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={method === id}
              onClick={() => setMethod(id)}
              className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                method === id ? "border-brand bg-brand-soft" : "border-border bg-background"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-f-sm font-bold text-foreground">{WALLET_METHOD_LABEL[id]}</span>
                <span className="block truncate text-f-2xs text-muted-foreground">{sub}</span>
              </span>
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                  method === id ? "border-brand bg-brand" : "border-border"
                }`}
              >
                {method === id && <Check className="h-3 w-3 text-primary-foreground" />}
              </span>
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-f-xs font-semibold text-destructive">
            {error}
          </p>
        )}
        {done && (
          <p role="status" className="bg-aqua-soft mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-f-xs font-bold text-brand">
            <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> {done}
          </p>
        )}

        <button
          onClick={submit}
          disabled={!valid || busy}
          className="mt-4 w-full rounded-2xl bg-brand py-4 text-f-sm font-bold text-primary-foreground transition-opacity disabled:opacity-50"
        >
          {busy ? "Processing…" : valid ? `Add ${formatPrice(amount)}` : "Add money"}
        </button>
      </div>

      {/* Points → wallet */}
      <button
        onClick={onPoints}
        className="card-soft mt-3 flex w-full items-center gap-3 rounded-3xl p-3.5 text-left focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none xs:p-4"
      >
        <span className="bg-aqua-soft grid h-11 w-11 shrink-0 place-items-center rounded-full">
          <Star className="h-5 w-5 text-brand" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-f-sm font-bold text-foreground">Turn points into wallet money</span>
          <span className="block truncate text-f-xs text-muted-foreground">
            {pointsAvailable.toLocaleString("en-US")} points · worth {formatPrice(pointsToKwd(pointsAvailable))}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>

      {/* Recent activity */}
      <div className="mt-6 flex items-center justify-between gap-2">
        <SectionTitle Icon={History}>Recent activity</SectionTitle>
        {txns.length > 0 && (
          <button onClick={onHistory} className="text-f-xs font-bold text-brand underline-offset-2 hover:underline">
            View all
          </button>
        )}
      </div>
      {recent.length === 0 ? (
        <EmptyState Icon={Wallet} title="No activity yet" text="Money you add and spend from your wallet shows up here." />
      ) : (
        <ul className="mt-3 space-y-2">
          {recent.map((t) => (
            <li key={t.id}>
              <WalletTxnRow txn={t} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Wallet history page                                                  */
/* ------------------------------------------------------------------ */

type WalletFilter = "all" | "in" | "out";

export function WalletHistoryScreen({
  txns,
  balance,
  onBack,
  onAddMoney,
}: {
  txns: WalletTxn[];
  balance: number;
  onBack: () => void;
  onAddMoney: () => void;
}) {
  const [filter, setFilter] = useState<WalletFilter>("all");
  const totals = walletTotals(txns);
  const shown = txns.filter((t) => filter === "all" || t.direction === filter);
  const counts = {
    all: txns.length,
    in: txns.filter((t) => t.direction === "in").length,
    out: txns.filter((t) => t.direction === "out").length,
  };

  return (
    <section className="animate-rise">
      <BackLink label="Wallet" onClick={onBack} />
      <h1 className="mt-2 text-f-xl font-extrabold tracking-tight text-foreground">Wallet history</h1>
      <p className="mt-1 text-f-xs text-muted-foreground">
        Balance <span className="font-bold text-brand">{formatPrice(balance)}</span>
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <StatCard label="Total added" value={formatPrice(totals.added)} />
        <StatCard label="Total used" value={formatPrice(totals.used)} tone="muted" />
      </div>

      <FilterChips<WalletFilter>
        label="Filter wallet history"
        value={filter}
        onChange={setFilter}
        options={[
          { id: "all", label: "All", count: counts.all },
          { id: "in", label: "Money in", count: counts.in },
          { id: "out", label: "Money out", count: counts.out },
        ]}
      />

      {shown.length === 0 ? (
        txns.length === 0 ? (
          <div>
            <EmptyState Icon={Wallet} title="No transactions yet" text="Add money to your wallet and it will be listed here." />
            <div className="text-center">
              <button
                onClick={onAddMoney}
                className="mt-5 rounded-2xl bg-brand px-6 py-3 text-f-sm font-bold text-primary-foreground"
              >
                Add money
              </button>
            </div>
          </div>
        ) : (
          <EmptyState
            Icon={filter === "in" ? ArrowDownLeft : ArrowUpRight}
            title={filter === "in" ? "No money in yet" : "Nothing spent yet"}
            text={
              filter === "in"
                ? "Top-ups and redeemed points will be listed here."
                : "Payments made from your wallet will be listed here."
            }
          />
        )
      ) : (
        <DayGroups items={shown} row={(t) => <WalletTxnRow txn={t} />} />
      )}
    </section>
  );
}
