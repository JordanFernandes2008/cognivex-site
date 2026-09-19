/* ============================================================================
   LEVI — THE RUNNING COMMENTARY OVER THE DEMO.

   Home page only. This owns no UI and draws nothing: it decides WHAT to say
   and WHAT to point at, and hands both to levi.js, which keeps every rule
   about where the light may go and where the words may land.

   WHY THE ITEM LINES FIRE ON THE WALKTHROUGH AND NOT THE QUEUE.
   The six keys in the set are emailReply, invoice, socialPost, complaint,
   repeatQuestion and noise. Those are the walkthrough's six scripted panels,
   exactly and in order. The approval queue's 65 items carry eleven different
   kinds - Email reply, Reminder, Invoice, Social post, Payment, Booking,
   Subscription, Order, Document, Delivery, Calendar - and there is no
   complaint, repeat question or noise among them, so three of the six would
   have had nothing to fire on and the other three would have fired on the
   wrong thing. The queue gets the keys that are actually about it: intro,
   why, controls, the three after-lines, empty and watching. Those need
   Approve / Edit / Skip, a counter that empties and a WATCH mode, and the
   walkthrough has none of them.

   ONE THING AT A TIME. Everything here is a one-shot except the item lines,
   and a line that has just landed is protected for a beat, so arriving in the
   walkthrough does not fire the item and its reasoning in the same second.
   ========================================================================== */
(function () {
  "use strict";

  if (!window.LEVI_LINES || !window.LEVI_LINES.home ||
      !window.LEVI_LINES.home.demo) return;
  if (!window.LEVI_VOICE || window.LEVI_VOICE.page !== "home") return;

  var L = null;
  var REDUCED = window.matchMedia &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* levi.js publishes its API at the end of its own start-up, and its start is
     a gate that keeps re-checking until the page can actually hold the light.
     So this waits rather than assuming, and gives up quietly. */
  var waited = 0;
  (function wait() {
    L = window.cognivexLevi;
    if (L && L.speak && L.leanTo) { begin(); return; }
    waited += 160;
    if (waited > 12000) return;
    window.setTimeout(wait, 160);
  })();

  function begin() {
    var app  = document.querySelector(".app");
    var walk = document.querySelector("[data-walk]");
    var busyUntil = 0;
    var once = {};

    function now() {
      return (window.performance && performance.now) ? performance.now() : Date.now();
    }

    /* PRIORITY IS JUST TIME. A line that has landed holds the box for a beat;
       anything lower-priority arriving inside that beat is dropped rather than
       queued, because a queued line arrives after the thing it describes has
       gone. Item lines and the after-lines are allowed to interrupt. */
    /* A LEAN LASTS AS LONG AS THE LINE DOES, AND NOT ONE SECOND LONGER.

       leanTo() pins the light with the same `lure` the approve gesture uses,
       and the gesture clears its own after a second. This did not: from the
       moment demo.intro fired, the light was pinned and stopped following the
       page for the rest of the visit. Measured at 390x844 - star at 23,754 at
       scrollY 140, 600 and 1300 alike, with the box frozen behind it and
       therefore suppressed nearly everywhere.

       One timer, reset by whatever speaks next, so the newest lean owns it. */
    var leanT = null;
    function say(key, opts) {
      opts = opts || {};
      if (!opts.force && now() < busyUntil) return false;
      var line = L.voice("demo", key);
      if (!line) return false;
      if (!L.speak(line, opts.how || {})) return false;
      var hold = opts.hold || 2600;
      busyUntil = now() + hold;
      if (leanT) { window.clearTimeout(leanT); leanT = null; }
      if (opts.at) {
        L.leanTo(opts.at);
        leanT = window.setTimeout(function () {
          leanT = null;
          L.releaseLean();
        }, hold);
      }
      return true;
    }

    /* ---- GEOMETRY DECIDES, exactly as it does in levi.js -------------------
       IntersectionObserver delivery is tied to rendering, so a starved or
       throttled frame loop delays it or drops it entirely - measured here,
       the app surface scrolled fully into view and demo.intro never fired
       while the walkthrough, which is driven by a MutationObserver on the
       panels, narrated all six items correctly. getBoundingClientRect is
       right the instant it is asked. One throttled read on scroll. */
    function shown(el, need) {
      if (!el) return false;
      var vh = document.documentElement.clientHeight;
      var r = el.getBoundingClientRect();
      if (r.height < 1) return false;
      var vis = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      return vis > 0 && vis / Math.min(r.height, vh) >= need;
    }

    var WHY = ".walk__why, .card__why, .detail__why";
    /* MARKED ONLY IF IT WAS ACTUALLY SAID. Setting the one-shot first and
       then speaking loses the line for good whenever say() declines - which
       it does whenever another line is still holding the box. Measured:
       demo.controls was marked fired and never appeared, because hovering
       Approve happened inside the beat the reasoning line had reserved. */
    var scanT = null;
    function scan() {
      if (app && !once.intro && shown(app, 0.3)) {
        if (say("intro", { at: app, hold: 3000 })) once.intro = 1;
        return;
      }
      if (walk && !once.walkSeen && shown(walk, 0.35)) {
        once.walkSeen = 1;              /* narrateActive forces, so it lands */
        narrateActive(true);
        return;
      }
      if (!once.why) {
        var all = document.querySelectorAll(WHY);
        for (var i = 0; i < all.length && i < 24; i++) {
          if (shown(all[i], 0.55)) { whySeen(all[i]); return; }
        }
      }
    }
    function scanSoon() {
      if (scanT) return;
      scanT = window.setTimeout(function () { scanT = null; scan(); }, 180);
    }
    window.addEventListener("scroll", scanSoon, { passive: true });
    window.addEventListener("resize", scanSoon);

    /* AND A BACKSTOP, because one event is one point of failure. Measured:
       Lenis's own scrollTo({immediate:true}) moves the page without
       dispatching a scroll event at all, so every one of these one-shots sat
       unfired with the demo 79% on screen. A real wheel does fire it, but
       anything that moves the page another way - an anchor, a restored
       position, a pin releasing - would not.

       Three reads of getBoundingClientRect, twice a second, and it stops
       itself the moment there is nothing left to wait for. */
    var backstop = window.setInterval(function () {
      if (once.intro && once.walkSeen && once.why) {
        window.clearInterval(backstop);
        return;
      }
      scan();
    }, 500);
    window.setTimeout(function () { window.clearInterval(backstop); }, 180000);
    window.setTimeout(scan, 500);

    /* ---- one line per scripted item, as it comes into focus ---------------
       By the kind printed on the panel, with the declared order as the
       fallback - so reordering the panels in the markup cannot silently
       shift every line onto the wrong item. */
    var BY_KIND = {
      "EMAIL REPLY": "emailReply",
      "INVOICE": "invoice",
      "SOCIAL POST": "socialPost",
      "COMPLAINT": "complaint",
      "THE SAME QUESTION, THREE TIMES": "repeatQuestion",
      "NOTHING TO DO": "noise"
    };
    var BY_ORDER = ["emailReply", "invoice", "socialPost",
                    "complaint", "repeatQuestion", "noise"];

    function keyOf(panel, index) {
      var k = panel.querySelector(".walk__kind");
      var txt = k ? (k.textContent || "").trim().toUpperCase().replace(/\s+/g, " ") : "";
      return BY_KIND[txt] || BY_ORDER[index] || null;
    }

    /* FUNCTION SCOPE, NOT BLOCK SCOPE. This file is strict, so a function
       DECLARATION inside `if (walk) { ... }` is scoped to that block and
       scan() - which is declared above it and calls it - would have thrown a
       ReferenceError the first time the walkthrough came into view. Declared
       as a var at the same level as everything that calls it. */
    var panels = walk ? [].slice.call(walk.querySelectorAll("[data-walk-panel]")) : [];
    var lastPanel = -1;

    var activeIndex = function () {
      for (var i = 0; i < panels.length; i++) {
        if (!panels[i].hidden && panels[i].getAttribute("aria-hidden") !== "true") return i;
      }
      return -1;
    };

    var narrateActive = function (force) {
      var i = activeIndex();
      if (i < 0 || (!force && i === lastPanel)) return;
      lastPanel = i;
      var key = keyOf(panels[i], i);
      if (!key) return;
      /* The item is the subject, so it may interrupt whatever preceded it -
         and it is what the light leans toward. */
      say(key, { at: panels[i], force: true, hold: 2800 });
    };

    /* walk.js swaps `hidden` and `aria-hidden` on the panels, so the panels
       themselves are the thing to watch - not the tabs, which would miss the
       Back / Next buttons and the keyboard arrows. */
    if (walk && window.MutationObserver) {
      new MutationObserver(function () { narrateActive(false); })
        .observe(walk, { subtree: true, attributes: true,
                         attributeFilter: ["hidden", "aria-hidden"] });
    }

    /* ---- the reasoning ---------------------------------------------------
       Three surfaces carry it: the walkthrough panel, the queue card, and the
       reading pane in the right-hand panel. Focus counts as revealing it, and
       so does it simply being on screen - but not within the beat after the
       item line, which is the sentence it belongs to. */
    function whySeen(el) {
      if (once.why) return;
      if (say("why", { at: el, hold: 3000 })) once.why = 1;
    }

    document.addEventListener("focusin", function (e) {
      var w = e.target && e.target.closest ? e.target.closest(WHY) : null;
      if (w) whySeen(w);
    }, true);

    /* ---- the three controls ---------------------------------------------- */
    var CONTROLS = "[data-approve],[data-edit],[data-skip]";
    function controlsSeen(e) {
      if (once.controls) return;
      var b = e.target && e.target.closest ? e.target.closest(CONTROLS) : null;
      if (!b) return;
      /* Lean at the row of buttons, not at the card: the card is the thing
         being kept clear. */
      if (say("controls", { at: b.parentNode || b, hold: 2600 })) once.controls = 1;
    }
    document.addEventListener("pointerover", controlsSeen, true);
    document.addEventListener("focusin", controlsSeen, true);

    /* ---- WATCH mode, unattended ------------------------------------------
       site.js puts .is-autoplaying on the app while the demo is driving
       itself and takes it off the moment the visitor touches anything. So the
       question "did they sit through it" is: has that class been on, with the
       app on screen, for long enough, without a single act. */
    if (app) {
      var acted = false;
      var watchT = null;

      function stopWatching() {
        acted = true;
        if (watchT) { window.clearTimeout(watchT); watchT = null; }
      }
      /* REAL INPUT ONLY, which is the whole question here. WATCH mode drives
         itself by calling .click() on the Approve buttons, and those clicks
         bubble to this listener exactly like a visitor's would - so sitting
         and watching the demo run was being counted as acting on it, and the
         one line written for people who do that could never fire. isTrusted
         is false for anything a script dispatched; site.js draws the same
         line for the same reason a few files over. */
      function realAct(e) {
        if (!e.isTrusted) return;
        if (app.contains(e.target)) stopWatching();
      }
      document.addEventListener("click", realAct, true);
      document.addEventListener("keydown", realAct, true);
      document.addEventListener("pointerdown", realAct, true);

      var tick = window.setInterval(function () {
        if (acted || once.watching) { window.clearInterval(tick); return; }
        var r = app.getBoundingClientRect();
        var onScreen = r.bottom > 80 && r.top < document.documentElement.clientHeight - 80;
        if (!onScreen || !app.classList.contains("is-autoplaying")) {
          if (watchT) { window.clearTimeout(watchT); watchT = null; }
          return;
        }
        if (watchT) return;
        watchT = window.setTimeout(function () {
          watchT = null;
          if (acted || once.watching) return;
          if (say("watching", { at: app, hold: 2800 })) once.watching = 1;
        }, REDUCED ? 3000 : 7000);
      }, 900);
    }

    /* For the verification harness, and for anyone wondering why a line did
       not fire. Reports state, never changes it. */
    window.cognivexLeviDemo = {
      fired: function () { return JSON.parse(JSON.stringify(once)); },
      busy: function () { return Math.max(0, Math.round(busyUntil - now())); },
      say: function (key) { return say(key, { force: true }); },
      itemKeys: BY_ORDER.slice()
    };
  }
})();
