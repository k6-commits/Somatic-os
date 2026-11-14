import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY, addPause, addWalk, checkIn, emptyData, exportText, lastCheckInBefore, load, parseImport,
  removeWalk, save, saveLine, saveWeekly, setDone, setMode,
} from '../../app/js/store.js';

const T = '2026-11-09T07:42:00.000Z';

function memoryStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), keys: () => [...m.keys()] };
}

test('actions never change the data they are given', () => {
  const a = emptyData();
  const frozen = JSON.stringify(a);
  checkIn(a, '2026-11-09', { mode: 'tune', sleep: '6〜7', mood: 3, fatigue: 2 }, T);
  assert.equal(JSON.stringify(a), frozen);
});

test('check-in records the body, marks m4 and starts the walking plan', () => {
  const d = checkIn(emptyData(), '2026-11-11', { mode: 'rest', sleep: '〜5', mood: 2, fatigue: 4 }, T);
  const day = d.days['2026-11-11'];
  assert.equal(day.mode, 'rest');
  assert.equal(day.sleep, '〜5');
  assert.equal(day.done.m4, T);
  assert.equal(d.settings.startDay, '2026-11-11');
  assert.equal(d.settings.walkPlanStart, '2026-11-09');
});

test('a gap of 3+ days is noted, and 7+ days restarts the walking plan', () => {
  let d = checkIn(emptyData(), '2026-10-05', { mode: 'tune' }, T);
  d = checkIn(d, '2026-10-09', { mode: 'tune' }, T);
  assert.equal(d.days['2026-10-09'].gap, 4);
  assert.equal(d.settings.walkPlanStart, '2026-10-05');
  d = checkIn(d, '2026-10-20', { mode: 'tune' }, T);
  assert.equal(d.days['2026-10-20'].gap, 11);
  assert.equal(d.settings.walkPlanStart, '2026-10-19');
  assert.equal(lastCheckInBefore(d, '2026-10-20'), '2026-10-09');
});

test('editing a check-in keeps the first check-in time', () => {
  let d = checkIn(emptyData(), '2026-11-09', { mode: 'tune', mood: 3 }, T);
  d = checkIn(d, '2026-11-09', { mode: 'tune', mood: 4 }, '2026-11-09T09:00:00.000Z');
  assert.equal(d.days['2026-11-09'].checkedInAt, T);
  assert.equal(d.days['2026-11-09'].mood, 4);
});

test('done items toggle, lines and walks are stored', () => {
  let d = checkIn(emptyData(), '2026-11-09', { mode: 'tune' }, T);
  d = setDone(d, '2026-11-09', 'd1', true, T);
  d = setDone(d, '2026-11-09', 'd1', true, '2026-11-09T09:00:00.000Z');
  assert.equal(d.days['2026-11-09'].done.d1, T, 'first time is kept');
  d = setDone(d, '2026-11-09', 'd1', false, T);
  assert.equal(d.days['2026-11-09'].done.d1, undefined);
  d = saveLine(d, '2026-11-09', '  洗濯できた  ', T);
  assert.equal(d.days['2026-11-09'].line, '洗濯できた');
  assert.ok(d.days['2026-11-09'].done.n1);
  d = saveLine(d, '2026-11-09', '', T);
  assert.equal(d.days['2026-11-09'].done.n1, undefined);
  d = addWalk(d, '2026-11-09', '15', T);
  d = addWalk(d, '2026-11-09', 0, T);
  d = addWalk(d, '2026-11-09', 'abc', T);
  assert.deepEqual(d.days['2026-11-09'].walks.map((w) => w.min), [15]);
  d = removeWalk(d, '2026-11-09', 0);
  assert.equal(d.days['2026-11-09'].walks.length, 0);
  d = setMode(d, '2026-11-09', 'expand');
  assert.equal(d.days['2026-11-09'].mode, 'expand');
});

test('a pause stores body states and adds its actions to done', () => {
  const d = addPause(emptyData(), '2026-11-09', ['sleepy', 'hungry'], ['eyes', 'eat'], T);
  const day = d.days['2026-11-09'];
  assert.deepEqual(day.pauses[0].body, ['sleepy', 'hungry']);
  assert.deepEqual(day.extra.map((e) => e.label), ['目を閉じて休んだ', '水をのんで、何か食べた']);
  assert.equal(day.checkedInAt, null);
});

test('weekly answers keep a score', () => {
  const d = saveWeekly(emptyData(), '2026-11-09', 2, 1, T);
  assert.deepEqual(d.weekly['2026-11-09'], { q1: 2, q2: 1, score: 3, at: T });
});

test('save and load round-trip; broken data is set aside', () => {
  const s = memoryStorage();
  const d = checkIn(emptyData(), '2026-11-09', { mode: 'tune' }, T);
  assert.equal(save(d, s), true);
  assert.deepEqual(load(s).data, d);
  const broken = memoryStorage({ [STORAGE_KEY]: '{not json' });
  const r = load(broken);
  assert.equal(r.error, 'broken');
  assert.deepEqual(r.data, emptyData());
  assert.ok(broken.keys().some((k) => k.startsWith(`${STORAGE_KEY}:broken:`)));
});

test('load fills in missing fields and drops malformed ones', () => {
  const s = memoryStorage({
    [STORAGE_KEY]: JSON.stringify({ v: 1, settings: { onboarded: true }, days: { '2026-11-09': { mode: 'odd', mood: '3', walks: [{ at: T, min: -5 }, { at: T, min: 10 }] }, bad: {} } }),
  });
  const { data } = load(s);
  assert.equal(data.settings.onboarded, true);
  assert.equal(data.settings.vibrate, true);
  assert.deepEqual(Object.keys(data.days), ['2026-11-09']);
  assert.equal(data.days['2026-11-09'].mode, null);
  assert.equal(data.days['2026-11-09'].mood, null);
  assert.deepEqual(data.days['2026-11-09'].walks, [{ at: T, min: 10 }]);
});

test('a malformed weekly review in an imported file is cleaned up', () => {
  const file = JSON.stringify({
    app: 'somatic-os',
    data: { v: 1, days: {}, reviews: { '2026-11-09': { wins: 'not a list', note: 5, bodies: ['tired', 3], answer: 9, plan: 'p1' } } },
  });
  const r = parseImport(file).reviews['2026-11-09'];
  assert.deepEqual(r.wins, []);
  assert.equal(r.note, '');
  assert.deepEqual(r.bodies, ['tired']);
  assert.equal(r.answer, null);
  assert.equal(r.plan, 'p1');
});

test('export and import round-trip; other files are refused', () => {
  const d = checkIn(emptyData(), '2026-11-09', { mode: 'tune', mood: 3 }, T);
  assert.deepEqual(parseImport(exportText(d, T)), d);
  assert.throws(() => parseImport('{"hello":1}'));
  assert.throws(() => parseImport('not json'));
});

test('reminder settings keep only well-formed values', () => {
  const ok = parseImport(JSON.stringify({ v: 1, days: {}, settings: { reminderTime: '06:30', reminderAddedAt: T, reminderTip: 'dismissed' } }));
  assert.deepEqual([ok.settings.reminderTime, ok.settings.reminderAddedAt, ok.settings.reminderTip], ['06:30', T, 'dismissed']);
  const bad = parseImport(JSON.stringify({ v: 1, days: {}, settings: { reminderTime: '7時', reminderAddedAt: 3, reminderTip: 'maybe' } }));
  assert.deepEqual([bad.settings.reminderTime, bad.settings.reminderAddedAt, bad.settings.reminderTip], [null, null, null]);
});

test('a full-storage failure is reported', () => {
  const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
  assert.equal(save(emptyData(), full), false);
});
