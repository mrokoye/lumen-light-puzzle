// LUMEN — input. One job: turn pointer and keyboard into game actions.
//
// The mouse is the main control: click a mirror or splitter to rotate
// it. The keyboard mirrors it: arrows move a cursor over the board,
// Space or Enter rotates the piece under it, U undoes, R resets, M
// mutes, Escape goes back to the menu.

import { COLS, ROWS } from './config.js';

export function createInput(canvas, hooks) {
  const input = {
    hover: null,
    cursor: { x: 4, y: 3, visible: false },
  };

  // The canvas is letterboxed inside the window; the renderer owns the
  // board rectangle, so a click is mapped through the same numbers.
  function cellFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const board = hooks.boardRect();
    if (!board) return null;
    const px = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const py = ((event.clientY - rect.top) / rect.height) * canvas.height;
    const x = Math.floor((px - board.x) / board.cell);
    const y = Math.floor((py - board.y) / board.cell);
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return null;
    return { x, y };
  }

  canvas.addEventListener('pointerdown', (event) => {
    hooks.unlockAudio();
    const cell = cellFromEvent(event);
    if (cell) {
      input.cursor = { x: cell.x, y: cell.y, visible: true };
      hooks.onCell(cell.x, cell.y);
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    input.hover = cellFromEvent(event);
  });

  canvas.addEventListener('pointerleave', () => {
    input.hover = null;
  });

  document.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key;
    if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight' || key === 'w' || key === 'a' || key === 's' || key === 'd') {
      event.preventDefault();
      hooks.unlockAudio();
      input.cursor.visible = true;
      if (key === 'ArrowUp' || key === 'w') input.cursor.y = Math.max(0, input.cursor.y - 1);
      if (key === 'ArrowDown' || key === 's') input.cursor.y = Math.min(ROWS - 1, input.cursor.y + 1);
      if (key === 'ArrowLeft' || key === 'a') input.cursor.x = Math.max(0, input.cursor.x - 1);
      if (key === 'ArrowRight' || key === 'd') input.cursor.x = Math.min(COLS - 1, input.cursor.x + 1);
      return;
    }
    if (key === ' ' || key === 'Enter') {
      event.preventDefault();
      hooks.unlockAudio();
      // Space works on the first press too: the cursor appears on its
      // home cell and rotates the piece there.
      input.cursor.visible = true;
      hooks.onCell(input.cursor.x, input.cursor.y);
      return;
    }
    if (key === 'u' || key === 'U') hooks.onUndo();
    if (key === 'r' || key === 'R') hooks.onReset();
    if (key === 'm' || key === 'M') hooks.onMute();
    if (key === 'Escape') hooks.onEscape();
  });

  return input;
}
