import { useEffect, useState } from "react";
import { CalendarDays, CalendarX2, Check, Pause, Play, Repeat, X } from "lucide-react";
import { durationById, plans } from "@/lib/abraaj-data";
import { formatPrice } from "@/lib/cart";
import {
  MAX_PAUSE_DAYS,
  PLAN_RULES,
  START_WINDOW_DAYS,
  ScheduleError,
  WEEKDAYS,
  WEEKDAY_LABEL,
  dateKey,
  planRule,
  scheduleLabel,
  type Weekday,
} from "@/lib/schedule";
import {
  SUBSCRIPTION_STATUS_LABEL,
  addDays,
  canChangeStart,
  changeEffectiveFrom,
  formatDate,
  relativeDay,
  startOfDay,
  subscriptionsApi,
  upcomingDeliveries,
  type ItemSubscription,
  type Order,
  type SubscriptionEntry,
} from "@/lib/orders";
import { BackLink, ProductThumb, StatusChip } from "@/components/abraaj/order-ui";

/* ------------------------------------------------------------------ */
/* Weekday picker                                                      */
/* ------------------------------------------------------------------ */

/**
 * Seven day toggles. Weekly plans can pick several days; bi-weekly and monthly
 * pick one (tapping another day moves the selection). The last selected day
 * can't be turned off, so a selection is never empty.
 */
export function WeekdayPicker({
  planId,
  value,
  onChange,
  label = "Delivery days",
  compact = false,
}: {
  planId: string;
  value: Weekday[];
  onChange: (days: Weekday[]) => void;
  label?: string;
  compact?: boolean;
}) {
  const rule = planRule(planId) ?? PLAN_RULES["weekly"]!;
  const multi = rule.maxDays > 1;
  function toggle(d: Weekday) {
    if (!multi) return onChange([d]);
    if (value.includes(d)) {
      if (value.length > 1) onChange(value.filter((x) => x !== d));
    } else if (value.length < rule.maxDays) onChange(WEEKDAYS.filter((x) => x === d || value.includes(x)));
  }
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-f-xs font-bold text-foreground">{label}</p>
        <p className="text-f-2xs text-muted-foreground">{multi ? "Pick one or more" : "Pick one day"}</p>
      </div>
      <div className={`mt-2 grid grid-cols-7 ${compact ? "gap-1" : "gap-1.5"}`} role={multi ? "group" : "radiogroup"} aria-label={label}>
        {WEEKDAYS.map((d) => {
          const on = value.includes(d);
          return (
            <button
              key={d}
              type="button"
              role={multi ? undefined : "radio"}
              aria-pressed={multi ? on : undefined}
              aria-checked={multi ? undefined : on}
              aria-label={WEEKDAY_LABEL[d].long}
              onClick={() => toggle(d)}
              className={`min-w-0 rounded-xl py-2 text-center text-f-2xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                on ? "bg-brand text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              } ${compact ? "py-1.5" : ""}`}
            >
              {WEEKDAY_LABEL[d].short}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-f-2xs font-semibold text-brand">
        <Repeat className="h-3 w-3 shrink-0" /> {scheduleLabel(planId, value)}
      </p>
    </div>
  );
}

/** "Thu 29 Oct · Mon 2 Nov · Thu 5 Nov" as chips. */
export function DateChips({ dates, now = new Date(), more = 0 }: { dates: Date[]; now?: Date; more?: number }) {
  if (!dates.length) return <p className="text-f-2xs text-muted-foreground">No upcoming deliveries.</p>;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Upcoming deliveries">
      {dates.map((d) => (
        <li key={d.toISOString()} className="bg-aqua-soft rounded-lg px-2 py-1 text-f-2xs font-semibold text-brand">
          {relativeDay(d, now)}
        </li>
      ))}
      {more > 0 && <li className="rounded-lg bg-secondary px-2 py-1 text-f-2xs font-semibold text-muted-foreground">+{more} more</li>}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* My subscriptions                                                    */
/* ------------------------------------------------------------------ */

type Panel = "days" | "pause" | "start" | "cancel" | null;

function statusTone(s: ItemSubscription["status"]) {
  if (s === "ACTIVE") return "aqua" as const;
  if (s === "PAUSED") return "brand" as const;
  if (s === "CANCELLED" || s === "COMPLETED") return "muted" as const;
  return "brand" as const;
}

function activePause(sub: ItemSubscription, now: Date) {
  const today = dateKey(startOfDay(now));
  return sub.pauses.find((p) => p.to === null || p.to >= today) ?? null;
}

function SubscriptionCard({ entry, now, onChanged, focus }: { entry: SubscriptionEntry; now: Date; onChanged: (o: Order) => void; focus: boolean }) {
  const { order, item, sub } = entry;
  const ref = { orderId: order.id, itemId: item.id };
  const [panel, setPanel] = useState<Panel>(null);
  const [days, setDays] = useState<Weekday[]>(sub.days);
  const [pauseFrom, setPauseFrom] = useState(dateKey(changeEffectiveFrom(now)));
  const [pauseTo, setPauseTo] = useState<string | null>(dateKey(addDays(changeEffectiveFrom(now), 13)));
  const [start, setStart] = useState(dateKey(new Date(sub.startDate)));
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const ended = sub.status === "CANCELLED" || sub.status === "COMPLETED";
  const upcoming = upcomingDeliveries(sub, now);
  const pause = activePause(sub, now);
  const canMoveStart = !ended && canChangeStart(sub, now);
  const plan = plans.find((p) => p.id === sub.planId);
  const earliest = dateKey(changeEffectiveFrom(now));

  function run(action: () => Order, message: string) {
    setError(null);
    try {
      onChanged(action());
      setPanel(null);
      setDone(message);
    } catch (e) {
      setError(e instanceof ScheduleError ? e.message : "That change couldn't be saved. Try again.");
    }
  }
  function open(p: Panel) {
    setError(null);
    setDone(null);
    setDays(sub.days);
    setPanel(panel === p ? null : p);
  }

  return (
    <li id={`sub-${order.id}-${item.id}`} className={`card-soft scroll-mt-24 rounded-3xl p-3.5 xs:p-4 ${focus ? "ring-2 ring-brand" : ""}`}>
      <div className="flex items-center gap-3">
        <ProductThumb productId={item.product.id} name={item.product.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-f-sm font-extrabold text-foreground">{item.product.name}</p>
          <p className="truncate text-f-2xs text-muted-foreground">
            {plan?.name ?? sub.frequency} · {durationById(sub.durationId).label} · qty {item.quantity} · {formatPrice(item.unitPrice)} per delivery
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <StatusChip tone={statusTone(sub.status)}>{SUBSCRIPTION_STATUS_LABEL[sub.status]}</StatusChip>
            <span className="text-f-2xs text-muted-foreground">Order #{order.id}</span>
          </div>
        </div>
      </div>

      {/* schedule */}
      <div className="mt-3 rounded-2xl bg-secondary/60 p-3">
        <p className="flex items-center gap-1.5 text-f-sm font-extrabold text-brand">
          <CalendarDays className="h-4 w-4 shrink-0" /> {scheduleLabel(sub.planId, sub.days)}
        </p>
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {WEEKDAYS.map((d) => (
            <span
              key={d}
              className={`grid h-7 min-w-0 flex-1 place-items-center rounded-lg text-f-2xs font-bold ${
                sub.days.includes(d) ? "bg-brand text-primary-foreground" : "bg-background text-muted-foreground/60"
              }`}
            >
              {WEEKDAY_LABEL[d].short}
            </span>
          ))}
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-f-2xs">
          <div className="min-w-0">
            <dt className="text-muted-foreground">Start</dt>
            <dd className="truncate font-bold text-foreground">{formatDate(sub.startDate)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">{sub.status === "CANCELLED" ? "Cancelled" : "Ends"}</dt>
            <dd className="truncate font-bold text-foreground">{formatDate(sub.cancelledAt ?? sub.endDate)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">Delivered</dt>
            <dd className="truncate font-bold text-foreground">
              {sub.deliveriesCompleted} of {sub.totalDeliveries}
            </dd>
          </div>
        </dl>
        {pause && (
          <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-brand-soft px-2.5 py-1.5 text-f-2xs font-semibold text-brand">
            <Pause className="h-3.5 w-3.5 shrink-0" />
            {pause.to ? `Paused ${formatDate(pause.from)} – ${formatDate(pause.to)}` : `Paused from ${formatDate(pause.from)} until you resume`}
          </p>
        )}
        {!ended && (
          <div className="mt-3">
            <p className="mb-1.5 text-f-2xs font-bold text-foreground">Next deliveries</p>
            <DateChips dates={upcoming.slice(0, 5)} now={now} more={Math.max(0, upcoming.length - 5)} />
          </div>
        )}
      </div>

      {done && (
        <p role="status" className="mt-2 flex items-center gap-1.5 text-f-2xs font-semibold text-aqua">
          <Check className="h-3.5 w-3.5" /> {done}
        </p>
      )}

      {/* actions */}
      {!ended && (
        <div className="mt-3 flex flex-wrap gap-2">
          <ActionButton active={panel === "days"} onClick={() => open("days")} Icon={CalendarDays}>
            Change days
          </ActionButton>
          {pause ? (
            <ActionButton onClick={() => run(() => subscriptionsApi.resume(ref), "Resumed. Deliveries restart from tomorrow.")} Icon={Play}>
              Resume
            </ActionButton>
          ) : (
            <ActionButton active={panel === "pause"} onClick={() => open("pause")} Icon={Pause}>
              Pause
            </ActionButton>
          )}
          {canMoveStart && (
            <ActionButton active={panel === "start"} onClick={() => open("start")} Icon={Repeat}>
              Start date
            </ActionButton>
          )}
          <ActionButton active={panel === "cancel"} onClick={() => open("cancel")} Icon={CalendarX2} danger>
            Cancel
          </ActionButton>
        </div>
      )}

      {panel === "days" && (
        <div className="mt-3 rounded-2xl border border-border p-3">
          <WeekdayPicker planId={sub.planId} value={days} onChange={setDays} label="New delivery days" />
          <p className="mt-2 text-f-2xs text-muted-foreground">Applies from {relativeDay(changeEffectiveFrom(now), now).toLowerCase()}. Earlier deliveries stay as they are.</p>
          <PanelButtons
            onCancel={() => setPanel(null)}
            onSave={() => run(() => subscriptionsApi.changeDays(ref, days), `Delivery days updated: ${scheduleLabel(sub.planId, days)}.`)}
            disabled={days.join() === sub.days.join()}
            label="Save days"
          />
        </div>
      )}

      {panel === "pause" && (
        <div className="mt-3 rounded-2xl border border-border p-3">
          <p className="text-f-xs font-bold text-foreground">Pause deliveries</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(
              [
                ["1 week", 6],
                ["2 weeks", 13],
                ["1 month", 29],
                ["Until I resume", null],
              ] as const
            ).map(([label, len]) => {
              const to = len === null ? null : dateKey(addDays(new Date(`${pauseFrom}T00:00:00`), len));
              const on = pauseTo === to;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setPauseTo(to)}
                  aria-pressed={on}
                  className={`rounded-full px-3 py-1.5 text-f-2xs font-bold ${on ? "bg-brand text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <DateField label="From" value={pauseFrom} min={earliest} max={dateKey(new Date(sub.endDate))} onChange={setPauseFrom} />
            <DateField
              label="Until (inclusive)"
              value={pauseTo ?? ""}
              min={pauseFrom}
              max={dateKey(addDays(new Date(`${pauseFrom}T00:00:00`), MAX_PAUSE_DAYS - 1))}
              onChange={(v) => setPauseTo(v || null)}
              placeholder="Until resumed"
            />
          </div>
          <p className="mt-2 text-f-2xs text-muted-foreground">
            Deliveries in this period are skipped, not moved. Your end date stays {formatDate(sub.endDate)}. Up to {MAX_PAUSE_DAYS} days.
          </p>
          <PanelButtons
            onCancel={() => setPanel(null)}
            onSave={() =>
              run(
                () => subscriptionsApi.pause(ref, { from: pauseFrom, to: pauseTo }),
                pauseTo ? `Paused ${formatDate(pauseFrom)} – ${formatDate(pauseTo)}.` : `Paused from ${formatDate(pauseFrom)}.`,
              )
            }
            label="Pause"
          />
        </div>
      )}

      {panel === "start" && (
        <div className="mt-3 rounded-2xl border border-border p-3">
          <DateField
            label="New start date"
            value={start}
            min={dateKey(startOfDay(now))}
            max={dateKey(addDays(startOfDay(now), START_WINDOW_DAYS))}
            onChange={setStart}
          />
          <p className="mt-2 text-f-2xs text-muted-foreground">The end date moves with it. Available until your first delivery.</p>
          <PanelButtons
            onCancel={() => setPanel(null)}
            onSave={() => run(() => subscriptionsApi.changeStartDate(ref, start), `Start date moved to ${formatDate(`${start}T00:00:00`)}.`)}
            label="Save start date"
          />
        </div>
      )}

      {panel === "cancel" && (
        <div className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-f-xs font-bold text-foreground">Cancel this subscription?</p>
          <p className="mt-1 text-f-2xs text-muted-foreground">
            {upcoming.length
              ? `${upcoming.filter((d) => d >= changeEffectiveFrom(now)).length} upcoming deliveries from ${relativeDay(changeEffectiveFrom(now), now).toLowerCase()} will be cancelled.`
              : "There are no upcoming deliveries."}{" "}
            Deliveries already made stay in your history.
          </p>
          <PanelButtons
            onCancel={() => setPanel(null)}
            onSave={() => run(() => subscriptionsApi.cancel(ref), "Subscription cancelled.")}
            label="Yes, cancel"
            danger
            cancelLabel="Keep it"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 rounded-xl bg-destructive/10 px-3 py-2 text-f-2xs font-semibold text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}

function ActionButton({
  children,
  onClick,
  Icon,
  active = false,
  danger = false,
}: {
  children: string;
  onClick: () => void;
  Icon: typeof Pause;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-f-2xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
        active ? "bg-brand text-primary-foreground" : danger ? "bg-destructive/10 text-destructive" : "bg-brand-soft text-brand"
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {children}
    </button>
  );
}

function PanelButtons({
  onCancel,
  onSave,
  label,
  disabled = false,
  danger = false,
  cancelLabel = "Cancel",
}: {
  onCancel: () => void;
  onSave: () => void;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  cancelLabel?: string;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button type="button" onClick={onCancel} className="rounded-xl border border-border bg-background py-2.5 text-f-xs font-bold text-foreground">
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={disabled}
        className={`rounded-xl py-2.5 text-f-xs font-bold text-primary-foreground disabled:opacity-50 ${danger ? "bg-destructive" : "bg-brand"}`}
      >
        {label}
      </button>
    </div>
  );
}

export function DateField({
  label,
  value,
  min,
  max,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-f-2xs font-semibold text-muted-foreground">{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-0 rounded-xl bg-secondary px-3 py-2 text-base font-semibold text-foreground outline-none focus:ring-2 focus:ring-brand"
      />
    </label>
  );
}

export function SubscriptionsScreen({
  entries,
  focusId,
  onChanged,
  onBack,
  onSubscribe,
}: {
  entries: SubscriptionEntry[];
  /** "orderId:itemId" to highlight and scroll to. */
  focusId?: string | null;
  onChanged: (o: Order) => void;
  onBack: () => void;
  onSubscribe: () => void;
}) {
  const now = new Date();
  const live = entries.filter((e) => e.sub.status !== "CANCELLED" && e.sub.status !== "COMPLETED");
  const past = entries.filter((e) => !live.includes(e));
  useEffect(() => {
    if (focusId) document.getElementById(`sub-${focusId.replace(":", "-")}`)?.scrollIntoView({ block: "start" });
  }, [focusId]);
  const card = (e: SubscriptionEntry) => (
    <SubscriptionCard key={`${e.order.id}:${e.item.id}`} entry={e} now={now} onChanged={onChanged} focus={focusId === `${e.order.id}:${e.item.id}`} />
  );
  return (
    <section className="animate-rise">
      <BackLink label="Account" onClick={onBack} />
      <h1 className="mt-2 text-f-xl font-extrabold tracking-tight text-foreground">My subscriptions</h1>
      <p className="mt-1 text-f-xs text-muted-foreground">Choose delivery days, pause or cancel. Changes apply from tomorrow.</p>

      {entries.length === 0 ? (
        <div className="pt-10 text-center">
          <div className="bg-aqua-soft mx-auto grid h-20 w-20 place-items-center rounded-full">
            <Repeat className="h-8 w-8 text-brand" />
          </div>
          <h2 className="mt-4 text-f-lg font-bold text-foreground">No subscriptions yet</h2>
          <p className="mx-auto mt-1 max-w-[17rem] text-f-sm text-muted-foreground">Subscribe to any product and pick the days it arrives.</p>
          <button onClick={onSubscribe} className="mt-5 rounded-2xl bg-brand px-6 py-3 text-f-sm font-bold text-primary-foreground">
            Start a subscription
          </button>
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-3">{live.map(card)}</ul>
          {past.length > 0 && (
            <>
              <h2 className="mt-7 flex items-center gap-1.5 text-f-sm font-bold text-muted-foreground">
                <X className="h-4 w-4" /> Ended
              </h2>
              <ul className="mt-2 space-y-3 opacity-80">{past.map(card)}</ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
