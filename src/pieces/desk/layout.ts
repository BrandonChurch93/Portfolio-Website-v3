// The desk in Skills: where everything stands. Millimetres, in the desk's own frame: the top's surface is y = 0, the
// desk is W long along x, D deep along z with its front edge at z = D / 2, and H tall. The visitor stands at +z, to
// the left and above. What stands where was agreed on the rough bench at /lab/desk (src/desk-drafts/desks.ts), and
// these are its places.
export const DESK = { W: 2000, D: 780, H: 740, SCALE: 0.001 } as const;

// The mat: most of the top, from near the front edge back to just short of the monitor's foot.
export const MAT = { w: 1600, d: 478, x: 0, z: 124, h: 4 } as const;
// The ultrawide: 38 inches, curved, its foot behind the mat.
export const SCREEN = { x: -60, z: -262, w: 900, h: 384, low: 118, curve: 1800 } as const;
// The bay under the far end, where his PC stands with its long glass side to the front. The drawers are toward the
// near end to leave it clear.
export const BAY = { l: 300, r: 820, back: -160, front: 150, h: 520 } as const;

// Where the things on the top stand, from the middle of the top, and how far each is turned, in degrees.
export const PLACES: Record<string, [x: number, z: number, turn: number]> = {
  lamp: [-868, -268, 0],
  tablet: [-600, 150, 22],
  keyboard: [-110, 196, 0],
  mouse: [176, 190, 8],
  camera: [640, 120, -36],
  lens: [742, -30, 0],
  cap: [520, 262, 0],
};

// The top of the lamp's shade, where the stream strikes it.
export const SHADE: [number, number, number] = [-716, 470, -52];
// The lamp's bulb, where the desk's own lamp light stands, and the way the shade opens, which is the way it shines.
export const BULB = { at: [-721, 399, -58] as [number, number, number], aim: [0.233, -0.914, 0.333] as [number, number, number] };

// How it is looked at: from this far round to the left and this far up, in degrees, with a narrow field of view,
// aimed at a point of the desk in metres. It frames a fixed height of its world, in metres, whatever its host's
// width.
export const VIEW = { az: -24, el: 30, fov: 20, aim: [0.02, -0.23, 0] as [number, number, number], tall: 2.04 } as const;
