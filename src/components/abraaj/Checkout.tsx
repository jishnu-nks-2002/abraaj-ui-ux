import { useEffect, useMemo, useState } from "react";
import { Banknote, Check, CreditCard, MapPin, ShoppingBag, Smartphone, User } from "lucide-react";
import { durationById, plans } from "@/lib/abraaj-data";
import {
  ONE_TIME_DELIVERY_DAYS,
  cartPricing,
  formatPrice,
  isSubscription,
  lineKey,
  lineTotal,
  lineUnitPrice,
  type CartLine,
} from "@/lib/cart";
import {
  dayAndDate,
  formatDate,
  oneTimeExpectedDate,
  ordersApi,
  relativeDay,
  subscriptionDates,
  type Order,
  type PaymentMethod,
} from "@/lib/orders";
import { BackLink, InfoRow, ProductThumb, SectionTitle, SumRow } from "@/components/abraaj/order-ui";

/* ------------------------------------------------------------------ */
/* Form + validation                                                    */
/* ------------------------------------------------------------------ */

type FieldId = "name" | "phone" | "email" | "line" | "city" | "state" | "pincode";
type Form = Record<FieldId, string>;

const FIELD_ORDER: FieldId[] = ["name", "phone", "email", "line", "city", "state", "pincode"];

/** 5 digits (UAE-style "00000") or 6 digits (PIN code). */
const PINCODE_PATTERN = /^\d{5,6}$/;

function validate(f: Form): Partial<Record<FieldId, string>> {
  const e: Partial<Record<FieldId, string>> = {};
  const phoneDigits = f.phone.replace(/\D/g, "");

  if (f.name.trim().length < 2) e.name = "Enter your full name.";
  else if (!/^[\p{L}\s.'-]+$/u.test(f.name.trim())) e.name = "Use letters only in the name.";

  if (!f.phone.trim()) e.phone = "Enter a phone number the driver can call.";
  else if (!/^\+?[\d\s-]+$/.test(f.phone.trim()) || phoneDigits.length < 8 || phoneDigits.length > 15)
    e.phone = "Enter a valid phone number, e.g. +971 50 123 4567.";

  if (!f.email.trim()) e.email = "Enter your email for the order receipt.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = "Enter a valid email, e.g. name@example.com.";

  if (f.line.trim().length < 8) e.line = "Add the building, street and area.";
  if (f.city.trim().length < 2) e.city = "Enter your city.";
  if (f.state.trim().length < 2) e.state = "Enter your state.";

  if (!f.pincode.trim()) e.pincode = "Enter your pincode.";
  else if (!PINCODE_PATTERN.test(f.pincode.trim())) e.pincode = "Pincode should be 5 or 6 digits.";

  return e;
}

const payments: { id: PaymentMethod; label: string; sub: string; Icon: typeof CreditCard }[] = [
  { id: "card", label: "Saved card", sub: "Visa •••• 4242", Icon: CreditCard },
  { id: "apple", label: "Apple Pay", sub: "Confirm on your device", Icon: Smartphone },
  { id: "cash", label: "Cash on delivery", sub: "Pay the driver at drop-off", Icon: Banknote },
];

function Field({
  id,
  label,
  value,
  error,
  onChange,
  onBlur,
  multiline,
  ...rest
}: {
  id: FieldId;
  label: string;
  value: string;
  error?: string | undefined;
  onChange: (v: string) => void;
  onBlur: () => void;
  multiline?: boolean;
  placeholder?: string;
  inputMode?: "text" | "tel" | "email" | "numeric";
  autoComplete?: string;
  type?: string;
}) {
  const inputId = `checkout-${id}`;
  // Errors keep their red ring even while focused, so the problem stays visible.
  const cls = `w-full rounded-2xl bg-secondary px-4 py-3 text-base outline-none placeholder:text-muted-foreground ${
    error ? "ring-2 ring-destructive" : "focus:ring-2 focus:ring-brand"
  }`;
  const common = {
    id: inputId,
    value,
    onBlur,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? `${inputId}-error` : undefined,
    required: true,
  };
  return (
    <div className="min-w-0">
      <label htmlFor={inputId} className="mb-1 block px-1 text-f-xs font-semibold text-foreground">
        {label}
      </label>
      {multiline ? (
        <textarea
          {...common}
          rows={2}
          placeholder={rest.placeholder}
          autoComplete={rest.autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className={`${cls} resize-none`}
        />
      ) : (
        <input {...common} {...rest} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
      {error && (
        <p id={`${inputId}-error`} className="mt-1 px-1 text-f-2xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Per-item summary (spec format)                                       */
/* ------------------------------------------------------------------ */

function SummaryItem({ line, now }: { line: CartLine; now: Date }) {
  const sub = isSubscription(line);
  const unit = lineUnitPrice(line);
  const plan = plans.find((p) => p.id === line.planId);
  const dates = sub ? subscriptionDates(line, now) : null;
  const expected = oneTimeExpectedDate(now);

  return (
    <li className="card-soft min-w-0 rounded-2xl p-3">
      <div className="flex items-center gap-3">
        <ProductThumb productId={line.product.id} name={line.product.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-f-sm font-bold text-foreground">{line.product.name}</p>
          <p className="truncate text-f-2xs text-muted-foreground">
            {line.product.size}, {line.product.pack.toLowerCase()}
          </p>
        </div>
        <span className="shrink-0 text-f-sm font-extrabold text-brand">{formatPrice(lineTotal(line))}</span>
      </div>

      <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-f-xs">
        <InfoRow label="Purchase" value={sub ? "Subscription" : "One-time"} />
        {sub && dates && <InfoRow label="Plan" value={`${durationById(line.durationId).label}, ${plan?.name.toLowerCase()}`} />}
        <InfoRow label="Quantity" value={line.qty} />
        <InfoRow
          label="Price"
          value={sub ? `${formatPrice(unit)} each, per delivery` : `${formatPrice(unit)} each`}
        />
        {sub && dates ? (
          <>
            <InfoRow label="Start" value={formatDate(dates.start)} />
            <InfoRow label="End" value={formatDate(dates.end)} />
            <InfoRow label="First delivery" value={`${relativeDay(dates.firstDelivery, now)}, then ${plan?.every.toLowerCase()}`} />
          </>
        ) : (
          <>
            <InfoRow label="Delivery" value={`Within ${ONE_TIME_DELIVERY_DAYS} day`} />
            <InfoRow label="Expected delivery" value={dayAndDate(expected, now)} />
          </>
        )}
      </dl>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Checkout screen                                                      */
/* ------------------------------------------------------------------ */

export function CheckoutScreen({
  lines,
  onBack,
  onShop,
  onPlaced,
}: {
  lines: CartLine[];
  onBack: () => void;
  onShop: () => void;
  /** Called with the single order created for the whole cart. */
  onPlaced: (order: Order) => void;
}) {
  const [form, setForm] = useState<Form>({
    name: "Ahmed H.",
    phone: "",
    email: "",
    line: "",
    city: "Dubai",
    state: "",
    pincode: "",
  });
  const [touched, setTouched] = useState<Partial<Record<FieldId, boolean>>>({});
  const [tried, setTried] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod>("card");
  const [placing, setPlacing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Fixed for this visit so every date on the page agrees.
  const now = useMemo(() => new Date(), []);

  // Pre-fill from the last checkout (client-only, so it doesn't break SSR).
  useEffect(() => {
    const p = ordersApi.lastProfile();
    if (p) setForm({ ...p.customer, ...p.address });
  }, []);

  const errors = validate(form);
  const shown = (id: FieldId) => (tried || touched[id] ? errors[id] : undefined);
  const set = (id: FieldId) => (v: string) => setForm((f) => ({ ...f, [id]: v }));
  const blur = (id: FieldId) => () => setTouched((t) => ({ ...t, [id]: true }));

  const pricing = cartPricing(lines);
  const hasSub = lines.some(isSubscription);
  const hasOnce = lines.some((l) => !isSubscription(l));

  if (lines.length === 0) {
    return (
      <section className="animate-rise">
        <BackLink label="Cart" onClick={onBack} />
        <div className="pt-12 text-center">
          <div className="bg-aqua-soft mx-auto grid h-20 w-20 place-items-center rounded-full">
            <ShoppingBag className="h-8 w-8 text-brand" />
          </div>
          <h1 className="mt-4 text-f-lg font-bold text-foreground">Your cart is empty</h1>
          <p className="mt-1 text-f-sm text-muted-foreground">Add products to your cart before checking out.</p>
          <button
            onClick={onShop}
            className="mt-5 rounded-2xl bg-brand px-6 py-3 text-f-sm font-bold text-primary-foreground"
          >
            Browse products
          </button>
        </div>
      </section>
    );
  }

  function placeOrder() {
    setTried(true);
    setSubmitError(null);
    const first = FIELD_ORDER.find((id) => errors[id]);
    if (first) {
      const el = document.getElementById(`checkout-${first}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus({ preventScroll: true });
      return;
    }
    setPlacing(true);
    try {
      const order = ordersApi.create({
        lines,
        customer: { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() },
        address: {
          line: form.line.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
        },
        payment,
      });
      onPlaced(order);
    } catch {
      setSubmitError("The order couldn't be placed. Check your connection and try again.");
      setPlacing(false);
    }
  }

  const errorCount = tried ? FIELD_ORDER.filter((id) => errors[id]).length : 0;

  return (
    <section className="animate-rise @container">
      <BackLink label="Cart" onClick={onBack} />
      <h1 className="mt-2 text-f-xl font-extrabold tracking-tight text-foreground">Checkout</h1>
      <p className="mt-1 text-f-xs text-muted-foreground">
        {hasOnce && hasSub
          ? "One order for everything in your cart. One-time items and subscriptions are tracked separately."
          : hasSub
            ? "Your subscriptions start today and are placed as one order."
            : "Everything arrives within 1 day."}
      </p>

      <div className="mt-5 grid gap-6 @3xl:grid-cols-[minmax(0,1fr)_22rem] @3xl:items-start">
        {/* ---------- Details ---------- */}
        <div className="min-w-0 space-y-6">
          <fieldset className="space-y-3">
            <legend className="mb-2">
              <SectionTitle Icon={User}>Contact</SectionTitle>
            </legend>
            <Field id="name" label="Full name" value={form.name} error={shown("name")} onChange={set("name")} onBlur={blur("name")} autoComplete="name" />
            <div className="grid gap-3 @md:grid-cols-2">
              <Field
                id="phone"
                label="Phone number"
                value={form.phone}
                error={shown("phone")}
                onChange={set("phone")}
                onBlur={blur("phone")}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+971 50 123 4567"
              />
              <Field
                id="email"
                label="Email"
                value={form.email}
                error={shown("email")}
                onChange={set("email")}
                onBlur={blur("email")}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="name@example.com"
              />
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="mb-2">
              <SectionTitle Icon={MapPin}>Delivery address</SectionTitle>
            </legend>
            <Field
              id="line"
              label="Address"
              value={form.line}
              error={shown("line")}
              onChange={set("line")}
              onBlur={blur("line")}
              multiline
              autoComplete="street-address"
              placeholder="Building / villa, street, area"
            />
            <div className="grid grid-cols-2 gap-3 @xl:grid-cols-3">
              <Field id="city" label="City" value={form.city} error={shown("city")} onChange={set("city")} onBlur={blur("city")} autoComplete="address-level2" />
              <Field id="state" label="State" value={form.state} error={shown("state")} onChange={set("state")} onBlur={blur("state")} autoComplete="address-level1" />
              <div className="col-span-2 @xl:col-span-1">
                <Field
                  id="pincode"
                  label="Pincode"
                  value={form.pincode}
                  error={shown("pincode")}
                  onChange={(v) => set("pincode")(v.replace(/\D/g, "").slice(0, 6))}
                  onBlur={blur("pincode")}
                  inputMode="numeric"
                  autoComplete="postal-code"
                />
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2">
              <SectionTitle Icon={CreditCard}>Payment</SectionTitle>
            </legend>
            <div className="grid gap-2 @xl:grid-cols-3" role="radiogroup" aria-label="Payment method">
              {payments.map(({ id, label, sub, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={payment === id}
                  onClick={() => setPayment(id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
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
          </fieldset>
        </div>

        {/* ---------- Summary ---------- */}
        <aside className="min-w-0 @3xl:sticky @3xl:top-24">
          <div className="flex items-center justify-between gap-2">
            <SectionTitle Icon={ShoppingBag}>Order summary</SectionTitle>
            <span className="text-f-2xs font-semibold text-muted-foreground">
              {pricing.count} {pricing.count === 1 ? "item" : "items"}
            </span>
          </div>
          <ul className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-2.5">
            {lines.map((l) => (
              <SummaryItem key={lineKey(l)} line={l} now={now} />
            ))}
          </ul>

          <div className="card-soft mt-4 space-y-2 rounded-2xl p-4 text-f-sm">
            <SumRow label="Subtotal" value={formatPrice(pricing.subtotal)} />
            {pricing.saving > 0 && <SumRow label="Subscription saving" value={`− ${formatPrice(pricing.saving)}`} accent />}
            <SumRow label="Delivery" value={pricing.delivery === 0 ? "Free" : formatPrice(pricing.delivery)} />
            {pricing.coins > 0 && <SumRow label="Coins you'll earn" value={`+${pricing.coins}`} accent />}
            <div className="my-2 h-px bg-border" />
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-foreground">Total</span>
              <span className="text-f-lg font-extrabold text-brand">{formatPrice(pricing.total)}</span>
            </div>
            {hasSub && (
              <p className="text-f-2xs text-muted-foreground">
                Includes the first delivery of each subscription. Later deliveries are charged when they arrive.
              </p>
            )}
          </div>

          {errorCount > 0 && (
            <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-f-xs font-semibold text-destructive">
              Fix {errorCount === 1 ? "1 field" : `${errorCount} fields`} above to place your order.
            </p>
          )}
          {submitError && (
            <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-f-xs font-semibold text-destructive">
              {submitError}
            </p>
          )}

          <button
            onClick={placeOrder}
            disabled={placing}
            className="mt-4 w-full rounded-2xl bg-brand py-4 text-f-sm font-bold text-primary-foreground transition-opacity focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
          >
            {placing ? "Placing order…" : `Place order, ${formatPrice(pricing.total)}`}
          </button>
        </aside>
      </div>
    </section>
  );
}
