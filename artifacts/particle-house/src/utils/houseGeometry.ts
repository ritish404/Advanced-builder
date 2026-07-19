import * as THREE from 'three';

export interface ParticleData {
  targetPositions: Float32Array;
  scatterPositions: Float32Array;
  phases: Float32Array;
  sizes: Float32Array;
  colors: Float32Array;
  floorIndices: Float32Array;
  roomIndices: Float32Array;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface Rect2 { x1: number; x2: number; y1: number; y2: number }
interface RectZ  { z1: number; z2: number; y1: number; y2: number }

/** Sample a 2-D point in [x1,x2]×[y1,y2] avoiding excluded rects. */
function sampleXY(
  x1: number, x2: number, y1: number, y2: number,
  excl: Rect2[],
): [number, number] {
  let x = 0, y = 0, tries = 0;
  do {
    x = x1 + Math.random() * (x2 - x1);
    y = y1 + Math.random() * (y2 - y1);
    tries++;
  } while (tries < 32 && excl.some(r => x > r.x1 && x < r.x2 && y > r.y1 && y < r.y2));
  return [x, y];
}

/** Sample a 2-D point in [z1,z2]×[y1,y2] avoiding excluded rects. */
function sampleZY(
  z1: number, z2: number, y1: number, y2: number,
  excl: RectZ[],
): [number, number] {
  let z = 0, y = 0, tries = 0;
  do {
    z = z1 + Math.random() * (z2 - z1);
    y = y1 + Math.random() * (y2 - y1);
    tries++;
  } while (tries < 32 && excl.some(r => z > r.z1 && z < r.z2 && y > r.y1 && y < r.y2));
  return [z, y];
}

/** Uniform random point on a triangle (a→b→c). */
function sampleTri(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
): [number, number, number] {
  let u = Math.random(), v = Math.random();
  if (u + v > 1) { u = 1 - u; v = 1 - v; }
  return [
    ax + u * (bx - ax) + v * (cx - ax),
    ay + u * (by - ay) + v * (cy - ay),
    az + u * (bz - az) + v * (cz - az),
  ];
}

// ── Main generator ────────────────────────────────────────────────────────────

export function generateHousePoints(count: number, theme: any): ParticleData {
  const targetPositions  = new Float32Array(count * 3);
  const scatterPositions = new Float32Array(count * 3);
  const phases           = new Float32Array(count);
  const sizes            = new Float32Array(count);
  const colors           = new Float32Array(count * 3);
  const floorIndices     = new Float32Array(count);
  const roomIndices      = new Float32Array(count);

  const c1 = new THREE.Color(theme.colors.primary);
  const c2 = new THREE.Color(theme.colors.secondary);
  const c3 = new THREE.Color(theme.colors.accent);

  const ws = theme.geometry.widthScale  as number;  // horizontal scale
  const hs = theme.geometry.heightScale as number;  // vertical scale
  const roofType = theme.geometry.roofType as string;

  // ── Core dimensions ────────────────────────────────────────────────────────
  const W  = 5  * ws;    // main body half-width  X
  const D  = 4  * ws;    // main body half-depth  Z
  const Hf = 3.5 * hs;   // one-floor height
  const Wh = 2 * Hf;     // total wall height (2 floors)

  // Roof geometry
  const roofRise = roofType === 'flat' ? 0.15 * hs : 3.5 * hs;
  const peakY    = Wh + roofRise;

  // ── Window / door exclusion zones ─────────────────────────────────────────
  // Ground-floor front wall (GFF): two windows + central door
  const gffExcl: Rect2[] = [
    { x1: (-3.5)*ws, x2: (-1.8)*ws, y1: 0.8*Hf, y2: 2.4*Hf },  // left window
    { x1:  (1.8)*ws, x2:  (3.5)*ws, y1: 0.8*Hf, y2: 2.4*Hf },  // right window
    { x1: (-0.9)*ws, x2:  (0.9)*ws, y1: 0,       y2: 2.6*Hf },  // door
  ];
  // Ground-floor back wall: two windows
  const gfbExcl: Rect2[] = [
    { x1: (-3.2)*ws, x2: (-1.6)*ws, y1: 0.8*Hf, y2: 2.4*Hf },
    { x1:  (1.6)*ws, x2:  (3.2)*ws, y1: 0.8*Hf, y2: 2.4*Hf },
  ];
  // Ground-floor side walls: one window each
  const gfsExcl: RectZ[] = [
    { z1: (-1.0)*ws, z2: (1.0)*ws, y1: 0.8*Hf, y2: 2.4*Hf },
  ];
  // Second-floor front wall: two windows + balcony door
  const sffExcl: Rect2[] = [
    { x1: (-3.5)*ws, x2: (-1.8)*ws, y1: Hf+0.8*Hf, y2: Hf+2.4*Hf },
    { x1:  (1.8)*ws, x2:  (3.5)*ws, y1: Hf+0.8*Hf, y2: Hf+2.4*Hf },
    { x1: (-1.1)*ws, x2:  (1.1)*ws, y1: Hf,         y2: Hf+2.7*Hf }, // balcony door
  ];
  // Second-floor side walls: one window each
  const sfsExcl: RectZ[] = [
    { z1: (-1.0)*ws, z2: (1.0)*ws, y1: Hf+0.8*Hf, y2: Hf+2.4*Hf },
  ];

  // ── Window glow zones (all windows, used for glowing accent particles) ─────
  type WinDef = { x1: number; x2: number; y1: number; y2: number; z: number };
  const windows: WinDef[] = [
    // GF front
    { x1:(-3.5)*ws, x2:(-1.8)*ws, y1:0.8*Hf,       y2:2.4*Hf,       z:  D },
    { x1: (1.8)*ws, x2: (3.5)*ws, y1:0.8*Hf,        y2:2.4*Hf,       z:  D },
    // GF back
    { x1:(-3.2)*ws, x2:(-1.6)*ws, y1:0.8*Hf,        y2:2.4*Hf,       z: -D },
    { x1: (1.6)*ws, x2: (3.2)*ws, y1:0.8*Hf,        y2:2.4*Hf,       z: -D },
    // SF front
    { x1:(-3.5)*ws, x2:(-1.8)*ws, y1:Hf+0.8*Hf,     y2:Hf+2.4*Hf,   z:  D },
    { x1: (1.8)*ws, x2: (3.5)*ws, y1:Hf+0.8*Hf,     y2:Hf+2.4*Hf,   z:  D },
  ];

  // ── Roof sampler ───────────────────────────────────────────────────────────
  const sampleRoof = (): [number, number, number] => {
    if (roofType === 'flat') {
      return [
        (Math.random() - 0.5) * 2 * W,
        Wh + 0.05,
        (Math.random() - 0.5) * 2 * D,
      ];
    }
    if (roofType === 'pyramid') {
      const face = Math.floor(Math.random() * 4);
      if (face === 0) return sampleTri(-W, Wh,  D,  W, Wh,  D, 0, peakY, 0);
      if (face === 1) return sampleTri(-W, Wh, -D,  W, Wh, -D, 0, peakY, 0);
      if (face === 2) return sampleTri(-W, Wh, -D, -W, Wh,  D, 0, peakY, 0);
      return               sampleTri( W, Wh, -D,  W, Wh,  D, 0, peakY, 0);
    }
    if (roofType === 'pagoda') {
      // Three stacked tiers (wider at bottom)
      const tier = Math.floor(Math.random() * 3);
      const tw   = W * (1.4 - tier * 0.2);
      const td   = D * (1.4 - tier * 0.2);
      const ty   = Wh + tier * (roofRise / 3);
      return [
        (Math.random() - 0.5) * 2 * tw,
        ty + 0.08,
        (Math.random() - 0.5) * 2 * td,
      ];
    }
    // Default: pitched (two slopes, ridge at x=0)
    if (Math.random() > 0.5) {
      const t = Math.random();
      return [-W + t * W, Wh + t * roofRise, (Math.random() - 0.5) * 2 * D];
    }
    const t = Math.random();
    return [t * W, peakY - t * roofRise, (Math.random() - 0.5) * 2 * D];
  };

  const sampleGable = (): [number, number, number] => {
    const side = Math.random() > 0.5 ? D : -D;
    if (roofType === 'pitched') {
      return sampleTri(-W, Wh, side, W, Wh, side, 0, peakY, side);
    }
    return [(Math.random() - 0.5) * 2 * W, Wh + Math.random() * roofRise, side];
  };

  // ── Other architectural samplers ───────────────────────────────────────────

  const sampleChimney = (): [number, number, number] => {
    const cx = 2.0 * ws, cz = -1.0 * ws, hw = 0.45 * ws;
    const y0 = Wh * 0.8, y1 = peakY + 0.9 * hs;
    const face = Math.floor(Math.random() * 4);
    const y = y0 + Math.random() * (y1 - y0);
    if (face === 0) return [cx - hw + Math.random() * 2 * hw, y, cz + hw];
    if (face === 1) return [cx - hw + Math.random() * 2 * hw, y, cz - hw];
    if (face === 2) return [cx - hw, y, cz - hw + Math.random() * 2 * hw];
    return                 [cx + hw, y, cz - hw + Math.random() * 2 * hw];
  };

  const sampleGarage = (): [number, number, number] => {
    const gx1 = W, gx2 = W + 3.8 * ws;
    const gz1 = -2.2 * ws, gz2 = 2.2 * ws;
    const gy  = 3.0 * hs;
    const face = Math.floor(Math.random() * 5);
    if (face === 0) return [gx1 + Math.random()*(gx2-gx1), gy + 0.05, gz1 + Math.random()*(gz2-gz1)];
    if (face === 1) return [gx1 + Math.random()*(gx2-gx1), Math.random()*gy, gz2];
    if (face === 2) return [gx1 + Math.random()*(gx2-gx1), Math.random()*gy, gz1];
    if (face === 3) return [gx2, Math.random()*gy, gz1 + Math.random()*(gz2-gz1)];
    // Garage door face (gx1, large door opening)
    const z = gz1 + Math.random()*(gz2-gz1);
    const y = Math.random()*gy;
    // Garage door void: most of lower section
    if (Math.abs(z) < 1.8*ws && y < gy*0.88) {
      return [gx1, gy*0.92 + Math.random()*gy*0.08, z];
    }
    return [gx1, y, z];
  };

  const sampleBalcony = (): [number, number, number] => {
    const bx1 = -2.0*ws, bx2 = 2.0*ws;
    const bz1 = D, bz2 = D + 1.7*ws;
    const by  = Hf + 0.08;
    const r   = Math.random();
    if (r < 0.45) {
      // Floor slab
      return [bx1 + Math.random()*(bx2-bx1), by, bz1 + Math.random()*(bz2-bz1)];
    }
    // Railing (3 sides)
    const side = Math.floor(Math.random() * 3);
    const rh = by + Math.random() * 1.0 * hs;
    if (side === 0) return [bx1 + Math.random()*(bx2-bx1), rh, bz2];
    if (side === 1) return [bx1, rh, bz1 + Math.random()*(bz2-bz1)];
    return               [bx2, rh, bz1 + Math.random()*(bz2-bz1)];
  };

  const sampleStairs = (): [number, number, number] => {
    const STEPS = 4;
    const step  = Math.floor(Math.random() * STEPS);
    const stepH = 0.22 * hs;
    const stepD = 0.45 * ws;
    const hw    = (1.8 + step * 0.5) * ws;
    const x     = (Math.random() - 0.5) * 2 * hw;
    const zBase = D + (step + 1) * stepD;
    // 60% top face, 40% riser face
    if (Math.random() < 0.6) return [x, (step + 1) * stepH, zBase];
    return [x, step * stepH + Math.random() * stepH, zBase];
  };

  const sampleColumn = (): [number, number, number] => {
    const side = Math.random() > 0.5 ? 1 : -1;
    const cx   = side * 1.8 * ws;
    const cz   = D + 0.25 * ws;
    const r    = 0.18 * ws;
    const theta = Math.random() * Math.PI * 2;
    return [cx + r * Math.cos(theta), Math.random() * Hf * 0.95, cz + r * Math.sin(theta)];
  };

  const sampleGarden = (): [number, number, number] => {
    const angle = Math.random() * Math.PI * 2;
    const rad   = W + (5 + Math.random() * 9) * ws;
    return [Math.cos(angle) * rad, -0.3 * hs, Math.sin(angle) * rad];
  };

  const NUM_TREES = 8;
  const treeAngles = Array.from({ length: NUM_TREES }, (_, i) =>
    (i / NUM_TREES) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
  );
  const treeRadii = treeAngles.map(() => W + (5.5 + Math.random() * 4.5) * ws);

  const sampleTree = (): [number, number, number] => {
    const ti = Math.floor(Math.random() * NUM_TREES);
    const tx = Math.cos(treeAngles[ti]) * treeRadii[ti];
    const tz = Math.sin(treeAngles[ti]) * treeRadii[ti];
    if (Math.random() > 0.35) {
      // Foliage sphere
      const fr  = (0.9 + Math.random() * 1.4) * hs;
      const fcy = (1.8 + Math.random() * 1.5) * hs;
      const ph  = Math.acos(2 * Math.random() - 1);
      const th  = Math.random() * Math.PI * 2;
      return [
        tx + fr * Math.sin(ph) * Math.cos(th),
        fcy + fr * Math.cos(ph),
        tz + fr * Math.sin(ph) * Math.sin(th),
      ];
    }
    // Trunk
    return [tx, Math.random() * 1.8 * hs, tz];
  };

  // ── Color helpers ─────────────────────────────────────────────────────────

  const tweak = (col: THREE.Color, amount = 0.12): THREE.Color => {
    const t = (Math.random() - 0.5) * amount;
    return new THREE.Color(
      Math.min(1, Math.max(0, col.r + t)),
      Math.min(1, Math.max(0, col.g + t)),
      Math.min(1, Math.max(0, col.b + t)),
    );
  };
  const mix = (a: THREE.Color, b: THREE.Color, frac = Math.random()) =>
    new THREE.Color().lerpColors(a, b, frac);

  // ── Part table ────────────────────────────────────────────────────────────

  interface Part {
    weight: number;
    floor:  number;
    room:   number;
    color:  () => THREE.Color;
    size:   number;
    sample: () => [number, number, number];
  }

  const parts: Part[] = [
    // ── Foundation slab ────────────────────────────────────────────────────
    {
      weight: 0.030, floor: 0, room: 0, size: 0.75,
      color: () => tweak(c1, 0.08).multiplyScalar(0.45),
      sample: () => [
        (Math.random() - 0.5) * 2 * (W + 0.6),
        -0.28 * hs,
        (Math.random() - 0.5) * 2 * (D + 0.6),
      ],
    },
    // ── Ground-floor front wall ────────────────────────────────────────────
    {
      weight: 0.070, floor: 1, room: 1, size: 0.90,
      color: () => tweak(Math.random() > 0.5 ? c1 : c2),
      sample: () => { const [x,y] = sampleXY(-W, W, 0, Hf, gffExcl); return [x, y, D]; },
    },
    // ── Ground-floor back wall ─────────────────────────────────────────────
    {
      weight: 0.055, floor: 1, room: 2, size: 0.90,
      color: () => tweak(Math.random() > 0.5 ? c1 : c2),
      sample: () => { const [x,y] = sampleXY(-W, W, 0, Hf, gfbExcl); return [x, y, -D]; },
    },
    // ── Ground-floor left wall ─────────────────────────────────────────────
    {
      weight: 0.048, floor: 1, room: 1, size: 0.90,
      color: () => tweak(Math.random() > 0.6 ? c2 : c1),
      sample: () => { const [z,y] = sampleZY(-D, D, 0, Hf, gfsExcl); return [-W, y, z]; },
    },
    // ── Ground-floor right wall ────────────────────────────────────────────
    {
      weight: 0.035, floor: 1, room: 2, size: 0.90,
      color: () => tweak(Math.random() > 0.6 ? c2 : c1),
      sample: () => { const [z,y] = sampleZY(-D, D, 0, Hf, gfsExcl); return [W, y, z]; },
    },
    // ── Second-floor front wall ────────────────────────────────────────────
    {
      weight: 0.060, floor: 2, room: 3, size: 0.90,
      color: () => tweak(Math.random() > 0.5 ? c1 : c2),
      sample: () => { const [x,y] = sampleXY(-W, W, Hf, Wh, sffExcl); return [x, y, D]; },
    },
    // ── Second-floor back wall ─────────────────────────────────────────────
    {
      weight: 0.045, floor: 2, room: 3, size: 0.90,
      color: () => tweak(Math.random() > 0.5 ? c1 : c2),
      sample: () => {
        const excl: Rect2[] = [
          { x1:(-3.2)*ws, x2:(-1.6)*ws, y1:Hf+0.8*Hf, y2:Hf+2.4*Hf },
          { x1: (1.6)*ws, x2: (3.2)*ws, y1:Hf+0.8*Hf, y2:Hf+2.4*Hf },
        ];
        const [x,y] = sampleXY(-W, W, Hf, Wh, excl);
        return [x, y, -D];
      },
    },
    // ── Second-floor left wall ─────────────────────────────────────────────
    {
      weight: 0.038, floor: 2, room: 3, size: 0.90,
      color: () => tweak(Math.random() > 0.6 ? c2 : c1),
      sample: () => { const [z,y] = sampleZY(-D, D, Hf, Wh, sfsExcl); return [-W, y, z]; },
    },
    // ── Second-floor right wall ────────────────────────────────────────────
    {
      weight: 0.028, floor: 2, room: 4, size: 0.90,
      color: () => tweak(Math.random() > 0.6 ? c2 : c1),
      sample: () => { const [z,y] = sampleZY(-D, D, Hf, Wh, sfsExcl); return [W, y, z]; },
    },
    // ── Floor-line trim (horizontal edge between floors) ───────────────────
    {
      weight: 0.018, floor: 1, room: 1, size: 0.70,
      color: () => tweak(c2, 0.06),
      sample: () => {
        const s = Math.floor(Math.random() * 4);
        if (s === 0) return [(Math.random()-0.5)*2*W, Hf + 0.04, D - Math.random()*0.08];
        if (s === 1) return [(Math.random()-0.5)*2*W, Hf + 0.04,-D + Math.random()*0.08];
        if (s === 2) return [-W + Math.random()*0.08, Hf + 0.04, (Math.random()-0.5)*2*D];
        return             [ W - Math.random()*0.08, Hf + 0.04, (Math.random()-0.5)*2*D];
      },
    },
    // ── Glowing window glass ───────────────────────────────────────────────
    {
      weight: 0.072, floor: 1, room: 1, size: 0.75,
      color: () => tweak(c3, 0.06).multiplyScalar(1.4),
      sample: () => {
        const w = windows[Math.floor(Math.random() * windows.length)];
        const x = w.x1 + Math.random() * (w.x2 - w.x1);
        const y = w.y1 + Math.random() * (w.y2 - w.y1);
        return [x, y, w.z + (w.z > 0 ? 0.06 : -0.06)];
      },
    },
    // ── Window frames (bright thin border around each window) ─────────────
    {
      weight: 0.020, floor: 1, room: 1, size: 0.65,
      color: () => mix(c3, new THREE.Color(1,1,1), 0.4),
      sample: () => {
        const w    = windows[Math.floor(Math.random() * windows.length)];
        const edge = Math.floor(Math.random() * 4);
        const t    = Math.random();
        const off  = 0.08;
        if (edge === 0) return [w.x1 - off, w.y1 + t*(w.y2-w.y1), w.z + 0.04];
        if (edge === 1) return [w.x2 + off, w.y1 + t*(w.y2-w.y1), w.z + 0.04];
        if (edge === 2) return [w.x1 + t*(w.x2-w.x1), w.y1 - off, w.z + 0.04];
        return             [w.x1 + t*(w.x2-w.x1), w.y2 + off, w.z + 0.04];
      },
    },
    // ── Door frame ────────────────────────────────────────────────────────
    {
      weight: 0.018, floor: 1, room: 1, size: 0.65,
      color: () => tweak(c3),
      sample: () => {
        const hw  = 0.9 * ws, dh = 2.6 * hs;
        const edge = Math.floor(Math.random() * 3);
        const t    = Math.random();
        if (edge === 0) return [-hw - 0.06, t * dh, D + 0.05];
        if (edge === 1) return [ hw + 0.06, t * dh, D + 0.05];
        return             [(-hw + t * 2 * hw), dh + 0.06, D + 0.05];
      },
    },
    // ── Pitched / pyramid / pagoda / flat roof ─────────────────────────────
    {
      weight: 0.130, floor: 3, room: 5, size: 1.00,
      color: () => tweak(Math.random() > 0.45 ? c2 : c1),
      sample: sampleRoof,
    },
    // ── Gable end triangles (pitched roof only, both ends) ─────────────────
    {
      weight: 0.022, floor: 3, room: 5, size: 0.88,
      color: () => tweak(c2, 0.06),
      sample: sampleGable,
    },
    // ── Roof ridge highlight ───────────────────────────────────────────────
    {
      weight: 0.010, floor: 3, room: 5, size: 0.65,
      color: () => tweak(c3, 0.06),
      sample: () =>
        roofType === 'pitched'
          ? [0, peakY + 0.05, (Math.random()-0.5)*2*D]
          : [(Math.random()-0.5)*2*W, peakY + 0.05, (Math.random()-0.5)*2*D],
    },
    // ── Chimney ───────────────────────────────────────────────────────────
    {
      weight: 0.018, floor: 3, room: 5, size: 0.70,
      color: () => tweak(c1, 0.08).multiplyScalar(0.65),
      sample: sampleChimney,
    },
    // ── Garage ────────────────────────────────────────────────────────────
    {
      weight: 0.050, floor: 1, room: 7, size: 0.85,
      color: () => tweak(Math.random() > 0.55 ? c2 : c1, 0.08),
      sample: sampleGarage,
    },
    // ── Balcony ───────────────────────────────────────────────────────────
    {
      weight: 0.038, floor: 2, room: 3, size: 0.80,
      color: () => tweak(c3, 0.07),
      sample: sampleBalcony,
    },
    // ── Entrance stairs ───────────────────────────────────────────────────
    {
      weight: 0.025, floor: 0, room: 0, size: 0.72,
      color: () => tweak(c1, 0.06).multiplyScalar(0.75),
      sample: sampleStairs,
    },
    // ── Entrance columns ──────────────────────────────────────────────────
    {
      weight: 0.015, floor: 1, room: 1, size: 0.68,
      color: () => new THREE.Color(0.95, 0.95, 0.95),
      sample: sampleColumn,
    },
    // ── Garden ground ─────────────────────────────────────────────────────
    {
      weight: 0.048, floor: 0, room: 6, size: 0.58,
      color: () => tweak(c1, 0.06).multiplyScalar(0.25),
      sample: sampleGarden,
    },
    // ── Garden trees ──────────────────────────────────────────────────────
    {
      weight: 0.092, floor: 0, room: 6, size: 0.82,
      color: () => {
        const isLeaf = Math.random() > 0.32;
        return isLeaf
          ? new THREE.Color(0.08 + Math.random()*0.05, 0.42 + Math.random()*0.22, 0.08)
          : new THREE.Color(0.36, 0.22, 0.08);
      },
      sample: sampleTree,
    },
  ];

  // Normalise weights → cumulative lookup table
  const total  = parts.reduce((s, p) => s + p.weight, 0);
  const cumuls = parts.reduce<number[]>((acc, p) => {
    acc.push((acc[acc.length - 1] ?? 0) + p.weight / total);
    return acc;
  }, []);

  // ── Fill buffers ──────────────────────────────────────────────────────────

  for (let i = 0; i < count; i++) {
    // Pick part proportional to weight
    const r = Math.random();
    let pi = parts.length - 1;
    for (let j = 0; j < cumuls.length; j++) {
      if (r <= cumuls[j]) { pi = j; break; }
    }
    const part = parts[pi];

    const [x, y, z] = part.sample();
    const i3 = i * 3;
    targetPositions[i3]     = x;
    targetPositions[i3 + 1] = y;
    targetPositions[i3 + 2] = z;

    // Scatter: uniform sphere, radius 25–55
    const sTheta  = Math.random() * Math.PI * 2;
    const sPhi    = Math.acos(2 * Math.random() - 1);
    const sRadius = 25 + Math.random() * 30;
    scatterPositions[i3]     = sRadius * Math.sin(sPhi) * Math.cos(sTheta);
    scatterPositions[i3 + 1] = sRadius * Math.sin(sPhi) * Math.sin(sTheta);
    scatterPositions[i3 + 2] = sRadius * Math.cos(sPhi);

    phases[i] = Math.random();
    sizes[i]  = (0.55 + Math.random() * 0.9) * part.size;

    const col = part.color();
    colors[i3]     = Math.min(1, Math.max(0, col.r));
    colors[i3 + 1] = Math.min(1, Math.max(0, col.g));
    colors[i3 + 2] = Math.min(1, Math.max(0, col.b));

    floorIndices[i] = part.floor;
    roomIndices[i]  = part.room;
  }

  return { targetPositions, scatterPositions, phases, sizes, colors, floorIndices, roomIndices };
}
