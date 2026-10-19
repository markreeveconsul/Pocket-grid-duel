'use strict';
/* GRID DUEL — POCKET CONSOLE
   Study 1: rules and scores. Study 2: AI. Study 3: screen and events.
   No libraries, server, database, or external assets are needed. */

// 1. RULES: a board is an array of nine strings: '', 'X', or 'O'.
const Rules = (() => {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const other = player => player === 'X' ? 'O' : 'X';
  const empty = board => board.map((mark, index) => mark ? -1 : index).filter(index => index !== -1);
  function result(board) {
    for (const line of lines) {
      const mark = board[line[0]];
      if (mark && line.every(index => board[index] === mark)) return {winner: mark, line, draw: false};
    }
    return {winner: null, line: null, draw: board.every(Boolean)};
  }
  function place(board, index, player) {
    if (!Number.isInteger(index) || index < 0 || index > 8 || board[index] || !['X', 'O'].includes(player)) return null;
    const outcome = result(board);
    if (outcome.winner || outcome.draw) return null;
    const copy = [...board];
    copy[index] = player;
    return copy;
  }
  class ScoreBoard {
    constructor() { this.reset(); }
    reset() { this.X = 0; this.O = 0; this.draws = 0; }
    record(outcome) {
      if (outcome.winner) this[outcome.winner] += 1;
      else if (outcome.draw) this.draws += 1;
    }
  }

  // 2. AI: Easy is random. Medium looks one move ahead. Hard searches to the end.
  function choose(board, player, level, random = Math.random) {
    const outcome = result(board);
    if (outcome.winner || outcome.draw) return null;
    const moves = empty(board);
    const pickRandom = () => moves[Math.floor(random() * moves.length)];
    if (level === 'easy') return pickRandom();
    if (level === 'medium') {
      for (const mark of [player, other(player)]) {
        const immediate = moves.find(index => result(place(board, index, mark)).winner === mark);
        if (immediate !== undefined) return immediate;
      }
      return pickRandom();
    }
    const cache = new Map();
    function minimax(position, turn, depth) {
      const end = result(position);
      if (end.winner) return end.winner === player ? 10 - depth : depth - 10;
      if (end.draw) return 0;
      const key = position.map(mark => mark || '-').join('') + turn;
      if (cache.has(key)) return cache.get(key);
      let best = turn === player ? -Infinity : Infinity;
      for (const index of empty(position)) {
        const value = minimax(place(position, index, turn), other(turn), depth + 1);
        best = turn === player ? Math.max(best, value) : Math.min(best, value);
      }
      cache.set(key, best);
      return best;
    }
    let bestValue = -Infinity;
    let bestMove = moves[0];
    // Prefer the center, then corners, if several moves have the same value.
    for (const index of [4,0,2,6,8,1,3,5,7].filter(index => !board[index])) {
      const value = minimax(place(board, index, player), other(player), 1);
      if (value > bestValue) { bestValue = value; bestMove = index; }
    }
    return bestMove;
  }
  return {lines, other, empty, result, place, choose, ScoreBoard};
})();

// 3. PREFERENCES AND AUDIO: optional, local, and independent of the rules.
const $ = id => document.getElementById(id);
const cells = [...document.querySelectorAll('.cell')];
const defaults = {mode:'solo', difficulty:'medium', humanMark:'X', format:'endless', shell:'berry', sound:false, volume:'low'};
const choices = {mode:['solo','duo'], difficulty:['easy','medium','hard'], humanMark:['X','O'], format:['endless','series'], shell:['cream','charcoal','berry'], volume:['low','normal']};
let preferences = {...defaults};
let referenceShellChosen = false;
try {
  const saved = JSON.parse(localStorage.getItem('pocket-console-v1'));
  referenceShellChosen = saved?.referenceDesign === true;
  for (const key of Object.keys(choices)) if (choices[key].includes(saved?.[key])) preferences[key] = saved[key];
  if (typeof saved?.sound === 'boolean') preferences.sound = saved.sound;
} catch { /* Private browsing or unavailable storage must not prevent play. */ }
if (!referenceShellChosen) preferences.shell = 'berry';
preferences.referenceDesign = true;
function savePreferences() {
  try { localStorage.setItem('pocket-console-v1', JSON.stringify(preferences)); } catch {}
}
for (const key of ['mode','difficulty','humanMark','format']) $(key).value = preferences[key];
let audio = null;
const voices = new Set();
function stopSound() {
  for (const voice of voices) { try { voice.stop(); } catch {} }
  voices.clear();
}
function unlockAudio() {
  if (!preferences.sound) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    audio ||= new Audio();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
  } catch { /* Audio is optional. */ }
}
function sound(kind) {
  if (!preferences.sound || !audio || audio.state !== 'running' || document.hidden) return;
  const tunes = {click:[420], place:[620], win:[523,659,784], lose:[392,330,262], draw:[440,440], start:[392,523]};
  (tunes[kind] || tunes.click).forEach((frequency, index) => {
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    const time = audio.currentTime + index * .11;
    oscillator.type = 'square'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(preferences.volume === 'low' ? .012 : .025, time + .006);
    gain.gain.exponentialRampToValueAtTime(.0001, time + .085);
    oscillator.connect(gain); gain.connect(audio.destination);
    voices.add(oscillator);
    oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(time); oscillator.stop(time + .09);
  });
}
function applyAppearance() {
  document.body.dataset.shell = preferences.shell;
  document.querySelectorAll('[data-shell]').forEach(button => {
    if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', String(button.dataset.shell === preferences.shell));
  });
  $('volume').value = preferences.sound ? preferences.volume : 'off';
}

// 4. CONTROLLER: the round and optional first-to-three session.
const scores = new Rules.ScoreBoard();
const icons = { X: 'X', O: 'O' };
let board = Array(9).fill(''), turn = 'X', starter = 'X', round = 1;
let phase = 'ready';
let screen = 'title', leaving = false, hintIndex = null, hintTimer = null;
let history = [];
let selectedCell = 4;
const paused = () => screen !== 'game' || $('setup').open || leaving;
function clearHint() { clearTimeout(hintTimer); hintTimer = null; hintIndex = null; }
let aiTimer = null, resultTimer = null, revision = 0, resultRevealed = false;
const isComputerTurn = () => preferences.mode === 'solo' && turn !== preferences.humanMark;
const champion = () => preferences.format === 'series' ? ['X','O'].find(mark => scores[mark] >= 3) : null;
const nameOf = mark => preferences.mode === 'duo' ? `Player ${mark}` : mark === preferences.humanMark ? 'You' : 'CPU';
function cancelAI() { clearTimeout(aiTimer); aiTimer = null; revision += 1; }
function clearRoundFeedback() { clearTimeout(resultTimer); resultTimer = null; resultRevealed = false; clearHint(); stopSound(); }
function render() {
  if (board[selectedCell]) selectedCell = Rules.empty(board)[0] ?? 4;
  const outcome = Rules.result(board), solo = preferences.mode === 'solo', matchWinner = champion();
  cells.forEach((cell, index) => {
    const mark = board[index];
    if (cell.dataset.mark !== mark) { cell.innerHTML = icons[mark] || ''; cell.dataset.mark = mark; }
    cell.disabled = phase !== 'playing' || paused() || Boolean(mark) || isComputerTurn();
    cell.classList.toggle('pad-selected', phase === 'playing' && !paused() && !isComputerTurn() && selectedCell === index && !mark);
    cell.classList.toggle('hinted', hintIndex === index);
    cell.classList.toggle('winner', Boolean(outcome.line?.includes(index)));
    cell.setAttribute('aria-label', `Row ${Math.floor(index / 3) + 1}, column ${index % 3 + 1}, ${mark || 'empty'}${outcome.line?.includes(index) ? ', winning square' : ''}`);
  });
  for (const mark of ['X','O']) {
    $('score'+mark).textContent = String(scores[mark]).padStart(2, '0');
    $('pips'+mark).innerHTML = preferences.format === 'series' ? [0,1,2].map(i => `<i class="${i < scores[mark] ? 'filled' : ''}"></i>`).join('') : '';
    $('score'+mark).setAttribute('aria-label', `${mark}: ${scores[mark]} wins${preferences.format === 'series' ? ' out of 3 needed' : ''}`);
    $(mark.toLowerCase()+'Label').textContent = solo ? `${mark === preferences.humanMark ? 'YOU' : 'CPU'} / ${mark}` : `PLAYER ${mark}`;
    $(mark.toLowerCase()+'ScorePanel').classList.toggle('active', phase === 'playing' && !paused() && turn === mark);
  }
  $('scoreDraw').textContent = String(scores.draws).padStart(2, '0');
  $('difficulty').disabled = $('humanMark').disabled = !solo;
  $('modeLabel').textContent = solo ? `SOLO / ${preferences.difficulty.toUpperCase()}` : '2 PLAYER / LOCAL';
  $('roundLabel').textContent = preferences.format === 'series' ? 'FIRST TO 3' : `ROUND ${String(round).padStart(2, '0')}`;
  $('setupSummary').textContent = `${solo ? '1P · '+preferences.difficulty.toUpperCase() : '2P'} · ${preferences.format === 'series' ? 'FIRST TO 3' : 'ENDLESS'}`;
  $('ready').hidden = phase !== 'ready';
  $('startLabel').textContent = screen === 'title' ? 'START' : phase === 'ready' ? 'PLAY' : matchWinner ? 'REMATCH' : phase === 'finished' ? 'NEXT ROUND' : paused() ? 'RESUME' : 'RESTART';
  $('start').setAttribute('aria-label', phase === 'playing' && !paused() ? 'Restart this round' : $('startLabel').textContent);
  let message;
  if (phase === 'ready') message = 'Waiting for start';
  else if (phase === 'finished' && !resultRevealed) message = outcome.draw ? 'Board full…' : 'Three in a row!';
  else if (matchWinner) message = `${nameOf(matchWinner).toUpperCase()} ${nameOf(matchWinner) === 'You' ? 'WIN' : 'WINS'} THE MATCH!`;
  else if (outcome.winner) message = `${nameOf(outcome.winner).toUpperCase()} ${nameOf(outcome.winner) === 'You' ? 'WIN' : 'WINS'}!`;
  else if (outcome.draw) message = 'DRAW — WELL MATCHED!';
  else if (paused()) message = 'PAUSED — close setup to resume';
  else if (hintIndex !== null) message = `Try row ${Math.floor(hintIndex/3)+1}, column ${hintIndex%3+1}`;
  else message = isComputerTurn() ? 'CPU is thinking…' : solo ? `Your turn — place ${turn}` : `Player ${turn} — your turn`;
  $('status').textContent = message;
  $('status').classList.toggle('result-text', phase === 'finished' && resultRevealed);
  const next = phase === 'finished' ? Rules.other(starter) : starter;
  $('nextStarter').textContent = matchWinner ? 'Match complete · NEW MATCH resets scores' : phase === 'finished' ? `NEXT ROUND · ${nameOf(next)} ${next === preferences.humanMark && solo ? 'start' : 'starts'} (${next})` : phase === 'ready' ? `OPENING TURN · ${nameOf('X')} (X)` : `ROUND ${round} · ${preferences.format === 'series' ? 'FIRST TO 3 WINS' : 'ENDLESS PLAY'}`;
  const showMatch = Boolean(screen === 'game' && matchWinner && resultRevealed && !$('setup').open);
  $('titleScreen').hidden = screen !== 'title';
  $('matchScreen').hidden = !showMatch;
  $('gameScreen').style.visibility = screen === 'title' || showMatch ? 'hidden' : 'visible';
  $('gameScreen').inert = screen === 'title' || showMatch;
  $('setup').hidden = screen === 'title';
  $('reset').disabled = screen === 'title';
  for (const id of ['padUp','padDown','padLeft','padRight','padPlace']) $(id).disabled = phase !== 'playing' || paused() || isComputerTurn();
  $('playTools').hidden = screen === 'title';
  $('nextStarter').hidden = screen === 'title';
  $('assistNote').hidden = screen === 'title';
  $('hint').disabled = !solo || phase !== 'playing' || paused() || isComputerTurn();
  $('undo').disabled = !solo || preferences.format !== 'endless' || !history.length || paused();
  $('assistNote').textContent = solo ? preferences.format === 'series' ? 'Hints available on your turn · Undo off in matches' : 'Practice tools · Undo takes back your turn + CPU reply' : 'Local play · Learning tools are solo only';
  if (showMatch) {
    $('matchWinner').textContent = nameOf(matchWinner) === 'You' ? 'YOU WIN!' : nameOf(matchWinner).toUpperCase() + ' WINS!';
    $('finalScore').textContent = 'X ' + scores.X + ' : ' + scores.O + ' O';
    $('matchDetail').textContent = round + ' rounds · ' + scores.draws + ' draws';
  }
  const line = $('winLine');
  if (outcome.line) {
    const first = outcome.line[0], last = outcome.line[2];
    line.setAttribute('x1', (first % 3) * 100 + 50); line.setAttribute('y1', Math.floor(first / 3) * 100 + 50);
    line.setAttribute('x2', (last % 3) * 100 + 50); line.setAttribute('y2', Math.floor(last / 3) * 100 + 50);
  }
  line.classList.toggle('visible', Boolean(outcome.line));
}
function scheduleAI() {
  if (phase !== 'playing' || paused() || !isComputerTurn() || document.hidden || aiTimer !== null) return;
  const ticket = revision;
  aiTimer = setTimeout(() => {
    aiTimer = null;
    if (ticket !== revision || phase !== 'playing' || !isComputerTurn()) return;
    makeMove(Rules.choose(board, turn, preferences.difficulty));
  }, 420);
}
function makeMove(index) {
  if (phase !== 'playing' || paused()) return;
  const next = Rules.place(board, index, turn);
  if (!next) return;
  if (!isComputerTurn() && preferences.mode === 'solo') history.push({board:[...board], turn});
  selectedCell = index;
  clearHint();
  board = next;
  const outcome = Rules.result(board);
  if (outcome.winner || outcome.draw) {
    phase = 'finished'; scores.record(outcome);
    sound(outcome.draw ? 'draw' : preferences.mode === 'solo' && outcome.winner !== preferences.humanMark ? 'lose' : 'win');
    // This timeout is cancelled by every reset; it never modifies the board.
    resultTimer = setTimeout(() => { resultTimer = null; resultRevealed = true; render(); if (!$('matchScreen').hidden) $('rematch').focus({preventScroll:true}); }, 620);
    console.log(`Round ${round}: ${outcome.winner ? outcome.winner + ' wins' : 'draw'}`, [...board]);
  } else { turn = Rules.other(turn); sound('place'); }
  render(); scheduleAI();
  if (phase === 'finished') $('start').focus({preventScroll: true});
  else if (!isComputerTurn() && document.activeElement?.classList.contains('cell')) cells.find(cell => !cell.disabled)?.focus({preventScroll: true});
}
function startRound() {
  screen = 'game'; history = [];
  $('boot').hidden = true;
  cancelAI(); clearRoundFeedback();
  if (champion()) { scores.reset(); round = 1; starter = 'X'; }
  else if (phase === 'finished') { starter = Rules.other(starter); round += 1; }
  board = Array(9).fill(''); turn = starter; phase = 'playing';
  $('setup').open = false;
  render(); sound('start');
  if (!isComputerTurn()) cells[0].focus({preventScroll: true});
  scheduleAI();
}
function freshSession() {
  screen = 'game'; history = [];
  $('boot').hidden = true;
  cancelAI(); clearRoundFeedback(); scores.reset();
  board = Array(9).fill(''); starter = turn = 'X'; round = 1; phase = 'ready';
  $('setup').open = true; render();
}
cells.forEach((cell, index) => {
  cell.addEventListener('click', () => { unlockAudio(); if (!isComputerTurn()) makeMove(index); });
  cell.addEventListener('keydown', event => {
    const directions = {ArrowRight:1, ArrowLeft:-1, ArrowDown:3, ArrowUp:-3};
    if (!(event.key in directions)) return;
    event.preventDefault(); let target = index;
    for (let step = 0; step < 9; step++) {
      target = (target + directions[event.key] + 9) % 9;
      if (!cells[target].disabled) { cells[target].focus(); break; }
    }
  });
});
$('start').addEventListener('click', () => {
  unlockAudio();
  if (screen === 'title') { freshSession(); $('mode').focus(); }
  else if (phase === 'playing' && $('setup').open) { $('setup').open = false; render(); scheduleAI(); }
  else startRound();
});
$('reset').addEventListener('click', () => { unlockAudio(); freshSession(); sound('click'); });
for (const key of ['mode','difficulty','humanMark','format']) $(key).addEventListener('change', () => {
  preferences[key] = $(key).value; savePreferences(); freshSession(); unlockAudio(); sound('click');
});
document.querySelectorAll('button[data-shell]').forEach(button => button.addEventListener('click', () => {
  preferences.shell = button.dataset.shell; savePreferences(); applyAppearance(); unlockAudio(); sound('click');
}));
// 5. NAVIGATION AND LEARNING TOOLS. None change the standard win rules.
$('volume').addEventListener('change', () => {
  preferences.sound = $('volume').value !== 'off';
  if (preferences.sound) preferences.volume = $('volume').value;
  savePreferences(); applyAppearance(); stopSound(); unlockAudio(); sound('click');
});
$('setup').addEventListener('toggle', () => {
  if (phase === 'playing') {
    if ($('setup').open) { cancelAI(); clearHint(); stopSound(); }
    render();
    if (!$('setup').open) scheduleAI();
  } else render();
});
$('hint').addEventListener('click', () => {
  if ($('hint').disabled) return;
  clearHint(); hintIndex = Rules.choose(board, turn, 'hard'); render();
  hintTimer = setTimeout(() => { clearHint(); render(); }, 2200);
});
$('undo').addEventListener('click', () => {
  if ($('undo').disabled) return;
  cancelAI(); clearRoundFeedback();
  const outcome = Rules.result(board);
  if (phase === 'finished') {
    if (outcome.winner) scores[outcome.winner] -= 1;
    else if (outcome.draw) scores.draws -= 1;
  }
  const previous = history.pop();
  board = [...previous.board]; turn = previous.turn; phase = 'playing';
  render(); cells.find(cell => !cell.disabled)?.focus({preventScroll:true});
});
function returnToTitle() {
  leaving = false;
  freshSession(); screen = 'title'; $('setup').open = false;
  render(); $('start').focus({preventScroll:true});
}
$('toTitle').addEventListener('click', () => {
  if (phase === 'playing') {
    leaving = true; cancelAI(); clearHint(); stopSound(); render();
    $('leaveDialog').showModal(); $('stay').focus();
  } else returnToTitle();
});
$('stay').addEventListener('click', () => $('leaveDialog').close());
$('leave').addEventListener('click', () => { returnToTitle(); $('leaveDialog').close(); });
$('leaveDialog').addEventListener('close', () => {
  leaving = false; render(); scheduleAI();
});
$('rematch').addEventListener('click', () => { unlockAudio(); startRound(); });
$('matchSetup').addEventListener('click', () => { freshSession(); $('mode').focus(); });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAI(); stopSound(); } else scheduleAI();
});
savePreferences(); applyAppearance(); render();
// A one-time, non-blocking boot screen. Reduced motion skips the sequence.
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) $('boot').hidden = true;
else setTimeout(() => { $('boot').hidden = true; }, 820);

// Physical controls from the reference interface use the existing controller.
$('titleStart').addEventListener('click', () => $('start').click());
$('hardwareSetup').addEventListener('click', () => {
  if (screen === 'title') { freshSession(); $('mode').focus(); }
  else { $('setup').open = !$('setup').open; if ($('setup').open) { cancelAI(); clearHint(); stopSound(); } render(); scheduleAI(); }
});
for (const [id, delta] of [['padUp',-3],['padDown',3],['padLeft',-1],['padRight',1]]) {
  $(id).addEventListener('click', () => {
    if ($(id).disabled) return;
    for (let count=0; count<9; count++) { selectedCell = (selectedCell + delta + 9) % 9; if (!board[selectedCell]) break; }
    render();
  });
}
$('padPlace').addEventListener('click', () => { if (!$('padPlace').disabled) { unlockAudio(); makeMove(selectedCell); } });
