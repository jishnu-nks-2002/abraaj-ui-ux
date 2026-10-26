/* Date helpers shared by orders and e-coupon booklets. Built by hand so every
   browser/locale prints the same thing. */

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Adds calendar months, clamping 31 Jan + 1 month to 28/29 Feb. */
export function addMonths(d: Date, n: number) {
  const x = new Date(d);
  const day = x.getDate();
  x.setDate(1);
  x.setMonth(x.getMonth() + n);
  const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(day, last));
  return x;
}

export function atHour(d: Date, h: number) {
  const x = new Date(d);
  x.setHours(h, 0, 0, 0);
  return x;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad2 = (n: number) => String(n).padStart(2, "0");

/** "23 Sep 2026" — built by hand so every browser/locale prints the same thing. */
export function formatDate(iso: string | Date) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "23 Sep, 14:05" */
export function formatDateTime(iso: string | Date) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** "Today", "Tomorrow", "Yesterday" or "Thu 24 Sep". */
export function relativeDay(iso: string | Date, now = new Date()) {
  const d = new Date(iso);
  const diff = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / (24 * HOUR));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Tomorrow, 24 Sep 2026" when close, otherwise just "2 Oct 2026". */
export function dayAndDate(iso: string | Date, now = new Date()) {
  const rel = relativeDay(iso, now);
  return ["Today", "Tomorrow", "Yesterday"].includes(rel) ? `${rel}, ${formatDate(iso)}` : formatDate(iso);
}

/** Whole days from `now` until `iso` (negative once it has passed). */
export function daysUntil(iso: string | Date, now = new Date()) {
  return Math.ceil((startOfDay(new Date(iso)).getTime() - startOfDay(now).getTime()) / DAY);
}

/** End of the given day, 23:59:59.999 local time. */
export function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
