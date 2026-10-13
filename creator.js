// Shared by the popup (popup.html) and the background service worker (background.js).
// Copies a bundled blank template into Downloads with a timestamped name, then tries to open it.

var ND_TYPES = {
  word:       { file: 'templates/blank.docx', prefix: 'Document',     ext: 'docx', label: 'Word document',
                mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  excel:      { file: 'templates/blank.xlsx', prefix: 'Spreadsheet',  ext: 'xlsx', label: 'Excel spreadsheet',
                mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  powerpoint: { file: 'templates/blank.pptx', prefix: 'Presentation', ext: 'pptx', label: 'PowerPoint presentation',
                mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }
};

// Read a bundled template and return it as a data: URL.
// (Downloading the chrome-extension:// URL directly fails from the background
// service worker, so the file contents are handed to Chrome instead.)
async function ndTemplateDataUrl(type) {
  var resp = await fetch(chrome.runtime.getURL(type.file));
  if (!resp.ok) throw new Error('template missing: ' + type.file);
  var bytes = new Uint8Array(await resp.arrayBuffer());
  var bin = '';
  for (var i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return 'data:' + type.mime + ';base64,' + btoa(bin);
}

// e.g. Document-2026-10-13-1430.docx
function ndFileName(type) {
  var d = new Date();
  var p = function (n) { return String(n).padStart(2, '0'); };
  return type.prefix + '-' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
         '-' + p(d.getHours()) + p(d.getMinutes()) + '.' + type.ext;
}

// Resolve when the download finishes; reject if it is interrupted or takes too long.
function ndWaitForDownload(id) {
  return new Promise(function (resolve, reject) {
    var timeout = setTimeout(function () {
      chrome.downloads.onChanged.removeListener(onChanged);
      reject(new Error('timeout'));
    }, 15000);

    function finish(state) {
      clearTimeout(timeout);
      chrome.downloads.onChanged.removeListener(onChanged);
      if (state === 'complete') resolve(); else reject(new Error(state));
    }

    function onChanged(delta) {
      if (delta.id === id && delta.state) {
        var s = delta.state.current;
        if (s === 'complete' || s === 'interrupted') finish(s);
      }
    }

    chrome.downloads.onChanged.addListener(onChanged);
    chrome.downloads.search({ id: id }).then(function (results) {
      var item = results && results[0];
      if (item && (item.state === 'complete' || item.state === 'interrupted')) finish(item.state);
    });
  });
}

// Try to open the file directly; fall back to showing it in the Files app.
async function ndOpenFile(id) {
  try {
    await Promise.resolve(chrome.downloads.open(id));
    if (chrome.runtime.lastError) throw new Error(chrome.runtime.lastError.message);
    return 'opened';
  } catch (e) {
    console.warn('New Document: open failed, showing instead:', e && e.message);
    try {
      chrome.downloads.show(id);
      return 'shown';
    } catch (e2) {
      return 'saved';
    }
  }
}

// Returns { ok: true, name, label, result: 'opened' | 'shown' | 'saved' }
async function ndCreate(kind) {
  var type = ND_TYPES[kind];
  if (!type) throw new Error('unknown kind: ' + kind);
  var name = ndFileName(type);
  var id = await chrome.downloads.download({
    url: await ndTemplateDataUrl(type),
    filename: name,
    conflictAction: 'uniquify',
    saveAs: false
  });
  await ndWaitForDownload(id);
  var result = await ndOpenFile(id);
  return { ok: true, name: name, label: type.label, result: result };
}
