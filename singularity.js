/* ============================================================================
   THE SINGULARITY

   The one chapter on this page that is an image rather than an argument.

   WHY IT IS HERE. The section above it ends on "four hours before you get to
   the work people actually pay you for." The section below it explains the
   three steps. Between those two the page has to make one thing felt rather
   than stated: that thirty-eight of the forty-one things that arrived this
   morning were never going to need you, and that something has to take them.
   An accretion disk is matter falling into a place it does not come back from,
   heated past incandescence on the way — and this site's signal colour is
   already orange, which is the same colour at ten thousand kelvin.

   WHAT IS DELIBERATELY NOT HERE. No floating paper. An earlier build of the
   demo filled this kind of scene with drifting white and orange cards and it
   was the one thing that got rejected outright, correctly: rectangles tumbling
   past a camera read as a screensaver, and they turned the singularity into
   set dressing behind them. What falls in here is dust — sub-pixel points with
   no readable shape — which is matter, not stationery.

   TECHNIQUE. Real lensing wants a raymarched geodesic per pixel, which at this
   resolution is several million integrations a frame. The deflection of light
   in the weak field is analytic, proportional to Rs/b, so the ray offset is
   computed in closed form instead: one square root and a divide per pixel, it
   runs on integrated graphics, and at this scale it is indistinguishable.

   FIVE THINGS THIS GOT WRONG ON THE WAY, ALL FOUND BY MEASURING. They are
   written down at the point they apply, but in summary: an additive pass
   cannot draw black; an additive pass with flat alpha turns a transparent
   canvas opaque; aspect-correcting a square quad squashes the shadow into an
   ellipse; choosing a scale instead of solving one puts the viewport inside
   the event horizon; and keying any of it to page progress rather than to the
   chapter's own means it peaks after the chapter has ended.
   ========================================================================== */
(function () {
  "use strict";

  var sec = document.querySelector("[data-singularity]");
  if (!sec) return;

  var stage  = sec.querySelector(".singularity__stage");
  var canvas = sec.querySelector(".singularity__canvas");
  if (!stage || !canvas) return;

  var REDUCED = window.matchMedia &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ======================================================================
     THE BEATS

     Runs FIRST and unconditionally, outside every gate below. The three lines
     are the chapter's actual content; whether a GPU is available has nothing
     to do with whether they should appear, and an early return that skipped
     them would leave a reader on a modest device scrolling three screens of
     nothing.

     Armed by script, never by the stylesheet. Nothing on this site may begin
     at opacity 0 in CSS waiting on an observer — if the observer never fires,
     a stylesheet cannot change its mind, and the content is gone with no
     error. Here the arming and the disarming are owned by the same code, and
     it carries the same three failsafes as site.js: the observer, a
     synchronous check for anything already on screen at load, and a timer that
     un-arms everything regardless.
     ====================================================================== */
  (function beats() {
    var list = [].slice.call(sec.querySelectorAll("[data-sbeat]"));
    if (!list.length) return;

    if (REDUCED || !("IntersectionObserver" in window)) return;   /* already visible */

    list.forEach(function (el) { el.classList.add("is-armed"); });
    function show(el) { el.classList.remove("is-armed"); }

    /* TIMED TO THE APPROACH, not fired on entry.

       The chapter is three screens long precisely so that something can happen
       across it. Revealing all three lines the moment the section touches the
       viewport spends that length on nothing: the reader gets the whole
       argument at once and then scrolls two further screens past a picture
       they have finished reading.

       So each line is held until the singularity has closed far enough to have
       earned it. The thresholds are on the CHAPTER's own progress — never on
       the page's, which stops agreeing with it the moment a section is added
       above and would then reveal the last line after the chapter had ended.

       Monotonic on the way down and reversible on the way back up, because a
       reader who scrolls back should see what they saw. */
    var AT = [0.13, 0.30, 0.47];

    if (window.ScrollTrigger) {
      window.ScrollTrigger.create({
        trigger: sec,
        start: "top bottom",
        end: "bottom top",
        onUpdate: function (self) {
          var p = self.progress;
          for (var i = 0; i < list.length; i++) {
            list[i].classList.toggle("is-armed", p < AT[i]);
          }
        },
        refreshPriority: -90
      });
    } else {
      /* Without ScrollTrigger there is no chapter progress to key to, so the
         lines fall back to appearing on entry. */
      var bio = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          show(e.target); obs.unobserve(e.target);
        });
      }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
      list.forEach(function (el) {
        /* Synchronous check first: anything already in view at load must not
           wait for a callback that may be a frame away or, in a restored
           scroll position, may never come at all. */
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) { show(el); return; }
        bio.observe(el);
      });
    }

    /* The last line of defence, and it runs on BOTH paths. If ScrollTrigger
       never refreshes, or the observer never fires — a background tab at
       load, a restored scroll position, an engine that disagrees about
       thresholds — the copy appears anyway rather than being lost with no
       error. Three screens of black with nothing written on them is the worst
       failure this section has available to it. */
    window.setTimeout(function () {
      if (!sec.getBoundingClientRect().height) return;
      var seen = list.some(function (el) { return !el.classList.contains("is-armed"); });
      if (!seen && sec.getBoundingClientRect().top < window.innerHeight) list.forEach(show);
    }, 2500);
  })();

  /* ------------------------------------------------------------------ gates
     The CSS rendition underneath is a designed state, not a failure state, so
     every path that declines to run WebGL simply leaves it showing. */
  function hasWebGL() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext &&
                (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }

  /* Three.js is 603KB and this site does not attach it speculatively. The
     decision to download is made BEFORE the request, not after. */
  var capable = !REDUCED &&
                hasWebGL() &&
                window.innerWidth >= 720 &&
                (navigator.deviceMemory === undefined || navigator.deviceMemory >= 4) &&
                (navigator.hardwareConcurrency === undefined || navigator.hardwareConcurrency >= 4);

  if (!capable) { sec.classList.add("is-static"); return; }

  var loadedBecause = null;

  /* Only fetched once the chapter is genuinely near — a visitor who never
     reaches it never pays for it — but an observer is never the only path.

     Three ways in, the same discipline site.js uses for every reveal on this
     site: the observer, a synchronous geometric check for a reader who is
     already at or near the chapter when the page loads, and a timer that gives
     up waiting. Observed in testing: a control probe — a second, throwaway
     observer created with identical options against the same element while it
     was plainly intersecting — never fired either, which is what proves the
     callback and not the code was missing. On the observer alone the scene
     simply never loaded, and the only reason that was survivable is that the
     CSS still underneath is a designed state rather than a blank box. */
  var armed = false;
  function arm(why) {
    if (armed) return;
    armed = true;
    if (io) io.disconnect();
    load(why);
  }

  var io = null;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) arm("observer"); });
    }, { rootMargin: "120% 0px" });
    io.observe(sec);
  }

  /* Near enough to be worth loading right now: within one viewport of the fold
     in either direction. Restored scroll positions land here. */
  function nearNow() {
    var r = sec.getBoundingClientRect();
    return r.top < window.innerHeight * 2 && r.bottom > -window.innerHeight;
  }
  if (nearNow()) arm("at load");

  /* And if neither of those has happened, check once more on a timer rather
     than waiting forever on a callback that may not be coming. */
  window.setTimeout(function () { if (nearNow()) arm("timer"); }, 1800);

  function load(why) {
    loadedBecause = why;
    if (window.THREE) { start(); return; }
    var s = document.createElement("script");
    s.src = "vendor/three.min.js";
    s.async = true;
    s.onload = start;
    s.onerror = function () { sec.classList.add("is-static"); };
    document.head.appendChild(s);
  }

  /* ====================================================================== */
  function start() {
    if (!window.THREE) { sec.classList.add("is-static"); return; }

    var THREE = window.THREE;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: false,          /* nothing here has a hard edge to alias */
        alpha: true,
        powerPreference: "high-performance"
      });
    } catch (e) { sec.classList.add("is-static"); return; }

    renderer.setClearColor(0x000000, 0);
    var sc = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);

    /* --------------------------------------------------------------------
       PROPORTIONS, in QUAD UNITS. The quad spans -1..1 on both axes, so 0.115
       means the event horizon is 11.5% of the quad's half height.

       They live in JS and are injected into the shader rather than written
       twice, because the frame loop sizes the quad FROM them — and two copies
       of these numbers is exactly how a composition ends up correct in the
       shader and wrong on the screen.
       -------------------------------------------------------------------- */
    var HOLE = { rs: 0.115, diskIn: 0.21, diskOut: 0.66 };

    var uniforms = {
      uTime:     { value: 0 },
      uPresence: { value: 0 },
      uWarm:     { value: new THREE.Color(0xff7a1a) },   /* --accent-fill */
      uHot:      { value: new THREE.Color(0xfff1dc) }
    };

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
         dst=ONE unless this is set, which multiplies the colour by the alpha a
         second time and squares the falloff — the disk's outskirts vanished
         into it. Premultiplied additive is src=ONE, dst=ONE: linear light, and
         the alpha channel is then free to do its real job, which is telling
         the compositor how much of the page underneath still shows. */
      premultipliedAlpha: true,
      vertexShader: VERT,
      fragmentShader: [
        "precision highp float;",
        "varying vec2 vUv;",
        "uniform float uTime, uPresence;",
        "uniform vec3 uWarm, uHot;",

        /* Value noise without a sin. Two disk samples at three octaves with
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
           disk is ever drawn at, and costs a quarter of the noise budget to
           produce detail nobody can resolve. */
        "float fbm(vec2 v){",
        "  float s = 0.0, a = 0.5;",
        "  for (int k = 0; k < 3; k++) { s += a * noise(v); v *= 2.02; a *= 0.5; }",
        "  return s;",
        "}",

        /* One sample of the disk at a given inclination squash. Called twice:
           once for the disk as it lies, once much flatter for the lensed image
           of its far side arcing over the top — which is the shape everyone
           recognises, and a real consequence of the geometry rather than a
           decoration added on. */
        "vec3 diskSample(vec2 q, float squash, float gain, float tint){",
        "  vec2 d = q * vec2(1.0, 1.0 / squash);",
        "  float r = length(d);",
        "  float inner = " + HOLE.diskIn.toFixed(3) + ", outer = " + HOLE.diskOut.toFixed(3) + ";",
        "  float band = smoothstep(inner, inner + 0.016, r) * (1.0 - smoothstep(outer - 0.26, outer, r));",
        /* Early-out before any noise is evaluated. Most of the quad is outside
           the annulus, and this is what keeps the shader affordable. */
        "  if (band <= 0.001) return vec3(0.0);",
        "  float a = atan(d.y, d.x);",
        /* Differential rotation: the inner edge orbits faster, which is what
           makes the disk shear instead of turning like a plate. */
        "  float orbit = uTime * (0.85 / max(r, 0.22));",
        "  float turb = fbm(vec2(a * 5.4 + orbit, r * 15.0 - orbit * 0.35));",
        /* Contrast, not just modulation. Left linear the structure averaged
           out into a smear that read as motion blur rather than as filaments
           of gas. */
        "  turb = turb * turb * 1.9;",
        "  band *= 0.18 + 1.30 * turb;",
        /* Relativistic beaming: the limb rotating toward the viewer is
           brighter. Without it the disk is symmetrical and wrong. */
        "  float beam = cos(a - 1.5707963);",
        "  band *= 1.0 + 1.25 * beam;",
        "  float heat = 1.0 - smoothstep(inner, outer, r);",
        /* Doppler in COLOUR as well as brightness: the approaching limb is
           blue-shifted toward white, the receding one stays in the ember.
           Beaming intensity alone leaves an evenly orange ring with a bright
           patch on it, which reads as a lighting mistake, not as relativity. */
        "  vec3 col = mix(uWarm, uHot, clamp((heat * heat + max(beam, 0.0) * 0.55) * tint, 0.0, 1.0));",
        "  return col * band * gain;",
        "}",

        "void main(){",
        /* NO ASPECT TERM. The quad is SQUARE in world space, so multiplying x
           by the viewport aspect corrects nothing — it squashes the shadow
           into a horizontal ellipse by the full aspect ratio. On a 16:9
           monitor the event horizon renders 1.78 times taller than it is wide.
           A black hole's shadow is the one shape here not allowed to be an
           oval. */
        "  vec2 p = (vUv - 0.5) * 2.0;",
        "  float r = max(length(p), 1e-4);",

        "  float rs = " + HOLE.rs.toFixed(3) + ";",
        "  float photon = rs * 1.5;",

        /* Weak-field deflection, analytic: the ray is pushed outward in screen
           space by an amount falling off as 1/b, which is what makes the disk
           appear to wrap around the shadow. */
        "  float bend = (rs * rs) / (r * r);",
        "  vec2 q = p * (1.0 + bend * 2.2);",

        /* Ten degrees of tilt. The whole difference between an object with an
           axis and a graphic device, for the cost of two constants. */
        "  const float ca = 0.98384, sa = 0.17903;",
        "  q = vec2(q.x * ca - q.y * sa, q.x * sa + q.y * ca);",

        "  vec3 col = vec3(0.0);",
        "  col += diskSample(q, 0.20, 1.35, 1.0);",
        /* The far side, lensed up over the top. Deliberately weaker and
           cooler: at equal strength it is the largest bright thing in frame
           and the composition reads as a face-on spiral rather than as a plane
           seen almost edge on. */
        "  col += diskSample(q, 1.55, 0.19, 0.22);",

        /* The photon ring: light that orbited before escaping. A hairline
           alone aliases to a dotted circle at small sizes and to a sticker
           outline at large ones, so it carries a halo — which is what makes it
           read as light rather than as a drawn stroke. */
        "  float ring = smoothstep(photon + 0.010, photon, r) * smoothstep(photon - 0.020, photon, r);",
        "  float halo = exp(-abs(r - photon) * 24.0);",
        "  col += uHot * (ring * 1.35 + halo * 0.34);",

        /* The shadow. Nothing comes out, so nothing is added. */
        "  col *= smoothstep(rs, rs + 0.010, r);",

        /* The far-side arc reaches 0.858 of the quad, so the edge fade cannot
           begin before that without slicing the top off the lensed image. */
        "  float vig = 1.0 - smoothstep(0.90, 1.00, r);",

        /* THE CANVAS IS TRANSPARENT and its alpha is what lets the page show
           through it, so this cannot be flat. Writing 1 here turns the quad
           into an opaque black rectangle over everything it covers — and it
           covers more than the frame. Alpha is the luminance: as much of the
           page is hidden as there is light to hide it. */
        "  float lum = clamp(max(max(col.r, col.g), col.b), 0.0, 1.0);",
        "  gl_FragColor = vec4(col * vig * uPresence, lum * vig * uPresence);",
        "}"
      ].join("\n")
    });

    /* --------------------------------------------------------------------
       THE SHADOW HAS TO BE OPAQUE, AND AN ADDITIVE PASS CANNOT DRAW BLACK.

       Adding zero leaves whatever was already there, so masking the glow to
       nothing inside the horizon does not produce a shadow — it produces a
       clear hole with a bright ring around it and everything behind plainly
       visible through the middle. A black hole you can see through is a
       sticker.

       So the shadow gets its own normally-blended pass, drawn first.
       depthWrite stays off because two coplanar quads would fight; depth
       TESTING stays on, which is what makes it behave like an object.
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
        "  float inside = 1.0 - smoothstep(rs - 0.004, rs + 0.006, r);",
        /* Cubed. The glow may linger as the chapter ends because light fading
           off a page is just light; a black disc at a quarter alpha over a
           pale page is a grey blob. The shadow has to be gone well before the
           glow is. */
        "  float a = uPresence * uPresence * uPresence;",
        "  gl_FragColor = vec4(0.0, 0.0, 0.0, inside * a);",
        "}"
      ].join("\n")
    });

    var quad = new THREE.PlaneGeometry(2, 2);
    var core = new THREE.Mesh(quad, coreMat);
    core.frustumCulled = false; core.renderOrder = 1; sc.add(core);
    var hole = new THREE.Mesh(quad, glow);
    hole.frustumCulled = false; hole.renderOrder = 2; sc.add(hole);

    /* --------------------------------------------------------------------
       THE DUST.

       What falls in is matter, not stationery. Points rather than planes:
       they have no readable shape at any size, so they never become objects
       competing with the singularity for the frame — which is precisely what
       went wrong the last time this scene had things falling into it.

       One draw call for the whole field, and the spiral is computed on the GPU
       from a per-point seed, so the CPU does nothing per frame but advance a
       single uniform.
       -------------------------------------------------------------------- */
    var DUST = 2600;
    var dustGeo = new THREE.BufferGeometry();
    var seedA = new Float32Array(DUST * 3);
    for (var i = 0; i < DUST; i++) {
      /* Golden-angle distribution: even coverage with no visible banding,
         which a plain random angle does not give. */
      seedA[i * 3 + 0] = i * 2.399963;                    /* angle  */
      /* Bounded to the SHADER DISK'S own annulus, 0.21 to 0.66 in quad
         units. Running out to 1.0 put the dust half as far again as the disk
         it is supposed to be made of, so the two read as two objects. */
      seedA[i * 3 + 1] = 0.23 + Math.random() * 0.44;    /* radius */
      seedA[i * 3 + 2] = Math.random();                   /* phase  */
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(DUST * 3), 3));
    dustGeo.setAttribute("seed", new THREE.BufferAttribute(seedA, 3));

    var dustUni = {
      uTime:     { value: 0 },
      uPresence: { value: 0 },
      uFall:     { value: 0 },
      uScale:    { value: 1 },
      uWarm:     { value: new THREE.Color(0xff9a45) },
      uPix:      { value: 1 }
    };

    var dust = new THREE.Points(dustGeo, new THREE.ShaderMaterial({
      uniforms: dustUni,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      premultipliedAlpha: true,
      vertexShader: [
        "attribute vec3 seed;",
        "uniform float uTime, uFall, uScale, uPix;",
        "varying float vLife;",
        "void main(){",
        "  float a0 = seed.x, r0 = seed.y, ph = seed.z;",
        /* Each grain runs its own loop of the same fall, offset by its phase,
           so the field is continuously fed rather than draining once and
           leaving an empty frame for the rest of the chapter. */
        "  float t = fract(ph + uTime * 0.055 + uFall * 0.35);",
        /* Radius collapses while the angle accelerates. That is an inspiral,
           which is what an accreting object actually does; interpolating
           straight to the centre is a fall, and looks like one. */
        "  float r = mix(r0, 0.055, t * t);",
        "  float a = a0 + t * 7.5 + uTime * 0.12;",
        "  vec2 e = vec2(cos(a) * r, sin(a) * r * 0.20);",
        /* The SAME ten degrees the shader disk is tilted by. Without it the
           painted disk and the dust sit on two different planes and the scene
           reads as a decal in front of another decal. */
        "  const float ca = 0.98384, sa = 0.17903;",
        "  e = vec2(e.x * ca - e.y * sa, e.x * sa + e.y * ca);",
        "  vec3 pos = vec3(e, 0.0) * uScale;",
        /* Thickness, so the disk is a volume rather than a wire. */
        "  pos.z += (ph - 0.5) * 0.07 * uScale;",
        "  vLife = (1.0 - t) * smoothstep(0.0, 0.12, t);",
        "  vec4 mv = modelViewMatrix * vec4(pos, 1.0);",
        "  gl_Position = projectionMatrix * mv;",
        /* A GRAIN IS A FIXED WORLD SIZE, and uPix is the projection term that
           converts that to pixels: viewport height over twice the tangent of
           the half field of view. Written with an extra uScale in it the grain
           grew with the composition, and at full approach each one measured
           sixty-eight pixels across — two and a half thousand overlapping
           sixty-eight pixel additive sprites, which is not dust, it is a fire.
           0.0045 of the quad puts it at three to four pixels. */
        "  gl_PointSize = max(1.0, 0.0045 * uScale * uPix / max(-mv.z, 0.001));",
        "}"
      ].join("\n"),
      fragmentShader: [
        "precision mediump float;",
        "uniform vec3 uWarm;",
        "uniform float uPresence;",
        "varying float vLife;",
        "void main(){",
        /* Round, and soft to the edge. A square point sprite is a pixel, and a
           field of pixels reads as dead sensor rather than as dust. */
        "  float d = length(gl_PointCoord - 0.5);",
        "  float m = smoothstep(0.5, 0.06, d);",
        /* Low, because they ADD. Two thousand six hundred of these overlap
           heavily near the inner edge, and any alpha that looks right for one
           grain saturates to white for the field. */
        "  float a = m * vLife * uPresence * 0.30;",
        "  gl_FragColor = vec4(uWarm * a, a);",
        "}"
      ].join("\n")
    }));
    dust.frustumCulled = false;
    dust.renderOrder = 0;
    sc.add(dust);

    /* ------------------------------------------------------------------ fit */
    var W = 0, H = 0, dpr = 1;
    function resize() {
      W = stage.clientWidth  || window.innerWidth;
      H = stage.clientHeight || window.innerHeight;
      /* Capped rather than raw. A 3x screen would otherwise render nine times
         the pixels for a background nobody is studying. */
      dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      renderer.setPixelRatio(dpr);
      renderer.setSize(W, H, false);
      camera.aspect = W / Math.max(H, 1);
      camera.updateProjectionMatrix();
      /* The projection term, so the vertex shader can size a world-space
         grain in pixels: viewport height over twice tan(fov/2). */
      dustUni.uPix.value = (H * dpr) / (2 * Math.tan(camera.fov * Math.PI / 360));
    }
    resize();
    window.addEventListener("resize", resize);

    /* ---------------------------------------------------------------- state
       Progress is written by a ScrollTrigger over THIS CHAPTER, never by page
       progress. The two stop agreeing the moment a section is added above,
       and a singularity keyed to the document peaks after its own chapter has
       ended — over a pale page, additively blended, where it cannot be seen. */
    var prog = 0;
    function smoothstep(a, b, x) {
      var t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    }
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

    if (window.ScrollTrigger) {
      window.ScrollTrigger.create({
        trigger: sec,
        start: "top bottom",
        end: "bottom top",
        onUpdate: function (self) { prog = self.progress; },
        refreshPriority: -90
      });
    }

    /* ------------------------------------------------------------------ loop */
    var clock = 0, raf = null, onScreen = true;

    document.addEventListener("visibilitychange", function () {
      onScreen = !document.hidden;
    });
    /* Off-screen the loop stops entirely. A GPU running for a canvas nobody can
       see is pure battery cost. */
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { onScreen = e.isIntersecting && !document.hidden; });
    }, { threshold: 0 }).observe(stage);

    var camFwd = new THREE.Vector3();

    function frame() {
      raf = window.requestAnimationFrame(frame);
      if (!onScreen) return;
      clock += 0.0055;

      /* Arrive, hold, leave. It belongs to the chapter and has no business
         outliving it. */
      /* The sticky stage releases at dp 0.75 — (section height minus one
         viewport) over the trigger's own four-screen range. A fade that starts
         after that is never seen, because the stage is already carrying the
         scene up and out of frame. This one begins just before. */
      var presence = smoothstep(0.10, 0.40, prog) * (1 - smoothstep(0.68, 0.90, prog));
      /* The approach is monotonic and kept separate from the brightness, so it
         goes on closing while it fades instead of appearing to reverse away. */
      var approach = smoothstep(0.06, 0.82, prog);

      var dist   = 46 - approach * 27;
      var frameH = 2 * Math.tan(camera.fov * Math.PI / 360) * dist;
      var frameW = frameH * camera.aspect;

      /* COMPOSITION, stated the way it is actually judged rather than as a
         scale factor. Two constraints and the tighter one wins: the disk must
         not run off the sides, and the shadow must not swallow the frame. On a
         wide monitor the first binds, on a square window the second — which is
         why a single hand-tuned scale is always right on one viewport and
         absurd on the next.

         Choosing scale directly is what once left the event horizon measuring
         6.5 world units across a frame 5.4 units high: the viewport sat
         entirely INSIDE the shadow, and a shadow draws nothing, so the scene
         rendered a black hole by rendering nothing at all. */
      var diskSpan   = 0.18 + approach * 0.60;   /* of the frame's WIDTH  */
      var shadowSpan = 0.06 + approach * 0.23;   /* of the frame's HEIGHT */
      /* A tall window must not shrink the whole composition to a speck, so the
         width rule is floored at what a square window would have given. */
      var govW = Math.max(frameW, frameH * 0.95);
      var hs = Math.min(
        (diskSpan   * govW)   / (2 * HOLE.diskOut),
        (shadowSpan * frameH) / (2 * HOLE.rs)
      );

      /* The camera holds station and banks slightly, so the flight has a body
         rather than being a straight slide. Placed FIRST, because everything
         below reads its orientation and would otherwise get last frame's. */
      camera.position.set(Math.sin(prog * 2.6) * 1.1, Math.cos(prog * 2.1) * 0.8, 6);
      camera.rotation.z = Math.sin(prog * 2.3) * 0.03;
      camera.lookAt(camera.position.x * 0.3, camera.position.y * 0.3, -40);

      /* It holds the right of the frame through the approach and takes the
         middle only at the centre of the chapter, where the copy has moved
         aside for it. A subject dead centre behind a paragraph makes both
         unreadable. */
      var centre = smoothstep(0.34, 0.56, prog) * (1 - smoothstep(0.78, 0.94, prog));

      camFwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
      hole.position.copy(camera.position).addScaledVector(camFwd, dist);
      hole.position.x += (1 - centre) * 0.24 * frameW;
      hole.position.y += (1 - centre) * -0.10 * frameH;
      hole.quaternion.copy(camera.quaternion);
      hole.scale.set(hs, hs, 1);

      core.position.copy(hole.position);
      core.quaternion.copy(hole.quaternion);
      core.scale.copy(hole.scale);

      dust.position.copy(hole.position);
      dust.quaternion.copy(hole.quaternion);

      uniforms.uPresence.value = presence;
      uniforms.uTime.value = clock * 6.0;
      dustUni.uPresence.value = presence;
      dustUni.uTime.value = clock * 6.0;
      dustUni.uFall.value = approach;
      dustUni.uScale.value = hs;

      renderer.render(sc, camera);
    }

    /* The CSS rendition is only stood down once there is actually something to
       replace it with. */
    sec.classList.add("is-live");
    frame();

    /* A handle for verification. renderer.info reports what was actually
       submitted and is free; readPixels is not a sound check, because WebGL
       clears the drawing buffer after compositing unless preserveDrawingBuffer
       is set, so a read at an arbitrary moment returns zeros whether or not
       anything was drawn. */
    window.cognivexSingularity = {
      renderer: renderer, scene: sc, camera: camera, hole: hole,
      stats: function () {
        var d = 46 - smoothstep(0.06, 0.82, prog) * 27;
        var fH = 2 * Math.tan(camera.fov * Math.PI / 360) * d;
        return {
          loadedBecause: loadedBecause,
        chapterProgress: +prog.toFixed(3),
          presence: +uniforms.uPresence.value.toFixed(3),
          drawCalls: renderer.info.render.calls,
          points: DUST,
          holeDistance: +d.toFixed(1),
          /* The two numbers that decide whether the composition works at all.
             At or above 1 it has left the screen. */
          shadowOfFrameHeight: +((2 * HOLE.rs * hole.scale.x) / fH).toFixed(3),
          diskOfFrameWidth: +((2 * HOLE.diskOut * hole.scale.x) / (fH * camera.aspect)).toFixed(3),
          glError: renderer.getContext().getError()
        };
      }
    };

    window.addEventListener("pagehide", function () {
      if (raf) window.cancelAnimationFrame(raf);
      quad.dispose(); glow.dispose(); coreMat.dispose();
      dustGeo.dispose(); dust.material.dispose();
      renderer.dispose();
    });
  }
})();
