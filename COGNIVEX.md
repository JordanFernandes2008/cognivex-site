# COGNIVEX — full handoff

Last verified: 2026-09-19. Commit `1320ab8`. Local, `origin/main` and the live
site all agree.

---

## 1. What this is

A static marketing site for Cognivex — an approval-first AI assistant that
drafts your admin and waits for you to say yes. The product is **in development
and not available**; the site says so and must keep saying so.

The homepage carries an interactive demo (a fake product window) and **Levi**, a
companion light that follows you down the page and talks about what you are
looking at.

### Deploy

| | |
|---|---|
| Working tree | `C:\Users\LENOVO_17\Downloads\cognivex-rebuild` |
| Repo | `github.com/JordanFernandes2008/cognivex-site`, branch `main`, public |
| Live | `https://cognivex-site.vercel.app` (Vercel team *digital coyotes*) |
| Also live | `https://cognivex-eight.vercel.app` — **a second Vercel project on the same repo.** Serves identical output. Probably wants deleting. |
| Retired | `C:\Users\LENOVO_17\Downloads\cognivex-site` — old single-page build, still on disk, **do not edit** |

**Never create a new repo or Vercel project.** Edit the existing ones.

---

## 2. How to run and ship

No build step. Static HTML/CSS/JS served from the repo root.

```bash
# local — any static server on the repo root; the dev one runs at
http://127.0.0.1:4193/
```

Local serving differs from production in one way: Vercel has `cleanUrls: true`,
so `/how-it-works` works live but **404s locally** — use `/how-it-works.html`
when testing. Several "404" panics this session were this and nothing else.

### Shipping — the only workflow

```bash
python _stamp-assets.py
git add -A; git commit -m "..."; git push
```

`_stamp-assets.py` rewrites `?v=<hash>` on every asset reference from the file's
own bytes. **Any new `.js` or `.css` must be added to its `ASSETS` list and any
new page to `PAGES`, then the script re-run**, or the file ships uncached and
stale for returning visitors.

PowerShell 5.1: use `;` not `&&`. `gh` is not installed. Jordan runs git himself.

---

## 3. File map

### Pages
| File | Size | Notes |
|---|---|---|
| `index.html` | 51 KB | homepage; the only page with the demo or Levi |
| `how-it-works.html` | 9.0 KB | 3.9 screens |
| `capabilities.html` | 9.4 KB | 4.1 screens |
| `trust.html` | 9.1 KB | 4.0 screens |
| `about.html` | 7.0 KB | 2.4 screens |
| `contact.html` | 6.8 KB | 2.3 screens; **deliberately has no form fields** — brief says contact stays a marked empty box |
| `404.html` | 5.3 KB | served by Vercel for unmatched routes |

### Styles
`site.css` — 138 KB, single stylesheet, all pages.

### Scripts, in load order on the homepage

| # | File | Size | What it does |
|---|---|---|---|
| 1 | `boot.js` | 4.3 KB | **blocking, in `<head>`.** Cold-start gate: session guard, path guard, and arms `panic()` on a 4600 ms cap *before* `cold.js` is requested |
| 2 | `cold.js` | 19 KB | `defer`. The cold-start timeline; blocks input while it runs, releases via `panic()` whatever happens |
| 3–6 | `vendor/gsap`, `ScrollTrigger`, `SplitText`, `lenis` | 141 KB | unstamped, matching the existing vendor convention |
| 7 | `queue-butler.js` | 9.1 KB | 18 non-email demo items (calendar, payments, orders, bookings, documents, subscriptions, deliveries) |
| 8 | `queue-data.js` | 24 KB | 47 email/invoice/post/reminder items **+ the renderer** that injects all of them into the queue. Runs before `site.js` so the counter is right on first paint |
| 9 | `site.js` | 41 KB | owns the approval queue: approve / edit / skip / counter / record / reset |
| 10 | `digest.js` | 12 KB | **owns the right-hand panel** and its three views: briefing, reading pane, approval list |
| 11 | `rail.js` | 4.9 KB | makes "CAME IN THIS MORNING" rows into buttons; owns no UI, hands payloads to `digest.js` |
| 12 | `today.js` | 4.2 KB | same for the four TODAY buckets |
| 13 | `cursor.js` | 9.1 KB | custom cursor |
| 14 | `walk.js` | 3.8 KB | the walkthrough section |
| 15 | `film.js` | 6.5 KB | the black hole / accretion film |
| 16 | `levi-home.js` | 2.6 KB | Levi's 8 zone lines + 6 idle lines. **Data only** |
| 17 | `levi.js` | 61 KB | Levi: zones, flight, chatbox, drag, queue reactions |
| 18 | `motion.js` | 17 KB | GSAP scroll choreography, Lenis smooth scroll, the `.loop` pin |

**`levi3d.js` (11 KB) and `vendor/three.module.min.js` (671 KB) exist but are
NOT loaded.** See §7.

### Media
`media/singularity.mp4` 555 KB · `media/singularity-poster.jpg` 59 KB

---

## 4. What is built

### 4.1 The demo window

A fake product window in the hero, fixed at **650 px tall** with three views in
the right panel. It never resizes — content scrolls inside it.

**Left rail** (list, never expands in place):
- `41 came in / 5 need a decision / the other 36 handled or filed`
- **TODAY**: Needs you 5 · Drafted 12 · Sent 8 · Waiting on reply 5 — each opens in the panel
- **CAME IN THIS MORNING**: 9 rows — each opens in the panel with what Levi did and the draft

**Right panel**, three views:
1. **Briefing** (default) — the morning in three groups: Your inbox, Tomorrow, Money. Four rows are openable.
2. **Reading pane** — one item: kind, title, state, the draft, "why this", actions.
3. **Approval list** — all 68 queue cards, approve / edit / skip.

`← the morning` returns to the briefing. One row is highlighted at a time
across both lists; selection is owned by the panel.

**68 queue items across 11 kinds**: Email reply, Invoice, Social post, Reminder,
Calendar, Payment, Order, Booking, Document, Subscription, Delivery. Each has a
sender, a draft, a "why this draft", and a line Levi says about it.

The party is deliberately **two** items — the food (held, not ordered) and the
amount (₹8,600, approve to place and pay). Its "why" carries the rule: *"One
amount, one decision. Approving this does not become a standing permission to
spend — the next one asks again."*

### 4.2 Levi

- **Look**: three blurred flat shapes — core 30 px `blur(14px)`, corona 120 px `blur(34px) saturate(1.7)`, flare 300 px `blur(100px)`, all `mix-blend-mode: screen`. **No gradients** — a blurred solid has no stops to band and no circumference to see. Light pages get a small dense point instead, since screen-blend is a no-op on white.
- **Zones**: declared in markup as `data-levi-zone` bands, zero layout height. 9 bands for 8 zones (the hero has two).
- **Flight**: arrive-and-wander steering, `MAXV 520 px/s`, force-limited, with a deterministic arc that peaks mid-journey. Same trip, same curve, every time.
- **Chatbox**: dark bordered box, "LEVI" label, text typed at ~77 chars/sec with a blinking caret.
- **Drag**: `cursor: grab`, pointer events. Holds where you drop it within that section, resumes following in the next.
- **Queue reactions**: reads each card's own line; reacts to approve ("Sent. That one is done with.") and skip ("Skipped. It stays in the list.").
- **Keep-out**: the demo panel is absolutely off limits — verified 0 breaches across 5 scroll positions.

---

## 5. Known bugs and open defects

### 5.1 Levi's chatbox overlaps body text — **UNRESOLVED**

**13 overlaps** measured at 1536×830 across hero, walk, nightwork, loop, ledger,
position. The light also crosses `A.cta` in the hero.

Root cause is geometric, not a tuning problem:

```
chatbox width   328 px
hero gutter     241 px
```

There is no column on the page wide enough, and no *height* that helps either —
the lower half of each section holds the controls, the upper half holds the copy.
I tried capping the holding lane at 58 % of the viewport: it traded `LIGHT over
A.cta` for box-on-text in six sections (4 → 14). Reverted.

**Four ways out, needs a decision:**
1. Narrow the box to ~200 px so it fits the gutter (more wrapping, ~4 lines per sentence)
2. Dock it to a fixed corner (never overlaps; stops following him)
3. Show it only on click (overlap only when asked for)
4. Let the **light** cross copy but never the **box** — needs the "nothing fixed may overlap body text" rule relaxed for the glow

Recommended: **1 + 4**.

### 5.2 The hero is silent below 30 % scroll — **UNRESOLVED**

Levi speaks at the top of the hero (band A, 760×270, ample) and goes quiet below,
because the only free column down there is a 170 px gutter and the light needs
214 px. Two fix attempts failed; stopped per the brief's "if a fix fails twice,
ask" rule.

Options: shrink the light in the hero only (78 px radius still needs 180 > 170);
let the glow cross the copy column; or accept it and let him hold in the lane
until `walk`. **Recommended: accept it.**

### 5.3 Levi is homepage-only

`levi.js` is only loaded by `index.html`. The other five pages have no companion.
Adding him needs per-page zone bands **and** per-page scripts, or he will say
homepage things on Trust.

### 5.4 Homepage is 10.9 screens on mobile

Desktop is ~9,100 px. Mobile is long. Jordan has asked twice for pages to "go
straight to the point"; this is the one that does not.

### 5.5 Minor

- One tap target under 36 px on mobile.
- GSAP/ScrollTrigger use `cssText`, which the CSP meta tag (`style-src 'self'`, no `unsafe-inline`) blocks. Console noise; one GSAP feature silently degraded.
- `levi3d.js` is still in `_stamp-assets.py`'s ASSETS list though it is not loaded. Harmless; tidy when convenient.

---

## 6. Decisions waiting on Jordan

1. **Chatbox placement** — pick from §5.1. Blocks the last real Levi defect.
2. **Hero lower half** — pick from §5.2.
3. **The asset route.** Recommended and unbuilt. A pre-rendered breathing light would beat anything CSS can do:
   - 512×512, displayed ~200 px (2× for retina)
   - 6–8 s seamless loop
   - **transparent alpha**, not black — the light pages need it
   - VP9 WebM with alpha (`yuva420p`) + HEVC-with-alpha MP4 for Safari
   - under 400 KB
4. **Levi's voice lines** — a set was drafted and is awaiting approval. Jordan has said he will supply his own; Levi's dialogue is parked until then.
5. **"Emotions like that stupid meme verity"** — the reference is unknown. Needs an image or a name.
6. **Lottie** — evaluated and **recommended against**. Lottie's value is interpolating vector shapes; Levi is a blur stack with no vectors. ~160–250 KB minified for a win a JS spring already gives free.
7. **The second Vercel project** (`cognivex-eight`) — delete?

---

## 7. Why Three.js was removed

Levi was briefly a real 3D object: flat-shaded icosahedron, four octahedron
spikes, two directional lights. It read as **a rocky ball**, which was the
correct criticism.

The only justification for geometry was that additive light has no silhouette,
so you cannot see it rotate — facets fixed that. A soft glowing ball has no
facets either, so the geometry had nothing left to do, and it was costing
**682 KB plus a WebGL context** for an effect that is invisible.

`levi3d.js` and `vendor/three.module.min.js` are still in the repo. Restoring
them is one `<script type="module">` tag in `index.html`.

---

## 8. Traps — things that cost hours

**`--t-micro` was declared twice.** `.68rem` at line 56, `150ms` at line 69. The
duration won, so *every* `font-size: var(--t-micro)` on the site was invalid and
fell back to 16 px — 21 places. Fixed by renaming the duration to `--t-fast`.
**Check for duplicate custom-property names before debugging type.**

**`min-height` is a floor, not a ceiling.** Used to stop the panel resizing; the
68-item list grew to content and took it to 4,452 px. `height` is the fix.

**A `<canvas>` is a replaced element.** `inset: 0` does *not* stretch it — it
keeps its intrinsic buffer size. At DPR 1.5 the canvas laid out 2137 px wide and
painted the star 380 px from where the JS put it. Needs explicit `width/height`.

**NaN is not caught by a clamp.** Every comparison with NaN is false, so
`if (p.y < mg)` does nothing. One NaN poisons position permanently, `--levi-y`
becomes `NaNpx`, the transform is invalid and dropped, and a `position: fixed`
element with `left:0;top:0` sits in the **top-left corner** — which is what
"flying up and off the screen" looks like. There is an explicit `isFinite`
barrier in `step()`; do not remove it.

**A force-limited integrator turns a negative `dt` into a sign inversion.**
`run()` seeds `lastT` from `performance.now()` but rAF hands `step()` the frame's
start time, which can be earlier. `cap = MAXF * dt` goes negative, `fm > cap` is
always true, and the steering force is multiplied by a negative. The spring it
replaced tolerated this silently for months. `dt` is force-positive now.

**Lenis owns scroll.** `window.scrollTo` is intercepted in the browser pane;
`scrollIntoView` works. Do not conclude the page is unscrollable.

**Vercel deploys can silently stop firing.** Three ordinary pushes once produced
no deployment, and an empty "Trigger deploy" commit did not help. Diagnose by
fetching the live file and matching its bytes against history — not by reading
`?v=` hashes out of the HTML, and note `/index.html` returns a 15-byte
"Redirecting…" stub, so fetch `/`.

**The browser pane starves rAF.** It rendered on 2 of 6 loads in one session and
changes state between tool calls. See §9.

---

## 9. How to verify anything here

**Always count the subject's own frames inside the same measurement.** A probe in
a previous call proves nothing about the run that follows it.

```js
const f0 = L.frame.frames|0; scrollTo(0,y); await sleep(1600);
rows.push({ y, live: (L.frame.frames|0) - f0 > 25, /* ...measurements... */ });
// discard rows where live === false — do not average them in
```

**`levi.js` exposes a deterministic driver** so motion can be checked without
rAF at all:

```js
cognivexLevi.tick(dtMs, frames)   // runs the REAL step() over the REAL DOM
cognivexLevi.readNow()            // pick the dominant zone, no debounce
cognivexLevi.settle()             // snap to the resting point
cognivexDigest.show('digest'|'queue')
cognivexDigest.detail({...})
```

`tick` deliberately does not validate `dtMs` — passing `NaN`, `Infinity`,
negative or zero is how the guards get tested. All six cases currently pass.

**Check the precondition before believing a result.** A pass whose precondition
was "the subject was not on screen" is worse than a failure. `.levi__core` is
`display:none` under `.is-3d`, so it reports a zero rect; measuring it once
produced a confident, wrong conclusion.

---

## 10. Standing constraints — do not break these

- Status is **"in development, not yet available"**. No waitlist, trial or beta.
- Contact stays a **marked empty box**.
- The word **Butler appears nowhere** on the site. (Jordan uses it to describe the *feel*; that is fine. It must not ship as copy.)
- **No invented facts, figures, testimonials, integrations or pricing.** Demo data is fictional workshop data and is fine; product claims are not.
- No white or orange floating blocks.
- Two weights only — 400 read, 500 do. Existing type scale. DM Sans + IBM Plex Mono.
- The sticky masthead and the `linear`-timed ticker are **deliberate** — do not "fix" them. A constant-speed infinite loop stutters at the seam with easing.
- Measure contrast against the **worst-case composite**, never the token.
- Everything must render with **JavaScript off**. The three markup queue cards exist for exactly this reason; the other 65 are injected.
- `prefers-reduced-motion` path for everything.
- Zones contribute **zero layout height** — verified 9,236 px with and without.

---

## 11. What I would build next, in order

1. **Resolve §5.1** — the chatbox is the last real defect in Levi.
2. **Cut the mobile homepage** from 10.9 screens.
3. **Levi on the other five pages**, with per-page lines.
4. **The pre-rendered light** (§6.3) if Jordan produces the asset.
5. Levi's dialogue, once Jordan supplies it.

---

## 12. Verified state at handoff

| Check | Result |
|---|---|
| Zones add layout height | 0 px — 9,236 with and without |
| Zone reachability | 7 of 8 both directions (`hero` is §5.2) |
| Panel height across all views | 658 px, **shift 0** |
| Demo-panel keep-out | 0 breaches, 5 scroll positions |
| Clock stress (NaN/∞/negative/zero/huge/normal) | all 6 pass |
| Horizontal page scroll, all 6 pages, desktop + mobile | none |
| `.levi-note` overlapping text | 0 |
| Failed network requests | 0 |
| Chatbox overlapping body text | **13 — see §5.1** |
