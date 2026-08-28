$ErrorActionPreference = 'SilentlyContinue'
$root = (Get-Location).Path
$sitemap = Get-Content -Path sitemap.xml -Raw
$base = 'https://envizion.work'

# Normalize a sitemap <loc> into a "file-style" relative path (URL-decoded)
$set = @{}
[regex]::Matches($sitemap, '<loc>([^<]+)</loc>') | ForEach-Object {
    $u = $_.Groups[1].Value.Trim()
    if ($u -eq $base -or $u -eq "$base/") { $set['index.html'] = $true; return }
    if (-not $u.StartsWith("$base/")) { return }
    $rel = $u.Substring($base.Length + 1)
    $rel = [System.Uri]::UnescapeDataString($rel)
    if ($rel -eq '') { $set['index.html'] = $true; return }
    if ($rel.EndsWith('/')) { $rel = $rel + 'index.html' }
    $set[$rel] = $true
}

$missing = @()
Get-ChildItem -Path . -Recurse -Filter *.html -File | ForEach-Object {
    $rel = $_.FullName.Substring($root.Length + 1).Replace('\', '/')
    $head = Get-Content -LiteralPath $_.FullName -TotalCount 80 | Out-String
    if ($head -match 'noindex') { return }
    if ($set.ContainsKey($rel)) { return }
    $missing += $rel
}
Write-Output ("TOTAL_MISSING=" + $missing.Count)
$missing | Sort-Object

# Also report sitemap <loc>s that do NOT correspond to a file on disk (stale entries)
$fileset = @{}
Get-ChildItem -Path . -Recurse -Filter *.html -File | ForEach-Object {
    $rel = $_.FullName.Substring($root.Length + 1).Replace('\', '/')
    $fileset[$rel] = $true
}
Write-Output '--- STALE (in sitemap, no file) ---'
[regex]::Matches($sitemap, '<loc>([^<]+)</loc>') | ForEach-Object {
    $u = $_.Groups[1].Value.Trim()
    if ($u -eq $base -or $u -eq "$base/") { return }
    if (-not $u.StartsWith("$base/")) { return }
    $rel = $u.Substring($base.Length + 1)
    $rel = [System.Uri]::UnescapeDataString($rel)
    if ($rel.EndsWith('/')) { $rel = $rel + 'index.html' }
    if (-not $fileset.ContainsKey($rel)) { Write-Output $rel }
}
