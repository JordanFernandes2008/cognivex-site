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
  var CURSOR_PULL = 30, CURSOR_REACH = 460;
  var PAD = 48;
  var IDLE_MS = 22000;
  var SETTLE_MS = 160;          /* how long the scroll must stop before it speaks */
  var DOMINANT = 0.28;          /* of the viewport, before a section counts       */

  function phone() { return window.innerWidth <= 700; }
  /* The light's visible mass, not the flare's faint reach. */
  function starR() { return phone() ? 110 : 150; }
  function lineW() { return phone() ? 256 : 304; }
  function gapW() { return phone() ? 26 : 38; }

  function zoneEl(name) { return document.querySelector('[data-levi-zone="' + name + '"]'); }
  function sectionOf(el) { return el.closest("section") || el.parentElement || el; }

  function zoneUsable(el) {
    if (!el) return false;
    var cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    var r = el.getBoundingClientRect();
    var R = starR();
    if (r.height < 2 * PAD + 2 * R) return false;
    /* Beside, or stacked - either is fine, but it must hold one of them with
       the line at full measure. */
    var beside = (PAD + 2 * R + gapW() + lineW() + PAD) <= r.width;
    var stacked = (PAD + Math.max(2 * R, lineW()) + PAD) <= r.width;
    return beside || stacked;
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

  var shadow = document.createElement("i");
  shadow.className = "levi__shadow";
  shadow.setAttribute("aria-hidden", "true");

  var say = document.createElement("div");
  say.className = "levi-say is-quiet";

  var speech = document.createElement("div");
  speech.className = "levi__speech";
  speech.innerHTML = '<p class="levi__line" data-levi-say></p>';

  root.appendChild(shadow);
  root.appendChild(star);
  say.appendChild(speech);
  host.appendChild(root);
  document.body.appendChild(say);

  var note = document.createElement("p");
  note.className = "levi-note";
  note.textContent =
    "Levi is in development. Its lines are scripted and the same for everyone.";
  document.body.appendChild(note);

  var sayEl = speech.querySelector("[data-levi-say]");
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
  var idleSpoken = false, savedLine = null, lure = null, stacked = false;

  function write(x, y) {
    var d = document.documentElement.style;
    d.setProperty("--levi-x", x.toFixed(1) + "px");
    d.setProperty("--levi-y", y.toFixed(1) + "px");
  }

  /* ---- which section is the visitor actually looking at ---------------------
     Visible fraction of the viewport, largest wins. A zone whose section is
     barely on screen is not where they are. */
  function dominantZone() {
    var vh = document.documentElement.clientHeight;
    var best = null, bestCover = DOMINANT;
    for (var i = 0; i < script.length; i++) {
      var el = zoneEl(script[i].zone);
      if (!zoneUsable(el)) continue;
      var r = sectionOf(el).getBoundingClientRect();
      var cover = (Math.min(r.bottom, vh) - Math.max(r.top, 0)) / vh;
      if (cover > bestCover) { bestCover = cover; best = { el: el, name: script[i].zone, say: script[i].say }; }
    }
    return best;
  }

  /* ---- placement, which is arithmetic -------------------------------------- */
  function retarget() {
    if (!zone) return;
    var r = zone.getBoundingClientRect();
    var R = starR(), gap = gapW(), lw = lineW();
    var sh = speech.getBoundingClientRect().height || 26;

    stacked = (PAD + 2 * R + gap + lw + PAD) > r.width;

    var d = document.documentElement.style;
    if (!stacked) {
      goal.x = r.left + PAD + R;
      goal.y = r.top + r.height / 2;
      d.setProperty("--levi-tx", (R + gap) + "px");
      d.setProperty("--levi-ty", (-sh / 2) + "px");
    } else {
      /* THE STAR MOVES, NOT THE TEXT. Star high in the zone, full-measure line
         underneath it. */
      goal.x = r.left + r.width / 2;
      goal.y = r.top + PAD + R * 0.78;
      d.setProperty("--levi-tx", (-lw / 2) + "px");
      d.setProperty("--levi-ty", (R * 0.86 + gap) + "px");
    }
  }

  /* ---- the loop ------------------------------------------------------------ */
  function step(now) {
    raf = null;
    if (done) return;
    var dt = Math.min(MAX_DT, (now - lastT) / 1000 || MAX_DT);
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

    v.x += ((gx - p.x) * K - v.x * D) * dt;
    v.y += ((gy - p.y) * K - v.y * D) * dt;
    p.x += v.x * dt; p.y += v.y * dt;

    spin = (spin + dt * 6 + Math.sin(now / 5200) * dt * 8) % 360;
    var lift = Math.min(1, Math.abs(v.y) / 900);

    write(p.x, p.y);
    root.style.setProperty("--levi-spin", spin.toFixed(1) + "deg");
    root.style.setProperty("--levi-glow", glow.toFixed(3));
    root.style.setProperty("--levi-shx", (20 + v.x * 0.014).toFixed(1) + "px");
    root.style.setProperty("--levi-shy", (52 + lift * 18).toFixed(1) + "px");
    root.style.setProperty("--levi-shs", (1 + lift * 0.24).toFixed(3));

    raf = requestAnimationFrame(step);
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
  function goQuiet() {
    zone = null; zoneName = null;
    say.classList.add("is-quiet");
    root.classList.add("is-quiet");
    setState("idle");
  }

  function arrive(z) {
    if (!z) { goQuiet(); return; }
    if (z.name === zoneName) return;          /* already here */
    zone = z.el; zoneName = z.name;
    root.classList.remove("is-quiet");
    sayEl.textContent = z.say;
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
      sayEl.textContent = savedLine;
      savedLine = null; idleSpoken = false;
    }
  }

  function checkIdle(now) {
    if (idleSpoken || dismissed || REDUCED || !zone) return;
    if (now - lastActivity < IDLE_MS) return;
    idleSpoken = true;
    savedLine = sayEl.textContent;
    sayEl.textContent = IDLE_LINES[Math.floor(Math.random() * IDLE_LINES.length)];
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
    if (!anyZoneUsable()) { leave(false); return; }
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
  if (!anyZoneUsable()) {
    var table = zoneTable();
    [root, say, note].forEach(function (n) {
      if (n.parentNode) n.parentNode.removeChild(n);
    });
    window.cognivexLevi = {
      unavailable: true,
      reason: "no [data-levi-zone] is large enough here (needs " +
              (2 * PAD + 2 * starR()) + "px tall)",
      zones: function () { return table; },
      restingPoint: function () { return null; },
      stats: function () { return { unavailable: true }; },
      dismiss: function () {}, settle: function () { return null; },
      readPosition: function () {}
    };
    return;
  }

  setState("idle");
  lastActivity = (window.performance && performance.now) ? performance.now() : Date.now();
  arrive(dominantZone());
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

  window.cognivexLevi = {
    root: root, say: say, star: star, speech: speech, note: note,
    zones: zoneTable,
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
