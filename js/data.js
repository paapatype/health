/* data.js — loads the /data JSON files once, caches them, and answers
   plan-derived questions (today's menu, timeline, training day, phase).
   Pure derivation from data + date: no user state here (that's store.js). */

const FILES = ['plan', 'menu', 'groceries', 'workouts', 'products', 'supplements'];
const cache = {};

export async function loadAll() {
  await Promise.all(
    FILES.map(async name => {
      if (cache[name]) return;
      const res = await fetch(`./data/${name}.json`);
      if (!res.ok) throw new Error(`data/${name}.json: ${res.status}`);
      cache[name] = await res.json();
    })
  );
  return cache;
}

export const data = cache;

/* ---- date helpers (local time; the app lives on one phone in one zone) ---- */

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function isoDate(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dayKey(d = new Date()) {
  return DAY_KEYS[d.getDay()];
}

/* Programme week number, 1-based from plan.week1_monday. 0 = soft start. */
export function weekNumber(d = new Date()) {
  const start = new Date(cache.plan.week1_monday + 'T00:00:00');
  const diff = Math.floor((d - start) / 86400000);
  return diff < 0 ? 0 : Math.floor(diff / 7) + 1;
}

export function currentPhase(d = new Date()) {
  const iso = isoDate(d);
  return cache.plan.phases.find(p => iso >= p.start && iso <= p.end)
      ?? cache.plan.phases[0];
}

export function isTrainingDay(d = new Date(), settings = {}) {
  const days = settings.trainingDays ?? cache.plan.training_days_default;
  return days.includes(dayKey(d));
}

export function daysToTarget(d = new Date()) {
  const target = new Date(cache.plan.target_date + 'T00:00:00');
  return Math.max(0, Math.ceil((target - d) / 86400000));
}

/* ---- today's derived content ---- */

export function menuFor(d = new Date()) {
  return cache.menu.days[dayKey(d)];
}

/* Perishables today's meals need — the morning check list. */
export function freshFor(d = new Date()) {
  const m = menuFor(d);
  const ids = new Set();
  for (const meal of ['nuts', 'breakfast', 'lunch', 'snack', 'dinner', 'bedtime']) {
    if (m[meal]?.fresh) m[meal].fresh.forEach(i => ids.add(i));
  }
  return [...ids];
}

export function grocery(id) {
  return cache.groceries.items.find(i => i.id === id) ?? null;
}

/* Timeline for a date: plan defaults + user time overrides, rest-day rules applied. */
export function timelineFor(d = new Date(), settings = {}) {
  const sched = cache.plan.schedule;
  const training = isTrainingDay(d, settings);
  const key = dayKey(d);
  let items = sched.training_day.map(i => ({ ...i }));

  if (!training) {
    const rest = sched.rest_day;
    items = items.filter(i => !rest.remove.includes(i.id));
    const wo = rest.workout_override[key];
    items = items.flatMap(i => {
      if (i.id !== 'workout') return [i];
      if (wo === null) return [];                    // Sunday: no session
      if (wo) return [{ ...i, ...wo }];
      return [];                                     // other rest days: none
    });
    if (key === 'sun') items = items.concat(rest.sunday_add.map(i => ({ ...i })));
  }

  for (const item of items) {
    if (settings.times?.[item.id]) item.time = settings.times[item.id];
  }
  items.sort((a, b) => a.time.localeCompare(b.time));
  return items;
}

/* Today's workout session object, or null. */
export function sessionFor(d = new Date(), settings = {}) {
  const phase = currentPhase(d);
  const split = cache.workouts.phases.find(p => p.id === phase.id)?.split_table ?? [];
  const entry = split.find(s => s.day === dayKey(d));
  if (!entry || !entry.session) return null;
  return cache.workouts.sessions.find(s => s.id === entry.session) ?? null;
}

export function exercise(ref) {
  return cache.workouts.exercises.find(e => e.id === ref) ?? null;
}

export function hydrationTarget(d = new Date(), settings = {}) {
  if (settings.hydrationBottles) return settings.hydrationBottles;
  const h = cache.plan.hydration;
  return isTrainingDay(d, settings) ? h.training_bottles : h.base_bottles;
}
