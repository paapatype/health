/* views/today.js — THE LOOP. Morning check → timeline → close-out.
   One screen, three states, everything one tap. */

import { data, menuFor, timelineFor, sessionFor, exercise, grocery,
         currentPhase, weekNumber, daysToTarget, isoDate } from '../data.js';
import { load } from '../store.js';
import { ensureRecord, getRecord, toggle, water, morningCheck, markIngredient,
         finishCheck, openItems, closeDay, backfill, completeness } from '../day.js';
import { cookNote, shareCookNote, copyCookNote } from '../share.js';
import { icons, mountNav, refresh, refreshBadge } from '../app.js';
import { h, esc, sheet, closeSheet, toast, buzz } from '../ui.js';

const MEAL_LABELS = {
  'meals.nuts': 'Early nuts', 'meals.breakfast': 'Breakfast', 'meals.lunch': 'Lunch',
  'meals.snack': 'Evening snack', 'meals.dinner': 'Dinner', 'meals.bedtime': 'Bedtime milk + oats',
  'workout.done': 'Workout', 'supplements.post': 'Post-workout NAC',
  'supplements.breakfast': 'Breakfast supplements', 'supplements.pm': 'Magnesium',
  'skincare.am': 'Skincare AM', 'skincare.pm': 'Skincare PM'
};

/* record_key in plan.json is the record path itself, e.g. "meals.breakfast" */
const keyToPath = k => k;

function fmtDate(d) {
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

export async function render(el, { sub, fresh = true } = {}) {
  const now = new Date();
  const rec = ensureRecord(now);
  const phase = currentPhase(now);
  const wk = weekNumber(now);

  el.appendChild(h(`
    <h1 class="large-title">Today
      <span class="subtitle">${fmtDate(now)} · ${esc(phase.name)}${wk ? ` · week ${wk}` : ''} · ${daysToTarget(now)} days to 5 Dec</span>
    </h1>`));
  mountNav('Today');

  if (sub === 'check' || !rec.ingredients_checked) renderMorningCheck(el, now);
  else renderCheckSummary(el, now, rec);
  renderTimeline(el, now, fresh);
  renderCloseout(el, now, sub === 'closeout');
  if (sub === 'closeout' && fresh) {
    setTimeout(() => document.getElementById('closeout-section')?.scrollIntoView({ block: 'start' }), 50);
  }
}

/* ---------------- morning check ---------------- */

function renderMorningCheck(el, now) {
  const items = morningCheck(now);
  const section = h(`<section class="section" id="check-section">
    <div class="section-header">Today needs</div>
    <div class="list" id="check-list"></div>
    <div class="section-footer">Tap what's missing — it goes on the Buy list in Food.</div>
  </section>`);
  const list = section.querySelector('#check-list');

  const NEED = 'background:color-mix(in srgb,var(--red) 14%,transparent);color:var(--red)';

  /* Repaint one row from its own state. Tapping a checkbox must never re-render
     the screen: that tore down the DOM, jumped to the top and then scrolled the
     timeline into view, so a tap on "Banana" threw you halfway down the page. */
  const paintRow = (row, it, g) => {
    row.setAttribute('aria-pressed', String(it.missing));
    const detail = row.querySelector('.detail');
    if (it.missing && g?.cheapest_platform) {
      const text = `On Buy list — cheapest: ${g.cheapest_platform}`;
      if (detail) detail.textContent = text;
      else row.querySelector('.content').insertAdjacentHTML('beforeend', `<div class="detail">${esc(text)}</div>`);
    } else detail?.remove();
    row.querySelector('.trailing').innerHTML = it.missing
      ? `<span class="chip" style="${NEED}">need</span>`
      : '<span class="chip verified">have</span>';
  };

  const paintDone = () => {
    const n = items.filter(i => i.missing).length;
    doneRow.querySelector('.trailing').innerHTML = n
      ? `<span class="chip" style="${NEED}">${n} to buy</span>`
      : '<span class="chip verified">all in</span>';
  };

  for (const it of items) {
    const g = grocery(it.id);
    /* short name here: this list is scanned at 6am, not shopped from */
    const name = g?.short ?? g?.name ?? it.id;
    const row = h(`
      <button class="row">
        <div class="content"><div class="title">${esc(name)}</div></div>
        <div class="trailing"></div>
      </button>`);
    paintRow(row, it, g);
    row.addEventListener('click', () => {
      it.missing = !it.missing;
      markIngredient(now, it.id, it.missing);
      buzz();
      paintRow(row, it, g);     // this row
      paintDone();              // the counter
      refreshBadge();           // and the Food tab badge — nothing else moves
    });
    list.appendChild(row);
  }

  /* Explicit finish. Without this the list collapses on the first tap, i.e.
     the moment you flag one missing thing the other ten vanish mid-read. */
  const doneRow = h(`
    <button class="row" id="check-done">
      <div class="content"><div class="title" style="color:var(--tint)">Done</div></div>
      <div class="trailing"></div>
    </button>`);
  paintDone();
  doneRow.addEventListener('click', () => { finishCheck(now); buzz(); location.hash = '#/today'; refresh(); });
  list.appendChild(doneRow);

  // cook note row
  const cookRow = h(`
    <button class="row">
      <div class="leading">${icons.food}</div>
      <div class="content"><div class="title">Today's cooking</div>
        <div class="detail">The note for the cook — copy or share</div></div>
      <div class="trailing">${icons.chevron}</div>
    </button>`);
  cookRow.addEventListener('click', () => openCookSheet(now));
  list.appendChild(cookRow);

  el.appendChild(section);
}

/* Once the check is done it collapses to one line — but stays reachable, and
   still shows the outcome. Hiding it outright loses the day's result. */
function renderCheckSummary(el, now, rec) {
  const missing = rec.ingredients_missing.length;
  const section = h(`<section class="section">
    <div class="list">
      <button class="row" id="check-reopen">
        <div class="content">
          <div class="title">Ingredients checked</div>
          <div class="detail">${missing
            ? `${missing} on the Buy list in Food`
            : 'Everything for today is in'}</div>
        </div>
        <div class="trailing">${icons.chevron}</div>
      </button>
      <button class="row" id="cook-row">
        <div class="leading">${icons.food}</div>
        <div class="content"><div class="title">Today's cooking</div>
          <div class="detail">The note for the cook — copy or share</div></div>
        <div class="trailing">${icons.chevron}</div>
      </button>
    </div>
  </section>`);
  section.querySelector('#check-reopen').addEventListener('click', () => {
    finishCheck(now, false); location.hash = '#/today/check'; refresh();
  });
  section.querySelector('#cook-row').addEventListener('click', () => openCookSheet(now));
  el.appendChild(section);
}

function openCookSheet(now) {
  const panel = sheet(`
    <div class="sheet-title">Today's cooking</div>
    <pre class="cook-note">${esc(cookNote(now))}</pre>
    <div style="display:flex;gap:0.75rem;margin-top:1rem;">
      <button class="btn btn-tinted" id="cook-copy">Copy</button>
      <button class="btn btn-filled" id="cook-share">Share</button>
    </div>`);
  panel.querySelector('#cook-copy').addEventListener('click', async () => {
    await copyCookNote(now); toast('Copied'); closeSheet();
  });
  panel.querySelector('#cook-share').addEventListener('click', async () => {
    const r = await shareCookNote(now);
    if (r === 'copied') toast('Copied — share sheet unavailable');
    closeSheet();
  });
}

/* ---------------- timeline ---------------- */

function renderTimeline(el, now, fresh = true) {
  const settings = load().settings;
  const rec = getRecord(now);
  let items = timelineFor(now, settings);

  // one interactive water row (at the first checkpoint); other checkpoints stay ICS-only
  const firstWater = items.findIndex(i => i.category === 'water');
  items = items.filter((i, idx) => i.category !== 'water' || idx === firstWater);

  const nowHM = now.toTimeString().slice(0, 5);
  // the "now" row: last item whose time <= now, else the first
  let nowIdx = -1;
  items.forEach((i, idx) => { if (i.time <= nowHM) nowIdx = idx; });

  const section = h(`<section class="section">
    <div class="section-header">Timeline</div>
    <div class="list" id="timeline"></div>
  </section>`);
  const list = section.querySelector('#timeline');

  items.forEach((item, idx) => {
    const row = item.category === 'water'
      ? waterRow(now, rec)
      : timelineRow(now, rec, item);
    if (idx === nowIdx) row.classList.add('now');
    list.appendChild(row);
  });

  el.appendChild(section);
  /* Only on arrival. Doing this on every re-render meant ticking anything
     hurled the page down to the timeline mid-tap. */
  if (fresh && !location.hash.includes('/check') && !location.hash.includes('/closeout')) {
    setTimeout(() => list.children[Math.max(0, nowIdx)]?.scrollIntoView({ block: 'center' }), 50);
  }
}

function stateFor(rec, path) {
  if (!path) return undefined;
  const [a, b] = path.split('.');
  return b === undefined ? rec[a] : rec[a]?.[b];
}

function timelineRow(now, rec, item) {
  const path = keyToPath(item.record_key);
  const state = stateFor(rec, path);
  const menu = menuFor(now);

  // meal rows show what the menu says today
  let detail = item.detail ?? '';
  if (item.category === 'meal') {
    const mealKey = path?.split('.')[1];
    const m = menu[mealKey];
    if (m) detail = m.name;
  }
  let title = item.label;
  const session = item.category === 'workout' ? sessionFor(now, load().settings) : null;
  if (session) { title = `Workout — ${session.label}`; detail = `${session.duration_min ?? 40} min · tap for exercises`; }

  const tickable = path !== undefined && state !== null && state !== undefined;
  const row = h(`
    <div class="row ${state === true ? 'done' : ''} ${item.category === 'anchor' ? '' : 'static'}" >
      <div class="content">
        <div class="title">${esc(title)}</div>
        ${detail ? `<div class="detail">${esc(detail)}</div>` : ''}
      </div>
      <div class="trailing">
        <span class="time">${item.time}</span>
        ${tickable ? `
          <button class="tick ${state === true ? 'on' : ''}" aria-label="Mark ${esc(item.label)} done" aria-pressed="${state === true}">
            <span class="ring">${icons.check}</span>
          </button>` : ''}
      </div>
    </div>`);

  row.querySelector('.tick')?.addEventListener('click', e => {
    e.stopPropagation();
    const on = toggle(now, path) === true;
    buzz();
    /* Just this control. A full re-render here is what made the page lurch. */
    const tick = row.querySelector('.tick');
    tick.classList.toggle('on', on);
    tick.setAttribute('aria-pressed', String(on));
    row.classList.toggle('done', on);
  });

  if (session) {
    row.classList.remove('static');
    row.addEventListener('click', e => {
      if (e.target.closest('.tick')) return;
      openWorkoutSheet(session);
    });
  }
  if (item.category === 'anchor' && item.deep_link) {
    const go = () => { location.hash = item.deep_link.slice(1); };
    /* A chevron promises navigation, so this has to behave like a control for
       keyboard and VoiceOver too — as a bare div it was mouse-only, which made
       "Close out today" unreachable without a pointer. Anchors are never
       tickable, so there's no nested button to conflict with the role. */
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
    row.addEventListener('click', go);
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });
    row.querySelector('.trailing').insertAdjacentHTML('beforeend', icons.chevron);
  }
  return row;
}

/* Pace markers come from plan.json and are sliced to the day's target — on a
   training day the target is 4, and a hardcoded three-bottle line silently
   dropped the last one. */
function pace(target) {
  const cps = (data.plan.hydration.checkpoints ?? []).slice(0, target);
  return cps.length ? ' · ' + cps.map((t, i) => `${i + 1} by ${t}`).join(' · ') : '';
}

function waterRow(now, rec) {
  const target = rec.water_target ?? 3;
  const dots = [];
  for (let i = 0; i < Math.ceil(target); i++) {
    dots.push(`<button class="water-dot ${i < rec.water_bottles ? 'full' : ''}"
      data-i="${i}" aria-label="Bottle ${i + 1}"></button>`);
  }
  const row = h(`
    <div class="row static">
      <div class="content">
        <div class="title">Water</div>
        <div class="detail">${rec.water_bottles} of ${target} bottles${pace(target)}</div>
      </div>
      <div class="trailing"><div class="water-dots">${dots.join('')}</div></div>
    </div>`);
  const dotEls = () => row.querySelectorAll('.water-dot');
  row.querySelectorAll('.water-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const i = Number(dot.dataset.i);
      const cur = getRecord(now)?.water_bottles ?? 0;
      const n = water(now, i < cur ? -1 : +1);   // tap a full dot = undo, empty = fill
      buzz();
      /* Fill the dots and update the count in place — no re-render, no jump. */
      dotEls().forEach((d, idx) => d.classList.toggle('full', idx < n));
      row.querySelector('.detail').textContent = `${n} of ${target} bottles${pace(target)}`;
    });
  });
  return row;
}

function openWorkoutSheet(session) {
  const ex = (session.exercises ?? []).map(e => {
    const x = exercise(e.ref);
    if (!x) return '';
    const v = x.video ?? {};
    return `<div class="row static" style="align-items:flex-start;">
      <div class="content">
        <div class="title">${esc(x.name)}</div>
        <div class="detail">${esc(e.sets)} × ${esc(e.reps ?? e.time ?? '')} · rest ${esc(e.rest ?? '—')}</div>
        <div class="detail">${esc(x.cue ?? '')}</div>
        ${v.url ? `<a href="${esc(v.url)}" target="_blank" rel="noopener" class="detail" style="color:var(--tint)">
          ▶ ${esc(v.channel ?? 'video')}${v.verified ? '' : ' (search)'}</a>` : ''}
      </div>
    </div>`;
  }).join('');
  sheet(`
    <div class="sheet-title">${esc(session.label)}</div>
    <div class="list">${ex || '<div class="empty">Exercises land with the research data.</div>'}</div>`);
}

/* ---------------- close-out ---------------- */

function renderCloseout(el, now, forced) {
  const rec = getRecord(now);
  const hour = now.getHours();
  if (!forced && hour < 21 && !rec.closed) return;   // appears from 21:00, or via deep link

  const open = openItems(now);
  const section = h(`<section class="section" id="closeout-section">
    <div class="section-header">Close out today</div>
    <div class="list" id="closeout-list"></div>
  </section>`);
  const list = section.querySelector('#closeout-list');

  if (rec.closed) {
    const pct = Math.round((completeness(rec) ?? 0) * 100);
    list.appendChild(h(`<div class="row static"><div class="content">
      <div class="title">Day closed — ${pct}%</div>
      <div class="detail">Tap anything above to adjust; it stays recorded.</div>
    </div></div>`));
  } else if (open.length === 0) {
    list.appendChild(h(`<div class="row static"><div class="content"><div class="title">Everything ticked.</div></div></div>`));
  } else {
    for (const path of open) {
      const row = h(`
        <button class="row">
          <div class="content"><div class="title">${esc(MEAL_LABELS[path] ?? path)}</div></div>
          <div class="trailing"><span class="tick" aria-hidden="true"><span class="ring">${icons.check}</span></span></div>
        </button>`);
      /* Tick in place and leave the row sitting there ticked. Removing it the
         instant it's tapped would shuffle every row under your thumb; it drops
         off the list next time you come back. */
      row.addEventListener('click', () => {
        const on = toggle(now, path) === true;
        buzz();
        row.querySelector('.tick').classList.toggle('on', on);
        row.classList.toggle('done', on);
      });
      list.appendChild(row);
    }
  }

  if (!rec.closed) {
    const btnWrap = h(`<div style="margin-top:0.75rem;display:flex;flex-direction:column;gap:0.5rem;">
      <button class="btn btn-filled" id="all-done">${open.length ? 'All done — close the day' : 'Close the day'}</button>
    </div>`);
    btnWrap.querySelector('#all-done').addEventListener('click', () => {
      closeDay(now, { allDone: true });
      toast('Recorded');
      refresh();
    });
    section.appendChild(btnWrap);
  }

  // yesterday back-fill offer (only if yesterday is in-plan and wasn't closed)
  const y = new Date(now); y.setDate(now.getDate() - 1);
  const yKey = isoDate(y);
  const yRec = load().records[yKey];
  if (!yRec?.closed && yKey >= data.plan.week1_monday) {
    const bf = h(`<div class="section-footer" style="text-align:center;">
      <a href="#" id="backfill-link">Fill in yesterday</a></div>`);
    bf.querySelector('#backfill-link').addEventListener('click', e => {
      e.preventDefault();
      backfill(yKey);
      toast('Yesterday opened — marked as back-filled');
      openBackfillSheet(yKey);
    });
    section.appendChild(bf);
  }

  el.appendChild(section);
}

function openBackfillSheet(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const rows = openItems(d).map(path => `
    <button class="row" data-path="${esc(path)}">
      <div class="content"><div class="title">${esc(MEAL_LABELS[path] ?? path)}</div></div>
      <div class="trailing"><span class="tick"><span class="ring">${icons.check}</span></span></div>
    </button>`).join('');
  const panel = sheet(`
    <div class="sheet-title">${fmtDate(d)} (back-fill)</div>
    <div class="list">${rows || '<div class="empty">Nothing open.</div>'}</div>
    <button class="btn btn-filled" style="margin-top:1rem" id="bf-close">Close that day</button>`);
  panel.querySelectorAll('.row[data-path]').forEach(row => {
    row.addEventListener('click', () => {
      toggle(d, row.dataset.path);
      row.querySelector('.tick').classList.toggle('on');
      buzz();
    });
  });
  panel.querySelector('#bf-close').addEventListener('click', () => {
    closeDay(d, {});
    closeSheet();
    toast('Recorded');
    refresh();
  });
}
