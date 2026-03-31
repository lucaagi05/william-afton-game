// minimap.js - True Topological Auto-Stitching Minimap

let minimapVisible = true;
let cachedHouseLayout = null;
let cachedGardenLayout = null;

function getRoomSize(id) {
  const roomDef = window.MapManager ? window.MapManager.rooms[id] : null;
  if (roomDef) {
    return {
      w: (roomDef.pixelWidth || 600) / 600,
      h: (roomDef.pixelHeight || 600) / 600
    };
  }
  return { w: 1, h: 1 };
}

function buildTopologicalLayout(startRoomId) {
  if (!window.Entities || !window.MapManager) return {};

  const layout = {};
  const startRoom = window.MapManager.rooms[startRoomId];
  layout[startRoomId] = { gx: 0, gy: 0, label: startRoom ? (startRoom.name || startRoomId) : startRoomId };
  
  const queue = [startRoomId];
  let safety = 100;

  while (queue.length > 0 && safety-- > 0) {
    const curr = queue.shift();
    const currLayout = layout[curr];
    const currDef = window.MapManager.rooms[curr];
    if (!currDef) continue;

    const doors = window.Entities.filter(e => e.type === 'door' && e.room === curr);

    for (const d of doors) {
      const target = d.targetRoom;
      if (layout[target]) continue; // Already mapped

      // Segregate logic based on world bounds (House vs Garden)
      if (startRoomId === 'room1' && target === 'garden') continue;
      if (startRoomId === 'garden' && target !== 'garden') continue;

      const targetDef = window.MapManager.rooms[target];
      if (!targetDef) continue;
      
      const targetDoor = window.Entities.find(e => e.type === 'door' && e.room === target && e.targetRoom === curr);
      if (!targetDoor) continue; // Requires reciprocal door for spatial linking

      let ngx = currLayout.gx;
      let ngy = currLayout.gy;

      const cw = (currDef.pixelWidth || 600) / 600;
      const ch = (currDef.pixelHeight || 600) / 600;
      const tw = (targetDef.pixelWidth || 600) / 600;
      const th = (targetDef.pixelHeight || 600) / 600;

      const currDx = (d.x || 0) / 600;
      const currDy = (d.y || 0) / 600;
      const tarDx = (targetDoor.x || 0) / 600;
      const tarDy = (targetDoor.y || 0) / 600;

      // Calculate perfect puzzle-stitch offset coordinates based on door alignments
      if (d.edge === 'bottom') {
        ngy = currLayout.gy + ch;
        ngx = currLayout.gx + currDx - tarDx;
      } else if (d.edge === 'top') {
        ngy = currLayout.gy - th;
        ngx = currLayout.gx + currDx - tarDx;
      } else if (d.edge === 'right') {
        ngx = currLayout.gx + cw;
        ngy = currLayout.gy + currDy - tarDy;
      } else if (d.edge === 'left') {
        ngx = currLayout.gx - tw;
        ngy = currLayout.gy + currDy - tarDy;
      }

      layout[target] = { gx: ngx, gy: ngy, label: targetDef.name || target };
      queue.push(target);
    }
  }

  return layout;
}

function drawMinimapPanel(ctx, rooms, title, baseX, baseY, scale) {
  const currentRoom = window.MapManager ? window.MapManager.currentRoom : 'room1';

  // Draw rooms flush with no abstract connections
  for (const [id, r] of Object.entries(rooms)) {
    const rs = getRoomSize(id);
    const rx = baseX + r.gx * scale;
    const ry = baseY + r.gy * scale;
    const rw = rs.w * scale;
    const rh = rs.h * scale;

    ctx.fillStyle = id === currentRoom ? 'rgba(255,0,0,0.35)' : 'rgba(255,255,255,0.08)';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = id === currentRoom ? 'rgba(255,80,80,0.8)' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = id === currentRoom ? 2 : 1;
    ctx.strokeRect(rx, ry, rw, rh);

    ctx.font = '11px monospace';
    ctx.fillStyle = id === currentRoom ? '#faa' : 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Fit text labels loosely
    let text = r.label;
    if (text.length > 5 && rw < 40) text = text.substring(0, 3) + '.';
    ctx.fillText(text, rx + rw / 2, ry + rh / 2);
  }
}

function drawMinimap(ctx) {
  if (!minimapVisible) return;
  
  // Rebuild dynamically if uncreated
  if (!cachedHouseLayout) cachedHouseLayout = buildTopologicalLayout('room1');
  if (!cachedGardenLayout) cachedGardenLayout = buildTopologicalLayout('garden');

  const canvas = ctx.canvas;
  const padding = 15;

  const currentRoom = window.MapManager ? window.MapManager.currentRoom : 'room1';
  const inGarden = currentRoom === 'garden';

  ctx.save();

  const activeMap = inGarden ? cachedGardenLayout : cachedHouseLayout;
  const title = inGarden ? 'OUTSIDE [H]' : 'HOUSE [H]';

  // Calculate dynamic blueprint bounds
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const [id, r] of Object.entries(activeMap)) {
    const rs = getRoomSize(id);
    minX = Math.min(minX, r.gx);
    minY = Math.min(minY, r.gy);
    maxX = Math.max(maxX, r.gx + rs.w);
    maxY = Math.max(maxY, r.gy + rs.h);
  }

  // Fallback map bounds if completely detached
  if (minX === Infinity) { minX = 0; minY = 0; maxX = 2; maxY = 2; }

  // Check scale fit to ensure massive maps fit comfortably on screen
  let baseScale = 50;
  let mapW = (maxX - minX) * baseScale;
  let mapH = (maxY - minY) * baseScale;
  
  // Dynamic scale reduction if map grows more than half canvas width/height
  const maxAllowedW = canvas.width * 0.4;
  const maxAllowedH = canvas.height * 0.4;
  if (mapW > maxAllowedW || mapH > maxAllowedH) {
    const scaleRatio = Math.min(maxAllowedW / mapW, maxAllowedH / mapH);
    baseScale = baseScale * scaleRatio;
    mapW = (maxX - minX) * baseScale;
    mapH = (maxY - minY) * baseScale;
  }

  const baseX = canvas.width - mapW - padding - 10 - (minX * baseScale);
  const baseY = canvas.height - mapH - padding - 10 - (minY * baseScale);

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;

  const bgX = canvas.width - mapW - padding - 10;
  const bgY = canvas.height - mapH - padding - 10;
  
  ctx.fillRect(bgX - 8, bgY - 22, mapW + 16, mapH + 30);
  ctx.strokeRect(bgX - 8, bgY - 22, mapW + 16, mapH + 30);

  ctx.font = '11px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(title, bgX - 2, bgY - 18);

  drawMinimapPanel(ctx, activeMap, title, baseX, baseY, baseScale);

  ctx.restore();
}

document.addEventListener('keydown', function (e) {
  if (window.gameMenu && window.gameMenu.state.isActive) return;
  if (e.key.toLowerCase() === 'h') minimapVisible = !minimapVisible;
});

// We expose invalidateTopologicalCache to debug module
window.Minimap = {
  draw: drawMinimap,
  get visible() { return minimapVisible; },
  set visible(v) { minimapVisible = v; },
  invalidateCache() {
    cachedHouseLayout = null;
    cachedGardenLayout = null;
  }
};
