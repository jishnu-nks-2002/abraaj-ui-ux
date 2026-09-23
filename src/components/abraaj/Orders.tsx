import { CalendarDays, Check, CreditCard, MapPin, Package, Repeat, Truck, User } from "lucide-react";
import { formatPrice } from "@/lib/cart";
import {
  DELIVERY_LABEL,
  DELIVERY_STEPS,
  ORDER_STATUS_LABEL,
  PAYMENT_LABEL,
  SUBSCRIPTION_STAGE_LABEL,
  SUBSCRIPTION_STATUS_LABEL,
  SUBSCRIPTION_STEPS,
  formatDate,
  dayAndDate,
  formatDateTime,
  itemStatusLabel,
  purchaseLabel,
  relativeDay,
  type ItemSubscription,
  type Order,
  type OrderItem,
  type OrderStatus,
} from "@/lib/orders";
import {
  BackLink,
  InfoRow,
  ProductThumb,
  SectionTitle,
  StatusChip,
  SumRow,
  Timeline,
  type TimelineStep,
} from "@/components/abraaj/order-ui";

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function orderTone(s: OrderStatus) {
  if (s === "DELIVERED" || s === "COMPLETED") return "done" as const;
  if (s === "ACTIVE") return "aqua" as const;
  return "brand" as const;
}

function itemTone(item: OrderItem) {
  if (item.delivery?.status === "DELIVERED") return "done" as const;
  if (item.subscription?.status === "COMPLETED") return "muted" as const;
  if (item.subscription) return "aqua" as const;
  return "brand" as const;
}

function itemCount(order: Order) {
  const n = order.items.reduce((sum, i) => sum + i.quantity, 0);
  return `${n} ${n === 1 ? "item" : "items"}`;
}

/** "1 year subscription, weekly" / "One-time" */
function purchaseLine(item: OrderItem) {
  return item.subscription
    ? `${purchaseLabel(item)}, ${item.subscription.frequency.toLowerCase()}`
    : purchaseLabel(item);
}

function durationText(sub: ItemSubscription) {
  const unit = sub.unit === "YEAR" ? "year" : "month";
  return `${sub.duration} ${unit}${sub.duration === 1 ? "" : "s"}`;
}

/* ------------------------------------------------------------------ */
/* Orders page                                                          */
/* ------------------------------------------------------------------ */

export function OrdersScreen({
  orders,
  onView,
  onTrack,
  onShop,
  onBack,
}: {
  orders: Order[];
  onView: (id: string) => void;
  onTrack: (id: string) => void;
  onShop: () => void;
  onBack: () => void;
}) {
  if (orders.length === 0) {
    return (
      <section className="animate-rise">
        <BackLink label="Account" onClick={onBack} />
        <div className="pt-12 text-center">
          <div className="bg-aqua-soft mx-auto grid h-20 w-20 place-items-center rounded-full">
            <Package className="h-8 w-8 text-brand" />
          </div>
          <h1 className="mt-4 text-f-lg font-bold text-foreground">No orders yet</h1>
          <p className="mx-auto mt-1 max-w-[17rem] text-f-sm text-muted-foreground">
            Orders you place, including subscriptions, show up here with live tracking.
          </p>
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

  return (
    <section className="animate-rise @container">
      <BackLink label="Account" onClick={onBack} />
      <h1 className="mt-2 text-f-xl font-extrabold tracking-tight text-foreground">My orders</h1>
      <p className="mt-1 text-f-xs text-muted-foreground">
        {orders.length} {orders.length === 1 ? "order" : "orders"}
      </p>

      <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 @2xl:grid-cols-2">
        {orders.map((o) => (
          <li key={o.id} className="card-soft flex min-w-0 flex-col rounded-2xl p-3.5 xs:p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-f-sm font-extrabold text-foreground">Order #{o.id}</p>
                <p className="text-f-2xs text-muted-foreground">
                  {formatDate(o.createdAt)}, {itemCount(o)}
                </p>
              </div>
              <StatusChip tone={orderTone(o.status)}>{ORDER_STATUS_LABEL[o.status]}</StatusChip>
            </div>

            <ul className="mt-3 flex-1 space-y-2 border-t border-border pt-3">
              {o.items.map((item) => (
                <li key={item.id} className="flex items-center gap-2.5">
                  <ProductThumb productId={item.product.id} name={item.product.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-f-xs font-bold text-foreground">
                      {item.product.name}
                      {item.quantity > 1 && <span className="font-semibold text-muted-foreground"> ×{item.quantity}</span>}
                    </p>
                    <p className="flex items-center gap-1 truncate text-f-2xs text-muted-foreground">
                      {item.subscription ? (
                        <Repeat className="h-3 w-3 shrink-0 text-aqua" />
                      ) : (
                        <Truck className="h-3 w-3 shrink-0 text-brand" />
                      )}
                      <span className="truncate">{purchaseLine(item)}</span>
                    </p>
                  </div>
                  <span className="max-w-[40%] shrink-0 truncate text-right text-f-2xs font-semibold text-foreground">
                    {itemStatusLabel(item)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 text-f-sm">
              <span className="font-bold text-foreground">Total</span>
              <span className="font-extrabold text-brand">{formatPrice(o.pricing.total)}</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => onView(o.id)}
                className="rounded-2xl border border-border bg-background py-2.5 text-f-xs font-bold text-foreground focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              >
                View order
              </button>
              <button
                onClick={() => onTrack(o.id)}
                className="rounded-2xl bg-brand py-2.5 text-f-xs font-bold text-primary-foreground focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Track order
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Order details                                                        */
/* ------------------------------------------------------------------ */

function DetailItem({ item }: { item: OrderItem }) {
  const sub = item.subscription;
  const del = item.delivery;
  return (
    <li className="card-soft min-w-0 rounded-2xl p-3.5">
      <div className="flex items-center gap-3">
        <ProductThumb productId={item.product.id} name={item.product.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-f-sm font-bold text-foreground">{item.product.name}</p>
          <p className="truncate text-f-2xs text-muted-foreground">
            {item.product.size}, {item.product.pack.toLowerCase()}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-f-sm font-extrabold text-brand">{formatPrice(item.price)}</span>
            <StatusChip tone={itemTone(item)}>{itemStatusLabel(item)}</StatusChip>
          </div>
        </div>
      </div>

      <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-f-xs">
        <InfoRow label="Purchase type" value={sub ? "Subscription" : "One-time"} />
        <InfoRow label="Quantity" value={item.quantity} />
        <InfoRow label="Unit price" value={`${formatPrice(item.unitPrice)}${sub ? " per delivery" : ""}`} />
        {del && (
          <>
            <InfoRow label="Delivery" value={del.window} />
            <InfoRow
              label={del.status === "DELIVERED" ? "Delivered" : "Expected delivery"}
              value={
                del.status === "DELIVERED"
                  ? formatDateTime(del.statusHistory[del.statusHistory.length - 1]!.at)
                  : dayAndDate(del.expectedDate)
              }
            />
          </>
        )}
        {sub && (
          <>
            <InfoRow label="Plan" value={`${durationText(sub)}, ${sub.frequency.toLowerCase()}`} />
            <InfoRow label="Start date" value={formatDate(sub.startDate)} />
            <InfoRow label="End date" value={formatDate(sub.endDate)} />
            <InfoRow label="Status" value={SUBSCRIPTION_STATUS_LABEL[sub.status]} />
          </>
        )}
        <InfoRow label="Tracking no." value={<span className="font-mono tracking-tight">{item.trackingNumber}</span>} />
      </dl>
    </li>
  );
}

export function OrderDetailsScreen({
  order,
  justPlaced,
  onBack,
  onTrack,
}: {
  order: Order;
  justPlaced?: boolean;
  onBack: () => void;
  onTrack: () => void;
}) {
  const { customer, address } = order;
  return (
    <section className="animate-rise @container">
      <BackLink label="My orders" onClick={onBack} />

      {justPlaced && (
        <div role="status" className="card-soft mt-3 flex items-center gap-3 rounded-2xl p-3.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-primary-foreground">
            <Check className="h-5 w-5" strokeWidth={2.6} />
          </div>
          <div className="min-w-0">
            <p className="text-f-sm font-bold text-foreground">Order placed</p>
            <p className="text-f-2xs text-muted-foreground">
              A receipt is on its way to {customer.email}. Every item below has its own tracking.
            </p>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-f-xl font-extrabold tracking-tight text-foreground">Order #{order.id}</h1>
          <p className="text-f-xs text-muted-foreground">
            Placed {formatDateTime(order.createdAt)}, {order.items.length}{" "}
            {order.items.length === 1 ? "product" : "products"}
          </p>
        </div>
        <StatusChip tone={orderTone(order.status)}>{ORDER_STATUS_LABEL[order.status]}</StatusChip>
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-3 @xl:grid-cols-2">
        <div className="card-soft rounded-2xl p-3.5">
          <SectionTitle Icon={User}>Customer</SectionTitle>
          <dl className="mt-2 space-y-1.5 text-f-xs">
            <InfoRow label="Name" value={customer.name} />
            <InfoRow label="Phone" value={customer.phone} />
            <InfoRow label="Email" value={<span className="break-all">{customer.email}</span>} />
          </dl>
        </div>
        <div className="card-soft rounded-2xl p-3.5">
          <SectionTitle Icon={MapPin}>Address</SectionTitle>
          <dl className="mt-2 space-y-1.5 text-f-xs">
            <InfoRow label="Address" value={address.line} />
            <InfoRow label="City" value={address.city} />
            <InfoRow label="State" value={address.state} />
            <InfoRow label="Pincode" value={address.pincode} />
          </dl>
        </div>
      </div>

      <div className="mt-6">
        <SectionTitle Icon={Package}>Products</SectionTitle>
        <ul className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-2.5 @2xl:grid-cols-2">
          {order.items.map((item) => (
            <DetailItem key={item.id} item={item} />
          ))}
        </ul>
      </div>

      <div className="card-soft mt-6 space-y-2 rounded-2xl p-4 text-f-sm">
        <SectionTitle Icon={CreditCard}>Payment</SectionTitle>
        <SumRow label="Method" value={PAYMENT_LABEL[order.payment]} />
        <SumRow label="Subtotal" value={formatPrice(order.pricing.subtotal)} />
        {order.pricing.saving > 0 && (
          <SumRow label="Subscription saving" value={`− ${formatPrice(order.pricing.saving)}`} accent />
        )}
        <SumRow label="Delivery" value={order.pricing.delivery === 0 ? "Free" : formatPrice(order.pricing.delivery)} />
        {order.coinsEarned > 0 && <SumRow label="Coins earned" value={`+${order.coinsEarned}`} accent />}
        <div className="my-2 h-px bg-border" />
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-foreground">Total</span>
          <span className="text-f-lg font-extrabold text-brand">{formatPrice(order.pricing.total)}</span>
        </div>
      </div>

      <button
        onClick={onTrack}
        className="mt-5 w-full rounded-2xl bg-brand py-4 text-f-sm font-bold text-primary-foreground focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Track order
      </button>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Tracking                                                             */
/* ------------------------------------------------------------------ */

function deliverySteps(item: OrderItem): TimelineStep[] {
  const del = item.delivery!;
  const reachedAt = new Map(del.statusHistory.map((h) => [h.status, h.at]));
  const currentIdx = DELIVERY_STEPS.indexOf(del.status);
  return DELIVERY_STEPS.map((s, i) => {
    const at = reachedAt.get(s);
    const state: TimelineStep["state"] =
      i < currentIdx || (i === currentIdx && s === "DELIVERED") ? "done" : i === currentIdx ? "current" : "upcoming";
    let detail = at ? formatDateTime(at) : undefined;
    if (!at && s === "DELIVERED") detail = `Expected ${dayAndDate(del.expectedDate)}`;
    return { key: s, label: DELIVERY_LABEL[s], detail, state };
  });
}

function subscriptionSteps(sub: ItemSubscription): TimelineStep[] {
  const reachedAt = new Map(sub.statusHistory.map((h) => [h.status, h.at]));
  const firstUnreached = SUBSCRIPTION_STEPS.findIndex((s) => !reachedAt.has(s));
  return SUBSCRIPTION_STEPS.map((s, i) => {
    const at = reachedAt.get(s);
    const state: TimelineStep["state"] = at ? "done" : i === firstUnreached ? "current" : "upcoming";
    let label = SUBSCRIPTION_STAGE_LABEL[s];
    let detail: string | undefined = at ? formatDateTime(at) : undefined;
    if (s === "NEXT_DELIVERY") {
      if (at) {
        label = "First delivery made";
      } else {
        detail = `Scheduled ${dayAndDate(sub.firstDeliveryDate)}`;
      }
    }
    if (s === "RENEWED" && !at) detail = `Renews ${sub.frequency.toLowerCase()} after each delivery`;
    if (s === "COMPLETED") {
      label = at ? "Completed" : "Completed / expires";
      detail = at ? `Ended ${formatDate(sub.endDate)}` : `On ${formatDate(sub.endDate)}`;
    }
    return { key: s, label, detail, state };
  });
}

function Fact({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`min-w-0 rounded-xl bg-secondary/70 px-3 py-2 ${wide ? "col-span-2" : ""}`}>
      <dt className="text-f-2xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-f-xs font-bold text-foreground">{value}</dd>
    </div>
  );
}

function TrackItem({ item }: { item: OrderItem }) {
  const del = item.delivery;
  const sub = item.subscription;
  return (
    <li className="card-soft min-w-0 rounded-2xl p-3.5 xs:p-4">
      <div className="flex items-center gap-3">
        <ProductThumb productId={item.product.id} name={item.product.name} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-f-sm font-extrabold text-foreground">{item.product.name}</h2>
          <p className="flex items-center gap-1 text-f-2xs text-muted-foreground">
            {sub ? <Repeat className="h-3 w-3 shrink-0 text-aqua" /> : <Truck className="h-3 w-3 shrink-0 text-brand" />}
            <span className="truncate">
              {sub ? `${durationText(sub)} subscription` : "One-time purchase"}, qty {item.quantity}
            </span>
          </p>
          <div className="mt-1.5">
            <StatusChip tone={itemTone(item)}>{itemStatusLabel(item)}</StatusChip>
          </div>
        </div>
      </div>

      {del && (
        <>
          <div className="bg-aqua-soft mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5">
            <CalendarDays className="h-5 w-5 shrink-0 text-brand" />
            <div className="min-w-0">
              <p className="text-f-2xs text-muted-foreground">
                {del.status === "DELIVERED" ? "Delivered" : "Expected delivery"}
              </p>
              <p className="text-f-sm font-extrabold text-brand">
                {del.status === "DELIVERED"
                  ? formatDateTime(del.statusHistory[del.statusHistory.length - 1]!.at)
                  : dayAndDate(del.expectedDate)}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Timeline steps={deliverySteps(item)} label={`Delivery progress for ${item.product.name}`} />
          </div>
        </>
      )}

      {sub && (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-2 @xl:grid-cols-3">
            <Fact label="Plan" value={`${sub.frequency} delivery`} />
            <Fact label="Duration" value={durationText(sub)} />
            <Fact label="Status" value={SUBSCRIPTION_STATUS_LABEL[sub.status]} />
            <Fact label="Start" value={formatDate(sub.startDate)} />
            <Fact label="End" value={formatDate(sub.endDate)} />
            <Fact
              label="Next delivery"
              value={sub.nextDeliveryDate ? relativeDay(sub.nextDeliveryDate) : "None left"}
            />
            <Fact
              label="Deliveries made"
              value={`${sub.deliveriesCompleted} of ${sub.totalDeliveries}`}
              wide
            />
          </dl>
          <div className="mt-4">
            <Timeline steps={subscriptionSteps(sub)} label={`Subscription progress for ${item.product.name}`} />
          </div>
        </>
      )}

      <p className="mt-3 border-t border-border pt-2.5 text-f-2xs text-muted-foreground">
        Tracking no. <span className="font-mono font-semibold text-foreground">{item.trackingNumber}</span>
      </p>
    </li>
  );
}

export function TrackOrderScreen({
  order,
  onBack,
  onView,
}: {
  order: Order;
  onBack: () => void;
  onView: () => void;
}) {
  return (
    <section className="animate-rise @container">
      <BackLink label="My orders" onClick={onBack} />
      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-f-xl font-extrabold tracking-tight text-foreground">Track #{order.id}</h1>
          <p className="text-f-xs text-muted-foreground">Placed {formatDate(order.createdAt)}. Each product is tracked on its own.</p>
        </div>
        <StatusChip tone={orderTone(order.status)}>{ORDER_STATUS_LABEL[order.status]}</StatusChip>
      </div>

      <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 @3xl:grid-cols-2 @3xl:items-start">
        {order.items.map((item) => (
          <TrackItem key={item.id} item={item} />
        ))}
      </ul>

      <button
        onClick={onView}
        className="mt-5 w-full rounded-2xl border border-border bg-background py-3.5 text-f-sm font-bold text-foreground focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      >
        View order details
      </button>
    </section>
  );
}
