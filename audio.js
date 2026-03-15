// audio.js - Audio loading, playback control, and music auto-start

// --- Load Audio Files ---
const bgm = new Audio('audio/partytime.mp3');
const textboxSound = new Audio('audio/skiptext.wav');

bgm.loop = true;
bgm.volume = 1;
textboxSound.volume = 0.8;

// --- AudioManager: playback control ---
window.AudioManager = {
  playMusic() {
    if (bgm.paused) {
      bgm.play().catch(err => console.warn('Music play error:', err));
    }
  },
  stopMusic() {
    bgm.pause();
    bgm.currentTime = 0;
  },
  playTextboxSound() {
    textboxSound.currentTime = 0;
    textboxSound.play().catch(err => console.warn('SFX play error:', err));
  }
};

// --- Auto-start music on first keypress (browsers require a user gesture) ---
let musicStarted = false;
document.addEventListener('keydown', () => {
  if (!musicStarted) {
    window.AudioManager.playMusic();
    musicStarted = true;
  }
});
