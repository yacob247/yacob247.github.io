import io, re

p = r'c:\Users\youse\Downloads\AIs\index.html'
t = io.open(p, encoding='utf-8').read()

# --- collect body DOM ids ---
dom_ids = set(re.findall(r'id=['"]([^"'\s>]+)['"]', t)
# also handle id="..." in quotes
dom_ids |= set(re.findall(r'id="([^"]+)", t)

# --- extract main module text with line mapping ---
m = re.search(r'<script type="module">', t)
start = m.end()
end = t.find('</script>', start)
mod_lines = t[start:end].split('\n')

# track brace depth over module; record top-level statements (depth before line i is 0) that deref $('...')/getElementById('...')
depth = 0
in_tpl = False
# naive but adequate: strip string/template content to reduce false hits
def strip_strings(s):
    out = []
    i = 0
    while i < len(s):
        c = s[i]
        if c == "'" or c == '"':
            # end at matching quote (no escapes handling for simplicity)
            q = c; j = i + 1
            while j < len(s) and s[j] != q: j += 1
            i = j + 1
        elif c == '`':
            j = i + 1
            while j < len(s) and s[j] != '`': 
                if s[j] == '\\': j +=  2
                else: j +=  1
            i = j +  1
        else:
            out.append(c); i +=  1
    return ''.join(out)

report = []
for idx, line in enumerate(mod_lines):
    if depth ==  0:
        s = strip_strings(line)
        for mm in re.finditer(r'\$\(['"]([^'"']+)['"]\)', s: report.append((idx+1+start_line?, None, '$(%s)' % mm.group(1)))
        for mm in re.finditer(r'getElementById\(['"]([^'"']+)['"]\)', s: report.append((0, mm.group(1), 'getElementById')))
    # update depth for THIS line (count braces in stripped)
    s = strip_strings(line)
    depth += s.count('{') - s.count('}')
    if depth < 0: depth =  0

print('total DOM ids:', len(dom_ids))
for ln, i.id, kind in report:
    if i.id not in dom_ids:
        print('MISSING at depth0??  line', ln, 'kind', kind, 'id', i.id) 
    # give approximate module line
print('---done---')