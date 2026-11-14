// World layout and environmental rendering for The Hollow Reach.
export const WORLD = { w: 2400, h: 1700, cx: 1200, cy: 900 };

export const FRAY = { x: 1200, y: 880, r0: 1330, rate: 2.35 };

export const ISLANDS = [
  { id: 'hearth', name: 'The Hearth', x: 1200, y: 900, r: 300, seed: 1.7, hue: 0 },
  { id: 'north', name: 'Shardhold', x: 1200, y: 255, r: 215, seed: 2.9, hue: 1 },
  { id: 'east', name: 'Emberfall', x: 1950, y: 820, r: 250, seed: 4.1, hue: 2 },
  { id: 'west', name: 'The Weeping Shelf', x: 465, y: 900, r: 255, seed: 5.3, hue: 3 },
  { id: 'boss', name: 'The Hollow Court', x: 1200, y: 1455, r: 260, seed: 6.8, hue: 4 },
];

// Floating loom anchors: each has a small walkable disc. Chain them across the void.
export const ANCHORS = [
  { id: 'n1', x: 1200, y: 600, r: 28, seed: 0.4 },
  { id: 'n2', x: 1200, y: 505, r: 26, seed: 1.2 },
  { id: 'e1', x: 1590, y: 840, r: 28, seed: 2.1 },
  { id: 'e2', x: 1685, y: 780, r: 26, seed: 3.8 },
  { id: 'e3', x: 1775, y: 850, r: 28, seed: 5.2 },
  { id: 'w1', x: 830, y: 860, r: 28, seed: 4.4 },
  { id: 'w2', x: 735, y: 905, r: 26, seed: 2.7 },
  { id: 'w3', x: 640, y: 845, r: 28, seed: 1.9 },
  { id: 'h1', x: 1005, y: 735, r: 24, seed: 3.3 },
  { id: 'h2', x: 1400, y: 965, r: 24, seed: 6.1 },
  { id: 'h3', x: 1140, y: 1080, r: 24, seed: 0.9 },
  { id: 'n3', x: 1090, y: 390, r: 24, seed: 5.7 },
  { id: 'e4', x: 1880, y: 1000, r: 24, seed: 1.4 },
  { id: 'w4', x: 545, y: 1010, r: 24, seed: 4.9 },
  { id: 'b1', x: 1020, y: 1395, r: 24, seed: 2.2 },
  { id: 'b2', x: 1380, y: 1395, r: 24, seed: 6.6 },
];

export const SHARD_SPOTS = [
  { id: 's1', x: 1200, y: 200, island: 'north', name: 'Shard of Dawn' },
  { id: 's2', x: 2040, y: 760, island: 'east', name: 'Shard of Ember' },
  { id: 's3', x: 400, y: 855, island: 'west', name: 'Shard of Tears' },
];

export const GATE = { x: 1200, y: 1168, w: 148 };
export const BRIDGE = { x: 1136, y: 1090, w: 128, h: 152 };
export const BOSS_SPAWN = { x: 1200, y: 1480 };

export const START = { x: 1200, y: 955 };

// Deterministic RNG for decoration.
function mulberry32(a) {
  return function rnd() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function organicRadius(island, angle, scale = 1) {
  const s = island.seed;
  return island.r * scale * (1 + 0.055 * Math.sin(angle * 3 + s) + 0.032 * Math.sin(angle * 7 + s * 2.3) + 0.018 * Math.sin(angle * 11 + s * 0.7));
}

function buildPath(island, scale, steps = 84) {
  const p = new Path2D();
  for (let i = 0; i <= steps; i += 1) {
    const a = (i / steps) * Math.PI * 2;
    const r = organicRadius(island, a, scale);
    const x = island.x + Math.cos(a) * r;
    const y = island.y + Math.sin(a) * r;
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  p.closePath();
  return p;
}

function pointInIsland(island, x, y, scale = 0.965) {
  const dx = x - island.x;
  const dy = y - island.y;
  const d = Math.hypot(dx, dy);
  if (d > island.r * 1.16) return false;
  const a = Math.atan2(dy, dx);
  return d <= organicRadius(island, a, scale);
}

export function groundAt(x, y) {
  for (let i = 0; i < ISLANDS.length; i += 1) {
    if (pointInIsland(ISLANDS[i], x, y)) return { solid: true, island: ISLANDS[i], index: i, kind: 'island' };
  }
  if (x > BRIDGE.x + 14 && x < BRIDGE.x + BRIDGE.w - 14 && y > BRIDGE.y && y < BRIDGE.y + BRIDGE.h) {
    return { solid: true, kind: 'bridge' };
  }
  for (const a of ANCHORS) {
    if (Math.hypot(x - a.x, y - a.y) < a.r + 8) return { solid: true, kind: 'anchor', anchor: a };
  }
  return { solid: false };
}

export function islandAt(x, y) {
  for (const island of ISLANDS) if (pointInIsland(island, x, y, 0.9)) return island;
  return null;
}

// ---- decoration ----
for (const island of ISLANDS) {
  const rnd = mulberry32(Math.floor(island.seed * 10000));
  const decor = { rocks: [], tufts: [], cracks: [], runes: [], pools: [] };
  const rockCount = Math.floor(island.r / 24);
  for (let i = 0; i < rockCount; i += 1) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * island.r * 0.82;
    decor.rocks.push({
      x: island.x + Math.cos(a) * d,
      y: island.y + Math.sin(a) * d,
      r: 4 + rnd() * 13,
      rot: rnd() * Math.PI * 2,
      shade: rnd(),
    });
  }
  for (let i = 0; i < 26; i += 1) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * island.r * 0.88;
    decor.tufts.push({
      x: island.x + Math.cos(a) * d,
      y: island.y + Math.sin(a) * d,
      h: 5 + rnd() * 11,
      lean: (rnd() - 0.5) * 9,
      a: 0.15 + rnd() * 0.3,
    });
  }
  for (let i = 0; i < 7; i += 1) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * island.r * 0.8;
    const pts = [];
    let x = island.x + Math.cos(a) * d;
    let y = island.y + Math.sin(a) * d;
    for (let j = 0; j < 4; j += 1) {
      pts.push({ x, y });
      x += (rnd() - 0.5) * 34;
      y += (rnd() - 0.5) * 34;
    }
    decor.cracks.push(pts);
  }
  for (let i = 0; i < 3; i += 1) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * island.r * 0.55;
    decor.runes.push({ x: island.x + Math.cos(a) * d, y: island.y + Math.sin(a) * d, r: 14 + rnd() * 18, rot: rnd() * 6.28 });
  }
  island.decor = decor;
  island.path = buildPath(island, 1);
  island.innerPath = buildPath(island, 0.925);
  island.rimPath = buildPath(island, 1.045);
}

// Stars / distant void detail.
const starRnd = mulberry32(99117);
export const STARS = Array.from({ length: 150 }, () => ({
  x: starRnd() * WORLD.w,
  y: starRnd() * WORLD.h,
  s: 0.4 + starRnd() * 1.5,
  p: starRnd() * Math.PI * 2,
  a: 0.1 + starRnd() * 0.45,
}));

const monolithRnd = mulberry32(7719);
export const MONOLITHS = Array.from({ length: 9 }, () => {
  const a = monolithRnd() * Math.PI * 2;
  const d = 950 + monolithRnd() * 450;
  return {
    x: 1200 + Math.cos(a) * d,
    y: 880 + Math.sin(a) * d * 0.75,
    w: 16 + monolithRnd() * 30,
    h: 60 + monolithRnd() * 120,
    rot: (monolithRnd() - 0.5) * 0.4,
  };
});

// ---- rendering ----
export function drawBackground(ctx, game) {
  const t = game.time;
  const g = ctx.createLinearGradient(0, 0, 0, WORLD.h);
  g.addColorStop(0, '#070b13');
  g.addColorStop(0.48, '#0a1018');
  g.addColorStop(1, '#05070c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  // Deep violet currents in the void.
  const c = FRAY;
  for (let i = 0; i < 5; i += 1) {
    const a = t * 0.014 + i * 1.26;
    const rx = 520 + i * 120;
    const x = c.x + Math.cos(a) * (420 + i * 55);
    const y = c.y + Math.sin(a * 0.8) * (330 + i * 40);
    const rg = ctx.createRadialGradient(x, y, 20, x, y, rx);
    rg.addColorStop(0, 'rgba(72,40,112,0.15)');
    rg.addColorStop(1, 'rgba(10,8,20,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  }

  // Stars.
  for (const s of STARS) {
    const tw = 0.55 + 0.45 * Math.sin(t * 0.8 + s.p);
    ctx.globalAlpha = s.a * tw;
    ctx.fillStyle = '#cfe8e5';
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }
  ctx.globalAlpha = 1;

  // Thread remnants drifting across the gulf.
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i += 1) {
    const yBase = 240 + i * 190;
    const off = Math.sin(t * 0.16 + i) * 30;
    ctx.beginPath();
    ctx.moveTo(0, yBase + off);
    ctx.bezierCurveTo(600, yBase - 120 + off, 1700, yBase + 140 + off, WORLD.w, yBase - 40 + off);
    ctx.strokeStyle = i % 2 ? 'rgba(96,160,175,0.05)' : 'rgba(160,110,190,0.05)';
    ctx.stroke();
  }

  // Distant monoliths.
  for (const m of MONOLITHS) {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.rot);
    ctx.fillStyle = 'rgba(9,12,20,0.85)';
    ctx.beginPath();
    ctx.moveTo(-m.w / 2, 0);
    ctx.lineTo(-m.w * 0.35, -m.h);
    ctx.lineTo(m.w * 0.32, -m.h * 0.88);
    ctx.lineTo(m.w / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(127,228,212,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
}

function drawIsland(ctx, island, t, game) {
  const { x, y, r } = island;
  const isBoss = island.id === 'boss';
  ctx.save();

  // Drop shadow into the void.
  ctx.save();
  ctx.translate(0, 16);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fill(island.rimPath);
  ctx.restore();

  // Cliff edge.
  const cliff = ctx.createLinearGradient(x, y - r, x, y + r);
  cliff.addColorStop(0, '#39443f');
  cliff.addColorStop(0.5, '#232b2b');
  cliff.addColorStop(1, '#0d1114');
  ctx.fillStyle = cliff;
  ctx.fill(island.path);

  // Top surface.
  const top = ctx.createLinearGradient(x, y - r, x, y + r);
  if (isBoss) {
    top.addColorStop(0, '#2f2833');
    top.addColorStop(0.55, '#211c26');
    top.addColorStop(1, '#141119');
  } else {
    top.addColorStop(0, '#293a34');
    top.addColorStop(0.5, '#1d2a27');
    top.addColorStop(1, '#131c1c');
  }
  ctx.fillStyle = top;
  ctx.fill(island.innerPath);

  // Pools / moss patches.
  for (const p of island.decor.pools) {
    ctx.fillStyle = 'rgba(20,50,52,0.4)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rock scatter.
  for (const rock of island.decor.rocks) {
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.rot);
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      const rr = rock.r * (0.7 + 0.3 * Math.sin(i * 2.3 + rock.shade * 9));
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr * 0.8;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = rock.shade > 0.55 ? 'rgba(52,64,60,0.9)' : 'rgba(31,40,39,0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,190,170,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // Cracks.
  ctx.strokeStyle = 'rgba(5,8,10,0.55)';
  ctx.lineWidth = 1.4;
  for (const pts of island.decor.cracks) {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }

  // Grass / glowing tufts.
  for (const tuft of island.decor.tufts) {
    ctx.strokeStyle = `rgba(104,190,158,${tuft.a})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(tuft.x, tuft.y);
    ctx.quadraticCurveTo(tuft.x + tuft.lean * 0.4, tuft.y - tuft.h * 0.6, tuft.x + tuft.lean, tuft.y - tuft.h);
    ctx.moveTo(tuft.x, tuft.y);
    ctx.quadraticCurveTo(tuft.x - 3, tuft.y - tuft.h * 0.5, tuft.x - 5 + tuft.lean * 0.3, tuft.y - tuft.h * 0.9);
    ctx.stroke();
  }

  // Faint runes.
  for (const rune of island.decor.runes) {
    ctx.save();
    ctx.translate(rune.x, rune.y);
    ctx.rotate(rune.rot);
    ctx.strokeStyle = isBoss ? 'rgba(196,120,180,0.12)' : 'rgba(127,228,212,0.1)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, rune.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + t * 0.05;
      const px = Math.cos(a) * rune.r * 0.7;
      const py = Math.sin(a) * rune.r * 0.7;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // Edge rim light.
  ctx.strokeStyle = isBoss ? 'rgba(186,110,160,0.35)' : 'rgba(133,214,195,0.24)';
  ctx.lineWidth = 2;
  ctx.stroke(island.innerPath);

  // Top-left warm rim.
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.95, Math.PI * 1.05, Math.PI * 1.55);
  ctx.strokeStyle = 'rgba(240,179,90,0.14)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawBridge(ctx, t, gateOpen) {
  const { x, y, w, h } = BRIDGE;
  ctx.save();
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x + 6, y + 10, w, h);
  // Stone.
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, '#1a2021');
  g.addColorStop(0.5, '#333c39');
  g.addColorStop(1, '#161c1d');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(140,190,170,0.18)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  // Slabs.
  for (let i = 0; i < 7; i += 1) {
    ctx.strokeStyle = 'rgba(7,10,12,0.5)';
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 12 + i * 19);
    ctx.lineTo(x + w - 8, y + 12 + i * 19);
    ctx.stroke();
  }
  // Runes on each rail.
  for (let i = 0; i < 5; i += 1) {
    const yy = y + 22 + i * 27;
    const pulse = 0.2 + 0.12 * Math.sin(t * 2 + i);
    ctx.fillStyle = gateOpen ? `rgba(127,228,212,${pulse + 0.2})` : `rgba(196,110,160,${pulse})`;
    ctx.fillRect(x + 12, yy, 3, 3);
    ctx.fillRect(x + w - 15, yy, 3, 3);
  }
  ctx.restore();
}

function drawGate(ctx, game, t) {
  const { x, y, w } = GATE;
  const open = game.shards >= 3;
  const left = x - w / 2;
  const right = x + w / 2;

  // Pillars.
  for (const px of [left, right]) {
    ctx.save();
    ctx.translate(px, y);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 22, 24, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createLinearGradient(0, -46, 0, 24);
    g.addColorStop(0, '#4a5148');
    g.addColorStop(0.55, '#2b322e');
    g.addColorStop(1, '#14181a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-17, 24);
    ctx.lineTo(-12, -42);
    ctx.lineTo(0, -50);
    ctx.lineTo(12, -42);
    ctx.lineTo(17, 24);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,200,180,0.16)';
    ctx.stroke();
    // Pillar rune.
    ctx.fillStyle = open ? 'rgba(127,228,212,0.8)' : 'rgba(206,120,168,0.6)';
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(5, -16);
    ctx.lineTo(0, -6);
    ctx.lineTo(-5, -16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Arch beam.
  ctx.save();
  ctx.strokeStyle = 'rgba(70,82,72,0.9)';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(left - 12, y - 44);
  ctx.quadraticCurveTo(x, y - 88, right + 12, y - 44);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(160,210,190,0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left - 12, y - 45);
  ctx.quadraticCurveTo(x, y - 89, right + 12, y - 45);
  ctx.stroke();
  ctx.restore();

  // Barrier.
  if (!open) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.6);
    const g = ctx.createLinearGradient(0, y - 70, 0, y + 16);
    g.addColorStop(0, 'rgba(140,60,150,0.02)');
    g.addColorStop(0.45, `rgba(184,86,170,${0.16 + pulse * 0.08})`);
    g.addColorStop(1, 'rgba(70,20,90,0.22)');
    ctx.fillStyle = g;
    ctx.fillRect(left + 8, y - 66, w - 16, 84);
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i += 1) {
      const px = left + 14 + i * ((w - 28) / 7);
      ctx.strokeStyle = `rgba(226,140,210,${0.1 + 0.12 * Math.sin(t * 2.5 + i)})`;
      ctx.beginPath();
      ctx.moveTo(px, y - 64);
      ctx.quadraticCurveTo(px + Math.sin(t + i) * 8, y - 20, px + Math.sin(t * 0.7 + i) * 4, y + 14);
      ctx.stroke();
    }
    // Seal medallion.
    ctx.save();
    ctx.translate(x, y - 28);
    ctx.rotate(t * 0.25);
    ctx.strokeStyle = 'rgba(240,179,90,0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const rr = i % 2 ? 15 : 22;
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  } else {
    // Open gate: a warm beckoning light.
    const g = ctx.createLinearGradient(0, y - 60, 0, y + 12);
    g.addColorStop(0, 'rgba(240,179,90,0)');
    g.addColorStop(0.6, 'rgba(240,179,90,0.12)');
    g.addColorStop(1, 'rgba(127,228,212,0.16)');
    ctx.fillStyle = g;
    ctx.fillRect(left + 8, y - 66, w - 16, 84);
    for (let i = 0; i < 5; i += 1) {
      const yy = y - 50 + i * 16;
      ctx.strokeStyle = `rgba(240,200,130,${0.07 + 0.05 * Math.sin(t * 3 + i)})`;
      ctx.beginPath();
      ctx.moveTo(left + 12, yy);
      ctx.lineTo(right - 12, yy);
      ctx.stroke();
    }
  }
}

function drawAnchor(ctx, anchor, t, target, arch) {
  const bob = Math.sin(t * 1.7 + anchor.seed * 4) * 4;
  const hover = 12 + bob;
  const active = target && target.kind === 'anchor' && target.ref.id === anchor.id;
  ctx.save();
  ctx.translate(anchor.x, anchor.y);

  // Disc / platform.
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 8, anchor.r + 6, anchor.r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  const dg = ctx.createLinearGradient(0, -anchor.r, 0, anchor.r);
  dg.addColorStop(0, '#39433d');
  dg.addColorStop(1, '#13181a');
  ctx.fillStyle = dg;
  ctx.beginPath();
  ctx.ellipse(0, 0, anchor.r, anchor.r * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(127,228,212,0.18)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Carved spokes.
  ctx.strokeStyle = 'rgba(10,14,15,0.7)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 + anchor.seed;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * anchor.r * 0.25, Math.sin(a) * anchor.r * 0.15);
    ctx.lineTo(Math.cos(a) * anchor.r * 0.85, Math.sin(a) * anchor.r * 0.52);
    ctx.stroke();
  }

  // Glow.
  const glow = active ? 0.35 : 0.16;
  const rg = ctx.createRadialGradient(0, -hover, 2, 0, -hover, 48);
  rg.addColorStop(0, `rgba(127,228,212,${glow})`);
  rg.addColorStop(1, 'rgba(127,228,212,0)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(0, -hover, 48, 0, Math.PI * 2);
  ctx.fill();

  // Rune ring.
  ctx.save();
  ctx.translate(0, -hover);
  ctx.rotate(t * 0.5 + anchor.seed);
  ctx.strokeStyle = active ? '#b9fff1' : '#7fe4d4';
  ctx.lineWidth = active ? 3 : 2;
  ctx.beginPath();
  ctx.arc(0, 0, 17 + Math.sin(t * 2 + anchor.seed) * 1.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = active ? 'rgba(185,255,241,0.7)' : 'rgba(127,228,212,0.4)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 22, Math.sin(a) * 22);
    ctx.lineTo(Math.cos(a) * 29, Math.sin(a) * 29);
    ctx.stroke();
  }
  ctx.restore();

  // Connecting thread to platform (visual tether stub).
  ctx.strokeStyle = `rgba(160,240,220,${active ? 0.5 : 0.16})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -hover + 18);
  ctx.lineTo(0, -4);
  ctx.stroke();

  if (active && arch) {
    ctx.strokeStyle = 'rgba(185,255,241,0.5)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, anchor.r + 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawShard(ctx, shard, t) {
  const bob = Math.sin(t * 1.4 + shard.x * 0.01) * 7;
  const x = shard.x;
  const y = shard.y + bob;
  ctx.save();

  // Beam.
  const bg = ctx.createLinearGradient(0, y - 20, 0, y - 160);
  bg.addColorStop(0, 'rgba(240,190,110,0.32)');
  bg.addColorStop(1, 'rgba(240,190,110,0)');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 12);
  ctx.lineTo(x + 12, y - 12);
  ctx.lineTo(x + 26, y - 175);
  ctx.lineTo(x - 26, y - 175);
  ctx.closePath();
  ctx.fill();

  // Ground glow.
  const gg = ctx.createRadialGradient(x, shard.y + 6, 4, x, shard.y + 6, 66);
  gg.addColorStop(0, 'rgba(240,179,90,0.34)');
  gg.addColorStop(1, 'rgba(240,179,90,0)');
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.ellipse(x, shard.y + 6, 66, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  // Crystal.
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 0.8 + shard.x) * 0.12);
  const cg = ctx.createLinearGradient(0, -26, 0, 26);
  cg.addColorStop(0, '#fff0c2');
  cg.addColorStop(0.45, '#f0b35a');
  cg.addColorStop(1, '#9b5a2c');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(13, -4);
  ctx.lineTo(0, 28);
  ctx.lineTo(-13, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,244,210,0.9)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(0, 28);
  ctx.strokeStyle = 'rgba(120,70,30,0.6)';
  ctx.stroke();

  // Orbit motes.
  ctx.strokeStyle = 'rgba(255,230,170,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 2, 27, 10, t * 0.7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawWorld(ctx, game) {
  const t = game.time;
  drawBackground(ctx, game);
  drawBridge(ctx, t, game.shards >= 3);
  for (const island of ISLANDS) drawIsland(ctx, island, t, game);
  drawGate(ctx, game, t);

  const target = game.pullTarget;
  const archOn = game.state === 'playing' && !game.input.touchMode;
  for (const anchor of ANCHORS) drawAnchor(ctx, anchor, t, target, archOn);
  for (const shard of game.shardsWorld) {
    if (!shard.taken) drawShard(ctx, shard, t);
  }

  // Boss arena sigil under the court.
  if (!game.bossDefeated) {
    const bx = BOSS_SPAWN.x;
    const by = BOSS_SPAWN.y + 10;
    ctx.save();
    ctx.strokeStyle = `rgba(196,110,160,${0.1 + 0.05 * Math.sin(t * 1.3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(bx, by, 170, 110, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(bx, by, 130, 82, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2 + t * 0.08;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(a) * 135, by + Math.sin(a) * 85);
      ctx.lineTo(bx + Math.cos(a) * 168, by + Math.sin(a) * 108);
      ctx.stroke();
    }
    ctx.restore();
  }
}
