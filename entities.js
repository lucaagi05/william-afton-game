// entities.js - Master list of all items, obstacles, doors, and save points
const STEP = 18;

window.Entities = [
  // ==========================================
  // ROOM 1
  // ==========================================
  {
    id: 'main_table',
    type: 'obstacle',
    room: 'room1',
    hitbox: { x: 7 * STEP, y: 3 * STEP, width: 291, height: 45 },
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
    area: { x: 14 * STEP, y: 3.8 * STEP, width: 18, height: 18 },
    color: '#0ff',
    interactionArea: { x: (14 * STEP) - 10, y: (3.8 * STEP) - 18, width: 38, height: 53 },
    draw(ctx) {
      ctx.save(); ctx.fillStyle = this.color;
      ctx.fillRect(this.area.x, this.area.y, this.area.width, this.area.height);
      ctx.restore();
    }
  },

  {
    id: 'checkpoint_right',
    type: 'savepoint',
    room: 'room1',
    interactionId: 'checkpoint_right',
    area: { x: 31 * STEP, y: 14 * STEP, width: 18, height: 18 },
    color: '#f00',
    interactionArea: { x: (31 * STEP) - 30, y: (14 * STEP) - 30, width: 78, height: 78 },
    draw(ctx) {
      ctx.save(); ctx.shadowColor = '#f44'; ctx.shadowBlur = 15;
      ctx.fillStyle = this.color;
      ctx.fillRect(this.area.x, this.area.y, this.area.width, this.area.height);
      ctx.restore();
    }
  },

  // ==========================================
  // ROOM 2
  // ==========================================
  {
    id: 'checkpoint_left',
    type: 'savepoint',
    room: 'room2',
    interactionId: 'checkpoint_left',
    area: { x: 2 * STEP, y: 14 * STEP, width: 18, height: 18 },
    color: '#f00',
    interactionArea: { x: (2 * STEP) - 30, y: (14 * STEP) - 30, width: 78, height: 78 },
    draw(ctx) {
      ctx.save(); ctx.shadowColor = '#f44'; ctx.shadowBlur = 15;
      ctx.fillStyle = this.color;
      ctx.fillRect(this.area.x, this.area.y, this.area.width, this.area.height);
      ctx.restore();
    }
  },

  {
    id: 'room2_cube',
    type: 'item',
    room: 'room2',
    interactionId: null,
    area: { x: 16 * STEP, y: 16 * STEP, width: 18, height: 18 },
    color: '#0ff',
    interactionArea: null,
    draw(ctx) {
      ctx.save(); ctx.fillStyle = this.color;
      ctx.fillRect(this.area.x, this.area.y, this.area.width, this.area.height);
      ctx.restore();
    }
  },

  // KEY ITEM — far left of Room 2
  {
    id: 'key_item',
    type: 'item',
    room: 'room2',
    collected: false,
    interactionId: 'key_item',
    area: { x: 80, y: 280, width: 16, height: 16 },
    color: '#ff0',
    interactionArea: { x: 60, y: 260, width: 56, height: 56 },
    draw(ctx) {
      if (this.collected) return;
      ctx.save();
      ctx.shadowColor = '#ff0'; ctx.shadowBlur = 10;
      ctx.fillStyle = this.color;
      ctx.fillRect(this.area.x, this.area.y, this.area.width, this.area.height);
      // Small "K" label
      ctx.font = '10px monospace'; ctx.fillStyle = '#000';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('K', this.area.x + 8, this.area.y + 9);
      ctx.restore();
    }
  },

  // ==========================================
  // ROOM 3 — HALLWAY (1000×300)
  // ==========================================

  // CANDY ITEM — middle of hallway
  {
    id: 'candy_item',
    type: 'item',
    room: 'room3',
    collected: false,
    interactionId: 'candy_item',
    area: { x: 500, y: 140, width: 14, height: 14 },
    color: '#f0f',
    interactionArea: { x: 480, y: 120, width: 54, height: 54 },
    draw(ctx) {
      if (this.collected) return;
      ctx.save();
      ctx.shadowColor = '#f0f'; ctx.shadowBlur = 8;
      ctx.fillStyle = this.color;
      ctx.fillRect(this.area.x, this.area.y, this.area.width, this.area.height);
      ctx.font = '9px monospace'; ctx.fillStyle = '#fff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('C', this.area.x + 7, this.area.y + 8);
      ctx.restore();
    }
  },

  // ==========================================
  // DOORS
  // ==========================================

  // Room 1 ↔ Room 2 (bottom/top)
  {
    id: 'door_to_room2',
    type: 'door', room: 'room1', edge: 'bottom',
    x: 250, width: 100,
    targetRoom: 'room2', spawnX: 275, spawnY: 10,
    interactionArea: { x: 250, y: 600, width: 100, height: 10 },
    draw() { }
  },
  {
    id: 'door_to_room1',
    type: 'door', room: 'room2', edge: 'top',
    x: 250, width: 100,
    targetRoom: 'room1', spawnX: 275, spawnY: 540,
    interactionArea: { x: 250, y: -2, width: 100, height: 10 },
    draw() { }
  },

  // Room 2 → Room 3 (right edge of Room 2)
  {
    id: 'door_room2_to_room3',
    type: 'door', room: 'room2', edge: 'right',
    y: 250, height: 100,
    targetRoom: 'room3', spawnX: 20, spawnY: 120,
    interactionArea: { x: 595, y: 250, width: 15, height: 100 },
    draw() { }
  },
  // Room 3 → Room 2 (left edge of Room 3)
  {
    id: 'door_room3_to_room2',
    type: 'door', room: 'room3', edge: 'left',
    y: 100, height: 100,
    targetRoom: 'room2', spawnX: 530, spawnY: 270,
    interactionArea: { x: -5, y: 100, width: 15, height: 100 },
    draw() { }
  },

  // Room 3 → Room 4 (right edge of Room 3)
  {
    id: 'door_room3_to_room4',
    type: 'door', room: 'room3', edge: 'right',
    y: 100, height: 100,
    targetRoom: 'room4', spawnX: 20, spawnY: 130,
    interactionArea: { x: 995, y: 100, width: 15, height: 100 },
    draw() { }
  },
  // Room 4 → Room 3 (left edge of Room 4)
  {
    id: 'door_room4_to_room3',
    type: 'door', room: 'room4', edge: 'left',
    y: 125, height: 100,
    targetRoom: 'room3', spawnX: 930, spawnY: 120,
    interactionArea: { x: -5, y: 125, width: 15, height: 100 },
    draw() { }
  },

  // Room 4 → Garden (bottom, LOCKED)
  {
    id: 'door_to_garden',
    type: 'door', room: 'room4', edge: 'bottom',
    x: 125, width: 100,
    locked: true,
    targetRoom: 'garden', spawnX: 365, spawnY: 20,
    interactionArea: { x: 125, y: 335, width: 100, height: 25 },
    draw() { }
  },
  // Garden → Room 4 (top)
  {
    id: 'door_garden_to_room4',
    type: 'door', room: 'garden', edge: 'top',
    x: 350, width: 100,
    targetRoom: 'room4', spawnX: 150, spawnY: 280,
    interactionArea: { x: 350, y: -5, width: 100, height: 15 },
    draw() { }
  }
];
