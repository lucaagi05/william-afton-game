// interactions.js - Interaction data, state, key handling, and textbox rendering

// --- Interaction State ---
let activeInteraction = null;
let choiceIndex = 0;
let textboxPage = 0;

// --- Text Wrapping Utility (used for textbox rendering) ---
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
  // Let the menu handle X; skip if menu is open
  if (e.key.toLowerCase() === 'x') return;
  if (window.gameMenu && window.gameMenu.state.isActive) return;

  if (e.key === 'Enter' && !activeInteraction) {
    window.AudioManager.playTextboxSound();
    for (const inter of window.interactions) {
      if (window.isColliding(window.playerHitbox, inter.area)) {
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
        if (t.pages && textboxPage < t.pages.length - 1) {
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
function drawInteraction(ctx) {
  const canvas = ctx.canvas;

  if (activeInteraction && activeInteraction.type === 'text') {
    const t = activeInteraction.text;
    const margin = t.frame.margin;
    const boxY = canvas.height - t.frame.height - margin;
    const boxX = margin;
    const boxWidth = canvas.width - margin * 2;
    const boxHeight = t.frame.height;
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
    const pageText = t.pages[textboxPage] || '';
    const lineHeight = 24;
    const lines = wrapText(ctx, pageText, 0, 0, boxWidth - margin * 2, lineHeight, 10);
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], boxX + margin, boxY + margin + i * lineHeight);
    }
    if (textboxPage < t.pages.length - 1) {
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
    const boxY = canvas.height - c.frame.height - margin;
    const boxX = margin;
    const boxWidth = canvas.width - margin * 2;
    const boxHeight = c.frame.height;
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
    type: 'text',
    get area() { return window.cubeInteractionBox; },
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
    type: 'choice',
    get area() { return window.checkpointHitbox; },
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
    type: 'choice',
    get area() { return window.checkpointRightHitbox; },
    trigger: function () { return true; },
    choice: {
      prompt: "Want to save your progress?",
      options: ["Yes", "No"],
      font: '20px monospace',
      color: '#fff',
      frame: { fill: '#222', outline: '#fff', height: 120, margin: 16 }
    }
  }
];