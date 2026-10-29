// 16 color palettes — each has bg (background) + icon (foreground)

export interface Palette {
  name: string;
  bg: string;   // hex like '#d46286'
  icon: string; // hex like '#e5cbd4'
}

export const PALETTES: Record<string, Palette> = {
  pink:    { name: 'Pink & Rose',    bg: '#d46286', icon: '#e5cbd4' },
  blue:    { name: 'Slate Blue',     bg: '#6ba0db', icon: '#e0e5f2' },
  green:   { name: 'Muted Sage',     bg: '#c2d4cb', icon: '#667d53' },
  purple:  { name: 'Lavender',       bg: '#8b7bc9', icon: '#ece7f8' },
  amber:   { name: 'Warm Amber',     bg: '#e3a34a', icon: '#fdf0dc' },
  coral:   { name: 'Soft Coral',     bg: '#ef7f6b', icon: '#fde4de' },
  teal:    { name: 'Ocean Teal',     bg: '#3fa9a0', icon: '#dff5f2' },
  indigo:  { name: 'Deep Indigo',    bg: '#5b6bc9', icon: '#e2e6fb' },
  rose:    { name: 'Dusty Rose',     bg: '#c74f6d', icon: '#f7dfe5' },
  slate:   { name: 'Cool Slate',     bg: '#7d8b9a', icon: '#e7ecf2' },
  mint:    { name: 'Fresh Mint',     bg: '#86c9a8', icon: '#e0f6ec' },
  maroon:  { name: 'Rich Maroon',    bg: '#9c4b52', icon: '#f6e0e2' },
  gold:    { name: 'Antique Gold',   bg: '#c9a227', icon: '#fbf3d4' },
  sand:    { name: 'Sand & Clay',    bg: '#e5dac4', icon: '#c05a74' },
  olive:   { name: 'Olive & Sand',   bg: '#e6dcc6', icon: '#5f7a4e' },
  peri:    { name: 'Periwinkle',     bg: '#b3b9e6', icon: '#5a6fd6' },
};

export const PALETTE_KEYS = Object.keys(PALETTES);

export function randomPalette(): Palette {
  const key = PALETTE_KEYS[Math.floor(Math.random() * PALETTE_KEYS.length)];
  return PALETTES[key];
}

export function hexToNum(hex: string): number {
  const clean = hex.replace('#', '');
  return parseInt(clean, 16);
}
