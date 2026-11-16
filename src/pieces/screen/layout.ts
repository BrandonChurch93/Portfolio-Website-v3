// Where everything on the screen's back is, in millimetres. The panel stands in the xy plane with its back facing
// +z, toward the viewer, so the back is read with x to the right and y up. The tray's back is z = 0, and the front
// glass is at z = GLASS.z0. Boards stand off the tray on bosses; a board's top is the face the parts sit on.

export type P2 = [number, number];
export type P3 = [number, number, number];

export const DEG = Math.PI / 180;

// The panel: its steel tray, the bezel's lip a hair proud of it all round, and the glass in front.
export const PANEL = { w: 320, h: 200 } as const;
export const TRAY = { x0: -160, x1: 160, y0: -100, y1: 100, z0: -9, cham: 1.4 } as const;
export const BEZEL = { out: 1.1, z0: -11.4, z1: -8.7 } as const;
export const GLASS = { z0: -12.6, z1: -11.4, out: 1.4 } as const;

// The stream meets it at its left most point in the picture: the glass's front edge on the left, half way up.
export const STRIKE: P3 = [TRAY.x0 - GLASS.out, 0, GLASS.z0];

export interface Board { name: 'power' | 'main' | 'driver' | 'button'; x0: number; x1: number; y0: number; y1: number; z: number; t: number; holes: P2[] }
const board = (name: Board['name'], x0: number, x1: number, y0: number, y1: number, z: number, t: number, inset = 4.5): Board => ({
  name, x0, x1, y0, y1, z, t,
  holes: [[x0 + inset, y0 + inset], [x1 - inset, y0 + inset], [x0 + inset, y1 - inset], [x1 - inset, y1 - inset]],
});
export const POWER = board('power', -151, -64, -88, 42, 5, 1.6);
export const MAIN = board('main', -46, 50, -20, 46, 5, 1.6);
export const DRIVER = { ...board('driver', -138, 138, 84, 95, 1.6, 1.0, 3.2), holes: [[-134, 89.5], [-46, 89.5], [46, 89.5], [134, 89.5]] as P2[] };
export const BUTTON = { ...board('button', 112, 150, -97, -84, 3, 1.2, 3.2), holes: [[115.5, -90.5], [146.5, -90.5]] as P2[] };
export const BOARDS = [POWER, MAIN, DRIVER, BUTTON];
export const top = (b: Board) => b.z + b.t;

// The power board: the input at the struck edge, the fuse, the choke, the bridge, the bulk capacitor, the
// transformer, the heat sink with its two packages, the output capacitors and the two connectors out.
export const PB = {
  input: [-144, 2] as P2,
  fuse: [-137, 24] as P2,
  xcap: [-136, -22] as P2,
  choke: [-118, 22] as P2,
  bridge: [-116, -4] as P2,
  bulk: [-97, 22] as P2,
  xfmr: [-100, -30] as P2,
  sink: [-136, -62] as P2,
  outs: [[-77, -6, 5, 14], [-77, 9, 5, 14], [-79, 25, 4, 11]] as [number, number, number, number][],
  opto: [-113, -58] as P2,
  harness: [-69, -62] as P2,
  lamp: [-71, 36] as P2,
} as const;

// The main board: the scaler under its heat sink, the ports along its lower edge, the connectors out.
export const MB = {
  scaler: [2, 14] as P2,
  ports: [
    { kind: 'jack', x: -37, w: 9.4 },
    { kind: 'dp', x: -20, w: 16.2 },
    { kind: 'hdmi', x: -1.5, w: 15.2 },
    { kind: 'hdmi', x: 16.5, w: 15.2 },
    { kind: 'usb', x: 35, w: 13.4 },
  ] as { kind: 'jack' | 'dp' | 'hdmi' | 'usb'; x: number; w: number }[],
  ribbon: [24, 42] as P2,
  buttons: [46.5, -6] as P2,
  harness: [-41.5, -4] as P2,
  flash: [-24, 30] as P2,
  xtal: [-22, 12] as P2,
  ram: [30, 18] as P2,
  caps: [[-36, 36, 3, 5.6], [-36, 25, 3, 5.6]] as [number, number, number, number][],
  coils: [[-30, -8], [-18, -8]] as P2[],
} as const;

// The driver board's connector, its timing chip, and the flex tabs that wrap the panel's top edge.
export const DB = { ribbon: [-24, 88] as P2, tcon: [-4, 89.5] as P2, cofs: Array.from({ length: 8 }, (_, k) => -122.5 + k * 35) } as const;
export const COF = { w: 13, chip: [10, 1.4, 0.55] as P3 } as const;
export const BB = { ribbon: [117, -90] as P2, led: [146.5, -89] as P2, keys: [123, 129, 135, 141] } as const;

// The cables: each a path across the tray, in (x, y, z), with its width (or its wire's radius).
export const RIBBON = { w: 16, path: [[24, 44.6, 8.6], [24, 50, 3.4], [24, 63, 1.2], [-24, 63, 1.2], [-24, 78, 1.6], [-24, 85.4, 3.8]] as P3[], tape: [0, 63] as P2 } as const;
export const THIN = { w: 6, path: [[49.2, -6, 7.8], [53, -6, 1.6], [56, -6, 0.9], [56, -80, 0.9], [104, -80, 0.9], [110, -86, 3.0], [114.6, -90, 4.8]] as P3[], tape: [56, -46] as P2 } as const;
export const PAIR = { r: 0.62, pitch: 7, path: [[-71, 38.6, 9.4], [-71, 46, 6], [-80, 60, 1.5], [-110, 68, 1.4], [-150, 68, 1.4], [-156.5, 68, 2.4]] as P3[], tape: [-118, 67] as P2 } as const;
export const HARNESS = { r: 0.68, n: 4, path: [[-69, -62, 11.4], [-66, -62, 13], [-60, -59, 8], [-56, -48, 2.6], [-55, -22, 2.6], [-50, -8, 7], [-41.5, -4, 11.4]] as P3[], tie: 0.45 } as const;

// The stand: a plate on the tray, the hinge standing off it, and the neck cut off under the hinge.
export const VESA = { c: [0, -64] as P2, w: 76, h: 56, t: 2.2, screws: [[-28, -42], [28, -42], [-28, -86], [28, -86]] as P2[] } as const;
export const HINGE = { y: -79, z: 17, r: 7, half: 24, cheek: [3.4, 26, 24] as P3 } as const;
export const NECK = { w: 36, t: 12, y1: -79, y0: -126 } as const;

// The tray's pressed work: a raised plateau at the right with two ribs in it, a rib over the power board, the
// label, and the screws at the top corners.
export const PLATEAU = { x0: 60, x1: 154, y0: -74, y1: 74, h: 1.5, r: 9 } as const;
export const RIBS: { x0: number; x1: number; y: number; w: number; z: number }[] = [
  { x0: 72, x1: 144, y: -50, w: 6, z: PLATEAU.h },
  { x0: 72, x1: 144, y: -26, w: 6, z: PLATEAU.h },
  { x0: -148, x1: -68, y: 52, w: 5.4, z: 0 },
];
export const LABEL = { c: [100, 36] as P2, w: 64, h: 30 } as const;
export const CORNER_SCREWS: P2[] = [[-153, 92], [153, 92], [153, -93]];

// How far the power has come along its way, in millimetres: from the input at the struck edge, over the power
// board, through the harness, over the main board, up the ribbon and along the driver board to its flex tabs; and
// from the power board up the pair to the backlight.
export const RUN = { harness: 275, main: 345, ribbon: 440, thin: 445, driver: 545, pair: 330, leak: 440, screen: 610 } as const;
// How fast the power's front runs, in millimetres a second.
export const SPEED = 700;
