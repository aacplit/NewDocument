// Buttons shown inside the New Document web app. The file logic lives in creator.js.

var PARENT_ORIGIN = 'https://aacplit.github.io';

var done = document.getElementById('done');
var doneTitle = document.getElementById('done-title');
var doneBody = document.getElementById('done-body');
var buttons = Array.from(document.querySelectorAll('.choice'));

// Tell the web app we're here and how tall we are, so it can size the frame.
function report(type) {
  try {
    window.parent.postMessage({ source: 'new-document-extension', type: type,
      height: Math.ceil(document.body.getBoundingClientRect().height) }, PARENT_ORIGIN);
  } catch (e) { /* not embedded */ }
}

function show(title, prefix, name, suffix, isError) {
  doneTitle.textContent = title;
  doneBody.textContent = '';
  doneBody.appendChild(document.createTextNode(prefix));
  if (name) {
    var f = document.createElement('span');
    f.className = 'file';
    f.textContent = name;
    doneBody.appendChild(f);
  }
  doneBody.appendChild(document.createTextNode(suffix));
  done.classList.toggle('error', !!isError);
  done.hidden = false;
  report('resize');
}

async function create(kind) {
  var type = ND_TYPES[kind];
  if (!type) return;
  buttons.forEach(function (b) { b.disabled = true; });
  show('Creating your ' + type.label + '…', '', '', '');
  try {
    var r = await ndCreate(kind);
    if (r.result === 'opened') {
      show('Your new ' + type.label + ' is opening', 'It\u2019s saved in your Downloads folder as ', r.name,
           '. If it doesn\u2019t open, find it there in the Files app.');
    } else if (r.result === 'shown') {
      show('Your new ' + type.label + ' is ready', 'The Files app opened to your Downloads folder. Double-click ', r.name,
           ' to open it.');
    } else {
      show('Your new ' + type.label + ' is ready', 'It was saved to your Downloads folder as ', r.name,
           '. Open the Files app and look in Downloads to open it.');
    }
  } catch (err) {
    console.error('New Document:', err);
    show('The file could not be created', 'Try again, or see a staff member for help.', '', '', true);
  } finally {
    setTimeout(function () { buttons.forEach(function (b) { b.disabled = false; }); }, 800);
  }
}

buttons.forEach(function (b) { b.addEventListener('click', function () { create(b.dataset.kind); }); });
window.addEventListener('resize', function () { report('resize'); });
report('ready');
