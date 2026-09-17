/* ============================================================================
   THE FILM, CHOREOGRAPHED

   The clip is the subject; this is what turns it from wallpaper into something
   the page is moving through. Three things, all of them driven by the reader
   rather than by a clock:

   1. PARALLAX. Through the hero the film drifts up and toward the middle while
      it grows. Scrubbed, so it tracks the scrollbar exactly - nothing is
      "playing" that the reader did not ask for.

   2. PLAYBACK RATE FROM SCROLL VELOCITY. Move fast and the disk spins up; stop
      and it eases back to real time. This is the one effect the footage can do
      that a shader could not do convincingly, because the thing being sped up
      is real rotation with real motion blur already in it.

   3. A SETTLE on arrival, so the first frame is not a hard cut from the poster.

   TRANSFORM OWNERSHIP: site.css sets the resting transform so the composition
   is correct with no JS at all. GSAP writes an inline transform that overrides
   it, and its resting values are the same numbers - so the enhancement starts
   from exactly where the stylesheet left off rather than jumping on load.
   ========================================================================== */
(function () {
  "use strict";

  var film = document.querySelector(".singularity__film");
  if (!film) return;

  /* Reduced motion keeps the stylesheet's static composition and real-time
     playback. Nothing below runs. */
  if (window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var hero = document.querySelector(".hero__void");
  var hasGsap = window.gsap && window.ScrollTrigger;

  /* ---- 1 + 3. drift and settle ------------------------------------------ */
  if (hasGsap && hero) {
    gsap.registerPlugin(ScrollTrigger);

    /* THE VARIABLES, never the transform. GSAP composes translate-then-scale
       and the stylesheet composes scale-then-translate, so writing a transform
       here with the stylesheet's own numbers produces a different matrix - it
       put the hole's centre at 109% of the viewport, off screen entirely.
       Animating the inputs to the one CSS declaration cannot disagree with it. */
    /* READ THE RESTING COMPOSITION OFF THE STYLESHEET rather than repeating
       it here. Hardcoding it meant a media query could never move the film -
       GSAP's inline values won - so the narrow-window composition, where the
       hole otherwise lands on top of the copy, had no way to differ. */
    var cs0 = getComputedStyle(film);
    var S0 = parseFloat(cs0.getPropertyValue("--film-s")) || 0.95;
    var X0 = (cs0.getPropertyValue("--film-x") || "31%").trim();
    var Y0 = (cs0.getPropertyValue("--film-y") || "26%").trim();

    gsap.fromTo(film,
      { opacity: 0, "--film-s": S0 * 0.95 },
      { opacity: 1, "--film-s": S0, duration: 1.5, ease: "power2.out" });

    /* Toward the middle and up as the hero is left behind, so leaving reads as
       travelling past the thing rather than as it scrolling away. */
    gsap.fromTo(film,
      { "--film-s": S0, "--film-x": X0, "--film-y": Y0 },
      {
        "--film-s": S0 * 1.22,
        "--film-x": (parseFloat(X0) * 0.55).toFixed(1) + "%",
        "--film-y": (parseFloat(Y0) * 0.08).toFixed(1) + "%",
        ease: "none",
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: 0.7
        }
      });
  }

  /* ---- 2. rate from velocity -------------------------------------------- */
  /* Fast attack, slow decay - the disk should spin up the instant the wheel
     turns and wind down afterwards, which is how mass behaves. Symmetrical
     smoothing reads as a slider being dragged instead of as speed. */
  var RATE_MIN = 1, RATE_MAX = 3.2;
  var rate = RATE_MIN, lastY = window.scrollY || 0, alive = true;

  function tick() {
    if (!alive) return;
    window.requestAnimationFrame(tick);

    var y = window.scrollY || window.pageYOffset || 0;
    var dy = Math.abs(y - lastY);
    lastY = y;

    var want = RATE_MIN + Math.min(dy / 24, 1) * (RATE_MAX - RATE_MIN);
    rate += (want - rate) * (want > rate ? 0.26 : 0.045);

    /* Only write when it actually moved. Assigning playbackRate every frame
       makes some browsers re-evaluate the decode pipeline for nothing. */
    if (Math.abs(film.playbackRate - rate) > 0.01) {
      try { film.playbackRate = rate; } catch (e) { alive = false; }
    }
  }
  tick();

  /* Off-screen the clip is decoding frames nobody can see. */
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { var p = film.play(); if (p && p.catch) p.catch(function () {}); }
        else film.pause();
      });
    }, { threshold: 0 }).observe(film);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) film.pause();
    else { var p = film.play(); if (p && p.catch) p.catch(function () {}); }
  });

  /* A handle for verification, same contract as the old scene had. */
  window.cognivexFilm = {
    el: film,
    stats: function () {
      var r = film.getBoundingClientRect();
      return {
        playing: !film.paused,
        rate: +film.playbackRate.toFixed(2),
        currentTime: +film.currentTime.toFixed(2),
        transform: getComputedStyle(film).transform,
        boxTop: Math.round(r.top)
      };
    }
  };
})();
