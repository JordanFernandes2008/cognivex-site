/* ============================================================================
   LEVI — THE COMPLETE LINE SET
   Written against the live sections of cognivex-site.vercel.app (all 7 pages).

   VOICE RULES (keep these if you write more lines yourself)
   - Levi is showing you its own screen. It is not selling and not announcing.
   - 6-12 words. One thought. It stops early rather than explaining twice.
   - No exclamation marks. No adjectives doing sales work. No emoji.
   - No invented facts: no percentages, time saved, customer counts, prices,
     integrations or names that are not already on the page.
   - It never claims to be running, learning, or watching. It is in development
     and everything here is scripted.
   - Dry, never cute. It can be wry about itself; it is never wry about the
     visitor.

   HOW TO USE
   Each section holds an array. Pick the first line for the first visit, and
   rotate through the rest on later visits or later scrolls past the same
   section, so a returning visitor is not read the same sentence twice.
   Keep line 1 of each array as the strongest, because most people only see it.
   ========================================================================== */

window.LEVI_LINES = {

  /* ==========================================================================
     HOME  —  index.html
     ====================================================================== */
  home: {

    /* .hero — "Other AI tools wait for instructions..." */
    hero: [
      "Forty-one came in overnight. Three of them need you.",
      "This is a Tuesday morning, as it would actually arrive.",
      "Everything here is already drafted. Nothing has gone anywhere.",
      "You are looking at a morning that has already been sorted.",
      "The work is done. What is left is your call.",
      "Nothing on this screen was sent while you slept.",
      "I read the night. You read three things."
    ],

    /* .queue — "Ready for you" (the app surface, Demo 1) */
    queue: [
      "This is the whole product. Three decisions, waiting.",
      "Each one has the reasoning attached. Read it or ignore it.",
      "Approve, edit the words, or skip. Nothing else happens.",
      "The counter only moves when you move it.",
      "I drafted these. I cannot send them.",
      "Try approving one. Nothing leaves this page.",
      "Edit the wording if it is not how you talk."
    ],

    /* .walk — "One night, item by item..." */
    walk: [
      "Six kinds of thing arrive. Here is each one.",
      "An email, an invoice, a post, a complaint, a question, noise.",
      "Click through them. The order is the order they landed.",
      "Noise gets filed. It does not come to you.",
      "Same three answers every time: what came, why, where it sits.",
      "Watch what happens to the ones you never see."
    ],

    /* .tuesday — the dark narrative band */
    tuesday: [
      "This is the part of Tuesday nobody bills for.",
      "Four hours of admin before the work people pay for.",
      "None of it is hard. All of it is yours.",
      "Every small thing here has to be decided by someone.",
      "The cost is not difficulty. It is attention."
    ],

    /* .nightwork — "Everything that came in, and what was ready for you." */
    nightwork: [
      "This ran while the shop was closed.",
      "The whole night, in one list, with nothing sent.",
      "Prepared, filed, or waiting on someone else. That is all.",
      "Nothing here says sent, because nothing was.",
      "Thirty-eight of these never needed you at all.",
      "Look at the ones marked waiting. Those are not mine to chase."
    ],

    /* .loop — "Three steps. You are the third one." */
    loop: [
      "It reads, it drafts, you decide. That is the loop.",
      "Two steps are mine. The third one is yours, always.",
      "There is no fourth step where I act alone.",
      "Remove your step and this becomes a different product.",
      "I stop at the edge of sending. Every time."
    ],

    /* .ledger — "Four things, done properly." */
    ledger: [
      "Four things. Not a platform, not everything.",
      "Inbox, invoices, posts, and what is due next.",
      "Narrow on purpose. Wide is how these tools get vague.",
      "If it is not one of these four, I do not touch it.",
      "Doing four things properly beats forty things roughly."
    ],

    /* .position — "Approval is not a safety setting. It is the product." */
    position: [
      "Other tools wait to be told. That is the difference.",
      "Approval is not a setting here. It is the shape of it.",
      "You are not learning to prompt me. I bring you finished work.",
      "The gate is the point, not a limitation on top.",
      "I would rather be useful than impressive."
    ],

    /* .closing — "You are the operations department." */
    closing: [
      "Forty-one came in. You looked at three.",
      "The rest were answered, filed, or left waiting on a reply.",
      "Nothing went out that you did not approve.",
      "That is the morning you did not spend in your inbox.",
      "Three decisions. Everything else handled beneath them."
    ],

    /* ======================================================================
       DEMO — RUNNING COMMENTARY, NOT A SECTION LINE.

       ⚠ DRAFTED BY CLAUDE, AWAITING JORDAN'S WORDS. Everything else in this
       file is Jordan's. This block was not in the supplied line set and the
       wiring needs all thirteen keys, so it is written to the voice rules at
       the top of this file and to the copy actually on the page. Replace the
       strings; the keys and the code reading them do not need to change.

       Every fact below is checked against index.html:
         emailReply      Priya Nair, invoice 0142, 2nd chase, 18 days overdue
         invoice         Fairlane Studio, September retainer, same terms as August
         socialPost      the walnut bench, from this week's photos, queued Friday
         complaint       order 2213, wrong item, received 6:12am, first contact
         repeatQuestion  three people, separately, 6:40 / 7:15 / 8:02
         noise           20 of the morning's 41 items, newsletters and promotions

       WHERE EACH KEY FIRES. The six item keys are the WALKTHROUGH's six
       scripted panels - the only place on the site those six types exist. The
       approval queue's 65 items carry eleven different kinds (Email reply,
       Reminder, Invoice, Social post, Payment, Booking, Subscription, Order,
       Document, Delivery, Calendar) and there is no complaint, repeat question
       or noise among them. intro, why, controls, afterApprove, afterEdit,
       afterSkip, empty and watching fire on the app window, which is the only
       surface with Approve / Edit / Skip, a counter that empties, and WATCH.
       ================================================================== */
    demo: {

      /* The app surface first comes into view. */
      intro: [
        "This is the product. The rest of the page describes it.",
        "Three want you. The others are already handled.",
        "The whole morning, sorted, with nothing sent.",
        "Open one. The reasoning came attached to it."
      ],

      /* --- one per scripted item, as it comes into focus ----------------- */
      emailReply: [
        "A supplier chasing an invoice. Second time asking.",
        "Priya replied on the old thread, so this stays there.",
        "Second chase. The first one did not land."
      ],
      invoice: [
        "Same retainer as August, same terms. Built, not issued.",
        "It sits in Drafted until you say otherwise.",
        "I can write an invoice. I cannot send one."
      ],
      socialPost: [
        "A post from this week's photos, queued for Friday.",
        "Queued, not published. You approve the post itself.",
        "Your bench, and your words if you have them."
      ],
      complaint: [
        "Wrong item shipped. This one arrived at 6:12.",
        "An apology has to sound like you. Read it.",
        "First contact. Nothing has been said back yet."
      ],
      repeatQuestion: [
        "Three people asked the same thing, separately.",
        "Same answer three times. Worth having ready.",
        "Not a decision. It just needs answering."
      ],
      noise: [
        "Twenty of the forty-one were newsletters and promotions.",
        "Filed, unread. This is the part you never see.",
        "Nothing to do here. That is the point of it."
      ],

      /* The reasoning block is revealed or focused. */
      why: [
        "That is the reasoning. If it is wrong, the draft is.",
        "Every draft carries one of these. Read it or do not.",
        "Disagree with this part before you approve the part above."
      ],

      /* First hover or focus of Approve / Edit / Skip. */
      controls: [
        "Approve, edit the wording, or skip. There is no fourth.",
        "Three answers, and skip is not delete.",
        "Edit changes my wording, not your approval."
      ],

      /* Immediately after each action. */
      afterApprove: [
        "Approved. In the product, that one would go now.",
        "Done, because you said so. Not before.",
        "That is one. It does not generalise to the next."
      ],
      afterEdit: [
        "Your words now. Mine were a starting point.",
        "Edited. It still waits for the approval.",
        "Better. You know how you talk."
      ],
      afterSkip: [
        "Skipped. It stays in the list.",
        "Fine. It waits rather than disappears.",
        "Not deleted. It will be here later."
      ],

      /* The queue clears. */
      empty: [
        "That is all of them. Morning closed.",
        "You are through them. Nothing is waiting.",
        "Empty. That is what the end looks like."
      ],

      /* They sat through WATCH mode without acting. */
      watching: [
        "It is playing itself. Click anything to take over.",
        "You can watch, or you can decide. Either is fine.",
        "This runs on its own until you touch it."
      ]
    }
  },

  /* ==========================================================================
     HOW IT WORKS  —  how-it-works.html
     ====================================================================== */
  howItWorks: {

    /* .phero — "One morning, from arriving to answered." */
    hero: [
      "One morning, start to finish. No skipping the boring part.",
      "This is the whole path, from arriving to answered.",
      "Follow it down. It is four steps and one decision.",
      "By the end of this page you will know what I do."
    ],

    /* "It reads" */
    reads: [
      "I read everything, including the things that do not matter.",
      "Reading is cheap. Deciding what matters is the work.",
      "Only the inboxes you switch on. Nothing else.",
      "I look at all of it so you can look at some of it."
    ],

    /* "It decides what actually needs you" */
    decides: [
      "Most of it does not need you. That is the useful part.",
      "Three kinds need a person: money, apology, and a real decision.",
      "A repeat question is not a decision. It gets an answer.",
      "When I am unsure, it comes to you. Unsure means yours."
    ],

    /* "What a draft contains" */
    draft: [
      "The reply, and why it is worded that way.",
      "You get the reasoning, so you can disagree with it.",
      "If the reasoning is wrong, the draft is wrong. Say so.",
      "No draft arrives without an explanation attached."
    ],

    /* "What happens when you decide" */
    decide: [
      "Approve, edit, or skip. Those are the only three.",
      "Edit changes the words. It does not change your approval.",
      "Skip is not delete. It sits and waits for you.",
      "Nothing moves until one of those three happens."
    ],

    /* .pclose — "See the four things it does." */
    close: [
      "That is the loop. Next: what it actually covers.",
      "Four things, and the limits of each one.",
      "You have seen how. The what is one page over."
    ]
  },

  /* ==========================================================================
     CAPABILITIES  —  capabilities.html
     ====================================================================== */
  capabilities: {

    /* .phero — "Four things, done properly." */
    hero: [
      "Four things. I would rather be narrow and right.",
      "This is the whole list. There is no hidden fifth.",
      "Everything I do sits inside these four.",
      "Short list on purpose."
    ],

    /* "Inbox triage" */
    inbox: [
      "I read the morning and return the few that matter.",
      "Each one comes with a reply already written.",
      "The rest are filed where you can find them later.",
      "You see three. I read forty-one."
    ],

    /* "Invoices and follow-up" */
    invoices: [
      "I know who has not paid, and how long it has been.",
      "The invoice and the polite chase are both drafted.",
      "I never move money. I only write about it.",
      "Eighteen days late is a fact, not a judgement."
    ],

    /* "Social posts" */
    posts: [
      "You say what to post. I write it and lay it out.",
      "Your words if you give them. Mine if you do not.",
      "It sits in drafts until you say yes.",
      "I do not decide what your business should announce."
    ],

    /* "Memory and priorities" */
    memory: [
      "I hold context across weeks, so you do not have to.",
      "What is due, what is overdue, and what comes first.",
      "I remember the thread, not just the last message.",
      "Priorities are a suggestion. You reorder them."
    ],

    /* "What this page does not claim" */
    limits: [
      "This part matters more than the list above it.",
      "Everything I cannot do, stated plainly.",
      "No numbers here, because there is nothing honest to count yet.",
      "Read the limits. They are the reason to trust the rest."
    ],

    /* .pclose — "The obvious next question is whether to trust it." */
    close: [
      "You know what it does. Whether to trust it is next.",
      "That is the fair question. It has its own page."
    ]
  },

  /* ==========================================================================
     TRUST  —  trust.html
     ====================================================================== */
  trust: {

    /* .phero — "You are giving an AI your inbox..." */
    hero: [
      "This is the page that decides it for most people.",
      "You are handing me your inbox. Here is what that means.",
      "Nothing vague on this page. Ask it anything it does not answer.",
      "If this page does not convince you, the product should not either."
    ],

    /* "Nothing leaves without you" */
    nothingLeaves: [
      "No email, post, invoice or payment moves without your yes.",
      "There is no autonomous mode to switch on later.",
      "You approve that item, never that kind of item.",
      "One approval, one thing. It does not generalise."
    ],

    /* "It does not move money. Ever." */
    money: [
      "I write about money. I never move it.",
      "No card, no bank, no transfers. Not a setting, a limit.",
      "An invoice is a document. Sending it is still yours."
    ],

    /* "It reads only what you switch on" */
    scope: [
      "Only the accounts you connect, and only while you leave them on.",
      "Turn one off and I stop reading it that moment.",
      "I do not go looking for more than you gave me."
    ],

    /* "What it gets wrong" */
    wrong: [
      "I will get things wrong. This is where that is written down.",
      "Tone, context, and anything a person told you in the room.",
      "Wrong drafts are cheap. That is why nothing sends itself.",
      "Read this part twice. It is the honest one."
    ],

    /* "Your data" */
    data: [
      "Where it sits, who can see it, and how to remove it.",
      "Plainly written, because the alternative is a policy nobody reads."
    ],

    /* .pclose — "Who is building this." */
    close: [
      "Two people build this. Their names are on the next page.",
      "You know the rules now. Meet who wrote them."
    ]
  },

  /* ==========================================================================
     ABOUT  —  about.html
     ====================================================================== */
  about: {

    /* .phero — "Built by two people who run the admin themselves." */
    hero: [
      "Two people. They do this admin themselves, which is the reason.",
      "Small team. That is a fact, not a pitch.",
      "Built by people who had the problem first."
    ],

    /* "The bet" */
    bet: [
      "The bet is that approval is what makes this usable.",
      "Most tools bet on autonomy. This one bets the other way.",
      "If the bet is wrong, the product is wrong. They know."
    ],

    /* "The people" */
    people: [
      "Suraj and Jordan, at Digital Coyotes.",
      "Two names, no fake team page, no stock photographs."
    ],

    /* .pclose — "Cognivex is not available yet." */
    close: [
      "Not available yet. No waitlist to soften that.",
      "In development. The site says so everywhere, including here."
    ]
  },

  /* ==========================================================================
     CONTACT  —  contact.html
     ====================================================================== */
  contact: {

    /* .phero — "Not available yet — and saying so plainly." */
    hero: [
      "There is no form here. That is deliberate.",
      "Nothing to sign up for, so nothing is asking for your email.",
      "This page could have collected addresses. It does not."
    ],

    /* "How to get in touch" */
    how: [
      "When there is a way to reach them, it will be here.",
      "An empty box is more honest than a fake one."
    ],

    /* "Where the product is" */
    where: [
      "In development. Not a beta, not early access.",
      "The demo is real. The product is not finished."
    ],

    /* .pclose — "See the thing working." */
    close: [
      "Nothing to do here. The working part is on the home page.",
      "Go back and approve something. That is the whole product."
    ]
  },

  /* ==========================================================================
     404  —  404.html
     ====================================================================== */
  notFound: [
    "That page is not here. The rest of the site is.",
    "Wrong address. Nothing was broken by you.",
    "Nothing at this one. Try the home page.",
    "This is the one page I cannot draft a reply for."
  ],

  /* ==========================================================================
     STATES — not tied to a section
     ====================================================================== */
  states: {

    /* First appearance, right after the cold start hands over. */
    arrival: [
      "I am Levi. Scroll, and I will keep up.",
      "Levi. First model, still in development.",
      "I will stay out of the way. Mostly."
    ],

    /* Visitor has stopped scrolling. Escalate with the tiers. */
    idleShort: [
      "Still here.",
      "Take your time.",
      "No hurry. Nothing is waiting on me."
    ],
    idleLong: [
      "You have gone quiet. Nothing moves until you come back.",
      "I will wait. That is most of what I do.",
      "Nothing has changed while you were away. That is the idea."
    ],
    idleVeryLong: [
      "Still nothing sent.",
      "Everything is where you left it."
    ],

    /* Visitor grabs Levi. */
    grabbed: [
      "Fine. Put me somewhere useful.",
      "Careful.",
      "This is new for both of us."
    ],
    droppedOk: [
      "This will do.",
      "Better light here."
    ],
    droppedBad: [
      "I cannot read from here. Moving.",
      "That is on top of the words. Shifting over."
    ],

    /* The one gesture: clicking Levi approves the nearest pending item. */
    approved: [
      "Approved. That one is yours now.",
      "Done. It went because you said so.",
      "One less. Two to go."
    ],
    approvedLast: [
      "That is all three. Morning closed.",
      "Nothing left needing you."
    ],
    edited: [
      "Your words now, not mine.",
      "Better. I will keep that phrasing in mind."
    ],
    skipped: [
      "Skipped. It waits, it does not disappear.",
      "Fine. It will still be there later."
    ],

    /* Scrolled fast past several sections. */
    scrolledFast: [
      "You went past a few. Scroll back if you want them.",
      "Too fast for me."
    ],

    /* Scrolled back up to something already seen. */
    revisit: [
      "Again?",
      "Same as before. Nothing has changed."
    ],

    /* Visitor dismissed Levi. Say one line, then go. */
    dismissed: [
      "Understood. Gone for this visit.",
      "Fair. The page reads fine without me."
    ],

    /* Second page in the same session. */
    returning: [
      "Still me.",
      "Different page, same rules."
    ],

    /* The permanent footnote, not a spoken line. Keep it out of Levi's mouth. */
    footnote:
      "Levi is in development. Its lines are scripted and the same for everyone."
  }
};
