/* ============================================================================
   LEVI — a light the scroll moves.

   THERE IS NO TOUR IN HERE ANY MORE. No next, no step counter, no "1 of 9", no
   completion. Levi speaks because the visitor arrived somewhere, not because
   they pressed something: each zone owns one line, and whichever section is
   the dominant thing in the viewport is the line you get. Scroll back up and
   the earlier line comes back, because this is a POSITION, not a sequence.

   Scrolling fast past four sections must not queue four lines, so the read is
   debounced to where the visitor actually stopped - it speaks for the place
   they came to rest, and nothing for the places they flew through.

   CLICK IS RESERVED. The one gesture is clicking the star to approve the
   nearest pending item, which is the product's only real verb. Nothing else on
   this object is clickable, and the line is not a button.

   WHERE IT MAY BE. [data-levi-zone] bands declared in the markup and sized in
   the layout to be genuinely empty. No rect scanning, no candidate scoring, no
   fallback corner - all of that is what kept exiling it to the right margin,
   where it was measured at 110px from the screen edge with a line box computing
   to width 0. A section with no usable zone gets no Levi.

   THE LINE NEVER COMPRESSES. Fixed 19rem measure at body size. If it will not
   fit beside the star inside the zone, the STAR moves and the line is laid out
   below it - the text is never squeezed to make room for the light.

   DEPTH. Star inside <main> at z-index 1, so the display type at z-index 2
   occludes it; speech on body above everything. Both read --levi-x/--levi-y,
   written once per frame. It is a quieter effect here than on the reference -
   our display type is ~64px against their 162px - and that is accepted rather
   than compensated for by inflating either one.
   ========================================================================== */
(function () {
  "use strict";

  var KEY = "cognivex.levi.dismissed";
  var script = window.LEVI_SCRIPT;
  if (!script || !script.length) return;
  try { if (window.sessionStorage.getItem(KEY) === "1") return; } catch (e) {}

  var REDUCED = window.matchMedia &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var BOOTING = !!(window.__coldStart && window.__coldStart.pending);

  var MAX_DT = 1 / 30;

  /* FLIGHT, MEASURED. Four frames of the reference about 1.2s apart put its
     character at 415, 372 and 645 px of travel per step - roughly 310 to 540
     px/s, never a straight line between two points, and always decelerating
     into where it stops rather than snapping there.

     MAXF is the important one. A spring can change direction instantly if the
     target jumps; a thing with mass cannot, and that limit is most of what
     separates flying from being dragged. */
  var MAXV = 520;      /* px/s cruise ceiling                                */
  var CURSOR_PULL = 30, CURSOR_REACH = 460;
  var PAD = 40;
  var IDLE_MS = 22000;
  var SETTLE_MS = 150;          /* how long the scroll must stop before it speaks */

  function phone() { return window.innerWidth <= 700; }
  /* What it ACTUALLY occupies. The corona is 196 across and transparent by 84%
     of its radius, so the light reaches about 82 from centre; 95 covers it with
     the flare's bright inner third. It used to reserve 150 while rendering 124,
     which is what pushed it onto the film's bright band. */
  function starR() { return phone() ? 78 : 95; }
  /* THE MEASURE, MEASURED. These were 304 and 256 against a box that renders
     at 20.5rem and 16rem - 328 and 256. The desktop number was 24px short, so
     the stacked box was centred 12px off its own light and the beside/stacked
     decision was taken against a box narrower than the one actually drawn.
     Read the element; keep the constants only for the moment before it
     exists. */
  function lineW() {
    var w = speech && speech.getBoundingClientRect().width;
    return w > 4 ? w : (phone() ? 256 : 328);
  }
  function gapW() { return phone() ? 26 : 38; }

  function sectionOf(el) { return el.closest("section") || el.parentElement || el; }

  /* A BAND HAS TO HOLD THE LIGHT. NOT THE LINE.

     This budgeted for the chatbox inside the band - 408px stacked, 636px
     beside - which was correct when the line sat next to the star inside the
     zone. It has not since the line was decoupled and given its own placement
     (the section's free foot, or the gutter when Levi is in the lane).

     Left as it was, it rejected the hero's lower band for being 229px wide
     when the thing it actually has to contain is 190px across. Measured: the
     hero was unreachable at 1536 because of it. */
  function LIGHT_BOX() { return 2 * starR() + 24; }

  function fitsWidth(w) { return w >= LIGHT_BOX(); }

  /* THE PART OF A BAND THAT IS ACTUALLY ON SCREEN, or null.

     This is the whole fix. Placement used to read the band's raw rect, so a
     band that had scrolled off the top was still a valid target: measured at
     scrollY 1400 the hero band sat 1,081px above the viewport and Levi was
     dutifully sent there. It was on screen for two of eight sampled scroll
     positions. Nothing reads a raw zone rect any more. */
  /* Whether a zone is DISPLAYED changes only when a media query flips - that
     is, on resize, not sixty times a second. getComputedStyle forces a style
     recalculation on every call, and this was asking three or four times per
     frame for an answer that had not changed since the last resize. */
  var shownCache = null;
  function isShown(el) {
    if (!shownCache) shownCache = new WeakMap();
    if (shownCache.has(el)) return shownCache.get(el);
    var cs = getComputedStyle(el);
    var ok = cs.display !== "none" && cs.visibility !== "hidden";
    shownCache.set(el, ok);
    return ok;
  }
  function forgetShown() { shownCache = null; }

  function visibleSlice(el) {
    if (!el) return null;
    if (!isShown(el)) return null;
    var vh = document.documentElement.clientHeight;
    var r = el.getBoundingClientRect();
    var top = Math.max(r.top, 0), bottom = Math.min(r.bottom, vh);
    var h = bottom - top;
    /* Same correction vertically. Demanding 2*PAD + 2*R meant the WHOLE band
       had to be on screen, so centring a section left 216-227px visible
       against a 270px requirement and four sections out of eight went silent.
       What has to fit is the light and a little air. */
    if (h < LIGHT_BOX()) return null;
    if (!fitsWidth(r.width)) return null;
    return { left: r.left, width: r.width, top: top, height: h };
  }

  /* A NAME MAY DECLARE SEVERAL BANDS. The hero is 1,677px tall and declared one
     band across its top 485px; past that the band was gone while the section
     still dominated. A tall section declares more than one, and whichever has
     the most of itself on screen is the one Levi uses. */
  var elsCache = {};
  function zoneEls(name) {
    if (!elsCache[name]) {
      elsCache[name] = document.querySelectorAll('[data-levi-zone="' + name + '"]');
    }
    return elsCache[name];
  }
  function forgetEls() { elsCache = {}; }
  function zoneEl(name) {
    var all = zoneEls(name), best = null, bestH = 0;
    for (var i = 0; i < all.length; i++) {
      var s = visibleSlice(all[i]);
      if (s && s.height > bestH) { bestH = s.height; best = all[i]; }
    }
    /* Falling back to the first keeps anyZoneUsable() a question about the
       MARKUP. A scroll gap must not be able to decide Levi does not exist. */
    return best || all[0] || null;
  }

  function zoneUsable(el) {
    if (!el) return false;
    if (!isShown(el)) return false;
    var r = el.getBoundingClientRect();
    if (r.height < LIGHT_BOX()) return false;
    return fitsWidth(r.width);
  }

  /* ---- markup --------------------------------------------------------------
     Built here, so with JavaScript off there is no star, no line, no footnote. */
  var host = document.querySelector("main") || document.body;

  var root = document.createElement("div");
  root.className = "levi";
  root.setAttribute("data-levi", "");

  var star = document.createElement("button");
  star.type = "button";
  star.className = "levi__star";
  star.setAttribute("aria-label", "Levi. Approve the nearest pending item.");
  star.innerHTML =
    /* Three layers of GLOW, widest first. No ring: a 2px border, and later a
       radial-gradient annulus, are both a circumference - the one thing a
       light does not have.

       Then a BODY and a FACE on top, which is the part that is new.

       He was a blurred light and nothing else: a 30px core under blur(14px),
       so there was no surface anywhere on him that a face could sit on. A
       face needs somewhere to be. So the glow keeps doing what it did and an
       opaque disc is composited in the middle of it - the glow is the halo
       around him now rather than the whole of him.

       The features are ink on that disc, not light on it. #14161a on
       accent-fill #ff7a1a measures 6.94:1, so his own face clears AA against
       his own body, and it does that identically on the dark homepage and the
       six light pages because the disc is opaque and carries its own ground
       with it. A face drawn in light would have disappeared on white. */
    '<i class="levi__flare"  aria-hidden="true"></i>' +
    '<i class="levi__corona" aria-hidden="true"></i>' +
    '<i class="levi__core"   aria-hidden="true"></i>' +
    '<i class="levi__body"   aria-hidden="true">' +
      '<i class="levi__eye levi__eye--l"></i>' +
      '<i class="levi__eye levi__eye--r"></i>' +
      '<i class="levi__mouth"></i>' +
    '</i>';

  /* No shadow element any more - the chatbox replaced it. */

  var say = document.createElement("div");
  say.className = "levi-say is-quiet";

  var speech = document.createElement("div");
  speech.className = "levi__speech";
  speech.innerHTML =
    '<b class="levi__who">Levi</b>' +
    '<p class="levi__line"><span data-levi-say></span><i class="levi__caret" aria-hidden="true"></i></p>';

  /* The cast shadow goes in FIRST so it paints behind the body. It is not
     inside the star: the star is the button, and the body tilts and squashes,
     none of which a shadow on the ground should do. */
  var cast = document.createElement("i");
  cast.className = "levi__cast";
  cast.setAttribute("aria-hidden", "true");
  root.appendChild(cast);
  root.appendChild(star);
  say.appendChild(speech);

  /* "(click me)" - the reference's one piece of micro-copy, carried over.
     Its bee is captioned "(Click to feed the bee)", and that parenthetical is
     what tells you the character is a thing you can touch. Levi's click does
     something real - banter, or approving the nearest item - and nothing on
     the page had ever said so. Once per session, gone at the first
     interaction or after 14s. */
  var hint = document.createElement("span");
  hint.className = "levi-hint";
  hint.setAttribute("aria-hidden", "true");
  hint.textContent = (window.matchMedia && matchMedia("(hover: hover)").matches) ? "(click me)" : "(tap me)";
  say.appendChild(hint);
  host.appendChild(root);
  document.body.appendChild(say);

  /* IN THE FOOTER, IN THE FLOW - not fixed over the hero copy. */
  var note = document.createElement("p");
  note.className = "levi-note";
  /* states.footnote, and it is the ONE string in the set Levi never says out
     loud. It is a note to the reader about him, not a line from him. */
  note.textContent = (window.LEVI_VOICE && window.LEVI_VOICE.footnote) ||
    "Levi is in development. Its lines are scripted and the same for everyone.";
  var footHome = document.querySelector(".foot .wrap") ||
                 document.querySelector(".foot") || document.body;
  footHome.appendChild(note);

  /* A SHORT TRAIL. A chain of followers, each lagging the one before it, shown
     only while it is actually travelling - transform and opacity only, and it
     decays within a few hundred ms of arriving. It is drawn behind the star and
     does not widen the reserved area. */
  var TRAIL = 6, trail = [];
  for (var ti = 0; ti < TRAIL; ti++) {
    var d = document.createElement("i");
    d.className = "levi__trail";
    d.setAttribute("aria-hidden", "true");
    root.insertBefore(d, star);
    trail.push({ el: d, x: 0, y: 0 });
  }

  /* Pointer events, so mouse, pen and touch are one code path. The star is a
     <button>, so a press that never moves more than 4px stays a click and the
     approve gesture still works; anything further is a drag. */
  star.style.touchAction = "none";
  star.addEventListener("pointerdown", function (e) {
    dropHint();
    if (dismissed) return;
    drag = { id: e.pointerId, x: p.x, y: p.y, ox: e.clientX - p.x, oy: e.clientY - p.y };
    dragMoved = 0; dragSaid = false;
    try { star.setPointerCapture(e.pointerId); } catch (err) {}
    root.classList.add("is-held");
    noteActivity();
    speak(voice("state", "grabbed"));
  });

  /* A GRAZE IS NOT A HOVER. The star is 104px and sits in the margin the
     pointer crosses on the way to everything else, so firing on pointerenter
     would have him chirping at people who were reaching for the nav. He wants
     420ms of actually being pointed at, and then leaves it alone for half a
     minute. */
  star.addEventListener("pointerenter", function () {
    if (dismissed || drag) return;
    window.clearTimeout(hoverT);
    hoverT = window.setTimeout(function () {
      var now = Date.now();
      if (now - hoverAt < 30000) return;
      hoverAt = now;
      banter("hovered");
    }, 420);
  });
  star.addEventListener("pointerleave", function () { window.clearTimeout(hoverT); });

  star.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var nx = e.clientX - drag.ox, ny = e.clientY - drag.oy;
    dragMoved += Math.abs(nx - drag.x) + Math.abs(ny - drag.y);
    drag.x = nx; drag.y = ny;
    if (dragMoved > 4) e.preventDefault();
    /* Once he is genuinely being carried, not on the press - states.grabbed
       already covers the press. */
    if (dragMoved > 30 && !dragSaid) { dragSaid = true; banter("dragged"); }
  });

  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var moved = dragMoved > 4;
    var drop = { x: drag.x, y: drag.y };
    if (moved) { parked = { x: drop.x, y: drop.y, zone: zoneName }; }
    drag = null;
    root.classList.remove("is-held");
    if (!moved || dismissed) return;

    /* WHERE IT LANDED PICKS THE LINE. droppedBad is not a mood - it is the
       light being put somewhere it is not allowed to be, which is the demo
       panel. It says so and gives the spot back rather than sitting there. */
    var b = panelBox(), R = starR() + 12;
    var bad = !!b && drop.x + R > b.left && drop.x - R < b.right &&
                     drop.y + R > b.top  && drop.y - R < b.bottom;
    if (bad) parked = null;
    if (bad) banter("droppedSomewhereOdd");
    else speak(voice("state", "droppedOk"));
  }
  star.addEventListener("pointerup", endDrag);
  star.addEventListener("pointercancel", endDrag);

  var sayEl = speech.querySelector("[data-levi-say]");

  /* TYPED, NOT PASTED. A line that appears whole is a tooltip; a line that
     arrives at reading speed is someone talking. Two characters every 26ms is
     about 77 a second - quick enough never to be a wait, slow enough to read
     as speech. Reduced motion gets the whole line at once, and the caret goes.

     This is a text write on one node, so it costs nothing measurable. */
  var typeT = null;
  /* instant: a line the visitor has ALREADY READ comes back whole. Typing is
     how a new sentence arrives; re-typing an old one is Levi repeating
     himself, and it was one of the three things read as "he keeps replaying
     his animations" - every mouse move after an idle remark typed the
     section's sentence out again from the first letter. */
  function sayLine(text, instant) {
    if (typeT) { window.clearInterval(typeT); typeT = null; }
    if (REDUCED || instant) { stopTalk(); sayEl.textContent = text; speech.classList.add("is-done"); return; }
    startTalk();
    sayEl.textContent = "";
    speech.classList.remove("is-done");
    var i = 0;
    typeT = window.setInterval(function () {
      i += 2;
      sayEl.textContent = text.slice(0, i);
      if (i >= text.length) {
        window.clearInterval(typeT); typeT = null;
        speech.classList.add("is-done");
        stopTalk();
        /* the box is at its final size now - the right moment to re-check */
        window.setTimeout(chooseSaySide, 30);
      }
    }, 26);
  }
  /* ---- THE VOICE ----------------------------------------------------------
     Every line on the site now arrives through here. levi-voice.js owns which
     one; this owns what happens when it hands back null, which it does as soon
     as an array is spent. Null is not an error and not an empty box - the box
     keeps the sentence it already had and the light still moves. Saying
     nothing is the honest answer to being asked to repeat yourself. */
  var V = window.LEVI_VOICE || null;

  function voice(kind, key) {
    if (!V) return null;
    try {
      if (kind === "line")  return V.line(key);
      if (kind === "state") return V.state(key);
      if (kind === "demo")  return V.demo(key);
    } catch (e) {}
    return null;
  }

  function speak(text, how) {
    if (!text || dismissed) return false;
    how = how || {};
    savedLine = null; idleSpoken = false; idleTier = 0;
    /* THE TREATMENT FOLLOWS THE LINE, NOT THE OTHER WAY ROUND. A two-word
       remark in the full panel looks like a system message about nothing,
       which was the entire finding from the reference. site.css strips the
       box down for this class. */
    if (how.banter) say.classList.add("is-banter");
    else say.classList.remove("is-banter");
    say.classList.remove("is-quiet");
    root.classList.remove("is-quiet");
    setState(how.state || "speaking");
    sayLine(text, how.instant);
    if (how.glow) glow = how.glow;
    lastActivity = (window.performance && performance.now) ? performance.now() : Date.now();
    if (REDUCED) settleNow(); else run();
    return true;
  }

  /* ---- BANTER --------------------------------------------------------------

     Two banks, wired differently, and the difference is the whole point.

     A SECTION LINE is scroll-driven and informative: it tells you what this
     part of the page is. BANTER is event-driven and carries no information at
     all - it is what the reference bee does, and why the bee reads as alive
     while a narrator reads as a tooltip. Clicking the bee tells you nothing;
     it just answers.

     Banter OUTRANKS the section line, because if the visitor did something
     then reacting to that is more alive than carrying on narrating. It holds
     until the next scroll, and then the section's own sentence comes back -
     so banter is an interruption, never a replacement. */
  var banterHold = false, sectionLine = null, banterT = 0;
  /* HOW LONG A REMARK GETS BEFORE THE PAGE TAKES THE FLOOR BACK.

     "The next scroll" is not the scroll that CAUSED the remark. scrollingFast
     is triggered from inside the scroll handler, and that same handler calls
     readPosition(), whose settle timer then fires ~260ms later and restores
     the section line. Measured before this: "There is no rush" appeared and
     was gone 180ms later, which is below the threshold at which anyone reads
     anything. The remark was firing perfectly and nobody would ever have seen
     one. */
  var BANTER_DWELL = 1500;
  var hoverAt = 0, hoverT = null, dragSaid = false;
  var backUp = 0, backSaid = false, backT = null;
  var approvedEver = false, demoNagged = false, allDoneSaid = false;

  function banter(key, how) {
    if (dismissed) return false;
    var V = window.LEVI_VOICE;
    var line = V && V.banter ? V.banter(key) : null;
    if (!line) return false;
    var keep = sectionLine;                 /* speak() must not lose it */
    how = how || {};
    how.banter = true;
    var said = speak(line, how);
    if (said) { banterHold = true; sectionLine = keep; banterT = Date.now(); }
    return said;
  }


  var STATES = ["is-idle", "is-speaking", "is-approved"];
  function setState(n) {
    STATES.forEach(function (c) { root.classList.remove(c); });
    root.classList.add("is-" + n);
    /* Amplitude used to be a hard swap between 12 and 9 the frame the class
       changed. Tweened, the change of state is something you feel rather than
       something that snaps. */
    breathAmp(n !== "idle");
  }

  var zone = null, zoneName = null, done = false, dismissed = false, frozen = false;
  var p = { x: 0, y: 0 }, v = { x: 0, y: 0 }, goal = { x: 0, y: 0 };
  var mouse = { x: 0, y: 0, fresh: 0 };
  var lastT = 0, raf = null, flareTimer = null, settleT = null;
  var spin = 0, glow = 1, lastScrollY = 0, lastActivity = 0;
  var alt = 0, wanderA = 0, tripD0 = 0;   /* distance at the start of the current trip */
  var ticking = false;   /* true while the simulation is being driven by hand */   /* how high it is flying, and which way it is
                                 currently drifting off the direct line */

  /* WHAT THE 3D RENDERER READS. levi3d.js draws a real object at this point
     and nothing else; every decision - which zone, which line, where the
     keep-out is, how hard the spring pulls - stays here, already measured.
     If levi3d.js never loads this object is simply never read. */
  var frame = { x: 0, y: 0, vx: 0, vy: 0, glow: 1, spin: 0, alt: 0,
                gx: 0, gy: 0, frames: 0 };
  var idleSpoken = false, savedLine = null, lure = null, stacked = false;
  var idleTier = 0;          /* how far up the idle ladder this pause has got */
  var burst = 0, burstSaid = false, burstT = null;   /* one flick of the wheel */
  var greeting = false;      /* the hello is holding the box; do not read over it */

  /* ---- PICK HIM UP AND PUT HIM SOMEWHERE ------------------------------------
     drag   - where the pointer is, while it is down.
     parked - where you let go, which he holds until you scroll to a different
              section. Sticking forever would make him a sticker; releasing him
              the instant you let go would make the drag pointless. Holding
              within the section you dropped him in is the useful middle. */
  var drag = null, parked = null, dragMoved = 0;

  /* SCOPED, NOT ON :root.

     Measured: four custom-property writes landed on document.documentElement
     every frame - two here and two in retarget(). A custom property set on the
     root element invalidates style for every element in the document that
     could inherit it, and this document is about 9,000px of content. That is a
     full-document style invalidation sixty times a second in order to move one
     star, and it is the largest single reason the page feels heavy.

     Only .levi and .levi-say read --levi-x/--levi-y (site.css:2244), and only
     .levi__speech reads --levi-tx/--levi-ty (site.css:2439) - checked by grep
     across every css and js file in the project. So they go on those elements
     and the invalidation stops there. */
  /* ---- THE BREATH IS A LAYER, NOT A DISPLACEMENT -------------------------

     This is the single change that ends the class of bug that cost five
     rounds. The idle bob used to be added to the GOAL:

         var gx = g.x + dx + cx

     so the sine went into the steering target, through the integrator, into
     p, and out of write() as --levi-x/--levi-y. Every consumer of Levi's
     position therefore inherited a +/-18px oscillation on a 2.6s period, and
     anything that made a decision by comparing his position against a
     threshold flipped back and forth across it forever. That is what made the
     speech box flicker, and docking the box only hid it - the oscillation was
     still there, still being computed, still moving the number everything
     reads.

     Now the station and the breath are two different transforms on the same
     element. --levi-x/--levi-y is where he BELONGS and only changes when that
     genuinely changes; --levi-bx/--levi-by is the breathing, composited on top
     in CSS (site.css, the .levi transform), visible to the eye and invisible
     to every measurement. The light looks exactly the same and his reported
     position is now stable to the pixel between zone changes.

     GSAP owns it because two yoyoing sine tweens at different periods are
     three lines and give the same Lissajous drift the hand-rolled pair of
     Math.sin calls did - with the amplitude tweenable, so the idle/active
     change is an eased transition rather than a step. */
  var breath = { x: 0, y: 0, k: 1 };
  var breathTweens = [];

  function writeBreath() {
    root.style.setProperty("--levi-bx", (breath.x * breath.k).toFixed(2) + "px");
    root.style.setProperty("--levi-by", (breath.y * breath.k).toFixed(2) + "px");
    /* -1 at the top of the bob, +1 at the bottom: the shadow reads it as
       distance from the ground (site.css, .levi__cast). */
    root.style.setProperty("--levi-h", (breath.y * breath.k / 13).toFixed(3));
  }

  /* Periods carried over from the hand-rolled version (2.6s and 3.1s) so the
     motion reads identically; amplitudes are the old idle figures, and
     breath.k scales them for the active state. */
  function startBreath() {
    if (!window.gsap) return;                 /* vendor missing: simply no bob */
    breathTweens.forEach(function (t) { t.kill(); });
    breathTweens = [
      gsap.to(breath, { x: 18, duration: 2.6, ease: "sine.inOut",
                        repeat: -1, yoyo: true, onUpdate: writeBreath }),
      gsap.to(breath, { y: 13, duration: 3.1, ease: "sine.inOut",
                        repeat: -1, yoyo: true, delay: 0.55,
                        onUpdate: writeBreath })
    ];
    gsap.set(breath, { x: -18, y: -13 });     /* start mid-swing, not at rest */
  }

  function breathAmp(active) {
    if (!window.gsap) return;
    gsap.to(breath, { k: active ? 0.75 : 1, duration: 0.9, ease: "power2.out",
                      overwrite: "auto" });
  }

  /* ---- THE BOX ARRIVES, IT DOES NOT JUST APPEAR ---------------------------

     The reveal was `transition: opacity 300ms` and nothing else, so the line
     faded in exactly where it would end up, at a constant rate, with no sense
     of anything having been said. That reads as a tooltip. A companion who is
     about to tell you something should look like he has just decided to.

     So: a short rise into place on the way in, quicker and shorter on the way
     out, because arriving deserves more time than leaving. power3.out on the
     way in settles hard at the end, which is what makes it read as landing
     rather than drifting.

     THE CSS RULES ARE LEFT WHERE THEY ARE ON PURPOSE. GSAP writes inline
     styles, which outrank the class rules, so GSAP wins whenever it is
     running. If the vendor file ever fails to load, the old opacity
     transition is still there and the box still shows and hides correctly -
     it just does it plainly. Given that the complaint this whole thread began
     with was an invisible box, the fallback fails OPEN. */
  /* ---- ONE FACE, AND IT BLINKS -------------------------------------------

     This was seven emotions that tweened between each other as he moved down
     the page. Built, measured, and cut on Jordan's call: a face that keeps
     changing expression while you are trying to read reads as glitching, not
     as character. He was competing with the work.

     The smile now lives entirely in the CSS defaults for --e-* and --m-* (see
     site.css) - nothing sets them at run time, so there is no state to get
     stuck in and no transition to catch mid-way. Blinking is the only thing
     that touches his face, it only touches eye height, and it always returns
     to the same 10px it started from. */
  var body = root.querySelector(".levi__body");
  var blinkT = null;

  /* A BLINK YOU CAN SEE. The first version closed in 70ms and opened in
     110: technically a blink, practically invisible - a real one closes over
     about a tenth of a second and HOLDS shut for a beat, and that hold is
     most of what the eye registers. One in five is a double, because nobody
     blinks with metronome regularity. Irregular interval for the same reason:
     on a fixed one it reads as a cursor. */
  function blinkOnce(twice) {
    if (!window.gsap || !body || document.hidden) return;
    var tl = gsap.timeline()
      .to(body, { "--e-h": "1.5px", duration: 0.09, ease: "power2.in" })
      .to(body, { "--e-h": "10px",  duration: 0.14, ease: "power2.out", delay: 0.05 });
    if (twice) tl.to(body, { "--e-h": "1.5px", duration: 0.08, ease: "power2.in", delay: 0.06 })
                 .to(body, { "--e-h": "10px",  duration: 0.13, ease: "power2.out", delay: 0.04 });
  }
  function blink() {
    window.clearTimeout(blinkT);
    blinkT = window.setTimeout(function () {
      blinkOnce(Math.random() < 0.2);
      blink();
    }, 2400 + Math.random() * 3600);
  }

  /* ---- HE TALKS ------------------------------------------------------------
     While a line is typing, the mouth moves: an irregular four-step open/close
     pattern that loops at roughly 4-5 syllables a second, which is about the
     pace of speech - fast enough to read as talking, slow enough not to look
     like chattering. It stops the moment the line is finished and eases back
     into the smile. Lines that come back WHOLE (already read) do not lip-sync:
     he is not saying them again. The mouth and the blink animate different
     properties, so he can blink mid-sentence. */
  var talkTl = null;
  function startTalk() {
    if (!window.gsap || !body || REDUCED) return;
    if (talkTl) talkTl.kill();
    talkTl = gsap.timeline({ repeat: -1 })
      .to(body, { "--m-w": "17px", "--m-h": "15px", "--m-rt": "7px", "--m-rb": "9px",  duration: 0.11, ease: "power1.out" })
      .to(body, { "--m-w": "21px", "--m-h": "8px",  "--m-rt": "2px", "--m-rb": "17px", duration: 0.10, ease: "power1.in" })
      .to(body, { "--m-w": "18px", "--m-h": "13px", "--m-rt": "6px", "--m-rb": "10px", duration: 0.09, ease: "power1.out" })
      .to(body, { "--m-w": "21px", "--m-h": "6px",  "--m-rt": "1px", "--m-rb": "18px", duration: 0.12, ease: "power1.in" });
  }
  function stopTalk() {
    if (talkTl) { talkTl.kill(); talkTl = null; }
    if (window.gsap && body) {
      gsap.to(body, { "--m-w": "22px", "--m-h": "11px", "--m-rt": "0px", "--m-rb": "22px",
                      duration: 0.2, ease: "power2.out", overwrite: "auto" });
    }
  }


  /* ---- THE FLIGHT PATH ----------------------------------------------------

     Rebuilt from nothing. The integrator this replaces was a real piece of
     work and it is worth saying why it still had to go: it carried a
     velocity, a force cap, a cruise ceiling, a slow radius, an arc measured
     from the distance the trip STARTED at, four clamps and three guards
     against non-finite numbers - and every one of those existed because the
     position was ACCUMULATED. Accumulated state drifts, and drift is what you
     then need guards against. The runaway once measured at (-25539, -126876)
     was the accumulation, not the arithmetic.

     This PRODUCES the position instead. Two modes, and nothing else:

     FOLLOW - the station drifts under him as the page scrolls. gsap.quickTo
     exists for exactly this: a target that changes every frame, re-aiming one
     live tween instead of spawning a new one. Tracking the whole page costs
     two tweens for the lifetime of the document.

     FLIGHT - the section changes and the station jumps. A quadratic bezier
     from where he is to where he is going, control point pushed perpendicular
     to the route so he bows rather than sliding down the diagonal. Duration
     is distance over CRUISE, clamped: that is the constant-speed property the
     old steering had, and the reason it beat a spring. A spring crosses a
     900px gap and a 40px one at wildly different speeds and neither reads as
     flying.

     There is no velocity to clamp, so there is nothing to run away. Every
     frame p is a point on a curve between two finite endpoints - it cannot be
     anything else, which is a stronger guarantee than the three guards it
     replaces. */
  var CRUISE = 560;        /* px/s average; sine.inOut peaks ~1.57x this      */
  var flight = null, flyNext = false;
  /* px/s. Above the flight's own average (CRUISE) so the follow is never the
     slower of the two, and well under the ~4,600px/s the eased follow hit. */
  var FOLLOW_MAX = 900;
  var fromP = { x: 0, y: 0 }, ctrlP = { x: 0, y: 0 }, toP = { x: 0, y: 0 };
  var prog = { t: 0 };
  var lastP = { x: 0, y: 0 };
  var kick = { x: 0, y: 0 };

  function qbez(a, c, b, t) { var u = 1 - t; return u * u * a + 2 * u * t * c + t * t * b; }

  function writeKick() {
    root.style.setProperty("--levi-kx", kick.x.toFixed(2) + "px");
    root.style.setProperty("--levi-ky", kick.y.toFixed(2) + "px");
  }

  /* THE SCROLL KICK IS A LAYER, NOT A FORCE. It used to be added straight to
     the velocity, which is how a 400ms flourish got to move the number every
     placement decision reads. Same lesson as the breath: decoration composites
     on top, it does not enter the station. */
  /* THE KICK WAS AN ELASTIC SPRING RESTARTED ON EVERY WHEEL TICK.

     gsap.killTweensOf(kick) and then a fresh 0.9s elastic.out, once per scroll
     event. Measured: 72 restarts across one ordinary 2.4s scroll - so the
     spring never completed a single cycle while you scrolled, and when you
     stopped it played its whole boing. The same wobble, over and over, is
     exactly what "he keeps repeating his animations" describes.

     quickTo retargets one live tween instead of replacing it, which is what a
     value that changes every event needs. The push follows the scroll, and a
     short pause hands it back to zero on the same ease - no ringing, no
     restart, one continuous motion however many events arrive. */
  /* ---- HE LOOKS AT YOU ------------------------------------------------------
     Within LOOK_REACH of a real pointer, the face turns toward it. Otherwise
     it glances the way he is flying, and settles forward when he is still.
     One quickTo pair, re-aimed - the same rule as the kick, for the same
     reason: a value that changes every frame must not start a tween every
     frame. Hover-capable pointers only; a finger that has lifted is not a
     cursor, and a face staring at where it last was reads as broken. */
  var LOOK_REACH = 380, LOOK_X = 6.5, LOOK_Y = 4.5;
  var look = { x: 0, y: 0 }, lqx = null, lqy = null, lookTx = 0, lookTy = 0;
  var HOVER = !!(window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches);

  function writeLook() {
    if (!body) return;
    body.style.setProperty("--look-x", look.x.toFixed(2) + "px");
    body.style.setProperty("--look-y", look.y.toFixed(2) + "px");
  }
  function lookAt(x, y) {
    if (!window.gsap || !body) return;
    if (Math.abs(x - lookTx) < 0.25 && Math.abs(y - lookTy) < 0.25) return;
    lookTx = x; lookTy = y;
    if (!lqx) {
      lqx = gsap.quickTo(look, "x", { duration: 0.32, ease: "power3", onUpdate: writeLook });
      lqy = gsap.quickTo(look, "y", { duration: 0.32, ease: "power3", onUpdate: writeLook });
    }
    lqx(x); lqy(y);
  }

  var kqx = null, kqy = null, kickT = null;
  function kickBy(dx, dy) {
    if (!window.gsap) return;
    if (!kqx) {
      kqx = gsap.quickTo(kick, "x", { duration: 0.45, ease: "power3", onUpdate: writeKick });
      kqy = gsap.quickTo(kick, "y", { duration: 0.45, ease: "power3", onUpdate: writeKick });
    }
    kqx(Math.max(-22, Math.min(22, dx)));
    kqy(Math.max(-54, Math.min(54, dy)));
    window.clearTimeout(kickT);
    kickT = window.setTimeout(function () { kqx(0); kqy(0); }, 120);
  }

  function flyTo(tx, ty) {
    if (!window.gsap) { p.x = tx; p.y = ty; return; }
    var dx = tx - p.x, dy = ty - p.y;
    var d = Math.hypot(dx, dy) || 1;
    fromP.x = p.x; fromP.y = p.y; toP.x = tx; toP.y = ty;

    /* The bow is perpendicular to the route and always the same size for the
       same trip, so the same journey draws the same curve every time. Capped,
       or a full-page flight swings out of the viewport on the way. */
    var bow = Math.min(d * 0.3, 200) * (dy >= 0 ? 1 : -1);
    ctrlP.x = (fromP.x + tx) / 2 + (-dy / d) * bow;
    ctrlP.y = (fromP.y + ty) / 2 + ( dx / d) * bow;

    /* NO 1.5s CEILING ON LONG TRIPS. With one, a flight across most of the
       page had to cover ~1,400px in 1.5s, and power2.inOut peaks at twice
       its average - measured 32px in a single frame mid-arc, which reads as
       a jump, not a flight. Now a long trip simply takes longer, on sine,
       whose peak is ~1.57x its average: about 14px a frame at most. */
    var dur = Math.max(0.45, Math.min(2.8, d / CRUISE));
    if (flight) flight.kill();
    prog.t = 0;

    /* He leans into the turn and comes level as he arrives. */
    if (body) {
      var tilt = Math.max(-14, Math.min(14, dx * 0.05));
      gsap.timeline()
        .to(body, { "--b-tilt": tilt + "deg", duration: dur * 0.4, ease: "power2.out" })
        .to(body, { "--b-tilt": "0deg", duration: dur * 0.6, ease: "power2.inOut" });
    }

    flight = gsap.to(prog, {
      t: 1, duration: dur, ease: "sine.inOut",
      onUpdate: function () {
        p.x = qbez(fromP.x, ctrlP.x, toP.x, prog.t);
        p.y = qbez(fromP.y, ctrlP.y, toP.y, prog.t);
      },
      onComplete: function () { flight = null; chooseSaySide(); }
    });
  }

  var boxTween = null, boxShown = null;

  function boxHidden() {
    return say.classList.contains("is-quiet") ||
           say.classList.contains("is-blocked") ||
           say.classList.contains("is-gone");
  }

  function revealBox(on) {
    if (!window.gsap || boxShown === on) return;
    boxShown = on;
    if (boxTween) boxTween.kill();
    var reduced = window.matchMedia &&
                  matchMedia("(prefers-reduced-motion: reduce)").matches;
    boxTween = gsap.to(speech, {
      autoAlpha: on ? 1 : 0,
      y: on ? 0 : 7,
      duration: reduced ? 0 : (on ? 0.42 : 0.24),
      ease: on ? "power3.out" : "power2.in",
      overwrite: "auto"
    });
  }

  /* ONE HOOK, NOT EIGHT. is-quiet and is-blocked are toggled from a number of
     places - arrive(), goQuiet(), watchQueue(), the demo, the dismiss path -
     and threading a call through every one of them is how a state machine
     acquires a site that forgets. Watching the attribute catches all of them,
     including any added later. */
  function watchBox() {
    if (!window.gsap || !window.MutationObserver) return;
    /* The CSS transition would fight GSAP for the same property every frame. */
    speech.style.transition = "none";
    var h = boxHidden();
    boxShown = !h;
    gsap.set(speech, { autoAlpha: h ? 0 : 1, y: h ? 7 : 0 });
    new MutationObserver(function () { revealBox(!boxHidden()); })
      .observe(say, { attributes: true, attributeFilter: ["class"] });
  }

  function write(x, y) {
    /* Belt and braces. If anything upstream ever slips a non-finite value past
       the barrier in step(), it stops here rather than becoming `NaNpx` in a
       transform and dropping the element into the corner. */
    if (!isFinite(x) || !isFinite(y)) return;
    frame.x = x; frame.y = y;
    var xs = x.toFixed(1) + "px", ys = y.toFixed(1) + "px";
    root.style.setProperty("--levi-x", xs);
    root.style.setProperty("--levi-y", ys);
    placeSay(x, y);
  }

  /* ---- THE BOX BESIDE HIM ------------------------------------------------
     Placed from the STATION (x, y) - never the breath or the kick - so it is
     exactly as stable as he is between moves, which the held-station test
     measures at 0.00px. Right of him by default, left of him when that would
     leave the viewport; the side changes with 32px of hysteresis so a station
     sitting near the boundary cannot flip it every frame. Size comes from a
     ResizeObserver, never from a per-frame layout read. */
  var sayW = 0, sayH = 0, headBottom = -1;
  if (window.ResizeObserver) {
    new ResizeObserver(function () {
      sayW = speech.offsetWidth; sayH = speech.offsetHeight;
    }).observe(speech);
  }
  /* WHERE THE HEADER ACTUALLY ENDS - its BOTTOM EDGE, not its height.
     The first version used the masthead's height (63px), which is only right
     once the page has scrolled. At the top of the homepage there is a ticker
     ABOVE the masthead, so the header ends far lower - and measured at 390px
     the box sat over the logo and half the Menu button, while Levi's station
     was up there too, hidden behind the masthead (which paints above him).
     The edge moves as the ticker scrolls away, so it is re-read on scroll and
     resize - one rect per scroll event, never one per frame. */
  function readHead() {
    var m = document.querySelector(".masthead");
    headBottom = m ? Math.max(0, Math.round(m.getBoundingClientRect().bottom)) : 0;
  }
  function headEdge() { if (headBottom < 0) readHead(); return headBottom; }
  window.addEventListener("resize", function () { readHead(); chooseSaySide(); }, { passive: true });
  window.addEventListener("scroll", readHead, { passive: true });

  /* WHERE IT GOES. Beside him when a side fits - right by default, left near
     the right edge, with 24px of hysteresis between the two so a station near
     the boundary cannot flip it every frame. When NEITHER side fits it
     stacks: below him, or above if there is no room below. That is the phone
     case, and it is not an edge case: at 390px a 256px box fits on neither
     side of a 54px Levi, and the first version measured the box sitting ON
     him at 4 of 5 scroll positions - it had flipped left, found no room, and
     been clamped back across his face. Jordan's own mobile brief said it
     first: above or below on a phone, never beside. */
  var sayMode = "right";
  function setMode(m) {
    if (m === sayMode) return;
    speech.classList.remove("is-flip", "is-below", "is-above");
    if (m === "left")  speech.classList.add("is-flip");
    if (m === "below") speech.classList.add("is-below");
    if (m === "above") speech.classList.add("is-above");
    sayMode = m;
  }

  /* ---- WHICH SIDE: DECIDED AT REST, AGAINST REAL TEXT -------------------
     Beside him is the default, but "beside" was measured sitting on 8 lines
     of the hero paragraph at 1300x760 - he parks at the left edge and a
     328px box to his right lands squarely across the copy. So when he comes
     to rest, each of the four placements is tested against the page's actual
     LINE BOXES (a Range per text element, so a wide <p> with a short last
     line only counts where there are words) and the first one that covers
     none wins - right, then left, then below, then above; if none is clean,
     the one that covers least.

     Decided at rest and ONLY at rest - after settling, after a flight lands,
     when a line finishes typing (its final size), on resize. Every frame just
     applies the stored choice. That is what keeps this from being the
     per-frame hunting that made the old box flicker: the text scrolls with
     the section he is standing in, so a side that was clear stays clear. */
  var sayPref = "right";

  function geomFor(m, x, y, vw, vh) {
    var R = bodyR(), GAP = 16, M = 10, top0 = headEdge() + 8, l, t;
    if (m === "right" || m === "left") {
      l = m === "right" ? x + R + GAP : x - R - GAP - sayW;
      if (m === "right" ? l + sayW > vw - M : l < M) return null;
      t = Math.max(top0, Math.min(vh - sayH - M, y - 30));
    } else {
      t = m === "below" ? y + R + GAP : y - R - GAP - sayH;
      if (m === "below" ? t + sayH > vh - M : t < top0) return null;
      l = Math.max(M, Math.min(vw - sayW - M, x - sayW / 2));
    }
    return { l: l, t: t };
  }

  function textLines() {
    var out = [], vh = document.documentElement.clientHeight;
    var els = document.querySelectorAll("main p, main h1, main h2, main h3, main h4, main li, main dt, main dd, main blockquote, main figcaption");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.closest(".levi, .levi-say")) continue;
      var r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh || r.width < 2 || !(el.textContent || "").trim()) continue;
      /* NO OPACITY TEST. That was the bug in Jordan's screenshot: the hero
         paragraph is data-rise, and it sits at opacity 0 for over a second
         while the page settles - so this skipped it, called the space empty,
         put the box there, and the paragraph faded in underneath. Text that is
         about to appear is text. Only something with no layout box is not. */
      var rg = document.createRange(); rg.selectNodeContents(el);
      var q = rg.getClientRects();
      for (var k = 0; k < q.length; k++) if (q[k].width > 2 && q[k].height > 4) out.push(q[k]);
    }
    return out;
  }

  function coverage(g, rects) {
    var n = 0, r2 = g.l + sayW, b2 = g.t + sayH;
    for (var i = 0; i < rects.length; i++) {
      var q = rects[i];
      if (!(r2 <= q.left || g.l >= q.right || b2 <= q.top || g.t >= q.bottom)) n++;
    }
    return n;
  }

  /* HIS OWN SPOT, TOO. At 1300px he never rested on text; at 950px he did,
     at two of eight positions, because the column is nearly the whole width
     there. So before choosing the box's side, check where HE will rest: if
     his body would sit on a line, slide him vertically to the nearest clear
     spot within 240px, inside the screen and under the header. Stored as an
     offset from where his section put him (nudgeY), so it scrolls with the
     section instead of being a fixed screen position; cleared when he
     arrives somewhere new. Vertical only - he keeps his lane. */
  var nudgeX = 0, nudgeY = 0;
  /* The clearance includes his BREATH. The station is still, but the body
     drifts +/-18px sideways and +/-13px up and down around it, so a spot
     cleared by 4px measured clear and then dipped into the next line at the
     bottom of a breath - seen at 950px, where the hero's lines are close. */
  function bodyClear(x, y, rects, tight) {
    var RX = bodyR() + (tight ? 3 : 20), RY = bodyR() + (tight ? 3 : 15);
    var l = x - RX, t = y - RY, r2 = x + RX, b2 = y + RY;
    for (var i = 0; i < rects.length; i++) {
      var q = rects[i];
      if (!(r2 <= q.left || l >= q.right || b2 <= q.top || t >= q.bottom)) return false;
    }
    return true;
  }
  /* The least text any side of the box would cover at (x, y). */
  function boxCovAt(x, y, rects, vw, vh) {
    var sides = ["right", "left", "below", "above"], least = 1e9;
    for (var i = 0; i < sides.length; i++) {
      var g = geomFor(sides[i], x, y, vw, vh);
      if (g) least = Math.min(least, coverage(g, rects));
      if (least === 0) break;
    }
    return least;
  }
  /* A side for the box at (x, y) that covers no text at all? */
  function boxClearAt(x, y, rects, vw, vh) {
    var sides = ["right", "left", "below", "above"];
    for (var i = 0; i < sides.length; i++) {
      var g = geomFor(sides[i], x, y, vw, vh);
      if (g && coverage(g, rects) === 0) return true;
    }
    return false;
  }

  /* TWO-DIMENSIONAL, BECAUSE ONE WAS NOT ENOUGH. A vertical-only nudge
     failed at 950px: the hero's left side is heading, paragraph and button
     stacked solid, so there was no clear spot above or below him within
     reach - while the right half of the hero (the black-hole art) sat empty.
     So: the NEAREST spot where his body AND some side for his box are both
     text-free, searched in rings of increasing cost and stopped at the first
     hit. Horizontal distance costs more than vertical, so he prefers to stay
     near his lane and only crosses the page when he has to. Runs at rest
     only; the result is stored as an offset from his section's spot. */
  function settleSpot(rects) {
    if (drag || parked || lure || !sayW) return;
    var de = document.documentElement, vw = de.clientWidth, vh = de.clientHeight;
    if (bodyClear(goal.x, goal.y, rects) && boxClearAt(goal.x, goal.y, rects, vw, vh)) return;
    var R = bodyR(), lo = headEdge() + R + 12, hi = vh - R - 10, lft = R + 8, rgt = vw - R - 8;
    var cand = [], STEP = 28;
    for (var dy = -420; dy <= 420; dy += STEP) {
      for (var dx = -vw; dx <= vw; dx += STEP) {
        var x = goal.x + dx, y = goal.y + dy;
        if (x < lft || x > rgt || y < lo || y > hi) continue;
        cand.push({ x: x, y: y, c: dx * dx * 1.6 + dy * dy });
      }
    }
    cand.sort(function (p1, p2) { return p1.c - p2.c; });
    /* First choice: the nearest spot where body AND box are both clear.
       Where the page is too dense for that anywhere on screen (measured once
       at 950px, just past the hero), the spot where the box covers the
       FEWEST lines - not merely the nearest clear body. Bounded to the 400
       nearest clear spots so a dense page cannot make the search expensive. */
    /* IN TIERS, because a phone can be all text. At 390px, scrolled onto the
       demo, the panel fills the screen with rows and there is no hole big
       enough for his body PLUS its breathing - so the strict pass found
       nothing and left him on five lines. Tier two drops the breathing
       margin (clear at rest, may brush a line at the bottom of a breath).
       Only if even that fails does he take the spot touching fewest lines. */
    var best = null, bestCov = 1e9;
    for (var tier = 0; tier < 2 && !best; tier++) {
      var seen = 0;
      for (var i = 0; i < cand.length && seen < 400; i++) {
        var c = cand[i];
        if (!bodyClear(c.x, c.y, rects, tier === 1)) continue;
        seen++;
        var cov = boxCovAt(c.x, c.y, rects, vw, vh);
        if (cov === 0) { best = c; bestCov = 0; break; }
        if (cov < bestCov) { best = c; bestCov = cov; }
      }
    }
    if (!best) {
      var leastHit = 1e9;
      for (var j = 0; j < cand.length && j < 600; j++) {
        var d = cand[j], R3 = bodyR() + 3, hitN = 0;
        for (var q = 0; q < rects.length; q++) {
          var rr = rects[q];
          if (!(d.x + R3 <= rr.left || d.x - R3 >= rr.right || d.y + R3 <= rr.top || d.y - R3 >= rr.bottom)) hitN++;
        }
        if (hitN < leastHit) { leastHit = hitN; best = d; }
      }
    }
    if (best) {
      nudgeX += best.x - goal.x;
      nudgeY += best.y - goal.y;
      retarget();
    }
  }

  /* AGAIN, ONCE THE PAGE HAS STOPPED MOVING UNDER HIM. The reveals do not
     only fade text in, they MOVE it: data-rise starts ~40px low and slides
     up. So at the moment he settles, the lines are not where they will be -
     the check finds a clear spot, and the text then rises into it. Measured
     at 950px: clear at settle, 6 lines covered a second later. Re-checking at
     0.7s and 1.6s, after the reveals land, catches it. Still decisions at
     discrete moments, never per frame - at worst he shifts aside once. */
  var recheckT = [];
  function chooseSaySideSoon() {
    chooseSaySide();
    recheckT.forEach(window.clearTimeout);
    recheckT = [window.setTimeout(chooseSaySide, 700), window.setTimeout(chooseSaySide, 1600)];
  }

  /* CONTROLS ARE FORBIDDEN GROUND, not just text. The rest search's offset
     is applied AFTER keepOffPanel(), so a search that only looked at words
     could slide him straight onto a button - measured, one tap in 33 landed
     on the star instead of the control. Every link, button and control panel
     on screen joins the no-go set, for his body and for the box. */
  function controlRects() {
    var out = hotBoxes().slice(), vh = document.documentElement.clientHeight;
    var els = document.querySelectorAll("main a[href], main button, main [role=button], main input, main select, main textarea");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.closest(".levi, .levi-say")) continue;
      var r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > vh) continue;
      out.push(r);
    }
    return out;
  }

  function chooseSaySide() {
    if (!sayW) { sayW = speech.offsetWidth; sayH = speech.offsetHeight; }
    if (!sayW) return;
    var de = document.documentElement, vw = de.clientWidth, vh = de.clientHeight;
    var rects = textLines().concat(controlRects()), best = null, bestN = 1e9;
    settleSpot(rects);
    ["right", "left", "below", "above"].forEach(function (m) {
      var g = geomFor(m, goal.x, goal.y, vw, vh);
      if (!g) return;
      var n = coverage(g, rects);
      if (n < bestN) { best = m; bestN = n; }
    });
    if (best) sayPref = best;
  }

  function placeSay(x, y) {
    if (!sayW) { sayW = speech.offsetWidth; sayH = speech.offsetHeight; }
    var de = document.documentElement, vw = de.clientWidth, vh = de.clientHeight;
    /* The preferred side if it fits where he is right now; otherwise the
       first that does. Only mid-flight near an edge does the fallback run. */
    var m = sayPref, g = geomFor(m, x, y, vw, vh);
    if (!g) {
      var order = ["right", "left", "below", "above"];
      for (var i = 0; i < order.length && !g; i++) { m = order[i]; g = geomFor(m, x, y, vw, vh); }
      if (!g) { m = "above"; g = { l: 10, t: headEdge() + 8 }; }
    }
    setMode(m);
    var l = g.l, t = g.t, R = bodyR();
    if (m === "right" || m === "left") {
      speech.style.setProperty("--tail-y", Math.max(14, Math.min(sayH - 14, y - t)).toFixed(1) + "px");
    } else {
      speech.style.setProperty("--tail-x", Math.max(16, Math.min(sayW - 16, x - l)).toFixed(1) + "px");
    }
    speech.style.setProperty("--say-l", l.toFixed(1) + "px");
    speech.style.setProperty("--say-t", t.toFixed(1) + "px");
    if (hintOn) {
      if (!hintW) hintW = hint.offsetWidth;
      var stacked = m === "below" || m === "above";
      hint.classList.toggle("is-shown", !stacked);
      hint.style.setProperty("--hint-l", (x - hintW / 2).toFixed(1) + "px");
      hint.style.setProperty("--hint-t", (y + R + 30).toFixed(1) + "px");
    }
  }

  var hintOn = false, hintW = 0, hintT = null, HINT_KEY = "cognivex.levi.hinted";
  function hintSeen() {
    try { return !!window.sessionStorage.getItem(HINT_KEY); } catch (e) { return true; }
  }
  function dropHint() {
    if (!hintOn) return;
    hintOn = false;
    hint.classList.remove("is-shown");
    window.clearTimeout(hintT);
    try { window.sessionStorage.setItem(HINT_KEY, "1"); } catch (e) {}
  }
  function offerHint() {
    if (hintSeen() || dismissed) return;
    hintOn = true;
    hintT = window.setTimeout(dropHint, 14000);
  }

  /* ---- which section is the visitor actually looking at ---------------------
     AN OBSERVER, NOT A POLL WITH A FLOOR. The previous version needed a section
     to cover 28% of the viewport before it counted, so short sections never won
     and were silently skipped - measured, at y=1000 the line was still the
     hero's and "walk" never came up at all. That is what read as "it does not
     work when I scroll".

     Now every zone's section is observed and whichever has the highest
     intersection ratio wins, with no floor: a section that is on screen at all
     is reachable. */
  var ratio = {};

  /* GEOMETRY DECIDES, THE OBSERVER ONLY NUDGES. Depending on the observer to
     supply the answer was the bug: its ratios were populated - hero at 0.43 -
     while Levi sat at (14, 5) with opacity 0 and no zone, because nothing had
     consumed them yet. IntersectionObserver delivery is tied to rendering and
     can arrive whenever; getBoundingClientRect is correct the instant it is
     asked. So the ratio is measured here, every time, and the observer is kept
     purely as a cheap signal that something moved.

     No coverage floor: whichever section is most on screen wins, even if that
     is only a sliver, so no section can be silently skipped. */
  /* HOW MUCH OF THIS SECTION IS SHOWING, not how much of the screen it fills.

     Against the viewport, a short section can never win against a taller one
     beside it however completely it is on display. That was invisible while
     every zone lived on the homepage, whose sections are 600-1600px scenes -
     and it made the other six pages' heroes unreachable the moment they got
     zones: .phero is 364px and the section under it is 431px, so at the very
     top of trust.html, with the hero entirely on screen and its h1 the only
     thing anyone is looking at, the section BELOW it covered 377px of viewport
     against the hero's 364 and took the line. Measured on all five prose
     pages; the hero lost at every scroll position, including zero.

     Divided by the section's own height instead, capped at the viewport so a
     section taller than the screen is not punished for it: a 1,600px section
     filling the screen scores 1.0, exactly like a 364px one entirely in view,
     and between them it is the one showing more of itself that wins. */
  function coverOf(el) {
    var vh = document.documentElement.clientHeight;
    var r = sectionOf(el).getBoundingClientRect();
    var visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    if (visible <= 0) return 0;
    return visible / Math.max(1, Math.min(r.height, vh));
  }

  /* TWO ZONES CAN SHARE A SECTION, so the section cover cannot be the whole
     answer. The hero holds both `hero` and `queue` - the headline at the top
     and the demo panel below it - and they report an identical cover, because
     cover is a fact about the section they are both inside. Strictly-greater
     then hands it to whichever was declared first, every time, and `queue`
     could never win: the demo would have had a line it was never able to say.

     So the comparison is the pair, in order: the section first, and where that
     ties, the band that has more of ITSELF on screen. Between two bands of one
     section that is the only question there is. */
  function dominantZone() {
    var best = null, bestR = -1, bestB = -1;
    var vh = document.documentElement.clientHeight;
    for (var i = 0; i < script.length; i++) {
      var name = script[i].zone;
      var el = zoneEl(name);
      var slice = visibleSlice(el);
      if (!slice) continue;              /* the BAND must be on screen, not just
                                            the section that contains it */
      var rr = Math.max(coverOf(el), ratio[name] || 0);
      var full = el.getBoundingClientRect().height;
      var band = slice.height / Math.max(1, Math.min(full, vh));
      var better = (rr > bestR + 1e-6) ||
                   (Math.abs(rr - bestR) <= 1e-6 && band > bestB);
      if (better) { bestR = rr; bestB = band; best = { el: el, name: name }; }
    }
    return best;
  }

  var io = null;
  if (window.IntersectionObserver) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var z = e.target.querySelector("[data-levi-zone]");
        var name = z && z.getAttribute("data-levi-zone");
        if (name) ratio[name] = e.intersectionRatio;
      });
      readPosition();
    }, { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });
  }

  function observeZones() {
    if (!io) return;
    io.disconnect();
    for (var i = 0; i < script.length; i++) {
      var el = zoneEl(script[i].zone);
      if (el) io.observe(sectionOf(el));
    }
  }

  /* ---- placement, which is arithmetic -------------------------------------- */
  /* IN THE LANE, THE BOX GOES UNDER THE LIGHT - NOT BESIDE IT.

     Beside is right inside a zone, which is wide. The holding lane is the page
     gutter, and a 328px box placed to the right of a star sitting at x 179 ends
     at 507 - which at 1905 is 39px inside the interactive demo panel, and
     measured as four collisions with .app, .rail and the feed items.

     Stacked under the star and left-aligned to the page margin, the box runs 40
     to 368. The demo panel starts at 468 here and 484 at 1440, so it clears at
     both. Offsets are computed from the LANE, which is a function of the
     viewport, never from p - deriving an offset from the light's own position
     is what sent it to -22322,-109726 once already. */
  /* ==========================================================================
     THE KEEP-OUT WAS ONLY EVER ENFORCED ON THE LIGHT.

     keepOffPanel() moves the STAR off the demo. The words were never asked.
     In the holding lane the box is stacked under the light at the page margin
     and the lane runs straight down the left edge of the demo panel, so the
     box sat on the rail: measured at 1536x830, 10 overlaps of body text, and
     all ten with zoneName null and .app on screen. None inside a zone.

     It stayed hidden because the lane also goes quiet - until watchQueue()
     started reacting to approvals regardless of zone, which is right (the
     visitor is clicking the queue; Levi should answer) and which is what makes
     the box visible in the one place it has nowhere to be.

     So the box is resolved here, once, for both branches:
       1. where the offsets ask for it,
       2. pushed clear BELOW the panel if that lands on it,
       3. clamped inside the viewport,
       4. and if the clamp puts it back on the panel, it is not drawn at all.

     Two rectangles and four comparisons. No scanning, no candidate scoring.

     RESOLVED AGAINST p, WRITTEN AS AN OFFSET FROM p, which is the shape that
     does not run away: the resolved top depends on the panel and the viewport
     only, so top = p.y + (top - p.y) is a fixed point rather than the feedback
     loop that once put the star at -22322,-109726. p is checked for finiteness
     first - the isFinite barrier in step() is the reason it can be trusted at
     all, and a NaN here would write NaNpx and drop the transform.
     ======================================================================== */

  /* ==========================================================================
     "THE WORDS MAY NEVER OVERLAP COPY" WAS A COMMENT, NOT A CHECK.

     Both placements were built to land somewhere empty and then trusted to
     have done it. Inside a zone that holds up - the foot anchor is measured
     and every zone came back clean. In the lane there is no section, so there
     is no foot: the box hangs under the light at whatever height the light
     happens to be holding, and the next section's eyebrow scrolling up into
     that band is enough. Measured, box on `.cap` "See it work" at scrollY
     1250, with the panel already cleared.

     So ask. Not by walking the document sixty times a second - by asking the
     browser the question it answers for every pointer move. Seven hit tests
     name the handful of elements actually under the box, and only those get
     measured properly, at glyph level, with a Range. Bounded either way.
     ======================================================================== */
  /* DOCKED, SO THERE IS NOTHING LEFT TO DECIDE.

     Everything that used to live here - the panel escapes, the gutters, the
     occupancy test, the anchor, the hysteresis - existed to find a hole in a
     page that does not have one. The box has a fixed home in the stylesheet
     now, so placement is a stylesheet concern and this is the whole of the
     runtime's job: make sure nothing is still hiding it.

     The signature is unchanged because retarget() and laneOffsets() still
     call it, and they still position the LIGHT, which does still fly. */
  function placeBox() {
    say.classList.remove("is-blocked");
  }

  function laneOffsets() {
    var de = document.documentElement;
    var R = starR(), lane = Math.max(PAD + R, Math.round(de.clientWidth * 0.094));
    placeBox(PAD - lane, Math.round(R * 0.86 + gapW()));
  }

  /* ---- HE FLIES IN THE MARGIN, NOT THROUGH THE COPY -----------------------

     A soft glow could pass over a paragraph and only tint it. An opaque body
     covers the words. Measured at 1425x900 after he was given one: at 5 of 15
     scroll positions his disc sat on top of live body copy - walk__disc,
     nw__sum, a step in an ordered list - and elementsFromPoint confirmed he
     was painting above them, not behind.

     The fix is a clamp, NOT a search. Hunting for empty space is exactly what
     produced five rounds of speech-box bugs, and it fails the same way here:
     a per-frame decision against a threshold oscillates the moment anything
     near it moves. This reads one number that only changes when the viewport
     does - where the content column starts - and refuses to place him to the
     right of it. Stable input, stable output.

     IT IS MEASURED AGAINST THE BODY, NOT THE STAR. The star is a 104px hit
     area and the gutter at this width is about 100px, so nothing clamped
     against the star would ever fit and the rule would quietly never fire.
     The visible disc is 64px, which does fit. The invisible half of the
     button is allowed to overhang the column; only the part you can see is
     held out of it. */
  var colCache = { w: -1, left: 0 };

  function bodyR() { return phone() ? 27 : 32; }

  function columnLeft() {
    var w = document.documentElement.clientWidth;
    if (colCache.w === w) return colCache.left;
    var wrap = document.querySelector("main .wrap") || document.querySelector(".wrap");
    colCache.w = w;
    colCache.left = wrap ? Math.round(wrap.getBoundingClientRect().left) : 0;
    return colCache.left;
  }

  /* Nor under the header: the masthead paints above him, so a station up
     there is a Levi nobody can see, with a box floating beside nothing. */
  function belowHead(y) {
    return Math.max(y, headEdge() + bodyR() + 12);
  }

  function offColumn(x) {
    var w = document.documentElement.clientWidth;
    if (x > w * 0.5) return x;          /* a right-hand placement is its own case */
    var R = bodyR();
    var lim = columnLeft() - R - 8;
    if (lim < R + 4) return x;          /* no gutter to hide in - leave him alone */
    return Math.min(x, lim);
  }

  function retarget() {
    if (!zoneName) {
      var hold = holdPoint();
      var h = keepOffPanel(hold.x, hold.y);
      goal.x = offColumn(h.x) + nudgeX; goal.y = belowHead(h.y + nudgeY); laneOffsets(); return;
    }
    /* Re-resolved every frame so the hand-off between two bands of the SAME
       zone happens without a change of line - arrive() returns early when the
       name has not changed, so it would never have swapped the element. */
    var el = zoneEl(zoneName);
    var r = el && visibleSlice(el);
    if (!r) {
      var hp0 = holdPoint();
      var hp = keepOffPanel(hp0.x, hp0.y);
      goal.x = offColumn(hp.x) + nudgeX; goal.y = belowHead(hp.y + nudgeY); laneOffsets(); return;
    }
    zone = el;
    var R = starR(), gap = gapW();
    /* ONE rect read per frame, for both numbers. The width used to come from a
       constant that disagreed with the stylesheet by 24px. */
    var sr = speech.getBoundingClientRect();
    var lw = sr.width > 4 ? sr.width : lineW();
    var sh = sr.height || 26;

    stacked = (PAD + 2 * R + gap + lw + PAD) > r.width;

    /* THE LINE DECIDES THE HEIGHT, NOT THE LIGHT.

       Measured at 1425x820, the line overlapped page copy at five of nine
       scroll positions. The cause is geometry: the light is 190px across and
       the line 304px, and no 384px-wide vertical strip on this page is free of
       text, so beside the star is always inside the text column.

       They are different kinds of thing and get different rules. The LIGHT may
       pass over copy - it is an additive glow, the reference flies its
       character straight across its display type, and you read through it. The
       WORDS may never overlap copy, because two texts on top of each other are
       both unreadable.

       The strip between a section's last line of copy and its bottom edge
       measured 51-139px in every section: too short for the light, ample for a
       two-line sentence. So the light is placed by where its LINE has to land
       - low in the band, with the words sitting in that free foot - and the
       light hangs above and slightly out of the section, which costs nothing.
       One number off the band box, no rect scanning. */
    /* Anchor to the foot ONLY when the band's real bottom is on screen. When
       the band runs off below, visibleSlice's foot is the viewport edge, not
       the section's free tail - and anchoring to that drops the line into the
       middle of the copy. Measured at scrollY 924 in the hero: two hits. */
    var vhNow = document.documentElement.clientHeight;
    var footOK = el.getBoundingClientRect().bottom <= vhNow + 2;
    var foot = r.top + r.height;
    if (!stacked) {
      goal.x = r.left + PAD + R;
      goal.y = footOK ? Math.max(r.top + r.height / 2, foot - 10 - sh / 2)
                      : r.top + r.height / 2;
    } else {
      goal.x = r.left + r.width / 2;
      goal.y = footOK ? Math.max(r.top + PAD + R * 0.78, foot - 10 - sh - gap - R * 0.86)
                      : r.top + PAD + R * 0.78;
    }

    /* ---- THE LIGHT AND THE WORDS ARE NOT THE SAME PROBLEM ------------------
       Measured at 1425x820, the line overlapped page text at five of nine
       scroll positions - on the ledger rows, the loop steps, the night-work
       summary. The cause is geometry, not placement luck: the light is 190px
       across and the line is 304px, and there is no 384px-wide vertical strip
       anywhere on this page that is free of copy. Beside the star, the line is
       always in the text column.

       So they separate, on the principle that they are different kinds of
       thing. The LIGHT may pass over anything - it is an additive glow, that
       is what the reference's character does to its display type, and it
       costs nothing to read through. The WORDS may not overlap anything ever,
       because two texts on top of each other are both unreadable.

       The strip between the last line of a section's copy and its bottom edge
       measured 51 to 139px in every section - far too short for the light, and
       ample for a two-line sentence. That is where the words go. No rect
       scanning, no candidate scoring: one number off the section box. */
    /* The zone put it somewhere; the panel gets the final say. */
    var safe = keepOffPanel(goal.x, goal.y);
    goal.x = offColumn(safe.x) + nudgeX; goal.y = belowHead(safe.y + nudgeY);

    /* RELATIVE OFFSETS ONLY. The first attempt pinned the line to viewport
       coordinates with (lineY - p.y), which fed the light's own position back
       into its own layout every frame; the star was measured at -22322,-109726
       three sections in. Everything below is an offset FROM the light, so
       nothing it does can move itself. */
    if (!stacked) placeBox(R + gap, -sh / 2, sr);
    else          placeBox(-lw / 2, R * 0.86 + gap, sr);
  }

  /* ---- the loop ------------------------------------------------------------ */
  function step(now) {
    raf = null;
    if (done) return;
    /* dt MUST BE POSITIVE, AND THIS IS NOT PEDANTRY.

       run() seeds lastT from performance.now(), and the timestamp rAF then
       hands step() is the START of that frame - which can be EARLIER. So
       now - lastT comes out negative, and Math.min(MAX_DT, negative) happily
       keeps the negative.

       The old spring survived that: a negative dt just took one tiny step
       backwards and the next frame recovered. The force limiter does not.
       cap = MAXF * dt goes negative, `fm > cap` is then true for every fm,
       and the steering force is scaled by a negative number - so it
       accelerates directly AWAY from the target, harder every frame, forever.
       Measured before this guard: the star reached -25539,-126876. */
    /* A NON-FINITE TIMESTAMP POISONS EVERYTHING DOWNSTREAM. now feeds
       Math.sin(now / 2600) in the idle bob, and Math.sin(NaN) is NaN, which
       flows into gx, then tox, then the steering force, then v, then p - and
       NaN propagates through every arithmetic operation, so it never clears. */
    if (!isFinite(now)) now = (isFinite(lastT) ? lastT : 0) + 16.7;

    var dt = (now - lastT) / 1000;
    if (!(dt > 0)) dt = 1 / 60;          /* first frame, clock step, anything odd */
    if (dt > MAX_DT) dt = MAX_DT;
    lastT = now;

    retarget();
    checkIdle(now);

    var cx = 0, cy = 0, near = 0;
    if (mouse.fresh > 0 && !phone()) {
      var mx = mouse.x - p.x, my = mouse.y - p.y;
      var dist = Math.hypot(mx, my) || 1;
      near = Math.max(0, 1 - dist / CURSOR_REACH);
      var inf = near * CURSOR_PULL * mouse.fresh;
      cx = mx / dist * inf; cy = my / dist * inf;
      mouse.fresh = Math.max(0, mouse.fresh - dt / 1.2);
    }
    var wantGlow = 1 + near * mouse.fresh * 0.5;
    glow += (wantGlow - glow) * Math.min(1, dt * 5);

    /* Order of authority: your hand, then where you put him, then the lure,
       then the zone. */
    if (parked && parked.zone !== zoneName) parked = null;   /* new section, he follows again */
    var g = drag || parked || lure || goal;
    /* No bob here any more - see startBreath(). The cursor pull stays, because
       that is a real change of destination rather than decoration. */
    var gx = g.x + cx, gy = g.y + cy;

    /* Two modes, decided by one distance. See the long note at flyTo(). */
    var dist = Math.hypot(gx - p.x, gy - p.y);
    /* A FLIGHT IS AN EVENT, NOT A DISTANCE.

       It used to launch whenever the gap to the station passed 150px. But
       scrolling drags the station continuously, so an ordinary scroll opened
       that gap again and again: measured, three separate launch-bank-level
       sequences in one 2.4s scroll. A flight now means one thing - arriving in
       a new section - and is requested by arrive(). Everything else, scroll
       drift included, is the follow, which cannot repeat because it is one
       tween being re-aimed. */
    if (flyNext && !drag && dist > 24 && window.gsap) { flyNext = false; flyTo(gx, gy); }
    else if (!flight) {
      flyNext = false;
      /* THE FOLLOW HAS A SPEED LIMIT - AND THAT IS THE WHOLE TELEPORT FIX.

         It was gsap.quickTo with a power3 ease: an ease-OUT, fastest at the
         start. Fine for small drifts, but when a section scrolls away his
         target jumps hundreds of pixels at once, and an ease-out covers a
         jump like that by leaping first. Measured at 1300x760 during a flick:
         76px in a single frame, then 67, 61, 53... - roughly 4,600px/s at the
         start. At 60fps a 76px step is not motion, it is a teleport.

         Now: an exponential approach (quick for small moves, so he still
         feels responsive) with a hard ceiling on how far he may travel in one
         frame. A big jump becomes a steady glide at FOLLOW_MAX instead of a
         snap. It also removes the quickTo tweens entirely, which were a
         second writer to p still running underneath every flight. */
      var fdx = gx - p.x, fdy = gy - p.y, fd = Math.hypot(fdx, fdy);
      if (fd > 0.05) {
        var stepLen = fd * (1 - Math.exp(-dt * (drag ? 24 : 7)));
        var cap = (drag ? 4000 : FOLLOW_MAX) * dt;
        if (stepLen > cap) stepLen = cap;
        p.x += fdx / fd * stepLen;
        p.y += fdy / fd * stepLen;
      }
    }

    /* VELOCITY IS DERIVED NOW, NOT INTEGRATED. Nothing steers by it any more -
       it exists so the trail, the report and the stats can still ask how fast
       he is going. Measured across the previous frame because GSAP mutates p
       on its own ticker, not inside this function. */
    v.x = dt > 0 ? (p.x - lastP.x) / dt : 0;
    v.y = dt > 0 ? (p.y - lastP.y) / dt : 0;
    lastP.x = p.x; lastP.y = p.y;

    /* Cursor first, then the direction of travel, then forward. */
    var lkx = 0, lky = 0;
    if (HOVER && mouse.inside) {
      var ldx = mouse.x - p.x, ldy = mouse.y - p.y, ld = Math.hypot(ldx, ldy);
      if (ld < LOOK_REACH && ld > 1) {
        var lk = Math.min(1, ld / 70);          /* ease in right next to him */
        lkx = ldx / ld * LOOK_X * lk; lky = ldy / ld * LOOK_Y * lk;
      }
    }
    if (!lkx && !lky) {
      var lsp = Math.hypot(v.x, v.y);
      if (lsp > 90) { lkx = v.x / lsp * LOOK_X * .55; lky = v.y / lsp * LOOK_Y * .55; }
    }
    lookAt(lkx, lky);

    /* A GUIDE MAY NOT LEAVE THE SCREEN. Ever, for any reason.

       Every goal assignment is provably clamped to the viewport and the
       steering force is capped, so on paper this can never fire. It fired
       anyway - measured at (-25539, -126876) - and one cause was found and
       guarded. Rather than keep betting that the next arithmetic slip is the
       last one, this is an unconditional floor: the visitor never watches the
       companion sail off the top of the page, whatever happened upstream. The
       outward velocity is zeroed too, so it cannot press against an edge and
       accumulate there. */
    var cw = document.documentElement.clientWidth;
    var ch = document.documentElement.clientHeight;
    var mg = starR() * 0.45;

    /* NaN IS NOT CAUGHT BY A CLAMP, AND THIS IS THE WHOLE POINT.

       Every comparison with NaN evaluates false, so `if (p.y < mg)` below does
       nothing at all and the poison passes straight through to the stylesheet
       as `--levi-y: NaNpx`. That makes the transform declaration invalid; an
       invalid transform is dropped; and a position:fixed element with left:0,
       top:0 and no transform sits in the TOP-LEFT CORNER of the viewport.
       "Flying up and off the screen" is what that looks like.

       Measured with the tick driver: one non-finite frame poisoned p and v
       permanently - every subsequent frame stayed NaN, across every later test
       case, because nothing downstream could ever clear it.

       So this recovers rather than clamps: drop the velocity, put the light
       back on its target, and carry on. */
    if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(v.x) || !isFinite(v.y)) {
      v.x = 0; v.y = 0;
      p.x = isFinite(goal.x) ? goal.x : cw * 0.5;
      p.y = isFinite(goal.y) ? goal.y : ch * 0.5;
      wanderA = 0; alt = 0;
    }
    if (!isFinite(spin)) spin = 0;
    if (!isFinite(glow)) glow = 1;
    if (p.x < mg)      { p.x = mg;      if (v.x < 0) v.x = 0; }
    if (p.x > cw - mg) { p.x = cw - mg; if (v.x > 0) v.x = 0; }
    if (p.y < mg)      { p.y = mg;      if (v.y < 0) v.y = 0; }
    if (p.y > ch - mg) { p.y = ch - mg; if (v.y > 0) v.y = 0; }

    spin = (spin + dt * 6 + Math.sin(now / 5200) * dt * 8) % 360;

    /* ALTITUDE. Nothing here is really 3D, so height is inferred from effort:
       crossing the page means climbing, holding station means settling. This
       one number drives the whole cast-light behaviour below, which is what
       the reference uses to tell you how high its character is. */
    var sp = Math.hypot(v.x, v.y);
    alt += (Math.min(1, sp / MAXV) - alt) * Math.min(1, dt * 2.6);

    /* The trail: each point chases the one in front, and the whole thing is
       only visible while there is real speed to leave a mark.

       NOT WHEN THE 3D STAR HAS TAKEN OVER. site.css hides .levi__trail under
       .levi.is-3d, so on any machine with WebGL these were six elements being
       repositioned every frame while display:none - twenty-four style writes a
       frame for something nobody can see. */
    if (!REDUCED) {
      var speed = Math.hypot(v.x, v.y);
      var vis = Math.min(1, Math.max(0, (speed - 120) / 900));
      for (var k = 0; k < TRAIL; k++) {
        var lead = k === 0 ? p : trail[k - 1];
        var f = Math.min(1, dt * (16 - k * 1.6));
        trail[k].x += (lead.x - trail[k].x) * f;
        trail[k].y += (lead.y - trail[k].y) * f;
        /* One transform instead of four variables the browser must resolve. */
        var st = trail[k].el.style;
        st.transform = "translate(-50%,-50%) translate(" +
          (trail[k].x - p.x).toFixed(1) + "px," + (trail[k].y - p.y).toFixed(1) + "px) scale(" +
          (1 - k * 0.12).toFixed(2) + ")";
        st.opacity = (vis * (1 - k / TRAIL) * 0.55).toFixed(3);
      }
    }

    write(p.x, p.y);
    frame.vx = v.x; frame.vy = v.y; frame.glow = glow; frame.spin = spin;
    frame.alt = alt;
    /* Published so a check can see what the light is AIMING at, not only where
       it ended up. Chasing a runaway without the goal in view is guesswork. */
    frame.gx = goal.x; frame.gy = goal.y; frame.frames = (frame.frames | 0) + 1;
    root.style.setProperty("--levi-spin", spin.toFixed(1) + "deg");
    root.style.setProperty("--levi-glow", glow.toFixed(3));
    /* The cast-light variables are gone with the shadow - four fewer style
       writes per frame, and one less thing pretending to be physics. */

    if (!ticking) raf = requestAnimationFrame(step);
  }

  function run() {
    if (REDUCED || done || frozen) return;
    if (raf) return;
    lastT = (window.performance && performance.now) ? performance.now() : Date.now();
    raf = requestAnimationFrame(step);
  }

  /* TWICE, AND THE SECOND ONE IS THE POINT. The box is resolved against where
     the light IS, so resolving it before the teleport places it for a position
     the light is about to leave - which under prefers-reduced-motion, where
     settleNow() is the only placement that ever runs, is every placement. */
  function settleNow() {
    retarget();                       /* pick the goal */
    var g = lure || goal;
    p.x = g.x; p.y = g.y; v.x = 0; v.y = 0;
    retarget();                       /* now place the words at the rest point */
    write(p.x, p.y);
  }

  /* ---- arriving somewhere -------------------------------------------------- */
  /* NO ZONE MEANS NOT THERE. Levi may only exist inside a zone, so when no
     section owns one - the hero below 1200px, for instance - the light goes
     too. Without this it parked at the layer origin, which measured as a star
     at (0,0) and a line 150px off the left edge of the screen. */
  /* THE HOLDING LANE. Between two zones there is nowhere Levi is allowed to
     be, and the old answer was to fade it to opacity 0 and fade it back in
     wherever the next zone was - which is exactly the teleport. It flies to
     the left gutter instead and waits there in plain sight.

     The gutter is the one column empty in every section: the wrap starts at
     about 13.4% of the viewport, so 9.4% is clear of it, and it is where the
     zones already put Levi in six sections out of eight. */
  /* RETIRED: sizeHeroBand().

     It wrote an inline width onto the hero's lower band from the demo stage's
     real left edge, because no percentage could track a gutter whose width is
     the difference between a 1180px .wrap and a 1038px stage. It was careful,
     it was re-measured on settle as well as on resize, and it was solving the
     wrong problem: the widest that gutter ever got was 158px against the
     214px the light reserves, so the band it sized was rejected by fitsWidth()
     every single time. The queue's band is the stage itself now and needs no
     measuring - see .levi-zone--queue. */

  /* ==========================================================================
     THE DEMO IS THE PRODUCT. NOTHING CROSSES IT.

     Every general placement rule tried so far has traded one overlap for
     another, because this page has no column wide enough for the light AND the
     box. This is the narrow version of that problem, and the narrow version is
     solvable: there is exactly one element a visitor is meant to reach into,
     and the light may never be on top of it.

     One named element, read in retarget() which already reads geometry, and
     pushed out along whichever axis needs least movement. Not a scan, not a
     candidate score - a single rectangle that is off limits.
     ======================================================================== */
  function panelBox() {
    var a = document.querySelector(".app");
    if (!a) return null;
    var r = a.getBoundingClientRect();
    if (r.width < 4 || r.bottom < 0 || r.top > document.documentElement.clientHeight) return null;
    return r;
  }

  /* THE PANEL IS NOT THE ONLY THING THE LIGHT MAY NOT SIT ON.

     The rule was written for `.app` alone, on the principle that the light is
     additive and may pass over anything else - which is true of display type
     and body copy, and is NOT true of the one button the whole page is asking
     you to press. A 300px flare centred on "See how it works" does not read as
     atmosphere, it reads as the button being broken, which is exactly how it
     was reported. Measured on the live site at 1536x830: flare over the hero
     lede 169x74 and climbing onto the call to action below it.

     So the no-go list is named elements, plural. Resolved in order and then
     re-checked, because stepping out of one can step into another - three
     passes is enough for two rectangles and terminates whatever they do. */
  function hotBoxes() {
    var out = [];
    var vh = document.documentElement.clientHeight;
    /* The walkthrough's CONTROLS, not its whole player. On a phone the player
       is 854px tall - most of the screen - so keeping him off all of it
       would leave him nowhere to be. The rule Jordan set was never the
       controls, and the controls are what matters: the star is a real
       button (pointer-events: auto), so measured at 390px with him parked on
       "Next kind of item", a tap there hit LEVI and not the button. */
    [".app", ".cta", ".walk__bar", ".walk__tabs"].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (!el) return;
      var r = el.getBoundingClientRect();
      if (r.width < 4 || r.bottom < 0 || r.top > vh) return;
      out.push(r);
    });
    return out;
  }

  function escapeBox(box, gx, gy, R, vw, vh) {
    var inside = gx + R > box.left && gx - R < box.right &&
                 gy + R > box.top  && gy - R < box.bottom;
    if (!inside) return null;

    /* Four ways out. Pick the shortest that is still on screen. */
    var outs = [
      { x: box.left - R,  y: gy, d: gx - (box.left - R),  ok: box.left - R > R },
      { x: box.right + R, y: gy, d: (box.right + R) - gx, ok: box.right + R < vw - R },
      { x: gx, y: box.top - R,    d: gy - (box.top - R),    ok: box.top - R > R },
      { x: gx, y: box.bottom + R, d: (box.bottom + R) - gy, ok: box.bottom + R < vh - R }
    ].filter(function (o) { return o.ok; })
     .sort(function (a, b) { return Math.abs(a.d) - Math.abs(b.d); });

    if (!outs.length) return { x: null, y: null };   /* nowhere legal */
    return { x: outs[0].x, y: outs[0].y };
  }

  function keepOffPanel(gx, gy) {
    var boxes = hotBoxes();
    if (!boxes.length) return { x: gx, y: gy };
    var R = starR() + 12;
    var de = document.documentElement;
    var vw = de.clientWidth, vh = de.clientHeight;
    var x = gx, y = gy, stuck = false;

    for (var pass = 0; pass < 3; pass++) {
      var moved = false;
      for (var i = 0; i < boxes.length; i++) {
        var got = escapeBox(boxes[i], x, y, R, vw, vh);
        if (!got) continue;
        if (got.x === null) { stuck = true; continue; }
        x = got.x; y = got.y; moved = true;
      }
      if (!moved) break;
    }

    /* Nowhere legal - the panel fills the screen. Sit in the left margin and
       let the light pass over it rather than leave the viewport. */
    if (stuck) return { x: Math.max(R, Math.round(vw * 0.06)), y: y };
    return { x: x, y: y };
  }

  /* ==========================================================================
     LEANING. The demo commentary has to point at what it is talking about, and
     the one rule that cannot bend is that the light never covers a card, the
     draft, or the three controls. So it does not fly TO the thing - it flies
     to the nearest legal point beside it, level with it, on whichever side of
     the panel has room. That reads as leaning toward it, and it is the same
     `lure` mechanism the approve gesture already uses. */
  function leanTo(el) {
    if (!el || dismissed) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.bottom < 0 || r.top > document.documentElement.clientHeight) return false;
    var de = document.documentElement;
    var vw = de.clientWidth, vh = de.clientHeight;
    var R = starR() + 12;
    var y = Math.max(R, Math.min(vh - R, r.top + r.height / 2));
    var box = panelBox();
    var x;
    if (box) {
      var leftRoom = box.left - R, rightRoom = box.right + R;
      var canLeft = leftRoom > R, canRight = rightRoom < vw - R;
      /* Nearest side that exists. Left first when both do: the copy column on
         this page is left, the panel is centred, and the left gutter is the
         lane Levi already lives in. */
      x = canLeft ? leftRoom : (canRight ? rightRoom : Math.round(vw * 0.06));
    } else {
      x = Math.max(R, Math.min(vw - R, r.left - R));
    }
    lure = { x: x, y: y };
    run();
    return true;
  }
  function releaseLean() { lure = null; run(); }

  function holdPoint() {
    var de = document.documentElement;
    var R = starR();
    /* REVERTED. Capping this at 58% to clear the hero's CTA pushed the light
       up into the copy instead, and the box with it: measured 4 overlaps
       before, 14 after. The lower half is where the controls are; the upper
       half is where the text is. There is no height at which a 328px box in a
       170px gutter is clear of both, which is the real finding - see the note
       in the reply. */
    return {
      x: Math.max(PAD + R, Math.round(de.clientWidth * 0.094)),
      y: Math.min(de.clientHeight - PAD - R, Math.max(PAD + R, p.y))
    };
  }

  /* THE LINE goes quiet. THE OBJECT does not. Those were one function and
     that conflation is what made a gap in the zones look like a disappearance
     rather than a pause in the conversation. */
  function goQuiet() {
    zone = null; zoneName = null;
    say.classList.add("is-quiet");
    setState("idle");
  }

  /* opts.silent: go there - fly, clear the old detour, look round - but do
     not speak. Used while banter holds the floor; see readPosition. */
  var pendingLine = false;
  function arrive(z, opts) {
    opts = opts || {};
    /* A GAP IS NOT A SILENCE. Measured on the homepage: the ten bands cover
       2839px of a 6839px scroll range, so 58% of the page fell between zones
       and called goQuiet(). That was survivable while the line was pinned to
       the light and moved around - a line that wanders is expected to come and
       go. Docked, it is not: the box blinks out at a fixed spot and back in
       350px later, eight times down the page, which is precisely the flicker
       the docking was meant to end.

       So a gap now HOLDS the section it just left. The light still leaves -
       retarget() resolves the zone element every frame and drops into the
       holding lane the moment visibleSlice() returns null - so the object
       still reads as travelling between sections. Only the sentence persists,
       which is what "narrates every section" asks for: the last thing said
       about a section stays readable until there is something new to say.

       goQuiet() is kept for the cases that really are silence: dismissal, and
       a page where nothing has been said at all. */
    if (!z) { if (!zoneName) goQuiet(); return; }
    if (z.name === zoneName) {                /* already here */
      /* ...unless he got here SILENTLY while a remark held the floor - then
         this section's line is still owed, and this is the moment for it. */
      if (pendingLine && !opts.silent) {
        pendingLine = false;
        var owed = voice("line", z.name);
        if (speak(owed, { glow: 3.2 })) sectionLine = owed;
      }
      return;
    }
    zone = z.el; zoneName = z.name;
    flyNext = true;          /* a new section is the one thing worth flying to */
    nudgeX = 0; nudgeY = 0;  /* and from its own spot, not the last one's detour */
    window.setTimeout(function () { blinkOnce(false); }, 380);   /* he looks round */
    /* A LEAN IS PER-SECTION. Whoever set it - the approve gesture or the demo
       commentary - it points at something in the section being left, so it
       cannot outlive the arrival in the next one. Belt and braces against the
       timer in levi-demo.js: if anything ever forgets to release a lure, the
       light still starts following the page again at the next section. */
    lure = null;
    /* ASKED AT ARRIVAL, NOT READ FROM THE SCRIPT. That is the whole reason
       walking back up the page is a different sentence in the same section:
       the script carries names now, and the words are fetched at the moment
       the visitor gets there. */
    if (opts.silent) { pendingLine = true; return; }
    pendingLine = false;
    var sl = voice("line", z.name);
    var said = speak(sl, { glow: 3.2 });
    if (said) { sectionLine = sl; banterHold = false; return; }

    /* SPENT - AND AN EMPTY BOX IS WORSE THAN A QUIET ONE.

       This revealed the box regardless, on the reasoning that it still holds
       the previous sentence. It does, unless there has not BEEN one: late in a
       session every array can be spent, and on a fresh load of a page in that
       state nothing has been typed yet, so what got revealed was an empty box
       with a LEVI label and no line under it. Caught on the live site after a
       day of test loads had run the set down.

       The zone is kept either way, so placement still tracks the section. */
    savedLine = null; idleSpoken = false;
    if ((sayEl.textContent || "").replace(/\s/g, "")) {
      say.classList.remove("is-quiet");
      root.classList.remove("is-quiet");
      setState("speaking");
    } else {
      say.classList.add("is-quiet");
      setState("idle");
    }
    /* ARRIVAL IS VISIBLE. Peripheral vision catches a change in brightness,
       not a dot that quietly exists. */
    glow = 3.2;
    if (REDUCED) settleNow(); else run();
  }

  /* Debounced to where they STOPPED. Flying past four sections speaks for none
     of them; it speaks once, for the one they came to rest in. */
  function readPosition() {
    if (dismissed) return;
    if (settleT) window.clearTimeout(settleT);
    settleT = window.setTimeout(function () {
      /* BANTER LASTS UNTIL THE NEXT SCROLL, AND NOT ONE SCROLL LONGER.
         arrive() returns early when the section has not changed, so without
         this a remark would sit there for the rest of the section - the
         visitor clicks once and Levi stops narrating the page. */
      var zNow = dominantZone();
      if (banterHold) {
        /* BANTER KEEPS THE FLOOR - NOT THE POSITION.

           This used to return here while a remark held, skipping arrive()
           entirely. That skipped the section change, so after a fast flick
           (which is exactly when "Slow down." fires) he kept tracking the
           section he had LEFT - the hero, scrolled mostly away, its visible
           strip clamped just under the header - and parked there, on the hero
           paragraph, with the remark beside him. It also skipped the text
           check. That is the screenshot Jordan sent.

           Now he goes where the page is, silently, and the text check runs.
           Only the words wait: the new section's line is spoken on the next
           settle, once the remark has had its turn. */
        if (Date.now() - banterT < BANTER_DWELL) {
          arrive(zNow, { silent: true });
          chooseSaySideSoon();
          return;
        }
        banterHold = false;
        if (zNow && zNow.name === zoneName) {
          if (pendingLine) arrive(zNow);                       /* the owed line */
          else if (sectionLine) speak(sectionLine, { instant: true });
          chooseSaySideSoon();
          return;
        }
      }
      arrive(zNow);
      chooseSaySideSoon();
    }, SETTLE_MS);
  }

  /* ---- the one gesture ----------------------------------------------------- */
  function onScreenEl(el) {
    var r = el.getBoundingClientRect();
    return r.width > 2 && r.bottom > 60 &&
           r.top < document.documentElement.clientHeight - 60;
  }

  function gesture() {
    if (dismissed || lure) return;
    noteActivity();
    var btn = null, all = document.querySelectorAll("[data-approve]");
    for (var i = 0; i < all.length; i++) {
      if (onScreenEl(all[i])) { btn = all[i]; break; }
    }
    /* NOTHING TO APPROVE, SO THE CLICK BECOMES THE OTHER THING IT IS FOR.

       This is where gesture() already gave up silently - it looked for an
       approve control on screen and returned. That silent return was the
       whole of the conflict Jordan asked about, and there is not one: the
       approve path is untouched and keeps first refusal, banter only gets the
       clicks that would previously have done nothing at all. Which is most of
       them, on six of the seven pages, where no queue exists. */
    if (!btn) { banter("clicked"); return; }
    var r = btn.getBoundingClientRect();
    lure = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    run();
    window.setTimeout(function () {
      setState("approved");
      glow = 3.4;
      approvedEver = true;
      try { btn.click(); } catch (e) {}
      /* THE GESTURE GETS THE STATE LINES; the card's own buttons get the demo
         ones. Both approve, but they are different acts: this one is the
         visitor reaching for Levi, and the demo commentary would be the wrong
         register for it. approvedLast only when nothing is left behind it. */
      var left = document.querySelectorAll("[data-stack] [data-item]").length;
      speak(voice("state", left <= 1 ? "approvedLast" : "approved"),
            { state: "approved", glow: 3.4 });
    }, 430);
    window.setTimeout(function () {
      lure = null; run();
      setState(zone ? "speaking" : "idle");
    }, 1050);
  }

  function noteActivity() {
    lastActivity = (window.performance && performance.now) ? performance.now() : Date.now();
    idleTier = 0;
    if (idleSpoken && savedLine !== null) {
      sayLine(savedLine, true);
      savedLine = null; idleSpoken = false;
    }
  }

  /* THREE TIERS, NOT ONE RANDOM PICK. The set separates idleShort, idleLong
     and idleVeryLong because standing still for twenty seconds and standing
     still for a minute and a half are different facts about the visitor. Each
     tier fires once on the way up and the ladder resets the moment they move,
     so nobody gets the whole ladder read to them for pausing to read. */
  var IDLE_KEYS = ["idleShort", "idleLong", "idleVeryLong"];
  function checkIdle(now) {
    if (dismissed || REDUCED || !zone) return;
    var waited = now - lastActivity;
    var want = waited >= IDLE_MS * 4 ? 3 : waited >= IDLE_MS * 2 ? 2 :
               waited >= IDLE_MS ? 1 : 0;
    if (!want || want <= idleTier) return;
    if (!idleSpoken) savedLine = sayEl.textContent;
    /* The third rung of the ladder is not a longer idle line any more, it is
       banter: at that point he has been left alone long enough that
       commenting on the page is the wrong register. */
    if (want >= 3) {
      var keepA = idleSpoken ? savedLine : sayEl.textContent;
      idleTier = want;
      if (banter("abandoned")) { savedLine = keepA; idleSpoken = true; }
      return;
    }
    var line = voice("state", IDLE_KEYS[want - 1]);
    idleTier = want;
    if (!line) return;
    /* speak() clears these, and idle is the one caller that must not - the
       saved line is how noteActivity puts the section's sentence back. */
    var keep = savedLine;
    speak(line, { glow: 2.4 });
    savedLine = keep; idleSpoken = true; idleTier = want;
  }

  star.addEventListener("click", function (e) { e.preventDefault(); dropHint(); gesture(); });
  star.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.stopPropagation(); dismiss(); }
  });

  document.addEventListener("pointermove", function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.fresh = 1; mouse.inside = true;
    noteActivity();
  }, { passive: true });
  document.addEventListener("keydown", noteActivity, true);
  /* The pointer left the window: stop looking at where it used to be. */
  document.documentElement.addEventListener("mouseleave", function () { mouse.inside = false; });
  window.addEventListener("blur", function () { mouse.inside = false; });
  document.addEventListener("click", noteActivity, true);

  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-approve]");
    if (!b || dismissed) return;
    approvedEver = true;
    /* THE LAST ONE IS A DIFFERENT EVENT FROM ANY OTHER ONE. Checked after the
       click has been handled, because the card is removed by the handler this
       one runs alongside. */
    window.setTimeout(function () {
      if (allDoneSaid || dismissed) return;
      var stack = document.querySelector("[data-stack]");
      if (!stack || stack.querySelectorAll("[data-item]").length) return;
      allDoneSaid = true;
      banter("afterAllDone");
    }, 900);
    if (REDUCED) return;
    setState("approved");
    if (flareTimer) window.clearTimeout(flareTimer);
    flareTimer = window.setTimeout(function () {
      setState(zone ? "speaking" : "idle");
    }, 640);
  }, true);

  lastScrollY = window.pageYOffset || 0;
  window.addEventListener("scroll", function () {
    noteActivity();
    readPosition();

    /* THE DELTAS ARE READ BEFORE THE REDUCED-MOTION RETURN, NOT AFTER.

       This used to return here, which was right when everything below was
       motion - the wander, the kick. It is not right any more, because three
       banter triggers now live below it: scrollingFast, scrolledBack and
       neverTriedDemo. A visitor who asks for reduced motion is asking for
       less MOVEMENT, not less of what Levi says, and silently deleting a
       quarter of the banter for them is a content decision wearing an
       accessibility label.

       So the counters and the remarks run for everyone, and only the physics
       is skipped. */
    var y = window.pageYOffset || 0, d = y - lastScrollY;
    lastScrollY = y;

    /* PAST A FEW. Said DURING the flick, not after it: by the time the scroll
       settles the visitor has arrived somewhere and that section's own line is
       the right thing to be reading. This one belongs to the travelling. */
    burst += Math.abs(d);
    if (!burstSaid && burst > document.documentElement.clientHeight * 2.5) {
      burstSaid = true;
      banter("scrollingFast");
    }
    if (burstT) window.clearTimeout(burstT);
    burstT = window.setTimeout(function () { burst = 0; burstSaid = false; }, 400);

    /* GOING BACK UP IS A DIFFERENT ACT FROM GOING DOWN. Reading forwards is
       the default; turning round and climbing means something did not land.
       Accumulated rather than taken per event, because a trackpad emits
       upward deltas constantly during ordinary reading - it wants a viewport
       and a half of real travel, and the accumulator decays. */
    if (d < 0) backUp += -d; else backUp = 0;
    if (!backSaid && backUp > document.documentElement.clientHeight * 1.5) {
      backSaid = true;
      banter("scrolledBack");
    }
    if (backT) window.clearTimeout(backT);
    backT = window.setTimeout(function () { backUp = 0; backSaid = false; }, 1200);

    /* REACHED THE BOTTOM WITHOUT EVER APPROVING ANYTHING. He has spent the
       whole page saying the product is one decision, and the visitor has read
       about it without making one. Once per session; the flag is never reset.
       Only where the demo exists to be tried. */
    if (!demoNagged && !approvedEver && document.querySelector("[data-approve]")) {
      var de0 = document.documentElement;
      if (y + de0.clientHeight >= de0.scrollHeight - de0.clientHeight * 0.6) {
        demoNagged = true;
        banter("neverTriedDemo");
      }
    }

    if (REDUCED) { settleNow(); return; }    /* motion only from here down */

    kickBy(Math.max(-26, Math.min(26, -d * 0.11)),
           Math.max(-70, Math.min(70, -d * 0.55)));
    run();
  }, { passive: true });

  function anyZoneUsable() {
    for (var i = 0; i < script.length; i++) {
      if (zoneUsable(zoneEl(script[i].zone))) return true;
    }
    return false;
  }

  function leave(remember) {
    if (dismissed) return;
    dismissed = true; done = true;
    if (remember) { try { window.sessionStorage.setItem(KEY, "1"); } catch (e) {} }
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    /* THE FOOTNOTE STAYS. It is a note in the footer about what Levi is, in
       the page's own voice and in the normal flow - not a thing he carries
       around with him. Dismissing him does not retract the disclosure. */
    [root, say].forEach(function (n) {
      if (n.parentNode) n.parentNode.removeChild(n);
    });
  }

  function dismiss() {
    if (dismissed) return;
    /* One line on the way out, and it has to be said BEFORE dismissed is set,
       because speak() refuses once it is. The fade is long enough to read it
       and the node is not removed until leave(). */
    var bye = voice("state", "dismissed");
    var hold = 0;
    if (bye) {
      sayLine(bye);
      say.classList.remove("is-quiet");
      say.classList.remove("is-blocked");
      hold = REDUCED ? 900 : 1700;      /* long enough to read it */
    }
    window.setTimeout(function () {
      root.classList.add("is-gone");
      say.classList.add("is-gone");
      window.setTimeout(function () { leave(true); }, REDUCED ? 0 : 280);
    }, hold);
    try { window.sessionStorage.setItem(KEY, "1"); } catch (e) {}
  }

  window.addEventListener("resize", function () {
    /* NARROWING MUST NOT BE FATAL. This used to call leave(), which removes the
       nodes and sets done = true - permanently, for the rest of the visit. Any
       resize that momentarily found no usable zone (opening devtools, dragging
       across a breakpoint, a reflow during load) destroyed Levi, and widening
       the window again never brought it back. Go quiet instead, and return when
       a zone is usable again. */
    forgetShown(); forgetEls();   /* a media query may have flipped */
    if (!anyZoneUsable()) { goQuiet(); return; }
    observeZones();
    readPosition();
    if (REDUCED) settleNow(); else run();
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    else run();
  });

  function zoneTable() {
    var R = starR(), lw = lineW(), gap = gapW();
    var vw = document.documentElement.clientWidth;
    return script.map(function (s) {
      var el = zoneEl(s.zone);
      var cs = el && getComputedStyle(el);
      var shown = !!(el && cs.display !== "none" && cs.visibility !== "hidden");
      var r = el && el.getBoundingClientRect();
      return {
        zone: s.zone,
        shown: shown,
        bounds: r ? { l: Math.round(r.left), t: Math.round(r.top + (window.pageYOffset || 0)),
                      w: Math.round(r.width), h: Math.round(r.height) } : null,
        needsH: 2 * PAD + 2 * R,
        needsWbeside: PAD + 2 * R + gap + lw + PAD,
        fitsBeside: !!(r && shown && (PAD + 2 * R + gap + lw + PAD) <= r.width &&
                       r.height >= 2 * PAD + 2 * R),
        fitsStacked: !!(r && shown && (PAD + Math.max(2 * R, lw) + PAD) <= r.width &&
                        r.height >= 2 * PAD + 2 * R),
        usable: zoneUsable(el),
        edgeGapIfPlaced: r ? Math.round(Math.min(r.left + PAD, vw - (r.left + PAD + 2 * R + gap + lw))) : null
      };
    });
  }

  /* ---- start --------------------------------------------------------------- */
  /* ---- NEVER DECIDE THIS ONCE ----------------------------------------------
     This used to tear the nodes out of the DOM and replace the whole API with
     a stub the moment one measurement came back unusable. Caught in the act:
     at init every zone reported width 0, and starR() returned 78 - the PHONE
     radius - because documentElement.clientWidth had not been established yet.
     A 1425px desktop was measured as a phone with zero-width zones, Levi
     deleted itself, and nothing ever re-checked. Fonts landing, a restored
     window, a slow stylesheet or GSAP building its pin can all produce the
     same first measurement.

     So the check is now a gate, not a verdict. Levi stays hidden and keeps
     asking - on load, on resize, when fonts settle, and on a short timer -
     and starts the moment the page can actually hold it. After about seven
     seconds it stops asking, but it never destroys itself: a later resize
     still brings it back. */
  var started = false;

  function begin() {
    if (started) return true;
    if (!anyZoneUsable()) return false;
    started = true;
    root.classList.remove("is-boot");
    say.classList.remove("is-boot");
    startLevi();
    return true;
  }

  if (!begin()) {
    root.classList.add("is-boot");
    say.classList.add("is-boot");
    var tries = 0, timer = null;
    var stopAsking = function () {
      if (timer) { window.clearInterval(timer); timer = null; }
      window.removeEventListener("load", poke);
    };
    var poke = function () {
      if (begin() || ++tries > 30) stopAsking();
    };
    timer = window.setInterval(poke, 220);
    window.addEventListener("load", poke);
    /* resize is deliberately NOT removed - a window that becomes wide enough
       later is exactly the case this exists for. */
    window.addEventListener("resize", function () { begin(); }, { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { begin(); }).catch(function () {});
    }
  }

  function startLevi() {
  /* ---- THE QUEUE TALKS BACK -------------------------------------------------
     Every card carries a data-levi line written for it, and Levi reads the one
     belonging to whichever card is at the top. That is the difference between
     a mascot and an assistant: it is not narrating the page, it is telling you
     the one thing about THIS item that you would want a person to tell you.

     Only while Levi is in the hero, because that is where the queue is. Reading
     out invoice notes while the visitor is four sections down would be noise.

     A MutationObserver rather than a poll: the active card changes only when
     something is approved, skipped or reset, so this is idle almost always. */
  function watchQueue() {
    var stack = document.querySelector("[data-stack]");
    if (!stack) return;
    var lastSaid = null, pending = null;

    /* A queued card line must not land on top of a view the visitor has since
       navigated away from. Measured: approving, then going back, left the NEXT
       card introducing itself over the briefing. */
    function cancelPending() {
      if (pending) { window.clearTimeout(pending); pending = null; }
    }

    /* THE CONDITION IS WHETHER YOU CAN SEE THE QUEUE, not which zone Levi is
       standing in. Gating on zoneName === "hero" was wrong and measured wrong:
       between zones Levi holds in the lane with NO zone at all, so zoneName is
       null, and it refused to say anything about a card the visitor was
       actively clicking. If the queue is on screen, it is worth talking about. */
    function queueVisible() {
      /* Measure the PANEL, not the stack. digest.js hides the stack whenever
         the briefing is showing, and a hidden element reports a zero rect - so
         measuring it meant Levi fell silent on exactly the view that opens
         first. Measured: going back to the briefing left the previous card's
         line on screen because this returned false. */
      var el = document.querySelector("[data-queue]") || stack;
      var r = el.getBoundingClientRect();
      var vh = document.documentElement.clientHeight;
      return r.width > 4 && r.bottom > 40 && r.top < vh - 40;
    }

    function appVisible() {
      var el = document.querySelector(".app");
      if (!el) return false;
      var r = el.getBoundingClientRect();
      var vh = document.documentElement.clientHeight;
      return r.width > 4 && r.bottom > 40 && r.top < vh - 40;
    }

    function speakActive() {
      if (dismissed || !queueVisible()) return;
      var card = stack.querySelector("[data-item].is-active");
      var line = card && card.getAttribute("data-levi");
      if (!line || line === lastSaid) return;
      lastSaid = line;
      savedLine = null; idleSpoken = false;
      say.classList.remove("is-quiet");
      setState("speaking");
      sayLine(line);
      noteActivity();
    }

    /* React to the decision itself, before the next card's line lands. */
    /* On DOCUMENT and in the CAPTURE phase, not on the stack. site.js owns this
       queue and resolves a card by removing it from the tree; a listener
       further in was measured firing for approve and silently not for skip.
       Capturing at the document means the reaction cannot be lost to whatever
       the queue does underneath it. */
    document.addEventListener("click", function (e) {
      var t = e.target;
      var b = t && t.closest ? t.closest("[data-approve],[data-skip],[data-edit]") : null;
      if (!b || !stack.contains(b) || dismissed || !queueVisible()) return;
      var key = b.hasAttribute("data-approve") ? "afterApprove"
              : b.hasAttribute("data-edit")    ? "afterEdit"
              : "afterSkip";
      lastSaid = null;
      speak(voice("demo", key),
            { state: key === "afterApprove" ? "approved" : "speaking" });
      cancelPending();
      /* TWO QUESTIONS, TWO DELAYS, and conflating them lost one of them.

         Whether the queue just emptied has to be asked almost at once: site.js
         restarts the whole demo 1,800ms after the last card goes, so asking on
         the same 1,500ms beat as everything else raced the refill and lost -
         measured, the stack was empty and then back to 61 items, and
         demo.empty never fired once in a full run to zero. 250ms is enough for
         site.js to take the node out of the tree and nowhere near the restart.

         Whether the NEXT card should introduce itself is the opposite: it must
         wait for the reaction to have been read.

         Both go through `pending` so cancelPending() can actually cancel them.
         The first version scheduled a bare window.setTimeout, so clearing
         `pending` cancelled nothing and sixty-two approvals in a row left
         sixty-two live timers arguing about what to say. */
      pending = window.setTimeout(function () {
        pending = null;
        if (dismissed) return;
        if (!stack.querySelector("[data-item]")) {
          /* THE APP, NOT THE QUEUE. queueVisible() measures [data-queue], and
             an empty queue is exactly when that element stops being
             measurable - the view swaps and it collapses to a zero rect.
             Measured: qv went to 0 on the same frame the last card left, so
             the guard blocked the one line written for that moment, every
             time. What has to be on screen for "that is all of them" to make
             sense is the product surface, which is still there. */
          if (!appVisible()) return;
          lastSaid = null;
          speak(voice("demo", "empty"), { glow: 2.6 });
          return;
        }
        if (!queueVisible()) return;
        pending = window.setTimeout(function () {
          pending = null;
          if (!dismissed && queueVisible()) speakActive();
        }, 1250);
      }, 250);
    }, true);

    if (window.MutationObserver) {
      new MutationObserver(function () {
        if (!lastSaid) return;          /* a click is already handling it */
        speakActive();
      }).observe(stack, { subtree: true, attributes: true, attributeFilter: ["class"] });
    }

    /* The briefing and the list are two different conversations, so Levi says
       a different thing in each. Fired by digest.js, not polled. */
    window.addEventListener("cognivex:view", function (e) {
      if (dismissed || !queueVisible()) return;
      var v = e.detail && e.detail.view;
      cancelPending();
      lastSaid = null;
      savedLine = null; idleSpoken = false;
      say.classList.remove("is-quiet");
      root.classList.remove("is-quiet");
      setState("speaking");
      if (v === "digest") {
        sayLine("That is the whole morning. Five things want you.");
      } else {
        sayLine("Here they are. Read one, then decide.");
        pending = window.setTimeout(speakActive, 1600);
      }
      noteActivity();
    });

    window.setTimeout(speakActive, 900);
  }
  watchQueue();

  /* REDUCED MOTION IS A MEDIA QUERY, NOT A BOOLEAN READ ONCE AT LOAD.

     REDUCED is captured at script time, so a visitor who turns the preference
     on mid-session kept the full motion until they reloaded. gsap.matchMedia
     reverts everything created inside the handler the moment the query stops
     matching, which for the breath means it stops AND the transform is put
     back - no residual offset frozen into the element. */
  if (window.gsap && gsap.matchMedia) {
    gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", function () {
      startBreath();
      return function () {
        breathTweens.forEach(function (t) { t.kill(); });
        breathTweens = [];
        breath.x = 0; breath.y = 0; writeBreath();
      };
    });
  }

  watchBox();
  blink();
  window.setTimeout(offerHint, REDUCED ? 800 : 2800);

  setState("idle");
  lastActivity = (window.performance && performance.now) ? performance.now() : Date.now();
  observeZones();

  /* HELLO FIRST, THEN THE SECTION. Landing straight on the hero's line means
     Levi never introduces himself; speaking over the hello a beat later means
     nobody reads it. So he says one line about arriving, holds it long enough
     to be read, and only then reads the section the visitor is actually in.
     Second page of the same session gets states.returning instead, which is
     the shorter one, because the introduction has already happened. */
  var hello = voice("state", (V && V.returning) ? "returning" : "arrival");
  if (hello) {
    greeting = true;
    speak(hello, { glow: 3.2 });
    window.setTimeout(function () {
      greeting = false;
      if (!dismissed) { zoneName = null; arrive(dominantZone()); }
    }, REDUCED ? 700 : 2400);
  } else {
    arrive(dominantZone());   /* geometric, so this is correct straight away */
  }
  /* THE OBSERVER'S FIRST CALLBACK LANDS AFTER THIS LINE, so at init every ratio
     is still 0, no zone wins and Levi starts quiet - measured, it stayed silent
     at y0 until the visitor scrolled, which is the worst possible first
     impression. Read again once the observer has actually reported. */
  /* THESE MUST NOT TALK OVER THE GREETING. Both fire while the hello is still
     being read, both see zoneName null because the greeting deliberately does
     not set one, and the 260ms one was measured replacing "I am Levi" with the
     section line before anyone could have read it - and spending the section's
     first line, the one the set says to keep strongest, on a box that was on
     screen for a quarter of a second. */
  window.setTimeout(function () { if (!zoneName && !greeting) arrive(dominantZone()); }, 260);
  window.setTimeout(function () { if (!zoneName && !greeting) arrive(dominantZone()); }, 900);
  if (zone) { retarget(); p.x = goal.x; p.y = goal.y; retarget(); write(p.x, p.y); }

  if (BOOTING) {
    root.classList.add("is-boot");
    say.classList.add("is-boot");
    note.style.opacity = "0";
    window.addEventListener("cognivex:cold-start-done", function () {
      root.classList.remove("is-boot");
      say.classList.remove("is-boot");
      note.style.opacity = "";
      arrive(dominantZone());
      run();
    }, { once: true });
  } else {
    run();
  }
  }   /* end startLevi */

  window.cognivexLevi = {
    root: root, say: say, star: star, speech: speech, note: note,

    /* FOR levi-demo.js, which owns the running commentary but owns no UI.
       It decides WHAT to say and WHAT to point at; everything about how the
       light moves and where the words are allowed to land stays in here. */
    speak: function (text, how) { return speak(text, how); },
    voice: function (kind, key) { return voice(kind, key); },
    leanTo: leanTo,
    releaseLean: releaseLean,
    /* Always present, even before the gate opens, so a check can tell the
       difference between "not started yet" and "not here at all". */
    started: function () { return started; },
    zones: zoneTable,
    frame: frame,
    ratios: function () { return ratio; },
    gesture: function () { gesture(); },
    forceIdle: function () { lastActivity = -1e9; checkIdle(1e9); },
    /* Read the position immediately, skipping the debounce - for verification
       only; a visitor always gets the debounced read. */
    readNow: function () {
      if (settleT) window.clearTimeout(settleT);
      arrive(dominantZone());
      return zoneName;
    },
    readPosition: readPosition,
    settle: function () {
      frozen = true;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      settleNow();
      return { x: Math.round(p.x), y: Math.round(p.y) };
    },
    unfreeze: function () { frozen = false; run(); },

    /* DRIVE THE SIMULATION BY HAND. Verification only.

       The browser pane this is developed against starves requestAnimationFrame
       to roughly one frame per half second, and it changes state between tool
       calls - so no motion check against it can be trusted, and several were
       wrong in both directions before anyone noticed. This runs the REAL step()
       over the REAL DOM with the REAL zone geometry, at whatever timestep is
       asked for, with no dependence on the host actually painting.

       dtMs is deliberately unvalidated: passing a negative, zero or absurd
       value is how the guards get tested. */
    tick: function (dtMs, frames) {
      var n = Math.max(1, frames | 0 || 1);
      var d = (typeof dtMs === "number") ? dtMs : 16.7;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      ticking = true;
      var t = lastT || 0;
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, peak = 0;
      for (var i = 0; i < n; i++) {
        t += d;
        step(t);
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
        var sp = Math.hypot(v.x, v.y); if (sp > peak) peak = sp;
      }
      ticking = false;
      lastT = t;
      return {
        x: Math.round(p.x), y: Math.round(p.y),
        vx: Math.round(v.x), vy: Math.round(v.y),
        goal: Math.round(goal.x) + "," + Math.round(goal.y),
        bounds: [Math.round(minX), Math.round(minY), Math.round(maxX), Math.round(maxY)],
        peakSpeed: Math.round(peak),
        finite: isFinite(p.x) && isFinite(p.y) && isFinite(v.x) && isFinite(v.y),
        frames: frame.frames
      };
    },
    restingPoint: function () {
      var z = dominantZone();
      if (!z) return null;
      zone = z.el; retarget();
      return { x: Math.round(goal.x), y: Math.round(goal.y) };
    },
    stats: function () {
      var r = zone ? zone.getBoundingClientRect() : null;
      var sr = speech.getBoundingClientRect();
      var cr = root.querySelector(".levi__core").getBoundingClientRect();
      var vw = document.documentElement.clientWidth;
      var vh = document.documentElement.clientHeight;
      return {
        viewport: vw + "x" + vh,
        zone: zoneName,
        quiet: say.classList.contains("is-quiet"),
        line: sayEl.textContent,
        state: STATES.filter(function (s) { return root.classList.contains(s); })[0] || null,
        zoneRect: r ? { l: Math.round(r.left), t: Math.round(r.top),
                        w: Math.round(r.width), h: Math.round(r.height) } : null,
        starAt: { x: Math.round(p.x), y: Math.round(p.y) },
        coreSize: Math.round(cr.width) + "x" + Math.round(cr.height),
        starRadius: starR(),
        starOnScreen: p.x > 0 && p.x < vw && p.y > 0 && p.y < vh,
        starRendering: cr.width > 0 &&
          parseFloat(getComputedStyle(root.querySelector(".levi__core")).opacity) > 0.05,
        lineBox: { l: Math.round(sr.left), t: Math.round(sr.top),
                   w: Math.round(sr.width), h: Math.round(sr.height) },
        lineFullMeasure: Math.round(sr.width) >= lineW() - 2,
        distanceToNearestEdge: Math.round(Math.min(
          sr.left, vw - sr.right, p.x - starR(), vw - (p.x + starR()))),
        starInsideZone: !!(r && p.x - starR() >= r.left - 1 && p.x + starR() <= r.right + 1),
        lineInsideZone: !!(r && sr.left >= r.left - 1 && sr.right <= r.right + 1),
        layout: stacked ? "stacked" : "beside",
        hasCard: !!document.querySelector(".levi__card"),
        hasCounter: !!document.querySelector(".levi__pos"),
        dismissed: dismissed
      };
    }
  };
})();
