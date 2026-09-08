import { lessons, scenarios } from './content.js';
import { STORAGE_KEY, cleanProgress, accuracy } from './progress.js';

const app = document.querySelector('#app');
const storageStatus = document.querySelector('#storage-status');
let progress;
try {
  progress = cleanProgress(JSON.parse(localStorage.getItem(STORAGE_KEY)), lessons.map(l => l.id), scenarios.map(s => s.id));
} catch {
  progress = cleanProgress(null, [], []);
  storageStatus.textContent = 'Saved progress could not be read. You can still practice in this session.';
}
let view = 'learn';
let activeLesson = null;
let scenarioIndex = Math.max(0, scenarios.findIndex(s => !progress.answers[s.id]));
let selectedPattern = '';
let selectedDiscard = '';
let submitted = false;

function node(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on')) element.addEventListener(key.slice(2), value);
    else if (key === 'className') element.className = value;
    else element.setAttribute(key, value);
  }
  element.append(...children.flat().filter(child => child !== null));
  return element;
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    storageStatus.textContent = '';
  } catch {
    storageStatus.textContent = 'Browser storage is unavailable or full. Progress is kept only for this session.';
  }
}

const honorNames = { E: 'East wind', S: 'South wind', W: 'West wind', N: 'North wind', R: 'Red dragon', G: 'Green dragon', B: 'White dragon' };
const honorFaces = { E: '東', S: '南', W: '西', N: '北', R: '中', G: '發', B: '白' };
const suitNames = { m: 'Characters', p: 'Circles', s: 'Bamboo' };
const suitFaces = { m: '萬', p: '●', s: '竹' };
function tileName(code) {
  return honorNames[code] || `${code[1]} ${suitNames[code[0]]}`;
}
function tile(code, interactive = false) {
  const color = code[0] === 'm' || code === 'R' ? 'red' : code[0] === 's' || code === 'G' ? 'green' : 'blue';
  const attrs = { className: `tile ${color}`, 'aria-label': tileName(code) };
  if (interactive) {
    attrs.type = 'button';
    attrs['aria-pressed'] = String(selectedDiscard === code);
    if (submitted) attrs.disabled = '';
    attrs.onclick = () => {
      selectedDiscard = code;
      document.querySelectorAll('.hand .tile').forEach(button => button.setAttribute('aria-pressed', String(button.getAttribute('aria-label') === tileName(code))));
      document.querySelector('#discard-choice').textContent = `Selected: ${tileName(code)}`;
      updateCheck();
    };
  } else attrs.role = 'img';
  return node(interactive ? 'button' : 'span', attrs,
    node('span', { className: 'tile-face', 'aria-hidden': 'true' }, honorFaces[code] || code[1]),
    node('span', { className: 'tile-suit', 'aria-hidden': 'true' }, honorNames[code] ? 'HONOR' : suitFaces[code[0]]),
    node('span', { className: 'tile-label', 'aria-hidden': 'true' }, honorNames[code] || suitNames[code[0]]));
}

function heading(kicker, title, description) {
  return node('div', { className: 'section-heading' },
    node('p', { className: 'eyebrow' }, kicker), node('h2', {}, title), node('p', {}, description));
}

function renderLearn() {
  app.append(heading('BUILD YOUR FOUNDATION', 'Big hands start with small patterns.', 'Explore a pattern, look at the tiles, and learn what makes it count.'));
  app.append(node('div', { className: 'lesson-grid' }, lessons.map((lesson, i) => {
    const completed = progress.completed.includes(lesson.id);
    return node('button', { className: `lesson-card ${activeLesson === lesson.id ? 'active' : ''}`, 'aria-expanded': String(activeLesson === lesson.id), 'aria-controls': 'lesson-detail', onclick: () => {
      activeLesson = lesson.id;
      render();
      document.querySelector('#lesson-detail').focus();
    } },
    node('div', { className: 'card-top' }, node('span', { className: 'card-number' }, `0${i + 1}`), node('span', { className: 'fan-badge' }, lesson.fan)),
    node('h3', {}, lesson.title), node('p', {}, lesson.summary),
    node('span', { className: 'card-action' }, completed ? '✓ Lesson completed' : 'Explore pattern →'));
  })));
  const lesson = lessons.find(l => l.id === activeLesson);
  const detail = node('section', { id: 'lesson-detail', className: 'lesson-detail', tabindex: '-1' });
  if (lesson) {
    detail.append(node('div', { className: 'detail-heading' }, node('h3', {}, lesson.title), node('span', { className: 'fan-badge' }, lesson.fan)),
      node('p', {}, lesson.detail),
      node('p', { className: 'eyebrow' }, 'EXAMPLE COMPLETED HAND'),
      node('div', { className: 'tiles example' }, lesson.example.map(code => tile(code))),
      node('div', { className: 'actions' },
        node('button', { className: 'primary', onclick: () => {
          if (!progress.completed.includes(lesson.id)) progress.completed.push(lesson.id);
          save(); render(); document.querySelector('#lesson-detail').focus();
        } }, progress.completed.includes(lesson.id) ? '✓ Completed' : 'Mark as learned'),
        node('button', { className: 'secondary', onclick: () => switchView('practice') }, 'Try a practice hand →')));
  } else {
    detail.append(node('p', {}, '↗ Pick a pattern above to see a complete hand and its scoring requirements.'));
  }
  app.append(detail, node('aside', { className: 'tip' }, node('strong', {}, 'A note for your table'), 'We use a 3 fan minimum. A zero-fan chicken hand teaches the baseline, but cannot win under these rules. Check the rules reference before you play.'));
}

function updateCheck() {
  document.querySelector('#check-answer').disabled = !selectedPattern || !selectedDiscard || submitted;
}

function renderPractice() {
  const scenario = scenarios[scenarioIndex];
  app.append(heading('PUT YOUR PATTERN SPOTTING TO WORK', 'What would you play?', 'Choose a scoring route and a discard. These guided hands prioritize achievable scoring, not perfect-play calculations.'));
  const picker = node('select', { id: 'scenario-picker', onchange: event => {
    scenarioIndex = Number(event.target.value); resetAnswer(); render();
  } }, scenarios.map((s, i) => {
    const option = node('option', { value: i }, `${i + 1}. ${s.title}${progress.answers[s.id] ? ' · practiced' : ''}`);
    option.selected = i === scenarioIndex;
    return option;
  }));
  app.append(node('div', { className: 'practice-toolbar' }, node('label', { for: 'scenario-picker' }, 'Choose a hand ', picker), node('span', { className: 'muted' }, `${scenarioIndex + 1} / ${scenarios.length}`)));
  const board = node('section', { className: 'board' },
    node('div', { className: 'board-heading' }, node('h3', {}, scenario.title), node('span', { className: 'board-badge' }, scenario.difficulty)),
    node('p', { className: 'board-context' }, `Seat: ${honorNames[scenario.seatWind]} · Round: ${honorNames[scenario.roundWind]} · ${scenario.stage}`),
    node('p', { className: 'board-label' }, 'EXPOSED SETS'),
    scenario.exposed.length
      ? node('div', { className: 'melds' }, scenario.exposed.map(meld => node('div', { className: 'tiles' }, meld.map(code => tile(code)))))
      : node('p', { className: 'board-context' }, 'None — your hand is concealed.'),
    node('p', { className: 'board-label' }, 'YOUR TILES · SELECT ONE TO DISCARD'),
    node('div', { className: 'tiles hand' }, scenario.hand.map(code => tile(code, true))),
    node('p', { id: 'discard-choice', className: 'board-context', role: 'status' }, selectedDiscard ? `Selected: ${tileName(selectedDiscard)}` : 'Tap a tile below its face to select it. Identical copies count as the same discard.'));
  app.append(board);
  const choices = node('fieldset', { className: 'pattern-options' }, node('legend', {}, 'Which scoring route would you pursue?'));
  const offset = scenarioIndex % scenario.options.length;
  const orderedOptions = [...scenario.options.slice(offset), ...scenario.options.slice(0, offset)];
  for (const option of orderedOptions) {
    const radio = node('input', { type: 'radio', name: 'pattern', value: option.id, onchange: () => {
      selectedPattern = option.id; updateCheck();
    } });
    radio.checked = selectedPattern === option.id;
    radio.disabled = submitted;
    choices.append(node('label', { className: 'pattern-option' }, radio, option.label));
  }
  app.append(choices,
    node('div', { className: 'actions' }, node('button', { id: 'check-answer', className: 'primary', onclick: () => {
      if (!selectedPattern || !selectedDiscard || submitted) return;
      submitted = true;
      if (!progress.answers[scenario.id]) {
        progress.answers[scenario.id] = { pattern: selectedPattern === scenario.bestPattern, discard: scenario.discards.includes(selectedDiscard) };
        save();
      }
      render();
      document.querySelector('#feedback').focus();
    } }, 'Check my thinking →'), node('span', { className: 'muted' }, 'Choose both a route and a tile.')));
  updateCheck();
  if (submitted) {
    const patternCorrect = selectedPattern === scenario.bestPattern;
    const discardCorrect = scenario.discards.includes(selectedDiscard);
    app.append(node('section', { id: 'feedback', className: 'feedback', tabindex: '-1', 'aria-labelledby': 'feedback-title' },
      node('p', { className: 'eyebrow' }, `${patternCorrect ? '✓' : '↻'} SCORING ROUTE · ${discardCorrect ? '✓' : '↻'} DISCARD`),
      node('h3', { id: 'feedback-title' }, patternCorrect && discardCorrect ? 'You found the path.' : 'Another path is worth a look.'),
      node('p', {}, node('strong', {}, `Aim for ${scenario.options.find(o => o.id === scenario.bestPattern).label}. `), `Discard ${scenario.discards.map(tileName).join(' or ')}. Target: ${scenario.targetFan}.`),
      node('p', {}, scenario.explanation), node('p', {}, node('strong', {}, 'The trade-off: '), scenario.tradeoff),
      node('p', { className: 'muted' }, 'Your first answer per hand counts toward accuracy. Replays are for learning.'),
      node('div', { className: 'actions' },
        node('button', { className: 'primary', onclick: () => {
          if (scenarioIndex === scenarios.length - 1) switchView('progress');
          else { scenarioIndex++; resetAnswer(); render(); app.focus(); }
        } }, scenarioIndex === scenarios.length - 1 ? 'See my progress →' : 'Next hand →'),
        node('button', { className: 'secondary', onclick: () => { resetAnswer(); render(); app.focus(); } }, 'Try this hand again'))));
  }
}

function renderProgress() {
  const count = Object.keys(progress.answers).length;
  app.append(heading('YOUR PRACTICE, YOUR PACE', 'A little better, hand by hand.', 'Progress is saved on this device. Accuracy counts a hand as correct only when both its route and discard are right.'));
  app.append(node('div', { className: 'stats' },
    node('div', {}, node('strong', {}, `${progress.completed.length}/${lessons.length}`), node('span', {}, 'patterns learned')),
    node('div', {}, node('strong', {}, `${count}/${scenarios.length}`), node('span', {}, 'hands practiced')),
    node('div', {}, node('strong', {}, count ? `${accuracy(progress.answers)}%` : '—'), node('span', {}, 'first-answer accuracy'))));
  app.append(node('div', { className: 'progress-list' }, scenarios.map((s, i) => {
    const answer = progress.answers[s.id];
    return node('button', { className: 'progress-row', onclick: () => {
      scenarioIndex = i; resetAnswer(); switchView('practice');
    } }, node('span', {}, `${String(i + 1).padStart(2, '0')} · ${s.title}`),
    node('span', { className: answer?.pattern && answer?.discard ? 'success' : 'muted' }, !answer ? 'Not tried →' : answer.pattern && answer.discard ? '✓ Both correct · Replay' : 'Review this hand →'));
  })));
  app.append(node('button', { className: 'text-button reset', onclick: () => {
    if (window.confirm('Reset all lessons and first-answer scores on this device? This cannot be undone.')) {
      progress = cleanProgress(null, [], []); save(); resetAnswer(); render(); app.focus();
    }
  } }, 'Reset local progress'));
}

function resetAnswer() { selectedPattern = ''; selectedDiscard = ''; submitted = false; }
function switchView(next) {
  view = next; render(); app.focus();
}
function render() {
  app.replaceChildren();
  app.setAttribute('tabindex', '-1');
  document.querySelectorAll('[data-view]').forEach(button => {
    if (button.dataset.view === view) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (view === 'practice') renderPractice();
  else if (view === 'progress') renderProgress();
  else renderLearn();
}
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
document.querySelector('#rules-button').addEventListener('click', () => document.querySelector('#rules-dialog').showModal());
let installPrompt;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
document.querySelector('#install-button').addEventListener('click', async () => {
  if (installPrompt) {
    await installPrompt.prompt();
    installPrompt = null;
  } else document.querySelector('#install-dialog').showModal();
});
window.addEventListener('appinstalled', () => { document.querySelector('#install-button').textContent = 'App installed ✓'; });

let offlineReady = false;
function showConnection() {
  document.querySelector('#connection').textContent = offlineReady
    ? navigator.onLine ? '● Ready offline' : '● Offline · ready to practice'
    : navigator.onLine ? 'Online · preparing offline access' : 'Offline · content may be unavailable';
}
window.addEventListener('online', showConnection);
window.addEventListener('offline', showConnection);
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(() => {
    offlineReady = true; showConnection();
  }).catch(() => {
    document.querySelector('#connection').textContent = 'Offline setup unavailable · try reloading online';
  });
} else document.querySelector('#connection').textContent = 'Offline mode needs a supported browser';
render();
if ('serviceWorker' in navigator) showConnection();
