/* ============================================================================
   LEVI — the homepage script.

   SPOKEN, NOT TELEGRAPHED. The two-word version fixed the tooltip problem and
   created a new one: "The rest, handled." is not how a person talks, it is how
   a status bar talks. These are five to ten words each, the length of somebody
   turning their screen toward you and saying one thing about it.

   Flat and unhurried. No exclamation marks, no adjectives doing sales work.

   EVERY FACT HERE IS ALREADY ON THE PAGE. The previous draft had Levi saying
   "This ran at 3am" - there is no 3am anywhere in the night-work section, or
   any time at all; it was invented, and it is gone. What the page really
   carries is 41 in, 3 needing a decision, 38 handled, 0 sent without you, and
   the four kinds of work in the ledger.

   Each stop names a ZONE. The page declares where the light may be; a section
   with no usable zone simply has no line.
   ========================================================================== */
window.LEVI_SCRIPT = [
  { zone: "hero",      say: "Forty-one came in overnight. Three of them need you." },
  { zone: "walk",      say: "Here is each one, and what happened to it." },
  { zone: "tuesday",   say: "This is the morning as it would actually arrive." },
  { zone: "nightwork", say: "Everything from one night, and what was prepared." },
  { zone: "loop",      say: "Three steps, and you are the third one." },
  { zone: "ledger",    say: "Four kinds of work, each leaving a record." },
  { zone: "position",  say: "Other tools wait to be told what to do." },
  { zone: "closing",   say: "That is all of it. Nothing went without you." }
];

/* What it says when you stop. A timer, and the line says only what a timer
   knows - it does not claim to be watching you. */
window.LEVI_IDLE = ["Still here whenever you are."];
