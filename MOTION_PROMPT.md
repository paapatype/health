# MOTION PROMPT — animation pass on the Health app

> Paste this into a fresh Claude Code session from `/Users/paapatype/HEALTH URGENT`. It is self-contained.

---

## 0. WHAT YOU'RE WORKING ON

A single-user health PWA. Vanilla HTML/CSS/ES modules, **no build step, no npm, no CDN, no framework** — it must work offline and still work in three years. Live at `https://paapatype.github.io/health/`, repo `paapatype/health`.

Relevant files:

| File | What's in it |
|---|---|
| `css/tokens.css` | Type scale, colours, **motion tokens** (`--ease-bounce`, `--ease-out-soft`, `--duration-*`, `--stagger-step`) |
| `css/app.css` | All components. The tick, water dots, chips, entrance keyframes |
| `js/motion.js` | Hand-rolled `Spring` (damping + response), `addDrag`, `project()`, `rubberband()` |
| `js/ui.js` | Sheet — spring-driven, drag-to-dismiss, velocity handoff |
| `js/app.js` | Router, `playEntrance()` stagger, inline SVG icons |
| `js/views/today.js` | The daily loop: morning check rows, timeline, ticks, water |

**Read `js/motion.js` and the motion sections of `css/app.css` before changing anything.** There is already a spring implementation and a token system — extend them, don't start a parallel one.

### Motion that already exists (don't rebuild it)

- **The tick**: press (instant, scale 0.88) → green disc blooms from centre with overshoot (420ms, `--ease-bounce`) → checkmark draws itself via `stroke-dashoffset` on a `pathLength="1"` path (340ms, 130ms delay).
- **Screen arrival**: rows and headers fade+rise, 34ms stagger, capped after 10 items.
- **Sheet**: spring (damping 0.8, response 0.38), 1:1 drag, rubber-band, momentum projection.
- **Water dots**: radial fill with overshoot, 460ms.
- **Chips**: `chip-in` pop, 320ms — this is what you're replacing in §2.

---

## 1. MAKE THE TICK SLOWER

The staged tick is right in structure and slightly too quick in execution. **Keep all three stages and their ordering. Stretch the expressive half only.**

- The press response stays exactly where it is. It must never wait.
- The fill and the draw should read as unhurried but not laboured. Somewhere near a third slower is the starting hypothesis — tune it, don't just multiply.
- Preserve the overlap: the check starts drawing while the fill is still settling. If you slow both by the same factor the overlap survives; if you slow one, re-time the delay so it still starts mid-fill.
- Unticking should stay quicker than ticking. Undoing something shouldn't feel as ceremonial as completing it.

Report the before/after numbers.

---

## 2. THE have/need PILL — MAKE IT TRANSFORM, NOT SWAP

**Where:** the Today tab, "Today needs" section. Each ingredient row (Eggs, Milk, Paneer…) has a pill on the right reading green **have** or red **need**. Tapping the row flips it.

**What's wrong:** the pill is destroyed and rebuilt (`.trailing.innerHTML = …` in `renderMorningCheck`), so a 320ms pop plays on a brand-new node. Nothing carries across. It reads as a swap, not a change.

**What I want:** *"half changes into the other"* — a transition where, partway through, you can see one state becoming the other. Green→red and red→green. **Not sudden, not slow.** Deliberate, and over quickly.

Candidate approaches — research them, pick one, and justify the choice:

- **Flip on the Y axis.** At 90° you see the edge; one face becomes the other. Literally half-and-half mid-flight.
- **Colour wipe via `clip-path`.** The new state sweeps across the pill. Direction should carry meaning — arriving from the side the finger came from, or from the leading edge.
- **The View Transitions API** (`document.startViewTransition`). Native, zero dependencies, made exactly for morphing between two DOM states. **Verify current Safari/iOS support before relying on it** — check the real compatibility data, don't assume — and make it a progressive enhancement with a CSS fallback if support is partial.
- **Crossfade the two states stacked**, one scaling in as the other scales out.

Constraints on whichever you choose:
- The word changes too, not just the colour. Handle the text, not only the background.
- It must survive rapid tapping — tap five times fast and it must not desync or leave a half-rendered pill.
- **Do not reintroduce a re-render.** The row updates in place; that was a real bug once (a tap used to rebuild the screen and hurl the page to the timeline). Keep the DOM node and mutate it.
- The "N to buy" counter on the Done row updates at the same moment. Consider whether it should animate in sympathy or stay still — argue your call.

---

## 3. RESEARCH — THEN USE JUDGMENT

Go and look at how good apps actually do this. Real sources, fetched this session. Worth your time:

- Emil Kowalski's writing on animation, and Vaul/Sonner as reference implementations
- Material Design 3 motion — easing sets, choreography, "expressive" vs "standard" tokens
- Apple HIG motion, and the *Designing Fluid Interfaces* principles already applied here
- Val Head / Rachel Nabors on interface animation and choreography
- The View Transitions API docs and current browser support
- What Linear, Things 3, Streaks, Apple Fitness, and Duolingo do for completion moments and state changes

**Then apply your own judgment.** I'm not asking for a checklist — I'm asking you to decide what this app specifically needs. The bar for adding anything:

> Does this make the app clearer, more satisfying, or more legible at 5am? Or is it decoration that will annoy me by week three?

I open this twice a day, every day, for months. Motion I'll see hundreds of times must be *calm*. A flourish that delights once and irritates thereafter is a net loss. Restraint is part of the brief.

**Places I suspect are worth looking at** — investigate, don't assume:

- Completing the last item in a section, or closing out the day. Right now finishing everything looks the same as finishing one thing. A completion moment might be earned here — and might not.
- The tab bar. Switching tabs is instant and flat.
- The Buy list badge appearing and incrementing.
- Numbers that change (water count, "N to buy", monthly costs) — they jump.
- The sheet's content, which currently arrives fully formed as the sheet slides up.
- Row press feedback generally — the tick has care, ordinary rows don't.
- Going back from a sub-screen: forward and back look identical, which breaks the spatial rule that things should leave the way they came.

**Places I suspect motion would be wrong** — push back if you disagree:

- The morning check list itself. I'm scanning eleven items at 6am; motion between me and information is a tax.
- Anything that delays reading a number or a price.
- The timeline's "now" indicator — it should be calm, not attention-seeking.

---

## 4. HARD CONSTRAINTS

- **No npm, no CDN, no framework.** Extend `js/motion.js` if you need new primitives.
- **Compositor-friendly only** — `transform`, `opacity`, `clip-path`, `filter`. Do not animate layout properties. Use `will-change` where motion is imminent and remove it after.
- **Response stays instant.** Press feedback on pointer-down, never on release.
- **Never re-render a screen for a state change.** In-place DOM mutation. This app had a bug where tapping a checkbox rebuilt the page and jumped the scroll; do not recreate it.
- **`prefers-reduced-motion`** — a gentler equivalent, not nothing. Movement and overshoot go; opacity and colour stay, because those are what confirm a tap registered. The entrance stagger is skipped entirely.
- **Respect the existing token system.** New durations and curves become tokens in `css/tokens.css` with a comment explaining the value. No magic numbers inline.
- **Bump `VERSION` in `sw.js`** or the phone keeps serving the old shell.

---

## 5. VERIFICATION — AND A REAL OBSTACLE

**You cannot watch these animations from the agent browser.** A hidden document freezes CSS transitions and suspends `requestAnimationFrame`, so computed values sit at their start state and nothing progresses. Previous sessions burned a lot of time rediscovering this.

So:

1. **Verify definitions, not appearance.** Assert computed `transition-duration`, `animation-name`, `animation-delay`, keyframe values, and the final state with transitions disabled. That proves correctness even when you can't see it.
2. **Build a slow-motion debug toggle.** A URL flag or console hook (e.g. `?slowmo=6`) that multiplies every duration. Reviewing motion frame by frame is standard practice and this codebase has no way to do it. Keep it out of the production path.
3. **Test rapid interaction explicitly.** Fire five taps in quick succession at the pill and the tick; assert the end state is correct and no node is left mid-animation.
4. **Then be honest.** State plainly which parts you verified numerically and which need judging on a real phone. Do not claim something "feels" right when you could not see it.

Also confirm, as always: all routes render, console clean, scroll position preserved through every tap, both themes, reduced-motion path.

---

## 6. ANTI-PATTERNS

- Confetti, sparkles, celebratory particles. This is a health tracker, not a game.
- Bounce on anything the user didn't physically throw. Overshoot is earned by momentum — a menu that faded in has no business overshooting.
- Animating everything because you can. Every addition needs a reason you can defend.
- Long enough to wait for. If I ever tap and *wait*, it's too slow.
- Motion that moves content I'm trying to read.
- Different easing curves everywhere. A house style, applied consistently, reads as craft; variety reads as noise.

---

## 7. DELIVERABLE

Working code, deployed, plus a short note covering:

- The tick's before/after numbers.
- Which pill technique you chose and **why you rejected the others**.
- What your research turned up that actually changed a decision — not a reading list.
- Everything you added beyond the two things I asked for, each with its justification.
- Anything you considered and deliberately left alone, and why. This matters as much as what you built.
- What still needs judging on a real phone.
