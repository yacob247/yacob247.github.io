$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
$path = 'sitemap.xml'
$raw = [System.IO.File]::ReadAllText((Join-Path $root $path))

# 1) remove stale StudyHub/StudyHub double-prefix <url> blocks
$raw = [regex]::Replace($raw, '<url>\s*<loc>https://envizion\.work/StudyHub/StudyHub/[^<]+</loc>.*?</url>', '', [System.Text.RegularExpressions.RegexOptions]::Singleline)

# 2) fix %20-encoded folder names to the real on-disk folders
$raw = $raw.Replace('09_discursive%20Text', '09_Discursive_Text').Replace('10_Persuasive%20Text', '10_Persuasive_Text')

# 3) collect every on-disk html file not yet covered (games/posts/index/blog handled separately)
$files = Get-ChildItem -Path reviews-blog, tools, tools2, StudyHub, Game, World_Civilizations, Rome_History, Greece_History, arabic-stories -Recurse -Filter *.html | Where-Object { $_.FullName -notmatch '\\reviews-blog\\games\\|\\reviews-blog\\posts\\|\\reviews-blog\\index\.html$|\\reviews-blog\\blog\.html$' }

$existing = [regex]::Matches($raw, '<loc>(https://envizion\.work/[^<]+)</loc>') | ForEach-Object { $_.Groups[1].Value }

$blocks = [System.Collections.Generic.List[string]]::new()
foreach ($f in $files) {
  $rel = $f.FullName.Substring($root.Length + 1).Replace('\','/')
  $loc = 'https://envizion.work/' + $rel
  if ($existing -notcontains $loc) {
    $lm = if ($rel.StartsWith('Game/')) { '2026-08-22' } else { '2026-08-17' }
    $blocks.Add("<url>`n <loc>$loc</loc>`n <lastmod>$lm</lastmod>`n <changefreq>weekly</changefreq>`n</url>`n")
  }
}
$insert = "`n" + ($blocks -join '')
$idx = $raw.LastIndexOf('</urlset>')
$raw = $raw.Substring(0, $idx) + $insert + $raw.Substring($idx)

[System.IO.File]::WriteAllText((Join-Path $root $path), $raw, [System.Text.UTF8Encoding]::new($false))
Write-Output ("Added " + $blocks.Count + " new <url> entries.")
$doc2 = [xml]$raw
Write-Output ("Total <url> entries now: " + @($doc2.urlset.url).Count)
