// LUMEN — rendering. One job: paint the board on the canvas.
//
// Everything the player sees of the board lives here: the starfield,
// the board, the pieces, the beams with their travelling pulses, and
// the bursts when a lantern lights. The HUD and the menus are DOM;
// this file only draws the canvas underneath them.

import { COLS, ROWS, COLORS, COLOR_GLOW, PALETTE } from './config.js';
import { createSeededRandom } from './beams.js';

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function cellCenter(board, gx, gy) {
  return { x: board.x + (gx + 0.5) * board.cell, y: board.y + (gy + 0.5) * board.cell };
}

function pointAlong(points, distance) {
  let remaining = distance;
  for (let index = 0; index + 1 < points.length; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= length) {
      const t = length === 0 ? 0 : remaining / length;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    remaining -= length;
  }
  return points[points.length - 1];
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let dpr = 1;
  // Displayed rotation of each rotatable piece, eased toward its target
  // so a click visibly swings the mirror. Keyed by "x,y".
  const displayRot = new Map();
  const particles = [];
  const stars = [];
  {
    const random = createSeededRandom(1337);
    for (let index = 0; index < 110; index += 1) {
      stars.push({
        x: random(),
        y: random(),
        radius: 0.6 + random() * 1.4,
        phase: random() * Math.PI * 2,
        speed: 0.4 + random() * 0.8,
      });
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }

  function boardRect() {
    const header = 64;
    const margin = 24;
    const cell = Math.max(
      32,
      Math.floor(Math.min((width - margin * 2) / COLS, (height - header - margin * 2) / ROWS)),
    );
    const boardWidth = cell * COLS;
    const boardHeight = cell * ROWS;
    return {
      x: Math.floor((width - boardWidth) / 2),
      y: Math.floor(header + (height - header - boardHeight) / 2),
      cell,
      width: boardWidth,
      height: boardHeight,
    };
  }

  function drawBackground(time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, PALETTE.background);
    gradient.addColorStop(1, PALETTE.backgroundEdge);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    for (const star of stars) {
      const alpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(time / 1000 * star.speed + star.phase));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#cdd6ff';
      ctx.beginPath();
      ctx.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawBoard(board) {
    roundRect(ctx, board.x - 10, board.y - 10, board.width + 20, board.height + 20, 18);
    ctx.fillStyle = PALETTE.board;
    ctx.fill();
    ctx.strokeStyle = PALETTE.boardEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.cell : PALETTE.cellAlt;
        ctx.fillRect(board.x + x * board.cell + 1, board.y + y * board.cell + 1, board.cell - 2, board.cell - 2);
      }
    }
    ctx.strokeStyle = PALETTE.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < COLS; x += 1) {
      ctx.moveTo(board.x + x * board.cell, board.y);
      ctx.lineTo(board.x + x * board.cell, board.y + board.height);
    }
    for (let y = 1; y < ROWS; y += 1) {
      ctx.moveTo(board.x, board.y + y * board.cell);
      ctx.lineTo(board.x + board.width, board.y + y * board.cell);
    }
    ctx.stroke();
  }

  function drawBeam(path, time) {
    const color = COLORS[path.color];
    const points = path.points.map((point) => cellCenter(boardRect(), point.x, point.y));
    if (points.length < 2) return;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index].x, points[index].y);
    ctx.strokeStyle = COLOR_GLOW[path.color];
    ctx.lineWidth = boardRect().cell * 0.26;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index].x, points[index].y);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(3, boardRect().cell * 0.09);
    ctx.shadowColor = color;
    ctx.shadowBlur = boardRect().cell * 0.45;
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Energy packets travelling along the beam.
    let total = 0;
    for (let index = 0; index + 1 < points.length; index += 1) {
      total += Math.hypot(points[index + 1].x - points[index].x, points[index + 1].y - points[index].y);
    }
    const speed = boardRect().cell * 2.2;
    const spacing = boardRect().cell * 1.6;
    for (let distance = (time / 1000 * speed) % spacing; distance < total; distance += spacing) {
      const point = pointAlong(points, distance);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = color;
      ctx.shadowBlur = boardRect().cell * 0.35;
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(2.5, boardRect().cell * 0.07), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  function drawEmitter(board, piece, time) {
    const center = cellCenter(board, piece.x, piece.y);
    const color = COLORS[piece.color];
    const pulse = 1 + 0.08 * Math.sin(time / 350 + piece.x);
    const radius = board.cell * 0.3 * pulse;
    const glow = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, board.cell * 0.75);
    glow.addColorStop(0, COLOR_GLOW[piece.color]);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(center.x, center.y, board.cell * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = board.cell * 0.5;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // A small chevron showing which way the beam leaves: the chevron is
    // drawn pointing north, so north needs no turn at all.
    const angle = [0, Math.PI / 2, Math.PI, -Math.PI / 2][piece.dir];
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(11, 16, 38, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.55);
    ctx.lineTo(radius * 0.5, radius * 0.35);
    ctx.lineTo(-radius * 0.5, radius * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawReceiver(board, piece, lit, time) {
    const center = cellCenter(board, piece.x, piece.y);
    const color = COLORS[piece.color];
    const radius = board.cell * 0.36;
    if (lit) {
      const pulse = 1 + 0.06 * Math.sin(time / 300 + piece.y);
      const glow = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, board.cell * 0.9);
      glow.addColorStop(0, COLOR_GLOW[piece.color]);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(center.x, center.y, board.cell * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = board.cell * 0.6;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 2;
      const ring = radius * (1.25 + 0.15 * Math.sin(time / 300));
      ctx.beginPath();
      ctx.arc(center.x, center.y, ring, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawMirror(board, piece, targetRot, instant, time) {
    const center = cellCenter(board, piece.x, piece.y);
    const key = `${piece.x},${piece.y}`;
    const targetAngle = targetRot === 0 ? -Math.PI / 4 : Math.PI / 4;
    let angle = displayRot.get(key);
    if (angle === undefined) angle = targetAngle;
    if (instant) angle = targetAngle;
    else angle += (targetAngle - angle) * 0.35;
    displayRot.set(key, angle);
    const length = board.cell * 0.92;
    const thickness = Math.max(5, board.cell * 0.15);
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(angle);
    const gradient = ctx.createLinearGradient(-length / 2, 0, length / 2, 0);
    gradient.addColorStop(0, '#8fa3d9');
    gradient.addColorStop(0.5, '#e8efff');
    gradient.addColorStop(1, '#5d6ea8');
    ctx.fillStyle = gradient;
    ctx.shadowColor = 'rgba(180, 200, 255, 0.8)';
    ctx.shadowBlur = board.cell * 0.25;
    roundRect(ctx, -length / 2, -thickness / 2, length, thickness, thickness / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(-length / 2 + 4, -thickness / 2 + 1.5, length - 8, 2);
    ctx.restore();
    ctx.fillStyle = '#0b1026';
    ctx.strokeStyle = '#8fa3d9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center.x, center.y, Math.max(4, board.cell * 0.09), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  function drawSplitter(board, piece, targetRot, instant) {
    const center = cellCenter(board, piece.x, piece.y);
    const key = `${piece.x},${piece.y}`;
    // The arrow is drawn pointing north, so it turns by a quarter turn
    // for each step of the facing, east, south, then west.
    const targetAngle = targetRot * Math.PI / 2;
    let angle = displayRot.get(key);
    if (angle === undefined) angle = targetAngle;
    if (instant) angle = targetAngle;
    else {
      let delta = targetAngle - angle;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      angle += delta * 0.35;
    }
    displayRot.set(key, angle);
    ctx.fillStyle = '#1d2650';
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(255, 209, 102, 0.5)';
    ctx.shadowBlur = board.cell * 0.3;
    ctx.beginPath();
    ctx.arc(center.x, center.y, board.cell * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(angle);
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.moveTo(0, -board.cell * 0.22);
    ctx.lineTo(board.cell * 0.16, board.cell * 0.08);
    ctx.lineTo(-board.cell * 0.16, board.cell * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#eef1ff';
    ctx.beginPath();
    ctx.arc(center.x, center.y, Math.max(3, board.cell * 0.06), 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFilter(board, piece) {
    const center = cellCenter(board, piece.x, piece.y);
    const color = COLORS[piece.color];
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(center.x, center.y, board.cell * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(center.x, center.y, board.cell * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(center.x - board.cell * 0.1, center.y - board.cell * 0.1, board.cell * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWall(board, piece) {
    const inset = 3;
    roundRect(ctx, board.x + piece.x * board.cell + inset, board.y + piece.y * board.cell + inset, board.cell - inset * 2, board.cell - inset * 2, 8);
    ctx.fillStyle = '#232c52';
    ctx.fill();
    ctx.strokeStyle = '#3a467a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(board.x + piece.x * board.cell + 10, board.y + piece.y * board.cell + board.cell - 10);
    ctx.lineTo(board.x + piece.x * board.cell + board.cell - 10, board.y + piece.y * board.cell + 10);
    ctx.stroke();
  }

  function drawHover(board, hover, cursor) {
    const target = hover || (cursor.visible ? cursor : null);
    if (!target) return;
    const x = board.x + target.x * board.cell;
    const y = board.y + target.y * board.cell;
    ctx.strokeStyle = hover ? 'rgba(255, 209, 102, 0.55)' : PALETTE.gold;
    ctx.lineWidth = hover ? 2 : 3;
    const pad = hover ? 3 : 1;
    const size = board.cell - pad * 2;
    ctx.strokeRect(x + pad, y + pad, size, size);
    if (!hover) {
      // Corner brackets so the keyboard cursor reads at a glance.
      const c = board.cell * 0.22;
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 2 + c); ctx.lineTo(x + 2, y + 2); ctx.lineTo(x + 2 + c, y + 2);
      ctx.moveTo(x + board.cell - 2 - c, y + 2); ctx.lineTo(x + board.cell - 2, y + 2); ctx.lineTo(x + board.cell - 2, y + 2 + c);
      ctx.moveTo(x + board.cell - 2, y + board.cell - 2 - c); ctx.lineTo(x + board.cell - 2, y + board.cell - 2); ctx.lineTo(x + board.cell - 2 - c, y + board.cell - 2);
      ctx.moveTo(x + 2 + c, y + board.cell - 2); ctx.lineTo(x + 2, y + board.cell - 2); ctx.lineTo(x + 2, y + board.cell - 2 - c);
      ctx.stroke();
    }
  }

  function updateParticles(dt) {
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.life -= dt;
      if (particle.life <= 0) {
        particles.splice(index, 1);
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 60 * dt;
    }
  }

  function drawParticles() {
    for (const particle of particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  return {
    resize,
    boardRect,
    burst(cellX, cellY, color) {
      const board = boardRect();
      const center = cellCenter(board, cellX, cellY);
      for (let index = 0; index < 26; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 160;
        particles.push({
          x: center.x,
          y: center.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 40,
          life: 0.7 + Math.random() * 0.5,
          maxLife: 1.2,
          color: COLORS[color] || '#ffffff',
          size: 2 + Math.random() * 3,
        });
      }
    },
    draw(state, time, dt) {
      resize();
      const board = boardRect();
      const level = state.level;
      drawBackground(time);
      updateParticles(dt);
      drawBoard(board);
      if (level) {
        for (const path of state.paths) drawBeam(path, time);
        for (const piece of level.walls) drawWall(board, piece);
        for (const piece of level.filters) drawFilter(board, piece);
        for (const piece of level.emitters) drawEmitter(board, piece, time);
        level.receivers.forEach((piece, index) => {
          drawReceiver(board, piece, state.lit.has(index), time);
        });
        level.mirrors.forEach((piece, index) => {
          drawMirror(board, piece, state.rotations[index], state.instant, time);
        });
        level.splitters.forEach((piece, index) => {
          drawSplitter(board, piece, state.rotations[level.mirrors.length + index], state.instant, time);
        });
        drawHover(board, state.hover, state.cursor);
      }
      drawParticles();
    },
  };
}
