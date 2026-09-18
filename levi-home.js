/* ============================================================================
   LEVI — the homepage script.

   SHORT, because length is what made this read as a tooltip. Measured on the
   reference: its speech IS in a container - a 41x21px pill with a 72.7px
   radius - and it does not read as UI because the text is two or three words,
   so the container is barely larger than the words. Our lines were one to
   three sentences, which no amount of removing the box was going to fix.

   Levi does not introduce itself any more. The paragraph about what it is
   belongs to the page, once, where the product is described - not to a
   character standing in front of you saying it.

   VOICE. Flat and quiet. No exclamation marks, no adjectives doing sales work.
   It states what is on the screen and stops.

   Each stop names a ZONE, not a selector to point at. The page declares where
   the light may be; if a section has no zone, Levi is not there for it.
   ========================================================================== */
window.LEVI_SCRIPT = [
  { zone: "hero",      say: "Forty-one came in." },
  { zone: "walk",      say: "Three needed you." },
  { zone: "tuesday",   say: "The rest, handled." },
  { zone: "nightwork", say: "This ran at 3am." },
  { zone: "loop",      say: "Drafted, not sent." },
  { zone: "ledger",    say: "Nothing left without you." },
  { zone: "position",  say: "Other tools wait to be told." },
  { zone: "closing",   say: "You approved three things." }
];

/* What it says when you stop. A timer, and the line says only what a timer
   knows - it does not claim to be watching. */
window.LEVI_IDLE = ["Still here."];
