// LUMEN — the game itself. One job: the rules and the score.
//
// The state machine moves between five screens: title, level select,
// play, level complete, and all complete. A level is won the moment
// every lantern is lit at once. Moves count clicks that rotate a piece;
// undo steps back through them; reset returns to the scrambled board.
// Stars and scores persist in localStorage, per level.

import { LEVELS } from './levels.js';
import { initialRotations, isSolved, traceBeams } from './beams.js';
import { SCORE, STORAGE_KEY } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_LEVELS = 'levels';
export const SCREEN_PLAY = 'play';
export const SCREEN_COMPLETE = 'complete';
export const SCREEN_ALL = 'all';

function loadBest() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveBest(best) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(best));
  } catch {
    // Storage can be off: bests then last this visit only.
  }
}

/** Stars from moves against par: 3 at par, 2 within par + 3, else 1. */
export function starsFor(moves, par) {
  if (moves <= par) return 3;
  if (moves <= par + SCORE.movesSlack) return 2;
  return 1;
}

/** Score for a finished level: stars, a speed bonus, a moves bonus. */
export function scoreFor(stars, seconds, moves, par) {
  const speed = Math.max(0, SCORE.speedBase - Math.floor(seconds) * SCORE.speedPerSecond);
  const movesBonus = Math.max(0, SCORE.movesBonusSlack + par - moves) * SCORE.movesBonusEach;
  return stars * SCORE.perStar + speed + movesBonus;
}

export function createGame(audio) {
  const best = loadBest();
  const game = {
    screen: SCREEN_TITLE,
    levelIndex: 0,
    rotations: [],
    moves: 0,
    history: [],
    startedAt: 0,
    elapsed: 0,
    lit: new Set(),
    paths: [],
    complete: null,
    best,
    demo: null,
  };

  function totalScore() {
    return Object.values(game.best).reduce((sum, entry) => sum + (entry.score || 0), 0);
  }

  function levelBest(index) {
    return game.best[index] || { stars: 0, score: 0 };
  }

  function startLevel(index) {
    const level = LEVELS[index];
    game.levelIndex = index;
    game.rotations = initialRotations(level);
    game.moves = 0;
    game.history = [];
    game.startedAt = performance.now();
    game.elapsed = 0;
    game.complete = null;
    game.screen = SCREEN_PLAY;
    refreshBeams();
  }

  function refreshBeams() {
    const level = LEVELS[game.levelIndex];
    const { paths, lit } = traceBeams(level, game.rotations);
    const newlyLit = [...lit].filter((index) => !game.lit.has(index));
    game.paths = paths;
    game.lit = lit;
    return newlyLit;
  }

  /** Set the rotation state directly (used by the demo and the screenshots). */
  function setRotations(state) {
    game.rotations = state.slice();
    return refreshBeams();
  }

  /** Rotate the piece in `cell` one step; returns false when it cannot turn. */
  function rotateAt(x, y) {
    if (game.screen !== SCREEN_PLAY || game.complete) return false;
    const level = LEVELS[game.levelIndex];
    const index = level.rotatables.findIndex((piece) => piece.x === x && piece.y === y);
    if (index === -1) return false;
    game.history.push(game.rotations.slice());
    const sizes = level.rotatables.map((piece) => (piece.type === 'mirror' ? 2 : 4));
    game.rotations[index] = (game.rotations[index] + 1) % sizes[index];
    game.moves += 1;
    const newlyLit = refreshBeams();
    if (newlyLit.length > 0) audio.lit();
    else audio.rotate();
    if (isSolved(level, game.rotations)) finishLevel();
    return true;
  }

  function undo() {
    if (game.screen !== SCREEN_PLAY || game.history.length === 0 || game.complete) return false;
    game.rotations = game.history.pop();
    game.moves = Math.max(0, game.moves - 1);
    refreshBeams();
    audio.undo();
    return true;
  }

  function resetLevel() {
    if (game.screen !== SCREEN_PLAY) return;
    startLevel(game.levelIndex);
    audio.click();
  }

  function finishLevel() {
    const level = LEVELS[game.levelIndex];
    game.elapsed = (performance.now() - game.startedAt) / 1000;
    const stars = starsFor(game.moves, level.par);
    const score = scoreFor(stars, game.elapsed, game.moves, level.par);
    const previous = levelBest(game.levelIndex);
    if (score > previous.score) {
      game.best[game.levelIndex] = { stars, score };
      saveBest(game.best);
    }
    game.complete = { stars, score, moves: game.moves, seconds: game.elapsed };
    audio.win();
    game.screen = SCREEN_COMPLETE;
  }

  /** Advance from a finished level: next level, or the all-complete screen. */
  function nextLevel() {
    if (game.levelIndex + 1 < LEVELS.length) startLevel(game.levelIndex + 1);
    else game.screen = SCREEN_ALL;
  }

  function goTitle() {
    game.screen = SCREEN_TITLE;
    game.complete = null;
  }

  function goLevels() {
    game.screen = SCREEN_LEVELS;
    game.complete = null;
  }

  return {
    game,
    LEVELS,
    totalScore,
    levelBest,
    startLevel,
    rotateAt,
    setRotations,
    undo,
    resetLevel,
    nextLevel,
    goTitle,
    goLevels,
    refreshBeams,
  };
}
