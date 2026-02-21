// audio.js

// --- Load audio files ---
const bgm = new Audio('audio/partytime.mp3');      // Replace with your music path
const textboxSound = new Audio('audio/skiptext.wav'); // Replace with your sound effect path

bgm.loop = true;
bgm.volume = 1; // Adjust volume as needed

textboxSound.volume = 0.8;

// --- Control functions ---
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
