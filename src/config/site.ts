// Constants the code needs. Each appears once, here. Colors are in ./palette.
import { hex, palette } from './palette';

export const SITE_NAME = 'Brandon Church';
// Where the site is served, for the addresses a shared link carries: the domain he named on Nov 16 (BRIEF.md,
// Settled, Hero, "His résumé, the domain and the striped ground"). He sets up its DNS himself.
export const SITE_URL = 'https://brandonchurchportfolio.com';

// The names the carried 3D pieces use for the palette. waterAmber3d is the stream's color as a number.
export const COLORS = { bg: palette.bg, amber: palette.flame, accent: palette['copper-light'], text: palette.text, waterAmber3d: hex('flame') } as const;

export const PIECES = ['city', 'workbench', 'handheld', 'camera', 'rocket', 'cpu', 'watch', 'screen', 'palette', 'reflector', 'studio-light', 'desk', 'pad', 'skycity', 'world'] as const;
export type PieceName = (typeof PIECES)[number];

// A fraction of the viewport height. A piece's scroll progress is measured against this line.
export const READING_LINE = 0.66;
// A piece mounts within this many viewport heights of the screen and disposes beyond the second number. At most max
// pieces hold a WebGL context at once, because browsers drop the oldest context past a small limit.
// fade: how long a piece made while it is on the screen takes to come on, in milliseconds.
export const PIECE_MOUNT = { near: 1, far: 2.5, max: 6, fade: 260 } as const;
// The small pieces: a canvas a few hundred pixels across, about 40 MB in Safari each where the desk is over 500.
// They are not counted among the pieces that may hold a context at once, on any device, and a handheld mounts them
// from further off than a large piece (HANDHELD.small). Counted, an iPad showed three of Skills' five and left the other two as empty
// places until one of the three was let go, seconds later or never (his iPad, Nov 16).
export const SMALL_PIECES: readonly string[] = ['cpu', 'watch', 'palette', 'reflector', 'studio-light'];

// What a handheld is held to (src/world/device.ts). An iPad's or a phone's browser ends a page that holds more
// graphics memory than it allows: Safari reloads it, and after a few of those says a problem repeatedly occurred.
// The Work page alone, which never did that on his iPad, is the measure: `npm run mem` gives a page's figure.
export const HANDHELD = {
  // The most pixels a 3D canvas has, and a canvas as large as the screen (the stream, the sky).
  piece: 1.6e6,
  // The hero's world, whose canvas is the tallest on the site. Measured in WebKit on Nov 16, the hero held 1128 MB
  // of GPU at 1.1 million pixels and 1319 at 2.4 million: about 150 MB for each million. At 1.1 million an iPad
  // drew the world at under one pixel to a CSS pixel and the city's windows were smears, the first thing he would
  // see on the device he tests on. This is the middle: a little over one pixel to a CSS pixel.
  world: 1.8e6,
  screen: 2.4e6,
  // The longest side of the cursor light's shadow map, and of any other light's: the hero's world's moon at most,
  // every other piece's lights at piece. Measured in WebKit on Nov 20, the desk's and the small pieces' maps at 2048
  // held about 85 MB more at Skills than at 1024.
  shadow: { lamp: 1024, most: 2048, piece: 1024 },
  // The longest side of a picture a piece's materials are made from, the hero's world's aside. The small pieces and
  // the desk drew theirs at 2048 and more for a thing a few hundred pixels across: at 1024 Skills held about 190 MB
  // less (Nov 20).
  texture: 1024,
  // The stream's multisampling.
  samples: 2,
  // A piece is mounted from no further than this many screens away, and let go `past` screens further. And no more
  // than this many hold a WebGL context at once, the small pieces aside (SMALL_PIECES). Measured in WebKit on Nov 20:
  // let go a full screen further, the hero's world was still alive when Skills' pieces were made, and the desk at
  // the foot of the page, about 500 MB of the most the page held and 300 of what it held at its foot.
  reach: 1.25,
  past: 0.3,
  pieces: 3,
  // A small piece is mounted from this many screens away at the most: far enough to be made before it is reached,
  // near enough that the five of them are not all alive from the top of the page (that held 600 MB more), and not
  // while the hero's world is.
  small: 1.5,
  // A plate (Work's cards, a button, Contact's plate) this many screens from the screen gives up its relief, its
  // picture and its pixels, and makes them again as it comes back (src/metal/renderer.ts). Work's sixteen cards held
  // about 300 MB from the first screen on (Nov 20). And a card's picture is held to this many pixels on its longest
  // side: the window it is shown in is about 700 across.
  plates: 1.5,
  photo: 1024,
  // Whether the night sky is drawn once and kept as a picture, its WebGL context let go, with meteors and a few
  // twinkling stars laid over it as plain elements the browser animates (src/hero/sky/alive.ts). Its context held
  // about 175 MB on the first screen (Nov 20). Left live: he asked for more going on in the sky (Nov 16), so stilling
  // it on an iPad is his to say. 'still' is the switch.
  sky: 'live' as 'still' | 'live',
  // On an iPad held sideways these are pictures in place of the live pieces (src/skills/pictures.ts): the desk
  // dark and lit, crossfaded as its lights come on, and the rows' things, each wiped on from its strike. His ruling of
  // Nov 20: the page held about 2000 MB at Skills there with them live.
  pictures: ['desk', 'cpu', 'watch', 'palette'] as readonly string[],
  // The most pixels of the picture of the hero's city at the screen's own density (src/pieces/world/sharp.ts), a
  // plain 2D canvas of about 9 bytes a pixel in WebKit: an iPad's whole city at two pixels to a CSS pixel.
  sharp: 4e6,
} as const;
// The same on a desktop, where memory is no limit: a city 2400 wide at three.
export const SHARP = { pixels: 2.4e7 } as const;

export type Tier = 'high' | 'mid' | 'low' | 'static';
export const TIERS: readonly Tier[] = ['high', 'mid', 'low', 'static'];
export const TIER_PIXEL_RATIO: Record<Exclude<Tier, 'static'>, number> = { high: 2, mid: 1.5, low: 1 };
// A 3D canvas may go past its tier's ratio, up to the screen's own, while its pixel count stays inside the count the
// tier's ratio gives a 1440 by 900 canvas: a phone's small canvas gets the screen's full density, a large one does not.
export const TIER_PIXEL_BUDGET_AREA = 1440 * 900;
// A screen whose shorter side is under this many CSS px is a phone. An iPad is not one, held either way.
export const PHONE_SIDE = 600;
// The GPU timing test draws a fixed load and measures milliseconds per frame. These are the limits per tier.
export const TIER_PROBE = {
  frames: 24,
  highMs: 6,
  midMs: 12,
  bigPixels: 3840 * 2160,
  lowMemoryGb: 4,
  phoneWidth: PHONE_SIDE,
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

// The home page's address.
export const HOME = '/';
// Whether the site is on its own domain and may be found by a search engine. Until he says so, no page is indexed
// (src/app/layout.tsx, src/app/robots.ts).
export const LAUNCHED = false;
