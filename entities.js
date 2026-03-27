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

  // Red circle entity — damages player on interaction
  {
    id: 'red_circle',
    type: 'entity',
    room: 'garden',
    interactionId: 'red_circle',
    area: { x: 12 * TILE_SIZE, y: 8 * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE },
    color: '#f44',
    interactionArea: { x: 11 * TILE_SIZE, y: 7 * TILE_SIZE, width: TILE_SIZE * 3, height: TILE_SIZE * 3 },
    draw(ctx) {
      ctx.save();
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(
        this.area.x + TILE_SIZE / 2,
        this.area.y + TILE_SIZE / 2,
        TILE_SIZE * 0.35, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }
  },

  // ==========================================
  // DOORS
  // ==========================================

  // Room 1 ↔ Room 2 (bottom/top, tiles 5-6)
  {
    id: 'door_to_room2',
    type: 'door', room: 'room1', edge: 'bottom',
    x: 5 * TILE_SIZE, width: 2 * TILE_SIZE,
    targetRoom: 'room2', spawnX: 5 * TILE_SIZE, spawnY: 0,
    interactionArea: { x: 5 * TILE_SIZE, y: 600, width: 2 * TILE_SIZE, height: TILE_SIZE },
    draw() { }
  },
  {
    id: 'door_to_room1',
    type: 'door', room: 'room2', edge: 'top',
    x: 5 * TILE_SIZE, width: 2 * TILE_SIZE,
    targetRoom: 'room1', spawnX: 5 * TILE_SIZE, spawnY: 11 * TILE_SIZE,
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
