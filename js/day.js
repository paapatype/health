/* day.js — THE LOOP. Daily record construction, one-tap completion,
   water bottles, close-out, back-fill. Semantics: null = not applicable
   today (e.g. bedtime snack on a rest day); false = skipped. The weekly
   review depends on the difference — never collapse them. */

import { load, update } from './store.js';
import { isoDate, isTrainingDay, sessionFor, hydrationTarget, freshFor } from './data.js';

/* Record skeleton for a date, derived from the plan. */
export function blankRecord(d = new Date()) {
  const s = load().settings;
  const training = isTrainingDay(d, s);
  const session = sessionFor(d, s);
  return {
    date: isoDate(d),
    meals: {
      nuts: false, breakfast: false, lunch: false, snack: false, dinner: false,
      bedtime: training ? false : null
    },
    workout: session
      ? { planned: session.id, done: false, notes: '' }
      : { planned: null, done: null, notes: '' },
    water_bottles: 0,
    water_target: hydrationTarget(d, s),
    supplements: { post: training ? false : null, breakfast: false, pm: false },
    skincare: { am: false, pm: false },
    weight_kg: null,
    ingredients_missing: [],
    ingredients_checked: false,
    closed: false,
    backfilled: false
  };
}

export function getRecord(d = new Date()) {
  const key = isoDate(d);
  return load().records[key] ?? null;
}

export function ensureRecord(d = new Date()) {
  const key = isoDate(d);
  const state = load();
  if (!state.records[key]) update(s => { s.records[key] = blankRecord(d); });
  return load().records[key];
}

/* One tap. path like "meals.breakfast", "skincare.am", "workout.done".
   Toggles false ↔ true; refuses to touch null (not applicable). */
export function toggle(d, path) {
  ensureRecord(d);
  const key = isoDate(d);
  let result = null;
  update(s => {
    const rec = s.records[key];
    const [a, b] = path.split('.');
    const target = b === undefined ? rec : rec[a];
    const field = b === undefined ? a : b;
    if (target[field] === null) return;      // not applicable today
    target[field] = !target[field];
    result = target[field];
  });
  return result;
}

/* Water: tap = +1, capped at target + 2 (overshoot allowed, runaway not). undo = -1. */
export function water(d, delta) {
  ensureRecord(d);
  const key = isoDate(d);
  let count = 0;
  update(s => {
    const rec = s.records[key];
    const cap = (rec.water_target ?? 4) + 2;
    rec.water_bottles = Math.max(0, Math.min(cap, rec.water_bottles + delta));
    count = rec.water_bottles;
  });
  return count;
}

export function logWeight(d, kg) {
  ensureRecord(d);
  const key = isoDate(d);
  update(s => {
    s.records[key].weight_kg = kg;
    s.weights[key] = kg;
  });
}

/* ---- morning check ---- */

export function morningCheck(d = new Date()) {
  ensureRecord(d);
  const rec = getRecord(d);
  return freshFor(d).map(id => ({
    id,
    missing: rec.ingredients_missing.includes(id)
  }));
}

export function markIngredient(d, id, missing) {
  ensureRecord(d);
  const key = isoDate(d);
  update(s => {
    const rec = s.records[key];
    const list = new Set(rec.ingredients_missing);
    missing ? list.add(id) : list.delete(id);
    rec.ingredients_missing = [...list];
    rec.ingredients_checked = true;
    // Buy list: add on missing, remove on have (only if not bought yet today)
    const idx = s.buyList.findIndex(b => b.item === id);
    if (missing && idx === -1) s.buyList.push({ item: id, addedOn: key });
    if (!missing && idx !== -1 && s.buyList[idx].addedOn === key) s.buyList.splice(idx, 1);
  });
}

export function buyList() {
  return load().buyList;
}

export function clearBought(id) {
  update(s => { s.buyList = s.buyList.filter(b => b.item !== id); });
}

/* ---- close-out ---- */

/* Everything still false (not null) — what close-out shows unticked. */
export function openItems(d = new Date()) {
  const rec = ensureRecord(d);
  const open = [];
  for (const [k, v] of Object.entries(rec.meals)) if (v === false) open.push(`meals.${k}`);
  if (rec.workout.done === false) open.push('workout.done');
  for (const [k, v] of Object.entries(rec.supplements)) if (v === false) open.push(`supplements.${k}`);
  for (const [k, v] of Object.entries(rec.skincare)) if (v === false) open.push(`skincare.${k}`);
  return open;
}

export function closeDay(d = new Date(), { allDone = false } = {}) {
  ensureRecord(d);
  const key = isoDate(d);
  update(s => {
    const rec = s.records[key];
    if (allDone) {
      for (const k of Object.keys(rec.meals)) if (rec.meals[k] === false) rec.meals[k] = true;
      if (rec.workout.done === false) rec.workout.done = true;
      for (const k of Object.keys(rec.supplements)) if (rec.supplements[k] === false) rec.supplements[k] = true;
      for (const k of Object.keys(rec.skincare)) if (rec.skincare[k] === false) rec.skincare[k] = true;
      if (rec.water_bottles < rec.water_target) rec.water_bottles = rec.water_target;
    }
    rec.closed = true;
  });
}

/* Back-fill yesterday: same record mechanics, marked, never silently rewritten. */
export function backfill(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  ensureRecord(d);
  update(s => { s.records[dateStr].backfilled = true; });
  return load().records[dateStr];
}

/* ---- the record: month + week summaries ---- */

export function completeness(rec) {
  if (!rec) return null;
  let done = 0, total = 0;
  const count = v => { if (v !== null) { total++; if (v === true) done++; } };
  Object.values(rec.meals).forEach(count);
  count(rec.workout.done);
  Object.values(rec.supplements).forEach(count);
  Object.values(rec.skincare).forEach(count);
  if (rec.water_target) { total++; if (rec.water_bottles >= rec.water_target) done++; }
  return total === 0 ? null : done / total;
}

export function weekSummary(mondayStr) {
  const state = load();
  const days = [];
  const monday = new Date(mondayStr + 'T12:00:00');
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = isoDate(d);
    days.push({ date: key, rec: state.records[key] ?? null });
  }
  const recs = days.map(x => x.rec).filter(Boolean);
  const workoutsPlanned = recs.filter(r => r.workout.planned).length;
  const workoutsDone = recs.filter(r => r.workout.done === true).length;
  const weights = days.map(x => x.rec?.weight_kg).filter(w => w != null);
  return {
    days,
    workoutsDone,
    workoutsPlanned,
    avgCompleteness: recs.length ? recs.reduce((a, r) => a + (completeness(r) ?? 0), 0) / recs.length : null,
    weightStart: weights[0] ?? null,
    weightEnd: weights[weights.length - 1] ?? null
  };
}
