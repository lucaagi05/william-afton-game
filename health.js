// health.js - Player health system: HP bar, damage, healing, fade display

(function () {
  let maxHP = 10;
  let currentHP = 10;
  let lastDamageTime = 0;
  const DISPLAY_DURATION = 5000; // 5 seconds after damage
  const FADE_START = 4000; // start fading at 4s

  function takeDamage(amount) {
    currentHP = Math.max(0, currentHP - amount);
    lastDamageTime = Date.now();
  }

  function heal(amount) {
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
    takeDamage,
    heal,
    draw: drawHealthBar
  };
})();
