// game.js - Core engine: canvas, player state, game loop, rendering

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- State Variables ---
const player = { x: 180, y: 140, width: 50, height: 50, color: '#fff', speed: 18 };
window.player = player;

const keys = {};
const moveDelay = 200;
let lastMoveTime = 0;
const SHOW_HITBOX = true;

// Player hitbox (exported so interactions.js can read it)
const playerHitbox = { x: player.x + 10, y: player.y, width: 30, height: 50 };
window.playerHitbox = playerHitbox;

// --- Global Key State Tracking ---
document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);

// --- Core Rendering ---
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#0ff';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

  if (player.y + player.height < window.tableHitbox.y + window.tableHitbox.height) {
    window.drawPlayer(ctx, player);
    window.drawTable(ctx);
  } else {
    window.drawTable(ctx);
    window.drawPlayer(ctx, player);
  }
  window.drawCube(ctx);
  window.drawCheckpoint(ctx);

  if (SHOW_HITBOX) {
    ctx.save();
    ctx.strokeStyle = 'lime';
    ctx.lineWidth = 2;
    ctx.strokeRect(window.tableHitbox.x, window.tableHitbox.y, window.tableHitbox.width, window.tableHitbox.height);
    ctx.strokeStyle = 'yellow';
    ctx.strokeRect(playerHitbox.x, playerHitbox.y, playerHitbox.width, playerHitbox.height);
    ctx.strokeStyle = '#0ff';
    ctx.strokeRect(window.cubeItem.x, window.cubeItem.y, window.cubeItem.width, window.cubeItem.height);
    ctx.strokeStyle = 'red';
    ctx.strokeRect(window.checkpointHitbox.x, window.checkpointHitbox.y, window.checkpointHitbox.width, window.checkpointHitbox.height);
    ctx.strokeRect(window.checkpointRightHitbox.x, window.checkpointRightHitbox.y, window.checkpointRightHitbox.width, window.checkpointRightHitbox.height);
    ctx.restore();
  }

  // Interaction textbox / choice overlay (handled by interactions.js)
  window.InteractionManager.draw(ctx);

  // Scanline overlay
  ctx.save();
  ctx.globalAlpha = 1.0;
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
  } else {
    update();
    draw();
  }
  requestAnimationFrame(gameLoop);
  if (window.AudioManager && !window.gameMenu.state.isActive) {
    window.AudioManager.playMusic();
  }
}

// --- Update (Physics / Movement) ---
function update() {
  const now = Date.now();
  const prevX = player.x;
  const prevY = player.y;

  if (now - lastMoveTime >= moveDelay && !window.InteractionManager.activeInteraction) {
    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
      player.y -= player.speed; window.playerDir = 'up'; lastMoveTime = now;
    } else if (keys['ArrowDown'] || keys['s'] || keys['S']) {
      player.y += player.speed; window.playerDir = 'down'; lastMoveTime = now;
    } else if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
      player.x -= player.speed; window.playerDir = 'left'; lastMoveTime = now;
    } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
      player.x += player.speed; window.playerDir = 'right'; lastMoveTime = now;
    }
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
  }

  playerHitbox.x = player.x + 10;
  playerHitbox.y = player.y + 0;

  if (window.isColliding(playerHitbox, window.tableHitbox)) {
    let dx = player.x - prevX;
    let dy = player.y - prevY;
    while (window.isColliding(playerHitbox, window.tableHitbox)) {
      if (dx !== 0) player.x -= Math.sign(dx);
      if (dy !== 0) player.y -= Math.sign(dy);
      playerHitbox.x = player.x + 10;
      playerHitbox.y = player.y + 0;
      if (player.x === prevX && player.y === prevY) break;
    }
  }

  if (now - window.animTimer > window.ANIM_INTERVAL) {
    window.animFrame = 1 - window.animFrame;
    window.animTimer = now;
  }
}

// --- Image Loading and Game Start ---
let imagesLoaded = 0;
function checkReady() {
  imagesLoaded++;
  if (imagesLoaded >= 2) {
    requestAnimationFrame(gameLoop);
  }
}
window.spriteSheet.onload = checkReady;
window.tableImg.onload = checkReady;
if (window.spriteSheet.complete) checkReady();
if (window.tableImg.complete) checkReady();

// --- Canvas Click Handler (delegates to menu) ---
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);
  if (window.gameMenu && window.gameMenu.state.isActive) {
    window.gameMenu.handleClick(clickX, clickY);
  }
});

// --- Menu Keyboard Input Hookup ---
document.addEventListener('keydown', window.gameMenu.handleInput);
