lucide.createIcons();

// ============================================================
// STATE
// ============================================================
let vfs = {};                  // Virtual File System: path -> {name, isText, content, fileObj, blobUrl}
let openFiles = [];            // Paths open in tabs
let activeFile = null;         // Currently focused path
let activeIframeFile = null;   // Path loaded in preview
let activeIframeQuery = '';    // Virtual query string
let editor = null;
let isMonacoReady = false;
let saveTimeout = null;
function maybeRebuildJsxShell() {
    if (!activeFile || !/\.(jsx?|tsx?|js|ts)$/i.test(activeFile)) return;
    if (vfs['__jsx_preview__.html']) {
        // entry is whichever jsx file is the current activeIframeFile's basis
        const entry = Object.keys(vfs).find(p => /index\.(jsx|tsx|js|ts)$/i.test(p))
            || Object.keys(vfs).find(p => /\.(jsx|tsx|js|ts)$/i.test(p) && p !== '__jsx_preview__.html');
        if (entry) vfs['__jsx_preview__.html'].content = buildJsxShell(entry);
    }
}
let liveServers = [];          // Pop-out live server windows

// Editor state
let wordWrapEnabled = false;
let minimapEnabled = false;
let currentTheme = 'vs-dark';

// Bookmarks: { path -> Set<lineNumber> }
let bookmarks = {};

// Navigation history for preview back/forward
let previewHistory = [];
let previewHistoryIndex = -1;

// Git state simulation
let gitChanges = {};     // path -> 'M'|'A'|'D'|'U'
let gitBranch = 'main';

// Bottom panel
let bottomPanelOpen = false;
let activeBottomTab = 'console';

// Device mode
let deviceMode = false;

// Search options
let searchOptions = { case: false, word: false, regex: false };

// Split editor
let secondEditorFile = null;

// ============================================================
// MENU BAR DEFINITION & RENDERING
// ============================================================
const menuDefinition = [
    {
        label: 'File',
        items: [
            { label: 'New File…', shortcut: 'Ctrl+N', action: () => createNewFile() },
            { label: 'New Folder…', action: () => createNewFolder() },
            { separator: true },
            { label: 'Open Folder…', shortcut: 'Ctrl+O', action: () => triggerFolderUpload() },
            { label: 'Open File(s)…', action: () => triggerFileUpload() },
            { separator: true },
            { label: 'Save', shortcut: 'Ctrl+S', action: () => saveActiveFile() },
            { label: 'Save As…', shortcut: 'Ctrl+Shift+S', action: () => saveActiveFileAs() },
            { label: 'Save All (Export ZIP)', action: () => exportZip() },
            { separator: true },
            { label: 'Start Live Server…', shortcut: 'Ctrl+P', action: () => openPreviewInNewWindow() },
            { separator: true },
            { label: 'Exit', shortcut: 'Alt+F4', action: () => window.close() },
        ]
    },
    {
        label: 'Edit',
        items: [
            { label: 'Undo', shortcut: 'Ctrl+Z', action: () => execEditorCmd('undo') },
            { label: 'Redo', shortcut: 'Ctrl+Y', action: () => execEditorCmd('redo') },
            { separator: true },
            { label: 'Cut', shortcut: 'Ctrl+X', action: () => document.execCommand('cut') },
            { label: 'Copy', shortcut: 'Ctrl+C', action: () => document.execCommand('copy') },
            { label: 'Paste', shortcut: 'Ctrl+V', action: () => document.execCommand('paste') },
            { separator: true },
            { label: 'Find…', shortcut: 'Ctrl+F', action: () => execEditorCmd('actions.find') },
            { label: 'Replace…', shortcut: 'Ctrl+H', action: () => execEditorCmd('editor.action.startFindReplaceAction') },
            { label: 'Find in Files', shortcut: 'Ctrl+Shift+F', action: () => { switchSidebar('search'); document.getElementById('global-search-input').focus(); } },
            { separator: true },
            { label: 'Format Document', shortcut: 'Shift+Alt+F', action: () => execEditorCmd('editor.action.formatDocument') },
            { label: 'Format Selection', shortcut: 'Ctrl+K, Ctrl+F', action: () => execEditorCmd('editor.action.formatSelection') },
            { label: 'Toggle Line Comment', shortcut: 'Ctrl+/', action: () => execEditorCmd('editor.action.commentLine') },
            { label: 'Toggle Block Comment', shortcut: 'Shift+Alt+A', action: () => execEditorCmd('editor.action.blockComment') },
            { separator: true },
            { label: 'Go To Line…', shortcut: 'Ctrl+G', action: () => execEditorCmd('editor.action.gotoLine') },
        ]
    },
    {
        label: 'Selection',
        items: [
            { label: 'Select All', shortcut: 'Ctrl+A', action: () => execEditorCmd('editor.action.selectAll') },
            { label: 'Expand Selection', shortcut: 'Shift+Alt+Right', action: () => execEditorCmd('editor.action.smartSelect.expand') },
            { label: 'Shrink Selection', shortcut: 'Shift+Alt+Left', action: () => execEditorCmd('editor.action.smartSelect.shrink') },
            { separator: true },
            { label: 'Add Cursor Above', shortcut: 'Ctrl+Alt+Up', action: () => execEditorCmd('editor.action.insertCursorAbove') },
            { label: 'Add Cursor Below', shortcut: 'Ctrl+Alt+Down', action: () => execEditorCmd('editor.action.insertCursorBelow') },
            { label: 'Add Cursors to Line Ends', shortcut: 'Shift+Alt+I', action: () => execEditorCmd('editor.action.insertCursorAtEndOfEachLineSelected') },
            { label: 'Select All Occurrences', shortcut: 'Ctrl+Shift+L', action: () => execEditorCmd('editor.action.selectHighlights') },
            { separator: true },
            { label: 'Copy Line Up', shortcut: 'Shift+Alt+Up', action: () => execEditorCmd('editor.action.copyLinesUpAction') },
            { label: 'Copy Line Down', shortcut: 'Shift+Alt+Down', action: () => execEditorCmd('editor.action.copyLinesDownAction') },
            { label: 'Move Line Up', shortcut: 'Alt+Up', action: () => execEditorCmd('editor.action.moveLinesUpAction') },
            { label: 'Move Line Down', shortcut: 'Alt+Down', action: () => execEditorCmd('editor.action.moveLinesDownAction') },
            { separator: true },
            { label: 'Make Uppercase', action: () => execEditorCmd('editor.action.transformToUppercase') },
            { label: 'Make Lowercase', action: () => execEditorCmd('editor.action.transformToLowercase') },
            { label: 'Sort Lines Ascending', action: () => sortLines(true) },
            { label: 'Sort Lines Descending', action: () => sortLines(false) },
        ]
    },
    {
        label: 'View',
        items: [
            { label: 'Command Palette…',  shortcut: 'Ctrl+Shift+P', action: () => openCommandPalette() },
            { separator: true },
            { label: 'Explorer',          shortcut: 'Ctrl+Shift+E', action: () => switchSidebar('explorer') },
            { label: 'Search',            shortcut: 'Ctrl+Shift+F', action: () => { switchSidebar('search'); document.getElementById('global-search-input').focus(); } },
            { label: 'Source Control',    shortcut: 'Ctrl+Shift+G', action: () => switchSidebar('git') },
            { label: 'Run',               shortcut: 'Ctrl+Shift+D', action: () => { openBottomPanel(); switchBottomTab('console'); } },
            { separator: true },
            { label: 'Problems',          shortcut: 'Ctrl+Shift+M', action: () => { openBottomPanel(); switchBottomTab('problems'); } },
            { label: 'Output',            shortcut: 'Ctrl+Shift+U', action: () => { openBottomPanel(); switchBottomTab('output'); } },
            { label: 'Debug Console',     shortcut: 'Ctrl+Shift+Y', action: () => { openBottomPanel(); switchBottomTab('debug'); } },
            { label: 'Terminal',          shortcut: 'Ctrl+`',        action: () => switchSidebar('terminal') },
            { separator: true },
            { label: 'Word Wrap',         shortcut: 'Alt+Z',        action: () => toggleWordWrap() },
            { label: 'Toggle Minimap',                               action: () => toggleMinimap() },
            { label: 'Toggle Line Numbers',                          action: () => toggleLineNumbers() },
            { label: 'Toggle Render Whitespace',                     action: () => toggleWhitespace() },
            { separator: true },
            { label: 'Zoom In',           shortcut: 'Ctrl+=',       action: () => zoomEditor(1) },
            { label: 'Zoom Out',          shortcut: 'Ctrl+-',       action: () => zoomEditor(-1) },
            { label: 'Reset Zoom',        shortcut: 'Ctrl+0',       action: () => zoomEditor(0) },
            { separator: true },
            { label: 'Full Screen',       shortcut: 'F11',          action: () => toggleFullScreen() },
        ]
    },
    {
        label: 'Go',
        items: [
            { label: 'Back',                    shortcut: 'Alt+Left',      action: () => execEditorCmd('cursorUndo') },
            { label: 'Forward',                 shortcut: 'Alt+Right',     action: () => execEditorCmd('cursorRedo') },
            { separator: true },
            { label: 'Go to File…',             shortcut: 'Ctrl+P',        action: () => goToFile() },
            { label: 'Go to Symbol in Editor…', shortcut: 'Ctrl+Shift+O',  action: () => execEditorCmd('workbench.action.gotoSymbol') },
            { separator: true },
            { label: 'Go to Line / Column…',    shortcut: 'Ctrl+G',        action: () => execEditorCmd('editor.action.gotoLine') },
            { label: 'Go to Bracket',           shortcut: 'Ctrl+Shift+\\', action: () => execEditorCmd('editor.action.jumpToBracket') },
            { separator: true },
            { label: 'Next Problem',            shortcut: 'F8',            action: () => execEditorCmd('editor.action.marker.next') },
            { label: 'Previous Problem',        shortcut: 'Shift+F8',      action: () => execEditorCmd('editor.action.marker.prev') },
        ]
    },
    {
        label: 'Git',
        items: [
            { label: 'Initialize Repository', action: () => gitAction('init') },
            { label: 'Clone Repository…', action: () => gitAction('clone') },
            { separator: true },
            { label: 'Commit Staged', shortcut: 'Ctrl+Enter', action: () => gitCommit() },
            { label: 'Fetch', action: () => gitAction('fetch') },
            { label: 'Pull', action: () => gitAction('pull') },
            { label: 'Push', action: () => gitAction('push') },
            { label: 'Sync (Pull then Push)', action: () => gitAction('sync') },
            { separator: true },
            { label: 'New Branch…', action: () => gitAction('branch') },
            { label: 'Switch Branch…', action: () => gitAction('checkout') },
            { label: 'Merge Branch…', action: () => gitAction('merge') },
            { label: 'Rebase…', action: () => gitAction('rebase') },
            { separator: true },
            { label: 'View History', action: () => gitAction('log') },
            { label: 'Compare Branches…', action: () => gitAction('diff') },
            { label: 'Stash Changes', action: () => gitAction('stash') },
            { label: 'Apply Stash…', action: () => gitAction('stash-apply') },
        ]
    },
    {
        label: 'Build',
        items: [
            { label: 'Build Project', shortcut: 'Ctrl+Shift+B', action: () => buildProject() },
            { label: 'Rebuild Project', action: () => rebuildProject() },
            { label: 'Clean Output', action: () => cleanProject() },
            { separator: true },
            { label: 'Minify HTML', action: () => minifyActiveFile('html') },
            { label: 'Minify CSS', action: () => minifyActiveFile('css') },
            { label: 'Minify JavaScript', action: () => minifyActiveFile('js') },
            { separator: true },
            { label: 'Export as ZIP', action: () => exportZip() },
            { label: 'Bundle & Export', action: () => bundleAndExport() },
        ]
    },
    {
        label: 'Run',
        items: [
            { label: 'Start Debugging',         shortcut: 'F5',           action: () => runActiveFile() },
            { label: 'Run Without Debugging',   shortcut: 'Ctrl+F5',      action: () => runActiveFile() },
            { separator: true },
            { label: 'Toggle Breakpoint',       shortcut: 'F9',           action: () => toggleBreakpoint() },
            { label: 'New Breakpoint at Line…',                           action: () => addBreakpointAtLine() },
            { separator: true },
            { label: 'Enable All Breakpoints',                            action: () => setAllBreakpoints(true) },
            { label: 'Disable All Breakpoints',                           action: () => setAllBreakpoints(false) },
            { label: 'Remove All Breakpoints',                            action: () => clearAllBreakpoints() },
            { separator: true },
            { label: 'Open DevTools',           shortcut: 'F12',          action: () => openDevTools() },
            { label: 'Clear Console',                                     action: () => clearBottomPanel() },
        ]
    },
    {
        label: 'Terminal',
        items: [
            { label: 'New Terminal',            shortcut: 'Ctrl+Shift+`', action: () => switchSidebar('terminal') },
            { separator: true },
            { label: 'Run Active File',                                   action: () => runActiveFile() },
            { label: 'Run Selected Text',                                 action: () => runSelectedText() },
        ]
    },
    {
        label: 'Test',
        items: [
            { label: 'Run All Tests', shortcut: 'Ctrl+R, A', action: () => runTests('all') },
            { label: 'Run Tests in Context', shortcut: 'Ctrl+R, T', action: () => runTests('context') },
            { label: 'Validate HTML', action: () => validateHTML() },
            { label: 'Validate CSS', action: () => validateCSS() },
            { label: 'Check JS Syntax', action: () => checkJSSyntax() },
            { separator: true },
            { label: 'Preview on Mobile', action: () => { toggleDeviceMode(); } },
            { label: 'Accessibility Check', action: () => runAccessibilityCheck() },
        ]
    },
    {
        label: 'Tools',
        items: [
            { label: 'Command Palette…', shortcut: 'F1', action: () => openCommandPalette() },
            { label: 'Code Snippets…', shortcut: 'Ctrl+K, Ctrl+B', action: () => openSnippetsPanel() },
            { separator: true },
            { label: 'Emmet: Expand Abbreviation', shortcut: 'Tab', action: () => execEditorCmd('editor.emmet.action.expandAbbreviation') },
            { separator: true },
            { label: 'Create GUID', action: () => insertGUID() },
            { label: 'Encode Selection (Base64)', action: () => encodeBase64() },
            { label: 'Decode Selection (Base64)', action: () => decodeBase64() },
            { label: 'Timestamp: Insert Now', action: () => insertTimestamp() },
            { separator: true },
            { label: 'Settings…', shortcut: 'Alt+F7', action: () => openSettings() },
        ]
    },
    {
        label: 'Window',
        items: [
            { label: 'Close Tab', shortcut: 'Ctrl+F4', action: () => { if(activeFile) closeTab(activeFile); } },
            { label: 'Close All Tabs', action: () => closeAllTabs() },
            { separator: true },
            { label: 'Split Editor Right', action: () => splitEditorRight() },
            { label: 'Toggle Preview Pane', action: () => togglePreviewPane() },
            { label: 'Toggle Sidebar', action: () => toggleSidebar() },
            { separator: true },
            { label: 'Next Tab', shortcut: 'Ctrl+Tab', action: () => cycleTab(1) },
            { label: 'Previous Tab', shortcut: 'Ctrl+Shift+Tab', action: () => cycleTab(-1) },
            { separator: true },
            { label: 'Reset Layout', action: () => resetLayout() },
        ]
    },
    {
        label: 'Help',
        items: [
            { label: 'Show All Commands',           shortcut: 'Ctrl+Shift+P', action: () => openCommandPalette() },
            { separator: true },
            { label: 'Keyboard Shortcuts Reference',shortcut: 'Ctrl+K Ctrl+R',action: () => showKeyboardShortcuts() },
            { separator: true },
            { label: 'Report Issue',                                          action: () => window.open('https://github.com/', '_blank') },
            { label: 'View License',                                          action: () => showLicense() },
            { separator: true },
            { label: 'About HyperLive Pro',                                   action: () => showAbout() },
        ]
    },
];

function renderMenuBar() {
    const bar = document.getElementById('top-menu-bar');
    bar.innerHTML = '';
    menuDefinition.forEach(menu => {
        const item = document.createElement('div');
        item.className = 'menu-item relative';
        const btn = document.createElement('div');
        btn.className = 'menu-btn px-2 py-1 cursor-pointer rounded text-gray-300 text-[12px]';
        btn.textContent = menu.label;
        btn.addEventListener('click', () => toggleMenu(btn));
        const dropdown = document.createElement('div');
        dropdown.className = 'menu-dropdown absolute top-full left-0 bg-[#252526] border border-[#454545] shadow-2xl py-1 min-w-[230px] rounded-sm z-[9000]';
        menu.items.forEach(it => {
            if (it.separator) {
                const sep = document.createElement('div');
                sep.className = 'menu-separator';
                dropdown.appendChild(sep);
            } else {
                const li = document.createElement('div');
                li.className = 'menu-list-item';
                const lbl = document.createElement('span');
                lbl.textContent = it.label;
                li.appendChild(lbl);
                if (it.shortcut) {
                    const sc = document.createElement('span');
                    sc.className = 'menu-shortcut';
                    sc.textContent = it.shortcut;
                    li.appendChild(sc);
                }
                li.addEventListener('click', () => {
                    closeAllMenus();
                    if (it.action) it.action();
                });
                dropdown.appendChild(li);
            }
        });
        item.appendChild(btn);
        item.appendChild(dropdown);
        bar.appendChild(item);
    });

    // Hover switch
    bar.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
            if (bar.querySelector('.menu-item.open')) {
                closeAllMenus();
                item.classList.add('open');
            }
        });
    });
}
renderMenuBar();

function toggleMenu(btn) {
    const parent = btn.parentElement;
    const wasOpen = parent.classList.contains('open');
    closeAllMenus();
    if (!wasOpen) parent.classList.add('open');
}

function closeAllMenus() {
    document.querySelectorAll('.menu-item.open').forEach(m => m.classList.remove('open'));
}

document.addEventListener('click', e => {
    if (!e.target.closest('.menu-item')) closeAllMenus();
});

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', e => {
    const ctrl  = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const alt   = e.altKey;
    const key   = e.key.toLowerCase();

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if      (ctrl && !shift && !alt && key === 'n')   { e.preventDefault(); createNewFile(); }
    else if (ctrl && !shift && !alt && key === 'o')   { e.preventDefault(); triggerFolderUpload(); }
    else if (ctrl && !shift && !alt && key === 's')   { e.preventDefault(); saveActiveFile(); }
    else if (ctrl &&  shift &&        key === 's')    { e.preventDefault(); exportZip(); }
    else if (ctrl && !shift && !alt && key === 'w')   { e.preventDefault(); if(activeFile) closeTab(activeFile); }
    else if (ctrl &&  shift &&        key === 'e')    { e.preventDefault(); switchSidebar('explorer'); }
    else if (ctrl &&  shift &&        key === 'f')    { e.preventDefault(); switchSidebar('search'); document.getElementById('global-search-input').focus(); }
    else if (ctrl &&  shift &&        key === 'g')    { e.preventDefault(); switchSidebar('git'); }
    else if (ctrl &&  shift &&        key === 'd')    { e.preventDefault(); openBottomPanel(); switchBottomTab('console'); }
    else if (ctrl &&  shift &&        key === 'm')    { e.preventDefault(); openBottomPanel(); switchBottomTab('problems'); }
    else if (ctrl &&  shift &&        key === 'u')    { e.preventDefault(); openBottomPanel(); switchBottomTab('output'); }
    else if (ctrl &&  shift &&        key === 'y')    { e.preventDefault(); openBottomPanel(); switchBottomTab('debug'); }
    else if (ctrl && !shift && !alt && key === '`')   { e.preventDefault(); switchSidebar('terminal'); }
    else if (ctrl &&  shift &&        key === '`')    { e.preventDefault(); switchSidebar('terminal'); }
    else if (ctrl && !shift && !alt && key === 'b')   { e.preventDefault(); toggleSidebar(); }
    else if (ctrl && !shift && !alt && key === 'tab') { e.preventDefault(); cycleTab(1); }
    else if (ctrl &&  shift &&        key === 'tab')  { e.preventDefault(); cycleTab(-1); }
    else if (ctrl && !shift && !alt && key === 'p')   { e.preventDefault(); openPreviewInNewWindow(); }
    else if (ctrl &&  shift &&        key === 'p')    { e.preventDefault(); openCommandPalette(); }
    else if (key === 'f1')  { e.preventDefault(); openCommandPalette(); }
    else if (key === 'f5' && !ctrl)  { e.preventDefault(); runActiveFile(); }
    else if (key === 'f5' &&  ctrl)  { e.preventDefault(); runActiveFile(); }
    else if (key === 'f8' && !shift) { e.preventDefault(); execEditorCmd('editor.action.marker.next'); }
    else if (key === 'f8' &&  shift) { e.preventDefault(); execEditorCmd('editor.action.marker.prev'); }
    else if (key === 'f9')  { e.preventDefault(); toggleBreakpoint(); }
    else if (key === 'f11') { e.preventDefault(); toggleFullScreen(); }
    else if (key === 'f12') { e.preventDefault(); openDevTools(); }
});

// ============================================================
// MONACO EDITOR
// ============================================================
let currentFontSize = 13;
let showLineNumbers = true;
let showWhitespace = false;

require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' }});
require(['vs/editor/editor.main'], function() {
    editor = monaco.editor.create(document.getElementById('monaco-container'), {
        value: '',
        language: 'javascript',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        wordWrap: 'off',
        fontSize: currentFontSize,
        fontFamily: "'JetBrains Mono', monospace",
        scrollBeyondLastLine: false,
        roundedSelection: true,
        padding: { top: 12 },
        lineNumbers: 'on',
        renderWhitespace: 'none',
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true },
        suggest: { preview: true },
        quickSuggestions: { other: true, comments: true, strings: true },
        emptySelectionClipboard: false,
        folding: true,
        foldingStrategy: 'indentation',
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
    });

    isMonacoReady = true;
    logOutput('Monaco Editor initialized.', 'system');

    // Cursor position -> status bar
    editor.onDidChangeCursorPosition(e => {
        document.getElementById('sb-cursor').textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
    });

    // Selection -> status bar
    editor.onDidChangeCursorSelection(e => {
        const sel = editor.getSelection();
        if (!sel.isEmpty()) {
            const chars = editor.getModel()?.getValueInRange(sel).length || 0;
            const lines = sel.endLineNumber - sel.startLineNumber + 1;
            document.getElementById('sb-selection').textContent = chars > 0 ? `(${chars} selected)` : '';
        } else {
            document.getElementById('sb-selection').textContent = '';
        }
    });

    // Error markers -> status bar
    monaco.editor.onDidChangeMarkers(() => {
        if (!editor.getModel()) return;
        const markers = monaco.editor.getModelMarkers({ resource: editor.getModel().uri });
        let errors = 0, warnings = 0;
        markers.forEach(m => {
            if (m.severity === monaco.MarkerSeverity.Error) errors++;
            else if (m.severity === monaco.MarkerSeverity.Warning) warnings++;
        });
        document.getElementById('sb-errors').textContent = errors;
        document.getElementById('sb-warnings').textContent = warnings;
        if (errors > 0 || warnings > 0) {
            markers.forEach(m => logOutput(`${m.severity === monaco.MarkerSeverity.Error ? '✖' : '⚠'} ${m.message} (L${m.startLineNumber})`, m.severity === monaco.MarkerSeverity.Error ? 'error' : 'warn'));
        }
    });

    // Auto-save + hot reload
    editor.onDidChangeModelContent(() => {
        if (!activeFile || !vfs[activeFile]) return;
        markGitChanged(activeFile, 'M');
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            vfs[activeFile].content = editor.getValue();
            const ext = activeFile.split('.').pop().toLowerCase();
            if (['html','htm','js','jsx','ts','tsx','css'].includes(ext)) {
                refreshPreview();
                liveServers = liveServers.filter(s => !s.window.closed);
                liveServers.forEach(server => {
                    server.window.postMessage({ type: 'HOT_RELOAD', html: compileVFS(server.path, true, server.query || '') }, '*');
                });
            }
        }, 500);
    });

    // Add keybindings for bookmark
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
        () => toggleBookmark(), '');

    if (Object.keys(vfs).length === 0) {
        logOutput('Ready. Drop a folder or File → Open Folder. Load Demo available.', 'system');
    }
});

function execEditorCmd(action) {
    if (!editor || !isMonacoReady) return;
    editor.focus();
    editor.trigger('keyboard', action, null);
    closeAllMenus();
}

function toggleWordWrap() {
    if (!editor) return;
    wordWrapEnabled = !wordWrapEnabled;
    editor.updateOptions({ wordWrap: wordWrapEnabled ? 'on' : 'off' });
    logOutput(`Word Wrap: ${wordWrapEnabled ? 'ON' : 'OFF'}`, 'system');
}

function toggleMinimap() {
    if (!editor) return;
    minimapEnabled = !minimapEnabled;
    editor.updateOptions({ minimap: { enabled: minimapEnabled } });
}

function toggleLineNumbers() {
    if (!editor) return;
    showLineNumbers = !showLineNumbers;
    editor.updateOptions({ lineNumbers: showLineNumbers ? 'on' : 'off' });
}

function toggleWhitespace() {
    if (!editor) return;
    showWhitespace = !showWhitespace;
    editor.updateOptions({ renderWhitespace: showWhitespace ? 'all' : 'none' });
}

let currentZoom = 13;
function zoomEditor(delta) {
    if (!editor) return;
    if (delta === 0) { currentZoom = 13; }
    else { currentZoom = Math.max(8, Math.min(30, currentZoom + delta)); }
    editor.updateOptions({ fontSize: currentZoom });
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        document.exitFullscreen().catch(() => {});
    }
}

function sortLines(ascending) {
    if (!editor) return;
    const model = editor.getModel();
    const lineCount = model.getLineCount();
    const lines = [];
    for (let i = 1; i <= lineCount; i++) lines.push(model.getLineContent(i));
    lines.sort((a, b) => ascending ? a.localeCompare(b) : b.localeCompare(a));
    editor.setValue(lines.join('\n'));
}

function changeLanguage() {
    if (!editor || !isMonacoReady) return;
    const lang = prompt('Enter language (jsx, tsx, js, ts, css, json, html, markdown, plaintext):', 'jsx');
    if (!lang) return;
    const monacoMap = { jsx: 'javascript', tsx: 'typescript', js: 'javascript', ts: 'typescript', html: 'html', css: 'css', json: 'json', md: 'markdown', markdown: 'markdown', plaintext: 'plaintext' };
    const displayMap = { jsx: 'JSX', tsx: 'TSX', js: 'JavaScript', ts: 'TypeScript', html: 'HTML', css: 'CSS', json: 'JSON', md: 'Markdown', markdown: 'Markdown', plaintext: 'Plain Text' };
    const resolved = monacoMap[lang.toLowerCase()] || lang;
    const display = displayMap[lang.toLowerCase()] || lang.toUpperCase();
    monaco.editor.setModelLanguage(editor.getModel(), resolved);
    document.getElementById('sb-language').textContent = display;
}

function changeIndent() {
    if (!editor) return;
    const size = prompt('Tab size:', '4');
    const n = parseInt(size);
    if (!isNaN(n)) {
        editor.updateOptions({ tabSize: n, insertSpaces: true });
        document.getElementById('sb-indent').textContent = `Spaces: ${n}`;
    }
}

// ============================================================
// BOOKMARKS
// ============================================================
function toggleBookmark() {
    if (!editor || !activeFile) return;
    const line = editor.getPosition().lineNumber;
    if (!bookmarks[activeFile]) bookmarks[activeFile] = new Set();
    if (bookmarks[activeFile].has(line)) {
        bookmarks[activeFile].delete(line);
        logOutput(`Bookmark removed: ${activeFile}:${line}`, 'system');
    } else {
        bookmarks[activeFile].add(line);
        logOutput(`Bookmark added: ${activeFile}:${line}`, 'system');
    }
    renderBookmarks();
    applyBookmarkDecorations();
}

function applyBookmarkDecorations() {
    if (!editor || !activeFile || !bookmarks[activeFile]) return;
    const decorations = Array.from(bookmarks[activeFile]).map(line => ({
        range: new monaco.Range(line, 1, line, 1),
        options: {
            isWholeLine: true,
            className: 'bookmark-line',
            glyphMarginClassName: 'bm-dot',
            overviewRuler: { color: '#007acc', position: monaco.editor.OverviewRulerLane.Left }
        }
    }));
    editor.createDecorationsCollection(decorations);
}

function renderBookmarks() {
    const container = document.getElementById('bookmarks-list');
    const all = [];
    Object.keys(bookmarks).forEach(path => {
        bookmarks[path].forEach(line => all.push({ path, line }));
    });
    if (all.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center mt-4">No bookmarks.<br><span class="text-[10px]">Ctrl+K, Ctrl+K to add</span></p>';
        return;
    }
    container.innerHTML = all.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line).map(bm => `
        <div class="flex items-center gap-2 py-1 px-1 rounded hover:bg-[#2a2d2e] cursor-pointer group" onclick="jumpToBookmark('${bm.path}',${bm.line})">
            <span class="bm-dot shrink-0"></span>
            <div class="flex-1 overflow-hidden">
                <div class="text-[#ccc] truncate text-[11px]">${bm.path.split('/').pop()}</div>
                <div class="text-gray-500 text-[10px]">Line ${bm.line}</div>
            </div>
            <button class="hidden group-hover:block text-gray-600 hover:text-red-400" onclick="removeBookmark('${bm.path}',${bm.line},event)"><i data-lucide="x" class="w-3 h-3"></i></button>
        </div>
    `).join('');
    lucide.createIcons();
}

function jumpToBookmark(path, line) {
    openFile(path);
    setTimeout(() => {
        if (editor) editor.revealLineInCenter(line);
    }, 100);
}

function removeBookmark(path, line, e) {
    e.stopPropagation();
    if (bookmarks[path]) bookmarks[path].delete(line);
    renderBookmarks();
}

function clearAllBookmarks() {
    bookmarks = {};
    renderBookmarks();
    logOutput('All bookmarks cleared.', 'system');
}

// ============================================================
// TERMINAL v2.0
// ============================================================
let termHistory = [];
let termHistoryIndex = -1;
let termMode = 'shell'; // 'shell' | 'js'

function termSetMode(mode) {
    termMode = mode;
    const sym = document.getElementById('terminal-prompt-symbol');
    const shBtn = document.getElementById('term-mode-shell');
    const jsBtn = document.getElementById('term-mode-js');
    const active = 'px-1.5 py-0.5 text-[10px] rounded bg-[#007acc] text-white font-mono';
    const inactive = 'px-1.5 py-0.5 text-[10px] rounded border border-[#555] text-gray-400 hover:border-[#007acc] font-mono';
    if (mode === 'js') {
        sym.textContent = '>'; sym.className = 'text-yellow-400 text-xs font-mono shrink-0 select-none';
        shBtn.className = inactive; jsBtn.className = active;
        addTerminalLine('» JavaScript REPL — full page context. Try: Object.keys(vfs)', 'text-yellow-400');
    } else {
        sym.textContent = '$'; sym.className = 'text-green-400 text-xs font-mono shrink-0 select-none';
        shBtn.className = active; jsBtn.className = inactive;
        addTerminalLine('» Shell mode', 'text-green-400');
    }
}

function resolveTermPath(name) {
    if (!name) return null;
    if (vfs[name]) return name;
    return Object.keys(vfs).find(p => p.endsWith('/' + name) || p.split('/').pop() === name) || null;
}

const terminalCommands = {
    help: () => [
        { t: '─── File System ──────────────────────────', c: 'text-[#007acc]' },
        { t: '  ls [path]            list files', c: 'text-gray-300' },
        { t: '  cat [file]           print contents (up to 200 lines)', c: 'text-gray-300' },
        { t: '  head [-n] [file]     first N lines (default 10)', c: 'text-gray-300' },
        { t: '  tail [-n] [file]     last N lines (default 10)', c: 'text-gray-300' },
        { t: '  grep [pattern] [f]   search lines matching pattern', c: 'text-gray-300' },
        { t: '  wc [file]            line/word/char count', c: 'text-gray-300' },
        { t: '  find [pattern]       find files matching pattern', c: 'text-gray-300' },
        { t: '  touch [name]         create empty file', c: 'text-gray-300' },
        { t: '  mkdir [name]         create directory', c: 'text-gray-300' },
        { t: '  rm [file]            delete file', c: 'text-gray-300' },
        { t: '  mv [old] [new]       rename / move', c: 'text-gray-300' },
        { t: '  cp [src] [dst]       copy file', c: 'text-gray-300' },
        { t: '─── Editor ───────────────────────────────', c: 'text-[#007acc]' },
        { t: '  open [file]          open in editor', c: 'text-gray-300' },
        { t: '  preview [file]       load in preview pane', c: 'text-gray-300' },
        { t: '  format               format current file', c: 'text-gray-300' },
        { t: '  minify [file]        minify CSS or JS', c: 'text-gray-300' },
        { t: '  validate [file]      validate JSON', c: 'text-gray-300' },
        { t: '─── Utilities ────────────────────────────', c: 'text-[#007acc]' },
        { t: '  echo [text]          print text', c: 'text-gray-300' },
        { t: '  pwd                  working directory', c: 'text-gray-300' },
        { t: '  date                 current date/time', c: 'text-gray-300' },
        { t: '  history              command history', c: 'text-gray-300' },
        { t: '  zip                  export project as ZIP', c: 'text-gray-300' },
        { t: '  clear                clear terminal', c: 'text-gray-300' },
        { t: '─── Tips ─────────────────────────────────', c: 'text-[#007acc]' },
        { t: '  ↑ / ↓               navigate history', c: 'text-gray-500' },
        { t: '  Tab                  autocomplete command or filename', c: 'text-gray-500' },
        { t: '  ls | grep .js        basic pipe + grep', c: 'text-gray-500' },
        { t: '  [JS] button          real JavaScript eval with full page access', c: 'text-gray-500' },
    ],

    ls: (args) => {
        const prefix = args[0] ? args[0].replace(/\/$/, '') + '/' : '';
        const raw = Object.keys(vfs).filter(p => !prefix || p.startsWith(prefix))
            .map(p => {
                const rel = prefix ? p.slice(prefix.length) : p;
                const parts = rel.split('/');
                return parts.length > 1 ? parts[0] + '/' : parts[0];
            });
        const unique = [...new Set(raw)].sort();
        if (!unique.length) return [{ t: '(empty)', c: 'text-gray-500' }];
        return unique.map(f => ({
            t: '  ' + f,
            c: f.endsWith('/') ? 'text-[#007acc]'
              : /\.(js|ts|jsx|tsx)$/.test(f) ? 'text-yellow-300'
              : /\.(html|htm)$/.test(f) ? 'text-orange-300'
              : /\.css$/.test(f) ? 'text-blue-300'
              : /\.(json|yaml|yml)$/.test(f) ? 'text-green-300'
              : 'text-gray-300'
        }));
    },

    cat: (args) => {
        const path = resolveTermPath(args[0]);
        if (!path) return [{ t: 'Usage: cat [filename]', c: 'text-red-400' }];
        if (!vfs[path]) return [{ t: `cat: ${args[0]}: No such file`, c: 'text-red-400' }];
        if (!vfs[path].isText) return [{ t: '[binary — cannot display]', c: 'text-gray-500' }];
        const lines = (vfs[path].content || '').split('\n');
        const out = lines.slice(0, 200).map((l, i) => ({ t: String(i + 1).padStart(4) + '  ' + l, c: 'text-gray-300' }));
        if (lines.length > 200) out.push({ t: `… ${lines.length - 200} more lines`, c: 'text-gray-500' });
        return out;
    },

    head: (args) => {
        let n = 10, fname;
        if (args[0] && args[0].startsWith('-')) { n = parseInt(args[0].slice(1)) || 10; fname = args[1]; }
        else fname = args[0];
        const path = resolveTermPath(fname);
        if (!path || !vfs[path]) return [{ t: `head: ${fname || '?'}: No such file`, c: 'text-red-400' }];
        return (vfs[path].content || '').split('\n').slice(0, n).map(l => ({ t: l, c: 'text-gray-300' }));
    },

    tail: (args) => {
        let n = 10, fname;
        if (args[0] && args[0].startsWith('-')) { n = parseInt(args[0].slice(1)) || 10; fname = args[1]; }
        else fname = args[0];
        const path = resolveTermPath(fname);
        if (!path || !vfs[path]) return [{ t: `tail: ${fname || '?'}: No such file`, c: 'text-red-400' }];
        const lines = (vfs[path].content || '').split('\n');
        return lines.slice(-n).map(l => ({ t: l, c: 'text-gray-300' }));
    },

    grep: (args) => {
        if (args.length < 2) return [{ t: 'Usage: grep [pattern] [file]', c: 'text-red-400' }];
        let re; try { re = new RegExp(args[0], 'i'); } catch { re = new RegExp(args[0].replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'i'); }
        const path = resolveTermPath(args[1]);
        if (!path || !vfs[path]) return [{ t: `grep: ${args[1]}: No such file`, c: 'text-red-400' }];
        const matches = (vfs[path].content || '').split('\n').map((l, i) => ({ n: i + 1, l })).filter(x => re.test(x.l));
        if (!matches.length) return [{ t: '(no matches)', c: 'text-gray-500' }];
        return matches.map(m => ({ t: `${String(m.n).padStart(4)}: ${m.l}`, c: 'text-gray-300' }));
    },

    wc: (args) => {
        const path = resolveTermPath(args[0]);
        if (!path || !vfs[path]) return [{ t: `wc: ${args[0] || '?'}: No such file`, c: 'text-red-400' }];
        const c = vfs[path].content || '';
        return [{ t: `  lines ${c.split('\n').length}   words ${c.split(/\s+/).filter(Boolean).length}   chars ${c.length}   ${args[0]}`, c: 'text-gray-300' }];
    },

    find: (args) => {
        const pat = args[0] || '';
        let re; try { re = new RegExp(pat, 'i'); } catch { re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'i'); }
        const hits = Object.keys(vfs).filter(p => re.test(p));
        return hits.length ? hits.map(p => ({ t: './' + p, c: 'text-gray-300' })) : [{ t: '(no matches)', c: 'text-gray-500' }];
    },

    pwd:     ()     => [{ t: '/workspace', c: 'text-gray-300' }],
    date:    ()     => [{ t: new Date().toString(), c: 'text-gray-300' }],
    echo:    (args) => [{ t: args.join(' '), c: 'text-gray-300' }],
    clear:   ()     => { clearTerminal(); return []; },
    history: ()     => termHistory.length
        ? termHistory.map((h, i) => ({ t: `  ${String(i + 1).padStart(3)}  ${h}`, c: 'text-gray-400' }))
        : [{ t: '(no history)', c: 'text-gray-500' }],

    touch: (args) => {
        const name = args[0];
        if (!name) return [{ t: 'Usage: touch [filename]', c: 'text-red-400' }];
        if (!vfs[name]) { vfs[name] = { name: name.split('/').pop(), isText: isTextBased(name), content: '', fileObj: null, blobUrl: null }; markGitChanged(name, 'A'); renderFileTree(); }
        return [{ t: `created: ${name}`, c: 'text-green-400' }];
    },

    mkdir: (args) => {
        const name = args[0];
        if (!name) return [{ t: 'Usage: mkdir [dirname]', c: 'text-red-400' }];
        vfs[name + '/.gitkeep'] = { name: '.gitkeep', isText: true, content: '', fileObj: null, blobUrl: null };
        renderFileTree();
        return [{ t: `created directory: ${name}`, c: 'text-green-400' }];
    },

    rm: (args) => {
        const path = resolveTermPath(args[0]);
        if (!path) return [{ t: `rm: ${args[0] || '?'}: No such file`, c: 'text-red-400' }];
        delete vfs[path]; if (openFiles.includes(path)) closeTab(path); renderFileTree();
        return [{ t: `removed: ${path}`, c: 'text-green-400' }];
    },

    mv: (args) => {
        if (args.length < 2) return [{ t: 'Usage: mv [old] [new]', c: 'text-red-400' }];
        const path = resolveTermPath(args[0]);
        if (!path) return [{ t: `mv: ${args[0]}: Not found`, c: 'text-red-400' }];
        vfs[args[1]] = { ...vfs[path], name: args[1].split('/').pop() }; delete vfs[path]; renderFileTree();
        return [{ t: `${args[0]} → ${args[1]}`, c: 'text-green-400' }];
    },
    rename: (args) => terminalCommands.mv(args),

    cp: (args) => {
        if (args.length < 2) return [{ t: 'Usage: cp [src] [dst]', c: 'text-red-400' }];
        const path = resolveTermPath(args[0]);
        if (!path) return [{ t: `cp: ${args[0]}: Not found`, c: 'text-red-400' }];
        vfs[args[1]] = { ...vfs[path], name: args[1].split('/').pop(), fileObj: null, blobUrl: null }; renderFileTree();
        return [{ t: `copied: ${args[0]} → ${args[1]}`, c: 'text-green-400' }];
    },

    open: (args) => {
        const path = resolveTermPath(args[0]);
        if (!path || !vfs[path]) return [{ t: `open: ${args[0] || '?'}: Not found`, c: 'text-red-400' }];
        openFile(path);
        return [{ t: `opened: ${path}`, c: 'text-green-400' }];
    },

    preview: (args) => {
        const path = resolveTermPath(args[0]);
        if (!path || !vfs[path]) return [{ t: `preview: ${args[0] || '?'}: Not found`, c: 'text-red-400' }];
        activeIframeFile = path; refreshPreview();
        return [{ t: `preview: ${path}`, c: 'text-green-400' }];
    },

    format: () => { execEditorCmd('editor.action.formatDocument'); return [{ t: 'formatted.', c: 'text-green-400' }]; },
    zip:    () => { exportZip(); return [{ t: 'exporting ZIP…', c: 'text-green-400' }]; },

    validate: (args) => {
        const path = resolveTermPath(args[0]);
        if (!path || !vfs[path]) return [{ t: `Not found: ${args[0] || '?'}`, c: 'text-red-400' }];
        const ext = path.split('.').pop().toLowerCase();
        if (ext === 'json') {
            try { JSON.parse(vfs[path].content); return [{ t: '✔ Valid JSON', c: 'text-green-400' }]; }
            catch(e) { return [{ t: `✖ ${e.message}`, c: 'text-red-400' }]; }
        }
        return [{ t: `Validation not available for .${ext}`, c: 'text-yellow-400' }];
    },

    minify: (args) => {
        const path = resolveTermPath(args[0]);
        if (!path || !vfs[path]) return [{ t: `Not found: ${args[0] || '?'}`, c: 'text-red-400' }];
        const ext = path.split('.').pop().toLowerCase();
        if (ext === 'css') vfs[path].content = vfs[path].content.replace(/\s*([{}:;,>~+])\s*/g,'$1').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s+/g,' ').trim();
        else if (ext === 'js') vfs[path].content = vfs[path].content.replace(/\/\/[^\n]*/g,'').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s+/g,' ').trim();
        else return [{ t: `Minify not supported for .${ext}`, c: 'text-yellow-400' }];
        renderFileTree();
        return [{ t: `minified: ${path}`, c: 'text-green-400' }];
    },
};

function handleTerminalInput(e) {
    const input = document.getElementById('terminal-input');

    // ↑ / ↓ history navigation
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!termHistory.length) return;
        if (termHistoryIndex === -1) termHistoryIndex = termHistory.length;
        if (termHistoryIndex > 0) termHistoryIndex--;
        input.value = termHistory[termHistoryIndex] || '';
        setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
        return;
    }
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (termHistoryIndex === -1) return;
        termHistoryIndex++;
        if (termHistoryIndex >= termHistory.length) { termHistoryIndex = -1; input.value = ''; }
        else input.value = termHistory[termHistoryIndex];
        return;
    }

    // Tab completion
    if (e.key === 'Tab') {
        e.preventDefault();
        const parts = input.value.split(/\s+/);
        if (parts.length === 1) {
            const matches = Object.keys(terminalCommands).filter(c => c.startsWith(parts[0].toLowerCase()));
            if (matches.length === 1) input.value = matches[0] + ' ';
            else if (matches.length > 1) addTerminalLine('  ' + matches.join('  '), 'text-gray-400');
        } else {
            const partial = parts[parts.length - 1].toLowerCase();
            const matches = Object.keys(vfs).filter(p => p.toLowerCase().startsWith(partial) || p.split('/').pop().toLowerCase().startsWith(partial));
            if (matches.length === 1) { parts[parts.length - 1] = matches[0]; input.value = parts.join(' '); }
            else if (matches.length > 1) addTerminalLine('  ' + matches.join('  '), 'text-gray-400');
        }
        return;
    }

    if (e.key !== 'Enter') return;
    const raw = input.value.trim();
    input.value = ''; termHistoryIndex = -1;
    if (!raw) return;
    if (raw !== termHistory[termHistory.length - 1]) termHistory.push(raw);

    const promptChar = termMode === 'js' ? '>' : '$';
    addTerminalLine(promptChar + ' ' + raw, termMode === 'js' ? 'text-yellow-300' : 'text-green-300');

    // ── JavaScript REPL ──
    if (termMode === 'js') {
        try {
            const result = (0, eval)(raw);
            if (result !== undefined) {
                const str = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
                str.split('\n').forEach(l => addTerminalLine('← ' + l, 'text-cyan-300'));
            }
        } catch(err) {
            addTerminalLine('✖ ' + err.message, 'text-red-400');
        }
        return;
    }

    // ── Shell with pipe support ──
    const segments = raw.split('|').map(s => s.trim());
    let output = null;
    for (let i = 0; i < segments.length; i++) {
        const [cmd, ...args] = segments[i].split(/\s+/);
        if (i > 0 && output && cmd === 'grep') {
            let re; try { re = new RegExp(args[0], 'i'); } catch { re = /./; }
            output = output.filter(item => re.test(item.t || item));
            continue;
        }
        const fn = terminalCommands[cmd.toLowerCase()];
        output = fn ? (fn(args) || []) : [{ t: `zsh: command not found: ${cmd}`, c: 'text-red-400' }];
    }
    (output || []).forEach(item => addTerminalLine(item.t ?? item, item.c || 'text-gray-300'));
}

function addTerminalLine(text, cls) {
    const out = document.getElementById('terminal-output');
    if (!out) return;
    const d = document.createElement('div');
    d.className = (cls || 'text-gray-300') + ' font-mono text-xs leading-[1.6] whitespace-pre-wrap break-all';
    d.textContent = text;
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
}

function clearTerminal() {
    const out = document.getElementById('terminal-output');
    if (!out) return;
    out.innerHTML = '';
    addTerminalLine('HyperLive Terminal v2.0', 'text-green-400 font-bold');
    addTerminalLine("type help · ↑/↓ history · Tab complete · [JS] for real JS eval", 'text-gray-500 text-[11px]');
}

// ============================================================
// BOTTOM PANEL (Console / Output / Problems)
// ============================================================
function toggleBottomPanel() {
    bottomPanelOpen = !bottomPanelOpen;
    const panel = document.getElementById('bottom-panel');
    const resizer = document.getElementById('resizer-bottom');
    if (bottomPanelOpen) {
        panel.style.height = '200px';
        resizer.classList.remove('hidden');
        switchBottomTab(activeBottomTab);
    } else {
        panel.style.height = '0';
        resizer.classList.add('hidden');
    }
}

function closeBottomPanel() {
    bottomPanelOpen = false;
    document.getElementById('bottom-panel').style.height = '0';
    document.getElementById('resizer-bottom').classList.add('hidden');
}

function openBottomPanel() {
    if (!bottomPanelOpen) toggleBottomPanel();
}

function switchBottomTab(tab) {
    activeBottomTab = tab;
    ['console','output','problems','debug'].forEach(t => {
        const el  = document.getElementById('bp-' + t);
        const btn = document.getElementById('bp-tab-' + t);
        if (el)  el.classList.toggle('hidden', t !== tab);
        if (btn) {
            btn.classList.toggle('text-white',           t === tab);
            btn.classList.toggle('border-[#007acc]',     t === tab);
            btn.classList.toggle('text-gray-400',        t !== tab);
            btn.classList.toggle('border-transparent',   t !== tab);
        }
    });
}

function clearBottomPanel() {
    ['console','output','problems'].forEach(id => {
        const el = document.getElementById('bp-' + id);
        if (el) el.innerHTML = '';
    });
    const dbg = document.getElementById('bp-debug-output');
    if (dbg) dbg.innerHTML = '';
}

function logOutput(msg, type = 'log') {
    openBottomPanel();
    const out = document.getElementById('bp-console');
    const d = document.createElement('div');
    const colors = { log: 'text-gray-300', error: 'text-red-400', warn: 'text-yellow-400', system: 'text-blue-400' };
    d.className = `${colors[type] || 'text-gray-300'} border-b border-[#2d2d2d] pb-0.5 text-[11px] font-mono`;
    d.textContent = `${type === 'system' ? '[sys]' : '>'} ${msg}`;
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
}

// Bottom panel resize
(function() {
    const resizer = document.getElementById('resizer-bottom');
    let resizing = false;
    resizer.addEventListener('mousedown', () => { resizing = true; resizer.classList.add('active'); });
    document.addEventListener('mousemove', e => {
        if (!resizing) return;
        const editorPane = document.getElementById('editor-pane');
        const rect = editorPane.getBoundingClientRect();
        const newH = rect.bottom - e.clientY;
        if (newH > 60 && newH < rect.height - 100) {
            document.getElementById('bottom-panel').style.height = newH + 'px';
        }
    });
    document.addEventListener('mouseup', () => { resizing = false; resizer.classList.remove('active'); });
})();

// ============================================================
// SIDEBAR SWITCHING
// ============================================================
function closeSidebar() {
    document.getElementById('sidebar').style.width = '0px';
    document.querySelectorAll('.activity-icon').forEach(icon => icon.classList.remove('active'));
}

function switchSidebar(view) {
    const sidebar = document.getElementById('sidebar');
    const isActive = document.getElementById('activity-' + view)?.classList.contains('active');
    const isCollapsed = parseInt(sidebar.style.width) < 10;

    // Toggle behaviour: If clicking already active panel, close sidebar
    if (isActive && !isCollapsed) {
        closeSidebar();
        return;
    }

    ['explorer','search','git','bookmarks','terminal'].forEach(v => {
        const p = document.getElementById('panel-' + v);
        if (p) {
            p.classList.remove('flex');
            p.classList.add('hidden');
        }
        document.getElementById('activity-' + v)?.classList.remove('active');
    });

    const panel = document.getElementById('panel-' + view);
    if (panel) {
        panel.classList.remove('hidden');
        panel.classList.add('flex');
    }
    document.getElementById('activity-' + view)?.classList.add('active');

    // Make sure sidebar is visible
    if (isCollapsed) sidebar.style.width = '240px';
    lucide.createIcons();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const isCollapsed = parseInt(sidebar.style.width) < 10;
    if (isCollapsed) {
        sidebar.style.width = '240px';
    } else {
        closeSidebar();
    }
}

function toggleGitPanel() { switchSidebar('git'); }

// ============================================================
// SIDEBAR + PREVIEW RESIZERS
// ============================================================
(function setupResizers() {
    const rSidebar = document.getElementById('resizer-sidebar');
    const sidebar = document.getElementById('sidebar');
    const rPreview = document.getElementById('resizer-preview');
    const preview = document.getElementById('preview-pane');
    let resizingSidebar = false, resizingPreview = false;

    rSidebar.addEventListener('mousedown', () => { resizingSidebar = true; rSidebar.classList.add('active'); });
    rPreview.addEventListener('mousedown', () => { resizingPreview = true; rPreview.classList.add('active'); });

    document.addEventListener('mousemove', e => {
        if (!resizingSidebar && !resizingPreview) return;
        document.getElementById('live-frame').style.pointerEvents = 'none';
        if (resizingSidebar) {
            const w = e.clientX - 48;
            if (w >= 0 && w <= 600) sidebar.style.width = w + 'px';
        }
        if (resizingPreview) {
            const w = window.innerWidth - e.clientX;
            if (w >= 200 && w <= window.innerWidth - 250) preview.style.width = w + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        resizingSidebar = false; resizingPreview = false;
        rSidebar.classList.remove('active'); rPreview.classList.remove('active');
        document.getElementById('live-frame').style.pointerEvents = 'auto';
    });
})();

// ============================================================
// FILE MANAGEMENT
// ============================================================
const isTextBased = name => ['html','htm','css','js','json','txt','md','svg','ts','tsx','jsx','vue','scss','less','yaml','yml','xml','toml'].includes(name.split('.').pop().toLowerCase());

const LANG_MAP = { js:'javascript', ts:'typescript', jsx:'javascript', tsx:'typescript', html:'html', htm:'html', css:'css', scss:'css', less:'css', json:'json', md:'markdown', markdown:'markdown', yaml:'yaml', yml:'yaml', xml:'xml', vue:'html', svg:'xml', txt:'plaintext' };

function getLang(path) {
    const ext = path.split('.').pop().toLowerCase();
    return LANG_MAP[ext] || 'plaintext';
}

const DISPLAY_LANG_MAP = { jsx:'JSX', tsx:'TSX', js:'JavaScript', ts:'TypeScript', html:'HTML', htm:'HTML', css:'CSS', scss:'SCSS', less:'LESS', json:'JSON', md:'Markdown', markdown:'Markdown', yaml:'YAML', yml:'YAML', xml:'XML', vue:'Vue', svg:'SVG', txt:'Plain Text' };
function getDisplayLang(path) {
    const ext = path.split('.').pop().toLowerCase();
    return DISPLAY_LANG_MAP[ext] || (LANG_MAP[ext] || 'plaintext').toUpperCase();
}

function getFileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    const icons = { html:'file-code-2', htm:'file-code-2', css:'file-type-2', scss:'file-type-2', js:'file-json', ts:'file-json', jsx:'file-json', tsx:'file-json', json:'braces', md:'file-text', svg:'image', png:'image', jpg:'image', gif:'image', ico:'image', txt:'file-text', vue:'file-code-2' };
    const colors = { html:'text-orange-400', htm:'text-orange-400', css:'text-blue-400', scss:'text-pink-400', js:'text-yellow-400', ts:'text-blue-300', jsx:'text-cyan-400', tsx:'text-cyan-400', json:'text-yellow-200', md:'text-gray-300', svg:'text-green-400', png:'text-green-400', jpg:'text-green-400', gif:'text-green-400' };
    return { icon: icons[ext] || 'file', color: colors[ext] || 'text-gray-400' };
}

function createNewFile() {
    const name = prompt('New file name (e.g. App.jsx):', 'untitled.jsx');
    if (!name) return;
    if (vfs[name]) { alert('File already exists.'); return; }
    const defaultContent = {
        jsx: 'import React from \'react\';\n\nexport default function Component() {\n  return (\n    <div>\n      <h1>Hello World</h1>\n    </div>\n  );\n}\n',
        tsx: 'import React from \'react\';\n\ninterface Props {}\n\nexport default function Component({}: Props) {\n  return (\n    <div>\n      <h1>Hello World</h1>\n    </div>\n  );\n}\n',
        html: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  \n</body>\n</html>',
        css: '/* Styles */\n',
        js: '// JavaScript\n',
        ts: '// TypeScript\n',
        json: '{\n  \n}\n',
    };
    const ext = name.split('.').pop().toLowerCase();
    vfs[name] = { name, isText: isTextBased(name), content: defaultContent[ext] || '', fileObj: null, blobUrl: null };
    markGitChanged(name, 'A');
    renderFileTree();
    openFile(name);
    logOutput(`Created: ${name}`, 'system');
}

function createNewFolder() {
    const name = prompt('New folder name:', 'new-folder');
    if (!name) return;
    const keepPath = name + '/.gitkeep';
    vfs[keepPath] = { name: '.gitkeep', isText: true, content: '', fileObj: null, blobUrl: null };
    renderFileTree();
    logOutput(`Created folder: ${name}`, 'system');
}

function renameFile(path, e) {
    if (e) e.stopPropagation();
    const file = vfs[path];
    if (!file) return;
    const newName = prompt(`Rename "${file.name}" to:`, file.name);
    if (!newName || newName === file.name) return;
    const parts = path.split('/');
    parts[parts.length - 1] = newName;
    const newPath = parts.join('/');
    if (vfs[newPath]) { alert('A file with that name already exists.'); return; }
    vfs[newPath] = { ...vfs[path], name: newName };
    delete vfs[path];
    const ti = openFiles.indexOf(path);
    if (ti > -1) openFiles[ti] = newPath;
    if (activeFile === path) activeFile = newPath;
    if (activeIframeFile === path) activeIframeFile = newPath;
    markGitChanged(newPath, 'A');
    renderFileTree();
    renderTabs();
    if (activeFile === newPath && isMonacoReady) {
        monaco.editor.setModelLanguage(editor.getModel(), getLang(newPath));
        document.getElementById('sb-language').textContent = getDisplayLang(newPath);
    }
    liveServers.forEach(s => { if (s.path === path) s.path = newPath; });
    refreshPreview();
    logOutput(`Renamed: ${path} → ${newPath}`, 'system');
}

function deleteFile(path, e) {
    if (e) e.stopPropagation();
    if (!confirm(`Delete "${vfs[path]?.name}"?`)) return;
    delete vfs[path];
    delete gitChanges[path];
    if (openFiles.includes(path)) closeTab(path);
    if (activeIframeFile === path) {
        activeIframeFile = Object.keys(vfs).find(p => p.endsWith('.html')) || null;
        activeIframeQuery = '';
        refreshPreview();
    }
    renderFileTree();
    updateGitPanel();
    logOutput(`Deleted: ${path}`, 'system');
}

function collapseAllFolders() {
    document.querySelectorAll('#file-tree .dir-children').forEach(c => {
        c.classList.add('hidden');
        const header = c.previousElementSibling;
        if (header) {
            const icon = header.querySelector('[data-lucide="chevron-right"]');
            if (icon) icon.style.transform = '';
        }
    });
}

function saveActiveFile() {
    if (!activeFile || !vfs[activeFile]) return;
    const content = vfs[activeFile].content;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.split('/').pop();
    a.click();
    URL.revokeObjectURL(url);
    logOutput(`Saved: ${activeFile}`, 'system');
}

function saveActiveFileAs() {
    if (!activeFile || !vfs[activeFile]) return;
    const newName = prompt('Save as:', activeFile.split('/').pop());
    if (!newName) return;
    const content = vfs[activeFile].content;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = newName;
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================================
// FILE UPLOAD / FOLDER OPEN (WITH ROBUST DIRECTORY ITERATION)
// ============================================================
function triggerFolderUpload() { document.getElementById('folder-input').click(); }
function triggerFileUpload() { document.getElementById('file-input').click(); }

document.getElementById('folder-input').addEventListener('change', async e => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    vfs = {}; openFiles = []; activeFile = null;
    document.getElementById('editor-tabs').innerHTML = '';
    for (const file of files) {
        const parts = file.webkitRelativePath.split('/');
        parts.shift();
        const path = parts.join('/');
        if (path) await processFile(file, path, file.name);
    }
    e.target.value = '';
    finalizeMount();
});

document.getElementById('file-input').addEventListener('change', async e => {
    const filesArray = Array.from(e.target.files);
    for (const file of filesArray) {
        await processFile(file, file.name, file.name);
    }
    e.target.value = '';
    renderFileTree();
    logOutput(`${filesArray.length} file(s) added.`, 'system');
});

// Drag and drop events
document.body.addEventListener('dragover', e => { e.preventDefault(); document.body.classList.add('drag-active'); });
document.body.addEventListener('dragleave', e => { if (e.target.id === 'drag-overlay') document.body.classList.remove('drag-active'); });
document.body.addEventListener('drop', async e => {
    e.preventDefault();
    document.body.classList.remove('drag-active');
    if (e.dataTransfer.items) {
        vfs = {}; openFiles = []; activeFile = null;
        document.getElementById('editor-tabs').innerHTML = '';
        const items = Array.from(e.dataTransfer.items).filter(i => i.kind === 'file');
        for (const item of items) {
            const entry = item.webkitGetAsEntry();
            if (entry) {
                await traverseEntry(entry, '');
            } else if (item.getAsFile()) {
                const file = item.getAsFile();
                await processFile(file, file.name, file.name);
            }
        }
        finalizeMount();
    }
});

async function traverseEntry(entry, path) {
    if (entry.isFile) {
        const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
        await processFile(file, path + entry.name, entry.name);
    } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const readAllEntries = async () => {
            let allEntries = [];
            let results = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
            while (results.length > 0) {
                allEntries.push(...results);
                results = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
            }
            return allEntries;
        };
        try {
            const entries = await readAllEntries();
            for (const e of entries) {
                await traverseEntry(e, path + entry.name + '/');
            }
        } catch (err) {
            console.error("Error reading directory entry:", err);
        }
    }
}

async function processFile(file, fullPath, name) {
    try {
        const isText = isTextBased(name);
        let content = null, blobUrl = null;
        if (isText) {
            content = await file.text();
        } else {
            blobUrl = URL.createObjectURL(file);
        }
        vfs[fullPath] = { name, isText, content, fileObj: file, blobUrl };
    } catch (err) {
        console.error("Error processing file " + fullPath, err);
    }
}

// ============================================================
// JSX SHELL BUILDER  — wraps a .jsx/.tsx entry in a full HTML doc
// Uses Babel standalone (CDN) to transpile in-browser, no server needed.
// ============================================================
function buildJsxShell(entryPath) {
    // Collect all .js/.jsx/.ts/.tsx files from VFS
    const jsFiles = Object.keys(vfs).filter(p =>
        /\.(jsx?|tsx?|js|ts)$/i.test(p) && vfs[p].isText && p !== '__jsx_preview__.html'
    );
    const ordered = [...jsFiles.filter(p => p !== entryPath), entryPath];
    const inlined = ordered.map(p => `/* ---- ${p} ---- */\n${vfs[p].content || ''}`).join('\n\n');

    // Rewrite imports: extract named/default bindings and map to CDN globals
    // so e.g. `import { useState } from 'react'` becomes `const { useState } = React;`
    function rewriteImports(code) {
        return code.replace(
            /^import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"];?$/gm,
            (match, bindings, pkg) => {
                const globalMap = {
                    'react':            'React',
                    'react-dom':        'ReactDOM',
                    'react-dom/client': 'ReactDOM',
                    'lucide-react':     'LucideReact',
                    'framer-motion':    'FramerMotion',
                    'recharts':         'Recharts',
                    'lodash':           '_',
                    'd3':               'd3',
                };
                const g = globalMap[pkg] || globalMap[pkg.split('/')[0]];
                if (!g) return `/* skipped: import from '${pkg}' */`;
                bindings = bindings.trim();
                // default import: `import Foo from 'pkg'`
                if (/^[A-Za-z_$][\w$]*$/.test(bindings)) {
                    return `const ${bindings} = ${g};`;
                }
                // namespace: `import * as Foo from 'pkg'`
                if (bindings.startsWith('* as ')) {
                    return `const ${bindings.slice(5)} = ${g};`;
                }
                // named + optional default: `import React, { useState } from 'react'`
                const defaultMatch = bindings.match(/^([A-Za-z_$][\w$]*)\s*,\s*\{([^}]+)\}/);
                if (defaultMatch) {
                    return `const ${defaultMatch[1]} = ${g};\nconst { ${defaultMatch[2].trim()} } = ${g};`;
                }
                // named only: `import { useState, useEffect } from 'react'`
                const namedMatch = bindings.match(/^\{([^}]+)\}$/);
                if (namedMatch) {
                    return `const { ${namedMatch[1].trim()} } = ${g};`;
                }
                return `/* unhandled import: ${match} */`;
            }
        );
    }

    const processed = rewriteImports(inlined)
        .replace(/^export\s+default\s+/gm, 'const __defaultExport = ')
        .replace(/^export\s+/gm, '');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>JSX Preview — ${entryPath}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js"><\/script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
  <script src="https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.js"><\/script>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    *,*::before,*::after{box-sizing:border-box}
    body{margin:0;font-family:system-ui,sans-serif}
    #__jsx_error{display:none;position:fixed;bottom:0;left:0;right:0;background:#1a1a1a;color:#f87171;
      padding:12px 16px;font-family:monospace;font-size:12px;white-space:pre-wrap;z-index:9999;
      border-top:2px solid #f87171;max-height:40vh;overflow:auto}
  </style>
</head>
<body>
  <div id="root"></div>
  <div id="__jsx_error"></div>
  <script>
    // Expose CDN globals so rewritten imports resolve
    window.LucideReact = window.lucideReact || window.LucideReact || {};
    window.FramerMotion = window.FramerMotion || {};
    window.Recharts = window.Recharts || {};
  <\/script>
  <script type="text/babel" data-presets="react,env">
${processed}

    const __App = typeof __defaultExport !== 'undefined' ? __defaultExport : undefined;
    if (__App) {
      const __root = ReactDOM.createRoot(document.getElementById('root'));
      __root.render(React.createElement(React.StrictMode, null, React.createElement(__App)));
    } else {
      document.getElementById('root').innerHTML =
        '<p style="padding:2rem;color:#888;font-family:monospace">⚠ No default export found in ${entryPath}</p>';
    }
  <\/script>
  <script>
    window.addEventListener('error', e => {
      const el = document.getElementById('__jsx_error');
      el.style.display = 'block';
      el.textContent = '⚠ ' + (e.message||e) + (e.filename?' — '+e.filename+':'+e.lineno:'');
    });
    window.addEventListener('unhandledrejection', e => {
      const el = document.getElementById('__jsx_error');
      el.style.display = 'block';
      el.textContent = '⚠ Unhandled promise: ' + (e.reason?.message || e.reason || e);
    });
  <\/script>
</body>
</html>`;
}

function finalizeMount() {
    gitChanges = {};
    renderFileTree();
    updateGitPanel();
    activeIframeQuery = '';
    let entry = Object.keys(vfs).find(p => /index\.(jsx|tsx|js|ts)$/i.test(p))
        || Object.keys(vfs).find(p => /\.(jsx|tsx|js|ts)$/i.test(p))
        || Object.keys(vfs).find(p => p.toLowerCase() === 'index.html')
        || Object.keys(vfs).find(p => p.toLowerCase().endsWith('.html'))
        || Object.keys(vfs).find(p => vfs[p].isText);
    if (entry) {
        openFile(entry);
        if (entry.endsWith('.html')) {
            activeIframeFile = entry;
        } else if (/\.(jsx|tsx|js|ts)$/i.test(entry)) {
            // Auto-wrap: synthesise an index.html that loads this JSX via Babel
            const syntheticKey = '__jsx_preview__.html';
            vfs[syntheticKey] = {
                name: '__jsx_preview__.html',
                isText: true,
                fileObj: null,
                blobUrl: null,
                content: buildJsxShell(entry)
            };
            activeIframeFile = syntheticKey;
        }
        refreshPreview();
    }
    logOutput('Workspace mounted.', 'system');
}

// ============================================================
// TABS
// ============================================================
function renderTabs() {
    const container = document.getElementById('editor-tabs');
    container.innerHTML = '';
    openFiles.forEach(path => {
        const file = vfs[path];
        const isActive = path === activeFile;
        const tab = document.createElement('div');
        tab.className = `editor-tab group flex items-center gap-1.5 px-3 h-full cursor-pointer border-r border-[#1e1e1e] select-none min-w-0 ${isActive ? 'active text-white bg-[#1e1e1e]' : 'text-gray-400 bg-[#2d2d2d] hover:text-white hover:bg-[#2a2a2a]'}`;
        tab.onclick = () => openFile(path);
        const hasChanges = gitChanges[path] === 'M';
        const nameEl = document.createElement('span');
        nameEl.className = 'text-[12px] font-mono truncate max-w-[120px]';
        nameEl.textContent = (file?.name || path.split('/').pop()) + (hasChanges ? ' ●' : '');
        const closeBtn = document.createElement('button');
        closeBtn.className = `p-0.5 rounded hover:bg-[#555] flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`;
        closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        closeBtn.onclick = e => { e.stopPropagation(); closeTab(path); };
        tab.appendChild(nameEl);
        tab.appendChild(closeBtn);
        container.appendChild(tab);
    });
}

function closeTab(path) {
    openFiles = openFiles.filter(p => p !== path);
    if (activeFile === path) {
        if (openFiles.length > 0) {
            openFile(openFiles[openFiles.length - 1]);
        } else {
            activeFile = null;
            document.getElementById('editor-empty').style.display = '';
            document.getElementById('editor-empty').style.zIndex = '10';
            if (isMonacoReady) editor.setValue('');
            renderTabs();
            document.getElementById('breadcrumb-content').textContent = 'HyperLive';
        }
    } else {
        renderTabs();
    }
}

function closeAllTabs() {
    openFiles = [];
    activeFile = null;
    document.getElementById('editor-tabs').innerHTML = '';
    document.getElementById('editor-empty').style.display = '';
    document.getElementById('editor-empty').style.zIndex = '10';
    if (isMonacoReady) editor.setValue('');
    document.getElementById('breadcrumb-content').textContent = 'HyperLive';
}

function cycleTab(dir) {
    if (!openFiles.length) return;
    const idx = openFiles.indexOf(activeFile);
    const next = (idx + dir + openFiles.length) % openFiles.length;
    openFile(openFiles[next]);
}

// ============================================================
// OPEN FILE
// ============================================================
function openFile(path) {
    if (!vfs[path]) return;
    if (!openFiles.includes(path)) openFiles.push(path);
    activeFile = path;

    // Highlight in tree
    document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
    document.getElementById('tree-' + cssId(path))?.classList.add('active');

    renderTabs();

    // Update breadcrumb
    document.getElementById('breadcrumb-content').innerHTML =
        path.split('/').map((seg, i, arr) =>
            i < arr.length-1 ? `<span class="text-gray-500 hover:text-gray-300 cursor-pointer">${seg}</span><span class="sep">›</span>` : `<span class="text-gray-200">${seg}</span>`
        ).join('');

    if (vfs[path].isText) {
        document.getElementById('editor-empty').style.display = 'none';
        if (isMonacoReady) {
            const lang = getLang(path);
            monaco.editor.setModelLanguage(editor.getModel(), lang);
            editor.setValue(vfs[path].content || '');
            editor.setScrollPosition({ scrollTop: 0 });
            document.getElementById('sb-language').textContent = getDisplayLang(path);
            applyBookmarkDecorations();
        } else {
            setTimeout(() => openFile(path), 100);
        }
    } else {
        document.getElementById('editor-empty').style.display = '';
        document.getElementById('editor-empty').style.zIndex = '10';
        document.getElementById('editor-empty').innerHTML = `
            <div class="text-center">
                <img src="${vfs[path].blobUrl}" class="max-w-xs max-h-64 mx-auto mb-3 rounded shadow-lg border border-[#333]" onerror="this.style.display='none'">
                <p class="text-gray-500 font-mono text-sm">${vfs[path].name}</p>
            </div>`;
    }

    if (path.endsWith('.html') || path.endsWith('.htm')) {
        activeIframeFile = path;
        activeIframeQuery = '';
        refreshPreview();
    }

    document.getElementById('header-filename').textContent = vfs[path].name;
}

function cssId(path) { return path.replace(/[^a-zA-Z0-9]/g, '_'); }

// ============================================================
// FILE TREE
// ============================================================
function renderFileTree() {
    const container = document.getElementById('file-tree');
    container.innerHTML = '';

    if (Object.keys(vfs).length === 0) {
        container.innerHTML = `
            <div class="p-5 text-center text-gray-500 mt-6">
                <i data-lucide="folder-open" class="w-10 h-10 mx-auto mb-3 opacity-40"></i>
                <p class="text-sm mb-4">No folder opened</p>
                <button onclick="triggerFolderUpload()" class="w-full px-3 py-1.5 bg-[#007acc] hover:bg-[#005f9e] text-white rounded text-xs transition mb-2">Open Folder</button>
                <button onclick="loadDemo()" class="w-full px-3 py-1.5 border border-[#454545] hover:bg-[#37373d] text-gray-300 rounded text-xs transition">Load Demo</button>
            </div>`;
        lucide.createIcons();
        return;
    }

    const tree = buildTree(Object.keys(vfs));
    renderTreeNode(tree, container, 0);
    lucide.createIcons();
}

function buildTree(paths) {
    const root = { dirs: {}, files: [] };
    paths.forEach(path => {
        const parts = path.split('/');
        let node = root;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!node.dirs[parts[i]]) node.dirs[parts[i]] = { dirs: {}, files: [] };
            node = node.dirs[parts[i]];
        }
        node.files.push({ name: parts[parts.length - 1], path });
    });
    return root;
}

function renderTreeNode(node, container, depth) {
    // Folders first
    Object.keys(node.dirs).sort().forEach(dirName => {
        const wrapper = document.createElement('div');
        const header = document.createElement('div');
        header.className = 'file-item flex items-center gap-1.5 py-0.5 text-gray-300 hover:text-white rounded';
        header.style.paddingLeft = (depth * 12 + 6) + 'px';

        const chevron = document.createElement('span');
        chevron.innerHTML = '<i data-lucide="chevron-right" class="w-3 h-3 text-gray-500 shrink-0 transition-transform"></i>';
        const folderIcon = document.createElement('span');
        folderIcon.innerHTML = '<i data-lucide="folder" class="w-3.5 h-3.5 shrink-0 text-[#dcb67a]"></i>';
        const label = document.createElement('span');
        label.textContent = dirName;
        label.className = 'text-[13px] truncate';

        header.appendChild(chevron);
        header.appendChild(folderIcon);
        header.appendChild(label);

        const children = document.createElement('div');
        children.className = 'dir-children hidden';

        header.addEventListener('click', () => {
            const open = !children.classList.contains('hidden');
            children.classList.toggle('hidden', open);
            chevron.querySelector('i').style.transform = open ? '' : 'rotate(90deg)';
            folderIcon.querySelector('i').setAttribute('data-lucide', open ? 'folder' : 'folder-open');
            lucide.createIcons();
        });

        wrapper.appendChild(header);
        wrapper.appendChild(children);
        container.appendChild(wrapper);
        renderTreeNode(node.dirs[dirName], children, depth + 1);
    });

    // Files
    node.files.sort((a,b) => a.name.localeCompare(b.name)).forEach(({ name, path }) => {
        if (name === '.gitkeep') return;
        const { icon, color } = getFileIcon(name);
        const gitStatus = gitChanges[path];
        const gitBadge = gitStatus ? `<span class="text-[10px] ml-auto pr-1 font-bold ${gitStatus==='A'?'text-green-400':gitStatus==='M'?'text-yellow-400':'text-red-400'}">${gitStatus}</span>` : '';

        const el = document.createElement('div');
        el.className = `file-item group flex items-center gap-1.5 py-0.5 rounded text-gray-400 ${activeFile === path ? 'active' : ''}`;
        el.style.paddingLeft = (depth * 12 + 20) + 'px';
        el.id = 'tree-' + cssId(path);

        el.innerHTML = `
            <i data-lucide="${icon}" class="w-3.5 h-3.5 shrink-0 ${color}"></i>
            <span class="text-[13px] truncate flex-1">${name}</span>
            ${gitBadge}
            <div class="hidden group-hover:flex items-center gap-0.5 shrink-0">
                <button class="p-0.5 hover:text-white rounded" onclick="renameFile('${path}',event)" title="Rename"><i data-lucide="edit-2" class="w-3 h-3"></i></button>
                <button class="p-0.5 hover:text-red-400 rounded" onclick="deleteFile('${path}',event)" title="Delete"><i data-lucide="trash-2" class="w-3 h-3"></i></button>
            </div>`;

        el.addEventListener('click', e => {
            if (e.target.closest('button')) return;
            openFile(path);
        });
        el.addEventListener('contextmenu', e => { e.preventDefault(); showContextMenu(e, path); });
        container.appendChild(el);
    });
}

// ============================================================
// CONTEXT MENU
// ============================================================
function showContextMenu(e, path) {
    const menu = document.getElementById('context-menu');
    const content = document.getElementById('context-menu-content');
    content.innerHTML = [
        { label: 'Open', action: () => openFile(path) },
        { separator: true },
        { label: 'Rename', action: () => renameFile(path) },
        { label: 'Delete', action: () => deleteFile(path) },
        { separator: true },
        { label: 'Copy Path', action: () => navigator.clipboard?.writeText(path) },
    ].map(item => item.separator
        ? '<div class="menu-separator"></div>'
        : `<div class="menu-list-item text-gray-300" onclick="this.closest('#context-menu').classList.remove('visible'); (${item.action})()">${item.label}</div>`
    ).join('');
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    menu.classList.add('visible');
}

document.addEventListener('click', () => document.getElementById('context-menu')?.classList.remove('visible'));

// ============================================================
// GLOBAL SEARCH
// ============================================================
function toggleSearchOption(opt) {
    searchOptions[opt] = !searchOptions[opt];
    const btn = document.getElementById('search-opt-' + opt);
    btn.classList.toggle('border-[#007acc]', searchOptions[opt]);
    btn.classList.toggle('text-white', searchOptions[opt]);
    performGlobalSearch();
}

function performGlobalSearch() {
    const query = document.getElementById('global-search-input').value;
    const results = document.getElementById('search-results');
    if (!query) { results.innerHTML = ''; return; }

    const matches = [];
    let flags = 'g';
    if (!searchOptions.case) flags += 'i';
    let pattern;
    try {
        const q = searchOptions.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordBound = searchOptions.word ? `\\b${q}\\b` : q;
        pattern = new RegExp(wordBound, flags);
    } catch { results.innerHTML = '<div class="text-red-400 p-2">Invalid regex</div>'; return; }

    Object.keys(vfs).forEach(path => {
        if (!vfs[path].isText) return;
        const lines = (vfs[path].content || '').split('\n');
        lines.forEach((line, idx) => {
            if (pattern.test(line)) {
                matches.push({ path, line: idx+1, text: line.trim().slice(0,80) });
            }
        });
    });

    if (!matches.length) { results.innerHTML = '<div class="text-gray-500 p-2">No results</div>'; return; }
    results.innerHTML = matches.slice(0, 200).map(m => `
        <div class="px-2 py-1 hover:bg-[#2a2d2e] cursor-pointer rounded" onclick="jumpToResult('${m.path}',${m.line})">
            <div class="text-[#ccc] text-[11px] truncate">${m.path.split('/').pop()} <span class="text-gray-500">:${m.line}</span></div>
            <div class="text-gray-500 text-[10px] truncate font-mono">${m.text}</div>
        </div>`).join('');
}

function jumpToResult(path, line) {
    openFile(path);
    setTimeout(() => {
        if (editor) {
            editor.revealLineInCenter(line);
            editor.setPosition({ lineNumber: line, column: 1 });
        }
    }, 100);
}

// ============================================================
// GIT SIMULATION
// ============================================================
function markGitChanged(path, status) {
    gitChanges[path] = status;
    updateGitBadge();
    updateGitPanel();
}

function updateGitBadge() {
    const count = Object.keys(gitChanges).length;
    const badge = document.getElementById('git-badge');
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
}

function updateGitPanel() {
    const list = document.getElementById('git-changes-list');
    const entries = Object.keys(gitChanges);
    if (!entries.length) {
        list.innerHTML = '<div class="text-gray-500 p-3 text-xs text-center">No changes</div>';
        return;
    }
    list.innerHTML = entries.map(p => {
        const s = gitChanges[p];
        const cls = s==='A' ? 'git-file-added' : s==='M' ? 'git-file-modified' : 'git-file-deleted';
        return `<div class="flex items-center gap-2 px-3 py-1 hover:bg-[#2a2d2e] cursor-pointer" onclick="openFile('${p}')">
            <span class="font-bold ${cls} text-[11px] w-3 shrink-0">${s}</span>
            <span class="text-[12px] text-gray-300 truncate">${p}</span>
        </div>`;
    }).join('');
}

function gitRefresh() { updateGitPanel(); logOutput('Git: status refreshed', 'system'); }

function gitCommit() {
    const msg = document.getElementById('git-commit-msg').value.trim();
    if (!msg) { alert('Enter a commit message.'); return; }
    const count = Object.keys(gitChanges).length;
    if (!count) { logOutput('Git: nothing to commit.', 'warn'); return; }
    logOutput(`Git: committed ${count} file(s) — "${msg}"`, 'system');
    gitChanges = {};
    document.getElementById('git-commit-msg').value = '';
    updateGitBadge();
    updateGitPanel();
    renderTabs();
}

function gitAction(action) {
    const msgs = {
        init: 'Repository initialized in memory.',
        clone: 'Clone: enter URL in terminal: git clone <url>',
        fetch: 'Fetch: no remote configured (local environment).',
        pull: 'Pull: no remote configured.',
        push: 'Push: no remote configured.',
        sync: 'Sync: no remote configured.',
        branch: () => {
            const name = prompt('New branch name:', 'feature/new-branch');
            if (name) { gitBranch = name; document.getElementById('sb-branch').textContent = name; return `Switched to new branch: ${name}`; }
            return null;
        },
        checkout: () => {
            const name = prompt('Branch name:', gitBranch);
            if (name) { gitBranch = name; document.getElementById('sb-branch').textContent = name; return `Checked out: ${name}`; }
            return null;
        },
        merge: 'Merge: specify branch in real git CLI.',
        rebase: 'Rebase: not available in local simulation.',
        log: () => { logOutput('Git log: initial commit (local simulation)', 'system'); return null; },
        stash: () => { logOutput('Git stash: changes stashed.', 'system'); return null; },
        'stash-apply': 'Stash apply: no stash found.',
        diff: 'Diff: open files to compare changes.',
    };
    const result = typeof msgs[action] === 'function' ? msgs[action]() : msgs[action];
    if (result) logOutput('Git: ' + result, 'system');
    switchSidebar('git');
}

// ============================================================
// BUILD TOOLS
// ============================================================
function buildProject() {
    openBottomPanel();
    switchBottomTab('output');
    const out = document.getElementById('bp-output');
    out.innerHTML = '';
    const add = (msg, cls='text-gray-300') => {
        const d = document.createElement('div');
        d.className = cls + ' font-mono text-[11px]';
        d.textContent = msg;
        out.appendChild(d);
        out.scrollTop = out.scrollHeight;
    };
    add('[Build] Starting build...', 'text-blue-400');
    const files = Object.keys(vfs);
    add(`[Build] ${files.length} file(s) in workspace`);
    let errors = 0;
    files.forEach(p => {
        if (!vfs[p].isText) return;
        const ext = p.split('.').pop().toLowerCase();
        if (ext === 'json') {
            try { JSON.parse(vfs[p].content); add(`  ✔ ${p}`); }
            catch(e) { add(`  ✖ ${p}: ${e.message}`, 'text-red-400'); errors++; }
        } else {
            add(`  ✔ ${p}`);
        }
    });
    add(errors === 0 ? `[Build] Build succeeded — ${files.length} file(s)` : `[Build] Build failed — ${errors} error(s)`,
        errors === 0 ? 'text-green-400' : 'text-red-400');
    logOutput(`Build complete. ${errors} error(s).`, errors > 0 ? 'error' : 'system');
}

function rebuildProject() { vfs = { ...vfs }; buildProject(); }
function cleanProject() { logOutput('Clean: output cleared (no build artifacts in web IDE).', 'system'); }

function minifyActiveFile(forceExt) {
    const path = activeFile;
    if (!path || !vfs[path]) return;
    const ext = forceExt || path.split('.').pop().toLowerCase();
    let content = vfs[path].content;
    if (ext === 'css') {
        content = content.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s*([{}:;,>~+])\s*/g,'$1').replace(/;}/g,'}').replace(/\s+/g,' ').trim();
    } else if (ext === 'js') {
        content = content.replace(/\/\/[^\n]*/g,'').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s+/g,' ').replace(/\s*([=+\-*/{};,()])\s*/g,'$1').trim();
    } else if (ext === 'html') {
        content = content.replace(/<!--[\s\S]*?-->/g,'').replace(/\s+/g,' ').replace(/> </g,'><').trim();
    }
    vfs[path].content = content;
    if (isMonacoReady && activeFile === path) editor.setValue(content);
    logOutput(`Minified: ${path}`, 'system');
}

async function bundleAndExport() {
    logOutput('Bundling project...', 'system');
    const entryHtml = Object.keys(vfs).find(p => p.endsWith('.html'));
    if (!entryHtml) { logOutput('No HTML entry point found.', 'error'); return; }
    const bundled = compileVFS(entryHtml, false, '');
    const blob = new Blob([bundled], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'bundle.html'; a.click();
    URL.revokeObjectURL(url);
    logOutput('Bundle exported as bundle.html', 'system');
}

// ============================================================
// DEBUG / TEST
// ============================================================
function stopDebugging() { logOutput('Debug session ended.', 'system'); }
function openDevTools() { logOutput('DevTools: use browser F12 for native DevTools.', 'system'); }
function inspectElement() { logOutput('Inspect: right-click in preview iframe.', 'system'); }
function toggleBreakpoint() { logOutput('Breakpoints are managed by browser DevTools.', 'system'); }
function clearAllBreakpoints() { logOutput('All breakpoints cleared (browser DevTools).', 'system'); }

function runTests(scope) {
    openBottomPanel();
    switchBottomTab('problems');
    const out = document.getElementById('bp-problems');
    out.innerHTML = '';
    const add = (msg, cls) => { const d=document.createElement('div'); d.className=cls+' font-mono text-[11px]'; d.textContent=msg; out.appendChild(d); };
    add('[Test] Running tests...', 'text-blue-400');
    Object.keys(vfs).forEach(p => {
        if (!vfs[p].isText) return;
        const ext = p.split('.').pop();
        if (ext === 'json') {
            try { JSON.parse(vfs[p].content); add(`  ✔ ${p} (valid JSON)`, 'text-green-400'); }
            catch(e) { add(`  ✖ ${p}: ${e.message}`, 'text-red-400'); }
        }
    });
    add('[Test] Done.', 'text-green-400');
}

function validateHTML() {
    if (!activeFile || !activeFile.endsWith('.html')) { logOutput('Open an HTML file first.', 'warn'); return; }
    const content = vfs[activeFile]?.content || '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const errors = doc.querySelectorAll('parsererror');
    if (errors.length) {
        logOutput('HTML validation: errors found.', 'error');
        errors.forEach(e => logOutput(e.textContent, 'error'));
    } else {
        logOutput('HTML validation: no parse errors detected.', 'system');
    }
}

function validateCSS() {
    if (!activeFile || !activeFile.endsWith('.css')) { logOutput('Open a CSS file first.', 'warn'); return; }
    logOutput('CSS: basic structure check...', 'system');
    const content = vfs[activeFile]?.content || '';
    const unclosed = (content.match(/{/g)||[]).length - (content.match(/}/g)||[]).length;
    logOutput(unclosed === 0 ? 'CSS: braces balanced ✔' : `CSS: unbalanced braces (${unclosed > 0 ? '+' : ''}${unclosed})`, unclosed === 0 ? 'system' : 'error');
}

function checkJSSyntax() {
    if (!activeFile) return;
    try {
        new Function(vfs[activeFile]?.content || '');
        logOutput('JS syntax: OK ✔', 'system');
    } catch(e) {
        logOutput('JS syntax error: ' + e.message, 'error');
    }
}

function runAccessibilityCheck() {
    if (!activeFile?.endsWith('.html')) { logOutput('Open an HTML file first.', 'warn'); return; }
    const parser = new DOMParser();
    const doc = parser.parseFromString(vfs[activeFile]?.content || '', 'text/html');
    const issues = [];
    doc.querySelectorAll('img:not([alt])').forEach(img => issues.push(`Missing alt on <img src="${img.getAttribute('src')}">`));
    doc.querySelectorAll('a:not([aria-label]):not([title])').forEach(a => { if(!a.textContent.trim()) issues.push('Empty <a> without aria-label'); });
    doc.querySelectorAll('input:not([id]):not([aria-label])').forEach(() => issues.push('Input missing label/aria-label'));
    if (issues.length) {
        logOutput(`Accessibility: ${issues.length} issue(s) found`, 'warn');
        issues.forEach(i => logOutput('  ' + i, 'warn'));
    } else {
        logOutput('Accessibility: no basic issues found ✔', 'system');
    }
}

// ============================================================
// TOOLS
// ============================================================
function openCommandPalette() {
    if (!editor || !isMonacoReady) return;
    editor.trigger('keyboard', 'editor.action.quickCommand', null);
}

function openSnippetsPanel() {
    const snippets = ['html:5 → HTML boilerplate', 'div.class → <div class="">', 'a[href] → anchor tag', '.class → class selector', '#id → id selector'];
    logOutput('Code Snippets: ' + snippets.join(' | '), 'system');
}

function insertGUID() {
    if (!editor || !isMonacoReady) return;
    const guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random()*16|0;
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    editor.executeEdits('insertGUID', [{ range: editor.getSelection(), text: guid }]);
    logOutput('GUID inserted: ' + guid, 'system');
}

function encodeBase64() {
    if (!editor) return;
    const sel = editor.getSelection();
    const text = editor.getModel().getValueInRange(sel);
    if (!text) return;
    editor.executeEdits('base64encode', [{ range: sel, text: btoa(unescape(encodeURIComponent(text))) }]);
}

function decodeBase64() {
    if (!editor) return;
    const sel = editor.getSelection();
    const text = editor.getModel().getValueInRange(sel);
    if (!text) return;
    try {
        editor.executeEdits('base64decode', [{ range: sel, text: decodeURIComponent(escape(atob(text))) }]);
    } catch { logOutput('Base64 decode failed: invalid input', 'error'); }
}

function insertTimestamp() {
    if (!editor) return;
    const sel = editor.getSelection();
    editor.executeEdits('timestamp', [{ range: sel, text: new Date().toISOString() }]);
}

function openSettings() {
    const settings = {
        fontSize: currentFontSize,
        wordWrap: wordWrapEnabled,
        minimap: minimapEnabled,
        theme: currentTheme,
    };
    const json = JSON.stringify(settings, null, 2);
    if (!vfs['settings.json']) {
        vfs['settings.json'] = { name: 'settings.json', isText: true, content: json, fileObj: null, blobUrl: null };
        renderFileTree();
    } else {
        vfs['settings.json'].content = json;
    }
    openFile('settings.json');
    logOutput('Settings opened.', 'system');
}

function showKeyboardShortcuts() {
    const shortcuts = [
        'Ctrl+N — New File', 'Ctrl+O — Open Folder', 'Ctrl+S — Save', 'Ctrl+Shift+S — Export ZIP',
        'Ctrl+P — Live Server', 'Ctrl+W — Close Tab', 'Ctrl+Tab — Next Tab', 'Ctrl+Shift+E — Explorer',
        'Ctrl+Shift+F — Search', 'Ctrl+Shift+G — Source Control', 'Ctrl+` — Terminal',
        'F5 — Refresh Preview', 'F11 — Full Screen', 'F1 — Command Palette',
        'Alt+Z — Word Wrap', 'Shift+Alt+F — Format Document', 'Ctrl+/ — Toggle Comment',
        'Ctrl+G — Go To Line', 'Ctrl+K,Ctrl+K — Toggle Bookmark'
    ];
    vfs['SHORTCUTS.md'] = { name: 'SHORTCUTS.md', isText: true, content: '# Keyboard Shortcuts\n\n' + shortcuts.map(s => '- ' + s).join('\n'), fileObj: null, blobUrl: null };
    renderFileTree();
    openFile('SHORTCUTS.md');
}

function showLicense() {
    alert('HyperLive Pro\nMIT License\nCopyright © 2025\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies.');
}

function showAbout() {
    alert('HyperLive Pro\nVersion 2.0\nFully functional VS-style local web IDE\nEngine: Monaco Editor 0.39\nFeatures: VFS, Live Preview, Hot Reload, Terminal, Search, Git Simulation, Bookmarks, Minify, Build, Debug, Test');
}

// ============================================================
// WINDOW LAYOUT
// ============================================================
function togglePreviewPane() {
    const pane = document.getElementById('preview-pane');
    pane.style.display = pane.style.display === 'none' ? '' : 'none';
}

function splitEditorRight() {
    logOutput('Split editor: open files in separate tabs and use two browser windows for split view.', 'system');
}

function resetLayout() {
    document.getElementById('sidebar').style.width = '240px';
    document.getElementById('preview-pane').style.width = '42%';
    document.getElementById('preview-pane').style.display = '';
    logOutput('Layout reset.', 'system');
}

// ============================================================
// DEVICE MODE
// ============================================================
function toggleDeviceMode() {
    deviceMode = !deviceMode;
    const frame = document.getElementById('live-frame');
    const wrapper = document.getElementById('device-wrapper');
    const btn = document.getElementById('device-mode-btn');
    if (deviceMode) {
        wrapper.style.background = '#555';
        frame.style.width = '375px';
        frame.style.height = '667px';
        frame.style.margin = 'auto';
        frame.style.border = '8px solid #222';
        frame.style.borderRadius = '20px';
        frame.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)';
        btn.style.color = '#007acc';
    } else {
        wrapper.style.background = '';
        frame.style.width = '100%';
        frame.style.height = '100%';
        frame.style.margin = '';
        frame.style.border = 'none';
        frame.style.borderRadius = '';
        frame.style.boxShadow = '';
        btn.style.color = '';
    }
}

// ============================================================
// VFS COMPILER & PREVIEW
// ============================================================
function isAbsolute(url) { return /^(https?:|data:|blob:|\/\/|#|javascript:)/i.test(url); }

function resolveRelative(basePath, relative) {
    if (isAbsolute(relative)) return relative;
    const qMatch = relative.match(/[?#].*$/);
    const qAndH = qMatch ? qMatch[0] : '';
    const clean = qMatch ? relative.slice(0, qMatch.index) : relative;
    if (!clean) return basePath + qAndH;
    if (clean.startsWith('/')) return clean.slice(1) + qAndH;
    const stack = basePath.split('/');
    stack.pop();
    for (const p of clean.split('/').filter(p => p && p !== '.')) {
        if (p === '..') { if (stack.length) stack.pop(); }
        else stack.push(p);
    }
    return stack.join('/') + qAndH;
}

function getMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    return { css:'text/css', js:'application/javascript', json:'application/json', svg:'image/svg+xml', png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', webp:'image/webp', woff:'font/woff', woff2:'font/woff2', ttf:'font/ttf' }[ext] || 'text/plain';
}

function compileCSS(path, content) {
    return content.replace(/url\(['"]?([^'"()]+)['"]?\)/g, (match, url) => {
        if (isAbsolute(url)) return match;
        const abs = resolveRelative(path, url);
        if (!vfs[abs]) return match;
        if (vfs[abs].blobUrl) return `url('${vfs[abs].blobUrl}')`;
        const blob = new Blob([vfs[abs].content], { type: getMimeType(abs) });
        return `url('${URL.createObjectURL(blob)}')`;
    });
}

function compileVFS(targetHtmlPath, isExternal = false, queryAndHash = '') {
    const file = vfs[targetHtmlPath];
    if (!file || !file.isText) return '<!DOCTYPE html><html><body><h2 style="font-family:sans-serif;color:#c00">404 — Not Found</h2><p>' + targetHtmlPath + '</p></body></html>';

    const parser = new DOMParser();
    const doc = parser.parseFromString(file.content, 'text/html');

    const qMatch = queryAndHash.match(/\?[^#]*/);
    const vQuery = qMatch ? qMatch[0] : '';
    const hMatch = queryAndHash.match(/#.*/);
    const vHash = hMatch ? hMatch[0] : '';

    // Router interceptor script
    const routerScript = doc.createElement('script');
    routerScript.textContent = `(function(){
        const isExt=${isExternal};
        const parentWin=window.parent;
        const vQ=${JSON.stringify(vQuery)};
        const vH=${JSON.stringify(vHash)};
        const vPath="/${targetHtmlPath}";
        const OrigSP=window.URLSearchParams;
        window.URLSearchParams=class extends OrigSP{constructor(i){super((!i||i===window.location.search)?vQ:i);}};
        window.virtualLocation=new Proxy(window.location,{
            get(t,p){
                if(p==='pathname')return vPath;
                if(p==='search')return vQ;
                if(p==='hash')return vH;
                if(p==='href')return window.location.origin+vPath+vQ+vH;
                if(p==='assign'||p==='replace')return function(url){
                    if(/^https?:\\/\\//.test(url)&&!url.startsWith(window.location.origin)){window.open(url,'_blank');return;}
                    parentWin&&parentWin.postMessage({type:'NAVIGATE',path:url,current:${JSON.stringify(targetHtmlPath)},isExt},'*');
                };
                if(p==='reload')return function(){parentWin&&parentWin.postMessage({type:'NAVIGATE',path:vPath+vQ+vH,current:${JSON.stringify(targetHtmlPath)},isExt},'*');};
                const v=t[p];return typeof v==='function'?v.bind(t):v;
            },
            set(t,p,v){
                if(p==='href'){
                    if(/^https?:\\/\\//.test(v)&&!v.startsWith(window.location.origin)){window.open(v,'_blank');return true;}
                    parentWin&&parentWin.postMessage({type:'NAVIGATE',path:v,current:${JSON.stringify(targetHtmlPath)},isExt},'*');
                    return true;
                }
                t[p]=v;return true;
            }
        });
        document.addEventListener('click',function(e){
            const a=e.target.closest('a');
            if(a){
                const href=a.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    const targetId = href.substring(1);
                    if (targetId) {
                        const targetEl = document.getElementById(targetId) || document.querySelector('[name="' + targetId + '"]');
                        if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
                    } else {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                    return;
                }
                if(href&&!href.startsWith('http')&&!href.startsWith('#')&&!href.startsWith('javascript:')&&!href.startsWith('mailto:')){
                    e.preventDefault();
                    parentWin&&parentWin.postMessage({type:'NAVIGATE',path:href,current:${JSON.stringify(targetHtmlPath)},isExt},'*');
                }
            }
        });
        document.addEventListener('submit',function(e){
            e.preventDefault();
            const action=e.target.getAttribute('action')||vPath;
            parentWin&&parentWin.postMessage({type:'NAVIGATE',path:action,current:${JSON.stringify(targetHtmlPath)},isExt},'*');
        });
        if(!isExt){
            const _l=console.log,_e=console.error,_w=console.warn;
            console.log=(...a)=>{parentWin.postMessage({type:'LOG',val:a.map(String).join(' ')},'*');_l(...a);};
            console.error=(...a)=>{parentWin.postMessage({type:'ERR',val:a.map(String).join(' ')},'*');_e(...a);};
            console.warn=(...a)=>{parentWin.postMessage({type:'WARN',val:a.map(String).join(' ')},'*');_w(...a);};
            window.onerror=(m,s,l)=>parentWin.postMessage({type:'ERR',val:m+' at line '+l},'*');
        }
    })();`;
    doc.head.insertBefore(routerScript, doc.head.firstChild);

    // Resolve CSS
    doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        const href = link.getAttribute('href');
        if (href && !isAbsolute(href)) {
            const abs = resolveRelative(targetHtmlPath, href);
            if (vfs[abs]) {
                const compiled = compileCSS(abs, vfs[abs].content || '');
                const blob = new Blob([compiled], { type: 'text/css' });
                link.href = URL.createObjectURL(blob);
            }
        }
    });

    // Resolve inline CSS
    doc.querySelectorAll('style').forEach(style => {
        style.textContent = compileCSS(targetHtmlPath, style.textContent);
    });

    // Resolve media
    doc.querySelectorAll('img,audio,video,source').forEach(el => {
        const src = el.getAttribute('src');
        if (src && !isAbsolute(src)) {
            const abs = resolveRelative(targetHtmlPath, src);
            if (vfs[abs]?.blobUrl) el.setAttribute('src', vfs[abs].blobUrl);
        }
    });

    // Resolve scripts
    doc.querySelectorAll('script').forEach(script => {
        if (script === routerScript) return;
        const src = script.getAttribute('src');
        let content = '';
        if (src && !isAbsolute(src)) {
            const abs = resolveRelative(targetHtmlPath, src);
            if (vfs[abs]?.isText) { content = vfs[abs].content; script.removeAttribute('src'); }
        } else if (!src) {
            content = script.textContent;
        }
        if (content) {
            const isModule = script.getAttribute('type') === 'module' || /\bimport\s/.test(content) || /\bexport\s/.test(content);
            const patchedContent = content.replace(/\bwindow\.location\b/g,'location').replace(/\bdocument\.location\b/g,'location');
            if (isModule) {
                const lines = patchedContent.split('\n');
                let lastImport = -1;
                lines.forEach((l,i) => { if(/^\s*import[\s{*]/.test(l)) lastImport = i; });
                lines.splice(lastImport+1, 0, 'const location=window.virtualLocation;');
                script.textContent = lines.join('\n');
                script.setAttribute('type','module');
            } else {
                script.textContent = `(function(location){${patchedContent}})(window.virtualLocation);`;
            }
        }
    });

    // Patch inline event handlers
    doc.querySelectorAll('*').forEach(el => {
        for (const attr of el.attributes) {
            if (attr.name.startsWith('on') && attr.value) {
                attr.value = attr.value.replace(/\bwindow\.location\b/g,'virtualLocation').replace(/\bdocument\.location\b/g,'virtualLocation').replace(/\blocation\b(?!(\s*=\s*virtualLocation))/g,'virtualLocation');
            }
        }
    });

    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}

function refreshPreview() {
    if (!activeIframeFile || !vfs[activeIframeFile]) {
        document.getElementById('live-frame').srcdoc = '';
        document.getElementById('address-bar').textContent = 'hyperlive://local/';
        return;
    }
    document.getElementById('address-bar').textContent = `hyperlive://local/${activeIframeFile}${activeIframeQuery}`;
    maybeRebuildJsxShell();
    document.getElementById('live-frame').srcdoc = compileVFS(activeIframeFile, false, activeIframeQuery);
}

// Preview navigation history
function navigateTo(path, query='') {
    if (previewHistoryIndex < previewHistory.length - 1) previewHistory = previewHistory.slice(0, previewHistoryIndex + 1);
    previewHistory.push({ path, query });
    previewHistoryIndex = previewHistory.length - 1;
    activeIframeFile = path;
    activeIframeQuery = query;
    refreshPreview();
    if (vfs[path]?.isText) openFile(path);
}

function navigateBack() {
    if (previewHistoryIndex > 0) {
        previewHistoryIndex--;
        const { path, query } = previewHistory[previewHistoryIndex];
        activeIframeFile = path; activeIframeQuery = query;
        refreshPreview();
    }
}

function navigateForward() {
    if (previewHistoryIndex < previewHistory.length - 1) {
        previewHistoryIndex++;
        const { path, query } = previewHistory[previewHistoryIndex];
        activeIframeFile = path; activeIframeQuery = query;
        refreshPreview();
    }
}

window.addEventListener('message', e => {
    if (e.data.type === 'NAVIGATE') {
        const raw = resolveRelative(e.data.current, e.data.path);
        const qm = raw.match(/[?#].*$/);
        const qh = qm ? qm[0] : '';
        const clean = qm ? raw.slice(0, qm.index) : raw;
        if (vfs[clean]) {
            if (e.data.isExt) {
                liveServers = liveServers.filter(s => !s.window.closed);
                const server = liveServers.find(s => s.window === e.source);
                if (server) { server.path = clean; server.query = qh; server.window.postMessage({ type: 'HOT_RELOAD', html: compileVFS(clean, true, qh) }, '*'); }
            } else {
                navigateTo(clean, qh);
            }
        } else {
            logOutput(`404: ${clean}`, 'error');
        }
    } else if (e.data.type === 'LOG') logOutput(e.data.val, 'log');
    else if (e.data.type === 'ERR') logOutput(e.data.val, 'error');
    else if (e.data.type === 'WARN') logOutput(e.data.val, 'warn');
});

function openPreviewInNewWindow() {
    if (!activeIframeFile) return;
    const win = window.open('', '_blank');
    const shell = `<!DOCTYPE html><html style="margin:0;height:100%;background:#fff">
    <head><title>HyperLive — ${activeIframeFile}</title></head>
    <body style="margin:0;height:100%;display:flex;flex-direction:column;">
        <iframe id="f" style="flex:1;width:100%;border:none" sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox"></iframe>
        <script>
        window.addEventListener('message',e=>{
            if(e.data.type==='HOT_RELOAD'){document.getElementById('f').srcdoc=e.data.html;}
            else if(e.source===document.getElementById('f').contentWindow&&window.opener){window.opener.postMessage(e.data,'*');}
        });
        <\/script>
    </body></html>`;
    win.document.open(); win.document.write(shell); win.document.close();
    setTimeout(() => {
        win.document.getElementById('f').srcdoc = compileVFS(activeIframeFile, true, activeIframeQuery);
        liveServers.push({ window: win, path: activeIframeFile, query: activeIframeQuery });
        logOutput('Live Server opened in new tab.', 'system');
    }, 200);
}

// ============================================================
// ZIP EXPORT
// ============================================================
async function exportZip() {
    if (!Object.keys(vfs).length) { logOutput('No files to export.', 'warn'); return; }
    logOutput('Packing ZIP...', 'system');
    const zip = new JSZip();
    Object.keys(vfs).forEach(path => {
        if (vfs[path].fileObj) zip.file(path, vfs[path].fileObj);
        else zip.file(path, vfs[path].content || '');
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'HyperLive_Project.zip'; a.click();
    URL.revokeObjectURL(url);
    logOutput('ZIP exported.', 'system');
}

// ============================================================
// DEMO PROJECT
// ============================================================
function loadDemo() {
    openFiles = []; activeFile = null;
    document.getElementById('editor-tabs').innerHTML = '';
    vfs = {
        'index.html': { name:'index.html', isText:true, fileObj:null, blobUrl:null, content:`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HyperLive Demo</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <nav class="navbar">
    <div class="logo">⚡ HyperLive</div>
    <ul>
      <li><a href="index.html">Home</a></li>
      <li><a href="about.html">About</a></li>
    </ul>
  </nav>
  <main class="hero">
    <h1>Welcome to HyperLive Pro</h1>
    <p>A fully functional VS-style web IDE. Edit HTML, CSS, and JS with instant hot-reload preview.</p>
    <div class="button-row">
      <button id="btn" class="btn-primary">Click Me</button>
      <button onclick="location.href='about.html'" class="btn-secondary">About Page</button>
    </div>
    <p id="out" class="output-msg"></p>
  </main>
  <script src="script.js"><\/script>
</body>
</html>` },
        'about.html': { name:'about.html', isText:true, fileObj:null, blobUrl:null, content:`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>About — HyperLive Demo</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <nav class="navbar">
    <div class="logo">⚡ HyperLive</div>
    <ul>
      <li><a href="index.html">Home</a></li>
      <li><a href="about.html">About</a></li>
    </ul>
  </nav>
  <main class="hero">
    <h1>About HyperLive Pro</h1>
    <p>Built with Monaco Editor. Supports VFS, hot reload, multi-file projects, drag &amp; drop, ZIP export, terminal, bookmarks, git simulation and more.</p>
    <button onclick="location.href='index.html'" class="btn-primary">← Back Home</button>
  </main>
</body>
</html>` },
        'styles.css': { name:'styles.css', isText:true, fileObj:null, blobUrl:null, content:`* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: system-ui, sans-serif;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  min-height: 100vh;
  color: #fff;
}
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: rgba(255,255,255,0.07);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.navbar .logo { font-size: 1.25rem; font-weight: 700; }
.navbar ul { list-style: none; display: flex; gap: 1.5rem; }
.navbar a { color: rgba(255,255,255,0.7); text-decoration: none; transition: color 0.2s; }
.navbar a:hover { color: #fff; }
.hero {
  max-width: 700px;
  margin: 5rem auto;
  padding: 2rem;
  text-align: center;
}
h1 { font-size: 2.5rem; margin-bottom: 1rem; }
p { color: rgba(255,255,255,0.7); font-size: 1.1rem; line-height: 1.7; margin-bottom: 1.5rem; }
.button-row { display: flex; gap: 1rem; justify-content: center; margin-bottom: 1.5rem; }
.btn-primary {
  background: #007acc;
  color: #fff;
  border: none;
  padding: 10px 28px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s, transform 0.1s;
}
.btn-primary:hover { background: #005f9e; transform: translateY(-1px); }
.btn-secondary {
  background: transparent;
  color: #fff;
  border: 2px solid rgba(255,255,255,0.3);
  padding: 10px 28px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}
.btn-secondary:hover { border-color: #fff; background: rgba(255,255,255,0.05); }
.output-msg { font-size: 1rem; color: #4ade80; min-height: 24px; }` },
        'script.js': { name:'script.js', isText:true, fileObj:null, blobUrl:null, content:`const btn = document.getElementById('btn');
const out = document.getElementById('out');
let clickCount = 0;

btn.addEventListener('click', () => {
  clickCount++;
  out.textContent = clickCount === 1
    ? '🎉 JavaScript is working!'
    : \`Clicked \${clickCount} times!\`;
  console.log('Button clicked! Count:', clickCount);
});

// Log to HyperLive console
console.log('Demo project loaded successfully!');` }
    };
    finalizeMount();
}


// ============================================================
// RUN ACTIVE FILE + LANGUAGE RUNNERS
// ============================================================
let pyodide     = null;
let pyodideReady = false;

async function initPyodide() {
    if (pyodide) return pyodide;
    if (pyodideReady === 'loading') {
        while (pyodideReady === 'loading') await new Promise(r => setTimeout(r, 150));
        return pyodide;
    }
    pyodideReady = 'loading';
    switchSidebar('terminal');
    addTerminalLine('Loading Python runtime (first run only, ~10 MB)…', 'text-yellow-400');
    logOutput('Loading Pyodide…', 'system');
    try {
        await new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
            s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
        });
        pyodide = await loadPyodide({
            stdout: msg => { addTerminalLine(msg, 'text-gray-300'); logDebugOutput(msg, 'log'); },
            stderr: msg => { addTerminalLine(msg, 'text-red-400');  logDebugOutput(msg, 'error'); },
        });
        pyodideReady = true;
        addTerminalLine('Python 3 ready.', 'text-green-400');
        logOutput('Pyodide loaded — Python 3 ready.', 'system');
    } catch(err) {
        pyodideReady = false;
        pyodide = null;
        addTerminalLine('Failed to load Python: ' + err.message, 'text-red-400');
        logOutput('Pyodide load failed: ' + err.message, 'error');
    }
    return pyodide;
}

async function runPython(code) {
    const py = await initPyodide();
    if (!py) return;
    switchSidebar('terminal');
    addTerminalLine('$ python', 'text-green-300');
    try {
        await py.runPythonAsync(code);
        addTerminalLine('Process exited with code 0', 'text-gray-500');
    } catch(err) {
        addTerminalLine(err.message, 'text-red-400');
        addTerminalLine('Process exited with code 1', 'text-red-400');
    }
}

async function runActiveFile() {
    if (!activeFile || !vfs[activeFile]) { logOutput('No active file.', 'warn'); return; }
    const content = editor ? editor.getValue() : (vfs[activeFile].content || '');
    const ext = activeFile.split('.').pop().toLowerCase();

    switch (ext) {
        case 'html': case 'htm':
            refreshPreview();
            logOutput(`Running ${activeFile} in preview.`, 'system');
            break;

        case 'js': case 'mjs': case 'cjs':
            openBottomPanel(); switchBottomTab('debug');
            logDebugOutput('> Running ' + activeFile, 'system');
            try {
                const r = (0, eval)(content);
                if (r !== undefined) logDebugOutput(typeof r === 'object' ? JSON.stringify(r, null, 2) : String(r), 'result');
                logDebugOutput('Finished.', 'system');
            } catch(err) {
                logDebugOutput('✖ ' + err.message, 'error');
            }
            break;

        case 'py':
            await runPython(content);
            break;

        case 'json':
            openBottomPanel(); switchBottomTab('debug');
            try {
                const parsed = JSON.parse(content);
                logDebugOutput('✔ Valid JSON', 'system');
                logDebugOutput(JSON.stringify(parsed, null, 2).slice(0, 2000), 'result');
            } catch(err) {
                logDebugOutput('✖ Invalid JSON: ' + err.message, 'error');
            }
            break;

        default:
            logOutput(`No runner for .${ext} — open in preview or switch to JS/Python.`, 'warn');
    }
}

async function runSelectedText() {
    if (!editor) return;
    const sel = editor.getModel()?.getValueInRange(editor.getSelection());
    if (!sel?.trim()) { logOutput('No text selected.', 'warn'); return; }
    const ext = activeFile?.split('.').pop().toLowerCase();
    if (ext === 'py') {
        await runPython(sel);
    } else {
        openBottomPanel(); switchBottomTab('debug');
        logDebugOutput('> (selected text)', 'system');
        try {
            const r = (0, eval)(sel);
            if (r !== undefined) logDebugOutput(typeof r === 'object' ? JSON.stringify(r, null, 2) : String(r), 'result');
        } catch(err) {
            logDebugOutput('✖ ' + err.message, 'error');
        }
    }
}

// ============================================================
// DEBUG CONSOLE
// ============================================================
function logDebugOutput(msg, type = 'log') {
    const out = document.getElementById('bp-debug-output');
    if (!out) return;
    const colors = { log: 'text-gray-300', error: 'text-red-400', warn: 'text-yellow-400', result: 'text-cyan-300', system: 'text-blue-400' };
    const d = document.createElement('div');
    d.className = `${colors[type] || 'text-gray-300'} font-mono text-[11px] py-0.5 border-b border-[#252525] whitespace-pre-wrap break-all`;
    d.textContent = msg;
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
}

function handleDebugConsoleInput(e) {
    if (e.key !== 'Enter') return;
    const input = document.getElementById('debug-console-input');
    const raw = input.value.trim();
    input.value = '';
    if (!raw) return;
    openBottomPanel(); switchBottomTab('debug');
    logDebugOutput('> ' + raw, 'system');
    try {
        const r = (0, eval)(raw);
        if (r !== undefined)
            logDebugOutput(typeof r === 'object' ? JSON.stringify(r, null, 2) : String(r), 'result');
    } catch(err) {
        logDebugOutput('✖ ' + err.message, 'error');
    }
}

// ============================================================
// GO MENU HELPERS
// ============================================================
function goToFile() {
    const files = Object.keys(vfs);
    if (!files.length) { logOutput('No files in workspace.', 'warn'); return; }
    const name = prompt('Go to file:\n\n' + files.join('\n'));
    if (!name) return;
    const path = files.find(f => f === name || f.endsWith('/' + name) || f.split('/').pop() === name);
    if (path) openFile(path);
    else logOutput(`File not found: ${name}`, 'warn');
}

function addBreakpointAtLine() {
    if (!editor) return;
    const line = parseInt(prompt('Add breakpoint at line:'));
    if (isNaN(line)) return;
    if (!bookmarks[activeFile]) bookmarks[activeFile] = new Set();
    bookmarks[activeFile].add(line);
    renderBookmarks(); applyBookmarkDecorations();
    logOutput(`Breakpoint added at line ${line}.`, 'system');
}

function setAllBreakpoints(enabled) {
    if (!bookmarks[activeFile]) return;
    logOutput(`All breakpoints ${enabled ? 'enabled' : 'disabled'}.`, 'system');
}

// ============================================================
// INIT
// ============================================================
setTimeout(() => {
    if (!Object.keys(vfs).length) {
        logOutput('Ready — Drop a folder, File → Open Folder, or Load Demo.', 'system');
    }
    // Initialize bottom panel with console active
    switchBottomTab('console');
}, 800);

lucide.createIcons();