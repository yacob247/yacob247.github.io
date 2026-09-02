# -*- coding: utf-8 -*-
# PATCH 1E-1: sidebar button + auto-save hooks + attach-from-library
text = open(r'index.html', 'r', encoding='utf-8').read()
def rep(old, new, count=1):
    global text
    assert text.count(old) == count, 'count=%d for %s' % (text.count(old), old[:60])
    text = text.replace(old, new)

rep("""                            <span>Model Manager</span>
                        </button>""",
"""                            <span>Model Manager</span>
                        </button>
                        <button id="nav-library" class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-white/5 transition-all text-sm font-medium text-left">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                            <span>File Library</span>
                        </button>""")

rep("""                attachedMediaUrl = URL.createObjectURL(file);
                attachedMediaKind = isAudio ? 'audio' : 'video';""",
"""                attachedMediaUrl = URL.createObjectURL(file);
                attachedMediaKind = isAudio ? 'audio' : 'video';
                try { window.nexusLibrarySave && window.nexusLibrarySave({ name: file.name, kind: isAudio ? 'audio' : 'video', size: file.size, blob: file }); } catch (e) {}""")

rep("""                    attachedImageBase64 = await readFileWithProgress(file, true);
                    attachedFileName = file.name;""",
"""                    attachedImageBase64 = await readFileWithProgress(file, true);
                    try { const _lb = await (await fetch(attachedImageBase64)).blob(); window.nexusLibrarySave && window.nexusLibrarySave({ name: file.name, kind: 'image', size: file.size, blob: _lb }); } catch (e) {}
                    attachedFileName = file.name;""")

# attach-from-library (classic script scope — has access to attachment globals)
anchor2 = '        window.closeAttachmentPreview = () => {'
assert text.count(anchor2) == 1
lib_attach = """        window.nexusAttachFromLibrary = async (rec) => {
            if (rec.kind === 'image') {
                const fr = new FileReader();
                attachedImageBase64 = await new Promise((res, rej) => { fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(rec.blob); });
                attachedFileName = rec.name; attachedFileContent = null;
                if (attachedMediaUrl) { try { URL.revokeObjectURL(attachedMediaUrl); } catch (e) {} }
                attachedMediaUrl = null; attachedMediaKind = null;
                document.getElementById('attached-file-pill').classList.replace('hidden', 'flex');
                document.getElementById('attached-file-name').innerText = rec.name + ' (image)';
            } else if (rec.kind === 'audio' || rec.kind === 'video') {
                attachedMediaUrl = URL.createObjectURL(rec.blob); attachedMediaKind = rec.kind; attachedFileName = rec.name;
                attachedImageBase64 = null; attachedFileContent = null;
                document.getElementById('attached-file-pill').classList.replace('hidden', 'flex');
                document.getElementById('attached-file-name').innerText = rec.name + ' (' + rec.kind + ')';
            } else {
                attachedFileName = rec.name;
                if (rec.blob.size <= 10 * 1024 * 1024) {
                    const t = await rec.blob.text();
                    attachedFileContent = '[File: ' + rec.name + ']\\n```\\n' + t + '\\n```';
                    attachedImageBase64 = null;
                    if (attachedMediaUrl) { try { URL.revokeObjectURL(attachedMediaUrl); } catch (e) {} }
                    attachedMediaUrl = null; attachedMediaKind = null;
                    document.getElementById('attached-file-pill').classList.replace('hidden', 'flex');
                    document.getElementById('attached-file-name').innerText = rec.name + ' (file)';
                } else {
                    triggerNotificationToast('Too large', 'Text files over 10MB cannot be embedded.', 'fa-triangle-exclamation', 'bg-red-600');
                    return;
                }
            }
            uploadInProgress = false;
            triggerNotificationToast('Attached from Library', rec.name + ' is ready.', 'fa-folder-open', 'bg-indigo-600');
        };

"""
text = text.replace(anchor2, lib_attach + anchor2, 1)
open(r'index.html', 'w', encoding='utf-8', newline='').write(text)
print('PATCH 1E-1 OK')
