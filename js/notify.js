/* notify.js — ICS calendar generation + in-app Notification API.
   Honest scope (see README): the ICS import is the reliable OS-level path
   on iOS without a server; the Notification API only fires while the app
   is open; the two anchor moments use Shortcuts automations instead. */

import { load } from './store.js';
import { data, timelineFor } from './data.js';

const TZID = 'Asia/Kolkata';

/* BYDAY per item: meals/care daily; workout rows are per-day so the ICS
   uses the training-day pattern; bedtime snack only on training nights. */
function bydayFor(item, trainingDays) {
  const map = { mon: 'MO', tue: 'TU', wed: 'WE', thu: 'TH', fri: 'FR', sat: 'SA', sun: 'SU' };
  if (item.training_only || item.category === 'workout') {
    return trainingDays.map(d => map[d]).join(',');
  }
  return 'MO,TU,WE,TH,FR,SA,SU';
}

function icsEscape(s) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function vevent({ uid, title, detail, time, byday, url, alarmMin = 0 }) {
  const [h, m] = time.split(':');
  // First occurrence: next Monday from a fixed anchor keeps DTSTART stable.
  const dtstart = `20260810T${h}${m}00`;
  return [
    'BEGIN:VEVENT',
    `UID:${uid}@healthos`,
    `DTSTAMP:20260808T000000Z`,
    `DTSTART;TZID=${TZID}:${dtstart}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${byday}`,
    `SUMMARY:${icsEscape(title)}`,
    detail ? `DESCRIPTION:${icsEscape(detail)}` : null,
    url ? `URL:${url}` : null,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEscape(title)}`,
    `TRIGGER:-PT${alarmMin}M`,
    'END:VALARM',
    'END:VEVENT'
  ].filter(Boolean).join('\r\n');
}

const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${TZID}`,
  'BEGIN:STANDARD',
  'DTSTART:19700101T000000',
  'TZOFFSETFROM:+0530',
  'TZOFFSETTO:+0530',
  'TZNAME:IST',
  'END:STANDARD',
  'END:VTIMEZONE'
].join('\r\n');

/* The main calendar: meals, water checkpoints, supplements, skincare.
   Anchors (morning check, close-out) are Shortcuts automations, not ICS —
   tapping a Calendar alert opens Calendar, not the app. Excluded here. */
export function buildICS(appURL) {
  const s = load().settings;
  const trainingDays = s.trainingDays ?? data.plan.training_days_default;
  const sched = data.plan.schedule.training_day
    .filter(i => data.plan.schedule && i.category !== 'anchor' && i.id !== 'wake' && i.id !== 'sleep');

  const events = sched.map(item => {
    const time = s.times?.[item.id] ?? item.time;
    return vevent({
      uid: `healthos-${item.id}`,
      title: item.label,
      detail: item.detail ?? '',
      time,
      byday: bydayFor(item, trainingDays),
      url: item.deep_link ? `${appURL}${item.deep_link}` : appURL,
      alarmMin: 0
    });
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//healthos//EN',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Daily Plan',
    VTIMEZONE,
    ...events,
    'END:VCALENDAR'
  ].join('\r\n');
}

export function downloadICS(appURL) {
  const blob = new Blob([buildICS(appURL)], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'daily-plan.ics';
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---- in-app alerts (only while the app is open — stated honestly) ---- */

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

let timer = null;

/* "Next up" — recomputed each minute while the app is open. */
export function nextUp(d = new Date()) {
  const items = timelineFor(d, load().settings);
  const now = d.toTimeString().slice(0, 5);
  return items.find(i => i.time > now) ?? null;
}

export function startTicker(onTick) {
  stopTicker();
  const fire = () => onTick(nextUp());
  fire();
  timer = setInterval(fire, 60000);
}

export function stopTicker() {
  if (timer) clearInterval(timer);
  timer = null;
}
