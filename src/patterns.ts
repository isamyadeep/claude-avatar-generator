// Pattern catalogue — metadata only. Geometry lives inside draw.wasm.

export interface PatternMeta {
  id: number;       // index into the WASM dispatcher
  key: string;      // filename slug
  label: string;
  variants: number; // how many size/detail steps it has
}

// Only quarter turns — the motifs are built on a 90° grid.
export const ROTATIONS = [0, 90, 180, 270];

export const PATTERNS: PatternMeta[] = [
  { id: 0, key: 'clover',      label: 'Clover',           variants: 3 },
  { id: 1, key: 'cloverhole',  label: 'Clover — Hollow',  variants: 5 },
  { id: 2, key: 'pixstar',     label: 'Pixel — Star',     variants: 5 },
  { id: 3, key: 'steps',       label: 'Steps',            variants: 1 },
  { id: 4, key: 'radial',      label: 'Radial — Hub',     variants: 4 },
  { id: 5, key: 'flowerround', label: 'Flower — Round',   variants: 5 },
  { id: 6, key: 'flowerpoint', label: 'Flower — Pointed', variants: 2 },
  { id: 7, key: 'pixburst',    label: 'Pixel — Burst',    variants: 5 },
  { id: 8, key: 'sparkle',     label: 'Sparkle',          variants: 4 },
  { id: 9, key: 'gooey',       label: 'Gooey — Burst',    variants: 4 },
];

// Favourites turn up twice as often as everything else; Steps has only one
// shape, so it stays rare.
const WEIGHTS: Record<string, number> = {
  clover: 2,
  pixstar: 2,
  flowerround: 2,
  pixburst: 2,
  sparkle: 2,
  steps: 0.3,
};

export function randomPattern(): PatternMeta {
  let total = 0;
  for (const p of PATTERNS) total += WEIGHTS[p.key] ?? 1;

  let roll = Math.random() * total;
  for (const p of PATTERNS) {
    roll -= WEIGHTS[p.key] ?? 1;
    if (roll <= 0) return p;
  }
  return PATTERNS[PATTERNS.length - 1];
}

export function randomRotation(): number {
  return ROTATIONS[Math.floor(Math.random() * ROTATIONS.length)];
}
