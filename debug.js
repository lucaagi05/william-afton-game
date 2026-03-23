// debug.js - Debug menu system: accessible in-game only via "0" key

(function () {
  let debugOpen = false;
  let debugSelectedIndex = 0;
  let debugSubMenu = null;      // null = main menu, 'rooms' = room list, 'entities' = entity list, 'entityEdit' = editing mode
  let debugSubSelected = 0;

  // Entity editor state
  let editingEntity = null;
  let editMode = 'position';    // 'position', 'interaction', 'hitbox'
  let entityEditorActive = false;

  const MENU_OPTIONS = [
    'Reload Game',
    'Hard Save',
    'Delete Inventory',
    'Refresh Items',
    'Jump to Room',
    'Show/Hide Hitboxes',
    'Show/Hide Tile Grid',
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

    // Dim background
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, cw, ch);

    if (entityEditorActive && editingEntity) {
      drawEntityEditor(ctx);
      ctx.restore();
      return;
    }

    // Panel
    const panelW = 340;
    const panelH = debugSubMenu ? 400 : 340;
    const px = 30;
    const py = (ch - panelH) / 2;

    ctx.fillStyle = 'rgba(20, 20, 20, 0.95)';
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 2;
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeRect(px, py, panelW, panelH);

    // Title
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
    } else {
      // Main options
      ctx.font = '15px monospace';
      const startY = py + 55;
      for (let i = 0; i < MENU_OPTIONS.length; i++) {
        const y = startY + i * 30;
        ctx.fillStyle = i === debugSelectedIndex ? '#0ff' : '#ccc';
        ctx.fillText(i === debugSelectedIndex ? '> ' + MENU_OPTIONS[i] : '  ' + MENU_OPTIONS[i], px + 15, y);
      }

      // Status indicators
      ctx.font = '11px monospace';
      const statusY = startY + MENU_OPTIONS.length * 30 + 15;
      ctx.fillStyle = window.showHitboxes ? '#0f0' : '#555';
      ctx.fillText('Hitboxes: ' + (window.showHitboxes ? 'ON' : 'OFF'), px + 15, statusY);
      ctx.fillStyle = window.showTileGrid ? '#0f0' : '#555';
      ctx.fillText('Tile Grid: ' + (window.showTileGrid ? 'ON' : 'OFF'), px + 180, statusY);
    }

    ctx.restore();
  }

  function drawSubMenu(ctx, px, startY, panelW, title, items) {
    ctx.font = '14px monospace';
    ctx.fillStyle = '#ff0';
    ctx.fillText(title + ':', px + 15, startY);

    ctx.font = '13px monospace';
    const maxVisible = 10;
    const scrollOffset = Math.max(0, debugSubSelected - maxVisible + 1);
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

    // Draw the room with the entity highlighted
    const offset = {
      x: Math.floor((cw - (window.MapManager.rooms[ent.room]?.pixelWidth || 600)) / 2),
      y: Math.floor((ch - (window.MapManager.rooms[ent.room]?.pixelHeight || 600)) / 2)
    };

    // Highlight entity
    ctx.save();
    ctx.translate(offset.x, offset.y);

    if (ent.area) {
      ctx.strokeStyle = '#0f0';
      ctx.lineWidth = 2;
      ctx.strokeRect(ent.area.x - 2, ent.area.y - 2, (ent.area.width || 18) + 4, (ent.area.height || 18) + 4);

      // Position crosshair
      const cx = ent.area.x + (ent.area.width || 18) / 2;
      const cy = ent.area.y + (ent.area.height || 18) / 2;
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

    // Info table (top-right)
    const tableW = 280;
    const tableH = 180;
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
      ctx.fillText(`Pos: x=${ent.area.x}, y=${ent.area.y}`, tx + 8, infoY);
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

    // Controls hint at bottom
    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'center';
    ctx.fillText('Arrows=move | Tab=switch mode | Enter=save | Esc=back', cw / 2, ch - 30);
    if (editMode === 'interaction' || editMode === 'hitbox') {
      ctx.fillText('Hold X + (±) = resize width | Hold Y + (±) = resize height', cw / 2, ch - 48);
    }
  }

  // --- Input Handling ---
  document.addEventListener('keydown', function (e) {
    // Toggle debug menu with 0 key (in-game only)
    if (e.key === '0' && !window.gameMenu.state.isActive) {
      if (entityEditorActive) return; // Don't close while editing
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

    // Entity editor mode
    if (entityEditorActive && editingEntity) {
      handleEntityEditorInput(e);
      return;
    }

    // Sub-menu navigation
    if (debugSubMenu) {
      handleSubMenuInput(e);
      return;
    }

    // Main menu navigation
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      debugSelectedIndex = (debugSelectedIndex - 1 + MENU_OPTIONS.length) % MENU_OPTIONS.length;
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      debugSelectedIndex = (debugSelectedIndex + 1) % MENU_OPTIONS.length;
    } else if (e.key === 'Enter') {
      executeOption(debugSelectedIndex);
    } else if (e.key === 'Escape') {
      debugOpen = false;
      debugSubMenu = null;
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
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        debugSubSelected = (debugSubSelected - 1 + ents.length) % ents.length;
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        debugSubSelected = (debugSubSelected + 1) % ents.length;
      } else if (e.key === 'Enter') {
        startEntityEdit(ents[debugSubSelected]);
      } else if (e.key === 'Escape') {
        debugSubMenu = null;
      }
    }
  }

  // Track held keys for entity editor
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
      return;
    }

    if (e.key === 'Enter') {
      // Save for this session (already in-place, just confirm)
      entityEditorActive = false;
      editingEntity = null;
      editMode = 'position';
      debugSubMenu = null;
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      // Cycle: position -> interaction (if exists) -> hitbox (if exists) -> position
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

    // Resize in interaction/hitbox mode
    if (editMode === 'interaction' && ent.interactionArea) {
      if (heldKeys['x']) {
        if (e.key === '+' || e.key === '=') { ent.interactionArea.width += 1; return; }
        if (e.key === '-') { ent.interactionArea.width = Math.max(1, ent.interactionArea.width - 1); return; }
      }
      if (heldKeys['y']) {
        if (e.key === '+' || e.key === '=') { ent.interactionArea.height += 1; return; }
        if (e.key === '-') { ent.interactionArea.height = Math.max(1, ent.interactionArea.height - 1); return; }
      }
      // Move interaction area with arrows
      if (e.key === 'ArrowUp') { ent.interactionArea.y -= 1; return; }
      if (e.key === 'ArrowDown') { ent.interactionArea.y += 1; return; }
      if (e.key === 'ArrowLeft') { ent.interactionArea.x -= 1; return; }
      if (e.key === 'ArrowRight') { ent.interactionArea.x += 1; return; }
    }

    if (editMode === 'hitbox' && ent.hitbox) {
      if (heldKeys['x']) {
        if (e.key === '+' || e.key === '=') { ent.hitbox.width += 1; return; }
        if (e.key === '-') { ent.hitbox.width = Math.max(1, ent.hitbox.width - 1); return; }
      }
      if (heldKeys['y']) {
        if (e.key === '+' || e.key === '=') { ent.hitbox.height += 1; return; }
        if (e.key === '-') { ent.hitbox.height = Math.max(1, ent.hitbox.height - 1); return; }
      }
      // Move hitbox with arrows
      if (e.key === 'ArrowUp') { ent.hitbox.y -= 1; return; }
      if (e.key === 'ArrowDown') { ent.hitbox.y += 1; return; }
      if (e.key === 'ArrowLeft') { ent.hitbox.x -= 1; return; }
      if (e.key === 'ArrowRight') { ent.hitbox.x += 1; return; }
    }

    // Position mode — move entity area
    if (editMode === 'position' && ent.area) {
      if (e.key === 'ArrowUp') { ent.area.y -= 1; return; }
      if (e.key === 'ArrowDown') { ent.area.y += 1; return; }
      if (e.key === 'ArrowLeft') { ent.area.x -= 1; return; }
      if (e.key === 'ArrowRight') { ent.area.x += 1; return; }
    }
    // For obstacles without area, move hitbox directly
    if (editMode === 'position' && !ent.area && ent.hitbox) {
      if (e.key === 'ArrowUp') { ent.hitbox.y -= 1; return; }
      if (e.key === 'ArrowDown') { ent.hitbox.y += 1; return; }
      if (e.key === 'ArrowLeft') { ent.hitbox.x -= 1; return; }
      if (e.key === 'ArrowRight') { ent.hitbox.x += 1; return; }
    }
  }

  // --- Option Execution ---
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

      case 'Toggle Entity Positions':
        debugSubMenu = 'entities';
        debugSubSelected = 0;
        break;
    }
  }

  function jumpToRoom(roomId) {
    if (!window.MapManager) return;
    // Find first door that leads INTO this room, use its spawn coords
    const door = window.Entities.find(e => e.type === 'door' && e.targetRoom === roomId);
    if (door) {
      window.MapManager.transition(roomId, door.spawnX, door.spawnY);
    } else {
      // No door found, just go to the room center
      const room = window.MapManager.rooms[roomId];
      if (room) {
        window.MapManager.currentRoom = roomId;
        window.player.x = (room.pixelWidth || 600) / 2 - 25;
        window.player.y = (room.pixelHeight || 600) / 2 - 25;
      }
    }
  }

  function startEntityEdit(ent) {
    editingEntity = ent;
    editMode = 'position';
    entityEditorActive = true;
    // Switch to entity's room so we can see it
    if (window.MapManager && ent.room) {
      window.MapManager.currentRoom = ent.room;
    }
  }

  // Export
  window.DebugMenu = {
    get isOpen() { return debugOpen; },
    draw: drawDebugMenu
  };
})();
