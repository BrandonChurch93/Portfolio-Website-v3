// Pictures of the 3D pieces, which a screen too narrow for the live ones shows in their place: a phone, an iPad
// held upright. scripts/world/still.mjs takes each from the real page (npm run still). This file imports nothing,
// so the script reads it as it is.
//
// For each: the file, the page it is taken from, on a screen of what size, at what time on the clock, and what of
// that screen it keeps, in CSS pixels, and how many of the file's pixels a CSS pixel gets (`scale`: two, since the
// screens that show these have two, and at one a picture was stretched to 1.7 times its size on his iPad). `top` scrolls the page first so the top of that piece is at the top of the
// screen, and then what is kept is measured from the piece's own left edge. `least` is the least width it is shown
// at: on a phone a picture is wider than the screen and centred, so what matters in it is large enough to read.
export const STILLS = {
  // The hero's world, from over its spire to under its hollow, with the stream fallen from the core. The screen is
  // as wide as the board, so one of its units is one pixel.
  world: { file: '/media/world-still.webp', route: '/lab/hero?ui=0', screen: [1460, 1500], top: 'world', t: 9, keep: { x: 40, y: 0, w: 1380, h: 1000 }, scale: 2, quality: 0.8, least: 540 },
  // The same world as ?look=d has it (isDrawn in src/pieces/world/layout.ts), cut the same, so the page lays the two
  // out alike. It stands in the world's place where the page is asked for with that look (DRAWN_STILLS).
  worldD: { file: '/media/world-d-still.webp', route: '/lab/hero?look=d&sharp=0&ui=0', screen: [1460, 1500], top: 'world', t: 9, keep: { x: 40, y: 0, w: 1380, h: 1000 }, scale: 2, quality: 0.8, least: 540 },
  // The desk with its lights on and the section's title on its floor.
  desk: { file: '/media/desk-still.webp', route: '/lab/piece/desk?label=0&ui=0&size=808&wide=1460', screen: [1440, 900], top: '', t: 6, keep: { x: 236, y: 96, w: 968, h: 744 }, scale: 2, quality: 0.82, least: 430 },
  // The same desk in the room's light alone, as the page shows it just before the stream lands: the one an iPad held
  // sideways fades into the lit one at the landing (HANDHELD.pictures). Take the two together, so they match.
  deskDark: { file: '/media/desk-dark-still.webp', route: '/lab/piece/desk?label=0&ui=0&size=808&wide=1460&lights=0', screen: [1440, 900], top: '', t: 6, keep: { x: 236, y: 96, w: 968, h: 744 }, scale: 2, quality: 0.82, least: 430 },
  // The launch pad with its stone lit and the rocket on its table, for the foot of Contact.
  pad: { file: '/media/pad-still.webp', route: '/lab/piece/pad?size=860&wide=800&fill=1&label=0&ui=0', screen: [1440, 900], top: '', t: 6, keep: { x: 370, y: 70, w: 700, h: 820 }, scale: 2, quality: 0.82, least: 0 },
  // The night sky alone, for behind his words on a narrow screen's first screen: without it they stood on bare
  // black. Shown at its own size and cut to the screen, so a star is as large on a phone as on an iPad.
  sky: { file: '/media/sky-still.webp', route: '/lab/sky?ui=0&outline=0&city=0&glow=0', screen: [1100, 1400], top: '', t: 6, keep: { x: 0, y: 0, w: 1100, h: 1400 }, scale: 2, quality: 0.8, least: 0 },
  // The three things in the rows of skills, each lit by the stream, for a row on a narrow screen: there a row had
  // its words and no thing at all. Each is its own page at a host 240 tall, cut square round the host's middle.
  // `clear` takes one on a clear ground, as the live thing is drawn: on an iPad held sideways the stream's light is
  // behind it (HANDHELD.pictures), and a picture with the page's ground in it cut a dark square out of that light.
  cpu: { file: '/media/cpu-still.webp', route: '/lab/piece/cpu?size=240&label=0&ui=0&stream=1', screen: [1440, 900], top: '', t: 6, keep: { x: 612, y: 342, w: 216, h: 216 }, scale: 2, quality: 0.86, least: 0, clear: true },
  watch: { file: '/media/watch-still.webp', route: '/lab/piece/watch?size=240&label=0&ui=0&stream=1', screen: [1440, 900], top: '', t: 6, keep: { x: 612, y: 342, w: 216, h: 216 }, scale: 2, quality: 0.86, least: 0, clear: true },
  palette: { file: '/media/palette-still.webp', route: '/lab/piece/palette?size=240&label=0&ui=0&stream=1', screen: [1440, 900], top: '', t: 6, keep: { x: 612, y: 342, w: 216, h: 216 }, scale: 2, quality: 0.86, least: 0, clear: true },
  // About's two things, each without the stream on it and with, for an iPad laid out wide (HANDHELD.pictures):
  // the whole of each one's host, on a clear ground.
  reflector: { file: '/media/reflector-still.webp', route: '/lab/piece/reflector?size=260&wide=260&label=0&ui=0&stream=1', screen: [1440, 900], top: '', t: 6, keep: { x: 590, y: 320, w: 260, h: 260 }, scale: 2, quality: 0.88, least: 0, clear: true },
  reflectorDark: { file: '/media/reflector-dark-still.webp', route: '/lab/piece/reflector?size=260&wide=260&label=0&ui=0', screen: [1440, 900], top: '', t: 6, keep: { x: 590, y: 320, w: 260, h: 260 }, scale: 2, quality: 0.88, least: 0, clear: true },
  studio: { file: '/media/studio-still.webp', route: '/lab/piece/studio-light?size=300&wide=300&label=0&ui=0&stream=1', screen: [1440, 900], top: '', t: 6, keep: { x: 570, y: 300, w: 300, h: 300 }, scale: 2, quality: 0.88, least: 0, clear: true },
  studioDark: { file: '/media/studio-dark-still.webp', route: '/lab/piece/studio-light?size=300&wide=300&label=0&ui=0', screen: [1440, 900], top: '', t: 6, keep: { x: 570, y: 300, w: 300, h: 300 }, scale: 2, quality: 0.88, least: 0, clear: true },
  // What a shared link shows: the hero's first screen at the size link previews ask for. A JPEG, which every
  // service that makes a preview can read.
  share: { file: '/media/share.jpg', route: '/lab/hero?ui=0', screen: [1200, 630], top: '', t: 6, keep: { x: 0, y: 0, w: 1200, h: 630 }, scale: 1, quality: 0.86, least: 0 },
} as const;
export type StillName = keyof typeof STILLS;

// The picture that stands in a piece's place where the page is asked for as ?look=d has the world.
export const DRAWN_STILLS: Partial<Record<StillName, StillName>> = { world: 'worldD' };

// Under this many pixels wide a page shows the pictures and not the live pieces.
export const STILLS_UNDER = 1100;
// A picture of nothing, one pixel square: what a still's image holds on a screen wide enough for the live piece,
// so that a wide screen never fetches the picture.
export const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
