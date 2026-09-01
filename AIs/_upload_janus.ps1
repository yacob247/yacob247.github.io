$root = 'C:\Users\youse\Downloads\janus'
$bucket = 'ai-images'
$files = Get-ChildItem -Path $root -Recurse -File
$i = 0
foreach ($f in $files) {
    $i++
    $rel = $f.FullName.Substring($root.Length).TrimStart('\')
    $key = "janus/$($rel.Replace('\','/'))"
    $ext = $f.Extension.ToLower()
    $ct = if ($ext -eq '.onnx') { 'application/octet-stream' } elseif ($ext -eq '.json') { 'application/json' } else { 'application/octet-stream' }
    Write-Host "[$i/$($files.Count)] $key ($([math]::Round($f.Length/1MB,1))MB)"
    & wrangler r2 object put "$bucket/$key" --file $f.FullName --content-type $ct --remote --force 2>&1 | Where-Object { $_ -match 'Error|error|Success|Upload|created|exists' } | ForEach-Object { Write-Host "  `$_" }
}