/* ============================================================================
   motion.js — the GSAP layer.

   This file is ADDITIVE and OPTIONAL. site.js ships a complete hand-rolled
   motion system that works on its own; everything here is a better version of
   part of it. The handover is explicit rather than implicit: site.js checks for
   window.gsap and stands its equivalent features down, this file checks for the
   same thing and refuses to start without it. Exactly one system is ever
   writing to a given element.

   If the vendored libraries fail to load — blocked, 404, corrupted — nothing in
   here runs, site.js keeps its own motion, and the page is unchanged. There is
   no state in which both run, and no state in which neither does.

   Load order matters and is fixed in the markup:
       vendor/gsap → vendor/ScrollTrigger → vendor/SplitText → vendor/lenis
       site.js  (stands down where gsap exists)
       motion.js (this file)
   ========================================================================== */

(function () {
  "use strict";

  if (!window.gsap || !window.ScrollTrigger) return;

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* Reduced motion gets none of this. Not a shortened version, not a smaller
     distance — the page is simply static and interactive, which is what the
     preference actually asks for. */
  if (reduce.matches) return;

  /* ==========================================================================
     1. Inertial scroll

     The single biggest difference in feel between a normal site and the ones
     in that gallery. Lenis replaces the browser's scroll response with an
     interpolated one, so the page carries momentum instead of snapping to
     wherever the wheel put it.

     It has to be wired into GSAP's clock rather than left to run its own rAF
     loop: two independent loops reading and writing scroll in the same frame is
     how you get the jitter that makes smooth scroll feel worse than none.
     ========================================================================== */

  var lenis = null;

  if (window.Lenis) {
    lenis = new window.Lenis({
      duration: 1.05,
      /* Slightly overshooting ease-out. The tail is what reads as weight. */
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      /* Touch is left alone deliberately. Native momentum on a phone is tuned
         by the OS, is hardware-accelerated, and is what every other app on the
         device does; replacing it with a JS approximation is a downgrade on
         exactly the mid-range Android this product is aimed at. */
      smoothTouch: false
    });

    /* Scrolling is no longer window.scrollTo's job. Anything that moves the
       page programmatically has to go through this instance or it fights the
       interpolation and gets dragged back on the next frame. */
    window.cognivexScroll = lenis;

    lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add(function (time) {
      lenis.raf(time * 1000);          /* GSAP ticks in seconds, Lenis in ms */
    });
    gsap.ticker.lagSmoothing(0);

    /* CSS smooth scrolling and Lenis fight over the same anchor jumps; the
       class Lenis puts on <html> disables it, this is belt and braces. */
    document.documentElement.style.scrollBehavior = "auto";

    /* Anchor links have to go through Lenis or they jump while the page is
       still easing somewhere else. */
    document.addEventListener("click", function (event) {
      var link = event.target.closest('a[href^="#"]');
      if (!link) return;
      var id = link.getAttribute("href");
      if (!id || id === "#") return;
      var target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target, { offset: -72, duration: 1.2 });
    });
  }

  /* ==========================================================================
     2. Parallax, scrubbed

     Same intent as the hand-rolled version in site.js, but tied to the scroll
     position continuously rather than sampled in a rAF loop, and batched by
     ScrollTrigger so all of it resolves in one layout pass.
     ========================================================================== */

  gsap.utils.toArray("[data-par]").forEach(function (el) {
    /* Same rule as site.js: an element that also carries data-rise is left
       alone. data-rise animates transform from a class; GSAP writes transform
       inline; inline wins and the entrance would vanish with no error. */
    if (el.hasAttribute("data-rise")) return;

    var amount = parseFloat(el.getAttribute("data-par")) || 0;
    if (!amount) return;

    gsap.fromTo(el,
      { y: amount * 60 },
      {
        y: amount * -60,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.6          /* the lag is the point — it trails the scroll */
        }
      }
    );
  });

  gsap.utils.toArray("[data-scale-in]").forEach(function (el) {
    if (el.hasAttribute("data-rise")) return;
    gsap.fromTo(el,
      { scale: 0.88, opacity: 0.6 },
      {
        scale: 1, opacity: 1, ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "center center",
          scrub: 0.6
        }
      }
    );
  });

  /* ==========================================================================
     3. The pinned sequence

     The mechanic the whole gallery is built on: the section stops, and scrolling
     advances its content instead of moving the page. Here it means the three
     steps are read one at a time, in order, at the reader's pace — which is the
     correct shape for this content anyway, because they ARE a sequence.

     Pinned only where there is room. On a short viewport, pinning a section
     taller than the screen traps the reader in a region they cannot see the
     whole of, so below 700px tall it degrades to an ordinary staggered reveal.
     ========================================================================== */

  /* Hand an element to GSAP and take it away from CSS in the same breath.

     The step cards carry data-rise, whose resting rule is
     `[data-rise].is-risen { opacity: 1; transition: opacity 820ms }`. With that
     transition live, every per-frame opacity GSAP writes becomes a fresh 820ms
     destination rather than a value, so the element eases toward a target that
     has already moved and the rendered opacity never tracks the timeline.

     Removing the attribute and its classes is not enough on its own - the
     .is-risen rule has to stop matching AND the transition has to be off, so
     both are done here and the CSS carries a matching `transition: none`. */
  function claim(els) {
    els.forEach(function (el) {
      el.classList.remove("is-armed", "is-risen");
      el.removeAttribute("data-rise");
      el.classList.add("gsap-owned");
    });
  }

  /* The other half of claim(). Handing an element back to CSS is not just
     "delete the inline styles" - clearProps removes an inline opacity, the
     cascade value becomes the new destination, and the element TRANSITIONS to
     it over 820ms because data-rise's resting rule declares one. For that whole
     window the card is mid-fade, and if the transition is ever stalled - a
     background tab, a paint-throttled embed, a device under load - it stays
     wherever it stopped. Observed exactly that: cascade said opacity 1, no
     inline style, and the element computed 0 because a backwards-filled
     CSSTransition was parked at currentTime 0.

     So the values are dropped while transitions are still switched off, the
     change is flushed, and only then is the element released. It lands on its
     cascade value in one step with nothing left running. */
  function release(els) {
    if (!els.length) return;
    els.forEach(function (el) { el.classList.add("gsap-owned"); });
    gsap.set(els, { clearProps: "all" });
    void els[0].offsetHeight;                 /* flush, transitions still off */
    els.forEach(function (el) { el.classList.remove("gsap-owned"); });
  }

  var steps = gsap.utils.toArray(".loop__steps .step");

  if (steps.length) {
    /* gsap.matchMedia rather than the deprecated ScrollTrigger.matchMedia,
       because this needs real teardown: when the viewport crosses the boundary
       the desktop branch has to give the cards back to CSS in the state it
       found them. */
    var mm = gsap.matchMedia();

    mm.add("(min-height: 700px) and (min-width: 860px)", function () {
      claim(steps);
      gsap.set(steps, { opacity: 0.25, y: 40 });

      /* Measured, not hardcoded: the masthead is sticky, so a section pinned
         flush to the viewport top spends the whole pinned range with its first
         line hidden behind the header. */
      var head = document.querySelector(".masthead");
      var headH = head ? Math.round(head.getBoundingClientRect().height) : 0;

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: ".loop",
          start: "top " + headH + "px",
          end: "+=" + (steps.length * 420),
          pin: true,
          /* pinSpacing keeps the document height honest, so the scrollbar still
             describes the real length of the page. */
          pinSpacing: true,
          scrub: 0.8,
          anticipatePin: 1
        }
      });

      steps.forEach(function (step, i) {
        tl.to(step, { opacity: 1, y: 0, duration: 1, ease: "power2.out" }, i * 0.9);
        if (i < steps.length - 1) {
          tl.to(step, { opacity: 0.25, duration: 0.6, ease: "none" }, (i * 0.9) + 1.1);
        }
      });

      return function () {
        /* Leaving the pinned range for good: hand the cards back as plain
           visible content rather than leaving them at whatever opacity the
           timeline happened to stop on. */
        release(steps);
      };
    });

    mm.add("(max-height: 699px), (max-width: 859px)", function () {
      /* Deliberately no animation here.

         The first version used gsap.from(), which renders its start state
         immediately - so all three cards sat at opacity 0 from load, waiting on
         a ScrollTrigger. When that trigger did not fire, the entire "It reads /
         It drafts / You approve" sequence was permanently invisible on every
         phone. Verified: scrolled directly to them, still 0.

         site.js already reveals these through data-rise, which is built for
         exactly this and carries three separate safety nets - the observer, a
         synchronous geometric check for anything on screen at load, and a
         2.5s timer that un-arms everything if the observer never spoke. There
         is no reason to put a second, less careful reveal in front of it.

         Nothing on this page is allowed to start invisible and depend on a
         scroll event to become readable. */
      release(steps);
    });
  }

  /* ==========================================================================
     4. Headline reveal, by line

     site.js splits on words. SplitText splits on rendered LINES, which is the
     thing you cannot do by hand — a line is a product of the font, the width
     and the wrap, and it changes on resize. Masking per line is what makes the
     type look set rather than assembled.
     ========================================================================== */

  if (window.SplitText) {
    gsap.utils.toArray("[data-words]").forEach(function (el) {
      /* site.js stands its word-splitter down when gsap is present, so this
         receives the original markup with its <br> and <em> intact. Asserted
         rather than assumed: if a .word ever appears here the two systems have
         both run, and the right response is to leave the headline alone rather
         than flatten it to text and lose the line break and the emphasis. */
      if (el.querySelector(".word")) return;

      var split = new window.SplitText(el, {
        type: "lines",
        mask: "lines",
        linesClass: "gsline"
      });

      gsap.from(split.lines, {
        yPercent: 115,
        duration: 1.1,
        ease: "expo.out",
        stagger: 0.09,
        scrollTrigger: { trigger: el, start: "top 88%", once: true }
      });
    });
  }

  /* A late webfont changes every line break and every offsetTop on the page. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
})();
