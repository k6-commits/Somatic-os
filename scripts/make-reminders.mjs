// Writes the ready-made reminder files in app/reminders/, one per time in REMINDER_TIMES.
// usage: node scripts/make-reminders.mjs
// A unit test (tests/unit/calendar.test.mjs) fails if the files and this generator drift apart.

import { mkdirSync, writeFileSync } from 'node:fs';
import { REMINDER_TIMES, STATIC_DTSTAMP, STATIC_START_DAY, reminderIcs, timeSlug } from '../app/js/calendar.js';

const dir = new URL('../app/reminders/', import.meta.url);
mkdirSync(dir, { recursive: true });
for (const time of REMINDER_TIMES) {
  const file = new URL(`checkin-${timeSlug(time)}.ics`, dir);
  writeFileSync(file, reminderIcs({ time, startDay: STATIC_START_DAY, dtstamp: STATIC_DTSTAMP }));
  console.log(`wrote app/reminders/checkin-${timeSlug(time)}.ics`);
}
