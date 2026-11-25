# AI Agent Tool Calling Guide

This guide describes how the AI agent in `SupperAi/index.html` can invoke the browser-based tools and receive results.

## General Invocation Pattern

1. Load the tool page in a hidden iframe: `iframe.src = "/tools/<name>.html"` (or `/tools2/<name>.html`).
2. Wait for `iframe.onload`.
3. Access `const doc = iframe.contentDocument; const win = iframe.contentWindow;`.
4. Set inputs: find input elements by id/name and set `.value` (or files via `.files`).
5. Trigger operation: call the mapped function directly (`win.<functionName>(...)`) or click the button (`button.click()`).
6. Read result: inspect output DOM nodes, canvas, download links, or global variables; for file outputs use Blob/URL.createObjectURL.
7. For tools that use localStorage/page state, initialize required state before invoking.

## Tool Pages and Triggers

### tools2\about.html
- Triggers:
  - `What is this page about?` → calls: `function, querySelector, getAttribute, setAttribute, querySelector`; onclick: `(function(b){var p=b.parentElement,c=p.querySelector('.envizion-seo-collapse-body');var open=b.getAttribute('aria-expanded')==='true';c.style.display=open?'none':'block';b.setAttribute('aria-expanded',open?'false':'true');b.querySelector('.envizion-seo-toggle-label').textContent=open?'What is this page about?':'Hide page info';})(this)`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools2\animator_studio.html
- Triggers:
  - `unnamed` → calls: `resetWorkspace`; onclick: `resetWorkspace()`
  - `Quick Save` → calls: `quickSaveWorkspace`; onclick: `quickSaveWorkspace()`
  - `Quick Load` → calls: `quickLoadWorkspace`; onclick: `quickLoadWorkspace()`
  - `Export` → calls: `exportWorkspaceFile`; onclick: `exportWorkspaceFile()`
  - `Import` → calls: `getElementById, click`; onclick: `document.getElementById('import-workspace-input').click()`
  - `Save` → calls: `saveWoodburyFile`; onclick: `saveWoodburyFile()`
  - `btn-reset-pos` → calls: `resetCharacterPos`; onclick: `resetCharacterPos()`
  - `Upload Initial FBX(s)` → calls: `getElementById, click`; onclick: `document.getElementById('upload-files').click()`
  - `Add More Animation File(s)` → calls: `getElementById, click`; onclick: `document.getElementById('upload-files').click()`
  - `Clear` → calls: `clearSelection`; onclick: `clearSelection()`
  - `Apply` → calls: `applyBulkKey`; onclick: `applyBulkKey()`
  - `btn-tab-assets` → calls: `switchTab`; onclick: `switchTab('tab-assets')`
  - `btn-tab-preload` → calls: `switchTab`; onclick: `switchTab('tab-preload')`
  - `btn-tab-builder` → calls: `switchTab`; onclick: `switchTab('tab-builder')`
  - `btn-tab-controller` → calls: `switchTab`; onclick: `switchTab('tab-controller')`
  - `btn-tab-merge` → calls: `switchTab`; onclick: `switchTab('tab-merge')`
  - `What is this page about?` → calls: `function, querySelector, getAttribute, setAttribute, querySelector`; onclick: `(function(b){var p=b.parentElement,c=p.querySelector('.envizion-seo-collapse-body');var open=b.getAttribute('aria-expanded')==='true';c.style.display=open?'none':'block';b.setAttribute('aria-expanded',open?'false':'true');b.querySelector('.envizion-seo-toggle-label').textContent=open?'What is this page about?':'Hide page info';})(this)`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools2\bulk_webp_converter.html
- Triggers:
  - `What is this page about?` → calls: `function, querySelector, getAttribute, setAttribute, querySelector`; onclick: `(function(b){var p=b.parentElement,c=p.querySelector('.envizion-seo-collapse-body');var open=b.getAttribute('aria-expanded')==='true';c.style.display=open?'none':'block';b.setAttribute('aria-expanded',open?'false':'true');b.querySelector('.envizion-seo-toggle-label').textContent=open?'What is this page about?':'Hide page info';})(this)`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools2\contact.html
- Triggers:
  - `What is this page about?` → calls: `function, querySelector, getAttribute, setAttribute, querySelector`; onclick: `(function(b){var p=b.parentElement,c=p.querySelector('.envizion-seo-collapse-body');var open=b.getAttribute('aria-expanded')==='true';c.style.display=open?'none':'block';b.setAttribute('aria-expanded',open?'false':'true');b.querySelector('.envizion-seo-toggle-label').textContent=open?'What is this page about?':'Hide page info';})(this)`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools2\envizion_editor.html
- Triggers:
  - `? Close` → calls: `closeAssetPreview`; onclick: `closeAssetPreview()`
  - `? Fullscreen` → calls: `goAssetPreviewFullscreen`; onclick: `goAssetPreviewFullscreen()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `unnamed` → calls: `dismissAlert`; onclick: `dismissAlert()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools2\envizion_playground.html
- Triggers:
  - `My Workspace` → calls: `toggleWorkspacePanel`; onclick: `toggleWorkspacePanel()`
  - `Upgrade` → calls: `triggerUpgrade`; onclick: `triggerUpgrade()`
  - `unnamed` → calls: `toggleSettingsModal`; onclick: `toggleSettingsModal()`
  - `Share` → calls: `triggerShare`; onclick: `triggerShare()`
  - `unnamed` → calls: `adjustZoom`; onclick: `adjustZoom(-0.1)`
  - `unnamed` → calls: `adjustZoom`; onclick: `adjustZoom(0.1)`
  - `tool-select` → calls: `setTool`; onclick: `setTool('select')`
  - `tool-image` → calls: `triggerFileInput`; onclick: `triggerFileInput('image')`
  - `tool-video` → calls: `triggerFileInput`; onclick: `triggerFileInput('video')`
  - `tool-audio` → calls: `triggerAudioUpload`; onclick: `triggerAudioUpload()`
  - `tool-frame` → calls: `toggleActiveFrameRegion`; onclick: `toggleActiveFrameRegion()`
  - `tool-draw` → calls: `setTool`; onclick: `setTool('draw')`
  - `tool-text` → calls: `addTextCard`; onclick: `addTextCard()`
  - `tool-sticky` → calls: `addStickyCard`; onclick: `addStickyCard()`
  - `unnamed` → calls: `setSelectedColor`; onclick: `setSelectedColor('#10b981')`
  - `unnamed` → calls: `setSelectedColor`; onclick: `setSelectedColor('#f59e0b')`
  - `unnamed` → calls: `setSelectedColor`; onclick: `setSelectedColor('#f43f5e')`
  - `unnamed` → calls: `setSelectedColor`; onclick: `setSelectedColor('#0ea5e9')`
  - `unnamed` → calls: `setSelectedColor`; onclick: `setSelectedColor('#6366f1')`
  - `unnamed` → calls: `addTableCard`; onclick: `addTableCard()`
  - `unnamed` → calls: `triggerShowExtensions`; onclick: `triggerShowExtensions()`
  - `unnamed` → calls: `downloadSelectedAsZip`; onclick: `downloadSelectedAsZip()`
  - `unnamed` → calls: `groupSelected`; onclick: `groupSelected()`
  - `unnamed` → calls: `toggleFullscreen`; onclick: `toggleFullscreen()`
  - `unnamed` → calls: `getElementById, click`; onclick: `document.getElementById('any-file-input').click()`
  - `unnamed` → calls: `toggleChatPanel`; onclick: `toggleChatPanel()`
  - `unnamed` → calls: `triggerSearchBoard`; onclick: `triggerSearchBoard()`
  - `unnamed` → calls: `minimizeChatPanel`; onclick: `minimizeChatPanel()`
  - `unnamed` → calls: `toggleChatPanel`; onclick: `toggleChatPanel()`
  - `unnamed` → calls: `triggerVoiceInput`; onclick: `triggerVoiceInput()`
  - `Send to Editor` → calls: `sendSelectedToEditor`; onclick: `sendSelectedToEditor()`
  - `Deselect` → calls: `batchClearSelection`; onclick: `batchClearSelection()`
  - `unnamed` → calls: `toggleSettingsModal`; onclick: `toggleSettingsModal()`
  - `Apply Changes` → calls: `toggleSettingsModal`; onclick: `toggleSettingsModal()`
  - `&times;` → calls: `toggleWorkspacePanel`; onclick: `toggleWorkspacePanel()`
  - `Capture this page` → calls: `captureCurrentWorkspacePage`; onclick: `captureCurrentWorkspacePage()`
  - `Export list` → calls: `exportWorkspacePages`; onclick: `exportWorkspacePages()`
  - `Import list` → calls: `getElementById, click`; onclick: `document.getElementById('workspace-import-input').click()`
  - `Add URLs` → calls: `addWorkspaceBulkUrls`; onclick: `addWorkspaceBulkUrls()`
  - `workspace-tab-saved` → calls: `setWorkspaceTab`; onclick: `setWorkspaceTab('saved')`
  - `workspace-tab-directory` → calls: `setWorkspaceTab`; onclick: `setWorkspaceTab('directory')`
  - `✕ Close` → calls: `closePreview`; onclick: `closePreview()`
  - `preview-fs-btn` → calls: `goNativeFullscreen`; onclick: `goNativeFullscreen()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Untitled Project` → calls: `toggleRenameDropdown`; onclick: `toggleRenameDropdown()`
  - `workspace-panel` → calls: `if, toggleWorkspacePanel`; onclick: `if(event.target === this) toggleWorkspacePanel()`

### tools2\envizion_pro_studio_editor.html
- Triggers:
  - `unnamed` → calls: `dismissAlert`; onclick: `dismissAlert()`
  - `What is this page about?` → calls: `function, querySelector, getAttribute, setAttribute, querySelector`; onclick: `(function(b){var p=b.parentElement,c=p.querySelector('.envizion-seo-collapse-body');var open=b.getAttribute('aria-expanded')==='true';c.style.display=open?'none':'block';b.setAttribute('aria-expanded',open?'false':'true');b.querySelector('.envizion-seo-toggle-label').textContent=open?'What is this page about?':'Hide page info';})(this)`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools2\envizion_resources.html
- Triggers:
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`

### tools2\fbx_to_glb_converter.html
- Triggers:
  - `What is this page about?` → calls: `function, querySelector, getAttribute, setAttribute, querySelector`; onclick: `(function(b){var p=b.parentElement,c=p.querySelector('.envizion-seo-collapse-body');var open=b.getAttribute('aria-expanded')==='true';c.style.display=open?'none':'block';b.setAttribute('aria-expanded',open?'false':'true');b.querySelector('.envizion-seo-toggle-label').textContent=open?'What is this page about?':'Hide page info';})(this)`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools2\image_resizer.html
- Triggers:
  - `What is this page about?` → calls: `function, querySelector, getAttribute, setAttribute, querySelector`; onclick: `(function(b){var p=b.parentElement,c=p.querySelector('.envizion-seo-collapse-body');var open=b.getAttribute('aria-expanded')==='true';c.style.display=open?'none':'block';b.setAttribute('aria-expanded',open?'false':'true');b.querySelector('.envizion-seo-toggle-label').textContent=open?'What is this page about?':'Hide page info';})(this)`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools2\index.html
- Triggers:
  - `What is this page about?` → calls: `function, querySelector, getAttribute, setAttribute, querySelector`; onclick: `(function(b){var p=b.parentElement,c=p.querySelector('.envizion-seo-collapse-body');var open=b.getAttribute('aria-expanded')==='true';c.style.display=open?'none':'block';b.setAttribute('aria-expanded',open?'false':'true');b.querySelector('.envizion-seo-toggle-label').textContent=open?'What is this page about?':'Hide page info';})(this)`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools2\local_glb_viewer.html
- Triggers:
  - `Dismiss` → calls: `getElementById, replace`; onclick: `document.getElementById('error-modal').classList.replace('flex', 'hidden')`
  - `What is this page about?` → calls: `function, querySelector, getAttribute, setAttribute, querySelector`; onclick: `(function(b){var p=b.parentElement,c=p.querySelector('.envizion-seo-collapse-body');var open=b.getAttribute('aria-expanded')==='true';c.style.display=open?'none':'block';b.setAttribute('aria-expanded',open?'false':'true');b.querySelector('.envizion-seo-toggle-label').textContent=open?'What is this page about?':'Hide page info';})(this)`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools2\local_video_image_mask_merger.html
- Triggers:
  - `unnamed` → calls: `dismissAlert`; onclick: `dismissAlert()`
  - `What is this page about?` → calls: `function, querySelector, getAttribute, setAttribute, querySelector`; onclick: `(function(b){var p=b.parentElement,c=p.querySelector('.envizion-seo-collapse-body');var open=b.getAttribute('aria-expanded')==='true';c.style.display=open?'none':'block';b.setAttribute('aria-expanded',open?'false':'true');b.querySelector('.envizion-seo-toggle-label').textContent=open?'What is this page about?':'Hide page info';})(this)`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools2\local_vocal_remover.html
- Triggers:
  - `Browse Files` → calls: `getElementById, click`; onclick: `document.getElementById('file-input').click()`
  - `Process Another` → calls: `resetApp`; onclick: `resetApp()`
  - `Dismiss` → calls: `closeError`; onclick: `closeError()`
  - `What is this page about?` → calls: `function, querySelector, getAttribute, setAttribute, querySelector`; onclick: `(function(b){var p=b.parentElement,c=p.querySelector('.envizion-seo-collapse-body');var open=b.getAttribute('aria-expanded')==='true';c.style.display=open?'none':'block';b.setAttribute('aria-expanded',open?'false':'true');b.querySelector('.envizion-seo-toggle-label').textContent=open?'What is this page about?':'Hide page info';})(this)`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools2\luma_dashboard_clone.html
- Triggers:
  - `primary-action-btn` → calls: `openModal`; onclick: `openModal()`
  - `Open Local FileAny file from your device` → calls: `openLocalFilePicker`; onclick: `openLocalFilePicker()`
  - `Open URLDrive, Docs, Slides, any link` → calls: `openURLModal`; onclick: `openURLModal()`
  - `New BoardStart a fresh project` → calls: `openModal`; onclick: `openModal()`
  - `create-board-btn` → calls: `openModal`; onclick: `openModal()`
  - `Save` → calls: `saveAppsScriptUrl`; onclick: `saveAppsScriptUrl()`
  - `Test` → calls: `sendTestNotification`; onclick: `sendTestNotification()`
  - `Clear all` → calls: `clearNotifications`; onclick: `clearNotifications()`
  - `unnamed` → calls: `closeModal`; onclick: `closeModal()`
  - `type-playground` → calls: `setBoardType`; onclick: `setBoardType('playground')`
  - `Cancel` → calls: `closeModal`; onclick: `closeModal()`
  - `Create Board` → calls: `createBoardAndOpen`; onclick: `createBoardAndOpen()`
  - `unnamed` → calls: `closeURLModal`; onclick: `closeURLModal()`
  - `Cancel` → calls: `closeURLModal`; onclick: `closeURLModal()`
  - `Open in Playground` → calls: `openURLInPlayground`; onclick: `openURLInPlayground()`
  - `Open Local File` → calls: `openLocalFilePicker`; onclick: `openLocalFilePicker()`
  - `Open URL / Drive Link
                            Preview Google Docs, Slides, S` → calls: `openURLModal`; onclick: `openURLModal()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`
  - `Recents` → calls: `showPage`; onclick: `showPage('recents');return false;`
  - `Starred` → calls: `showPage`; onclick: `showPage('starred');return false;`
  - `Notifications
                    0` → calls: `showPage`; onclick: `showPage('notifications');return false;`
  - `nav-boards` → calls: `showPage`; onclick: `showPage('boards');return false;`
  - `nav-discover` → calls: `showPage`; onclick: `showPage('discover');return false;`
  - `Extensions` → calls: `showPage`; onclick: `showPage('extensions');return false;`
  - `Usage` → calls: `showPage`; onclick: `showPage('usage');return false;`

### tools2\main...3d_model_viewer.html
- Triggers:
  - `What is this page about?` → calls: `function, querySelector, getAttribute, setAttribute, querySelector`; onclick: `(function(b){var p=b.parentElement,c=p.querySelector('.envizion-seo-collapse-body');var open=b.getAttribute('aria-expanded')==='true';c.style.display=open?'none':'block';b.setAttribute('aria-expanded',open?'false':'true');b.querySelector('.envizion-seo-toggle-label').textContent=open?'What is this page about?':'Hide page info';})(this)`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools2\mp3_editor_mp4_converter.html
- Triggers:
  - `50 Visualizer Forms` → calls: `switchToolTab`; onclick: `switchToolTab('tab-viz')`
  - `Audio DSP &amp; FX Rack` → calls: `switchToolTab`; onclick: `switchToolTab('tab-audio')`
  - `Canvas &amp; Background` → calls: `switchToolTab`; onclick: `switchToolTab('tab-bg')`
  - `Text &amp; Typography` → calls: `switchToolTab`; onclick: `switchToolTab('tab-text')`
  - `Format &amp; Export` → calls: `switchToolTab`; onclick: `switchToolTab('tab-export')`
  - `unnamed` → calls: `hideToast`; onclick: `hideToast()`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`

### tools2\pdf_merger.html
- Triggers:
  - `What is this page about?` → calls: `function, querySelector, getAttribute, setAttribute, querySelector`; onclick: `(function(b){var p=b.parentElement,c=p.querySelector('.envizion-seo-collapse-body');var open=b.getAttribute('aria-expanded')==='true';c.style.display=open?'none':'block';b.setAttribute('aria-expanded',open?'false':'true');b.querySelector('.envizion-seo-toggle-label').textContent=open?'What is this page about?':'Hide page info';})(this)`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools2\privacy.html
- Triggers:
  - `What is this page about?` → calls: `function, querySelector, getAttribute, setAttribute, querySelector`; onclick: `(function(b){var p=b.parentElement,c=p.querySelector('.envizion-seo-collapse-body');var open=b.getAttribute('aria-expanded')==='true';c.style.display=open?'none':'block';b.setAttribute('aria-expanded',open?'false':'true');b.querySelector('.envizion-seo-toggle-label').textContent=open?'What is this page about?':'Hide page info';})(this)`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools2\secure_converter.html
- Triggers:
  - `What is this page about?` → calls: `function, querySelector, getAttribute, setAttribute, querySelector`; onclick: `(function(b){var p=b.parentElement,c=p.querySelector('.envizion-seo-collapse-body');var open=b.getAttribute('aria-expanded')==='true';c.style.display=open?'none':'block';b.setAttribute('aria-expanded',open?'false':'true');b.querySelector('.envizion-seo-toggle-label').textContent=open?'What is this page about?':'Hide page info';})(this)`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools2\secure_pdf_compressor.html
- Triggers:
  - `What is this page about?` → calls: `function, querySelector, getAttribute, setAttribute, querySelector`; onclick: `(function(b){var p=b.parentElement,c=p.querySelector('.envizion-seo-collapse-body');var open=b.getAttribute('aria-expanded')==='true';c.style.display=open?'none':'block';b.setAttribute('aria-expanded',open?'false':'true');b.querySelector('.envizion-seo-toggle-label').textContent=open?'What is this page about?':'Hide page info';})(this)`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools2\superfast_video_compressor.html
- Triggers:
  - `What is this page about?` → calls: `function, querySelector, getAttribute, setAttribute, querySelector`; onclick: `(function(b){var p=b.parentElement,c=p.querySelector('.envizion-seo-collapse-body');var open=b.getAttribute('aria-expanded')==='true';c.style.display=open?'none':'block';b.setAttribute('aria-expanded',open?'false':'true');b.querySelector('.envizion-seo-toggle-label').textContent=open?'What is this page about?':'Hide page info';})(this)`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools2\visual_level_builder.html
- Triggers:
  - `What is this page about?` → calls: `function, querySelector, getAttribute, setAttribute, querySelector`; onclick: `(function(b){var p=b.parentElement,c=p.querySelector('.envizion-seo-collapse-body');var open=b.getAttribute('aria-expanded')==='true';c.style.display=open?'none':'block';b.setAttribute('aria-expanded',open?'false':'true');b.querySelector('.envizion-seo-toggle-label').textContent=open?'What is this page about?':'Hide page info';})(this)`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools\Image-Text-Extractor.html
- Triggers:
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`

### tools\InstantDictionary.html
- Triggers:
  - `unnamed` → calls: `playAudio`; onclick: `playAudio('uk')`
  - `unnamed` → calls: `playAudio`; onclick: `playAudio('us')`
  - `unnamed` → calls: `playAudio`; onclick: `playAudio('general')`
  - `unnamed` → calls: `playTranslatedAudio`; onclick: `playTranslatedAudio()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`

### tools\Local-Anymediafilesizeconverter.html
- Triggers:
  - `Back to Converter` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`

### tools\advanced-video-watermarker.html
- Triggers:
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools\background-remover-home.html
- Triggers:
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools\background-remover.html
- Triggers:
  - `mode-auto` → calls: `setRemovalMode`; onclick: `setRemovalMode('auto')`
  - `mode-custom` → calls: `setRemovalMode`; onclick: `setRemovalMode('custom')`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`

### tools\envizionomniconvertpro.html
- Triggers:
  - `master-flip-btn` → calls: `flipConversion`; onclick: `flipConversion()`
  - `Clear logs` → calls: `clearConsoleLogs`; onclick: `clearConsoleLogs()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools\htmlviewer.html
- Triggers:
  - `mobile-new-file-btn` → calls: `createNewFile`; onclick: `createNewFile()`
  - `what-is-btn` → calls: `toggleExplanation`; onclick: `toggleExplanation()`
  - `unnamed` → calls: `createNewFile`; onclick: `createNewFile()`
  - `unnamed` → calls: `createNewFolder`; onclick: `createNewFolder()`
  - `unnamed` → calls: `collapseAllFolders`; onclick: `collapseAllFolders()`
  - `unnamed` → calls: `closeSidebar`; onclick: `closeSidebar()`
  - `Upload Folder` → calls: `triggerFolderUpload`; onclick: `triggerFolderUpload()`
  - `Upload File` → calls: `triggerFileUpload`; onclick: `triggerFileUpload()`
  - `New File` → calls: `createNewFile`; onclick: `createNewFile()`
  - `unnamed` → calls: `closeSidebar`; onclick: `closeSidebar()`
  - `search-opt-case` → calls: `toggleSearchOption`; onclick: `toggleSearchOption('case')`
  - `search-opt-word` → calls: `toggleSearchOption`; onclick: `toggleSearchOption('word')`
  - `search-opt-regex` → calls: `toggleSearchOption`; onclick: `toggleSearchOption('regex')`
  - `unnamed` → calls: `gitCommit`; onclick: `gitCommit()`
  - `unnamed` → calls: `gitRefresh`; onclick: `gitRefresh()`
  - `unnamed` → calls: `closeSidebar`; onclick: `closeSidebar()`
  - `Commit` → calls: `gitAction`; onclick: `gitAction('commit')`
  - `↑` → calls: `gitAction`; onclick: `gitAction('push')`
  - `↓` → calls: `gitAction`; onclick: `gitAction('pull')`
  - `unnamed` → calls: `clearAllBookmarks`; onclick: `clearAllBookmarks()`
  - `unnamed` → calls: `closeSidebar`; onclick: `closeSidebar()`
  - `term-mode-shell` → calls: `termSetMode`; onclick: `termSetMode('shell')`
  - `term-mode-js` → calls: `termSetMode`; onclick: `termSetMode('js')`
  - `unnamed` → calls: `clearTerminal`; onclick: `clearTerminal()`
  - `unnamed` → calls: `closeSidebar`; onclick: `closeSidebar()`
  - `unnamed` → calls: `execEditorCmd`; onclick: `execEditorCmd('editor.action.formatDocument')`
  - `unnamed` → calls: `toggleWordWrap`; onclick: `toggleWordWrap()`
  - `unnamed` → calls: `splitEditorRight`; onclick: `splitEditorRight()`
  - `Upload Folder` → calls: `triggerFolderUpload`; onclick: `triggerFolderUpload()`
  - `Upload File` → calls: `triggerFileUpload`; onclick: `triggerFileUpload()`
  - `New File` → calls: `createNewFile`; onclick: `createNewFile()`
  - `bp-tab-console` → calls: `switchBottomTab`; onclick: `switchBottomTab('console')`
  - `bp-tab-output` → calls: `switchBottomTab`; onclick: `switchBottomTab('output')`
  - `bp-tab-problems` → calls: `switchBottomTab`; onclick: `switchBottomTab('problems')`
  - `bp-tab-debug` → calls: `switchBottomTab`; onclick: `switchBottomTab('debug')`
  - `unnamed` → calls: `clearBottomPanel`; onclick: `clearBottomPanel()`
  - `unnamed` → calls: `closeBottomPanel`; onclick: `closeBottomPanel()`
  - `unnamed` → calls: `navigateBack`; onclick: `navigateBack()`
  - `unnamed` → calls: `navigateForward`; onclick: `navigateForward()`
  - `unnamed` → calls: `refreshPreview`; onclick: `refreshPreview()`
  - `unnamed` → calls: `openPreviewInNewWindow`; onclick: `openPreviewInNewWindow()`
  - `device-mode-btn` → calls: `toggleDeviceMode`; onclick: `toggleDeviceMode()`
  - `unnamed` → calls: `toggleBottomPanel`; onclick: `toggleBottomPanel()`
  - `unnamed` → calls: `togglePreviewPane`; onclick: `togglePreviewPane()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `unnamed` → calls: `toggleExplanation`; onclick: `toggleExplanation()`
  - `Got it, Close Reference` → calls: `toggleExplanation`; onclick: `toggleExplanation()`
  - `New File` → calls: `createNewFile`; onclick: `createNewFile()`
  - `Upload` → calls: `triggerFileUpload`; onclick: `triggerFileUpload()`
  - `New Folder` → calls: `createNewFolder`; onclick: `createNewFolder()`
  - `Upload Folder` → calls: `triggerFolderUpload`; onclick: `triggerFolderUpload()`
  - `mob-btn-explorer` → calls: `toggleMobileSidebar`; onclick: `toggleMobileSidebar()`
  - `mob-btn-preview` → calls: `toggleMobilePreview`; onclick: `toggleMobilePreview()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`
  - `activity-search` → calls: `switchSidebar`; onclick: `switchSidebar('search')`
  - `activity-git` → calls: `switchSidebar`; onclick: `switchSidebar('git')`
  - `activity-bookmarks` → calls: `switchSidebar`; onclick: `switchSidebar('bookmarks')`
  - `activity-terminal` → calls: `switchSidebar`; onclick: `switchSidebar('terminal')`
  - `Settings` → calls: `openSettings`; onclick: `openSettings()`

### tools\image-optimizer-pro.html
- Triggers:
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools\imagesupscaler.html
- Triggers:
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`

### tools\index.html
- Triggers:
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools\instant-dictionary-home.html
- Triggers:
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools\life-tools-home.html
- Triggers:
  - `Rename` → calls: `renameWorkbook`; onclick: `renameWorkbook('${item.id}')`
  - `Copy` → calls: `copyWorkbook`; onclick: `copyWorkbook('${item.id}')`
  - `Delete` → calls: `deleteWorkbook`; onclick: `deleteWorkbook('${item.id}')`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools\life-tools.html
- Triggers:
  - `New File` → calls: `createNewWorkbookFromApp`; onclick: `createNewWorkbookFromApp()`
  - `Rename` → calls: `renameCurrentWorkbook`; onclick: `renameCurrentWorkbook()`
  - `Copy` → calls: `copyCurrentWorkbook`; onclick: `copyCurrentWorkbook()`
  - `Share` → calls: `shareCurrentWorkbookByEmail`; onclick: `shareCurrentWorkbookByEmail()`
  - `unnamed` → calls: `undo`; onclick: `undo()`
  - `unnamed` → calls: `redo`; onclick: `redo()`
  - `Add-ons` → calls: `toggleSidebar`; onclick: `toggleSidebar()`
  - `Create Chart` → calls: `generateChart`; onclick: `generateChart()`
  - `Clear Sheet` → calls: `clearGrid`; onclick: `clearGrid()`
  - `theme-toggle` → calls: `toggleTheme`; onclick: `toggleTheme()`
  - `tab-btn-home` → calls: `switchRibbonTab`; onclick: `switchRibbonTab('home')`
  - `tab-btn-insert` → calls: `switchRibbonTab`; onclick: `switchRibbonTab('insert')`
  - `tab-btn-formulas` → calls: `switchRibbonTab`; onclick: `switchRibbonTab('formulas')`
  - `tab-btn-data` → calls: `switchRibbonTab`; onclick: `switchRibbonTab('data')`
  - `tab-btn-view` → calls: `switchRibbonTab`; onclick: `switchRibbonTab('view')`
  - `unnamed` → calls: `execCopy`; onclick: `execCopy()`
  - `unnamed` → calls: `execCut`; onclick: `execCut()`
  - `unnamed` → calls: `execPaste`; onclick: `execPaste()`
  - `B` → calls: `formatActiveCell`; onclick: `formatActiveCell('bold')`
  - `I` → calls: `formatActiveCell`; onclick: `formatActiveCell('italic')`
  - `U` → calls: `formatActiveCell`; onclick: `formatActiveCell('underline')`
  - `unnamed` → calls: `formatActiveCell`; onclick: `formatActiveCell('align-left')`
  - `unnamed` → calls: `formatActiveCell`; onclick: `formatActiveCell('align-center')`
  - `unnamed` → calls: `formatActiveCell`; onclick: `formatActiveCell('align-right')`
  - `+Row` → calls: `insertRowAbove`; onclick: `insertRowAbove()`
  - `-Row` → calls: `deleteSelectedRow`; onclick: `deleteSelectedRow()`
  - `+Col` → calls: `insertColumnLeft`; onclick: `insertColumnLeft()`
  - `-Col` → calls: `deleteSelectedCol`; onclick: `deleteSelectedCol()`
  - `Insert Add-on Template` → calls: `insertTemplateMenu`; onclick: `insertTemplateMenu()`
  - `Bar Chart` → calls: `generateChart`; onclick: `generateChart()`
  - `Line Chart` → calls: `generateLineChart`; onclick: `generateLineChart()`
  - `Pie Chart` → calls: `generatePieChart`; onclick: `generatePieChart()`
  - `New Sheet` → calls: `addSheet`; onclick: `addSheet()`
  - `Insert Row` → calls: `insertRowAbove`; onclick: `insertRowAbove()`
  - `Insert Col` → calls: `insertColumnLeft`; onclick: `insertColumnLeft()`
  - `AutoSum` → calls: `insertQuickFormula`; onclick: `insertQuickFormula('SUM')`
  - `Average` → calls: `insertQuickFormula`; onclick: `insertQuickFormula('AVERAGE')`
  - `Count` → calls: `insertQuickFormula`; onclick: `insertQuickFormula('COUNT')`
  - `Max` → calls: `insertQuickFormula`; onclick: `insertQuickFormula('MAX')`
  - `Min` → calls: `insertQuickFormula`; onclick: `insertQuickFormula('MIN')`
  - `btn-show-formulas` → calls: `toggleShowFormulas`; onclick: `toggleShowFormulas()`
  - `Formula Glossary` → calls: `toggleFormulaHelp`; onclick: `toggleFormulaHelp()`
  - `Sort A-Z` → calls: `sortSelectedRange`; onclick: `sortSelectedRange('asc')`
  - `Sort Z-A` → calls: `sortSelectedRange`; onclick: `sortSelectedRange('desc')`
  - `Remove Dupes` → calls: `removeDuplicates`; onclick: `removeDuplicates()`
  - `Clear Cells` → calls: `clearSelectedCells`; onclick: `clearSelectedCells()`
  - `Export CSV` → calls: `exportCSV`; onclick: `exportCSV()`
  - `Import CSV` → calls: `importCSVFile`; onclick: `importCSVFile()`
  - `75%` → calls: `setZoom`; onclick: `setZoom(0.75)`
  - `100%` → calls: `setZoom`; onclick: `setZoom(1)`
  - `125%` → calls: `setZoom`; onclick: `setZoom(1.25)`
  - `150%` → calls: `setZoom`; onclick: `setZoom(1.5)`
  - `btn-gridlines` → calls: `toggleGridlines`; onclick: `toggleGridlines()`
  - `Freeze Top Row` → calls: `freezeTopRow`; onclick: `freezeTopRow()`
  - `unnamed` → calls: `toggleSidebar`; onclick: `toggleSidebar()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `unnamed` → calls: `toggleFormulaHelp`; onclick: `toggleFormulaHelp()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`
  - `fx` → calls: `toggleFormulaHelp`; onclick: `toggleFormulaHelp()`

### tools\local_video_image_mask_merger.html
- Triggers:
  - `unnamed` → calls: `dismissAlert`; onclick: `dismissAlert()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools\media-library.html
- Triggers:
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools\mediaconverter.html
- Triggers:
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`

### tools\mediaforge-home.html
- Triggers:
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools\mediaforge.html
- Triggers:
  - `unnamed` → calls: `stepFrames`; onclick: `stepFrames(-30)`
  - `-1F` → calls: `stepFrames`; onclick: `stepFrames(-1)`
  - `btnPlayPause` → calls: `togglePlay`; onclick: `togglePlay()`
  - `+1F` → calls: `stepFrames`; onclick: `stepFrames(1)`
  - `unnamed` → calls: `stepFrames`; onclick: `stepFrames(30)`
  - `[ Set In` → calls: `setClipPoint`; onclick: `setClipPoint('start')`
  - `Set Out ]` → calls: `setClipPoint`; onclick: `setClipPoint('end')`
  - `tabFrameBtn` → calls: `switchUtilityTab`; onclick: `switchUtilityTab('frame')`
  - `tabVideoBtn` → calls: `switchUtilityTab`; onclick: `switchUtilityTab('video')`
  - `tabAudioBtn` → calls: `switchUtilityTab`; onclick: `switchUtilityTab('audio')`
  - `Grab Current Frame` → calls: `captureCurrentFrame`; onclick: `captureCurrentFrame()`
  - `Clear` → calls: `clearFrameQueue`; onclick: `clearFrameQueue()`
  - `Export ZIP` → calls: `batchExportZip`; onclick: `batchExportZip()`
  - `btnExportVideo` → calls: `exportVideoClip`; onclick: `exportVideoClip()`
  - `btnAudioStereo` → calls: `selectAudioCh`; onclick: `selectAudioCh(2)`
  - `btnAudioMono` → calls: `selectAudioCh`; onclick: `selectAudioCh(1)`
  - `btnRipAudio` → calls: `ripLosslessAudio`; onclick: `ripLosslessAudio()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`

### tools\mediaplayer-home.html
- Triggers:
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools\mediaplayer.html
- Triggers:
  - `Add Media` → calls: `getElementById, click`; onclick: `document.getElementById('fileInput').click()`
  - `Add` → calls: `getElementById, click`; onclick: `document.getElementById('fileInput').click()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`

### tools\mp4tomp3-home.html
- Triggers:
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools\mp4tomp3.html
- Triggers:
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools\omniconvert-home.html
- Triggers:
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools\pdf-to-text-home.html
- Triggers:
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools\pdfmerger.html
- Triggers:
  - `Select All` → calls: `toggleSelectAll`; onclick: `toggleSelectAll(true)`
  - `Deselect All` → calls: `toggleSelectAll`; onclick: `toggleSelectAll(false)`
  - `Clear All` → calls: `clearAllFiles`; onclick: `clearAllFiles()`
  - `Download Separately` → calls: `downloadSelectedSeparately`; onclick: `downloadSelectedSeparately()`
  - `Merge & Download` → calls: `downloadSelectedMerged`; onclick: `downloadSelectedMerged()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`

### tools\pdfstotxt.html
- Triggers:
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`

### tools\steganovault.html
- Triggers:
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools\teleprompter-home.html
- Triggers:
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools\teleprompter.html
- Triggers:
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`

### tools\the-new-project.html
- Triggers:
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools\tools-guide.html
- Triggers:
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools\u8.html
- Triggers:
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools\universal-file-encryption.html
- Triggers:
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`

### tools\velolink.html
- Triggers:
  - `unnamed` → calls: `clearFile`; onclick: `clearFile()`
  - `generateBtn` → calls: `startSender`; onclick: `startSender()`
  - `copyBtn` → calls: `copyLink`; onclick: `copyLink()`
  - `Send another file` → calls: `goHome`; onclick: `goHome()`
  - `downloadBtn` → calls: `triggerDownload`; onclick: `triggerDownload()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`
  - `VeloLink
            envizion.work` → calls: `goHome`; onclick: `goHome()`

### tools\vocal-music-separator.html
- Triggers:
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`

### tools\voice-recorder.html
- Triggers:
  - `envizion-scroll-up-btn` → calls: `scrollTo`; onclick: `window.scrollTo({top: 0, behavior: 'smooth'})`
  - `&#10005;` → calls: `ezClose`; onclick: `ezClose()`
  - `&#128269;` → calls: `ezOpen`; onclick: `ezOpen()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`
  - `Hide` → calls: `closest, remove`; onclick: `this.closest('.evz-col-box').remove()`

## Example: Direct Function Call

```js
const iframe = document.createElement("iframe");
iframe.src = "/tools/mp4tomp3.html";
iframe.style.display = "none";
document.body.appendChild(iframe);
iframe.onload = () => {
  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  // set input file, then call mapped function
  // win.someFunction(inputValue);
  // read result from doc.querySelector("#output")
};
```

## Notes
- Many tools operate on DOM state; ensure required elements exist before calling.
- File inputs require a File/Blob and DataTransfer to set programmatically.
- Use the button map and capabilities JSON for exact function names and triggers.