// LUMEN — screenshot scenes behind ?shot=start|play|win|gauntlet.
//
// Each scene plays the real rules forward from a fresh board, steered
// by the solver: the play and gauntlet scenes stop one move short of
// the solution (beams lit, lanterns still waiting), the win scene
// plays the solution through to the level-complete screen. A frame is
// what a short game really looks like, and the same scene always gives
// the same frame.

import { LEVELS } from './levels.js';
import { initialRotations, solve } from './beams.js';
import { SCREEN_COMPLETE, SCREEN_PLAY, SCREEN_TITLE } from './game.js';

// Which level each scene shows, and how many solver steps short of the
// solution it stops (0 means it plays the whole solution).
const SCENES = {
  start: { level: 5, stopShort: 3 },
  play: { level: 7, stopShort: 1 },
  win: { level: 4, stopShort: 0 },
  gauntlet: { level: 10, stopShort: 1 },
};

/**
 * Stage the named scene on `api` (the game object from createGame) and
 * return the screen to show over it. Any other name stages the title.
 */
export function stageShot(name, api) {
  const scene = SCENES[name] || SCENES.start;
  const level = LEVELS[scene.level];
  api.startLevel(scene.level);
  const solution = solve(level, initialRotations(level));
  if (solution) {
    const steps = solution.states.slice(1, solution.states.length - scene.stopShort);
    for (const state of steps) {
      api.setRotations(state);
      api.game.moves += 1;
    }
  }
  if (scene.stopShort === 0 && solution) {
    // Play the final move through the real rules so the win overlay,
    // stars and score are exactly what a player would see.
    const last = solution.states[solution.states.length - 1];
    const before = solution.states[solution.states.length - 2] || initialRotations(level);
    const changed = last.findIndex((rot, index) => rot !== before[index]);
    api.setRotations(before);
    api.game.moves = solution.moves - 1;
    const piece = level.rotatables[changed];
    api.rotateAt(piece.x, piece.y);
    return { screen: SCREEN_COMPLETE };
  }
  if (name === 'start') {
    api.goTitle();
    // The title keeps this half-solved board behind it as its backdrop.
    api.game.demoLevel = scene.level;
    return { screen: SCREEN_TITLE };
  }
  return { screen: SCREEN_PLAY };
}
