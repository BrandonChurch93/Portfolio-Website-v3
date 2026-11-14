// Skills and About as built, at /lab/skills: where everything stands. The page is laid out on a board 1460 units
// wide that is drawn as wide as the screen, up to a width, so a unit is a pixel on a 1460 wide screen. The places
// are the fuller draft's (src/skills-about/draft.ts), which he approved round by round. The rows of skills are as
// tall as their words, so where About starts is read off the page.

export const BOARD = { w: 1460, most: 2400, least: 1100 } as const;
export const CX = BOARD.w / 2;

// Skills: the title and the headphones over the desk's far end, the desk, and the three rows under it. Everything is
// measured down from the top of the section.
export const SKILLS = {
  // How far above the section the stream leaves the middle of the page for the lamp.
  lead: 150,
  // How far down the section the stream's leading end is when the title comes on.
  cue: 96,
  title: { x: 820, y: 110 },
  // The headphones' hook: the middle of its plate.
  phones: { x: 1168, y: 58, w: 150, h: 170 },
  // The bench's own picture: it is drawn from the front left and above, and frames a fixed height of its scene, so
  // its host's height sets how large the desk is. This puts the desk's near left corner where the draft has it.
  desk: { x: -20, y: 14, w: 1340, h: 808 },
  // The line the stream falls down beside the rows.
  spine: 124,
  rows: { l: 190, r: 1310, t: 872, least: 180 },
  // A row's thing: the room it is given, how tall its host is, and how far left of the row's edge the stream meets it.
  thing: { w: 160, host: 220, wide: 300, meet: 4 },
  foot: 44,
} as const;

// About: his portrait is the ground of the section, the words stand over its faded left side and are centered on him
// top to bottom. Everything is measured down from the top of the section. Angles are in degrees under level.
export const ABOUT = {
  h: 1010,
  // How far his portrait moves as the cursor crosses the screen.
  lean: 40,
  // The reflector: the middle of its face, how its face looks on the screen (degrees above level, to the right),
  // and its host's height.
  reflector: { x: 124, y: 40, face: 43, host: 260 },
  // The line he drew for the stream behind him: it leaves the middle of the studio light's lens at this angle, down
  // and to the left, and goes in under his outline this far down his portrait. through is a point of that line, and
  // the lens stands this far along it from there.
  line: { through: [1366, 126.85] as [number, number], angle: 52, lens: 45, enter: 0.47 },
  light: { host: 300 },
  words: { l: 190, w: 470, title: 262, tabs: 358, text: 429 },
  portrait: { x: 500, y: 100, w: 900, h: 873 },
  // How far under the foot of his portrait the stream is still on its line through him, and how far down his
  // portrait its riding shards are taken up again: where his outline has begun to let the stream back in.
  under: 16,
  shows: 0.9,
  // The glow behind him, as the draft has it: the middle of it down his portrait, and how far it reaches each way.
  glow: { at: 0.42, rx: 590, ry: 440 },
  // The light the studio light throws: how far past where the stream goes in behind him it reaches, and how wide it
  // spreads, as a share of how far it reaches.
  beam: { past: 330, wide: 0.46 },
} as const;

export const TAIL = 260;

const RAD = Math.PI / 180;

// The way the studio light throws, and the places on the line he drew, in the board's units from the top of About.
export function throwLine() {
  const L = ABOUT.line, P = ABOUT.portrait, a = L.angle * RAD, along: [number, number] = [-Math.cos(a), Math.sin(a)];
  const at = (d: number): [number, number] => [L.through[0] + along[0] * d, L.through[1] + along[1] * d];
  const down = (y: number) => (y - L.through[1]) / along[1];
  return { along, lens: at(L.lens), enter: at(down(P.y + P.h * L.enter)), shows: at(down(P.y + P.h * ABOUT.shows)), out: at(down(P.y + P.h + ABOUT.under)) };
}
