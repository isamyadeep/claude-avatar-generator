// WASM loader + canvas bridge — no drawing geometry here.

import wasmUrl from './draw.wasm?url';

let currentCtx: CanvasRenderingContext2D | null = null;
let wasmMemory: WebAssembly.Memory | null = null;
let engine: DrawAPI | null = null;

export interface DrawAPI {
  setContext: (canvas: HTMLCanvasElement) => void;
  drawPattern: (id: number, variant: number, bg: number, icon: number, rotation: number, flip: number) => void;
}

const CENTER = 256;

function numToHex(c: number): string {
  const r = (c >> 16) & 0xff;
  const g = (c >> 8) & 0xff;
  const b = c & 0xff;
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

/**
 * Reads an AssemblyScript UTF-16 string out of linear memory. AS stores the
 * byte length in the four bytes just before the character data.
 */
function readWasmString(memory: WebAssembly.Memory | null, ptr: bigint): string {
  const address = Number(ptr);
  if (!memory || !address) return '';
  try {
    const view = new DataView(memory.buffer);
    const byteLength = view.getUint32(address - 4, true);
    if (!byteLength) return '';
    const bytes = new Uint8Array(memory.buffer, address, byteLength);
    return new TextDecoder('utf-16le').decode(bytes);
  } catch {
    return '';
  }
}

const canvasImports = {
  clearRect: (x: number, y: number, w: number, h: number) => {
    currentCtx?.clearRect(x, y, w, h);
  },
  fillCircle: (cx: number, cy: number, r: number, color: number) => {
    if (!currentCtx) return;
    currentCtx.fillStyle = numToHex(color);
    currentCtx.beginPath();
    currentCtx.arc(cx, cy, r, 0, Math.PI * 2);
    currentCtx.fill();
  },
  fillRect: (x: number, y: number, w: number, h: number, color: number) => {
    if (!currentCtx) return;
    currentCtx.fillStyle = numToHex(color);
    currentCtx.fillRect(x, y, w, h);
  },
  strokeLine: (x1: number, y1: number, x2: number, y2: number, color: number, width: number) => {
    if (!currentCtx) return;
    currentCtx.strokeStyle = numToHex(color);
    currentCtx.lineWidth = width;
    currentCtx.lineCap = 'round';
    currentCtx.beginPath();
    currentCtx.moveTo(x1, y1);
    currentCtx.lineTo(x2, y2);
    currentCtx.stroke();
  },
  // Regular polygon: `sides` vertices at radius `r`, the first one on `phase`.
  fillPolygon: (cx: number, cy: number, r: number, sides: number, phase: number, color: number) => {
    if (!currentCtx || sides < 3) return;
    currentCtx.fillStyle = numToHex(color);
    currentCtx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = phase + (i * Math.PI * 2) / sides;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) currentCtx.moveTo(x, y);
      else currentCtx.lineTo(x, y);
    }
    currentCtx.closePath();
    currentCtx.fill();
  },
  pushRotation: (deg: number) => {
    if (!currentCtx) return;
    currentCtx.save();
    currentCtx.translate(CENTER, CENTER);
    currentCtx.rotate((deg * Math.PI) / 180);
    currentCtx.translate(-CENTER, -CENTER);
  },
  popRotation: () => {
    currentCtx?.restore();
  },
  // The save/restore pair stays balanced even when the flip is off.
  pushFlip: (enabled: number) => {
    if (!currentCtx) return;
    currentCtx.save();
    if (enabled) {
      currentCtx.translate(CENTER, CENTER);
      currentCtx.scale(-1, 1);
      currentCtx.translate(-CENTER, -CENTER);
    }
  },
  popFlip: () => {
    currentCtx?.restore();
  },
  // abort(message, fileName, line, column) — the first two are memory pointers.
  abort: (message: bigint, fileName: bigint, line: bigint, column: bigint) => {
    const where = readWasmString(wasmMemory, fileName);
    const what = readWasmString(wasmMemory, message);
    throw new Error(`WASM abort at ${where}:${line}:${column}${what ? ` — ${what}` : ''}`);
  },
};

export async function initWASM(): Promise<DrawAPI> {
  if (engine) return engine;

  const response = await fetch(wasmUrl);
  if (!response.ok) throw new Error(`draw.wasm ${response.status}`);

  const bytes = await response.arrayBuffer();
  const { instance } = await WebAssembly.instantiate(bytes, {
    env: { ...canvasImports },
  });

  wasmMemory = instance.exports.memory as WebAssembly.Memory;

  // One drawing entry point; the rest are AssemblyScript runtime helpers.
  const wasm = instance.exports as unknown as {
    drawPattern: (id: number, variant: number, bg: number, icon: number, rotation: number, flip: number) => void;
  };

  engine = {
    setContext: (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('2D canvas context is unavailable');
      currentCtx = ctx;
    },
    drawPattern: (id, variant, bg, icon, rotation, flip) => {
      wasm.drawPattern(id, variant, bg, icon, rotation, flip);
    },
  };

  return engine;
}
