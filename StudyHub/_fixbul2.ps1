$p = 'c:\Users\youse\Downloads\New folder (19)\Persuasive Text\persuasive-text.html'
$raw = Get-Content -Raw -Encoding UTF8 $p
# Remove leading middle dot + space in each category summary
$raw = [regex]::Replace($raw, '<summary>·\s+', '<summary>')
Set-Content -Path $p -Value $raw -Encoding UTF8
Write-Output 'bullet-fixed-v2'
 