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

  var K = 150, D = 17, MAX_DT = 1 / 30;

  /* FLIGHT, MEASURED. Four frames of the reference about 1.2s apart put its
     character at 415, 372 and 645 px of travel per step - roughly 310 to 540
     px/s, never a straight line between two points, and always decelerating
     into where it stops rather than snapping there.

     MAXF is the important one. A spring can change direction instantly if the
     target jumps; a thing with mass cannot, and that limit is most of what
     separates flying from being dragged. */
  var MAXV = 520;      /* px/s cruise ceiling                                */
  var MAXF = 2400;     /* px/s^2 - how hard it can turn or accelerate        */
  var SLOW_R = 210;    /* start easing off this far from the target          */
  var ARRIVE_R = 30;   /* inside this it is hovering, not travelling         */
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
    /* Three layers, widest first. No ring: a 2px border, and later a
       radial-gradient annulus, are both a circumference - the one thing a
       light does not have. */
    '<i class="levi__flare"  aria-hidden="true"></i>' +
    '<i class="levi__corona" aria-hidden="true"></i>' +
    '<i class="levi__core"   aria-hidden="true"></i>';

  /* No shadow element any more - the chatbox replaced it. */

  var say = document.createElement("div");
  say.className = "levi-say is-quiet";

  var speech = document.createElement("div");
  speech.className = "levi__speech";
  speech.innerHTML =
    '<b class="levi__who">Levi</b>' +
    '<p class="levi__line"><span data-levi-say></span><i class="levi__caret" aria-hidden="true"></i></p>';

  root.appendChild(star);
  say.appendChild(speech);
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
    if (dismissed) return;
    drag = { id: e.pointerId, x: p.x, y: p.y, ox: e.clientX - p.x, oy: e.clientY - p.y };
    dragMoved = 0;
    try { star.setPointerCapture(e.pointerId); } catch (err) {}
    root.classList.add("is-held");
    noteActivity();
    speak(voice("state", "grabbed"));
  });

  star.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var nx = e.clientX - drag.ox, ny = e.clientY - drag.oy;
    dragMoved += Math.abs(nx - drag.x) + Math.abs(ny - drag.y);
    drag.x = nx; drag.y = ny;
    if (dragMoved > 4) e.preventDefault();
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
    speak(voice("state", bad ? "droppedBad" : "droppedOk"));
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
  function sayLine(text) {
    if (typeT) { window.clearInterval(typeT); typeT = null; }
    if (REDUCED) { sayEl.textContent = text; speech.classList.add("is-done"); return; }
    sayEl.textContent = "";
    speech.classList.remove("is-done");
    var i = 0;
    typeT = window.setInterval(function () {
      i += 2;
      sayEl.textContent = text.slice(0, i);
      if (i >= text.length) {
        window.clearInterval(typeT); typeT = null;
        speech.classList.add("is-done");
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
    say.classList.remove("is-quiet");
    root.classList.remove("is-quiet");
    setState(how.state || "speaking");
    sayLine(text);
    if (how.glow) glow = how.glow;
    lastActivity = (window.performance && performance.now) ? performance.now() : Date.now();
    if (REDUCED) settleNow(); else run();
    return true;
  }

  var IDLE_LINES = window.LEVI_IDLE || ["Still here."];

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
    say.style.setProperty("--levi-x", xs);
    say.style.setProperty("--levi-y", ys);
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
  var MARGIN = 12;              /* clearance from the panel and the screen    */

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
  /* WHAT IS ALREADY ON SCREEN, AS LINE BOXES.

     Point sampling was tried first and is wrong for this: seven hit tests
     inside a 328x90 box miss a 93px run of type sitting between them, and
     elementsFromPoint hands back the CONTAINER, whose own direct text is
     empty - `<p class="cap"><span>See it work</span>` returned p.cap, which
     owns no text of its own, so the check passed over the exact element it
     was written to catch. Measured: still on `.cap` at 1250 and on the `em`
     inside `.walk__h` at 1500.

     A Range over an element's contents gives its real line boxes, which is
     the thing a box must not cross - a paragraph whose last line is four
     words wide reports a full-width border box and would silence Levi over
     half the page. Measured at 1536x830: 1,129 candidate elements, 95 line
     boxes on screen, 2.9ms to build and under 0.05ms to test a box against
     them. Per frame the build would be a fifth of the frame; on a 150ms
     throttle it is noise, and the verdict lags a scroll by less than the
     300ms the box takes to fade anyway. */
  var TEXTY = "p,h1,h2,h3,h4,h5,h6,li,dt,dd,blockquote,figcaption,label,td,th," +
              "summary,span,em,strong,b,a,button,small,code,cite,time,legend";
  var lines = { rects: [], at: -1e9, y: -1e9 };

  function visible(el) {
    /* opacity 0 is the data-rise start state - copy that has not arrived yet
       does not get to silence the line. display:none has no rects at all. */
    if (el.checkVisibility) {
      return el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    }
    return true;
  }

  /* THE THROTTLE IS TIME, NOT DISTANCE. The first version also rebuilt on 24px
     of scroll, which during a fast flick is every single frame - 2.9ms of a
     16.7ms budget, spent to answer a question about a box that is usually not
     even being drawn. Time caps it at about seven builds a second; a large
     jump still forces one, because a teleport is not a scroll. */
  /* WHAT THE BOX MUST NOT COVER ON A PHONE.

     On a desktop the answer is all copy, and there is always a column free to
     satisfy it. On a 390px screen the text column IS the screen - 342 of 390 -
     so "never cross copy" resolves to "never speak", and the queue's line was
     suppressed at every scroll position on the phone.

     The box is not transparent. It is 93% opaque with its own border, so copy
     behind it is covered the way a toast covers it, not smeared underneath it,
     and the sentence that made the desktop rule - two texts on top of each
     other are both unreadable - does not apply to it.

     So on a phone the protected set is the demo's own content, which is what
     was actually asked for: the card, the draft, and the three buttons. Their
     whole boxes, not their line boxes, because a card is a solid object rather
     than a run of type. */
  /* THE TICKER IS IN HERE, AND IT IS THE REASON THIS LIST EXISTS AT ALL NOW.

     The last-resort placement is allowed to rest on ordinary copy, because a
     covered paragraph beats an unreadable line. A marquee is not ordinary
     copy. `.ticker` runs a 46s linear loop by design - the brief says so and
     says not to "fix" it - so text slides through anything parked on top of
     it, continuously, forever. Reported as the box bugging out, and the
     screenshot shows it sitting across INVOICE 0142 ... NEWSLETTERS x6 while
     they travel underneath.

     The masthead and the status bar are here for the neighbouring reason:
     both are sticky chrome, and the box is z-index 60 against the masthead's
     40, so it does not pass behind them - it covers them. */
  var GUARDED = ".card, .card__draft, .card__why, .detail__why, .walk__panel," +
                "[data-approve], [data-edit], [data-skip]," +
                ".ticker, .masthead, .statusbar";

  function lineBoxes(now) {
    var y = window.pageYOffset || 0;
    if (now - lines.at < 150 && Math.abs(y - lines.y) < 400) return lines.rects;
    lines.at = now; lines.y = y;
    var de = document.documentElement;
    var vh = de.clientHeight, vw = de.clientWidth;

    var out = [], els = document.querySelectorAll(TEXTY);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (root.contains(el) || say.contains(el)) continue;
      var r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
      if (!/\S/.test(el.textContent) || !visible(el)) continue;
      var rg = document.createRange();
      rg.selectNodeContents(el);
      var rs = rg.getClientRects();
      for (var j = 0; j < rs.length; j++) {
        var q = rs[j];
        if (q.width < 4 || q.height < 4 || q.bottom < 0 || q.top > vh) continue;
        out.push({ l: q.left, t: q.top, r: q.right, b: q.bottom, el: el });
      }
    }
    lines.rects = out;
    return out;
  }

  /* LAID OUT IS NOT PAINTED, AND getBoundingClientRect ONLY KNOWS THE FIRST.

     `.app` is `overflow: hidden` and the approval log inside it is 2,615px of
     content in a 650px panel. Every row below the fold of that panel still
     reports an honest on-screen rect while being clipped to nothing: measured
     at scrollY 2000, with `.app` itself 1,107px above the viewport, 219
     candidate line boxes of which 11 were actually painted. Blocking on the
     other 208 silenced Levi in the walk, tuesday and ledger zones - three
     zones that had just measured clean.

     elementFromPoint respects the clip, so it is the arbiter. Validating all
     219 costs 11.9ms and cannot run on a throttle, let alone a frame; but a
     rect only matters when it intersects the box, which is almost never, so
     the hit test is paid per intersection instead of per rect. */
  function painted(q) {
    var de = document.documentElement;
    var x = Math.max(2, Math.min(de.clientWidth - 2, (q.l + q.r) / 2));
    var y = Math.max(2, Math.min(de.clientHeight - 2, (q.t + q.b) / 2));
    var hit = document.elementFromPoint(x, y);
    if (!hit) return false;
    return hit === q.el || q.el.contains(hit) || hit.contains(q.el);
  }

  /* THE LAST RESORT, AT EVERY WIDTH.

     This was gated to clientWidth <= 1240, on the reasoning that a single
     column has no free gutter while a desktop always does. The number was
     wrong and the reasoning with it. `.app` caps at 1100px and the box needs
     328 plus its margins, so a gutter only holds it from about 1804px of
     viewport upward. Everything between 1240 and 1804 got neither: no gutter
     wide enough, and no fallback either.

     Reported twice from a 1300x620 window, where the demo is 1,100 x 745 -
     taller than the viewport, with 100px gutters - and the box was suppressed
     from scrollY 700 to 1000 with nowhere left to go. Measured: 4 of 15
     sampled positions dark, which is the whole of the interesting part of the
     page.

     So the strict rule stays the PREFERENCE everywhere, and when it produces
     nothing, anything falls back to this: protect what was actually asked for
     - the card, the draft, the three buttons - and let the box rest on
     ordinary copy. It is 93% opaque with its own border, so it covers that
     copy the way a toast does rather than smearing through it, which is the
     thing the strict rule exists to prevent. A line nobody can read is worse
     than a line sitting over a paragraph. */

  function onGuarded(l, t, w, h) {
    var de = document.documentElement;
    var vh = de.clientHeight, vw = de.clientWidth;
    var r = l + w, b = t + h;
    var els = document.querySelectorAll(GUARDED);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (root.contains(el) || say.contains(el)) continue;
      var q = el.getBoundingClientRect();
      if (q.width < 4 || q.height < 4) continue;
      if (q.bottom < 0 || q.top > vh || q.right < 0 || q.left > vw) continue;
      if (!visible(el)) continue;
      if (q.left < r - 1 && q.right > l + 1 && q.top < b - 1 && q.bottom > t + 1) return true;
    }
    return false;
  }

  function onWords(l, t, w, h, now) {
    var rs = lineBoxes(now), r = l + w, b = t + h;
    for (var i = 0; i < rs.length; i++) {
      var q = rs[i];
      if (q.l < r - 1 && q.r > l + 1 && q.t < b - 1 && q.b > t + 1 && painted(q)) return true;
    }
    return false;
  }

  /* HYSTERESIS, BECAUSE THE LIGHT DRIFTS. The wander is a few px per frame and
     a verdict taken on every one of them would fade the box in and out across
     a 300ms transition while it sat still. A verdict has to hold twice before
     it changes anything. */
  var occ = { hit: false, n: 0 };

  /* ==========================================================================
     THE WORDS DO NOT FOLLOW THE BREATHING.

     step() wanders the light every frame - amp 12 idle plus a second sine at
     half that, so roughly +/-18px on a 2.6 second period - and placeBox()
     derived the box from p on every one of those frames. Anywhere near a
     constraint boundary that is fatal: the verdict flips as the light drifts
     across it and back, so the box fades out and in every couple of seconds,
     forever. Reported as flickering, and the 2-frame hysteresis is no defence
     at all against an oscillation measured in seconds.

     So the box is ANCHORED. It is placed when something real changes - the
     section, the scroll, the viewport, the size of the box, or the light
     actually travelling somewhere - and it holds that viewport position while
     the light breathes underneath it. 40px is the threshold because it is
     comfortably above the wander and comfortably below a flight.

     The offsets are still written relative to p, so the light stays the
     origin and nothing here can feed position back into itself. */
  var anchor = null;

  function anchorStale(ox, oy, bw, bh, vw, vh) {
    if (!anchor) return true;
    if (anchor.zone !== zoneName) return true;
    if (anchor.vw !== vw || anchor.vh !== vh) return true;
    if (Math.abs(anchor.bw - bw) > 2 || Math.abs(anchor.bh - bh) > 2) return true;
    if (Math.abs(anchor.sy - (window.pageYOffset || 0)) > 12) return true;
    if (Math.abs(ox - anchor.px) > 40 || Math.abs(oy - anchor.py) > 40) return true;
    return false;
  }

  function boxOnWords(l, t, w, h, now) {
    var hit = onWords(l, t, w, h, now);
    if (hit === occ.hit) { occ.n = 0; return occ.hit; }
    if (++occ.n >= 2) { occ.hit = hit; occ.n = 0; }
    return occ.hit;
  }

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

  function retarget() {
    if (!zoneName) {
      var hold = holdPoint();
      var h = keepOffPanel(hold.x, hold.y);
      goal.x = h.x; goal.y = h.y; laneOffsets(); return;
    }
    /* Re-resolved every frame so the hand-off between two bands of the SAME
       zone happens without a change of line - arrive() returns early when the
       name has not changed, so it would never have swapped the element. */
    var el = zoneEl(zoneName);
    var r = el && visibleSlice(el);
    if (!r) {
      var hp0 = holdPoint();
      var hp = keepOffPanel(hp0.x, hp0.y);
      goal.x = hp.x; goal.y = hp.y; laneOffsets(); return;
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
    goal.x = safe.x; goal.y = safe.y;

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

    /* ---- STEERING, NOT A SPRING --------------------------------------------
       The spring was the reason it read as teleporting. A spring's speed is
       proportional to how far it has to go, so a zone change 900px away threw
       it across the screen in three frames and a change 40px away crawled -
       the same motion at two completely different speeds, neither of them a
       flight. This is the standard arrive-and-wander steering instead: one
       cruise speed whatever the distance, an easing radius at the end, and a
       cap on how fast the velocity itself may change. */
    var tox = gx - p.x, toy = gy - p.y;
    var dist = Math.hypot(tox, toy) || 1;

    /* Full speed until SLOW_R, then ramp down into the target. */
    var want = MAXV * Math.min(1, dist / SLOW_R);
    var wvx = tox / dist * want, wvy = toy / dist * want;

    /* A FIXED PATH, NOT A RANDOM WALK.

       The wander was noise: two sines accumulating into an angle, so the route
       between the same two points was different every time and nothing about
       it could be designed or predicted. This is a deterministic arc instead -
       the bow is always perpendicular to the direction of travel, always the
       same size for the same trip, and it collapses to nothing as Levi closes
       in so the arrival stays exact.

       Same journey, same curve, every time. That is what makes it read as a
       flight path rather than a drunk insect. */
    var nx = tox / dist, ny = toy / dist;      /* unit vector along the route  */

    /* The bow peaks at the MIDDLE of the journey and is zero at both ends, so
       the route is a clean arc from A to B rather than a swerve near one of
       them. It needs the distance the trip STARTED at, not the distance left -
       measuring against the remaining distance put the widest part of the
       curve 210px from the destination, which is a last-second swerve. */
    if (dist > tripD0) tripD0 = dist;          /* a new, longer target          */
    var prog = tripD0 > 1 ? 1 - Math.min(1, dist / tripD0) : 1;
    var reach = Math.min(1, tripD0 / 520);     /* short hops stay straight      */
    var side = ny >= 0 ? 1 : -1;               /* always bow the same way       */
    var arc = Math.sin(prog * Math.PI) * reach * 190 * side;
    wvx += -ny * arc;                          /* perpendicular to travel       */
    wvy +=  nx * arc;
    if (dist < ARRIVE_R) tripD0 = 0;           /* arrived; next trip starts new */

    /* The vertical breath that used to live here is now part of the breath
       LAYER, for the same reason as the bob: it moved p, so it moved every
       number read off p. */

    /* MAXV HAS TO BE A CEILING, NOT A SUGGESTION. The wander is added
       VECTORIALLY on top of a desired velocity that is already at full cruise,
       so on a diagonal the two combined to 709 px/s - measured - against a
       reference character that runs 310-540. Re-normalising here puts the cap
       back where the name says it is, and costs the wander nothing: it still
       bends the path, it just cannot also speed it up. */
    var wm = Math.hypot(wvx, wvy);
    if (wm > MAXV) { wvx = wvx / wm * MAXV; wvy = wvy / wm * MAXV; }

    /* Force limit: mass. Without this the wander becomes a jitter. */
    var fx = wvx - v.x, fy = wvy - v.y;
    var fm = Math.hypot(fx, fy), cap = MAXF * dt;
    if (fm > cap && fm > 0) { fx = fx / fm * cap; fy = fy / fm * cap; }
    v.x += fx; v.y += fy;

    /* Belt and braces. Nothing decorative should be able to leave the page
       whatever the clock does. */
    var sp0 = Math.hypot(v.x, v.y), lim = MAXV * 2.2;
    if (sp0 > lim) { v.x = v.x / sp0 * lim; v.y = v.y / sp0 * lim; }

    /* Hovering, not travelling - bleed off speed so it holds station. */
    if (dist < ARRIVE_R) { v.x *= 0.88; v.y *= 0.88; }

    p.x += v.x * dt; p.y += v.y * dt;

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
    var lift = alt;

    /* The trail: each point chases the one in front, and the whole thing is
       only visible while there is real speed to leave a mark.

       NOT WHEN THE 3D STAR HAS TAKEN OVER. site.css hides .levi__trail under
       .levi.is-3d, so on any machine with WebGL these were six elements being
       repositioned every frame while display:none - twenty-four style writes a
       frame for something nobody can see. */
    if (!REDUCED && !root.classList.contains("is-3d")) {
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
    [".app", ".cta"].forEach(function (sel) {
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

  function arrive(z) {
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
    if (z.name === zoneName) return;          /* already here */
    zone = z.el; zoneName = z.name;
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
    var said = speak(voice("line", z.name), { glow: 3.2 });
    if (said) return;

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
      arrive(dominantZone());
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
    if (!btn) return;
    var r = btn.getBoundingClientRect();
    lure = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    run();
    window.setTimeout(function () {
      setState("approved");
      glow = 3.4;
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
      sayLine(savedLine);
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
    var line = voice("state", IDLE_KEYS[want - 1]);
    idleTier = want;
    if (!line) return;
    /* speak() clears these, and idle is the one caller that must not - the
       saved line is how noteActivity puts the section's sentence back. */
    var keep = savedLine;
    speak(line, { glow: 2.4 });
    savedLine = keep; idleSpoken = true; idleTier = want;
  }

  star.addEventListener("click", function (e) { e.preventDefault(); gesture(); });
  star.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.stopPropagation(); dismiss(); }
  });

  document.addEventListener("pointermove", function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.fresh = 1;
    noteActivity();
  }, { passive: true });
  document.addEventListener("keydown", noteActivity, true);
  document.addEventListener("click", noteActivity, true);

  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-approve]");
    if (!b || REDUCED || dismissed) return;
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
    if (REDUCED) { settleNow(); return; }
    var y = window.pageYOffset || 0, d = y - lastScrollY;
    lastScrollY = y;

    /* PAST A FEW. Said DURING the flick, not after it: by the time the scroll
       settles the visitor has arrived somewhere and that section's own line is
       the right thing to be reading. This one belongs to the travelling. */
    burst += Math.abs(d);
    if (!burstSaid && burst > document.documentElement.clientHeight * 2.5) {
      burstSaid = true;
      speak(voice("state", "scrolledFast"));
    }
    if (burstT) window.clearTimeout(burstT);
    burstT = window.setTimeout(function () { burst = 0; burstSaid = false; }, 400);

    v.y += Math.max(-820, Math.min(820, -d * 7));
    v.x += Math.max(-260, Math.min(260, -d * 1.1));
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
