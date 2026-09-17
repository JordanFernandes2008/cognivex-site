/* ============================================================================
   THE WALKTHROUGH — "show me how this is actually going to work"

   A scripted player, not a simulation. There is no model behind it and it does
   not pretend there is: six panels of fixed copy, one per KIND of work, and a
   control that moves between them. The point is to answer "what does it do with
   a complaint, as opposed to an invoice, as opposed to junk" — which a single
   screenshot of a queue cannot answer, because a queue shows one moment and the
   question is about range.

   PROGRESSIVE ENHANCEMENT, and the direction matters. The markup contains all
   six panels, visible. This script ADDS the class that lets CSS hide the
   inactive ones. So if the file 404s, fails to parse, or is blocked, the
   section degrades to six readable panels stacked down the page rather than to
   an empty box with a dead Next button under it. Hiding in CSS by default and
   revealing with JS would fail the other way, which is the way that loses the
   content.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.querySelector("[data-walk]");
  if (!root) return;

  var panels = [].slice.call(root.querySelectorAll("[data-walk-panel]"));
  var tabs   = [].slice.call(root.querySelectorAll("[data-walk-tab]"));
  var prev   = root.querySelector("[data-walk-prev]");
  var next   = root.querySelector("[data-walk-next]");
  var pos    = root.querySelector("[data-walk-pos]");
  if (panels.length < 2 || !next) return;

  var n = panels.length;
  var at = 0;

  /* Only now does CSS start hiding anything. */
  root.classList.add("is-enhanced");

  var REDUCED = window.matchMedia &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function pad(i) { return (i + 1 < 10 ? "0" : "") + (i + 1); }

  function show(i, focusPanel) {
    at = (i + n) % n;

    for (var p = 0; p < n; p++) {
      var on = p === at;
      panels[p].hidden = !on;
      /* A hidden panel must not keep its controls in the tab order. */
      panels[p].setAttribute("aria-hidden", on ? "false" : "true");
    }
    for (var t = 0; t < tabs.length; t++) {
      var sel = t === at;
      tabs[t].setAttribute("aria-selected", sel ? "true" : "false");
      /* Roving tabindex: one stop for the whole tablist, arrows move within. */
      tabs[t].tabIndex = sel ? 0 : -1;
      tabs[t].classList.toggle("is-on", sel);
    }

    if (pos) pos.textContent = pad(at) + " / " + pad(n - 1);

    /* The panel is what changed, so the panel is what gets announced. Only on
       a deliberate move, never on first paint. */
    if (focusPanel && panels[at].focus) panels[at].focus();

    if (!REDUCED) {
      panels[at].classList.remove("is-in");
      /* Reflow, so the class re-applies and the transition actually runs
         rather than being coalesced away. */
      void panels[at].offsetWidth;
      panels[at].classList.add("is-in");
    }
  }

  next.addEventListener("click", function () { show(at + 1, true); });
  if (prev) prev.addEventListener("click", function () { show(at - 1, true); });

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { show(i, true); });
    tab.addEventListener("keydown", function (e) {
      var k = e.key, to = -1;
      if (k === "ArrowRight" || k === "ArrowDown") to = i + 1;
      else if (k === "ArrowLeft" || k === "ArrowUp") to = i - 1;
      else if (k === "Home") to = 0;
      else if (k === "End") to = n - 1;
      if (to < 0 && k !== "ArrowLeft" && k !== "ArrowUp") return;
      e.preventDefault();
      to = (to + n) % n;
      show(to, false);
      tabs[to].focus();
    });
  });

  show(0, false);
})();
