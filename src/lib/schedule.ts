import { DEFAULT_DURATION, durations, plans } from "@/lib/abraaj-data";
import { DAY, addDays, addMonths, formatDate, startOfDay } from "@/lib/dates";

/* ================================================================== */
/* Fixed-weekday delivery schedules for subscriptions                  */
/* ================================================================== */
/*
 * A subscription delivers on the weekdays the customer picks ("every Monday",
 * "every other Tuesday"). This module is the single source of truth for:
 *  - the scheduling rules per plan (how many days, how many weeks apart),
 *  - turning weekdays + start/end dates + pauses + cancellation into the
 *    concrete list of delivery dates,
 *  - validating input. The orders/subscriptions services call `validate*` on
 *    every write, independently of the UI, the same way a server would.
 *
 * Dates are calendar days in the customer's local time ("2026-10-27").
 */

export type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

/** Monday-first, the order days are shown and stored in. */
export const WEEKDAYS: Weekday[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export const WEEKDAY_LABEL: Record<Weekday, { short: string; long: string; letter: string }> = {
  MON: { short: "Mon", long: "Monday", letter: "M" },
  TUE: { short: "Tue", long: "Tuesday", letter: "T" },
  WED: { short: "Wed", long: "Wednesday", letter: "W" },
  THU: { short: "Thu", long: "Thursday", letter: "T" },
  FRI: { short: "Fri", long: "Friday", letter: "F" },
  SAT: { short: "Sat", long: "Saturday", letter: "S" },
  SUN: { short: "Sun", long: "Sunday", letter: "S" },
};

/**
 * Scheduling rules per frequency plan. Pricing is unchanged (see `plans` /
 * CART_SUB_OFF); only the timing is defined here.
 * - weekly:   every week, on one or more chosen days
 * - biweekly: every other week, on one chosen day
 * - monthly:  every 4 weeks, on one chosen day (a fixed weekday can't repeat
 *             every 30 days, so "monthly" means every fourth week)
 */
export const PLAN_RULES: Record<string, { everyWeeks: number; maxDays: number; label: string }> = {
  weekly: { everyWeeks: 1, maxDays: 7, label: "Every week" },
  biweekly: { everyWeeks: 2, maxDays: 1, label: "Every 2 weeks" },
  monthly: { everyWeeks: 4, maxDays: 1, label: "Every 4 weeks" },
};

/** The first delivery is at least this many days after the order (same promise as one-time items). */
export const LEAD_DAYS = 1;
/** A subscription can start up to this many days ahead. */
export const START_WINDOW_DAYS = 30;
/** Longest single pause. */
export const MAX_PAUSE_DAYS = 90;

export class ScheduleError extends Error {
  override name = "ScheduleError";
}

/* ------------------------------------------------------------------ */
/* Day helpers                                                         */
/* ------------------------------------------------------------------ */

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-10-27" for a local date. */
export function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parses "2026-10-27" as local midnight. Returns null for anything that isn't a real date. */
export function parseDateKey(key: unknown): Date | null {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

/** Monday-based index, 0 = Monday. */
export function weekdayIndex(d: Date) {
  return (d.getDay() + 6) % 7;
}

export function weekdayOf(d: Date): Weekday {
  return WEEKDAYS[weekdayIndex(d)]!;
}

export function mondayOf(d: Date) {
  return addDays(startOfDay(d), -weekdayIndex(d));
}

const isWeekday = (v: unknown): v is Weekday => typeof v === "string" && (WEEKDAYS as string[]).includes(v);

/** Sorted Monday-first, duplicates removed. */
export function normalizeDays(days: Weekday[]) {
  return WEEKDAYS.filter((d) => days.includes(d));
}

export function planRule(planId: string | undefined) {
  return PLAN_RULES[planId ?? ""] ?? null;
}

/** Earliest day a new subscription can deliver, given its start date. */
export function firstEligibleDay(start: Date, now = new Date()) {
  const s = startOfDay(start);
  const lead = addDays(startOfDay(now), LEAD_DAYS);
  return s > lead ? s : lead;
}

/** Default pick: the weekday of the earliest possible delivery, so nothing changes for "Subscribe now". */
export function defaultDays(start: Date = new Date(), now = new Date()): Weekday[] {
  return [weekdayOf(firstEligibleDay(start, now))];
}

/** Keeps a selection valid when the plan changes (e.g. weekly → bi-weekly allows one day). */
export function fitDaysToPlan(days: Weekday[], planId: string, start: Date = new Date(), now = new Date()) {
  const rule = planRule(planId);
  const clean = normalizeDays(days.filter(isWeekday));
  if (!rule || clean.length === 0) return defaultDays(start, now);
  return clean.slice(0, rule.maxDays);
}

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

function joinDays(days: Weekday[], style: "short" | "long") {
  const names = normalizeDays(days).map((d) => WEEKDAY_LABEL[d][style]);
  if (names.length === 7) return "every day";
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

/** "Every Monday & Thursday", "Every other Tuesday", "Every 4 weeks on Wednesday". */
export function scheduleLabel(planId: string, days: Weekday[], style: "short" | "long" = "long") {
  const rule = planRule(planId);
  const list = joinDays(days, style);
  if (!list) return rule?.label ?? "";
  if (list === "every day") return "Every day";
  if (!rule || rule.everyWeeks === 1) return `Every ${list}`;
  if (rule.everyWeeks === 2) return `Every other ${list}`;
  return `Every ${rule.everyWeeks} weeks on ${list}`;
}

/* ------------------------------------------------------------------ */
/* Schedule generation                                                 */
/* ------------------------------------------------------------------ */

/** A pause from `from` to `to`, inclusive. `to` null = until the customer resumes. */
export type Pause = { from: string; to: string | null; createdAt: string };

export type ScheduleRule = {
  days: Weekday[];
  everyWeeks: number;
  /** Monday of the week cadence counts from ("every other week" parity). */
  anchor: string;
  /** End of the subscription, exclusive. */
  end: string;
  pauses?: Pause[] | undefined;
  /** Deliveries on or after this day are cancelled. */
  cancelFrom?: string | null | undefined;
};

export function isPausedOn(d: Date, pauses: Pause[] | undefined) {
  const key = dateKey(d);
  return (pauses ?? []).some((p) => key >= p.from && (p.to === null || key <= p.to));
}

/** Delivery days from `from` (inclusive) to the rule's end, following the weekdays and cadence. */
export function generateDates(rule: ScheduleRule, from: Date): Date[] {
  const days = normalizeDays(rule.days);
  const anchor = parseDateKey(rule.anchor);
  const end = new Date(rule.end);
  if (!days.length || !anchor || !(rule.everyWeeks >= 1)) return [];
  const start = startOfDay(from);
  const cancel = rule.cancelFrom ? parseDateKey(rule.cancelFrom) : null;

  // First week on the cadence at or after `from`'s week.
  let week = mondayOf(start);
  const offset = Math.round((week.getTime() - anchor.getTime()) / (7 * DAY));
  const mod = ((offset % rule.everyWeeks) + rule.everyWeeks) % rule.everyWeeks;
  if (mod) week = addDays(week, (rule.everyWeeks - mod) * 7);

  const out: Date[] = [];
  for (; week < end; week = addDays(week, rule.everyWeeks * 7)) {
    for (const d of days) {
      const date = addDays(week, WEEKDAYS.indexOf(d));
      if (date < start || date >= end) continue;
      if (cancel && date >= cancel) continue;
      if (isPausedOn(date, rule.pauses)) continue;
      out.push(date);
    }
    if (out.length > 800) break; // hard stop: 7 days × 2 years is ~730
  }
  return out;
}

/** Start / end / anchor / delivery dates for a brand-new subscription. */
export function planSchedule(
  input: { planId: string; durationId?: string | undefined; days: Weekday[]; startDate?: string | undefined },
  now = new Date(),
) {
  const rule = planRule(input.planId) ?? PLAN_RULES["weekly"]!;
  const duration = durations.find((d) => d.id === (input.durationId ?? DEFAULT_DURATION)) ?? durations.find((d) => d.id === DEFAULT_DURATION)!;
  const start = parseDateKey(input.startDate) ?? startOfDay(now);
  const months = duration.unit === "YEAR" ? duration.value * 12 : duration.value;
  const end = addMonths(start, months);
  const days = normalizeDays(input.days);
  const eligible = firstEligibleDay(start, now);
  // First chosen weekday on or after the earliest possible day; its week anchors the cadence.
  const first = Array.from({ length: 7 }, (_, i) => addDays(eligible, i)).find((d) => days.includes(weekdayOf(d))) ?? eligible;
  const anchor = dateKey(mondayOf(first));
  const dates = generateDates({ days, everyWeeks: rule.everyWeeks, anchor, end: end.toISOString() }, eligible);
  return { start, end, anchor, everyWeeks: rule.everyWeeks, days, duration, dates, firstDelivery: dates[0] ?? null };
}

/* ------------------------------------------------------------------ */
/* Validation (runs in the services, not just the UI)                  */
/* ------------------------------------------------------------------ */

/** Checks a weekday selection against the plan's rules. Returns the cleaned list. */
export function validateDays(planId: unknown, days: unknown): Weekday[] {
  const rule = typeof planId === "string" ? planRule(planId) : null;
  if (!rule) throw new ScheduleError("Choose a delivery frequency.");
  if (!Array.isArray(days) || days.length === 0) throw new ScheduleError("Pick at least one delivery day.");
  const bad = days.filter((d) => !isWeekday(d));
  if (bad.length) throw new ScheduleError(`"${String(bad[0])}" isn't a day of the week.`);
  if (new Set(days).size !== days.length) throw new ScheduleError("Each delivery day can only be picked once.");
  if (days.length > rule.maxDays) {
    const plan = plans.find((p) => p.id === planId)?.name ?? "This plan";
    throw new ScheduleError(
      rule.maxDays === 1 ? `${plan} delivers on one day. Pick a single day.` : `${plan} allows up to ${rule.maxDays} delivery days.`,
    );
  }
  return normalizeDays(days as Weekday[]);
}

/** A start date must be a real date between today and START_WINDOW_DAYS ahead. */
export function validateStartDate(startDate: unknown, now = new Date()): Date {
  if (startDate === undefined || startDate === null || startDate === "") return startOfDay(now);
  const d = parseDateKey(startDate);
  if (!d) throw new ScheduleError("Enter a valid start date.");
  const today = startOfDay(now);
  if (d < today) throw new ScheduleError("The start date can't be in the past.");
  if (d > addDays(today, START_WINDOW_DAYS)) throw new ScheduleError(`Start within the next ${START_WINDOW_DAYS} days.`);
  return d;
}

/** Full check for a new subscription line; throws ScheduleError with a customer-facing message. */
export function validateNewSubscription(
  input: { planId: unknown; durationId: unknown; days: unknown; startDate: unknown },
  now = new Date(),
) {
  const days = validateDays(input.planId, input.days);
  if (input.durationId !== undefined && !durations.some((d) => d.id === input.durationId))
    throw new ScheduleError("Choose a subscription length.");
  validateStartDate(input.startDate, now);
  const plan = planSchedule(
    { planId: input.planId as string, durationId: input.durationId as string | undefined, days, startDate: input.startDate as string | undefined },
    now,
  );
  if (plan.dates.length === 0) throw new ScheduleError("No deliveries fall between the start and end dates. Pick different days.");
  return plan;
}

/** "Starts Tue 27 Oct" style helper for summaries. */
export function describeStart(start: Date, now = new Date()) {
  return startOfDay(start).getTime() === startOfDay(now).getTime() ? "Today" : formatDate(start);
}
