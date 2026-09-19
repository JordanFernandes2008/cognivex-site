/* ============================================================================
   LEVI — the homepage script.

   THESE LINES EXPLAIN THE SITE, not the section's contents. The previous set
   read out what was already on screen - "Forty-one came in overnight", "Four
   kinds of work" - which is the one thing a guide never needs to do, because
   the visitor can see it. A guide says what the thing IS and what to do next.

   Every line is checked against the heading it sits under, so none of it is
   invented:
     hero       "Other AI tools wait for instructions. Cognivex hands you
                 finished work."
     walk       "One night, item by item. Click through what it actually did."
     tuesday    "Everything that came in, and what was ready for you."
     loop       "Three steps. You are the third one."
     ledger     "Four things, done properly."
     position   "Approval is not a safety setting. It is the product."
     closing    "Where this actually is."

   The closing line carries the status, in Levi's own voice rather than only in
   the footnote, because that is the section where the page says it too.

   Five to ten words each, flat, spoken. No exclamation marks and no adjectives
   doing sales work.
   ========================================================================== */
window.LEVI_SCRIPT = [
  { zone: "hero",      say: "I am Levi. Let me show you how this works." },
  { zone: "walk",      say: "Click any one of these. See what happened to it." },
  { zone: "tuesday",   say: "This is a Tuesday morning, already sorted for you." },
  { zone: "nightwork", say: "The work happens overnight. You read it in the morning." },
  { zone: "loop",      say: "Three steps here, and the last one is yours." },
  { zone: "ledger",    say: "Four kinds of work. Each one leaves a record." },
  { zone: "position",  say: "Approval is not a setting here. It is the point." },
  { zone: "closing",   say: "This is not running yet. That is the honest part." }
];

/* What it says when you stop. A timer, and the line says only what a timer
   knows - it does not claim to be watching you. */
window.LEVI_IDLE = [
  "Still here. Take your time.",
  "Nothing moves until you say so."
];
