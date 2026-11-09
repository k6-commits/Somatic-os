// Data kept on this phone only (localStorage). Every change goes through a pure
// function here that returns a new copy, so screens never edit the data directly.

import { diffDays, weekStart } from './dates.js';
import { ACTS } from './content.js';

export const STORAGE_KEY = 'somatic-os:data:v1';
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function emptyData() {
  return {
    v: 1,
    settings: {
      onboarded: false,
      consentedAt: null,
      startDay: null,
      walkPlanStart: null,
      voice: false,
      vibrate: true,
      trusted: { name: '', tel: '' },
      welcomeSeen: null,
    },
    days: {},
    weekly: {},
    reviews: {},
  };
}

export function emptyDay() {
  return {
    mode: null,
    sleep: null,
    mood: null,
    fatigue: null,
    checkedInAt: null,
    done: {},
    extra: [],
    line: '',
    walks: [],
    pauses: [],
  };
}

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const str = (x) => (typeof x === 'string' ? x : null);
const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const arr = (x) => (Array.isArray(x) ? x : []);

function normalizeDay(raw) {
  const day = emptyDay();
  if (!isObj(raw)) return day;
  day.mode = ['rest', 'tune', 'expand'].includes(raw.mode) ? raw.mode : null;
  day.sleep = str(raw.sleep);
  day.mood = num(raw.mood);
  day.fatigue = num(raw.fatigue);
  day.checkedInAt = str(raw.checkedInAt);
  if (isObj(raw.done)) {
    for (const [id, at] of Object.entries(raw.done)) if (typeof at === 'string') day.done[id] = at;
  }
  day.extra = arr(raw.extra).filter((e) => isObj(e) && typeof e.at === 'string' && typeof e.label === 'string');
  day.line = str(raw.line) || '';
  day.walks = arr(raw.walks).filter((w) => isObj(w) && typeof w.at === 'string' && num(w.min) > 0);
  day.pauses = arr(raw.pauses)
    .filter((p) => isObj(p) && typeof p.at === 'string')
    .map((p) => ({ at: p.at, body: arr(p.body).filter((b) => typeof b === 'string'), acts: arr(p.acts).filter((a) => typeof a === 'string') }));
  if (num(raw.gap)) day.gap = raw.gap;
  return day;
}

function normalizeReview(raw) {
  const answer = num(raw.answer);
  return {
    wins: arr(raw.wins).filter((w) => typeof w === 'string'),
    note: str(raw.note) || '',
    bodies: arr(raw.bodies).filter((b) => typeof b === 'string'),
    answer: answer !== null && Number.isInteger(answer) && answer >= 0 && answer <= 4 ? answer : null,
    plan: str(raw.plan),
    custom: str(raw.custom) || '',
    planText: str(raw.planText) || '',
    at: str(raw.at),
  };
}

/** Fill in anything missing or malformed so the screens can trust the shape. */
export function normalize(raw) {
  const data = emptyData();
  if (!isObj(raw)) return data;
  const s = isObj(raw.settings) ? raw.settings : {};
  data.settings = {
    ...data.settings,
    onboarded: s.onboarded === true,
    consentedAt: str(s.consentedAt),
    startDay: str(s.startDay),
    walkPlanStart: str(s.walkPlanStart),
    voice: s.voice === true,
    vibrate: s.vibrate !== false,
    trusted: {
      name: isObj(s.trusted) ? str(s.trusted.name) || '' : '',
      tel: isObj(s.trusted) ? str(s.trusted.tel) || '' : '',
    },
    welcomeSeen: str(s.welcomeSeen),
  };
  if (isObj(raw.days)) {
    for (const [key, day] of Object.entries(raw.days)) if (DAY_KEY.test(key)) data.days[key] = normalizeDay(day);
  }
  if (isObj(raw.weekly)) {
    for (const [key, w] of Object.entries(raw.weekly)) {
      if (DAY_KEY.test(key) && isObj(w) && num(w.q1) !== null && num(w.q2) !== null) {
        data.weekly[key] = { q1: w.q1, q2: w.q2, score: w.q1 + w.q2, at: str(w.at) };
      }
    }
  }
  if (isObj(raw.reviews)) {
    for (const [key, r] of Object.entries(raw.reviews)) if (DAY_KEY.test(key) && isObj(r)) data.reviews[key] = normalizeReview(r);
  }
  return data;
}

/** Read the saved data. If it cannot be parsed, keep a copy aside and start fresh. */
export function load(storage) {
  let raw = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { data: emptyData(), error: 'unavailable' };
  }
  if (!raw) return { data: emptyData(), error: null };
  try {
    return { data: normalize(JSON.parse(raw)), error: null };
  } catch {
    try {
      storage.setItem(`${STORAGE_KEY}:broken:${Date.now()}`, raw);
    } catch {
      /* nothing more we can do */
    }
    return { data: emptyData(), error: 'broken' };
  }
}

export function save(data, storage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

const clone = (x) => JSON.parse(JSON.stringify(x));

function editDay(data, key, fn) {
  const next = clone(data);
  const day = normalizeDay(next.days[key]);
  fn(day, next);
  next.days[key] = day;
  return next;
}

/** The most recent day before `key` that has a check-in, or null. */
export function lastCheckInBefore(data, key) {
  let best = null;
  for (const k of Object.keys(data.days)) {
    if (k < key && data.days[k].checkedInAt && (best === null || k > best)) best = k;
  }
  return best;
}

/**
 * Morning check-in (also used to correct it later the same day).
 * After a gap of 7 days or more, the walking plan starts again from week 1.
 */
export function checkIn(data, key, entry, nowIso) {
  const prev = lastCheckInBefore(data, key);
  const gap = prev ? diffDays(prev, key) : null;
  return editDay(data, key, (day, next) => {
    day.mode = entry.mode;
    day.sleep = entry.sleep ?? null;
    day.mood = entry.mood ?? null;
    day.fatigue = entry.fatigue ?? null;
    if (!day.checkedInAt) day.checkedInAt = nowIso;
    if (!day.done.m4) day.done.m4 = nowIso;
    if (gap !== null && gap >= 3) day.gap = gap;
    const s = next.settings;
    if (!s.startDay) s.startDay = key;
    if (!s.walkPlanStart || (gap !== null && gap >= 7)) s.walkPlanStart = weekStart(key);
  });
}

export function setMode(data, key, mode) {
  return editDay(data, key, (day) => {
    day.mode = mode;
  });
}

export function setDone(data, key, id, on, nowIso) {
  return editDay(data, key, (day) => {
    if (on) {
      if (!day.done[id]) day.done[id] = nowIso;
    } else {
      delete day.done[id];
    }
  });
}

export function saveLine(data, key, text, nowIso) {
  const line = String(text || '').trim().slice(0, 120);
  return editDay(data, key, (day) => {
    day.line = line;
    if (line) day.done.n1 = day.done.n1 || nowIso;
    else delete day.done.n1;
  });
}

export function addWalk(data, key, minutes, nowIso) {
  const min = Math.round(Number(minutes));
  if (!Number.isFinite(min) || min <= 0 || min > 600) return data;
  return editDay(data, key, (day) => {
    day.walks.push({ at: nowIso, min });
  });
}

export function removeWalk(data, key, index) {
  return editDay(data, key, (day) => {
    day.walks.splice(index, 1);
  });
}

/** A visit to つらいとき: which body states were checked, and what was done about them. */
export function addPause(data, key, body, acts, nowIso) {
  return editDay(data, key, (day) => {
    day.pauses.push({ at: nowIso, body: [...body], acts: [...acts] });
    for (const a of acts) day.extra.push({ at: nowIso, label: ACTS[a] ? ACTS[a].done : a, kind: 'pause' });
  });
}

export function saveWeekly(data, weekKey, q1, q2, nowIso) {
  const next = clone(data);
  next.weekly[weekKey] = { q1, q2, score: q1 + q2, at: nowIso };
  return next;
}

export function saveReview(data, weekKey, todayKey, review, nowIso) {
  const next = clone(data);
  next.reviews[weekKey] = { ...review, at: nowIso };
  return setDone(next, todayKey, 'rv', true, nowIso);
}

export function updateSettings(data, patch) {
  const next = clone(data);
  next.settings = { ...next.settings, ...patch };
  return next;
}

export function exportText(data, nowIso) {
  return JSON.stringify({ app: 'somatic-os', exportedAt: nowIso, data }, null, 2);
}

/** Parse a file made by exportText. Throws if it is not one. */
export function parseImport(text) {
  const obj = JSON.parse(text);
  const raw = isObj(obj) && obj.app === 'somatic-os' ? obj.data : obj;
  if (!isObj(raw) || raw.v !== 1 || !isObj(raw.days)) throw new Error('format');
  return normalize(raw);
}
