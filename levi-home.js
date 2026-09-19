/* ============================================================================
   LEVI — the homepage script.

   THESE EXPLAIN THE FUNCTIONS. Not the section's contents, which the visitor
   can already see, and not a tour of the layout. Each line says what that part
   of the product actually DOES, in the order someone would need to hear it.

   Every number and every noun below is checked against the page it sits under,
   so none of it is invented:
     hero       "Other AI tools wait for instructions. Cognivex hands you
                 finished work."
     walk       "One night, item by item. Click through what it actually did."
     tuesday    "Everything that came in, and what was ready for you."
     nightwork  41 arrived / 38 handled / 3 need you
     loop       "Three steps. You are the third one."
     ledger     Inbox triage / Invoices and follow-up / Social posts /
                Memory and priorities
     position   "Approval is not a safety setting. It is the product."
     closing    "Where this actually is."

   The closing line carries the status in Levi's own voice, because that is the
   section where the page says it too. The footnote in the footer still carries
   it independently.

   Nine to thirteen words. The chatbox reserves two lines, so anything in that
   range fills the box without resizing it.
   ========================================================================== */
window.LEVI_SCRIPT = [
  { zone: "hero",      say: "I am Levi. I read what comes in and draft what goes out." },
  { zone: "walk",      say: "Open any item to see the reasoning that came attached to it." },
  { zone: "tuesday",   say: "One morning, already triaged. You read it, you did not sort it." },
  { zone: "nightwork", say: "Forty-one arrived. Thirty-eight were handled. Three need a decision." },
  { zone: "loop",      say: "It prepares, you approve, it sends. Never in any other order." },
  { zone: "ledger",    say: "Inbox triage, invoices, social posts, and what is due next." },
  { zone: "position",  say: "Other tools wait for a prompt. This one arrives with the work done." },
  { zone: "closing",   say: "None of this is running yet. I will not dress that up." }
];

/* What it says when you stop. A timer, and the line says only what a timer
   knows - it does not claim to be watching you. */
window.LEVI_IDLE = [
  "Still here. Take your time.",
  "Nothing moves until you say so.",
  "I will wait. That is most of the job.",
  "No rush. Nothing goes out on its own.",
  "Everything is drafted. It only wants a yes.",
  "Read it twice if you like. It keeps."
];
