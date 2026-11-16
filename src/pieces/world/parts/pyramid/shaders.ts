import { FORM, standing } from './form';
import { D2R, HOST, MOONWARD, PYRAMID, SPIRE, VIEW, WORLD, ground } from '../../layout';

// The pyramid's shaders, laid into a physical material (onBeforeCompile) before the world's light (../../light.ts).
// Polished gold is what it mirrors and the lights it catches. What each face mirrors is worked out from the real
// reflected ray at each pixel: the visitor's eye (the view never moves), the face's normal as the casing bends it, and
// each sheet's own small lie. A face that slopes fifty degrees seen nearly level mirrors mostly sky.
// The casing sweeps a little, as a great clad face does: each face's normals turn slowly up toward its apex and faster
// down toward its foot, and across it. So the face toward the moon mirrors the moon's side of the sky up most of its
// height, with the moon's glare as one broad blaze low and to the right, where the face turns to the direction half
// way between the moon and the eye, falling to a deeper gold toward the apex and the corners; and only in a strip at
// its foot does the ray come down to the horizon and the land, foreshortened. The face turned from the moon mirrors the
// dark sky away from the moon, one long gradient of dark gold, and at its foot the trees before it against the city's
// glow on the horizon.
// The faces are clad in long unequal sheets in courses of differing heights that thin upward, with dark hairline
// seams; every sheet is pillowed a hair and lies at its own small tilt, so what it mirrors shifts as a whole and breaks
// a little at each seam. The arrises and the foot course's edge are worn. The capstone is polished harder, rounded
// finer, with seams of its own, its lit side a step brighter than the blaze's gold and one hot glint at its tip. The
// cursor is mirrored as a long thin streak lying along the slope, which slides with the pointer, breaks a little at
// each seam and falls off at its ends.
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
  // heart to the moon's half way direction (HALFWAY), so the moon's glare sits there; the face turned from it is
  // turned `kick` down the slope. The capstone's face toward the moon is turned `off` from the half way direction,
  // across and up, so it is the glare's gold a step brighter, and sweeps a little of its own; its face turned from the
  // moon is the deep face as it is at the body's top.
  sweep: {
    lit: { heart: [14, 24], across: 0.0018, up: 0.008, down: 0.022, knee: 4 },
    deep: { heart: [0, 44], kick: -0.12, across: 0.003, up: 0.009, down: 0.012, knee: 6 },
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
  moon: { body: { rough: 0.5, power: 1.05 }, heart: { rough: 0.34, power: 2.2, sharp: 2.2 }, vary: 0.03, seen: [0.15, 0.7], cap: 1.35 },
  lit: {
    // The moon's side of the sky: its level overhead and at the horizon, and the height over which the one turns to
    // the other.
    sky: { top: 0.08, horizon: 0.36, wide: 0.35 },
    // The moon's glare. Polished sheets mirror the moon as a field with a hard edge, not a soft spot: every place whose
    // normal, as the face sweeps, lies past a line in the space of tilts (across, up) mirrors it. The line is the one
    // through the tilts the face has at two places: so high up the front arris (`arris`) and so high up the right hand
    // outline (`outline`), so the glare holds the lower right of the face. Each sheet's own lie moves the line, so the
    // edge breaks sheet by sheet into offset pieces, each crisp. Its level at the edge and deep in it, over how much
    // tilt it rises from the one to the other, and how much more than the rest of what it mirrors a sheet's lie moves
    // the edge (the moon is the farthest thing mirrored, and the brightest: a sheet's turn shows most there).
    glare: { arris: 28, outline: 70, edge: 0.65, heart: 1.6, inner: 0.35, shift: 1.8 },
    // Under the horizon, the court before it, one level, and the land's lit far rim along the horizon as one crisp
    // line, how bright and how deep. A wandering horizon and a rim that faded down read as a tide mark.
    ground: { level: 0.4, rim: 0.9, rimWide: 0.01 },
  },
  dark: {
    // The sky away from the moon: overhead, at the horizon with the city's glow along it, and over what height; and a
    // slow fall over the whole sky (how much, over what height), so the face changes all the way down its slope.
    sky: { top: 0.014, horizon: 0.17, wide: 0.3, slow: 0.04, slowWide: 0.6 },
    // The land under the horizon, and how the horizon wanders.
    ground: 0.06,
    wander: [0.003, 47],
    // The far edge of the city's glow, mirrored as one faint sharp line on the horizon: how bright and how tall.
    line: [0.5, 0.006],
    // The low city at the left end, on the horizon: so far apart round the circle, each building as wide as a share of
    // that, so far under the horizon its foot is hidden and so tall over it (most low, a few tall), the share of places with none, its level
    // against the glow; its windows, a cell so
    // wide and tall, each window that share of its cell, the share lit, and how bright, dimmest and brightest.
    city: { foot: 0.03, cell: 0.05, wide: [0.7, 1.05], tall: [0.008, 0.13], gone: 0.15, level: 0.07, win: [0.016, 0.014], size: [0.5, 0.5], lit: 0.16, light: [1.2, 3] },
    // How much the mirrored world shows at the face's middle and how much more toward grazing (Fresnel).
    fresnel: [0.78, 0.6],
  },
  // The cursor's light, mirrored on the face the pointer is over and nowhere else: where the pointer's ray meets the
  // face, held `inset` inside its edges and between the heights `rest`; a bright core lying along the slope, so wide and
  // falling to a third so far along it, in a soft body so wide and so long; how far off the lamp stands (so each
  // sheet's own lie moves it and it breaks at the seams); how bright on the face toward the moon and on the other; how
  // far from an arris it is gone; and over how far outside the face the pointer may be before it is gone.
  glint: { inset: 9, rest: [8, 70], wide: 1.4, long: 9, body: [5, 22, 0.35], D: 70, power: [4, 1.6], clear: [2, 6], fade: 26 },
  // The front arris's line: how much dimmer it is high up than low, and how much it wavers along its length. Its wear:
  // nicks so far apart along it, the share nicked, how much a nick takes, and how much it is rubbed dull.
  arris: { high: 0.5, waver: 0.35, nick: 1.1, nicked: 0.12, nickBy: 0.55, rub: 0.25 },
  // The left hand outline's edge light, kept to almost nothing.
  left: { power: 0.45, lo: -0.05, hi: 0.5 },
  // The joints: how dark a seam between courses is (from the faintest to the darkest seam), how dark an upright joint
  // between sheets, the share of upright joints that show, and over how many pixels a row must be for them to show at
  // all. The pale hairline on each course's upper lip: how tall, and how much it mirrors on the face turned from the
  // moon and on the other outside the glare.
  joint: { line: [0.22, 0.42], plate: 0.36, shows: [0.04, 0.2], fade: [3, 6], lip: [0.22, 0.035, 0.1] },
  // The foot course's bevel and the shadow line over it, the neck in the reveal, and the body's level top round the
  // capstone's foot, seen nearly edge on: what it mirrors, the horizon behind, from its left to its right. The bevel on the
  // face toward the moon is never darker than `bevelLo`: a dark line under a pixel between the pale foot course and the
  // bright face stair stepped. The bevel's
  // wear: nicks so far apart along it, the share nicked, how much a nick takes, and how rubbed.
  edges: { bevel: 1.1, bevelLo: 0.4, sunk: [0.15, 2.4], shadow: 0.55, shadowTall: 0.45, neck: 0.012, ledge: [0.12, 0.6], nick: 1.7, nicked: 0.07, nickBy: 0.35, rub: 0.3 },
  // The capstone: a faint groove so far in from its edges, how dark at most; its own seams, so high over its foot and
  // how dark; and its one hot glint at the tip, how bright and how far it reaches.
  cap: { border: 2.8, groove: 0.2, dark: 0.35, seams: [7.5, 15.5], seam: 0.35, tip: [9, 2.6] },
};
export type Night = typeof NIGHT;

// How a face sweeps at a place s across and y up it, as pyrSweep in the shader has it.
function sweepAt(s: number, y: number, h: readonly number[], k: { across: number; up: number; down: number; knee: number }): number[] {
  const g = ((y - h[1]) * SLANT) / TALL, w = Math.max(k.knee, 1e-3), under = -w * (Math.log(1 + Math.exp(-g / w)) - Math.LN2);
  return [k.across * (s - h[0]), k.up * g + (k.down - k.up) * under];
}
// The glare's edge as a line in the space of tilts: its normal toward the glare, and how far along it the line lies.
function glareLine(N: Night): { dir: number[]; at: number } {
  const hw = (y: number): number => HALF * (1 - y / TALL), W = N.sweep.lit, G = N.lit.glare;
  const a = sweepAt(-hw(G.arris), G.arris, W.heart, W), b = sweepAt(hw(G.outline), G.outline, W.heart, W);
  let dir = unit([b[1] - a[1], a[0] - b[0]]);
  const corner = sweepAt(HALF, 0, W.heart, W);
  if ((corner[0] - a[0]) * dir[0] + (corner[1] - a[1]) * dir[1] < 0) dir = dir.map((v) => -v);
  return { dir, at: a[0] * dir[0] + a[1] * dir[1] };
}

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

export function frag(N: Night): { PARS: string; COLOR: string; ROUGH: string; NORMAL: string; ENV: string; GRADE: string } {
  const GL = glareLine(N);
  const L = N.lit, D = N.dark, G = N.glint, E = N.edges, K = N.cap, J = N.joint, T = N.tilt, CT = D.city, M = N.moon, W = N.sweep;
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
float pLip = 0.0, pSoft = 1.0, pWarm = 0.0, pEdge = 1e3, pArris = 0.0, pSky = 0.0, pFres = 1.0;
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
// What the face toward the moon mirrors along the world's ray r, which is e over the horizon, round the circle at az:
// the moon's side of the sky, brightest along the horizon, with the moon's glare spread by the polish, as much of it as
// the place sees of the moon; and under the land's far edge, the land, with its lit rim. fe is how far e turns across
// the pixel, so the edge is one pixel crisp.
float pyrLit( vec3 r, float e, float az, float fe, float seen, float w, float fw ) {
	float sky = ${f(L.sky.top)} + ${f(L.sky.horizon - L.sky.top)} * exp( - max( e, 0.0 ) / ${f(L.sky.wide)} );
	float glare = ${f(L.glare.edge)} + ${f(L.glare.heart - L.glare.edge)} * smoothstep( 0.0, ${f(L.glare.inner)}, w );
	sky = mix( sky, max( sky, glare ), seen * clamp( 0.5 + w / max( fw, 1e-5 ), 0.0, 1.0 ) );
	fe = max( fe, 1e-5 );
	float land = ${f(L.ground.level)} + ${f(L.ground.rim)} * pyrLine( e + ${f(L.ground.rimWide * 0.5)}, ${f(L.ground.rimWide)}, fe );
	return mix( land, sky, clamp( 0.5 + e / fe, 0.0, 1.0 ) );
}
// What the face turned from the moon mirrors along r: the dark sky away from the moon, brighter toward the horizon
// where the city's glow lies, with one faint sharp line along it; the low city at the left end standing on it, dark
// against the glow, with a few of its windows lit, crisp; and the land under it. faz is how far az turns across the
// pixel. Every line and window is its pixel's share of it, so what is finer than a pixel fades and never breaks up.
float pyrDeep( vec3 r, float e, float az, float fe, float faz ) {
	float l = ${f(D.sky.top)} + ${f(D.sky.horizon - D.sky.top)} * exp( - max( e, 0.0 ) / ${f(D.sky.wide)} ) + ${f(D.sky.slow)} * exp( - max( e, 0.0 ) / ${f(D.sky.slowWide)} );
	float h = e - ${f(D.wander[0])} * ( pyrNoise( vec2( az * ${f(D.wander[1])}, 7.0 ) ) - 0.5 ) * 2.0;
	fe = max( fe, 1e-5 ); faz = max( faz, 1e-5 );
	float c = floor( az / ${f(CT.cell)} ), b = 0.0, top = 0.0;
	if ( pyrHash( vec2( c, 2.9 ) ) > ${f(CT.gone)} ) {
		float wide = ${f(CT.cell)} * mix( ${f(CT.wide[0])}, ${f(CT.wide[1])}, pyrHash( vec2( c, 5.9 ) ) );
		float cx = ( c + 0.5 ) * ${f(CT.cell)} + ( ${f(CT.cell)} - wide ) * ( pyrHash( vec2( c, 3.3 ) ) - 0.5 );
		top = mix( ${f(CT.tall[0])}, ${f(CT.tall[1])}, pow( pyrHash( vec2( c, 8.1 ) ), 2.2 ) );
		b = pyrLine( az - cx, wide, faz ) * pyrLine( h - 0.5 * ( top - ${f(CT.foot)} ), top + ${f(CT.foot)}, fe );
		vec2 wc = vec2( ( az - cx ) / ${f(CT.win[0])}, h / ${f(CT.win[1])} ), wi = floor( wc ), wf = ( fract( wc ) - 0.5 ) * vec2( ${f(CT.win[0])}, ${f(CT.win[1])} );
		float lit = step( 1.0 - ${f(CT.lit)}, pyrHash( wi + c * 7.31 ) ) * step( wi.y + 1.0, top / ${f(CT.win[1])} ) * step( abs( az - cx ), 0.5 * wide - ${f(CT.win[0])} * 0.5 ) * step( 0.5, wi.y );
		float win = pyrLine( wf.x, ${f(CT.win[0] * CT.size[0])}, faz ) * pyrLine( wf.y, ${f(CT.win[1] * CT.size[1])}, fe );
		l += b * lit * win * mix( ${f(CT.light[0])}, ${f(CT.light[1])}, pyrHash( wi + c * 3.7 + 1.3 ) );
		pWarm = b * lit * win;
	}
	float land = ${f(D.ground)} * ( 0.8 + 0.4 * pyrNoise( vec2( az * 60.0, 9.0 ) ) );
	l = mix( land, l, clamp( 0.5 + h / fe, 0.0, 1.0 ) );
	return mix( l, ${f(CT.level)}, b ) + ( 1.0 - b ) * ${f(D.line[0])} * pyrLine( h - ${f(D.line[1] * 0.5)}, ${f(D.line[1])}, fe );
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
vec2 pTilt = vec2( 0.0 ), pKick = vec2( 0.0 ), pSw = vec2( 0.0 ), pFlat = vec2( 0.0 );
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
		pLip = hair * h3 * h3 * pyrLine( yHi - ${f(C.line * 0.5 + N.joint.lip[0] * 0.5)} - y, ${f(N.joint.lip[0])}, fy );
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
		// The sheet's lie without its pillow: what moves the glare's edge, so within a sheet the edge runs straight and
		// only steps at the seams (with the pillow it bent into teeth inside each sheet).
		vec2 lie = h56 * ${f(2 * T.sheet)};
		if ( h4 < ${f(T.proud)} ) lie = ( vec2( h2, h3 ) - 0.5 ) * ${f(2 * T.proudTilt)};
		pFlat = warp * ${f(T.warp)} + lie * big;
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
	vec3 dr = ( rW - inverseTransformDirection( reflect( - geometryViewDir, n0 ), viewMatrix ) ) * uToWorld;
	vec2 q = vec2( dot( vQ, tA ), vQ.y ), s = vec2( dot( dr, tA ), dot( dr, tU ) * ${f(TALL / SLANT)} );
	vec2 fq = fwidth( q );
	float fB = max( fq.x, fq.y ), pxU = max( length( fwidth( vQ ) ), 1e-5 );
	// Where the ray goes: so far over the horizon and so far round the circle, and how far each turns across the pixel.
	float rE = asin( clamp( rW.y, - 1.0, 1.0 ) ), rAz = atan( rW.x, - rW.z ), fE = fwidth( rE ), fAz = fwidth( rAz );
	// How far past the glare's edge the place lies, in tilt: the face's sweep alone gives the edge's width over the
	// pixel, so a seam that steps a sheet's lie does not soften it.
	float gS = dot( pSw, ${v2(GL.dir)} ) - ${f(GL.at)}, gW = gS + ${f(L.glare.shift)} * dot( pFlat, ${v2(GL.dir)} ), gF = fwidth( gS );
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
		pLevel = pyrLit( rW, rE, rAz, fE, seen, gW, gF ) + ${f(J.lip[2])} * pLip;
		pSky = 1.0;
	}
	else if ( toMoon ) pLevel = lobe;
	else pLevel = ( pyrDeep( rW, rE, rAz, fE, fAz ) + ${f(J.lip[1])} * pLip ) * pFres + lobe;
	// The front arris's line is brightest low and wavers along its length as a polished round does: of one weight from
	// top to foot it read as a drawn stroke. The outlines are kept faint, and uneven.
	float sp = min( 1.2, pSpread ), wav = 1.0 - ${f(N.arris.waver)} * pyrNoise( vec2( vQ.y / 6.0, 3.0 ) );
	pLevel += pBent * pyrZen( rW, sp ) * mix( 1.0, ( 1.0 - ${f(N.arris.high)} * smoothstep( 15.0, 80.0, vQ.y ) ) * wav, pArris );
	pLevel += pBent * pyrRims( rW, sp ) * ( 1.0 - 0.7 * pyrNoise( vec2( vQ.y / 9.0, 7.0 ) ) );
	pLevel += pBent * pyrLeft( rW, sp ) * ( 1.0 - 0.7 * pyrNoise( vec2( vQ.y / 8.0, 11.0 ) ) );
	// The capstone's one hot glint, at its tip.
	if ( vKind > 0.875 ) {
		vec2 tp = vec2( q.x, ( vQ.y - ${f(TALL)} ) * ${f(SLANT / TALL)} );
		pLevel += ${f(K.tip[0])} * exp( - dot( tp, tp ) / ${f(K.tip[1] * K.tip[1])} ) * ( toMoon ? 1.0 : 0.35 );
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
