import { FORM, standing } from './form';
import { MIRROR } from './mirror';
import { D2R, HOST, MOONWARD, PYRAMID, SPIRE, VIEW, WORLD, ground } from '../../layout';

// The pyramid's shaders, laid into a physical material (onBeforeCompile) before the world's light (../../light.ts).
// Polished gold is what it mirrors and the lights it catches. What each face mirrors is worked out from the real
// reflected ray at each pixel: the visitor's eye (the view never moves), the face's normal as the casing bends it, and
// each sheet's own small lie. A face that slopes fifty degrees seen nearly level mirrors mostly sky.
// The casing sweeps a little, as a great clad face does: each face's normals turn slowly up toward its apex and faster
// down toward its foot, and across it. The face toward the moon is turned at its heart, low and to the right, to the
// direction half way between the moon and the eye, so the whole face mirrors the moon's glare as the polish spreads it:
// hottest there and falling to a deep rich gold toward the apex and the front arris. Over the glare each sheet mirrors
// sharp what is really before it (./mirror.ts): in the face's bottom tenth the land's skyline as one crisp lit line with
// the paler land under it, cut by the trees and buildings that stand on it. The face turned from the moon mirrors the
// dark sky away from the moon, one long gradient of dark gold, and at its foot the trees really standing before it, lit
// on their side toward the moon, against the city's glow on the horizon, with a few lit windows where a building is met.
// The faces are clad in long unequal sheets in courses of differing heights that thin upward, with dark hairline
// seams; every sheet is pillowed a hair and lies at its own small tilt, so what it mirrors shifts as a whole and breaks
// a little at each seam, and each lip of a seam is turned a hair, so one of them catches a hairline of light. Each sheet
// is a hair off its neighbours in level and carries faint polish lines along it. The arrises and the foot course's edge
// are worn. The capstone is rounded finer, with seams of its own, a crisp pale lip over the reveal and one hot glint at
// its tip. The cursor is mirrored as a long thin streak lying along the slope, on the face the pointer is over only,
// which slides with the pointer, breaks a little at each seam and falls off at its ends.
// How much a place mirrors is then given its color, as polished gold gives it: a redder deep where it mirrors little,
// richest through its middle tones, and paling toward cream only where it mirrors much.

const f = (v: number): string => v.toFixed(5);
const v2 = (a: readonly number[]): string => `vec2( ${f(a[0])}, ${f(a[1])} )`;
const v4 = (a: readonly number[]): string => `vec4( ${a.map(f).join(', ')} )`;
const HALF = PYRAMID.base / 2, TALL = PYRAMID.tall, SLANT = Math.hypot(HALF, TALL);
const SLOPE = Math.atan2(TALL, HALF);
const AX = standing(PYRAMID.x, PYRAMID.z, WORLD.top, PYRAMID.turn);
// The angle between two neighbouring faces' normals.
const TURN = Math.acos(HALF ** 2 / (HALF ** 2 + TALL ** 2));
const unit = (v: readonly number[]): number[] => { const l = Math.hypot(...v); return v.map((x) => x / l); };
const dot3 = (a: readonly number[], b: readonly number[]): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const inWorld = (v: readonly number[]): number[] => [0, 1, 2].map((i) => AX.x[i] * v[0] + AX.y[i] * v[1] + AX.z[i] * v[2]);
const MOON = unit(MOONWARD);
// From a place's distance across a face to its distance from the nearest arris, measured on the face.
const ACROSS = 1 / Math.sqrt(1 + Math.cos(SLOPE) ** 2);
// Which piece a vertex is of, as make.mjs stores it.
export const KIND = { body: 0, plinth: 0.2, bevel: 0.3, neck: 0.5, cap: 1 } as const;
const C = FORM.casing;
// The face toward the moon in the pyramid's own frame: its normal, across it toward its right hand corner as seen,
// and up its slope.
const LIT = { n: [0, HALF / SLANT, TALL / SLANT], a: [1, 0, 0], u: [0, TALL / SLANT, -HALF / SLANT] };
// The direction half way between the moon and the visitor's eye, seen from the face toward the moon, as tilts of that
// face's normal across it and up it: where a face's normal is turned so, it mirrors the moon itself. Worked out from
// the plan as it is (the stage's camera, PYRAMID, MOONWARD), so it follows any change of them.
const HALFWAY = (() => {
  const e = VIEW.el * D2R, aim = SPIRE.tall - (HOST.tall / 2 - HOST.over) / Math.cos(e);
  const eye = [0, aim + VIEW.back * Math.sin(e), VIEW.back * Math.cos(e)];
  const foot = [PYRAMID.x, ground(PYRAMID.x, PYRAMID.z), PYRAMID.z], mid = TALL * 0.37;
  const at = inWorld([0, mid, HALF * (1 - mid / TALL)]).map((v, i) => v + foot[i]);
  const h = unit(unit(eye.map((v, i) => v - at[i])).map((v, i) => v + MOON[i]));
  const c = dot3(h, inWorld(LIT.n));
  return [dot3(h, inWorld(LIT.a)) / c, dot3(h, inWorld(LIT.u)) / c];
})();

// Levels are how much is mirrored: about 0.03 is a near black gold, 0.3 a deep bright one, 1 a bright one at the edge of
// the tone curve's shoulder, and pale from about 2. Places on a face are across it from its middle toward its right
// hand corner as seen, and up it as a height, in units. Angles are in radians.
export const NIGHT = {
  // The foot course alone keeps the plates' old kick toward the moon's half way direction and the old bow, which give
  // it its clean lit band: the kick, how far from an arris it is laid off (`cap` on the capstone) and under the
  // reveal; the bow per unit across and up from its heart.
  kick: { at: [0.018, -0.355], clear: [0.3, 1.6], cap: [0.6, 3.5], top: 2.5 },
  bow: { per: [0.0006, 0.0018], heart: [6, 25] },
  // How each face sweeps: its normals turn by so much for each unit across from the heart, for each unit up the slope
  // above it, and below it, the one turning into the other over `knee` units. The face toward the moon is turned at its
  // heart to the moon's half way direction (HALFWAY), so the glare's hot pole sits there, and its foot turns down fast
  // enough that the land's skyline is mirrored in its bottom tenth; the face turned from it is turned `kick` and turns
  // down gently at its foot, so the trees before it are mirrored about as tall as wide. The capstone's face toward the
  // moon is turned `off` from the half way direction, across and up, and sweeps a little of its own; its face turned
  // from the moon is the deep face as it is at the body's top.
  sweep: {
    lit: { heart: [30, 25], across: 0.0024, up: 0.008, down: 0.02, knee: 4 },
    deep: { heart: [0, 44], kick: -0.3, across: 0.007, up: 0.009, down: 0.0075, knee: 6 },
    cap: { off: [0.05, 0.12], across: 0.003, up: 0.004 },
  },
  // How each sheet lies. The cladding's slow warp, a noise over cells `cells` sheets across and rows up, read at each
  // pixel so tone runs on continuously. Each sheet lies at its own small tilt, up to `sheet`, so what it mirrors
  // shifts as a whole, and is pillowed: its normal turns out toward its edges by `pillow` at most, from 0.5 to 1.5 of
  // that. A share `proud` of sheets stand proud, pillowed by `proudBy` and tilted by up to `proudTilt`; a share `dent`
  // hold a dent `dentR` across, `dentBy` deep in tilt.
  tilt: { warp: 0.0028, cells: [5, 10], pillow: 0.0032, sheet: 0.005, proud: 0.05, proudBy: 0.0045, proudTilt: 0.0025, dent: 0.035, dentR: 2.6, dentBy: 0.006 },
  // The moon's highlight on the foot course, GGX's lobe at two roughnesses, the heart's raised to a power; how much the
  // polish wanders over the face; the share of the moon seen (baked) over which the moon's light comes on; and how much
  // brighter the capstone's polish takes it.
  moon: { body: { rough: 0.5, power: 0.4 }, heart: { rough: 0.34, power: 0.7, sharp: 2.2 }, vary: 0.03, seen: [0.15, 0.7], cap: 1.35 },
  lit: {
    // The moon's glare, which the whole face mirrors: polished sheets that are not perfect spread the moon wide, so
    // how much a place mirrors follows the angle between its reflected ray and the moon. Its level at the moon, its
    // floor far from it (the night's on this side), over what angle in radians it falls and how sharply, and how much
    // of a sheet's own lie moves it (the rest of the lie shows only in what is mirrored sharp).
    glare: { hi: 1.9, lo: 0.36, wide: 0.26, power: 1.2, lie: 0.45 },
    // A faint glow along the horizon on the moon's side: how bright, over what height.
    horizon: [0.12, 0.1],
    // What a sheet mirrors sharp, over the glare, as a share of it: the sky toward the horizon on the moon's side, the
    // land under its skyline (far, a paler band under the skyline over `band` radians, and near), and the skyline
    // itself as one crisp lit line, how bright and how tall in radians.
    sharp: 0.55,
    sky: [0.12, 0.05],
    ground: { far: 1.3, band: 0.05, near: 0.3, line: 2.4, lineWide: 0.006 },
  },
  dark: {
    // The sky away from the moon: overhead, at the horizon with the city's glow along it, and over what height; and a
    // slow fall over the whole sky (how much, over what height), so the face changes all the way down its slope.
    sky: { top: 0.014, horizon: 0.14, wide: 0.28, slow: 0.03, slowWide: 0.6 },
    // The land under the horizon, and how the horizon wanders.
    ground: 0.06,
    wander: [0.003, 47],
    // How much the mirrored world shows at the face's middle and how much more toward grazing (Fresnel).
    fresnel: [0.78, 0.6],
  },
  // What stands before the faces, mirrored where the ray really meets it (./mirror.ts): a crown's level in its shade
  // and on its side toward the moon, how much of the gold's warmer red it takes (autumn leaves in gold), its trunk's
  // width as a share of the crown's, how much it differs from crown to crown, the rim of light where the moon is
  // behind it, and how lumpy its outline is; a building's level and its windows (a cell so wide and tall in units,
  // each window that share of it, the share lit, dimmest and brightest).
  things: { crown: 0.03, lit: 0.26, warm: 0.8, trunk: 0.09, vary: 0.4, rim: 0.3, lumps: [0.06, 0.05, 0.035, 0.025, 0.018], box: 0.045, win: [3.4, 4.4], size: [0.5, 0.45], on: 0.2, light: [1.4, 3.2] },
  // A seam's two lips: each rounded a hair, the upper course's lower lip turned down and the lower course's upper lip
  // turned up, by so much in radians, so each mirrors the night a little above or below what the face does and one of
  // them catches a hairline of light. How tall a lip is, in units.
  lips: { turn: 0.06, tall: 0.22 },
  // The polish: faint lines along each sheet (how far apart, in units, and how much they change it), and how much one
  // sheet differs from the next in level.
  polish: { every: 0.6, by: 0.035, tint: 0.028 },
  // The cursor's light, mirrored on the face the pointer is over and nowhere else: where the pointer's ray meets the
  // face, held `inset` inside its edges and between the heights `rest`; a bright core lying along the slope, so wide and
  // falling to a third so far along it, in a soft body so wide and so long; how far off the lamp stands (so each
  // sheet's own lie moves it and it breaks at the seams); how bright on the face toward the moon and on the other; how
  // far from an arris it is gone; and over how far outside the face the pointer may be before it is gone (a pointer
  // over the other face is outside this one at once, so only one face ever shows it).
  glint: { inset: 9, rest: [8, 70], wide: 1.4, long: 9, body: [5, 22, 0.35], D: 70, power: [4, 1.6], clear: [2, 6], fade: 2.5 },
  // The front arris's line: how much dimmer it is high up than low, and how much it wavers along its length. Its wear:
  // nicks so far apart along it, the share nicked, how much a nick takes, and how much it is rubbed dull.
  arris: { high: 0.5, waver: 0.35, nick: 1.1, nicked: 0.12, nickBy: 0.55, rub: 0.25 },
  // The left hand outline's edge light, kept to almost nothing.
  left: { power: 0.45, lo: -0.05, hi: 0.5 },
  // The joints: how dark a seam between courses is (from the faintest to the darkest seam), how dark an upright joint
  // between sheets, the share of upright joints that show, and over how many pixels a row must be for them to show at
  // all.
  joint: { line: [0.22, 0.42], plate: 0.36, shows: [0.04, 0.2], fade: [3, 6] },
  // The foot course's bevel and the shadow line over it, the neck in the reveal, and the body's level top round the
  // capstone's foot, seen nearly edge on: what it mirrors, the horizon behind, from its left to its right. The bevel on the
  // face toward the moon is never darker than `bevelLo`: a dark line under a pixel between the pale foot course and the
  // bright face stair stepped. The bevel's
  // wear: nicks so far apart along it, the share nicked, how much a nick takes, and how rubbed.
  edges: { bevel: 1.1, bevelLo: 0.4, sunk: [0.15, 2.4], shadow: 0.55, shadowTall: 0.45, neck: 0.012, ledge: [0.12, 0.6], nick: 1.7, nicked: 0.07, nickBy: 0.35, rub: 0.3 },
  // The capstone: a faint groove so far in from its edges, how dark at most; its own seams, so high over its foot and
  // how dark; its one hot glint at the tip, how bright, how far it reaches, and how much of it the face turned from the
  // moon has; and the crisp lip of its foot over the reveal, its rounded edge turned down toward the moon: how wide, how
  // bright, and how much of it the face turned from the moon has.
  cap: { border: 2.8, groove: 0.2, dark: 0.35, seams: [7.5, 15.5], seam: 0.35, tip: [6, 1.6, 0.02], lip: [0.45, 2.6, 0.35] },
};
export type Night = typeof NIGHT;

export const VERT_PARS = `
uniform vec3 uAt;
uniform float uSize;
uniform float uCursor;
uniform vec3 uGlintAt;
varying vec3 vQ;
varying vec3 vNq;
varying vec3 vTv;
varying vec3 vBv;
varying vec3 vRay;
varying float vKind;`;

// The cursor's ray, in the camera's space: the frame stands the glint (uGlintAt) out from the middle of the view by
// the cursor's offset in the host times uCursor, so that offset is the cursor's place on the screen, and the ray
// through it is found with the view as it is drawn (a close view, or a host of another height).
export const VERT = `
vQ = uAt + position * uSize;
vNq = normal;
{
	vec3 tq = vec3( normal.z, 0.0, - normal.x );
	float tl = length( tq );
	tq = tl > 1e-4 ? tq / tl : vec3( 1.0, 0.0, 0.0 );
	vTv = normalize( normalMatrix * tq );
	vBv = normalize( normalMatrix * cross( normal, tq ) );
	vec2 nd = 2.0 * uGlintAt.xy / max( uCursor, 1e-6 );
	vec4 nr = inverse( projectionMatrix ) * vec4( nd, - 1.0, 1.0 );
	vRay = nr.xyz / ( abs( nr.w ) > 1e-6 ? nr.w : 1e-6 );
}
#ifdef WORLD_BAKED
	vKind = aLight.w;
#else
	vKind = 0.0;
#endif`;

// How many of each thing the faces mirror (./mirror.ts): crowns and buildings, the first so many of each before the
// face toward the moon, the rest before the other, and the points of that face's skyline.
export interface Counts { trees: number; boxes: number; litTrees: number; litBoxes: number; skyline: number }

export function frag(N: Night, U: Counts): { PARS: string; COLOR: string; ROUGH: string; NORMAL: string; ENV: string; GRADE: string } {
  const L = N.lit, D = N.dark, G = N.glint, E = N.edges, K = N.cap, J = N.joint, T = N.tilt, M = N.moon, W = N.sweep, H = N.things, PO = N.polish;
  const SK = MIRROR.skyline;
  const capFoot = FORM.cap.from + FORM.cap.reveal;
  const capMid = capFoot + (TALL - capFoot) / 3;
  const sweepK = (s: { across: number; up: number; down: number; knee: number }): string => v4([s.across, s.up, s.down, s.knee]);
  const PARS = `
varying vec3 vQ;
varying vec3 vNq;
varying vec3 vTv;
varying vec3 vBv;
varying vec3 vRay;
varying float vKind;
uniform float uUnit;
uniform vec4 uZen;
uniform vec2 uZenW;
uniform vec3 uRim;
uniform vec3 uDeepC;
uniform vec3 uBodyC;
uniform vec3 uMidC;
uniform vec2 uGradeLo;
uniform vec3 uPaleC;
uniform vec3 uWarmC;
uniform vec3 uLitC;
uniform vec3 uHotC;
uniform vec4 uHotAt;
uniform vec4 uGradeAt;
uniform vec3 uRough;
uniform float uContact;
uniform float uMoonSpec;
uniform mat3 uToWorld;
uniform vec3 uOrigin;
uniform vec4 uTree[ ${Math.max(1, U.trees)} ];
uniform vec4 uBox[ ${Math.max(1, 2 * U.boxes)} ];
uniform float uSkyline[ ${Math.max(2, U.skyline)} ];
float pLipB = 0.0, pPolish = 1.0, pLip = 0.0, pSoft = 1.0, pWarm = 0.0, pEdge = 1e3, pArris = 0.0, pSky = 0.0, pFres = 1.0;
float pyrHash( vec2 p ) {
	vec3 q = fract( vec3( p.xyx ) * vec3( 0.1031, 0.1030, 0.0973 ) );
	q += dot( q, q.yzx + 33.33 );
	return fract( ( q.x + q.y ) * q.z );
}
float pyrNoise( vec2 p ) {
	vec2 i = floor( p ), u = fract( p );
	u = u * u * ( 3.0 - 2.0 * u );
	return mix( mix( pyrHash( i ), pyrHash( i + vec2( 1.0, 0.0 ) ), u.x ), mix( pyrHash( i + vec2( 0.0, 1.0 ) ), pyrHash( i + vec2( 1.0 ) ), u.x ), u.y );
}
// Whether the line between ruled rows k - 1 and k is a seam between courses.
bool pyrSeam( float k, float side ) {
	return mod( k, ${f(C.every)} ) < 0.5 || pyrHash( vec2( k, side * 13.0 + 2.0 ) ) > ${f(C.merge)};
}
// The height of a ruled row's line, from the ruled measure u, which thins the rows upward.
float pyrRowY( float u ) {
	return ${f(C.taper)} * ( sqrt( 1.0 + 2.0 * u / ${f(C.taper)} ) - 1.0 );
}
// The share of a pixel f wide, at d from the middle of a line w wide, that the line covers.
float pyrLine( float d, float w, float f ) {
	f = max( f, 1e-5 );
	return max( 0.0, min( 0.5 * w, d + 0.5 * f ) - max( - 0.5 * w, d - 0.5 * f ) ) / f;
}
// A band between lo and hi, its edges e soft.
float pyrBand( float y, float lo, float hi, float e ) {
	return smoothstep( lo - e, lo + e, y ) * ( 1.0 - smoothstep( hi - e, hi + e, y ) );
}
// GGX's spread of a highlight, as a share of its peak, for the cosine c between a normal and the half way direction,
// at roughness r.
float pyrLobe( float c, float r ) {
	float a2 = max( r * r * r * r, 1e-6 ), d = clamp( c, 0.0, 1.0 );
	d = d * d * ( a2 - 1.0 ) + 1.0;
	return a2 * a2 / max( d * d, 1e-12 );
}
// How a face sweeps at a place s across and y up it: its normal's tilt across and up the slope, from its heart h. k is
// the turn per unit across, up the slope over the heart and under it, and the knee between the two.
vec2 pyrSweep( float s, float y, vec2 h, vec4 k ) {
	float g = ( y - h.y ) * ${f(SLANT / TALL)}, w = max( k.w, 1e-3 );
	float under = - w * ( log( 1.0 + exp( - g / w ) ) - 0.69315 );
	return vec2( k.x * ( s - h.x ), k.y * g + ( k.z - k.y ) * under );
}
const vec3 pMoon = vec3( ${MOON.map(f).join(', ')} );
// The moon's glare, as much as the face mirrors along r: it follows the angle between r and the moon.
float pyrGlare( vec3 r ) {
	float a = acos( clamp( dot( r, pMoon ), - 1.0, 1.0 ) ) / ${f(L.glare.wide)};
	return ${f(L.glare.lo)} + ${f(L.glare.hi - L.glare.lo)} * exp( - pow( a, ${f(L.glare.power)} ) );
}
// The land's skyline round the face toward the moon, at the bearing az, in radians over the horizon.
float pyrSkyline( float az ) {
	float k = clamp( ( az / ${f(D2R)} - ${f(SK.az[0])} ) / ${f((SK.az[1] - SK.az[0]) / (SK.n - 1))}, 0.0, ${f(SK.n - 1.001)} );
	int i = int( floor( k ) );
	return mix( uSkyline[ i ], uSkyline[ i + 1 ], fract( k ) );
}
// What the face toward the moon mirrors sharp along r, which is e over the horizon at the bearing az: the night sky
// toward the moon's side, and under the land's skyline the land, paler toward the skyline, with the skyline itself as
// one crisp lit line. fe is how far e turns across the pixel.
float pyrLitSharp( vec3 r, float e, float az, float fe ) {
	fe = max( fe, 1e-5 );
	float d = e - pyrSkyline( az );
	float sky = ${f(L.sky[1])} + ${f(L.sky[0] - L.sky[1])} * exp( - max( e, 0.0 ) / 0.12 );
	float land = mix( ${f(L.ground.near)}, ${f(L.ground.far)}, exp( min( d, 0.0 ) / ${f(L.ground.band)} ) );
	return mix( land, sky, clamp( 0.5 + d / fe, 0.0, 1.0 ) ) + ${f(L.ground.line)} * pyrLine( d - ${f(L.ground.lineWide * 0.5)}, ${f(L.ground.lineWide)}, fe );
}
// What the face turned from the moon mirrors along r: the dark sky away from the moon, brighter toward the horizon
// where the city's glow lies, and the land under it.
float pyrDeep( vec3 r, float e, float az, float fe ) {
	float l = ${f(D.sky.top)} + ${f(D.sky.horizon - D.sky.top)} * exp( - max( e, 0.0 ) / ${f(D.sky.wide)} ) + ${f(D.sky.slow)} * exp( - max( e, 0.0 ) / ${f(D.sky.slowWide)} );
	float h = e - ${f(D.wander[0])} * ( pyrNoise( vec2( az * ${f(D.wander[1])}, 7.0 ) ) - 0.5 ) * 2.0;
	float land = ${f(D.ground)} * ( 0.8 + 0.4 * pyrNoise( vec2( az * 60.0, 9.0 ) ) );
	return mix( land, l, clamp( 0.5 + h / max( fe, 1e-5 ), 0.0, 1.0 ) );
}
// The trees and buildings before a face, mirrored along r from the place o (world units): the nearest one met, its
// level, and how much of the pixel the things cover, as a share. fr is how far r turns across the pixel, so an
// outline is its pixel's share and a window finer than a pixel fades. Crowns are lumpy, darker inside and lit at the
// rim toward the moon; a building is a dark box with a few of its windows lit, crisp (as much as lights: in the glare
// of the face toward the moon they read as specks of dust). t0..t1 and b0..b1 are the crowns and buildings this face has
// before it.
vec2 pyrThings( vec3 o, vec3 r, float fr, int t0, int t1, int b0, int b1, float lights ) {
	float best = 1e9, lev = 0.0, miss = 1.0, leafy = 0.0;
	vec3 side = cross( r, vec3( 0.0, 1.0, 0.0 ) );
	float sl = length( side );
	side = sl > 1e-4 ? side / sl : vec3( 1.0, 0.0, 0.0 );
	vec3 upv = cross( side, r );
	for ( int i = t0; i < t1; i++ ) {
		vec4 T = uTree[ i ];
		vec3 oc = T.xyz - o;
		float tc = dot( oc, r ), R = T.w;
		if ( tc < R ) continue;
		vec3 cp = r * tc - oc;
		float d = length( cp ), px = max( fr * tc, 1e-4 );
		if ( d > R * 1.25 + px ) continue;
		float th = atan( dot( cp, upv ), dot( cp, side ) ), sd = fract( T.x * 0.137 + T.z * 0.071 ) * 6.2832;
		float Rl = R * ( 1.0 + ${f(H.lumps[0])} * sin( 5.0 * th + sd ) + ${f(H.lumps[1])} * sin( 9.0 * th + 2.3 * sd ) + ${f(H.lumps[2])} * sin( 15.0 * th + 4.1 * sd ) + ${f(H.lumps[3])} * sin( 27.0 * th + 1.7 * sd ) + ${f(H.lumps[4])} * sin( 41.0 * th + 5.3 * sd ) );
		float c = clamp( ( Rl - d ) / px + 0.5, 0.0, 1.0 );
		// Its trunk, from the ground to the crown's middle.
		vec2 rh = r.xz / max( length( r.xz ), 1e-5 );
		float ta = dot( oc.xz, rh ), tt = ta / max( length( r.xz ), 1e-5 ), yy = o.y + r.y * tt - T.y;
		float bark = clamp( ( ${f(H.trunk)} * R - abs( rh.x * oc.z - rh.y * oc.x ) ) / px + 0.5, 0.0, 1.0 ) * step( - R * ${f(MIRROR.crown.lift)}, yy ) * step( yy, 0.0 );
		if ( bark > c && tt < best ) { miss *= 1.0 - bark; best = tt; lev = ${f(H.crown * 0.5)}; leafy = 1.0; continue; }
		if ( c <= 0.0 ) continue;
		miss *= 1.0 - c;
		float t = tc - sqrt( max( R * R - d * d, 0.0 ) );
		if ( t < best ) {
			best = t;
			leafy = 1.0;
			// The crown as a ball of leaf clumps with dark creases between them: each clump lit on its side toward the
			// moon, more on the crown's side toward it, and a rim of light where the moon is behind the crown.
			vec3 nc = ( o + r * t - T.xyz ) / R;
			vec2 lf = vec2( atan( nc.x, nc.z ) * 3.4, asin( clamp( nc.y, - 1.0, 1.0 ) ) * 4.2 ) + sd;
			vec2 ci = floor( lf ), bv = vec2( 0.0 );
			float bh = - 1.0;
			for ( int j = 0; j < 9; j++ ) {
				vec2 cc = ci + vec2( float( j % 3 ) - 1.0, float( j / 3 ) - 1.0 );
				vec2 v = ( lf - cc - vec2( pyrHash( cc + 4.1 ), pyrHash( cc + 9.7 ) ) ) / ( 0.55 + 0.45 * pyrHash( cc + 2.3 ) );
				float hh = 1.0 - dot( v, v );
				if ( hh > bh ) { bh = hh; bv = v; }
			}
			vec3 ta = normalize( vec3( nc.z, 0.0, - nc.x ) + 1e-4 ), tu = cross( nc, ta );
			vec2 m2 = vec2( dot( pMoon, ta ), dot( pMoon, tu ) );
			float lit = max( dot( nc, pMoon ), 0.0 ) * smoothstep( - 0.7, 0.3, nc.y ) * clamp( 0.6 + 0.45 * dot( bv, m2 ), 0.0, 1.0 );
			float crease = smoothstep( - 0.3, 0.6, bh ) * ( 0.8 + 0.4 * pyrNoise( lf * 3.1 + 1.7 ) );
			float rim = smoothstep( 0.7, 1.05, d / Rl ) * max( dot( cp / max( d, 1e-4 ), pMoon ), 0.0 );
			lev = ( mix( ${f(H.crown * 0.3)}, ${f(H.crown)}, crease ) + ${f(H.lit)} * lit * crease ) * ( 1.0 + ${f(H.vary)} * ( fract( sd * 7.13 ) - 0.5 ) ) + ${f(H.rim)} * rim * rim;
		}
	}
	for ( int i = b0; i < b1; i++ ) {
		vec4 A = uBox[ 2 * i ], B = uBox[ 2 * i + 1 ];
		float c = cos( A.w ), s = sin( A.w );
		vec3 p = o - A.xyz;
		p = vec3( c * p.x - s * p.z, p.y, s * p.x + c * p.z );
		vec3 dv = vec3( c * r.x - s * r.z, r.y, s * r.x + c * r.z );
		dv = vec3( abs( dv.x ) > 1e-6 ? dv.x : 1e-6, abs( dv.y ) > 1e-6 ? dv.y : 1e-6, abs( dv.z ) > 1e-6 ? dv.z : 1e-6 );
		vec3 lo = vec3( - B.x, 0.0, - B.y ), hi = vec3( B.x, B.z - A.y, B.y );
		vec3 ta = ( lo - p ) / dv, tb = ( hi - p ) / dv, tn = min( ta, tb ), tf = max( ta, tb );
		float tN = max( max( tn.x, tn.y ), tn.z ), tF = min( min( tf.x, tf.y ), tf.z );
		if ( tN < 1.0 || tN > best ) continue;
		vec3 hp = p + dv * tN, q = abs( hp - 0.5 * ( hi + lo ) ) - 0.5 * ( hi - lo );
		int ax = tN == tn.x ? 0 : ( tN == tn.y ? 1 : 2 );
		float inside = ax == 0 ? - max( q.y, q.z ) : ( ax == 1 ? - max( q.x, q.z ) : - max( q.x, q.y ) );
		float px = max( fr * tN, 1e-4 ), cv = clamp( inside / px + 0.5, 0.0, 1.0 );
		if ( cv <= 0.0 ) continue;
		miss *= 1.0 - cv;
		best = tN;
		leafy = 0.0;
		lev = ${f(H.box)} * ( 0.8 + 0.4 * fract( B.w * 13.7 ) );
		if ( ax != 1 && lights > 0.0 ) {
			vec2 wc = vec2( ( ax == 0 ? hp.z : hp.x ) / ${f(H.win[0])}, hp.y / ${f(H.win[1])} ), wi = floor( wc ), wf = ( fract( wc ) - 0.5 ) * vec2( ${f(H.win[0])}, ${f(H.win[1])} );
			float on = step( 1.0 - ${f(H.on)}, pyrHash( wi + B.w * 91.7 + float( ax ) * 3.1 ) ) * step( 1.0, wi.y ) * step( wi.y + 1.5, ( B.z - A.y ) / ${f(H.win[1])} );
			float win = pyrLine( wf.x, ${f(H.win[0] * H.size[0])}, px ) * pyrLine( wf.y, ${f(H.win[1] * H.size[1])}, px );
			lev += lights * on * win * mix( ${f(H.light[0])}, ${f(H.light[1])}, pyrHash( wi + B.w * 37.1 + 1.3 ) );
		}
	}
	pWarm = leafy * ( 1.0 - miss ) * ${f(H.warm)};
	return vec2( lev, 1.0 - miss );
}
// The light high overhead that the rounded front arris turns to, the glow along the horizon behind that the rounded
// right hand outline turns to, and the city's glow behind the left hand outline, from r: spread is how far r turns
// across the pixel, in radians, which widens their edges and dims them by as much, so a line of them seen in a round
// finer than a pixel is its pixel's average.
float pyrZen( vec3 r, float spread ) {
	float a = acos( clamp( dot( r, uZen.xyz ), - 1.0, 1.0 ) ), a0 = acos( clamp( uZenW.x, - 1.0, 1.0 ) ), a1 = acos( clamp( uZenW.y, - 1.0, 1.0 ) );
	float am = 0.5 * ( a0 + a1 ), aw = min( am + spread, 3.1 );
	return uZen.w * am / aw * ( 1.0 - smoothstep( a1 - spread, a0 + spread, a ) );
}
float pyrRims( vec3 r, float spread ) {
	return uRim.x * ( uRim.z - uRim.y ) / ( uRim.z - uRim.y + 2.0 * spread ) * pyrBand( r.y, uRim.y, uRim.z, 0.03 + spread ) * smoothstep( 0.0, 0.12, r.x );
}
float pyrLeft( vec3 r, float spread ) {
	return ${f(N.left.power * (N.left.hi - N.left.lo))} / ( ${f(N.left.hi - N.left.lo)} + 2.0 * spread ) * pyrBand( r.y, ${f(N.left.lo)}, ${f(N.left.hi)}, 0.03 + spread ) * smoothstep( 0.0, 0.12, - r.x );
}`;

  // After <color_fragment>: how each stone is laid at this pixel (pKick: the face's sweep, and the foot course's kick;
  // pTilt: the sheet's own lie), and the casing's joints, kept for the later steps.
  const COLOR = `
vec2 pTilt = vec2( 0.0 ), pKick = vec2( 0.0 ), pSw = vec2( 0.0 );
float pJoint = 0.0;
{
	vec3 n = normalize( vNq );
	float hl = length( n.xz );
	bool face = abs( n.y - ${f(Math.cos(SLOPE))} ) < 0.002 && hl > 0.5;
	vec2 along = hl > 1e-4 ? vec2( n.z, - n.x ) / hl : vec2( 1.0, 0.0 );
	float s = dot( vQ.xz, along ), y = vQ.y, fy = max( fwidth( y ), 1e-5 ), fs = fwidth( s );
	bool cap = vKind > 0.875, plinth = abs( vKind - ${f(KIND.plinth)} ) < 0.05;
	if ( face && ( vKind < 0.25 || cap ) ) {
		float hw = ${f(HALF)} * ( 1.0 - y / ${f(TALL)} ) + ( plinth ? ${f((FORM.foot.proud * SLANT) / TALL)} : 0.0 );
		float dE = ( hw - abs( s ) ) * ${f(ACROSS)};
		float clear = cap ? smoothstep( ${f(N.kick.cap[0])}, ${f(N.kick.cap[1])}, dE ) : smoothstep( ${f(N.kick.clear[0])}, ${f(N.kick.clear[1])}, dE ) * ( 1.0 - smoothstep( ${f(FORM.cap.from - N.kick.top)}, ${f(FORM.cap.from)}, y ) );
		if ( plinth ) {
			vec2 rel = vec2( s, y * ${f(SLANT / TALL)} ) - vec2( ${f(N.bow.heart[0])}, ${f(N.bow.heart[1] * SLANT / TALL)} );
			pKick = ${v2(N.kick.at)} * clear + rel * ${v2(N.bow.per)};
		} else if ( n.z > 0.5 && cap ) {
			pKick = ( ${v2(HALFWAY)} + ${v2(W.cap.off)} + vec2( ${f(W.cap.across)} * s, ${f(W.cap.up)} * ( y - ${f(capMid)} ) * ${f(SLANT / TALL)} ) ) * clear;
		} else if ( n.z > 0.5 ) {
			pSw = pyrSweep( s, y, ${v2(W.lit.heart)}, ${sweepK(W.lit)} );
			pKick = ( ${v2(HALFWAY)} + pSw ) * clear;
		} else {
			pKick = ( vec2( 0.0, ${f(W.deep.kick)} ) + pyrSweep( s, cap ? ${f(FORM.cap.from)} : y, ${v2(W.deep.heart)}, ${sweepK(W.deep)} ) ) * clear;
		}
	}
	if ( face && vKind < ${f((KIND.body + KIND.plinth) / 2)} ) {
		float side = floor( atan( n.z, n.x ) * 0.6366 + 4.5 ), R = ${f(C.row)};
		float u = y + y * y / ${f(2 * C.taper)}, fu = max( fwidth( u ), 1e-5 );
		// The course this pixel is in: from the seam under it to the seam over it.
		float lo = floor( u / R ), hi = lo + 1.0;
		for ( int i = 0; i < ${C.every - 1}; i++ ) { if ( pyrSeam( lo, side ) ) break; lo -= 1.0; }
		for ( int i = 0; i < ${C.every - 1}; i++ ) { if ( pyrSeam( hi, side ) ) break; hi += 1.0; }
		float yLo = pyrRowY( lo * R ), yHi = pyrRowY( hi * R );
		// The sheets along it, each course its own length.
		float P = ${f(C.plate)} * ( 0.65 + 0.7 * pyrHash( vec2( lo, side * 3.0 + 5.0 ) ) ), off = pyrHash( vec2( lo, side * 7.0 + 1.0 ) ) * P;
		float x = ( s + off ) / P, k = floor( x ), seed = lo + side * 131.0, J = ${f(C.jag)};
		float b0 = k + ( pyrHash( vec2( k, seed ) ) - 0.5 ) * J, b1 = k + 1.0 + ( pyrHash( vec2( k + 1.0, seed ) ) - 0.5 ) * J;
		float col = k, xL = b0, xR = b1;
		if ( x < b0 ) { col = k - 1.0; xR = b0; xL = k - 1.0 + ( pyrHash( vec2( k - 1.0, seed ) ) - 0.5 ) * J; }
		else if ( x >= b1 ) { col = k + 1.0; xL = b1; xR = k + 2.0 + ( pyrHash( vec2( k + 2.0, seed ) ) - 0.5 ) * J; }
		vec2 id = vec2( col + side * 517.0, lo + side * 61.0 );
		float h1 = pyrHash( id ), h2 = pyrHash( id + 17.13 ), h3 = pyrHash( id + 41.71 ), h4 = pyrHash( id + 73.3 );
		vec2 h56 = vec2( pyrHash( id + 97.1 ), pyrHash( id + 131.7 ) ) - 0.5;
		// Seen from far off a row is a few pixels: a sheet's own lie fades out before it can alias.
		float big = smoothstep( 1.5, 4.0, R / fu );
		bool nearL = x - xL < xR - x;
		float ds = ( nearL ? x - xL : xR - x ) * P;
		float shows = smoothstep( ${f(J.shows[0])}, ${f(J.shows[1])}, pyrHash( vec2( nearL ? col : col + 1.0, seed + 0.5 ) ) );
		// The seams fade out before a row is so few pixels that they would read as ribbing. Each is its own depth.
		float hair = smoothstep( ${f(J.fade[0])}, ${f(J.fade[1])}, R / fu );
		float dLo = mix( ${f(J.line[0])}, ${f(J.line[1])}, pyrHash( vec2( lo, side + 9.0 ) ) ), dHi = mix( ${f(J.line[0])}, ${f(J.line[1])}, pyrHash( vec2( hi, side + 9.0 ) ) );
		// The upper lip of the course, just under the seam over it, rounded a hair: it turns up to the bright sky and
		// mirrors it as a pale hairline. Its pixel's share of it, so it fades and never breaks up when it is finer.
		pLip = hair * pyrLine( yHi - ${f(C.line * 0.5 + N.lips.tall * 0.5)} - y, ${f(N.lips.tall)}, fy );
		pLipB = hair * pyrLine( y - yLo - ${f(C.line * 0.5 + N.lips.tall * 0.5)}, ${f(N.lips.tall)}, fy );
		// Faint polish lines along the sheet, and its own level a hair from its neighbours'. The lines fade before they
		// are finer than a pixel.
		float pl = pyrNoise( vec2( ( s + h2 * 50.0 ) / 9.0, ( y - yLo ) / ${f(PO.every)} + h1 * 30.0 ) );
		pPolish = ( 1.0 + ${f(PO.tint)} * ( fract( h1 * 7.31 ) - 0.5 ) * 2.0 ) * ( 1.0 + ${f(PO.by)} * ( pl - 0.5 ) * 2.0 * smoothstep( 2.0, 4.0, ${f(PO.every)} / fy ) );
		pJoint = hair * max( max( dLo * pyrLine( y - yLo, ${f(C.line)}, fy ), dHi * pyrLine( y - yHi, ${f(C.line)}, fy ) ), ${f(J.plate)} * shows * pyrLine( ds, ${f(C.line)}, fs ) );
		// How the sheet lies: at its own small tilt, pillowed so it turns out toward its edges; a few proud, a few dented.
		vec2 ab = vec2( ( x - xL ) / max( xR - xL, 1e-3 ), ( y - yLo ) / max( yHi - yLo, 1e-3 ) ) * 2.0 - 1.0;
		vec2 own = ab * ${f(T.pillow)} * ( 0.5 + h1 ) + h56 * ${f(2 * T.sheet)};
		if ( h4 < ${f(T.proud)} ) own = ab * ${f(T.proudBy)} + ( vec2( h2, h3 ) - 0.5 ) * ${f(2 * T.proudTilt)};
		else if ( h4 > ${f(1 - T.dent)} ) {
			vec2 dc = vec2( mix( - 0.5, 0.5, h2 ), mix( - 0.3, 0.3, h3 ) );
			vec2 de = ( ab - dc ) * 0.5 * vec2( ( xR - xL ) * P, yHi - yLo ) / ${f(T.dentR)};
			own -= ${f(T.dentBy)} * de * exp( - dot( de, de ) );
		}
		// The cladding's slow warp, read at the pixel so it runs on across the seams.
		vec2 wc = vec2( s / ( ${f(C.plate * T.cells[0])} ), u / ( ${f(C.row * T.cells[1])} ) ) + side * 5.31;
		vec2 warp = ( vec2( pyrNoise( wc ), pyrNoise( wc + vec2( 19.7, 4.3 ) ) ) - 0.5 ) * 2.0;
		pTilt = warp * ${f(T.warp)} + own * big;
		pSoft = 1.0 + ( pyrNoise( wc * 2.3 + 11.0 ) - 0.5 ) * 2.0 * ${f(M.vary)};
	}
}
// The faces of the body, the foot course and the capstone, bent near each arris, and the body's faces near their top
// edge, as a round of FORM.round.seen would bend them: so the mirrored line of the night along an arris is as wide as
// that round, smooth at any size, and its edge widened by how far the bend turns across the pixel.
vec3 pBend = vec3( 0.0 );
float pBent = 0.0, pSpread = 0.0;
{
	vec3 n = normalize( vNq );
	float hl = length( n.xz );
	bool face = abs( n.y - ${f(Math.cos(SLOPE))} ) < 0.002 && hl > 0.5;
	float pix = length( fwidth( vQ ) );
	bool plinth = abs( vKind - ${f(KIND.plinth)} ) < 0.05;
	if ( face && ( vKind < 0.25 || vKind > 0.875 ) ) {
		vec2 a = vec2( n.z, - n.x ) / hl;
		float s = dot( vQ.xz, a ), y = vQ.y, hw = ${f(HALF)} * ( 1.0 - y / ${f(TALL)} ) + ( plinth ? ${f((FORM.foot.proud * SLANT) / TALL)} : 0.0 );
		float dR = ( hw - s ) * ${f(ACROSS)}, dL = ( hw + s ) * ${f(ACROSS)}, rd = vKind > 0.875 ? ${f(FORM.round.seen.cap)} : ${f(FORM.round.seen.arris)};
		vec3 nb = dR < dL ? vec3( a.x * hl, n.y, a.y * hl ) : vec3( - a.x * hl, n.y, - a.y * hl );
		pEdge = min( dR, dL );
		float w = 0.5 * ( 1.0 - min( dR, dL ) / rd );
		float top = vKind < 0.125 ? 0.5 * ( 1.0 - ( ${f(FORM.cap.from)} - y ) / ${f(Math.sin(SLOPE) * FORM.round.seen.lip)} ) : 0.0;
		if ( top > w && top > 0.0 ) {
			pBend = normalize( mix( n, vec3( 0.0, 1.0, 0.0 ), top ) );
			pSpread = ${f(SLOPE)} / ${f(FORM.round.seen.lip)} * pix * min( 1.0, top * 10.0 );
			pBent = 1.0;
		} else if ( w > 0.0 ) {
			pBend = normalize( mix( n, nb, w ) );
			pArris = ( n.x + nb.x < 0.0 && n.z + nb.z > 0.0 ) ? 1.0 : 0.0;
			pSpread = ${f(TURN)} / rd * pix * min( 1.0, w * 10.0 );
			pBent = 1.0;
		}
	}
	// A pixel on the real round of an arris is shaded as the bent faces are where they meet it, by the line halfway
	// between the two faces, so the round and the bends either side of it are one: shaded by its own normals, which
	// turn the whole way from face to face, the round broke the line into dots wherever it was under a pixel.
}`;

  const ROUGH = `
roughnessFactor = clamp( vKind > 0.625 ? uRough.y : abs( vKind - ${f(KIND.neck)} ) < 0.05 ? 0.6 : uRough.x, 0.04, 1.0 );`;

  const NORMAL = `
if ( pBent > 0.5 ) normal = normalize( ( viewMatrix * vec4( uToWorld * pBend, 0.0 ) ).xyz );
// The round of an arris is the arris stone's, not a plate's: a plate's own lie there toothed the outline course by
// course.
pTilt *= 1.0 - pBent;
normal = normalize( normal + vTv * ( pTilt.x + pKick.x ) + vBv * ( pTilt.y + pKick.y ) );`;

  // Before <lights_fragment_end>: what the gold mirrors and the lights it catches, in place of the stage's own: the
  // world along the ray each pixel reflects. The foot course's moon highlight is worked out here, by GGX with its own
  // normals, and every light from the moon is as much as the share of the moon the place sees (baked): the stage's own
  // light from the moon is left out (uMoonSpec). The world's light then takes some of the night away where the place is
  // shut in; a mirror is shut in only where what it mirrors is hidden, so most of that is given back and a little
  // contact shadow is kept.
  const ENV = `
float pLevel = 0.0;
{
	vec3 nL = normalize( vNq );
	bool toMoon = nL.z > 0.5;
	vec3 tA = toMoon ? vec3( 1.0, 0.0, 0.0 ) : vec3( 0.0, 0.0, 1.0 );
	vec3 tU = toMoon ? vec3( 0.0, ${f(TALL / SLANT)}, ${f(-HALF / SLANT)} ) : vec3( ${f(HALF / SLANT)}, ${f(TALL / SLANT)}, 0.0 );
	vec3 n0 = normalize( ( viewMatrix * vec4( uToWorld * normalize( nL + tA * pKick.x + tU * pKick.y ), 0.0 ) ).xyz );
	vec3 rv = reflect( - geometryViewDir, normal ), rW = inverseTransformDirection( rv, viewMatrix );
	vec3 r0 = inverseTransformDirection( reflect( - geometryViewDir, n0 ), viewMatrix ), dr = ( rW - r0 ) * uToWorld;
	// Where the place is in the world, and how far the reflected ray turns across the pixel.
	vec3 pW = uOrigin + uToWorld * vQ;
	float fR = max( length( fwidth( rW ) ), 1e-6 );
	vec2 q = vec2( dot( vQ, tA ), vQ.y ), s = vec2( dot( dr, tA ), dot( dr, tU ) * ${f(TALL / SLANT)} );
	vec2 fq = fwidth( q );
	float fB = max( fq.x, fq.y ), pxU = max( length( fwidth( vQ ) ), 1e-5 );
	// Where the ray goes: so far over the horizon and so far round the circle, and how far each turns across the pixel.
	float rE = asin( clamp( rW.y, - 1.0, 1.0 ) ), rAz = atan( rW.x, - rW.z ), fE = fwidth( rE );
	bool neck = abs( vKind - ${f(KIND.neck)} ) < 0.05, bevel = abs( vKind - ${f(KIND.bevel)} ) < 0.05;
	bool ledge = vKind < 0.1 && nL.y > 0.9;
	bool stone = ! neck && ! bevel && ! ledge;
	bool sheet = stone && ( vKind < 0.1 || vKind > 0.875 );
	pFres = ${f(D.fresnel[0])} + ${f(D.fresnel[1])} * pow( 1.0 - clamp( dot( normal, geometryViewDir ), 0.0, 1.0 ), 2.0 );
	vec3 nW = inverseTransformDirection( normal, viewMatrix ), vW = inverseTransformDirection( geometryViewDir, viewMatrix );
	vec3 mW = vec3( ${MOON.map(f).join(', ')} ), hW = normalize( mW + vW );
	float seen = 1.0;
	#ifdef WORLD_BAKED
		seen = smoothstep( ${f(M.seen[0])}, ${f(M.seen[1])}, wLight.y );
	#endif
	// The foot course's moon highlight: the broad body of its blaze and its narrow heart.
	float lobe = 0.0;
	if ( ! neck && ! sheet ) {
		float c = dot( nW, hW ), polish = smoothstep( 0.0, 0.2, dot( nW, mW ) ) * seen;
		lobe = polish * ( ${f(M.body.power)} * pyrLobe( c, ${f(M.body.rough)} * pSoft ) + ${f(M.heart.power)} * pow( pyrLobe( c, ${f(M.heart.rough)} * pSoft ), ${f(M.heart.sharp)} ) );
	}
	if ( neck ) pLevel = ${f(E.neck)};
	else if ( ledge ) pLevel = mix( ${f(E.ledge[0])}, ${f(E.ledge[1])}, smoothstep( - 0.4, 0.6, rW.x ) );
	else if ( bevel ) {
		// Its light is as much as the bevel is seen wide: under a pixel and a half it is a sliver that breaks into dashes.
		float wide = smoothstep( 1.0, 2.0, ${f(FORM.foot.bevel * Math.SQRT2)} / pxU );
		pLevel = ( toMoon ? ${f(E.bevelLo)} : 0.03 ) + ${f(E.bevel)} * smoothstep( 0.45, 0.95, rW.y ) * mix( toMoon ? 0.5 : 0.0, 1.0, wide );
	}
	else if ( sheet && toMoon ) {
		// The whole face mirrors the moon's glare, spread by the polish, and each lip of a seam a little above or below
		// it; over that, sharp, what is really before it.
		vec3 rG = normalize( mix( r0, rW, ${f(L.glare.lie)} ) ), lift = vec3( 0.0, ${f(2 * N.lips.turn)}, 0.0 );
		float g = pyrGlare( rG ) + ${f(L.horizon[0])} * exp( - max( rE, 0.0 ) / ${f(L.horizon[1])} );
		g = mix( mix( g, pyrGlare( normalize( rG + lift ) ), pLip ), pyrGlare( normalize( rG - lift ) ), pLipB );
		float sh = pyrLitSharp( rW, rE, rAz, fE );
		if ( rE < 0.45 ) {
			vec2 th = pyrThings( pW, rW, fR, 0, ${U.litTrees}, 0, ${U.litBoxes}, 0.0 );
			sh = mix( sh, th.x, th.y );
		}
		pLevel = ( g * pPolish + ${f(L.sharp)} * sh ) * seen + ( 1.0 - seen ) * ${f(L.glare.lo)};
		pSky = 1.0;
	}
	else if ( toMoon ) pLevel = lobe;
	else {
		vec3 lift = vec3( 0.0, ${f(2 * N.lips.turn)}, 0.0 );
		// On the round of an arris the face's own night is kept, and the line the round catches is added below: bent,
		// it mirrored a darker sky and drew a dark fringe beside the line.
		float d = pBent > 0.5 ? pyrDeep( r0, asin( clamp( r0.y, - 1.0, 1.0 ) ), atan( r0.x, - r0.z ), fE ) : pyrDeep( rW, rE, rAz, fE );
		d = mix( mix( d, pyrDeep( normalize( rW + lift ), rE + ${f(2 * N.lips.turn)}, rAz, fE ), pLip ), pyrDeep( normalize( rW - lift ), rE - ${f(2 * N.lips.turn)}, rAz, fE ), pLipB ) * pPolish;
		if ( rE < 0.45 ) {
			vec2 th = pyrThings( pW, rW, fR, ${U.litTrees}, ${U.trees}, ${U.litBoxes}, ${U.boxes}, 1.0 );
			d = mix( d, th.x, th.y );
		}
		pLevel = d * pFres + lobe;
	}
	// The front arris's line is brightest low and wavers along its length as a polished round does: of one weight from
	// top to foot it read as a drawn stroke. The outlines are kept faint, and uneven.
	float sp = min( 1.2, pSpread ), wav = 1.0 - ${f(N.arris.waver)} * pyrNoise( vec2( vQ.y / 6.0, 3.0 ) );
	pLevel += pBent * pyrZen( rW, sp ) * mix( 1.0, ( 1.0 - ${f(N.arris.high)} * smoothstep( 15.0, 80.0, vQ.y ) ) * wav, pArris );
	pLevel += pBent * pyrRims( rW, sp ) * ( 1.0 - 0.7 * pyrNoise( vec2( vQ.y / 9.0, 7.0 ) ) );
	pLevel += pBent * pyrLeft( rW, sp ) * ( 1.0 - 0.7 * pyrNoise( vec2( vQ.y / 8.0, 11.0 ) ) );
	// The capstone's one hot glint, at its tip.
	if ( vKind > 0.875 ) {
		vec2 tp = vec2( q.x, ( vQ.y - ${f(TALL)} ) * ${f(SLANT / TALL)} );
		pLevel += ${f(K.tip[0])} * exp( - dot( tp, tp ) / ${f(K.tip[1] * K.tip[1])} ) * ( toMoon ? 1.0 : ${f(K.tip[2])} );
		float dl = ( vQ.y - ${f(capFoot)} ) * ${f(SLANT / TALL)};
		pLevel += ${f(K.lip[1])} * pyrLine( dl - ${f(K.lip[0] * 0.5)}, ${f(K.lip[0])}, max( fwidth( dl ), 1e-5 ) ) * ( toMoon ? 1.0 : ${f(K.lip[2])} );
	}
	#ifdef WORLD_GLINT
	if ( stone && vKind < 0.1 ) {
		// The cursor: its light mirrored where the pointer's ray meets the face, so it follows the pointer across the face.
		// Each sheet's own lie moves it, so it breaks a little at each seam.
		vec3 nF = normalize( ( viewMatrix * vec4( uToWorld * nL, 0.0 ) ).xyz );
		float gk = dot( nF, vRay ), gt = dot( nF, geometryPosition ) / ( abs( gk ) > 1e-6 ? gk : 1e-6 );
		vec3 gOff = ( vec4( geometryPosition - vRay * gt, 0.0 ) * viewMatrix ).xyz * uToWorld / uUnit;
		vec2 hit = q - vec2( dot( gOff, tA ), dot( gOff, tU ) * ${f(TALL / SLANT)} );
		float hy = clamp( hit.y, ${f(G.rest[0])}, ${f(G.rest[1])} ), hc = max( ${f(HALF)} * ( 1.0 - hy / ${f(TALL)} ) - ${f(G.inset)}, 0.0 );
		vec2 gc = vec2( clamp( hit.x, - hc, hc ), hy );
		vec2 gq = q + ${f(G.D)} * s * ( 1.0 - pBent );
		vec2 ge = vec2( gq.x - gc.x, ( gq.y - gc.y ) * ${f(SLANT / TALL)} );
		float run = ge.y / ${f(G.long)}, wb = ge.x / ${f(G.body[0])}, rb = ge.y / ${f(G.body[1])};
		float lamp = pyrLine( ge.x, ${f(G.wide)}, fq.x ) * exp( - run * run ) + ${f(G.body[2])} * exp( - wb * wb - rb * rb );
		// Only on the face the pointer is over, fading as it leaves it: a pointer elsewhere leaves nothing.
		float outside = max( max( abs( hit.x ) - ${f(HALF)} * ( 1.0 - clamp( hit.y, 0.0, ${f(TALL)} ) / ${f(TALL)} ), - hit.y ), hit.y - ${f(FORM.cap.from)} );
		float on = step( 0.0, gt ) * min( uGlint.r, 1.0 ) * smoothstep( ${f(G.clear[0])}, ${f(G.clear[1])}, pEdge ) * ( 1.0 - smoothstep( 0.0, ${f(G.fade)}, outside ) );
		pLevel += on * lamp * ( toMoon ? ${f(G.power[0])} : ${f(G.power[1])} );
	}
	#endif
	radiance = vec3( pLevel );
	#ifdef WORLD_BAKED
		radiance *= mix( 1.0, wLight.z, uContact ) / max( mix( 1.0, wLight.z, 0.7 ), 0.05 );
	#endif
	reflectedLight.directSpecular *= uMoonSpec;
}`;

  // Before <opaque_fragment>: how much the place mirrors, given the color polished gold gives it: a redder deep where
  // it is low, the world's gold through the middle, and paling toward cream only where it is high. The joints, the
  // wear on the arrises and the foot course's edge, the capstone's groove and seams and the foot course's shadow line
  // are drawn here.
  const GRADE = `
{
	float lv = max( outgoingLight.r, 0.0 );
	vec3 n = normalize( vNq );
	float hl = length( n.xz ), y = vQ.y, fy = max( fwidth( y ), 1e-5 );
	bool face = abs( n.y - ${f(Math.cos(SLOPE))} ) < 0.002 && hl > 0.5;
	bool bevel = abs( vKind - ${f(KIND.bevel)} ) < 0.05;
	if ( abs( vKind - ${f(KIND.neck)} ) < 0.05 ) lv = ${f(E.neck)} * min( lv / ${f(E.neck)}, 1.0 );
	lv *= 1.0 - pJoint;
	// The inner corner over the foot course, shut in.
	// The foot course darkens into the ground it stands in, so where it meets the paving, which is never a straight
	// line, there is no pale edge against the dark to stair step.
	if ( face && abs( vKind - ${f(KIND.plinth)} ) < 0.05 ) lv *= mix( ${f(E.sunk[0])}, 1.0, smoothstep( 0.0, ${f(E.sunk[1])}, y ) );
	// Gone where it would be under a pixel and a half, where it stair stepped.
	if ( face && vKind < 0.1 ) lv *= 1.0 - ${f(E.shadow)} * smoothstep( 1.0, 2.0, ${f(E.shadowTall)} / fy ) * pyrBand( y, ${f(FORM.foot.tall)} - 0.5, ${f(FORM.foot.tall + E.shadowTall)}, 0.5 * fy );
	// The arrises worn: rubbed dull in places along them, and nicked. Wear shows only where a nick is a pixel or more.
	if ( pBent > 0.5 && vKind < 0.25 ) {
		float a = y / ${f(N.arris.nick)}, nk = step( ${f(1 - N.arris.nicked)}, pyrHash( vec2( floor( a ), 3.7 + pArris ) ) );
		float near = 1.0 - smoothstep( 0.0, ${f(FORM.round.seen.arris)}, pEdge ), seenK = smoothstep( 0.6, 1.6, ${f(N.arris.nick)} / fy );
		lv *= 1.0 - ${f(N.arris.nickBy)} * nk * pyrBand( fract( a ), 0.25, 0.75, 0.1 ) * near * seenK;
		lv *= 1.0 - ${f(N.arris.rub)} * smoothstep( 0.45, 0.85, pyrNoise( vec2( y / 4.0, 1.3 + pArris ) ) ) * near;
	}
	if ( bevel ) {
		vec2 a2 = hl > 1e-4 ? vec2( n.z, - n.x ) / hl : vec2( 1.0, 0.0 );
		float al = dot( vQ.xz, a2 ), fa = max( fwidth( al ), 1e-5 ), a = al / ${f(E.nick)};
		lv *= 1.0 - ${f(E.nickBy)} * step( ${f(1 - E.nicked)}, pyrHash( vec2( floor( a ), 8.1 ) ) ) * pyrBand( fract( a ), 0.3, 0.7, 0.1 ) * smoothstep( 0.6, 1.6, ${f(E.nick)} / fa );
		lv *= 1.0 - ${f(E.rub)} * smoothstep( 0.4, 0.8, pyrNoise( vec2( al / 5.0, 2.9 ) ) );
	}
	// The capstone's border, a faint groove so far in from its edges, and its own seams, each a hairline across it.
	if ( face && vKind > 0.875 ) {
		vec2 a = vec2( n.z, - n.x ) / hl;
		float s = dot( vQ.xz, a ), hw = ${f(HALF)} * ( 1.0 - y / ${f(TALL)} );
		float d = min( min( hw - s, hw + s ) * ${f(ACROSS)}, ( y - ${f(capFoot)} ) * ${f(SLANT / TALL)} ), fd = max( fwidth( d ), 1e-5 );
		lv *= 1.0 - ${f(K.dark)} * pyrNoise( vec2( ( s + y ) / 5.0, 17.0 ) ) * pyrLine( d - ${f(K.border)}, ${f(K.groove)}, fd );
		float cs = max( pyrLine( y - ${f(capFoot + K.seams[0])}, ${f(C.line)}, fy ), pyrLine( y - ${f(capFoot + K.seams[1])}, ${f(C.line)}, fy ) );
		lv *= 1.0 - ${f(K.seam)} * cs * smoothstep( 3.0, 6.0, ${f(C.row)} / fy );
	}
	vec3 deep = mix( mix( uDeepC, uBodyC, smoothstep( uGradeLo.x, uGradeLo.y, lv ) ), uWarmC, pWarm );
	// What the face toward the moon mirrors keeps some of the body's saturated color through the middle tones.
	vec3 c = mix( mix( deep, uMidC, smoothstep( uGradeAt.x, uGradeAt.y, lv ) ), uPaleC, smoothstep( uGradeAt.z, uGradeAt.w, lv ) ) * lv;
	// The face toward the moon: a rich gold where it mirrors the dark sky, and the glare a hot gold, paling only at its
	// very heart, so it blazes and never turns to peach.
	if ( pSky > 0.5 ) c = mix( mix( uLitC, uHotC, smoothstep( uHotAt.x, uHotAt.y, lv ) ), uPaleC, smoothstep( uHotAt.z, uHotAt.w, lv ) ) * lv;
	outgoingLight = c;
}`;
  return { PARS, COLOR, ROUGH, NORMAL, ENV, GRADE };
}
