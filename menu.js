// menu.js - Menu system: video background, controls popup, save/load, pause menu, exit confirmation

const GAME_TITLE = 'FNAF Minigame';
const SAVE_SLOTS = 3;
const SAVE_KEY_PREFIX = 'fnaf_save_';

let gameStarted = false;
let currentSaveSlot = null;
let showingControls = false;
let firstStart = true;
let showExitConfirm = false;
let exitConfirmSelected = 0; // 0 = Yes, 1 = No
let showPauseMenu = false;
let pauseMenuSelected = 0; // 0 = Return to Game, 1 = Exit

const menuVideo = document.getElementById('menuVideo');

const menuState = {
  isActive: true,
  currentMenu: 'root',
  selectedOption: 0,
  options: {
    root: [],
    load: [
      { text: 'Load from Browser', enabled: true },
      { text: 'Load from File', enabled: true },
      { text: 'Back', enabled: true }
    ]
  }
};

// --- Build root menu options based on save state ---
function hasSaveData() {
  for (let i = 1; i <= SAVE_SLOTS; i++) {
    if (localStorage.getItem(SAVE_KEY_PREFIX + i)) return true;
  }
  return false;
}

function rebuildMenuOptions() {
  const hasSave = hasSaveData();
  if (hasSave) {
    menuState.options.root = [
      { text: 'Load', enabled: true },
      { text: 'Extra', enabled: false },
      { text: 'Erase save data', enabled: true }
    ];
  } else {
    menuState.options.root = [
      { text: 'Start', enabled: true },
      { text: 'Load', enabled: true },
      { text: 'Extra', enabled: false }
    ];
  }
  if (menuState.selectedOption >= menuState.options.root.length) {
    menuState.selectedOption = 0;
  }
}

rebuildMenuOptions();

// --- Helper: start game with fade ---
function startGameWithFade() {
  if (window.AudioManager) window.AudioManager.playStartGameSound();
  if (window.FadeOverlay) {
    window.FadeOverlay.fadeOut(1000, function() {
      menuState.isActive = false;
      gameStarted = true;
      window.FadeOverlay.fadeIn(800);
    });
  } else {
    menuState.isActive = false;
    gameStarted = true;
  }
}

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
    equippedWeapon: window.Inventory ? window.Inventory.equippedWeapon : null,
    checkpoint: window.currentCheckpoint || null,
    health: window.Health ? window.Health.currentHP : 10
  };
  localStorage.setItem(SAVE_KEY_PREFIX + slot, JSON.stringify(gameData));
  currentSaveSlot = slot;
  rebuildMenuOptions();
}

function loadGame(slot) {
  const saveData = localStorage.getItem(SAVE_KEY_PREFIX + slot);
  if (saveData) {
    const d = JSON.parse(saveData);
    window.player.x = d.playerX;
    window.player.y = d.playerY;
    if (d.currentRoom && window.MapManager) window.MapManager.currentRoom = d.currentRoom;
    if (d.inventory && window.Inventory) {
      // New format: array of {id, quantity}
      if (d.inventory.length > 0 && typeof d.inventory[0] === 'object') {
        window.Inventory.setItems(d.inventory);
      }
      // Old format not supported — invalidated
    }
    if (d.health !== undefined && window.Health) {
      window.Health.currentHP = d.health;
    }
    if (d.equippedWeapon !== undefined && window.Inventory) {
      window.Inventory.equippedWeapon = d.equippedWeapon;
    }
    window.currentCheckpoint = d.checkpoint;
    syncCollectedFlags();
    return true;
  }
  return false;
}

function syncCollectedFlags() {
  if (!window.Entities || !window.Inventory) return;
  const itemMap = {
    'key_item': 'key',
    'candy_item': 'candy',
    'candy_item_garden': 'candy',
    'knife_item': 'knife'
  };
  for (const ent of window.Entities) {
    if (ent.type === 'item' && itemMap[ent.id] !== undefined) {
      ent.collected = window.Inventory.has(itemMap[ent.id]);
    }
  }
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
        if (data.inventory.length > 0 && typeof data.inventory[0] === 'object') {
          window.Inventory.setItems(data.inventory);
        }
      }
      if (data.health !== undefined && window.Health) {
        window.Health.currentHP = data.health;
      }
      if (data.equippedWeapon !== undefined && window.Inventory) {
        window.Inventory.equippedWeapon = data.equippedWeapon;
      }
      window.currentCheckpoint = data.checkpoint || null;
      syncCollectedFlags();
      startGameWithFade();
      menuState.currentMenu = 'root';
      rebuildMenuOptions();
    } catch (err) {
      alert('Invalid save file.');
    }
  };
  input.click();
}

// --- Reset game state when returning to menu ---
function resetGameState() {
  if (window.player) {
    window.player.x = 3 * 50; // tile (3,2)
    window.player.y = 2 * 50;
  }
  if (window.MapManager) {
    window.MapManager.currentRoom = 'room1';
  }
  if (window.Inventory && window.Inventory.clear) {
    window.Inventory.clear();
  }
  if (window.Entities) {
    for (const ent of window.Entities) {
      if (ent.type === 'item' && 'collected' in ent) {
        ent.collected = false;
      }
      // Reset attackable entities
      if (ent.attackable) {
        ent.hp = ent.maxHp || 10;
        ent.dead = false;
        ent.showHealthBar = false;
      }
    }
  }
  const gardenDoor = window.Entities && window.Entities.find(e => e.id === 'door_to_garden');
  if (gardenDoor) gardenDoor.locked = true;
  if (window.Health) {
    window.Health.currentHP = window.Health.maxHP;
    if (window.Health.resetImmunity) window.Health.resetImmunity();
  }
  window.currentCheckpoint = null;
}

// --- Controls Popup Drawing ---
function drawControlsPopup(ctx) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const boxW = Math.min(500, cw - 60);
  const boxH = 370;
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
    ['Shift',         'Attack (weapon)'],
    ['Enter',         'Interact'],
    ['I',             'Inventory'],
    ['Tab',           'Switch Inv. Tab'],
    ['H',             'Toggle Map'],
    ['Esc',           'Pause'],
    ['F11',           'Fullscreen']
  ];

  ctx.font = '16px monospace';
  const startY = by + 55;
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

// --- Pause Menu Drawing ---
function drawPauseMenu(ctx) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const boxW = Math.min(400, cw - 60);
  const boxH = 180;
  const bx = (cw - boxW) / 2;
  const by = (ch - boxH) / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(bx, by, boxW, boxH);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.strokeRect(bx, by, boxW, boxH);

  // PAUSE title
  ctx.font = '36px monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('PAUSE', cw / 2, by + 20);

  // Options
  const opts = ['Return to Game', 'Exit'];
  ctx.font = '20px monospace';
  const optY = by + 100;
  for (let i = 0; i < opts.length; i++) {
    ctx.fillStyle = i === pauseMenuSelected ? '#0ff' : '#888';
    ctx.fillText(opts[i], cw / 2, optY + i * 35);
  }
  ctx.restore();
}

// --- Exit Confirmation Popup Drawing ---
function drawExitConfirm(ctx) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const boxW = Math.min(520, cw - 60);
  const boxH = 180;
  const bx = (cw - boxW) / 2;
  const by = (ch - boxH) / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.9)';
  ctx.fillRect(bx, by, boxW, boxH);
  ctx.strokeStyle = '#f44';
  ctx.lineWidth = 3;
  ctx.strokeRect(bx, by, boxW, boxH);

  ctx.font = '16px monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Are you sure you want to go back', cw / 2, by + 20);
  ctx.fillText('to main menu?', cw / 2, by + 42);

  ctx.font = '13px monospace';
  ctx.fillStyle = '#f88';
  ctx.fillText('Unsaved data will be lost!', cw / 2, by + 70);

  const optY = by + 110;
  const opts = ['Yes', 'No'];
  ctx.font = '22px monospace';
  for (let i = 0; i < opts.length; i++) {
    const ox = cw / 2 + (i === 0 ? -70 : 70);
    ctx.fillStyle = i === exitConfirmSelected ? '#0ff' : '#888';
    ctx.fillText(opts[i], ox, optY);
  }
  ctx.restore();
}

// --- Menu Drawing ---
function drawMenu(ctx) {
  if (!menuState.isActive) return;

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

  if (hasSaveData() && window.downloadIcon && window.downloadIcon.complete) {
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
  // Exit confirmation popup (after choosing Exit from pause menu)
  if (showExitConfirm) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      exitConfirmSelected = 0;
      if (window.AudioManager) window.AudioManager.playMenuNavSound();
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      exitConfirmSelected = 1;
      if (window.AudioManager) window.AudioManager.playMenuNavSound();
    } else if (e.key === 'Enter') {
      if (window.AudioManager) window.AudioManager.playMenuSelectSound();
      if (exitConfirmSelected === 0) {
        showExitConfirm = false;
        showPauseMenu = false;
        resetGameState();
        menuState.isActive = true;
        menuState.currentMenu = 'root';
        menuState.selectedOption = 0;
        rebuildMenuOptions();
        gameStarted = false;
        firstStart = true;
      } else {
        showExitConfirm = false;
        // Go back to pause menu
      }
    } else if (e.key === 'Escape') {
      showExitConfirm = false;
    }
    return;
  }

  // Pause menu handler
  if (showPauseMenu) {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      pauseMenuSelected = 0;
      if (window.AudioManager) window.AudioManager.playMenuNavSound();
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      pauseMenuSelected = 1;
      if (window.AudioManager) window.AudioManager.playMenuNavSound();
    } else if (e.key === 'Enter') {
      if (window.AudioManager) window.AudioManager.playMenuSelectSound();
      if (pauseMenuSelected === 0) {
        // Return to Game
        showPauseMenu = false;
      } else {
        // Exit — show confirmation
        showExitConfirm = true;
        exitConfirmSelected = 1; // Default to "No"
      }
    } else if (e.key === 'Escape') {
      showPauseMenu = false;
    }
    return;
  }

  // Esc key behavior (in-game only, not on main menu)
  if (e.key === 'Escape' && gameStarted && !menuState.isActive) {
    // If textbox is active, do nothing
    if (window.InteractionManager && window.InteractionManager.activeInteraction) {
      return;
    }
    // If inventory is open, close it
    if (window.Inventory && window.Inventory.isOpen) {
      window.Inventory.close();
      return;
    }
    // If debug menu is open, close it (handled in debug.js via '0' key, but Esc should also work)
    if (window.DebugMenu && window.DebugMenu.isOpen) {
      if (window.DebugMenu.close) window.DebugMenu.close();
      return;
    }
    // Otherwise, open pause menu
    showPauseMenu = true;
    pauseMenuSelected = 0;
    return;
  }

  if (!menuState.isActive) return;

  // Controls popup handler
  if (showingControls) {
    if (e.key === 'Enter') {
      showingControls = false;
      startGameWithFade();
    }
    return;
  }

  const currentOptions = menuState.options[menuState.currentMenu];
  if (!currentOptions) return;

  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    menuState.selectedOption = (menuState.selectedOption - 1 + currentOptions.length) % currentOptions.length;
    if (window.AudioManager) window.AudioManager.playMenuNavSound();
  } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    menuState.selectedOption = (menuState.selectedOption + 1) % currentOptions.length;
    if (window.AudioManager) window.AudioManager.playMenuNavSound();
  } else if (e.key === 'Enter') {
    const option = currentOptions[menuState.selectedOption];
    if (!option || !option.enabled) return;
    if (window.AudioManager) window.AudioManager.playMenuSelectSound();

    if (menuState.currentMenu === 'root') {
      switch (option.text) {
        case 'Start':
          if (firstStart) {
            showingControls = true;
            firstStart = false;
          } else {
            startGameWithFade();
          }
          break;
        case 'Load':
          menuState.currentMenu = 'load';
          menuState.selectedOption = 0;
          break;
        case 'Erase save data':
          eraseAllData();
          break;
      }
    } else if (menuState.currentMenu === 'load') {
      switch (option.text) {
        case 'Load from Browser': {
          if (loadGame('1')) {
            startGameWithFade();
            menuState.currentMenu = 'root';
          } else {
            alert('No save data found.');
          }
          break;
        }
        case 'Load from File':
          importSaveFromFile();
          break;
        case 'Back':
          menuState.currentMenu = 'root';
          menuState.selectedOption = 0;
          rebuildMenuOptions();
          break;
      }
    }
  }
}

function handleMenuClick(clickX, clickY) {
  if (!menuState.isActive) return false;
  if (!hasSaveData()) return false;
  const btn = window.downloadBtn;
  if (clickX >= btn.x && clickX <= btn.x + btn.width &&
      clickY >= btn.y && clickY <= btn.y + btn.height) {
    const slot1 = localStorage.getItem(SAVE_KEY_PREFIX + '1');
    if (slot1) {
      exportSaveToFile(JSON.parse(slot1), 'fnaf_save_synced.json');
    }
    return true;
  }
  return false;
}

function eraseAllData() {
  for (let i = 1; i <= SAVE_SLOTS; i++) {
    localStorage.removeItem(SAVE_KEY_PREFIX + i);
  }
  rebuildMenuOptions();
}

window.gameMenu = {
  state: menuState,
  draw: drawMenu,
  drawExitConfirm: drawExitConfirm,
  drawPauseMenu: drawPauseMenu,
  handleInput: handleMenuInput,
  handleClick: handleMenuClick,
  saveGame: saveGame,
  loadGame: loadGame,
  exportSaveToFile: exportSaveToFile,
  importSaveFromFile: importSaveFromFile,
  isGameStarted: () => gameStarted,
  get showExitConfirm() { return showExitConfirm; },
  set showExitConfirm(v) { showExitConfirm = v; },
  get showPauseMenu() { return showPauseMenu; },
  set showPauseMenu(v) { showPauseMenu = v; },
  resetGameState: resetGameState,
  rebuildMenuOptions: rebuildMenuOptions,
  setGameStarted(v) { gameStarted = v; },
  setFirstStart(v) { firstStart = v; }
};

// Refresh confirmation
window.addEventListener('beforeunload', (e) => {
  if (window.gameMenu.isGameStarted() && !menuState.isActive) {
    e.preventDefault();
    e.returnValue = 'Are you sure you want to refresh the page? Unsaved data will be lost!';
    return e.returnValue;
  }
});
