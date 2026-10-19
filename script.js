'use strict';
/* GRID DUEL — POCKET CONSOLE
   Study 1: rules and scores. Study 2: AI. Study 3: screen and events.
   No libraries, server, database, or special game modes are needed. */

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

// 3. CONTROLLER: connects rules to the buttons and screen.
const $ = id => document.getElementById(id);
const cells = [...document.querySelectorAll('.cell')];
const scores = new Rules.ScoreBoard();
const icons = {
  X: '<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M10 10L50 50M50 10L10 50"/></svg>',
  O: '<svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="23"/></svg>'
};
let board = Array(9).fill('');
let turn = 'X';
let starter = 'X';
let round = 1;
let phase = 'ready'; // ready, playing, or finished
let aiTimer = null;
let revision = 0; // Makes callbacks from an old round harmless.
const isComputerTurn = () => $('mode').value === 'solo' && turn === 'O';

function cancelAI() {
  clearTimeout(aiTimer);
  aiTimer = null;
  revision += 1;
}
function render() {
  const outcome = Rules.result(board);
  cells.forEach((cell, index) => {
    const mark = board[index];
    // Only rebuild a changed mark, so existing marks do not animate again.
    if (cell.dataset.mark !== mark) { cell.innerHTML = icons[mark] || ''; cell.dataset.mark = mark; }
    cell.disabled = phase !== 'playing' || Boolean(mark) || isComputerTurn();
    cell.classList.toggle('winner', Boolean(outcome.line?.includes(index)));
    cell.setAttribute('aria-label', `Row ${Math.floor(index / 3) + 1}, column ${index % 3 + 1}, ${mark || 'empty'}${outcome.line?.includes(index) ? ', winning square' : ''}`);
  });
  $('scoreX').textContent = String(scores.X).padStart(2, '0');
  $('scoreO').textContent = String(scores.O).padStart(2, '0');
  $('scoreDraw').textContent = String(scores.draws).padStart(2, '0');
  const solo = $('mode').value === 'solo';
  $('xLabel').textContent = solo ? 'YOU / X' : 'PLAYER X';
  $('oLabel').textContent = solo ? 'CPU / O' : 'PLAYER O';
  $('difficulty').disabled = !solo;
  $('modeLabel').textContent = solo ? `SOLO / ${$('difficulty').value.toUpperCase()}` : '2 PLAYER / LOCAL';
  $('roundLabel').textContent = `ROUND ${String(round).padStart(2, '0')}`;
  $('xScorePanel').classList.toggle('active', phase === 'playing' && turn === 'X');
  $('oScorePanel').classList.toggle('active', phase === 'playing' && turn === 'O');
  $('ready').hidden = phase !== 'ready';
  $('startLabel').textContent = phase === 'ready' ? 'START' : phase === 'finished' ? 'NEXT ROUND' : 'RESTART';
  $('start').setAttribute('aria-label', phase === 'playing' ? 'Restart this round' : $('startLabel').textContent);
  if (phase === 'ready') $('status').textContent = 'Waiting for start';
  else if (outcome.winner) $('status').textContent = solo ? (outcome.winner === 'X' ? 'You win! Nice play.' : 'CPU wins. Try again!') : `Player ${outcome.winner} wins!`;
  else if (outcome.draw) $('status').textContent = 'A draw. Well matched!';
  else $('status').textContent = isComputerTurn() ? 'CPU is thinking…' : solo ? 'Your turn — place X' : `Player ${turn} — your turn`;
  const line = $('winLine');
  if (outcome.line) {
    const first = outcome.line[0], last = outcome.line[2];
    line.setAttribute('x1', (first % 3) * 100 + 50);
    line.setAttribute('y1', Math.floor(first / 3) * 100 + 50);
    line.setAttribute('x2', (last % 3) * 100 + 50);
    line.setAttribute('y2', Math.floor(last / 3) * 100 + 50);
  }
  line.classList.toggle('visible', Boolean(outcome.line));
}
function scheduleAI() {
  if (phase !== 'playing' || !isComputerTurn() || document.hidden || aiTimer !== null) return;
  const ticket = revision;
  aiTimer = setTimeout(() => {
    aiTimer = null;
    if (ticket !== revision || phase !== 'playing' || !isComputerTurn()) return;
    makeMove(Rules.choose(board, turn, $('difficulty').value));
  }, 420);
}
function makeMove(index) {
  if (phase !== 'playing') return;
  const next = Rules.place(board, index, turn);
  if (!next) return;
  board = next;
  const outcome = Rules.result(board);
  if (outcome.winner || outcome.draw) {
    phase = 'finished';
    scores.record(outcome);
    console.log(`Round ${round}: ${outcome.winner ? outcome.winner + ' wins' : 'draw'}`, [...board]);
  } else turn = Rules.other(turn);
  render();
  scheduleAI();
  // Keep keyboard play moving even when the selected cell becomes disabled.
  if (phase === 'finished') $('start').focus({preventScroll: true});
  else if (!isComputerTurn() && document.activeElement?.classList.contains('cell')) cells.find(cell => !cell.disabled)?.focus({preventScroll: true});
}
function startRound() {
  cancelAI();
  if (phase === 'finished') { starter = Rules.other(starter); round += 1; }
  board = Array(9).fill('');
  turn = starter;
  phase = 'playing';
  $('setup').open = false;
  render();
  if (!isComputerTurn()) cells[0].focus({preventScroll: true});
  scheduleAI();
}
function freshSession() {
  cancelAI();
  scores.reset();
  board = Array(9).fill('');
  starter = turn = 'X';
  round = 1;
  phase = 'ready';
  $('setup').open = true;
  render();
}
cells.forEach((cell, index) => {
  cell.addEventListener('click', () => { if (!isComputerTurn()) makeMove(index); });
  cell.addEventListener('keydown', event => {
    const directions = {ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3};
    if (!(event.key in directions)) return;
    event.preventDefault();
    let target = index;
    for (let step = 0; step < 9; step++) {
      target = (target + directions[event.key] + 9) % 9;
      if (!cells[target].disabled) { cells[target].focus(); break; }
    }
  });
});
$('start').addEventListener('click', startRound);
$('reset').addEventListener('click', freshSession);
$('mode').addEventListener('change', freshSession);
$('difficulty').addEventListener('change', freshSession);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) cancelAI();
  else scheduleAI();
});
render();
