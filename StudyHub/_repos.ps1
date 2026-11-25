$p = 'c:\Users\youse\Downloads\New folder (19)\Persuasive Text\persuasive-text.html'
$l = Get-Content -Encoding UTF8 $p

# Find block boundaries (0-based)
$blkStart = -1; $blkEnd = -1
for($i=0; $i -lt $l.Count; $i++){
  if($l[$i] -match 'COLLAPSIBLE POWER VOCABULARY'){ $blkStart = $i }
  if($blkStart -ge 0 -and $l[$i] -match '^    </div>$' -and $i -gt $blkStart){ $blkEnd = $i; break }
}
Write-Output "block start(1-based)=$($blkStart+1) end(1-based)=$($blkEnd+1)"
if($blkStart -lt 0 -or $blkEnd -lt 0){ exit 1 }

# Insertion point: after line index 45 (the "How to use" tip close), i.e., before line index 46
$insertAt = 45   # insert new block at this index

$block = $l[$blkStart..$blkEnd]
$rest  = $l[0..($blkStart-1)] + $l[($blkEnd+1)..($l.Count-1)]

# Now insert block into rest at insertAt
$before = $rest[0..($insertAt)]
$after  = $rest[($insertAt+1)..($rest.Count-1)]
$new = $before + $block + $after

Set-Content -Path $p -Value $new -Encoding UTF8
Write-Output ("moved. old=" + $l.Count + " new=" + $new.Count)
