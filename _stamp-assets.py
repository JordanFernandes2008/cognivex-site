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
         'trust.html', 'about.html', 'contact.html']


def digest(name):
    with open(os.path.join(ROOT, name), 'rb') as fh:
        return hashlib.sha256(fh.read()).hexdigest()[:8]


css_v = digest('site.css')
js_v = digest('site.js')
print('site.css -> %s' % css_v)
print('site.js  -> %s' % js_v)

for page in PAGES:
    path = os.path.join(ROOT, page)
    text = io.open(path, encoding='utf-8').read()
    before = text
    text = re.sub(r'href="site\.css(?:\?v=[0-9a-f]+)?"',
                  'href="site.css?v=%s"' % css_v, text)
    text = re.sub(r'src="site\.js(?:\?v=[0-9a-f]+)?"',
                  'src="site.js?v=%s"' % js_v, text)
    if text != before:
        io.open(path, 'w', encoding='utf-8', newline='').write(text)
        print('stamped %s' % page)
    else:
        print('NO CHANGE %s  (check the tag spelling)' % page)
