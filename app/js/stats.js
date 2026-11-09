// Read-only views of the data: counts, the walking plan, insights and the summary.

import { addDays, dayKey, diffDays, md, weekDays, weekStart } from './dates.js';
import { DONE_LABEL, SLEEP_LONG, SLEEP_MID, SLEEP_SHORT, WALK_PLAN } from './content.js';

export function mean(values) {
  if (!values.length) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export const fmt1 = (v) => (v === null ? '—' : v.toFixed(1));

/** Newest first. */
const byTimeDesc = (a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0);

/** Days from (today − span + 1) to today, oldest first. */
export function windowKeys(today, span) {
  return Array.from({ length: span }, (_, i) => addDays(today, i - span + 1));
}

/** How many things got done on a day. There is no "out of" — only what was done. */
export function doneCount(day) {
  if (!day) return 0;
  return Object.keys(day.done || {}).length + (day.extra || []).length;
}

export function doneEntries(day, key) {
  if (!day) return [];
  const out = [];
  for (const [id, at] of Object.entries(day.done || {})) {
    const label = id === 'n1' && day.line ? `「${day.line}」` : DONE_LABEL[id] || id;
    out.push({ key, at, id, label });
  }
  for (const e of day.extra || []) out.push({ key, at: e.at, id: 'extra', label: e.label });
  return out.sort(byTimeDesc);
}

export function recentDone(data, today, limit = 8, span = 14) {
  const out = [];
  for (const k of windowKeys(today, span)) out.push(...doneEntries(data.days[k], k));
  return out.sort(byTimeDesc).slice(0, limit);
}

export function week(data, today) {
  const perDay = weekDays(today).map((key) => {
    const day = data.days[key];
    return { key, n: doneCount(day), mode: day ? day.mode : null, isToday: key === today, future: key > today };
  });
  return { total: perDay.reduce((s, d) => s + d.n, 0), perDay };
}

export function walkMinutes(day) {
  return (day && day.walks ? day.walks : []).reduce((s, w) => s + w.min, 0);
}

/** This week's walking minutes and the plan's target for this week. */
export function walkWeek(data, today) {
  const minutes = weekDays(today)
    .filter((k) => k <= today)
    .reduce((s, k) => s + walkMinutes(data.days[k]), 0);
  const start = data.settings.walkPlanStart || weekStart(today);
  const index = Math.max(0, Math.floor(diffDays(start, weekStart(today)) / 7));
  return { minutes, target: WALK_PLAN[Math.min(index, WALK_PLAN.length - 1)], weekNo: index + 1 };
}

export function walkGoalText(w) {
  return w.weekNo <= WALK_PLAN.length ? `${w.weekNo}週目の目安は週${w.target}分` : `目安は週${w.target}分（4週目の量を続ける）`;
}

export function checkInKeys(data) {
  return Object.keys(data.days)
    .filter((k) => data.days[k].checkedInAt)
    .sort();
}

/** The most recent answer to the two weekly questions within `within` days, or null. */
export function latestWeekly(data, today, within = 14) {
  let best = null;
  for (const [weekKey, w] of Object.entries(data.weekly)) {
    if (!w.at) continue;
    const age = diffDays(dayKey(new Date(w.at)), today);
    if (age < 0 || age >= within) continue;
    if (!best || w.at > best.at) best = { weekKey, ...w };
  }
  return best;
}

/** Morning mood after a long night (7h+) versus a short one (under 6h). */
export function sleepMood(data, today, span = 28) {
  const long = [];
  const short = [];
  for (const k of windowKeys(today, span)) {
    const d = data.days[k];
    if (!d || !d.checkedInAt || d.mood === null || !d.sleep) continue;
    if (SLEEP_LONG.includes(d.sleep)) long.push(d.mood);
    else if (SLEEP_SHORT.includes(d.sleep)) short.push(d.mood);
  }
  return { long: { n: long.length, avg: mean(long) }, short: { n: short.length, avg: mean(short) } };
}

/**
 * How often "sleepy" or "tired" came up when つらいとき was opened,
 * next to how often an ordinary morning started tired (4+) or short of sleep.
 */
export function bodyThought(data, today, span = 28) {
  let pauses = 0;
  let pausesBody = 0;
  let mornings = 0;
  let morningsBody = 0;
  for (const k of windowKeys(today, span)) {
    const d = data.days[k];
    if (!d) continue;
    for (const p of d.pauses) {
      pauses += 1;
      if (p.body.includes('sleepy') || p.body.includes('tired')) pausesBody += 1;
    }
    if (d.checkedInAt) {
      mornings += 1;
      if ((d.fatigue !== null && d.fatigue >= 4) || SLEEP_SHORT.includes(d.sleep)) morningsBody += 1;
    }
  }
  return { pauses, pausesBody, mornings, morningsBody };
}

export function summary(data, today, span = 14) {
  const keys = windowKeys(today, span);
  const checked = keys.filter((k) => data.days[k] && data.days[k].checkedInAt).map((k) => data.days[k]);
  const sleeps = checked.map((d) => d.sleep).filter((v) => v && SLEEP_MID[v] !== undefined);
  const moods = checked.map((d) => d.mood).filter((v) => v !== null);
  const fatigues = checked.map((d) => d.fatigue).filter((v) => v !== null);
  const walk = keys.reduce((s, k) => s + walkMinutes(data.days[k]), 0);
  return {
    from: keys[0],
    to: today,
    span,
    checkIns: checked.length,
    sleepAvg: mean(sleeps.map((v) => SLEEP_MID[v])),
    sleepN: sleeps.length,
    sleepUnder5: sleeps.filter((v) => v === '〜5').length,
    moodAvg: mean(moods),
    moodN: moods.length,
    moodLow: moods.filter((v) => v <= 2).length,
    fatigueAvg: mean(fatigues),
    fatigueN: fatigues.length,
    restDays: checked.filter((d) => d.mode === 'rest').length,
    walkWeekly: Math.round(walk / (span / 7)),
    pauses: keys.reduce((s, k) => s + (data.days[k] ? data.days[k].pauses.length : 0), 0),
    weekly: latestWeekly(data, today, span),
  };
}

export function summaryRows(s) {
  return [
    ['記録した日', `${s.checkIns}日`],
    ['睡眠', s.sleepN ? `平均${fmt1(s.sleepAvg)}時間（5時間未満が${s.sleepUnder5}日）` : '記録なし'],
    ['けさの気分（1〜5）', s.moodN ? `平均${fmt1(s.moodAvg)}（2以下が${s.moodLow}日）` : '記録なし'],
    ['からだの疲れ（1〜5）', s.fatigueN ? `平均${fmt1(s.fatigueAvg)}` : '記録なし'],
    ['日曜の2つの質問', s.weekly ? `合計${s.weekly.score}点（3点以上が受診の目安）` : '回答なし'],
    ['まもる日', `${s.restDays}日`],
    ['歩き', `週平均${s.walkWeekly}分`],
    ['つらいときを開いた回数', `${s.pauses}回`],
  ];
}

export function summaryText(s) {
  const lines = [`Somatic OS 記録のまとめ（${md(s.from)}〜${md(s.to)}）`];
  for (const [k, v] of summaryRows(s)) lines.push(`${k}：${v}`);
  lines.push('※ 自分で記録した値です。気分は1が低い・5がよい、疲れは1が元気・5がくたくた。診断ではありません。');
  return lines.join('\n');
}

/** Done things over the last 7 days (today included), for the weekly review. */
export function lastWeekDone(data, today) {
  return windowKeys(today, 7).reduce((s, k) => s + doneCount(data.days[k]), 0);
}

/** For the weekly review: the last 7 days with a higher (4+) versus lower (2 or less) mood. */
export function weekCompare(data, today) {
  const days = windowKeys(today, 7)
    .map((k) => data.days[k])
    .filter((d) => d && d.checkedInAt && d.mood !== null);
  const group = (list) => ({
    n: list.length,
    sleep: mean(list.map((d) => SLEEP_MID[d.sleep]).filter((v) => v !== undefined)),
    walk: list.length ? Math.round(list.reduce((s, d) => s + walkMinutes(d), 0) / list.length) : null,
    social: list.filter((d) => d.done.d4).length,
  });
  return { high: group(days.filter((d) => d.mood >= 4)), low: group(days.filter((d) => d.mood <= 2)) };
}

/** The last 7 days' done things as unique labels, newest first (check-ins left out). */
export function weekWins(data, today) {
  const seen = new Set();
  const out = [];
  const keys = windowKeys(today, 7);
  const entries = keys.flatMap((k) => doneEntries(data.days[k], k)).sort(byTimeDesc);
  for (const e of entries) {
    if (e.id === 'm4' || e.id === 'rv' || seen.has(e.label)) continue;
    seen.add(e.label);
    out.push(e.label);
  }
  return out;
}

/** Body states picked in つらいとき over the last 7 days, with counts. */
export function weekPauseBodies(data, today) {
  const counts = {};
  for (const k of windowKeys(today, 7)) {
    const d = data.days[k];
    if (!d) continue;
    for (const p of d.pauses) for (const b of p.body) counts[b] = (counts[b] || 0) + 1;
  }
  return counts;
}
