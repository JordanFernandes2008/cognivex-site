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


    /* ----------------------------------------------------------------------
       THE DEMO, ITEM BY ITEM.
       Levi's main job is here. These are spoken as the visitor moves through
       the queue, not as one line for the whole section. Key them to the item
       currently in focus and to what the visitor just did.
       -------------------------------------------------------------------- */
    demo: {

      /* Spoken once, when the surface first comes into view. */
      intro: [
        "This is the product. Everything else on the page describes it.",
        "Five items, each already drafted. Nothing has been sent.",
        "Watch one go through, or do it yourself.",
        "The left rail is the argument: forty-one in, five out."
      ],

      /* Per item type, as it comes into focus. */
      emailReply: [
        "A check-in to Priya about invoice 0142. Written, not sent.",
        "Eighteen days overdue, so the tone is a reminder, not a demand.",
        "It stays in the same thread, so she is not starting again.",
        "Read the reasoning under it. That is where you check my work."
      ],
      invoice: [
        "Fairlane's retainer is due. The invoice is filled in already.",
        "Same amount, same terms, new month. Nothing invented.",
        "I prepared it. Sending it is still your click."
      ],
      socialPost: [
        "You said the walnut bench. This is the post.",
        "Queued for Friday, because that is when you said.",
        "Change the words if it does not sound like you."
      ],
      complaint: [
        "A complaint. This one I will not answer alone.",
        "Wrong item arrived. The apology needs your name on it.",
        "I drafted it, but you should read every word."
      ],
      repeatQuestion: [
        "Opening hours, asked three times this morning.",
        "Same answer each time. It never reached you.",
        "This is the kind of thing that eats a morning."
      ],
      noise: [
        "Filed, not answered. Nothing here needs a person.",
        "Newsletters and promotions. Twenty of the forty-one."
      ],

      /* The reasoning block. */
      why: [
        "Every draft says why it is worded that way.",
        "If the reasoning is wrong, the draft is wrong. Say so.",
        "You are checking my thinking, not just my spelling."
      ],

      /* Controls, spoken on hover or first focus. */
      controls: [
        "Approve, edit, or skip. There is no fourth button.",
        "Edit opens the words. Approve is the only thing that sends.",
        "Skip does not delete it. It waits."
      ],

      /* After each action. */
      afterApprove: [
        "Gone, because you said so. The rest are still waiting.",
        "That is one decision made. The counter moved.",
        "Approved. It was never going anywhere without that."
      ],
      afterEdit: [
        "Your wording now. I kept the rest.",
        "Better. That is how you would have said it."
      ],
      afterSkip: [
        "Skipped. Still there when you come back.",
        "Fine. It waits rather than disappearing."
      ],

      /* Queue empty. */
      empty: [
        "That is the morning. Five decisions, nothing else needed you.",
        "Empty queue. The other thirty-six were handled beneath it.",
        "Done. Replay it if you want to see it again."
      ],

      /* If they just watch. */
      watching: [
        "You can take over whenever you want.",
        "I will keep going. Stop me by clicking anything."
      ]
    },

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
    ]
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
     BANTER — the second bank.
     Studied from the reference: its bee never explains the site. Clicking it
     cycles through short remarks, and scrolling fast gets you told off. The
     lines carry no information at all, which is exactly why the character
     reads as alive rather than as a tooltip.
     These are NOT section lines. They fire on what the visitor DOES.
     Keep them 2-6 words. Dry. Never cute, never eager.
     ====================================================================== */
  banter: {

    /* Clicking Levi repeatedly cycles this bank, in order, then loops.
       The first few are the ones most people will see. */
    clicked: [
      "Yes?",
      "Still here.",
      "That is twice.",
      "Keep going, see what happens.",
      "Nothing new yet.",
      "You are testing me.",
      "Fine. Another one.",
      "I can do this longer than you.",
      "Do you have a business to run?",
      "This is not in the demo.",
      "Nobody has clicked this many times.",
      "Now you are just poking.",
      "The queue is over there.",
      "I would draft a reply, but you keep clicking.",
      "Try approving something instead.",
      "Still nothing sent.",
      "You could be reading the page.",
      "I am not going anywhere.",
      "Persistent.",
      "Fine, one more.",
      "That is the last one. Probably.",
      "It is not."
    ],

    /* Fired when the visitor scrolls hard and fast. */
    scrollingFast: [
      "Slow down.",
      "You went past three.",
      "Nothing to catch up to.",
      "There is no rush.",
      "You are missing the good part."
    ],

    /* Scrolled back up. */
    scrolledBack: [
      "Changed your mind.",
      "Same as before.",
      "It has not moved."
    ],

    /* Cursor hovering near Levi without clicking. */
    hovered: [
      "Go on.",
      "Click, if you like.",
      "I do not bite."
    ],

    /* Dragged somewhere. */
    dragged: [
      "Where are we going?",
      "Careful.",
      "This is new.",
      "Put me down gently."
    ],
    droppedSomewhereOdd: [
      "Really. Here.",
      "I cannot read from here.",
      "Fine. Your page."
    ],

    /* Visitor does nothing for a long time. */
    abandoned: [
      "Still here.",
      "Nothing moves without you.",
      "Take your time.",
      "I will wait. It is most of the job."
    ],

    /* Visitor reached the bottom without touching the demo. */
    neverTriedDemo: [
      "You never approved anything.",
      "The demo is back up there.",
      "You read about it. You could try it."
    ],

    /* Rare — only after the visitor has approved everything. */
    afterAllDone: [
      "That is the whole morning.",
      "Now you know what it does.",
      "Nothing left to decide."
    ]
  },

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
