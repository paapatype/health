/* views/me.js — progress, the record, settings, backup, and the tracker.

   The tracker keeps its OWN localStorage key, its own export, and a neutral
   label. It is never part of the main backup and never rendered on Today or in
   Food. That separation is a requirement, not a preference — see README. */

import { data, currentPhase, weekNumber, daysToTarget, isoDate, timelineFor } from '../data.js';
import { load, update, exportJSON, importJSON, storageEstimate } from '../store.js';
import { completeness, weekSummary, logWeight, getRecord } from '../day.js';
import { icons, mountNav, refresh } from '../app.js';
import { h, esc, sheet, closeSheet, toast, buzz } from '../ui.js';
import { downloadICS, requestPermission } from '../notify.js';

/* ---- tracker: separate key, separate export, never in the main backup ---- */
const TRACK_KEY = 'healthos.track.v1';

function trackLoad() {
  try { return JSON.parse(localStorage.getItem(TRACK_KEY)) ?? { plan: null, days: {} }; }
  catch { return { plan: null, days: {} }; }
}
function trackSave(t) { localStorage.setItem(TRACK_KEY, JSON.stringify(t)); }

export async function render(el, { sub } = {}) {
  if (sub === 'record') return renderRecord(el);
  if (sub === 'settings') return renderSettings(el);
  if (sub === 'track') return renderTracker(el);

  const now = new Date();
  const phase = currentPhase(now);
  const wk = weekNumber(now);

  el.appendChild(h(`
    <h1 class="large-title">Me
      <span class="subtitle">${daysToTarget(now)} days to 5 December</span>
    </h1>`));
  mountNav('Me');

  renderProgress(el, now, phase, wk);
  renderDecision(el, now, wk);

  el.appendChild(h(`<section class="section">
    <div class="list">
      <a class="row" href="#/me/record">
        <div class="content"><div class="title">The record</div>
          <div class="detail">Every day so far, and how the week went</div></div>
        <div class="trailing">${icons.chevron}</div></a>
      <a class="row" href="#/me/track">
        <div class="content"><div class="title">Tracker</div>
          <div class="detail">Private · stays on this phone, never in a backup</div></div>
        <div class="trailing">${icons.chevron}</div></a>
      <a class="row" href="#/me/settings">
        <div class="content"><div class="title">Settings &amp; backup</div>
          <div class="detail">Times, export, import</div></div>
        <div class="trailing">${icons.chevron}</div></a>
    </div>
  </section>`));
}

/* ---------------- progress ---------------- */

function renderProgress(el, now, phase, wk) {
  const st = load();
  const weights = Object.entries(st.weights ?? {}).sort();
  const latest = weights.length ? weights[weights.length - 1] : null;
  const first = weights.length ? weights[0] : null;
  const delta = latest && first && latest[0] !== first[0]
    ? (latest[1] - first[1]).toFixed(1) : null;

  const section = h(`<section class="section">
    <div class="section-header">Where you are</div>
    <div class="list">
      <button class="row" id="weight-row">
        <div class="content">
          <div class="title">Weight</div>
          <div class="detail">${latest
            ? `${latest[1]} kg · logged ${esc(latest[0])}${delta ? ` · ${delta > 0 ? '+' : ''}${delta} kg since ${esc(first[0])}` : ''}`
            : 'Not logged yet — tap to add'}</div>
        </div>
        <div class="trailing">${icons.chevron}</div>
      </button>
      <div class="row static">
        <div class="content"><div class="title">Phase</div>
          <div class="detail">${esc(phase.name)} · weeks ${esc(phase.weeks)}${wk ? ` · week ${wk}` : ' · soft start'}</div></div>
      </div>
    </div>
  </section>`);
  section.querySelector('#weight-row').addEventListener('click', () => openWeightSheet(now));
  el.appendChild(section);
}

function openWeightSheet(now) {
  const cur = getRecord(now)?.weight_kg ?? '';
  const panel = sheet(`
    <div class="sheet-title">Log weight</div>
    <div class="sheet-body">
      <p class="sheet-note">Same time of day each time — first thing, after the bathroom, before food.</p>
      <input id="w-input" type="number" inputmode="decimal" step="0.1" min="30" max="250"
             value="${cur}" placeholder="kg"
             style="width:100%;font:var(--type-title1);text-align:center;padding:var(--space-4);
                    border:none;border-radius:var(--radius-card);background:var(--fill-tertiary);
                    color:var(--label);margin-bottom:var(--space-4);">
      <button class="btn btn-filled" id="w-save">Save</button>
    </div>`);
  const input = panel.querySelector('#w-input');
  setTimeout(() => input.focus(), 300);
  panel.querySelector('#w-save').addEventListener('click', () => {
    const v = parseFloat(input.value);
    if (!Number.isFinite(v) || v < 30 || v > 250) { toast('That does not look like a weight'); return; }
    logWeight(now, v);
    buzz(); closeSheet(); toast(`${v} kg logged`);
    setTimeout(refresh, 340);
  });
}

/* ---------------- the week 6 decision ---------------- */

function renderDecision(el, now, wk) {
  const dps = data.plan.decision_points ?? [];
  const st = load();
  const today = isoDate(now);
  for (const dp of dps) {
    if (st.decisions?.[dp.id]) continue;
    if (today < dp.date) {
      if (wk && wk >= 4) {
        el.appendChild(h(`<section class="section">
          <div class="section-header">Coming up</div>
          <div class="list"><div class="row static"><div class="content">
            <div class="title">${esc(dp.title)}</div>
            <div class="detail">Due ${esc(dp.date)}</div></div></div></div>
        </section>`));
      }
      continue;
    }
    const section = h(`<section class="section">
      <div class="section-header">Decision due</div>
      <div class="list"><button class="row" id="dp-${esc(dp.id)}">
        <div class="content"><div class="title">${esc(dp.title)}</div>
          <div class="detail">${esc((dp.body ?? '').slice(0, 120))}…</div></div>
        <div class="trailing">${icons.chevron}</div>
      </button></div>
    </section>`);
    section.querySelector('button').addEventListener('click', () => {
      const opts = (dp.options ?? []).map(o => `
        <button class="row" data-choice="${esc(o.id ?? o)}">
          <div class="content"><div class="title">${esc(o.label ?? o)}</div>
            ${o.detail ? `<div class="detail">${esc(o.detail)}</div>` : ''}</div>
          <div class="trailing">${icons.chevron}</div>
        </button>`).join('');
      const p = sheet(`
        <div class="sheet-title">${esc(dp.title)}</div>
        <div class="sheet-body">
          <p class="sheet-lede">${esc(dp.body ?? '')}</p>
          ${opts ? `<div class="list">${opts}</div>` : ''}
        </div>`);
      p.querySelectorAll('[data-choice]').forEach(b => b.addEventListener('click', () => {
        update(s => { s.decisions = s.decisions ?? {}; s.decisions[dp.id] = b.dataset.choice; });
        closeSheet(); toast('Noted'); setTimeout(refresh, 340);
      }));
    });
    el.appendChild(section);
  }
}

/* ---------------- the record ---------------- */

function renderRecord(el) {
  el.appendChild(h(`
    <h1 class="large-title">The record
      <span class="subtitle">Tap a day to see what it held</span>
    </h1>`));
  mountNav('The record');

  const st = load();
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;            // Monday-first grid

  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<div class="cal-cell empty-cell"></div>';
  for (let d = 1; d <= days; d++) {
    const key = isoDate(new Date(year, month, d));
    const rec = st.records[key];
    const c = completeness(rec);
    const pct = c == null ? 0 : Math.round(c * 100);
    const cls = c == null ? 'none' : pct >= 80 ? 'high' : pct >= 40 ? 'mid' : 'low';
    cells += `<button class="cal-cell ${cls}" data-date="${key}"
                 aria-label="${key}${c != null ? `, ${pct}% complete` : ''}">
                <span>${d}</span>${rec?.backfilled ? '<i class="bf"></i>' : ''}</button>`;
  }

  const section = h(`<section class="section">
    <div class="section-header">${first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div>
    <div class="cal-head"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
    <div class="cal-grid">${cells}</div>
    <div class="section-footer">A dot in the corner means the day was filled in later.</div>
  </section>`);
  section.querySelectorAll('[data-date]').forEach(b =>
    b.addEventListener('click', () => openDaySheet(b.dataset.date)));
  el.appendChild(section);

  renderWeek(el, now);
}

function openDaySheet(key) {
  const rec = load().records[key];
  if (!rec) {
    sheet(`<div class="sheet-title">${esc(key)}</div>
      <div class="sheet-body"><p class="sheet-note">Nothing recorded.</p></div>`);
    return;
  }
  const yes = v => v === true ? '<span class="chip verified">done</span>'
              : v === null ? '<span class="chip">n/a</span>'
              : '<span class="chip estimated">—</span>';
  const line = (label, v) => `<div class="row static"><div class="content"><div class="title">${label}</div></div>
    <div class="trailing">${yes(v)}</div></div>`;

  sheet(`
    <div class="sheet-title">${esc(key)}${rec.backfilled ? ' · filled in later' : ''}</div>
    <div class="sheet-body">
      <p class="sheet-lede">${Math.round((completeness(rec) ?? 0) * 100)}% · water ${rec.water_bottles}/${rec.water_target}${rec.weight_kg ? ` · ${rec.weight_kg} kg` : ''}</p>
      <div class="list">
        ${Object.entries(rec.meals).map(([k, v]) => line(k[0].toUpperCase() + k.slice(1), v)).join('')}
        ${line('Workout', rec.workout.done)}
        ${Object.entries(rec.skincare).map(([k, v]) => line('Skincare ' + k.toUpperCase(), v)).join('')}
      </div>
      ${rec.ingredients_missing?.length
        ? `<div class="section-footer">Missing that day: ${esc(rec.ingredients_missing.join(', '))}</div>` : ''}
    </div>`);
}

function renderWeek(el, now) {
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const s = weekSummary(isoDate(monday));
  const pct = s.avgCompleteness == null ? '—' : Math.round(s.avgCompleteness * 100) + '%';
  const wDelta = s.weightStart != null && s.weightEnd != null
    ? `${(s.weightEnd - s.weightStart).toFixed(1)} kg` : '—';

  el.appendChild(h(`<section class="section">
    <div class="section-header">This week</div>
    <div class="list">
      <div class="row static"><div class="content"><div class="title">Sessions</div></div>
        <div class="trailing">${s.workoutsDone} of ${s.workoutsPlanned}</div></div>
      <div class="row static"><div class="content"><div class="title">Average day</div></div>
        <div class="trailing">${pct}</div></div>
      <div class="row static"><div class="content"><div class="title">Weight change</div></div>
        <div class="trailing">${wDelta}</div></div>
    </div>
  </section>`));
}

/* ---------------- settings ---------------- */

function renderSettings(el) {
  el.appendChild(h(`
    <h1 class="large-title">Settings
      <span class="subtitle">Times, backup, storage</span>
    </h1>`));
  mountNav('Settings');

  const st = load();
  const items = timelineFor(new Date(), st.settings).filter(i => i.time);
  const rows = items.map(i => `
    <div class="row static">
      <div class="content"><div class="title">${esc(i.label)}</div></div>
      <div class="trailing"><input type="time" value="${esc(st.settings.times?.[i.id] ?? i.time)}"
        data-time="${esc(i.id)}" style="font:var(--type-body);color:var(--label);background:var(--fill-tertiary);
        border:none;border-radius:var(--radius-pill);padding:0.25rem 0.5rem;min-height:var(--hit-target);"></div>
    </div>`).join('');

  const timeSection = h(`<section class="section">
    <div class="section-header">Today's times</div>
    <div class="list">${rows}</div>
    <div class="section-footer">Change one and the timeline moves with it. Re-export the calendar afterwards so the alarms match.</div>
  </section>`);
  timeSection.querySelectorAll('[data-time]').forEach(inp => {
    inp.addEventListener('change', () => {
      update(s => { s.settings.times = s.settings.times ?? {}; s.settings.times[inp.dataset.time] = inp.value; });
      toast('Time updated');
    });
  });
  el.appendChild(timeSection);

  /* Two mechanisms, because they do different jobs. The calendar covers the
     day's granular reminders — a banner is enough for "eat now". The two
     anchors need you *in* the app, and tapping a Calendar alert opens Calendar,
     not the app, so those are Shortcuts automations instead. */
  const notif = h(`<section class="section">
    <div class="section-header">Reminders</div>
    <div class="list">
      <button class="row" id="ics-btn">
        <div class="content"><div class="title">Add the day to your calendar</div>
          <div class="detail">Meals, supplements, skincare and water as repeating alarms</div></div>
        <div class="trailing">${icons.chevron}</div></button>
      <button class="row" id="shortcut-btn">
        <div class="content"><div class="title">The two that open the app</div>
          <div class="detail">06:00 ingredient check · 21:30 close-out</div></div>
        <div class="trailing">${icons.chevron}</div></button>
      <button class="row" id="perm-btn">
        <div class="content"><div class="title">Allow notifications</div>
          <div class="detail">Only fires while the app is open — the calendar does the rest</div></div>
        <div class="trailing">${icons.chevron}</div></button>
    </div>
    <div class="section-footer">Re-export the calendar after you change a time, or the alarms will be wrong.</div>
  </section>`);

  notif.querySelector('#ics-btn').addEventListener('click', () => {
    downloadICS(location.href.split('#')[0]);
    toast('Calendar file saved — open it to import');
  });
  notif.querySelector('#shortcut-btn').addEventListener('click', () => openShortcutSheet());
  notif.querySelector('#perm-btn').addEventListener('click', async () => {
    const r = await requestPermission();
    toast(r === 'granted' ? 'Notifications on' : r === 'denied' ? 'Denied — change it in Settings' : String(r));
  });
  el.appendChild(notif);

  const backup = h(`<section class="section">
    <div class="section-header">Backup</div>
    <div class="list">
      <button class="row" id="export-btn">
        <div class="content"><div class="title">Export everything</div>
          <div class="detail">A JSON file — your only backup</div></div>
        <div class="trailing">${icons.chevron}</div></button>
      <button class="row" id="import-btn">
        <div class="content"><div class="title">Import a backup</div>
          <div class="detail">Replaces what's on this phone</div></div>
        <div class="trailing">${icons.chevron}</div></button>
    </div>
    <div class="section-footer" id="storage-note">Nothing ever leaves this device. Clearing your browser data deletes it — export sometimes.</div>
  </section>`);

  backup.querySelector('#export-btn').addEventListener('click', () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `healthos-${isoDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Exported');
  });
  backup.querySelector('#import-btn').addEventListener('click', () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json';
    inp.addEventListener('change', async () => {
      const f = inp.files?.[0]; if (!f) return;
      try {
        const r = importJSON(await f.text());
        toast(`Imported ${r.records} days`);
        setTimeout(() => location.reload(), 900);
      } catch (e) { toast(e.message); }
    });
    inp.click();
  });
  el.appendChild(backup);

  storageEstimate().then(est => {
    if (!est) return;
    const mb = (est.usage / 1048576).toFixed(1);
    const note = document.getElementById('storage-note');
    if (note) note.textContent = `Using ${mb} MB on this device. Nothing ever leaves it — clearing browser data deletes it, so export sometimes.`;
  });
}

function openShortcutSheet() {
  const base = location.href.split('#')[0];
  const step = (n, t) => `<div class="row static"><div class="content">
    <div class="title">${n}</div><div class="detail">${esc(t)}</div></div></div>`;
  sheet(`
    <div class="sheet-title">Two automations</div>
    <div class="sheet-body">
      <p class="sheet-note">A calendar alert opens Calendar, not this app. For the two moments where you need to actually be <em>in</em> here, an iOS Shortcuts automation opens it directly — no tap needed.</p>
      <div class="section-header">In Shortcuts → Automation → +</div>
      <div class="list">
        ${step('1', 'Time of Day → 06:00 → Daily')}
        ${step('2', 'New Blank Automation → add action “Open URLs”')}
        ${step('3', `Paste ${base}#/today/check`)}
        ${step('4', 'Turn OFF “Ask Before Running”, then Done')}
        ${step('5', `Repeat for 21:30 with ${base}#/today/closeout`)}
      </div>
      <div class="section-footer">Check the first one fires tomorrow morning before trusting it.</div>
    </div>`);
}

/* ---------------- tracker (private, separate key) ---------------- */

function renderTracker(el) {
  el.appendChild(h(`
    <h1 class="large-title">Tracker
      <span class="subtitle">Private · this phone only</span>
    </h1>`));
  mountNav('Tracker');

  const t = trackLoad();
  const today = isoDate(new Date());

  if (!t.plan) {
    const setup = h(`<section class="section">
      <div class="section-header">Set it up</div>
      <div class="list"><div class="row static"><div class="content">
        <div class="detail" style="color:var(--label)">Nothing is stored here until you enter it, and none of it ships with the app or appears in a backup. Enter the weekly step-down, one number per week, comma separated.</div>
      </div></div></div>
      <div style="padding:var(--space-4);">
        <input id="t-plan" type="text" inputmode="numeric" placeholder="e.g. 8,8,6,6,4,4,2,0"
          style="width:100%;font:var(--type-body);padding:var(--space-3);border:none;
                 border-radius:var(--radius-card);background:var(--fill-tertiary);color:var(--label);
                 margin-bottom:var(--space-3);min-height:var(--hit-target);">
        <button class="btn btn-filled" id="t-save">Save</button>
      </div>
    </section>`);
    setup.querySelector('#t-save').addEventListener('click', () => {
      const nums = setup.querySelector('#t-plan').value.split(',')
        .map(s => parseInt(s.trim(), 10)).filter(Number.isFinite);
      if (!nums.length) { toast('Enter numbers separated by commas'); return; }
      trackSave({ plan: nums, startedOn: today, days: {} });
      buzz(); refresh();
    });
    el.appendChild(setup);
    return;
  }

  const start = new Date(t.startedOn + 'T00:00:00');
  const weekIdx = Math.max(0, Math.floor((new Date(today + 'T00:00:00') - start) / 604800000));
  const cap = t.plan[Math.min(weekIdx, t.plan.length - 1)];
  const count = t.days[today] ?? 0;

  const section = h(`<section class="section">
    <div class="section-header">Today</div>
    <div class="list">
      <div class="row static">
        <div class="content"><div class="title">${count} of ${cap}</div>
          <div class="detail">Week ${weekIdx + 1} of ${t.plan.length}</div></div>
        <div class="trailing">
          <button class="btn-round" id="t-minus" aria-label="minus">−</button>
          <button class="btn-round" id="t-plus" aria-label="plus">+</button>
        </div>
      </div>
    </div>
    <div class="section-footer">${count > cap ? 'Over today’s number. Tomorrow is a new day — no scolding here.' : 'Under. Good.'}</div>
  </section>`);
  const bump = d => {
    const st = trackLoad();
    st.days[today] = Math.max(0, (st.days[today] ?? 0) + d);
    trackSave(st); buzz(); refresh();
  };
  section.querySelector('#t-plus').addEventListener('click', () => bump(1));
  section.querySelector('#t-minus').addEventListener('click', () => bump(-1));
  el.appendChild(section);

  const recent = Object.entries(t.days).sort().slice(-14).reverse().map(([d, n]) => `
    <div class="row static"><div class="content"><div class="title">${esc(d)}</div></div>
      <div class="trailing">${n}</div></div>`).join('');
  if (recent) {
    el.appendChild(h(`<section class="section">
      <div class="section-header">Last two weeks</div>
      <div class="list">${recent}</div>
    </section>`));
  }

  const reset = h(`<div style="padding:0 var(--space-4) var(--space-6);">
    <button class="btn btn-tinted" id="t-export">Export this separately</button></div>`);
  reset.querySelector('#t-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(trackLoad(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tracker-${today}.json`;
    a.click(); URL.revokeObjectURL(a.href);
    toast('Exported separately');
  });
  el.appendChild(reset);
}
