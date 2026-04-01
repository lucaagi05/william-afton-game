// entities.js - Master list of all items, obstacles, doors, and save points
// All positions are tile-aligned (TILE_SIZE = 50px)
const TILE_SIZE = 50;
window.TILE_SIZE = TILE_SIZE;

window.Entities = [
  // ==========================================
  // ROOM 1 (12×12 tiles, 600×600)
  // ==========================================
  {
    id: 'main_table',
    type: 'obstacle',
    room: 'room1',
    hitbox: { x: 2 * TILE_SIZE, y: 1 * TILE_SIZE, width: 6 * TILE_SIZE, height: TILE_SIZE },
    draw(ctx) {
      if (window.tableImg && window.tableImg.complete) {
        ctx.drawImage(window.tableImg, this.hitbox.x - 5, this.hitbox.y - 100, 300, 300);
      }
    }
  },

  {
    id: 'cube_item',
    type: 'item',
    room: 'room1',
    interactionId: 'cube_item',
    // --> HOW TO MOVE ITEMS: Change the multiplier before TILE_SIZE in `area` (e.g., x: 10 * TILE_SIZE)
    // Make sure to also update `interactionArea` so you can still grab it!
    area: { x: 5 * TILE_SIZE, y: 1 * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE },
    color: '#0ff',
    interactionArea: { x: 5 * TILE_SIZE, y: 1 * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE * 2 },
    draw(ctx) {
      ctx.save(); ctx.fillStyle = this.color;
      const s = TILE_SIZE * 0.5;
      const ox = this.area.x + (TILE_SIZE - s) / 2;
      const oy = this.area.y + (TILE_SIZE - s) / 2;
      ctx.fillRect(ox, oy, s, s);
      ctx.restore();
    }
  },

  {
    id: 'checkpoint_right',
    type: 'savepoint',
    room: 'room1',
    interactionId: 'checkpoint_right',
    area: { x: 10 * TILE_SIZE, y: 9 * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE },
    color: '#f00',
    interactionArea: { x: 9 * TILE_SIZE, y: 8 * TILE_SIZE, width: TILE_SIZE * 3, height: TILE_SIZE * 3 },
    draw(ctx) {
      ctx.save(); ctx.shadowColor = '#f44'; ctx.shadowBlur = 15;
      ctx.fillStyle = this.color;
      const s = TILE_SIZE * 0.5;
      const ox = this.area.x + (TILE_SIZE - s) / 2;
      const oy = this.area.y + (TILE_SIZE - s) / 2;
      ctx.fillRect(ox, oy, s, s);
      ctx.restore();
    }
  },

  // ==========================================
  // ROOM 2 (12×12 tiles, 600×600)
  // ==========================================
  {
    id: 'checkpoint_left',
    type: 'savepoint',
    room: 'room2',
    interactionId: 'checkpoint_left',
    area: { x: 1 * TILE_SIZE, y: 9 * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE },
    color: '#f00',
    interactionArea: { x: 0, y: 8 * TILE_SIZE, width: TILE_SIZE * 3, height: TILE_SIZE * 3 },
    draw(ctx) {
      ctx.save(); ctx.shadowColor = '#f44'; ctx.shadowBlur = 15;
      ctx.fillStyle = this.color;
      const s = TILE_SIZE * 0.5;
      const ox = this.area.x + (TILE_SIZE - s) / 2;
      const oy = this.area.y + (TILE_SIZE - s) / 2;
      ctx.fillRect(ox, oy, s, s);
      ctx.restore();
    }
  },

  {
    id: 'room2_cube',
    type: 'item',
    room: 'room2',
    interactionId: null,
    area: { x: 6 * TILE_SIZE, y: 6 * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE },
    color: '#0ff',
    interactionArea: null,
    draw(ctx) {
      ctx.save(); ctx.fillStyle = this.color;
      const s = TILE_SIZE * 0.5;
      const ox = this.area.x + (TILE_SIZE - s) / 2;
      const oy = this.area.y + (TILE_SIZE - s) / 2;
      ctx.fillRect(ox, oy, s, s);
      ctx.restore();
    }
  },

  // KEY ITEM (Key Item category = yellow)
  {
    id: 'key_item',
    type: 'item',
    room: 'room2',
    collected: false,
    interactionId: 'key_item',
    area: { x: 2 * TILE_SIZE, y: 6 * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE },
    color: '#ff0',
    interactionArea: { x: 1 * TILE_SIZE, y: 5 * TILE_SIZE, width: TILE_SIZE * 3, height: TILE_SIZE * 3 },
    draw(ctx) {
      if (this.collected) return;
      ctx.save();
      ctx.shadowColor = '#ff0'; ctx.shadowBlur = 10;
      ctx.fillStyle = this.color;
      const s = TILE_SIZE * 0.45;
      const ox = this.area.x + (TILE_SIZE - s) / 2;
      const oy = this.area.y + (TILE_SIZE - s) / 2;
      ctx.fillRect(ox, oy, s, s);
      ctx.font = '12px monospace'; ctx.fillStyle = '#000';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('K', this.area.x + TILE_SIZE / 2, this.area.y + TILE_SIZE / 2);
      ctx.restore();
    }
  },

  // ==========================================
  // ROOM 3 — HALLWAY (20×6 tiles, 1000×300)
  // ==========================================

  // CANDY ITEM (Consumable = blue)
  {
    id: 'candy_item',
    type: 'item',
    room: 'room3',
    collected: false,
    interactionId: 'candy_item',
    area: { x: 10 * TILE_SIZE, y: 3 * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE },
    color: '#4af',
    interactionArea: { x: 9 * TILE_SIZE, y: 2 * TILE_SIZE, width: TILE_SIZE * 3, height: TILE_SIZE * 3 },
    draw(ctx) {
      if (this.collected) return;
      ctx.save();
      ctx.shadowColor = '#4af'; ctx.shadowBlur = 8;
      ctx.fillStyle = this.color;
      const s = TILE_SIZE * 0.4;
      const ox = this.area.x + (TILE_SIZE - s) / 2;
      const oy = this.area.y + (TILE_SIZE - s) / 2;
      ctx.fillRect(ox, oy, s, s);
      ctx.font = '10px monospace'; ctx.fillStyle = '#fff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('C', this.area.x + TILE_SIZE / 2, this.area.y + TILE_SIZE / 2);
      ctx.restore();
    }
  },

  // ==========================================
  // ROOM 4 (7×7 tiles, 350×350)
  // ==========================================
  // (no standalone entities besides doors)

  // ==========================================
  // GARDEN (16×16 tiles, 800×800)
  // ==========================================

  // Second Candy in Garden (Consumable = blue)
  {
    id: 'candy_item_garden',
    type: 'item',
    room: 'garden',
    collected: false,
    interactionId: 'candy_item_garden',
    area: { x: 8 * TILE_SIZE, y: 10 * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE },
    color: '#4af',
    interactionArea: { x: 7 * TILE_SIZE, y: 9 * TILE_SIZE, width: TILE_SIZE * 3, height: TILE_SIZE * 3 },
    draw(ctx) {
      if (this.collected) return;
      ctx.save();
      ctx.shadowColor = '#4af'; ctx.shadowBlur = 8;
      ctx.fillStyle = this.color;
      const s = TILE_SIZE * 0.4;
      const ox = this.area.x + (TILE_SIZE - s) / 2;
      const oy = this.area.y + (TILE_SIZE - s) / 2;
      ctx.fillRect(ox, oy, s, s);
      ctx.font = '10px monospace'; ctx.fillStyle = '#fff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('C', this.area.x + TILE_SIZE / 2, this.area.y + TILE_SIZE / 2);
      ctx.restore();
    }
  },

  // Red circle — AI-driven enemy that chases, attacks, and retreats
  {
    id: 'red_circle',
    type: 'enemy',
    room: 'garden',
    attackable: true,
    hp: 9,
    maxHp: 9,
    dead: false,
    showHealthBar: false,
    area: { x: 12 * TILE_SIZE, y: 8 * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE },
    hitbox: { x: 12 * TILE_SIZE, y: 8 * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE },
    color: '#f44',
    draw(ctx) {
      if (this.dead) return;
      const cx = this.area.x + TILE_SIZE / 2;
      const cy = this.area.y + TILE_SIZE / 2;
      const ai = this._ai;
      const isActive = ai && (ai.state === 'chase' || ai.state === 'attack' || ai.state === 'retreat');

      ctx.save();

      // Pulsing glow when active
      if (isActive) {
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 150);
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10 + pulse * 12;
      }

      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(cx, cy, TILE_SIZE * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Eyes: small dots that look toward the player when active
      if (isActive && window.player) {
        const dx = window.player.x - this.area.x;
        const dy = window.player.y - this.area.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const lookX = (dx / len) * 4;
        const lookY = (dy / len) * 4;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cx - 5 + lookX, cy - 3 + lookY, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 5 + lookX, cy - 3 + lookY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Health bar (shown after first hit)
      if (this.showHealthBar && this.hp > 0) {
        const barW = TILE_SIZE * 0.8;
        const barH = 5;
        const barX = this.area.x + (TILE_SIZE - barW) / 2;
        const barY = this.area.y - 10;
        const pct = this.hp / this.maxHp;
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
        ctx.fillStyle = '#f44';
        ctx.fillRect(barX, barY, barW * pct, barH);
      }

      ctx.restore();
    }
  },

  // KNIFE ITEM (Weapon category = red)
  {
    id: 'knife_item',
    type: 'item',
    room: 'room1',
    collected: false,
    interactionId: 'knife_item',
    area: { x: 8 * TILE_SIZE, y: 5 * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE },
    color: '#f44',
    interactionArea: { x: 7 * TILE_SIZE, y: 4 * TILE_SIZE, width: TILE_SIZE * 3, height: TILE_SIZE * 3 },
    draw(ctx) {
      if (this.collected) return;
      ctx.save();
      ctx.shadowColor = '#f44'; ctx.shadowBlur = 10;
      ctx.fillStyle = this.color;
      const s = TILE_SIZE * 0.45;
      const ox = this.area.x + (TILE_SIZE - s) / 2;
      const oy = this.area.y + (TILE_SIZE - s) / 2;
      ctx.fillRect(ox, oy, s, s);
      ctx.font = '12px monospace'; ctx.fillStyle = '#fff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('K', this.area.x + TILE_SIZE / 2, this.area.y + TILE_SIZE / 2);
      ctx.restore();
    }
  },

  // ==========================================
  // DOORS
  // ==========================================
  // --> HOW TO MOVE DOORS:
  // When making a room larger/smaller in map.js, doors DO NOT auto-align to the border!
  // You must update:
  // 1. The structural x/y property (e.g., `x: 10 * TILE_SIZE`)
  // 2. The `interactionArea`, ensuring it spatially overlaps where the doorway visual sits.
  // 3. For the opposite door in the next room, update `spawnX` and `spawnY` so you emerge properly.

  // Room 1 ↔ Room 2 (bottom/top, tiles 5-6)
  {
    id: 'door_to_room2',
    type: 'door', room: 'room1', edge: 'bottom',
    x: 15 * TILE_SIZE, width: 2 * TILE_SIZE,
    targetRoom: 'room2', spawnX: 5 * TILE_SIZE, spawnY: 0,
    interactionArea: { x: 15 * TILE_SIZE, y: 1500, width: 2 * TILE_SIZE, height: TILE_SIZE },
    draw() { }
  },
  {
    id: 'door_to_room1',
    type: 'door', room: 'room2', edge: 'top',
    x: 5 * TILE_SIZE, width: 2 * TILE_SIZE,
    targetRoom: 'room1', spawnX: 15 * TILE_SIZE, spawnY: 29 * TILE_SIZE,
    interactionArea: { x: 5 * TILE_SIZE, y: -TILE_SIZE, width: 2 * TILE_SIZE, height: TILE_SIZE },
    draw() { }
  },

  // Room 2 → Room 3 (right edge, tiles 5-6)
  {
    id: 'door_room2_to_room3',
    type: 'door', room: 'room2', edge: 'right',
    y: 5 * TILE_SIZE, height: 2 * TILE_SIZE,
    targetRoom: 'room3', spawnX: 1 * TILE_SIZE, spawnY: 2 * TILE_SIZE,
    interactionArea: { x: 600, y: 5 * TILE_SIZE, width: TILE_SIZE, height: 2 * TILE_SIZE },
    draw() { }
  },
  // Room 3 → Room 2 (left edge, tiles 2-3)
  {
    id: 'door_room3_to_room2',
    type: 'door', room: 'room3', edge: 'left',
    y: 2 * TILE_SIZE, height: 2 * TILE_SIZE,
    targetRoom: 'room2', spawnX: 10 * TILE_SIZE, spawnY: 5 * TILE_SIZE,
    interactionArea: { x: -TILE_SIZE, y: 2 * TILE_SIZE, width: TILE_SIZE, height: 2 * TILE_SIZE },
    draw() { }
  },

  // Room 3 → Room 4 (right edge, tiles 2-3)
  {
    id: 'door_room3_to_room4',
    type: 'door', room: 'room3', edge: 'right',
    y: 2 * TILE_SIZE, height: 2 * TILE_SIZE,
    targetRoom: 'room4', spawnX: 1 * TILE_SIZE, spawnY: 2 * TILE_SIZE,
    interactionArea: { x: 1000, y: 2 * TILE_SIZE, width: TILE_SIZE, height: 2 * TILE_SIZE },
    draw() { }
  },
  // Room 4 → Room 3 (left edge, tiles 2-3)
  {
    id: 'door_room4_to_room3',
    type: 'door', room: 'room4', edge: 'left',
    y: 2 * TILE_SIZE, height: 2 * TILE_SIZE,
    targetRoom: 'room3', spawnX: 18 * TILE_SIZE, spawnY: 2 * TILE_SIZE,
    interactionArea: { x: -TILE_SIZE, y: 2 * TILE_SIZE, width: TILE_SIZE, height: 2 * TILE_SIZE },
    draw() { }
  },

  // Room 4 → Garden (bottom, tiles 3-4, LOCKED)
  {
    id: 'door_to_garden',
    type: 'door', room: 'room4', edge: 'bottom',
    x: 3 * TILE_SIZE, width: 2 * TILE_SIZE,
    locked: true,
    targetRoom: 'garden', spawnX: 7 * TILE_SIZE, spawnY: 1 * TILE_SIZE,
    interactionArea: { x: 3 * TILE_SIZE, y: 350, width: 2 * TILE_SIZE, height: TILE_SIZE },
    // Separate area for lock interaction (inside room, near door)
    lockArea: { x: 3 * TILE_SIZE, y: 5 * TILE_SIZE, width: 2 * TILE_SIZE, height: 2 * TILE_SIZE },
    draw() { }
  },
  // Garden → Room 4 (top, tiles 7-8)
  {
    id: 'door_garden_to_room4',
    type: 'door', room: 'garden', edge: 'top',
    x: 7 * TILE_SIZE, width: 2 * TILE_SIZE,
    targetRoom: 'room4', spawnX: 3 * TILE_SIZE, spawnY: 5 * TILE_SIZE,
    interactionArea: { x: 7 * TILE_SIZE, y: -TILE_SIZE, width: 2 * TILE_SIZE, height: TILE_SIZE },
    draw() { }
  }
];
