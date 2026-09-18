/* ============================================================================
   THE COLD START — Levi is born out of the film, and the film lands on the page.

   Runs from the HEAD, deliberately. A class on documentElement is the only
   thing that can be set before <body> exists, and it is what puts the black
   there on the first paint rather than flashing the page and then covering it.

   WHAT IT IS NOT: a preloader. Nothing is hidden by default - every rule it
   depends on is gated on a class only this file can add, and the overlay's
   markup is built here rather than sitting in the HTML. With JavaScript off
   there is no class, no overlay, no veil, and the page renders normally. That
   is the single most important property of this file.

   THE HANDOVER, which is the whole difficulty.

   The hero's composition is one CSS declaration:
       transform: scale(var(--film-s)) translate(var(--film-x), var(--film-y))
   and it differs by media query - .95/31%/26% wide, .60/6%/34% under 1100px,
   .58/0%/30% in portrait. This file animates THOSE THREE INPUTS and never
   writes a transform, because GSAP composes translate-then-scale while the
   stylesheet composes scale-then-translate: handing the same three numbers to
   a transform produced a different matrix and once put the hole's centre at
   109% of the viewport, off screen entirely.

   And the landing is not "animate to the right numbers and hope". The tween
   ends on the stylesheet's own values and then REMOVES the inline properties,
   so the stylesheet owns the composition again and the resting state is exact
   by construction rather than by arithmetic - including whichever media query
   happens to apply, and including one that changed while the sequence ran.

   OWNERSHIP IS SEQUENTIAL, never shared. While this runs, film.js has not
   started its tweens and levi.js has not started its tour; both wait for
   cognivex:cold-start-done. One owner at a time, handed over cleanly.
   ========================================================================== */
(function () {
  "use strict";

  var KEY = "cognivex.coldstart.seen";
  var root = document.documentElement;

  /* Once per session. Checked before anything is flagged, so a second visit
     leaves film.js and levi.js to start normally with no deferral at all. */
  try { if (window.sessionStorage.getItem(KEY) === "1") return; } catch (e) {}

  /* Only where the sequence belongs. boot.js is loaded by index.html alone,
     but the guard is here too so including it elsewhere cannot surprise. */
  var path = location.pathname.replace(/\/index\.html$/, "/");
  if (path !== "/" && path !== "/index.html" && !/\/$/.test(path)) return;

  var REDUCED = window.matchMedia &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* The cap is a promise to the visitor, so it is measured from the moment the
     black goes up - not from when the timeline happens to start. */
  var tHead = (window.performance && performance.now) ? performance.now() : Date.now();
  var CAP = 2500;

  /* film.js and levi.js read this synchronously when they load. */
  window.__coldStart = { pending: true, reduced: REDUCED, t0: tHead };

  root.classList.add("is-cold-start");
  if (!REDUCED) root.classList.add("is-cold-film");

  /* THE CAP IS ARMED HERE, not when the timeline starts. If every line below
     this fails - no frames because the tab is not compositing, a throw while
     building, anything - the veil still comes down and the page is still
     handed over. A black screen that depends on the rest of a file working is
     not a cap, it is a promise. */
  window.setTimeout(function () { finish(); }, CAP);

  /* ---- the timeline ------------------------------------------------------
     Offsets in ms from the moment the overlay exists. Driven off
     performance.now() in one rAF loop rather than off CSS transitions,
     because a single clock that owns every value cannot desynchronise - and
     because the sequence has a hard cap it must be able to honour. */
  var T = REDUCED ? {
    line: [0, 1], caret: 1,
    orbIn: [260, 560],
    cap: [380, 640],
    out: [1050, 1500],
    end: 1500
  } : {
    line: [0, 340], caret: 360,      /* a. typed, not glitched                */
    ring: [360, 660],                /* b. the ring, small and centred        */
    collapse: [760, 1090],           /* c. the light collapses inward         */
    stutter: 1090,                   /*    two frames, once, and never again  */
    cap: [1130, 1300],               /* d. Levi. First model. In development. */
    land: [1400, 1900],              /* e. travel out, film lands on the hero */
    end: 1900
  };

  var LINE = "COGNIVEX — COLD START";

  /* The size the point forms at, in multiples of Levi's own resting size. It
     ends the sequence at exactly 1, so the component inherits it without a
     step. */
  var BORN = 1.8;

  var film = null, cold = null, lineEl = null, orbEl = null, skipEl = null;
  var rest = null;               /* the stylesheet's resting composition      */
  var target = null;             /* where Levi comes to rest                  */
  var t0 = 0, raf = null, stutterFrames = 0, done = false;
  var watchdog = null, lastFrameAt = 0;
  var measured = { start: 0, end: 0 };

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeIn(t) { return t * t * t; }
  function seg(now, a, b) { return now <= a ? 0 : now >= b ? 1 : (now - a) / (b - a); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function setVar(n, v) { root.style.setProperty(n, v); }

  /* ---- the resting composition, read off the stylesheet -------------------
     Inline values are lifted first, because getComputedStyle would otherwise
     report this file's own in-flight numbers back to it. Re-read on resize so
     a media query that changes mid-sequence is still landed on exactly. */
  function readRest() {
    if (!film) return { s: 0.95, x: 31, y: 26 };
    var keep = ["--film-s", "--film-x", "--film-y"].map(function (n) {
      var v = film.style.getPropertyValue(n);
      film.style.removeProperty(n);
      return [n, v];
    });
    var cs = getComputedStyle(film);
    var r = {
      s: parseFloat(cs.getPropertyValue("--film-s")) || 0.95,
      x: parseFloat(cs.getPropertyValue("--film-x")),
      y: parseFloat(cs.getPropertyValue("--film-y"))
    };
    if (isNaN(r.x)) r.x = 31;
    if (isNaN(r.y)) r.y = 26;
    keep.forEach(function (kv) { if (kv[1]) film.style.setProperty(kv[0], kv[1]); });
    return r;
  }

  function writeFilm(s, x, y, op) {
    if (!film) return;
    film.style.setProperty("--film-s", s.toFixed(4));
    film.style.setProperty("--film-x", x.toFixed(2) + "%");
    film.style.setProperty("--film-y", y.toFixed(2) + "%");
    film.style.opacity = op.toFixed(3);
  }

  /* THE LANDING. Not "animate to the right numbers" - hand the composition
     back to the stylesheet and let it be whatever it says, which is exact by
     construction and survives a media query changing mid-flight. */
  function releaseFilm() {
    if (!film) return;
    film.style.removeProperty("--film-s");
    film.style.removeProperty("--film-x");
    film.style.removeProperty("--film-y");
    film.style.removeProperty("opacity");
  }

  function writeOrb(x, y, scale, op) {
    if (!orbEl) return;
    orbEl.style.transform = "translate3d(" + Math.round(x) + "px," + Math.round(y) + "px,0)";
    setVar("--cold-orb-s", scale.toFixed(3));
    setVar("--cold-orb-o", op.toFixed(3));
  }

  function build() {
    film = document.querySelector(".singularity__film");
    rest = readRest();

    cold = document.createElement("div");
    cold.className = "cold";
    cold.setAttribute("data-cold", "");
    cold.innerHTML =
      '<p class="cold__line mono" data-cold-line aria-hidden="true"></p>' +
      '<div class="levi__orb cold__orb" data-cold-orb aria-hidden="true">' +
        '<i class="levi__corona"></i><i class="levi__core"></i>' +
      '</div>' +
      '<p class="cold__caption mono" aria-hidden="true">Levi. First model. In development.</p>' +
      '<button class="cold__skip" type="button" data-cold-skip ' +
        'aria-label="Skip the opening sequence">Skip</button>';

    /* First in the body so the skip is the first thing Tab reaches while the
       sequence is up, rather than the last. */
    document.body.insertBefore(cold, document.body.firstChild);

    lineEl = cold.querySelector("[data-cold-line]");
    orbEl = cold.querySelector("[data-cold-orb]");
    skipEl = cold.querySelector("[data-cold-skip]");

    skipEl.addEventListener("click", finish);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onResize);
    holdPage(true);

    /* Start dark and centred: the film is the only thing that will be lit. */
    setVar("--cold-veil", "1");
    setVar("--cold-ui", "1");
    setVar("--cold-line", "0");
    setVar("--cold-cap", "0");
    setVar("--cold-skip", "0");
    if (!REDUCED && film) writeFilm(rest.s * 0.30, 0, 0, 0);
  }

  function onKey(e) {
    if (e.key === "Escape" || e.key === "Esc") { e.stopPropagation(); finish(); }
  }

  /* HOLDING THE PAGE STILL WITHOUT TOUCHING LAYOUT. Scrolling behind a veil
     that is about to lift would land the reveal halfway down the page, so the
     input is refused rather than the overflow changed - see the note in
     site.css for why the CSS route was abandoned. Escape is not in this list,
     so the skip still works from the keyboard. */
  var SCROLL_KEYS = {
    ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1,
    PageUp: 1, PageDown: 1, Home: 1, End: 1, " ": 1, Spacebar: 1
  };
  function blockScroll(e) { e.preventDefault(); }
  function blockKeys(e) {
    if (SCROLL_KEYS[e.key] && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
      e.preventDefault();
    }
  }
  function holdPage(on) {
    var m = on ? "addEventListener" : "removeEventListener";
    window[m]("wheel", blockScroll, { passive: false, capture: true });
    window[m]("touchmove", blockScroll, { passive: false, capture: true });
    window[m]("keydown", blockKeys, true);
  }
  function onResize() { rest = readRest(); }

  /* THE TIMELINE MUST NOT DEPEND ON requestAnimationFrame ALONE. A tab that is
     not compositing gets no frames, and measured here the whole sequence sat
     on its first value for two seconds and then fell out of the cap - black
     for the full 2.5s with nothing moving, which is the preloader this was
     written not to be. frame() is a pure function of performance.now(), so a
     timer advances it identically; rAF drives it when frames exist and the
     watchdog carries it when they do not. */
  function schedule() {
    if (done) return;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
    if (!watchdog) {
      watchdog = window.setInterval(function () {
        var now = (window.performance && performance.now ? performance.now() : Date.now());
        if (!done && now - lastFrameAt > 64) frame();
      }, 32);
    }
  }

  function frame() {
    if (done) return;
    var now = (window.performance && performance.now ? performance.now() : Date.now());
    lastFrameAt = now;
    var el = now - t0;

    /* The cap is honoured against the head clock, not this one - it is the
       visitor's wait that is capped, not this loop's. */
    if (now - tHead >= CAP) return finish();

    if (REDUCED) return reducedFrame(el, now);

    /* a. the line, typed one character at a time. */
    var typed = Math.round(seg(el, T.line[0], T.line[1]) * LINE.length);
    if (lineEl.textContent.length !== typed) lineEl.textContent = LINE.slice(0, typed);
    setVar("--cold-line", el >= T.line[0] ? "1" : "0");
    setVar("--cold-caret", el >= T.caret ? "0" : "1");
    setVar("--cold-skip", seg(el, 60, 240).toFixed(3));

    /* b + c. the ring arrives, then collapses to a point. */
    var ringIn = seg(el, T.ring[0], T.ring[1]);
    var coll = seg(el, T.collapse[0], T.collapse[1]);
    var land = seg(el, T.land[0], T.land[1]);

    var s, x, y, op;
    if (land > 0) {
      /* e. out of the point and onto the hero's own composition. */
      var e2 = easeOut(land);
      s = mix(rest.s * 0.035, rest.s, e2);
      x = mix(0, rest.x, e2);
      y = mix(0, rest.y, e2);
      op = mix(0.34, 1, Math.min(1, land * 1.6));
    } else if (coll > 0) {
      var e1 = easeIn(coll);
      s = mix(rest.s * 0.30, rest.s * 0.035, e1);
      x = 0; y = 0;
      op = mix(1, 0.34, e1);
    } else {
      s = rest.s * 0.30; x = 0; y = 0;
      op = easeOut(ringIn);
    }

    /* c. the point forms as the light finishes collapsing. */
    var born = seg(el, T.collapse[1] - 150, T.collapse[1]);
    var ox = innerWidth / 2, oy = innerHeight / 2;
    if (land > 0 && target) {
      var e3 = easeOut(land);
      ox = mix(innerWidth / 2, target.x, e3);
      oy = mix(innerHeight / 2, target.y, e3);
    }

    /* IT SHRINKS TO LEVI'S SIZE, not to an arbitrary fraction of it. The first
       version formed at scale 1 and shrank to 0.62, so the instant the real
       component took over the light jumped back up by a third - a seam at
       precisely the frame the whole sequence exists to make seamless. It is
       born large and arrives at exactly 1, which is what levi.js then draws. */
    var orbScale = land > 0 ? mix(BORN, 1, easeOut(land)) : born * BORN;
    var orbOp = born;

    /* ONE hard stutter, exactly two frames, at the moment it forms. Counted in
       FRAMES rather than milliseconds so it is two frames on any machine - and
       it is the only glitch in the sequence. Sustained corruption would argue
       against the one thing this product claims, which is that nothing happens
       unpredictably. */
    if (el >= T.stutter && stutterFrames < 2) {
      stutterFrames++;
      ox += stutterFrames === 1 ? 9 : -5;
      orbOp = stutterFrames === 1 ? 0.18 : 0.92;
      orbScale *= stutterFrames === 1 ? 0.72 : 1.16;
      op = 0;
    }

    writeFilm(s, x, y, op);
    writeOrb(ox, oy, orbScale, orbOp);

    /* d. the caption, then everything but Levi goes. */
    var out = seg(el, T.land[0], T.land[0] + 220);
    setVar("--cold-line", (1 - out).toFixed(3));
    setVar("--cold-cap", (seg(el, T.cap[0], T.cap[1]) * (1 - out)).toFixed(3));
    setVar("--cold-skip", (seg(el, 60, 240) * (1 - out)).toFixed(3));
    setVar("--cold-veil", (1 - easeOut(seg(el, T.land[0] + 80, T.land[1]))).toFixed(3));

    if (el >= T.end) return finish();
    schedule();
  }

  /* Black screen, line, Levi, page. No collapse, no stutter, no travel - Levi
     simply appears where it rests. The film is not touched at all: under
     reduced motion the stylesheet hides it and shows the poster instead. */
  function reducedFrame(el) {
    lineEl.textContent = LINE;
    setVar("--cold-line", seg(el, T.line[0], T.line[1]).toFixed(3));
    setVar("--cold-caret", "0");
    setVar("--cold-skip", seg(el, 60, 240).toFixed(3));

    var appear = seg(el, T.orbIn[0], T.orbIn[1]);
    var p = target || { x: innerWidth / 2, y: innerHeight / 2 };
    writeOrb(p.x, p.y, 1, appear);

    var out = seg(el, T.out[0], T.out[0] + 200);
    setVar("--cold-cap", (seg(el, T.cap[0], T.cap[1]) * (1 - out)).toFixed(3));
    setVar("--cold-line", (1 - out).toFixed(3));
    setVar("--cold-skip", (seg(el, 60, 240) * (1 - out)).toFixed(3));
    setVar("--cold-veil", (1 - seg(el, T.out[0], T.out[1])).toFixed(3));

    if (el >= T.end) return finish();
    schedule();
  }

  function finish() {
    if (done) return;
    done = true;
    if (raf) cancelAnimationFrame(raf);
    if (watchdog) { window.clearInterval(watchdog); watchdog = null; }
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onResize);
    holdPage(false);

    measured.end = (window.performance && performance.now ? performance.now() : Date.now());

    /* Hand the composition back to the stylesheet. */
    releaseFilm();

    try { window.sessionStorage.setItem(KEY, "1"); } catch (e) {}

    root.classList.remove("is-cold-start", "is-cold-film");
    ["--cold-veil", "--cold-ui", "--cold-line", "--cold-caret", "--cold-cap",
     "--cold-skip", "--cold-orb-s", "--cold-orb-o"].forEach(function (n) {
      root.style.removeProperty(n);
    });
    if (cold && cold.parentNode) cold.parentNode.removeChild(cold);

    window.__coldStart.pending = false;
    window.__coldStart.durationMs = Math.round(measured.end - tHead);
    window.dispatchEvent(new Event("cognivex:cold-start-done"));
  }

  function start() {
    build();

    /* Levi is built but held; ask it where it is going to stand so the light
       can travel there rather than to a guess. */
    if (window.cognivexLevi && window.cognivexLevi.restingPoint) {
      try { target = window.cognivexLevi.restingPoint(); } catch (e) { target = null; }
    }

    /* The first write goes where the light will actually be, which under
       reduced motion is its resting position and not the centre. Writing the
       centre first and correcting a frame later is a travel - an invisible one
       at scale 0, but one frame of bad luck away from a visible flash, and it
       is the exact thing reduced motion asks not to happen. */
    var p0 = (REDUCED && target) ? target : { x: innerWidth / 2, y: innerHeight / 2 };
    writeOrb(p0.x, p0.y, 0, 0);

    t0 = (window.performance && performance.now ? performance.now() : Date.now());
    measured.start = t0;
    lastFrameAt = t0;
    schedule();
  }

  /* DOMContentLoaded, never load: `load` waits for the 497KB clip and the
     webfonts, which would hold the black up past its own cap and turn the
     sequence into exactly the preloader it must not be. Body scripts execute
     in order during parsing, so levi.js's handle already exists here. */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.cognivexColdStart = {
    skip: finish,
    timeline: T,
    cap: CAP,
    stats: function () {
      return {
        pending: window.__coldStart.pending,
        reduced: REDUCED,
        durationMs: window.__coldStart.durationMs || null,
        veilPresent: !!document.querySelector(".cold"),
        htmlClasses: root.className
      };
    }
  };
})();
