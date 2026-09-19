/* ============================================================================
   LEVI — a light the scroll moves.

   THERE IS NO TOUR IN HERE ANY MORE. No next, no step counter, no "1 of 9", no
   completion. Levi speaks because the visitor arrived somewhere, not because
   they pressed something: each zone owns one line, and whichever section is
   the dominant thing in the viewport is the line you get. Scroll back up and
   the earlier line comes back, because this is a POSITION, not a sequence.

   Scrolling fast past four sections must not queue four lines, so the read is
   debounced to where the visitor actually stopped - it speaks for the place
   they came to rest, and nothing for the places they flew through.

   CLICK IS RESERVED. The one gesture is clicking the star to approve the
   nearest pending item, which is the product's only real verb. Nothing else on
   this object is clickable, and the line is not a button.

   WHERE IT MAY BE. [data-levi-zone] bands declared in the markup and sized in
   the layout to be genuinely empty. No rect scanning, no candidate scoring, no
   fallback corner - all of that is what kept exiling it to the right margin,
   where it was measured at 110px from the screen edge with a line box computing
   to width 0. A section with no usable zone gets no Levi.

   THE LINE NEVER COMPRESSES. Fixed 19rem measure at body size. If it will not
   fit beside the star inside the zone, the STAR moves and the line is laid out
   below it - the text is never squeezed to make room for the light.

   DEPTH. Star inside <main> at z-index 1, so the display type at z-index 2
   occludes it; speech on body above everything. Both read --levi-x/--levi-y,
   written once per frame. It is a quieter effect here than on the reference -
   our display type is ~64px against their 162px - and that is accepted rather
   than compensated for by inflating either one.
   ========================================================================== */
(function () {
  "use strict";

  var KEY = "cognivex.levi.dismissed";
  var script = window.LEVI_SCRIPT;
  if (!script || !script.length) return;
  try { if (window.sessionStorage.getItem(KEY) === "1") return; } catch (e) {}

  var REDUCED = window.matchMedia &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var BOOTING = !!(window.__coldStart && window.__coldStart.pending);

  var K = 150, D = 17, MAX_DT = 1 / 30;

  /* FLIGHT, MEASURED. Four frames of the reference about 1.2s apart put its
     character at 415, 372 and 645 px of travel per step - roughly 310 to 540
     px/s, never a straight line between two points, and always decelerating
     into where it stops rather than snapping there.

     MAXF is the important one. A spring can change direction instantly if the
     target jumps; a thing with mass cannot, and that limit is most of what
     separates flying from being dragged. */
  var MAXV = 520;      /* px/s cruise ceiling                                */
  var MAXF = 2400;     /* px/s^2 - how hard it can turn or accelerate        */
  var SLOW_R = 210;    /* start easing off this far from the target          */
  var ARRIVE_R = 30;   /* inside this it is hovering, not travelling         */
  var CURSOR_PULL = 30, CURSOR_REACH = 460;
  var PAD = 40;
  var IDLE_MS = 22000;
  var SETTLE_MS = 150;          /* how long the scroll must stop before it speaks */

  function phone() { return window.innerWidth <= 700; }
  /* What it ACTUALLY occupies. The corona is 196 across and transparent by 84%
     of its radius, so the light reaches about 82 from centre; 95 covers it with
     the flare's bright inner third. It used to reserve 150 while rendering 124,
     which is what pushed it onto the film's bright band. */
  function starR() { return phone() ? 78 : 95; }
  function lineW() { return phone() ? 256 : 304; }
  function gapW() { return phone() ? 26 : 38; }

  function sectionOf(el) { return el.closest("section") || el.parentElement || el; }

  /* Can a band of this width hold the light and the line at full measure, in
     either arrangement? */
  function fitsWidth(w) {
    var R = starR();
    return (PAD + 2 * R + gapW() + lineW() + PAD) <= w ||
           (PAD + Math.max(2 * R, lineW()) + PAD) <= w;
  }

  /* THE PART OF A BAND THAT IS ACTUALLY ON SCREEN, or null.

     This is the whole fix. Placement used to read the band's raw rect, so a
     band that had scrolled off the top was still a valid target: measured at
     scrollY 1400 the hero band sat 1,081px above the viewport and Levi was
     dutifully sent there. It was on screen for two of eight sampled scroll
     positions. Nothing reads a raw zone rect any more. */
  /* Whether a zone is DISPLAYED changes only when a media query flips - that
     is, on resize, not sixty times a second. getComputedStyle forces a style
     recalculation on every call, and this was asking three or four times per
     frame for an answer that had not changed since the last resize. */
  var shownCache = null;
  function isShown(el) {
    if (!shownCache) shownCache = new WeakMap();
    if (shownCache.has(el)) return shownCache.get(el);
    var cs = getComputedStyle(el);
    var ok = cs.display !== "none" && cs.visibility !== "hidden";
    shownCache.set(el, ok);
    return ok;
  }
  function forgetShown() { shownCache = null; }

  function visibleSlice(el) {
    if (!el) return null;
    if (!isShown(el)) return null;
    var vh = document.documentElement.clientHeight;
    var r = el.getBoundingClientRect();
    var top = Math.max(r.top, 0), bottom = Math.min(r.bottom, vh);
    var h = bottom - top;
    if (h < 2 * PAD + 2 * starR()) return null;
    if (!fitsWidth(r.width)) return null;
    return { left: r.left, width: r.width, top: top, height: h };
  }

  /* A NAME MAY DECLARE SEVERAL BANDS. The hero is 1,677px tall and declared one
     band across its top 485px; past that the band was gone while the section
     still dominated. A tall section declares more than one, and whichever has
     the most of itself on screen is the one Levi uses. */
  var elsCache = {};
  function zoneEls(name) {
    if (!elsCache[name]) {
      elsCache[name] = document.querySelectorAll('[data-levi-zone="' + name + '"]');
    }
    return elsCache[name];
  }
  function forgetEls() { elsCache = {}; }
  function zoneEl(name) {
    var all = zoneEls(name), best = null, bestH = 0;
    for (var i = 0; i < all.length; i++) {
      var s = visibleSlice(all[i]);
      if (s && s.height > bestH) { bestH = s.height; best = all[i]; }
    }
    /* Falling back to the first keeps anyZoneUsable() a question about the
       MARKUP. A scroll gap must not be able to decide Levi does not exist. */
    return best || all[0] || null;
  }

  function zoneUsable(el) {
    if (!el) return false;
    if (!isShown(el)) return false;
    var r = el.getBoundingClientRect();
    if (r.height < 2 * PAD + 2 * starR()) return false;
    return fitsWidth(r.width);
  }

  /* ---- markup --------------------------------------------------------------
     Built here, so with JavaScript off there is no star, no line, no footnote. */
  var host = document.querySelector("main") || document.body;

  var root = document.createElement("div");
  root.className = "levi";
  root.setAttribute("data-levi", "");

  var star = document.createElement("button");
  star.type = "button";
  star.className = "levi__star";
  star.setAttribute("aria-label", "Levi. Approve the nearest pending item.");
  star.innerHTML =
    '<i class="levi__flare"  aria-hidden="true"></i>' +
    '<i class="levi__corona" aria-hidden="true"></i>' +
    '<i class="levi__ring"   aria-hidden="true"></i>' +
    '<i class="levi__core"   aria-hidden="true"></i>';

  /* No shadow element any more - the chatbox replaced it. */

  var say = document.createElement("div");
  say.className = "levi-say is-quiet";

  var speech = document.createElement("div");
  speech.className = "levi__speech";
  speech.innerHTML =
    '<b class="levi__who">Levi</b>' +
    '<p class="levi__line"><span data-levi-say></span><i class="levi__caret" aria-hidden="true"></i></p>';

  root.appendChild(star);
  say.appendChild(speech);
  host.appendChild(root);
  document.body.appendChild(say);

  /* IN THE FOOTER, IN THE FLOW - not fixed over the hero copy. */
  var note = document.createElement("p");
  note.className = "levi-note";
  note.textContent =
    "Levi is in development. Its lines are scripted and the same for everyone.";
  var footHome = document.querySelector(".foot .wrap") ||
                 document.querySelector(".foot") || document.body;
  footHome.appendChild(note);

  /* A SHORT TRAIL. A chain of followers, each lagging the one before it, shown
     only while it is actually travelling - transform and opacity only, and it
     decays within a few hundred ms of arriving. It is drawn behind the star and
     does not widen the reserved area. */
  var TRAIL = 6, trail = [];
  for (var ti = 0; ti < TRAIL; ti++) {
    var d = document.createElement("i");
    d.className = "levi__trail";
    d.setAttribute("aria-hidden", "true");
    root.insertBefore(d, star);
    trail.push({ el: d, x: 0, y: 0 });
  }

  var sayEl = speech.querySelector("[data-levi-say]");

  /* TYPED, NOT PASTED. A line that appears whole is a tooltip; a line that
     arrives at reading speed is someone talking. Two characters every 26ms is
     about 77 a second - quick enough never to be a wait, slow enough to read
     as speech. Reduced motion gets the whole line at once, and the caret goes.

     This is a text write on one node, so it costs nothing measurable. */
  var typeT = null;
  function sayLine(text) {
    if (typeT) { window.clearInterval(typeT); typeT = null; }
    if (REDUCED) { sayEl.textContent = text; speech.classList.add("is-done"); return; }
    sayEl.textContent = "";
    speech.classList.remove("is-done");
    var i = 0;
    typeT = window.setInterval(function () {
      i += 2;
      sayEl.textContent = text.slice(0, i);
      if (i >= text.length) {
        window.clearInterval(typeT); typeT = null;
        speech.classList.add("is-done");
      }
    }, 26);
  }
  var IDLE_LINES = window.LEVI_IDLE || ["Still here."];

  var STATES = ["is-idle", "is-speaking", "is-approved"];
  function setState(n) {
    STATES.forEach(function (c) { root.classList.remove(c); });
    root.classList.add("is-" + n);
  }

  var zone = null, zoneName = null, done = false, dismissed = false, frozen = false;
  var p = { x: 0, y: 0 }, v = { x: 0, y: 0 }, goal = { x: 0, y: 0 };
  var mouse = { x: 0, y: 0, fresh: 0 };
  var lastT = 0, raf = null, flareTimer = null, settleT = null;
  var spin = 0, glow = 1, lastScrollY = 0, lastActivity = 0;
  var alt = 0, wanderA = 0, tripD0 = 0;   /* distance at the start of the current trip */
  var ticking = false;   /* true while the simulation is being driven by hand */   /* how high it is flying, and which way it is
                                 currently drifting off the direct line */

  /* WHAT THE 3D RENDERER READS. levi3d.js draws a real object at this point
     and nothing else; every decision - which zone, which line, where the
     keep-out is, how hard the spring pulls - stays here, already measured.
     If levi3d.js never loads this object is simply never read. */
  var frame = { x: 0, y: 0, vx: 0, vy: 0, glow: 1, spin: 0, alt: 0,
                gx: 0, gy: 0, frames: 0 };
  var idleSpoken = false, savedLine = null, lure = null, stacked = false;

  /* SCOPED, NOT ON :root.

     Measured: four custom-property writes landed on document.documentElement
     every frame - two here and two in retarget(). A custom property set on the
     root element invalidates style for every element in the document that
     could inherit it, and this document is about 9,000px of content. That is a
     full-document style invalidation sixty times a second in order to move one
     star, and it is the largest single reason the page feels heavy.

     Only .levi and .levi-say read --levi-x/--levi-y (site.css:2244), and only
     .levi__speech reads --levi-tx/--levi-ty (site.css:2439) - checked by grep
     across every css and js file in the project. So they go on those elements
     and the invalidation stops there. */
  function write(x, y) {
    /* Belt and braces. If anything upstream ever slips a non-finite value past
       the barrier in step(), it stops here rather than becoming `NaNpx` in a
       transform and dropping the element into the corner. */
    if (!isFinite(x) || !isFinite(y)) return;
    frame.x = x; frame.y = y;
    var xs = x.toFixed(1) + "px", ys = y.toFixed(1) + "px";
    root.style.setProperty("--levi-x", xs);
    root.style.setProperty("--levi-y", ys);
    say.style.setProperty("--levi-x", xs);
    say.style.setProperty("--levi-y", ys);
  }

  /* ---- which section is the visitor actually looking at ---------------------
     AN OBSERVER, NOT A POLL WITH A FLOOR. The previous version needed a section
     to cover 28% of the viewport before it counted, so short sections never won
     and were silently skipped - measured, at y=1000 the line was still the
     hero's and "walk" never came up at all. That is what read as "it does not
     work when I scroll".

     Now every zone's section is observed and whichever has the highest
     intersection ratio wins, with no floor: a section that is on screen at all
     is reachable. */
  var ratio = {};

  /* GEOMETRY DECIDES, THE OBSERVER ONLY NUDGES. Depending on the observer to
     supply the answer was the bug: its ratios were populated - hero at 0.43 -
     while Levi sat at (14, 5) with opacity 0 and no zone, because nothing had
     consumed them yet. IntersectionObserver delivery is tied to rendering and
     can arrive whenever; getBoundingClientRect is correct the instant it is
     asked. So the ratio is measured here, every time, and the observer is kept
     purely as a cheap signal that something moved.

     No coverage floor: whichever section is most on screen wins, even if that
     is only a sliver, so no section can be silently skipped. */
  function coverOf(el) {
    var vh = document.documentElement.clientHeight;
    var r = sectionOf(el).getBoundingClientRect();
    var visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    return Math.max(0, visible) / vh;
  }

  function dominantZone() {
    var best = null, bestR = 0;
    for (var i = 0; i < script.length; i++) {
      var name = script[i].zone;
      var el = zoneEl(name);
      if (!visibleSlice(el)) continue;   /* the BAND must be on screen, not just
                                            the section that contains it */
      var rr = Math.max(coverOf(el), ratio[name] || 0);
      if (rr > bestR) { bestR = rr; best = { el: el, name: name, say: script[i].say }; }
    }
    return best;
  }

  var io = null;
  if (window.IntersectionObserver) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var z = e.target.querySelector("[data-levi-zone]");
        var name = z && z.getAttribute("data-levi-zone");
        if (name) ratio[name] = e.intersectionRatio;
      });
      readPosition();
    }, { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });
  }

  function observeZones() {
    if (!io) return;
    io.disconnect();
    for (var i = 0; i < script.length; i++) {
      var el = zoneEl(script[i].zone);
      if (el) io.observe(sectionOf(el));
    }
  }

  /* ---- placement, which is arithmetic -------------------------------------- */
  function retarget() {
    if (!zoneName) { var h = holdPoint(); goal.x = h.x; goal.y = h.y; return; }
    /* Re-resolved every frame so the hand-off between two bands of the SAME
       zone happens without a change of line - arrive() returns early when the
       name has not changed, so it would never have swapped the element. */
    var el = zoneEl(zoneName);
    var r = el && visibleSlice(el);
    if (!r) { var h = holdPoint(); goal.x = h.x; goal.y = h.y; return; }
    zone = el;
    var R = starR(), gap = gapW(), lw = lineW();
    var sh = speech.getBoundingClientRect().height || 26;

    stacked = (PAD + 2 * R + gap + lw + PAD) > r.width;

    var d = speech.style;          /* scoped: .levi__speech owns --levi-tx/ty */
    /* THE LINE DECIDES THE HEIGHT, NOT THE LIGHT.

       Measured at 1425x820, the line overlapped page copy at five of nine
       scroll positions. The cause is geometry: the light is 190px across and
       the line 304px, and no 384px-wide vertical strip on this page is free of
       text, so beside the star is always inside the text column.

       They are different kinds of thing and get different rules. The LIGHT may
       pass over copy - it is an additive glow, the reference flies its
       character straight across its display type, and you read through it. The
       WORDS may never overlap copy, because two texts on top of each other are
       both unreadable.

       The strip between a section's last line of copy and its bottom edge
       measured 51-139px in every section: too short for the light, ample for a
       two-line sentence. So the light is placed by where its LINE has to land
       - low in the band, with the words sitting in that free foot - and the
       light hangs above and slightly out of the section, which costs nothing.
       One number off the band box, no rect scanning. */
    /* Anchor to the foot ONLY when the band's real bottom is on screen. When
       the band runs off below, visibleSlice's foot is the viewport edge, not
       the section's free tail - and anchoring to that drops the line into the
       middle of the copy. Measured at scrollY 924 in the hero: two hits. */
    var vhNow = document.documentElement.clientHeight;
    var footOK = el.getBoundingClientRect().bottom <= vhNow + 2;
    var foot = r.top + r.height;
    if (!stacked) {
      goal.x = r.left + PAD + R;
      goal.y = footOK ? Math.max(r.top + r.height / 2, foot - 10 - sh / 2)
                      : r.top + r.height / 2;
    } else {
      goal.x = r.left + r.width / 2;
      goal.y = footOK ? Math.max(r.top + PAD + R * 0.78, foot - 10 - sh - gap - R * 0.86)
                      : r.top + PAD + R * 0.78;
    }

    /* ---- THE LIGHT AND THE WORDS ARE NOT THE SAME PROBLEM ------------------
       Measured at 1425x820, the line overlapped page text at five of nine
       scroll positions - on the ledger rows, the loop steps, the night-work
       summary. The cause is geometry, not placement luck: the light is 190px
       across and the line is 304px, and there is no 384px-wide vertical strip
       anywhere on this page that is free of copy. Beside the star, the line is
       always in the text column.

       So they separate, on the principle that they are different kinds of
       thing. The LIGHT may pass over anything - it is an additive glow, that
       is what the reference's character does to its display type, and it
       costs nothing to read through. The WORDS may not overlap anything ever,
       because two texts on top of each other are both unreadable.

       The strip between the last line of a section's copy and its bottom edge
       measured 51 to 139px in every section - far too short for the light, and
       ample for a two-line sentence. That is where the words go. No rect
       scanning, no candidate scoring: one number off the section box. */
    /* RELATIVE OFFSETS ONLY. The first attempt pinned the line to viewport
       coordinates with (lineY - p.y), which fed the light's own position back
       into its own layout every frame; the star was measured at -22322,-109726
       three sections in. Everything below is an offset FROM the light, so
       nothing it does can move itself. */
    if (!stacked) {
      d.setProperty("--levi-tx", (R + gap) + "px");
      d.setProperty("--levi-ty", (-sh / 2) + "px");
    } else {
      d.setProperty("--levi-tx", (-lw / 2) + "px");
      d.setProperty("--levi-ty", (R * 0.86 + gap) + "px");
    }
  }

  /* ---- the loop ------------------------------------------------------------ */
  function step(now) {
    raf = null;
    if (done) return;
    /* dt MUST BE POSITIVE, AND THIS IS NOT PEDANTRY.

       run() seeds lastT from performance.now(), and the timestamp rAF then
       hands step() is the START of that frame - which can be EARLIER. So
       now - lastT comes out negative, and Math.min(MAX_DT, negative) happily
       keeps the negative.

       The old spring survived that: a negative dt just took one tiny step
       backwards and the next frame recovered. The force limiter does not.
       cap = MAXF * dt goes negative, `fm > cap` is then true for every fm,
       and the steering force is scaled by a negative number - so it
       accelerates directly AWAY from the target, harder every frame, forever.
       Measured before this guard: the star reached -25539,-126876. */
    /* A NON-FINITE TIMESTAMP POISONS EVERYTHING DOWNSTREAM. now feeds
       Math.sin(now / 2600) in the idle bob, and Math.sin(NaN) is NaN, which
       flows into gx, then tox, then the steering force, then v, then p - and
       NaN propagates through every arithmetic operation, so it never clears. */
    if (!isFinite(now)) now = (isFinite(lastT) ? lastT : 0) + 16.7;

    var dt = (now - lastT) / 1000;
    if (!(dt > 0)) dt = 1 / 60;          /* first frame, clock step, anything odd */
    if (dt > MAX_DT) dt = MAX_DT;
    lastT = now;

    retarget();
    checkIdle(now);

    var amp = root.classList.contains("is-idle") ? 12 : 9;
    var dx = Math.sin(now / 2600) * amp + Math.sin(now / 4300) * amp * 0.5;
    var dy = Math.cos(now / 3100) * amp * 0.8 + Math.sin(now / 5700) * amp * 0.4;

    var cx = 0, cy = 0, near = 0;
    if (mouse.fresh > 0 && !phone()) {
      var mx = mouse.x - p.x, my = mouse.y - p.y;
      var dist = Math.hypot(mx, my) || 1;
      near = Math.max(0, 1 - dist / CURSOR_REACH);
      var inf = near * CURSOR_PULL * mouse.fresh;
      cx = mx / dist * inf; cy = my / dist * inf;
      mouse.fresh = Math.max(0, mouse.fresh - dt / 1.2);
    }
    var wantGlow = 1 + near * mouse.fresh * 0.5;
    glow += (wantGlow - glow) * Math.min(1, dt * 5);

    var g = lure || goal;
    var gx = g.x + dx + cx, gy = g.y + dy + cy;

    /* ---- STEERING, NOT A SPRING --------------------------------------------
       The spring was the reason it read as teleporting. A spring's speed is
       proportional to how far it has to go, so a zone change 900px away threw
       it across the screen in three frames and a change 40px away crawled -
       the same motion at two completely different speeds, neither of them a
       flight. This is the standard arrive-and-wander steering instead: one
       cruise speed whatever the distance, an easing radius at the end, and a
       cap on how fast the velocity itself may change. */
    var tox = gx - p.x, toy = gy - p.y;
    var dist = Math.hypot(tox, toy) || 1;

    /* Full speed until SLOW_R, then ramp down into the target. */
    var want = MAXV * Math.min(1, dist / SLOW_R);
    var wvx = tox / dist * want, wvy = toy / dist * want;

    /* A FIXED PATH, NOT A RANDOM WALK.

       The wander was noise: two sines accumulating into an angle, so the route
       between the same two points was different every time and nothing about
       it could be designed or predicted. This is a deterministic arc instead -
       the bow is always perpendicular to the direction of travel, always the
       same size for the same trip, and it collapses to nothing as Levi closes
       in so the arrival stays exact.

       Same journey, same curve, every time. That is what makes it read as a
       flight path rather than a drunk insect. */
    var nx = tox / dist, ny = toy / dist;      /* unit vector along the route  */

    /* The bow peaks at the MIDDLE of the journey and is zero at both ends, so
       the route is a clean arc from A to B rather than a swerve near one of
       them. It needs the distance the trip STARTED at, not the distance left -
       measuring against the remaining distance put the widest part of the
       curve 210px from the destination, which is a last-second swerve. */
    if (dist > tripD0) tripD0 = dist;          /* a new, longer target          */
    var prog = tripD0 > 1 ? 1 - Math.min(1, dist / tripD0) : 1;
    var reach = Math.min(1, tripD0 / 520);     /* short hops stay straight      */
    var side = ny >= 0 ? 1 : -1;               /* always bow the same way       */
    var arc = Math.sin(prog * Math.PI) * reach * 190 * side;
    wvx += -ny * arc;                          /* perpendicular to travel       */
    wvy +=  nx * arc;
    if (dist < ARRIVE_R) tripD0 = 0;           /* arrived; next trip starts new */

    /* A slow vertical breath so holding station is not dead still. Bounded,
       deterministic, and far too small to move it out of its zone. */
    wvy += Math.sin(now / 1750) * 26 * (1 - reach * Math.sin(prog * Math.PI));

    /* MAXV HAS TO BE A CEILING, NOT A SUGGESTION. The wander is added
       VECTORIALLY on top of a desired velocity that is already at full cruise,
       so on a diagonal the two combined to 709 px/s - measured - against a
       reference character that runs 310-540. Re-normalising here puts the cap
       back where the name says it is, and costs the wander nothing: it still
       bends the path, it just cannot also speed it up. */
    var wm = Math.hypot(wvx, wvy);
    if (wm > MAXV) { wvx = wvx / wm * MAXV; wvy = wvy / wm * MAXV; }

    /* Force limit: mass. Without this the wander becomes a jitter. */
    var fx = wvx - v.x, fy = wvy - v.y;
    var fm = Math.hypot(fx, fy), cap = MAXF * dt;
    if (fm > cap && fm > 0) { fx = fx / fm * cap; fy = fy / fm * cap; }
    v.x += fx; v.y += fy;

    /* Belt and braces. Nothing decorative should be able to leave the page
       whatever the clock does. */
    var sp0 = Math.hypot(v.x, v.y), lim = MAXV * 2.2;
    if (sp0 > lim) { v.x = v.x / sp0 * lim; v.y = v.y / sp0 * lim; }

    /* Hovering, not travelling - bleed off speed so it holds station. */
    if (dist < ARRIVE_R) { v.x *= 0.88; v.y *= 0.88; }

    p.x += v.x * dt; p.y += v.y * dt;

    /* A GUIDE MAY NOT LEAVE THE SCREEN. Ever, for any reason.

       Every goal assignment is provably clamped to the viewport and the
       steering force is capped, so on paper this can never fire. It fired
       anyway - measured at (-25539, -126876) - and one cause was found and
       guarded. Rather than keep betting that the next arithmetic slip is the
       last one, this is an unconditional floor: the visitor never watches the
       companion sail off the top of the page, whatever happened upstream. The
       outward velocity is zeroed too, so it cannot press against an edge and
       accumulate there. */
    var cw = document.documentElement.clientWidth;
    var ch = document.documentElement.clientHeight;
    var mg = starR() * 0.45;

    /* NaN IS NOT CAUGHT BY A CLAMP, AND THIS IS THE WHOLE POINT.

       Every comparison with NaN evaluates false, so `if (p.y < mg)` below does
       nothing at all and the poison passes straight through to the stylesheet
       as `--levi-y: NaNpx`. That makes the transform declaration invalid; an
       invalid transform is dropped; and a position:fixed element with left:0,
       top:0 and no transform sits in the TOP-LEFT CORNER of the viewport.
       "Flying up and off the screen" is what that looks like.

       Measured with the tick driver: one non-finite frame poisoned p and v
       permanently - every subsequent frame stayed NaN, across every later test
       case, because nothing downstream could ever clear it.

       So this recovers rather than clamps: drop the velocity, put the light
       back on its target, and carry on. */
    if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(v.x) || !isFinite(v.y)) {
      v.x = 0; v.y = 0;
      p.x = isFinite(goal.x) ? goal.x : cw * 0.5;
      p.y = isFinite(goal.y) ? goal.y : ch * 0.5;
      wanderA = 0; alt = 0;
    }
    if (!isFinite(spin)) spin = 0;
    if (!isFinite(glow)) glow = 1;
    if (p.x < mg)      { p.x = mg;      if (v.x < 0) v.x = 0; }
    if (p.x > cw - mg) { p.x = cw - mg; if (v.x > 0) v.x = 0; }
    if (p.y < mg)      { p.y = mg;      if (v.y < 0) v.y = 0; }
    if (p.y > ch - mg) { p.y = ch - mg; if (v.y > 0) v.y = 0; }

    spin = (spin + dt * 6 + Math.sin(now / 5200) * dt * 8) % 360;

    /* ALTITUDE. Nothing here is really 3D, so height is inferred from effort:
       crossing the page means climbing, holding station means settling. This
       one number drives the whole cast-light behaviour below, which is what
       the reference uses to tell you how high its character is. */
    var sp = Math.hypot(v.x, v.y);
    alt += (Math.min(1, sp / MAXV) - alt) * Math.min(1, dt * 2.6);
    var lift = alt;

    /* The trail: each point chases the one in front, and the whole thing is
       only visible while there is real speed to leave a mark.

       NOT WHEN THE 3D STAR HAS TAKEN OVER. site.css hides .levi__trail under
       .levi.is-3d, so on any machine with WebGL these were six elements being
       repositioned every frame while display:none - twenty-four style writes a
       frame for something nobody can see. */
    if (!REDUCED && !root.classList.contains("is-3d")) {
      var speed = Math.hypot(v.x, v.y);
      var vis = Math.min(1, Math.max(0, (speed - 120) / 900));
      for (var k = 0; k < TRAIL; k++) {
        var lead = k === 0 ? p : trail[k - 1];
        var f = Math.min(1, dt * (16 - k * 1.6));
        trail[k].x += (lead.x - trail[k].x) * f;
        trail[k].y += (lead.y - trail[k].y) * f;
        /* One transform instead of four variables the browser must resolve. */
        var st = trail[k].el.style;
        st.transform = "translate(-50%,-50%) translate(" +
          (trail[k].x - p.x).toFixed(1) + "px," + (trail[k].y - p.y).toFixed(1) + "px) scale(" +
          (1 - k * 0.12).toFixed(2) + ")";
        st.opacity = (vis * (1 - k / TRAIL) * 0.55).toFixed(3);
      }
    }

    write(p.x, p.y);
    frame.vx = v.x; frame.vy = v.y; frame.glow = glow; frame.spin = spin;
    frame.alt = alt;
    /* Published so a check can see what the light is AIMING at, not only where
       it ended up. Chasing a runaway without the goal in view is guesswork. */
    frame.gx = goal.x; frame.gy = goal.y; frame.frames = (frame.frames | 0) + 1;
    root.style.setProperty("--levi-spin", spin.toFixed(1) + "deg");
    root.style.setProperty("--levi-glow", glow.toFixed(3));
    /* The cast-light variables are gone with the shadow - four fewer style
       writes per frame, and one less thing pretending to be physics. */

    if (!ticking) raf = requestAnimationFrame(step);
  }

  function run() {
    if (REDUCED || done || frozen) return;
    if (raf) return;
    lastT = (window.performance && performance.now) ? performance.now() : Date.now();
    raf = requestAnimationFrame(step);
  }

  function settleNow() {
    retarget();
    var g = lure || goal;
    p.x = g.x; p.y = g.y; v.x = 0; v.y = 0;
    write(p.x, p.y);
  }

  /* ---- arriving somewhere -------------------------------------------------- */
  /* NO ZONE MEANS NOT THERE. Levi may only exist inside a zone, so when no
     section owns one - the hero below 1200px, for instance - the light goes
     too. Without this it parked at the layer origin, which measured as a star
     at (0,0) and a line 150px off the left edge of the screen. */
  /* THE HOLDING LANE. Between two zones there is nowhere Levi is allowed to
     be, and the old answer was to fade it to opacity 0 and fade it back in
     wherever the next zone was - which is exactly the teleport. It flies to
     the left gutter instead and waits there in plain sight.

     The gutter is the one column empty in every section: the wrap starts at
     about 13.4% of the viewport, so 9.4% is clear of it, and it is where the
     zones already put Levi in six sections out of eight. */
  function holdPoint() {
    var de = document.documentElement;
    var R = starR();
    return {
      x: Math.max(PAD + R, Math.round(de.clientWidth * 0.094)),
      y: Math.min(de.clientHeight - PAD - R, Math.max(PAD + R, p.y))
    };
  }

  /* THE LINE goes quiet. THE OBJECT does not. Those were one function and
     that conflation is what made a gap in the zones look like a disappearance
     rather than a pause in the conversation. */
  function goQuiet() {
    zone = null; zoneName = null;
    say.classList.add("is-quiet");
    setState("idle");
  }

  function arrive(z) {
    if (!z) { goQuiet(); return; }
    if (z.name === zoneName) return;          /* already here */
    zone = z.el; zoneName = z.name;
    root.classList.remove("is-quiet");
    sayLine(z.say);
    savedLine = null; idleSpoken = false;
    say.classList.remove("is-quiet");
    setState("speaking");
    /* ARRIVAL IS VISIBLE. Peripheral vision catches a change in brightness,
       not a dot that quietly exists. */
    glow = 3.2;
    if (REDUCED) settleNow(); else run();
  }

  /* Debounced to where they STOPPED. Flying past four sections speaks for none
     of them; it speaks once, for the one they came to rest in. */
  function readPosition() {
    if (dismissed) return;
    if (settleT) window.clearTimeout(settleT);
    settleT = window.setTimeout(function () {
      arrive(dominantZone());
    }, SETTLE_MS);
  }

  /* ---- the one gesture ----------------------------------------------------- */
  function onScreenEl(el) {
    var r = el.getBoundingClientRect();
    return r.width > 2 && r.bottom > 60 &&
           r.top < document.documentElement.clientHeight - 60;
  }

  function gesture() {
    if (dismissed || lure) return;
    noteActivity();
    var btn = null, all = document.querySelectorAll("[data-approve]");
    for (var i = 0; i < all.length; i++) {
      if (onScreenEl(all[i])) { btn = all[i]; break; }
    }
    if (!btn) return;
    var r = btn.getBoundingClientRect();
    lure = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    run();
    window.setTimeout(function () {
      setState("approved");
      glow = 3.4;
      try { btn.click(); } catch (e) {}
    }, 430);
    window.setTimeout(function () {
      lure = null; run();
      setState(zone ? "speaking" : "idle");
    }, 1050);
  }

  function noteActivity() {
    lastActivity = (window.performance && performance.now) ? performance.now() : Date.now();
    if (idleSpoken && savedLine !== null) {
      sayLine(savedLine);
      savedLine = null; idleSpoken = false;
    }
  }

  function checkIdle(now) {
    if (idleSpoken || dismissed || REDUCED || !zone) return;
    if (now - lastActivity < IDLE_MS) return;
    idleSpoken = true;
    savedLine = sayEl.textContent;
    sayLine(IDLE_LINES[Math.floor(Math.random() * IDLE_LINES.length)]);
    glow = 2.4;
  }

  star.addEventListener("click", function (e) { e.preventDefault(); gesture(); });
  star.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.stopPropagation(); dismiss(); }
  });

  document.addEventListener("pointermove", function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.fresh = 1;
    noteActivity();
  }, { passive: true });
  document.addEventListener("keydown", noteActivity, true);
  document.addEventListener("click", noteActivity, true);

  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-approve]");
    if (!b || REDUCED || dismissed) return;
    setState("approved");
    if (flareTimer) window.clearTimeout(flareTimer);
    flareTimer = window.setTimeout(function () {
      setState(zone ? "speaking" : "idle");
    }, 640);
  }, true);

  lastScrollY = window.pageYOffset || 0;
  window.addEventListener("scroll", function () {
    noteActivity();
    readPosition();
    if (REDUCED) { settleNow(); return; }
    var y = window.pageYOffset || 0, d = y - lastScrollY;
    lastScrollY = y;
    v.y += Math.max(-820, Math.min(820, -d * 7));
    v.x += Math.max(-260, Math.min(260, -d * 1.1));
    run();
  }, { passive: true });

  function anyZoneUsable() {
    for (var i = 0; i < script.length; i++) {
      if (zoneUsable(zoneEl(script[i].zone))) return true;
    }
    return false;
  }

  function leave(remember) {
    if (dismissed) return;
    dismissed = true; done = true;
    if (remember) { try { window.sessionStorage.setItem(KEY, "1"); } catch (e) {} }
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    [root, say, note].forEach(function (n) {
      if (n.parentNode) n.parentNode.removeChild(n);
    });
  }

  function dismiss() {
    if (dismissed) return;
    root.classList.add("is-gone");
    say.classList.add("is-gone");
    note.style.opacity = "0";
    window.setTimeout(function () { leave(true); }, REDUCED ? 0 : 280);
    try { window.sessionStorage.setItem(KEY, "1"); } catch (e) {}
  }

  window.addEventListener("resize", function () {
    /* NARROWING MUST NOT BE FATAL. This used to call leave(), which removes the
       nodes and sets done = true - permanently, for the rest of the visit. Any
       resize that momentarily found no usable zone (opening devtools, dragging
       across a breakpoint, a reflow during load) destroyed Levi, and widening
       the window again never brought it back. Go quiet instead, and return when
       a zone is usable again. */
    forgetShown(); forgetEls();   /* a media query may have flipped */
    if (!anyZoneUsable()) { goQuiet(); return; }
    observeZones();
    readPosition();
    if (REDUCED) settleNow(); else run();
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    else run();
  });

  function zoneTable() {
    var R = starR(), lw = lineW(), gap = gapW();
    var vw = document.documentElement.clientWidth;
    return script.map(function (s) {
      var el = zoneEl(s.zone);
      var cs = el && getComputedStyle(el);
      var shown = !!(el && cs.display !== "none" && cs.visibility !== "hidden");
      var r = el && el.getBoundingClientRect();
      return {
        zone: s.zone,
        shown: shown,
        bounds: r ? { l: Math.round(r.left), t: Math.round(r.top + (window.pageYOffset || 0)),
                      w: Math.round(r.width), h: Math.round(r.height) } : null,
        needsH: 2 * PAD + 2 * R,
        needsWbeside: PAD + 2 * R + gap + lw + PAD,
        fitsBeside: !!(r && shown && (PAD + 2 * R + gap + lw + PAD) <= r.width &&
                       r.height >= 2 * PAD + 2 * R),
        fitsStacked: !!(r && shown && (PAD + Math.max(2 * R, lw) + PAD) <= r.width &&
                        r.height >= 2 * PAD + 2 * R),
        usable: zoneUsable(el),
        edgeGapIfPlaced: r ? Math.round(Math.min(r.left + PAD, vw - (r.left + PAD + 2 * R + gap + lw))) : null
      };
    });
  }

  /* ---- start --------------------------------------------------------------- */
  /* ---- NEVER DECIDE THIS ONCE ----------------------------------------------
     This used to tear the nodes out of the DOM and replace the whole API with
     a stub the moment one measurement came back unusable. Caught in the act:
     at init every zone reported width 0, and starR() returned 78 - the PHONE
     radius - because documentElement.clientWidth had not been established yet.
     A 1425px desktop was measured as a phone with zero-width zones, Levi
     deleted itself, and nothing ever re-checked. Fonts landing, a restored
     window, a slow stylesheet or GSAP building its pin can all produce the
     same first measurement.

     So the check is now a gate, not a verdict. Levi stays hidden and keeps
     asking - on load, on resize, when fonts settle, and on a short timer -
     and starts the moment the page can actually hold it. After about seven
     seconds it stops asking, but it never destroys itself: a later resize
     still brings it back. */
  var started = false;

  function begin() {
    if (started) return true;
    if (!anyZoneUsable()) return false;
    started = true;
    root.classList.remove("is-boot");
    say.classList.remove("is-boot");
    startLevi();
    return true;
  }

  if (!begin()) {
    root.classList.add("is-boot");
    say.classList.add("is-boot");
    var tries = 0, timer = null;
    var stopAsking = function () {
      if (timer) { window.clearInterval(timer); timer = null; }
      window.removeEventListener("load", poke);
    };
    var poke = function () {
      if (begin() || ++tries > 30) stopAsking();
    };
    timer = window.setInterval(poke, 220);
    window.addEventListener("load", poke);
    /* resize is deliberately NOT removed - a window that becomes wide enough
       later is exactly the case this exists for. */
    window.addEventListener("resize", function () { begin(); }, { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { begin(); }).catch(function () {});
    }
  }

  function startLevi() {
  setState("idle");
  lastActivity = (window.performance && performance.now) ? performance.now() : Date.now();
  observeZones();
  arrive(dominantZone());   /* geometric, so this is correct straight away */
  /* THE OBSERVER'S FIRST CALLBACK LANDS AFTER THIS LINE, so at init every ratio
     is still 0, no zone wins and Levi starts quiet - measured, it stayed silent
     at y0 until the visitor scrolled, which is the worst possible first
     impression. Read again once the observer has actually reported. */
  window.setTimeout(function () { if (!zoneName) arrive(dominantZone()); }, 260);
  window.setTimeout(function () { if (!zoneName) arrive(dominantZone()); }, 900);
  if (zone) { retarget(); p.x = goal.x; p.y = goal.y; write(p.x, p.y); }

  if (BOOTING) {
    root.classList.add("is-boot");
    say.classList.add("is-boot");
    note.style.opacity = "0";
    window.addEventListener("cognivex:cold-start-done", function () {
      root.classList.remove("is-boot");
      say.classList.remove("is-boot");
      note.style.opacity = "";
      arrive(dominantZone());
      run();
    }, { once: true });
  } else {
    run();
  }
  }   /* end startLevi */

  window.cognivexLevi = {
    root: root, say: say, star: star, speech: speech, note: note,
    /* Always present, even before the gate opens, so a check can tell the
       difference between "not started yet" and "not here at all". */
    started: function () { return started; },
    zones: zoneTable,
    frame: frame,
    ratios: function () { return ratio; },
    gesture: function () { gesture(); },
    forceIdle: function () { lastActivity = -1e9; checkIdle(1e9); },
    /* Read the position immediately, skipping the debounce - for verification
       only; a visitor always gets the debounced read. */
    readNow: function () {
      if (settleT) window.clearTimeout(settleT);
      arrive(dominantZone());
      return zoneName;
    },
    readPosition: readPosition,
    settle: function () {
      frozen = true;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      settleNow();
      return { x: Math.round(p.x), y: Math.round(p.y) };
    },
    unfreeze: function () { frozen = false; run(); },

    /* DRIVE THE SIMULATION BY HAND. Verification only.

       The browser pane this is developed against starves requestAnimationFrame
       to roughly one frame per half second, and it changes state between tool
       calls - so no motion check against it can be trusted, and several were
       wrong in both directions before anyone noticed. This runs the REAL step()
       over the REAL DOM with the REAL zone geometry, at whatever timestep is
       asked for, with no dependence on the host actually painting.

       dtMs is deliberately unvalidated: passing a negative, zero or absurd
       value is how the guards get tested. */
    tick: function (dtMs, frames) {
      var n = Math.max(1, frames | 0 || 1);
      var d = (typeof dtMs === "number") ? dtMs : 16.7;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      ticking = true;
      var t = lastT || 0;
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, peak = 0;
      for (var i = 0; i < n; i++) {
        t += d;
        step(t);
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
        var sp = Math.hypot(v.x, v.y); if (sp > peak) peak = sp;
      }
      ticking = false;
      lastT = t;
      return {
        x: Math.round(p.x), y: Math.round(p.y),
        vx: Math.round(v.x), vy: Math.round(v.y),
        goal: Math.round(goal.x) + "," + Math.round(goal.y),
        bounds: [Math.round(minX), Math.round(minY), Math.round(maxX), Math.round(maxY)],
        peakSpeed: Math.round(peak),
        finite: isFinite(p.x) && isFinite(p.y) && isFinite(v.x) && isFinite(v.y),
        frames: frame.frames
      };
    },
    restingPoint: function () {
      var z = dominantZone();
      if (!z) return null;
      zone = z.el; retarget();
      return { x: Math.round(goal.x), y: Math.round(goal.y) };
    },
    stats: function () {
      var r = zone ? zone.getBoundingClientRect() : null;
      var sr = speech.getBoundingClientRect();
      var cr = root.querySelector(".levi__core").getBoundingClientRect();
      var vw = document.documentElement.clientWidth;
      var vh = document.documentElement.clientHeight;
      return {
        viewport: vw + "x" + vh,
        zone: zoneName,
        quiet: say.classList.contains("is-quiet"),
        line: sayEl.textContent,
        state: STATES.filter(function (s) { return root.classList.contains(s); })[0] || null,
        zoneRect: r ? { l: Math.round(r.left), t: Math.round(r.top),
                        w: Math.round(r.width), h: Math.round(r.height) } : null,
        starAt: { x: Math.round(p.x), y: Math.round(p.y) },
        coreSize: Math.round(cr.width) + "x" + Math.round(cr.height),
        starRadius: starR(),
        starOnScreen: p.x > 0 && p.x < vw && p.y > 0 && p.y < vh,
        starRendering: cr.width > 0 &&
          parseFloat(getComputedStyle(root.querySelector(".levi__core")).opacity) > 0.05,
        lineBox: { l: Math.round(sr.left), t: Math.round(sr.top),
                   w: Math.round(sr.width), h: Math.round(sr.height) },
        lineFullMeasure: Math.round(sr.width) >= lineW() - 2,
        distanceToNearestEdge: Math.round(Math.min(
          sr.left, vw - sr.right, p.x - starR(), vw - (p.x + starR()))),
        starInsideZone: !!(r && p.x - starR() >= r.left - 1 && p.x + starR() <= r.right + 1),
        lineInsideZone: !!(r && sr.left >= r.left - 1 && sr.right <= r.right + 1),
        layout: stacked ? "stacked" : "beside",
        hasCard: !!document.querySelector(".levi__card"),
        hasCounter: !!document.querySelector(".levi__pos"),
        dismissed: dismissed
      };
    }
  };
})();
