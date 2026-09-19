/* ============================================================================
   THE MORNING BRIEFING — what the app opens on.

   THE PROBLEM THIS FIXES. Fifty approval cards were rendered as fifty stacked
   cards, so the panel grew to 3,235px and the hero to 4,786px - five and a
   third screens of hero before you reach the second section. Measured: the
   page went from 9,121px to 12,255px, 13.6 screens. A queue you scroll forever
   is not a product demo, it is a list.

   An app does not open on all fifty. It opens on the SUMMARY, because the
   summary is the product: forty-one arrived, five need you, the rest are done.
   You click the five. That is the whole interaction, and it fits in one screen.

   Everything below the fold in the old version is still there - it is one
   click away instead of forty scroll wheels down.

   WHAT IS CLAIMED HERE. Only what the page already claims elsewhere. The hero
   says "Nothing is sent, posted, paid or replied to without your approval", so
   a payment that waits for approval is in scope. Nothing here invents an
   integration, a price, or a capability that is not on the rest of the site.
   ========================================================================== */
(function () {
  "use strict";

  var queue = document.querySelector("[data-queue]");
  var stack = document.querySelector("[data-stack]");
  if (!queue || !stack) return;

  var head = queue.querySelector(".queue__head");

  /* ---- the briefing ------------------------------------------------------
     Written as one assistant reporting a morning, not as a feature list. The
     numbers agree with the rail beside it: 41 in, 5 for you, the rest done. */
  var GROUPS = [
    {
      title: "Your inbox",
      rows: [
        { n: "5", label: "need your approval", note: "drafted and waiting", open: true, tone: "act" },
        { n: "33", label: "replied and filed", note: "nothing needed from you" },
        { n: "1", label: "suspicious mail, held in the bin", note: "approve the deletion", open: true, tone: "act" },
        { n: "12", label: "spam, already deleted", note: "not shown to you" }
      ]
    },
    {
      title: "Tomorrow",
      rows: [
        { n: "6pm", label: "Party, Bandra", note: "want me to order the food? tell me what, approve the amount, and I will place it", open: true, tone: "ask" },
        { n: "11am", label: "Fairlane Studio, Thursday", note: "call, already in your calendar" }
      ]
    },
    {
      title: "Money",
      rows: [
        { n: "1", label: "Verma Interiors, 34 days overdue", note: "invoice drafted, waiting on you", open: true, tone: "act" },
        { n: "2", label: "invoices go out today", note: "both already approved by you" }
      ]
    }
  ];

  var wrap = document.createElement("div");
  wrap.className = "digest";
  wrap.setAttribute("data-digest", "");

  var lead = document.createElement("p");
  lead.className = "digest__lead";
  lead.innerHTML =
    '<b>I went through all 41 this morning.</b> ' +
    '<span>Five need you. The rest are done.</span>';
  wrap.appendChild(lead);

  GROUPS.forEach(function (g) {
    var h = document.createElement("p");
    h.className = "digest__group mono";
    h.textContent = g.title;
    wrap.appendChild(h);

    var ul = document.createElement("ul");
    ul.className = "digest__list";

    g.rows.forEach(function (row) {
      var li = document.createElement("li");
      li.className = "digest__row" + (row.open ? " is-open" : "");

      var inner = row.open ? document.createElement("button") : document.createElement("div");
      inner.className = "digest__hit";
      if (row.open) { inner.type = "button"; inner.setAttribute("data-open-queue", ""); }

      inner.innerHTML =
        '<b class="digest__n mono"></b>' +
        '<span class="digest__text"><span class="digest__label"></span>' +
        '<span class="digest__note"></span></span>' +
        (row.open ? '<span class="digest__go mono" aria-hidden="true">open</span>' : '');

      inner.querySelector(".digest__n").textContent = row.n;
      inner.querySelector(".digest__label").textContent = row.label;
      inner.querySelector(".digest__note").textContent = row.note;
      if (row.tone) li.setAttribute("data-tone", row.tone);

      li.appendChild(inner);
      ul.appendChild(li);
    });

    wrap.appendChild(ul);
  });

  /* ---- the two views ------------------------------------------------------
     The stack is not removed, only put behind the briefing. Everything site.js
     does to it - approve, edit, skip, the counter, the record, the reset -
     keeps working untouched, because none of it cares whether the container is
     on screen. */
  var back = document.createElement("button");
  back.className = "queue__back mono";
  back.type = "button";
  back.hidden = true;
  back.innerHTML = '<span aria-hidden="true">←</span> the morning';

  if (head) head.appendChild(back);
  stack.parentNode.insertBefore(wrap, stack);

  /* THREE NUMBERS THAT DISAGREE IS WORSE THAN NO NUMBER.

     Measured on screen at once: the header said "50 WAITING" (every card in
     the stack, including reminders and invoices), the briefing said five need
     you, and the rail said three. A demo whose own arithmetic contradicts
     itself is the fastest way to lose a client mid-sentence.

     They agree now. 41 came in: 5 need you, 33 replied and filed, 1 held, 2
     needed nothing - and the rail says 41 / 5 / 36. The header shows the five
     while the briefing is open, and the real stack count once you are in it,
     because those are answers to two different questions. */
  var counter = queue.querySelector("[data-roller]");
  var label = queue.querySelector(".queue__count > span:last-child");

  function setCount(n, word) {
    if (counter) {
      var track = counter.querySelector(".roller__track");
      if (track) track.textContent = String(n);
    }
    if (label) label.textContent = word;
  }

  function show(which) {
    var onQueue = which === "queue";
    wrap.hidden = onQueue;
    stack.hidden = !onQueue;
    back.hidden = !onQueue;
    queue.classList.toggle("is-drilled", onQueue);
    if (onQueue) {
      setCount(stack.querySelectorAll("[data-item]").length, "in the list");
    } else {
      setCount(5, "need you");
    }
    if (onQueue) {
      var first = stack.querySelector("[data-item].is-active [data-approve]");
      if (first) first.focus();
    } else if (!back.hidden === false) {
      var b = wrap.querySelector("[data-open-queue]");
      if (b) b.focus();
    }
    try {
      window.dispatchEvent(new CustomEvent("cognivex:view", { detail: { view: which } }));
    } catch (e) {}
  }

  wrap.addEventListener("click", function (e) {
    var b = e.target.closest("[data-open-queue]");
    if (b) show("queue");
  });
  back.addEventListener("click", function () { show("digest"); });

  show("digest");

  /* Exposed so Levi can talk about whichever view is open, and so a check can
     drive it without clicking. */
  window.cognivexDigest = {
    show: show,
    view: function () { return stack.hidden ? "digest" : "queue"; },
    groups: GROUPS
  };
})();
