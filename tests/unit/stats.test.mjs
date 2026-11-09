import test from 'node:test';
import assert from 'node:assert/strict';
import { addPause, addWalk, checkIn, emptyData, saveLine, saveWeekly, setDone } from '../../app/js/store.js';
import {
  bodyThought, doneCount, latestWeekly, recentDone, sleepMood, summary, summaryText, walkWeek, week,
  weekCompare, weekPauseBodies, weekWins,
} from '../../app/js/stats.js';
import { addDays } from '../../app/js/dates.js';

// Local time (no offset), so the tests do not depend on the machine's time zone.
const iso = (key, h = 8) => `${key}T${String(h).padStart(2, '0')}:00:00`;

/** 14 days ending Sunday 2026-11-08, alternating long and short nights. */
function twoWeeks() {
  let d = emptyData();
  for (let i = 0; i < 14; i++) {
    const key = addDays('2026-10-26', i);
    const long = i % 2 === 0;
    d = checkIn(d, key, { mode: i === 3 ? 'rest' : 'tune', sleep: long ? '7〜9' : '5〜6', mood: long ? 4 : 2, fatigue: long ? 2 : 4 }, iso(key));
    d = setDone(d, key, 'd1', true, iso(key, 12));
    d = addWalk(d, key, 10, iso(key, 12));
  }
  return d;
}

test('done count has no denominator: it is what was done', () => {
  let d = checkIn(emptyData(), '2026-11-09', { mode: 'tune' }, iso('2026-11-09'));
  d = setDone(d, '2026-11-09', 'm2', true, iso('2026-11-09', 9));
  d = saveLine(d, '2026-11-09', '洗濯', iso('2026-11-09', 21));
  d = addPause(d, '2026-11-09', ['tired'], ['eyes'], iso('2026-11-09', 15));
  assert.equal(doneCount(d.days['2026-11-09']), 4);
  const labels = recentDone(d, '2026-11-09').map((e) => e.label);
  assert.deepEqual(labels, ['「洗濯」', '目を閉じて休んだ', '外の光をあびた', 'チェックインした']);
});

test('week totals run Monday to Sunday and mark future days', () => {
  const d = twoWeeks();
  const w = week(d, '2026-11-08');
  assert.equal(w.perDay.length, 7);
  assert.equal(w.total, 14);
  const mid = week(d, '2026-11-04');
  assert.equal(mid.perDay.filter((x) => x.future).length, 4);
});

test('walking plan: week number and target, restart after a long gap', () => {
  const d = twoWeeks();
  assert.deepEqual(walkWeek(d, '2026-11-08'), { minutes: 70, target: 75, weekNo: 2 });
  assert.deepEqual(walkWeek(d, '2026-11-16'), { minutes: 0, target: 150, weekNo: 4 });
  assert.deepEqual(walkWeek(d, '2026-11-23'), { minutes: 0, target: 150, weekNo: 5 });
  assert.equal(walkWeek(d, '2026-12-14').target, 150);
  const back = checkIn(d, '2026-11-20', { mode: 'tune' }, iso('2026-11-20'));
  assert.equal(walkWeek(back, '2026-11-20').weekNo, 1);
});

test('sleep and mood: long nights versus short nights', () => {
  const sm = sleepMood(twoWeeks(), '2026-11-08');
  assert.deepEqual(sm, { long: { n: 7, avg: 4 }, short: { n: 7, avg: 2 } });
});

test('body and thought: pauses versus ordinary mornings', () => {
  let d = twoWeeks();
  d = addPause(d, '2026-11-02', ['tired'], [], iso('2026-11-02', 15));
  d = addPause(d, '2026-11-03', ['sleepy', 'lonely'], [], iso('2026-11-03', 15));
  d = addPause(d, '2026-11-04', ['lonely'], [], iso('2026-11-04', 15));
  assert.deepEqual(bodyThought(d, '2026-11-08'), { pauses: 3, pausesBody: 2, mornings: 14, morningsBody: 7 });
  assert.deepEqual(weekPauseBodies(d, '2026-11-08'), { tired: 1, sleepy: 1, lonely: 2 });
});

test('the weekly answer counts for 14 days', () => {
  const d = saveWeekly(emptyData(), '2026-11-02', 2, 2, iso('2026-11-08', 9));
  assert.equal(latestWeekly(d, '2026-11-08').score, 4);
  assert.equal(latestWeekly(d, '2026-11-21').score, 4);
  assert.equal(latestWeekly(d, '2026-11-22'), null);
});

test('summary for a doctor', () => {
  let d = twoWeeks();
  d = saveWeekly(d, '2026-11-02', 2, 2, iso('2026-11-08', 9));
  const s = summary(d, '2026-11-08');
  assert.equal(s.from, '2026-10-26');
  assert.equal(s.checkIns, 14);
  assert.equal(s.sleepAvg, 6.75);
  assert.equal(s.sleepUnder5, 0);
  assert.equal(s.moodAvg, 3);
  assert.equal(s.moodLow, 7);
  assert.equal(s.restDays, 1);
  assert.equal(s.walkWeekly, 70);
  assert.equal(s.weekly.score, 4);
  const text = summaryText(s);
  assert.match(text, /10月26日〜11月8日/);
  assert.match(text, /睡眠：平均6\.8時間/);
  assert.match(text, /日曜の2つの質問：合計4点/);
});

test('review helpers: compare days and list wins', () => {
  const d = twoWeeks();
  const c = weekCompare(d, '2026-11-08');
  assert.equal(c.high.n, 3);
  assert.equal(c.low.n, 4);
  assert.equal(c.high.sleep, 8);
  assert.equal(c.low.walk, 10);
  assert.deepEqual(weekWins(d, '2026-11-08'), ['5分外に出た']);
});
