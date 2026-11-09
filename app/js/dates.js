// Date helpers. Everything uses the phone's local time.
// An app "day" starts at 05:00, so 0:00–4:59 still belongs to the day before.
// Night (22:00–4:59) is when the screen turns dark and the app stops asking for records.

export const DAY_START_HOUR = 5;
export const NIGHT_START_HOUR = 22;
export const WEEKDAY = ['日', '月', '火', '水', '木', '金', '土'];

const pad = (n) => String(n).padStart(2, '0');

/** Local calendar date → 'YYYY-MM-DD'. */
export function keyOf(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 'YYYY-MM-DD' → Date at local midnight. */
export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** The app day that `now` belongs to. */
export function dayKey(now = new Date()) {
  const d = new Date(now.getTime());
  if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1);
  return keyOf(d);
}

export function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return keyOf(d);
}

/** Whole days from a to b (b − a). */
export function diffDays(a, b) {
  const da = parseKey(a);
  const db = parseKey(b);
  const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((ub - ua) / 86400000);
}

/** Monday of the week that contains `key`. Weeks run Monday to Sunday. */
export function weekStart(key) {
  const d = parseKey(key);
  const fromMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - fromMonday);
  return keyOf(d);
}

export function weekDays(key) {
  const start = weekStart(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function weekdayOf(key) {
  return WEEKDAY[parseKey(key).getDay()];
}

export function isSunday(key) {
  return parseKey(key).getDay() === 0;
}

export function isNight(now = new Date()) {
  const h = now.getHours();
  return h >= NIGHT_START_HOUR || h < DAY_START_HOUR;
}

/** Which tab of the daily menu fits the time of day. */
export function partOfDay(now = new Date()) {
  const h = now.getHours();
  if (h >= DAY_START_HOUR && h < 11) return 'morning';
  if (h >= 11 && h < 18) return 'day';
  return 'night';
}

export function md(key) {
  const d = parseKey(key);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function mdw(key) {
  return `${md(key)}（${weekdayOf(key)}）`;
}

export function hm(iso) {
  const d = new Date(iso);
  return `${d.getHours()}:${pad(d.getMinutes())}`;
}

/** 'きょう', 'きのう' or a date, relative to `today`. */
export function relDay(key, today) {
  const n = diffDays(key, today);
  if (n === 0) return 'きょう';
  if (n === 1) return 'きのう';
  return md(key);
}

/** Compact date for file names: 'YYYYMMDD'. */
export function compact(key) {
  return key.replaceAll('-', '');
}
