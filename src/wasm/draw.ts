// AssemblyScript — the entire drawing engine.
// Compiles to draw.wasm: every pattern's geometry lives in the binary.
//
// Size rule: every pattern is scaled so its bounding box is the same square,
// so all motifs read as the same visual weight on the square background.

@external("env", "clearRect")
declare function _clearRect(x: f64, y: f64, w: f64, h: f64): void;

@external("env", "fillCircle")
declare function _fillCircle(cx: f64, cy: f64, r: f64, color: u32): void;

@external("env", "fillRect")
declare function _fillRect(x: f64, y: f64, w: f64, h: f64, color: u32): void;

@external("env", "strokeLine")
declare function _strokeLine(x1: f64, y1: f64, x2: f64, y2: f64, color: u32, width: f64): void;

@external("env", "fillPolygon")
declare function _fillPolygon(cx: f64, cy: f64, r: f64, sides: i32, phase: f64, color: u32): void;

@external("env", "pushRotation")
declare function _pushRotation(deg: f64): void;

@external("env", "popRotation")
declare function _popRotation(): void;

@external("env", "pushFlip")
declare function _pushFlip(enabled: i32): void;

@external("env", "popFlip")
declare function _popFlip(): void;

function clearAll(): void { _clearRect(0, 0, 512, 512); }
function fillCircle(cx: f64, cy: f64, r: f64, color: u32): void { _fillCircle(cx, cy, r, color); }
function fillRect(x: f64, y: f64, w: f64, h: f64, color: u32): void { _fillRect(x, y, w, h, color); }
function strokeLine(x1: f64, y1: f64, x2: f64, y2: f64, color: u32, width: f64): void {
  _strokeLine(x1, y1, x2, y2, color, width);
}
function fillBackground(color: u32): void { _fillRect(0, 0, 512, 512, color); }
function fillPolygon(cx: f64, cy: f64, r: f64, sides: i32, phase: f64, color: u32): void {
  _fillPolygon(cx, cy, r, sides, phase, color);
}

const CENTER: f64 = 256;
const TARGET: f64 = 168;   // every motif is normalised to this bounding radius

// Largest horizontal/vertical reach of a ring of n lobes at radius R,
// as a fraction of R.
function ringExtent(n: f64, phase: f64): f64 {
  let m: f64 = 0;
  const count = <i32>n;
  for (let i = 0; i < count; i++) {
    const a = <f64>i * Math.PI * 2.0 / n + phase;
    const c = Math.abs(Math.cos(a));
    const s = Math.abs(Math.sin(a));
    if (c > m) m = c;
    if (s > m) m = s;
  }
  return m;
}

// Clover — overlapping round lobes around a filled centre.
// The variant picks the lobe count: 3, 4 or 5.
function pClover(variant: i32, icon: u32): void {
  const n = 3 + variant;
  const nf = <f64>n;
  // rho = lobe radius / ring radius. rho > 1 fills the centre with no gaps;
  // smaller rho keeps the scalloped edge between the lobes crisper.
  const rho = 1.0 + 0.62 * (2.0 * Math.sin(Math.PI / nf) - 1.0);
  const R = TARGET / (ringExtent(nf, -Math.PI * 0.5) + rho);
  const r = rho * R;

  for (let i = 0; i < n; i++) {
    const a = <f64>i * Math.PI * 2.0 / nf - Math.PI * 0.5;
    fillCircle(CENTER + Math.cos(a) * R, CENTER + Math.sin(a) * R, r, icon);
  }
}

// Clover Hollow — lobes ringed around an n-sided hole.
// The hole's corners sit where neighbouring lobes cross, so the polygon
// reads as the clean void the lobes leave behind.
function pCloverHollow(variant: i32, bg: u32, icon: u32): void {
  const n = 3 + variant;
  const nf = <f64>n;
  const s = Math.sin(Math.PI / nf);
  const rho = s + 0.04;                     // lobes just overlap each other
  const R = TARGET / (ringExtent(nf, Math.PI / nf) + rho);
  const r = rho * R;

  for (let i = 0; i < n; i++) {
    const a = (<f64>2 * i + 1.0) * Math.PI / nf;
    fillCircle(CENTER + Math.cos(a) * R, CENTER + Math.sin(a) * R, r, icon);
  }

  const k = R * (Math.cos(Math.PI / nf) - Math.sqrt(rho * rho - s * s));
  fillPolygon(CENTER, CENTER, k, n, 0.0, bg);
}

// Pixel Star — a chunky burst rasterised onto a square pixel grid.
// The variant picks the point count (4, 6, 8, 10, 12); the grain stays coarse
// and the points stay blunt and wide.
function pPixelStar(variant: i32, icon: u32): void {
  const points = 4 + 2 * variant;          // 4 -> 12 points
  const cells = 19;                        // coarse grain
  const span = TARGET;
  const cell = 2.0 * Math.ceil(span / <f64>cells);   // even, whole pixels
  const origin = CENTER - <f64>cells * cell * 0.5;
  const k = <f64>points * 0.5;

  for (let gy = 0; gy < cells; gy++) {
    for (let gx = 0; gx < cells; gx++) {
      const px = origin + (<f64>gx + 0.5) * cell;
      const py = origin + (<f64>gy + 0.5) * cell;
      const dx = px - CENTER;
      const dy = py - CENTER;
      const rad = Math.sqrt(dx * dx + dy * dy);
      const ang = Math.atan2(dy, dx);
      const lim = span * (0.42 + 0.58 * Math.abs(Math.cos(k * ang)));
      if (rad <= lim) {
        fillRect(px - cell * 0.5, py - cell * 0.5, cell, cell, icon);
      }
    }
  }
}

// Pixel Burst — the same rasterisation, but on a fine grid with sharp spikes.
// The point count changes with the variant (4, 6, 8, 10, 12).
function pPixelBurst(variant: i32, icon: u32): void {
  const points = 4 + 2 * variant;          // 4 -> 12 points
  const cells = 26 + 2 * variant;          // 26 -> 34: keeps the points crisp
  const span = TARGET;
  const cell = 2.0 * Math.ceil(span / <f64>cells);   // even, whole pixels
  const origin = CENTER - <f64>cells * cell * 0.5;
  const base = 0.30 + 0.02 * <f64>variant;
  const k = <f64>points * 0.5;

  for (let gy = 0; gy < cells; gy++) {
    for (let gx = 0; gx < cells; gx++) {
      const px = origin + (<f64>gx + 0.5) * cell;
      const py = origin + (<f64>gy + 0.5) * cell;
      const dx = px - CENTER;
      const dy = py - CENTER;
      const rad = Math.sqrt(dx * dx + dy * dy);
      const ang = Math.atan2(dy, dx);
      const lim = span * (base + (1.0 - base) * Math.abs(Math.cos(k * ang)));
      if (rad <= lim) {
        fillRect(px - cell * 0.5, py - cell * 0.5, cell, cell, icon);
      }
    }
  }
}

// Steps — three equal square blocks climbing from bottom-left to top-right.
// There is only one staircase shape; the variety comes from the rotation and
// the mirror flip applied to the whole motif.
function pStaircase(variant: i32, icon: u32): void {
  const half = TARGET * 0.86;              // optical size
  const step = half * 2.0 / 3.0;           // tread width = riser height
  const x0 = CENTER - half;
  const baseY = CENTER + half;

  for (let i = 0; i < 3; i++) {
    const h = step * <f64>(i + 1);
    // +1px on every column but the last: neighbouring rects otherwise leave a
    // hairline seam where the browser anti-aliases the shared edge.
    const w = i < 2 ? step + 1.0 : step;
    fillRect(x0 + step * <f64>i, baseY - h, w, h, icon);
  }
}

// Radial — a hub with spokes radiating out, each ending in a node.
// The spoke count changes per variant (4, 8, 12, 16); counts are kept as
// multiples of four so a spoke always lands on both axes.
function pRadial(variant: i32, icon: u32): void {
  const v = <f64>variant;
  const spokes = 4 * (1 + variant);
  const coreR = TARGET * (0.075 + 0.005 * v);
  const nodeR = TARGET * (0.078 - 0.004 * v);
  const edgeW = TARGET * (0.055 + 0.004 * v);
  const reach = TARGET - nodeR;

  fillCircle(CENTER, CENTER, coreR, icon);

  for (let i = 0; i < spokes; i++) {
    const a = <f64>i * Math.PI * 2.0 / <f64>spokes;
    const ca = Math.cos(a);
    const sa = Math.sin(a);

    strokeLine(
      CENTER + ca * coreR, CENTER + sa * coreR,
      CENTER + ca * reach, CENTER + sa * reach,
      icon, edgeW
    );
    fillCircle(CENTER + ca * reach, CENTER + sa * reach, nodeR, icon);
  }
}

// Flower — Round. Round petals around a solid centre disc; the variant
// picks the petal count (5 to 9). Petal radius eases down as the count rises
// so the petals keep touching instead of drifting apart.
function pFlowerRound(variant: i32, icon: u32): void {
  const n = 5 + variant;
  const rp = TARGET * (0.40 - 0.03 * <f64>(n - 5));
  const ro = TARGET - rp;
  const rc = Math.max(TARGET * 0.42, ro - rp + TARGET * 0.04);

  fillCircle(CENTER, CENTER, rc, icon);

  const nf = <f64>n;
  for (let i = 0; i < n; i++) {
    const a = <f64>i * Math.PI * 2.0 / nf - Math.PI * 0.5;
    fillCircle(CENTER + Math.cos(a) * ro, CENTER + Math.sin(a) * ro, rp, icon);
  }
}

// Flower — Pointed. Diamond petals, each with a vertex pointing outward;
// the variant picks the petal count (7 or 8). The petals sit deep enough in
// the core to read as one shape rather than loose squares.
function pFlowerPointed(variant: i32, icon: u32): void {
  const n = 7 + variant;
  const rp = TARGET * (0.40 - 0.02 * <f64>(n - 4));
  const ro = TARGET - rp;
  const rc = Math.max(TARGET * 0.46, ro - rp + TARGET * 0.08);

  fillCircle(CENTER, CENTER, rc, icon);

  const nf = <f64>n;
  for (let i = 0; i < n; i++) {
    const a = <f64>i * Math.PI * 2.0 / nf - Math.PI * 0.5;
    fillPolygon(CENTER + Math.cos(a) * ro, CENTER + Math.sin(a) * ro, rp, 4, a, icon);
  }
}

// Sparkle — a thick asterisk of rounded strokes around a solid centre.
function pSparkle(variant: i32, icon: u32): void {
  let arms = 8;
  if (variant == 1) arms = 6;
  else if (variant == 2) arms = 12;
  else if (variant == 3) arms = 4;

  const w = TARGET * 0.13;
  const reach = TARGET - w * 0.5;
  const coreR = TARGET * 0.20;

  fillCircle(CENTER, CENTER, coreR, icon);

  for (let i = 0; i < arms; i++) {
    const a = <f64>i * Math.PI * 2.0 / <f64>arms;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    strokeLine(
      CENTER + ca * coreR * 0.5, CENTER + sa * coreR * 0.5,
      CENTER + ca * reach, CENTER + sa * reach,
      icon, w
    );
  }
}

// One fat arm of the gooey burst, ending in a bulb.
function gooeyArm(deg: f64, w: f64, reach: f64, icon: u32): void {
  const a = deg * Math.PI / 180.0;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  strokeLine(CENTER, CENTER, CENTER + ca * reach, CENTER + sa * reach, icon, w);
  fillCircle(CENTER + ca * reach, CENTER + sa * reach, w * 0.52, icon);
}

// Gooey — the Claude burst, fattened until the arms flow together.
// The angles are the eight tips of the mark itself.
function pGooey(variant: i32, icon: u32): void {
  let w = TARGET * 0.22;
  if (variant == 1) w = TARGET * 0.25;
  else if (variant == 2) w = TARGET * 0.28;
  else if (variant == 3) w = TARGET * 0.32;

  const reach = TARGET - w * 0.5;

  if (variant == 0) {
    gooeyArm(-110.9, w, reach, icon);
    gooeyArm(-72.2, w, reach, icon);
    gooeyArm(-1.5, w, reach, icon);
    gooeyArm(20.6, w, reach, icon);
    gooeyArm(100.1, w, reach, icon);
    gooeyArm(127.1, w, reach, icon);
    gooeyArm(150.0, w, reach, icon);
    gooeyArm(184.4, w, reach, icon);
  } else if (variant == 1) {
    gooeyArm(-110.9, w, reach, icon);
    gooeyArm(-1.5, w, reach, icon);
    gooeyArm(20.6, w, reach, icon);
    gooeyArm(100.1, w, reach, icon);
    gooeyArm(127.1, w, reach, icon);
    gooeyArm(184.4, w, reach, icon);
  } else if (variant == 2) {
    gooeyArm(-110.9, w, reach, icon);
    gooeyArm(-72.2, w, reach, icon);
    gooeyArm(20.6, w, reach, icon);
    gooeyArm(100.1, w, reach, icon);
    gooeyArm(184.4, w, reach, icon);
  } else {
    gooeyArm(-110.9, w, reach, icon);
    gooeyArm(-1.5, w, reach, icon);
    gooeyArm(100.1, w, reach, icon);
    gooeyArm(184.4, w, reach, icon);
  }
}

// `flip` mirrors the motif about the vertical axis. It applies to every
// pattern, so the whole catalogue can be shown in both handednesses.
export function drawPattern(id: i32, variant: i32, bg: u32, icon: u32, rotation: f64, flip: i32): void {
  clearAll();
  fillBackground(bg);

  _pushRotation(rotation);
  _pushFlip(flip);

  if (id === 0) pClover(variant, icon);
  else if (id === 1) pCloverHollow(variant, bg, icon);
  else if (id === 2) pPixelStar(variant, icon);
  else if (id === 3) pStaircase(variant, icon);
  else if (id === 4) pRadial(variant, icon);
  else if (id === 5) pFlowerRound(variant, icon);
  else if (id === 6) pFlowerPointed(variant, icon);
  else if (id === 7) pPixelBurst(variant, icon);
  else if (id === 8) pSparkle(variant, icon);
  else pGooey(variant, icon);

  _popFlip();
  _popRotation();
}
