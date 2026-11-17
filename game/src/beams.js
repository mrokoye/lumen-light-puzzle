// LUMEN — beam tracing and the level solver. Pure logic, no DOM: the
// game, the screenshots and the Node tests all trace through here.
//
// A beam walks cell to cell. It stops at a wall, an emitter, a receiver
// (which it lights when its colour matches), or the board's edge. A
// mirror turns it 90 degrees, a filter recolours it, and a splitter
// keeps it going straight while also branching off in the direction it
// faces. A (cell, direction, colour) visited set stops loops.

import { COLS, ROWS, DX, DY, OPPOSITE } from './config.js';

/** '/' mirror: north<->east, south<->west. '\' mirror: north<->west, south<->east. */
export function reflect(dir, rot) {
  if (rot === 0) return [1, 0, 3, 2][dir];
  return [3, 2, 1, 0][dir];
}

/** Index a piece by its cell so tracing is a map lookup. */
export function pieceMap(level) {
  const map = new Map();
  const put = (piece) => map.set(piece.y * COLS + piece.x, piece);
  for (const piece of level.emitters) put({ ...piece, type: 'emitter' });
  level.receivers.forEach((piece, index) => put({ ...piece, type: 'receiver', index }));
  for (const piece of level.mirrors) put({ ...piece, type: 'mirror' });
  for (const piece of level.splitters) put({ ...piece, type: 'splitter' });
  for (const piece of level.filters) put({ ...piece, type: 'filter' });
  for (const piece of level.walls) put({ ...piece, type: 'wall' });
  return map;
}

function key(x, y, dir, color) {
  return `${x},${y},${dir},${color}`;
}

/**
 * Trace every beam of a level. `rotations` overrides the rot of any
 * rotatable piece by its index in level.rotatables (mirrors then
 * splitters, in level order). Returns the drawn beam paths — each a list
 * of grid points from its emitter to where it ends — and the set of
 * receiver indexes lit.
 */
export function traceBeams(level, rotations) {
  const map = pieceMap(level);
  const rotByKey = new Map();
  if (rotations) {
    level.rotatables.forEach((piece, index) => {
      rotByKey.set(piece.y * COLS + piece.x, rotations[index]);
    });
  }
  const rotOf = (piece) => {
    const override = rotByKey.get(piece.y * COLS + piece.x);
    return override === undefined ? piece.rot : override;
  };

  const paths = [];
  const lit = new Set();
  const visited = new Set();
  // A stack of beams still to walk: [x, y, dir, color, path points].
  const queue = level.emitters.map((emitter) => [
    emitter.x,
    emitter.y,
    emitter.dir,
    emitter.color,
    [{ x: emitter.x, y: emitter.y }],
  ]);

  while (queue.length > 0) {
    let [x, y, dir, color, path] = queue.pop();
    for (;;) {
      const nx = x + DX[dir];
      const ny = y + DY[dir];
      // Leaving the board: the beam ends at the board's edge.
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) {
        path.push({ x: x + DX[dir] * 0.5, y: y + DY[dir] * 0.5, edge: true });
        paths.push({ points: path, color });
        break;
      }
      const seen = key(nx, ny, dir, color);
      if (visited.has(seen)) {
        paths.push({ points: path, color });
        break;
      }
      visited.add(seen);
      x = nx;
      y = ny;
      path.push({ x, y });
      const piece = map.get(y * COLS + x);
      if (!piece) continue;
      if (piece.type === 'wall' || piece.type === 'emitter') {
        paths.push({ points: path, color });
        break;
      }
      if (piece.type === 'receiver') {
        if (piece.color === color) lit.add(piece.index);
        paths.push({ points: path, color });
        break;
      }
      if (piece.type === 'filter') {
        color = piece.color;
        continue;
      }
      if (piece.type === 'mirror') {
        dir = reflect(dir, rotOf(piece));
        continue;
      }
      if (piece.type === 'splitter') {
        const branch = rotOf(piece);
        // The beam goes straight on; it also branches toward the facing,
        // unless that is straight ahead (same beam twice) or straight back.
        if (branch !== dir && branch !== OPPOSITE[dir]) {
          queue.push([x, y, branch, color, [{ x, y }]]);
        }
        continue;
      }
    }
  }
  return { paths, lit };
}

/** The rotation state of a level: mirrors (0/1) then splitters (0..3). */
export function initialRotations(level) {
  return level.rotatables.map((piece) => piece.rot);
}

export function isSolved(level, rotations) {
  return traceBeams(level, rotations).lit.size === level.receivers.length;
}

/**
 * Breadth-first search over rotations: the fewest clicks (one click
 * rotates one piece one step) from `start` to a state where every
 * receiver is lit. Returns { moves, states } — the move count and the
 * rotation states along the shortest path — or null when unsolvable.
 */
export function solve(level, start) {
  const rotatables = level.rotatables;
  const sizes = rotatables.map((piece) => (piece.type === 'mirror' ? 2 : 4));
  const encode = (state) => state.join(',');
  const startKey = encode(start);
  const seen = new Map([[startKey, null]]);
  const queue = [start];
  while (queue.length > 0) {
    const state = queue.shift();
    if (isSolved(level, state)) {
      const states = [];
      let cursor = encode(state);
      while (cursor !== null) {
        states.unshift(cursor.split(',').map(Number));
        cursor = seen.get(cursor);
      }
      return { moves: states.length - 1, states };
    }
    for (let index = 0; index < state.length; index += 1) {
      const next = state.slice();
      next[index] = (next[index] + 1) % sizes[index];
      const nextKey = encode(next);
      if (!seen.has(nextKey)) {
        seen.set(nextKey, encode(state));
        queue.push(next);
      }
    }
  }
  return null;
}

/** A seeded random stream (mulberry32) so staged scenes are identical every run. */
export function createSeededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
