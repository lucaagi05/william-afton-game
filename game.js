// game.js - Core engine: canvas, player state, game loop, rendering

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Dynamic Canvas Sizing ---
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- State Variables ---
const player = { x: 180, y: 140, width: 50, height: 50, color: '#fff', speed: 18 };
window.player = player;

const keys = {};
const BASE_MOVE_DELAY = 200;
let lastMoveTime = 0;
const SHOW_HITBOX = true;

const playerHitbox = { x: player.x + 10, y: player.y, width: 30, height: 50 };
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

// --- Core Rendering ---
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const offset = getRoomOffset();
  const { w: rw, h: rh } = getRoomDimensions();

  // --- Room-local drawing (translated) ---
  ctx.save();
  ctx.translate(offset.x, offset.y);

  drawBorder();
  drawRoomElements();

  if (SHOW_HITBOX) {
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

  // Textboxes (canvas-global, fixed size)
  window.InteractionManager.draw(ctx);

  // --- Canvas-global UI ---
  if (window.Minimap) window.Minimap.draw(ctx);
  if (window.Inventory) window.Inventory.draw(ctx);

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

// --- Update ---
function update() {
  const now = Date.now();
  const prevX = player.x;
  const prevY = player.y;
  const room = window.MapManager.current();
  const rw = room.pixelWidth || 600;
  const rh = room.pixelHeight || 600;

  // Sprint
  const sprinting = keys[' '];
  const speed = sprinting ? player.speed * 2 : player.speed;
  const moveDelay = sprinting ? BASE_MOVE_DELAY / 2 : BASE_MOVE_DELAY;

  // Block movement when inventory or interaction is open
  const blocked = window.InteractionManager.activeInteraction ||
                  (window.Inventory && window.Inventory.isOpen);

  if (now - lastMoveTime >= moveDelay && !blocked) {
    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
      player.y -= speed; window.playerDir = 'up'; lastMoveTime = now;
    } else if (keys['ArrowDown'] || keys['s'] || keys['S']) {
      player.y += speed; window.playerDir = 'down'; lastMoveTime = now;
    } else if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
      player.x -= speed; window.playerDir = 'left'; lastMoveTime = now;
    } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
      player.x += speed; window.playerDir = 'right'; lastMoveTime = now;
    }

    // Clamp — handle all four edge doors
    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;

    const hasTopDoor    = room.doors.some(d => d.edge === 'top'    && !d.locked && centerX >= d.x && centerX <= d.x + d.width);
    const hasBottomDoor = room.doors.some(d => d.edge === 'bottom' && !d.locked && centerX >= d.x && centerX <= d.x + d.width);
    const hasLeftDoor   = room.doors.some(d => d.edge === 'left'   && !d.locked && centerY >= d.y && centerY <= d.y + d.height);
    const hasRightDoor  = room.doors.some(d => d.edge === 'right'  && !d.locked && centerY >= d.y && centerY <= d.y + d.height);

    const minX = hasLeftDoor   ? -player.width : 0;
    const maxX = hasRightDoor  ? rw : rw - player.width;
    const minY = hasTopDoor    ? -player.height : 0;
    const maxY = hasBottomDoor ? rh : rh - player.height;

    player.x = Math.max(minX, Math.min(maxX, player.x));
    player.y = Math.max(minY, Math.min(maxY, player.y));
  }

  playerHitbox.x = player.x + 10;
  playerHitbox.y = player.y;

  // Obstacle collision
  for (const obstacle of room.obstacles) {
    if (window.isColliding(playerHitbox, obstacle)) {
      let dx = player.x - prevX;
      let dy = player.y - prevY;
      while (window.isColliding(playerHitbox, obstacle)) {
        if (dx !== 0) player.x -= Math.sign(dx);
        if (dy !== 0) player.y -= Math.sign(dy);
        playerHitbox.x = player.x + 10;
        playerHitbox.y = player.y;
        if (player.x === prevX && player.y === prevY) break;
      }
    }
  }

  if (now - window.animTimer > window.ANIM_INTERVAL) {
    window.animFrame = 1 - window.animFrame;
    window.animTimer = now;
  }

  window.MapManager.checkDoors(player);
}

// F11 fullscreen is handled natively by the browser

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
