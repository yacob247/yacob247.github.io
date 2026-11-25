$p = "c:\Users\youse\Downloads\New folder (19)\Persuasive Text\persuasive-text.html"
$raw = Get-Content -Raw -Encoding UTF8 $p
# Remove the leftover duplicate intro (old h2 + old p + old tip) that sits right after the new summary
$pattern = "<h2 id=`"vocab`">200 Powerful Words to Know for HSC Persuasive Writing</h2>\r?\n\s*<p>\r?\n\s*A Band 6 persuasive text is powered by <strong>advanced, precise vocabulary</strong>.*?draw on automatically\.\r?\n\s*</div>\r?\n"
$raw = [regex]::Replace($raw, $pattern, '', [System.Text.RegularExpressions.RegexOptions]::Singleline)
# Remove stray bullet in category summaries
$raw = $raw -replace '(<summary>)&nbsp;· ', '$1'
$raw = $raw -replace '(<summary>)· ', '$1'
Set-Content -Path $p -Value $raw -Encoding UTF8
Write-Output 'cleaned'
