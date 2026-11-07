import os, json, re

ROOT = r'c:\Users\youse\Downloads\yacob247.github.io-main\yacob247.github.io-main'
JSFILES = []
for folder in ['jaavscripts','tools','tools2','SupperAi']:
    base = os.path.join(ROOT, folder)
    if os.path.isdir(base):
        JSFILES += [os.path.join(base,f) for f in os.listdir(base) if f.endswith('.js')]

funcs = []
for fp in JSFILES:
    rel = os.path.relpath(fp, ROOT)
    with open(fp, encoding='utf-8', errors='ignore') as fh:
        src = fh.read()
    # function name(params) {
    for m in re.finditer(r'\b(function\s+([A-Za-z0-9_$]+)\s*\([\s\S]*?\)*\s*\{)', src, re.S):
        name = m.group(2)
        line = src[:m.start()].count('\n')+1
        funcs.append({'name':name,'file':rel,'line':line,'signature':m.group(1).strip()})
    # const name = function or name = function
    for m in re.finditer(r'(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?function\s*\(', src):
        name = m.group(1)
        line = src[:m.start()].count('\n')+1
        funcs.append({'name':name,'file':rel,'line':line,'signature':m.group(0).strip()})
    # property: name: function()
    for m in re.finditer(r'([A-Za-z0-9_$]+)\s*:\s*(?:async\s*)?function\s*\(', src):
        name = m.group(1)
        line = src[:m.start()].count('\n')+1
        funcs.append({'name':name,'file':rel,'line':line,'signature':m.group(0).strip()})

# Remove duplicates
dedup = {}
for fn in funcs:
    key = (fn['name'], fn['file'], fn['line'])
    dedup[key] = fn

with open(os.path.join(ROOT,'ENVIZION_FUNCTION_INVENTORY.json'),'w',encoding='utf-8') as f:
    json.dump(list(dedup.values()), f, indent=2)

print('Total function definitions:', len(dedup))
