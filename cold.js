/* ============================================================================
   THE COLD START — the sequence.

   Levi is born out of the film, and the film lands on the page. boot.js in the
   head decided this runs, put the black up and armed the failsafe; this file
   is deferred, so it never blocks parsing, and on a visit where the sequence
   does not play it returns on its first line.

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

  /* boot.js is the gate. If it decided against the sequence - already seen
     this session, wrong page - there is nothing here to do. */
  var cs = window.__coldStart;
  if (!cs || !cs.pending) return;

  var root = document.documentElement;
  var KEY = cs.key;
  var REDUCED = cs.reduced;
  var tHead = cs.t0;
  var CAP = cs.cap;

  /* ---- the timeline ------------------------------------------------------
     Offsets in ms from the moment the overlay exists. Driven off
     performance.now() in one rAF loop rather than off CSS transitions,
     because a single clock that owns every value cannot desynchronise - and
     because the sequence has a hard cap it must be able to honour. */
  /* LONGER, ON REQUEST. The original brief capped this at 1.5-2.5s; that has
     been relaxed deliberately, so the beats now have room to be watched rather
     than glimpsed. The ring holds, the collapse is slower, and the landing is
     a full second. The hard cap moves with it. */
  var T = REDUCED ? {
    line: [0, 1], caret: 1,
    orbIn: [420, 900],
    cap: [600, 1000],
    out: [1700, 2300],
    end: 2300
  } : {
    line: [0, 560], caret: 600,      /* a. typed, not glitched                */
    ring: [600, 1150],               /* b. the ring, small and centred        */
    collapse: [1450, 2050],          /* c. the light collapses inward         */
    stutter: 2050,                   /*    two frames, once, and never again  */
    cap: [2120, 2420],               /* d. Levi. First model. In development. */
    land: [2700, 3900],              /* e. travel out, film lands on the hero */
    end: 3900
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

  /* boot.js's failsafe calls these. Declarations hoist, so wiring them here is
     safe and means the guarantee is live before anything else happens. */
  cs.finish = function () { finish(); };
  cs.release = function () { holdPage(false); };

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
    var c = getComputedStyle(film);
    var r = {
      s: parseFloat(c.getPropertyValue("--film-s")) || 0.95,
      x: parseFloat(c.getPropertyValue("--film-x")),
      y: parseFloat(c.getPropertyValue("--film-y"))
    };
    /* At the default breakpoint these are not declared at all - the values
       live in the var() fallbacks - so NaN here means .95/31%/26%. */
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

  function onKey(e) {
    if (e.key === "Escape" || e.key === "Esc") { e.stopPropagation(); finish(); }
  }
  function onResize() { rest = readRest(); }

  /* HOLDING THE PAGE STILL WITHOUT TOUCHING LAYOUT. Scrolling behind a veil
     that is about to lift would land the reveal halfway down the page, so the
     input is refused rather than the overflow changed: toggling overflow on
     <html> or on body retargets the viewport's scroll container and leaves a
     stale scroll width behind - measured, 15px, genuinely scrollable, where
     the very next load was 0.

     Escape is not in this list, so the skip still works from the keyboard. */
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

  /* THE TIMELINE MUST NOT DEPEND ON requestAnimationFrame ALONE. A tab that is
     not compositing gets no frames, and measured here the whole sequence sat
     on its first value for two seconds and then fell out of the cap - black
     for the full 2.5s with nothing moving, which is the preloader this was
     written not to be. runFrame() is a pure function of performance.now(), so
     a timer advances it identically; rAF drives it when frames exist and the
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

  /* ONE CHOKE POINT, so a throw anywhere in the timeline ends the sequence
     rather than leaving the page black with the input still refused. Without
     this the rAF chain simply dies and the only thing left is boot.js's cap,
     which means 2.5 seconds of a page the visitor cannot scroll. */
  function frame() {
    try { runFrame(); }
    catch (e) { finish(); }
  }

  function runFrame() {
    if (done) return;
    var now = (window.performance && performance.now ? performance.now() : Date.now());
    lastFrameAt = now;
    var el = now - t0;

    /* The cap is honoured against the head clock, not this one - it is the
       visitor's wait that is capped, not this loop's. */
    if (now - tHead >= CAP) return finish();

    if (REDUCED) return reducedFrame(el);

    /* a. the line, typed one character at a time. */
    var typed = Math.round(seg(el, T.line[0], T.line[1]) * LINE.length);
    if (lineEl.textContent.length !== typed) lineEl.textContent = LINE.slice(0, typed);
    setVar("--cold-line", el >= T.line[0] ? "1" : "0");
    setVar("--cold-caret", el >= T.caret ? "0" : "1");

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
    var born = seg(el, T.collapse[1] - 260, T.collapse[1]);
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
    /* With no Levi to hand to - a narrow window, where the tour does not run -
       the light has nowhere to arrive, so it goes out with the veil instead of
       vanishing with the overlay. */
    var orbOp = born * (target ? 1 : (land > 0 ? 1 - easeOut(land) : 1));

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

  /* Ordered by what a visitor needs back, most important first, and every step
     independent so one failure cannot prevent the next. The input release is
     not last and is not inside anything that can throw first: a visitor left
     unable to scroll is worse than every other failure on this list. */
  function finish() {
    if (done) return;
    done = true;

    try { holdPage(false); } catch (e) {}
    try { if (raf) cancelAnimationFrame(raf); } catch (e) {}
    try { if (watchdog) { window.clearInterval(watchdog); watchdog = null; } } catch (e) {}
    try {
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", onResize);
    } catch (e) {}

    /* Hand the composition back to the stylesheet. */
    try { releaseFilm(); } catch (e) {}

    try {
      root.classList.remove("is-cold-start", "is-cold-film");
      ["--cold-veil", "--cold-ui", "--cold-line", "--cold-caret", "--cold-cap",
       "--cold-skip", "--cold-orb-s", "--cold-orb-o"].forEach(function (n) {
        root.style.removeProperty(n);
      });
    } catch (e) {}

    try { if (cold && cold.parentNode) cold.parentNode.removeChild(cold); } catch (e) {}
    try { window.sessionStorage.setItem(KEY, "1"); } catch (e) {}

    measured.end = (window.performance && performance.now ? performance.now() : Date.now());

    if (cs.pending) {
      cs.pending = false;
      cs.durationMs = Math.round(measured.end - tHead);
      try { window.dispatchEvent(new Event("cognivex:cold-start-done")); } catch (e) {}
    }
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
    document.addEventListener("DOMContentLoaded", function () {
      try { start(); } catch (e) { finish(); }
    }, { once: true });
  } else {
    try { start(); } catch (e) { finish(); }
  }

  window.cognivexColdStart = {
    skip: finish,
    timeline: T,
    cap: CAP,
    stats: function () {
      return {
        pending: cs.pending,
        reduced: REDUCED,
        durationMs: cs.durationMs || null,
        veilPresent: !!document.querySelector(".cold"),
        htmlClasses: root.className
      };
    }
  };
})();
