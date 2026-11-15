// The keyboard on the desk: a wireless 75 percent board in a machined case. Millimetres. The board's own frame has
// its origin at the middle of the plate's top, x across, z toward the visitor, and is tipped back by the case's
// typing angle.

export const U = 19.05;
export const D2R = Math.PI / 180;

// The keys' field: 16 keys wide, six rows deep with the function row set a quarter of a key apart.
export const BOARD = { w: 16 * U, d: 6.25 * U } as const;

// The case: how far its rim stands round the keys, its corners, its height at the front edge, the typing angle in
// degrees, the feet it stands on, the height of the seam between its tray and its top, and how far the plate sits
// under the rim.
export const CASE = { bezel: 9.5, r: 7, front: 13.5, tilt: 5, feet: 1.2, seam: 6.9, plate: 2.5 } as const;
export const CW = BOARD.w + 2 * CASE.bezel;
export const CD = BOARD.d + 2 * CASE.bezel;

// A cap: where its skirt starts above the plate, the switch housing under it, the gap between neighbours, the dish
// across its top and the round of its top edge.
export const CAP = { y: 7, housing: 5.5, gap: 0.95, dish: 0.55, fillet: 0.9 } as const;
// The sculpted profile, row by row from the back: each row's height and how far its top leans back, in degrees.
export const ROW = {
  h: [9.6, 9.2, 8.0, 7.6, 8.0, 8.4],
  tilt: [9, 7, 3, -1, -5, -8],
  at: [0.5, 1.75, 2.75, 3.75, 4.75, 5.75],
} as const;

export interface Key { i: number; x: number; z: number; w: number; row: number; legend: string; accent: boolean }

// A string is a key one unit wide, [legend, width] a wider one, a number a gap.
type Entry = string | [string, number] | number;
const ROWS: Entry[][] = [
  ['esc', 0.25, 'F1', 'F2', 'F3', 'F4', 0.25, 'F5', 'F6', 'F7', 'F8', 0.25, 'F9', 'F10', 'F11', 'F12', 0.25, 'del'],
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', ['back', 2], 'home'],
  [['tab', 1.5], 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', ['\\', 1.5], 'pgup'],
  [['caps', 1.75], 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", ['enter', 2.25], 'pgdn'],
  [['shift', 2.25], 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', ['shift', 1.75], '↑', 'end'],
  [['ctrl', 1.25], ['◇', 1.25], ['alt', 1.25], ['', 6.25], 'alt', 'fn', 'ctrl', '←', '↓', '→'],
];
const ACCENT = new Set(['enter']);

export const KEYS: Key[] = (() => {
  const out: Key[] = [];
  ROWS.forEach((row, r) => {
    let u = 0;
    for (const e of row) {
      if (typeof e === 'number') { u += e; continue; }
      const [legend, w] = typeof e === 'string' ? [e, 1] : e;
      out.push({ i: out.length, x: -BOARD.w / 2 + (u + w / 2) * U, z: -BOARD.d / 2 + ROW.at[r] * U, w, row: r, legend, accent: ACCENT.has(legend) });
      u += w;
    }
  });
  return out;
})();

// The volume knob, in the last place of the function row.
export const KNOB = { x: -BOARD.w / 2 + 15.5 * U, z: -BOARD.d / 2 + ROW.at[0] * U, r: 9.2, h: 12 } as const;

// Where the light under the keys is kept, as a grid over the board's frame: fine for the plate between the caps,
// coarse and wide for what spills onto the case's rim and the mat round it.
export interface Grid { x0: number; z0: number; cell: number; nx: number; nz: number }
const grid = (margin: number, cell: number, w: number, d: number): Grid => {
  const nx = Math.ceil((w + 2 * margin) / cell), nz = Math.ceil((d + 2 * margin) / cell);
  return { x0: -(nx * cell) / 2, z0: -(nz * cell) / 2, cell, nx, nz };
};
export const SHARP = grid(6, 3, BOARD.w, BOARD.d);
export const SOFT = grid(80, 6, CW, CD);

// The legends' atlas: the board's field seen from above, at this many pixels a millimetre.
export const ATLAS = { w: 2048, h: 1024, x0: -BOARD.w / 2 - 4, z0: -BOARD.d / 2 - 4 } as const;
export const ATLAS_PX = ATLAS.w / (BOARD.w + 8);
