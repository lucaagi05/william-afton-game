// Save system configuration
const SAVE_SLOTS = 3;
const SAVE_KEY_PREFIX = 'fnaf_save_';

// Game state management
let gameStarted = false;
let currentSaveSlot = null;

// Menu state
const menuState = {
    isActive: true,
    selectedOption: 0,
    options: [
        { text: 'Start', enabled: true },
        { text: 'Load', enabled: false },
        { text: 'Extra', enabled: false },
        { text: 'Load From File', enabled: true }
    ]
};

// Save/Load functions
function saveGame(slot) {
    const gameData = {
        playerX: window.player.x,
        playerY: window.player.y,
        checkpoint: window.currentCheckpoint
        // Add more game state data as needed
    };
    localStorage.setItem(SAVE_KEY_PREFIX + slot, JSON.stringify(gameData));
    currentSaveSlot = slot;

    // Enable Load/Extra after first save
    menuState.options[1].enabled = true;
    menuState.options[2].enabled = true;

    // Add Erase Data and Save To File options once available
    if (!menuState.options.find(o => o.text === 'Erase Data')) {
        menuState.options.push({ text: 'Erase Data', enabled: true });
    }
    if (!menuState.options.find(o => o.text === 'Save To File')) {
        menuState.options.push({ text: 'Save To File', enabled: true });
    }

    // Also export a file so save persists outside localStorage
    exportSaveToFile(gameData, `fnaf_save_slot${slot}.json`);
}

function loadGame(slot) {
    const saveData = localStorage.getItem(SAVE_KEY_PREFIX + slot);
    if (saveData) {
        const gameData = JSON.parse(saveData);
        window.player.x = gameData.playerX;
        window.player.y = gameData.playerY;
        window.currentCheckpoint = gameData.checkpoint;
        // Restore more game state as needed
        return true;
    }
    return false;
}

// Export a save file (download JSON)
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

// Import a save file (file picker -> apply state)
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

            // Treat loaded file as a valid save → enable menu items
            menuState.isActive = false;
            gameStarted = true; // Assume loading a file starts the game
            menuState.currentMenu = 'root'; // Go back to root menu after loading

            const extraOption = menuState.options.root.find(o => o.text === 'Extra');
            if (extraOption) extraOption.enabled = true;

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

// Menu rendering
function drawMenu(ctx) {
    if (!menuState.isActive) return;

    // Darken background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw title
    ctx.fillStyle = '#fff';
    ctx.font = '48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(menuState.currentMenu === 'root' ? 'FNAF Minigame' : 'Load Game', ctx.canvas.width / 2, 150);

    // Draw options
    ctx.font = '24px monospace';
    const currentOptions = menuState.options[menuState.currentMenu];
    currentOptions.forEach((option, index) => {
        ctx.fillStyle = !option.enabled ? '#666' :
            (index === menuState.selectedOption ? '#0ff' : '#fff');
        ctx.fillText(
            option.text,
            ctx.canvas.width / 2,
            250 + (index * 50)
        );
    });
}

// Menu controls
function handleMenuInput(e) {
    if (!menuState.isActive) return;
    const currentOptions = menuState.options[menuState.currentMenu];

    switch (e.key) {
        case 'ArrowUp':
            menuState.selectedOption = (menuState.selectedOption - 1 + currentOptions.length) % currentOptions.length;
            break;
        case 'ArrowDown':
            menuState.selectedOption = (menuState.selectedOption + 1) % currentOptions.length;
            break;
        case 'Enter': {
            const option = currentOptions[menuState.selectedOption];
            if (!option.enabled) return;

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
                    case 'Extra':
                        // To be implemented
                        break;
                    case 'Erase Data':
                        eraseAllData();
                        break;
                    case 'Save To File': {
                        // Use latest local slot if any; else export current runtime state
                        const fallbackData = {
                            playerX: window.player.x,
                            playerY: window.player.y,
                            checkpoint: window.currentCheckpoint || null
                        };
                        exportSaveToFile(fallbackData, 'fnaf_save.json');
                        break;
                    }
                }
            } else if (menuState.currentMenu === 'load') {
                switch (option.text) {
                    case 'Load from Browser':
                        showLoadDialog();
                        break;
                    case 'Load from File':
                        importSaveFromFile();
                        break;
                    case 'Back':
                        menuState.currentMenu = 'root';
                        menuState.selectedOption = menuState.options.root.findIndex(o => o.text === 'Load'); // Return to 'Load'
                        break;
                }
            }
            break;
        }
    }
}

function showLoadDialog() {
    // Simple load dialog
    const slot = prompt('Enter save slot (1-3):', '1');
    if (slot && slot >= 1 && slot <= 3) {
        if (loadGame(slot)) {
            menuState.isActive = false;
            gameStarted = true;
            menuState.currentMenu = 'root'; // Go back to root menu after loading
        } else {
            alert('No save data found in this slot!');
        }
    }
}

// Export functions and state
function eraseAllData() {
    for (let i = 1; i <= SAVE_SLOTS; i++) {
        localStorage.removeItem(SAVE_KEY_PREFIX + i);
    }
    currentSaveSlot = null;
    const extraOption = menuState.options.root.find(o => o.text === 'Extra');
    if (extraOption) extraOption.enabled = false;
    menuState.options.root = menuState.options.root.filter(o => o.text !== 'Erase Data' && o.text !== 'Save To File');
}

// Export functions and state
window.gameMenu = {
    state: menuState,
    draw: drawMenu,
    handleInput: handleMenuInput,
    saveGame: saveGame,
    loadGame: loadGame,
    isGameStarted: () => gameStarted,
    eraseAllData: eraseAllData,
    exportSaveToFile: exportSaveToFile,
    importSaveFromFile: importSaveFromFile
};