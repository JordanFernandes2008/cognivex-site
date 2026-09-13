# One-off generator for the five inner pages.
#
# The original Cognivex site kept 41 pages consistent by emitting them all from
# one shell. Same idea here: the header and footer exist once, so a fix lands
# once. The OUTPUT is plain static HTML — there is no build step at deploy.
# Run it, commit the .html files, delete this if you prefer.

import io

NAV = [
    ("index.html", "Home"),
    ("how-it-works.html", "How it works"),
    ("capabilities.html", "Capabilities"),
    ("trust.html", "Trust"),
    ("about.html", "About"),
    ("contact.html", "Contact"),
]

HEAD = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="site.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

<div class="statusbar">
  <div class="wrap statusbar__inner">
    <span class="mono">In development · not yet available</span>
    <span class="mono statusbar__aside">Nothing sends without your approval</span>
  </div>
</div>

<header class="masthead" data-header>
  <div class="wrap masthead__inner">
    <a class="brand" href="index.html">
      <span class="brand__mark" aria-hidden="true"></span>
      <span>Cognivex</span>
    </a>
    <nav class="nav" aria-label="Primary">
{navdesk}
    </nav>
    <button class="burger" type="button" data-nav-toggle aria-expanded="false" aria-controls="mobile-nav">
      <span class="burger__bars" aria-hidden="true"><i></i><i></i></span>
      <span class="burger__label">Menu</span>
    </button>
  </div>
</header>

<!-- Ships open so navigation exists without JavaScript; site.js closes it. -->
<nav class="panel" id="mobile-nav" data-nav-panel aria-label="Primary">
  <div class="panel__head">
    <span class="mono">Go to</span>
    <button class="panel__close" type="button" data-nav-close aria-label="Close menu">Close</button>
  </div>
{navmob}
</nav>

<main id="main">
'''

FOOT = '''</main>

<footer class="foot">
  <div class="wrap foot__inner">
    <div class="foot__brand">
      <a class="brand" href="index.html">
        <span class="brand__mark" aria-hidden="true"></span>
        <span>Cognivex</span>
      </a>
      <p class="foot__by">Built by Suraj Balke and Jordan Fernandes at Digital Coyotes.</p>
    </div>
    <nav class="foot__nav" aria-label="Footer">
      <a href="how-it-works.html">How it works</a>
      <a href="capabilities.html">Capabilities</a>
      <a href="trust.html">Trust</a>
      <a href="about.html">About</a>
      <a href="contact.html">Contact</a>
    </nav>
  </div>
</footer>

<script src="site.js"></script>
</body>
</html>
'''


def shell(current, title, desc, body):
    navdesk = "\n".join(
        '      <a href="{h}"{c}>{l}</a>'.format(
            h=h, l=l, c=' aria-current="page"' if h == current else "")
        for h, l in NAV)
    navmob = "\n".join(
        '  <a href="{h}"{c}><span>{l}</span><i aria-hidden="true">→</i></a>'.format(
            h=h, l=l, c=' aria-current="page"' if h == current else "")
        for h, l in NAV)
    return (HEAD.format(title=title, desc=desc, navdesk=navdesk, navmob=navmob)
            + body + FOOT)


def phero(kicker, title, lede):
    return '''
  <section class="phero">
    <div class="wrap">
      <p class="pill" data-rise><span class="pill__dot" aria-hidden="true"></span>{k}</p>
      <h1 class="phero__title" data-rise data-rise-delay="50">{t}</h1>
      <p class="phero__lede" data-rise data-rise-delay="100">{l}</p>
    </div>
  </section>
'''.format(k=kicker, t=title, l=lede)


def closing(title, body, label, href):
    return '''
  <section class="pclose">
    <div class="wrap pclose__inner" data-rise>
      <div>
        <h2 class="pclose__h">{t}</h2>
        <p>{b}</p>
      </div>
      <a class="cta" href="{h}" data-magnetic><span>{l}</span><i class="cta__orb" aria-hidden="true">↗</i></a>
    </div>
  </section>
'''.format(t=title, b=body, l=label, h=href)


# ── how it works ───────────────────────────────────────────────────────────
HOW = phero(
    "How it works",
    'One morning, from arriving to <em>answered.</em>',
    "For the sceptical reader. What Cognivex reads, how it decides what needs "
    "you, what a draft actually contains, and what happens the moment you "
    "approve, edit or skip it."
) + '''
  <section class="prose">
    <div class="wrap prose__grid">
      <div class="prose__side" data-rise><p class="mono">Step one</p></div>
      <div class="prose__body" data-rise data-rise-delay="60">
        <h2>It reads</h2>
        <p>
          Cognivex reads the places you have connected and nothing else: your
          email, your order and customer messages, and where each job and payment
          currently stands. Each source is switched on by you, one at a time, and
          can be switched off the same way.
        </p>
        <p>
          It reads to understand, not to act. Reading changes nothing and sends
          nothing. At this stage the product has done no work you can see.
        </p>
      </div>
    </div>
  </section>

  <section class="prose prose--alt">
    <div class="wrap prose__grid">
      <div class="prose__side" data-rise><p class="mono">Step two</p></div>
      <div class="prose__body" data-rise data-rise-delay="60">
        <h2>It decides what actually needs you</h2>
        <p>
          Most of a morning does not need a person. A newsletter does not. A
          fourteenth promotion does not. Three people asking the same question
          about opening hours need one answer, not three decisions.
        </p>
        <p>
          So Cognivex separates the morning into what it can answer from what you
          have already approved, what it can draft but must not send, and what it
          genuinely cannot judge. Only the last two reach you.
        </p>
        <p class="prose__note">
          When it is not sure, it says so and asks. An uncertain draft is marked
          uncertain; it is never quietly sent.
        </p>
      </div>
    </div>
  </section>

  <section class="prose">
    <div class="wrap prose__grid">
      <div class="prose__side" data-rise><p class="mono">Step three</p></div>
      <div class="prose__body" data-rise data-rise-delay="60">
        <h2>What a draft contains</h2>
        <p>Every item that reaches you carries four things, always in the same order:</p>
        <ul class="checks">
          <li><b>What it is</b> — a reply, an invoice, a follow-up, a post.</li>
          <li><b>Who it concerns</b> — the customer, the supplier, the job.</li>
          <li><b>The draft itself</b> — written out in full, not summarised.</li>
          <li><b>Why it wrote it</b> — the reason, in one sentence you can check.</li>
        </ul>
        <p>
          The reasoning is not decoration. It is how you approve in four seconds
          instead of re-reading the original thread.
        </p>
      </div>
    </div>
  </section>

  <section class="prose prose--alt">
    <div class="wrap prose__grid">
      <div class="prose__side" data-rise><p class="mono">Step four</p></div>
      <div class="prose__body" data-rise data-rise-delay="60">
        <h2>What happens when you decide</h2>
        <ul class="checks">
          <li><b>Approve</b> — it sends, and the item moves into a record you can look back through.</li>
          <li><b>Edit</b> — the draft opens in place. What you send is what you wrote, not what it suggested.</li>
          <li><b>Skip</b> — it goes to the back of the queue. Nothing is sent and nothing is deleted.</li>
        </ul>
        <p>
          There is no fourth path where something leaves without you. That is not
          a setting you can loosen later; there is no code for it.
        </p>
      </div>
    </div>
  </section>
''' + closing(
    "See the four things it does.",
    "Inbox triage, invoices and follow-up, social posts, memory and priorities. That is the whole list.",
    "Capabilities", "capabilities.html")


# ── capabilities ───────────────────────────────────────────────────────────
CAPS = phero(
    "Capabilities",
    'Four things, <em>done properly.</em>',
    "This is the complete list. If something is not on this page, it is not "
    "built, and the site will not imply otherwise."
) + '''
  <section class="prose" id="inbox">
    <div class="wrap prose__grid">
      <div class="prose__side" data-rise><p class="mono">One</p></div>
      <div class="prose__body" data-rise data-rise-delay="60">
        <h2>Inbox triage</h2>
        <p class="prose__lede">Forty emails in, a handful of decisions out — each with a reply already written.</p>
        <p>
          It reads the morning, groups what repeats, answers what you have
          already approved answers for, and brings you the rest with a draft
          attached. The supplier chasing payment for the second time is not
          buried under fourteen promotions.
        </p>
        <p><b>What you control:</b> which mailboxes it reads, which questions it may answer without asking, and which topics always come to you.</p>
      </div>
    </div>
  </section>

  <section class="prose prose--alt" id="invoices">
    <div class="wrap prose__grid">
      <div class="prose__side" data-rise><p class="mono">Two</p></div>
      <div class="prose__body" data-rise data-rise-delay="60">
        <h2>Invoices and follow-up</h2>
        <p class="prose__lede">Knows which client has not paid since March, and drafts the chase.</p>
        <p>
          It tracks what has been invoiced, what has been paid, and what is
          overdue. On the dates you choose it drafts the invoice or the
          follow-up, in the same thread as the last conversation, and puts it in
          front of you.
        </p>
        <p class="prose__note">
          It drafts invoices. It does not move money, take payment, or touch your
          bank. There is no version of this product that does.
        </p>
      </div>
    </div>
  </section>

  <section class="prose" id="posts">
    <div class="wrap prose__grid">
      <div class="prose__side" data-rise><p class="mono">Three</p></div>
      <div class="prose__body" data-rise data-rise-delay="60">
        <h2>Social posts</h2>
        <p class="prose__lede">Say what you want posted. It writes it and lays it out; you look before it goes.</p>
        <p>
          You describe the post in plain language — what happened, which photos,
          what you want people to do. It writes the caption, lays out the post,
          and shows you the finished thing. Nothing appears anywhere until you
          have seen it.
        </p>
        <p><b>What you control:</b> the photos it may use, the tone, and the final word on every post.</p>
      </div>
    </div>
  </section>

  <section class="prose prose--alt" id="memory">
    <div class="wrap prose__grid">
      <div class="prose__side" data-rise><p class="mono">Four</p></div>
      <div class="prose__body" data-rise data-rise-delay="60">
        <h2>Memory and priorities</h2>
        <p class="prose__lede">What is due, what is overdue, what to do first — and why that order.</p>
        <p>
          It remembers ongoing work across weeks, so you are not the only place
          the context lives. When it tells you what to do first it also tells you
          why it put that first, which means you can disagree with it.
        </p>
        <p><b>What you control:</b> what it remembers, what it forgets, and the order when you know better.</p>
      </div>
    </div>
  </section>

  <section class="prose">
    <div class="wrap prose__grid">
      <div class="prose__side" data-rise><p class="mono">Not built</p></div>
      <div class="prose__body" data-rise data-rise-delay="60">
        <h2>What this page does not claim</h2>
        <p>
          No call listening. No placing orders. No moving money. No named
          integrations. No accuracy or uptime figures, because there is nothing
          measured yet to quote.
        </p>
        <p>
          When any of that is built it will get its own section here, written the
          same way. Until then this page stays short.
        </p>
      </div>
    </div>
  </section>
''' + closing(
    "The obvious next question is whether to trust it.",
    "What it reads, what it will never do, and where the limits are.",
    "Trust", "trust.html")


# ── trust ──────────────────────────────────────────────────────────────────
TRUST = phero(
    "Trust",
    'You are giving an AI your inbox. <em>Here is exactly what that means.</em>',
    "The largest objection in this market deserves a page, not a footnote. "
    "Everything below is written so you can hold us to it."
) + '''
  <section class="prose">
    <div class="wrap prose__grid">
      <div class="prose__side" data-rise><p class="mono">The gate</p></div>
      <div class="prose__body" data-rise data-rise-delay="60">
        <h2>Nothing leaves without you</h2>
        <p>
          No message is sent, no post is published, no invoice goes out and no
          payment is ever made unless you approved that specific item. Not a
          category of items. That one.
        </p>
        <p>
          This is not a preference with a toggle. There is no autonomous mode
          waiting behind a settings page, and building one would mean building a
          different product.
        </p>
      </div>
    </div>
  </section>

  <section class="prose prose--alt">
    <div class="wrap prose__grid">
      <div class="prose__side" data-rise><p class="mono">Money</p></div>
      <div class="prose__body" data-rise data-rise-delay="60">
        <h2>It does not move money. Ever.</h2>
        <p>
          Cognivex drafts invoices and drafts follow-ups. It does not take
          payments, issue refunds, hold funds, or connect to your bank to move
          anything. The most it will ever do with money is write you a document
          about it and wait.
        </p>
      </div>
    </div>
  </section>

  <section class="prose">
    <div class="wrap prose__grid">
      <div class="prose__side" data-rise><p class="mono">Access</p></div>
      <div class="prose__body" data-rise data-rise-delay="60">
        <h2>It reads only what you switch on</h2>
        <p>
          Each source is connected by you, individually, and can be disconnected
          the same way. It does not go looking for accounts you did not connect,
          and it does not read a mailbox because it happens to be signed in on
          the same machine.
        </p>
        <p>Reading is not acting. Connecting a source lets it understand; it does not let it send.</p>
      </div>
    </div>
  </section>

  <section class="prose prose--alt">
    <div class="wrap prose__grid">
      <div class="prose__side" data-rise><p class="mono">Limits</p></div>
      <div class="prose__body" data-rise data-rise-delay="60">
        <h2>What it gets wrong</h2>
        <p>
          It will draft things you would not have written. It will occasionally
          misjudge what matters and put something in front of you that did not
          need you — and, less often but more importantly, group something as
          routine that you would have wanted to see.
        </p>
        <p>
          That is the honest reason the approval step exists. A product that
          claimed to never misjudge would be lying, and would then have no
          argument for why you should check its work.
        </p>
        <p class="prose__note">
          We do not publish accuracy figures. There is nothing measured yet that
          would make such a number true.
        </p>
      </div>
    </div>
  </section>

  <section class="prose">
    <div class="wrap prose__grid">
      <div class="prose__side" data-rise><p class="mono">Data</p></div>
      <div class="prose__body" data-rise data-rise-delay="60">
        <h2>Your data</h2>
        <div class="slot">
          <p class="slot__tag mono">Needed before launch</p>
          <p class="slot__what">Data handling specifics</p>
          <p class="slot__why">Where data is stored, how long it is kept, whether it is used for training, and how to export or delete it. These are commitments the founders must make, not ones this page can invent.</p>
        </div>
      </div>
    </div>
  </section>
''' + closing(
    "Who is building this.",
    "Two people at Digital Coyotes, and the reason they think the gate matters.",
    "About", "about.html")


# ── about ──────────────────────────────────────────────────────────────────
ABOUT = phero(
    "About",
    'Built by two people who <em>run the admin themselves.</em>',
    "Cognivex is made by Suraj Balke and Jordan Fernandes at Digital Coyotes."
) + '''
  <section class="prose">
    <div class="wrap prose__grid">
      <div class="prose__side" data-rise><p class="mono">Why</p></div>
      <div class="prose__body" data-rise data-rise-delay="60">
        <h2>The bet</h2>
        <p>
          Almost every AI product is sold on how little you have to do. That is a
          good pitch for work nobody sees and a bad one for a message to a client
          who is deciding whether to pay you.
        </p>
        <p>
          Cognivex is built on the opposite bet: that a small business owner will
          hand over the work long before they hand over the final say, and that
          the product which does the work and stops is more useful than the one
          that does everything and hopes.
        </p>
      </div>
    </div>
  </section>

  <section class="prose prose--alt">
    <div class="wrap prose__grid">
      <div class="prose__side" data-rise><p class="mono">Who</p></div>
      <div class="prose__body" data-rise data-rise-delay="60">
        <h2>The people</h2>
        <ul class="checks">
          <li><b>Suraj Balke</b> — Digital Coyotes.</li>
          <li><b>Jordan Fernandes</b> — Digital Coyotes.</li>
        </ul>
        <div class="slot">
          <p class="slot__tag mono">Needed before launch</p>
          <p class="slot__what">Roles and background</p>
          <p class="slot__why">One line each on what you actually do and why you are the people building this. Left blank rather than invented — made-up credentials are the fastest way to lose a real buyer.</p>
        </div>
      </div>
    </div>
  </section>
''' + closing(
    "Cognivex is not available yet.",
    "There is no waitlist, trial or private beta. When there is something to join, this is where it will say so.",
    "Contact", "contact.html")


# ── contact ────────────────────────────────────────────────────────────────
CONTACT = phero(
    "Contact",
    'Not available yet — <em>and saying so plainly.</em>',
    "Cognivex is in development. There is no waitlist, no trial and no private "
    "beta to join, and this page will not pretend otherwise to collect an email."
) + '''
  <section class="prose">
    <div class="wrap prose__grid">
      <div class="prose__side" data-rise><p class="mono">Reaching us</p></div>
      <div class="prose__body" data-rise data-rise-delay="60">
        <h2>How to get in touch</h2>
        <div class="slot">
          <p class="slot__tag mono">Needed before launch</p>
          <p class="slot__what">Contact route</p>
          <p class="slot__why">An email address, a form endpoint or a booking link. Every control on this site that offers contact currently leads here and stops. This is the one slot blocking launch.</p>
        </div>
        <p>
          Until that exists, there is genuinely nothing here to click, and a form
          that quietly went nowhere would be worse than an empty box.
        </p>
      </div>
    </div>
  </section>

  <section class="prose prose--alt">
    <div class="wrap prose__grid">
      <div class="prose__side" data-rise><p class="mono">Status</p></div>
      <div class="prose__body" data-rise data-rise-delay="60">
        <h2>Where the product is</h2>
        <p>
          In development. The approval queue on the home page is a working
          component you can operate, but it is illustrative — it is not connected
          to a live account, and there is no account to connect it to yet.
        </p>
      </div>
    </div>
  </section>
''' + closing(
    "See the thing working.",
    "The approval queue on the home page is real, and you can use it right now.",
    "Back to the demo", "index.html")


PAGES = [
    ("how-it-works.html", "How Cognivex works — Cognivex",
     "What Cognivex reads, how it decides what needs a decision, what a draft contains, and what happens when you approve, edit or skip.", HOW),
    ("capabilities.html", "Capabilities — Cognivex",
     "Inbox triage, invoices and follow-up, social posts, memory and priorities. The complete list of what Cognivex does.", CAPS),
    ("trust.html", "Trust — Cognivex",
     "Nothing is sent without your approval, Cognivex never moves money, and it reads only the sources you switch on.", TRUST),
    ("about.html", "About — Cognivex",
     "Cognivex is built by Suraj Balke and Jordan Fernandes at Digital Coyotes.", ABOUT),
    ("contact.html", "Contact — Cognivex",
     "Cognivex is in development and not yet available. There is no waitlist, trial or private beta.", CONTACT),
]

for href, title, desc, body in PAGES:
    io.open(href, "w", encoding="utf-8", newline="").write(shell(href, title, desc, body))
    print("wrote", href)
