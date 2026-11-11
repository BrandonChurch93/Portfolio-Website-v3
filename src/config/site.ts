// Constants the code needs. Each appears once, here.
// Carried from the second build with the 3D pieces. The colors are the second build's and get replaced in Phase 1.

export const SITE_NAME = 'Brandon Church';

// Colors that code needs as numbers (WebGL clears, shaders). The interface reads src/styles/tokens.css.
export const COLORS = { bg: '#0c0a09', amber: '#ff9d3c', accent: '#d4a574', text: '#f5f2ee', waterAmber3d: 0xff9a38 } as const;

export const PIECES = ['city', 'workbench', 'handheld', 'camera', 'rocket'] as const;
export type PieceName = (typeof PIECES)[number];

// A fraction of the viewport height. A piece's scroll progress is measured against this line.
export const READING_LINE = 0.66;
// A piece mounts within this many viewport heights of the screen and disposes beyond the second number. At most max
// pieces hold a WebGL context at once, because browsers drop the oldest context past a small limit.
export const PIECE_MOUNT = { near: 1, far: 2.5, max: 2 } as const;

export type Tier = 'high' | 'mid' | 'low' | 'static';
export const TIERS: readonly Tier[] = ['high', 'mid', 'low', 'static'];
export const TIER_PIXEL_RATIO: Record<Exclude<Tier, 'static'>, number> = { high: 2, mid: 1.5, low: 1 };
// A 3D canvas may go past its tier's ratio, up to the screen's own, while its pixel count stays inside the count the
// tier's ratio gives a 1440 by 900 canvas: a phone's small canvas gets the screen's full density, a large one does not.
export const TIER_PIXEL_BUDGET_AREA = 1440 * 900;
// The GPU timing test draws a fixed load and measures milliseconds per frame. These are the limits per tier.
export const TIER_PROBE = {
  frames: 24,
  highMs: 6,
  midMs: 12,
  bigPixels: 3840 * 2160,
  lowMemoryGb: 4,
  phoneWidth: 600,
} as const;

export const CLOCK = { maxStep: 1 / 20 } as const;

export const LAMP = {
  // Easing toward the cursor, per second. Higher follows faster.
  follow: 9,
  // With no cursor for this long, the lamp drifts on its own.
  idleAfter: 6,
  // The drift: a slow Lissajous over the viewport, leaning toward the last touch.
  drift: { cx: 0.5, cy: 0.38, ax: 0.32, ay: 0.16, fx: 0.11, fy: 0.083, touchLean: 0.45, touchHold: 4 },
  // Depth of the lamp in front of the page, as a fraction of the viewport width.
  depth: 0.42,
} as const;

// With ?hook=1 the page exposes window.__site, which the screenshot scripts drive.
export const HOOK_PARAM = 'hook';
// With ?hook=1&stub=<piece>, that piece is swapped for the contract stub (src/world/stub.ts).
export const STUB_PARAM = 'stub';
export const SETTLE = { frames: 3, timeoutMs: 60000, pictureMs: 15000 } as const;

// Sizes the screenshot scripts use. scripts/shot.mjs keeps its own copy because it runs outside the app.
export type ViewportName = 'phone' | 'tablet' | 'desktop' | 'wide' | '4k';
