/* views/food.js — the reference side of eating: what to buy, what it costs,
   what the week looks like. The Buy list is the loop's other end: things
   flagged on the Today check land here with somewhere to actually buy them.

   Nothing in this file may reference the tracker in Me. See README: privacy. */

import { data, menuFor, dayKey, DAY_KEYS, isoDate } from '../data.js';
import { load, update } from '../store.js';
import { buyList, clearBought } from '../day.js';
import { icons, mountNav, refresh } from '../app.js';
import { h, esc, sheet, toast, buzz } from '../ui.js';

const DAY_NAMES = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
                    fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const AISLES = [
  ['vegetables', 'Vegetables'], ['fruit', 'Fruit'], ['dairy', 'Dairy'],
  ['meat', 'Meat & eggs'], ['protein', 'Meat & eggs'], ['bakery', 'Bakery'],
  ['grains', 'Grains'], ['dals', 'Dals & pulses'], ['nuts', 'Nuts & seeds'],
  ['breakfast', 'Breakfast'], ['fats', 'Oils & fats'], ['spices', 'Spices'],
  ['condiments', 'Condiments'], ['snacks', 'Snacks'], ['beverages', 'Beverages']
];

/* Cheapest verified-or-better price across platforms. */
function cheapest(item) {
  const ps = (item.prices ?? []).filter(p => typeof p.price === 'number');
  if (!ps.length) return null;
  return ps.reduce((a, b) => (b.price < a.price ? b : a));
}

function money(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }

export async function render(el, { sub } = {}) {
  if (sub === 'list') return renderShoppingList(el);
  if (sub === 'menu') return renderWeek(el);

  const now = new Date();
  el.appendChild(h(`
    <h1 class="large-title">Food
      <span class="subtitle">${DAY_NAMES[dayKey(now)]} · menu, list and cost</span>
    </h1>`));
  mountNav('Food');

  renderBuyList(el);
  renderToday(el, now);
  renderNav(el);
  renderCost(el);
  renderAccelerators(el);
}

/* ---------------- buy list ---------------- */

function renderBuyList(el) {
  const items = buyList();
  if (!items.length) return;

  const section = h(`<section class="section">
    <div class="section-header">Buy list</div>
    <div class="list" id="buy-list"></div>
    <div class="section-footer">Tap an item once it's bought. Prices last checked ${esc(data.groceries.checked_on)} — edit them in data/groceries.json.</div>
  </section>`);
  const list = section.querySelector('#buy-list');

  for (const entry of items) {
    const g = data.groceries.items.find(i => i.id === entry.item);
    const best = g ? cheapest(g) : null;
    const row = h(`
      <button class="row">
        <div class="content">
          <div class="title">${esc(g?.short ?? entry.item)}</div>
          <div class="detail">${best
            ? `${esc(best.platform)} · ${money(best.price)} · ${esc(g.pack)}`
            : 'No price on file'}</div>
        </div>
        <div class="trailing">
          ${best?.confidence ? `<span class="chip ${esc(best.confidence)}">${esc(best.confidence)}</span>` : ''}
          <span class="tick"><span class="ring">${icons.check}</span></span>
        </div>
      </button>`);
    row.addEventListener('click', () => {
      clearBought(entry.item);
      buzz();
      toast(`${g?.short ?? entry.item} — bought`);
      refresh();
    });
    list.appendChild(row);
  }
  el.appendChild(section);
}

/* ---------------- today's meals ---------------- */

function renderToday(el, now) {
  const m = menuFor(now);
  const meals = [
    ['nuts', 'Early nuts'], ['breakfast', 'Breakfast'], ['lunch', 'Lunch'],
    ['snack', 'Evening snack'], ['dinner', 'Dinner'], ['bedtime', 'Bedtime']
  ];
  const rows = meals
    .filter(([k]) => m[k]?.name)
    .map(([k, label]) => `
      <div class="row static">
        <div class="content">
          <div class="title">${esc(label)}</div>
          <div class="detail">${esc(m[k].name)}</div>
        </div>
      </div>`).join('');

  el.appendChild(h(`<section class="section">
    <div class="section-header">Today's meals</div>
    <div class="list">${rows}</div>
    <div class="section-footer">Bedtime milk + oats + nuts on training nights only.</div>
  </section>`));
}

/* ---------------- navigation ---------------- */

function renderNav(el) {
  const n = data.groceries.items.length;
  const section = h(`<section class="section">
    <div class="list">
      <a class="row" href="#/food/list">
        <div class="content"><div class="title">This week's shopping list</div>
          <div class="detail">${n} items, grouped by aisle</div></div>
        <div class="trailing">${icons.chevron}</div>
      </a>
      <a class="row" href="#/food/menu">
        <div class="content"><div class="title">The 7-day menu</div>
          <div class="detail">Every meal, every day</div></div>
        <div class="trailing">${icons.chevron}</div>
      </a>
    </div>
  </section>`);
  el.appendChild(section);
}

/* ---------------- monthly cost ---------------- */

const TIERS = [
  ['lean', 'Lean', 'Kirana + BigBasket, bulk staples'],
  ['normal', 'Normal', 'One quick-commerce app, with a membership'],
  ['convenience', 'Convenience', 'Premium picks, no membership']
];

function renderCost(el) {
  const t = data.groceries.totals.monthly;
  const rows = TIERS.map(([id, label, note]) => {
    const v = t[id];
    return `
      <button class="row" data-tier="${id}">
        <div class="content">
          <div class="title">${label}${id === 'normal' ? ' <span class="chip tier">recommended</span>' : ''}</div>
          <div class="detail">${esc(note)}</div>
        </div>
        <div class="trailing"><span style="font-variant-numeric:tabular-nums">${money(v.typical)}</span>${icons.chevron}</div>
      </button>`;
  }).join('');

  /* The tier figures are researched constants — they account for pack
     amortisation, delivery and handling fees, which a naive sum can't. So they
     don't move when you edit one price. This line does: it's the live sum of
     the cheapest price on file for every item, one pack each. Not the tier
     total, but it makes an edit visible and catches a typo'd zero. */
  const basket = data.groceries.items
    .map(cheapest).filter(Boolean).reduce((s, p) => s + p.price, 0);

  const section = h(`<section class="section">
    <div class="section-header">Monthly cost — your portions</div>
    <div class="list" id="cost-list">${rows}</div>
    <div class="section-footer">Ranges, not receipts: quick-commerce pricing moves with surge and stock. Tap a tier for the range and what drives it.<br>
      Live check: one pack of all ${data.groceries.items.length} items at today's cheapest prices comes to <strong>${money(basket)}</strong> — edit any price in data/groceries.json and this moves.</div>
  </section>`);

  section.querySelectorAll('[data-tier]').forEach(btn => {
    btn.addEventListener('click', () => openTierSheet(btn.dataset.tier));
  });
  el.appendChild(section);
}

function openTierSheet(id) {
  const g = data.groceries;
  const m = g.totals.monthly[id], w = g.totals.weekly[id];
  const label = TIERS.find(t => t[0] === id)[1];
  const drivers = g.cost_drivers.slice(0, 5).map(d => `
    <div class="row static">
      <div class="content"><div class="title">${esc(d.item)}</div>
        <div class="detail">${esc(d.substitute)}</div></div>
      <div class="trailing" style="font-variant-numeric:tabular-nums">${money(d.monthly_cost)}</div>
    </div>`).join('');

  sheet(`
    <div class="sheet-title">${label}</div>
    <div class="sheet-body">
      <p class="sheet-lede">${money(m.low)}–${money(m.high)} a month · ${money(w.typical)} a week typical.</p>
      <p class="sheet-note">${esc(g.totals.tier_definitions[id])}</p>
      <div class="section-header">Biggest line items</div>
      <div class="list">${drivers}</div>
      <div class="section-footer">${esc(g.totals.delivery_reality.membership_math ?? '')}</div>
    </div>`);
}

/* ---------------- cut accelerators ---------------- */

function renderAccelerators(el) {
  const st = load();
  const on = st.settings.accelerators ?? {};
  const rows = data.menu.cut_accelerators.map(a => `
    <button class="row" data-acc="${esc(a.id)}">
      <div class="content">
        <div class="title">${esc(a.rule)}</div>
        <div class="detail">≈ ${a.saves_kcal_est} kcal/day</div>
      </div>
      <div class="trailing"><span class="tick ${on[a.id] ? 'on' : ''}"><span class="ring">${icons.check}</span></span></div>
    </button>`).join('');

  const total = data.menu.cut_accelerators
    .filter(a => on[a.id]).reduce((s, a) => s + a.saves_kcal_est, 0);

  const section = h(`<section class="section">
    <div class="section-header">Cut accelerators</div>
    <div class="list">${rows}</div>
    <div class="section-footer">${total
      ? `About ${total} kcal/day trimmed, no nutrition lost.`
      : 'All three together trim roughly 500 kcal/day with nothing nutritionally lost.'}</div>
  </section>`);

  section.querySelectorAll('[data-acc]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.acc;
      update(s => {
        s.settings.accelerators = s.settings.accelerators ?? {};
        s.settings.accelerators[id] = !s.settings.accelerators[id];
      });
      buzz();
      refresh();
    });
  });
  el.appendChild(section);
}

/* ---------------- sub-route: shopping list ---------------- */

function renderShoppingList(el) {
  el.appendChild(h(`
    <h1 class="large-title">This week
      <span class="subtitle">Perishables weekly · staples last longer</span>
    </h1>`));
  mountNav('This week');

  const st = load();
  const out = new Set(st.staplesOut ?? []);
  const items = data.groceries.items;
  const seen = new Set();

  for (const [key, label] of AISLES) {
    if (seen.has(label)) continue;
    seen.add(label);
    const group = items.filter(i => AISLES.find(a => a[1] === label && a[0] === i.category));
    if (!group.length) continue;

    const rows = group.map(i => {
      const best = cheapest(i);
      const isOut = out.has(i.id);
      return `
        <button class="row" data-item="${esc(i.id)}">
          <div class="content">
            <div class="title">${esc(i.short ?? i.name)}</div>
            <div class="detail">${esc(i.weekly_qty)}${best ? ` · ${esc(best.platform)} ${money(best.price)} / ${esc(i.pack)}` : ''}</div>
          </div>
          <div class="trailing">
            ${i.type === 'perishable' ? '<span class="chip">weekly</span>' : ''}
            <span class="tick ${isOut ? '' : 'on'}"><span class="ring">${icons.check}</span></span>
          </div>
        </button>`;
    }).join('');

    const section = h(`<section class="section">
      <div class="section-header">${esc(label)}</div>
      <div class="list">${rows}</div>
    </section>`);

    section.querySelectorAll('[data-item]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.item;
        update(s => {
          s.staplesOut = s.staplesOut ?? [];
          const i = s.staplesOut.indexOf(id);
          i === -1 ? s.staplesOut.push(id) : s.staplesOut.splice(i, 1);
        });
        buzz();
        refresh();
      });
    });
    el.appendChild(section);
  }

  el.appendChild(h(`<div class="section-footer" style="text-align:center;padding-bottom:1rem;">
    Ticked = in the house. Untick what's run out.<br>
    ${esc(data.groceries.kirana_better.length)} of these are cheaper at a kirana or mandi than on an app.
  </div>`));
}

/* ---------------- sub-route: the week ---------------- */

function renderWeek(el) {
  el.appendChild(h(`
    <h1 class="large-title">The week
      <span class="subtitle">Mum's menu, as designed</span>
    </h1>`));
  mountNav('The week');

  const today = dayKey(new Date());
  const meals = [['nuts', 'Nuts'], ['breakfast', 'Breakfast'], ['lunch', 'Lunch'],
                 ['snack', 'Snack'], ['dinner', 'Dinner'], ['bedtime', 'Bedtime']];

  for (const dk of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) {
    const d = data.menu.days[dk];
    const rows = meals.filter(([k]) => d[k]?.name).map(([k, label]) => `
      <div class="row static">
        <div class="content">
          <div class="title">${esc(label)}</div>
          <div class="detail">${esc(d[k].name)}</div>
        </div>
      </div>`).join('');
    el.appendChild(h(`<section class="section">
      <div class="section-header">${esc(DAY_NAMES[dk])}${dk === today ? ' · today' : ''}</div>
      <div class="list">${rows}</div>
    </section>`));
  }

  const mac = data.menu.macros_daily_estimate;
  el.appendChild(h(`<section class="section">
    <div class="section-header">Daily average</div>
    <div class="list">
      <div class="row static"><div class="content"><div class="title">Estimated macros</div>
        <div class="detail">${esc(mac.kcal)} kcal · ${esc(mac.protein_g)} g protein · ${esc(mac.carbs_g)} g carbs · ${esc(mac.fat_g)} g fat</div></div></div>
    </div>
    <div class="section-footer">Estimates. Protein is the weak number here — see the note in Me.</div>
  </section>`));
}
