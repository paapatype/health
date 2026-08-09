# Health

A personal health app. One screen that answers *what do I do today*, and a record of having done it.

Offline-first, installed to the iPhone home screen, all data on the device. No backend, no login, no analytics, nothing leaves the phone.

---

## Put it on your phone

1. Open the site in **Safari** (not Chrome — only Safari can install a home-screen app on iOS).
2. Share button → **Add to Home Screen** → Add.
3. Open it from the home screen icon from now on, not from a Safari tab.

That last point matters: notifications and standalone display only work from the installed app.

---

## Reminders — what actually fires

There is no server, so there is no push. Two mechanisms cover it, and they do different jobs.

### The calendar — the day's reminders

**Me → Settings → Add the day to your calendar.** Saves a `.ics`; open it and Apple Calendar imports it. You get repeating alarms for meals, supplements, skincare and water checkpoints — reliable, offline, no app involvement.

17 events. The workout and the bedtime snack repeat on training days only; everything else is daily.

**Re-export after changing a time in Settings**, or the alarms will disagree with the app.

### Shortcuts — the two that open the app

Tapping a calendar alert opens *Calendar*, not this app. For the morning ingredient check and the evening close-out you need to actually land in here, so those are Shortcuts automations instead. **Me → Settings → The two that open the app** lists the steps:

Shortcuts → Automation → + → Time of Day → 06:00 → Daily → New Blank Automation → **Open URLs** → paste the check URL → turn **off** "Ask Before Running" → Done. Repeat at 21:30 with the close-out URL.

Check the first one fires tomorrow morning before trusting it.

### In-app notifications

**Allow notifications** in Settings enables alerts *while the app is open*. That's the honest limit — it can't wake you up. The calendar does that.

---

## The daily loop

**Morning.** Today lists the perishables today's meals need. Tap anything you don't have — it goes to the Buy list in Food with the cheapest platform attached. Tap **Done** and it collapses to one line; it stays reachable.

**Through the day.** One ordered timeline, one tap per row. Water is counted in 1-litre bottles — tap a filled one to undo.

**Today's cooking** gives a note for the cook in plain Hinglish, with the method rules attached. Copy or share it.

**Night.** Close out today ticks off what's left, or "All done" clears the lot. Miss an evening and tomorrow offers to fill in yesterday — marked as filled in later, never rewritten silently.

---

## Editing your own data

Everything the app shows lives in `/data/*.json`. Edit them in the GitHub web UI and the change reaches the phone next time it opens.

| File | What's in it |
|---|---|
| `plan.json` | Phases, dates, the daily schedule, hydration target |
| `menu.json` | The 7-day menu, per-meal fresh ingredients, cook notes |
| `groceries.json` | 60 items, pack sizes, platform prices, aisle, staple/perishable |
| `workouts.json` | 3 phases, 18 sessions, 44 exercises with video links |
| `products.json` | Skincare, teeth, hair — tiered options with prices and sources |
| `supplements.json` | The stack, timings, prices |

Prices carry `confidence` (`verified` / `reported` / `derived` / `estimated`) and `checked_on`, both shown in the app. Change a price and the live-check figure at the bottom of Food's cost section moves with it.

The three tier totals are researched constants, not sums — they account for pack amortisation and delivery fees, which a naive sum of item prices can't. Edit those in `groceries.totals` directly.

---

## Backup

**Me → Settings → Export everything** writes a JSON file. That is your only backup — clearing Safari's website data deletes everything.

Import replaces what's on the phone. It refuses anything that isn't a Health backup.

---

## Privacy

The Tracker in Me keeps its **own** storage key, its **own** export, and never appears in the main backup, on Today, or in Food. It ships empty — nothing is stored until you enter it, and nothing about it is in this repository.

---

## Running it locally

```bash
python3 dev-server.py 8790
```

Then open `http://localhost:8790`. It's `python3 -m http.server` plus `Cache-Control: no-store`, because otherwise the browser serves stale modules after every edit. Dev only — never deployed.

---

## Deploying an update

Push to `main`; GitHub Pages redeploys.

**Bump `VERSION` in `sw.js` whenever you change HTML, CSS or JS.** The app shell is cached, so without a bump the phone keeps serving the old build. The app shows an "Update ready" bar once the new worker installs.

Data files under `/data` are stale-while-revalidate — they refresh on their own, no bump needed. The trade-off is that an edit shows up on the *second* open, not the first.

---

## What it's built from

Vanilla HTML, CSS and ES modules. No build step, no dependencies, no CDN — it works offline and it'll still work in three years. Apple HIG for the type scale, system colours, inset grouped lists and 44pt targets, with two documented deviations:

- **System colours are hardcoded** in `css/tokens.css`. Apple says not to; there is no `UIColor` on the web. They may drift from iOS between releases.
- **Inactive tab labels are darker than systemGray**, which sits at 3.8:1 on the light tab bar — under WCAG AA. Nudged to clear 4.5:1 in both themes.

---

*Estimates, not lab values. Not medical advice — clear the supplement stack with a GP, hair loss with a dermatologist, and any whitening with a dentist.*
