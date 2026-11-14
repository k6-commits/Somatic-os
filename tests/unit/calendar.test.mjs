import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  REMINDER_TIMES, STATIC_DTSTAMP, STATIC_START_DAY, escapeText, floating, foldLine, googleCalendarUrl, reminderIcs, timeSlug,
} from '../../app/js/calendar.js';

const ics = reminderIcs({ time: '07:30', startDay: '2026-11-15', dtstamp: STATIC_DTSTAMP });
const unfold = (text) => text.replace(/\r\n /g, '');

test('text values are escaped', () => {
  assert.equal(escapeText('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne');
  assert.equal(escapeText('まず、からだから。'), 'まず、からだから。');
});

test('long lines fold at 75 bytes without splitting a character', () => {
  const line = `DESCRIPTION:${'あ'.repeat(60)}`;
  const folded = foldLine(line);
  for (const part of folded.split('\r\n')) assert.ok(new TextEncoder().encode(part).length <= 75, part);
  assert.equal(folded.replace(/\r\n /g, ''), line);
  assert.equal(foldLine('SHORT:ok'), 'SHORT:ok');
});

test('the event repeats daily at a floating local time, with an alert at its start', () => {
  assert.ok(ics.endsWith('\r\n'));
  assert.ok(!/[^\r]\n/.test(ics), 'every line ends with CRLF');
  const text = unfold(ics);
  assert.match(text, /\r\nDTSTART:20261115T073000\r\n/);
  assert.match(text, /\r\nDTEND:20261115T073500\r\n/);
  assert.match(text, /\r\nRRULE:FREQ=DAILY\r\n/);
  assert.match(text, /\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\n/);
  assert.match(text, /\r\nTRIGGER:PT0M\r\n/);
  assert.match(text, /\r\nUID:somatic-os-checkin-0730@k6-commits.github.io\r\n/);
  assert.match(text, /\r\nURL:https:\/\/k6-commits.github.io\/Somatic-os\/\r\n/);
  assert.ok(!/DTSTART:[0-9T]+Z/.test(text), 'no UTC time, so it follows the phone');
  for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, line);
});

test('date-times roll over midnight', () => {
  assert.equal(floating('2026-12-31', '23:58', 5), '20270101T000300');
});

test('ready-made files match the generator', () => {
  for (const time of REMINDER_TIMES) {
    const file = readFileSync(new URL(`../../app/reminders/checkin-${timeSlug(time)}.ics`, import.meta.url), 'utf8');
    assert.equal(file, reminderIcs({ time, startDay: STATIC_START_DAY, dtstamp: STATIC_DTSTAMP }), `run: node scripts/make-reminders.mjs (${time})`);
  }
});

test('Google Calendar link carries the same daily event', () => {
  const url = new URL(googleCalendarUrl({ time: '06:30', startDay: '2026-11-15' }));
  assert.equal(url.origin, 'https://calendar.google.com');
  assert.equal(url.searchParams.get('action'), 'TEMPLATE');
  assert.equal(url.searchParams.get('dates'), '20261115T063000/20261115T063500');
  assert.equal(url.searchParams.get('recur'), 'RRULE:FREQ=DAILY');
  assert.match(url.searchParams.get('text'), /朝のチェックイン/);
});
