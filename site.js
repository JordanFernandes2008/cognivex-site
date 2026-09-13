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
