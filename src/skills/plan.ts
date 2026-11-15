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
  // The headphones: where the band bears on its hook, and how tall their host is. The pair with its hook fills about
  // seven tenths of that.
  phones: { x: 1168, y: 80, host: 210 },
  // The bench's own picture: it is drawn from the front left and above, and frames a fixed height of its scene, so
  // its host's height sets how large the desk is. This puts the desk's near left corner where the draft has it.
  desk: { x: -20, y: 14, w: 1340, h: 808 },
  // The line the stream falls down beside the rows.
  spine: 124,
  rows: { l: 190, r: 1310, t: 872, least: 180 },
  // A row's thing: the room it is given, how tall and wide its host is, how far left of the row's edge the stream
  // meets it, and how far above the row's middle, in host heights. The CPU is struck at its near left corner, which
  // is that far above the middle of the board as it is seen, so its host stands that much higher and the board sits
  // in the middle of its row.
  thing: { w: 160, host: 220, wide: 300, meet: 4, rise: 0.09 },
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
  // portrait it is drawn again: at its foot, where his picture has faded away.
  under: 16,
  shows: 0.99,
  // The glow behind him, as the draft has it: the middle of it down his portrait, and how far it reaches each way.
  glow: { at: 0.42, rx: 590, ry: 440 },
  // The light the studio light throws: how far past where the stream goes in behind him it reaches, and how wide it
  // spreads, as a share of how far it reaches.
  beam: { past: 330, wide: 0.46 },
} as const;

export const TAIL = 260;

// The headphones swing as a pendulum that loses its swing: how long one swing takes, how long it takes to lose most
// of it, how far the lamp's strike rocks them and the most a brush of the cursor does, in degrees, and how long a
// knock is followed for.
export const SWING = { period: 1.05, dies: 0.95, struck: 5, brush: 6, lasts: 7 };
// One knock's swing, in degrees, so many seconds after a knock of so many degrees.
export const swingOf = (a: number, e: number): number => (e > 0 && e < SWING.lasts ? a * Math.exp(-e / SWING.dies) * Math.sin((2 * Math.PI * e) / SWING.period) : 0);

const RAD = Math.PI / 180;

// The way the studio light throws, and the places on the line he drew, in the board's units from the top of About.
export function throwLine() {
  const L = ABOUT.line, P = ABOUT.portrait, a = L.angle * RAD, along: [number, number] = [-Math.cos(a), Math.sin(a)];
  const at = (d: number): [number, number] => [L.through[0] + along[0] * d, L.through[1] + along[1] * d];
  const down = (y: number) => (y - L.through[1]) / along[1];
  return { along, lens: at(L.lens), enter: at(down(P.y + P.h * L.enter)), shows: at(down(P.y + P.h * ABOUT.shows)), out: at(down(P.y + P.h + ABOUT.under)) };
}
