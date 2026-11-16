// Pictures of the 3D pieces, which a screen too narrow for the live ones shows in their place: a phone, an iPad
// held upright. scripts/world/still.mjs takes each from the real page (npm run still). This file imports nothing,
// so the script reads it as it is.
//
// For each: the file, the page it is taken from, on a screen of what size, at what time on the clock, and what of
// that screen it keeps, in CSS pixels. `top` scrolls the page first so the top of that piece is at the top of the
// screen, and then what is kept is measured from the piece's own left edge. `least` is the least width it is shown
// at: on a phone a picture is wider than the screen and centred, so what matters in it is large enough to read.
export const STILLS = {
  // The hero's world, from over its spire to under its hollow, with the stream fallen from the core. The screen is
  // as wide as the board, so one of its units is one pixel.
  world: { file: '/media/world-still.webp', route: '/lab/hero?ui=0', screen: [1460, 1500], top: 'world', t: 9, keep: { x: 40, y: 0, w: 1380, h: 1000 }, quality: 0.8, least: 540 },
  // The desk with its lights on and the section's title on its floor.
  desk: { file: '/media/desk-still.webp', route: '/lab/piece/desk?label=0&ui=0&size=808&wide=1460', screen: [1440, 900], top: '', t: 6, keep: { x: 236, y: 96, w: 968, h: 744 }, quality: 0.82, least: 430 },
} as const;
export type StillName = keyof typeof STILLS;

// Under this many pixels wide a page shows the pictures and not the live pieces.
export const STILLS_UNDER = 1100;
// A picture of nothing, one pixel square: what a still's image holds on a screen wide enough for the live piece,
// so that a wide screen never fetches the picture.
export const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
