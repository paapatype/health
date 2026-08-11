/* ui.js — sheet, toast, tiny DOM helpers. */

import { Spring, addDrag, project, rubberband } from './motion.js';

export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

let sheetEl = null;

/* The sheet is driven by a spring rather than a CSS transition, because a
   transition can't be grabbed mid-flight. You can catch this one while it's
   still opening, drag it back down, and throw it away — the motion follows the
   finger the whole time and never jumps. Apple's drawer values: damping 0.8,
   response 0.3 — a little overshoot, earned because the gesture carries
   momentum. */
export function sheet(contentHTML, { onClose } = {}) {
  closeSheet(true);
  const backdrop = h('<div class="sheet-backdrop"></div>');
  const panel = h(`<div class="sheet" role="dialog" aria-modal="true"><div class="grabber"></div>${contentHTML}</div>`);
  document.body.append(backdrop, panel);
  document.body.classList.add('sheet-open');

  const height = () => panel.offsetHeight || window.innerHeight * 0.5;

  const paint = y => {
    panel.style.transform = `translate3d(0, ${y}px, 0)`;
    /* Backdrop tracks the sheet continuously — feedback during the gesture,
       not only when it ends. */
    const p = 1 - Math.min(1, Math.max(0, y / height()));
    backdrop.style.opacity = String(p);
  };

  /* Apple's drawer spec is response 0.3; nudged to 0.38 because 0.3 read as
     abrupt in use. Still well short of sluggish, and the bounce is unchanged. */
  /* Contents settle in just behind the sheet's leading edge, rather than the
     whole panel arriving as one finished slab. Delayed slightly so the rows
     land as the sheet reaches the top of its travel. */
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let i = 0;
    panel.querySelectorAll('.sheet-title, .section-header, .row, .sheet-lede, .sheet-note')
      .forEach(el => { el.style.setProperty('--d', `${90 + Math.min(i, 8) * 30}ms`); i++; });
    panel.classList.add('enter');
    setTimeout(() => panel.classList.remove('enter'), 900);
  }

  const s = new Spring({ from: height(), damping: 0.8, response: 0.38, onUpdate: paint });
  paint(height());               // start offscreen, painted synchronously
  s.to(0);                       // ...then spring in from that live value

  const ref = { backdrop, panel, onClose, spring: s, dismiss };
  sheetEl = ref;

  function dismiss(velocity = 0) {
    if (sheetEl !== ref) return;
    sheetEl = null;
    s.onRest = () => {
      document.body.classList.remove('sheet-open');
      backdrop.remove(); panel.remove(); onClose?.();
    };
    s.to(height() + 40, { velocity, damping: 1, response: 0.28 });
  }

  backdrop.addEventListener('click', () => dismiss(0));

  /* Drag to dismiss. Only when the scrollable body is already at the top,
     otherwise the gesture belongs to the scroller. */
  addDrag(panel, {
    axis: 'y',
    onStart: e => {
      const body = e.target.closest?.('.sheet-body');
      ref.blocked = !!(body && body.scrollTop > 0);
      if (!ref.blocked) s.stop();
    },
    onMove: dy => {
      if (ref.blocked) return;
      /* Down tracks 1:1; up resists progressively instead of stopping dead. */
      const y = dy < 0 ? -rubberband(-dy, height()) : dy;
      s.set(y);
    },
    onEnd: v => {
      if (ref.blocked) return;
      /* Decide on where the throw would LAND, not where the finger left off. */
      const landing = s.x + project(v);
      if (landing > height() * 0.4) dismiss(v);
      else s.to(0, { velocity: v });
    }
  });

  return panel;
}

export function closeSheet(immediate = false) {
  if (!sheetEl) return;
  if (immediate) {
    const { backdrop, panel, onClose } = sheetEl;
    sheetEl.spring?.stop();
    sheetEl = null;
    document.body.classList.remove('sheet-open');
    backdrop.remove(); panel.remove(); onClose?.();
    return;
  }
  sheetEl.dismiss(0);
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

/* Haptic-ish acknowledgment where supported. Browsers refuse vibrate() until
   the document has been genuinely interacted with, and log a console error when
   you try — that is an intervention message, not an exception, so try/catch
   cannot silence it. Check activation first and simply don't call it. */
export function buzz() {
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try { navigator.vibrate?.(10); } catch { /* not supported */ }
}
