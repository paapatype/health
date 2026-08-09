/* views/train.js — the programme: today's session, the week's split, and every
   exercise with a video you can actually watch mid-set. The rule from the brief
   is that a name alone is useless, so no exercise renders without a link. */

import { data, currentPhase, weekNumber, dayKey, sessionFor, exercise, isoDate } from '../data.js';
import { load, update } from '../store.js';
import { icons, mountNav, refresh } from '../app.js';
import { h, esc, sheet, toast, buzz } from '../ui.js';
import { toggle, getRecord, ensureRecord } from '../day.js';

const DAY_NAMES = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export async function render(el, { sub } = {}) {
  if (sub === 'channels') return renderChannels(el);
  if (sub?.startsWith('s/')) return renderSession(el, sub.slice(2));

  const now = new Date();
  /* Two different phase objects: plan.json carries the dates and the name,
     workouts.json carries the split and the progression rule. Same id. */
  const phase = currentPhase(now);
  const wPhase = data.workouts.phases.find(p => p.id === phase.id) ?? { split_table: [] };
  const wk = weekNumber(now);
  const session = sessionFor(now, load().settings);

  el.appendChild(h(`
    <h1 class="large-title">Train
      <span class="subtitle">${esc(phase.name)} · weeks ${esc(phase.weeks)}${wk ? ` · week ${wk}` : ' · soft start'}</span>
    </h1>`));
  mountNav('Train');

  renderTodaySession(el, now, session);
  renderSplit(el, phase, wPhase, now);
  renderProgression(el, wPhase);
  renderEquipment(el, wk);

  el.appendChild(h(`<section class="section">
    <div class="list">
      <a class="row" href="#/train/channels">
        <div class="content"><div class="title">Channels worth subscribing to</div>
          <div class="detail">${data.workouts.channels.length} channels, by what they're good for</div></div>
        <div class="trailing">${icons.chevron}</div>
      </a>
    </div>
  </section>`));
}

/* ---------------- today ---------------- */

function renderTodaySession(el, now, session) {
  if (!session) {
    el.appendChild(h(`<section class="section">
      <div class="section-header">Today</div>
      <div class="list"><div class="row static">
        <div class="content"><div class="title">Rest day</div>
          <div class="detail">Nothing programmed. Walk if you feel like it.</div></div>
      </div></div>
    </section>`));
    return;
  }
  const rec = getRecord(now);
  const done = rec?.workout?.done === true;
  const section = h(`<section class="section">
    <div class="section-header">Today</div>
    <div class="list">
      <a class="row" href="#/train/s/${esc(session.id)}">
        <div class="content">
          <div class="title">${esc(session.label)}</div>
          <div class="detail">${session.exercises.length} exercises · about ${session.duration_min} min${done ? ' · done' : ''}</div>
        </div>
        <div class="trailing">${done ? '<span class="chip verified">done</span>' : ''}${icons.chevron}</div>
      </a>
    </div>
  </section>`);
  el.appendChild(section);
}

/* ---------------- the week ---------------- */

function renderSplit(el, phase, wPhase, now) {
  const today = dayKey(now);
  const rows = DAY_ORDER.map(dk => {
    const entry = (wPhase.split_table ?? []).find(s => s.day === dk);
    const sess = entry?.session;
    const inner = `
      <div class="content">
        <div class="title">${DAY_NAMES[dk]}${dk === today ? ' · today' : ''}</div>
        <div class="detail">${esc(entry?.label ?? 'Rest')}</div>
      </div>
      <div class="trailing">${sess ? icons.chevron : ''}</div>`;
    return sess
      ? `<a class="row" href="#/train/s/${esc(sess)}">${inner}</a>`
      : `<div class="row static">${inner}</div>`;
  }).join('');

  el.appendChild(h(`<section class="section">
    <div class="section-header">This week — ${esc(phase.name)}</div>
    <div class="list">${rows}</div>
    <div class="section-footer">${esc(wPhase.boundary_note ?? '')}</div>
  </section>`));
}

function renderProgression(el, phase) {
  el.appendChild(h(`<section class="section">
    <div class="section-header">How to progress</div>
    <div class="list"><div class="row static">
      <div class="content"><div class="detail" style="color:var(--label)">${esc(phase.progression_rule)}</div></div>
    </div></div>
  </section>`));
}

/* ---------------- equipment ---------------- */

function renderEquipment(el, wk) {
  const eq = data.workouts.equipment_upgrade;
  if (!eq) return;
  const due = wk >= (eq.decision_week ?? 6) - 1;
  const section = h(`<section class="section">
    <div class="section-header">Equipment</div>
    <div class="list">
      <button class="row" id="eq-row">
        <div class="content">
          <div class="title">${due ? 'Time to upgrade the load' : 'Upgrade due around week ' + eq.decision_week}</div>
          <div class="detail">2.5 kg dumbbells and a 4 kg kettlebell run out of road. Adjustable dumbbells or a gym.</div>
        </div>
        <div class="trailing">${icons.chevron}</div>
      </button>
    </div>
  </section>`);
  section.querySelector('#eq-row').addEventListener('click', () => openEquipmentSheet());
  el.appendChild(section);
}

function openEquipmentSheet() {
  const eq = data.workouts.equipment_upgrade;
  const dbs = (eq.adjustable_db ?? []).map(d => `
    <a class="row" href="${esc(d.url)}" target="_blank" rel="noopener">
      <div class="content"><div class="title">${esc(d.name)}</div>
        <div class="detail">${esc(d.note ?? '')}</div></div>
      <div class="trailing"><span style="font-variant-numeric:tabular-nums">₹${Number(d.price).toLocaleString('en-IN')}</span>${icons.chevron}</div>
    </a>`).join('');
  const gym = eq.gym_range_indiranagar
    ? `<div class="section-header">Gyms, Indiranagar</div>
       <div class="list"><div class="row static"><div class="content">
         <div class="detail" style="color:var(--label)">${esc(JSON.stringify(eq.gym_range_indiranagar).replace(/[{}"]/g, '').replace(/,/g, ' · '))}</div>
       </div></div></div>` : '';
  sheet(`
    <div class="sheet-title">Upgrade the load</div>
    <div class="sheet-body">
      <p class="sheet-note">Decision point: week ${eq.decision_week}.</p>
      <div class="section-header">Adjustable dumbbells</div>
      <div class="list">${dbs}</div>
      ${gym}
    </div>`);
}

/* ---------------- session detail ---------------- */

function videoChip(v) {
  if (!v) return '';
  if (v.type === 'video' && v.verified) return '<span class="chip verified">video</span>';
  if (v.type === 'channel') return '<span class="chip estimated">channel</span>';
  return '<span class="chip estimated">search</span>';
}

function exerciseRow(entry) {
  const ex = exercise(entry.ref);
  if (!ex) return '';
  const v = ex.video;
  const meta = [entry.sets && `${entry.sets} × ${entry.reps}`, entry.rest && entry.rest !== '-' && `rest ${entry.rest}`]
    .filter(Boolean).join(' · ');
  return `
    <a class="row" href="${esc(v?.url ?? '#')}" target="_blank" rel="noopener">
      <div class="content">
        <div class="title">${esc(ex.name)}</div>
        <div class="detail">${esc(meta)}</div>
        <div class="detail" style="color:var(--label-secondary)">${esc(ex.cue ?? '')}</div>
      </div>
      <div class="trailing">${videoChip(v)}${icons.chevron}</div>
    </a>`;
}

function renderSession(el, id) {
  const s = data.workouts.sessions.find(x => x.id === id);
  if (!s) { el.appendChild(h('<div class="empty">Session not found.</div>')); return; }

  const now = new Date();
  const isToday = sessionFor(now, load().settings)?.id === s.id;

  el.appendChild(h(`
    <h1 class="large-title">${esc(s.label)}
      <span class="subtitle">${s.exercises.length} exercises · about ${s.duration_min} min</span>
    </h1>`));
  mountNav(s.label);

  const warm = exercise(s.warmup_ref);
  if (warm) {
    el.appendChild(h(`<section class="section">
      <div class="section-header">Warm-up</div>
      <div class="list">${exerciseRow({ ref: s.warmup_ref, sets: '', reps: '', rest: '' })}</div>
    </section>`));
  }

  el.appendChild(h(`<section class="section">
    <div class="section-header">The session</div>
    <div class="list">${s.exercises.map(exerciseRow).join('')}</div>
    <div class="section-footer">Tap any exercise for the video. Every link was checked — a few point at a channel or a search where no single good video existed.</div>
  </section>`));

  const cool = exercise(s.cooldown_ref);
  if (cool) {
    el.appendChild(h(`<section class="section">
      <div class="section-header">Cool-down</div>
      <div class="list">${exerciseRow({ ref: s.cooldown_ref, sets: '', reps: '', rest: '' })}</div>
    </section>`));
  }

  if (s.id.startsWith('run')) renderC25K(el, weekNumber(now));

  if (isToday) {
    const rec = ensureRecord(now);
    const done = rec.workout.done === true;
    const wrap = h(`<div style="padding:0 var(--space-4) var(--space-6);">
      <button class="btn ${done ? 'btn-tinted' : 'btn-filled'}" id="done-btn">
        ${done ? 'Done — tap to undo' : 'Mark session done'}
      </button></div>`);
    wrap.querySelector('#done-btn').addEventListener('click', () => {
      toggle(now, 'workout.done');
      buzz();
      toast(getRecord(now).workout.done ? 'Session logged' : 'Unmarked');
      refresh();
    });
    el.appendChild(wrap);
  }
}

function renderC25K(el, wk) {
  /* The array carries a trailing metadata object alongside the weeks — keep the
     note, but never render it as "Week undefined". */
  const all = data.workouts.c25k ?? [];
  const weeks = all.filter(w => Number.isFinite(w.week));
  const note = all.find(w => w.mapping_note)?.mapping_note;

  const rows = weeks.map(w => `
    <div class="row static">
      <div class="content">
        <div class="title">Week ${w.week}${w.week === wk ? ' · you are here' : ''}</div>
        <div class="detail">${esc(w.pattern)}</div>
      </div>
      <div class="trailing">${w.total_min} min</div>
    </div>`).join('');

  el.appendChild(h(`<section class="section">
    <div class="section-header">Couch to 5K</div>
    <div class="list">${rows}</div>
    <div class="section-footer">${note ? esc(note) + ' ' : ''}Never chase pace — only completion.</div>
  </section>`));
}

/* ---------------- channels ---------------- */

function renderChannels(el) {
  el.appendChild(h(`
    <h1 class="large-title">Channels
      <span class="subtitle">Coaching worth trusting</span>
    </h1>`));
  mountNav('Channels');

  const rows = data.workouts.channels.map(c => `
    <a class="row" href="${esc(c.url)}" target="_blank" rel="noopener">
      <div class="content">
        <div class="title">${esc(c.name)}</div>
        <div class="detail">${esc(c.category)}</div>
        <div class="detail" style="color:var(--label-secondary)">${esc(c.why)}</div>
      </div>
      <div class="trailing">${icons.chevron}</div>
    </a>`).join('');

  el.appendChild(h(`<section class="section">
    <div class="list">${rows}</div>
  </section>`));
}
