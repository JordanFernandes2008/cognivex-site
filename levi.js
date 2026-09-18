/* ============================================================================
   LEVI — the object.

   Levi is the light. Not a light inside a card: there is no card in this file
   any more, no title bar, no button row, no step-counter chip and no close
   button. What is left is a star, a line of text near it, and two very quiet
   affordances.

   HOW IT MOVES. A spring integrator, not a tween. Every frame it accelerates
   toward a goal, overshoots it slightly and settles:

       a = (goal - p) * K - v * D
       v += a * dt ; p += v * dt

   with K 150 and D 17, which is a damping ratio of 0.69 - under one, so there
   IS an overshoot, and small enough that it reads as weight rather than as a
   wobble. Nothing it does is linear and nothing is instantaneous. On top of
   the spring it drifts on two slow incommensurate sines, so the idle never
   visibly repeats, and it leans toward the cursor by up to 30px with the pull
   decaying as the pointer goes still.

   POSITION HAS EXACTLY ONE OWNER: this loop, writing one translate on .levi.
   The stylesheet animates brightness and the corona's own shape and never
   touches the group's transform. That separation is the thing this project has
   already paid for twice - once on the film's composition, once on the orb.

   WHERE IT IS ALLOWED TO BE. Three things it must never stand on: rendered
   page text, a control, and the film's bright band. The first two come from a
   cache of real client rects; the third is computed from the film's own
   geometry each time it moves, because the film is scrubbed by scroll and its
   bright region travels with it. Measured off the footage across six sampled
   frames at a luminance threshold of 0.045, that band is an ellipse of 0.394 x
   0.172 of the drawn image, centred on the hole.

   PROGRESSIVE ENHANCEMENT is unchanged: the markup is built here, so with
   JavaScript off there is no Levi, no speech and no footnote - just the page.
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

  /* ---- the physics -------------------------------------------------------- */
  var K = 150;        /* stiffness                                             */
  var D = 17;         /* damping - ratio 0.69, so it overshoots a little        */
  var MAX_DT = 1 / 30;
  var CURSOR_PULL = 30;    /* px, at most                                      */
  var CURSOR_REACH = 420;  /* px, beyond which the cursor is ignored           */

  /* The film's bright band, in units of the drawn image. Measured, not guessed
     - see the header. A little margin over the 0.394 x 0.172 that was read off
     the footage, because the sampler only resolved three distinct frames. */
  var BRIGHT_RX = 0.40, BRIGHT_RY = 0.19;

  function phone() { return window.innerWidth <= 700; }

  /* ---- WHERE THE TOUR IS POSSIBLE AT ALL ----------------------------------
     Levi needs a lane: a page margin outside the content measure wide enough
     to stand in. .wrap is max-width 1180, so below roughly 1230px it fills the
     viewport and there is no margin at all - measured, 0 and 15px at both 1024
     and 768.

     Forced to run there, the object has nowhere legal to be: 5 of 9 stops
     failed the keep-out at 1024, 6 of 9 at 768, and at 390 the line printed
     straight across the headline. That is the panel-over-content problem again
     wearing a different shape, so the tour does not run there. The page is the
     page, the footnote does not appear, and nothing is shrunk to fit.

     Gated on the MEASURED margin rather than a width, so it stays correct if
     the content measure ever changes. */
  var LANE_MIN = 96;

  function laneWidth() {
    var wrap = document.querySelector(".hero__void .wrap, .wrap");
    if (!wrap) return 0;
    var r = wrap.getBoundingClientRect();
    return Math.max(r.left, document.documentElement.clientWidth - r.right);
  }
  function tourPossible() { return laneWidth() >= LANE_MIN; }
  /* The light's visible extent at its largest state. The corona's gradient is
     transparent by 84% of its radius, and the flare takes it to 1.22: the
     corona is 168 across on desktop and 118 on a phone, so the light really
     reaches 86 and 60 from centre at its largest. */
  function starR() { return phone() ? 60 : 86; }
  var EDGE = 14;      /* never closer than this to a viewport edge             */

  /* CLEARANCE, not merely non-overlap. Zero overlap put the star and its line
     hard against the hero headline: every boolean passed and the render was
     obviously wrong, because touching is not the same as clear. The star keeps
     26px from anything rendered; the speech keeps 34px, which also covers the
     overhang of the soft darkening behind it. */
  var STAR_PAD = 26;
  var SPEECH_PAD = 34;

  /* ---- markup ------------------------------------------------------------- */
  var root = document.createElement("div");
  root.className = "levi";
  root.setAttribute("data-levi", "");

  /* The star is the control. It is a button so it is focusable, announces
     itself, and can show a focus ring; the light is drawn inside it. */
  var star = document.createElement("button");
  star.type = "button";
  star.className = "levi__star";
  star.setAttribute("data-levi-star", "");
  star.setAttribute("aria-label",
    "Levi. Press Enter or Right Arrow for the next line, Escape to dismiss.");
  star.innerHTML = '<i class="levi__corona" aria-hidden="true"></i>' +
                   '<i class="levi__core" aria-hidden="true"></i>';

  var pos = document.createElement("span");
  pos.className = "levi__pos";
  pos.setAttribute("data-levi-pos", "");
  pos.setAttribute("aria-hidden", "true");

  var speech = document.createElement("div");
  speech.className = "levi__speech";
  speech.setAttribute("data-levi-speech", "");
  speech.innerHTML =
    '<p class="levi__line" data-levi-say></p>' +
    '<button class="levi__skip" type="button" data-levi-skip>skip the tour</button>';

  root.appendChild(star);
  root.appendChild(pos);
  root.appendChild(speech);
  document.body.appendChild(root);

  /* The disclaimer is NOT part of what Levi says. One quiet line at the page
     edge, sentence case. */
  var note = document.createElement("p");
  note.className = "levi-note";
  note.textContent =
    "Levi is in development. Its lines are scripted and the same for everyone.";
  document.body.appendChild(note);

  var sayEl = speech.querySelector("[data-levi-say]");
  var skipEl = speech.querySelector("[data-levi-skip]");

  /* ---- state -------------------------------------------------------------- */
  var STATES = ["is-idle", "is-speaking", "is-pointing", "is-approved"];
  function setState(n) {
    STATES.forEach(function (c) { root.classList.remove(c); });
    root.classList.add("is-" + n);
  }

  var at = 0, target = null, done = false, dismissed = false, frozen = false;
  var p = { x: 0, y: 0 }, v = { x: 0, y: 0 }, goal = { x: 0, y: 0 };
  var side = 1;                  /* +1 speech to the right, -1 to the left     */
  var mouse = { x: 0, y: 0, fresh: 0 };
  var lastT = 0, raf = null, flareTimer = null, retargetAt = 0;
  var placed = { starOK: true, spOK: true };

  /* ---- what it must not stand on ------------------------------------------
     Every text run and every control, once, in DOCUMENT co-ordinates - which
     do not change as the page scrolls, so the cache survives a scroll and only
     has to be rebuilt when the page changes shape. Fixed and sticky things are
     excluded because they move independently; they are handled live. */
  var FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';
  var rects = null, pinned = null;

  function isPinned(el) {
    for (var n = el; n && n !== document.body; n = n.parentElement) {
      var q = getComputedStyle(n).position;
      if (q === "fixed" || q === "sticky") return true;
    }
    return false;
  }

  function buildRects() {
    var sx = window.pageXOffset, sy = window.pageYOffset, out = [];
    function push(r) {
      if (r.width < 2 || r.height < 2) return;
      out.push([r.left + sx, r.top + sy, r.right + sx, r.bottom + sy]);
    }
    var wk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), n;
    while ((n = wk.nextNode())) {
      if (!n.nodeValue.trim()) continue;
      var el = n.parentElement;
      if (!el || root.contains(el) || el === note) continue;
      var cs = getComputedStyle(el);
      /* OPACITY 0 IS NOT FREE SPACE. This used to skip it, and the page's
         reveal animation holds [data-rise] elements at opacity 0 until they
         scroll in - so the whole hero was missing from the cache and Levi
         cheerfully put its line on top of the eyebrow and the headline, with
         every clearance boolean reporting true because the words were not
         there YET. Caught by looking at the render, never by the numbers.

         An element that occupies layout is occupied, whatever it is currently
         painting. Only display:none and visibility:hidden take a thing out of
         the page, and those are the only two that skip. */
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      if (isPinned(el)) continue;
      var rg = document.createRange();
      rg.selectNodeContents(n);
      var rcs = rg.getClientRects();
      for (var i = 0; i < rcs.length; i++) push(rcs[i]);
    }
    var f = document.querySelectorAll(FOCUSABLE);
    for (var j = 0; j < f.length; j++) {
      if (root.contains(f[j]) || isPinned(f[j])) continue;
      push(f[j].getBoundingClientRect());
    }
    rects = out;

    var ps = [], all = document.body.getElementsByTagName("*");
    var vh = document.documentElement.clientHeight;
    for (var k = 0; k < all.length; k++) {
      var e = all[k];
      if (root.contains(e) || e === note) continue;
      var q = getComputedStyle(e).position;
      if (q !== "fixed" && q !== "sticky") continue;
      var r2 = e.getBoundingClientRect();
      /* A full-viewport fixed layer is the film's backdrop, not a bar. */
      if (r2.height > vh * 0.6 || r2.width < 2) continue;
      ps.push(e);
    }
    pinned = ps;
  }

  /* Is the box clear of every rendered thing? Boxes are viewport co-ordinates;
     the cache is document co-ordinates, so the scroll offset bridges them. */
  function clearOf(l, t, r, b) {
    if (!rects) buildRects();
    var sx = window.pageXOffset, sy = window.pageYOffset;
    var L = l + sx, T = t + sy, R = r + sx, B = b + sy;
    for (var i = 0; i < rects.length; i++) {
      var q = rects[i];
      if (q[2] > L && q[0] < R && q[3] > T && q[1] < B) return false;
    }
    for (var j = 0; j < pinned.length; j++) {
      var pr = pinned[j].getBoundingClientRect();
      if (pr.width < 2) continue;
      if (pr.right > l && pr.left < r && pr.bottom > t && pr.top < b) return false;
    }
    return true;
  }

  /* ---- the film's bright band ---------------------------------------------
     Recomputed from the film's live geometry, because scroll scrubs its scale
     and offset and the band travels with it. */
  var film = document.querySelector(".singularity__film");

  function bright() {
    if (!film || !film.videoWidth) return null;
    var cs = getComputedStyle(film);
    if (cs.display === "none" || parseFloat(cs.opacity) < 0.04) return null;
    var r = film.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    var sc = Math.max(r.width / film.videoWidth, r.height / film.videoHeight);
    var dw = film.videoWidth * sc, dh = film.videoHeight * sc;
    return {
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      rx: BRIGHT_RX * dw,
      ry: BRIGHT_RY * dh
    };
  }

  /* A disc of radius rad at (x,y) against that ellipse, grown by the radius so
     the test is disc-vs-ellipse rather than point-vs-ellipse. */
  function inBright(x, y, rad, z) {
    if (!z) return false;
    var dx = (x - z.cx) / (z.rx + rad);
    var dy = (y - z.cy) / (z.ry + rad);
    return dx * dx + dy * dy < 1;
  }

  /* ---- where to stand ------------------------------------------------------
     Candidates near the thing being described, then further out, then the
     quiet edges of the screen. The first that clears text, controls and the
     film's band wins; ties go to whichever is closest to the target. */
  function retarget() {
    var vw = document.documentElement.clientWidth;
    var vh = document.documentElement.clientHeight;
    var R = starR();
    var z = bright();

    var sr = speech.getBoundingClientRect();
    var sw = sr.width || (phone() ? 240 : 336);
    var sh = sr.height || 64;
    var gap = phone() ? 30 : 42;
    /* The darkening reaches 32% of the box's own height above and below it, so
       a fixed 34px pad under-covers a tall line and lets the glow graze the
       label above - visible in the render, invisible to the boolean. */
    var spad = Math.max(SPEECH_PAD, Math.round(sh * 0.36));

    var tr = target ? target.getBoundingClientRect() : null;
    var tx = tr ? tr.left + tr.width / 2 : vw / 2;
    var ty = tr ? tr.top + tr.height / 2 : vh / 2;

    /* The page's own outer margin is where this belongs when there is one: it
       is outside the content measure by definition, so it is the one column
       that stays clear as the page gets denser. .app fills the viewport at the
       product surface, and the first version had no margin candidate at all -
       so it found nothing, fell into a fixed bottom-right corner, and that
       corner was inside the film's bright band at 1.26:1. */
    var wrap = document.querySelector(".hero__void .wrap, .wrap");
    var colL = 0, colR = vw;
    if (wrap) { var wr = wrap.getBoundingClientRect(); colL = wr.left; colR = wr.right; }

    var xs = [];
    if (colR < vw - 24) xs.push((colR + vw) / 2);
    if (colL > 24) xs.push(colL / 2);
    xs.push(vw - 62, 62, vw - 110, 110);
    if (tr) xs.push(tr.right + R * 0.7, tr.left - R * 0.7);
    xs.push(vw * 0.5, vw * 0.28, vw * 0.72);

    var ys = [];
    for (var y = 56; y <= vh - 56; y += 30) ys.push(y);

    /* SCORED, not first-valid. Every candidate gets a cost and the cheapest
       wins, so when nothing is perfect it degrades to the least bad instead of
       falling off a cliff into a corner. The bright band is the one hard
       filter: Levi is never allowed to stand in the film's light. */
    var best = null;
    for (var i = 0; i < xs.length; i++) {
      for (var j = 0; j < ys.length; j++) {
        /* The light may bleed a little past the edge - it is a soft gradient,
           and clamping its CENTRE to R from the edge is what pushed it 100px
           back into the content column in the first place. */
        var x = Math.max(52, Math.min(vw - 52, xs[i]));
        var y = Math.max(52, Math.min(vh - 52, ys[j]));
        if (inBright(x, y, R * 0.7, z)) continue;

        var starOK = clearOf(x - R - STAR_PAD, y - R - STAR_PAD,
                             x + R + STAR_PAD, y + R + STAR_PAD);

        /* THE SPEECH GETS ITS OWN SEARCH. A 336px line cannot fit a 123px
           page margin, so pinning it beside the star at one fixed height meant
           that at the dense stops - the product surface, the night grid, the
           ledger - it had nowhere to go and simply landed on the page's words.
           Both sides, four heights: level, centred, below, above. */
        for (var s = 0; s < 2; s++) {
          var sgn = s === 0 ? (x > vw * 0.55 ? -1 : 1) : (x > vw * 0.55 ? 1 : -1);
          var sx0 = sgn > 0 ? x + gap : x - gap - sw;
          if (sx0 < EDGE || sx0 + sw > vw - EDGE) continue;

          var lifts = [y - 12, y - sh / 2, y + gap, y - sh - gap];
          for (var q = 0; q < lifts.length; q++) {
            var sy0 = lifts[q];
            if (sy0 + sh > vh - EDGE) sy0 = vh - EDGE - sh;
            if (sy0 < EDGE) sy0 = EDGE;

            var spOK = clearOf(sx0 - spad, sy0 - spad,
                               sx0 + sw + spad, sy0 + sh + spad);

            var cost = Math.hypot(x - tx, y - ty)
                     + ((x > colL && x < colR) ? 700 : 0)   /* prefer the margin */
                     + (starOK ? 0 : 5000)
                     + (spOK ? 0 : 2500)
                     + q * 30;                              /* level reads best */

            if (!best || cost < best.cost) {
              best = { x: x, y: y, side: sgn, cost: cost, sy: sy0 - y,
                       starOK: starOK, spOK: spOK };
            }
          }
        }
      }
    }

    if (!best) {
      /* The band covers everything this candidate set looked at. Go high and
         outside it rather than into it. */
      best = { x: vw - 62, y: 72, side: -1, sy: -12, starOK: false, spOK: false };
    }

    goal.x = best.x; goal.y = best.y; side = best.side;
    root.style.setProperty("--levi-tx", (side > 0 ? gap : -gap - sw) + "px");
    root.style.setProperty("--levi-ty", best.sy + "px");
    placed = { starOK: best.starOK, spOK: best.spOK };

    if (tr) {
      var ang = Math.atan2(ty - goal.y, tx - goal.x) * 180 / Math.PI;
      root.style.setProperty("--levi-lean", ang.toFixed(1) + "deg");
    }
  }

  /* ---- the loop ----------------------------------------------------------- */
  function step(now) {
    raf = null;
    if (done) return;
    var dt = Math.min(MAX_DT, (now - lastT) / 1000 || MAX_DT);
    lastT = now;

    if (retargetAt) { retargetAt = 0; retarget(); }

    /* Idle drift: two slow sines whose periods do not divide, so it never
       visibly repeats. Damped right down while it is speaking. */
    var amp = root.classList.contains("is-idle") ? 11 : 5;
    var dx = Math.sin(now / 2600) * amp + Math.sin(now / 4300) * amp * 0.5;
    var dy = Math.cos(now / 3100) * amp * 0.8 + Math.sin(now / 5700) * amp * 0.4;

    /* The cursor: a pull that falls off with distance and fades once the
       pointer goes still. */
    var cx = 0, cy = 0;
    if (mouse.fresh > 0 && !phone()) {
      var mx = mouse.x - p.x, my = mouse.y - p.y;
      var dist = Math.hypot(mx, my) || 1;
      var inf = Math.max(0, 1 - dist / CURSOR_REACH) * CURSOR_PULL * mouse.fresh;
      cx = mx / dist * inf; cy = my / dist * inf;
      mouse.fresh = Math.max(0, mouse.fresh - dt / 1.2);
    }

    var gx = goal.x + dx + cx, gy = goal.y + dy + cy;

    var ax = (gx - p.x) * K - v.x * D;
    var ay = (gy - p.y) * K - v.y * D;
    v.x += ax * dt; v.y += ay * dt;
    p.x += v.x * dt; p.y += v.y * dt;

    root.style.transform =
      "translate3d(" + p.x.toFixed(1) + "px," + p.y.toFixed(1) + "px,0)";

    raf = requestAnimationFrame(step);
  }

  function run() {
    if (REDUCED || done || frozen) return;
    if (raf) return;
    lastT = (window.performance && performance.now) ? performance.now() : Date.now();
    raf = requestAnimationFrame(step);
  }

  /* Reduced motion: no spring, no drift, no cursor, no travel. It is simply
     where it needs to be, and the tour still advances. */
  function settleNow() {
    retarget();
    p.x = goal.x; p.y = goal.y; v.x = 0; v.y = 0;
    root.style.transform =
      "translate3d(" + Math.round(p.x) + "px," + Math.round(p.y) + "px,0)";
  }

  /* ---- the tour ----------------------------------------------------------- */
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function inView(el) {
    var r = el.getBoundingClientRect();
    var vh = document.documentElement.clientHeight;
    return r.top >= 72 && r.bottom <= vh - 72;
  }

  function show(i) {
    at = i;
    var stop = script[at];
    target = stop && document.querySelector(stop.at);
    if (!target && at < script.length - 1) return show(at + 1);

    sayEl.textContent = stop.say;
    pos.textContent = pad(at + 1) + "/" + pad(script.length);
    skipEl.textContent = (at >= script.length - 1) ? "done" : "skip the tour";

    if (target && !inView(target)) {
      var trr = target.getBoundingClientRect();
      var vhh = document.documentElement.clientHeight;
      /* A TALL TARGET CENTRED LEAVES NO BAND TO SPEAK IN. Measured at 1440x900,
         .app centred spans 103 to 797 - margins of 228 and 244 either side and
         bands of 103 above and below, while the line needs 404 wide or 152
         tall. Nothing fits anywhere on that screen, so the speech had to land
         on the demo's own text. The tour owns the scroll, so it frames a tall
         subject lower instead and opens the band it needs. */
      if (trr.height > vhh * 0.55) {
        window.scrollTo({
          top: Math.max(0, window.pageYOffset + trr.top - 232),
          behavior: REDUCED ? "auto" : "smooth"
        });
      } else {
        target.scrollIntoView(REDUCED ? { block: "center" }
                                      : { block: "center", behavior: "smooth" });
      }
    }

    setState(target ? "pointing" : "speaking");
    buildRects();
    if (REDUCED) settleNow(); else { retargetAt = 1; run(); }

    window.setTimeout(function () {
      if (!dismissed) setState("speaking");
      buildRects();
      if (REDUCED) settleNow();
    }, REDUCED ? 0 : 560);
  }

  function advance() {
    if (dismissed) return;
    if (at >= script.length - 1) return endTour();
    show(at + 1);
  }

  function endTour() {
    setState("idle");
    target = null;
    sayEl.textContent = "";
    pos.textContent = "";
    root.classList.add("is-done");
    if (REDUCED) settleNow();
  }

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    try { window.sessionStorage.setItem(KEY, "1"); } catch (e) {}
    root.classList.add("is-gone");
    note.style.opacity = "0";
    window.setTimeout(function () {
      done = true;
      if (raf) cancelAnimationFrame(raf);
      if (root.parentNode) root.parentNode.removeChild(root);
      if (note.parentNode) note.parentNode.removeChild(note);
    }, REDUCED ? 0 : 280);
  }

  /* ---- input ---------------------------------------------------------------
     No button row. Advancing is a click on the star or the line, or the right
     arrow. The only other affordance is one small word, and Escape. */
  star.addEventListener("click", function (e) { e.preventDefault(); advance(); });
  sayEl.addEventListener("click", advance);
  skipEl.addEventListener("click", function (e) {
    e.preventDefault(); e.stopPropagation(); endTour();
  });

  root.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); advance(); }
    else if (e.key === "Escape") { e.stopPropagation(); dismiss(); }
  });

  document.addEventListener("pointermove", function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.fresh = 1;
  }, { passive: true });

  /* Approved: one flare, then back. Listens on the document so the queue demo
     keeps its own logic and Levi simply reacts to it. */
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-approve]");
    if (!b || REDUCED || dismissed) return;
    setState("approved");
    if (flareTimer) window.clearTimeout(flareTimer);
    flareTimer = window.setTimeout(function () {
      setState(root.classList.contains("is-done") ? "idle" : "speaking");
    }, 640);
  }, true);

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    else run();
  });

  /* Debounced to scroll-END. Re-solving mid-scroll makes it chase the page;
     it should hold its place while you move and then decide once. */
  var scrollT = null;
  window.addEventListener("scroll", function () {
    if (REDUCED) return;
    if (scrollT) window.clearTimeout(scrollT);
    scrollT = window.setTimeout(function () {
      buildRects(); retargetAt = 1; run();
    }, 140);
  }, { passive: true });

  window.addEventListener("resize", function () {
    if (!tourPossible()) { dismissQuietly(); return; }
    buildRects();
    retargetAt = 1;
    if (REDUCED) settleNow();
  });

  /* Narrowed past the gate mid-visit: leave, but do not record a dismissal -
     widening the window again is not the visitor saying no. */
  function dismissQuietly() {
    if (dismissed) return;
    dismissed = true; done = true;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (root.parentNode) root.parentNode.removeChild(root);
    if (note.parentNode) note.parentNode.removeChild(note);
  }

  /* ---- start --------------------------------------------------------------- */
  if (!tourPossible()) {
    /* Leave nothing behind: no star, no line, no footnote. */
    if (root.parentNode) root.parentNode.removeChild(root);
    if (note.parentNode) note.parentNode.removeChild(note);
    window.cognivexLevi = {
      unavailable: true,
      reason: "no page margin wide enough for the tour (" +
              Math.round(laneWidth()) + "px, needs " + LANE_MIN + ")",
      restingPoint: function () { return null; },
      stats: function () {
        return { unavailable: true, laneWidth: Math.round(laneWidth()),
                 hasCard: false, present: !!document.querySelector(".levi") };
      },
      dismiss: function () {}, go: function () {}, advance: function () {},
      finish: function () {}, settle: function () { return null; }
    };
    return;
  }

  setState("idle");
  buildRects();
  retarget();
  /* Start where it belongs rather than springing in from the origin. */
  p.x = goal.x; p.y = goal.y;
  root.style.transform = "translate3d(" + p.x + "px," + p.y + "px,0)";

  if (BOOTING) {
    root.classList.add("is-boot");
    note.style.opacity = "0";
    window.addEventListener("cognivex:cold-start-done", function () {
      root.classList.remove("is-boot");
      note.style.opacity = "";
      show(0);
    }, { once: true });
  } else {
    show(0);
  }

  /* ---- verification handle -------------------------------------------------
     settle() exists because the preview pane freezes document.timeline and
     starves rAF: a spring that is never integrated reads as "not moving", and
     a measurement taken then is of a subject that was not drawn. This forces
     the settled state so the keep-out can be measured honestly. */
  window.cognivexLevi = {
    root: root, star: star, speech: speech, note: note,
    stops: script.length,
    /* Settle AND stop. Without the stop the loop kept integrating between the
       stats() call and the screenshot, so the two disagreed by 400px and the
       numbers described a frame nobody photographed. A verification state that
       keeps moving is not a verification state. */
    settle: function () {
      frozen = true;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      buildRects();
      settleNow();
      return { x: Math.round(p.x), y: Math.round(p.y) };
    },
    unfreeze: function () { frozen = false; run(); },
    restingPoint: function () {
      target = document.querySelector(script[0].at);
      buildRects();
      retarget();
      return { x: Math.round(goal.x), y: Math.round(goal.y) };
    },
    stats: function () {
      var vw = document.documentElement.clientWidth;
      var vh = document.documentElement.clientHeight;
      var R = starR();
      var z = bright();
      var sr = speech.getBoundingClientRect();
      var cor = root.querySelector(".levi__corona").getBoundingClientRect();
      return {
        viewport: vw + "x" + vh,
        state: STATES.filter(function (s) { return root.classList.contains(s); })[0] || null,
        stop: at + 1, of: script.length,
        starAt: { x: Math.round(p.x), y: Math.round(p.y) },
        starRadius: R,
        starOnScreen: p.x > 0 && p.x < vw && p.y > 0 && p.y < vh,
        starRendering: cor.width > 0 &&
          parseFloat(getComputedStyle(root.querySelector(".levi__core")).opacity) > 0.05,
        starClear: clearOf(p.x - R - STAR_PAD, p.y - R - STAR_PAD,
                           p.x + R + STAR_PAD, p.y + R + STAR_PAD),
        starInBrightBand: inBright(p.x, p.y, R * 0.7, z),
        brightBand: z ? {
          cx: Math.round(z.cx), cy: Math.round(z.cy),
          rx: Math.round(z.rx), ry: Math.round(z.ry)
        } : null,
        speechRect: { l: Math.round(sr.left), t: Math.round(sr.top),
                      r: Math.round(sr.right), b: Math.round(sr.bottom) },
        speechClear: clearOf(sr.left - Math.max(SPEECH_PAD, sr.height * 0.36),
                             sr.top - Math.max(SPEECH_PAD, sr.height * 0.36),
                             sr.right + Math.max(SPEECH_PAD, sr.height * 0.36),
                             sr.bottom + Math.max(SPEECH_PAD, sr.height * 0.36)),
        speechOnScreen: sr.left >= 0 && sr.right <= vw && sr.top >= 0 && sr.bottom <= vh,
        speechText: sayEl.textContent.slice(0, 40),
        noteText: note.textContent,
        hasCard: !!document.querySelector(".levi__card"),
        placementCompromised: !placed.starOK || !placed.spOK,
        dismissed: dismissed
      };
    },
    /* Verification surface: how many rectangles the keep-out is actually
       reasoning about, and a way to ask it about any box directly. A clearance
       claim is only worth the cache behind it. */
    rectCount: function () { if (!rects) buildRects(); return rects.length; },
    probeClear: function (l, t, r, b) { return clearOf(l, t, r, b); },
    nearestRects: function (l, t, r, b) {
      if (!rects) buildRects();
      var sx = window.pageXOffset, sy = window.pageYOffset, hits = [];
      for (var i = 0; i < rects.length; i++) {
        var q = rects[i];
        if (q[2] > l + sx && q[0] < r + sx && q[3] > t + sy && q[1] < b + sy) {
          hits.push([Math.round(q[0] - sx), Math.round(q[1] - sy),
                     Math.round(q[2] - sx), Math.round(q[3] - sy)]);
        }
      }
      return hits;
    },
    go: show, advance: advance, finish: endTour, dismiss: dismiss
  };
})();
