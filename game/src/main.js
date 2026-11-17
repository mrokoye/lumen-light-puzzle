// LUMEN — boot and the one loop. One job: wire the game, the canvas
// and the DOM together, and keep them in step.
//
// ?shot=start|play|win|gauntlet stages that scene instead of running
// the loop, paints it twice at a fixed time and sets
// window.__shotReady for a screenshot.

import { createAudio } from './audio.js';
import { createGame, SCREEN_ALL, SCREEN_COMPLETE, SCREEN_LEVELS, SCREEN_PLAY, SCREEN_TITLE } from './game.js';
import { LEVELS } from './levels.js';
import { initialRotations, solve } from './beams.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const api = createGame(audio);
const { game } = api;
const renderer = createRenderer(canvas);

const hud = {
  level: document.getElementById('hud-level'),
  lanterns: document.getElementById('hud-lanterns'),
  moves: document.getElementById('hud-moves'),
  time: document.getElementById('hud-time'),
  score: document.getElementById('hud-score'),
  undo: document.getElementById('btn-undo'),
  reset: document.getElementById('btn-reset'),
  sound: document.getElementById('btn-sound'),
};
const overlays = {
  title: document.getElementById('ov-title'),
  levels: document.getElementById('ov-levels'),
  complete: document.getElementById('ov-complete'),
  all: document.getElementById('ov-all'),
};

function announce(message) {
  status.textContent = message;
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// The title screen plays a demo board behind it: Mixed Signals,
// solved one move at a time, then scrambled and solved again.
const demo = { solution: null, step: 0, nextAt: 0 };

function initDemo() {
  const level = LEVELS[5];
  game.levelIndex = 5;
  game.rotations = initialRotations(level);
  game.moves = 0;
  game.history = [];
  game.complete = null;
  demo.solution = solve(level, initialRotations(level));
  demo.step = 0;
  demo.nextAt = performance.now() + 1400;
  api.refreshBeams();
}

function advanceDemo(now) {
  if (!demo.solution || now < demo.nextAt) return;
  demo.nextAt = now + 1600;
  if (demo.step < demo.solution.states.length - 1) {
    demo.step += 1;
    const newlyLit = api.setRotations(demo.solution.states[demo.step]);
    for (const index of newlyLit) {
      const receiver = LEVELS[5].receivers[index];
      renderer.burst(receiver.x, receiver.y, receiver.color);
    }
  } else {
    demo.step = 0;
    api.setRotations(initialRotations(LEVELS[5]));
  }
}

function showTitle() {
  api.goTitle();
  initDemo();
  announce('LUMEN. Bend the light. Press Play to start.');
}

function buildLevelGrid() {
  const grid = document.getElementById('level-grid');
  grid.innerHTML = '';
  LEVELS.forEach((level, index) => {
    const entry = api.levelBest(index);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'level-btn';
    button.innerHTML = `<b>${index + 1}</b><span>${'★'.repeat(entry.stars)}${'☆'.repeat(3 - entry.stars)}</span><small>${level.name}</small>`;
    button.addEventListener('click', () => {
      audio.unlock();
      audio.click();
      api.startLevel(index);
      announce(`Level ${index + 1}, ${level.name}. ${level.sub}`);
    });
    grid.appendChild(button);
  });
}

function fillComplete() {
  const result = game.complete;
  if (!result) return;
  document.getElementById('complete-title').textContent =
    game.levelIndex + 1 >= LEVELS.length ? 'Final level complete!' : 'Level complete!';
  const stars = document.getElementById('complete-stars');
  stars.innerHTML = [0, 1, 2].map((index) =>
    `<span class="${index < result.stars ? '' : 'off'}">★</span>`).join('');
  document.getElementById('complete-lines').innerHTML = [
    ['Moves', `${result.moves} (par ${LEVELS[game.levelIndex].par})`],
    ['Time', formatTime(result.seconds)],
    ['Score', result.score.toLocaleString()],
    ['Total score', api.totalScore().toLocaleString()],
  ].map(([label, value]) => `<div class="score-line"><span>${label}</span><b>${value}</b></div>`).join('');
  document.getElementById('btn-next').textContent =
    game.levelIndex + 1 >= LEVELS.length ? 'See the finale →' : 'Next level →';
}

function syncUI() {
  const level = LEVELS[game.levelIndex];
  hud.level.textContent = `${game.levelIndex + 1} · ${level.name}`;
  hud.lanterns.textContent = `${game.lit.size} / ${level.receivers.length}`;
  hud.moves.textContent = String(game.moves);
  hud.moves.parentElement.querySelector('span').textContent = `Moves · par ${level.par}`;
  hud.score.textContent = api.totalScore().toLocaleString();
  const seconds = game.complete ? game.complete.seconds : (performance.now() - game.startedAt) / 1000;
  hud.time.textContent = formatTime(game.screen === SCREEN_PLAY ? seconds : seconds);
  hud.undo.disabled = game.screen !== SCREEN_PLAY || game.history.length === 0;
  hud.reset.disabled = game.screen !== SCREEN_PLAY;
  hud.sound.textContent = audio.muted ? '🔇' : '🔊';
  overlays.title.classList.toggle('show', game.screen === SCREEN_TITLE);
  overlays.levels.classList.toggle('show', game.screen === SCREEN_LEVELS);
  overlays.complete.classList.toggle('show', game.screen === SCREEN_COMPLETE);
  overlays.all.classList.toggle('show', game.screen === SCREEN_ALL);
  if (game.screen === SCREEN_COMPLETE) fillComplete();
  if (game.screen === SCREEN_ALL) {
    document.getElementById('all-score').textContent = api.totalScore().toLocaleString();
  }
}

const input = createInput(canvas, {
  boardRect: () => renderer.boardRect(),
  unlockAudio: () => audio.unlock(),
  onCell(x, y) {
    if (game.screen !== SCREEN_PLAY) return;
    const before = new Set(game.lit);
    if (api.rotateAt(x, y)) {
      for (const index of game.lit) {
        if (!before.has(index)) {
          const receiver = LEVELS[game.levelIndex].receivers[index];
          renderer.burst(receiver.x, receiver.y, receiver.color);
        }
      }
    }
  },
  onUndo: () => api.undo(),
  onReset: () => api.resetLevel(),
  onMute: () => {
    audio.toggleMuted();
    syncUI();
  },
  onEscape: () => {
    if (game.screen === SCREEN_PLAY || game.screen === SCREEN_COMPLETE) {
      buildLevelGrid();
      api.goLevels();
    }
  },
});

document.getElementById('btn-play').addEventListener('click', () => {
  audio.unlock();
  audio.click();
  const firstUnfinished = LEVELS.findIndex((_, index) => api.levelBest(index).stars === 0);
  api.startLevel(firstUnfinished === -1 ? 0 : firstUnfinished);
  announce(`Level ${game.levelIndex + 1}, ${LEVELS[game.levelIndex].name}.`);
});
document.getElementById('btn-levels').addEventListener('click', () => {
  audio.click();
  buildLevelGrid();
  api.goLevels();
});
document.getElementById('btn-levels-back').addEventListener('click', () => {
  audio.click();
  showTitle();
});
document.getElementById('btn-next').addEventListener('click', () => {
  audio.click();
  api.nextLevel();
  announce(`Level ${game.levelIndex + 1}, ${LEVELS[game.levelIndex].name}.`);
});
document.getElementById('btn-replay').addEventListener('click', () => {
  audio.click();
  api.startLevel(game.levelIndex);
});
document.getElementById('btn-complete-menu').addEventListener('click', () => {
  audio.click();
  showTitle();
});
document.getElementById('btn-again').addEventListener('click', () => {
  audio.click();
  api.startLevel(0);
});
document.getElementById('btn-all-menu').addEventListener('click', () => {
  audio.click();
  showTitle();
});
hud.undo.addEventListener('click', () => api.undo());
hud.reset.addEventListener('click', () => api.resetLevel());
hud.sound.addEventListener('click', () => {
  audio.toggleMuted();
  syncUI();
});
document.getElementById('btn-menu').addEventListener('click', () => showTitle());

// A clicked button keeps focus, and Space would click it again while
// the player means to rotate a piece: drop focus after every click.
document.addEventListener('click', (event) => {
  if (event.target instanceof HTMLButtonElement) event.target.blur();
});

function renderState(now) {
  return {
    level: LEVELS[game.levelIndex],
    rotations: game.rotations,
    paths: game.paths,
    lit: game.lit,
    hover: input.hover,
    cursor: input.cursor,
    instant: Boolean(shot),
  };
}

function runShot(name) {
  stageShot(name, api);
  syncUI();
  // Paint twice at a fixed time so tweens settle and pulses land
  // identically, then signal the screenshot.
  let painted = 0;
  function paint() {
    renderer.draw(renderState(1200), 1200, 0.016);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  initDemo();
  announce('LUMEN. Bend the light. Press Play to start.');
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (game.screen === SCREEN_TITLE) advanceDemo(now);
    renderer.draw(renderState(now), now, dt);
    syncUI();
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
