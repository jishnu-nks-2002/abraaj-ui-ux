import { useState } from "react";
import { CalendarDays, ChevronRight, Clock, MapPin, Package, Pause, Play, Repeat, Truck, X } from "lucide-react";
import { money } from "@/lib/abraaj-data";
import { dayAndDate, formatDate, formatDateTime } from "@/lib/dates";
import { PAYMENT_LABEL, type PaymentMethod } from "@/lib/orders";
import {
  STAGES,
  STAGE_LABEL,
  isSubscriptionItem,
  itemStatus,
  mosqueOrdersApi,
  orderIsOpen,
  orderStatusLabel,
  pastDeliveries,
  stageTimes,
  type MosqueOrder,
  type MosqueOrderItem,
} from "@/lib/mosque-orders";
import { planEvery, planName } from "@/lib/mosque-data";
import { BackLink, InfoRow, ProductThumb, SectionTitle, StatusChip, Timeline, type TimelineStep } from "@/components/abraaj/order-ui";

/* ------------------------------------------------------------------ */
/* Compact "recent orders" block shared by the personal and mosque carts */
/* ------------------------------------------------------------------ */

export type HistoryRow = {
  id: string;
  title: string;
  sub: string;
  status: string;
  tone?: "brand" | "aqua" | "muted" | "done";
  total: string;
};

export function OrderHistoryPreview({
  heading,
  rows,
  onOpen,
  onViewAll,
  viewAllLabel,
}: {
  heading: string;
  rows: HistoryRow[];
  onOpen: (id: string) => void;
  onViewAll: () => void;
  viewAllLabel: string;
}) {
  return (
    <div className="mt-6">
      <div className="flex items-end justify-between gap-2">
        <h2 className="text-f-base font-bold text-foreground">{heading}</h2>
        <button onClick={onViewAll} className="shrink-0 text-f-xs font-bold text-brand">
          {viewAllLabel}
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="mt-2 rounded-2xl bg-secondary px-4 py-3 text-f-xs text-muted-foreground">
          Nothing here yet. Orders you place will show up with live tracking.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {rows.slice(0, 3).map((r) => (
            <li key={r.id}>
              <button
                onClick={() => onOpen(r.id)}
                className="card-soft flex w-full items-center gap-3 rounded-2xl p-3 text-left"
              >
                <span className="bg-aqua-soft grid h-10 w-10 shrink-0 place-items-center rounded-full text-brand">
                  <Package className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-f-sm font-bold text-foreground">{r.title}</span>
                  <span className="block truncate text-f-2xs text-muted-foreground">{r.sub}</span>
                  <span className="mt-1 flex items-center gap-2">
                    <StatusChip tone={r.tone ?? "brand"}>{r.status}</StatusChip>
                    <span className="text-f-2xs font-bold text-brand">{r.total}</span>
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function mosqueHistoryRows(orders: MosqueOrder[], now = new Date()): HistoryRow[] {
  return orders.map((o) => {
    const st = orderStatusLabel(o, now);
    const places = [...new Set(o.items.map((i) => i.placeName))];
    return {
      id: o.id,
      title: `Order ${o.id}`,
      sub: `${formatDate(o.createdAt)} · ${places[0]}${places.length > 1 ? ` +${places.length - 1}` : ""}`,
      status: st.label,
      tone: st.tone,
      total: `KWD ${money(o.total)}`,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Orders · Subscriptions · History                                     */
/* ------------------------------------------------------------------ */

export type MosqueOrdersTab = "orders" | "subscriptions" | "history";

const TABS: { id: MosqueOrdersTab; label: string }[] = [
  { id: "orders", label: "Orders" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "history", label: "History" },
];

function itemsSummary(o: MosqueOrder) {
  return o.items.map((i) => `${i.qty}× ${i.name}`).join(", ");
}

function OrderCard({ order, now, onOpen }: { order: MosqueOrder; now: Date; onOpen: () => void }) {
  const st = orderStatusLabel(order, now);
  const places = [...new Set(order.items.map((i) => i.placeName))];
  return (
    <button onClick={onOpen} className="card-soft w-full rounded-2xl p-3.5 text-left">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-f-sm font-extrabold text-foreground">{order.id}</p>
          <p className="text-f-2xs text-muted-foreground">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <StatusChip tone={st.tone}>{st.label}</StatusChip>
      </div>
      <p dir="auto" className="mt-2 flex items-center gap-1.5 truncate text-f-xs font-semibold text-foreground">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-brand" />
        <span className="truncate">
          {places[0]}
          {places.length > 1 ? ` +${places.length - 1} more` : ""}
        </span>
      </p>
      <p className="mt-1 line-clamp-2 text-f-2xs text-muted-foreground">{itemsSummary(order)}</p>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-f-sm font-extrabold text-brand">KWD {money(order.total)}</span>
        <span className="inline-flex items-center gap-1 text-f-xs font-bold text-brand">
          Track <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}

function SubscriptionCard({
  order,
  item,
  now,
  onTrack,
  onChanged,
}: {
  order: MosqueOrder;
  item: MosqueOrderItem;
  now: Date;
  onTrack: () => void;
  onChanged: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const s = itemStatus(order, item, now);
  const live = !item.cancelled;
  return (
    <div className="card-soft rounded-2xl p-3.5">
      <div className="flex items-start gap-3">
        <ProductThumb productId={item.productId} name={item.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 text-f-sm font-bold text-foreground">
              {item.qty}× {item.name}
            </p>
            <StatusChip tone={s.tone}>{s.label}</StatusChip>
          </div>
          <p className="text-f-2xs text-muted-foreground">
            {planName(item.planId)} · {planEvery(item.planId)}
          </p>
          <p dir="auto" className="mt-1 flex items-center gap-1 truncate text-f-2xs text-foreground">
            <MapPin className="h-3 w-3 shrink-0 text-brand" />
            <span className="truncate">{item.placeName}</span>
          </p>
        </div>
      </div>

      <dl className="mt-3 space-y-1 rounded-xl bg-secondary/60 p-2.5 text-f-xs">
        <InfoRow
          label="Next delivery"
          value={!live ? "—" : item.paused ? "Paused" : s.nextDelivery ? dayAndDate(s.nextDelivery, now) : "—"}
        />
        <InfoRow label="Delivered so far" value={s.delivered} />
        <InfoRow label="Per delivery" value={`KWD ${money(item.unitPrice * item.qty)}`} strong />
      </dl>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onTrack}
          className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand py-2.5 text-f-xs font-bold text-primary-foreground"
        >
          <Truck className="h-3.5 w-3.5 shrink-0" /> Track
        </button>
        {live && (
          <button
            onClick={() => {
              mosqueOrdersApi.updateItem(order.id, item.id, { paused: !item.paused });
              onChanged();
            }}
            className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2.5 text-f-xs font-bold text-foreground"
          >
            {item.paused ? <Play className="h-3.5 w-3.5 shrink-0" /> : <Pause className="h-3.5 w-3.5 shrink-0" />}
            {item.paused ? "Resume" : "Pause"}
          </button>
        )}
        {live &&
          (confirming ? (
            <button
              onClick={() => {
                mosqueOrdersApi.updateItem(order.id, item.id, { cancelled: true, paused: false });
                setConfirming(false);
                onChanged();
              }}
              className="shrink-0 rounded-xl bg-destructive px-3 py-2.5 text-f-xs font-bold text-white"
            >
              Confirm cancel
            </button>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              aria-label={`Cancel ${item.name} subscription`}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          ))}
      </div>
    </div>
  );
}

export function MosqueOrdersScreen({
  orders,
  tab,
  onTab,
  onBack,
  onOpen,
  onChanged,
  onBrowse,
}: {
  orders: MosqueOrder[];
  tab: MosqueOrdersTab;
  onTab: (t: MosqueOrdersTab) => void;
  onBack: () => void;
  onOpen: (orderId: string) => void;
  onChanged: () => void;
  onBrowse: () => void;
}) {
  const now = new Date();
  const open = orders.filter((o) => orderIsOpen(o, now));
  const subs = orders.flatMap((o) => o.items.filter(isSubscriptionItem).map((item) => ({ order: o, item })));
  const past = pastDeliveries(orders, now);

  const empty = (title: string, text: string) => (
    <div className="pt-10 text-center">
      <div className="bg-aqua-soft mx-auto grid h-16 w-16 place-items-center rounded-full">
        <Package className="h-7 w-7 text-brand" />
      </div>
      <h2 className="mt-3 text-f-base font-bold text-foreground">{title}</h2>
      <p className="mx-auto mt-1 max-w-[17rem] text-f-xs text-muted-foreground">{text}</p>
      <button
        onClick={onBrowse}
        className="mt-4 rounded-2xl bg-brand px-5 py-2.5 text-f-sm font-bold text-primary-foreground"
      >
        Order for a mosque
      </button>
    </div>
  );

  return (
    <section className="animate-rise">
      <BackLink label="Mosque" onClick={onBack} />
      <h1 className="mt-2 text-f-xl font-extrabold tracking-tight text-foreground">Mosque orders</h1>
      <p className="mt-1 text-f-xs text-muted-foreground">Track deliveries, manage subscriptions and see your history.</p>

      <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-2xl bg-secondary p-1" role="tablist" aria-label="Mosque orders">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => onTab(t.id)}
            className={`min-w-0 truncate rounded-xl px-2 py-2.5 text-f-xs font-bold transition-colors ${
              tab === t.id ? "bg-brand text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <div className="mt-4 space-y-3">
          {open.length === 0
            ? empty("No orders in progress", "Orders on their way show up here with live tracking.")
            : open.map((o) => <OrderCard key={o.id} order={o} now={now} onOpen={() => onOpen(o.id)} />)}
        </div>
      )}

      {tab === "subscriptions" && (
        <div className="mt-4 space-y-3">
          {subs.length === 0
            ? empty("No subscriptions yet", "Subscribe a mosque to a product and it will be listed here.")
            : subs.map(({ order, item }) => (
                <SubscriptionCard
                  key={item.id}
                  order={order}
                  item={item}
                  now={now}
                  onTrack={() => onOpen(order.id)}
                  onChanged={onChanged}
                />
              ))}
        </div>
      )}

      {tab === "history" && (
        <div className="mt-4">
          {orders.length === 0 ? (
            empty("No history yet", "Every mosque order you place is kept here.")
          ) : (
            <>
              <SectionTitle Icon={Package}>All orders</SectionTitle>
              <div className="mt-2.5 space-y-3">
                {orders.map((o) => (
                  <OrderCard key={o.id} order={o} now={now} onOpen={() => onOpen(o.id)} />
                ))}
              </div>

              <div className="mt-6">
                <SectionTitle Icon={Truck}>Past deliveries</SectionTitle>
                {past.length === 0 ? (
                  <p className="mt-2 rounded-2xl bg-secondary px-4 py-3 text-f-xs text-muted-foreground">
                    Nothing has been delivered yet.
                  </p>
                ) : (
                  <ul className="card-soft mt-2.5 divide-y divide-border rounded-2xl">
                    {past.map((p) => (
                      <li key={p.key}>
                        <button
                          onClick={() => onOpen(p.orderId)}
                          className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
                        >
                          <ProductThumb productId={p.item.productId} name={p.item.name} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-f-sm font-semibold text-foreground">
                              {p.item.qty}× {p.item.name}
                            </span>
                            <span dir="auto" className="block truncate text-f-2xs text-muted-foreground">
                              {p.item.placeName}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-f-2xs font-bold text-brand">Delivered</span>
                            <span className="block text-f-2xs text-muted-foreground">{formatDate(p.at)}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Track one order                                                      */
/* ------------------------------------------------------------------ */

function trackSteps(order: MosqueOrder, item: MosqueOrderItem, now: Date): TimelineStep[] {
  const s = itemStatus(order, item, now);
  const idx = s.trackingDay.getTime() === new Date(order.startDate).getTime() ? 0 : 1;
  const times = stageTimes(order, s.trackingDay, idx === 0);
  const curIdx = STAGES.indexOf(s.stage);
  return STAGES.map((st, i) => {
    const done = i < curIdx || (i === curIdx && st === "DELIVERED");
    const state: TimelineStep["state"] = done ? "done" : i === curIdx ? "current" : "upcoming";
    return {
      key: st,
      label: STAGE_LABEL[st],
      state,
      detail: done ? formatDateTime(times[st]) : state === "current" ? "In progress" : `Expected ${formatDateTime(times[st])}`,
    };
  });
}

export function MosqueTrackScreen({
  order,
  onBack,
  onChanged,
}: {
  order: MosqueOrder;
  onBack: () => void;
  onChanged: () => void;
}) {
  const now = new Date();
  const st = orderStatusLabel(order, now);
  return (
    <section className="animate-rise">
      <BackLink label="Mosque orders" onClick={onBack} />
      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-f-xl font-extrabold tracking-tight text-foreground">Track order</h1>
          <p className="truncate text-f-xs text-muted-foreground">{order.id}</p>
        </div>
        <StatusChip tone={st.tone}>{st.label}</StatusChip>
      </div>

      <div className="card-soft mt-4 rounded-2xl p-3.5">
        <dl className="space-y-1.5 text-f-xs">
          <InfoRow label="Placed" value={formatDateTime(order.createdAt)} />
          <InfoRow label="First delivery" value={dayAndDate(order.startDate, now)} />
          <InfoRow label="Delivery window" value={order.slot} />
          <InfoRow label="Contact" value={`${order.contact.name} · ${order.contact.phone}`} />
          <InfoRow label="Payment" value={PAYMENT_LABEL[order.payment as PaymentMethod] ?? order.payment} />
          <InfoRow label="Per delivery round" value={`KWD ${money(order.total)}`} strong />
        </dl>
        {order.contact.notes && (
          <p className="mt-2.5 rounded-xl bg-secondary/60 px-3 py-2 text-f-2xs text-muted-foreground">
            Note: {order.contact.notes}
          </p>
        )}
      </div>

      <div className="mt-5 space-y-4">
        {order.items.map((item) => {
          const s = itemStatus(order, item, now);
          const sub = isSubscriptionItem(item);
          return (
            <div key={item.id} className="card-soft rounded-2xl p-3.5">
              <div className="flex items-start gap-3">
                <ProductThumb productId={item.productId} name={item.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-f-sm font-bold text-foreground">
                      {item.qty}× {item.name}
                    </p>
                    <StatusChip tone={s.tone}>{s.label}</StatusChip>
                  </div>
                  <p className="text-f-2xs text-muted-foreground">
                    {planName(item.planId)} · {item.size} · {item.pack}
                  </p>
                  <p dir="auto" className="mt-1 flex items-center gap-1 text-f-2xs text-foreground">
                    <MapPin className="h-3 w-3 shrink-0 text-brand" />
                    <span className="min-w-0">
                      {item.placeName}
                      {item.placeArea ? ` · ${item.placeArea}` : ""}
                    </span>
                  </p>
                </div>
              </div>

              {sub && (
                <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-secondary/60 px-3 py-2 text-f-2xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Repeat className="h-3 w-3 text-brand" /> {planEvery(item.planId)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3 text-brand" />
                    {item.cancelled
                      ? "Cancelled"
                      : item.paused
                        ? "Paused"
                        : s.nextDelivery
                          ? `Next ${dayAndDate(s.nextDelivery, now)}`
                          : "—"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3 text-brand" /> {s.delivered} delivered
                  </span>
                </p>
              )}

              <div className="mt-4">
                <p className="mb-2.5 text-f-xs font-bold text-muted-foreground">
                  {sub ? (s.delivered > 0 ? "Latest delivery" : "First delivery") : "Delivery progress"}
                </p>
                <Timeline steps={trackSteps(order, item, now)} label={`Tracking for ${item.name}`} />
              </div>

              {sub && !item.cancelled && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      mosqueOrdersApi.updateItem(order.id, item.id, { paused: !item.paused });
                      onChanged();
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2.5 text-f-xs font-bold text-foreground"
                  >
                    {item.paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                    {item.paused ? "Resume subscription" : "Pause subscription"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
