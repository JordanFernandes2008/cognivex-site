"""Stamp site.css / site.js references with a content hash.

Neither asset has a hashed filename, so a browser is free to keep serving a
copy it already has - which is exactly what happened here: edits landed on
disk, the server served them, and the page kept running the previous script.
A query string derived from the file's own bytes changes only when the file
changes, so caches update on their own and never need to be cleared by hand.
"""
import hashlib
import io
import os
import re

ROOT = r'C:\Users\LENOVO_17\Downloads\cognivex-rebuild'
PAGES = ['index.html', 'how-it-works.html', 'capabilities.html',
         'trust.html', 'about.html', 'contact.html',
         # The 404 is served by Vercel for unmatched routes and needs the same
         # cache busting as everything else - it was left off this list when it
         # was added, so its stylesheet link went out unstamped.
         '404.html']


def digest(name):
    with open(os.path.join(ROOT, name), 'rb') as fh:
        return hashlib.sha256(fh.read()).hexdigest()[:8]


ASSETS = ['site.css', 'site.js', 'motion.js', 'cursor.js', 'walk.js', 'film.js', 'levi.js', 'levi-home.js',
          # levi3d.js is a module and is stamped like the rest; vendor/ is
          # not, matching how gsap and lenis are already loaded.
          'levi3d.js',
          'queue-butler.js',
          'queue-data.js',
          'digest.js',
          'rail.js',
          'today.js',
          # boot.js is loaded from the HEAD of index.html only - it has to run
          # before <body> exists so the cold start's black is on the first paint.
          'boot.js', 'cold.js']

stamps = {}
for name in ASSETS:
    stamps[name] = digest(name)
    print('%-10s -> %s' % (name, stamps[name]))

for page in PAGES:
    path = os.path.join(ROOT, page)
    text = io.open(path, encoding='utf-8').read()
    before = text
    for name, ver in stamps.items():
        esc = re.escape(name)
        attr = 'href' if name.endswith('.css') else 'src'
        text = re.sub(r'%s="%s(?:\?v=[0-9a-f]+)?"' % (attr, esc),
                      '%s="%s?v=%s"' % (attr, name, ver), text)
    if text != before:
        io.open(path, 'w', encoding='utf-8', newline='').write(text)
        print('stamped %s' % page)
    else:
        print('NO CHANGE %s  (check the tag spelling)' % page)
