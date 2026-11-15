// The launch pad in Contact: where everything stands. Units, one a CSS pixel on a screen 1460 wide, in the pad's own
// frame: the stone lies flat with the middle of its top face at the origin, x to the visitor's right, y up, z toward
// the visitor. What stands where was agreed on the wireframe at /lab/contact-draft (src/contact/plan.ts), and these
// are its places.

// A unit in the stage's metres. The lights, the shadows and the occlusion are set up for a scene a metre or two
// across, as the desk is.
export const SCALE = 0.002;

// The Sun stone: how far across it reaches, how thick its edge is, how deep it is cut, and its rings as shares of
// its radius from the rim in. They are the carving's own (src/stream/stone.ts): the rim with its moat, the sixteen
// plates, the twenty glyphs, the ring round the face, and the face, which the table stands over.
export const STONE = { r: 320, edge: 13, cut: 7, rings: [1, 0.915, 0.6945, 0.5105, 0.456, 0] } as const;
// Where the stream lands: on the outer band, at the end nearest the plate.
export const LAND: [number, number, number] = [280, 0, 0];

// The launch table: a deck on legs that stand on the stone round its boss. How far it reaches to the left, where
// the tower stands on it, and to the right, how deep it is front to back, and how high its top and its underside are.
export const TABLE = { l: -168, r: 120, deep: 150, top: 39, under: 25 } as const;
// The rocket stands on the table with the mouth of its engine this high, and is this tall from there to the tip of
// its spike. Its body is this far across, and its fins reach this far from its axis.
export const ROCKET = { mouth: 46, tall: 538, r: 31, fin: 71, bands: [276, 380], nose: 506 } as const;
// The tower, on the table's left end: between which places across, how deep, how high its top and its lamp are,
// and how high each of its three arms reaches the rocket, all measured as the rocket is, from the stone.
export const TOWER = { l: -145, r: -83, deep: 62, top: 570, lamp: 616, arms: [455, 375, 193] } as const;

// How full the stone has to be for each part of the rocket to light, from the foot up.
export const FUEL = { lower: 0.4, upper: 0.62, nose: 0.84 } as const;
// How long the stone takes to light from its rim to its middle once the stream is on it, in seconds, and how many
// times faster it goes dark again, from its middle out, when the stream draws back.
export const FILL = { run: 2.4, back: 1.6 } as const;
// The launch, in seconds from the moment the stone is full: when the tower's arms draw back, when the rocket leaves
// the table, how hard it climbs (units a second, each second), when it is over, and how many times faster the
// rocket comes back down when the stream draws back.
export const LAUNCH = { arms: 0.35, lift: 1, climb: 70, end: 4.9, back: 2.6 } as const;
// How far the rocket has climbed, so many seconds into the launch.
export const climbed = (age: number) => (age <= LAUNCH.lift ? 0 : LAUNCH.climb * (age - LAUNCH.lift) ** 2);
// How hard the engine burns so many seconds into the launch, 0 to 1: it lights at once, low, and is at full thrust
// as the rocket leaves the table.
export const burn = (age: number) => (age <= 0 ? 0 : Math.min(1, 0.35 + 0.65 * Math.min(1, age / LAUNCH.lift) ** 2));

// How it is looked at: from straight in front and a little above, in degrees, from this far away, in units. The
// stone is seen about a sixth as deep as it is wide.
export const VIEW = { az: 0, el: 10, back: 3000 } as const;
// Its host: this many units wide whatever the screen, with the stone's middle at the middle of its width and this
// far above its foot. The host is as tall as the page makes it, and a taller one shows more of the sky over the
// pad: the rocket climbs out of its top.
export const HOST = { wide: 800, up: 132 } as const;
