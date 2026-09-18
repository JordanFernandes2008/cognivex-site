/* ============================================================================
   LEVI — the companion, and the tour it gives.

   Shared component. The words live in a per-page file (levi-home.js) as
   window.LEVI_SCRIPT; nothing page-specific is written here, so another page
   only has to supply its own list.

   WHAT LEVI IS NOT. It is not connected to anything, it does not read the page,
   and it says the same lines to every visitor in the same order. A permanent
   label on the card says so, and it is not dismissible separately from Levi.

   PROGRESSIVE ENHANCEMENT. Nothing here is required to read the page. The
   markup is built by this script, so with JavaScript off there is no Levi, no
   card, and no gap where they were - the page is simply the page.

   TRANSFORM OWNERSHIP. This file owns .levi__orb's transform and nothing else
   writes it, in either mode. The earlier draft had CSS take the transform back
   with `transform: none !important` while docked, which is two owners for one
   property - the exact mistake that cost a day on the hero film. Dock is now
   just a different pair of co-ordinates, computed here.

   STATES, named rather than ad-hoc:
     idle       slow drift, dimmed, small
     speaking   brighter and steady, one pulse as the line arrives
     pointing   leans toward the element being described, corona stretches
     approved   a single short flare, then back to idle
     dismissed  removed for the session, no trace left
   ========================================================================== */
(function () {
  "use strict";

  var KEY = "cognivex.levi.dismissed";
  var script = window.LEVI_SCRIPT;
  if (!script || !script.length) return;

  /* Dismissed earlier this session: build nothing at all. */
  try { if (window.sessionStorage.getItem(KEY) === "1") return; } catch (e) {}

  var REDUCED = window.matchMedia &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* The light's real extent. The orb's own box is 0x0 - the visible thing is
     the corona drawn around it, and the corona is what has to stay out of the
     text column.

     WORST-CASE half-width, not the resting one. Resting corona is
     80px (half 40); pointing stretches it to scaleX(1.25) and approved flares
     to scale(1.3), so the furthest the glow ever reaches is 52px from centre.
     Sizing the keep-out from the resting value is how a proof comes back clean
     while the flare sits on a paragraph. */
  var HALO = 52;
  var CLEAR = 8;   /* breathing room on both sides of the lane */

  /* Parked, the corona tightens to 38px (half 19) and the largest state takes
     it to 19 x 1.3 = 24.7, plus 7px of idle drift. 26 covers all of it. The
     light is parked far enough inside the card that even its biggest state
     stays on the card's own opaque ground. */
  var PARK_HALO = 26;
  var PARK_PAD = 28;

  /* ---- markup -------------------------------------------------------------
     Built here rather than in the HTML so that a page with JS off has no dead
     tour furniture in it. */
  var root = document.createElement("div");
  root.className = "levi";
  root.setAttribute("data-levi", "");

  var orb = document.createElement("div");
  orb.className = "levi__orb";
  orb.setAttribute("aria-hidden", "true");
  orb.innerHTML = '<i class="levi__corona"></i><i class="levi__core"></i>';

  /* The card is a labelled region rather than a live region: the tour is
     supplementary, and a visitor using a screen reader gets the page itself,
     which says everything Levi does and more. */
  var card = document.createElement("div");
  card.className = "levi__card";
  card.setAttribute("role", "group");
  card.setAttribute("aria-label", "Levi, a guided tour of this page");

  card.innerHTML =
    '<p class="levi__name mono"><span class="levi__dot" aria-hidden="true"></span>Levi</p>' +
    '<p class="levi__say" data-levi-say></p>' +
    '<div class="levi__bar">' +
      '<button class="levi__btn levi__btn--go" type="button" data-levi-next>Next</button>' +
      '<button class="levi__btn" type="button" data-levi-skip>Skip tour</button>' +
      '<span class="levi__pos mono" data-levi-pos></span>' +
      '<button class="levi__x" type="button" data-levi-dismiss aria-label="Dismiss Levi for this visit">&times;</button>' +
    '</div>' +
    /* Permanent, not dismissible, not a tooltip. */
    '<p class="levi__disc mono">Levi is in development. These lines are scripted and the same for everyone.</p>';

  root.appendChild(orb);
  root.appendChild(card);
  document.body.appendChild(root);

  var sayEl = card.querySelector("[data-levi-say]");
  var posEl = card.querySelector("[data-levi-pos]");
  var nextBtn = card.querySelector("[data-levi-next]");
  var dotEl = card.querySelector(".levi__dot");

  /* ---- state --------------------------------------------------------------
     One function owns the class, so two states can never both be applied. */
  var STATES = ["is-idle", "is-speaking", "is-pointing", "is-approved"];
  var flareTimer = null;
  var settleTimer = null;

  function setState(name) {
    STATES.forEach(function (c) { root.classList.remove(c); });
    root.classList.add("is-" + name);
  }

  /* ---- the keep-out lane --------------------------------------------------
     THE RULE: the light never enters the text column and never covers a
     control. The lane is measured off the page's own content box rather than
     hard-coded per breakpoint, so it stays correct if .wrap ever changes.

     A lane only exists if the light FITS in it with clearance on both sides:
         gap >= 2 * (HALO + CLEAR)
     The previous threshold was 72px, which is smaller than the corona - at
     exactly 72 the glow would have crossed 8px into the column. The test is
     now the light's width, not a round number.

       margin  the orb rides in the outer margin and tracks the target.
       park    no lane exists, so the orb goes to its own card's identity row,
               over the card's opaque background. It is then over no page text
               and no page control at all, which is stronger than hovering
               above the card and hoping.
  */
  function lane() {
    var wrap = document.querySelector(".hero__void .wrap, .wrap");
    var vw = document.documentElement.clientWidth;
    if (!wrap) return { mode: "park", reason: "no content column found" };
    var r = wrap.getBoundingClientRect();
    var gap = vw - r.right;
    var need = 2 * (HALO + CLEAR);
    if (gap < need) {
      return { mode: "park", gap: Math.round(gap), need: need, colRight: Math.round(r.right) };
    }
    var x = r.right + gap / 2;
    /* Clamped so it can never drift into the column or off the edge. */
    x = Math.max(r.right + HALO + CLEAR, Math.min(vw - HALO - CLEAR, x));
    return { mode: "margin", x: x, gap: Math.round(gap), need: need, colRight: Math.round(r.right) };
  }

  /* ---- what the light must not touch --------------------------------------
     THE RULE: the light never enters the text column and never covers a
     control. The lane maths above says where the content MEASURE ends, which
     is not the same question - a full-bleed section runs its text straight
     through the lane, and at stop 9 that put four text runs inside the glow
     while the column test reported a clean pass.

     A five-point perimeter probe was the next attempt and was worse than
     useless: it passed stop 9 with a text run 40.6px from centre, inside the
     52px light, because none of its five points happened to land on that rect.
     Point sampling cannot prove a keep-out, only fail to disprove one.

     So the test is exact. Every text run and every control is measured once
     into DOCUMENT co-ordinates - which do not change as the page scrolls - and
     the light's distance to each is arithmetic. A few hundred rectangles cost
     microseconds and the cache is rebuilt only when the page changes shape.

     Fixed and sticky things move independently of the document, so they are
     kept out of the cache and handled as travel limits instead. */
  var FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';
  var rects = null;
  var pinnedEls = null;

  function isPinned(el) {
    for (var n = el; n && n !== document.body; n = n.parentElement) {
      var p = getComputedStyle(n).position;
      if (p === "fixed" || p === "sticky") return true;
    }
    return false;
  }

  function buildRects() {
    var sx = window.pageXOffset, sy = window.pageYOffset;
    var out = [];
    function push(r) {
      if (r.width < 2 || r.height < 2) return;
      out.push([r.left + sx, r.top + sy, r.right + sx, r.bottom + sy]);
    }
    var wk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = wk.nextNode())) {
      if (!n.nodeValue.trim()) continue;
      var el = n.parentElement;
      if (!el || root.contains(el)) continue;
      var cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" ||
          parseFloat(cs.opacity) === 0) continue;
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

    var out2 = [], all = document.body.getElementsByTagName("*");
    var vh = document.documentElement.clientHeight;
    for (var k = 0; k < all.length; k++) {
      var e = all[k];
      if (root.contains(e)) continue;
      var pos = getComputedStyle(e).position;
      if (pos !== "fixed" && pos !== "sticky") continue;
      var r2 = e.getBoundingClientRect();
      /* A full-viewport fixed layer is the hero film's backdrop, not a bar to
         keep clear of; treating it as one would leave nowhere to stand. */
      if (r2.height > vh * 0.6 || r2.width < 2) continue;
      out2.push(e);
    }
    pinnedEls = out2;
  }

  function blocked(x, y) {
    if (!rects) buildRects();
    var dx = window.pageXOffset + x, dy = window.pageYOffset + y;
    var R = HALO * HALO;
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      var ox = Math.max(r[0] - dx, 0, dx - r[2]);
      var oy = Math.max(r[1] - dy, 0, dy - r[3]);
      if (ox * ox + oy * oy < R) return true;
    }
    return false;
  }

  /* How far up and down the lane the light may travel at this x, given what is
     pinned to the viewport there. The masthead is 111px tall and sticky, so
     without this clearY happily parked the light at y=90 - behind it. */
  function limits(x) {
    if (!pinnedEls) buildRects();
    var vh = document.documentElement.clientHeight;
    var lo = HALO + CLEAR, hi = vh - HALO - CLEAR;
    for (var i = 0; i < pinnedEls.length; i++) {
      var r = pinnedEls[i].getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (x < r.left - HALO || x > r.right + HALO) continue;
      if (r.bottom < vh / 2) lo = Math.max(lo, r.bottom + HALO + CLEAR);
      else if (r.top > vh / 2) hi = Math.min(hi, r.top - HALO - CLEAR);
    }
    return { lo: lo, hi: Math.max(lo, hi) };
  }

  /* Nearest clear height to the one the target asks for. Searching outward
     keeps Levi as close to what it is describing as the page allows. */
  function clearY(x, y0, lo, hi) {
    y0 = Math.max(lo, Math.min(hi, y0));
    if (!blocked(x, y0)) return y0;
    for (var d = 24; d <= 400; d += 24) {
      if (y0 - d >= lo && !blocked(x, y0 - d)) return y0 - d;
      if (y0 + d <= hi && !blocked(x, y0 + d)) return y0 + d;
    }
    return null;
  }

  var at = 0;
  var target = null;
  var placed = false;
  var lastXY = { x: 0, y: 0 };

  /* The cold start needs to know where this is going to stand before it is
     shown, so it can send its light there rather than to a guess. */
  var BOOTING = !!(window.__coldStart && window.__coldStart.pending);

  function place() {
    var L = lane();
    var parked = (L.mode === "park" || !target);
    var x, y;

    if (!parked) {
      var t = target.getBoundingClientRect();
      x = L.x;
      var lim = limits(x);
      y = clearY(x, t.top + t.height / 2, lim.lo, lim.hi);

      /* Nowhere in the lane is clear at this scroll position - a full-bleed
         section, most likely. Park rather than sit on the words. */
      if (y === null) parked = true;
      else {
        /* POINTING: the corona leans the way the target lies. A rotation of the
           corona only, so nothing about the orb's box changes. */
        var ang = Math.atan2((t.top + t.height / 2) - y, (t.left + t.width / 2) - x);
        orb.style.setProperty("--levi-lean", (ang * 180 / Math.PI).toFixed(1) + "deg");
      }
    }

    root.classList.toggle("is-docked", parked);

    if (parked) {
      /* Levi becomes the card's own mark, in a gutter reserved for it - the
         static dot is hidden and the name and message are indented past it by
         CSS. Measured off the card's edges rather than off the dot, which sat
         20.5px in and let the corona spill onto the page behind at its larger
         states. */
      var c = card.getBoundingClientRect();
      x = c.left + PARK_PAD;
      y = c.top + PARK_PAD + 2;
    }

    lastXY = { x: Math.round(x), y: Math.round(y) };
    orb.style.transform =
      "translate3d(" + lastXY.x + "px," + lastXY.y + "px,0)";

    /* THE ENTRANCE. Without this the first placement interpolates from the
       identity matrix, which is the viewport's top-left corner - Levi would
       fly in diagonally across the whole page on load. It should simply be
       where it is needed. One frame of no-transition, then travel is on. */
    if (!placed) {
      placed = true;
      var arm = function () { root.classList.add("is-placed"); };
      /* Both, not either. requestAnimationFrame does not fire in a tab that is
         not compositing - it did not fire once here - and if it never fires,
         .is-placed is never added and the orb keeps `transition: none` for the
         rest of the visit, so Levi teleports instead of travelling. The timer
         is the floor; whichever arrives first wins and the second is a no-op. */
      if (window.requestAnimationFrame) window.requestAnimationFrame(arm);
      window.setTimeout(arm, 120);
    }
  }

  /* ---- the card must not cover a control ----------------------------------
     The card is opaque UI rather than light, but a covered button is a broken
     page whatever is on top of it. If anything focusable is underneath, the
     card moves to the other bottom corner; if that is worse, it goes back. */
  function controlsUnder(rect) {
    var hits = [];
    var all = document.querySelectorAll(FOCUSABLE);
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (card.contains(el)) continue;
      var r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.bottom < 0 || r.top > document.documentElement.clientHeight) continue;
      if (r.right > rect.left && r.left < rect.right &&
          r.bottom > rect.top && r.top < rect.bottom) {
        hits.push((el.className && String(el.className).split(" ")[0]) || el.tagName);
      }
    }
    return hits;
  }

  function liftTo(px) {
    root.style.setProperty("--levi-lift", px + "px");
  }

  function avoid() {
    root.classList.remove("is-left");
    liftTo(0);
    var hits = controlsUnder(card.getBoundingClientRect());
    if (!hits.length) return;

    /* Try the other bottom corner. */
    var a = hits.length;
    root.classList.add("is-left");
    var b = controlsUnder(card.getBoundingClientRect()).length;
    if (b >= a) root.classList.remove("is-left");
    if (Math.min(a, b) === 0) return;

    /* Both corners collide. Move the card the SMALLEST distance that clears,
       in either direction - the first version only searched upward, so a
       button overlapping the card's top edge by 11px asked for a 289px lift,
       blew the budget and moved nothing, while 32px of free space sat directly
       below. Down is tried first at each distance because a card that stays
       near its corner reads as docked; one that climbs the page does not.

       Bounded at 240px up. Past that it is no longer a docked panel, it is a
       dialogue box floating in the middle of the page, which is worse than the
       thing it was fixing. If nothing in range is clear the card goes back to
       its corner and stats() reports the residue rather than hiding it. */
    var vh = document.documentElement.clientHeight;
    var base = card.getBoundingClientRect();
    var room = Math.max(0, Math.floor(vh - 8 - base.bottom));
    var steps = [];
    for (var d = 6; d <= 240; d += 6) {
      if (d <= room) steps.push(-d);
      steps.push(d);
    }
    for (var i = 0; i < steps.length; i++) {
      liftTo(steps[i]);
      if (!controlsUnder(card.getBoundingClientRect()).length) return;
    }
    liftTo(0);
  }

  /* ---- the tour ----------------------------------------------------------- */
  function show(i) {
    at = i;
    var stop = script[at];
    target = stop && document.querySelector(stop.at);

    /* A stop whose element has gone is skipped rather than pointed at nothing. */
    if (!target && at < script.length - 1) { return show(at + 1); }

    sayEl.textContent = stop.say;
    posEl.textContent = pad(at + 1) + " / " + pad(script.length);
    nextBtn.textContent = (at >= script.length - 1) ? "Done" : "Next";

    if (target && !inView(target)) {
      target.scrollIntoView(REDUCED ? { block: "center" }
                                    : { block: "center", behavior: "smooth" });
    }

    setState(target ? "pointing" : "speaking");
    buildRects();
    avoid();
    place();

    /* The rect read above is the pre-scroll one when the scroll is smooth, so
       re-place once it has settled. Cheap, and it is the difference between
       pointing at the element and pointing at where it used to be. */
    if (settleTimer) window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(function () { avoid(); place(); }, REDUCED ? 0 : 620);

    /* One pulse as the line lands, then hold. Under reduced motion the state
       is set without the pulse - the class carries both, and the CSS drops the
       animation half. */
    window.setTimeout(function () { setState("speaking"); }, REDUCED ? 0 : 520);
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /* Already comfortably on screen? Then leave the scroll alone. Stop 1 is the
     hero title, which is in view the moment the page loads - scrolling it to
     centre dragged the page out from under the composition the cold start had
     just landed on, which is the one thing that handover exists to avoid. */
  function inView(el) {
    var r = el.getBoundingClientRect();
    var vh = document.documentElement.clientHeight;
    return r.top >= 72 && r.bottom <= vh - 72;
  }

  function finish() {
    setState("idle");
    target = null;
    root.classList.add("is-done");
    root.classList.remove("is-running");
    sayEl.textContent = "I will stay out of the way. The page reads fine without me.";
    posEl.textContent = "";
    nextBtn.textContent = "Start again";
    avoid();
    place();
  }

  function dismiss() {
    try { window.sessionStorage.setItem(KEY, "1"); } catch (e) {}
    setState("idle");
    root.classList.add("is-gone");
    /* Removed outright once the fade is over - no hidden node, no trapped
       focus, nothing for a screen reader to find. */
    window.setTimeout(function () {
      if (root.parentNode) root.parentNode.removeChild(root);
      document.body.classList.remove("has-levi");
    }, REDUCED ? 0 : 260);
  }

  nextBtn.addEventListener("click", function () {
    if (root.classList.contains("is-done")) {
      root.classList.remove("is-done");
      root.classList.add("is-running");
      return show(0);
    }
    if (at >= script.length - 1) return finish();
    show(at + 1);
  });

  card.querySelector("[data-levi-skip]").addEventListener("click", finish);
  card.querySelector("[data-levi-dismiss]").addEventListener("click", dismiss);

  /* Escape dismisses, but only while focus is inside the card - a global
     Escape handler would fight every other control on the page. */
  card.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.stopPropagation(); dismiss(); }
  });

  /* ---- approved: one flare, then back ------------------------------------
     Listens on the document rather than binding into site.js, so the queue
     demo keeps its own logic and Levi simply reacts to it. */
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-approve]");
    if (!b || REDUCED) return;
    setState("approved");
    /* The queue removes a card, so the rectangles the keep-out is measured
       against have just changed. */
    window.setTimeout(function () { buildRects(); place(); }, 700);
    if (flareTimer) window.clearTimeout(flareTimer);
    flareTimer = window.setTimeout(function () {
      setState(root.classList.contains("is-running") ? "speaking" : "idle");
    }, 620);
  }, true);

  /* ---- keep it cheap ------------------------------------------------------ */
  var visible = true;
  function pause(p) { root.classList.toggle("is-paused", p); }

  document.addEventListener("visibilitychange", function () {
    pause(document.hidden || !visible);
  });

  if (window.IntersectionObserver) {
    new IntersectionObserver(function (es) {
      es.forEach(function (en) { visible = en.isIntersecting; });
      pause(document.hidden || !visible);
    }, { threshold: 0 }).observe(root);
  }

  var tick = null;
  function onMove() {
    if (tick) return;
    tick = window.requestAnimationFrame(function () { tick = null; place(); });
  }
  window.addEventListener("scroll", onMove, { passive: true });
  window.addEventListener("resize", function () { buildRects(); avoid(); place(); });

  /* ---- start -------------------------------------------------------------
     Built either way, so its resting position can be measured. While the cold
     start runs it is hidden rather than absent: the sequence has to know where
     it is travelling TO, and an element that is not in the document cannot be
     measured. The tour begins when the sequence hands over. */
  document.body.classList.add("has-levi");
  root.classList.add("is-running");
  setState("idle");

  if (BOOTING) {
    root.classList.add("is-boot");
    window.addEventListener("cognivex:cold-start-done", function () {
      root.classList.remove("is-boot");
      show(0);
    }, { once: true });
  } else {
    show(0);
  }

  /* ---- verification handle ------------------------------------------------
     settle() exists because the preview pane freezes document.timeline: a CSS
     transition sits at currentTime 0 for ever, holds its START value, and an
     animation outranks an inline style in the cascade - so every position
     reads as the identity matrix no matter how correct the maths is. This
     suppresses travel and reports the settled geometry, which is what a
     keep-out proof is about. It also reports whether the light is actually on
     screen, because a keep-out that passes because nothing was drawn is not a
     pass. */
  window.cognivexLevi = {
    root: root, orb: orb, card: card, dot: dotEl,
    stops: script.length,
    settle: function () {
      root.classList.add("is-instant");
      orb.getAnimations().forEach(function (a) { a.cancel(); });
      buildRects(); avoid(); place();
      return getComputedStyle(orb).transform;
    },
    stats: function () {
      var wrap = document.querySelector(".hero__void .wrap, .wrap");
      var col = wrap ? wrap.getBoundingClientRect() : null;
      var vw = document.documentElement.clientWidth;
      var vh = document.documentElement.clientHeight;
      var o = orb.getBoundingClientRect();
      var cor = orb.querySelector(".levi__corona").getBoundingClientRect();
      var c = card.getBoundingClientRect();
      var L = lane();
      var light = {
        l: Math.round(cor.left), r: Math.round(cor.right),
        t: Math.round(cor.top), b: Math.round(cor.bottom)
      };
      return {
        viewport: vw + "x" + vh,
        state: STATES.filter(function (s) { return root.classList.contains(s); })[0] || null,
        stop: at + 1, of: script.length,
        laneVerdict: L.mode, laneGap: L.gap, laneNeeds: L.need,
        placement: root.classList.contains("is-docked") ? "parked" : "margin",
        orbOrigin: { x: Math.round(o.left), y: Math.round(o.top) },
        lightRect: light,
        lightRadius: root.classList.contains("is-docked") ? PARK_HALO : HALO,
        lightInsideCard: light.l >= Math.round(c.left) && light.r <= Math.round(c.right) &&
                         light.t >= Math.round(c.top) && light.b <= Math.round(c.bottom),
        lightOnScreen: light.r > 0 && light.l < vw && light.b > 0 && light.t < vh,
        lightRendering: cor.width > 0 && parseFloat(getComputedStyle(orb.querySelector(".levi__core")).opacity) > 0.05,
        contentColumn: col ? { l: Math.round(col.left), r: Math.round(col.right) } : null,
        /* Parked means the light is over the card's own opaque background, so
           the page column is irrelevant; that is reported rather than hidden. */
        lightInTextColumn: (L.mode === "margin" && col)
          ? (light.r > col.left && light.l < col.right) : false,
        lightOverCard: light.r > c.left && light.l < c.right &&
                       light.b > c.top && light.t < c.bottom,
        controlsUnderLight: controlsUnder({ left: light.l, right: light.r, top: light.t, bottom: light.b }),
        cardRect: { l: Math.round(c.left), r: Math.round(c.right), t: Math.round(c.top), b: Math.round(c.bottom) },
        cardSide: root.classList.contains("is-left") ? "left" : "right",
        cardLift: root.style.getPropertyValue("--levi-lift") || "0px",
        controlsUnderCard: controlsUnder(c),
        docked: root.classList.contains("is-docked")
      };
    },
    /* Where Levi will stand for stop 1, computed by running the real placement
       rather than a copy of it - a second implementation of the lane maths is
       a second thing to drift. Safe to run while hidden. */
    restingPoint: function () {
      target = document.querySelector(script[0].at);
      buildRects();
      avoid();
      place();
      return { x: lastXY.x, y: lastXY.y };
    },
    go: show, finish: finish, dismiss: dismiss
  };
})();
