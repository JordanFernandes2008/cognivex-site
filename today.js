/* ============================================================================
   TODAY — the four states. A list, opening on the right.

   Same rule as the morning list below it: clicking a bucket opens it in the
   panel, it does not expand in place. Needs-you hands straight to the approval
   queue, because that bucket already has a view built for it.
   ========================================================================== */
(function () {
  "use strict";

  var list = document.querySelector(".rail__list");
  if (!list) return;

  var BUCKETS = {
    "Needs you": {
      kind: "Awaiting your decision",
      why: "Five things are drafted and waiting on your yes. Nothing in here has gone anywhere.",
      rows: [
        ["Nikhil Patel", "complaint, wrong item — apology drafted"],
        ["Verma Interiors", "34 days overdue — second reminder drafted"],
        ["Party, Saturday", "₹8,600 platter set — held, not ordered"],
        ["Unrecognised charge", "₹2,400 — flagged, not blocked"],
        ["Supplier", "chasing payment, second time — reply drafted"]
      ],
      actions: [{ label: "Open the five", primary: true, go: "queue" }]
    },
    "Drafted": {
      kind: "Written, not sent",
      why: "Each one is written and filed against its thread. None of it has left the building.",
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
      kind: "Closed",
      why: "Answered and closed. You approved each of these earlier in the week.",
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
      kind: "Sent, nothing back",
      why: "Out with someone else. I will chase the ones that have a date on them.",
      rows: [
        ["Verma Interiors", "first reminder, 20 days ago"],
        ["Aarav Kulkarni", "quote sent, four days quiet"],
        ["Omar Khan", "trade terms requested"],
        ["Jay Mehta", "press visit, awaiting a week"],
        ["Courier", "redelivery requested this morning"]
      ]
    }
  };

  [].slice.call(list.querySelectorAll(".rail__item")).forEach(function (li) {
    var name = li.querySelector("span");
    var count = li.querySelector("b");
    if (!name) return;
    var key = name.textContent.trim();
    var info = BUCKETS[key];
    if (!info) return;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rail__hit";
    while (li.firstChild) btn.appendChild(li.firstChild);
    li.appendChild(btn);
    li.classList.add("rail__item--open");

    btn.addEventListener("click", function () {

      if (window.cognivexDigest && window.cognivexDigest.detail) {
        window.cognivexDigest.detail({
          source: li,
          kind: info.kind,
          title: key + (count ? " · " + count.textContent.trim() : ""),
          why: info.why, rows: info.rows, actions: info.actions || []
        });
      }
      try {
        window.dispatchEvent(new CustomEvent("cognivex:todayopen", { detail: { bucket: key } }));
      } catch (e) {}
    });
  });

  window.cognivexToday = { buckets: BUCKETS };
})();
