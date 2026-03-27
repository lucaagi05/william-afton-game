// game.js - Core engine: canvas, player state, tile-based movement, game loop, rendering

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Dynamic Canvas Sizing ---
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- Tile Constants ---
const TILE_SIZE = window.TILE_SIZE || 50;

// --- State Variables ---
const player = { x: 3 * TILE_SIZE, y: 2 * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, color: '#fff', speed: TILE_SIZE };
window.player = player;

const keys = {};
const BASE_MOVE_DELAY = 180;
let lastMoveTime = 0;

// Debug flags
window.showHitboxes = false;
window.showTileGrid = false;

const playerHitbox = { x: player.x, y: player.y, width: TILE_SIZE, height: TILE_SIZE };
window.playerHitbox = playerHitbox;

// --- Global Key State Tracking ---
document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);

// --- Room Viewport Offset ---
function getRoomDimensions() {
  const room = window.MapManager.current();
  return {
    w: room.pixelWidth || 600,
    h: room.pixelHeight || 600
  };
}

function getRoomOffset() {
  const { w, h } = getRoomDimensions();
  return {
    x: Math.floor((canvas.width - w) / 2),
    y: Math.floor((canvas.height - h) / 2)
  };
}

// --- Border ---
function drawBorder() {
  const room = window.MapManager.current();
  const rw = room.pixelWidth || 600;
  const rh = room.pixelHeight || 600;

  const topDoor    = room.entities.find(e => e.type === 'door' && e.edge === 'top');
  const bottomDoor = room.entities.find(e => e.type === 'door' && e.edge === 'bottom');
  const leftDoor   = room.entities.find(e => e.type === 'door' && e.edge === 'left');
  const rightDoor  = room.entities.find(e => e.type === 'door' && e.edge === 'right');

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;

  // Left
  ctx.beginPath();
  if (leftDoor) {
    ctx.moveTo(2, 2);              ctx.lineTo(2, leftDoor.y);
    ctx.moveTo(2, leftDoor.y + leftDoor.height); ctx.lineTo(2, rh - 2);
  } else {
    ctx.moveTo(2, 2); ctx.lineTo(2, rh - 2);
  }
  ctx.stroke();

  // Right
  ctx.beginPath();
  if (rightDoor) {
    ctx.moveTo(rw - 2, 2);              ctx.lineTo(rw - 2, rightDoor.y);
    ctx.moveTo(rw - 2, rightDoor.y + rightDoor.height); ctx.lineTo(rw - 2, rh - 2);
  } else {
    ctx.moveTo(rw - 2, 2); ctx.lineTo(rw - 2, rh - 2);
  }
  ctx.stroke();

  // Top
  ctx.beginPath();
  if (topDoor) {
    ctx.moveTo(2, 2);       ctx.lineTo(topDoor.x, 2);
    ctx.moveTo(topDoor.x + topDoor.width, 2); ctx.lineTo(rw - 2, 2);
  } else {
    ctx.moveTo(2, 2); ctx.lineTo(rw - 2, 2);
  }
  ctx.stroke();

  // Bottom
  ctx.beginPath();
  if (bottomDoor) {
    ctx.moveTo(2, rh - 2);       ctx.lineTo(bottomDoor.x, rh - 2);
    ctx.moveTo(bottomDoor.x + bottomDoor.width, rh - 2); ctx.lineTo(rw - 2, rh - 2);
  } else {
    ctx.moveTo(2, rh - 2); ctx.lineTo(rw - 2, rh - 2);
  }
  ctx.stroke();
}

// --- Door Indicators: arrows for open doors, red bars for locked ---
function drawDoorIndicators() {
  const room = window.MapManager.current();
  const rw = room.pixelWidth || 600;
  const rh = room.pixelHeight || 600;
  const NEARBY = TILE_SIZE * 3; // Show arrow when within 3 tiles

  for (const door of room.doors) {
    if (door.type !== 'door') continue;

    if (door.locked) {
      // Draw red bar filling the door gap
      ctx.save();
      ctx.fillStyle = 'rgba(255, 50, 50, 0.7)';
      if (door.edge === 'bottom') {
        ctx.fillRect(door.x, rh - 6, door.width, 6);
      } else if (door.edge === 'top') {
        ctx.fillRect(door.x, 0, door.width, 6);
      } else if (door.edge === 'left') {
        ctx.fillRect(0, door.y, 6, door.height);
      } else if (door.edge === 'right') {
        ctx.fillRect(rw - 6, door.y, 6, door.height);
      }
      ctx.restore();
      continue;
    }

    // Check if player is nearby
    let dist = Infinity;
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;

    if (door.edge === 'bottom') {
      const doorCX = door.x + door.width / 2;
      dist = Math.abs(py - rh) + Math.abs(px - doorCX);
    } else if (door.edge === 'top') {
      const doorCX = door.x + door.width / 2;
      dist = Math.abs(py) + Math.abs(px - doorCX);
    } else if (door.edge === 'left') {
      const doorCY = door.y + door.height / 2;
      dist = Math.abs(px) + Math.abs(py - doorCY);
    } else if (door.edge === 'right') {
      const doorCY = door.y + door.height / 2;
      dist = Math.abs(px - rw) + Math.abs(py - doorCY);
    }

    if (dist > NEARBY * 3) continue;

    // Draw arrow pointing in exit direction
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const arrowSize = 10;

    if (door.edge === 'bottom') {
      const cx = door.x + door.width / 2;
      const cy = rh - 3;
      ctx.beginPath();
      ctx.moveTo(cx - arrowSize, cy - arrowSize);
      ctx.lineTo(cx + arrowSize, cy - arrowSize);
      ctx.lineTo(cx, cy + 4);
      ctx.closePath();
      ctx.fill();
    } else if (door.edge === 'top') {
      const cx = door.x + door.width / 2;
      const cy = 3;
      ctx.beginPath();
      ctx.moveTo(cx - arrowSize, cy + arrowSize);
      ctx.lineTo(cx + arrowSize, cy + arrowSize);
      ctx.lineTo(cx, cy - 4);
      ctx.closePath();
      ctx.fill();
    } else if (door.edge === 'left') {
      const cx = 3;
      const cy = door.y + door.height / 2;
      ctx.beginPath();
      ctx.moveTo(cx + arrowSize, cy - arrowSize);
      ctx.lineTo(cx + arrowSize, cy + arrowSize);
      ctx.lineTo(cx - 4, cy);
      ctx.closePath();
      ctx.fill();
    } else if (door.edge === 'right') {
      const cx = rw - 3;
      const cy = door.y + door.height / 2;
      ctx.beginPath();
      ctx.moveTo(cx - arrowSize, cy - arrowSize);
      ctx.lineTo(cx - arrowSize, cy + arrowSize);
      ctx.lineTo(cx + 4, cy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

// --- Room-specific element drawing ---
function drawRoomElements() {
  const room = window.MapManager.current();
  const mainTable = room.entities.find(e => e.id === 'main_table');

  if (mainTable) {
    if (player.y + player.height < mainTable.hitbox.y + mainTable.hitbox.height) {
      window.drawPlayer(ctx, player);
      mainTable.draw(ctx);
    } else {
      mainTable.draw(ctx);
      window.drawPlayer(ctx, player);
    }
    for (const ent of room.entities) {
      if (ent.id !== 'main_table') ent.draw(ctx);
    }
  } else {
    for (const ent of room.entities) { ent.draw(ctx); }
    window.drawPlayer(ctx, player);
  }
}

// --- Tile Grid Drawing ---
function drawTileGrid() {
  if (!window.showTileGrid) return;
  const room = window.MapManager.current();
  const rw = room.pixelWidth || 600;
  const rh = room.pixelHeight || 600;

  ctx.save();
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
  ctx.lineWidth = 0.5;

  for (let x = 0; x <= rw; x += TILE_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, rh);
    ctx.stroke();
  }
  for (let y = 0; y <= rh; y += TILE_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(rw, y);
    ctx.stroke();
  }

  // Show tile coordinates on hover-tile (player position)
  const tileX = Math.floor(player.x / TILE_SIZE);
  const tileY = Math.floor(player.y / TILE_SIZE);
  ctx.fillStyle = 'rgba(0,255,0,0.15)';
  ctx.fillRect(tileX * TILE_SIZE, tileY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  ctx.font = '9px monospace';
  ctx.fillStyle = 'rgba(0,255,0,0.6)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tileX + ',' + tileY, tileX * TILE_SIZE + TILE_SIZE / 2, tileY * TILE_SIZE + TILE_SIZE / 2 + 18);

  ctx.restore();
}

// --- Core Rendering ---
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const offset = getRoomOffset();

  // --- Room-local drawing (translated) ---
  ctx.save();
  ctx.translate(offset.x, offset.y);

  drawBorder();
  drawDoorIndicators();
  drawRoomElements();
  drawTileGrid();

  if (window.showHitboxes) {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f00';
    for (const obs of window.MapManager.current().obstacles) {
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    }
    ctx.strokeStyle = '#00f';
    for (const ent of window.MapManager.current().entities) {
      if (ent.interactionArea) {
        const ia = ent.interactionArea;
        ctx.strokeRect(ia.x, ia.y, ia.width, ia.height);
      }
    }
    ctx.strokeStyle = '#ff0';
    ctx.strokeRect(playerHitbox.x, playerHitbox.y, playerHitbox.width, playerHitbox.height);
    ctx.restore();
  }

  // Room name label
  ctx.save();
  ctx.font = '14px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(window.MapManager.current().name, 10, 10);
  ctx.restore();

  ctx.restore(); // end room-local

  // Textboxes (canvas-global)
  window.InteractionManager.draw(ctx);

  // --- Canvas-global UI ---
  if (window.Minimap) window.Minimap.draw(ctx);
  if (window.Inventory) window.Inventory.draw(ctx);
  if (window.Health) window.Health.draw(ctx);

  // Pause menu popup (canvas-global)
  if (window.gameMenu && window.gameMenu.showPauseMenu) {
    window.gameMenu.drawPauseMenu(ctx);
  }

  // Exit confirmation popup (canvas-global)
  if (window.gameMenu && window.gameMenu.showExitConfirm) {
    window.gameMenu.drawExitConfirm(ctx);
  }

  // Debug menu overlay (canvas-global)
  if (window.DebugMenu && window.DebugMenu.isOpen) {
    window.DebugMenu.draw(ctx);
  }

  // Scanlines (full canvas)
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  for (let y = 0; y < canvas.height; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(canvas.width, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

// --- Game Loop ---
function gameLoop() {
  if (window.gameMenu && window.gameMenu.state.isActive) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    window.gameMenu.draw(ctx);
    window.AudioManager.setContext('menu');
  } else {
    update();
    draw();
    window.AudioManager.setContext(window.MapManager.currentRoom);
  }
  requestAnimationFrame(gameLoop);
}

// --- Tile collision check ---
function isTileBlocked(newX, newY) {
  const room = window.MapManager.current();
  const testHitbox = { x: newX, y: newY, width: TILE_SIZE, height: TILE_SIZE };

  // Check obstacles
  for (const obs of room.obstacles) {
    if (window.isColliding(testHitbox, obs)) return true;
  }
  return false;
}

// --- Update ---
function update() {
  const now = Date.now();
  const room = window.MapManager.current();
  const rw = room.pixelWidth || 600;
  const rh = room.pixelHeight || 600;

  // Sprint
  const sprinting = keys[' '];
  const moveDelay = sprinting ? BASE_MOVE_DELAY / 2 : BASE_MOVE_DELAY;

  // Block movement when various overlays are open
  const blocked = window.InteractionManager.activeInteraction ||
                  (window.Inventory && window.Inventory.isOpen) ||
                  (window.gameMenu && window.gameMenu.showExitConfirm) ||
                  (window.gameMenu && window.gameMenu.showPauseMenu) ||
                  (window.DebugMenu && window.DebugMenu.isOpen);

  if (now - lastMoveTime >= moveDelay && !blocked) {
    let dx = 0, dy = 0;
    const up    = keys['ArrowUp']    || keys['w'] || keys['W'];
    const down  = keys['ArrowDown']  || keys['s'] || keys['S'];
    const left  = keys['ArrowLeft']  || keys['a'] || keys['A'];
    const right = keys['ArrowRight'] || keys['d'] || keys['D'];

    if (up)    dy = -1;
    if (down)  dy = 1;
    if (left)  dx = -1;
    if (right) dx = 1;

    if (dx !== 0 || dy !== 0) {
      // Set facing direction (last cardinal direction for diagonal)
      if (dy === -1 && dx === 0) window.playerDir = 'up';
      else if (dy === 1 && dx === 0) window.playerDir = 'down';
      else if (dx === -1 && dy === 0) window.playerDir = 'left';
      else if (dx === 1 && dy === 0) window.playerDir = 'right';
      else if (dy === -1) window.playerDir = 'up';
      else if (dy === 1) window.playerDir = 'down';
      else if (dx === -1) window.playerDir = 'left';
      else if (dx === 1) window.playerDir = 'right';

      const newX = player.x + dx * TILE_SIZE;
      const newY = player.y + dy * TILE_SIZE;

      // Check room bounds with door awareness
      const centerX = newX + TILE_SIZE / 2;
      const centerY = newY + TILE_SIZE / 2;

      const hasTopDoor    = room.doors.some(d => d.edge === 'top'    && !d.locked && centerX >= d.x && centerX <= d.x + d.width);
      const hasBottomDoor = room.doors.some(d => d.edge === 'bottom' && !d.locked && centerX >= d.x && centerX <= d.x + d.width);
      const hasLeftDoor   = room.doors.some(d => d.edge === 'left'   && !d.locked && centerY >= d.y && centerY <= d.y + d.height);
      const hasRightDoor  = room.doors.some(d => d.edge === 'right'  && !d.locked && centerY >= d.y && centerY <= d.y + d.height);

      const minX = hasLeftDoor   ? -TILE_SIZE : 0;
      const maxX = hasRightDoor  ? rw : rw - TILE_SIZE;
      const minY = hasTopDoor    ? -TILE_SIZE : 0;
      const maxY = hasBottomDoor ? rh : rh - TILE_SIZE;

      // Try diagonal first, then fall back to single-axis
      let moved = false;

      if (dx !== 0 && dy !== 0) {
        // Diagonal: try both axes
        const diagX = Math.max(minX, Math.min(maxX, newX));
        const diagY = Math.max(minY, Math.min(maxY, newY));
        if (!isTileBlocked(diagX, diagY) && diagX === newX && diagY === newY) {
          player.x = diagX;
          player.y = diagY;
          moved = true;
        } else {
          // Try X only
          const xOnly = Math.max(minX, Math.min(maxX, player.x + dx * TILE_SIZE));
          if (!isTileBlocked(xOnly, player.y) && xOnly !== player.x) {
            player.x = xOnly;
            moved = true;
          }
          // Try Y only
          const yOnly = Math.max(minY, Math.min(maxY, player.y + dy * TILE_SIZE));
          if (!isTileBlocked(player.x, yOnly) && yOnly !== player.y) {
            player.y = yOnly;
            moved = true;
          }
        }
      } else {
        // Single axis
        const clampedX = Math.max(minX, Math.min(maxX, newX));
        const clampedY = Math.max(minY, Math.min(maxY, newY));
        if (!isTileBlocked(clampedX, clampedY)) {
          player.x = clampedX;
          player.y = clampedY;
          moved = true;
        }
      }

      if (moved) lastMoveTime = now;
    }
  }

  // Update hitbox to match player tile
  playerHitbox.x = player.x;
  playerHitbox.y = player.y;
  playerHitbox.width = TILE_SIZE;
  playerHitbox.height = TILE_SIZE;

  // Animation
  if (now - window.animTimer > window.ANIM_INTERVAL) {
    window.animFrame = 1 - window.animFrame;
    window.animTimer = now;
  }

  window.MapManager.checkDoors(player);
}

// --- Image Loading and Game Start ---
let imagesLoaded = 0;
function checkReady() {
  imagesLoaded++;
  if (imagesLoaded >= 2) requestAnimationFrame(gameLoop);
}
window.spriteSheet.onload = checkReady;
window.tableImg.onload = checkReady;
if (window.spriteSheet.complete) checkReady();
if (window.tableImg.complete) checkReady();

// --- Canvas Click Handler ---
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);
  if (window.gameMenu && window.gameMenu.state.isActive) {
    window.gameMenu.handleClick(clickX, clickY);
  }
});

document.addEventListener('keydown', window.gameMenu.handleInput);
