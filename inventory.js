// inventory.js - Inventory system: items, UI, toggle with I key

const INVENTORY_ITEMS = {
  key:   { id: 'key',   name: 'Key',   description: "The entrance key. I shouldn't have this." },
  candy: { id: 'candy', name: 'Candy', description: "It's just a lemon flavored candy." }
};

let inventoryOpen = false;
let inventorySelectedIndex = 0;
let inventoryShowingDesc = false;
let inventoryItems = [];

function drawInventory(ctx) {
  if (!inventoryOpen) return;

  const canvas = ctx.canvas;
  const margin = 16;
  const boxHeight = 110;
  const boxX = margin;
  const boxY = canvas.height - boxHeight - margin;
  const boxWidth = canvas.width - margin * 2;

  ctx.save();

  // Background
  ctx.fillStyle = 'rgba(34, 34, 34, 0.95)';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

  if (inventoryItems.length === 0) {
    ctx.font = '18px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Inventory is empty', canvas.width / 2, boxY + boxHeight / 2);
    ctx.restore();
    return;
  }

  if (inventoryShowingDesc) {
    const item = INVENTORY_ITEMS[inventoryItems[inventorySelectedIndex]];
    if (item) {
      ctx.font = '18px monospace';
      ctx.fillStyle = '#0ff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(item.name, boxX + margin, boxY + margin);
      ctx.font = '15px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText(item.description, boxX + margin, boxY + margin + 30);
      ctx.font = '12px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.textAlign = 'right';
      ctx.fillText('Press Enter to close', boxX + boxWidth - margin, boxY + boxHeight - margin);
    }
    ctx.restore();
    return;
  }

  // Draw item slots
  const slotSize = 42;
  const slotGap = 12;
  const startX = boxX + margin + 10;
  const slotY = boxY + (boxHeight - slotSize) / 2 + 6;

  for (let i = 0; i < inventoryItems.length; i++) {
    const item = INVENTORY_ITEMS[inventoryItems[i]];
    if (!item) continue;
    const sx = startX + i * (slotSize + slotGap);

    ctx.fillStyle = i === inventorySelectedIndex ? 'rgba(0,255,255,0.15)' : 'rgba(255,255,255,0.05)';
    ctx.fillRect(sx, slotY, slotSize, slotSize);
    ctx.strokeStyle = i === inventorySelectedIndex ? '#0ff' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, slotY, slotSize, slotSize);

    ctx.font = '20px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.name[0], sx + slotSize / 2, slotY + slotSize / 2);
  }

  // Selected item name
  const sel = INVENTORY_ITEMS[inventoryItems[inventorySelectedIndex]];
  if (sel) {
    ctx.font = '14px monospace';
    ctx.fillStyle = '#0ff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(sel.name, startX, slotY - 6);
  }

  // Hint
  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('\u2190 \u2192 browse | Enter details | I close', boxX + boxWidth - margin, boxY + boxHeight - margin / 2);

  ctx.restore();
}

// Inventory key handler
document.addEventListener('keydown', function (e) {
  if (window.gameMenu && window.gameMenu.state.isActive) return;

  if (e.key.toLowerCase() === 'i') {
    if (inventoryShowingDesc) { inventoryShowingDesc = false; return; }
    inventoryOpen = !inventoryOpen;
    if (inventoryOpen) { inventorySelectedIndex = 0; inventoryShowingDesc = false; }
    return;
  }

  if (!inventoryOpen) return;

  if (inventoryShowingDesc) {
    if (e.key === 'Enter') inventoryShowingDesc = false;
    return;
  }

  if (e.key === 'ArrowLeft') {
    inventorySelectedIndex = Math.max(0, inventorySelectedIndex - 1);
  } else if (e.key === 'ArrowRight') {
    inventorySelectedIndex = Math.min(inventoryItems.length - 1, inventorySelectedIndex + 1);
  } else if (e.key === 'Enter' && inventoryItems.length > 0) {
    inventoryShowingDesc = true;
  }
});

window.Inventory = {
  get items() { return inventoryItems; },
  get isOpen() { return inventoryOpen; },
  add(itemId) { if (!inventoryItems.includes(itemId)) inventoryItems.push(itemId); },
  remove(itemId) {
    const idx = inventoryItems.indexOf(itemId);
    if (idx >= 0) {
      inventoryItems.splice(idx, 1);
      if (inventorySelectedIndex >= inventoryItems.length)
        inventorySelectedIndex = Math.max(0, inventoryItems.length - 1);
    }
  },
  has(itemId) { return inventoryItems.includes(itemId); },
  draw: drawInventory
};
