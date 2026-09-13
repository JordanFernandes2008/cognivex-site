/* ============================================================================
   Cognivex — Demo 1, the approval queue.

   Architecture note, because it is the whole reason this feels solid:

   State changes are SYNCHRONOUS. Clicking Approve moves the card out of the
   stack immediately, so layout is final before any animation starts. Motion is
   a separate, purely visual layer painted on top — an absolutely positioned
   "ghost" echoes the departing card while the survivors FLIP into their new
   positions. Nothing is ever waiting on an animation to finish.

   That is what makes it interruptible. Click Approve five times as fast as you
   can and you get five instant state changes and five overlapping ghosts; the
   survivors retarget from wherever they currently are, because FLIP measures
   live visual rectangles rather than assuming a resting position. No animation
   queue, so nothing can fall behind or snap.

   Everything animated is transform or opacity. Nothing animates width, height,
   top or left.
   ========================================================================== */

(function () {
  "use strict";

  var root = document.querySelector("[data-queue]");
  if (!root) return;

  var CAN_ANIMATE = typeof Element !== "undefined" && !!Element.prototype.animate;
  var FLIP_TAG = "cvx-flip";

  var SPRING = "cubic-bezier(.34, 1.4, .64, 1)";
  var EASE_OUT = "cubic-bezier(.22, .78, .36, 1)";
  var EASE_IN = "cubic-bezier(.5, 0, .78, .28)";

  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  function still() { return motionQuery.matches || !CAN_ANIMATE; }

  var stack = root.querySelector("[data-stack]");
  var log = root.querySelector("[data-log]");
  var empty = root.querySelector("[data-empty]");
  var status = root.querySelector("[data-status]");
  var counter = root.querySelector("[data-roller]");
  var resetBtn = root.querySelector("[data-reset]");

  // Snapshot the original order and draft text so Reset is a true restore.
  var originals = Array.prototype.slice.call(stack.children).map(function (card) {
    var draft = card.querySelector("[data-draft]");
    return { el: card, text: draft ? draft.textContent : "" };
  });

  /* --- FLIP ---------------------------------------------------------------
     Measure where things are NOW (including any transform mid-flight), let the
     caller mutate the DOM, then animate from the old position to the new one. */
  function flip(els, mutate) {
    if (still()) { mutate(); return; }

    var first = new Map();
    els.forEach(function (el) { first.set(el, el.getBoundingClientRect()); });

    // Drop in-flight FLIPs only. Ghost animations are left alone — they are
    // independent and own their own lifecycle.
    els.forEach(function (el) {
      el.getAnimations().forEach(function (a) { if (a.id === FLIP_TAG) a.cancel(); });
    });

    mutate();

    var moved = 0;
    els.forEach(function (el) {
      var f = first.get(el);
      if (!f || !el.isConnected) return;
      var l = el.getBoundingClientRect();
      var dx = f.left - l.left;
      var dy = f.top - l.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

      var anim = el.animate(
        [{ transform: "translate(" + dx + "px," + dy + "px)" }, { transform: "none" }],
        { duration: 320, easing: SPRING, delay: Math.min(moved * 50, 150) }
      );
      anim.id = FLIP_TAG;
      moved += 1;
    });
  }

  /* --- The exit ghost -----------------------------------------------------
     A visual echo of a card that has already left the stack. Cloned, stripped
     of anything interactive, and removed when it finishes. */
  function ghost(card, rect) {
    if (still()) return;

    /* Only ever one card is visibly leaving. Approving rapidly would otherwise
       stack ghosts at the same coordinates — each correct on its own, but a
       pile-up that reads as clutter. Fast-forwarding the previous one settles
       it instantly: by the time the next card departs, the last has gone. */
    root.querySelectorAll(".ghost").forEach(function (old) {
      var running = old.getAnimations();
      if (running.length) running.forEach(function (a) { a.finish(); });
      else old.remove();
    });

    var host = root.getBoundingClientRect();
    var copy = card.cloneNode(true);
    copy.classList.add("ghost");
    copy.removeAttribute("data-item");
    copy.setAttribute("aria-hidden", "true");
    copy.querySelectorAll("button, textarea, a, input").forEach(function (n) { n.remove(); });

    copy.style.top = rect.top - host.top + "px";
    copy.style.left = rect.left - host.left + "px";
    copy.style.width = rect.width + "px";
    copy.style.height = rect.height + "px";
    root.appendChild(copy);

    // Two beats: a short lift, then an accelerating departure. It should read
    // like a card being cleared off a desk rather than a div being hidden.
    var anim = copy.animate(
      [
        { transform: "translateY(0) rotate(0) scale(1)", opacity: 1, easing: EASE_OUT },
        { transform: "translateY(-7px) rotate(-.8deg) scale(1.012)", opacity: 1, offset: 0.36, easing: EASE_IN },
        { transform: "translateY(-26px) rotate(-1.6deg) scale(.972)", opacity: 0 }
      ],
      { duration: 330 }
    );
    anim.onfinish = function () { copy.remove(); };
    anim.oncancel = function () { copy.remove(); };
  }

  /* --- Rolling counter ---------------------------------------------------- */
  function digit(value) {
    var d = document.createElement("span");
    d.className = "roller__digit";
    d.textContent = String(value);
    return d;
  }

  function roll(value) {
    if (!counter) return;
    var track = counter.querySelector(".roller__track");

    if (still()) {
      track.textContent = "";
      track.appendChild(digit(value));
      return;
    }

    track.getAnimations().forEach(function (a) { a.cancel(); });
    // Collapse to the most recent digit; that is the true "from" if an earlier
    // roll was interrupted part way.
    while (track.children.length > 1) track.removeChild(track.firstChild);
    if (track.firstChild && track.firstChild.textContent === String(value)) return;

    track.appendChild(digit(value));
    var anim = track.animate(
      [{ transform: "translateY(0)" }, { transform: "translateY(-1em)" }],
      { duration: 300, easing: SPRING }
    );
    function settle() {
      while (track.children.length > 1) track.removeChild(track.firstChild);
    }
    anim.onfinish = settle;
    anim.oncancel = settle;
  }

  /* --- Records ------------------------------------------------------------ */
  function addRecord(card, outcome) {
    var row = document.createElement("li");
    row.className = "record" + (outcome === "Skipped" ? " record--skipped" : "");

    var what = document.createElement("p");
    what.className = "record__what";
    var strong = document.createElement("b");
    // textContent throughout. Nothing from a draft ever reaches innerHTML.
    strong.textContent = card.querySelector("[data-kind]").textContent;
    what.appendChild(strong);
    what.appendChild(document.createTextNode(" · " + card.querySelector("[data-meta]").textContent));

    var tag = document.createElement("p");
    tag.className = "record__tag mono";
    tag.textContent = outcome;

    row.appendChild(what);
    row.appendChild(tag);
    log.appendChild(row);

    if (!still()) {
      row.animate(
        [{ transform: "translateY(10px)", opacity: 0 }, { transform: "none", opacity: 1 }],
        { duration: 300, easing: SPRING, delay: 60 }
      );
    }
  }

  /* --- Queue state -------------------------------------------------------- */
  function cards() { return Array.prototype.slice.call(stack.children); }

  function setActive(focusIt) {
    var list = cards();
    list.forEach(function (c, i) { c.classList.toggle("is-active", i === 0); });
    if (focusIt && list[0]) {
      var btn = list[0].querySelector("[data-approve]");
      if (btn) btn.focus();
    }
  }

  function refresh(focusIt) {
    var left = cards().length;
    roll(left);
    if (empty) empty.hidden = left !== 0;
    if (resetBtn) resetBtn.hidden = left !== 0;
    setActive(focusIt);
    if (left === 0 && focusIt && resetBtn) resetBtn.focus();
  }

  function say(message) { if (status) status.textContent = message; }

  function closeEditor(card) {
    var editor = card.querySelector("[data-editor]");
    if (editor) editor.remove();
    var draft = card.querySelector("[data-draft]");
    if (draft) draft.hidden = false;
    var btn = card.querySelector("[data-edit]");
    if (btn) btn.textContent = "Edit";
  }

  function resolve(card, outcome, message) {
    closeEditor(card);
    var rect = card.getBoundingClientRect();
    var survivors = cards().filter(function (c) { return c !== card; });

    ghost(card, rect);
    flip(survivors, function () { card.remove(); });

    addRecord(card, outcome);
    refresh(true);
    say(message);
  }

  function sendToBack(card) {
    closeEditor(card);
    var all = cards();
    if (all.length < 2) { say("Nothing else waiting — it stays where it is."); return; }
    flip(all, function () { stack.appendChild(card); });
    refresh(true);
    say("Moved to the back of the queue. Nothing was sent.");
  }

  /* --- Interaction -------------------------------------------------------- */
  stack.addEventListener("click", function (event) {
    var button = event.target.closest("button");
    if (!button || !stack.contains(button)) return;
    var card = button.closest("[data-item]");
    if (!card || !card.classList.contains("is-active")) return;

    // Press feedback, on the control itself.
    if (!still()) {
      button.animate(
        [{ transform: "scale(1)" }, { transform: "scale(.965)" }, { transform: "scale(1)" }],
        { duration: 170, easing: EASE_OUT }
      );
    }

    if (button.hasAttribute("data-approve")) {
      resolve(card, "Approved", "Approved. It would send now.");
    } else if (button.hasAttribute("data-skip")) {
      sendToBack(card);
    } else if (button.hasAttribute("data-edit")) {
      var editor = card.querySelector("[data-editor]");
      var draft = card.querySelector("[data-draft]");
      if (editor) {
        draft.textContent = editor.value;      // text in, text out
        closeEditor(card);
        say("Draft saved. Still waiting for your approval.");
      } else {
        var box = document.createElement("textarea");
        box.className = "card__edit";
        box.setAttribute("data-editor", "");
        box.setAttribute("aria-label", "Edit this draft before approving it");
        box.value = draft.textContent;
        draft.hidden = true;
        draft.parentNode.insertBefore(box, draft.nextSibling);
        box.focus();
        button.textContent = "Save";
        say("Editing. Nothing sends until you approve it.");
      }
    }
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      log.textContent = "";
      originals.forEach(function (entry) {
        closeEditor(entry.el);
        var draft = entry.el.querySelector("[data-draft]");
        if (draft) draft.textContent = entry.text;
        stack.appendChild(entry.el);
      });
      refresh(true);
      say("Queue restored.");
    });
  }

  /* Ghosts and the rolling counter are decoration; the DOM stack is the truth.
     A backgrounded tab freezes requestAnimationFrame, so an in-flight animation
     neither finishes nor cancels and its cleanup never runs. Reconcile forces
     the resting state back to correct without waiting on any animation. */
  function reconcile() {
    root.querySelectorAll(".ghost").forEach(function (g) { g.remove(); });
    var track = counter && counter.querySelector(".roller__track");
    if (track) {
      track.getAnimations().forEach(function (a) { a.cancel(); });
      track.textContent = "";
      track.appendChild(digit(cards().length));
    }
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) reconcile();
  });

  // Keep behaviour honest if the user changes the setting mid-session.
  if (motionQuery.addEventListener) {
    motionQuery.addEventListener("change", function () { reconcile(); refresh(false); });
  }

  refresh(false);
})();

/* ============================================================================
   Page shell — navigation and the loop diagram.

   Both are written so that a failed or disabled script leaves the page usable
   rather than broken: the mobile panel starts OPEN in the markup and is closed
   by script, and the connecting line is drawn in CSS and only then taken to
   zero by script so it can animate. Neither begins at opacity 0.
   ========================================================================== */

(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* --- Mobile navigation -------------------------------------------------- */
  var toggle = document.querySelector("[data-nav-toggle]");
  var panel = document.querySelector("[data-nav-panel]");
  var closer = document.querySelector("[data-nav-close]");

  if (toggle && panel) {
    var opener = null;

    function setOpen(open) {
      panel.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    }

    // The panel ships open so that navigation exists without JavaScript.
    // Now that script is running, close it and hand control to the button.
    setOpen(false);

    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      opener = open ? null : document.activeElement;
      setOpen(!open);
      if (!open && closer) closer.focus();
    });

    if (closer) {
      closer.addEventListener("click", function () {
        setOpen(false);
        if (opener && opener.focus) opener.focus();
        else toggle.focus();
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (toggle.getAttribute("aria-expanded") !== "true") return;
      setOpen(false);
      toggle.focus();
    });

    // Following a link inside the panel should not leave it open behind you.
    panel.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });
  }

  /* --- The loop line ------------------------------------------------------
     One scroll-triggered animation on the whole page, and it earns it: the
     line drawing left to right through the three steps is the positioning
     argument made visually, with the human step at the end. */
  var steps = document.querySelector("[data-loop]");

  if (steps && !reduce.matches && "IntersectionObserver" in window) {
    // Adding .js is what takes the line to scaleX(0). Without script the CSS
    // leaves it at full width, so the diagram is never missing a connector.
    steps.classList.add("js");

    var seen = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-drawn");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.35 });

    seen.observe(steps);
  }
})();

/* ============================================================================
   Atmosphere — the layer that makes the page feel built rather than assembled.

   Everything here is additive decoration injected by script. With JavaScript
   off none of it exists and the page is still complete: no element is hidden
   waiting for an observer, because the hiding class is applied by this file.
   ========================================================================== */

(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var raf = window.requestAnimationFrame.bind(window);

  /* --- Scroll progress + cursor glow ------------------------------------- */
  var progress = document.createElement("div");
  progress.className = "scroll-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.appendChild(progress);

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    raf(function () {
      ticking = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      progress.style.transform = "scaleX(" + pct + ")";
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* --- Staggered entrances ------------------------------------------------
     Armed by script, so the resting state in CSS is "visible". */
  var risers = [].slice.call(document.querySelectorAll("[data-rise]"));

  if (risers.length && !reduce.matches && "IntersectionObserver" in window) {
    risers.forEach(function (el) {
      el.classList.add("is-armed");
      var delay = el.getAttribute("data-rise-delay");
      if (delay) el.style.setProperty("--rise-delay", delay + "ms");
    });

    var observerFired = false;

    var seen = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observerFired = true;
        entry.target.classList.remove("is-armed");
        entry.target.classList.add("is-risen");
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    risers.forEach(function (el) { seen.observe(el); });

    /* Anything already on screen at load rises immediately rather than waiting
       for a scroll that may never come. Deliberately NOT inside
       requestAnimationFrame: rAF is frozen in a background or non-compositing
       tab, and this path decides whether content is visible at all. The script
       is at the end of <body>, so layout is already measurable here. */
    risers.forEach(function (el) {
      var box = el.getBoundingClientRect();
      if (box.top < window.innerHeight * 0.92) {
        el.classList.remove("is-armed");
        el.classList.add("is-risen");
        seen.unobserve(el);
      }
    });

    /* Failsafe. Arming these elements is the one thing on the page that can
       hide content, so it must not depend on an observer that might never
       fire — a background tab, a dormant renderer, an engine quirk. If nothing
       has risen shortly after load, assume the observer is dead and show
       everything. Content visibility is never left to chance. */
    window.setTimeout(function () {
      /* Checks the OBSERVER specifically, not whether anything is visible:
         the above-the-fold elements are revealed synchronously above, so their
         being visible proves nothing about whether the observer works. */
      if (observerFired) return;
      risers.forEach(function (el) {
        el.classList.remove("is-armed");
        el.classList.add("is-risen");
        seen.unobserve(el);
      });
    }, 2500);
  }

  /* --- Magnetic pull ------------------------------------------------------
     The control leans a few pixels toward the cursor. Uses the independent
     `translate` property so it never fights the `transform` used for the
     press-down scale. */
  if (!reduce.matches) {
    [].slice.call(document.querySelectorAll("[data-magnetic]")).forEach(function (el) {
      var pending = false, mx = 0, my = 0;

      el.addEventListener("pointermove", function (event) {
        var box = el.getBoundingClientRect();
        mx = ((event.clientX - box.left) / box.width - 0.5) * 14;
        my = ((event.clientY - box.top) / box.height - 0.5) * 10;
        if (pending) return;
        pending = true;
        raf(function () {
          pending = false;
          el.style.setProperty("--mx", mx.toFixed(2) + "px");
          el.style.setProperty("--my", my.toFixed(2) + "px");
        });
      }, { passive: true });

      function release() {
        el.style.setProperty("--mx", "0px");
        el.style.setProperty("--my", "0px");
      }
      el.addEventListener("pointerleave", release);
      el.addEventListener("blur", release);
    });
  }

})();


/* ============================================================================
   The background responds to the page, not only to a clock.

   The .aurora blobs each run their own long CSS loop. This adds a second,
   scroll-linked transform on their PARENT, so the two compose: the loop is the
   ambient life, the parallax is the response to the reader. Writing to the
   parent matters — a CSS animation on an element outranks that element's own
   inline style, so any transform written directly to a blob would be ignored.

   Fully additive. If this file never runs, the blobs still drift.
   ========================================================================== */

(function () {
  "use strict";

  var aurora = document.querySelector(".aurora");
  if (!aurora) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduce.matches) return;

  var raf = window.requestAnimationFrame.bind(window);
  var pending = false;

  function paint() {
    pending = false;
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var pct = max > 0 ? Math.min(window.scrollY / max, 1) : 0;

    /* A slow rise across the whole page, so the top of the site and the bottom
       of the site do not look identical. One property, one compositor-only
       transform. This is weather, not a transition. */
    aurora.style.setProperty("--scroll-y", (pct * -12).toFixed(2) + "vh");
  }

  window.addEventListener("scroll", function () {
    if (pending) return;
    pending = true;
    raf(paint);
  }, { passive: true });

  paint();
})();


/* ============================================================================
   Counting the morning in.

   The rail numbers start at zero and climb to the real figure the first time
   the rail is on screen. The point is not decoration: it is the only moment
   on the page where the volume is felt accruing rather than stated.

   Safety: the true value is read out of the DOM and cached BEFORE anything is
   overwritten, a hard timeout restores every cached value regardless of what
   the animation is doing, and the whole block is skipped for reduced motion
   and when IntersectionObserver is missing — in which case the markup's own
   numbers are simply never touched.
   ========================================================================== */

(function () {
  "use strict";

  var rail = document.querySelector(".rail");
  if (!rail) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduce.matches || !("IntersectionObserver" in window)) return;

  var targets = [].slice.call(rail.querySelectorAll(".rail__item b, .rail__group b"))
    .map(function (el) {
      var text = el.textContent.trim();
      /* Only plain integers. Anything else — "2nd", "x3", an em dash — is left
         exactly as the author wrote it. */
      if (!/^\d{1,4}$/.test(text)) return null;
      return { el: el, to: parseInt(text, 10), text: text };
    })
    .filter(Boolean);

  if (!targets.length) return;

  function restore() {
    targets.forEach(function (t) { t.el.textContent = t.text; });
  }

  var DURATION = 900;

  function run() {
    targets.forEach(function (t) { t.el.textContent = "0"; });

    var start = null;
    function frame(now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / DURATION, 1);
      /* easeOutCubic: fast intake, settling — the shape of a morning. */
      var eased = 1 - Math.pow(1 - p, 3);
      targets.forEach(function (t) {
        t.el.textContent = String(Math.round(t.to * eased));
      });
      if (p < 1) raf(frame);
      else restore();
    }
    var raf = window.requestAnimationFrame.bind(window);
    raf(frame);

    /* rAF does not run in a background tab. If the reader opened this in a
       tab they never looked at, the counters must not be left showing zero. */
    window.setTimeout(restore, DURATION + 800);
  }

  var seen = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      run();
    });
  }, { threshold: 0.3 });

  seen.observe(rail);
})();


/* ============================================================================
   The demo runs itself.

   The product surface is the hero image of this page, and a still screenshot of
   a queue does not show what the product does. So it plays: a card is approved
   roughly every two and a half seconds, the ghost flies, the record lands in
   the ledger, the counter rolls, the queue empties, it resets, it goes again.

   It drives the real buttons with .click() rather than reaching into the
   queue's own state. That matters - the autoplay takes exactly the same path a
   person takes, so there is no second implementation to drift out of sync, and
   anything that breaks for a visitor breaks here too.

   It yields completely the first time a person touches it. This is a product
   whose entire claim is that nothing happens without you; a demo that kept
   approving things while you were trying to click would be arguing against the
   page it sits on. One pointerdown or keydown anywhere in the surface and it
   stops for good.
   ========================================================================== */

(function () {
  "use strict";

  var root = document.querySelector("[data-queue]");
  if (!root) return;

  var app = root.closest(".app") || root;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* A page that moves on its own is the thing reduced-motion is asking to be
     spared. No autoplay, no hint, nothing - the queue is simply interactive. */
  if (reduce.matches || !("IntersectionObserver" in window)) return;

  var STEP = 2500;     /* between approvals */
  var RESTART = 1800;  /* pause on the empty state before starting over */

  var timer = null;
  var onScreen = false;
  var surrendered = false;
  var observerFired = false;

  /* --- The hint ------------------------------------------------------------
     Built in script, not markup, so with JS off there is no dangling label for
     a demo that is not running. */
  var hint = document.createElement("p");
  hint.className = "autoplay-hint mono";
  hint.setAttribute("aria-hidden", "true");   /* the live region already narrates */
  hint.textContent = "Demo playing \u2014 click anything to take over";
  var foot = app.querySelector(".app__foot");
  if (foot) foot.parentNode.insertBefore(hint, foot); else app.appendChild(hint);

  function stopTimer() {
    if (timer !== null) { window.clearTimeout(timer); timer = null; }
  }

  function surrender() {
    if (surrendered) return;
    surrendered = true;
    stopTimer();
    app.classList.remove("is-autoplaying");
    hint.remove();
  }

  /* Real input only. A .click() we dispatch ourselves carries isTrusted false,
     and pointerdown/keydown are not fired by .click() at all - but listening on
     the capture phase for genuine events is the honest test either way. */
  /* Deliberately not focusin. The queue moves focus to the next Approve
     button itself after every resolution, and a programmatic .focus() still
     produces a trusted focusin - so listening for it made the demo surrender
     to its own first approval. Tabbing in is still caught, by keydown. */
  ["pointerdown", "keydown", "wheel", "touchstart"].forEach(function (type) {
    app.addEventListener(type, function (event) {
      if (event.isTrusted) surrender();
    }, { capture: true, passive: true });
  });

  function activeApprove() {
    var card = root.querySelector("[data-item].is-active");
    return card ? card.querySelector("[data-approve]") : null;
  }

  function tick() {
    timer = null;
    if (surrendered || !onScreen || document.hidden) return;

    var btn = activeApprove();
    if (btn) {
      btn.click();
      schedule(STEP);
      return;
    }

    /* Queue is empty. Start over, unless the reset control is not available -
       in which case there is nothing sensible left to do and we stop. */
    var reset = root.querySelector("[data-reset]");
    if (reset && !reset.hidden) {
      reset.click();
      schedule(RESTART);
    } else {
      surrender();
    }
  }

  function schedule(delay) {
    stopTimer();
    if (surrendered || !onScreen || document.hidden) return;
    timer = window.setTimeout(tick, delay);
  }

  /* Off-screen or in a background tab it does not run. A queue that churned
     through its cards while nobody was looking would greet the reader with an
     empty box, which is the opposite of the point. */
  /* A ratio threshold cannot be used here. intersectionRatio is a fraction of
     the ELEMENT, and the product surface is routinely taller than the viewport
     - on a phone it is several times taller. Ask for 0.45 of it and the
     callback never reports intersecting at any scroll position, so the demo
     silently never starts. Measure the overlap against whichever is smaller,
     the element or the viewport, and the same rule works at every size. */
  var watch = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      observerFired = true;
      var overlap = entry.intersectionRect.height;
      var reference = Math.min(entry.boundingClientRect.height, window.innerHeight);
      onScreen = entry.isIntersecting && reference > 0 && overlap >= reference * 0.35;

      sync();
    });
  }, { threshold: [0, 0.05, 0.15, 0.3, 0.5, 0.75, 1] });

  watch.observe(app);

  /* IntersectionObserver delivery rides the rendering loop, so a tab that is
     never painted - backgrounded, or a non-compositing embed - can leave the
     callback having never run even once. The reveal code in this file already
     carries a failsafe for the same reason. Without one here the demo would
     simply never start and there would be nothing on screen to say why, so
     after a beat, work the geometry out directly. */
  window.setTimeout(function () {
    if (observerFired || surrendered) return;
    var r = app.getBoundingClientRect();
    var overlap = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
    var reference = Math.min(r.height, window.innerHeight);
    onScreen = reference > 0 && overlap >= reference * 0.35;
    sync();
  }, 1200);

  /* One place decides whether the demo is running, so the class and the timer
     can never disagree. Coming back to the tab has to re-add the class as well
     as restart the clock - an IntersectionObserver only reports threshold
     crossings, so it will not fire again just because you looked away and
     back. */
  function sync() {
    var live = onScreen && !document.hidden && !surrendered;
    app.classList.toggle("is-autoplaying", live);
    if (live) schedule(STEP); else stopTimer();
  }

  document.addEventListener("visibilitychange", sync);
})();


/* ============================================================================
   Masked word reveal.

   The move every site in that gallery opens with: each word sits in a box that
   clips it, and rises out of that box a beat after the one before. It reads as
   type being set rather than type fading in.

   Built entirely from textContent and createElement. The headline is split on
   whitespace and every piece is re-attached as a text node, so no markup from
   the document is ever re-parsed - there is no innerHTML anywhere in this path,
   and a heading containing a stray angle bracket stays a stray angle bracket.

   <br> and <em> are preserved by walking the element's child nodes rather than
   flattening it to a string, so the line break and the emphasis on the second
   line both survive the split.
   ========================================================================== */

(function () {
  "use strict";

  var targets = [].slice.call(document.querySelectorAll("[data-words]"));
  if (!targets.length) return;

  /* motion.js does this better when GSAP is loaded - SplitText splits on
     rendered LINES, which depend on the font, the width and the wrap and so
     cannot be computed by hand. Stand down rather than split the headline
     twice. If GSAP is absent this runs and the reveal still happens. */
  if (window.gsap && window.SplitText) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduce.matches || !("IntersectionObserver" in window)) return;

  function wrapWord(text) {
    var mask = document.createElement("span");
    mask.className = "word";
    var inner = document.createElement("span");
    inner.className = "word__in";
    inner.textContent = text;          /* text in, text out */
    mask.appendChild(inner);
    return mask;
  }

  /* Rebuild one element's children, splitting only the text and leaving every
     other node (BR, EM, anything else) structurally intact. */
  function split(node, counter) {
    var kids = [].slice.call(node.childNodes);

    kids.forEach(function (kid) {
      if (kid.nodeType === 3) {                       /* text */
        var parts = kid.nodeValue.split(/(\s+)/);
        var frag = document.createDocumentFragment();

        parts.forEach(function (part) {
          if (part === "") return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(" "));
            return;
          }
          var w = wrapWord(part);
          w.style.setProperty("--w", counter.n);
          counter.n += 1;
          frag.appendChild(w);
        });

        node.replaceChild(frag, kid);
      } else if (kid.nodeType === 1 && kid.tagName !== "BR") {
        split(kid, counter);                          /* e.g. the <em> line */
      }
    });
  }

  targets.forEach(function (el) {
    split(el, { n: 0 });
    el.classList.add("words-armed");
  });

  var seen = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("words-in");
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.15 });

  targets.forEach(function (el) { seen.observe(el); });

  /* Same failsafe as everywhere else in this file: if the observer never gets
     to run, the headline must not stay invisible. */
  window.setTimeout(function () {
    targets.forEach(function (el) { el.classList.add("words-in"); });
  }, 1600);
})();


/* ============================================================================
   Scroll-linked motion.

   The thing that separates an award-gallery site from a corporate page is not
   that it has animation - it is that nothing is ever at rest. Elements do not
   fade in once and then sit there; their position is a continuous function of
   where the page is. That is what this does, without a bundler, a physics
   library or a canvas.

   Two behaviours, both driven from one loop:

     data-par="0.18"   translate on Y by a fraction of the distance the element
                       has travelled through the viewport. Different fractions
                       on neighbouring elements is what reads as depth.

     data-scale-in     scale from 0.9 up to 1 across the element's approach,
                       settling exactly as it centres.

   Mechanics that matter:

   · Scroll is read ONCE per frame into a variable and every element is written
     from that one read. Reading layout per element inside a scroll handler is
     what makes this pattern janky - each getBoundingClientRect after a write
     forces a synchronous re-layout.

   · Geometry is cached and recomputed only on resize, not per frame.

   · The loop only runs while the page is actually being scrolled, plus a short
     tail. An idle rAF loop burning a frame every 16ms on a mid-range Android
     for a page nobody is touching is exactly the kind of thing that makes a
     site feel cheap on the hardware this product is aimed at.

   · Transforms only, so it stays on the compositor.
   ========================================================================== */

(function () {
  "use strict";

  /* motion.js drives these with ScrollTrigger when GSAP is loaded. Two systems
     writing transform to the same element would fight every frame, so exactly
     one of them ever runs. */
  if (window.gsap && window.ScrollTrigger) return;

  var nodes = [].slice.call(document.querySelectorAll("[data-par], [data-scale-in]"));

  /* An element cannot do both. data-rise animates transform from a class, and
     this loop writes transform as an inline style - inline wins, so the reveal
     would be cancelled with no error and no obvious cause. Drop the parallax
     rather than the entrance: losing some decoration is a much smaller failure
     than an element that never becomes visible. */
  nodes = nodes.filter(function (el) { return !el.hasAttribute("data-rise"); });

  if (!nodes.length) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduce.matches) return;

  var items = [];
  var running = false;
  var idleFrames = 0;

  function measure() {
    var top = window.scrollY || window.pageYOffset;
    items = nodes.map(function (el) {
      /* offsetTop chain rather than getBoundingClientRect + scrollY: the rect
         already includes any transform we have written, so feeding it back in
         would compound every frame and the element would drift away. */
      var y = 0, node = el;
      while (node) { y += node.offsetTop; node = node.offsetParent; }
      return {
        el: el,
        top: y,
        height: el.offsetHeight,
        par: parseFloat(el.getAttribute("data-par")) || 0,
        scale: el.hasAttribute("data-scale-in")
      };
    });
    void top;
  }

  function frame() {
    var scroll = window.scrollY || window.pageYOffset;
    var view = window.innerHeight;

    for (var i = 0; i < items.length; i++) {
      var it = items[i];

      /* Where the element sits in its own journey across the viewport.
         0 = its top is entering at the bottom edge, 1 = its bottom is leaving
         at the top edge. Clamped, so off-screen elements hold their end state
         instead of flying off. */
      var travel = view + it.height;
      var p = (scroll + view - it.top) / travel;
      if (p < 0) p = 0; else if (p > 1) p = 1;

      var parts = "";

      if (it.par) {
        /* Centred on 0.5 so the element is in its authored position when it is
           in the middle of the screen - the layout you see in a screenshot is
           the layout the CSS describes. */
        parts += "translate3d(0," + ((0.5 - p) * it.par * 100).toFixed(2) + "px,0)";
      }

      if (it.scale) {
        var s = 0.9 + 0.1 * Math.min(p / 0.5, 1);
        parts += " scale(" + s.toFixed(4) + ")";
      }

      it.el.style.transform = parts;
    }
  }

  function loop() {
    frame();
    idleFrames += 1;
    /* ~1s of tail after the last scroll, so momentum scrolling still resolves,
       then stop burning frames. */
    if (idleFrames > 60) { running = false; return; }
    window.requestAnimationFrame(loop);
  }

  function kick() {
    idleFrames = 0;
    if (running) return;
    running = true;
    window.requestAnimationFrame(loop);
  }

  var resizeTimer = null;
  function onResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () { measure(); kick(); }, 150);
  }

  measure();
  frame();

  window.addEventListener("scroll", kick, { passive: true });
  window.addEventListener("resize", onResize);
  /* Late webfonts change every offsetTop on the page. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { measure(); frame(); });
  }
  window.addEventListener("load", function () { measure(); frame(); });
})();
