/* ============================================================================
   THE POINTER'S SHADOW

   A soft shadow cast by the cursor onto the page, which separates from it while
   you scroll and settles back under it when you stop.

   The idea it is built on: the cursor is a physical object held a little way
   ABOVE the page. When the page moves underneath it, the shadow — which belongs
   to the page, not to the cursor — is carried along with the page and lags
   behind. Stop scrolling and it slides back under. Nothing here is decoration
   for its own sake; every number below is trying to make that one relationship
   legible.

   Three things it has to get right, and only one of them is the animation:

     GROUND    This page runs cream, then ink, then pure black, then chroma
               green. A dark shadow is invisible on black and a pale one is
               invisible on cream, so the layer reads what is actually beneath
               the pointer and switches between a multiply shadow and a screen
               highlight. A shadow that disappears for a third of the document
               is worse than no shadow.
     INPUT     Touch has no hovering pointer and no cursor to cast anything, so
               this never runs there. It is gated on a fine pointer that can
               hover, not on a screen width.
     MOTION    prefers-reduced-motion keeps the shadow and drops the smear. The
               effect is a position, not a flourish; there is no reason to take
               it away entirely, and the thing people with that preference set
               actually object to is the lunge.

   The native cursor is deliberately NOT hidden. Replacing a pointer with a div
   costs a frame of latency, breaks every text caret and resize handle on the
   page, and buys nothing here: the effect is about what is under the cursor,
   not about the cursor.
   ========================================================================== */
(function () {
  "use strict";

  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)");
  if (!fine || !fine.matches) return;

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var el = document.createElement("div");
  el.className = "pshadow";
  el.setAttribute("aria-hidden", "true");
  document.body.appendChild(el);

  var px = window.innerWidth / 2, py = window.innerHeight / 2;   /* pointer */
  var sx = px, sy = py;                                          /* shadow  */
  var vScroll = 0, rawScroll = 0, lastY = window.scrollY;
  var lit = false, seen = false, raf = null;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---- which ground are we over? ------------------------------------------
     Walks up from whatever is under the pointer to the first element with an
     actually painted background, and decides from its luminance. Walking is
     necessary because nearly everything on this page is transparent on purpose
     — the 3D layer shows through it — so the element under the pointer almost
     never owns the colour you can see.

     Falls back to the body, and then to "light", because a shadow that guesses
     wrong on a cream page is a grey smudge, while one that guesses wrong on
     black is nothing at all. */
  function luminanceOfGroundAt(x, y) {
    var node = document.elementFromPoint(x, y);
    var depth = 0;
    while (node && depth++ < 12) {
      var bg = getComputedStyle(node).backgroundColor;
      var m = bg && bg.match(/[\d.]+/g);
      if (m && m.length >= 3 && (m.length < 4 || parseFloat(m[3]) > 0.55)) {
        var c = [m[0], m[1], m[2]].map(function (v) {
          v = v / 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      }
      node = node.parentElement;
    }
    return 1;
  }

  /* Sampled on a timer rather than every frame. elementFromPoint forces style
     and layout to be up to date, so calling it sixty times a second inside the
     same frame that is already writing a transform is a guaranteed way to turn
     a cheap effect into a layout thrash. Six times a second is far quicker than
     anyone crosses a colour boundary. */
  var lastSample = 0;
  function sampleGround(now) {
    if (now - lastSample < 165) return;
    lastSample = now;
    var l = luminanceOfGroundAt(px, py);
    /* Hysteresis. A single threshold flickers the whole layer back and forth
       when the pointer sits on an edge — and the edges on this page are the
       letterbox bars and the strip's frame, both of which are exactly the sort
       of hard boundary a pointer comes to rest on. */
    var want = lit ? (l > 0.34) ? false : true
                   : (l < 0.20) ? true  : false;
    if (want !== lit) { lit = want; el.classList.toggle("is-lit", lit); }
  }

  window.addEventListener("pointermove", function (e) {
    px = e.clientX; py = e.clientY;
    if (!seen) {
      seen = true;
      /* Placed before it is shown, so it fades up where the pointer already is
         instead of flying in from the middle of the screen. */
      sx = px; sy = py;
      el.classList.add("is-on");
    }
  }, { passive: true });

  window.addEventListener("pointerleave", function () { el.classList.remove("is-on"); });
  window.addEventListener("pointerenter", function () { if (seen) el.classList.add("is-on"); });

  window.addEventListener("scroll", function () {
    var y = window.scrollY;
    rawScroll += y - lastY;
    lastY = y;
  }, { passive: true });

  var lastNow = 0;
  function frame(now) {
    raf = window.requestAnimationFrame(frame);

    /* EVERY DAMPING BELOW IS TIME BASED, NOT FRAME BASED.

       Written as `v += (target - v) * 0.22` a follow converges at whatever
       rate the display happens to refresh at: a 144Hz monitor settles it two
       and a half times faster than a 60Hz one, and a throttled tab never
       settles it at all. Measured here, where the inspector pane clamps the
       loop: the shadow was still at full displacement a full second after the
       scroll had stopped.

       Raising each coefficient to the power of the elapsed frame count gives
       the same curve at any refresh rate. dt is capped at four so that
       returning to a backgrounded tab does not snap everything at once. */
    var dt = lastNow ? Math.min((now - lastNow) / 16.667, 4) : 1;
    lastNow = now;
    var kv = 1 - Math.pow(1 - 0.22, dt);
    var kd = Math.pow(0.55, dt);
    var kp = REDUCED ? 1 : 1 - Math.pow(1 - 0.18, dt);

    /* Scroll velocity, smoothed and then decayed to nothing. rawScroll
       accumulates whatever the scroll events delivered since the last frame;
       reading scrollY here instead would miss everything that happened between
       two frames, which on a smooth-scrolled page is most of it. */
    vScroll += (rawScroll - vScroll) * kv;
    rawScroll *= kd;
    if (Math.abs(vScroll) < 0.05) vScroll = 0;

    /* The shadow trails the pointer. 0.18 per 60Hz frame is slow enough to be
       visible as lag and fast enough that it is never somewhere the pointer has
       already left. */
    sx += (px - sx) * kp;
    sy += (py - sy) * kp;

    /* THE SEPARATION.

       Negative, because the shadow belongs to the PAGE. Scroll down and the
       content travels up the screen, so the shadow travels up with it and the
       cursor is briefly left hanging over nothing. Getting this sign backwards
       produces something that still moves and reads as a bug you cannot name.

       Capped, because past about seventy pixels it stops being a shadow and
       becomes a second object. */
    var lagY = REDUCED ? 0 : clamp(-vScroll * 0.62, -70, 70);

    var travel = Math.abs(px - sx) + Math.abs(py - sy);
    var lift = Math.min(Math.abs(vScroll) / 42, 1);

    /* Away from the page it grows and softens, exactly as a real one does. The
       vertical stretch is slightly greater than the horizontal, which is what
       makes fast scrolling read as a smear rather than as a balloon. */
    var s  = 1 + lift * 0.85 + Math.min(travel / 220, 0.3);
    var sy2 = s * (1 + lift * 0.30);

    el.style.transform =
      "translate3d(" + sx.toFixed(1) + "px," + (sy + lagY).toFixed(1) + "px,0)" +
      " scale(" + s.toFixed(3) + "," + sy2.toFixed(3) + ")";
    el.style.opacity = (0.55 + lift * 0.45).toFixed(3);

    sampleGround(now || 0);
  }

  raf = window.requestAnimationFrame(frame);

  /* A hovering pointer can stop existing — a tablet with a trackpad attached,
     or a window dragged to a touch screen. Re-checked rather than assumed once
     at load. */
  if (fine.addEventListener) {
    fine.addEventListener("change", function (e) {
      if (!e.matches) {
        el.classList.remove("is-on");
        if (raf) window.cancelAnimationFrame(raf);
        raf = null;
      } else if (!raf) {
        raf = window.requestAnimationFrame(frame);
      }
    });
  }

  window.addEventListener("pagehide", function () {
    if (raf) window.cancelAnimationFrame(raf);
  });
})();
