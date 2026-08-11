/* app.js — bootstrap, hash router, tab shell. */

import { loadAll } from './data.js';
import { load } from './store.js';
import { buyList } from './day.js';

/* ---- inline SVG icons, SF Symbols visual language (1.7 stroke, round caps) ---- */
const I = {
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3.5" fill="currentColor" stroke="none"/><path d="M8 2.8v3.4M16 2.8v3.4" /><path d="M8.6 13.6l2.3 2.3 4.5-4.6" stroke="var(--bg-grouped-card, #fff)" fill="none"/></svg>',
  food: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.2 2.9c.4 0 .7.3.7.7v4.1c0 .5.4.9.9.9s.9-.4.9-.9V3.6a.7.7 0 0 1 1.4 0v4.1c0 .5.4.9.9.9s.9-.4.9-.9V3.6a.7.7 0 0 1 1.4 0v5.2c0 1.6-1.1 2.9-2.6 3.3v8.2a1.1 1.1 0 0 1-2.2 0v-8.2A3.4 3.4 0 0 1 6.5 8.8V3.6c0-.4.3-.7.7-.7Z"/><path d="M17.8 3c1.6.7 2.7 3 2.7 5.6 0 2.2-.8 4-2 4.8v6.9a1.1 1.1 0 0 1-2.2 0V4a1 1 0 0 1 1.5-1Z"/></svg>',
  train: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" aria-hidden="true"><path d="M4.2 9.5v5M7.4 7.5v9M2 12h2.2M7.4 12h9.2M19.8 9.5v5M16.6 7.5v9M22 12h-2.2" /></svg>',
  care: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20.6C7.2 17.5 3.4 14 3.4 9.9 3.4 7 5.7 4.8 8.4 4.8c1.5 0 2.8.7 3.6 1.8a4.5 4.5 0 0 1 3.6-1.8c2.7 0 5 2.2 5 5.1 0 4.1-3.8 7.6-8.6 10.7Z"/></svg>',
  me: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="7.6" r="4.1"/><path d="M12 13.6c-4.4 0-7.6 2.5-7.6 5.6 0 .9.7 1.6 1.6 1.6h12a1.6 1.6 0 0 0 1.6-1.6c0-3.1-3.2-5.6-7.6-5.6Z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 12.8l5 5 10-11"/></svg>',
  chevron: '<svg class="chevron" viewBox="0 0 10 17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 1.5l7 7-7 7"/></svg>'
};
export const icons = I;

const TABS = [
  { id: 'today', label: 'Today', icon: I.today },
  { id: 'food',  label: 'Food',  icon: I.food },
  { id: 'train', label: 'Train', icon: I.train },
  { id: 'care',  label: 'Care',  icon: I.care },
  { id: 'me',    label: 'Me',    icon: I.me }
];

const viewCache = {};
async function viewModule(tab) {
  if (!viewCache[tab]) viewCache[tab] = import(`./views/${tab}.js`);
  return viewCache[tab];
}

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [tab, ...rest] = h.split('/');
  return { tab: TABS.some(t => t.id === tab) ? tab : 'today', sub: rest.join('/') || null };
}

function renderTabBar(active) {
  const el = document.getElementById('tab-bar');
  const items = buyList();
  el.innerHTML = TABS.map(t => `
    <a href="#/${t.id}" class="${t.id === active ? 'active' : ''}" aria-label="${t.label}"
       ${t.id === active ? 'aria-current="page"' : ''}>
      ${t.icon}
      <span class="tab-label">${t.label}</span>
      ${t.id === 'food' && items.length ? `<span class="badge">${items.length}</span>` : ''}
    </a>`).join('');
}

let navObserver = null;
/* How many hash navigations we've made inside this session — tells us whether
   history.back() lands somewhere in the app or throws the user out of it. */
let navDepth = 0;

/* Large title collapses: inline nav bar fades in when the large title scrolls out.
   On a sub-screen it also carries a back control — without one the only way out
   of "This week" or a session detail was the tab bar, which is a dead end
   dressed up as navigation. Every screen has to answer "how do I get out". */
export function mountNav(titleText) {
  const nav = document.getElementById('nav-bar');
  nav.querySelector('.nav-title').textContent = titleText;

  const { tab, sub } = parseHash();
  const back = nav.querySelector('.nav-back');
  if (sub) {
    /* Going "up" a path segment is wrong here — "#/train/s" is a route prefix,
       not a screen. Step back through actual history when we have some (so
       care/skin → a product returns to the category you came from), and fall
       back to the tab root when this screen was opened cold from a deep link. */
    const label = TABS.find(t => t.id === tab)?.label ?? 'Back';
    back.innerHTML = `${I.chevron}<span>${label}</span>`;
    back.setAttribute('href', `#/${tab}`);
    back.onclick = e => {
      if (navDepth > 0) { e.preventDefault(); navDepth--; history.back(); }
    };
    back.hidden = false;
    nav.classList.add('has-back');
  } else {
    back.hidden = true;
    nav.classList.remove('has-back');
  }

  if (navObserver) navObserver.disconnect();
  const large = document.querySelector('.large-title');
  /* A sub-screen keeps its nav bar visible: the back control must never be
     hidden behind a scroll position. */
  if (!large || sub) { nav.classList.add('visible'); if (!large) return; }
  navObserver = new IntersectionObserver(
    ([entry]) => nav.classList.toggle('visible', sub ? true : !entry.isIntersecting),
    { rootMargin: `-${nav.offsetHeight}px 0px 0px 0px` }
  );
  navObserver.observe(large);
}

/* Swipe in from the left edge to go back, the way iOS does. Only from the very
   edge, so it can't eat a horizontal scroll or a row swipe. */
function mountEdgeBack() {
  let startX = null, startY = null;
  document.addEventListener('pointerdown', e => {
    startX = e.clientX <= 24 ? e.clientX : null;
    startY = e.clientY;
  }, { passive: true });
  document.addEventListener('pointerup', e => {
    if (startX === null) return;
    const dx = e.clientX - startX, dy = Math.abs(e.clientY - startY);
    startX = null;
    if (dx > 60 && dy < 50) {
      const back = document.querySelector('.nav-back:not([hidden])');
      if (back) location.hash = back.getAttribute('href');
    }
  }, { passive: true });
}

async function route() {
  const { tab, sub } = parseHash();
  renderTabBar(tab);
  const view = document.getElementById('view');
  view.innerHTML = '';
  const mod = await viewModule(tab);
  await mod.render(view, { sub });
  window.scrollTo(0, 0);
}

/* re-render current view (after a state change that affects other chrome, e.g. badge) */
export function refresh() { route(); }

window.addEventListener('hashchange', () => { navDepth++; route(); });

(async function boot() {
  try {
    await loadAll();
    load();
    mountEdgeBack();
    await route();
  } catch (e) {
    document.getElementById('view').innerHTML =
      `<div class="empty">Could not load app data.<br>${e.message}</div>`;
    console.error(e);
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdatePrompt(reg);
          }
        });
      });
    }).catch(err => console.warn('SW registration failed', err));
  }
})();

function showUpdatePrompt(reg) {
  if (document.getElementById('update-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'update-bar';
  bar.style.cssText = 'position:fixed;left:1rem;right:1rem;bottom:calc(var(--tab-bar-height) + env(safe-area-inset-bottom) + 0.75rem);z-index:40;';
  bar.innerHTML = `<button class="btn btn-filled">Update ready — tap to refresh</button>`;
  bar.querySelector('button').addEventListener('click', () => {
    reg.waiting?.postMessage('SKIP_WAITING');
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
  });
  document.body.appendChild(bar);
}
