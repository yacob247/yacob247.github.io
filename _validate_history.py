import re, glob

def check(path):
    t = open(path, encoding='utf-8').read()
    problems = []
    for tag in ['html','head','body','div','table','tr','td','th','ul','ol','script','nav','footer','title']:
        o = len(re.findall(r'<'+tag+r'[ >]', t))
        c = t.count('</'+tag+'>')
        if o != c:
            problems.append('%s open=%d close=%d' % (tag, o, c))
    return problems

allok = True
for p in sorted(glob.glob('Greece_History/*.html') + glob.glob('Rome_History/*.html')):
    probs = check(p)
    if probs:
        allok = False
        print('ISSUES', p, probs)
    else:
        print('OK', p)
print('ALL_OK' if allok else 'FOUND_ISSUES')