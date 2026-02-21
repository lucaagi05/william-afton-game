const SAVE_SLOTS = 3;
const SAVE_KEY_PREFIX = 'fnaf_save_';

let gameStarted = false;
let currentSaveSlot = null;

const menuState = {
    isActive: true,
    currentMenu: 'root', // 'root' or 'load'
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

function saveGame(slot) {
    const gameData = {
        playerX: window.player.x,
        playerY: window.player.y,
        checkpoint: window.currentCheckpoint || null
    };
    localStorage.setItem(SAVE_KEY_PREFIX + slot, JSON.stringify(gameData));
    currentSaveSlot = slot;

    // Enable Extra and other options
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
        const gameData = JSON.parse(saveData);
        window.player.x = gameData.playerX;
        window.player.y = gameData.playerY;
        window.currentCheckpoint = gameData.checkpoint;
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
            window.currentCheckpoint = data.checkpoint || null;

            menuState.isActive = false;
            gameStarted = true;
            menuState.currentMenu = 'root';

            const extra = menuState.options.root.find(o => o.text === 'Extra');
            if (extra) extra.enabled = true;
            if (!menuState.options.root.find(o => o.text === 'Erase Data')) {
                menuState.options.root.push({ text: 'Erase Data', enabled: true });
            }
            if (!menuState.options.root.find(o => o.text === 'Save To File')) {
                menuState.options.root.push({ text: 'Save To File', enabled: true });
            }
            alert('Save loaded from file.');
        } catch (err) {
            alert('Invalid save file.');
        }
    };
    input.click();
}

function drawMenu(ctx) {
    if (!menuState.isActive) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.fillStyle = '#fff';
    ctx.font = '48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(menuState.currentMenu === 'root' ? 'FNAF Minigame' : 'Load Game', ctx.canvas.width / 2, 150);

    const currentOptions = menuState.options[menuState.currentMenu];
    if (!currentOptions) {
        menuState.currentMenu = 'root'; // Safety reset
        return;
    }

    ctx.font = '24px monospace';
    currentOptions.forEach((option, index) => {
        ctx.fillStyle = !option.enabled ? '#444' : (index === menuState.selectedOption ? '#0ff' : '#fff');
        ctx.fillText(option.text, ctx.canvas.width / 2, 250 + (index * 60));
    });

    // Draw Download Icon in Menu (bottom right)
    if (window.downloadIcon && window.downloadIcon.complete) {
        ctx.globalAlpha = 0.8;
        ctx.drawImage(window.downloadIcon, window.downloadBtn.x, window.downloadBtn.y, window.downloadBtn.width, window.downloadBtn.height);
        ctx.globalAlpha = 1.0;
    }
}

function handleMenuInput(e) {
    if (!menuState.isActive) return;
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
                    menuState.isActive = false;
                    gameStarted = true;
                    break;
                case 'Load':
                    menuState.currentMenu = 'load';
                    menuState.selectedOption = 0;
                    break;
                case 'Erase Data':
                    eraseAllData();
                    break;
                case 'Save To File':
                    // Sync with Slot 1 (Default Browser Storage)
                    const slot1 = localStorage.getItem(SAVE_KEY_PREFIX + '1');
                    if (slot1) {
                        exportSaveToFile(JSON.parse(slot1), 'fnaf_save_synced.json');
                    } else {
                        // Fallback to current state if no browser save yet
                        exportSaveToFile({
                            playerX: window.player.x,
                            playerY: window.player.y,
                            checkpoint: window.currentCheckpoint || null
                        }, 'fnaf_save_current.json');
                    }
                    break;
            }
        } else if (menuState.currentMenu === 'load') {
            switch (option.text) {
                case 'Load from Browser':
                    const slot = prompt('Load slot (1-3):', '1');
                    if (slot && loadGame(slot)) {
                        menuState.isActive = false;
                        gameStarted = true;
                        menuState.currentMenu = 'root';
                    } else if (slot) {
                        alert('No save in slot ' + slot);
                    }
                    break;
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

// Function to check if menu download icon was clicked
function handleMenuClick(clickX, clickY) {
    if (!menuState.isActive) return false;
    const btn = window.downloadBtn;
    if (clickX >= btn.x && clickX <= btn.x + btn.width &&
        clickY >= btn.y && clickY <= btn.y + btn.height) {

        // Export Synced Data (Slot 1)
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
