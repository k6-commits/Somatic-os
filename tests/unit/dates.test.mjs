import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, dayKey, diffDays, isNight, partOfDay, relDay, weekDays, weekStart } from '../../app/js/dates.js';

const at = (y, m, d, h, min = 0) => new Date(y, m - 1, d, h, min);

test('the app day starts at 05:00', () => {
  assert.equal(dayKey(at(2026, 11, 9, 4, 59)), '2026-11-08');
  assert.equal(dayKey(at(2026, 11, 9, 5, 0)), '2026-11-09');
  assert.equal(dayKey(at(2026, 11, 9, 23, 30)), '2026-11-09');
  assert.equal(dayKey(at(2026, 1, 1, 2, 0)), '2025-12-31');
});

test('night is 22:00 to 4:59', () => {
  assert.equal(isNight(at(2026, 11, 9, 21, 59)), false);
  assert.equal(isNight(at(2026, 11, 9, 22, 0)), true);
  assert.equal(isNight(at(2026, 11, 10, 4, 59)), true);
  assert.equal(isNight(at(2026, 11, 10, 5, 0)), false);
});

test('weeks run Monday to Sunday', () => {
  assert.equal(weekStart('2026-11-08'), '2026-11-02'); // Sunday
  assert.equal(weekStart('2026-11-09'), '2026-11-09'); // Monday
  assert.deepEqual(weekDays('2026-11-11'), ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']);
});

test('day arithmetic crosses months and years', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(diffDays('2026-10-26', '2026-11-08'), 13);
  assert.equal(diffDays('2026-11-08', '2026-10-26'), -13);
});

test('menu part follows the time of day', () => {
  assert.equal(partOfDay(at(2026, 11, 9, 7)), 'morning');
  assert.equal(partOfDay(at(2026, 11, 9, 12)), 'day');
  assert.equal(partOfDay(at(2026, 11, 9, 19)), 'night');
  assert.equal(partOfDay(at(2026, 11, 9, 2)), 'night');
});

test('relative day labels', () => {
  assert.equal(relDay('2026-11-09', '2026-11-09'), 'きょう');
  assert.equal(relDay('2026-11-08', '2026-11-09'), 'きのう');
  assert.equal(relDay('2026-11-01', '2026-11-09'), '11月1日');
});
