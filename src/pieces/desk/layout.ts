// The desk in Skills: where everything stands. Millimetres, in the desk's own frame: the top's surface is y = 0, the
// desk is W long along x, D deep along z with its front edge at z = D / 2, and H tall. The visitor stands at +z, to
// the left and above. What stands where was agreed on the rough bench at /lab/desk (src/desk-drafts/desks.ts), and
// these are its places.
export const DESK = { W: 2000, D: 780, H: 740, SCALE: 0.001 } as const;

// The mat: most of the top, from near the front edge back to just short of the monitor's foot.
export const MAT = { w: 1600, d: 478, x: 0, z: 124, h: 4 } as const;
// The ultrawide: 38 inches, curved, its foot behind the mat.
export const SCREEN = { x: -60, z: -262, w: 900, h: 384, low: 118, curve: 1800 } as const;
// The bay under the far end, where his PC stands, turned so that its two glass sides face the visitor and its back
// cannot be seen: he ruled that. Turned, it is deeper front to back than it was square. The drawers are toward the
// near end to leave the bay clear.
export const BAY = { l: 290, r: 830, back: -290, front: 290, h: 520 } as const;
// How far the PC is turned from square, in degrees about the upright. The page looks at the desk from 24 degrees
// round to the left: at this turn the long glass side and the glass end both face that way, the long side the more, and all three end fans read through the glass end. Its builder compared six angles and chose it.
export const PC_TURN = -65;

// Where the things on the top stand, from the middle of the top, and how far each is turned, in degrees.
export const PLACES: Record<string, [x: number, z: number, turn: number]> = {
  lamp: [-868, -268, 0],
  tablet: [-600, 150, 22],
  keyboard: [-110, 196, 0],
  // The mouse is turned a little toward the keyboard, as it lies under a hand: seen square from behind it was a
  // smooth pebble, and turned as far as 40 it was seen side on, with its wheel and the split of its buttons beyond
  // its crest.
  mouse: [176, 190, 20],
  // The camera, its second lens and its cap are composed by their own part (ARRANGE in parts/camera.ts).
  // The pencil lies square to the desk's front edge, in clear mat between the tablet and the keyboard: beside the
  // tablet at the tablet's angle it read as part of the tablet.
  pencil: [-385, 170, 0],
  // The headphones' stand: at the back right of the top, across from the lamp, in the timber beside the monitor.
  headphones: [770, -262, 0],
};

// The word that lies on the floor under the two drawers, as a word on a rug would lie: where its middle is, how tall
// its capitals are, and how far apart its letters are set, as a share of that.
// It lies far enough under the desk that the shadow the top throws from the cursor's light can fall across it, which
// he asked for, and no further: at 40 he found it too deep into the desk, and asked for about half way back to where
// it began, which was 150.
export const WORD = { text: 'SKILLS', x: -250, z: 95, cap: 170, space: 0.06 } as const;

// The top of the lamp's shade, where the stream strikes it.
export const SHADE: [number, number, number] = [-716, 470, -52];
// The lamp's bulb, where the desk's own lamp light stands, and the way the shade opens, which is the way it shines.
export const BULB = { at: [-721, 399, -58] as [number, number, number], aim: [0.233, -0.914, 0.333] as [number, number, number] };

// How it is looked at: from this far round to the left and this far up, in degrees, with a narrow field of view,
// aimed at a point of the desk in metres. It frames a fixed height of its world, in metres, whatever its host's
// width.
export const VIEW = { az: -24, el: 30, fov: 20, aim: [0.02, -0.23, 0] as [number, number, number], tall: 2.04 } as const;
