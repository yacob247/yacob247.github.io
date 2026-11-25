import glob, re

def words(path):
    t = open(path, encoding='utf-8').read()
    t = re.sub(r'<script.*?</script>', ' ', t, flags=re.S)
    t = re.sub(r'<style.*?</style>', ' ', t, flags=re.S)
    t = re.sub(r'<[^>]+>', ' ', t)
    t = re.sub(r'&[a-zA-Z]+;', ' ', t)
    return len(t.split())

for folder in ['Greece_History', 'Rome_History']:
    print('==== ', folder, ' ====')
    for p in sorted(glob.glob(folder + '/*.html')):
        print('%-28s %5d words' % (p, words(p)))