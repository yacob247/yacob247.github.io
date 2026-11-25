$p = 'c:\Users\youse\Downloads\New folder (19)\Persuasive Text\persuasive-text.html'
$raw = Get-Content -Raw -Encoding UTF8 $p
$raw = $raw.Replace('<summary>· ', '<summary>')
Set-Content -Path $p -Value $raw -Encoding UTF8
Write-Output 'bullet-fixed'
