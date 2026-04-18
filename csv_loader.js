// csv_loader.js - Loads and parses CSV configuration files for sounds, music, and locations
// Must load before audio.js and map.js

window.CSVLoader = (function () {

  // --- Generic CSV parser ---
  function parseCSV(text) {
    const lines = text.trim().split('\n').map(l => l.trim().replace(/\r$/, ''));
    if (lines.length < 2) return [];
    const headers = lines[0].split(',');
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i]) continue;
      const values = lines[i].split(',');
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j].trim()] = (values[j] || '').trim();
      }
      rows.push(row);
    }
    return rows;
  }

  // --- Sounds.csv → SFX registry ---
  // Grouped by Name; continuation rows (empty Name) inherit from previous
  function parseSounds(rows) {
    const sfx = {};
    let currentName = null;

    for (const row of rows) {
      const name = row.Name || '';
      if (name) currentName = name;
      if (!currentName) continue;
      if (!row.File) continue;

      const entry = {
        src: row.File,
        volume: (parseFloat(row.Volume) || 100) / 100,
        randomPitch: row.RandomPitch === 'True',
        minPitch: parseFloat(row.MinPitch) || 100,
        maxPitch: parseFloat(row.MaxPitch) || 100,
        loop: row.Loop === 'True'
      };

      if (!sfx[currentName]) {
        sfx[currentName] = { entries: [], alternation: '', _index: 0 };
      }
      sfx[currentName].entries.push(entry);
      if (row.Alternation) sfx[currentName].alternation = row.Alternation;
    }

    return sfx;
  }

  // --- Music.csv → track registry ---
  function parseMusic(rows) {
    const tracks = {};
    for (const row of rows) {
      if (!row.Name || !row.File) continue;
      tracks[row.Name] = {
        src: row.File,
        volume: (parseFloat(row.Volume) || 100) / 100,
        loop: row.Loop === 'True',
        start: parseFloat(row.Start) || 0,
        end: parseFloat(row.End)
      };
      // Handle -1 sentinel (play full song)
      if (isNaN(tracks[row.Name].end)) tracks[row.Name].end = -1;
    }
    return tracks;
  }

  // --- Parse a .txt map layout file ---
  // 0=wall, X=walkable, 1-9=doors, = extends previous door
  function parseMapFile(text) {
    const lines = text.trim().split('\n').map(l => l.trim().replace(/\r$/, ''));
    const numRows = lines.length;
    const numCols = lines[0] ? lines[0].length : 0;
    const doors = {};
    const walls = []; // Interior wall positions (not on border)

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const ch = lines[r][c];

        if (ch === '0') {
          walls.push({ row: r, col: c });
        } else if (ch >= '1' && ch <= '9') {
          // Door tile — determine edge and extent
          let edge = null;
          if (r === 0) edge = 'top';
          else if (r === numRows - 1) edge = 'bottom';
          else if (c === 0) edge = 'left';
          else if (c === numCols - 1) edge = 'right';

          if (!edge) continue; // Doors must be on the border

          let tileCount = 1;
          if (edge === 'top' || edge === 'bottom') {
            // Count '=' extending to the right
            let nc = c + 1;
            while (nc < numCols && lines[r][nc] === '=') {
              tileCount++;
              nc++;
            }
          } else {
            // Count '=' extending downward
            let nr = r + 1;
            while (nr < numRows && lines[nr][c] === '=') {
              tileCount++;
              nr++;
            }
          }

          doors[ch] = {
            edge: edge,
            row: r,
            col: c,
            tileCount: tileCount
          };
        }
      }
    }

    return { rows: numRows, cols: numCols, doors, walls, grid: lines };
  }

  // --- Locations.csv → room + door registry ---
  // Grouped by ID; continuation rows (empty ID) inherit from previous
  function parseLocations(rows) {
    const locations = {};
    let currentId = null;
    let currentData = null;

    for (const row of rows) {
      if (row.ID) {
        currentId = row.ID;
        currentData = {
          id: row.ID,
          name: row.Name,
          mapFile: row.MapFile,
          musicTrack: row.MusicTrack,
          wallTheme: row.WallTheme,
          doors: []
        };
        locations[currentId] = currentData;
      }

      if (currentData && row.LinkingDoor) {
        currentData.doors.push({
          doorNum: row.LinkingDoor,
          targetRoom: row.DoorTo,
          isLocked: row.IsLocked === 'True',
          keyId: row.KeyID || ''
        });
      }
    }

    return locations;
  }

  // --- Load map .txt files for all locations ---
  async function loadMapFiles(locations) {
    const loadPromises = [];

    for (const id in locations) {
      const loc = locations[id];
      if (loc.mapFile) {
        loadPromises.push(
          fetch(loc.mapFile)
            .then(resp => {
              if (!resp.ok) throw new Error('HTTP ' + resp.status);
              return resp.text();
            })
            .then(text => {
              loc.mapData = parseMapFile(text);
            })
            .catch(e => {
              console.warn('Failed to load map file:', loc.mapFile, e);
              loc.mapData = null;
            })
        );
      }
    }

    await Promise.all(loadPromises);
  }

  // --- Master init: fetch all CSVs, parse, load map files ---
  async function init() {
    try {
      const [soundsResp, musicResp, locationsResp] = await Promise.all([
        fetch('data/Sounds.csv'),
        fetch('data/Music.csv'),
        fetch('data/Locations.csv')
      ]);

      const soundsText = await soundsResp.text();
      const musicText = await musicResp.text();
      const locationsText = await locationsResp.text();

      window.CSV_SOUNDS = parseSounds(parseCSV(soundsText));
      window.CSV_MUSIC = parseMusic(parseCSV(musicText));
      window.CSV_LOCATIONS = parseLocations(parseCSV(locationsText));

      // Load all map .txt files
      await loadMapFiles(window.CSV_LOCATIONS);

      console.log('CSV data loaded:', Object.keys(window.CSV_LOCATIONS).length, 'rooms,',
        Object.keys(window.CSV_SOUNDS).length, 'sounds,',
        Object.keys(window.CSV_MUSIC).length, 'tracks');
    } catch (e) {
      console.error('Failed to load CSV data:', e);
    }
  }

  return { init, parseCSV, parseMapFile };
})();
