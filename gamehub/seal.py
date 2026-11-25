#!/usr/bin/env python3
"""
seal.py - hides game URLs.

  python3 seal.py index.html                  seals every  embedUrl: 'https://...'  in index.html
  python3 seal.py index.html catalog.json     also writes catalog.sealed.json (rename it to catalog.json to use it)

What it does
  * every raw game URL becomes a random token like 'k3x9q2m7ab41zt' in index.html
  * the real URLs live only in zx9k.js, scrambled (XOR + base64) - rename that file freely,
    just change the <script src="zx9k.js"> line in index.html to match
  * safe to re-run: already-sealed tokens keep working, only NEW raw URLs get sealed
    (so to add a game: paste  embedUrl: 'https://...'  as usual, then run this again)
"""
import sys, re, json, os, base64, hashlib, secrets

VAULT = 'zx9k.js'
ALPHA = 'abcdefghijklmnopqrstuvwxyz0123456789'

TEMPLATE = '''/* vault */
(function(){
var K="%KEY%";
var M=%MAP%;
function b(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';var r=atob(s),a=new Uint8Array(r.length);for(var i=0;i<r.length;i++)a[i]=r.charCodeAt(i);return a;}
function x(a){var o=new Uint8Array(a.length);for(var i=0;i<a.length;i++)o[i]=a[i]^K.charCodeAt(i%K.length)^((i*31+7)&255);return o;}
function dec(s){try{return new TextDecoder().decode(x(b(s)));}catch(e){return '';}}
function enc(u){var a=x(new TextEncoder().encode(u)),r='';for(var i=0;i<a.length;i++)r+=String.fromCharCode(a[i]);return btoa(r).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');}
function url(t){if(!t)return '';t=String(t);if(t.charAt(0)==='~')return dec(t.slice(1));if(M[t])return dec(M[t]);return /^https?:\\/\\//i.test(t)?t:'';}
function img(t){t=String(t||'');return t.charAt(0)==='~'?dec(t.slice(1)):t;}
function seal(u){u=String(u||'');return(!u||u.charAt(0)==='~')?u:'~'+enc(u);}
Object.defineProperty(window,'__gl',{value:Object.freeze({url:url,seal:seal,img:img})});
})();
'''

def enc(url, key):
    k = key.encode()
    out = bytes(c ^ k[i % len(k)] ^ ((i * 31 + 7) & 255) for i, c in enumerate(url.encode('utf-8')))
    return base64.urlsafe_b64encode(out).decode().rstrip('=')

def token(url, key):
    h = hashlib.sha256((key + url).encode()).digest()
    return ''.join(ALPHA[x % 36] for x in h[:14])

def load_vault(path):
    if os.path.exists(path):
        t = open(path, encoding='utf-8').read()
        k = re.search(r'var K="([^"]+)";', t)
        m = re.search(r'var M=(\{.*?\});\n', t, re.S)
        if k and m:
            return k.group(1), json.loads(m.group(1))
    return ''.join(secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789') for _ in range(28)), {}

def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    html_path = sys.argv[1]
    folder = os.path.dirname(os.path.abspath(html_path))
    vault_path = os.path.join(folder, VAULT)
    key, vmap = load_vault(vault_path)

    html = open(html_path, encoding='utf-8').read()
    added = 0
    def sub(m):
        nonlocal added
        url = m.group(3)
        t = token(url, key)
        if t not in vmap:
            vmap[t] = enc(url, key); added += 1
        return m.group(1) + "'" + t + "'"
    def subimg(m):
        nonlocal added
        added += 1
        return m.group(1) + "'~" + enc(m.group(3), key) + "'"
    # screenshot thumbnails (wordpress mshots) embed the game's own address, so seal those too
    html = re.sub(r"""(thumbnail\s*:\s*)(['"])(https://s\.wordpress\.com/mshots/[^'"]+)\2""", subimg, html)
    html = re.sub(r"""(embedUrl\s*:\s*)(['"])(https?://[^'"]+)\2""", sub, html)
    open(html_path, 'w', encoding='utf-8').write(html)

    js = TEMPLATE.replace('%KEY%', key).replace('%MAP%', json.dumps(vmap, separators=(',', ':'), sort_keys=True))
    open(vault_path, 'w', encoding='utf-8').write(js)
    print(f'{html_path}: sealed {added} new url(s), {len(vmap)} total in {VAULT}')

    if len(sys.argv) > 2:
        cat = json.load(open(sys.argv[2], encoding='utf-8'))
        n = 0
        for it in cat:
            u = it.get('url')
            if isinstance(u, str) and u and not u.startswith('~'):
                it['url'] = '~' + enc(u, key); n += 1
        out = os.path.join(os.path.dirname(os.path.abspath(sys.argv[2])), 'catalog.sealed.json')
        json.dump(cat, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        print(f'{sys.argv[2]}: sealed {n} url(s) -> {out}')

if __name__ == '__main__':
    main()
