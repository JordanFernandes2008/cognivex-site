/* ============================================================================
   THE COLD START — the gate.

   This is the only part that must block parsing, and it is kept small for that
   reason. It decides whether the sequence runs, puts the black up on the first
   paint, and arms the failsafe. The timeline itself lives in cold.js, which is
   deferred and so costs a visitor nothing at parse time - measured, the single
   file this replaces was 18,380 bytes with renderBlockingStatus "blocking", on
   every load including the ones where the sequence does not play at all.

   A class on documentElement is the only thing that can be set before <body>
   exists, which is what puts the black on the first paint rather than flashing
   the page and then covering it. Nothing is hidden by default: every rule the
   sequence uses is gated on a class only this file can add, so with JavaScript
   off there is no class, no veil, and the page is simply the page.

   THE FAILSAFE LIVES HERE, not in cold.js, deliberately. cold.js blocks wheel,
   touch and scroll keys while the sequence runs; if it were to throw, stall,
   or never arrive, a visitor would be left unable to scroll - which is worse
   than anything it was fixing. The release therefore belongs in the file that
   is guaranteed to have executed, and it runs on a timer armed before cold.js
   is even requested.
   ========================================================================== */
(function () {
  "use strict";

  var KEY = "cognivex.coldstart.seen";
  var root = document.documentElement;

  /* Once per session. Checked before anything is flagged or added, so a second
     visit leaves film.js and levi.js to start normally with no deferral, no
     class, and nothing to undo. */
  try { if (window.sessionStorage.getItem(KEY) === "1") return; } catch (e) {}

  /* Only where the sequence belongs. Only index.html loads this, but the guard
     is here too so including it elsewhere cannot surprise. */
  var path = location.pathname.replace(/\/index\.html$/, "/");
  if (path !== "/" && path !== "/index.html" && !/\/$/.test(path)) return;

  var REDUCED = window.matchMedia &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* The cap is a promise to the visitor, so it is measured from the moment the
     black goes up - not from when the timeline happens to start. Raised with
     the timeline when the sequence was lengthened on request. */
  var tHead = (window.performance && performance.now) ? performance.now() : Date.now();
  var CAP = 4600;

  /* film.js, levi.js and cold.js all read this synchronously when they load. */
  var cs = window.__coldStart = {
    pending: true,
    reduced: REDUCED,
    t0: tHead,
    cap: CAP,
    key: KEY,
    /* cold.js installs the real ones; until then these stay null and panic()
       simply does the parts it can. */
    finish: null,
    release: null
  };

  root.classList.add("is-cold-start");
  if (!REDUCED) root.classList.add("is-cold-film");

  /* Everything a visitor needs back, in the order they need it, each step
     independent so one failure cannot prevent the next. Safe to run twice. */
  function panic() {
    /* 1. the page must be usable: input first, always. */
    try { if (cs.release) cs.release(); } catch (e) {}
    /* 2. the page must be visible. */
    try { root.classList.remove("is-cold-start", "is-cold-film"); } catch (e) {}
    /* 3. no overlay left behind. */
    try {
      var n = document.querySelector(".cold");
      if (n && n.parentNode) n.parentNode.removeChild(n);
    } catch (e) {}
    /* 4. a sequence that failed does not get to fail again this session. */
    try { window.sessionStorage.setItem(KEY, "1"); } catch (e) {}
    /* 5. film.js and levi.js are waiting on this and must never be stranded. */
    if (cs.pending) {
      cs.pending = false;
      try { window.dispatchEvent(new Event("cognivex:cold-start-done")); } catch (e) {}
    }
  }
  cs.panic = panic;

  /* ARMED BEFORE cold.js IS EVEN REQUESTED. If it never arrives, throws while
     building, or stalls with the input still blocked, this still runs. */
  window.setTimeout(function () {
    try { if (cs.finish) cs.finish(); } catch (e) {}
    panic();
  }, CAP);
})();
