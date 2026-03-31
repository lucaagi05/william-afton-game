// health.js - Player health system: HP bar, damage, healing, fade display, immunity frames

(function () {
  let maxHP = 10;
  let currentHP = 10;
  let lastDamageTime = 0;
  const DISPLAY_DURATION = 5000; // 5 seconds after damage
  const FADE_START = 4000; // start fading at 4s

  // Immunity frames
  let immuneUntil = 0;
  const IMMUNITY_DURATION = 2000; // 2 seconds

  function takeDamage(amount) {
    const now = Date.now();

    // Check immunity
    if (now < immuneUntil) return;
    if (currentHP <= 0) return;

    // Play damage sound
    if (window.AudioManager) {
      window.AudioManager.playDamageSound();
    }

    currentHP = Math.max(0, currentHP - amount);
    lastDamageTime = now;

    // Start immunity frames
    immuneUntil = now + IMMUNITY_DURATION;

    // Screen shake
    if (window.triggerScreenShake) {
      window.triggerScreenShake(6, 300);
    }

    // Recoil: push player 1 tile backward
    if (window.player && window.playerDir && currentHP > 0) {
      const TILE = window.TILE_SIZE || 50;
      const dir = window.playerDir;
      let newX = window.player.x;
      let newY = window.player.y;

      // Move OPPOSITE to facing direction
      if (dir === 'up') newY += TILE;
      else if (dir === 'down') newY -= TILE;
      else if (dir === 'left') newX += TILE;
      else if (dir === 'right') newX -= TILE;

      // Clamp to room bounds
      if (window.MapManager) {
        const room = window.MapManager.current();
        const rw = room.pixelWidth || 600;
        const rh = room.pixelHeight || 600;
        newX = Math.max(0, Math.min(rw - TILE, newX));
        newY = Math.max(0, Math.min(rh - TILE, newY));
      }

      // Only move if not blocked
      if (!window.isColliding) {
        window.player.x = newX;
        window.player.y = newY;
      } else {
        // Check obstacles
        const room = window.MapManager ? window.MapManager.current() : null;
        let blocked = false;
        if (room) {
          const testHitbox = { x: newX, y: newY, width: TILE, height: TILE };
          for (const obs of room.obstacles) {
            if (window.isColliding(testHitbox, obs)) {
              blocked = true;
              break;
            }
          }
        }
        if (!blocked) {
          window.player.x = newX;
          window.player.y = newY;
        }
      }
    }
  }

  function heal(amount) {
    if (currentHP < maxHP && window.AudioManager) {
      window.AudioManager.playHealSound();
    }
    currentHP = Math.min(maxHP, currentHP + amount);
  }

  function getBarColor() {
    const pct = currentHP / maxHP;
    if (pct > 0.6) return '#4f4';
    if (pct > 0.3) return '#ff0';
    return '#f44';
  }

  function drawHealthBar(ctx) {
    const now = Date.now();
    const inventoryOpen = window.Inventory && window.Inventory.isOpen;
    const timeSinceDamage = now - lastDamageTime;
    const showFromDamage = lastDamageTime > 0 && timeSinceDamage < DISPLAY_DURATION;

    if (!inventoryOpen && !showFromDamage) return;

    // Compute alpha (fade out in last second of damage display)
    let alpha = 1.0;
    if (!inventoryOpen && showFromDamage && timeSinceDamage > FADE_START) {
      alpha = 1.0 - (timeSinceDamage - FADE_START) / (DISPLAY_DURATION - FADE_START);
      alpha = Math.max(0, Math.min(1, alpha));
    }

    const barW = 180;
    const barH = 22;
    const barX = 20;
    const barY = 20;
    const pct = currentHP / maxHP;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);

    // Bar background
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(barX, barY, barW, barH);

    // Filled portion
    ctx.fillStyle = getBarColor();
    ctx.fillRect(barX, barY, barW * pct, barH);

    // HP text
    ctx.font = '13px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentHP + '/' + maxHP + ' HP', barX + barW / 2, barY + barH / 2);

    ctx.restore();
  }

  window.Health = {
    get maxHP() { return maxHP; },
    get currentHP() { return currentHP; },
    set currentHP(v) { currentHP = v; },
    set maxHP(v) { maxHP = v; },
    get isImmune() { return Date.now() < immuneUntil; },
    get immuneUntil() { return immuneUntil; },
    takeDamage,
    heal,
    draw: drawHealthBar,
    resetImmunity() { immuneUntil = 0; }
  };
})();
