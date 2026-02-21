// Sprite and hitbox definitions, drawing, and collision functions
const SPRITE_SIZE = 240;
const SPRITE_MAP = {
  down: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
  left: [{ x: 2, y: 0 }, { x: 2, y: 1 }],
  right: [{ x: 0, y: 1 }, { x: 1, y: 1 }],
  up: [{ x: 0, y: 2 }, { x: 1, y: 2 }]
};
window.playerDir = 'down';
window.animFrame = 0;
window.animTimer = 0;
window.ANIM_INTERVAL = 400;

const spriteSheet = new Image();
spriteSheet.src = 'sprites/soul_sprites.png';
const SPRITE_WIDTH = 160;
const SPRITE_HEIGHT = 160;

const tableImg = new Image();
tableImg.src = 'sprites/party_table.png';
const table = {
  x: 120, y: -50, width: 300, height: 300
};
const tableHitbox = {
  x: 125.5, y: 50, width: 290, height: 45
};

const downloadIcon = new Image();
downloadIcon.src = 'sprites/download.png';
const downloadBtn = {
  x: 540, y: 540, width: 40, height: 40
};

// Player hitbox definition and update function
window.playerHitbox = { x: 0, y: 0, width: 30, height: 50 };
window.updatePlayerHitbox = function (player) {
  window.playerHitbox.x = player.x + 10;
  window.playerHitbox.y = player.y + 0;
};

function drawPlayer(ctx, player) {
  if (spriteSheet.complete) {
    const frame = SPRITE_MAP[window.playerDir][window.animFrame];
    ctx.drawImage(
      spriteSheet,
      frame.x * SPRITE_SIZE, frame.y * SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE,
      player.x, player.y, player.width, player.height
    );
  }
}

function drawTable(ctx) {
  if (tableImg.complete) {
    ctx.drawImage(tableImg, table.x, table.y, table.width, table.height);
  }
}

function isColliding(a, b) {
  return a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;
}

// Export for use in index.html
window.SPRITE_MAP = SPRITE_MAP;
window.playerDir = playerDir;
window.animFrame = animFrame;
window.animTimer = animTimer;
window.ANIM_INTERVAL = ANIM_INTERVAL;
window.spriteSheet = spriteSheet;
window.tableImg = tableImg;
window.downloadIcon = downloadIcon;
window.downloadBtn = downloadBtn;
window.table = table;
window.tableHitbox = tableHitbox;
window.drawPlayer = drawPlayer;
window.drawTable = drawTable;
window.isColliding = isColliding;

// Adjustable interaction box size
window.cubeInteractionBoxMargin = 20; // Change this value to adjust size

const cubeItem = {
  x: 250, y: 60, width: 20, height: 20, color: '#0ff'
};
function getCubeInteractionBox() {
  const m = window.cubeInteractionBoxMargin;
  return {
    x: cubeItem.x - m,
    y: cubeItem.y - m,
    width: cubeItem.width + m * 2,
    height: cubeItem.height + m * 2
  };
}
window.cubeItem = cubeItem;
window.getCubeInteractionBox = getCubeInteractionBox;

// drawCube(ctx) and new drawCheckpoint(ctx)
function drawCube(ctx) {
  ctx.save();
  ctx.fillStyle = cubeItem.color;
  ctx.fillRect(cubeItem.x, cubeItem.y, cubeItem.width, cubeItem.height);
  // Draw interaction box
  const ibox = window.getCubeInteractionBox();
  ctx.strokeStyle = 'cyan';
  ctx.lineWidth = 2;
  ctx.strokeRect(
    window.cubeInteractionBox.x,
    window.cubeInteractionBox.y,
    window.cubeInteractionBox.width,
    window.cubeInteractionBox.height
  );
  ctx.restore();
}
function drawCheckpoint(ctx) {
  ctx.save();
  ctx.shadowColor = '#f44';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#f00';
  ctx.fillRect(window.checkpoint.x, window.checkpoint.y, window.checkpoint.width, window.checkpoint.height);
  ctx.fillRect(window.checkpointRight.x, window.checkpointRight.y, window.checkpointRight.width, window.checkpointRight.height);
  ctx.restore();
}
window.drawCube = drawCube;
window.cubeInteractionBox = {
  x: 250, // adjust as needed
  y: 45,  // adjust as needed
  width: 20, // adjust as needed
  height: 51 // adjust as needed
};
window.checkpoint = { x: 30, y: 260, width: 20, height: 20 };
window.checkpointHitbox = { x: 25, y: 255, width: 30, height: 30 };
window.checkpointRight = { x: 550, y: 260, width: 20, height: 20 };
window.checkpointRightHitbox = { x: 545, y: 255, width: 30, height: 30 };
window.drawCheckpoint = drawCheckpoint;