// Main UI wiring — loads the WASM engine, populates controls, handles input.

import { initWASM, type DrawAPI } from './wasm/index.js';
import { PATTERNS, randomPattern, randomRotation, type PatternMeta } from './patterns.js';
import { PALETTES, PALETTE_KEYS, randomPalette, hexToNum } from './palettes.js';

const canvas = document.getElementById('avatarCanvas') as HTMLCanvasElement;
const paletteSelect = document.getElementById('paletteSelect') as HTMLDivElement;
const paletteTrigger = document.getElementById('paletteTrigger') as HTMLButtonElement;
const paletteValue = document.getElementById('paletteValue') as HTMLSpanElement;
const paletteMenu = document.getElementById('paletteMenu') as HTMLUListElement;
const paletteSwatch = document.getElementById('paletteSwatch') as HTMLSpanElement;
const randomizeBtn = document.getElementById('randomizeBtn') as HTMLButtonElement;
const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
const loadError = document.getElementById('loadError') as HTMLParagraphElement;

let engine: DrawAPI | null = null;
let currentPattern: PatternMeta = PATTERNS[0];
let currentPalette = PALETTES.pink;
let currentPaletteKey = 'pink';
let currentVariant = 0;
let currentRotation = 0;
let currentFlip = 0;

async function init() {
  document.body.classList.add('loading');

  try {
    engine = await initWASM();
    engine.setContext(canvas);

    buildMenu();

    currentPalette = PALETTES.pink;
    currentPaletteKey = 'pink';
    syncTrigger();

    randomizeBtn.addEventListener('click', () => randomize());
    downloadBtn.addEventListener('click', download);

    randomize(true);
  } catch (error) {
    showError(error);
  } finally {
    document.body.classList.remove('loading');
  }
}

function showError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  loadError.textContent = `Could not start the avatar engine: ${message}`;
  loadError.hidden = false;
  randomizeBtn.disabled = true;
  downloadBtn.disabled = true;
}

// Trusted static SVG — no user data goes through the HTML parser.
const CHECK_ICON =
  '<svg class="select-check" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
  '<path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function buildMenu() {
  const items = PALETTE_KEYS.map(key => ({ key, name: PALETTES[key].name, color: PALETTES[key].bg }));

  const fragment = document.createDocumentFragment();

  for (const item of items) {
    const option = document.createElement('li');
    option.className = 'select-option';
    option.id = `palette-option-${item.key}`;
    option.dataset.key = item.key;
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', 'false');
    option.tabIndex = -1;

    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.style.setProperty('--chip-color', item.color);

    const name = document.createElement('span');
    name.className = 'select-option-name';
    name.textContent = item.name;

    option.append(chip, name);
    option.insertAdjacentHTML('beforeend', CHECK_ICON);

    fragment.append(option);
  }

  paletteMenu.replaceChildren(fragment);

  paletteMenu.addEventListener('click', (event) => {
    const option = (event.target as HTMLElement).closest('.select-option') as HTMLElement | null;
    if (option) selectPalette(option.dataset.key as string);
  });

  paletteMenu.addEventListener('keydown', onMenuKeydown);

  paletteTrigger.addEventListener('click', () => {
    if (paletteMenu.hidden) openMenu();
    else closeMenu();
  });

  paletteTrigger.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu();
    }
  });

  document.addEventListener('click', (event) => {
    if (!paletteMenu.hidden && !paletteSelect.contains(event.target as Node)) closeMenu(false);
  });

  window.addEventListener('resize', () => {
    if (!paletteMenu.hidden) positionMenu();
  });

  window.addEventListener('scroll', () => {
    if (!paletteMenu.hidden) positionMenu();
  }, true);
}

function openMenu() {
  paletteMenu.hidden = false;
  paletteSelect.classList.add('open');
  paletteTrigger.setAttribute('aria-expanded', 'true');
  positionMenu();

  const selected = paletteMenu.querySelector('[aria-selected="true"]') as HTMLElement | null;
  const target = selected ?? (paletteMenu.firstElementChild as HTMLElement);
  target?.focus();
}

/** Anchors the fixed menu under the trigger, flipping up when short on room. */
function positionMenu() {
  const rect = paletteTrigger.getBoundingClientRect();
  const gap = 6;
  const margin = 12;

  const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
  const spaceAbove = rect.top - gap - margin;
  const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;

  paletteMenu.style.width = `${rect.width}px`;
  paletteMenu.style.left = `${rect.left}px`;
  paletteMenu.style.maxHeight = `${Math.max(openUp ? spaceAbove : spaceBelow, 120)}px`;

  if (openUp) {
    paletteMenu.style.top = 'auto';
    paletteMenu.style.bottom = `${window.innerHeight - rect.top + gap}px`;
  } else {
    paletteMenu.style.bottom = 'auto';
    paletteMenu.style.top = `${rect.bottom + gap}px`;
  }
}

function closeMenu(focusTrigger = true) {
  paletteMenu.hidden = true;
  paletteSelect.classList.remove('open');
  paletteTrigger.setAttribute('aria-expanded', 'false');
  if (focusTrigger) paletteTrigger.focus();
}

function onMenuKeydown(event: KeyboardEvent) {
  const options = Array.from(paletteMenu.querySelectorAll<HTMLElement>('.select-option'));
  const index = options.indexOf(document.activeElement as HTMLElement);

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      options[(index + 1) % options.length]?.focus();
      break;
    case 'ArrowUp':
      event.preventDefault();
      options[(index - 1 + options.length) % options.length]?.focus();
      break;
    case 'Home':
      event.preventDefault();
      options[0]?.focus();
      break;
    case 'End':
      event.preventDefault();
      options[options.length - 1]?.focus();
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      if (index >= 0) selectPalette(options[index].dataset.key as string);
      break;
    case 'Escape':
      event.preventDefault();
      closeMenu();
      break;
    case 'Tab':
      closeMenu(true);
      break;
  }
}

function selectPalette(key: string) {
  const palette = PALETTES[key];
  if (!palette) return;

  currentPalette = palette;
  currentPaletteKey = key;

  syncTrigger();
  redraw();
  closeMenu();
}

function syncTrigger() {
  paletteValue.textContent = PALETTES[currentPaletteKey]?.name ?? currentPalette.name;

  paletteMenu.querySelectorAll<HTMLElement>('.select-option').forEach(option => {
    const selected = option.dataset.key === currentPaletteKey;
    option.setAttribute('aria-selected', selected ? 'true' : 'false');
    option.classList.toggle('is-active', selected);
  });

  updateSwatch();
}

function updateSwatch() {
  if (paletteSwatch) paletteSwatch.style.setProperty('--swatch-color', currentPalette.bg);
}

function redraw() {
  if (!engine) return;
  engine.drawPattern(
    currentPattern.id,
    currentVariant,
    hexToNum(currentPalette.bg),
    hexToNum(currentPalette.icon),
    currentRotation,
    currentFlip
  );
}

function randomize(initial = false) {
  currentPattern = randomPattern();
  currentPalette = randomPalette();
  currentPaletteKey = PALETTE_KEYS.find(k => PALETTES[k] === currentPalette) ?? 'pink';
  currentVariant = Math.floor(Math.random() * currentPattern.variants);
  currentRotation = randomRotation();
  currentFlip = Math.random() < 0.5 ? 0 : 1;

  syncTrigger();
  redraw();

  if (initial && import.meta.env.DEV) {
    (window as any).__claudie = {
      draw: (patternKey: string, variant: number, rotation: number, paletteKey: string, flip: number = 0) => {
        const p = PATTERNS.find(x => x.key === patternKey);
        if (!p) return;
        currentPattern = p;
        currentVariant = variant;
        currentRotation = rotation;
        currentFlip = flip;
        if (paletteKey && PALETTES[paletteKey]) {
          currentPalette = PALETTES[paletteKey];
          currentPaletteKey = paletteKey;
        }
        syncTrigger();
        redraw();
      },
    };
  }
}

function download() {
  if (!engine) return;

  redraw();

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = 512;
  exportCanvas.height = 512;
  const exportCtx = exportCanvas.getContext('2d');
  if (!exportCtx) return;

  exportCtx.drawImage(canvas, 0, 0);

  const link = document.createElement('a');
  link.download =
    `claudie-${currentPattern.key}-${currentPaletteKey}-v${currentVariant}-r${currentRotation}` +
    `${currentFlip ? '-m' : ''}.png`;
  link.href = exportCanvas.toDataURL('image/png');
  link.click();
}

init();
