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

// --- State Variables ---
const player = { x: 3 * TILE_SIZE, y: 2 * TILE_SIZE, visualX: 3 * TILE_SIZE, visualY: 2 * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, color: '#fff', speed: TILE_SIZE };
window.player = player;

// Death screen video (reuses same static mp4 as menu)
const deathVideo = document.createElement('video');
deathVideo.src = 'mp4/menu_static.mp4';
deathVideo.muted = true;
deathVideo.loop = true;
deathVideo.preload = 'auto';

const keys = {};
const BASE_MOVE_DELAY = 180;
let lastMoveTime = 0;

// Debug flags
window.showHitboxes = false;
window.showTileGrid = false;

const playerHitbox = { x: player.x, y: player.y, width: TILE_SIZE, height: TILE_SIZE };
window.playerHitbox = playerHitbox;

// --- Global Key State Tracking ---
document.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// --- Gamepad State Tracking ---
let lastGamepadKeys = {};
function pollGamepad() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = gamepads.find(g => g !== null); // get first active gamepad
  if (!gp) return;

  const isPressed = (idx) => gp.buttons[idx] && (typeof gp.buttons[idx] === 'object' ? gp.buttons[idx].pressed : gp.buttons[idx] === 1.0);
  const axisPressed = (idx, dir) => gp.axes[idx] && (dir > 0 ? gp.axes[idx] > 0.4 : gp.axes[idx] < -0.4);

  const states = {
    'ArrowUp': isPressed(12) || axisPressed(1, -1),
    'ArrowDown': isPressed(13) || axisPressed(1, 1),
    'ArrowLeft': isPressed(14) || axisPressed(0, -1),
    'ArrowRight': isPressed(15) || axisPressed(0, 1),
    'Enter': isPressed(0), // A: confirm
    'backspace': isPressed(2), // X: attack
    'shift': isPressed(4) || gp.axes[2] > 0.1 || gp.axes[5] > 0.1, // LT(Axis) / LB: run
    'i': isPressed(7) || isPressed(9), // Menu (button 7 or 9): inventory
    'escape': isPressed(6) || isPressed(8) // button 6 or 8: exit / pause game
  };

  for (const key in states) {
    if (states[key] && !lastGamepadKeys[key]) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: key }));
      keys[key.toLowerCase()] = true;
    } else if (!states[key] && lastGamepadKeys[key]) {
      document.dispatchEvent(new KeyboardEvent('keyup', { key: key }));
      keys[key.toLowerCase()] = false;
    }
  }

  lastGamepadKeys = states;
}

// ---------------------------------------------------------------------------
// Fade Overlay System
// ---------------------------------------------------------------------------
const FadeOverlay = {
  _alpha: 0,
  _target: 0,
  _startAlpha: 0,
  _startTime: 0,
  _duration: 0,
  _callback: null,
  _active: false,

  fadeOut(duration, callback) {
    this._startAlpha = this._alpha;
    this._target = 1;
    this._duration = duration;
    this._startTime = Date.now();
    this._callback = callback || null;
    this._active = true;
  },

  fadeIn(duration, callback) {
    this._startAlpha = this._alpha;
    this._target = 0;
    this._duration = duration;
    this._startTime = Date.now();
    this._callback = callback || null;
    this._active = true;
  },

  setBlack() { this._alpha = 1; this._active = false; },
  setClear() { this._alpha = 0; this._active = false; },

  update() {
    if (!this._active) return;
    const elapsed = Date.now() - this._startTime;
    const t = Math.min(1, elapsed / this._duration);
    this._alpha = this._startAlpha + (this._target - this._startAlpha) * t;
    if (t >= 1) {
      this._alpha = this._target;
      this._active = false;
      if (this._callback) {
        const cb = this._callback;
        this._callback = null;
        cb();
      }
    }
  },

  draw(ctx) {
    if (this._alpha <= 0) return;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,' + this._alpha + ')';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  },

  get alpha() { return this._alpha; },
  get isFading() { return this._active; }
};
window.FadeOverlay = FadeOverlay;

// ---------------------------------------------------------------------------
// Screen Shake System
// ---------------------------------------------------------------------------
let shakeEndTime = 0;
let shakeIntensity = 0;

window.triggerScreenShake = function (intensity, durationMs) {
  shakeIntensity = intensity || 6;
  shakeEndTime = Date.now() + (durationMs || 300);
};

function getShakeOffset() {
  if (Date.now() < shakeEndTime) {
    return {
      x: (Math.random() - 0.5) * shakeIntensity * 2,
      y: (Math.random() - 0.5) * shakeIntensity * 2
    };
  }
  return { x: 0, y: 0 };
}

// ---------------------------------------------------------------------------
// Game Over State Machine
// ---------------------------------------------------------------------------
let gameOverState = 'none'; // 'none' | 'freeze' | 'fadeout' | 'screen' | 'fadeback'
let gameOverStartTime = 0;
const GAME_OVER_FREEZE_DURATION = 5000; // 5 seconds

function startGameOver() {
  if (gameOverState !== 'none') return;
  gameOverState = 'freeze';
  gameOverStartTime = Date.now();
  if (window.AudioManager) window.AudioManager.playPlayerDeathSound();
  if (window.AudioManager) window.AudioManager.stopMusic();
  // Start death screen video
  deathVideo.currentTime = 0;
  deathVideo.play().catch(() => {});
}

function drawGameOverScreen(ctx) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;

  // Draw static video background (same as menu)
  if (deathVideo && deathVideo.readyState >= 2) {
    ctx.drawImage(deathVideo, 0, 0, cw, ch);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, cw, ch);
  } else {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);
  }

  ctx.save();
  ctx.font = '64px monospace';
  ctx.fillStyle = '#f00';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GAME OVER', cw / 2, ch / 2 - 30);

  ctx.font = '18px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('Press Enter to continue', cw / 2, ch / 2 + 40);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Weapon Attack System
// ---------------------------------------------------------------------------
let attackCooldownEnd = 0;
let attackVisualEnd = 0;
let attackDir = 'down';
const ATTACK_COOLDOWN = 400; // ms between attacks
const ATTACK_VISUAL_DURATION = 200; // how long the slash shows

function tryWeaponAttack() {
  const now = Date.now();
  if (now < attackCooldownEnd) return;
  if (!window.Inventory || !window.Inventory.equippedWeapon) return;

  const weaponId = window.Inventory.equippedWeapon;
  const weaponDef = window.INVENTORY_ITEMS[weaponId];
  if (!weaponDef) return;

  attackCooldownEnd = now + ATTACK_COOLDOWN;
  attackVisualEnd = now + ATTACK_VISUAL_DURATION;
  attackDir = window.playerDir;

  // Play swing sound
  if (window.AudioManager) window.AudioManager.playKnifeUseSound();

  // Determine attack hitbox (sweep: 3 tiles wide, 1 tile deep based on direction)
  let atkX = player.x, atkY = player.y;
  let atkWidth = TILE_SIZE, atkHeight = TILE_SIZE;

  if (attackDir === 'up') {
    atkY -= TILE_SIZE;
    atkX -= TILE_SIZE;
    atkWidth = TILE_SIZE * 3;
    atkHeight = TILE_SIZE;
  }
  else if (attackDir === 'down') {
    atkY += TILE_SIZE;
    atkX -= TILE_SIZE;
    atkWidth = TILE_SIZE * 3;
    atkHeight = TILE_SIZE;
  }
  else if (attackDir === 'left') {
    atkX -= TILE_SIZE;
    atkY -= TILE_SIZE;
    atkWidth = TILE_SIZE;
    atkHeight = TILE_SIZE * 3;
  }
  else if (attackDir === 'right') {
    atkX += TILE_SIZE;
    atkY -= TILE_SIZE;
    atkWidth = TILE_SIZE;
    atkHeight = TILE_SIZE * 3;
  }

  const atkHitbox = { x: atkX, y: atkY, width: atkWidth, height: atkHeight };

  // Check attackable entities in current room
  const room = window.MapManager.currentRoom;
  for (const ent of window.Entities) {
    if (ent.room !== room) continue;
    if (!ent.attackable || ent.dead) continue;
    const entBox = ent.area || (ent.hitbox ? ent.hitbox : null);
    if (!entBox) continue;
    if (window.isColliding(atkHitbox, entBox)) {
      // Deal damage
      const dmg = 3; // Enforce 3 HP knife damage
      ent.hp = (ent.hp || 0) - dmg;
      ent.showHealthBar = true;
      if (window.AudioManager) window.AudioManager.playHitEnemySound();
      if (ent.hp <= 0) {
        ent.hp = 0;
        ent.dead = true;
        if (window.AudioManager) window.AudioManager.playEntityDeathSound();
      }
    }
  }
}

function drawAttackVisual(ctx) {
  if (Date.now() >= attackVisualEnd) return;
  let cx = player.visualX + TILE_SIZE / 2;
  let cy = player.visualY + TILE_SIZE / 2;

  if (attackDir === 'up') cy -= TILE_SIZE;
  else if (attackDir === 'down') cy += TILE_SIZE;
  else if (attackDir === 'left') cx -= TILE_SIZE;
  else if (attackDir === 'right') cx += TILE_SIZE;

  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#fff';
  ctx.translate(cx, cy);
  
  // Draw a larger slash line to match the new sweep
  if (attackDir === 'up' || attackDir === 'down') {
    ctx.fillRect(-TILE_SIZE * 1.2, -3, TILE_SIZE * 2.4, 6);
  } else {
    ctx.fillRect(-3, -TILE_SIZE * 1.2, 6, TILE_SIZE * 2.4);
  }
  ctx.restore();
}

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
  const px = player.visualX + player.width / 2;
  const py = player.visualY + player.height / 2;

  let offsetX = 0;
  let offsetY = 0;

  if (w <= canvas.width) {
    offsetX = (canvas.width - w) / 2;
  } else {
    const idealX = (canvas.width / 2) - px;
    offsetX = Math.min(0, Math.max(canvas.width - w, idealX));
  }

  if (h <= canvas.height) {
    offsetY = (canvas.height - h) / 2;
  } else {
    const idealY = (canvas.height / 2) - py;
    offsetY = Math.min(0, Math.max(canvas.height - h, idealY));
  }

  return {
    x: Math.floor(offsetX),
    y: Math.floor(offsetY)
  };
}

// --- Border ---
function drawBorder() {
  const room = window.MapManager.current();
  const rw = room.pixelWidth || 600;
  const rh = room.pixelHeight || 600;

  const topDoor = room.entities.find(e => e.type === 'door' && e.edge === 'top');
  const bottomDoor = room.entities.find(e => e.type === 'door' && e.edge === 'bottom');
  const leftDoor = room.entities.find(e => e.type === 'door' && e.edge === 'left');
  const rightDoor = room.entities.find(e => e.type === 'door' && e.edge === 'right');

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;

  // Left
  ctx.beginPath();
  if (leftDoor) {
    ctx.moveTo(2, 2); ctx.lineTo(2, leftDoor.y);
    ctx.moveTo(2, leftDoor.y + leftDoor.height); ctx.lineTo(2, rh - 2);
  } else {
    ctx.moveTo(2, 2); ctx.lineTo(2, rh - 2);
  }
  ctx.stroke();

  // Right
  ctx.beginPath();
  if (rightDoor) {
    ctx.moveTo(rw - 2, 2); ctx.lineTo(rw - 2, rightDoor.y);
    ctx.moveTo(rw - 2, rightDoor.y + rightDoor.height); ctx.lineTo(rw - 2, rh - 2);
  } else {
    ctx.moveTo(rw - 2, 2); ctx.lineTo(rw - 2, rh - 2);
  }
  ctx.stroke();

  // Top
  ctx.beginPath();
  if (topDoor) {
    ctx.moveTo(2, 2); ctx.lineTo(topDoor.x, 2);
    ctx.moveTo(topDoor.x + topDoor.width, 2); ctx.lineTo(rw - 2, 2);
  } else {
    ctx.moveTo(2, 2); ctx.lineTo(rw - 2, 2);
  }
  ctx.stroke();

  // Bottom
  ctx.beginPath();
  if (bottomDoor) {
    ctx.moveTo(2, rh - 2); ctx.lineTo(bottomDoor.x, rh - 2);
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
  const NEARBY = TILE_SIZE * 1; // Show arrow when within 1 tile

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

    if (dist > NEARBY) continue;

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
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
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
  const shake = getShakeOffset();

  // --- Room-local drawing (translated) ---
  ctx.save();
  ctx.translate(offset.x + shake.x, offset.y + shake.y);

  drawBorder();
  drawDoorIndicators();
  drawRoomElements();
  drawAttackVisual(ctx);
  if (window.EnemyAI) window.EnemyAI.drawEffects(ctx);
  drawTileGrid();

  if (window.showHitboxes) {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    for (const obs of window.MapManager.current().obstacles) {
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    }
    ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
    for (const ent of window.MapManager.current().entities) {
      if (ent.interactionArea) {
        const ia = ent.interactionArea;
        ctx.strokeRect(ia.x, ia.y, ia.width, ia.height);
      }
    }
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)';
    for (const ent of window.Entities) {
      if (ent.type === 'enemy' && ent.room === window.MapManager.currentRoom && !ent.dead) {
        ctx.strokeRect(ent.hitbox.x, ent.hitbox.y, ent.hitbox.width, ent.hitbox.height);
      }
    }
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
    ctx.strokeRect(playerHitbox.x, playerHitbox.y, playerHitbox.width, playerHitbox.height);
    ctx.restore();
  }

  ctx.restore(); // end room-local

  // Room name label (canvas-global)
  ctx.save();
  ctx.font = '14px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(window.MapManager.current().name, 10, 10);
  ctx.restore();

  // Coordinates UI (canvas-global)
  if (window.showCoordinates && window.player) {
    ctx.save();
    ctx.font = '14px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    const tx = Math.floor(window.player.x / TILE_SIZE);
    const ty = Math.floor(window.player.y / TILE_SIZE);
    ctx.fillText(`Pxl: ${window.player.x}, ${window.player.y}`, canvas.width - 10, 10);
    ctx.fillText(`Tile: ${tx}, ${ty}`, canvas.width - 10, 30);
    ctx.restore();
  }

  // Textboxes (canvas-global)
  window.InteractionManager.draw(ctx);

  // --- Canvas-global UI ---
  if (window.Minimap) window.Minimap.draw(ctx);
  if (window.Inventory) window.Inventory.draw(ctx);
  if (window.Health) window.Health.draw(ctx);

  // Equipped weapon indicator
  if (window.Inventory && window.Inventory.equippedWeapon && !window.Inventory.isOpen) {
    const wDef = window.INVENTORY_ITEMS[window.Inventory.equippedWeapon];
    if (wDef) {
      ctx.save();
      ctx.font = '12px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('⚔ ' + wDef.name, 22, canvas.height - 15);
      ctx.restore();
    }
  }

  // Pause menu popup (canvas-global)
  if (window.gameMenu && window.gameMenu.showPauseMenu) {
    window.gameMenu.drawPauseMenu(ctx);
  }

  // Exit confirmation popup (canvas-global)
  if (window.gameMenu && window.gameMenu.showExitConfirm) {
    window.gameMenu.drawExitConfirm(ctx);
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

  // Debug menu overlay (canvas-global)
  if (window.DebugMenu && window.DebugMenu.isOpen) {
    window.DebugMenu.draw(ctx);
  }

  // Fade overlay (very last thing drawn)
  FadeOverlay.draw(ctx);
}

// --- Game Loop ---
function gameLoop() {
  pollGamepad();
  FadeOverlay.update();

  // --- Game Over state machine ---
  if (gameOverState !== 'none') {
    const elapsed = Date.now() - gameOverStartTime;

    if (gameOverState === 'freeze') {
      // Still render the game world frozen
      draw();
      if (elapsed >= GAME_OVER_FREEZE_DURATION) {
        gameOverState = 'fadeout';
        FadeOverlay.fadeOut(1500, function () {
          gameOverState = 'screen';
        });
      }
    } else if (gameOverState === 'fadeout') {
      draw();
    } else if (gameOverState === 'screen') {
      drawGameOverScreen(ctx);
    } else if (gameOverState === 'fadeback') {
      drawGameOverScreen(ctx);
      // FadeOverlay handles the transition; callback will reset state
    }
    requestAnimationFrame(gameLoop);
    return;
  }

  if (window.gameMenu && window.gameMenu.state.isActive) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    window.gameMenu.draw(ctx);
    FadeOverlay.draw(ctx);
    window.AudioManager.setContext('menu');
  } else {
    // Check for game over trigger
    if (window.Health && window.Health.currentHP <= 0 && gameOverState === 'none') {
      startGameOver();
    } else {
      update();
      draw();
      window.AudioManager.setContext(window.MapManager.currentRoom);
    }
  }
  requestAnimationFrame(gameLoop);
}

// Game Over input handler
document.addEventListener('keydown', function (e) {
  if (gameOverState === 'screen' && e.key === 'Enter') {
    gameOverState = 'fadeback';
    FadeOverlay.fadeOut(1000, function () {
      // Reset everything and go back to menu
      gameOverState = 'none';
      deathVideo.pause();
      if (window.gameMenu) {
        window.gameMenu.resetGameState();
        window.gameMenu.state.isActive = true;
        window.gameMenu.state.currentMenu = 'root';
        window.gameMenu.state.selectedOption = 0;
        window.gameMenu.setGameStarted(false);
        window.gameMenu.setFirstStart(true);
        window.gameMenu.rebuildMenuOptions();
      }
      FadeOverlay.fadeIn(1000);
    });
  }
});

// Weapon attack input handler
document.addEventListener('keydown', function (e) {
  if (e.key === 'Backspace') {
    e.preventDefault();
    // Don't attack if any overlay/menu is open
    if (window.gameMenu && window.gameMenu.state.isActive) return;
    if (window.gameMenu && window.gameMenu.showExitConfirm) return;
    if (window.gameMenu && window.gameMenu.showPauseMenu) return;
    if (window.Inventory && window.Inventory.isOpen) return;
    if (window.DebugMenu && window.DebugMenu.isOpen) return;
    if (window.InteractionManager && window.InteractionManager.activeInteraction) return;
    if (gameOverState !== 'none') return;
    tryWeaponAttack();
  }
});

// --- Tile collision check ---
function isTileBlocked(newX, newY) {
  const room = window.MapManager.current();
  const testHitbox = { x: newX, y: newY, width: TILE_SIZE, height: TILE_SIZE };

  // Check obstacles
  for (const obs of room.obstacles) {
    if (window.isColliding(testHitbox, obs)) return true;
  }

  // Check living enemies in current room
  const currentRoom = window.MapManager.currentRoom;
  for (const ent of window.Entities) {
    if (ent.type !== 'enemy' || ent.dead) continue;
    if (ent.room !== currentRoom) continue;
    if (window.isColliding(testHitbox, ent.area)) return true;
  }

  return false;
}

// --- Update ---
function update() {
  const now = Date.now();
  const room = window.MapManager.current();
  const rw = room.pixelWidth || 600;
  const rh = room.pixelHeight || 600;

  // Linear Interpolation for Smooth Tweening
  player.visualX += (player.x - player.visualX) * 0.3;
  player.visualY += (player.y - player.visualY) * 0.3;

  // Sprint (only when not attacking with Shift)
  const sprinting = keys['shift'];
  const moveDelay = sprinting ? BASE_MOVE_DELAY / 2 : BASE_MOVE_DELAY;

  // Block movement when various overlays are open
  const blocked = window.InteractionManager.activeInteraction ||
    (window.Inventory && window.Inventory.isOpen) ||
    (window.gameMenu && window.gameMenu.showExitConfirm) ||
    (window.gameMenu && window.gameMenu.showPauseMenu) ||
    (window.DebugMenu && window.DebugMenu.isOpen);

  if (now - lastMoveTime >= moveDelay && !blocked) {
    let dx = 0, dy = 0;
    let up = keys['arrowup'] || keys['w'] || keys['numpad8'] || keys['8'];
    let down = keys['arrowdown'] || keys['s'] || keys['numpad2'] || keys['2'];
    let left = keys['arrowleft'] || keys['a'] || keys['numpad4'] || keys['4'];
    let right = keys['arrowright'] || keys['d'] || keys['numpad6'] || keys['6'];

    if (keys['numpad7'] || keys['7']) { up = true; left = true; }
    if (keys['numpad9'] || keys['9']) { up = true; right = true; }
    if (keys['numpad1'] || keys['1']) { down = true; left = true; }
    if (keys['numpad3'] || keys['3']) { down = true; right = true; }

    if (up) dy = -1;
    if (down) dy = 1;
    if (left) dx = -1;
    if (right) dx = 1;

    if (dx !== 0 || dy !== 0) {
      let newDir = window.playerDir;
      if (dy === -1 && dx === 0) newDir = 'up';
      else if (dy === 1 && dx === 0) newDir = 'down';
      else if (dx === -1 && dy === 0) newDir = 'left';
      else if (dx === 1 && dy === 0) newDir = 'right';
      else if (dy === -1) newDir = 'up';
      else if (dy === 1) newDir = 'down';
      else if (dx === -1) newDir = 'left';
      else if (dx === 1) newDir = 'right';

      if (window.playerDir !== newDir) {
        window.playerDir = newDir;
        lastMoveTime = now - Math.max(0, moveDelay - 100);
      } else {
        const newX = player.x + dx * TILE_SIZE;
        const newY = player.y + dy * TILE_SIZE;

        // Check room bounds with door awareness
        const centerX = newX + TILE_SIZE / 2;
        const centerY = newY + TILE_SIZE / 2;

        const hasTopDoor = room.doors.some(d => d.edge === 'top' && !d.locked && centerX >= d.x && centerX <= d.x + d.width);
        const hasBottomDoor = room.doors.some(d => d.edge === 'bottom' && !d.locked && centerX >= d.x && centerX <= d.x + d.width);
        const hasLeftDoor = room.doors.some(d => d.edge === 'left' && !d.locked && centerY >= d.y && centerY <= d.y + d.height);
        const hasRightDoor = room.doors.some(d => d.edge === 'right' && !d.locked && centerY >= d.y && centerY <= d.y + d.height);

        const minX = hasLeftDoor ? -TILE_SIZE : 0;
        const maxX = hasRightDoor ? rw : rw - TILE_SIZE;
        const minY = hasTopDoor ? -TILE_SIZE : 0;
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
        if (moved) {
          lastMoveTime = now;
          if (window.AudioManager) window.AudioManager.playWalkSound();
        }
      }
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

  // Enemy AI
  if (window.EnemyAI) window.EnemyAI.update();

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
