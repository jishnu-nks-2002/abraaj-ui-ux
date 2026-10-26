import { useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  Check,
  ChevronLeft,
  Clock,
  CreditCard,
  MapPin,
  Minus,
  Plus,
  Repeat,
  Smartphone,
  Trash2,
} from "lucide-react";
import { money, plans } from "@/lib/abraaj-data";
import {
  PLAN_OFF,
  deliverySlots,
  placeById,
  planLabel,
  subLineKey,
  subTotals,
  subUnitPrice,
  upcomingDays,
  type SubLine,
} from "@/lib/mosque-data";

/* ------------------------------------------------------------------ */
/* Shared bits                                                          */
/* ------------------------------------------------------------------ */

function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-1 -ml-1 inline-flex items-center gap-1 rounded-full py-1 pr-2 text-f-xs font-semibold text-muted-foreground"
    >
      <ChevronLeft className="h-4 w-4" /> {label}
    </button>
  );
}

function SumRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="truncate text-muted-foreground">{label}</span>
      <span className={`shrink-0 font-semibold ${accent ? "text-aqua" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function groupByPlace(lines: SubLine[]) {
  const map = new Map<string, SubLine[]>();
  for (const l of lines) map.set(l.placeId, [...(map.get(l.placeId) ?? []), l]);
  return [...map.entries()].map(([placeId, items]) => ({ place: placeById(placeId), placeId, items }));
}

function formatDay(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/* ------------------------------------------------------------------ */
/* Subscription Cart                                                    */
/* ------------------------------------------------------------------ */

export function SubscriptionCartScreen({
  lines,
  setQty,
  setPlan,
  remove,
  onBrowse,
  onCheckout,
  onBack,
}: {
  lines: SubLine[];
  setQty: (key: string, delta: number) => void;
  setPlan: (key: string, planId: string) => void;
  remove: (key: string) => void;
  onBrowse: () => void;
  onCheckout: () => void;
  onBack: () => void;
}) {
  const totals = subTotals(lines);
  const groups = groupByPlace(lines);

  if (lines.length === 0) {
    return (
      <section className="animate-rise">
        <BackLink label="Back" onClick={onBack} />
        <div className="pt-12 text-center">
          <div className="bg-aqua-soft mx-auto grid h-20 w-20 place-items-center rounded-full">
            <Repeat className="h-8 w-8 text-brand" />
          </div>
          <h2 className="mt-4 text-f-lg font-bold text-foreground">No subscriptions yet</h2>
          <p className="mx-auto mt-1 max-w-[17rem] text-f-sm text-muted-foreground">
            Pick a mosque or community place and subscribe to the products it needs.
          </p>
          <button
            onClick={onBrowse}
            className="mt-5 rounded-2xl bg-brand px-6 py-3 text-f-sm font-bold text-primary-foreground"
          >
            Choose a mosque
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="animate-rise">
      <BackLink label="Back" onClick={onBack} />
      <div className="mt-2 flex items-center justify-between gap-2">
        <h1 className="text-f-xl font-extrabold tracking-tight text-foreground">Subscription cart</h1>
        <span className="bg-aqua-soft flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-f-2xs font-bold text-brand">
          <Repeat className="h-3.5 w-3.5" /> {totals.count} items
        </span>
      </div>
      <p className="mt-1 text-f-xs text-muted-foreground">
        Separate from your regular cart — these repeat automatically.
      </p>

      <div className="mt-4 space-y-5">
        {groups.map(({ place, placeId, items }) => (
          <div key={placeId}>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-brand" />
              <div className="min-w-0">
                <p className="truncate text-f-sm font-bold text-foreground">{place?.name ?? "Unknown place"}</p>
                {place && <p className="truncate text-f-2xs text-muted-foreground">{place.area}</p>}
              </div>
            </div>
            <div className="mt-2.5 space-y-2.5">
              {items.map((l) => {
                const key = subLineKey(l);
                const unit = subUnitPrice(l.product.price, l.planId);
                return (
                  <div key={key} className="card-soft rounded-2xl p-2.5 xs:p-3">
                    <div className="flex items-center gap-2.5 xs:gap-3">
                      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl">
                        <img src={l.product.image} alt={l.product.name} className="max-h-[86%] w-auto object-contain" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-f-sm font-bold text-foreground">{l.product.name}</p>
                        <p className="truncate text-f-2xs text-muted-foreground">
                          {planLabel(l.planId)?.every} · save {PLAN_OFF[l.planId]}%
                        </p>
                        <p className="mt-1 text-f-sm font-extrabold text-brand">AED {money(unit * l.qty)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5 xs:gap-2">
                        <button
                          aria-label="Decrease"
                          onClick={() => setQty(key, -1)}
                          className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-foreground"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-4 text-center text-f-sm font-bold">{l.qty}</span>
                        <button
                          aria-label="Increase"
                          onClick={() => setQty(key, 1)}
                          className="grid h-7 w-7 place-items-center rounded-full bg-brand text-primary-foreground"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5">
                      {plans.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setPlan(key, p.id)}
                          aria-pressed={l.planId === p.id}
                          className={`min-w-0 flex-1 truncate rounded-lg px-1.5 py-1.5 text-center text-f-2xs font-semibold transition-colors ${
                            l.planId === p.id ? "bg-brand text-primary-foreground" : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                      <button
                        aria-label={`Remove ${l.product.name}`}
                        onClick={() => remove(key)}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onBrowse}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-border bg-background py-3 text-f-sm font-bold text-foreground"
      >
        <Plus className="h-4 w-4 shrink-0" /> Add another place or product
      </button>

      <div className="card-soft mt-5 space-y-2 rounded-2xl p-4 text-f-sm">
        <SumRow label="Regular price" value={`AED ${money(totals.list)}`} />
        <SumRow label="Subscription saving" value={`− AED ${money(totals.saving)}`} accent />
        <SumRow label="Delivery" value="Free" />
        <div className="my-2 h-px bg-border" />
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-foreground">Per delivery round</span>
          <span className="text-f-lg font-extrabold text-brand">AED {money(totals.perDelivery)}</span>
        </div>
        <p className="text-f-2xs text-muted-foreground">
          Each item repeats on its own frequency and is charged when it's delivered. Skip, pause or cancel any time.
        </p>
      </div>

      <button
        onClick={onCheckout}
        className="mt-5 w-full rounded-2xl bg-brand py-4 text-f-sm font-bold text-primary-foreground"
      >
        Checkout subscription
      </button>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Subscription Checkout                                                */
/* ------------------------------------------------------------------ */

type Payment = "card" | "apple" | "cash";

const payments: { id: Payment; label: string; sub: string; Icon: typeof CreditCard }[] = [
  { id: "card", label: "Saved card", sub: "Visa •••• 4242 — charged per delivery", Icon: CreditCard },
  { id: "apple", label: "Apple Pay", sub: "Confirm each charge on your device", Icon: Smartphone },
  { id: "cash", label: "Cash on delivery", sub: "Pay the driver at each drop-off", Icon: Banknote },
];

type Confirmation = {
  ref: string;
  lines: SubLine[];
  start: Date;
  slot: string;
  payment: Payment;
};

export function SubscriptionCheckoutScreen({
  lines,
  onConfirm,
  onBack,
  onHome,
  onMosque,
}: {
  lines: SubLine[];
  /** Called once the order is placed — parent clears the subscription cart. */
  onConfirm: () => void;
  onBack: () => void;
  onHome: () => void;
  onMosque: () => void;
}) {
  const days = useMemo(() => upcomingDays(7), []);
  const [start, setStart] = useState(0);
  const [slot, setSlot] = useState<string>(deliverySlots[0]);
  const [name, setName] = useState("Ahmed H.");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<Payment>("card");
  const [tried, setTried] = useState(false);
  const [done, setDone] = useState<Confirmation | null>(null);

  const phoneOk = /^\+?[0-9\s-]{8,}$/.test(phone.trim());
  const nameOk = name.trim().length > 1;

  if (done) return <ConfirmationView c={done} onHome={onHome} onMosque={onMosque} />;

  if (lines.length === 0) {
    return (
      <section className="animate-rise">
        <BackLink label="Subscription cart" onClick={onBack} />
        <p className="mt-10 text-center text-f-sm text-muted-foreground">Your subscription cart is empty.</p>
      </section>
    );
  }

  const totals = subTotals(lines);
  const groups = groupByPlace(lines);

  function confirm() {
    setTried(true);
    if (!nameOk || !phoneOk) {
      // The button sits below the form, so bring the first bad field into view.
      const el = document.getElementById(!nameOk ? "sub-contact-name" : "sub-contact-phone");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus({ preventScroll: true });
      return;
    }
    setDone({
      ref: `ABJ-SUB-${Math.floor(100000 + Math.random() * 900000)}`,
      lines,
      start: days[start]!,
      slot,
      payment,
    });
    onConfirm();
    window.scrollTo({ top: 0 });
  }

  return (
    <section className="animate-rise">
      <BackLink label="Subscription cart" onClick={onBack} />
      <h1 className="mt-2 text-f-xl font-extrabold tracking-tight text-foreground">Subscription checkout</h1>

      {/* Delivery places */}
      <h2 className="mt-5 text-f-sm font-bold text-foreground">Delivering to</h2>
      <div className="mt-2 space-y-2">
        {groups.map(({ place, placeId, items }) => (
          <div key={placeId} className="card-soft flex items-start gap-3 rounded-2xl p-3.5">
            <div className="bg-aqua-soft grid h-10 w-10 shrink-0 place-items-center rounded-full text-brand">
              <MapPin className="h-[18px] w-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-f-sm font-bold text-foreground">{place?.name}</p>
              <p className="truncate text-f-2xs text-muted-foreground">{place?.area}</p>
              <p className="mt-1 text-f-2xs text-foreground">
                {items.map((l) => `${l.qty}× ${l.product.name} (${planLabel(l.planId)?.name})`).join(", ")}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Start date */}
      <h2 className="mt-6 flex items-center gap-1.5 text-f-sm font-bold text-foreground">
        <CalendarDays className="h-4 w-4 text-brand" /> First delivery
      </h2>
      <div className="no-scrollbar mx-screen-neg px-screen mt-2 flex gap-2 overflow-x-auto">
        {days.map((d, i) => {
          const [wd, day, mon] = formatDay(d).replace(",", "").split(" ");
          return (
            <button
              key={d.toISOString()}
              onClick={() => setStart(i)}
              aria-pressed={start === i}
              className={`flex w-14 shrink-0 flex-col items-center rounded-2xl py-2.5 transition-colors ${
                start === i ? "bg-brand text-primary-foreground" : "bg-secondary text-foreground"
              }`}
            >
              <span className="text-f-2xs font-semibold opacity-80">{wd}</span>
              <span className="text-f-lg font-extrabold">{day}</span>
              <span className="text-f-2xs opacity-80">{mon}</span>
            </button>
          );
        })}
      </div>

      {/* Slot */}
      <h2 className="mt-5 flex items-center gap-1.5 text-f-sm font-bold text-foreground">
        <Clock className="h-4 w-4 text-brand" /> Delivery window
      </h2>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {deliverySlots.map((s) => (
          <button
            key={s}
            onClick={() => setSlot(s)}
            aria-pressed={slot === s}
            className={`rounded-xl px-2 py-2.5 text-f-xs font-semibold transition-colors ${
              slot === s ? "bg-brand text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Contact */}
      <h2 className="mt-6 text-f-sm font-bold text-foreground">Contact on site</h2>
      <div className="mt-2 space-y-2">
        <div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            id="sub-contact-name"
            placeholder="Name"
            aria-label="Contact name"
            aria-invalid={tried && !nameOk}
            className={`w-full rounded-2xl bg-secondary px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-brand ${
              tried && !nameOk ? "ring-2 ring-destructive" : ""
            }`}
          />
          {tried && !nameOk && <p className="mt-1 px-1 text-f-2xs text-destructive">Add a contact name.</p>}
        </div>
        <div>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            id="sub-contact-phone"
            placeholder="Phone, e.g. +971 50 123 4567"
            inputMode="tel"
            aria-label="Contact phone"
            aria-invalid={tried && !phoneOk}
            className={`w-full rounded-2xl bg-secondary px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-brand ${
              tried && !phoneOk ? "ring-2 ring-destructive" : ""
            }`}
          />
          {tried && !phoneOk && (
            <p className="mt-1 px-1 text-f-2xs text-destructive">Enter a phone number the driver can call.</p>
          )}
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Drop-off notes (optional) — e.g. leave with the imam's office"
          aria-label="Drop-off notes"
          rows={2}
          className="w-full resize-none rounded-2xl bg-secondary px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-brand"
        />
      </div>

      {/* Payment */}
      <h2 className="mt-6 text-f-sm font-bold text-foreground">Payment</h2>
      <div className="mt-2 space-y-2" role="radiogroup" aria-label="Payment method">
        {payments.map(({ id, label, sub, Icon }) => (
          <button
            key={id}
            role="radio"
            aria-checked={payment === id}
            onClick={() => setPayment(id)}
            className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
              payment === id ? "border-brand bg-brand-soft" : "border-border bg-background"
            }`}
          >
            <Icon className="h-5 w-5 shrink-0 text-brand" />
            <span className="min-w-0 flex-1">
              <span className="block text-f-sm font-bold text-foreground">{label}</span>
              <span className="block truncate text-f-2xs text-muted-foreground">{sub}</span>
            </span>
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                payment === id ? "border-brand bg-brand" : "border-border"
              }`}
            >
              {payment === id && <Check className="h-3 w-3 text-primary-foreground" />}
            </span>
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="card-soft mt-6 space-y-2 rounded-2xl p-4 text-f-sm">
        <SumRow label={`${totals.count} items, regular price`} value={`AED ${money(totals.list)}`} />
        <SumRow label="Subscription saving" value={`− AED ${money(totals.saving)}`} accent />
        <SumRow label="Delivery" value="Free" />
        <div className="my-2 h-px bg-border" />
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-foreground">Due at first delivery</span>
          <span className="text-f-lg font-extrabold text-brand">AED {money(totals.perDelivery)}</span>
        </div>
        <p className="text-f-2xs text-muted-foreground">
          Starts {formatDay(days[start]!)} ({slot}). Nothing is charged today.
        </p>
      </div>

      <button
        onClick={confirm}
        className="mt-5 w-full rounded-2xl bg-brand py-4 text-f-sm font-bold text-primary-foreground"
      >
        Confirm subscription
      </button>
    </section>
  );
}

function ConfirmationView({ c, onHome, onMosque }: { c: Confirmation; onHome: () => void; onMosque: () => void }) {
  const totals = subTotals(c.lines);
  const groups = groupByPlace(c.lines);
  return (
    <section className="animate-rise pt-8 text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand text-primary-foreground">
        <Check className="h-9 w-9" strokeWidth={2.6} />
      </div>
      <h1 className="mt-4 text-f-xl font-extrabold tracking-tight text-foreground">Subscription confirmed</h1>
      <p className="mt-1 text-f-sm text-muted-foreground">
        First delivery {formatDay(c.start)} ({c.slot})
      </p>
      <p className="bg-aqua-soft mx-auto mt-3 inline-block rounded-full px-3 py-1 text-f-2xs font-bold text-brand">
        Ref {c.ref}
      </p>

      <div className="card-soft mt-6 space-y-3 rounded-2xl p-4 text-left">
        {groups.map(({ place, placeId, items }) => (
          <div key={placeId}>
            <p className="text-f-sm font-bold text-foreground">{place?.name}</p>
            <ul className="mt-1 space-y-0.5">
              {items.map((l) => (
                <li key={subLineKey(l)} className="flex justify-between gap-2 text-f-xs text-muted-foreground">
                  <span className="truncate">
                    {l.qty}× {l.product.name}
                  </span>
                  <span className="shrink-0">{planLabel(l.planId)?.every}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between text-f-sm">
          <span className="font-bold text-foreground">Per delivery round</span>
          <span className="font-extrabold text-brand">AED {money(totals.perDelivery)}</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <button
          onClick={onMosque}
          className="rounded-2xl border border-border bg-background py-3 text-f-sm font-bold text-foreground"
        >
          Supply another
        </button>
        <button onClick={onHome} className="rounded-2xl bg-brand py-3 text-f-sm font-bold text-primary-foreground">
          Back to home
        </button>
      </div>
    </section>
  );
}
