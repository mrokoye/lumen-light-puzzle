// LUMEN — configuration: board size, palette, directions, scoring.
// One job: every number and colour the rest of the game agrees on.

// The board is always 9 columns by 7 rows; levels place pieces on it.
export const COLS = 9;
export const ROWS = 7;

// Directions: 0 north, 1 east, 2 south, 3 west. Beams only ever travel
// along these four, so every reflection is a 90-degree turn.
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];
export const OPPOSITE = [2, 3, 0, 1];

// Beam colours. 'W' is white light: filters recolour it, prisms split it.
export const COLORS = {
  R: '#ff5470',
  G: '#3ddc84',
  B: '#4da6ff',
  W: '#ffe9a8',
};
export const COLOR_NAMES = { R: 'red', G: 'green', B: 'blue', W: 'white' };
export const COLOR_GLOW = {
  R: 'rgba(255, 84, 112, 0.55)',
  G: 'rgba(61, 220, 132, 0.55)',
  B: 'rgba(77, 166, 255, 0.55)',
  W: 'rgba(255, 233, 168, 0.55)',
};

// The look: deep indigo night, warm gold for anything the player owns.
export const PALETTE = {
  background: '#0b1026',
  backgroundEdge: '#070a1a',
  board: '#121936',
  boardEdge: '#232c52',
  cell: '#171f42',
  cellAlt: '#141a38',
  gridLine: 'rgba(120, 140, 255, 0.10)',
  text: '#eef1ff',
  textDim: '#9aa5d1',
  gold: '#ffd166',
  goldDim: '#b98a2e',
  panel: 'rgba(10, 14, 34, 0.82)',
  panelEdge: 'rgba(255, 209, 102, 0.35)',
  danger: '#ff5470',
  ok: '#3ddc84',
};

// Scoring: a level is worth 300 per star, plus a speed bonus and a
// bonus for finishing close to par. Stars: 3 at par, 2 within par + 3.
export const SCORE = {
  perStar: 300,
  speedBase: 600,
  speedPerSecond: 10,
  movesSlack: 3,
  movesBonusEach: 50,
  movesBonusSlack: 5,
};

// How long a mirror takes to swing when clicked, and how long a newly
// lit lantern celebrates before the win overlay appears.
export const TIMING = {
  rotateMs: 160,
  litBurstMs: 900,
  winDelayMs: 1100,
  starMs: 450,
};

export const STORAGE_KEY = 'lumen-best-v1';
export const SOUND_KEY = 'lumen-sound-v1';
