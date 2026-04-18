// map.js - Room definitions built from CSV_LOCATIONS + map layout .txt files
// Doors are auto-generated from map grids and CSV linking data

window.MapManager = {
  currentRoom: 'room1',
  rooms: {},

  // Called after CSVLoader.init() populates window.CSV_LOCATIONS
  buildFromCSV() {
    const TILE_SIZE = window.TILE_SIZE || 50;
    const locations = window.CSV_LOCATIONS;
    if (!locations) {
      console.warn('MapManager: No CSV_LOCATIONS data available');
      return;
    }

    // --- Build room objects ---
    for (const id in locations) {
      const loc = locations[id];
      const mapData = loc.mapData;
      const pixelWidth = mapData ? mapData.cols * TILE_SIZE : 600;
      const pixelHeight = mapData ? mapData.rows * TILE_SIZE : 600;
      const roomId = id; // closure capture

      this.rooms[id] = {
        name: loc.name,
        pixelWidth,
        pixelHeight,
        musicTrack: loc.musicTrack || 'ingame',
        get entities() { return window.Entities ? window.Entities.filter(e => e.room === roomId && !e.collected) : []; },
        get obstacles() { return this.entities.filter(e => e.type === 'obstacle').map(e => e.hitbox); },
        get doors() { return this.entities.filter(e => e.type === 'door'); }
      };

      // Generate interior wall obstacles (0 tiles NOT on the border)
      if (mapData && mapData.walls) {
        if (!this.wallSprites) this.wallSprites = {};

        for (const wall of mapData.walls) {
          const r = wall.row;
          const c = wall.col;
          const grid = mapData.grid;
          
          let spriteName = null;
          if (loc.wallTheme && grid) {
            const hasWall = (row, col) => row >= 0 && row < grid.length && col >= 0 && col < grid[0].length && grid[row][col] === '0';
            const isFloor = (row, col) => row >= 0 && row < grid.length && col >= 0 && col < grid[0].length && grid[row][col] !== '0' && grid[row][col] !== '-';

            const wTop = hasWall(r - 1, c);
            const wBottom = hasWall(r + 1, c);
            const wLeft = hasWall(r, c - 1);
            const wRight = hasWall(r, c + 1);

            const fTop = isFloor(r - 1, c);
            const fBottom = isFloor(r + 1, c);
            const fLeft = isFloor(r, c - 1);
            const fRight = isFloor(r, c + 1);

            // 1. Precise Inner Corners (floor on two adjacent outward sides, walls bridging inward sides)
            if (fTop && fRight && wBottom && wLeft) spriteName = 'wall_inner_corner_top_right';
            else if (fTop && fLeft && wBottom && wRight) spriteName = 'wall_inner_corner_top_left';
            else if (fBottom && fRight && wTop && wLeft) spriteName = 'wall_inner_corner_bottom_right';
            else if (fBottom && fLeft && wTop && wRight) spriteName = 'wall_inner_corner_bottom_left';

            // 2. Precise Outer Corners
            else if (wBottom && wRight && !wTop && !wLeft) spriteName = 'wall_corner_top_left';
            else if (wBottom && wLeft && !wTop && !wRight) spriteName = 'wall_corner_top_right';
            else if (wTop && wRight && !wBottom && !wLeft) spriteName = 'wall_corner_bottom_left';
            else if (wTop && wLeft && !wBottom && !wRight) spriteName = 'wall_corner_bottom_right';
            
            // 3. Horizontal Lines (walls with L/R connections but bounded by space/void up/down)
            else if ((wLeft || wRight) && !wTop && !wBottom) {
              if (fBottom) spriteName = 'wall_bottom';
              else if (fTop) spriteName = 'wall_up';
            }
            // 4. Vertical Lines (walls with U/D connections but bounded by space/void left/right)
            else if ((wTop || wBottom) && !wLeft && !wRight) {
              if (fRight) spriteName = 'wall_left';
              else if (fLeft) spriteName = 'wall_right';
            }
            // 5. End logic / Fallback (e.g. multi-layered dense chunks picking their outer face)
            else {
              if (fBottom) spriteName = 'wall_bottom';
              else if (fTop) spriteName = 'wall_up';
              else if (fRight) spriteName = 'wall_left';
              else if (fLeft) spriteName = 'wall_right';
            }
          }

          let img = null;
          if (spriteName) {
            const cacheKey = loc.wallTheme + '_' + spriteName;
            if (!this.wallSprites[cacheKey]) {
              const newImg = new Image();
              newImg.src = `sprites/${loc.wallTheme}/${spriteName}.png`;
              this.wallSprites[cacheKey] = newImg;
            }
            img = this.wallSprites[cacheKey];
          }

          window.Entities.push({
            id: 'wall_' + id + '_' + r + '_' + c,
            type: 'obstacle',
            room: id,
            hasTheme: !!loc.wallTheme,
            img: img,
            hitbox: {
              x: c * TILE_SIZE,
              y: r * TILE_SIZE,
              width: TILE_SIZE,
              height: TILE_SIZE
            },
            draw(ctx) {
              if (this.img && this.img.complete && this.img.naturalWidth > 0) {
                ctx.drawImage(this.img, this.hitbox.x, this.hitbox.y, this.hitbox.width, this.hitbox.height);
              } else if (!this.hasTheme) {
                // Fallback to white rectangle if no theme is strictly defined
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.strokeRect(this.hitbox.x, this.hitbox.y, this.hitbox.width, this.hitbox.height);
              }
            }
          });
        }
      }
    }

    // --- Generate door entities from map data + CSV linking ---
    this._generateDoors(locations);

    // Invalidate minimap cache so it rebuilds with new rooms
    if (window.Minimap) window.Minimap.invalidateCache();

    console.log('MapManager: Built', Object.keys(this.rooms).length, 'rooms');
  },

  _generateDoors(locations) {
    const TILE_SIZE = window.TILE_SIZE || 50;

    for (const roomId in locations) {
      const loc = locations[roomId];
      if (!loc.mapData) continue;

      for (const doorDef of loc.doors) {
        const targetRoomId = doorDef.targetRoom;
        const targetLoc = locations[targetRoomId];
        // Skip if target room doesn't exist (placeholder)
        if (!targetLoc || !targetLoc.mapData) continue;

        const doorNum = doorDef.doorNum;
        const doorInfo = loc.mapData.doors[doorNum];
        if (!doorInfo) {
          console.warn('Door', doorNum, 'not found in map for room', roomId);
          continue;
        }

        // Find reciprocal door in target room (the door that links back here)
        const reciprocalDoorDef = targetLoc.doors.find(d => d.targetRoom === roomId);
        if (!reciprocalDoorDef) {
          console.warn('No reciprocal door from', targetRoomId, 'back to', roomId);
          continue;
        }

        const reciprocalDoorInfo = targetLoc.mapData.doors[reciprocalDoorDef.doorNum];
        if (!reciprocalDoorInfo) continue;

        const targetMapData = targetLoc.mapData;

        // Compute spawn position in target room (1 tile inward from reciprocal door)
        let spawnX, spawnY;
        if (reciprocalDoorInfo.edge === 'top') {
          spawnX = reciprocalDoorInfo.col * TILE_SIZE;
          spawnY = 1 * TILE_SIZE;
        } else if (reciprocalDoorInfo.edge === 'bottom') {
          spawnX = reciprocalDoorInfo.col * TILE_SIZE;
          spawnY = (targetMapData.rows - 2) * TILE_SIZE;
        } else if (reciprocalDoorInfo.edge === 'left') {
          spawnX = 1 * TILE_SIZE;
          spawnY = reciprocalDoorInfo.row * TILE_SIZE;
        } else if (reciprocalDoorInfo.edge === 'right') {
          spawnX = (targetMapData.cols - 2) * TILE_SIZE;
          spawnY = reciprocalDoorInfo.row * TILE_SIZE;
        }

        // Build door entity
        const roomMapData = loc.mapData;
        const roomWidth = roomMapData.cols * TILE_SIZE;
        const roomHeight = roomMapData.rows * TILE_SIZE;
        const doorId = 'door_' + roomId + '_to_' + targetRoomId;

        // Don't create duplicates
        if (window.Entities.find(e => e.id === doorId)) continue;

        const doorEntity = {
          id: doorId,
          type: 'door',
          room: roomId,
          edge: doorInfo.edge,
          targetRoom: targetRoomId,
          spawnX: spawnX,
          spawnY: spawnY,
          locked: doorDef.isLocked,
          _initiallyLocked: doorDef.isLocked,
          _keyId: doorDef.keyId,
          draw() { }
        };

        // Set position and dimensions based on edge
        if (doorInfo.edge === 'top' || doorInfo.edge === 'bottom') {
          doorEntity.x = doorInfo.col * TILE_SIZE;
          doorEntity.width = doorInfo.tileCount * TILE_SIZE;
          doorEntity.interactionArea = {
            x: doorInfo.col * TILE_SIZE,
            y: doorInfo.edge === 'top' ? -TILE_SIZE : roomHeight,
            width: doorInfo.tileCount * TILE_SIZE,
            height: TILE_SIZE
          };
        } else {
          doorEntity.y = doorInfo.row * TILE_SIZE;
          doorEntity.height = doorInfo.tileCount * TILE_SIZE;
          doorEntity.interactionArea = {
            x: doorInfo.edge === 'left' ? -TILE_SIZE : roomWidth,
            y: doorInfo.row * TILE_SIZE,
            width: TILE_SIZE,
            height: doorInfo.tileCount * TILE_SIZE
          };
        }

        // Lock area for locked doors (inside the room, near the door, 2 tiles)
        if (doorDef.isLocked) {
          if (doorInfo.edge === 'bottom') {
            doorEntity.lockArea = {
              x: doorInfo.col * TILE_SIZE,
              y: roomHeight - 2 * TILE_SIZE,
              width: doorInfo.tileCount * TILE_SIZE,
              height: 2 * TILE_SIZE
            };
          } else if (doorInfo.edge === 'top') {
            doorEntity.lockArea = {
              x: doorInfo.col * TILE_SIZE,
              y: 0,
              width: doorInfo.tileCount * TILE_SIZE,
              height: 2 * TILE_SIZE
            };
          } else if (doorInfo.edge === 'left') {
            doorEntity.lockArea = {
              x: 0,
              y: doorInfo.row * TILE_SIZE,
              width: 2 * TILE_SIZE,
              height: doorInfo.tileCount * TILE_SIZE
            };
          } else if (doorInfo.edge === 'right') {
            doorEntity.lockArea = {
              x: roomWidth - 2 * TILE_SIZE,
              y: doorInfo.row * TILE_SIZE,
              width: 2 * TILE_SIZE,
              height: doorInfo.tileCount * TILE_SIZE
            };
          }
        }

        window.Entities.push(doorEntity);
      }
    }

    // Generate locked door interactions
    this._generateLockedDoorInteractions();
  },

  _generateLockedDoorInteractions() {
    const lockedDoors = window.Entities.filter(e => e.type === 'door' && e._initiallyLocked);

    for (const door of lockedDoors) {
      const keyId = door._keyId;
      const keyDef = window.INVENTORY_ITEMS ? window.INVENTORY_ITEMS[keyId] : null;
      const keyName = keyDef ? keyDef.name : keyId;
      const keyColor = keyDef
        ? (window.ITEM_CATEGORIES && window.ITEM_CATEGORIES[keyDef.category]
          ? window.ITEM_CATEGORIES[keyDef.category].color
          : '#ff0')
        : '#ff0';

      // "Door is locked" interaction (player has no key)
      window.interactions.push({
        id: 'locked_nokey_' + door.id,
        room: door.room,
        type: 'text',
        get area() {
          return door.locked && door.lockArea ? door.lockArea : { x: -999, y: -999, width: 0, height: 0 };
        },
        trigger() {
          return door.locked && !(window.Inventory && window.Inventory.has(keyId));
        },
        onActivate() {
          if (window.AudioManager) window.AudioManager.playLockedDoorSound();
        },
        text: {
          pages: ["The door is locked. You need a key."],
          font: '20px monospace',
          color: '#f44',
          frame: { fill: '#222', outline: '#f44', height: 90, margin: 16 }
        }
      });

      // "Unlock with key" interaction (player has key)
      window.interactions.push({
        id: 'locked_unlock_' + door.id,
        room: door.room,
        type: 'text',
        get area() {
          return door.locked && door.lockArea ? door.lockArea : { x: -999, y: -999, width: 0, height: 0 };
        },
        trigger() {
          return door.locked && window.Inventory && window.Inventory.has(keyId);
        },
        onActivate() {
          door.locked = false;
          if (window.Inventory) window.Inventory.remove(keyId);
          if (window.AudioManager) window.AudioManager.playUnlockDoorSound();
        },
        text: {
          pages: ['You used the {' + keyName + ':' + keyColor + '}. The door is now open.'],
          font: '20px monospace',
          color: '#0f0',
          frame: { fill: '#222', outline: '#0f0', height: 90, margin: 16 }
        }
      });
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
