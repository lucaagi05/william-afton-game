// audio.js - Audio system: track registry, volume/pitch/loop-points, context switching
// Reads from CSV_MUSIC and CSV_SOUNDS (loaded by csv_loader.js)

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

  // Switch to a named track (from CSV_MUSIC). No-op if already playing.
  playTrack(id) {
    if (_currentId === id) {
      if (_currentAudio && _currentAudio.paused && _gestureOk) {
        _currentAudio.play().catch(e => console.warn('Music:', e));
      }
      return;
    }
    this._stop();

    const tracks = window.CSV_MUSIC || {};
    const cfg = tracks[id];
    if (!cfg) { console.warn('AudioManager: unknown track', id); return; }

    const audio = new Audio(cfg.src);
    audio.volume = cfg.volume;
    audio.playbackRate = 1.0;
    audio.currentTime = cfg.start || 0;

    const endSec = cfg.end;
    if (endSec === -1 || endSec === undefined) {
      // Native loop — no custom end point
      audio.loop = cfg.loop || false;
    } else {
      // Custom end point: use timeupdate to loop/stop at endSec
      audio.loop = false;
      const startSec = cfg.start || 0;
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
    const sounds = window.CSV_SOUNDS || {};
    const group = sounds[key];
    if (!group || !group.entries || group.entries.length === 0) return;

    let entry;
    if (group.entries.length === 1) {
      entry = group.entries[0];
    } else {
      // Multi-entry group: use alternation mode
      if (group.alternation === 'Random') {
        entry = group.entries[Math.floor(Math.random() * group.entries.length)];
      } else {
        // Sequence (default for multi-entry)
        entry = group.entries[group._index || 0];
        group._index = ((group._index || 0) + 1) % group.entries.length;
      }
    }

    const sfx = new Audio(entry.src);
    sfx.volume = entry.volume;

    // Pitch handling
    if (entry.randomPitch) {
      const pitch = entry.minPitch + Math.random() * (entry.maxPitch - entry.minPitch);
      sfx.playbackRate = pitch / 100;
    } else {
      sfx.playbackRate = entry.minPitch / 100;
    }

    if (entry.loop) sfx.loop = true;

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
  get tracks() { return window.CSV_MUSIC || {}; },

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
