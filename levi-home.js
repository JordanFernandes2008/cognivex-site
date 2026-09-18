/* ============================================================================
   LEVI — the homepage script.

   Kept in its own file, separate from the component, so a page's words can be
   rewritten without touching the machinery and so other pages can supply their
   own list later. The component reads whatever window.LEVI_SCRIPT holds.

   VOICE. Levi states what is on the screen and stops. No exclamation marks, no
   adjectives doing sales work, no second-person flattery. It is allowed to say
   what the product will not do, because that is the product.

   HONESTY. The first line says Levi is not running and that everything here is
   scripted, because it is: this file is the whole of Levi's speech, identical
   for every visitor. Nothing below may imply it is reading, learning, or
   connected to anything.

   Each stop names a real element on the page. If a selector stops matching,
   the component skips that stop rather than pointing at nothing.
   ========================================================================== */
window.LEVI_SCRIPT = [
  {
    at: ".hero__void .hero__title",
    say: "I am Levi, the first model Cognivex is building. I read what arrives " +
         "overnight and leave the replies ready for you. I am not running yet, " +
         "so everything I say here is scripted."
  },
  {
    at: ".app",
    say: "This is the queue on a Tuesday morning. Three things need you. The " +
         "other thirty-eight did not."
  },
  {
    at: ".walk__player",
    say: "Six kinds of thing arrive in a night. Step through and you can see " +
         "what happened to each one, and why."
  },
  {
    at: ".tuesday__inner",
    say: "A morning as it would actually land. Nothing here was sent while you " +
         "were asleep."
  },
  {
    at: ".nw",
    say: "The same night, filed. There is no column for things that were sent, " +
         "and that is deliberate."
  },
  {
    at: ".loop__steps",
    say: "Three steps, and you are the third. Nothing moves past you."
  },
  {
    at: ".ledger__rows, .ledger",
    say: "Four kinds of work. Each one leaves a record you can open afterwards."
  },
  {
    at: ".position__title",
    say: "Approval is not a setting that was bolted on. It is the thing being " +
         "sold."
  },
  {
    at: ".closing__grid",
    say: "That is all of it. There is no way to contact us yet, and the page " +
         "says so rather than collecting your email."
  }
];
