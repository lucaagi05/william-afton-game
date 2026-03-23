// audio.js - Audio system: track registry, volume/pitch/loop-points, context switching

// ---------------------------------------------------------------------------
// Time parser
// Accepts: 0 (beginning), -1 (full song), or "Min:Sec:Ms" e.g. "1:10:80"
// ---------------------------------------------------------------------------
function parseAudioTime(value) {
  if (value === -1)  return -1;   // sentinel: no end cap, use native loop
  if (value === 0 || value === '0') return 0;
  if (typeof value === 'string' && value.includes(':')) {
    const [min, sec, ms = 0] = value.split(':').map(Number);
    return min * 60 + sec + ms / 1000;
  }
  return parseFloat(value);
}

// ---------------------------------------------------------------------------
// Track Definitions
// Add or edit tracks here. Fields:
//   src    — path to audio file
//   volume — 0.0 to 1.0
//   pitch  — playbackRate (1.0 = normal; affects speed AND pitch)
//   start  — 0 = from beginning, or "Min:Sec:Ms"
//   end    — -1 = play full song, or "Min:Sec:Ms" to cut early
//   loop   — true to loop
// ---------------------------------------------------------------------------
const TRACKS = {
  menu: {
    src:    'audio/menu_theme.mp3',   // ← add your menu theme file here
    volume: 0.75,
    pitch:  1.0,
    start:  0,
    end:   -1,
    loop:   true
  },
  ingame: {
    src:    'audio/partytime.mp3',
    volume: 1.0,
    pitch:  1.0,
    start:  0,
    end:   -1,
    loop:   true
  },
  garden: {
    src:    'audio/partytime.mp3',
    volume: 0.8,
    pitch:  1.0,
    start:  0,
    end:   -1,
    loop:   true
  }
  // Add more tracks as needed, then reference them via musicTrack in map.js
};

// ---------------------------------------------------------------------------
// SFX Registry
// Fields: src, volume, pitch (playbackRate)
// ---------------------------------------------------------------------------
const SFX = {
  textbox: {
    src:    'audio/skiptext.wav',
    volume: 0.8,
    pitch:  1.0
  }
  // Add more SFX here as needed
};

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------
let _currentId    = null;   // ID of the currently playing track
let _currentAudio = null;   // Active HTMLAudioElement
let _loopHandler  = null;   // timeupdate handler for custom loop points
let _gestureOk    = false;  // whether user has interacted (autoplay policy)

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
    const endSec   = parseAudioTime(cfg.end);

    const audio = new Audio(cfg.src);
    audio.volume      = cfg.volume;
    audio.playbackRate = cfg.pitch;
    audio.currentTime  = startSec;

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
            audio.play().catch(() => {});
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
    _currentId    = id;
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

  playTextboxSound() {
    const cfg = SFX.textbox;
    const sfx = new Audio(cfg.src);
    sfx.volume      = cfg.volume;
    sfx.playbackRate = cfg.pitch;
    sfx.play().catch(e => console.warn('SFX:', e));
  },

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
