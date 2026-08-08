/* store.js — localStorage persistence. Storage only: no domain logic here.
   Main state lives under ROOT. The tracker in Me keeps its own separate key,
   its own export, and is never part of the main backup (see README: privacy). */

const ROOT = 'healthos.v1';
const SCHEMA_VERSION = 1;

/* ---- migrations ----
   Each entry upgrades state from version n to n+1. When the shape changes,
   bump SCHEMA_VERSION and add a migration. Records from a year of use must
   survive every upgrade. */
const MIGRATIONS = {
  // 1: (state) => { ...; state.version = 2; return state; }
};

function emptyState() {
  return {
    version: SCHEMA_VERSION,
    settings: {
      wake: null,            // null → use plan.json default
      times: {},             // { itemId: "HH:MM" } overrides
      trainingDays: null,    // null → plan.json default
      hydrationBottles: null // null → plan.json default
    },
    records: {},             // { "2026-08-08": DayRecord }
    buyList: [],             // [ { item, platform, addedOn } ]
    staplesOut: [],          // staple ids marked absent (sparse — absence is the exception)
    workoutLog: {},          // { "2026-08-08": { sessionId, sets: {...}, notes } }
    weights: {},             // { "2026-08-08": 82.4 }
    decisions: {}            // { "week6-timeline": "compress-to-dec-5" }
  };
}

function migrate(state) {
  let v = state.version || 1;
  while (v < SCHEMA_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error(`No migration from v${v}`);
    state = step(state);
    v = state.version;
  }
  return state;
}

let cache = null;

export function load() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(ROOT);
    cache = raw ? migrate(JSON.parse(raw)) : emptyState();
  } catch (e) {
    console.error('store: corrupt state, starting fresh (old value preserved at ' + ROOT + '.corrupt)', e);
    const raw = localStorage.getItem(ROOT);
    if (raw) localStorage.setItem(ROOT + '.corrupt', raw);
    cache = emptyState();
  }
  return cache;
}

export function save() {
  if (!cache) return;
  localStorage.setItem(ROOT, JSON.stringify(cache));
}

/* mutate + persist in one step: update(s => { s.records[d] = r; }) */
export function update(fn) {
  const s = load();
  fn(s);
  save();
  return s;
}

/* ---- backup ---- */

export function exportJSON() {
  const s = load();
  return JSON.stringify({ exported_on: new Date().toISOString(), app: 'healthos', ...s }, null, 2);
}

export function importJSON(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Not valid JSON.');
  }
  if (parsed.app !== 'healthos' || typeof parsed.version !== 'number') {
    throw new Error('Not a Health OS backup file.');
  }
  const { exported_on, app, ...state } = parsed;
  cache = migrate(state);
  save();
  return { records: Object.keys(cache.records).length, exported_on };
}

/* ---- storage usage (photos etc. warn against browser-data clearing) ---- */
export async function storageEstimate() {
  if (navigator.storage?.estimate) {
    const { usage, quota } = await navigator.storage.estimate();
    return { usage, quota };
  }
  return null;
}

/* Ask the browser not to evict our data under storage pressure. */
export async function persistStorage() {
  if (navigator.storage?.persist) return navigator.storage.persist();
  return false;
}
