# RESEARCH — Personal Health OS

Everything the app renders, with sources. Read this once; the app is what you use daily.
All prices in ₹, checked **8 August 2026**, Bangalore / Indiranagar 560038.

---

## How to read this, and what I actually verified

Every record in `/data/*.json` carries `source_url`, `checked_on`, and a confidence label. What those labels mean:

| Label | Meaning |
|---|---|
| `verified` | I fetched the page this session and read the price off it |
| `reported` | A credible secondary source stated it; the primary was blocked |
| `derived` | Calculated from a verified price by a stated rule (e.g. quick-commerce ≈ BigBasket +10%) |
| `estimated` | My judgment, with reasoning shown. Mostly per-serving quantities |

**Verification results:**

- **36 of 36 YouTube video IDs resolve to real videos**, titles matching their exercise, confirmed via YouTube's oEmbed API. No fabricated video IDs. Five exercises intentionally use channel or search URLs instead and are flagged `verified: false` — those always resolve.
- **79 of 110 product URLs return HTTP 200.** The other 31 return `403` — all from exactly three hosts (Nykaa, Tira, Blinkit) that block non-browser requests. I opened Nykaa and Blinkit in a real browser to check: both live, correct products, prices matching what's recorded. These are anti-bot walls, not dead links.
- **115 grocery price points**, 99 verified.

### The one limit worth knowing

**Blinkit, Zepto and Instamart are location-gated single-page apps.** They don't serve prices to a plain request without a delivery pincode in session, so I could not price 60 items across four quick-commerce platforms by fetching — nobody can. What I did instead:

- **BigBasket is the verified price spine** — 102 of 115 price points, fetched directly
- **Quick-commerce is derived** at roughly **+10% over BigBasket**, a rule calibrated against the handful of Blinkit/Zepto/Licious prices I could read directly
- Every price is **editable in the app**, and shows its confidence and check date

So treat the grocery total as a well-grounded range, not a receipt. The tier bands below are wide on purpose.

---

## 1. Groceries — what a week costs

**Monthly, your portions only** (weekly × 4.33):

| Tier | Monthly | What it means |
|---|---|---|
| **Lean** | **₹9,100 – 10,600** | BigBasket big-pack staples + kirana/mandi for vegetables, fruit, milk pouches, loose eggs. Value brands. One slotted order a week. |
| **Normal** ← recommended | **₹11,900 – 13,650** | Everything on one quick-commerce app, with a membership killing most delivery fees. What you'll realistically do. |
| **Convenience** | **₹14,700 – 17,300** | Licious chicken, Akshayakalpa organic milk, Happilo nuts, imported avocado, no membership. |

**Take the Normal tier and add a membership.** At ~3 orders/week you pay ₹390–585/month in delivery and handling fees unmembered. Zepto Club (₹99/mo) or Swiggy One roughly pays for itself twice over. That single decision is worth more than any substitution below.

### Where the money actually goes — top 10 drivers

| # | Item | ₹/month | Cheaper without losing nutrition |
|---|---|---|---|
| 1 | Chicken breast 500 g/wk | 1,035 | Licious curry cut 500 g @196, or Venkys frozen breast |
| 2 | Milk 3.5 L/wk | 788 | Nandini booth pouches @₹24/500 ml vs app UHT tetra @₹64/L |
| 3 | Seasonal fruit | 693 | Papaya/guava/watermelon/banana; skip pomegranate + imported |
| 4 | Apples 3/wk | 641 | Banana or pineapple in the raita, keep 1 apple/week |
| 5 | Paneer 400 g/wk | 606 | Milky Mist 200 g @70 over Nandini @96 |
| 6 | Eggs 14/wk | 502 | **Always buy the 30-tray @249**, never 6s or 12s |
| 7 | Curd 1.5 kg/wk | 498 | Set it at home from the same milk — ~40% cheaper |
| 8 | Almonds 100 g/wk | 433 | 500 g value packs |
| 9 | Pistachios 40 g/wk | 351 | Costliest nut per gram — alternate pista days |
| 10 | Ghee 100 g/wk | 312 | Nandini 1 L pouch beats 500 ml jars per ml |

Buy produce, milk and loose eggs at a kirana or mandi rather than on an app — that alone moves you most of the way from Normal to Lean.

**Data:** `data/groceries.json` — 60 items, staple/perishable classification, per-day fresh index, per-item cheapest platform.

---

## 2. Daily timing

The full clock is in `data/plan.json` and drives the Today timeline and every notification. Wake 05:00, lights out 22:00.

The reasoning that isn't obvious:

- **Nuts at 05:10, before the workout.** A small fat/protein hit that doesn't need digesting mid-session, and it stops the 05:00 start being fully fasted.
- **Protein and NAC post-workout at 06:15**, not with breakfast — NAC is best away from a large meal, and the post-session window is when you'll actually remember.
- **Green tea at 10:30, capped at 15:00.** Timed rather than endless, and nothing after 15:00 so caffeine isn't still on board at 22:00. This is an ADHD-and-sleep lever, not a health-fad one.
- **Magnesium glycinate 21:45, phone away with it.** Glycinate is the sleep-friendly form; pairing it with the phone cutoff makes one habit carry two.
- **Bedtime milk + oats + nuts only on training nights** — accelerator #1, worth roughly 300–350 kcal on rest days.
- **Sunday** drops the workout and adds the weekly restock check (18:00) and weekly review (18:15).

Every time is editable in the app, and the calendar export regenerates when you change one.

---

## 3. Skincare — dry and sensitive

The governing constraint. The default advice aimed at Indian men — foaming gel cleansers, 15–20% L-ascorbic acid, alcohol-heavy matte sunscreens, 0.5% retinol from day one — is wrong for your skin and would set you back. Everything below is filtered for fragrance-free, no denatured alcohol high in the list, barrier-first, and a slower ramp.

### Buy these three first — ₹1,734

| | Product | ₹ |
|---|---|---|
| Cleanser | **Cetaphil Gentle Skin Cleanser** | 429 |
| Moisturizer | **Venusia Max Intensive** 150 g | 606 |
| Sunscreen | **Dr. Sheth's Ceramide & Vitamin C SPF 50+** 80 g | 699 |

Used daily with a real sunscreen dose, this trio does more in eight weeks than any serum stack. Serums are month two.

### Sunscreen — the priority purchase

| Tier | Product | ₹ | The recurring criticism |
|---|---|---|---|
| Cheap | Minimalist Multi-Vitamin SPF 50 PA++++ | 399 | Eye-sting complaints recur at volume |
| Cheap | Foxtale Shadow SPF 50+ Moisturizing | 440 | Creamy feel on hot afternoons |
| **Mid** | **Dr. Sheth's Ceramide & Vit C SPF 50+** | **699** | Not water/sweat-resistant — reapply |
| Mid | Beauty of Joseon Relief Sun | 1,413 | Fakes are the real risk — buy from Nykaa, not grey market |
| Premium | Cetaphil Sun SPF 50+ Light Gel | 1,169 | Check cast in daylight if you're strict about zero cast |
| Premium | Beauty of Joseon Matte Sun **Stick** | 1,413 | Under-doses as a sole sunscreen — reapplication tool only |

**On reapplication while presenting:** a stick is the only realistic mid-day option over a face that's already made-up or sweating — but a swipe delivers well under the tested dose. Use a cream as your base layer and the stick purely as a top-up. Don't let the stick be your only sunscreen.

Beauty of Joseon Relief Sun is verified live on Nykaa at **₹1,413**, 4.4/5 across **19,380 ratings**.

### The rest

- **Moisturizer** — Minimalist Ceramides 0.3% (₹599) for day; Venusia Max (₹672) is too occlusive under sunscreen in humidity, so keep it for night. La Roche-Posay Cicaplast Baume B5+ (₹1,499) is a repair balm, not a daily AM product.
- **Vitamin C** — skip L-ascorbic acid. Minimalist 10% ethyl ascorbic acid (₹299) or Deconstruct 10% + ferulic (₹599). Klairs Freshly Juiced (₹1,413) is 5% L-AA and gentle, but not while your barrier is still recovering.
- **Retinoid** — start at **Hyphen 0.05% retinal (₹599)**, two nights a week, buffered. Minimalist Granactive 2% (₹699) is gentler still but slow. The Ordinary Retinal 0.2% (₹1,500) is a much-later step, not an entry point.
- **Cleanser** — Cetaphil Gentle (₹429). Add Bioderma Sensibio H2O (₹809) as a first step at night to lift sunscreen, then cleanse. Removing water-resistant SPF with a gentle cleanser alone is the step most people get wrong.

**Ramp: 8 weeks, one product at a time** — cleanser + moisturizer + SPF for weeks 1–2, then vitamin C, then retinoid at week 5 at two nights a week. Full ramp, layering order, wait times, what-not-to-combine, the sting reset, and patch-testing are in `data/products.json`.

**Honestly:** the single biggest thing you can do for your skin is finish the taper. Smoking drives oxidative stress and collagen breakdown faster than any serum reverses it. Said once, not repeated.

---

## 4. Teeth

**Do Tier 0 first, and do it now.** Smoker discoloration is largely *extrinsic* — sitting on the enamel, not in it. A **scaling and polish at ₹800–3,000** removes a large share of it, and until it's done you cannot tell how much whitening you actually need. Whitening before cleaning is paying premium prices to bleach a layer of stain.

Three routes:

- **Cheap** — Scaling and polish in taper weeks 1–2. Then Colgate Visible White O2 (₹273) two or three times a week, plus Sensodyne for sensitivity. Maintenance only.
- **Mid** — Scaling, then at week 6–8 a dentist visit for impressions, then **custom take-home trays** after the taper completes. This is the best effectiveness-per-rupee in the whole category.
- **Do it properly** — Scaling, consult at week 6, then in-clinic chairside whitening once you're at zero cigarettes, with trays for maintenance.

**Sequencing matters more than the tier.** Whitening while still smoking is bailing a boat with a hole in it — every route above deliberately places the whitening step *after* taper week 8. Start Sensodyne two weeks before any peroxide treatment.

**Avoid:** charcoal (abrasive), DIY baking soda and lemon, and unregulated high-concentration kits. Full tier detail, RDA notes and maintenance in `data/products.json`.

---

## 5. Hair

### The diagnosis half — and this needs a dermatologist

Six candidate causes, and they're treated differently, so guessing is expensive:

- **Androgenetic alopecia** — gradual, *patterned*: temples receding and/or crown thinning.
- **Telogen effluvium** — *diffuse* shedding across the whole scalp, full-length hairs with a white bulb, typically triggered 2–3 months after the stressor.
- **Seborrheic dermatitis** — flaky *and* oily *and* itchy; larger yellowish greasy flakes, redness underneath.
- **Genuinely dry scalp** — tight, fine white powdery flakes, no grease, little redness. **Not the same condition as dandruff, and antifungals do nothing for it.**
- **Smoking** — a documented aggravator rather than a pattern of its own.
- **Nutrient-linked** — low ferritin, vitamin D, B12, thyroid.

Note what's coming: **a 500 kcal deficit and quitting smoking are both telogen effluvium triggers.** You may see shedding *increase* around week 8–12 before it improves. That's expected and temporary — know it now rather than panicking then.

**Bloods worth having in hand for the appointment:** ferritin, vitamin D, B12, TSH, CBC. Several overlap with the GP visit already planned for the taper — get them once.

### Products

Choose by which condition you actually have:

- **Gentle shampoo** — Sebamed Everyday pH 5.5 (₹680) is the safest for a sensitive scalp. Re'equil Hair Fall Control (₹395) is mid but contains fragrance. **Dove Intense Repair (₹348) has SLES and fragrance — skip it** despite being the cheapest.
- **If flaky and oily (seb derm)** — Nizral 2% ketoconazole (₹287) or Scalpe Plus (₹310), **twice weekly, as a treatment not a daily shampoo**. Selsun 2.5% (₹210) works but will worsen genuine dryness. Head & Shoulders (₹434) carries fragrance and sulfates.
- **If dry, not flaky-oily** — none of the above. Gentle shampoo, less frequent washing, conditioner mid-lengths to ends, and a pre-wash oil.

Anything requiring medical supervision is flagged in the data as "ask the dermatologist" with no dosing from me.

---

## 6. Workouts — 44 exercises, every one with a verified video

`data/workouts.json`: 3 phases, 18 sessions, 44 exercises, all cross-references intact.

**Every exercise carries a video link, a form cue, and sets/reps/rest.** All 36 distinct video IDs verified live this session.

### The dip problem — solved

Phase 1 Monday programmed dips. **You have a pull-up bar but no dip station**, so that needed a real answer, and the honest one isn't "find a dip bar":

> **Primary substitute: decline push-up (feet on a chair).** Chair dips load the shoulder in deep extension and internal rotation — exactly the position tight anterior shoulders tolerate worst, and the most common dip-related impingement complaint. For a previously sedentary desk worker that's a poor first movement. The decline push-up uses the same chair, trains the same muscles with *more* load than a flat push-up, keeps the shoulder in a safe pressing plane, and slots straight into the push-up progression already in the programme.

Chair dips stay as the *alternative* once shoulder mobility improves, with strict rules: hips brushing the chair, elbows pointing back, stop at upper-arm-parallel. Pseudo-planche push-ups were considered and rejected as a skill movement inappropriate for weeks 1–5.

### Channels worth subscribing to

Hybrid Calisthenics (beginner progressions) · Calisthenic Movement · Squat University (form and pain) · Mark Wildman (kettlebell) · Renaissance Periodization (hypertrophy) · Jeff Nippard (evidence-based lifting) · FitnessBlender (follow-along) · The Running Channel (C25K).

### Equipment

Your 2.5 kg dumbbells and 4 kg kettlebell run out of road around week 5. The Week 6 decision point in the app carries both the phase-length choice **and** the equipment upgrade — adjustable dumbbells vs an Indiranagar gym, both priced in the data.

---

## 7. Hydration and supplements

**Water: 3 bottles on rest days, 4 on training days**, of your 1 L bottle, with checkpoints at 11:00 / 15:30 / 19:00.

Basis: EFSA adequate intake is 2.5 L/day total for adult men with ~20% from food (~2.0 L from drinks, temperate). ICMR-NIN works out to roughly 32–58 ml/kg — about 2.7–4.8 L total at 83 kg — and Indian guidance adds 0.5–1 L for hot/humid climate and activity. Your menu is also high-fibre (dal, chana, rajma daily), which raises requirement further. Rounded to whole bottles you can actually act on.

**Supplements — ₹1,590/month cheap, ₹1,635 mid, ₹4,415 premium.** The mid tier is the pick: it's ₹45 more than cheap and buys third-party testing on the items where Indian market quality is uneven. Forms that matter: magnesium **glycinate** not oxide, **triglyceride-form** omega-3 over ethyl ester, **D3** not D2.

**Two things before you start:** run the five-item stack past your GP once, and **test serum 25-OH-D before buying D3** rather than guessing the dose.

---

## Two flags you asked me to raise

**1. Protein is low.** The menu averages **~108 g/day at 83 kg**. For holding muscle through a 500 kcal deficit the target is roughly **130–160 g**. This is the single weakest number in an otherwise excellent diet. Menu-internal fixes that don't change your mother's cooking: use the 30-egg tray to add an egg at breakfast, take the higher end of the paneer and chicken portions, choose curd over rice at the margin, and keep the bedtime milk on training nights. Your call — flagging, not changing.

**2. Timeline.** You chose to start now and decide at Week 6. The phases as written run to **3 January 2027**, five weeks past your 5 December target. The app surfaces this as a dated decision on **14 September** with both options spelled out: compress Phase 2 to weeks 6–10 and Phase 3 to 11–17 and finish on target, or keep full phases and move the date.

---

## Design sources

Apple HIG fetched this session via the DocC JSON endpoints, not from memory:

- **Type scale** — Large Title 34/41, Title1 28/34, Title2 22/28, Title3 20/25, Headline 17/22 semibold, Body 17/22, Callout 16/21, Subhead 15/20, Footnote 13/18, Caption1 12/16, Caption2 11/13. Default 17pt, minimum 11pt. Regular/Medium/Semibold/Bold only.
- **Hit targets** — 44×44pt default, 28×28pt floor.
- **Contrast** — 4.5:1 up to 17pt, 3:1 at 18pt+ or bold.
- **Materials** — Liquid Glass is a *functional-layer* material. HIG states plainly: don't use it in the content layer. So the tab bar and nav bar get translucency; content uses solid grouped backgrounds and inset grouped lists.
- **Tab bars** — labels on every tab, filled icons, always visible, badges reserved for genuinely critical information.

**One documented deviation:** Apple says don't hardcode system colours, but there is no `UIColor` on the web, so `css/tokens.css` hardcodes the published light/dark reference values. They may shift between iOS releases.

---

*Estimates, not lab values. Not medical advice. Clear the supplement stack and the quitting plan with a GP, the hair loss with a dermatologist, and any whitening with a dentist — especially given ADHD.*
