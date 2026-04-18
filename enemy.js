// enemy.js - Enemy AI system: chase, attack, retreat, anti-stall logic
// Manages all entities with type === 'enemy'

(function () {
  const TILE = window.TILE_SIZE || 50;

  // --- Tuning constants ---
  const ACTIVATION_RANGE = 5;       // tiles — enemy starts chasing
  const DEACTIVATION_RANGE = 8;     // tiles — enemy returns to idle
  const ATTACK_RANGE = 1;           // tiles — adjacent = can hit
  const ATTACK_DAMAGE = 2;          // HP per hit
  const ATTACK_COOLDOWN = 3000;     // ms between attacks
  const ATTACK_ANIM_DURATION = 300; // ms for the burst visual
  const MOVE_INTERVAL = 160;        // ms between enemy steps (~85% of player walk speed)
  const STALL_THRESHOLD = 500;      // ms before retreating when near player
  const RETREAT_STEPS = 3;          // tiles to retreat

  // --- Per-enemy state (attached to entity objects) ---
  function ensureAIState(ent) {
    if (ent._ai) return;
    ent._ai = {
      state: 'idle',           // 'idle' | 'chase' | 'attack' | 'retreat'
      lastMoveTime: 0,
      lastAttackTime: 0,
      attackAnimEnd: 0,
      // Anti-stall tracking
      stallTimer: 0,
      lastPlayerTileX: -1,
      lastPlayerTileY: -1,
      // Retreat
      retreatDirX: 0,
      retreatDirY: 0,
      retreatRemaining: 0,
      retreatRemaining: 0,
      attackChargeTimer: 0,
      _lastUpdate: 0,
      // Spawn position (for reference)
      spawnX: ent.area.x,
      spawnY: ent.area.y
    };
  }

  // --- Distance helpers (tile-based, Chebyshev) ---
  function tileDist(ax, ay, bx, by) {
    const dx = Math.abs(Math.floor(ax / TILE) - Math.floor(bx / TILE));
    const dy = Math.abs(Math.floor(ay / TILE) - Math.floor(by / TILE));
    return Math.max(dx, dy); // Chebyshev distance
  }

  function tileDistManhattan(ax, ay, bx, by) {
    const dx = Math.abs(Math.floor(ax / TILE) - Math.floor(bx / TILE));
    const dy = Math.abs(Math.floor(ay / TILE) - Math.floor(by / TILE));
    return dx + dy;
  }

  // --- Tile blocked check (respects obstacles AND room bounds) ---
  function isMoveBlocked(newX, newY, room) {
    // Room bounds
    const rw = room.pixelWidth || 600;
    const rh = room.pixelHeight || 600;
    if (newX < 0 || newY < 0 || newX >= rw || newY >= rh) return true;

    // Obstacles
    const testHitbox = { x: newX, y: newY, width: TILE, height: TILE };
    for (const obs of room.obstacles) {
      if (window.isColliding(testHitbox, obs)) return true;
    }

    // Don't walk onto other enemies
    for (const ent of window.Entities) {
      if (ent.type !== 'enemy' || ent.dead) continue;
      if (ent.area.x === newX && ent.area.y === newY) continue; // self
      if (window.isColliding(testHitbox, ent.area)) return true;
    }

    return false;
  }

  // --- Chase step: move 1 tile toward player ---
  function chaseStep(ent, playerX, playerY, room) {
    const ex = ent.area.x;
    const ey = ent.area.y;
    const dx = playerX - ex;
    const dy = playerY - ey;

    // Determine preferred axis (larger gap first)
    let stepX = 0, stepY = 0;
    if (Math.abs(dx) >= Math.abs(dy)) {
      stepX = dx > 0 ? TILE : (dx < 0 ? -TILE : 0);
      stepY = dy > 0 ? TILE : (dy < 0 ? -TILE : 0);
    } else {
      stepY = dy > 0 ? TILE : (dy < 0 ? -TILE : 0);
      stepX = dx > 0 ? TILE : (dx < 0 ? -TILE : 0);
    }

    // Try primary axis
    const primaryIsX = Math.abs(dx) >= Math.abs(dy);

    if (primaryIsX && stepX !== 0) {
      const newX = ex + stepX;
      if (!isMoveBlocked(newX, ey, room) && !(newX === playerX && ey === playerY)) {
        ent.area.x = newX;
        return true;
      }
    } else if (!primaryIsX && stepY !== 0) {
      const newY = ey + stepY;
      if (!isMoveBlocked(ex, newY, room) && !(ex === playerX && newY === playerY)) {
        ent.area.y = newY;
        return true;
      }
    }

    // Try secondary axis
    if (primaryIsX && stepY !== 0) {
      const newY = ey + stepY;
      if (!isMoveBlocked(ex, newY, room) && !(ex === playerX && newY === playerY)) {
        ent.area.y = newY;
        return true;
      }
    } else if (!primaryIsX && stepX !== 0) {
      const newX = ex + stepX;
      if (!isMoveBlocked(newX, ey, room) && !(newX === playerX && ey === playerY)) {
        ent.area.x = newX;
        return true;
      }
    }

    return false; // stuck
  }

  // --- Retreat step: move 1 tile away from player ---
  function retreatStep(ent, ai, room) {
    const newX = ent.area.x + ai.retreatDirX * TILE;
    const newY = ent.area.y + ai.retreatDirY * TILE;

    if (!isMoveBlocked(newX, newY, room)) {
      ent.area.x = newX;
      ent.area.y = newY;
      ai.retreatRemaining--;
      return true;
    }
    // Try just X
    if (ai.retreatDirX !== 0) {
      const altX = ent.area.x + ai.retreatDirX * TILE;
      if (!isMoveBlocked(altX, ent.area.y, room)) {
        ent.area.x = altX;
        ai.retreatRemaining--;
        return true;
      }
    }
    // Try just Y
    if (ai.retreatDirY !== 0) {
      const altY = ent.area.y + ai.retreatDirY * TILE;
      if (!isMoveBlocked(ent.area.x, altY, room)) {
        ent.area.y = altY;
        ai.retreatRemaining--;
        return true;
      }
    }

    // Can't retreat further — give up and resume chase
    ai.retreatRemaining = 0;
    return false;
  }

  // --- Main update (called every frame from game.js) ---
  function updateEnemies() {
    const now = Date.now();
    const currentRoom = window.MapManager.currentRoom;
    const room = window.MapManager.current();
    const px = window.player.x;
    const py = window.player.y;

    for (const ent of window.Entities) {
      if (ent.type !== 'enemy') continue;
      if (ent.room !== currentRoom) continue;
      if (ent.dead) continue;

      ensureAIState(ent);
      const ai = ent._ai;
      const dist = tileDist(ent.area.x, ent.area.y, px, py);
      const delta = now - (ai._lastUpdate || now);
      ai._lastUpdate = now;

      // --- Mask effect: force all enemies to flee ---
      if (window.maskEffect && window.maskEffect.active) {
        if (now - ai.lastMoveTime >= MOVE_INTERVAL) {
          ai.lastMoveTime = now;
          // Calculate direction away from player
          const rdx = ent.area.x - px;
          const rdy = ent.area.y - py;
          const fleeX = rdx >= 0 ? 1 : -1;
          const fleeY = rdy >= 0 ? 1 : -1;
          ai.retreatDirX = rdx === 0 ? (Math.random() > 0.5 ? 1 : -1) : fleeX;
          ai.retreatDirY = rdy === 0 ? (Math.random() > 0.5 ? 1 : -1) : fleeY;
          ai.retreatRemaining = 1;
          retreatStep(ent, ai, room);
        }
        ai.state = 'idle';
        ai.stallTimer = 0;
        ai.attackChargeTimer = 0;
        // Update hitbox
        if (ent.hitbox) {
          ent.hitbox.x = ent.area.x;
          ent.hitbox.y = ent.area.y;
        }
        continue;
      }
      switch (ai.state) {

        case 'idle':
          if (dist <= ACTIVATION_RANGE) {
            ai.state = 'chase';
            ai.stallTimer = 0;
            ai.attackChargeTimer = 0;
          }
          break;

        case 'chase': {
          // Deactivate if player leaves range
          if (dist > DEACTIVATION_RANGE) {
            ai.state = 'idle';
            break;
          }

          // Attack if adjacent and cooldown is over
          if (dist <= ATTACK_RANGE && now - ai.lastAttackTime >= ATTACK_COOLDOWN) {
            ai.attackChargeTimer += delta;

            // Only attack after 0.6s of charge
            if (ai.attackChargeTimer >= 400) {
              ai.state = 'attack';
              ai.lastAttackTime = now;
              ai.attackAnimEnd = now + ATTACK_ANIM_DURATION;
              ai.attackChargeTimer = 0;

              // Deal damage
              if (window.Health) {
                window.Health.takeDamage(ATTACK_DAMAGE);
              }
              if (window.AudioManager) {
                window.AudioManager.playDamageSound();
              }

              break;
            }
          } else {
            // Reset charge if not adjacent or cooldown active
            ai.attackChargeTimer = 0;
          }

          // Move toward player
          if (now - ai.lastMoveTime >= MOVE_INTERVAL && ai.attackChargeTimer === 0) {
            ai.lastMoveTime = now;
            chaseStep(ent, px, py, room);
          }

          // --- Anti-stall detection ---
          if (dist <= ATTACK_RANGE) {
            ai.stallTimer += delta;
          } else {
            ai.stallTimer = 0;
          }

          if (ai.stallTimer >= STALL_THRESHOLD) {
            // Start retreat
            const rdx = ent.area.x - px;
            const rdy = ent.area.y - py;
            ai.retreatDirX = rdx >= 0 ? 1 : -1;
            ai.retreatDirY = rdy >= 0 ? 1 : -1;
            if (rdx === 0) ai.retreatDirX = (Math.random() > 0.5) ? 1 : -1;
            if (rdy === 0) ai.retreatDirY = (Math.random() > 0.5) ? 1 : -1;
            ai.retreatRemaining = RETREAT_STEPS;
            ai.state = 'retreat';
            ai.stallTimer = 0;
            ai.attackChargeTimer = 0;
          }
          break;
        }

        case 'attack':
          // Wait for animation to finish, then retreat
          if (now >= ai.attackAnimEnd) {
            const rdx = ent.area.x - px;
            const rdy = ent.area.y - py;
            ai.retreatDirX = rdx >= 0 ? 1 : -1;
            ai.retreatDirY = rdy >= 0 ? 1 : -1;
            if (rdx === 0) ai.retreatDirX = (Math.random() > 0.5) ? 1 : -1;
            if (rdy === 0) ai.retreatDirY = (Math.random() > 0.5) ? 1 : -1;
            ai.retreatRemaining = RETREAT_STEPS;
            ai.state = 'retreat';
            ai.stallTimer = 0;
          }
          break;

        case 'retreat':
          if (ai.retreatRemaining <= 0) {
            ai.state = 'cooldown_wait';
            ai.stallTimer = 0;
            break;
          }
          if (now - ai.lastMoveTime >= MOVE_INTERVAL) {
            ai.lastMoveTime = now;
            retreatStep(ent, ai, room);
          }
          break;

        case 'cooldown_wait':
          // Wait here until cooldown is over
          if (dist > DEACTIVATION_RANGE) {
            ai.state = 'idle';
            break;
          }

          if (now - ai.lastAttackTime >= ATTACK_COOLDOWN) {
            ai.state = 'chase';
            ai.stallTimer = 0;
            ai.attackChargeTimer = 0;
            break;
          }

          // Anti-stall still applies if player walks up while resting
          if (dist <= ATTACK_RANGE) {
            ai.stallTimer += delta;
            if (ai.stallTimer >= STALL_THRESHOLD) {
              const rdx = ent.area.x - px;
              const rdy = ent.area.y - py;
              ai.retreatDirX = rdx >= 0 ? 1 : -1;
              ai.retreatDirY = rdy >= 0 ? 1 : -1;
              if (rdx === 0) ai.retreatDirX = (Math.random() > 0.5) ? 1 : -1;
              if (rdy === 0) ai.retreatDirY = (Math.random() > 0.5) ? 1 : -1;
              ai.retreatRemaining = RETREAT_STEPS;
              ai.state = 'retreat';
              ai.stallTimer = 0;
            }
          } else {
            ai.stallTimer = 0;
          }
          break;
      }


      // Update hitbox to match current position
      if (ent.hitbox) {
        ent.hitbox.x = ent.area.x;
        ent.hitbox.y = ent.area.y;
      }
    }
  }

  // --- Draw attack burst animation ---
  function drawEnemyEffects(ctx) {
    const now = Date.now();
    const currentRoom = window.MapManager.currentRoom;

    for (const ent of window.Entities) {
      if (ent.type !== 'enemy') continue;
      if (ent.room !== currentRoom) continue;
      if (ent.dead || !ent._ai) continue;

      const ai = ent._ai;

      // Attack burst: expanding red ring
      if (now < ai.attackAnimEnd) {
        const elapsed = now - (ai.attackAnimEnd - ATTACK_ANIM_DURATION);
        const t = Math.min(1, elapsed / ATTACK_ANIM_DURATION); // 0 → 1
        const cx = ent.area.x + TILE / 2;
        const cy = ent.area.y + TILE / 2;

        // Expanding shockwave ring
        const maxRadius = TILE * 1.8;
        const radius = maxRadius * t;
        const alpha = 1.0 - t;

        ctx.save();
        ctx.globalAlpha = alpha * 0.8;
        ctx.strokeStyle = '#ff2222';
        ctx.lineWidth = 4 - t * 3;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner flash
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Radial spikes
        ctx.globalAlpha = alpha * 0.6;
        ctx.strokeStyle = '#ff6666';
        ctx.lineWidth = 2;
        const spikeCount = 8;
        for (let i = 0; i < spikeCount; i++) {
          const angle = (Math.PI * 2 / spikeCount) * i + t * 0.5;
          const innerR = TILE * 0.3;
          const outerR = radius * 0.9;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
          ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
          ctx.stroke();
        }

        ctx.restore();
      }
    }
  }

  // --- Reset AI state (for game restart) ---
  function resetAllEnemies() {
    for (const ent of window.Entities) {
      if (ent.type !== 'enemy') continue;
      if (ent._ai) {
        ent.area.x = ent._ai.spawnX;
        ent.area.y = ent._ai.spawnY;
        ent._ai.state = 'idle';
        ent._ai.stallTimer = 0;
        ent._ai.lastAttackTime = 0;
        ent._ai.attackAnimEnd = 0;
        ent._ai.retreatRemaining = 0;
      }
      ent.dead = false;
      ent.hp = ent.maxHp;
      ent.showHealthBar = false;
    }
  }

  // --- Export ---
  window.EnemyAI = {
    update: updateEnemies,
    drawEffects: drawEnemyEffects,
    reset: resetAllEnemies
  };
})();
