// audio.js - Audio system: track registry, volume/pitch/loop-points, context switching

// ---------------------------------------------------------------------------
// Time parser
// Accepts: 0 (beginning), -1 (full song), or "Min:Sec:Ms" e.g. "1:10:80"
// ---------------------------------------------------------------------------
function parseAudioTime(value) {
  if (value === -1) return -1;   // sentinel: no end cap, use native loop
  if (value === 0 || value === '0') return 0;
  if (typeof value === 'string' && value.includes(':')) {
    const [min, sec, ms = 0] = value.split(':').map(Number);
    return min * 60 + sec + ms / 1000;
  }
  return parseFloat(value);
}

// ---------------------------------------------------------------------------
// Pitch conversion
// 100 = normal, <100 = lower pitch, >100 = higher pitch
// Internally maps to playbackRate: pitch / 100
// ---------------------------------------------------------------------------
function pitchToRate(pitch) {
  return (pitch !== undefined ? pitch : 100) / 100;
}

// ---------------------------------------------------------------------------
// Track Definitions
// Add or edit tracks here. Fields:
//   src    — path to audio file
//   volume — 0.0 to 1.0
//   pitch  — 100 = normal; <100 = lower pitch, >100 = higher pitch
//   start  — 0 = from beginning, or "Min:Sec:Ms"
//   end    — -1 = play full song, or "Min:Sec:Ms" to cut early
//   loop   — true to loop
// ---------------------------------------------------------------------------
const TRACKS = {
  menu: {
    src: 'audio/menu_theme.mp3',   // ← add your menu theme file here
    volume: 0.75,
    pitch: 100,
    start: 0,
    end: -1,
    loop: true
  },
  ingame: {
    src: 'audio/partytime.mp3',
    volume: 1.0,
    pitch: 100,
    start: 0,
    end: -1,
    loop: true
  },
  garden: {
    src: 'audio/partytime.mp3',
    volume: 0.8,
    pitch: 100,
    start: 0,
    end: -1,
    loop: true
  }
  // Add more tracks as needed, then reference them via musicTrack in map.js
};

// ---------------------------------------------------------------------------
// SFX Registry
// Fields: src, volume, pitch (100 = normal, <100 = lower, >100 = higher)
// ---------------------------------------------------------------------------
const SFX = {
  textbox: {
    src: 'audio/skiptext.wav',
    volume: 0.8,
    pitch: 100
  },
  door: {
    src: 'audio/door_enter.wav',
    volume: 1.0,
    pitch: 100
  },
  heal: {
    src: 'audio/recover_health.wav',
    volume: 1.0,
    pitch: 100
  },
  damage: {
    src: 'audio/take_dmg.wav',
    volume: 1.0,
    randomPitch: true,
    pitchRange: [80, 120]
  },
  menu_nav: { src: 'audio/menu_nav.wav', volume: 1.0, pitch: 100 },
  menu_select: { src: 'audio/menu_select.wav', volume: 1.0, pitch: 100 },
  menu_enter: { src: 'audio/menu_select.wav', volume: 1.0, pitch: 100 },
  locked_door: { src: 'audio/door_locked.wav', volume: 1.0, pitch: 100 },
  unlock_door: { src: 'audio/unlock_door.wav', volume: 1.0, pitch: 100 },
  save_game: { src: 'audio/save_game.wav', volume: 1.0, pitch: 100 },
  item_pickup: { src: 'audio/item_pickup.wav', volume: 1.0, pitch: 100 },
  walk: [
    { src: 'audio/player_step.wav', volume: 1.0, pitch: 800 },
    { src: 'audio/player_step.wav', volume: 1.0, pitch: 50 }
  ],
  start_game: { src: 'audio/start_load_fade.wav', volume: 1.0, pitch: 100 },
  player_death: { src: 'audio/player_death.wav', volume: 1.0, pitch: 100 },
  knife_use: { src: 'audio/knife_use.wav', volume: 1.0, pitch: 100 },
  hit_enemy: { src: 'audio/hit_enemy.wav', volume: 1.0, pitch: 100 },
  entity_death: { src: 'audio/entity_death.wav', volume: 1.0, pitch: 100 }
};

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------
let _currentId = null;   // ID of the currently playing track
let _currentAudio = null;   // Active HTMLAudioElement
let _loopHandler = null;   // timeupdate handler for custom loop points
let _gestureOk = false;  // whether user has interacted (autoplay policy)

// ---------------------------------------------------------------------------
// AudioManager
// ---------------------------------------------------------------------------
window.AudioManager = {

  // --- Public API ---

  // Switch to a named track (from TRACKS). No-op if already playing.
  playTrack(id) {
    if (_currentId === id) {
      if (_currentAudio && _currentAudio.paused && _gestureOk) {
        _currentAudio.play().catch(e => console.warn('Music:', e));
      }
      return;
    }
    this._stop();

    const cfg = TRACKS[id];
    if (!cfg) { console.warn('AudioManager: unknown track', id); return; }

    const startSec = parseAudioTime(cfg.start);
    const endSec = parseAudioTime(cfg.end);

    const audio = new Audio(cfg.src);
    audio.volume = cfg.volume;
    audio.playbackRate = pitchToRate(cfg.pitch);
    audio.currentTime = startSec;

    if (endSec === -1) {
      // Native loop — no custom end point
      audio.loop = cfg.loop;
    } else {
      // Custom end point: use timeupdate to loop/stop at endSec
      audio.loop = false;
      _loopHandler = () => {
        if (audio.currentTime >= endSec) {
          if (cfg.loop) {
            audio.currentTime = startSec;
            audio.play().catch(() => { });
          } else {
            audio.pause();
          }
        }
      };
      audio.addEventListener('timeupdate', _loopHandler);
    }

    if (_gestureOk) {
      audio.play().catch(e => console.warn('Music:', e));
    }

    _currentAudio = audio;
    _currentId = id;
  },

  // Set context: 'menu' or a room id (looks up room.musicTrack from map.js)
  setContext(context) {
    let trackId;
    if (context === 'menu') {
      trackId = 'menu';
    } else {
      const room = window.MapManager && window.MapManager.rooms[context];
      trackId = (room && room.musicTrack) ? room.musicTrack : 'ingame';
    }
    this.playTrack(trackId);
  },

  stopMusic() { this._stop(); },

  playSFX(key) {
    let cfgInit = SFX[key];
    if (!cfgInit) return;

    let cfg = cfgInit;
    // Sequential fallback for array-based configs (double audios)
    if (Array.isArray(cfgInit)) {
      if (typeof cfgInit._index === 'undefined') cfgInit._index = 0;
      cfg = cfgInit[cfgInit._index];
      cfgInit._index = (cfgInit._index + 1) % cfgInit.length;
    }

    const sfx = new Audio(cfg.src);
    sfx.volume = cfg.volume;

    // Process random pitch if enabled
    if (cfg.randomPitch && cfg.pitchRange && cfg.pitchRange.length === 2) {
      const min = cfg.pitchRange[0];
      const max = cfg.pitchRange[1];
      sfx.playbackRate = pitchToRate(min + Math.random() * (max - min));
    } else {
      sfx.playbackRate = pitchToRate(cfg.pitch);
    }

    sfx.play().catch(e => console.warn('SFX:', e));
  },

  playTextboxSound() { this.playSFX('textbox'); },
  playDoorSound() { this.playSFX('door'); },
  playHealSound() { this.playSFX('heal'); },
  playDamageSound() { this.playSFX('damage'); },
  playMenuNavSound() { this.playSFX('menu_nav'); },
  playMenuSelectSound() { this.playSFX('menu_select'); },
  playMenuEnterSound() { this.playSFX('menu_enter'); },
  playLockedDoorSound() { this.playSFX('locked_door'); },
  playUnlockDoorSound() { this.playSFX('unlock_door'); },
  playSaveGameSound() { this.playSFX('save_game'); },
  playItemPickupSound() { this.playSFX('item_pickup'); },
  playWalkSound() { this.playSFX('walk'); },
  playStartGameSound() { this.playSFX('start_game'); },
  playPlayerDeathSound() { this.playSFX('player_death'); },
  playKnifeUseSound() { this.playSFX('knife_use'); },
  playHitEnemySound() { this.playSFX('hit_enemy'); },
  playEntityDeathSound() { this.playSFX('entity_death'); },

  // Expose track registry so it can be tweaked at runtime
  tracks: TRACKS,

  // --- Internal ---
  _stop() {
    if (_currentAudio) {
      if (_loopHandler) {
        _currentAudio.removeEventListener('timeupdate', _loopHandler);
        _loopHandler = null;
      }
      _currentAudio.pause();
      _currentAudio = null;
    }
    _currentId = null;
  }
};

// ---------------------------------------------------------------------------
// Unlock autoplay on first user gesture
// ---------------------------------------------------------------------------
document.addEventListener('keydown', () => {
  if (!_gestureOk) {
    _gestureOk = true;
    // Resume whatever track was queued before the gesture
    if (_currentAudio && _currentAudio.paused) {
      _currentAudio.play().catch(e => console.warn('Music resume:', e));
    }
  }
}, { once: false });
