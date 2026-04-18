// interactions.js - Interaction data, state, key handling, and textbox rendering

// --- Interaction State ---
let activeInteraction = null;
let choiceIndex = 0;
let textboxPage = 0;

// --- Rich Text Markup ---
// Supports {ItemName:#color} syntax for colored item names in dialogues
function parseMarkup(text) {
  const parts = [];
  let i = 0;
  while (i < text.length) {
    const braceIdx = text.indexOf('{', i);
    if (braceIdx === -1) {
      parts.push({ text: text.slice(i), color: null });
      break;
    }
    if (braceIdx > i) {
      parts.push({ text: text.slice(i, braceIdx), color: null });
    }
    const closeBrace = text.indexOf('}', braceIdx);
    if (closeBrace === -1) {
      parts.push({ text: text.slice(braceIdx), color: null });
      break;
    }
    const content = text.slice(braceIdx + 1, closeBrace);
    const colonIdx = content.lastIndexOf(':');
    if (colonIdx > 0) {
      parts.push({ text: content.slice(0, colonIdx), color: content.slice(colonIdx + 1) });
    } else {
      parts.push({ text: '{' + content + '}', color: null });
    }
    i = closeBrace + 1;
  }
  return parts;
}

function getPlainText(markupText) {
  return parseMarkup(markupText).map(p => p.text).join('');
}

// --- Text Wrapping Utility ---
function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(' ');
  let line = '';
  let lines = [];
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      lines.push(line.trim());
      line = words[n] + ' ';
      if (lines.length === maxLines) break;
    } else {
      line = testLine;
    }
  }
  if (lines.length < maxLines) lines.push(line.trim());
  return lines;
}

// Draw a single line with color markup applied
function drawRichLine(ctx, lineText, fullMarkupText, x, y, defaultColor) {
  const parts = parseMarkup(fullMarkupText);
  const plainFull = parts.map(p => p.text).join('');

  // Find where this line starts in the full plain text
  // Build a character-color map for the full text
  const colorMap = [];
  for (const part of parts) {
    for (let i = 0; i < part.text.length; i++) {
      colorMap.push(part.color || defaultColor);
    }
  }

  // Find lineText in plainFull
  const lineIdx = plainFull.indexOf(lineText);
  if (lineIdx === -1) {
    ctx.fillStyle = defaultColor;
    ctx.fillText(lineText, x, y);
    return;
  }

  // Draw character by character with correct colors
  let curX = x;
  let runStart = 0;
  let runColor = colorMap[lineIdx] || defaultColor;

  for (let i = 0; i <= lineText.length; i++) {
    const charColor = (i < lineText.length) ? (colorMap[lineIdx + i] || defaultColor) : null;
    if (charColor !== runColor || i === lineText.length) {
      // Draw the accumulated run
      const runText = lineText.slice(runStart, i);
      ctx.fillStyle = runColor;
      ctx.fillText(runText, curX, y);
      curX += ctx.measureText(runText).width;
      runStart = i;
      runColor = charColor;
    }
  }
}

// --- Interaction Key Handler ---
document.addEventListener('keydown', function (e) {
  if (window.gameMenu && window.gameMenu.state.isActive) return;
  if (window.gameMenu && window.gameMenu.showExitConfirm) return;
  if (window.gameMenu && window.gameMenu.showPauseMenu) return;
  if (window.DebugMenu && window.DebugMenu.isOpen) return;
  if (window.Inventory && window.Inventory.isOpen) return;

  if (e.key === 'Enter' && !activeInteraction) {
    for (const inter of window.interactions) {
      if (inter.room && inter.room !== window.MapManager.currentRoom) continue;
      if (window.isTouching(window.playerHitbox, inter.area)) {
        // Check trigger condition if defined
        if (inter.trigger && !inter.trigger()) continue;
        // Run onActivate callback if defined
        if (inter.onActivate) inter.onActivate();
        activeInteraction = inter;
        textboxPage = 0;
        choiceIndex = 0;
        break;
      }
    }
  } else if (activeInteraction) {
    if (activeInteraction.type === 'text') {
      if (e.key === 'Enter') {
        window.AudioManager.playTextboxSound();
        const t = activeInteraction.text;
        const pages = typeof t.pages === 'function' ? t.pages() : t.pages;
        if (pages && textboxPage < pages.length - 1) {
          textboxPage++;
        } else {
          activeInteraction = null;
        }
      }
    } else if (activeInteraction.type === 'choice') {
      const c = activeInteraction.choice;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        choiceIndex = (choiceIndex - 1 + c.options.length) % c.options.length;
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        choiceIndex = (choiceIndex + 1) % c.options.length;
      } else if (e.key === 'Enter') {
        window.AudioManager.playTextboxSound();
        const selected = c.options[choiceIndex];
        if (selected === 'Yes') {
          if (window.AudioManager) window.AudioManager.playSaveGameSound();
          window.currentCheckpoint = activeInteraction.id || 'checkpoint';
          if (window.gameMenu && window.gameMenu.saveGame) {
            window.gameMenu.saveGame(1);
          }
          activeInteraction = {
            type: 'text',
            text: {
              pages: ["Game saved to browser storage."],
              font: c.font,
              color: c.color,
              frame: c.frame
            }
          };
          textboxPage = 0;
        } else {
          activeInteraction = null;
        }
      }
    }
  }
});

// --- Textbox / Choice Rendering ---
function drawInteraction(ctx) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const TEXTBOX_W = 550;

  if (activeInteraction && activeInteraction.type === 'text') {
    const t = activeInteraction.text;
    const margin = t.frame.margin;
    const boxWidth = TEXTBOX_W;
    const boxHeight = t.frame.height;
    const boxX = (cw - boxWidth) / 2;
    const boxY = ch - boxHeight - margin - 30;
    ctx.save();
    ctx.fillStyle = t.frame.fill;
    ctx.strokeStyle = t.frame.outline;
    ctx.lineWidth = 4;
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    ctx.font = t.font;
    ctx.fillStyle = t.color;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    const pages = typeof t.pages === 'function' ? t.pages() : t.pages;
    const pageText = pages[textboxPage] || '';
    const plainText = getPlainText(pageText);
    const lineHeight = 24;
    const lines = wrapText(ctx, plainText, 0, 0, boxWidth - margin * 2, lineHeight, 10);
    for (let i = 0; i < lines.length; i++) {
      drawRichLine(ctx, lines[i], pageText, boxX + margin, boxY + margin + i * lineHeight, t.color);
    }
    if (textboxPage < pages.length - 1) {
      ctx.fillStyle = t.frame.outline;
      ctx.beginPath();
      const triX = boxX + boxWidth - margin - 12;
      const triY = boxY + boxHeight - margin / 2;
      ctx.moveTo(triX, triY);
      ctx.lineTo(triX + 12, triY);
      ctx.lineTo(triX + 6, triY + 8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

  } else if (activeInteraction && activeInteraction.type === 'choice') {
    const c = activeInteraction.choice;
    const margin = c.frame.margin;
    const boxWidth = TEXTBOX_W;
    const boxHeight = c.frame.height;
    const boxX = (cw - boxWidth) / 2;
    const boxY = ch - boxHeight - margin - 30;
    ctx.save();
    ctx.fillStyle = c.frame.fill;
    ctx.strokeStyle = c.frame.outline;
    ctx.lineWidth = 4;
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    ctx.font = c.font;
    ctx.fillStyle = c.color;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    const lineHeight = 24;
    const promptLines = wrapText(ctx, c.prompt, 0, 0, boxWidth - margin * 2, lineHeight, 4);
    for (let i = 0; i < promptLines.length; i++) {
      ctx.fillText(promptLines[i], boxX + margin, boxY + margin + i * lineHeight);
    }
    ctx.font = '22px monospace';
    const baseY = boxY + margin + promptLines.length * lineHeight + 10;
    for (let i = 0; i < c.options.length; i++) {
      ctx.fillStyle = i === choiceIndex ? '#0ff' : c.color;
      ctx.fillText(c.options[i], boxX + margin, baseY + i * (lineHeight + 4));
    }
    ctx.restore();
  }
}

// --- Export ---
window.InteractionManager = {
  get activeInteraction() { return activeInteraction; },
  draw: drawInteraction
};

// --- Interaction Data Definitions ---
window.interactions = [
  {
    id: 'cube_item',
    room: 'room1',
    type: 'text',
    get area() { return window.Entities.find(e => e.id === 'cube_item').interactionArea; },
    trigger: function () { return true; },
    text: {
      pages: [
        "It's a birthday card.",
        "The text says:",
        "\"Happy birthday Evan!\"",
        "And there's a heart drawn next to it.",
        "It's not signed, so I don't know who it's from.",
      ],
      font: '25px monospace',
      color: '#fff',
      frame: { fill: '#222', outline: '#fff', height: 120, margin: 16 }
    }
  },
  {
    id: 'checkpoint_left',
    room: 'room2',
    type: 'choice',
    get area() { return window.Entities.find(e => e.id === 'checkpoint_left').interactionArea; },
    trigger: function () { return true; },
    choice: {
      prompt: "Want to save your progress?",
      options: ["Yes", "No"],
      font: '20px monospace',
      color: '#fff',
      frame: { fill: '#222', outline: '#fff', height: 120, margin: 16 }
    }
  },
  {
    id: 'checkpoint_right',
    room: 'room1',
    type: 'choice',
    get area() { return window.Entities.find(e => e.id === 'checkpoint_right').interactionArea; },
    trigger: function () { return true; },
    choice: {
      prompt: "Want to save your progress?",
      options: ["Yes", "No"],
      font: '20px monospace',
      color: '#fff',
      frame: { fill: '#222', outline: '#fff', height: 120, margin: 16 }
    }
  },

  // --- KEY ITEM pickup ---
  {
    id: 'key_item',
    room: 'room2',
    type: 'text',
    get area() {
      const e = window.Entities.find(en => en.id === 'key_item');
      return e && !e.collected ? e.interactionArea : { x: -999, y: -999, width: 0, height: 0 };
    },
    trigger() {
      const e = window.Entities.find(en => en.id === 'key_item');
      return e && !e.collected;
    },
    onActivate() {
      const e = window.Entities.find(en => en.id === 'key_item');
      if (e) e.collected = true;
      if (window.Inventory) window.Inventory.add('key');
      if (window.AudioManager) window.AudioManager.playItemPickupSound();
    },
    text: {
      pages: ["You found a {Key:#ff0}. It looks important."],
      font: '20px monospace',
      color: '#fff',
      frame: { fill: '#222', outline: '#ff0', height: 90, margin: 16 }
    }
  },

  // --- CANDY ITEM pickup (Hallway) ---
  {
    id: 'candy_item',
    room: 'room3',
    type: 'text',
    get area() {
      const e = window.Entities.find(en => en.id === 'candy_item');
      return e && !e.collected ? e.interactionArea : { x: -999, y: -999, width: 0, height: 0 };
    },
    trigger() {
      const e = window.Entities.find(en => en.id === 'candy_item');
      return e && !e.collected;
    },
    onActivate() {
      const e = window.Entities.find(en => en.id === 'candy_item');
      if (e) e.collected = true;
      if (window.Inventory) window.Inventory.add('candy');
      if (window.AudioManager) window.AudioManager.playItemPickupSound();
    },
    text: {
      pages: ["You picked up a {Candy:#4af}."],
      font: '20px monospace',
      color: '#fff',
      frame: { fill: '#222', outline: '#4af', height: 90, margin: 16 }
    }
  },

  // --- CANDY ITEM pickup (Garden) ---
  {
    id: 'candy_item_garden',
    room: 'garden',
    type: 'text',
    get area() {
      const e = window.Entities.find(en => en.id === 'candy_item_garden');
      return e && !e.collected ? e.interactionArea : { x: -999, y: -999, width: 0, height: 0 };
    },
    trigger() {
      const e = window.Entities.find(en => en.id === 'candy_item_garden');
      return e && !e.collected;
    },
    onActivate() {
      const e = window.Entities.find(en => en.id === 'candy_item_garden');
      if (e) e.collected = true;
      if (window.Inventory) window.Inventory.add('candy');
      if (window.AudioManager) window.AudioManager.playItemPickupSound();
    },
    text: {
      pages: ["You picked up a {Candy:#4af}."],
      font: '20px monospace',
      color: '#fff',
      frame: { fill: '#222', outline: '#4af', height: 90, margin: 16 }
    }
  },

  // --- LOCKED DOORS — auto-generated from CSV + map files ---
  // See: data/Locations.csv (IsLocked and KeyID columns)



  // --- KNIFE ITEM pickup ---
  {
    id: 'knife_item',
    room: 'room1',
    type: 'text',
    get area() {
      const e = window.Entities.find(en => en.id === 'knife_item');
      return e && !e.collected ? e.interactionArea : { x: -999, y: -999, width: 0, height: 0 };
    },
    trigger() {
      const e = window.Entities.find(en => en.id === 'knife_item');
      return e && !e.collected;
    },
    onActivate() {
      const e = window.Entities.find(en => en.id === 'knife_item');
      if (e) e.collected = true;
      if (window.Inventory) window.Inventory.add('knife');
      if (window.AudioManager) window.AudioManager.playItemPickupSound();
    },
    text: {
      pages: ["You found a {Knife:#f44}."],
      font: '20px monospace',
      color: '#fff',
      frame: { fill: '#222', outline: '#f44', height: 90, margin: 16 }
    }
  },

  // --- PIE ITEM pickup ---
  {
    id: 'pie_item',
    room: 'room1',
    type: 'text',
    get area() {
      const e = window.Entities.find(en => en.id === 'pie_item');
      return e && !e.collected ? e.interactionArea : { x: -999, y: -999, width: 0, height: 0 };
    },
    trigger() {
      const e = window.Entities.find(en => en.id === 'pie_item');
      return e && !e.collected;
    },
    onActivate() {
      const e = window.Entities.find(en => en.id === 'pie_item');
      if (e) e.collected = true;
      if (window.Inventory) window.Inventory.add('pie');
      if (window.AudioManager) window.AudioManager.playItemPickupSound();
    },
    text: {
      pages: ["You found a {Pie:#ffa500}."],
      font: '20px monospace',
      color: '#fff',
      frame: { fill: '#222', outline: '#ffa500', height: 90, margin: 16 }
    }
  },

  // --- CAKE ITEM pickup ---
  {
    id: 'cake_item',
    room: 'room1',
    type: 'text',
    get area() {
      const e = window.Entities.find(en => en.id === 'cake_item');
      return e && !e.collected ? e.interactionArea : { x: -999, y: -999, width: 0, height: 0 };
    },
    trigger() {
      const e = window.Entities.find(en => en.id === 'cake_item');
      return e && !e.collected;
    },
    onActivate() {
      const e = window.Entities.find(en => en.id === 'cake_item');
      if (e) e.collected = true;
      if (window.Inventory) window.Inventory.add('cake');
      if (window.AudioManager) window.AudioManager.playItemPickupSound();
    },
    text: {
      pages: ["You found a {Cake:#ff69b4}."],
      font: '20px monospace',
      color: '#fff',
      frame: { fill: '#222', outline: '#ff69b4', height: 90, margin: 16 }
    }
  },

  // --- MEDICINE ITEM pickup ---
  {
    id: 'medicine_item',
    room: 'room1',
    type: 'text',
    get area() {
      const e = window.Entities.find(en => en.id === 'medicine_item');
      return e && !e.collected ? e.interactionArea : { x: -999, y: -999, width: 0, height: 0 };
    },
    trigger() {
      const e = window.Entities.find(en => en.id === 'medicine_item');
      return e && !e.collected;
    },
    onActivate() {
      const e = window.Entities.find(en => en.id === 'medicine_item');
      if (e) e.collected = true;
      if (window.Inventory) window.Inventory.add('medicine');
      if (window.AudioManager) window.AudioManager.playItemPickupSound();
    },
    text: {
      pages: ["You found some {Medicine:#ffffff}."],
      font: '20px monospace',
      color: '#fff',
      frame: { fill: '#222', outline: '#aaa', height: 90, margin: 16 }
    }
  },

  // --- VITAMINS ITEM pickup ---
  {
    id: 'vitamins_item',
    room: 'room1',
    type: 'text',
    get area() {
      const e = window.Entities.find(en => en.id === 'vitamins_item');
      return e && !e.collected ? e.interactionArea : { x: -999, y: -999, width: 0, height: 0 };
    },
    trigger() {
      const e = window.Entities.find(en => en.id === 'vitamins_item');
      return e && !e.collected;
    },
    onActivate() {
      const e = window.Entities.find(en => en.id === 'vitamins_item');
      if (e) e.collected = true;
      if (window.Inventory) window.Inventory.add('vitamins');
      if (window.AudioManager) window.AudioManager.playItemPickupSound();
    },
    text: {
      pages: ["You found {Vitamins:#ffff00}."],
      font: '20px monospace',
      color: '#fff',
      frame: { fill: '#222', outline: '#ffff00', height: 90, margin: 16 }
    }
  },

  // --- DRUGS ITEM pickup ---
  {
    id: 'drugs_item',
    room: 'room1',
    type: 'text',
    get area() {
      const e = window.Entities.find(en => en.id === 'drugs_item');
      return e && !e.collected ? e.interactionArea : { x: -999, y: -999, width: 0, height: 0 };
    },
    trigger() {
      const e = window.Entities.find(en => en.id === 'drugs_item');
      return e && !e.collected;
    },
    onActivate() {
      const e = window.Entities.find(en => en.id === 'drugs_item');
      if (e) e.collected = true;
      if (window.Inventory) window.Inventory.add('drugs');
      if (window.AudioManager) window.AudioManager.playItemPickupSound();
    },
    text: {
      pages: ["You found suspicious {Drugs:#800080}."],
      font: '20px monospace',
      color: '#fff',
      frame: { fill: '#222', outline: '#800080', height: 90, margin: 16 }
    }
  },

  // --- MASK ITEM pickup ---
  {
    id: 'mask_item',
    room: 'room1',
    type: 'text',
    get area() {
      const e = window.Entities.find(en => en.id === 'mask_item');
      return e && !e.collected ? e.interactionArea : { x: -999, y: -999, width: 0, height: 0 };
    },
    trigger() {
      const e = window.Entities.find(en => en.id === 'mask_item');
      return e && !e.collected;
    },
    onActivate() {
      const e = window.Entities.find(en => en.id === 'mask_item');
      if (e) e.collected = true;
      if (window.Inventory) window.Inventory.add('mask');
      if (window.AudioManager) window.AudioManager.playItemPickupSound();
    },
    text: {
      pages: ["You found a terrifying {Mask:#696969}."],
      font: '20px monospace',
      color: '#fff',
      frame: { fill: '#222', outline: '#696969', height: 90, margin: 16 }
    }
  }
];