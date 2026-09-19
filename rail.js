/* ============================================================================
   THE MORNING LIST, MADE OPENABLE.

   "Came in this morning" was nine dead lines of text. It is the better half of
   the argument - forty-one things arrived and only five reached you - but a
   reader has to take that on trust, because there is nothing to check.

   Now every line opens. Underneath each one is what Levi actually did with it:
   the reply already written, or the reason it was filed, or the reason it was
   binned. Nothing is claimed that the rest of the page does not claim - each
   draft still waits for a send, which is the whole product.

   Inline, not a new view. This is a glance, not a task; sending you somewhere
   else to read two sentences would be worse than leaving it closed.
   ========================================================================== */
(function () {
  "use strict";

  var feed = document.querySelector(".rail__feed");
  if (!feed) return;

  /* Keyed by the visible text, so the markup stays the source of truth for
     what is in the list and this file only says what happened to it. */
  var HANDLED = {
    "Supplier, chasing payment": {
      state: "drafted",
      what: "Second time this week. Drafted, and waiting on you because it commits to a date.",
      draft: "Hi — sorry for the delay on this. The payment is going out on Friday along with the rest of the week's run. I will send the confirmation the moment it clears."
    },
    "“Do you deliver to Andheri?”": {
      state: "replied",
      what: "Answered and closed. Andheri is on the delivery list, so nothing here needed you.",
      draft: "Yes — we deliver to Andheri. It is a flat rate for anything under two metres and we crate it ourselves."
    },
    "“What time do you open?”": {
      state: "replied",
      what: "Asked three times by three people. Same answer sent to each, none of them reached you.",
      draft: "We are open ten to six, Monday to Saturday. The workshop is in Andheri and you are welcome to drop in."
    },
    "Order confirmed": {
      state: "filed",
      what: "A confirmation, not a question. Filed against the order and nothing was sent."
    },
    "Complaint — wrong item": {
      state: "needs",
      what: "Our error — the order line and the dispatch note disagree. Drafted as an apology with a fix, and it needs you because it promises a replacement.",
      draft: "That is our mistake and I am sorry. The correct chair is being packed now and will reach you Thursday. Keep the one you have until the courier collects it."
    },
    "Bank alert": {
      state: "filed",
      what: "Read, matched against the account, nothing unusual. Filed without a reply."
    },
    "Supplier price list": {
      state: "filed",
      what: "New rates, three items up. Filed, and noted against the next quote you write."
    },
    "Newsletters": {
      state: "filed",
      what: "Six of them. Filed unread — none from anyone you have ever replied to."
    },
    "Promotions": {
      state: "binned",
      what: "Fourteen. Binned, not deleted, in case you want to look. You never have."
    }
  };

  var LABEL = {
    drafted: "drafted, waiting on you",
    replied: "replied and closed",
    filed: "filed, no reply needed",
    needs: "needs you",
    binned: "moved to the bin"
  };

  var open = null;

  feed.querySelectorAll(".feed").forEach(function (li) {
    var name = li.querySelector("span");
    if (!name) return;
    var key = name.textContent.trim();
    var info = HANDLED[key];
    if (!info) return;

    /* The row becomes the control. A button inside the li rather than a
       clickable li, so it is reachable by keyboard and announces itself. */
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "feed__hit";
    btn.setAttribute("aria-expanded", "false");
    while (li.firstChild) btn.appendChild(li.firstChild);
    li.appendChild(btn);
    li.classList.add("feed--open");
    li.setAttribute("data-state", info.state);

    var panel = document.createElement("div");
    panel.className = "feed__panel";
    panel.hidden = true;

    var tag = document.createElement("p");
    tag.className = "feed__state mono";
    tag.textContent = LABEL[info.state] || info.state;
    panel.appendChild(tag);

    var what = document.createElement("p");
    what.className = "feed__what";
    what.textContent = info.what;
    panel.appendChild(what);

    if (info.draft) {
      var d = document.createElement("p");
      d.className = "feed__draft";
      d.textContent = info.draft;
      panel.appendChild(d);

      var acts = document.createElement("div");
      acts.className = "feed__acts";
      var send = document.createElement("button");
      send.type = "button";
      send.className = "btn btn--accent btn--sm";
      send.textContent = info.state === "replied" ? "Already sent" : "Send it";
      if (info.state === "replied") send.disabled = true;
      acts.appendChild(send);
      panel.appendChild(acts);

      send.addEventListener("click", function () {
        send.disabled = true;
        send.textContent = "Sent";
        li.setAttribute("data-state", "replied");
        tag.textContent = LABEL.replied;
        try {
          window.dispatchEvent(new CustomEvent("cognivex:railsend", {
            detail: { item: key }
          }));
        } catch (e) {}
      });
    }

    li.appendChild(panel);

    btn.addEventListener("click", function () {
      var nowOpen = panel.hidden;
      if (open && open !== panel) {
        open.hidden = true;
        open.previousSibling && open.previousSibling.setAttribute &&
          open.previousSibling.setAttribute("aria-expanded", "false");
      }
      panel.hidden = !nowOpen;
      btn.setAttribute("aria-expanded", String(nowOpen));
      open = nowOpen ? panel : null;
      try {
        window.dispatchEvent(new CustomEvent("cognivex:railopen", {
          detail: { item: key, state: info.state, opened: nowOpen }
        }));
      } catch (e) {}
    });
  });

  window.cognivexRail = { handled: HANDLED };
})();
