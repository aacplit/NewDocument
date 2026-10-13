// Toolbar popup. The file-creating logic lives in creator.js, shared with background.js.

var statusEl = document.getElementById('status');
var buttons = Array.from(document.querySelectorAll('.choice'));

function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.className = 'status' + (kind ? ' ' + kind : '');
  statusEl.hidden = !message;
}

function setBusy(busy) {
  buttons.forEach(function (b) { b.disabled = busy; });
}

async function create(kind) {
  var type = ND_TYPES[kind];
  if (!type) return;
  setBusy(true);
  setStatus('Creating your ' + type.label + '…');
  try {
    var r = await ndCreate(kind);
    if (r.result === 'opened') {
      setStatus('Opening ' + r.name + '. Remember to save a copy before you click Exit Session.', 'ok');
    } else {
      setStatus(r.name + ' is in your Downloads folder. Open it from there, and save a copy before you click Exit Session.', 'ok');
    }
  } catch (err) {
    console.error('New Document:', err);
    setStatus('The new file could not be created. Try again, or ask library staff for help.', 'err');
  } finally {
    setBusy(false);
  }
}

buttons.forEach(function (b) { b.addEventListener('click', function () { create(b.dataset.kind); }); });
