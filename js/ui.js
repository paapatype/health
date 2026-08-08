/* ui.js — sheet, toast, tiny DOM helpers. */

export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

let sheetEl = null;

export function sheet(contentHTML, { onClose } = {}) {
  closeSheet();
  const backdrop = h('<div class="sheet-backdrop"></div>');
  const panel = h(`<div class="sheet" role="dialog" aria-modal="true"><div class="grabber"></div>${contentHTML}</div>`);
  sheetEl = { backdrop, panel, onClose };
  document.body.append(backdrop, panel);
  requestAnimationFrame(() => document.body.classList.add('sheet-open'));
  backdrop.addEventListener('click', closeSheet);
  return panel;
}

export function closeSheet() {
  if (!sheetEl) return;
  const { backdrop, panel, onClose } = sheetEl;
  sheetEl = null;
  document.body.classList.remove('sheet-open');
  setTimeout(() => { backdrop.remove(); panel.remove(); onClose?.(); }, 320);
}

let toastTimer = null;

export function toast(msg) {
  document.getElementById('toast')?.remove();
  const el = h(`<div id="toast" role="status" style="
    position:fixed;left:50%;transform:translateX(-50%);
    bottom:calc(var(--tab-bar-height) + env(safe-area-inset-bottom) + 1rem);
    background:var(--bg-grouped-card);color:var(--label);font:var(--type-subhead);
    padding:0.5rem 1rem;border-radius:var(--radius-pill);z-index:50;
    box-shadow:0 0.25rem 1.5rem rgba(0,0,0,0.25);white-space:nowrap;">${esc(msg)}</div>`);
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 1800);
}

/* haptic-ish acknowledgment where supported */
export function buzz() {
  navigator.vibrate?.(10);
}
