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
    const vx = player.visualX !== undefined ? player.visualX : player.x;
    const vy = player.visualY !== undefined ? player.visualY : player.y;

    // Immunity frame flickering
    const immune = window.Health && window.Health.isImmune;
    if (immune) {
      // Toggle every ~80ms: visible, then blacked-out silhouette
      const flickerPhase = Math.floor(Date.now() / 80) % 2;
      if (flickerPhase === 1) {
        // Draw blacked-out silhouette
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.drawImage(
          spriteSheet,
          frame.x * SPRITE_SIZE, frame.y * SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE,
          vx, vy, player.width, player.height
        );
        // Overlay dark tint
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = '#000';
        ctx.fillRect(vx, vy, player.width, player.height);
        ctx.restore();
        return;
      }
    }

    ctx.drawImage(
      spriteSheet,
      frame.x * SPRITE_SIZE, frame.y * SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE,
      vx, vy, player.width, player.height
    );
  }
}


function isColliding(a, b) {
  return a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;
}

function isTouching(a, b) {
  return a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y;
}

// Export local constants for use in other modules
window.SPRITE_MAP = SPRITE_MAP;
window.spriteSheet = spriteSheet;
window.tableImg = tableImg;
window.downloadIcon = downloadIcon;
window.downloadBtn = downloadBtn;
window.drawPlayer = drawPlayer;
window.isColliding = isColliding;
window.isTouching = isTouching;