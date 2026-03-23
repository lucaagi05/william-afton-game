// menu.js - Menu system: video background, controls popup, save/load

const GAME_TITLE = 'FNAF Minigame';
const SAVE_SLOTS = 3;
const SAVE_KEY_PREFIX = 'fnaf_save_';

let gameStarted = false;
let currentSaveSlot = null;
let showingControls = false;        // controls popup state
let firstStart = true;              // first time pressing Start

const menuVideo = document.getElementById('menuVideo');

const menuState = {
  isActive: true,
  currentMenu: 'root',
  selectedOption: 0,
  options: {
    root: [
      { text: 'Start', enabled: true },
      { text: 'Load', enabled: true },
      { text: 'Extra', enabled: false }
    ],
    load: [
      { text: 'Load from Browser', enabled: true },
      { text: 'Load from File', enabled: true },
      { text: 'Back', enabled: true }
    ]
  }
};

// --- Video control ---
function ensureVideoPlaying() {
  if (menuVideo && menuVideo.paused) {
    menuVideo.play().catch(() => {});
  }
}

// --- Save / Load ---
function saveGame(slot) {
  const gameData = {
    playerX: window.player.x,
    playerY: window.player.y,
    currentRoom: window.MapManager ? window.MapManager.currentRoom : 'room1',
    inventory: window.Inventory ? window.Inventory.items.slice() : [],
    checkpoint: window.currentCheckpoint || null
  };
  localStorage.setItem(SAVE_KEY_PREFIX + slot, JSON.stringify(gameData));
  currentSaveSlot = slot;

  const extra = menuState.options.root.find(o => o.text === 'Extra');
  if (extra) extra.enabled = true;
  if (!menuState.options.root.find(o => o.text === 'Erase Data')) {
    menuState.options.root.push({ text: 'Erase Data', enabled: true });
  }
  if (!menuState.options.root.find(o => o.text === 'Save To File')) {
    menuState.options.root.push({ text: 'Save To File', enabled: true });
  }
}

function loadGame(slot) {
  const saveData = localStorage.getItem(SAVE_KEY_PREFIX + slot);
  if (saveData) {
    const d = JSON.parse(saveData);
    window.player.x = d.playerX;
    window.player.y = d.playerY;
    if (d.currentRoom && window.MapManager) window.MapManager.currentRoom = d.currentRoom;
    if (d.inventory && window.Inventory) {
      d.inventory.forEach(id => window.Inventory.add(id));
    }
    window.currentCheckpoint = d.checkpoint;
    return true;
  }
  return false;
}

function exportSaveToFile(gameData, suggestedName = 'fnaf_save.json') {
  const blob = new Blob([JSON.stringify(gameData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

function importSaveFromFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (typeof data.playerX === 'number') window.player.x = data.playerX;
      if (typeof data.playerY === 'number') window.player.y = data.playerY;
      if (data.currentRoom && window.MapManager) window.MapManager.currentRoom = data.currentRoom;
      if (data.inventory && window.Inventory) {
        data.inventory.forEach(id => window.Inventory.add(id));
      }
      window.currentCheckpoint = data.checkpoint || null;
      menuState.isActive = false;
      gameStarted = true;
      menuState.currentMenu = 'root';
      alert('Save loaded from file.');
    } catch (err) {
      alert('Invalid save file.');
    }
  };
  input.click();
}

// --- Controls Popup Drawing ---
function drawControlsPopup(ctx) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const boxW = Math.min(500, cw - 60);
  const boxH = 320;
  const bx = (cw - boxW) / 2;
  const by = (ch - boxH) / 2;

  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(bx, by, boxW, boxH);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.strokeRect(bx, by, boxW, boxH);

  ctx.font = '22px monospace';
  ctx.fillStyle = '#0ff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('CONTROLS', cw / 2, by + 18);

  const controls = [
    ['WASD / Arrows', 'Move'],
    ['Space',         'Run'],
    ['Enter',         'Interact'],
    ['I',             'Inventory'],
    ['H',             'Toggle Map'],
    ['X',             'Open Menu'],
    ['F11',           'Fullscreen']
  ];

  ctx.font = '16px monospace';
  const startY = by + 60;
  for (let i = 0; i < controls.length; i++) {
    const y = startY + i * 30;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.fillText(controls[i][0], cw / 2 - 15, y);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'left';
    ctx.fillText(controls[i][1], cw / 2 + 15, y);
  }

  ctx.font = '13px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.textAlign = 'center';
  ctx.fillText('Press Enter to start', cw / 2, by + boxH - 30);
}

// --- Menu Drawing ---
function drawMenu(ctx) {
  if (!menuState.isActive) return;

  // Video background
  ensureVideoPlaying();
  if (menuVideo && menuVideo.readyState >= 2) {
    ctx.drawImage(menuVideo, 0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  if (showingControls) {
    drawControlsPopup(ctx);
    return;
  }

  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;

  ctx.fillStyle = '#fff';
  ctx.font = '48px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(menuState.currentMenu === 'root' ? GAME_TITLE : 'Load Game', cw / 2, ch * 0.25);

  const currentOptions = menuState.options[menuState.currentMenu];
  if (!currentOptions) { menuState.currentMenu = 'root'; return; }

  ctx.font = '24px monospace';
  const startY = ch * 0.40;
  currentOptions.forEach((option, index) => {
    ctx.fillStyle = !option.enabled ? '#444' : (index === menuState.selectedOption ? '#0ff' : '#fff');
    ctx.fillText(option.text, cw / 2, startY + (index * 60));
  });

  // Download icon
  if (window.downloadIcon && window.downloadIcon.complete) {
    const btn = window.downloadBtn;
    btn.x = cw - 60;
    btn.y = ch - 60;
    ctx.globalAlpha = 0.8;
    ctx.drawImage(window.downloadIcon, btn.x, btn.y, btn.width, btn.height);
    ctx.globalAlpha = 1.0;
  }
}

// --- Menu Input ---
function handleMenuInput(e) {
  if (!menuState.isActive) return;

  // Controls popup handler
  if (showingControls) {
    if (e.key === 'Enter') {
      showingControls = false;
      menuState.isActive = false;
      gameStarted = true;
    }
    return;
  }

  const currentOptions = menuState.options[menuState.currentMenu];
  if (!currentOptions) return;

  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    menuState.selectedOption = (menuState.selectedOption - 1 + currentOptions.length) % currentOptions.length;
  } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    menuState.selectedOption = (menuState.selectedOption + 1) % currentOptions.length;
  } else if (e.key === 'Enter') {
    const option = currentOptions[menuState.selectedOption];
    if (!option || !option.enabled) return;

    if (menuState.currentMenu === 'root') {
      switch (option.text) {
        case 'Start':
          if (firstStart) {
            showingControls = true;
            firstStart = false;
          } else {
            menuState.isActive = false;
            gameStarted = true;
          }
          break;
        case 'Load':
          menuState.currentMenu = 'load';
          menuState.selectedOption = 0;
          break;
        case 'Erase Data':
          eraseAllData();
          break;
        case 'Save To File': {
          const slot1 = localStorage.getItem(SAVE_KEY_PREFIX + '1');
          if (slot1) {
            exportSaveToFile(JSON.parse(slot1), 'fnaf_save_synced.json');
          } else {
            exportSaveToFile({
              playerX: window.player.x,
              playerY: window.player.y,
              checkpoint: window.currentCheckpoint || null
            }, 'fnaf_save_current.json');
          }
          break;
        }
      }
    } else if (menuState.currentMenu === 'load') {
      switch (option.text) {
        case 'Load from Browser': {
          const slot = prompt('Load slot (1-3):', '1');
          if (slot && loadGame(slot)) {
            menuState.isActive = false;
            gameStarted = true;
            menuState.currentMenu = 'root';
          } else if (slot) {
            alert('No save in slot ' + slot);
          }
          break;
        }
        case 'Load from File':
          importSaveFromFile();
          break;
        case 'Back':
          menuState.currentMenu = 'root';
          menuState.selectedOption = 1;
          break;
      }
    }
  }
}

function handleMenuClick(clickX, clickY) {
  if (!menuState.isActive) return false;
  const btn = window.downloadBtn;
  if (clickX >= btn.x && clickX <= btn.x + btn.width &&
      clickY >= btn.y && clickY <= btn.y + btn.height) {
    const slot1 = localStorage.getItem(SAVE_KEY_PREFIX + '1');
    if (slot1) {
      exportSaveToFile(JSON.parse(slot1), 'fnaf_save_synced.json');
    } else {
      exportSaveToFile({
        playerX: window.player.x,
        playerY: window.player.y,
        checkpoint: window.currentCheckpoint || null
      }, 'fnaf_save_current.json');
    }
    return true;
  }
  return false;
}

function eraseAllData() {
  for (let i = 1; i <= SAVE_SLOTS; i++) {
    localStorage.removeItem(SAVE_KEY_PREFIX + i);
  }
  menuState.options.root = menuState.options.root.filter(o => o.text !== 'Erase Data' && o.text !== 'Save To File');
  const extra = menuState.options.root.find(o => o.text === 'Extra');
  if (extra) extra.enabled = false;
}

window.gameMenu = {
  state: menuState,
  draw: drawMenu,
  handleInput: handleMenuInput,
  handleClick: handleMenuClick,
  saveGame: saveGame,
  loadGame: loadGame,
  exportSaveToFile: exportSaveToFile,
  importSaveFromFile: importSaveFromFile,
  isGameStarted: () => gameStarted
};

// Refresh confirmation
window.addEventListener('beforeunload', (e) => {
  if (window.gameMenu.isGameStarted() && !menuState.isActive) {
    e.preventDefault();
    e.returnValue = 'Are you sure you want to refresh the page? Unsaved data will be lost!';
    return e.returnValue;
  }
});

// Open menu with X key
document.addEventListener('keydown', function (e) {
  if (e.key.toLowerCase() === 'x') {
    menuState.isActive = true;
  }
});
