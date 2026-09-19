/* ============================================================================
   LEVI — WHICH LINE, AND WHEN.

   levi-lines.js is data and nothing else: seven pages of sections, a demo
   commentary, and the states. This picks from it. It is the only place that
   knows a visitor has been here before.

   THE RULE IS NEVER TWICE. Not never twice in a section, and not never twice
   on a page - never twice in the whole session, across every page of it. All
   223 lines in the set are distinct strings (checked), so a cursor per array
   would very nearly do it on its own; the spoken set is here so that stays
   true if someone writes a line that already exists somewhere else.

   WHAT HAPPENS WHEN AN ARRAY RUNS OUT. Several are only two lines long, which
   is exactly enough to walk the page down and back with something different
   each time. Past that there is nothing honest left to say, so Levi does not
   invent a repeat: he falls to states.revisit, and when that is spent too he
   holds the line already in the box and just moves to the section. Silence is
   the correct answer to "say that again".

   sessionStorage, not localStorage: this is one visit, not a profile. Every
   read and write is wrapped, because private windows and blocked site data
   both throw on access rather than returning empty.
   ========================================================================== */
(function () {
  "use strict";

  var LINES = window.LEVI_LINES;
  if (!LINES) return;

  var KEY = "cognivex.levi.voice";

  /* ---- which page ----------------------------------------------------------
     Declared in the markup rather than sniffed from the URL. The path form is
     only a fallback, and it has to cope with Vercel's cleanUrls (/trust) and
     with local serving (/trust.html), which is the difference that has cost
     this project time before. */
  var PATHS = {
    "index": "home", "": "home",
    "how-it-works": "howItWorks",
    "capabilities": "capabilities",
    "trust": "trust",
    "about": "about",
    "contact": "contact",
    "404": "notFound"
  };

  function whichPage() {
    var declared = document.documentElement.getAttribute("data-levi-page");
    if (declared && LINES[declared]) return declared;
    var path = location.pathname.replace(/\/+$/, "").split("/").pop() || "";
    path = path.replace(/\.html?$/i, "");
    return PATHS[path] || "home";
  }

  var page = whichPage();
  var book = LINES[page] || {};

  /* The 404 declares a flat array rather than a map of sections, because it
     has one thing to say. Give it the shape everything else has. */
  if (Array.isArray(book)) { var flat = book; book = {}; book[page] = flat; }

  /* Section order is the order the lines are declared in, which is the order
     the sections appear on the page. demo is commentary, not a section. */
  var sections = Object.keys(book).filter(function (k) { return k !== "demo"; });

  /* ---- what has been said --------------------------------------------------
     Hashed, not stored whole: 223 lines of prose is 11KB of sessionStorage to
     answer a yes/no question. djb2 over the string, base 36. */
  function hash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  var mem = { at: {}, said: {} };
  try {
    var raw = window.sessionStorage.getItem(KEY);
    if (raw) {
      var got = JSON.parse(raw);
      if (got && typeof got === "object") {
        mem.at = got.at || {};
        mem.said = got.said || {};
      }
    }
  } catch (e) {}

  var saveT = null;
  function save() {
    /* Coalesced: arriving in a section writes one line, and a fast scroll
       down the page would otherwise be a dozen synchronous storage writes. */
    if (saveT) return;
    saveT = window.setTimeout(function () {
      saveT = null;
      try { window.sessionStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {}
    }, 220);
  }

  /* ---- the pick ------------------------------------------------------------
     Line 1 is the first visit, every time - the set says to keep it the
     strongest because most people only ever see it. After that, in order. */
  function take(arr, id) {
    if (!arr || !arr.length) return null;
    var at = mem.at[id] || 0;
    while (at < arr.length) {
      var line = arr[at];
      at += 1;
      var h = hash(line);
      if (!mem.said[h]) {
        mem.at[id] = at;
        mem.said[h] = 1;
        save();
        return line;
      }
      /* Said already, somewhere else in the set. Skip it rather than repeat. */
    }
    mem.at[id] = at;
    save();
    return null;                       /* spent */
  }

  function group(name) {
    return (LINES.states && LINES.states[name]) || null;
  }

  var VOICE = {
    page: page,
    sections: sections,

    /* A section's line. Falls to revisit, then to silence. */
    line: function (key) {
      var got = take(book[key], page + "." + key);
      if (got) return got;
      return take(group("revisit"), "states.revisit");
    },

    /* A state line. No revisit fallback - a state that has run out is simply
       not worth saying again. */
    state: function (key) {
      return take(group(key), "states." + key);
    },

    /* The demo commentary. Home only; every other page has no demo key. */
    demo: function (key) {
      var d = book.demo;
      return d ? take(d[key], page + ".demo." + key) : null;
    },

    /* NEVER SPOKEN. It is a footnote in the footer and Levi does not read it
       out - it is there for the reader, not from him. */
    footnote: (LINES.states && LINES.states.footnote) || "",

    /* Has this visitor already been on another page this session? Answers
       states.returning, and it has to be read BEFORE anything is spoken. */
    returning: (function () {
      for (var k in mem.at) { if (mem.at.hasOwnProperty(k)) return true; }
      return false;
    })(),

    /* For the verification harness: what has been used, and what is left. */
    report: function () {
      var out = { page: page, sections: sections, spent: [], remaining: {} };
      sections.forEach(function (k) {
        var n = (book[k] || []).length, at = mem.at[page + "." + k] || 0;
        out.remaining[k] = n - at;
        if (at >= n) out.spent.push(k);
      });
      return out;
    },

    reset: function () {
      mem = { at: {}, said: {} };
      try { window.sessionStorage.removeItem(KEY); } catch (e) {}
    }
  };

  window.LEVI_VOICE = VOICE;

  /* levi.js drives placement off a list of zone names. The lines themselves no
     longer live in it - they are asked for at the moment of arrival, so the
     second pass down the page is a different sentence. */
  window.LEVI_SCRIPT = sections.map(function (name) {
    return { zone: name };
  });

  /* The idle tiers, kept in the shape levi.js already expects. */
  window.LEVI_IDLE = (LINES.states && LINES.states.idleShort) || ["Still here."];
})();
