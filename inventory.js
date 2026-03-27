// inventory.js - Inventory system with 4 category tabs, quantities, USE/DROP/EXIT

const ITEM_CATEGORIES = {
  consumable:  { name: 'Consumable',  color: '#4af', order: 0 },
  collectible: { name: 'Collectible', color: '#4f4', order: 1 },
  weapon:      { name: 'Weapon',      color: '#f44', order: 2 },
  keyitem:     { name: 'Key Item',    color: '#ff0', order: 3 }
};
window.ITEM_CATEGORIES = ITEM_CATEGORIES;

const CATEGORY_KEYS = ['consumable', 'collectible', 'weapon', 'keyitem'];

const INVENTORY_ITEMS = {
  key: {
    id: 'key', name: 'Key', category: 'keyitem',
    description: "The entrance key. I shouldn't have this.",
    stackable: false
  },
  candy: {
    id: 'candy', name: 'Candy', category: 'consumable',
    description: "It's just a lemon flavored candy. Heals 5 HP.",
    stackable: true,
    onUse() {
      if (!window.Health) return false;
      if (window.Health.currentHP >= window.Health.maxHP) return false;
      window.Health.heal(5);
      return true;
    }
  }
};
window.INVENTORY_ITEMS = INVENTORY_ITEMS;

let inventoryOpen = false;
let inventorySelectedIndex = 0;
let inventoryShowingDesc = false;
let inventoryItems = []; // Array of { id, quantity }
let activeTab = 0; // 0=consumable, 1=collectible, 2=weapon, 3=keyitem
let currentPage = 0;
const ITEMS_PER_PAGE = 6;

// Consumable action menu state
let showingActions = false;
let actionIndex = 0; // 0=USE, 1=DROP, 2=EXIT
const ACTIONS = ['USE', 'DROP', 'EXIT'];

// --- Drop counter for unique IDs ---
let dropCounter = 0;

function getItemsForTab() {
  const cat = CATEGORY_KEYS[activeTab];
  return inventoryItems.filter(entry => {
    const def = INVENTORY_ITEMS[entry.id];
    return def && def.category === cat;
  });
}

function getTotalPages() {
  const items = getItemsForTab();
  return Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
}

function getPageItems() {
  const items = getItemsForTab();
  const start = currentPage * ITEMS_PER_PAGE;
  return items.slice(start, start + ITEMS_PER_PAGE);
}

function drawInventory(ctx) {
  if (!inventoryOpen) return;

  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const boxW = 420;
  const boxH = 340;
  const boxX = (cw - boxW) / 2;
  const boxY = (ch - boxH) / 2;

  ctx.save();

  // Background
  ctx.fillStyle = 'rgba(20, 20, 20, 0.95)';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  // --- Category Tabs ---
  const tabW = boxW / 4;
  const tabH = 28;
  for (let i = 0; i < 4; i++) {
    const tx = boxX + i * tabW;
    const ty = boxY - tabH;
    const cat = CATEGORY_KEYS[i];
    const catDef = ITEM_CATEGORIES[cat];

    ctx.fillStyle = i === activeTab ? 'rgba(20,20,20,0.95)' : 'rgba(40,40,40,0.8)';
    ctx.fillRect(tx, ty, tabW, tabH);
    ctx.strokeStyle = i === activeTab ? catDef.color : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = i === activeTab ? 2 : 1;
    ctx.strokeRect(tx, ty, tabW, tabH);

    ctx.font = '11px monospace';
    ctx.fillStyle = i === activeTab ? catDef.color : 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(catDef.name, tx + tabW / 2, ty + tabH / 2);
  }

  const contentY = boxY + 12;
  const pageItems = getPageItems();
  const totalPages = getTotalPages();
  const catColor = ITEM_CATEGORIES[CATEGORY_KEYS[activeTab]].color;

  if (pageItems.length === 0) {
    ctx.font = '16px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No items', cw / 2, boxY + boxH / 2);
  } else if (inventoryShowingDesc) {
    // --- Description View ---
    const entry = getItemsForTab()[currentPage * ITEMS_PER_PAGE + inventorySelectedIndex];
    const item = entry ? INVENTORY_ITEMS[entry.id] : null;
    if (item) {
      ctx.font = '20px monospace';
      ctx.fillStyle = catColor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(item.name, boxX + 20, contentY + 10);

      ctx.font = '14px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      const descLines = wrapTextSimple(ctx, item.description, boxW - 40, 10);
      for (let i = 0; i < descLines.length; i++) {
        ctx.fillText(descLines[i], boxX + 20, contentY + 45 + i * 20);
      }

      if (showingActions && item.category === 'consumable') {
        // Draw action options
        const actY = contentY + 45 + descLines.length * 20 + 20;
        ctx.font = '18px monospace';
        for (let i = 0; i < ACTIONS.length; i++) {
          ctx.fillStyle = i === actionIndex ? '#0ff' : 'rgba(255,255,255,0.5)';
          ctx.fillText(ACTIONS[i], boxX + 20 + i * 100, actY);
        }
      } else if (item.category === 'consumable') {
        showingActions = true;
        actionIndex = 0;
      } else {
        ctx.font = '11px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.textAlign = 'right';
        ctx.fillText('Enter to close', boxX + boxW - 20, boxY + boxH - 15);
      }
    }
  } else {
    // --- Item List ---
    const rowH = 42;
    const startY = contentY + 8;

    for (let i = 0; i < pageItems.length; i++) {
      const entry = pageItems[i];
      const item = INVENTORY_ITEMS[entry.id];
      if (!item) continue;

      const iy = startY + i * rowH;
      const selected = i === inventorySelectedIndex;

      // Selection highlight
      if (selected) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(boxX + 10, iy, boxW - 20, rowH - 4);
        ctx.strokeStyle = catColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX + 10, iy, boxW - 20, rowH - 4);
      }

      // Icon (colored cube)
      const iconSize = 24;
      const iconX = boxX + 24;
      const iconY = iy + (rowH - 4 - iconSize) / 2;
      ctx.fillStyle = catColor;
      ctx.fillRect(iconX, iconY, iconSize, iconSize);
      ctx.strokeStyle = selected ? '#fff' : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(iconX, iconY, iconSize, iconSize);

      // Item initial on icon
      ctx.font = '12px monospace';
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.name[0], iconX + iconSize / 2, iconY + iconSize / 2);

      // Name
      ctx.font = '16px monospace';
      ctx.fillStyle = selected ? '#fff' : 'rgba(255,255,255,0.6)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      let nameStr = item.name;
      if (item.stackable && entry.quantity > 1) {
        nameStr += '  \u00d7' + entry.quantity;
      }
      ctx.fillText(nameStr, iconX + iconSize + 14, iy + (rowH - 4) / 2);
    }
  }

  // Page indicator
  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText((currentPage + 1) + '/' + totalPages, boxX + boxW - 15, boxY + boxH - 10);

  // Controls hint
  ctx.textAlign = 'left';
  ctx.fillText('Tab:switch | Shift:page | I:close', boxX + 15, boxY + boxH - 10);

  ctx.restore();
}

function wrapTextSimple(ctx, text, maxW, maxLines) {
  const words = text.split(' ');
  let line = '';
  const lines = [];
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line.trim());
      line = word + ' ';
      if (lines.length >= maxLines) return lines;
    } else {
      line = test;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function dropItem(itemId) {
  if (!window.player || !window.MapManager) return;
  const TILE_SIZE = window.TILE_SIZE || 50;
  const dir = window.playerDir || 'down';
  let dropX = window.player.x;
  let dropY = window.player.y;

  if (dir === 'up') dropY -= TILE_SIZE;
  else if (dir === 'down') dropY += TILE_SIZE;
  else if (dir === 'left') dropX -= TILE_SIZE;
  else if (dir === 'right') dropX += TILE_SIZE;

  // Clamp to room bounds
  const room = window.MapManager.current();
  const rw = room.pixelWidth || 600;
  const rh = room.pixelHeight || 600;
  dropX = Math.max(0, Math.min(rw - TILE_SIZE, dropX));
  dropY = Math.max(0, Math.min(rh - TILE_SIZE, dropY));

  const dropId = 'dropped_' + itemId + '_' + (++dropCounter);
  const itemDef = INVENTORY_ITEMS[itemId];
  const catColor = ITEM_CATEGORIES[itemDef.category].color;
  const currentRoom = window.MapManager.currentRoom;

  // Add entity
  const entity = {
    id: dropId,
    type: 'item',
    room: currentRoom,
    collected: false,
    interactionId: dropId,
    area: { x: dropX, y: dropY, width: TILE_SIZE, height: TILE_SIZE },
    color: catColor,
    interactionArea: {
      x: dropX - TILE_SIZE, y: dropY - TILE_SIZE,
      width: TILE_SIZE * 3, height: TILE_SIZE * 3
    },
    draw(ctx) {
      if (this.collected) return;
      ctx.save();
      ctx.shadowColor = catColor; ctx.shadowBlur = 8;
      ctx.fillStyle = this.color;
      const s = TILE_SIZE * 0.4;
      const ox = this.area.x + (TILE_SIZE - s) / 2;
      const oy = this.area.y + (TILE_SIZE - s) / 2;
      ctx.fillRect(ox, oy, s, s);
      ctx.font = '10px monospace'; ctx.fillStyle = '#fff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(itemDef.name[0], this.area.x + TILE_SIZE / 2, this.area.y + TILE_SIZE / 2);
      ctx.restore();
    }
  };
  window.Entities.push(entity);

  // Add interaction for pickup
  const interaction = {
    id: dropId,
    room: currentRoom,
    type: 'text',
    get area() {
      const e = window.Entities.find(en => en.id === dropId);
      return e && !e.collected ? e.interactionArea : { x: -999, y: -999, width: 0, height: 0 };
    },
    trigger() {
      const e = window.Entities.find(en => en.id === dropId);
      return e && !e.collected;
    },
    onActivate() {
      const e = window.Entities.find(en => en.id === dropId);
      if (e) e.collected = true;
      if (window.Inventory) window.Inventory.add(itemId);
    },
    text: {
      pages: ["You picked up a {" + itemDef.name + ":" + catColor + "}."],
      font: '20px monospace',
      color: '#fff',
      frame: { fill: '#222', outline: catColor, height: 90, margin: 16 }
    }
  };
  window.interactions.push(interaction);
}

// Inventory key handler
document.addEventListener('keydown', function (e) {
  if (window.gameMenu && window.gameMenu.state.isActive) return;
  if (window.gameMenu && window.gameMenu.showExitConfirm) return;
  if (window.gameMenu && window.gameMenu.showPauseMenu) return;
  if (window.DebugMenu && window.DebugMenu.isOpen) return;

  if (e.key.toLowerCase() === 'i') {
    if (showingActions) return;
    if (inventoryShowingDesc) { inventoryShowingDesc = false; showingActions = false; return; }
    inventoryOpen = !inventoryOpen;
    if (inventoryOpen) {
      inventorySelectedIndex = 0;
      inventoryShowingDesc = false;
      showingActions = false;
      currentPage = 0;
    }
    return;
  }

  if (!inventoryOpen) return;

  // Tab key: switch category tab
  if (e.key === 'Tab') {
    e.preventDefault();
    activeTab = (activeTab + 1) % 4;
    inventorySelectedIndex = 0;
    currentPage = 0;
    inventoryShowingDesc = false;
    showingActions = false;
    return;
  }

  // Shift: page forward
  if (e.key === 'Shift') {
    const totalPages = getTotalPages();
    if (totalPages > 1) {
      currentPage = (currentPage + 1) % totalPages;
      inventorySelectedIndex = 0;
    }
    return;
  }

  // In action menu (USE/DROP/EXIT for consumables)
  if (showingActions) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      actionIndex = Math.max(0, actionIndex - 1);
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      actionIndex = Math.min(ACTIONS.length - 1, actionIndex + 1);
    } else if (e.key === 'Enter') {
      const items = getItemsForTab();
      const idx = currentPage * ITEMS_PER_PAGE + inventorySelectedIndex;
      const entry = items[idx];
      if (!entry) return;
      const itemDef = INVENTORY_ITEMS[entry.id];

      if (ACTIONS[actionIndex] === 'USE') {
        if (itemDef && itemDef.onUse && itemDef.onUse()) {
          // Consume one
          entry.quantity--;
          if (entry.quantity <= 0) {
            const globalIdx = inventoryItems.indexOf(entry);
            if (globalIdx >= 0) inventoryItems.splice(globalIdx, 1);
            if (inventorySelectedIndex >= getPageItems().length) {
              inventorySelectedIndex = Math.max(0, getPageItems().length - 1);
            }
          }
          showingActions = false;
          inventoryShowingDesc = false;
        }
        // If onUse returned false (full HP), do nothing
      } else if (ACTIONS[actionIndex] === 'DROP') {
        dropItem(entry.id);
        entry.quantity--;
        if (entry.quantity <= 0) {
          const globalIdx = inventoryItems.indexOf(entry);
          if (globalIdx >= 0) inventoryItems.splice(globalIdx, 1);
          if (inventorySelectedIndex >= getPageItems().length) {
            inventorySelectedIndex = Math.max(0, getPageItems().length - 1);
          }
        }
        showingActions = false;
        inventoryShowingDesc = false;
      } else if (ACTIONS[actionIndex] === 'EXIT') {
        showingActions = false;
        inventoryShowingDesc = false;
      }
    }
    return;
  }

  // Description view (non-consumable)
  if (inventoryShowingDesc) {
    if (e.key === 'Enter') {
      inventoryShowingDesc = false;
      showingActions = false;
    }
    return;
  }

  // Item list navigation
  const pageItems = getPageItems();
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    inventorySelectedIndex = Math.max(0, inventorySelectedIndex - 1);
  } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    inventorySelectedIndex = Math.min(pageItems.length - 1, inventorySelectedIndex + 1);
  } else if (e.key === 'Enter' && pageItems.length > 0) {
    inventoryShowingDesc = true;
    showingActions = false;
    actionIndex = 0;
    // showingActions will be set to true in draw for consumables
  }
});

window.Inventory = {
  get items() { return inventoryItems; },
  get isOpen() { return inventoryOpen; },
  add(itemId) {
    const def = INVENTORY_ITEMS[itemId];
    if (!def) return;
    if (def.stackable) {
      const existing = inventoryItems.find(e => e.id === itemId);
      if (existing) { existing.quantity++; return; }
    }
    inventoryItems.push({ id: itemId, quantity: 1 });
  },
  remove(itemId) {
    const idx = inventoryItems.findIndex(e => e.id === itemId);
    if (idx >= 0) {
      inventoryItems[idx].quantity--;
      if (inventoryItems[idx].quantity <= 0) {
        inventoryItems.splice(idx, 1);
      }
      if (inventorySelectedIndex >= inventoryItems.length) {
        inventorySelectedIndex = Math.max(0, inventoryItems.length - 1);
      }
    }
  },
  has(itemId) { return inventoryItems.some(e => e.id === itemId && e.quantity > 0); },
  clear() {
    inventoryItems.length = 0;
    inventorySelectedIndex = 0;
    inventoryShowingDesc = false;
    showingActions = false;
    inventoryOpen = false;
    activeTab = 0;
    currentPage = 0;
  },
  setItems(items) {
    inventoryItems.length = 0;
    for (const item of items) {
      inventoryItems.push({ id: item.id, quantity: item.quantity || 1 });
    }
  },
  draw: drawInventory
};
