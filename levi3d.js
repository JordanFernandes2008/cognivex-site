/* ============================================================================
   LEVI IN THREE DIMENSIONS.

   levi.js is still the brain. It owns the zones, the lines, the keep-out, the
   spring and the gesture, all of which were measured and are not being redone
   here. Every frame it publishes one object - position, velocity, glow, spin -
   and this file does nothing but draw a real object at that point.

   WHY A SOLID OBJECT AND NOT A BRIGHTER GLOW. The CSS Levi was four additively
   blended discs. Additive light has no silhouette, so rotating it changes
   nothing you can see, and a thing whose rotation is invisible cannot read as
   three-dimensional however bright it gets. This is flat-shaded geometry with
   a key light: the facets change value as it turns, and THAT is the whole 3D
   cue. The glow is still there, behind it, doing the atmosphere.

   WHY NOTHING IS FETCHED. The production CSP sets connect-src to none, so
   GLTFLoader cannot load a model file - its fetch is blocked outright. The
   geometry here is generated and the corona texture is drawn into a 2D canvas
   at runtime, so the policy does not have to be loosened to ship this.

   PROGRESSIVE ENHANCEMENT. The CSS star renders until this file has drawn a
   real frame; only then does it hand over. No WebGL, no module support, an
   error anywhere in here - the page keeps the star it already had.
   ========================================================================== */
import * as THREE from "./vendor/three.module.min.js";

(function () {
  "use strict";

  var REDUCED = window.matchMedia &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* PHONES KEEP THE CSS STAR. Not a shrunken version of the 3D one - the CSS
     star is a complete, finished thing that already works there, and spending
     a WebGL context plus 655KB of Three.js on a phone to replace something
     that already looks right is a bad trade. levi.js is untouched by this:
     the zones, the lines and the spring run everywhere. Only the LOOK is
     gated, which is what progressive enhancement means. */
  function tooSmall() {
    return window.matchMedia && window.matchMedia("(max-width: 900px)").matches;
  }

  function boot(L) {
    if (!L || !L.frame) return;
    if (tooSmall()) return;

    var canvas = document.createElement("canvas");
    canvas.className = "levi3d";
    canvas.setAttribute("aria-hidden", "true");

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas, alpha: true, antialias: true, powerPreference: "low-power"
      });
    } catch (e) { return; }                 /* no WebGL: keep the CSS star */
    if (!renderer || !renderer.getContext()) return;

    renderer.setClearAlpha(0);
    document.body.appendChild(canvas);

    var scene = new THREE.Scene();
    var cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 4000);
    cam.position.z = 900;

    /* ---- the object ---------------------------------------------------------
       A core with visible facets, and four long spikes crossed through it. The
       spikes are what make the silhouette a STAR rather than a ball, and they
       are also the clearest read on rotation: they sweep. */
    var levi = new THREE.Group();

    var hot  = new THREE.Color("#fff3df");
    var fill = new THREE.Color("#ff7a1a");   /* --accent-fill */
    var deep = new THREE.Color("#e56a0d");   /* --accent-deep */

    var coreMat = new THREE.MeshStandardMaterial({
      color: hot, emissive: fill, emissiveIntensity: 0.55,
      roughness: 0.34, metalness: 0.0, flatShading: true
    });
    var core = new THREE.Mesh(new THREE.IcosahedronGeometry(23, 1), coreMat);
    levi.add(core);

    var spikeMat = new THREE.MeshStandardMaterial({
      color: hot, emissive: deep, emissiveIntensity: 0.42,
      roughness: 0.3, metalness: 0.0, flatShading: true
    });
    var spikes = new THREE.Group();
    for (var i = 0; i < 4; i++) {
      var s = new THREE.Mesh(new THREE.OctahedronGeometry(15, 0), spikeMat);
      s.scale.set(3.9, 0.5, 0.5);
      s.rotation.z = (Math.PI / 4) * i;
      spikes.add(s);
    }
    /* One pair pitched out of the plane so the star has a front and a back. */
    spikes.children[1].rotation.x = Math.PI / 3;
    spikes.children[3].rotation.x = -Math.PI / 3;
    levi.add(spikes);

    /* ---- the atmosphere, drawn not fetched ---------------------------------- */
    function radial(stops, size) {
      var c = document.createElement("canvas");
      c.width = c.height = size;
      var g = c.getContext("2d");
      var grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      stops.forEach(function (s) { grd.addColorStop(s[0], s[1]); });
      g.fillStyle = grd; g.fillRect(0, 0, size, size);
      var t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }

    var corona = new THREE.Sprite(new THREE.SpriteMaterial({
      map: radial([
        [0.00, "rgba(255,236,205,0.95)"],
        [0.13, "rgba(255,186,110,0.55)"],
        [0.32, "rgba(255,140,40,0.26)"],
        [0.56, "rgba(229,106,13,0.09)"],
        [1.00, "rgba(229,106,13,0)"]
      ], 256),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
    }));
    corona.scale.set(230, 230, 1);
    corona.position.z = -30;
    levi.add(corona);

    scene.add(levi);

    /* Key from upper left so the facets have a light and a dark side - without
       a directional light a flat-shaded solid is one flat colour and the whole
       point is lost. */
    var key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(-0.55, 0.8, 0.9);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0xff9a44, 1.5);
    rim.position.set(0.7, -0.4, -0.6);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0xffd9b0, 0.5));

    /* ---- sizing -------------------------------------------------------------- */
    var W = 0, H = 0;
    function size() {
      W = document.documentElement.clientWidth;
      H = document.documentElement.clientHeight;
      cam.left = -W / 2; cam.right = W / 2;
      cam.top = H / 2; cam.bottom = -H / 2;
      cam.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(W, H, false);
    }
    size();
    window.addEventListener("resize", size, { passive: true });

    /* ---- the loop ------------------------------------------------------------
       Heading comes from velocity and the roll comes from how fast the heading
       is CHANGING, which is what banking is. A character that points where it
       is going stops looking like a decal being dragged around. */
    var handedOver = false, heading = 0, bank = 0, tumble = 0, raf = null;

    function update() {
      var f = L.frame;

      levi.position.set(f.x - W / 2, H / 2 - f.y, 0);

      var speed = Math.hypot(f.vx, f.vy);
      if (!REDUCED) {
        if (speed > 26) {
          var want = Math.atan2(-f.vy, f.vx);
          var d = ((want - heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          heading += d * 0.12;
          bank += (Math.max(-0.6, Math.min(0.6, d * 3.4)) - bank) * 0.1;
        } else {
          bank += (0 - bank) * 0.06;
        }
        tumble += 0.004 + speed * 0.00004;
        levi.rotation.set(bank * 0.55, tumble, heading * 0.35 + bank);
        spikes.rotation.z = -tumble * 0.55;
      } else {
        levi.rotation.set(0, 0, 0);
      }

      var g = f.glow || 1;
      coreMat.emissiveIntensity = 0.40 + g * 0.30;
      spikeMat.emissiveIntensity = 0.30 + g * 0.24;
      corona.material.opacity = Math.min(1, 0.52 + g * 0.30);
      var puff = 1 + Math.min(0.5, speed / 2600);
      corona.scale.set(230 * puff * g, 230 * puff * g, 1);

    }

    function draw() {
      raf = requestAnimationFrame(draw);
      update();
      renderer.render(scene, cam);

      if (!handedOver) {                    /* a real frame is on screen */
        handedOver = true;
        L.root.classList.add("is-3d");
        document.documentElement.classList.add("levi-3d");
      }
    }

    draw();

    /* Reduced motion draws once and stops - no loop, no spin, still visible. */
    if (REDUCED && raf) {
      cancelAnimationFrame(raf); raf = null;
      renderer.render(scene, cam);
    }

    window.cognivexLevi3D = {
      canvas: canvas, scene: scene, object: levi,
      stop: function () { if (raf) cancelAnimationFrame(raf); raf = null; },
      /* Draw one frame on demand, skipping the loop. levi.js exposes settle()
         and readNow() for the same reason: a headless pane can starve
         requestAnimationFrame to one frame per half second, and a check that
         cannot force a frame ends up reporting the state of a paused scene. */
      renderNow: function () {
        update();                 /* without this it repaints a stale transform
                                     and the check reports a position the pixels
                                     do not agree with */
        renderer.render(scene, cam);
        return { at: Math.round(levi.position.x + W / 2) + "," +
                     Math.round(H / 2 - levi.position.y) };
      },
      stats: function () {
        var f = L.frame;
        return {
          at: Math.round(f.x) + "," + Math.round(f.y),
          speed: Math.round(Math.hypot(f.vx, f.vy)),
          headingDeg: Math.round(heading * 180 / Math.PI),
          bankDeg: Math.round(bank * 180 / Math.PI),
          handedOver: handedOver,
          drawing: raf !== null,
          canvasCSS: canvas.clientWidth + "x" + canvas.clientHeight,
          buffer: canvas.width + "x" + canvas.height
        };
      }
    };
  }

  /* levi.js is a classic script and this is a module, so levi.js has already
     run - but it bails out early on pages with no zones, and there it never
     defines cognivexLevi at all. Poll briefly, then give up quietly. */
  var tries = 0;
  (function wait() {
    if (window.cognivexLevi && window.cognivexLevi.frame) {
      try { boot(window.cognivexLevi); } catch (e) {}
      return;
    }
    if (++tries > 40) return;
    setTimeout(wait, 50);
  })();
})();
