$ErrorActionPreference = 'Stop'
$p = "c:\Users\youse\Downloads\New folder (19)\Persuasive Text\persuasive-text.html"
$l = Get-Content $p

# Locate boundaries
$start = -1; $refStart = -1
for($i=0; $i -lt $l.Count; $i++){
  if($l[$i] -match '<h2 id="vocab">'){ $start = $i }
  if($l[$i] -match '<h2 id="references">'){ $refStart = $i; break }
}
if($start -lt 0 -or $refStart -lt 0){ Write-Output "BOUNDARY ERROR start=$start ref=$refStart"; exit 1 }

$head = $l[0..($start-1)]
$tail = $l[$refStart..($l.Count-1)]
$vb = $l[$start..($refStart-1)]

# Build new collapsible vocabulary
$out = New-Object System.Collections.Generic.List[string]
$out.Add('')
$out.Add('    <!-- ===== COLLAPSIBLE POWER VOCABULARY (top) ===== -->')
$out.Add('    <div class="vocab-wrap">')
$out.Add('        <details id="vocab" class="vmaster" open>')
$out.Add('            <summary>Power Vocabulary: 200 Words to Know for HSC Persuasive Writing &#9660; (click to open / close)</summary>')
$out.Add('            <p>A Band 6 persuasive text is powered by <strong>advanced, precise vocabulary</strong>. Below are <strong>200 powerful words</strong>, organised by the job they do. Click any highlighted word anywhere in this guide and the page will scroll up and open its definition here.</p>')
$out.Add('            <div class="tip"><strong>How to use this bank:</strong> Do not cram all 200 at once. Pick 10&ndash;15 from one category, learn their meanings, and deliberately include them in your next draft. Over a term you will build a rich vocabulary you draw on automatically.</div>')

$firstCat = $true
foreach($lineText in $vb){
  if($lineText -match '<h3>(\s*[0-9]+[^<]*)<\/h3>'){
    $title = ($matches[1] -replace '^\s*[0-9]+\s*','').Trim()
    if($title -match '^How to Use'){ continue }  # skip action-plan header here, handled below
    if($firstCat){
      # open first nested category
      $out.Add('            <details class="vcat">')
      $out.Add('                <summary>' + $title + '</summary>')
      $firstCat = $false
    } else {
      $out.Add('            </details>')  # close prev vcat
      $out.Add('            <details class="vcat">')
      $out.Add('                <summary>' + $title + '</summary>')
    }
  }
  elseif($lineText -match '<h3>') {
    # fallback h3 (action plan) - ignore in loop
  }
  else {
    $out.Add('    ' + $lineText)
    # if this line is a <ul> that begins a category body, fine; keep tracking
  }
}
# close last vcat if any were opened
if(-not $firstCat){ $out.Add('            </details>') }

# Append action plan tip (original 10 block) inside master
$out.Add('            <div class="tip">')
$out.Add('                <p><strong>Learn deliberately:</strong> Choose 10&ndash;15 words from one category each week and write each in a sentence of your own that argues a point you care about.</p>')
$out.Add('                <p><strong>Deploy naturally:</strong> A single precisely chosen word (like "untenable" instead of "wrong") can transform an argument. One strong word in the right place beats ten forced ones.</p>')
$out.Add('                <p><strong>Practise:</strong> Challenge yourself to use 3&ndash;5 of these words in every persuasive draft. Over a term you will build a sophisticated vocabulary that lifts your writing to Band 6 level.</p>')
$out.Add('            </div>')
$out.Add('        </details>')
$out.Add('    </div>')
$out.Add('')

$new = New-Object System.Collections.Generic.List[string]
foreach($x in $head){ $new.Add($x) }
foreach($x in $out){ $new.Add($x) }
foreach($x in $tail){ $new.Add($x) }

Set-Content -Path $p -Value $new
Write-Output ("DONE. old lines=" + $l.Count + " new lines=" + $new.Count + " vocabStart(1-based)=" + ($start+1) + " refStart(1-based)=" + ($refStart+1))
