// debug.js - Debug menu system: accessible in-game only via "0" key

(function () {
  const TILE_SIZE = window.TILE_SIZE || 50;
  let debugOpen = false;
  let debugSelectedIndex = 0;
  let debugSubMenu = null;
  let debugSubSelected = 0;

  // Entity editor state
  let editingEntity = null;
  let editMode = 'position';
  let entityEditorActive = false;

  // Snapshot tracking for export feature — stores original values keyed by entity id
  const entitySnapshots = {};

  const MENU_OPTIONS = [
    'Reload Game',
    'Hard Save',
    'Delete Inventory',
    'Refresh Items',
    'Jump to Room',
    'Show/Hide Hitboxes',
    'Show/Hide Tile Grid',
    'Show/Hide Coordinates',
    'Toggle Entity Positions'
  ];

  function getRoomList() {
    if (!window.MapManager || !window.MapManager.rooms) return [];
    return Object.keys(window.MapManager.rooms);
  }

  function getEntityList() {
    if (!window.Entities) return [];
    return window.Entities.filter(e => e.type !== 'door');
  }

  // --- Drawing ---
  function drawDebugMenu(ctx) {
    if (!debugOpen) return;

    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, cw, ch);

    if (entityEditorActive && editingEntity) {
      drawEntityEditor(ctx);
      ctx.restore();
      return;
    }

    const panelW = 350;
    const panelH = 440;
    const px = 30;
    const py = (ch - panelH) / 2;

    ctx.fillStyle = 'rgba(20, 20, 20, 0.95)';
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 2;
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeRect(px, py, panelW, panelH);

    ctx.font = '20px monospace';
    ctx.fillStyle = '#0f0';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('DEBUG MENU', px + 15, py + 12);

    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(0,255,0,0.4)';
    ctx.fillText('Press 0 to close', px + 15, py + 36);

    if (debugSubMenu === 'rooms') {
      drawSubMenu(ctx, px, py + 55, panelW, 'Jump to Room', getRoomList());
    } else if (debugSubMenu === 'entities') {
      const ents = getEntityList();
      const names = ents.map(e => `${e.id} (${e.room})`);
      drawSubMenu(ctx, px, py + 55, panelW, 'Select Entity', names);

      // Fixed button at the bottom
      const bottomY = py + 395;
      ctx.font = '14px monospace';
      const isSelected = debugSubSelected === ents.length;
      ctx.fillStyle = isSelected ? '#0ff' : '#0f0';
      ctx.fillText(isSelected ? '> EXPORT CHANGES' : '  EXPORT CHANGES', px + 15, bottomY);
    } else {
      ctx.font = '15px monospace';
      const startY = py + 55;
      for (let i = 0; i < MENU_OPTIONS.length; i++) {
        const y = startY + i * 30;
        ctx.fillStyle = i === debugSelectedIndex ? '#0ff' : '#ccc';
        ctx.fillText(i === debugSelectedIndex ? '> ' + MENU_OPTIONS[i] : '  ' + MENU_OPTIONS[i], px + 15, y);
      }

      ctx.font = '11px monospace';
      const statusY = startY + MENU_OPTIONS.length * 30 + 15;
      ctx.fillStyle = window.showHitboxes ? '#0f0' : '#555';
      ctx.fillText('Hitboxes: ' + (window.showHitboxes ? 'ON' : 'OFF'), px + 15, statusY);
      ctx.fillStyle = window.showTileGrid ? '#0f0' : '#55555565';
      ctx.fillText('Tile Grid: ' + (window.showTileGrid ? 'ON' : 'OFF'), px + 180, statusY);
      ctx.fillStyle = window.showCoordinates ? '#0f0' : '#555';
      ctx.fillText('Coords: ' + (window.showCoordinates ? 'ON' : 'OFF'), px + 15, statusY + 18);

      // Show player tile position
      if (window.player) {
        const tileX = Math.floor(window.player.x / TILE_SIZE);
        const tileY = Math.floor(window.player.y / TILE_SIZE);
        ctx.fillStyle = '#0f0';
        ctx.fillText('Player Tile: ' + tileX + ',' + tileY, px + 180, statusY + 18);
      }
    }

    ctx.restore();
  }

  function drawSubMenu(ctx, px, startY, panelW, title, items) {
    ctx.font = '14px monospace';
    ctx.fillStyle = '#ff0';
    ctx.fillText(title + ':', px + 15, startY);

    ctx.font = '13px monospace';
    const maxVisible = 10;
    const listSelected = Math.min(debugSubSelected, items.length - 1);
    const scrollOffset = Math.max(0, listSelected - maxVisible + 1);
    for (let i = scrollOffset; i < Math.min(items.length, scrollOffset + maxVisible); i++) {
      const y = startY + 25 + (i - scrollOffset) * 24;
      ctx.fillStyle = i === debugSubSelected ? '#0ff' : '#aaa';
      ctx.fillText(i === debugSubSelected ? '> ' + items[i] : '  ' + items[i], px + 15, y);
    }

    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText('Enter = select | Esc = back', px + 15, startY + 25 + maxVisible * 24 + 10);
  }

  function drawEntityEditor(ctx) {
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    const ent = editingEntity;

    const offset = {
      x: Math.floor((cw - (window.MapManager.rooms[ent.room]?.pixelWidth || 600)) / 2),
      y: Math.floor((ch - (window.MapManager.rooms[ent.room]?.pixelHeight || 600)) / 2)
    };

    ctx.save();
    ctx.translate(offset.x, offset.y);

    if (ent.area) {
      ctx.strokeStyle = '#0f0';
      ctx.lineWidth = 2;
      ctx.strokeRect(ent.area.x - 2, ent.area.y - 2, (ent.area.width || TILE_SIZE) + 4, (ent.area.height || TILE_SIZE) + 4);

      const cx = ent.area.x + (ent.area.width || TILE_SIZE) / 2;
      const cy = ent.area.y + (ent.area.height || TILE_SIZE) / 2;
      ctx.strokeStyle = 'rgba(0,255,0,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy); ctx.lineTo(cx + 15, cy);
      ctx.moveTo(cx, cy - 15); ctx.lineTo(cx, cy + 15);
      ctx.stroke();
    }

    if (ent.interactionArea && (editMode === 'interaction' || editMode === 'position')) {
      ctx.strokeStyle = editMode === 'interaction' ? '#ff0' : 'rgba(255,255,0,0.3)';
      ctx.lineWidth = editMode === 'interaction' ? 2 : 1;
      ctx.setLineDash(editMode === 'interaction' ? [] : [4, 4]);
      ctx.strokeRect(ent.interactionArea.x, ent.interactionArea.y, ent.interactionArea.width, ent.interactionArea.height);
      ctx.setLineDash([]);
    }

    if (ent.hitbox && (editMode === 'hitbox' || editMode === 'position')) {
      ctx.strokeStyle = editMode === 'hitbox' ? '#f00' : 'rgba(255,0,0,0.3)';
      ctx.lineWidth = editMode === 'hitbox' ? 2 : 1;
      ctx.setLineDash(editMode === 'hitbox' ? [] : [4, 4]);
      ctx.strokeRect(ent.hitbox.x, ent.hitbox.y, ent.hitbox.width, ent.hitbox.height);
      ctx.setLineDash([]);
    }

    ctx.restore();

    const tableW = 280;
    const tableH = 200;
    const tx = cw - tableW - 20;
    const ty = 20;

    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 1;
    ctx.fillRect(tx, ty, tableW, tableH);
    ctx.strokeRect(tx, ty, tableW, tableH);

    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#0f0';
    ctx.fillText('Entity: ' + ent.id, tx + 8, ty + 8);
    ctx.fillStyle = '#ff0';
    ctx.fillText('Mode: ' + editMode.toUpperCase(), tx + 8, ty + 24);

    let infoY = ty + 44;
    ctx.fillStyle = '#fff';

    if (ent.area) {
      const tX = Math.floor(ent.area.x / TILE_SIZE);
      const tY = Math.floor(ent.area.y / TILE_SIZE);
      ctx.fillText(`Pos: x=${ent.area.x}, y=${ent.area.y} (tile ${tX},${tY})`, tx + 8, infoY);
      infoY += 16;
      ctx.fillText(`Size: w=${ent.area.width}, h=${ent.area.height}`, tx + 8, infoY);
      infoY += 20;
    }

    if (ent.interactionArea) {
      ctx.fillStyle = editMode === 'interaction' ? '#ff0' : '#888';
      ctx.fillText(`IntArea: x=${ent.interactionArea.x}, y=${ent.interactionArea.y}`, tx + 8, infoY);
      infoY += 16;
      ctx.fillText(`  size: w=${ent.interactionArea.width}, h=${ent.interactionArea.height}`, tx + 8, infoY);
      infoY += 20;
    }

    if (ent.hitbox) {
      ctx.fillStyle = editMode === 'hitbox' ? '#f00' : '#888';
      ctx.fillText(`Hitbox: x=${ent.hitbox.x}, y=${ent.hitbox.y}`, tx + 8, infoY);
      infoY += 16;
      ctx.fillText(`  size: w=${ent.hitbox.width}, h=${ent.hitbox.height}`, tx + 8, infoY);
    }

    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'center';
    ctx.fillText('Arrows=move (snap tile) | Tab=switch mode | Enter=save | Esc=back', cw / 2, ch - 30);
    if (editMode === 'interaction' || editMode === 'hitbox') {
      ctx.fillText('Hold X + (±) = resize width | Hold Y + (±) = resize height', cw / 2, ch - 48);
    }
  }

  // --- Input Handling ---
  document.addEventListener('keydown', function (e) {
    if (e.key === '0' && !window.gameMenu.state.isActive) {
      if (entityEditorActive) return;
      if (debugOpen) {
        debugOpen = false;
        debugSubMenu = null;
        debugSelectedIndex = 0;
      } else {
        debugOpen = true;
        debugSelectedIndex = 0;
        debugSubMenu = null;
      }
      return;
    }

    if (!debugOpen) return;

    if (entityEditorActive && editingEntity) {
      handleEntityEditorInput(e);
      return;
    }

    if (debugSubMenu) {
      handleSubMenuInput(e);
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      debugSelectedIndex = (debugSelectedIndex - 1 + MENU_OPTIONS.length) % MENU_OPTIONS.length;
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      debugSelectedIndex = (debugSelectedIndex + 1) % MENU_OPTIONS.length;
    } else if (e.key === 'Enter') {
      executeOption(debugSelectedIndex);
    } else if (e.key === 'Escape') {
      debugOpen = false;
      debugSubMenu = null;
      e.stopImmediatePropagation();
    }
  });

  function handleSubMenuInput(e) {
    if (debugSubMenu === 'rooms') {
      const rooms = getRoomList();
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        debugSubSelected = (debugSubSelected - 1 + rooms.length) % rooms.length;
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        debugSubSelected = (debugSubSelected + 1) % rooms.length;
      } else if (e.key === 'Enter') {
        jumpToRoom(rooms[debugSubSelected]);
        debugSubMenu = null;
        debugOpen = false;
      } else if (e.key === 'Escape') {
        debugSubMenu = null;
      }
    } else if (debugSubMenu === 'entities') {
      const ents = getEntityList();
      const itemCount = ents.length + 1; // +1 for "Export Changes"
      
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        debugSubSelected = (debugSubSelected - 1 + itemCount) % itemCount;
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        debugSubSelected = (debugSubSelected + 1) % itemCount;
      } else if (e.key === 'Enter') {
        if (debugSubSelected === ents.length) {
          exportEntityChanges();
        } else {
          startEntityEdit(ents[debugSubSelected]);
        }
      } else if (e.key === 'Escape') {
        debugSubMenu = null;
      }
    }
  }

  const heldKeys = {};
  document.addEventListener('keydown', e => { heldKeys[e.key.toLowerCase()] = true; });
  document.addEventListener('keyup', e => { heldKeys[e.key.toLowerCase()] = false; });

  function handleEntityEditorInput(e) {
    const ent = editingEntity;
    if (!ent) return;

    if (e.key === 'Escape') {
      entityEditorActive = false;
      editingEntity = null;
      editMode = 'position';
      debugSubMenu = null;
      e.stopImmediatePropagation();
      return;
    }

    if (e.key === 'Enter') {
      entityEditorActive = false;
      editingEntity = null;
      editMode = 'position';
      debugSubMenu = null;
      e.stopImmediatePropagation();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      if (editMode === 'position') {
        if (ent.interactionArea) editMode = 'interaction';
        else if (ent.hitbox) editMode = 'hitbox';
      } else if (editMode === 'interaction') {
        if (ent.hitbox) editMode = 'hitbox';
        else editMode = 'position';
      } else if (editMode === 'hitbox') {
        editMode = 'position';
      }
      return;
    }

    // Snap to tile in position mode
    const step = editMode === 'position' ? TILE_SIZE : 1;

    if (editMode === 'interaction' && ent.interactionArea) {
      if (heldKeys['x']) {
        if (e.key === '+' || e.key === '=') { ent.interactionArea.width += TILE_SIZE; return; }
        if (e.key === '-') { ent.interactionArea.width = Math.max(TILE_SIZE, ent.interactionArea.width - TILE_SIZE); return; }
      }
      if (heldKeys['y']) {
        if (e.key === '+' || e.key === '=') { ent.interactionArea.height += TILE_SIZE; return; }
        if (e.key === '-') { ent.interactionArea.height = Math.max(TILE_SIZE, ent.interactionArea.height - TILE_SIZE); return; }
      }
      if (e.key === 'ArrowUp') { ent.interactionArea.y -= TILE_SIZE; return; }
      if (e.key === 'ArrowDown') { ent.interactionArea.y += TILE_SIZE; return; }
      if (e.key === 'ArrowLeft') { ent.interactionArea.x -= TILE_SIZE; return; }
      if (e.key === 'ArrowRight') { ent.interactionArea.x += TILE_SIZE; return; }
    }

    if (editMode === 'hitbox' && ent.hitbox) {
      if (heldKeys['x']) {
        if (e.key === '+' || e.key === '=') { ent.hitbox.width += TILE_SIZE; return; }
        if (e.key === '-') { ent.hitbox.width = Math.max(TILE_SIZE, ent.hitbox.width - TILE_SIZE); return; }
      }
      if (heldKeys['y']) {
        if (e.key === '+' || e.key === '=') { ent.hitbox.height += TILE_SIZE; return; }
        if (e.key === '-') { ent.hitbox.height = Math.max(TILE_SIZE, ent.hitbox.height - TILE_SIZE); return; }
      }
      if (e.key === 'ArrowUp') { ent.hitbox.y -= TILE_SIZE; return; }
      if (e.key === 'ArrowDown') { ent.hitbox.y += TILE_SIZE; return; }
      if (e.key === 'ArrowLeft') { ent.hitbox.x -= TILE_SIZE; return; }
      if (e.key === 'ArrowRight') { ent.hitbox.x += TILE_SIZE; return; }
    }

    if (editMode === 'position' && ent.area) {
      if (e.key === 'ArrowUp') { ent.area.y -= TILE_SIZE; return; }
      if (e.key === 'ArrowDown') { ent.area.y += TILE_SIZE; return; }
      if (e.key === 'ArrowLeft') { ent.area.x -= TILE_SIZE; return; }
      if (e.key === 'ArrowRight') { ent.area.x += TILE_SIZE; return; }
    }
    if (editMode === 'position' && !ent.area && ent.hitbox) {
      if (e.key === 'ArrowUp') { ent.hitbox.y -= TILE_SIZE; return; }
      if (e.key === 'ArrowDown') { ent.hitbox.y += TILE_SIZE; return; }
      if (e.key === 'ArrowLeft') { ent.hitbox.x -= TILE_SIZE; return; }
      if (e.key === 'ArrowRight') { ent.hitbox.x += TILE_SIZE; return; }
    }
  }

  function executeOption(index) {
    switch (MENU_OPTIONS[index]) {
      case 'Reload Game':
        debugOpen = false;
        window.gameMenu.resetGameState();
        window.gameMenu.state.isActive = true;
        window.gameMenu.state.currentMenu = 'root';
        window.gameMenu.state.selectedOption = 0;
        window.gameMenu.setGameStarted(false);
        window.gameMenu.setFirstStart(true);
        window.gameMenu.rebuildMenuOptions();
        break;

      case 'Hard Save':
        if (window.gameMenu && window.gameMenu.saveGame) {
          window.gameMenu.saveGame(1);
        }
        debugOpen = false;
        break;

      case 'Delete Inventory':
        if (window.Inventory && window.Inventory.clear) {
          window.Inventory.clear();
        }
        debugOpen = false;
        break;

      case 'Refresh Items':
        if (window.Entities) {
          for (const ent of window.Entities) {
            if (ent.type === 'item' && 'collected' in ent) {
              ent.collected = false;
            }
          }
        }
        debugOpen = false;
        break;

      case 'Jump to Room':
        debugSubMenu = 'rooms';
        debugSubSelected = 0;
        break;

      case 'Show/Hide Hitboxes':
        window.showHitboxes = !window.showHitboxes;
        break;

      case 'Show/Hide Tile Grid':
        window.showTileGrid = !window.showTileGrid;
        break;

      case 'Show/Hide Coordinates':
        window.showCoordinates = !window.showCoordinates;
        break;

      case 'Toggle Entity Positions':
        debugSubMenu = 'entities';
        debugSubSelected = 0;
        break;
    }
  }

  function jumpToRoom(roomId) {
    if (!window.MapManager) return;
    const door = window.Entities.find(e => e.type === 'door' && e.targetRoom === roomId);
    if (door) {
      window.MapManager.transition(roomId, door.spawnX, door.spawnY);
    } else {
      const room = window.MapManager.rooms[roomId];
      if (room) {
        window.MapManager.currentRoom = roomId;
        const tilesW = Math.floor((room.pixelWidth || 600) / TILE_SIZE);
        const tilesH = Math.floor((room.pixelHeight || 600) / TILE_SIZE);
        window.player.x = Math.floor(tilesW / 2) * TILE_SIZE;
        window.player.y = Math.floor(tilesH / 2) * TILE_SIZE;
      }
    }
  }

  function startEntityEdit(ent) {
    // Take snapshot of original values if not already tracked
    if (!entitySnapshots[ent.id]) {
      const snap = {};
      if (ent.area) snap.area = { x: ent.area.x, y: ent.area.y, width: ent.area.width, height: ent.area.height };
      if (ent.hitbox) snap.hitbox = { x: ent.hitbox.x, y: ent.hitbox.y, width: ent.hitbox.width, height: ent.hitbox.height };
      if (ent.interactionArea) snap.interactionArea = { x: ent.interactionArea.x, y: ent.interactionArea.y, width: ent.interactionArea.width, height: ent.interactionArea.height };
      entitySnapshots[ent.id] = snap;
    }
    editingEntity = ent;
    editMode = 'position';
    entityEditorActive = true;
    if (window.MapManager && ent.room) {
      window.MapManager.currentRoom = ent.room;
    }
  }

  // --- Export entity changes ---
  function exportEntityChanges() {
    const allEnts = window.Entities || [];
    const lines = [];
    lines.push('// ============================================');
    lines.push('// Entity Position Changes Export');
    lines.push('// Generated: ' + new Date().toISOString());
    lines.push('// File: entities.js');
    lines.push('// ============================================');
    lines.push('');

    let hasChanges = false;

    for (const entId in entitySnapshots) {
      const snap = entitySnapshots[entId];
      const ent = allEnts.find(e => e.id === entId);
      if (!ent) continue;

      const diffs = [];

      // Compare area
      if (snap.area && ent.area) {
        for (const prop of ['x', 'y', 'width', 'height']) {
          if (snap.area[prop] !== ent.area[prop]) {
            diffs.push({ path: 'area.' + prop, old: snap.area[prop], now: ent.area[prop] });
          }
        }
      }

      // Compare hitbox
      if (snap.hitbox && ent.hitbox) {
        for (const prop of ['x', 'y', 'width', 'height']) {
          if (snap.hitbox[prop] !== ent.hitbox[prop]) {
            diffs.push({ path: 'hitbox.' + prop, old: snap.hitbox[prop], now: ent.hitbox[prop] });
          }
        }
      }

      // Compare interactionArea
      if (snap.interactionArea && ent.interactionArea) {
        for (const prop of ['x', 'y', 'width', 'height']) {
          if (snap.interactionArea[prop] !== ent.interactionArea[prop]) {
            diffs.push({ path: 'interactionArea.' + prop, old: snap.interactionArea[prop], now: ent.interactionArea[prop] });
          }
        }
      }

      if (diffs.length === 0) continue;
      hasChanges = true;

      // Find approximate line number in entities.js
      let lineHint = '(unknown)';
      const entitiesSrc = window._entitiesSource;
      if (!entitiesSrc) {
        // Try to find line from Entities array index
        const idx = allEnts.indexOf(ent);
        lineHint = 'entity index ' + idx;
      }

      lines.push('// --- Entity: ' + ent.id + ' (room: ' + ent.room + ') ---');
      lines.push('// File: entities.js, search for id: \'' + ent.id + '\'');
      lines.push('//');

      for (const d of diffs) {
        const oldTile = Math.floor(d.old / TILE_SIZE);
        const newTile = Math.floor(d.now / TILE_SIZE);
        lines.push('//   ' + d.path + ': ' + d.old + ' → ' + d.now +
          (d.path.endsWith('.x') || d.path.endsWith('.y')
            ? '  (tile ' + oldTile + ' → ' + newTile + ')'
            : '  (tiles: ' + oldTile + ' → ' + newTile + ')'));
      }

      // Output the entity's new values as code
      lines.push('');
      if (ent.area) {
        const tx = Math.round(ent.area.x / TILE_SIZE);
        const ty = Math.round(ent.area.y / TILE_SIZE);
        const tw = Math.round(ent.area.width / TILE_SIZE);
        const th = Math.round(ent.area.height / TILE_SIZE);
        lines.push('// New area value:');
        lines.push('area: { x: ' + tx + ' * TILE_SIZE, y: ' + ty + ' * TILE_SIZE, width: ' + (tw === 1 ? 'TILE_SIZE' : tw + ' * TILE_SIZE') + ', height: ' + (th === 1 ? 'TILE_SIZE' : th + ' * TILE_SIZE') + ' },');
      }
      if (ent.hitbox) {
        const tx = Math.round(ent.hitbox.x / TILE_SIZE);
        const ty = Math.round(ent.hitbox.y / TILE_SIZE);
        const tw = Math.round(ent.hitbox.width / TILE_SIZE);
        const th = Math.round(ent.hitbox.height / TILE_SIZE);
        lines.push('// New hitbox value:');
        lines.push('hitbox: { x: ' + tx + ' * TILE_SIZE, y: ' + ty + ' * TILE_SIZE, width: ' + (tw === 1 ? 'TILE_SIZE' : tw + ' * TILE_SIZE') + ', height: ' + (th === 1 ? 'TILE_SIZE' : th + ' * TILE_SIZE') + ' },');
      }
      if (ent.interactionArea) {
        const tx = Math.round(ent.interactionArea.x / TILE_SIZE);
        const ty = Math.round(ent.interactionArea.y / TILE_SIZE);
        const tw = Math.round(ent.interactionArea.width / TILE_SIZE);
        const th = Math.round(ent.interactionArea.height / TILE_SIZE);
        lines.push('// New interactionArea value:');
        lines.push('interactionArea: { x: ' + tx + ' * TILE_SIZE, y: ' + ty + ' * TILE_SIZE, width: ' + (tw === 1 ? 'TILE_SIZE' : tw + ' * TILE_SIZE') + ', height: ' + (th === 1 ? 'TILE_SIZE' : th + ' * TILE_SIZE') + ' },');
      }
      lines.push('');
    }

    if (!hasChanges) {
      lines.push('// No changes detected. Edit entities with arrow keys first.');
    }

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'application/javascript' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'entity_changes_' + Date.now() + '.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  window.DebugMenu = {
    get isOpen() { return debugOpen; },
    draw: drawDebugMenu,
    close() { debugOpen = false; debugSubMenu = null; }
  };
})();
