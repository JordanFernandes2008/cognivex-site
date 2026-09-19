/* ============================================================================
   TODAY — the four states, made openable.

   "Needs you 5 / Drafted 12 / Sent 8 / Waiting on reply 5" was four dead rows.
   They are the most scannable summary on the page and the only one you cannot
   interrogate, which is the wrong way round.

   Each opens where it sits and shows what is actually in that bucket. Needs-you
   hands off to the approval queue, because that bucket already has a view built
   for it. The other three show what happened and when, since there is nothing
   left to decide about them.

   Same rules as everywhere: fixed scripted data, no dates computed from today,
   identical for every visitor, and nothing is ever really sent.
   ========================================================================== */
(function () {
  "use strict";

  var list = document.querySelector(".rail__list");
  if (!list) return;

  var BUCKETS = {
    "Needs you": {
      lead: "Five things are drafted and waiting on your yes.",
      handoff: true,
      rows: [
        ["Nikhil Patel", "complaint, wrong item — apology drafted"],
        ["Verma Interiors", "34 days overdue — second reminder drafted"],
        ["Party, Saturday", "₹8,600 platter set — held, not ordered"],
        ["Unrecognised charge", "₹2,400 — flagged, not blocked"],
        ["Supplier", "chasing payment, second time — reply drafted"]
      ]
    },
    "Drafted": {
      lead: "Written and filed against the thread. None of it has gone anywhere.",
      rows: [
        ["Rohan Kamat", "delivery date — two options offered"],
        ["Anita Desai", "seat height — drawing offered"],
        ["Sana Bhatt", "lead time — eleven weeks, not rounded down"],
        ["Ishaan Shah", "commission brief — two questions back"],
        ["Insurance renewal", "three quotes compared"],
        ["GST filing", "assembled, not filed"],
        ["Bandsaw blades", "reorder ready"],
        ["Finishing oil", "reorder ready"],
        ["Walnut delivery", "clash flagged, reschedule drafted"],
        ["Dentist", "new slot offered, unconfirmed"],
        ["Cloud storage", "free option prepared"],
        ["Design tool", "cancellation prepared"]
      ]
    },
    "Sent": {
      lead: "Answered and closed. You approved each of these earlier in the week.",
      rows: [
        ["“Do you deliver to Andheri?”", "answered Tuesday"],
        ["“What time do you open?”", "answered three times"],
        ["Leena Fernandes", "gift wrapping — confirmed"],
        ["Priya Gupta", "swatches posted"],
        ["Dev Raut", "cancellation, deposit returned"],
        ["Pooja Deshmukh", "thank-you answered"],
        ["Hemant Naik", "address corrected before dispatch"],
        ["Bandra Cafe", "invoice 0149 sent"]
      ]
    },
    "Waiting on reply": {
      lead: "Sent, and nothing back yet. I will chase the ones with a date on them.",
      rows: [
        ["Verma Interiors", "first reminder, 20 days ago"],
        ["Aarav Kulkarni", "quote sent, four days quiet"],
        ["Omar Khan", "trade terms requested"],
        ["Jay Mehta", "press visit, awaiting a week"],
        ["Courier", "redelivery requested this morning"]
      ]
    }
  };

  var open = null;

  [].slice.call(list.querySelectorAll(".rail__item")).forEach(function (li) {
    var name = li.querySelector("span");
    var count = li.querySelector("b");
    if (!name) return;
    var key = name.textContent.trim();
    var info = BUCKETS[key];
    if (!info) return;

    /* The row becomes a button without changing what it looks like. */
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rail__hit";
    btn.setAttribute("aria-expanded", "false");
    while (li.firstChild) btn.appendChild(li.firstChild);
    li.appendChild(btn);
    li.classList.add("rail__item--open");

    var panel = document.createElement("div");
    panel.className = "rail__panel";
    panel.hidden = true;

    var lead = document.createElement("p");
    lead.className = "rail__lead";
    lead.textContent = info.lead;
    panel.appendChild(lead);

    var ul = document.createElement("ul");
    ul.className = "rail__sub";
    info.rows.forEach(function (r) {
      var row = document.createElement("li");
      var who = document.createElement("b");
      who.textContent = r[0];
      var what = document.createElement("span");
      what.textContent = r[1];
      row.appendChild(who);
      row.appendChild(what);
      ul.appendChild(row);
    });
    panel.appendChild(ul);

    /* Needs-you already has a view built for it, so it hands off rather than
       duplicating the queue in a second place. */
    if (info.handoff) {
      var go = document.createElement("button");
      go.type = "button";
      go.className = "btn btn--accent btn--sm";
      go.textContent = "Open the five";
      go.addEventListener("click", function () {
        if (window.cognivexDigest) window.cognivexDigest.show("queue");
        var app = document.querySelector(".queue__stack");
        if (app) app.scrollIntoView({ block: "nearest" });
      });
      var acts = document.createElement("div");
      acts.className = "rail__acts";
      acts.appendChild(go);
      panel.appendChild(acts);
    }

    li.appendChild(panel);

    btn.addEventListener("click", function () {
      var willOpen = panel.hidden;
      if (open && open.panel !== panel) {
        open.panel.hidden = true;
        open.btn.setAttribute("aria-expanded", "false");
      }
      panel.hidden = !willOpen;
      btn.setAttribute("aria-expanded", String(willOpen));
      open = willOpen ? { panel: panel, btn: btn } : null;
      try {
        window.dispatchEvent(new CustomEvent("cognivex:todayopen", {
          detail: { bucket: key, opened: willOpen, count: count ? count.textContent : "" }
        }));
      } catch (e) {}
    });
  });

  window.cognivexToday = { buckets: BUCKETS };
})();
