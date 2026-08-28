$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
$doc = [xml](Get-Content -Raw sitemap.xml)
$locs = @($doc.urlset.url | ForEach-Object { $_.loc })
Write-Output ("XML parse OK. Total <url> entries: " + $locs.Count)

$dupes = $locs | Group-Object | Where-Object { $_.Count -gt 1 }
Write-Output ("Duplicate URLs: " + (@($dupes).Count))

$dirs = 'reviews-blog', 'tools', 'tools2', 'StudyHub', 'Game', 'World_Civilizations', 'Rome_History', 'Greece_History', 'arabic-stories'
$files = Get-ChildItem -Path $dirs -Recurse -Filter *.html | Where-Object { $_.FullName -notmatch '\\reviews-blog\\games\\|\\reviews-blog\\posts\\|\\reviews-blog\\index\.html$|\\reviews-blog\\blog\.html$' }

$missing = @()
foreach ($f in $files) {
  $rel = $f.FullName.Substring($root.Length + 1).Replace('\','/')
  $loc = 'https://envizion.work/' + $rel
  if ($locs -notcontains $loc) { $missing += $loc }
}
Write-Output ("On-disk files not in sitemap (missing): " + $missing.Count)
$missing | ForEach-Object { Write-Output ('  MISSING: ' + $_) }

$stale = @()
foreach ($l in $locs) {
  $rel = $l.Replace('https://envizion.work/', '')
  $first = ($rel -split '/')[0]
  if ($dirs -notcontains $first) { continue }
  $relFile = $rel.Replace('/', '\')
  if (-not (Test-Path (Join-Path $root $relFile))) { $stale += $l }
}
Write-Output ("Sitemap URLs with no local file (stale): " + $stale.Count)
$stale | ForEach-Object { Write-Output ('  STALE: ' + $_) }

if ($missing.Count -eq 0 -and $stale.Count -eq 0 -and @($dupes).Count -eq 0) {
  Write-Output 'RESULT: PASS - sitemap fully matches the site files.'
} else {
  Write-Output 'RESULT: FAIL - see details above.'
}
