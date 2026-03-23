// interactions.js - Interaction data, state, key handling, and textbox rendering

// --- Interaction State ---
let activeInteraction = null;
let choiceIndex = 0;
let textboxPage = 0;

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

// --- Interaction Key Handler ---
document.addEventListener('keydown', function (e) {
  if (window.gameMenu && window.gameMenu.state.isActive) return;
  if (window.gameMenu && window.gameMenu.showExitConfirm) return;
  if (window.DebugMenu && window.DebugMenu.isOpen) return;
  if (window.Inventory && window.Inventory.isOpen) return;

  if (e.key === 'Enter' && !activeInteraction) {
    for (const inter of window.interactions) {
      if (inter.room && inter.room !== window.MapManager.currentRoom) continue;
      if (window.isColliding(window.playerHitbox, inter.area)) {
        // Check trigger condition if defined
        if (inter.trigger && !inter.trigger()) continue;
        window.AudioManager.playTextboxSound();
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
// Uses fixed preset size, drawn in canvas-global coordinates
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
    const lineHeight = 24;
    const lines = wrapText(ctx, pageText, 0, 0, boxWidth - margin * 2, lineHeight, 10);
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], boxX + margin, boxY + margin + i * lineHeight);
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
        "Hi cod.",
        "You may be wondering why I revived William Afton's account.",
        "Mainly because Discord sent me an email reminding me the account was going to be deleted",
        "but also to retrieve some old stuff I made for the arg...",
        "like this game.",
        "Scrapped it out of disinterst...do you think it has potential for something?"
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
    },
    text: {
      pages: ["You found a key. It looks important."],
      font: '20px monospace',
      color: '#ff0',
      frame: { fill: '#222', outline: '#ff0', height: 90, margin: 16 }
    }
  },

  // --- CANDY ITEM pickup ---
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
    },
    text: {
      pages: ["You picked up a candy."],
      font: '20px monospace',
      color: '#f0f',
      frame: { fill: '#222', outline: '#f0f', height: 90, margin: 16 }
    }
  },

  // --- LOCKED DOOR (Room 4 → Garden) ---
  {
    id: 'locked_door_room4',
    room: 'room4',
    type: 'text',
    get area() {
      const door = window.Entities.find(e => e.id === 'door_to_garden');
      return door ? door.interactionArea : { x: -999, y: -999, width: 0, height: 0 };
    },
    trigger() {
      const door = window.Entities.find(e => e.id === 'door_to_garden');
      return door && door.locked;
    },
    onActivate() {
      if (window.Inventory && window.Inventory.has('key')) {
        const door = window.Entities.find(e => e.id === 'door_to_garden');
        if (door) door.locked = false;
        window.Inventory.remove('key');
      }
    },
    get text() {
      const door = window.Entities.find(e => e.id === 'door_to_garden');
      if (door && !door.locked) {
        return {
          pages: ["You used the key. The door is now open."],
          font: '20px monospace', color: '#0f0',
          frame: { fill: '#222', outline: '#0f0', height: 90, margin: 16 }
        };
      }
      return {
        pages: ["The door is locked. You need a key."],
        font: '20px monospace', color: '#f44',
        frame: { fill: '#222', outline: '#f44', height: 90, margin: 16 }
      };
    }
  }
];