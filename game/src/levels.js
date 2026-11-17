// LUMEN — the twelve levels. One job: the boards.
//
// Each level names its emitters, receivers, mirrors, splitters, filters
// and walls. A mirror's `rot` is 0 for '/' and 1 for '\'; a splitter's
// `rot` is the compass direction it branches toward (0 north, 1 east,
// 2 south, 3 west). Every level was designed solved and then scrambled,
// so the solver can confirm it is winnable and set its par.
//
// Directions: 0 north, 1 east, 2 south, 3 west. Colours: R, G, B, W.

function build(def) {
  const level = {
    name: def.name,
    sub: def.sub,
    par: def.par,
    emitters: def.emitters,
    receivers: def.receivers,
    mirrors: def.mirrors || [],
    splitters: def.splitters || [],
    filters: def.filters || [],
    walls: def.walls || [],
  };
  // Rotatable pieces, mirrors first then splitters, in level order:
  // this is the order rotation states are stored in.
  level.rotatables = [
    ...level.mirrors.map((piece) => ({ ...piece, type: 'mirror' })),
    ...level.splitters.map((piece) => ({ ...piece, type: 'splitter' })),
  ];
  return level;
}

export const LEVELS = [
  build({
    name: 'First Light',
    sub: 'Click the mirror to turn the beam. Light the lantern.',
    par: 1,
    emitters: [{ x: 0, y: 3, dir: 1, color: 'R' }],
    receivers: [{ x: 4, y: 0, color: 'R' }],
    mirrors: [{ x: 4, y: 3, rot: 1 }],
  }),
  build({
    name: 'Two Turns',
    sub: 'Two mirrors, one path. Bend the beam around the corner.',
    par: 2,
    emitters: [{ x: 0, y: 1, dir: 1, color: 'G' }],
    receivers: [{ x: 8, y: 5, color: 'G' }],
    mirrors: [
      { x: 4, y: 1, rot: 0 },
      { x: 4, y: 5, rot: 0 },
    ],
  }),
  build({
    name: 'Around the Wall',
    sub: 'The direct road is blocked. Go around, not through.',
    par: 4,
    emitters: [{ x: 0, y: 3, dir: 1, color: 'B' }],
    receivers: [{ x: 8, y: 3, color: 'B' }],
    mirrors: [
      { x: 2, y: 3, rot: 0 },
      { x: 2, y: 5, rot: 0 },
      { x: 6, y: 5, rot: 1 },
      { x: 6, y: 3, rot: 1 },
    ],
    walls: [{ x: 4, y: 3 }],
  }),
  build({
    name: 'Split Decision',
    sub: 'A splitter sends one beam two ways. Feed both lanterns.',
    par: 1,
    emitters: [{ x: 4, y: 6, dir: 0, color: 'R' }],
    receivers: [
      { x: 4, y: 0, color: 'R' },
      { x: 8, y: 3, color: 'R' },
    ],
    splitters: [{ x: 4, y: 3, rot: 0 }],
  }),
  build({
    name: 'True Colours',
    sub: 'White light through a red filter comes out red.',
    par: 2,
    emitters: [{ x: 0, y: 3, dir: 1, color: 'W' }],
    receivers: [{ x: 8, y: 1, color: 'R' }],
    mirrors: [
      { x: 2, y: 3, rot: 1 },
      { x: 2, y: 1, rot: 1 },
    ],
    filters: [{ x: 5, y: 1, color: 'R' }],
  }),
  build({
    name: 'Mixed Signals',
    sub: 'Two beams cross the board. Keep red and green apart.',
    par: 6,
    emitters: [
      { x: 0, y: 3, dir: 1, color: 'R' },
      { x: 8, y: 3, dir: 3, color: 'G' },
    ],
    receivers: [
      { x: 4, y: 0, color: 'R' },
      { x: 4, y: 6, color: 'G' },
    ],
    mirrors: [
      { x: 2, y: 3, rot: 1 },
      { x: 2, y: 1, rot: 1 },
      { x: 4, y: 1, rot: 1 },
      { x: 6, y: 3, rot: 1 },
      { x: 6, y: 5, rot: 1 },
      { x: 4, y: 5, rot: 1 },
    ],
  }),
  build({
    name: 'The Long Way',
    sub: 'Four mirrors, one long road. Plan the whole route first.',
    par: 4,
    emitters: [{ x: 0, y: 6, dir: 1, color: 'B' }],
    receivers: [{ x: 8, y: 0, color: 'B' }],
    mirrors: [
      { x: 2, y: 6, rot: 1 },
      { x: 2, y: 2, rot: 1 },
      { x: 6, y: 2, rot: 1 },
      { x: 6, y: 0, rot: 1 },
    ],
    walls: [
      { x: 4, y: 3 },
      { x: 5, y: 3 },
    ],
  }),
  build({
    name: 'Double Split',
    sub: 'One white beam, three lanterns. Split it twice.',
    par: 2,
    emitters: [{ x: 4, y: 6, dir: 0, color: 'W' }],
    receivers: [
      { x: 4, y: 0, color: 'W' },
      { x: 0, y: 2, color: 'W' },
      { x: 8, y: 4, color: 'W' },
    ],
    splitters: [
      { x: 4, y: 4, rot: 0 },
      { x: 4, y: 2, rot: 2 },
    ],
  }),
  build({
    name: 'Colour Lab',
    sub: 'Split the beam, then dye each half its own colour.',
    par: 1,
    emitters: [{ x: 0, y: 3, dir: 1, color: 'W' }],
    receivers: [
      { x: 8, y: 3, color: 'R' },
      { x: 4, y: 0, color: 'G' },
    ],
    filters: [
      { x: 2, y: 3, color: 'R' },
      { x: 4, y: 1, color: 'G' },
    ],
    splitters: [{ x: 4, y: 3, rot: 3 }],
  }),
  build({
    name: 'Crossfire',
    sub: 'Two beams weave through each other. Mind the crossings.',
    par: 8,
    emitters: [
      { x: 0, y: 1, dir: 1, color: 'R' },
      { x: 8, y: 1, dir: 3, color: 'G' },
    ],
    receivers: [
      { x: 8, y: 5, color: 'R' },
      { x: 0, y: 5, color: 'G' },
    ],
    mirrors: [
      { x: 3, y: 1, rot: 0 },
      { x: 3, y: 4, rot: 0 },
      { x: 6, y: 4, rot: 0 },
      { x: 6, y: 5, rot: 0 },
      { x: 5, y: 1, rot: 1 },
      { x: 5, y: 3, rot: 1 },
      { x: 2, y: 3, rot: 1 },
      { x: 2, y: 5, rot: 1 },
    ],
  }),
  build({
    name: 'The Gauntlet',
    sub: 'Filter it, split it, dye it again. Every piece earns its place.',
    par: 3,
    emitters: [{ x: 0, y: 6, dir: 1, color: 'W' }],
    receivers: [
      { x: 8, y: 6, color: 'B' },
      { x: 7, y: 0, color: 'R' },
    ],
    filters: [
      { x: 2, y: 6, color: 'B' },
      { x: 6, y: 3, color: 'R' },
    ],
    splitters: [{ x: 4, y: 6, rot: 3 }],
    mirrors: [
      { x: 4, y: 3, rot: 1 },
      { x: 7, y: 3, rot: 1 },
    ],
  }),
  build({
    name: 'Grand Finale',
    sub: 'Everything you have learned, on one board. Light them all.',
    par: 5,
    emitters: [
      { x: 0, y: 3, dir: 1, color: 'R' },
      { x: 8, y: 6, dir: 3, color: 'W' },
    ],
    receivers: [
      { x: 8, y: 3, color: 'R' },
      { x: 0, y: 6, color: 'W' },
      { x: 5, y: 2, color: 'G' },
    ],
    mirrors: [
      { x: 3, y: 3, rot: 1 },
      { x: 3, y: 0, rot: 1 },
      { x: 6, y: 0, rot: 0 },
      { x: 6, y: 3, rot: 0 },
    ],
    splitters: [{ x: 5, y: 6, rot: 3 }],
    filters: [{ x: 5, y: 4, color: 'G' }],
  }),
];
