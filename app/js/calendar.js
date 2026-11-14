// A morning check-in reminder as a calendar event. The app has no server, so it cannot send
// notifications itself; instead the phone's calendar app shows the alert every morning.
// Times are "floating" (no time zone), so the event stays at the same clock time wherever
// the phone is.

export const REMINDER_TIMES = ['06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00'];
export const DEFAULT_REMINDER = '07:30';
export const SITE_URL = 'https://k6-commits.github.io/Somatic-os/';

// The ready-made files in app/reminders/ are generated with these, by scripts/make-reminders.mjs.
export const STATIC_START_DAY = '2026-11-15';
export const STATIC_DTSTAMP = '20261114T000000Z';

const SUMMARY = '朝のチェックイン（Somatic OS）';
const DESCRIPTION = 'まず、からだから。睡眠・気分・疲れを入れて、きょうの日を選びます。';
const LENGTH_MIN = 5;

/** '07:30' → '0730', used in file names and event ids. */
export const timeSlug = (time) => time.replace(':', '');

/** '07:30' → '7:30' for display. */
export const timeLabel = (time) => time.replace(/^0/, '');

/** Escapes a TEXT value (RFC 5545, 3.3.11). */
export function escapeText(text) {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Folds a content line into lines of at most 75 bytes (RFC 5545, 3.1), never inside a character. */
export function foldLine(line) {
  const encoder = new TextEncoder();
  const out = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (bytes + size > 75) {
      out.push(current);
      current = ` ${ch}`;
      bytes = 1 + size;
    } else {
      current += ch;
      bytes += size;
    }
  }
  out.push(current);
  return out.join('\r\n');
}

/** 'YYYY-MM-DD' + 'HH:MM' (+ minutes) → '20261115T073000', a floating local date-time. */
export function floating(day, time, plusMinutes = 0) {
  const [y, m, d] = day.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, hh, mm + plusMinutes));
  const p = (n) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}${p(t.getUTCMonth() + 1)}${p(t.getUTCDate())}T${p(t.getUTCHours())}${p(t.getUTCMinutes())}00`;
}

/** An .ics file with one daily 5-minute event that alerts at its start. */
export function reminderIcs({ time, startDay, dtstamp, url = SITE_URL }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Somatic OS//Morning reminder//JA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:somatic-os-checkin-${timeSlug(time)}@k6-commits.github.io`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${floating(startDay, time)}`,
    `DTEND:${floating(startDay, time, LENGTH_MIN)}`,
    'RRULE:FREQ=DAILY',
    `SUMMARY:${escapeText(SUMMARY)}`,
    `DESCRIPTION:${escapeText(`${DESCRIPTION}\n${url}`)}`,
    `URL:${url}`,
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(SUMMARY)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

/** A link that opens Google Calendar with the same daily event filled in. */
export function googleCalendarUrl({ time, startDay, url = SITE_URL }) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: SUMMARY,
    details: `${DESCRIPTION}\n${url}`,
    dates: `${floating(startDay, time)}/${floating(startDay, time, LENGTH_MIN)}`,
    recur: 'RRULE:FREQ=DAILY',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
