/* ============================================================================
   THE MORNING LIST — a list, and nothing more.

   Clicking a line opens it in the panel on the RIGHT, the way a mail client
   opens an email or a chat app opens a thread. It does not expand in place.

   The first version did expand in place, and that was wrong for the reason a
   mail client never does it: the list is for finding, the panel is for reading.
   Do both in one column and every row below the one you clicked jumps down the
   screen while your eye is still on it.

   So this file now owns no UI of its own. It makes each row a button and hands
   a payload to digest.js, which owns the panel.
   ========================================================================== */
(function () {
  "use strict";

  var feed = document.querySelector(".rail__feed");
  if (!feed) return;

  var HANDLED = {
    "Supplier, chasing payment": {
      kind: "Email · second attempt", state: "drafted, waiting on you", stateKey: "drafted",
      why: "Second time this week. Drafted, and it waits for you because it commits to a date.",
      draft: "Hi — sorry for the delay on this. The payment is going out on Friday along with the rest of the week's run. I will send the confirmation the moment it clears.",
      send: true
    },
    "“Do you deliver to Andheri?”": {
      kind: "Email · answered", state: "replied and closed", stateKey: "replied",
      why: "Andheri is on the delivery list, so nothing here needed you. Answered and filed.",
      draft: "Yes — we deliver to Andheri. It is a flat rate for anything under two metres and we crate it ourselves."
    },
    "“What time do you open?”": {
      kind: "Email · asked three times", state: "replied and closed", stateKey: "replied",
      why: "Three people, three separate threads, same question. The same answer went to each and none of them reached you.",
      draft: "We are open ten to six, Monday to Saturday. The workshop is in Andheri and you are welcome to drop in."
    },
    "Order confirmed": {
      kind: "Notification", state: "filed, no reply needed", stateKey: "filed",
      why: "A confirmation, not a question. Filed against the order and nothing was sent."
    },
    "Complaint — wrong item": {
      kind: "Email · needs you", state: "needs you", stateKey: "needs",
      why: "Our error — the order line and the dispatch note disagree. Drafted as an apology with a fix rather than a request for evidence, and it needs you because it promises a replacement date.",
      draft: "That is our mistake and I am sorry. The correct chair is being packed now and will reach you Thursday. Keep the one you have until the courier collects it; you should not be out of a chair because of us.",
      send: true
    },
    "Bank alert": {
      kind: "Notification", state: "filed, no reply needed", stateKey: "filed",
      why: "Read, matched against the account, nothing unusual in it. Filed without a reply."
    },
    "Supplier price list": {
      kind: "Document", state: "filed, noted", stateKey: "filed",
      why: "New rates, three items up. Filed, and noted against the next quote you write."
    },
    "Newsletters": {
      kind: "Six of them", state: "filed unread", stateKey: "filed",
      why: "None from anyone you have ever replied to. Filed rather than deleted, in case one of them matters later."
    },
    "Promotions": {
      kind: "Fourteen of them", state: "moved to the bin", stateKey: "binned",
      why: "Binned rather than deleted, so you can look if you want to. You never have."
    }
  };

  feed.querySelectorAll(".feed").forEach(function (li) {
    var name = li.querySelector("span");
    if (!name) return;
    var key = name.textContent.trim();
    var info = HANDLED[key];
    if (!info) return;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "feed__hit";
    while (li.firstChild) btn.appendChild(li.firstChild);
    li.appendChild(btn);
    li.classList.add("feed--open");
    li.setAttribute("data-state", info.stateKey);

    btn.addEventListener("click", function () {

      var actions = [];
      if (info.send) {
        actions.push({
          label: "Send it", primary: true, done: "Sent",
          newState: "replied and closed",
          onDone: function () { li.setAttribute("data-state", "replied"); }
        });
      }

      if (window.cognivexDigest && window.cognivexDigest.detail) {
        window.cognivexDigest.detail({
          source: li, kind: info.kind, title: key, state: info.state, stateKey: info.stateKey,
          draft: info.draft, why: info.why, actions: actions
        });
      }
      try {
        window.dispatchEvent(new CustomEvent("cognivex:railopen", { detail: { item: key } }));
      } catch (e) {}
    });
  });

  window.cognivexRail = { handled: HANDLED };
})();
