# -*- coding: utf-8 -*-
from html.parser import HTMLParser
import glob

VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}

class P(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.err = []
    def handle_starttag(self, tag, attrs):
        if tag not in VOID:
            self.stack.append(tag)
    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack or self.stack[-1] != tag:
            self.err.append('closing </%s> but expected </%s>' % (tag, self.stack[-1] if self.stack else 'TOP'))
        else:
            self.stack.pop()

for f in sorted(glob.glob('mesoamerica/aztec/*.html')):
    p = P()
    p.feed(open(f, encoding='utf-8').read())
    status = 'OK' if not p.err and not p.stack else ('OPEN:%s ERR:%s' % (p.stack, p.err))
    print(f, status)