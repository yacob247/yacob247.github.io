# Function Trace Summary (all buttons)

Total unique called functions from buttons: 163

## Functions found in jaavscripts
### `addSheet`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) { saveStateForHistory(); const n=`Sheet ${Object.keys(sheets).length+1}`; sheets[n]={}; activeSheet=n; renderSheetTabs(); rebuildGrid(); saveToLocalStorage(); } function deleteSheet(name) { if(Objec  
  **Input refs:** 0\n\n### `addStickyCard`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** ) {             const mid = screenToCanvasCoords(window.innerWidth / 2, window.innerHeight / 2);             createCustomCard({                 type: 'sticky',                 content: 'Enter custom i  
  **Input refs:** 0\n\n### `addTableCard`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** ) {             const mid = screenToCanvasCoords(window.innerWidth / 2, window.innerHeight / 2);             const card = createCustomCard({                 type: 'table',                 content: '',  
  **Input refs:** 0\n\n### `addTextCard`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** ) {             const mid = screenToCanvasCoords(window.innerWidth / 2, window.innerHeight / 2);             createCustomCard({                 type: 'text',                 content: 'Edit Text Block'  
  **Input refs:** 0\n\n### `addWorkspaceBulkUrls`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** {             const input = document.getElementById('workspace-bulk-urls');             const urls = input.value.split(/\r?\n/).map(v => v.trim()).filter(Boolean);             if (!urls.length) { show  
  **Input refs:** 1\n\n### `adjustZoom`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** `delta`  
  **Snippet:** ) {             let nextZoom = zoom + delta;             if (nextZoom < minZoom) nextZoom = minZoom;             if (nextZoom > maxZoom) nextZoom = maxZoom;              // Zoom centered on viewport c  
  **Input refs:** 0\n\n### `applyBulkKey`
- **File:** `jaavscripts\animator_studio.js`  
  **Params:** ``  
  **Snippet:** {             const rawKey = bulkKeyInput.value.trim().toLowerCase();             let appliedCount = 0;              let highestOrder = 0;             animationData.forEach(a => {                 if (  
  **Input refs:** 0\n\n### `batchClearSelection`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** ) {             clearSelections();         }          // Send selected items to the Envizion Editor via IndexedDB         async function sendSelectedToEditor() {             if (selectedCards.length =  
  **Input refs:** 0\n\n### `batchExportZip`
- **File:** `jaavscripts\mediaforge.js`  
  **Params:** ``  
  **Snippet:** ) {     if (markedFrames.length === 0) return triggerToast('Empty Queue', 'No frames to export.', 'error');     triggerToast('Zipping', 'Packaging frames...', 'info');     const zip = new JSZip();      
  **Input refs:** 0\n\n### `captureCurrentFrame`
- **File:** `jaavscripts\mediaforge.js`  
  **Params:** ``  
  **Snippet:** ) {     if (!mainVideo || videoDuration === 0) return;     const canvas = document.createElement('canvas');     canvas.width = videoWidth;     canvas.height = videoHeight;     canvas.getContext('2d').  
  **Input refs:** 0\n\n### `captureCurrentWorkspacePage`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** {             try {                 addWorkspacePage(document.title || 'Current Envizion page', window.location.href);                 showNotification('Current page captured with its title.');         
  **Input refs:** 1\n\n### `clearAllBookmarks`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) {     bookmarks = {};     renderBookmarks();     logOutput('All bookmarks cleared.', 'system'); }  // ============================================================ // TERMINAL v2.0 // ===============  
  **Input refs:** 1\n\n### `clearAllFiles`
- **File:** `jaavscripts\pdfmerger.js`  
  **Params:** ``  
  **Snippet:** ) {         if(applicationFiles.length === 0) return;         showModal("Clear All Files", "Are you sure you want to remove all files from the workspace?", "confirm", () => {             applicationFi  
  **Input refs:** 2\n\n### `clearBottomPanel`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) {     ['console','output','problems'].forEach(id => {         const el = document.getElementById('bp-' + id);         if (el) el.innerHTML = '';     });     const dbg = document.getElementById('bp-d  
  **Input refs:** 2\n\n### `clearConsoleLogs`
- **File:** `jaavscripts\Envizionomniconvertpro.js`  
  **Params:** ``  
  **Snippet:** ) {             document.getElementById("terminal-log-list").innerHTML = `<li class="text-slate-500">> System logs cleared. Ready for next process.</li>`;         }          // --- Core Application Lo  
  **Input refs:** 2\n\n### `clearFile`
- **File:** `jaavscripts\velolink.js`  
  **Params:** ``  
  **Snippet:** ) {     selectedFile = null;     document.getElementById('fileInfoBox').style.display = 'none';     document.getElementById('fileInput').value = '';     dropzone.style.display = ''; }  // ── SENDER ──  
  **Input refs:** 4\n\n### `clearFrameQueue`
- **File:** `jaavscripts\mediaforge.js`  
  **Params:** ``  
  **Snippet:** ) { markedFrames = []; updateFrameQueueUI(); }  async function batchExportZip() {     if (markedFrames.length === 0) return triggerToast('Empty Queue', 'No frames to export.', 'error');     triggerToa  
  **Input refs:** 0\n\n### `clearGrid`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) {   if(confirm("Clear all data in this sheet?")) { saveStateForHistory(); sheets[activeSheet]={}; saveToLocalStorage(); rebuildGrid(); } }  // =======================================================  
  **Input refs:** 0\n\n### `clearNotifications`
- **File:** `jaavscripts\luma_dashboard_clone.js`  
  **Params:** ``  
  **Snippet:** ) {             writeJSON(STORAGE_KEYS.notifications, []);             renderNotifications();         }          function setBoardType(type) {             document.getElementById('type-playground').cl  
  **Input refs:** 1\n\n### `clearSelectedCells`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) {   saveStateForHistory();   getRangeCells(selectionStart,selectionEnd).forEach(c=>setCellValue(c,""));   reevaluateAll(); }  // =====================================================================  
  **Input refs:** 0\n\n### `clearSelection`
- **File:** `jaavscripts\animator_studio.js`  
  **Params:** ``  
  **Snippet:** {             animationData.forEach(anim => anim.checked = false);             renderAnimationList();             updateBulkPanelVisibility();         };          window.applyBulkKey = function() {     
  **Input refs:** 0\n\n### `clearTerminal`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) {     const out = document.getElementById('terminal-output');     if (!out) return;     out.innerHTML = '';     addTerminalLine('HyperLive Terminal v2.0', 'text-green-400 font-bold');     addTermina  
  **Input refs:** 1\n\n### `closeAssetPreview`
- **File:** `jaavscripts\envizion_editor.js`  
  **Params:** `e`  
  **Snippet:** ) {       if (e && e.target !== document.getElementById('assetPreviewModal')) return;       const modal = document.getElementById('assetPreviewModal');       modal.classList.add('hidden');       const  
  **Input refs:** 4\n\n### `closeBottomPanel`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) {     bottomPanelOpen = false;     document.getElementById('bottom-panel').style.height = '0';     document.getElementById('resizer-bottom').classList.add('hidden'); }  function openBottomPanel() {   
  **Input refs:** 2\n\n### `closeError`
- **File:** `jaavscripts\local_vocal_remover.js`  
  **Params:** ``  
  **Snippet:** ) {             const modal = document.getElementById('error-modal');             const content = document.getElementById('error-modal-content');             modal.classList.add('opacity-0');           
  **Input refs:** 2\n\n### `closeModal`
- **File:** `jaavscripts\luma_dashboard_clone.js`  
  **Params:** ``  
  **Snippet:** ) {             modalOverlay.classList.add('hidden');             document.getElementById('board-name-input').value = '';         }         async function createBoard() {             const name = docu  
  **Input refs:** 2\n\n- **File:** `jaavscripts\pdfmerger.js`  
  **Params:** ``  
  **Snippet:** ) {         modalBox.classList.remove('scale-100', 'opacity-100');         modalBox.classList.add('scale-95', 'opacity-0');         setTimeout(() => { modalOverlay.classList.add('hidden'); }, 200);     
  **Input refs:** 3\n\n### `closePreview`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** ) {             const modal = document.getElementById('preview-modal');             modal.classList.add('hidden');             // stop any playing media             const inner = document.getElementBy  
  **Input refs:** 2\n\n### `closeSidebar`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) {     document.getElementById('sidebar').style.width = '0px';     document.querySelectorAll('.activity-icon').forEach(icon => icon.classList.remove('active')); }  function switchSidebar(view) {       
  **Input refs:** 2\n\n### `closeURLModal`
- **File:** `jaavscripts\luma_dashboard_clone.js`  
  **Params:** ``  
  **Snippet:** ) {             document.getElementById('url-modal-overlay').style.display = 'none';             document.getElementById('url-modal-input').value = '';         }         function openURLInPlayground()  
  **Input refs:** 3\n\n### `collapseAllFolders`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) {     document.querySelectorAll('#file-tree .dir-children').forEach(c => {         c.classList.add('hidden');         const header = c.previousElementSibling;         if (header) {             const  
  **Input refs:** 0\n\n### `copyCurrentWorkbook`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) {   const id=makeWorkbookId();   const copyName=document.getElementById("project-title").value+" (Copy)";   localStorage.setItem(getWorkbookStorageKey(id), JSON.stringify({sheets:JSON.parse(JSON.str  
  **Input refs:** 1\n\n### `copyLink`
- **File:** `jaavscripts\velolink.js`  
  **Params:** ``  
  **Snippet:** ) {     const url = document.getElementById('shareUrl').value;     if (!url || url === 'Setting up…') return;     navigator.clipboard.writeText(url).then(() => {         const btn = document.getElemen  
  **Input refs:** 3\n\n### `createBoardAndOpen`
- **File:** `jaavscripts\luma_dashboard_clone.js`  
  **Params:** ``  
  **Snippet:** ) { await createBoard(); }          function openURLModal() {             const ov = document.getElementById('url-modal-overlay');             ov.style.display = 'flex';             setTimeout(() => d  
  **Input refs:** 4\n\n### `createNewFile`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) {     // Build modal HTML     const modalHtml = `     <div id="new-file-modal" style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content  
  **Input refs:** 0\n\n### `createNewFolder`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) {     const name = prompt('New folder name:', 'new-folder');     if (!name) return;     const keepPath = name + '/.gitkeep';     vfs[keepPath] = { name: '.gitkeep', isText: true, content: '', fileOb  
  **Input refs:** 0\n\n### `createNewWorkbookFromApp`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) {   if(!confirm("Create a new workbook? Your current file is already saved locally.")) return;   const id=makeWorkbookId();   currentWorkbookId=id;   sheets={"Sheet 1":{}};   activeSheet="Sheet 1";   
  **Input refs:** 2\n\n### `deleteSelectedCol`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) {   saveStateForHistory();   const col=selectedCell.match(/[A-Z]+/i)[0].toUpperCase();   const colIdx=COLUMNS.indexOf(col);   const newSheetData={};   Object.keys(sheets[activeSheet]).forEach(coord=  
  **Input refs:** 0\n\n### `deleteSelectedRow`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) {   saveStateForHistory();   const row=parseInt(selectedCell.match(/[0-9]+/)[0]);   const newSheetData={};   Object.keys(sheets[activeSheet]).forEach(coord=>{     if(coord==='charts'){newSheetData.c  
  **Input refs:** 0\n\n### `dismissAlert`
- **File:** `jaavscripts\envizion_editor.js`  
  **Params:** ``  
  **Snippet:** ) {       const customAlert = document.getElementById('customAlert');       customAlert.classList.add('opacity-0', 'pointer-events-none', '-translate-y-4');       customAlert.classList.remove('opacity  
  **Input refs:** 1\n\n- **File:** `jaavscripts\envizion_pro_studio_editor.js`  
  **Params:** ``  
  **Snippet:** ) {       const el = document.getElementById('customAlert');       el.classList.add('opacity-0', 'pointer-events-none', '-translate-y-4');       el.classList.remove('opacity-100', 'translate-y-0');     
  **Input refs:** 1\n\n- **File:** `jaavscripts\local_video_image_mask_merger.js`  
  **Params:** ``  
  **Snippet:** ) {       const customAlert = document.getElementById('customAlert');       customAlert.classList.add('opacity-0', 'pointer-events-none', '-translate-y-4');       customAlert.classList.remove('opacity  
  **Input refs:** 1\n\n  ... and 1 more files\n\n### `downloadSelectedAsZip`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** ) {             const targets = selectedCards.length > 0 ? selectedCards : cards;             if (!targets.length) { showNotification('Nothing to download.'); return; }             await _buildAndDown  
  **Input refs:** 0\n\n### `downloadSelectedMerged`
- **File:** `jaavscripts\pdfmerger.js`  
  **Params:** ``  
  **Snippet:** ) {         const selected = applicationFiles.filter(f => f.selected);         if (selected.length === 0) return showModal("Notice", "Please select at least one file to merge.");         const shouldC  
  **Input refs:** 1\n\n### `downloadSelectedSeparately`
- **File:** `jaavscripts\pdfmerger.js`  
  **Params:** ``  
  **Snippet:** ) {         const selected = applicationFiles.filter(f => f.selected);         if (selected.length === 0) return showModal("Notice", "Please select at least one file to download.");         const outp  
  **Input refs:** 1\n\n### `execCopy`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) {   internalClipboard = getRangeCells(selectionStart, selectionEnd).map(coord => ({     coord, data: JSON.parse(JSON.stringify((sheets[activeSheet]||{})[coord]||{value:"",formula:"",style:{}}))   })  
  **Input refs:** 0\n\n### `execCut`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) { execCopy(); clearSelectedCells(); } function execPaste() {   if (!internalClipboard||!internalClipboard.length) return;   saveStateForHistory();   const baseColIdx=COLUMNS.indexOf(selectionStart.m  
  **Input refs:** 0\n\n### `execEditorCmd`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** `action`  
  **Snippet:** ) {     if (!editor || !isMonacoReady) return;     editor.focus();     editor.trigger('keyboard', action, null);     closeAllMenus(); }  function toggleWordWrap() {     if (!editor) return;     wordWr  
  **Input refs:** 0\n\n### `execPaste`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) {   if (!internalClipboard||!internalClipboard.length) return;   saveStateForHistory();   const baseColIdx=COLUMNS.indexOf(selectionStart.match(/[A-Z]+/i)[0].toUpperCase());   const baseRowIdx=parse  
  **Input refs:** 0\n\n### `exportCSV`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) {   const activeData=sheets[activeSheet]||{};   let maxRow=1, maxCol=0;   Object.keys(activeData).forEach(coord=>{     if(coord==='charts') return;     const r=parseInt(coord.match(/[0-9]+/)||[1]);   
  **Input refs:** 0\n\n### `exportVideoClip`
- **File:** `jaavscripts\mediaforge.js`  
  **Params:** ``  
  **Snippet:** ) {     if (clipEndTime <= clipStartTime) return triggerToast('Invalid Range', 'Out point must be after In point.', 'error');          let stream;     if (mainVideo.captureStream) stream = mainVideo.c  
  **Input refs:** 0\n\n### `exportWorkspaceFile`
- **File:** `jaavscripts\animator_studio.js`  
  **Params:** ``  
  **Snippet:** {             if (animationData.length === 0 && !currentModel) {                 showToast('Nothing to export yet — upload a character first.', 3000);                 return;             }              
  **Input refs:** 0\n\n### `exportWorkspacePages`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** {             const blob = new Blob([JSON.stringify(workspacePages, null, 2)], { type: 'application/json' });             const link = document.createElement('a');             link.href = URL.createOb  
  **Input refs:** 0\n\n### `ezClose`
- **File:** `jaavscripts\advanced-video-watermarker.js`  
  **Params:** ``  
  **Snippet:** {     document.getElementById('ez-search-overlay').style.display = 'none';     document.body.style.overflow = '';   };    document.addEventListener('keydown', function(e) {     if (e.key === 'Escape')  
  **Input refs:** 2\n\n- **File:** `jaavscripts\animator_studio.js`  
  **Params:** ``  
  **Snippet:** {     document.getElementById('ez-search-overlay').style.display = 'none';     document.body.style.overflow = '';   };    document.addEventListener('keydown', function(e) {     if (e.key === 'Escape')  
  **Input refs:** 2\n\n- **File:** `jaavscripts\background-remover.js`  
  **Params:** ``  
  **Snippet:** {     document.getElementById('ez-search-overlay').style.display = 'none';     document.body.style.overflow = '';   };    document.addEventListener('keydown', function(e) {     if (e.key === 'Escape')  
  **Input refs:** 2\n\n  ... and 40 more files\n\n### `ezOpen`
- **File:** `jaavscripts\advanced-video-watermarker.js`  
  **Params:** ``  
  **Snippet:** {     var ov = document.getElementById('ez-search-overlay');     ov.style.display = 'flex';     document.body.style.overflow = 'visible';     loadIndex(function() {});     setTimeout(function() { docu  
  **Input refs:** 3\n\n- **File:** `jaavscripts\animator_studio.js`  
  **Params:** ``  
  **Snippet:** {     var ov = document.getElementById('ez-search-overlay');     ov.style.display = 'flex';     document.body.style.overflow = 'visible';     loadIndex(function() {});     setTimeout(function() { docu  
  **Input refs:** 3\n\n- **File:** `jaavscripts\background-remover.js`  
  **Params:** ``  
  **Snippet:** {     var ov = document.getElementById('ez-search-overlay');     ov.style.display = 'flex';     document.body.style.overflow = 'visible';     loadIndex(function() {});     setTimeout(function() { docu  
  **Input refs:** 3\n\n  ... and 40 more files\n\n### `flipConversion`
- **File:** `jaavscripts\Envizionomniconvertpro.js`  
  **Params:** ``  
  **Snippet:** ) {             const sourceSelect = document.getElementById("source-format");             const targetSelect = document.getElementById("target-format");             const oldSource = sourceSelect.val  
  **Input refs:** 4\n\n### `formatActiveCell`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** `type`  
  **Snippet:** ) {   saveStateForHistory();   const activeData = sheets[activeSheet]||{};   if (!activeData[selectedCell]) activeData[selectedCell]={value:"",formula:"",style:{}};   if (!activeData[selectedCell].sty  
  **Input refs:** 0\n\n### `freezeTopRow`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) {   frozenRow = frozenRow===0 ? 1 : 0;   // Visual indicator only — proper sticky is already applied to row-1 header   alert(frozenRow ? "Top row freeze visual is active (scroll the sheet to see it   
  **Input refs:** 0\n\n### `generateChart`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** `type='bar'`  
  **Snippet:** ) {   if (!selectionStart||!selectionEnd||selectionStart===selectionEnd) { alert("Select a range of cells first."); return; }   const bounds=getRangeBounds(selectionStart,selectionEnd);   const labels  
  **Input refs:** 0\n\n### `generateLineChart`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) { generateChart('line'); } function generatePieChart() { generateChart('pie'); }  function renderCharts() {   const layer=document.getElementById("charts-layer"); layer.innerHTML="";   const charts=  
  **Input refs:** 1\n\n### `generatePieChart`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) { generateChart('pie'); }  function renderCharts() {   const layer=document.getElementById("charts-layer"); layer.innerHTML="";   const charts=sheets[activeSheet].charts||[];   charts.forEach((chart  
  **Input refs:** 1\n\n### `gitAction`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** `action`  
  **Snippet:** ) {     const msgs = {         init: 'Repository initialized in memory.',         clone: 'Clone: enter URL in terminal: git clone <url>',         fetch: 'Fetch: no remote configured (local environment  
  **Input refs:** 0\n\n### `gitCommit`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) {     const msg = document.getElementById('git-commit-msg').value.trim();     if (!msg) { alert('Enter a commit message.'); return; }     const count = Object.keys(gitChanges).length;     if (!count  
  **Input refs:** 2\n\n### `gitRefresh`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) { updateGitPanel(); logOutput('Git: status refreshed', 'system'); }  function gitCommit() {     const msg = document.getElementById('git-commit-msg').value.trim();     if (!msg) { alert('Enter a com  
  **Input refs:** 2\n\n### `goAssetPreviewFullscreen`
- **File:** `jaavscripts\envizion_editor.js`  
  **Params:** ``  
  **Snippet:** ) {       const inner = document.getElementById('assetPreviewInner');       const el = inner.firstElementChild;       if (!el) return;       if (el.requestFullscreen) el.requestFullscreen();       els  
  **Input refs:** 3\n\n### `goHome`
- **File:** `jaavscripts\velolink.js`  
  **Params:** ``  
  **Snippet:** ) {     if (peer) { try { peer.destroy(); } catch(e){} peer = null; }     conn = null;     selectedFile = null;     clearFile();     document.getElementById('waitingCard').style.display = 'none';       
  **Input refs:** 3\n\n### `goNativeFullscreen`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** ) {             const inner = document.getElementById('preview-modal-inner');             const el = inner.firstElementChild || inner;             if (el.requestFullscreen) el.requestFullscreen();      
  **Input refs:** 1\n\n### `groupSelected`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** ) {             if (selectedCards.length < 2) { showNotification('Select 2+ cards to group.'); return; }             // Compute bounding box             const minX = Math.min(...selectedCards.map(c =>  
  **Input refs:** 0\n\n### `hideToast`
- **File:** `jaavscripts\mp3_editor_mp4_converter.js`  
  **Params:** ``  
  **Snippet:** ) {       const toast = document.getElementById('toastNotification');       toast.classList.add('translate-y-20', 'opacity-0');     }  (function() {   var INDEX = null, LOADING = false;    function lo  
  **Input refs:** 1\n\n### `importCSVFile`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) { document.getElementById('csv-import-input').click(); }  function handleCSVImport(e) {   const file=e.target.files[0]; if(!file) return;   const reader=new FileReader();   reader.onload=function(ev  
  **Input refs:** 1\n\n### `insertColumnLeft`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) {   saveStateForHistory();   const col=selectedCell.match(/[A-Z]+/i)[0].toUpperCase();   const colIdx=COLUMNS.indexOf(col);   const newSheetData={};   Object.keys(sheets[activeSheet]).forEach(coord=  
  **Input refs:** 0\n\n### `insertQuickFormula`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** `fn`  
  **Snippet:** ) {   const col=selectedCell.match(/[A-Z]+/i)[0].toUpperCase();   const row=parseInt(selectedCell.match(/[0-9]+/)[0]);   const formula=`=${fn}(${col}1:${col}${Math.max(1,row-1)})`;   setCellValue(sele  
  **Input refs:** 0\n\n### `insertRowAbove`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) {   saveStateForHistory();   const row=parseInt(selectedCell.match(/[0-9]+/)[0]);   const newSheetData={};   Object.keys(sheets[activeSheet]).forEach(coord=>{     const c=coord.match(/[A-Z]+/i)[0];   
  **Input refs:** 0\n\n### `insertTemplateMenu`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) {   toggleSidebar();   const sidebar=document.getElementById("sidebar");   sidebar.classList.remove("hidden"); }  // ===================================================================== // THEME //  
  **Input refs:** 2\n\n### `minimizeChatPanel`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** ) {             const chatPanel = document.getElementById('ai-chat-panel');             chatPanel.style.height = chatPanel.style.height === '50px' ? '480px' : '50px';         }          function handl  
  **Input refs:** 2\n\n### `navigateBack`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) {     if (previewHistoryIndex > 0) {         previewHistoryIndex--;         const { path, query } = previewHistory[previewHistoryIndex];         activeIframeFile = path; activeIframeQuery = query;    
  **Input refs:** 0\n\n### `navigateForward`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) {     if (previewHistoryIndex < previewHistory.length - 1) {         previewHistoryIndex++;         const { path, query } = previewHistory[previewHistoryIndex];         activeIframeFile = path; acti  
  **Input refs:** 0\n\n### `openLocalFilePicker`
- **File:** `jaavscripts\luma_dashboard_clone.js`  
  **Params:** ``  
  **Snippet:** ) {             document.getElementById('local-file-input').click();         }         function handleLocalFileOpen(input) {             if (!input.files || !input.files.length) return;             //  
  **Input refs:** 1\n\n### `openModal`
- **File:** `jaavscripts\luma_dashboard_clone.js`  
  **Params:** ``  
  **Snippet:** ) {             modalOverlay.classList.remove('hidden');             document.getElementById('board-name-input').focus();         }         function closeModal() {             modalOverlay.classList.a  
  **Input refs:** 3\n\n### `openPreviewInNewWindow`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** {         if (typeof vfs !== 'undefined' && typeof activeIframeFile !== 'undefined' && activeIframeFile) {           const ext = activeIframeFile.split('.').pop().toLowerCase();           const file =  
  **Input refs:** 0\n\n### `openSettings`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) {     const settings = {         fontSize: currentFontSize,         wordWrap: wordWrapEnabled,         minimap: minimapEnabled,         theme: currentTheme,     };     const json = JSON.stringify(se  
  **Input refs:** 0\n\n### `openURLInPlayground`
- **File:** `jaavscripts\luma_dashboard_clone.js`  
  **Params:** ``  
  **Snippet:** ) {             const url = document.getElementById('url-modal-input').value.trim();             if (!url) return;             closeURLModal();             const encoded = encodeURIComponent(url);      
  **Input refs:** 2\n\n### `openURLModal`
- **File:** `jaavscripts\luma_dashboard_clone.js`  
  **Params:** ``  
  **Snippet:** ) {             const ov = document.getElementById('url-modal-overlay');             ov.style.display = 'flex';             setTimeout(() => document.getElementById('url-modal-input').focus(), 50);     
  **Input refs:** 4\n\n### `playAudio`
- **File:** `jaavscripts\InstantDictionary.js`  
  **Params:** `type`  
  **Snippet:** ) {             const url = audioData[type];             if (url) {                 const audio = new Audio(url);                 audio.play().catch(e => {                     console.warn("Audio file  
  **Input refs:** 0\n\n### `playTranslatedAudio`
- **File:** `jaavscripts\InstantDictionary.js`  
  **Params:** ``  
  **Snippet:** ) {             if ('speechSynthesis' in window && currentTranslatedText) {                 window.speechSynthesis.cancel();                 const utterance = new SpeechSynthesisUtterance(currentTrans  
  **Input refs:** 0\n\n### `quickLoadWorkspace`
- **File:** `jaavscripts\animator_studio.js`  
  **Params:** ``  
  **Snippet:** {             try {                 showToast('Loading saved workspace…', false);                 const snapshot = await idbGet(ANIM_DB_KEY);                 if (!snapshot) {                     showT  
  **Input refs:** 1\n\n### `quickSaveWorkspace`
- **File:** `jaavscripts\animator_studio.js`  
  **Params:** ``  
  **Snippet:** {             const statusEl = document.getElementById('quicksave-status');             if (animationData.length === 0 && !currentModel) {                 showToast('Nothing to save yet — upload a cha  
  **Input refs:** 1\n\n### `redo`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) { if(historyRedo.length>0){historyUndo.push(JSON.stringify(sheets));sheets=JSON.parse(historyRedo.pop());rebuildGrid();saveToLocalStorage();} }  // ==================================================  
  **Input refs:** 0\n\n### `refreshPreview`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** {           if (typeof vfs !== 'undefined' && typeof activeIframeFile !== 'undefined' && activeIframeFile) {             const ext = activeIframeFile.split('.').pop().toLowerCase();             const   
  **Input refs:** 0\n\n### `removeDuplicates`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) {   const bounds=getRangeBounds(selectionStart,selectionEnd);   if(bounds.minRow===bounds.maxRow) return;   saveStateForHistory();   const seen=new Set(); const unique=[];   for(let r=bounds.minRow;  
  **Input refs:** 0\n\n### `renameCurrentWorkbook`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) {   const newName=prompt("Rename workbook:", document.getElementById("project-title").value);   if(newName&&newName.trim()){document.getElementById("project-title").value=newName.trim();saveToLocalS  
  **Input refs:** 3\n\n### `resetApp`
- **File:** `jaavscripts\InstantDictionary.js`  
  **Params:** ``  
  **Snippet:** ) {             searchInput.value = "";             showView(emptyState);             try {                 const url = new URL(window.location);                 url.searchParams.delete('q');           
  **Input refs:** 0\n\n- **File:** `jaavscripts\local_vocal_remover.js`  
  **Params:** ``  
  **Snippet:** ) {             document.getElementById('original-player').src = "";             document.getElementById('instrumental-player').src = "";             fileInput.value = "";             showSection('upl  
  **Input refs:** 5\n\n### `resetCharacterPos`
- **File:** `jaavscripts\animator_studio.js`  
  **Params:** ``  
  **Snippet:** {             if (currentModel) {                 // Calculate difference to shift camera target and camera smoothly                 const diffX = 0 - currentModel.position.x;                 const di  
  **Input refs:** 0\n\n### `resetWorkspace`
- **File:** `jaavscripts\animator_studio.js`  
  **Params:** ``  
  **Snippet:** {             if (currentModel) {                 scene.remove(currentModel);                 currentModel.traverse(child => {                     if (child.isMesh) {                         child.geo  
  **Input refs:** 0\n\n### `ripLosslessAudio`
- **File:** `jaavscripts\mediaforge.js`  
  **Params:** ``  
  **Snippet:** ) {     if (!audioBuffer) return triggerToast('Wait', 'Decoding not finished yet.', 'error');     if (clipEndTime <= clipStartTime) return triggerToast('Invalid Limits', 'Check IN/OUT bounds.', 'error  
  **Input refs:** 0\n\n### `saveAppsScriptUrl`
- **File:** `jaavscripts\luma_dashboard_clone.js`  
  **Params:** ``  
  **Snippet:** ) {             const input = document.getElementById('apps-script-url');             localStorage.setItem(STORAGE_KEYS.appsScript, input.value.trim());             pushNotification('Apps Script saved  
  **Input refs:** 1\n\n### `saveWoodburyFile`
- **File:** `jaavscripts\animator_studio.js`  
  **Params:** ``  
  **Snippet:** {             // Read woodbury source from merge textarea if pasted, else use embedded state only             const mergeInput = document.getElementById('woodbury-source-input-merge');             let  
  **Input refs:** 1\n\n### `selectAudioCh`
- **File:** `jaavscripts\mediaforge.js`  
  **Params:** `ch`  
  **Snippet:** ) {     targetChannels = ch;     btnAudioStereo.className = ch === 2 ? "py-2.5 px-3 bg-indigo-600 border border-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center   
  **Input refs:** 0\n\n### `sendSelectedToEditor`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** ) {             if (selectedCards.length === 0) { showNotification('Select cards first.'); return; }              const handoffId = "handoff-" + Date.now();             const assets = [];               
  **Input refs:** 0\n\n### `sendTestNotification`
- **File:** `jaavscripts\luma_dashboard_clone.js`  
  **Params:** ``  
  **Snippet:** ) {             pushNotification('Test notification', 'Envizion sent this through the local notification system.', 'test');         }         function clearNotifications() {             writeJSON(STOR  
  **Input refs:** 1\n\n### `setBoardType`
- **File:** `jaavscripts\luma_dashboard_clone.js`  
  **Params:** `type`  
  **Snippet:** ) {             document.getElementById('type-playground').className = type === 'playground'                 ? 'flex items-center gap-2 p-3 rounded-xl border border-neutral-600/40 bg-neutral-700/10 te  
  **Input refs:** 1\n\n### `setClipPoint`
- **File:** `jaavscripts\mediaforge.js`  
  **Params:** `type`  
  **Snippet:** ) {     const t = mainVideo.currentTime;     if (type === 'start') {         if (t >= clipEndTime) return triggerToast('Invalid', 'Start point must precede end mark.', 'error');         clipStartTime   
  **Input refs:** 0\n\n### `setRemovalMode`
- **File:** `jaavscripts\background-remover.js`  
  **Params:** `mode`  
  **Snippet:** {             state.settings.mode = mode;             document.getElementById('mode-auto').className = mode === 'auto' ? "flex-1 text-xs py-2 rounded-md border font-medium transition-colors bg-indigo-  
  **Input refs:** 2\n\n### `setSelectedColor`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** `colorCode`  
  **Snippet:** ) {             activeColor = colorCode;             document.getElementById('color-wheel-preview').style.backgroundColor = colorCode;             showNotification(`Theme tint adjusted to ${colorCode}  
  **Input refs:** 1\n\n### `setTool`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** `toolName`  
  **Snippet:** ) {             activeTool = toolName;             document.querySelectorAll('[id^="tool-"]').forEach(btn => {                 btn.classList.remove('active-tool');             });             const se  
  **Input refs:** 0\n\n### `setWorkspaceTab`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** `tab`  
  **Snippet:** {             const saved = tab === 'saved';             document.getElementById('workspace-saved-view').classList.toggle('hidden', !saved);             document.getElementById('workspace-directory-vi  
  **Input refs:** 4\n\n### `setZoom`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** `scale`  
  **Snippet:** ) {   const grid=document.getElementById('excel-grid');   grid.style.transform=`scale(${scale})`; grid.style.transformOrigin='top left';   grid.style.width=`${100/scale}%`; grid.style.height=`${100/sc  
  **Input refs:** 1\n\n### `shareCurrentWorkbookByEmail`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) {   const data=JSON.stringify({sheets,activeSheet,title:document.getElementById("project-title").value});   const encoded=encodeURIComponent(data);   const subject=encodeURIComponent("Shared Workboo  
  **Input refs:** 2\n\n### `showPage`
- **File:** `jaavscripts\luma_dashboard_clone.js`  
  **Params:** `page`  
  **Snippet:** ) {             currentPage = page;             document.querySelectorAll('.dashboard-section').forEach(section => section.classList.add('hidden'));             document.getElementById(`section-${page  
  **Input refs:** 0\n\n### `sortSelectedRange`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** `direction='asc'`  
  **Snippet:** ) {   const bounds=getRangeBounds(selectionStart,selectionEnd);   if(bounds.minRow===bounds.maxRow) return;   saveStateForHistory();   const rowsData=[];   for(let r=bounds.minRow;r<=bounds.maxRow;r++  
  **Input refs:** 0\n\n### `splitEditorRight`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) {     logOutput('Split editor: open files in separate tabs and use two browser windows for split view.', 'system'); }  function resetLayout() {     document.getElementById('sidebar').style.width = '  
  **Input refs:** 3\n\n### `startSender`
- **File:** `jaavscripts\velolink.js`  
  **Params:** ``  
  **Snippet:** ) {     if (!selectedFile) return;     document.getElementById('uploadCard').style.display = 'none';      document.getElementById('statSize').textContent = formatBytes(selectedFile.size);     document  
  **Input refs:** 6\n\n### `stepFrames`
- **File:** `jaavscripts\mediaforge.js`  
  **Params:** `multiplier`  
  **Snippet:** ) {     const calFps = parseFloat(inputFpsCalibration.value) || 30.0;     const target = Math.max(0, Math.min(videoDuration, mainVideo.currentTime + (multiplier * (1.0 / calFps))));     mainVideo.curr  
  **Input refs:** 0\n\n### `switchBottomTab`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** `tab`  
  **Snippet:** ) {     activeBottomTab = tab;     ['console','output','problems','debug'].forEach(t => {         const el  = document.getElementById('bp-' + t);         const btn = document.getElementById('bp-tab-'   
  **Input refs:** 0\n\n### `switchRibbonTab`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** `tabId`  
  **Snippet:** ) {   const tabs=['home','insert','formulas','data','view'];   tabs.forEach(t => {     const btn=document.getElementById('tab-btn-'+t);     const content=document.getElementById('ribbon-'+t);     if(!  
  **Input refs:** 0\n\n### `switchSidebar`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** `view`  
  **Snippet:** ) {     const sidebar = document.getElementById('sidebar');     const isActive = document.getElementById('activity-' + view)?.classList.contains('active');     const isCollapsed = parseInt(sidebar.sty  
  **Input refs:** 1\n\n### `switchTab`
- **File:** `jaavscripts\animator_studio.js`  
  **Params:** `tabId`  
  **Snippet:** {             currentActiveTabId = tabId;             document.querySelectorAll('.tab-btn').forEach(btn => {                 btn.classList.remove('border-neutral-600', 'text-neutral-300');              
  **Input refs:** 0\n\n- **File:** `jaavscripts\steganovault.js`  
  **Params:** `mode`  
  **Snippet:** { /* placeholder, replaced below */ };          const tabForensic = document.getElementById('tab-forensic');         const viewForensic = document.getElementById('view-forensic');          // Patch sw  
  **Input refs:** 2\n\n### `switchToolTab`
- **File:** `jaavscripts\mp3_editor_mp4_converter.js`  
  **Params:** `tabId`  
  **Snippet:** ) {       document.querySelectorAll('.tool-tab-content').forEach(el => el.classList.add('hidden'));       document.querySelectorAll('.custom-tab-btn').forEach(el => {         el.classList.remove('acti  
  **Input refs:** 0\n\n### `switchUtilityTab`
- **File:** `jaavscripts\mediaforge.js`  
  **Params:** `tab`  
  **Snippet:** ) {     const tabs = ['frame', 'video', 'audio'];     tabs.forEach(t => {         const btn = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}Btn`);         const ws = document.ge  
  **Input refs:** 0\n\n### `termSetMode`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** `mode`  
  **Snippet:** ) {     termMode = mode;     const sym = document.getElementById('terminal-prompt-symbol');     const shBtn = document.getElementById('term-mode-shell');     const jsBtn = document.getElementById('ter  
  **Input refs:** 3\n\n### `toggleActiveFrameRegion`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** ) {             if (!selectedCards.length) {                 setTool('select');                 showNotification('Select a card first, then use Clip Region Boundary.');                 return;          
  **Input refs:** 0\n\n### `toggleBottomPanel`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) {     bottomPanelOpen = !bottomPanelOpen;     const panel = document.getElementById('bottom-panel');     const resizer = document.getElementById('resizer-bottom');     if (bottomPanelOpen) {          
  **Input refs:** 2\n\n### `toggleChatPanel`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** ) {             const chatPanel = document.getElementById('ai-chat-panel');             chatPanel.classList.toggle('hidden');         }          function minimizeChatPanel() {             const chatPa  
  **Input refs:** 3\n\n### `toggleDeviceMode`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) {     deviceMode = !deviceMode;     const frame = document.getElementById('live-frame');     const wrapper = document.getElementById('device-wrapper');     const btn = document.getElementById('devic  
  **Input refs:** 3\n\n### `toggleExplanation`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) {       const modal = document.getElementById('explanation-modal');       if (modal) {         modal.classList.toggle('hidden');         if (!modal.classList.contains('hidden')) {           const ba  
  **Input refs:** 3\n\n### `toggleFormulaHelp`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) { document.getElementById("formula-help-overlay").classList.toggle("hidden"); } function toggleSidebar() { document.getElementById("sidebar").classList.toggle("hidden"); }  function renderFormulaGlo  
  **Input refs:** 3\n\n### `toggleFullscreen`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** ) {             if (!document.fullscreenElement) {                 document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();             } else {                 docu  
  **Input refs:** 0\n\n### `toggleGridlines`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) {   hideGridlinesMode=!hideGridlinesMode;   const btn=document.getElementById('btn-gridlines');   if(hideGridlinesMode){     btn.classList.remove('bg-slate-200','dark:bg-slate-700');     let style=d  
  **Input refs:** 2\n\n### `toggleMobilePreview`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) {       const pane = document.getElementById('preview-pane');       const edPane = document.getElementById('editor-pane');       const btn = document.getElementById('mob-btn-preview');       if (!pa  
  **Input refs:** 3\n\n### `toggleMobileSidebar`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) {       const sidebar = document.getElementById('sidebar');       const overlay = document.getElementById('mobile-overlay');       const btn = document.getElementById('mob-btn-explorer');       cons  
  **Input refs:** 3\n\n### `togglePlay`
- **File:** `jaavscripts\mediaforge.js`  
  **Params:** ``  
  **Snippet:** ) {     if (mainVideo.paused) {         mainVideo.play();         iconPlay.setAttribute('data-lucide', 'pause');         textPlay.textContent = "PAUSE";         requestAnimationFrame(playbackTrackerLo  
  **Input refs:** 0\n\n### `togglePreviewPane`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) {     const pane = document.getElementById('preview-pane');     pane.style.display = pane.style.display === 'none' ? '' : 'none'; }  function splitEditorRight() {     logOutput('Split editor: open f  
  **Input refs:** 4\n\n### `toggleRenameDropdown`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** ) {             const currentName = document.getElementById('project-title-display').textContent;             const newName = prompt("Rename active workspace project name:", currentName);               
  **Input refs:** 2\n\n### `toggleSearchOption`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** `opt`  
  **Snippet:** ) {     searchOptions[opt] = !searchOptions[opt];     const btn = document.getElementById('search-opt-' + opt);     btn.classList.toggle('border-[#007acc]', searchOptions[opt]);     btn.classList.togg  
  **Input refs:** 2\n\n### `toggleSelectAll`
- **File:** `jaavscripts\pdfmerger.js`  
  **Params:** `selectAll`  
  **Snippet:** ) {         applicationFiles.forEach(f => f.selected = selectAll);         renderFileList();     }      function removeFile(id) {         applicationFiles = applicationFiles.filter(f => f.id !== id);   
  **Input refs:** 0\n\n### `toggleSettingsModal`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** ) {             const modal = document.getElementById('settings-modal');             modal.classList.toggle('hidden');         }          function toggleGridPattern(checked) {             const gc = d  
  **Input refs:** 2\n\n### `toggleShowFormulas`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) {   showFormulasMode=!showFormulasMode;   const btn=document.getElementById('btn-show-formulas');   if(showFormulasMode) btn.classList.add('bg-brand-100','text-brand-600');   else btn.classList.remo  
  **Input refs:** 2\n\n### `toggleSidebar`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) {     const sidebar = document.getElementById('sidebar');     const isCollapsed = parseInt(sidebar.style.width) < 10;     if (isCollapsed) {         sidebar.style.width = '240px';     } else {        
  **Input refs:** 1\n\n- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) { document.getElementById("sidebar").classList.toggle("hidden"); }  function renderFormulaGlossary() {   const container=document.getElementById("formulas-glossary");   const items=TOOLS.map(tool=>`  
  **Input refs:** 2\n\n### `toggleTheme`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) {   const isDark=document.documentElement.classList.toggle('dark');   localStorage.setItem('theme',isDark?'dark':'light');   document.getElementById("theme-sun").classList.toggle("hidden",!isDark);   
  **Input refs:** 2\n\n### `toggleWordWrap`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) {     if (!editor) return;     wordWrapEnabled = !wordWrapEnabled;     editor.updateOptions({ wordWrap: wordWrapEnabled ? 'on' : 'off' });     logOutput(`Word Wrap: ${wordWrapEnabled ? 'ON' : 'OFF'}  
  **Input refs:** 0\n\n### `toggleWorkspacePanel`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** {             const panel = document.getElementById('workspace-panel');             panel.classList.toggle('hidden');             if (!panel.classList.contains('hidden')) renderWorkspacePages();        
  **Input refs:** 1\n\n### `triggerAudioUpload`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** ) {             document.getElementById('audio-file-input').click();         }          function addTextCard() {             const mid = screenToCanvasCoords(window.innerWidth / 2, window.innerHeight   
  **Input refs:** 1\n\n### `triggerDownload`
- **File:** `jaavscripts\pdfmerger.js`  
  **Params:** `bytes, filename`  
  **Snippet:** ) {         const blob = new Blob([bytes], { type: 'application/pdf' });         const url = URL.createObjectURL(blob);         const a = document.createElement('a');         a.href = url;         a.d  
  **Input refs:** 0\n\n- **File:** `jaavscripts\velolink.js`  
  **Params:** ``  
  **Snippet:** ) {     if (!downloadURL) return;     const a = document.createElement('a');     a.href = downloadURL;     a.download = receivedFileName || 'velolink-file';     document.body.appendChild(a);     a.cli  
  **Input refs:** 0\n\n### `triggerFileInput`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** `type`  
  **Snippet:** ) {             document.getElementById(`${type}-file-input`).click();         }          function handleFilesSelected(input, hint) {             const files = Array.from(input.files || []);            
  **Input refs:** 0\n\n### `triggerFileUpload`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) {     const input = document.getElementById('file-input');     if (input) input.click(); }  document.getElementById('folder-input')?.addEventListener('change', async e => {     const files = Array.f  
  **Input refs:** 3\n\n### `triggerFolderUpload`
- **File:** `jaavscripts\htmlviewer.js`  
  **Params:** ``  
  **Snippet:** ) {     const input = document.getElementById('folder-input');     if (input) input.click(); } function triggerFileUpload() {     const input = document.getElementById('file-input');     if (input) in  
  **Input refs:** 4\n\n### `triggerSearchBoard`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** ) {             const query = prompt("Find cards on your board:");             if(query) {                 const found = cards.find(c => c.content.toLowerCase().includes(query.toLowerCase()));          
  **Input refs:** 0\n\n### `triggerShare`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** ) {             showNotification("Sharing link copied to clipboard workspace!");         }          function triggerShowExtensions() {             showNotification("Custom Canvas integrations: tldraw,  
  **Input refs:** 1\n\n### `triggerShowExtensions`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** ) {             showNotification("Custom Canvas integrations: tldraw, Ffmpeg encoder, & Luma core templates connected.");         }          function toggleSettingsModal() {             const modal =   
  **Input refs:** 2\n\n### `triggerUpgrade`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** ) {             showNotification("Upgrade tier unlocks unlimited IndexedDB disk space & cloud sync capabilities!");         }          function toggleRenameDropdown() {             const currentName =  
  **Input refs:** 2\n\n### `triggerVoiceInput`
- **File:** `jaavscripts\envizion_playground.js`  
  **Params:** ``  
  **Snippet:** ) {             showNotification("Voice Assistant activated (Listening...)");         }          function triggerSearchBoard() {             const query = prompt("Find cards on your board:");           
  **Input refs:** 0\n\n### `undo`
- **File:** `jaavscripts\life-tools.js`  
  **Params:** ``  
  **Snippet:** ) { if(historyUndo.length>0){historyRedo.push(JSON.stringify(sheets));sheets=JSON.parse(historyUndo.pop());rebuildGrid();saveToLocalStorage();} } function redo() { if(historyRedo.length>0){historyUndo  
  **Input refs:** 0\n\n\n## Buttons per function
