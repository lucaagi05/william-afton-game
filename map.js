// map.js - Room definitions: items, obstacles, doors, and save points

window.MapManager = {
  currentRoom: 'room1',

  rooms: {
    room1: {
      name: 'Room 1',
      pixelWidth: 1500,
      pixelHeight: 1500,
      musicTrack: 'ingame',
      get entities() { return window.Entities ? window.Entities.filter(e => e.room === 'room1' && !e.collected) : []; },
      get obstacles() { return this.entities.filter(e => e.type === 'obstacle').map(e => e.hitbox); },
      get doors() { return this.entities.filter(e => e.type === 'door'); }
    },

    room2: {
      name: 'Room 2',
      pixelWidth: 600,
      pixelHeight: 600,
      musicTrack: 'ingame',
      get entities() { return window.Entities ? window.Entities.filter(e => e.room === 'room2' && !e.collected) : []; },
      get obstacles() { return this.entities.filter(e => e.type === 'obstacle').map(e => e.hitbox); },
      get doors() { return this.entities.filter(e => e.type === 'door'); }
    },

    room3: {
      name: 'Hallway',
      pixelWidth: 1000,
      pixelHeight: 300,
      musicTrack: 'ingame',
      get entities() { return window.Entities ? window.Entities.filter(e => e.room === 'room3' && !e.collected) : []; },
      get obstacles() { return this.entities.filter(e => e.type === 'obstacle').map(e => e.hitbox); },
      get doors() { return this.entities.filter(e => e.type === 'door'); }
    },

    room4: {
      name: 'Room 4',
      pixelWidth: 350,
      pixelHeight: 350,
      musicTrack: 'ingame',
      get entities() { return window.Entities ? window.Entities.filter(e => e.room === 'room4' && !e.collected) : []; },
      get obstacles() { return this.entities.filter(e => e.type === 'obstacle').map(e => e.hitbox); },
      get doors() { return this.entities.filter(e => e.type === 'door'); }
    },

    garden: {
      name: 'The Garden',
      pixelWidth: 800,
      pixelHeight: 800,
      musicTrack: 'garden',
      get entities() { return window.Entities ? window.Entities.filter(e => e.room === 'garden' && !e.collected) : []; },
      get obstacles() { return this.entities.filter(e => e.type === 'obstacle').map(e => e.hitbox); },
      get doors() { return this.entities.filter(e => e.type === 'door'); }
    }
  },

  current() { return this.rooms[this.currentRoom]; },

  transition(targetRoom, spawnX, spawnY) {
    if (window.AudioManager && this.currentRoom !== targetRoom) {
      window.AudioManager.playDoorSound();
    }
    this.currentRoom = targetRoom;
    if (window.player) {
      window.player.x = spawnX;
      window.player.y = spawnY;
      window.player.visualX = spawnX;
      window.player.visualY = spawnY;
    }
  },

  checkDoors(player) {
    const room = this.current();
    for (const door of room.doors) {
      if (door.interactionArea && window.isColliding(window.playerHitbox, door.interactionArea)) {
        if (door.locked) continue; // locked doors handled by interaction system
        this.transition(door.targetRoom, door.spawnX, door.spawnY);
        return;
      }
    }
  }
};
