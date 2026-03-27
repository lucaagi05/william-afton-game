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

const downloadIcon = new Image();
downloadIcon.src = 'sprites/download.png';
const downloadBtn = {
  x: 540, y: 540, width: 40, height: 40
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


function isColliding(a, b) {
  return a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;
}

// Export local constants for use in other modules
window.SPRITE_MAP = SPRITE_MAP;
window.spriteSheet = spriteSheet;
window.tableImg = tableImg;
window.downloadIcon = downloadIcon;
window.downloadBtn = downloadBtn;
window.drawPlayer = drawPlayer;
window.isColliding = isColliding;