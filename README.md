# Grid Duel — Pocket Console

A classic tic-tac-toe game inside the burgundy handheld design from grid_duel_pocket_console_edition.html, with optional cream and charcoal shells. This is independent of the original cyberpunk game.

## Open and play
Double-click index.html. Keep index.html, style.css, and script.js together. No installation, server, or account is required. The reference design uses the Google Fonts Share Tech Mono and Cinzel; these need an internet connection on first load. Offline play still works with fallback fonts.

The brief boot display leads to a dedicated title screen. START opens setup without starting a round. Choose players, CPU level, your mark, and match format, then press PLAY. In solo mode, choosing O lets the CPU play X first. The starter alternates after every completed round, including draws.

Connect three marks across, down, or diagonally. A full board without a winning line is a draw. Marks stay until the round ends.

## Controls and navigation
- GAME SETUP pauses an active round, including a pending CPU move. Close setup or press RESUME to continue. Changing a gameplay option clears the session and waits for PLAY.
- RESTART retries the current round with the same starter and keeps completed scores.
- NEXT ROUND clears the board and alternates the starter.
- RESET SCORES clears scores and returns to setup.
- TITLE returns to the title screen and clears the session. During an unfinished round, a confirmation offers KEEP PLAYING or RETURN TO TITLE. Escape cancels the confirmation.
- Shell color and sound changes preserve the current board and scores.

## Formats
Endless rounds keeps a running tally of X wins, O wins, and draws.
First to 3 wins ends when either player earns three round wins. Draws do not count toward the target. Three small squares under each player's score show progress. The match result screen shows the winner and final score. REMATCH starts a new match with X; SETUP lets you configure a fresh session.

## Learning tools
HINT is available during your turn in solo play. It outlines a move selected by Hard AI for 2.2 seconds and announces its row and column. It never places a mark or changes the board.

UNDO is available only in endless solo play. It restores the position before your most recent move, removing the CPU's reply too. If the CPU has not replied yet, its pending move is cancelled. You can also undo a completed round before starting the next one; that round's score is rolled back. Repeated undo steps back through earlier human turns. A CPU opening move by itself cannot be undone. Undo is disabled in first-to-three matches and local two-player games.

## Difficulty
Easy chooses a random empty square. Medium takes an immediate win or blocks an immediate loss; otherwise it plays randomly. Hard uses minimax to examine remaining moves and cannot be beaten with legal play. A draw against Hard is a good result.

## Presentation and preferences
The LCD includes static CRT scanlines, a small title demonstration, an active-turn arrow, gentle placement animation, synchronized winning-mark blinks, and a winning line. Ordinary results leave the board visible; match results use their own LCD screen.

Sound offers Off, Low, and Normal. Short beeps and melodies are generated with Web Audio after user interaction. Audio is optional; unavailable audio support does not prevent play. Hidden pages stop sounds and pause the CPU.

Mode, difficulty, chosen mark, format, shell, and audio preferences are saved locally when browser storage permits. Scores and unfinished rounds are not saved. Reloading always returns to the title screen.

Use mouse, touch, or Tab and Enter/Space. Arrow keys navigate available board squares. Labels describe each square and the live status announces turns, hints, and results. Reduced-motion preferences disable animations and skip the boot sequence.

## Study order
1. index.html — title and result screens, nine board buttons, settings, and controls.
2. script.js section 1 — board arrays, winning lines, legal moves, and ScoreBoard class.
3. script.js section 2 — difficulty levels and recursive minimax.
4. script.js section 3 — validated preferences and optional audio.
5. script.js section 4 — state, rendering, rounds, match scores, and timers.
6. script.js section 5 — navigation, pause, hints, and undo.
7. style.css — shell, LCD, responsive controls, animations, and color variants.

## Logic in simple terms
The board array holds nine strings: empty, X, or O. Rules.place copies that array for a legal move, or returns null for an illegal move. Rules.result checks eight winning lines, then checks for a draw. The controller records each completed round once and blocks additional moves.

The phase tracks ready, playing, or finished. The screen tracks title or game; the finished-match view is derived from the scores. The paused function checks whether setup or the title confirmation is open, or whether the game screen is inactive. Both board input and CPU scheduling obey that check.

A revision number invalidates old CPU callbacks after resets and pauses. Result and hint timers are also cancelled during resets. Undo stores a copied board and current turn immediately before each human move, then restores that snapshot when requested. Returning from a completed round also reverses its recorded result.

## Project concepts
Variables: board, turn, phase. Conditionals: validation and results. Loops: winning lines and minimax. Functions: place, result, choose, render. Data structures: arrays and objects. Higher-order functions: map, filter, every, find. OOP: ScoreBoard constructor, reset, record. Output: visible UI and console.log after completed rounds.

## Scope
Standard 3 × 3 rules only. No Vanishing Marks, comeback mechanics, lightning, flames, board destruction, accounts, or database. Learning aids and first-to-three scoring are optional additions around the classic rules.

## Reference interface update
The burgundy shell, gold lettering, dark green LCD, colored marks, floating neon symbols, bezel, hardware buttons, and speaker slots come from the supplied reference design. SETUP opens the existing options drawer and pauses an active round. The D-pad selects an empty square; press its center to place your mark, or click/tap a square directly. All previous gameplay, hints, undo, matches, sound levels, and saved options remain available. The original reference file in Downloads is unchanged.
