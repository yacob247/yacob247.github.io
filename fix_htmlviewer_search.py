from pathlib import Path

f = Path(r'C:\Users\youse\Downloads\yacob247.github.io-main\yacob247.github.io-main\tools\htmlviewer.html')
text = f.read_text(encoding='utf-8')

# Fix 1: overlay z-index 99998 -> 999999
text = text.replace(
    'z-index:99998;background:rgba(0,0,0,.75)',
    'z-index:999999;background:rgba(0,0,0,.75)'
)

# Fix 2: button z-index 99997 -> 999999
text = text.replace(
    'z-index:99997;background:#4f8ef7',
    'z-index:999999;background:#4f8ef7'
)

# Fix 3: restore overflow on open/close
text = text.replace(
    "document.getElementById('ez-search-overlay').style.display = 'flex';",
    "document.body.style.overflow='visible'; document.getElementById('ez-search-overlay').style.display = 'flex';"
)
text = text.replace(
    "document.getElementById('ez-search-overlay').style.display = 'none';",
    "document.body.style.overflow='hidden'; document.getElementById('ez-search-overlay').style.display = 'none';"
)

f.write_text(text, encoding='utf-8')
print('Done - all 4 fixes applied')
