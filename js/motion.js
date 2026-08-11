/* motion.js — springs and gesture primitives, hand-rolled.

   No npm and no CDN here, so there's no Motion/Framer. That's fine: the parts
   that matter are small. What matters is the behaviour, not the library —

   - motion starts from the CURRENT on-screen value, never the target, so an
     interruption never jumps;
   - a re-target keeps the existing velocity instead of hard-cutting it, which
     is what stops a reversal feeling like a brick wall;
   - a released gesture hands its velocity to the spring, so there is no seam
     between dragging and animating.

   Parameterised the way Apple frames it — damping ratio + response — rather
   than mass/stiffness/damping. damping 1.0 = critically damped, no overshoot.
   Below 1.0 overshoots; reserve that for motion the user actually threw. */

export const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* A single scalar under spring control. Retarget at any time; velocity carries. */
export class Spring {
  constructor({ from = 0, damping = 1, response = 0.4, onUpdate, onRest } = {}) {
    this.x = from;
    this.v = 0;
    this.target = from;
    this.damping = damping;
    this.response = response;
    this.onUpdate = onUpdate;
    this.onRest = onRest;
    this.raf = null;
    this.last = 0;
  }

  /* Retarget without losing velocity — the difference between a redirect and a
     brick wall. Passing velocity explicitly is the gesture-release handoff. */
  to(target, { velocity, damping, response } = {}) {
    this.target = target;
    if (velocity !== undefined) this.v = velocity;
    if (damping !== undefined) this.damping = damping;
    if (response !== undefined) this.response = response;

    /* Settle instantly rather than animate when the motion can't be seen or
       isn't wanted. The hidden case matters: rAF is suspended in a background
       document, so a sheet opened there would sit offscreen behind its own
       backdrop until the user came back. Correct state beats a lost animation. */
    if (reducedMotion() || document.hidden) {
      this.x = target; this.v = 0;
      this.onUpdate?.(this.x);
      this.onRest?.();
      return this;
    }
    if (!this.raf) { this.last = performance.now(); this.tick(this.last); }
    return this;
  }

  set(x, v = 0) { this.x = x; this.v = v; this.onUpdate?.(this.x); return this; }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    return this;
  }

  tick = (now) => {
    const dt = Math.min((now - this.last) / 1000, 1 / 30);   // clamp tab-switch jumps
    this.last = now;

    const w = (2 * Math.PI) / this.response;   // angular frequency
    const k = w * w;                           // stiffness (unit mass)
    const c = 2 * this.damping * w;            // damping coefficient

    /* Substep so a stiff spring stays stable on a slow frame. */
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const a = -k * (this.x - this.target) - c * this.v;
      this.v += a * h;
      this.x += this.v * h;
    }

    this.onUpdate?.(this.x);

    if (Math.abs(this.v) < 0.02 && Math.abs(this.x - this.target) < 0.02) {
      this.x = this.target; this.v = 0;
      this.onUpdate?.(this.x);
      this.raf = null;
      this.onRest?.();
      return;
    }
    this.raf = requestAnimationFrame(this.tick);
  };
}

/* Where a flick would come to rest. Apple's exponential-decay projection from
   the Designing Fluid Interfaces sample — not the v²/2a textbook form, which
   lands somewhere else entirely. Snap to the target nearest THIS, not nearest
   the release point, or a flick doesn't throw. */
export function project(velocity, decelerationRate = 0.998) {
  return (velocity / 1000) * decelerationRate / (1 - decelerationRate);
}

/* Progressive resistance past a boundary. A hard stop reads as frozen; this
   reads as "still listening, but there's nothing more here". */
export function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/* Pointer drag with capture, grab-offset preservation and a short velocity
   history. Tracking survives the pointer leaving the element, and velocity is
   measured over the last few moves rather than the final pair, which would be
   noise at release. */
export function addDrag(el, { onStart, onMove, onEnd, axis = 'y', threshold = 10 } = {}) {
  let id = null, startX = 0, startY = 0, hist = [], decided = false;

  const pos = e => (axis === 'y' ? e.clientY : e.clientX);

  const down = e => {
    if (id !== null || e.pointerType === 'mouse' && e.button !== 0) return;
    id = e.pointerId;
    startX = e.clientX; startY = e.clientY;
    hist = [{ p: pos(e), t: performance.now() }];
    decided = false;
    onStart?.(e);
  };

  const move = e => {
    if (e.pointerId !== id) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;

    if (!decided) {
      const primary = axis === 'y' ? dy : dx;
      const other = axis === 'y' ? dx : dy;
      if (Math.abs(primary) < threshold) return;      // hysteresis before committing
      if (Math.abs(other) > Math.abs(primary)) { id = null; return; }  // wrong axis, let it go
      decided = true;
      el.setPointerCapture?.(e.pointerId);
    }

    hist.push({ p: pos(e), t: performance.now() });
    if (hist.length > 6) hist.shift();
    onMove?.((axis === 'y' ? dy : dx) - (axis === 'y' ? Math.sign(dy) : Math.sign(dx)) * threshold, e);
  };

  const up = e => {
    if (e.pointerId !== id) return;
    const wasDragging = decided;
    id = null; decided = false;
    el.releasePointerCapture?.(e.pointerId);

    /* px/s over the last ~80ms of travel, not the final two events. */
    let v = 0;
    const now = performance.now();
    const recent = hist.filter(h => now - h.t < 80);
    if (recent.length >= 2) {
      const a = recent[0], b = recent[recent.length - 1];
      const dt = (b.t - a.t) / 1000;
      if (dt > 0) v = (b.p - a.p) / dt;
    }
    if (wasDragging) onEnd?.(v, e);
  };

  el.addEventListener('pointerdown', down, { passive: true });
  el.addEventListener('pointermove', move, { passive: true });
  el.addEventListener('pointerup', up, { passive: true });
  el.addEventListener('pointercancel', up, { passive: true });

  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
  };
}
