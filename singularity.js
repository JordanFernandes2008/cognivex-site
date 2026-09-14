/* ============================================================================
   THE SINGULARITY — the hero

   It is the first thing on the page and it sits behind the headline, so every
   decision here is subordinate to one rule: THE TYPE HAS TO WIN. The shape of
   this object is what makes that possible — a black hole seen near edge-on is
   mostly empty, with its light concentrated into a thin horizontal band and a
   tight ring. There is more usable dark space in this composition than in any
   flat colour, provided the band is put where the words are not.

   CALIBRATED, NOT GUESSED. The proportions and the colour ramp are measured
   off a reference rendering and written here as fractions, so they survive any
   viewport:

     shadow radius        8.1% of frame height
     photon ring peak    11.2%   -> the ring sits at 1.38x the shadow radius,
                                    not the textbook 1.5
     disk thickness      11.4%   at three hundred pixels out
     disk width          48.4% of frame width
     ramp, ring outward   white -> yellow -> orange -> deep red

   The red is the part that was missing. A two-stop warm-to-white ramp gives a
   glowing ring and a disk that fades to nothing; holding saturated red right
   out to the edge is most of why the reference reads as MATTER rather than as
   light.

   TECHNIQUE. Real lensing wants a raymarched geodesic per pixel, which at this
   resolution is several million integrations a frame. The deflection of light
   in the weak field is analytic, proportional to Rs/b, so the ray offset is
   computed in closed form: one divide per pixel, it runs on integrated
   graphics, and at this scale it is indistinguishable.

   FIVE FAULTS ALREADY PAID FOR, each noted where it applies: an additive pass
   cannot draw black; an additive pass with flat alpha turns a transparent
   canvas opaque; aspect-correcting a square quad squashes the shadow into an
   ellipse; choosing a scale rather than solving one from the camera puts the
   viewport inside the event horizon; and a drawing buffer sized against a
   stale height shows as a hard horizontal seam across the middle of the scene.
   ========================================================================== */
(function () {
  "use strict";

  var host = document.querySelector("[data-singularity]");
  if (!host) return;

  var canvas = host.querySelector(".singularity__canvas");
  if (!canvas) return;

  var REDUCED = window.matchMedia &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function hasWebGL() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext &&
                (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }

  /* The CSS rendition underneath is a designed state, not a failure state, so
     every path that declines to run WebGL simply leaves it showing. It is also
     what paints the hero for the second before three.js arrives, which is why
     it is drawn UNDER the canvas rather than swapped for it. */
  var capable = !REDUCED &&
                hasWebGL() &&
                window.innerWidth >= 720 &&
                (navigator.deviceMemory === undefined || navigator.deviceMemory >= 4) &&
                (navigator.hardwareConcurrency === undefined || navigator.hardwareConcurrency >= 4);

  /* ---- WHERE THE SCENE IS VISIBLE ------------------------------------

     The layer is fixed and the document scrolls through it, so what decides
     whether it is on is which ROOM you are in — not how far down the page you
     have got. There are two: the hero and the dark morning. Between them the
     page's light sections are opaque and cover the layer anyway.

     One object seen twice, which is the whole reason for making it a layer.

     THIS RUNS ON EVERY PATH, above the capability gate. It sets the page's own
     dark GROUND, which is chrome and not scenery: when the gate declined WebGL
     it used to return before this ran, --void-ground stayed at its 0 default,
     and the hero lost its background entirely — light grey type on white paper,
     unreadable, on exactly the modest devices that get the fallback. */
  var visible = -1;
  var rooms = [".hero__void", ".tuesday--dark"]
    .map(function (s) { return document.querySelector(s); })
    .filter(Boolean);

  function measureRooms() {
    var best = 0;
    for (var i = 0; i < rooms.length; i++) {
      var r = rooms[i].getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= window.innerHeight) continue;
      /* How much of the viewport this room covers, ramped rather than switched:
         a cut here would flash the whole page's ground. */
      var covered = (Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)) /
                    window.innerHeight;
      best = Math.max(best, Math.min(1, covered / 0.55));
    }
    if (Math.abs(best - visible) < 0.004) return;
    visible = best;
    host.style.setProperty("--void-ground", visible.toFixed(3));
    host.style.setProperty("--void-scene", visible.toFixed(3));
  }
  measureRooms();
  window.addEventListener("scroll", measureRooms, { passive: true });
  window.addEventListener("resize", measureRooms);

  if (!capable) { host.classList.add("is-static"); return; }

  /* This is the HERO: above the fold by definition, so there is no observer to
     get wrong and nothing to wait for. But three.js is 603KB and must not
     block first paint, so it is fetched async after load and faded in when it
     arrives. */
  if (document.readyState === "complete") load();
  else window.addEventListener("load", load);

  function load() {
    if (window.THREE) { start(); return; }
    var s = document.createElement("script");
    s.src = "vendor/three.min.js";
    s.async = true;
    s.onload = start;
    s.onerror = function () { host.classList.add("is-static"); };
    document.head.appendChild(s);
  }

  /* ====================================================================== */
  function start() {
    if (!window.THREE) { host.classList.add("is-static"); return; }

    var THREE = window.THREE;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: false,          /* nothing here has a hard edge to alias */
        alpha: true,
        powerPreference: "high-performance"
      });
    } catch (e) { host.classList.add("is-static"); return; }

    renderer.setClearColor(0x000000, 0);
    var sc = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);

    /* Measured proportions, in QUAD UNITS: the quad spans -1..1 on both axes.
       They live in JS and are injected into the shader rather than written
       twice, because the frame loop sizes the quad FROM them — and two copies
       of these numbers is how a composition ends up correct in the shader and
       wrong on the screen. */
    var HOLE = {
      rs:      0.115,     /* event horizon                                    */
      ringAt:  1.38,      /* photon ring / shadow radius. MEASURED: 88px and
                             121px on the reference frame.                    */
      diskIn:  0.20,
      diskOut: 0.92       /* the reference holds colour right out to the frame
                             edge, so the disk runs much further than the 0.66
                             this used to stop at.                            */
    };

    var uniforms = { uTime: { value: 0 }, uPresence: { value: 0 } };

    var VERT = [
      "varying vec2 vUv;",
      "void main() {",
      "  vUv = uv;",
      "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
      "}"
    ].join("\n");

    var glow = new THREE.ShaderMaterial({
      uniforms: uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      /* PREMULTIPLIED, deliberately. Three's additive blend is src=SRC_ALPHA,
         dst=ONE unless this is set, which multiplies colour by alpha a second
         time and squares the falloff — the disk's outskirts disappear into it.
         Premultiplied additive is src=ONE, dst=ONE: linear light, and the
         alpha channel is then free to do its real job, which is telling the
         compositor how much of the page underneath still shows. */
      premultipliedAlpha: true,
      vertexShader: VERT,
      fragmentShader: [
        "precision highp float;",
        "varying vec2 vUv;",
        "uniform float uTime, uPresence;",

        /* ---- the measured ramp -------------------------------------------
           t = 0 at the hottest part of the ring, 1 at the far edge of the
           disk. Four stops sampled off the reference. The red at the end is
           what makes the outer disk read as matter instead of as a fade. */
        "vec3 ramp(float t){",
        "  t = clamp(t, 0.0, 1.0);",
        "  vec3 w = vec3(0.969, 0.992, 0.941);",
        "  vec3 y = vec3(0.969, 0.894, 0.537);",
        "  vec3 o = vec3(0.941, 0.639, 0.376);",
        "  vec3 d = vec3(0.863, 0.275, 0.302);",
        "  if (t < 0.22) return mix(w, y, t / 0.22);",
        "  if (t < 0.52) return mix(y, o, (t - 0.22) / 0.30);",
        "  return mix(o, d, (t - 0.52) / 0.48);",
        "}",

        /* Value noise without a sin: two disk samples at three octaves with
           four corner lookups each is twenty-four transcendental calls per
           pixel inside the disk, and sin is among the most expensive
           instructions available. This is pure multiply and fract. */
        "float hash(vec2 v){",
        "  vec3 p3 = fract(vec3(v.xyx) * 0.1031);",
        "  p3 += dot(p3, p3.yzx + 33.33);",
        "  return fract((p3.x + p3.y) * p3.z);",
        "}",
        "float noise(vec2 v){",
        "  vec2 i = floor(v), f = fract(v);",
        "  f = f * f * (3.0 - 2.0 * f);",
        "  return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),",
        "             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);",
        "}",
        /* Three octaves, not four: the fourth is sub-pixel at every scale this
           is ever drawn at, and costs a quarter of the noise budget to produce
           detail nobody can resolve. */
        "float fbm(vec2 v){",
        "  float s = 0.0, a = 0.5;",
        "  for (int k = 0; k < 3; k++) { s += a * noise(v); v *= 2.03; a *= 0.5; }",
        "  return s;",
        "}",

        /* ---- the disk ----------------------------------------------------
           Near edge-on, so the squash is small and the thing is a BAND:
           measured at 11.4% of frame height thick against 48.4% of frame width
           wide, a ratio of about one to eight, which is what squash encodes.
           That narrowness is the entire reason this object can sit behind a
           headline — it leaves most of the frame genuinely empty. */
        "vec3 disk(vec2 q, float squash, float gain){",
        "  vec2 d = q * vec2(1.0, 1.0 / squash);",
        "  float r = length(d);",
        "  float inner = " + HOLE.diskIn.toFixed(3) + ", outer = " + HOLE.diskOut.toFixed(3) + ";",
        "  float band = smoothstep(inner, inner + 0.03, r) * (1.0 - smoothstep(outer - 0.55, outer, r));",
        /* Early-out before any noise: most of the quad is outside the annulus,
           and this is what keeps the shader affordable. */
        "  if (band <= 0.002) return vec3(0.0);",
        "  float a = atan(d.y, d.x);",
        /* Differential rotation — the inner edge orbits faster, which is what
           makes the disk shear instead of turning like a plate. */
        "  float orbit = uTime * (0.62 / max(r, 0.20));",
        "  float turb = fbm(vec2(a * 4.2 + orbit, r * 9.0 - orbit * 0.3));",
        "  turb = turb * turb * 1.85;",
        "  band *= 0.22 + 1.15 * turb;",
        /* Relativistic beaming: the limb rotating toward the viewer is
           brighter. Without it the disk is symmetrical and wrong. */
        "  float beam = cos(a - 1.5707963);",
        "  band *= 1.0 + 1.15 * beam;",
        /* Position along the measured ramp: hot at the inner edge, red at the
           outer. Doppler pushes the approaching limb up the ramp toward white,
           which is colour as well as brightness — beaming the intensity alone
           leaves an evenly orange band with a bright patch on it, and that
           reads as a lighting mistake rather than as relativity. */
        "  float t = smoothstep(inner, outer * 0.78, r) - max(beam, 0.0) * 0.22;",
        "  return ramp(t) * band * gain;",
        "}",

        "void main(){",
        /* NO ASPECT TERM. The quad is SQUARE in world space, so multiplying x
           by the viewport aspect corrects nothing — it squashes the shadow into
           a horizontal ellipse by the full aspect ratio. On a 16:9 monitor the
           event horizon renders 1.78 times taller than it is wide, and a black
           hole's shadow is the one shape here not allowed to be an oval. */
        "  vec2 p = (vUv - 0.5) * 2.0;",
        "  float r = max(length(p), 1e-4);",

        "  float rs = " + HOLE.rs.toFixed(3) + ";",
        "  float ring = rs * " + HOLE.ringAt.toFixed(3) + ";",

        /* Weak-field deflection, analytic. The ray is pushed outward in screen
           space by an amount falling off as 1/b, which is what makes the disk
           appear to wrap around the shadow. */
        "  float bend = (rs * rs) / (r * r);",
        "  vec2 q = p * (1.0 + bend * 2.35);",

        /* Eight degrees of tilt. The whole difference between an object with an
           axis and a graphic device, for the cost of two constants. */
        "  const float ca = 0.99027, sa = 0.13917;",
        "  q = vec2(q.x * ca - q.y * sa, q.x * sa + q.y * ca);",

        "  vec3 col = vec3(0.0);",
        /* The disk proper, lying almost flat. */
        "  col += disk(q, 0.135, 1.25);",
        /* Its far side, lensed up over the top and down under the bottom. THIS
           IS WHAT CLOSES THE RING around the shadow, and the previous build had
           it at a fifth of the strength it needed — without it you get a bright
           band with a black dot sitting on it, rather than a hole with light
           bent the whole way around it. */
        "  col += disk(q, 1.30, 0.70);",

        /* ---- the photon ring ---------------------------------------------
           Light that orbited the hole before escaping, at the MEASURED 1.38
           times the shadow radius. Thin, the brightest thing in frame, and
           carrying a halo — a hairline alone aliases to a dotted circle at
           small sizes and reads as a drawn stroke at large ones. */
        "  float rw = rs * 0.085;",
        "  float core = smoothstep(rw, 0.0, abs(r - ring));",
        "  float halo = exp(-abs(r - ring) / (rs * 0.55));",
        /* Brighter than it looks like it should be. The ring is the brightest
           thing in the reference by a wide margin — measured at luminance 248
           against 167 for the hottest part of the disk — and at parity it
           stops reading as the thing the light is bending around. */
        "  col += ramp(0.0) * core * 3.10;",
        "  col += ramp(0.14) * halo * 0.66;",

        /* A soft vertical bloom above and below the ring, which is the
           atmosphere the reference has and a bare ring does not. Narrowed
           toward the sides so it does not wash the whole band out. */
        "  float bloom = exp(-abs(r - ring) / (rs * 2.6)) * max(1.0 - abs(p.x) * 0.55, 0.0);",
        "  col += ramp(0.30) * bloom * 0.14;",

        /* The shadow. Nothing comes out, so nothing is added. */
        "  col *= smoothstep(rs, rs + 0.006, r);",

        /* Fade the quad's own edge so it never shows as a rectangle. */
        "  float vig = 1.0 - smoothstep(0.86, 1.0, r);",

        /* THE CANVAS IS TRANSPARENT and its alpha is what lets the page show
           through it, so this cannot be flat. Writing 1 turns the quad into an
           opaque black rectangle over everything it covers — and it covers more
           than the frame. Alpha is the luminance: as much of the page is hidden
           as there is light to hide it. */
        "  float lum = clamp(max(max(col.r, col.g), col.b), 0.0, 1.0);",
        "  gl_FragColor = vec4(col * vig * uPresence, lum * vig * uPresence);",
        "}"
      ].join("\n")
    });

    /* --------------------------------------------------------------------
       THE SHADOW HAS TO BE OPAQUE, AND AN ADDITIVE PASS CANNOT DRAW BLACK.

       Adding zero leaves whatever was already there, so masking the glow to
       nothing inside the horizon does not produce a shadow — it produces a
       clear hole with a bright ring around it and the page plainly visible
       through the middle. A black hole you can see through is a sticker.

       Its own normally-blended pass, drawn first. depthWrite off, because two
       coplanar quads would fight; depth TESTING on, which is what makes it
       behave like an object.
       -------------------------------------------------------------------- */
    var coreMat = new THREE.ShaderMaterial({
      uniforms: { uPresence: uniforms.uPresence },
      transparent: true,
      depthWrite: false,
      vertexShader: VERT,
      fragmentShader: [
        "precision mediump float;",
        "varying vec2 vUv;",
        "uniform float uPresence;",
        "void main(){",
        "  vec2 p = (vUv - 0.5) * 2.0;",
        "  float r = length(p);",
        "  float rs = " + HOLE.rs.toFixed(3) + ";",
        /* Barely feathered, and the seam sits exactly where the photon ring is
           drawn over it, so it is never seen. */
        "  float inside = 1.0 - smoothstep(rs - 0.004, rs + 0.004, r);",
        "  gl_FragColor = vec4(0.0, 0.0, 0.0, inside * uPresence);",
        "}"
      ].join("\n")
    });

    var quad = new THREE.PlaneGeometry(2, 2);
    var core = new THREE.Mesh(quad, coreMat);
    core.frustumCulled = false; core.renderOrder = 1; sc.add(core);
    var hole = new THREE.Mesh(quad, glow);
    hole.frustumCulled = false; hole.renderOrder = 2; sc.add(hole);

    /* ------------------------------------------------------------------ fit

       Measured off the ELEMENT, and re-measured whenever it could have
       changed. The hard horizontal seam that appeared across the middle of the
       previous build was exactly this: the drawing buffer had been sized
       against one height, the CSS box had since become another, and the buffer
       was being scaled into the box — so the join showed as a straight line
       with brighter content above it than below.

       A window resize event is not the only way this box changes size: a font
       arriving, the sticky masthead settling, or the app surface below it
       laying out will all do it without one, which is why a ResizeObserver
       watches the element itself. */
    var W = 0, H = 0;
    function resize() {
      /* The layer IS the viewport now — it is position:fixed and inset:0 — so
         it is measured against the window rather than against a section that
         could be any height. */
      var w = window.innerWidth;
      var h = window.innerHeight;
      if (!w || !h || (w === W && h === H)) return;
      W = w; H = h;
      /* Capped rather than raw: a 3x screen would otherwise render nine times
         the pixels for a background nobody is studying. */
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      renderer.setSize(W, H, false);
      camera.aspect = W / Math.max(H, 1);
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener("resize", resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(host);

    /* The copy used to be measured here to drive an inline --scrim-end custom
       property on .hero__void. Nothing in the stylesheet has read that variable
       since the scrim was deleted, so it was re-measuring the headline on every
       resize and font load to set a value with no consumer - and it still
       showed up in the inspector, which made it look like a live scrim.
       Removed along with the band it used to position. */

    /* ---------------------------------------------------------------- state */
    var scrollP = 0;
    function smoothstep(a, b, x) {
      var t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    }

    /* Room visibility is measured OUTSIDE this function — see measureRooms
       above. It governs the page's own ground, which has to work whether or not
       there is ever a scene to put on it. */

    /* ------------------------------------------------------------------ loop */
    var clock = 0, raf = null, onScreen = true, born = 0;

    document.addEventListener("visibilitychange", function () {
      onScreen = !document.hidden;
    });
    /* Off-screen the loop stops entirely. A GPU running for a canvas nobody can
       see is pure battery cost. */
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { onScreen = e.isIntersecting && !document.hidden; });
    }, { threshold: 0 }).observe(host);

    var camFwd = new THREE.Vector3();

    function frame() {
      raf = window.requestAnimationFrame(frame);
      if (!onScreen) return;
      /* Neither room on screen: the layer is invisible and the page's opaque
         sections are over it, so there is nothing to draw. This is most of the
         page. */
      if (visible < 0.005 && born >= 1) return;
      clock += 0.0055;
      born = Math.min(1, born + 0.012);

      /* Arrives once, holds, and dims as the hero is left behind. It does not
         re-arrive on the way back up: this is a hero, not an event. */
      /* Born once, then it follows whichever room you are in. The layer's own
         opacity is doing the same fade in CSS, so this only has to stop the
         shader costing anything once the scene is fully hidden. */
      /* DIMMER, WHICH IS THE ONLY LEVER LEFT THAT HAS NO EDGES.

         Three things were wanted at once: no dark box behind the words, a large
         subject, and it near the middle. With the headline occupying 37% to 52%
         of the viewport and the ring's radius near 18% of the frame, those three
         cannot all hold — pushed far enough down to clear the type, the disk
         leaves the bottom of the frame; left centred, it burns through the first
         line. Measured both.

         So the scene gives up brightness rather than size or position. A box has
         a boundary and reads as a panel; a dimmer scene has neither and reads as
         atmosphere, which is what a hero background should be when there are
         words in front of it. The disk stays 1.15 of the frame's width. */
      /* FULL BRIGHTNESS on landscape. It was dimmed to 0.5 only because it was
         burning through the headline; with the copy in its own column there is
         nothing left to burn through. */
      var presence = smoothstep(0, 1, born) * Math.max(visible, 0.001)
                   * (portrait ? 0.5 : 1);

      /* Held at a fixed distance. The hero does not fly anywhere — it breathes,
         so the frame is never completely still and never travelling either. */
      var dist = 30 - Math.sin(clock * 0.22) * 0.7;
      var frameH = 2 * Math.tan(camera.fov * Math.PI / 360) * dist;
      var frameW = frameH * camera.aspect;

      /* COMPOSITION, stated the way it is judged rather than as a scale factor,
         and solved from the camera. Two constraints, and the tighter one wins:
         the disk must not run off the sides, and the shadow must not swallow
         the frame. On a wide monitor the first binds, on a square window the
         second — which is why one hand-tuned scale is always right on one
         viewport and absurd on the next. Choosing scale directly is what once
         left the event horizon measuring 6.5 world units across a frame 5.4
         units high: the viewport sat INSIDE the shadow, and a shadow draws
         nothing, so the scene rendered a black hole by rendering nothing.

         0.162 of frame height is the measured shadow diameter. */
      /* BIG, and the disk deliberately RUNS OFF THE SIDES.

         Every version until now solved for "the disk must fit inside the
         frame", which is why it kept reading as a picture of a black hole
         placed on a page. The reference this is chasing lets its subject
         overflow the frame on purpose — type cut off by the right edge, media
         bleeding past both — and that overflow is what makes a thing read as
         bigger than the window you are looking at it through.

         So the disk is now 1.28 of the frame's WIDTH: its outer reaches leave
         the frame on both sides, and the eye completes it. The shadow goes to
         26% of the frame's height, which is roughly two and a half times what
         it was. */
      /* PORTRAIT IS A DIFFERENT COMPOSITION, not the same one squeezed.

         On a tall screen the copy takes the upper half and there is no room
         left for a large centred subject: measured at 390x760, the headline
         occupies 38.7% to 55.9% of the viewport and the ring spans roughly 32%
         to 68%, so the brightest arc ran straight through the second word. The
         scrim that used to hide that collision has been removed, because a dark
         box behind the words is worse than the problem it solves.

         So on portrait the scene steps back instead: smaller, and dimmer, so it
         reads as atmosphere behind the type rather than an object competing
         with it. The type wins, which was always the rule. */
      var portrait = camera.aspect < 1;

      /* THE DISK'S OUTER DIAMETER IS THE NUMBER THAT GETS STATED, and the
         scale is solved backwards from it.

         The previous solver governed on max(frameW, frameH * 0.95) and asked
         for 1.28x of that, which at 16:9 resolved to hs = 0.636 * frameW and
         an outer diameter of 1.84 * 0.636 = 1.17 * frameW. The disk was WIDER
         THAN THE FRAME. Both arms ran off the sides, so what reached the
         screen was not a ring around anything - it was a bright bar smeared
         across the top of the hero, cut off hard at the masthead. No amount of
         darkening behind the type fixes that, which is why three passes of
         scrims and shadows kept almost-working and never working.

         So: state the span, derive the scale. 0.70 on landscape puts the arm's
         left edge at 41% of the frame width while the copy column tops out at
         40rem - 33% at 1920 - so the glow and the words never meet, and the
         right arm bleeds 11% off the edge so the object reads as continuing
         past the frame rather than as a sticker centred in it. */
      var diskSpan = portrait ? 0.80 : 0.64;
      var hs = (diskSpan * frameW) / (2 * HOLE.diskOut);

      camera.position.set(0, 0, 6);
      camera.rotation.z = Math.sin(clock * 0.17) * 0.012;
      camera.lookAt(0, 0, -40);

      camFwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
      hole.position.copy(camera.position).addScaledVector(camFwd, dist);
      /* IT SITS BELOW THE HEADLINE ON BOTH, and the reason is worth recording.

         The scrim and the per-glyph shadows were removed because they rendered
         as a dark box, which was worse than what they fixed. That left the
         bright band crossing the type on landscape as well as portrait — and I
         nearly missed it, because the frame I first checked had presence 0: the
         inspector pane had paused the render loop, so I was reading legibility
         off a picture with no scene in it. Rechecked awake, the first line was
         washed out.

         So the subject moves rather than the words getting a panel. MEASURED at
         1536x864: the headline runs 34% to 49% of the viewport and the ring's
         radius is about 17.6% of the frame, so a centre at roughly 67% puts the
         ring's top edge clear of the last line. The shadow then sits low-centre
         and still reads as the middle of the composition at this size. */
      /* RIGHT, not down. On landscape the copy owns the left 54%, so the scene
         takes the right and the vertical fight is over. Portrait has no second
         column, so there it drops below the copy instead. */
      if (portrait) {
        hole.position.y -= frameH * 0.18;
      } else {
        /* Right column, and level. It sat at +10% of the frame height before,
           which pushed the oversized disk's arm into the top seam; now that it
           fits, the middle of the frame is where it belongs. */
        hole.position.x += frameW * 0.34;
        hole.position.y -= frameH * 0.02;
      }
      /* DEAD CENTRE, and the layout is what moves instead.

         Every previous version pushed the hole down the frame to get it out of
         the copy's way, and every one of them read as a thing that had been
         shoved aside. It is the subject: it belongs in the middle.

         So the copy gets out of ITS way instead. The band is thin — measured at
         11.4% of frame height against 48.4% of width — which means a centred
         hole divides the hero into three usable strips rather than occupying
         it: headline above, band across, supporting copy below. The gap in the
         middle of the copy is sized in site.css from the same numbers, and the
         scrim has a clear window cut through it at the same place. */
      hole.quaternion.copy(camera.quaternion);
      hole.scale.set(hs, hs, 1);

      core.position.copy(hole.position);
      core.quaternion.copy(hole.quaternion);
      core.scale.copy(hole.scale);

      uniforms.uPresence.value = presence;
      uniforms.uTime.value = clock * 6.0;

      renderer.render(sc, camera);
    }

    /* The CSS rendition is only stood down once there is something to replace
       it with. */
    host.classList.add("is-live");
    frame();

    /* A handle for verification. renderer.info reports what was actually
       submitted and is free; readPixels is not a sound check, because WebGL
       clears the drawing buffer after compositing unless preserveDrawingBuffer
       is set, so a read at an arbitrary moment returns zeros whether or not
       anything was drawn. */
    window.cognivexSingularity = {
      renderer: renderer, scene: sc, camera: camera, hole: hole,
      stats: function () {
        var gl = renderer.getContext();
        var fH = 2 * Math.tan(camera.fov * Math.PI / 360) * 30;
        return {
          presence: +uniforms.uPresence.value.toFixed(3),
          scrollProgress: +scrollP.toFixed(3),
          drawCalls: renderer.info.render.calls,
          cssBox: W + "x" + H,
          drawingBuffer: gl.drawingBufferWidth + "x" + gl.drawingBufferHeight,
          /* The two numbers that decide whether the composition works at all.
             At or above 1 it has left the screen. */
          shadowOfFrameHeight: +((2 * HOLE.rs * hole.scale.x) / fH).toFixed(3),
          diskOfFrameWidth: +((2 * HOLE.diskOut * hole.scale.x) / (fH * camera.aspect)).toFixed(3),
          ringOverShadow: HOLE.ringAt,
          glError: gl.getError()
        };
      }
    };

    window.addEventListener("pagehide", function () {
      if (raf) window.cancelAnimationFrame(raf);
      quad.dispose(); glow.dispose(); coreMat.dispose();
      renderer.dispose();
    });
  }
})();
