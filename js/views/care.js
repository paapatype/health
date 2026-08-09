/* views/care.js — skincare, teeth, hair, supplements. Reference, not a loop:
   options with prices, what each is actually for, and who it isn't for.
   Three tiers everywhere plus a best-regardless pick, because the ask was to
   decide for yourself rather than be decided for. */

import { data } from '../data.js';
import { icons, mountNav } from '../app.js';
import { h, esc, sheet } from '../ui.js';

const TIER_LABEL = { cheap: 'Cheap', mid: 'Mid', premium: 'Premium' };

function money(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
function price(o) {
  const p = o.price;
  return typeof p === 'number' ? money(p) : p?.typical != null ? money(p.typical) : '—';
}

export async function render(el, { sub } = {}) {
  if (sub === 'skin') return renderSkin(el);
  if (sub === 'teeth') return renderTeeth(el);
  if (sub === 'hair') return renderHair(el);
  if (sub === 'supplements') return renderSupplements(el);
  if (sub?.startsWith('c/')) return renderCategory(el, sub.slice(2));

  el.appendChild(h(`
    <h1 class="large-title">Care
      <span class="subtitle">Skin, teeth, hair, supplements</span>
    </h1>`));
  mountNav('Care');

  const sk = data.products.skincare;
  const starter = sk.starter_set;

  el.appendChild(h(`<section class="section">
    <div class="section-header">Start here</div>
    <div class="list">
      <div class="row static">
        <div class="content">
          <div class="title">Three things, ${money(starter.total_cost)}</div>
          <div class="detail">${esc(starter.note)}</div>
        </div>
      </div>
    </div>
  </section>`));

  el.appendChild(h(`<section class="section">
    <div class="list">
      <a class="row" href="#/care/skin">
        <div class="content"><div class="title">Skincare</div>
          <div class="detail">${sk.categories.length} categories · dry and sensitive throughout</div></div>
        <div class="trailing">${icons.chevron}</div></a>
      <a class="row" href="#/care/teeth">
        <div class="content"><div class="title">Teeth</div>
          <div class="detail">${data.products.teeth.tiers.length} tiers · do the cleaning first</div></div>
        <div class="trailing">${icons.chevron}</div></a>
      <a class="row" href="#/care/hair">
        <div class="content"><div class="title">Hair</div>
          <div class="detail">Work out which problem you have, then buy</div></div>
        <div class="trailing">${icons.chevron}</div></a>
      <a class="row" href="#/care/supplements">
        <div class="content"><div class="title">Supplements</div>
          <div class="detail">${data.supplements.supplements.length} items · ${money(data.supplements.monthly_totals.mid)}/month mid tier</div></div>
        <div class="trailing">${icons.chevron}</div></a>
    </div>
    <div class="section-footer">Not medical advice. Clear the stack with a GP, the hair with a dermatologist, and any whitening with a dentist.</div>
  </section>`));
}

/* ---------------- skincare ---------------- */

function renderSkin(el) {
  const sk = data.products.skincare;
  el.appendChild(h(`
    <h1 class="large-title">Skincare
      <span class="subtitle">Dry and sensitive — the governing constraint</span>
    </h1>`));
  mountNav('Skincare');

  const rows = sk.categories.map(c => {
    const best = c.options.find(o => o.best_overall) ?? c.options[0];
    return `
      <a class="row" href="#/care/c/${esc(c.id)}">
        <div class="content">
          <div class="title">${esc(c.name)}</div>
          <div class="detail">${c.options.length} options · best: ${esc(best?.name ?? '—')}</div>
        </div>
        <div class="trailing">${icons.chevron}</div>
      </a>`;
  }).join('');

  el.appendChild(h(`<section class="section">
    <div class="section-header">Categories</div>
    <div class="list">${rows}</div>
  </section>`));

  routineSection(el, 'Morning', sk.routines.am);
  routineSection(el, 'Night', sk.routines.pm);

  const ramp = sk.ramp_8_week.map(w => `
    <div class="row static">
      <div class="content"><div class="title">Week ${w.week}</div>
        <div class="detail">${esc(w.add)}</div>
        <div class="detail" style="color:var(--label-secondary)">Watch: ${esc(w.watch_for)}</div></div>
    </div>`).join('');
  el.appendChild(h(`<section class="section">
    <div class="section-header">Introduce one thing at a time</div>
    <div class="list">${ramp}</div>
    <div class="section-footer">${esc(sk.sting_reset)}</div>
  </section>`));

  el.appendChild(h(`<section class="section">
    <div class="section-header">Worth saying once</div>
    <div class="list"><div class="row static"><div class="content">
      <div class="detail" style="color:var(--label)">${esc(sk.habit_honesty ?? '')}</div>
    </div></div></div>
  </section>`));
}

function routineSection(el, title, steps) {
  if (!steps?.length) return;
  const rows = steps.map(s => `
    <div class="row static"><div class="content">
      <div class="detail" style="color:var(--label)">${esc(s)}</div></div></div>`).join('');
  el.appendChild(h(`<section class="section">
    <div class="section-header">${esc(title)}</div>
    <div class="list">${rows}</div>
  </section>`));
}

/* One category: every option, tiered. */
function renderCategory(el, id) {
  const all = [...data.products.skincare.categories, ...data.products.hair.categories];
  const c = all.find(x => x.id === id);
  if (!c) { el.appendChild(h('<div class="empty">Not found.</div>')); return; }

  el.appendChild(h(`
    <h1 class="large-title">${esc(c.name)}
      <span class="subtitle">${c.options.length} options${c.priority ? ' · ' + esc(c.priority) : ''}</span>
    </h1>`));
  mountNav(c.name);

  if (c.notes) {
    el.appendChild(h(`<section class="section"><div class="list">
      <div class="row static"><div class="content">
        <div class="detail" style="color:var(--label)">${esc(c.notes)}</div></div></div>
    </div></section>`));
  }

  for (const tier of ['cheap', 'mid', 'premium']) {
    const opts = c.options.filter(o => o.tier === tier);
    if (!opts.length) continue;
    const rows = opts.map(o => `
      <button class="row" data-opt="${esc(o.id)}">
        <div class="content">
          <div class="title">${esc(o.brand ? o.brand + ' ' : '')}${esc(o.name)}${o.best_overall ? ' <span class="chip tier">best</span>' : ''}</div>
          <div class="detail">${esc(o.size ?? '')}${o.cost_per_month ? ` · ${money(o.cost_per_month)}/month of use` : ''}</div>
          ${o.recurring_criticism ? `<div class="detail" style="color:var(--label-secondary)">Not for: ${esc(o.not_for ?? o.recurring_criticism)}</div>` : ''}
        </div>
        <div class="trailing"><span style="font-variant-numeric:tabular-nums">${price(o)}</span>${icons.chevron}</div>
      </button>`).join('');

    const section = h(`<section class="section">
      <div class="section-header">${TIER_LABEL[tier]}</div>
      <div class="list">${rows}</div>
    </section>`);
    section.querySelectorAll('[data-opt]').forEach(b =>
      b.addEventListener('click', () => openOption(c.options.find(o => o.id === b.dataset.opt))));
    el.appendChild(section);
  }
}

function openOption(o) {
  if (!o) return;
  const buys = (o.buy_at ?? []).map(b => `
    <a class="row" href="${esc(b.url)}" target="_blank" rel="noopener">
      <div class="content"><div class="title">${esc(b.platform)}</div>
        ${b.confidence ? `<div class="detail"><span class="chip ${esc(b.confidence)}">${esc(b.confidence)}</span></div>` : ''}</div>
      <div class="trailing"><span style="font-variant-numeric:tabular-nums">${b.price != null ? money(b.price) : ''}</span>${icons.chevron}</div>
    </a>`).join('');

  sheet(`
    <div class="sheet-title">${esc(o.name)}</div>
    <div class="sheet-body">
      <p class="sheet-lede">${esc(o.brand ?? '')} · ${esc(o.size ?? '')} · ${price(o)}${o.cost_per_month ? ` · ${money(o.cost_per_month)}/month of use` : ''}</p>
      ${o.texture_finish ? `<p class="sheet-note">${esc(o.texture_finish)}</p>` : ''}
      ${o.why ? `<p class="sheet-note"><strong>Why:</strong> ${esc(o.why)}</p>` : ''}
      ${o.not_for ? `<p class="sheet-note"><strong>Not for:</strong> ${esc(o.not_for)}</p>` : ''}
      ${o.recurring_criticism ? `<p class="sheet-note"><strong>Recurring complaint:</strong> ${esc(o.recurring_criticism)}</p>` : ''}
      ${o.key_actives?.length ? `<div class="section-header">Actives</div>
        <div class="list"><div class="row static"><div class="content"><div class="detail" style="color:var(--label)">${esc(o.key_actives.join(' · '))}</div></div></div></div>` : ''}
      <div class="section-header">Where to buy</div>
      <div class="list">${buys || '<div class="row static"><div class="content"><div class="detail">No links on file.</div></div></div>'}</div>
    </div>`);
}

/* ---------------- teeth ---------------- */

function renderTeeth(el) {
  const t = data.products.teeth;
  el.appendChild(h(`
    <h1 class="large-title">Teeth
      <span class="subtitle">Cleaning first, whitening second</span>
    </h1>`));
  mountNav('Teeth');

  const tiers = t.tiers.map(x => {
    const bp = x.bangalore_price;
    const cost = bp ? `${money(bp.low)}–${money(bp.high)}` : '';
    return `
      <button class="row" data-tier="${x.tier}">
        <div class="content">
          <div class="title">Tier ${x.tier} · ${esc(x.name)}${x.first_step ? ' <span class="chip tier">do first</span>' : ''}</div>
          <div class="detail">${esc((x.what ?? '').slice(0, 110))}…</div>
        </div>
        <div class="trailing"><span style="font-variant-numeric:tabular-nums">${cost}</span>${icons.chevron}</div>
      </button>`;
  }).join('');

  const section = h(`<section class="section">
    <div class="section-header">The options, honestly ranked</div>
    <div class="list">${tiers}</div>
  </section>`);
  section.querySelectorAll('[data-tier]').forEach(b => b.addEventListener('click', () => {
    const x = t.tiers.find(y => String(y.tier) === b.dataset.tier);
    sheet(`
      <div class="sheet-title">${esc(x.name)}</div>
      <div class="sheet-body">
        <p class="sheet-lede">${esc(x.what)}</p>
        ${x.price_notes ? `<p class="sheet-note">${esc(x.price_notes)}</p>` : ''}
        ${x.effect_with_exposure ? `<p class="sheet-note"><strong>Realistically:</strong> ${esc(x.effect_with_exposure)}</p>` : ''}
      </div>`);
  }));
  el.appendChild(section);

  const paths = t.decision_paths.map(p => `
    <div class="row static">
      <div class="content"><div class="title">${esc(p.route.replace(/_/g, ' '))}</div>
        <div class="detail">${esc((p.steps ?? []).join(' → '))}</div></div>
    </div>`).join('');
  el.appendChild(h(`<section class="section">
    <div class="section-header">Three routes</div>
    <div class="list">${paths}</div>
    <div class="section-footer">${esc(t.honest_line ?? '')}</div>
  </section>`));

  const avoid = (t.avoid ?? []).map(a => `
    <div class="row static"><div class="content">
      <div class="title">${esc(a.what ?? a.name ?? a)}</div>
      ${a.why ? `<div class="detail">${esc(a.why)}</div>` : ''}</div></div>`).join('');
  el.appendChild(h(`<section class="section">
    <div class="section-header">Avoid</div>
    <div class="list">${avoid}</div>
  </section>`));
}

/* ---------------- hair ---------------- */

function renderHair(el) {
  const hr = data.products.hair;
  el.appendChild(h(`
    <h1 class="large-title">Hair
      <span class="subtitle">Work out which problem you have first</span>
    </h1>`));
  mountNav('Hair');

  const causes = hr.diagnosis.causes.map(c => `
    <div class="row static">
      <div class="content"><div class="title">${esc(c.name)}</div>
        <div class="detail">${esc(c.pattern)}</div></div>
    </div>`).join('');
  el.appendChild(h(`<section class="section">
    <div class="section-header">Which one is it?</div>
    <div class="list">${causes}</div>
    <div class="section-footer">${esc(hr.diagnosis.pull_test ?? '')}</div>
  </section>`));

  el.appendChild(h(`<section class="section">
    <div class="section-header">Expect this</div>
    <div class="list"><div class="row static"><div class="content">
      <div class="detail" style="color:var(--label)">${esc(hr.interactions_note ?? hr.diagnosis.deficit_warning ?? '')}</div>
    </div></div></div>
  </section>`));

  const cats = hr.categories.map(c => `
    <a class="row" href="#/care/c/${esc(c.id)}">
      <div class="content"><div class="title">${esc(c.name)}</div>
        <div class="detail">${c.options.length} options</div></div>
      <div class="trailing">${icons.chevron}</div>
    </a>`).join('');
  el.appendChild(h(`<section class="section">
    <div class="section-header">Products</div>
    <div class="list">${cats}</div>
  </section>`));

  const free = (hr.free_changes ?? []).map(f => `
    <div class="row static"><div class="content">
      <div class="detail" style="color:var(--label)">${esc(typeof f === 'string' ? f : f.change ?? JSON.stringify(f))}</div>
    </div></div>`).join('');
  el.appendChild(h(`<section class="section">
    <div class="section-header">Costs nothing</div>
    <div class="list">${free}</div>
  </section>`));
}

/* ---------------- supplements ---------------- */

function renderSupplements(el) {
  const s = data.supplements;
  el.appendChild(h(`
    <h1 class="large-title">Supplements
      <span class="subtitle">${money(s.monthly_totals.mid)}/month on the mid tier</span>
    </h1>`));
  mountNav('Supplements');

  const rows = s.supplements.map(x => `
    <button class="row" data-sup="${esc(x.id)}">
      <div class="content">
        <div class="title">${esc(x.name)}</div>
        <div class="detail">${esc(x.dose)} · ${esc(x.timing)}</div>
      </div>
      <div class="trailing">${icons.chevron}</div>
    </button>`).join('');

  const section = h(`<section class="section">
    <div class="section-header">The stack</div>
    <div class="list">${rows}</div>
    <div class="section-footer">${esc(s.gp_signoff_note)}</div>
  </section>`);
  section.querySelectorAll('[data-sup]').forEach(b => b.addEventListener('click', () => {
    const x = s.supplements.find(y => y.id === b.dataset.sup);
    const opts = (x.options ?? []).map(o => `
      <a class="row" href="${esc(o.url ?? '#')}" target="_blank" rel="noopener">
        <div class="content"><div class="title">${esc(o.name ?? o.brand ?? '')}</div>
          <div class="detail">${esc(o.tier ?? '')}${o.cost_per_month ? ` · ${money(o.cost_per_month)}/month` : ''}</div></div>
        <div class="trailing">${o.price != null ? money(o.price) : ''}${icons.chevron}</div>
      </a>`).join('');
    sheet(`
      <div class="sheet-title">${esc(x.name)}</div>
      <div class="sheet-body">
        <p class="sheet-lede">${esc(x.dose)} · ${esc(x.timing)}</p>
        <p class="sheet-note">${esc(x.why)}</p>
        ${x.form_note ? `<p class="sheet-note"><strong>Form:</strong> ${esc(x.form_note)}</p>` : ''}
        ${opts ? `<div class="section-header">Options</div><div class="list">${opts}</div>` : ''}
      </div>`);
  }));
  el.appendChild(section);

  el.appendChild(h(`<section class="section">
    <div class="section-header">Before you start</div>
    <div class="list"><div class="row static"><div class="content">
      <div class="detail" style="color:var(--label)">${esc(s.d3_test_first)}</div>
    </div></div></div>
  </section>`));
}
