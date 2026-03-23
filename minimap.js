// minimap.js - Toggleable minimap showing connected rooms

let minimapVisible = true;

// House rooms (connected)
const MINIMAP_HOUSE_ROOMS = {
  room1: { gx: 0,   gy: 0,   gw: 1,   gh: 1,   label: 'R1' },
  room2: { gx: 0,   gy: 1,   gw: 1,   gh: 1,   label: 'R2' },
  room3: { gx: 1,   gy: 1,   gw: 1.5, gh: 0.5, label: 'Hall' },
  room4: { gx: 2.5, gy: 1,   gw: 0.6, gh: 0.6, label: 'R4' }
};

const MINIMAP_HOUSE_CONNECTIONS = [
  { from: 'room1', to: 'room2' },
  { from: 'room2', to: 'room3' },
  { from: 'room3', to: 'room4' }
];

// Garden — separate world
const MINIMAP_GARDEN = {
  garden: { gx: 0, gy: 0, gw: 1.4, gh: 1.4, label: 'Garden' }
};

function drawMinimapPanel(ctx, rooms, connections, title, baseX, baseY, scale) {
  // Draw connections
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  for (const conn of connections) {
    const f = rooms[conn.from];
    const t = rooms[conn.to];
    if (!f || !t) continue;
    ctx.beginPath();
    ctx.moveTo(baseX + (f.gx + f.gw / 2) * scale, baseY + (f.gy + f.gh / 2) * scale);
    ctx.lineTo(baseX + (t.gx + t.gw / 2) * scale, baseY + (t.gy + t.gh / 2) * scale);
    ctx.stroke();
  }

  const currentRoom = window.MapManager ? window.MapManager.currentRoom : 'room1';

  // Draw rooms
  for (const [id, r] of Object.entries(rooms)) {
    const rx = baseX + r.gx * scale;
    const ry = baseY + r.gy * scale;
    const rw = r.gw * scale;
    const rh = r.gh * scale;

    ctx.fillStyle = id === currentRoom ? 'rgba(255,0,0,0.35)' : 'rgba(255,255,255,0.08)';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = id === currentRoom ? 'rgba(255,80,80,0.8)' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = id === currentRoom ? 2 : 1;
    ctx.strokeRect(rx, ry, rw, rh);

    ctx.font = '11px monospace';
    ctx.fillStyle = id === currentRoom ? '#faa' : 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(r.label, rx + rw / 2, ry + rh / 2);
  }
}

function drawMinimap(ctx) {
  if (!minimapVisible) return;

  const canvas = ctx.canvas;
  const scale = 50;
  const padding = 15;

  const currentRoom = window.MapManager ? window.MapManager.currentRoom : 'room1';
  const inGarden = currentRoom === 'garden';

  ctx.save();

  if (!inGarden) {
    // Show house map
    const mapW = 3.6 * scale;
    const mapH = 2.2 * scale;
    const baseX = canvas.width - mapW - padding - 10;
    const baseY = canvas.height - mapH - padding - 10;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.fillRect(baseX - 8, baseY - 22, mapW + 16, mapH + 30);
    ctx.strokeRect(baseX - 8, baseY - 22, mapW + 16, mapH + 30);

    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('HOUSE [H]', baseX - 2, baseY - 18);

    drawMinimapPanel(ctx, MINIMAP_HOUSE_ROOMS, MINIMAP_HOUSE_CONNECTIONS, 'HOUSE', baseX, baseY, scale);
  } else {
    // Show garden map
    const mapW = 1.8 * scale;
    const mapH = 1.8 * scale;
    const baseX = canvas.width - mapW - padding - 10;
    const baseY = canvas.height - mapH - padding - 10;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.fillRect(baseX - 8, baseY - 22, mapW + 16, mapH + 30);
    ctx.strokeRect(baseX - 8, baseY - 22, mapW + 16, mapH + 30);

    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('OUTSIDE [H]', baseX - 2, baseY - 18);

    drawMinimapPanel(ctx, MINIMAP_GARDEN, [], 'OUTSIDE', baseX, baseY, scale);
  }

  ctx.restore();
}

document.addEventListener('keydown', function (e) {
  if (window.gameMenu && window.gameMenu.state.isActive) return;
  if (e.key.toLowerCase() === 'h') minimapVisible = !minimapVisible;
});

window.Minimap = {
  draw: drawMinimap,
  get visible() { return minimapVisible; },
  set visible(v) { minimapVisible = v; }
};
