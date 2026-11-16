import { FORM, standing } from './form';
import { MOONWARD, PYRAMID, WORLD } from '../../layout';

// The pyramid's shaders, laid into a physical material (onBeforeCompile) before the world's light (../../light.ts).
// Polished gold is what it mirrors and the lights it catches, and every face mirrors a world it could see.
// The face toward the moon looks out over the desert to the moon's side of the sky. Under a sharp mirrored horizon it
// holds the dunes, ridge behind ridge, each lit back pale at its crest and falling into a deeper gold hollow, with a
// narrow pale band along the horizon and the court and the land as a darker band at its foot; over the horizon, the
// moon's side of the sky as a deep bright gold, hottest toward the horizon, with the moon itself mirrored a little
// over it. The face turned from the moon looks left and toward the visitor: near black high up, the low buildings of
// the city's left end standing on a mirrored horizon that meets the other face's at the front arris, their windows
// lit, and the trees before its own foot, all soft as the plates' finish blurs them and stronger toward grazing.
// The faces are clad in long unequal sheets in courses of differing heights that thin upward, with dark hairline
// seams; every sheet is pillowed a hair, so its tone runs across it and what it mirrors breaks a little at each seam,
// and a few stand proud or are dented. The arrises and the foot course's edge are worn. The capstone is polished
// harder and is the brightest stone, with the same wavy horizon and one hot glint at its tip. The cursor is mirrored
// as a short, sharp lamp on each flat face, which slides with the pointer and breaks a little at each seam.
// How much a place mirrors is then given its color, as polished gold gives it: a redder deep where it mirrors little,
// richest through its middle tones, and paling toward cream only where it mirrors much.

const f = (v: number): string => v.toFixed(5);
const v2 = (a: readonly number[]): string => `vec2( ${f(a[0])}, ${f(a[1])} )`;
const HALF = PYRAMID.base / 2, TALL = PYRAMID.tall, SLANT = Math.hypot(HALF, TALL);
const SLOPE = Math.atan2(TALL, HALF);
const AX = standing(PYRAMID.x, PYRAMID.z, WORLD.top, PYRAMID.turn);
// How far across the face turned from the moon a line runs for each unit up it, to be upright as the view has it: what
// it mirrors of the city stands upright there, and so does the cursor's lamp. Up the face's own slope they lean.
const UPRIGHT = -((HALF / TALL) * AX.x[0] + AX.y[0]) / AX.z[0];
// The same on the face toward the moon.
const UPRIGHT_LIT = ((HALF / TALL) * AX.z[0] - AX.y[0]) / AX.x[0];
// The angle between two neighbouring faces' normals.
const TURN = Math.acos(HALF ** 2 / (HALF ** 2 + TALL ** 2));
const MOON = (() => { const l = Math.hypot(...MOONWARD); return MOONWARD.map((v) => v / l); })();
// From a place's distance across a face to its distance from the nearest arris, measured on the face.
const ACROSS = 1 / Math.sqrt(1 + Math.cos(SLOPE) ** 2);
// Which piece a vertex is of, as make.mjs stores it.
export const KIND = { body: 0, plinth: 0.2, bevel: 0.3, neck: 0.5, cap: 1 } as const;
const C = FORM.casing;

// Levels are how much is mirrored: about 0.03 is a near black gold, 0.3 a deep bright one, 1 a bright one at the edge of
// the tone curve's shoulder, and pale from about 2. Places on a face are across it from its middle toward its right
// hand corner as seen, and up it, in units.
export const NIGHT = {
  // How each stone is laid, as tilts of its normal across the face and up it, in radians. The plates' kick: their
  // foot stands out so they face a little down the slope, and a hair toward the front arris, which turns them to the
  // moon's half way direction as the view has it (worked out from the plan as it is: PYRAMID's turn and slope and
  // MOONWARD; it must be worked out again when any of them changes). It is laid off within `clear` of an arris (`cap`
  // on the capstone) and `top` under the reveal, where the plates meet the arris stones flush. Then the face's bow: so
  // much tilt for each unit from the face's heart, across and up the slope; the heart, across and up; and the
  // capstone's own bow.
  kick: { at: [0.018, -0.355], clear: [0.3, 1.6], cap: [0.6, 3.5], top: 2.5 },
  bow: { per: [0.0006, 0.0018], heart: [6, 25], cap: 0 },
  // How each sheet lies. The cladding's slow warp, a noise over cells `cells` sheets across and rows up, read at each
  // pixel so tone runs on continuously and never steps sheet by sheet (read at each sheet's middle it laid a brick grid
  // of flat tones). Each sheet is pillowed: its normal turns out toward its edges by `pillow` at most, from 0.5 to 1.5
  // of that, so what it mirrors runs across it and breaks a little at each seam. A share `proud` of sheets stand proud,
  // pillowed by `proudBy` and tilted by up to `proudTilt`; a share `dent` hold a dent `dentR` across, `dentBy` deep in
  // tilt.
  tilt: { warp: 0.0028, cells: [5, 10], pillow: 0.0032, proud: 0.05, proudBy: 0.0045, proudTilt: 0.0025, dent: 0.035, dentR: 2.6, dentBy: 0.006 },
  // The moon's highlight, GGX's lobe at two roughnesses: the broad body of the blaze and its narrow heart, each with how
  // bright at its peak, and the heart's lobe raised to a power so its edge falls off faster than GGX's long skirt; how
  // much the polish wanders over the face; the share of the moon seen (baked) over which it comes on; and how much
  // brighter the capstone's polish takes it. On the face toward the moon it no longer adds: it shapes what that face
  // mirrors (lit.lobe).
  moon: { body: { rough: 0.5, power: 1.05 }, heart: { rough: 0.34, power: 2.2, sharp: 2.2 }, vary: 0.03, seen: [0.15, 0.7], cap: 1.35 },
  lit: {
    // The mirrored horizon: how far off what it mirrors stands, its height at the face's middle, how much it falls
    // for each unit across toward the right, how much it bows up at the middle, and how much it wanders.
    sky: { D: 60, mid: 43, slope: -0.2, bow: 3.5, wander: 0.8 },
    // Over the horizon, the moon's side of the sky: its level just over the horizon and toward the apex, over how far
    // up the one turns to the other, and how much the moon's halo lifts it. The moon mirrored a little over the
    // horizon: across, how far over the horizon, its radius, how bright, its glow (how bright, how far), the halo's
    // reach, and how much shorter it is up the face than across it. And how much of the body's saturated color the sky
    // keeps where the grade would turn it toward the middle tones.
    over: { glow: 0.66, top: 0.3, rise: 34, halo: 0.4, rich: 0.35 },
    moon: { at: [24, 7.5], r: 1.1, power: 1.6, glow: [0.8, 1.6], reach: 26, squash: 0.5 },
    // Under the horizon, the desert: the gaps between its ridges, nearest last (they open out as they come nearer);
    // how much each crest wanders, as a share of the gap above it, and over what length; each ridge's lit back at the
    // crest and its hollow, farthest and nearest; how fast the back falls into the hollow, as a share of the gap; how
    // much darker the trough just over the next crest is; the narrow pale band under the horizon, how bright and how
    // deep; and the ripples on the backs, how strong and how far apart.
    dunes: { gaps: [3.4, 4.6, 6.0, 7.6, 9.6], wander: 0.42, waves: [10, 6], crest: [1.6, 1.35], hollow: [0.92, 0.7], fall: 0.34, trough: 0.22, band: [1.3, 1.8], ripple: [0.07, 0.75] },
    // How the moon's broad lobe shapes the whole field: the field at the lobe's foot and at its peak.
    lobe: [0.9, 1.2],
    // The court and the land before the pyramid, mirrored at the foot as a darker band under a crisp edge: how far off
    // the edge stands, how high it is mirrored at the face's left and how much it rises across, how dark the band is,
    // and the land's lit edge just over it, how bright and how tall.
    court: { D: 45, at: 6.5, rise: 0.03, level: 0.6, edge: 0.3, edgeTall: 0.8 },
  },
  dark: {
    // The night: its level at the foot of the face and at its top (each piece, the body and the capstone, its own).
    night: { D: 520, low: 0.05, top: 0.018 },
    // The mirrored horizon, which meets the other face's at the front arris, and the city's glow along it: how far off
    // (with the city that stands on it), how high it is at the face's left foot and how much it rises across, how much
    // it wanders, how wide the glow and how much it lifts the night.
    horizon: { D: 160, at: 30, rise: 0.145, wander: 0.9, wide: 10, power: 3.2 },
    // The low buildings at the city's left end, standing on the horizon: how wide a lot is, each building's width as a
    // share of it, its height over the horizon, lowest and highest, its level lowest and highest, a window's place
    // (across and up a cell), a window's size, the share of windows lit, how bright, dimmest and brightest, and how
    // soft the plates' finish makes it all.
    city: { lot: 7.5, wide: [0.5, 0.92], tall: [1.6, 8.5], level: [0.085, 0.15], cell: [1.35, 1.7], win: [0.55, 0.75], lit: 0.5, light: [0.35, 1.05], blur: 0.45 },
    // The trees before its own foot, as soft round crowns: how far off, how far apart, how high their tops are, their
    // radius, their level in their shade and on their lit tops, and how soft.
    trees: { D: 45, gap: 5.5, tall: [6, 11], r: [2.4, 4.2], shade: 0.07, top: 0.2, blur: 0.7 },
    // How much the mirrored world shows at the face's middle and how much more toward grazing (Fresnel).
    fresnel: [0.78, 0.6],
  },
  // The land's pale strip at the foot, mirrored in the lowest courses of the face turned from the moon.
  strip: { tall: 2.2, dark: 0.08 },
  // The cursor's light, mirrored as a short, sharp lamp on each flat face: how far across from the face's middle it can
  // be drawn (where the cursor's ray meets the face's plane is drawn in toward the middle by a tanh of this), the
  // heights its middle is held between, its half size across and up (upright as the view has it), the round of its
  // corners, how far off the lamp stands (so each sheet's own lie moves it a little and it breaks at the seams), its
  // halo's reach and strength, how bright on the face toward the moon and on the other, and how far from an arris it
  // is gone.
  glint: { reach: 56, rest: [16, 62], half: [2.1, 3.2], round: 1.1, D: 70, halo: [1.2, 0.14], power: [3.4, 1.8], clear: [2, 6] },
  // The front arris's line: how much dimmer it is high up than low, and how much it wavers along its length. Its wear:
  // nicks so far apart along it, the share nicked, how much a nick takes, and how much it is rubbed dull.
  arris: { high: 0.5, waver: 0.35, nick: 1.1, nicked: 0.12, nickBy: 0.55, rub: 0.25 },
  // The left hand outline's edge light, kept to almost nothing.
  left: { power: 0.45, lo: -0.05, hi: 0.5 },
  // The joints: how dark a seam between courses is (from the faintest to the darkest seam), how dark an upright joint
  // between sheets, the share of upright joints that show, and over how many pixels a row must be for them to show at
  // all.
  joint: { line: [0.22, 0.42], plate: 0.2, shows: [0.55, 0.8], fade: [3, 6] },
  // The foot course's bevel and the shadow line over it, the neck in the reveal, and the body's level top round the
  // capstone's foot, seen nearly edge on: what it mirrors, the horizon behind, from its left to its right. The bevel's
  // wear: nicks so far apart along it, the share nicked, how much a nick takes, and how rubbed.
  edges: { bevel: 1.1, shadow: 0.55, shadowTall: 0.45, neck: 0.012, ledge: [0.12, 0.6], nick: 1.7, nicked: 0.07, nickBy: 0.35, rub: 0.3 },
  // The capstone's border, kept to almost nothing: a faint groove so far in from its edges, how dark at most. Then its
  // face toward the moon: the moon's light at its foot and at its apex, as a share of what the stone's polish gives,
  // and the horizon it mirrors, edge to edge, the face's own wavy line at the capstone's scale: so high over the
  // capstone's foot at its middle, rising so much across, bowing up so much at its middle, wandering so much over waves
  // so long, with the glow under it falling off over `wide` at the left and `wideR` at the right, as bright as `power`
  // at the left and `powerR` at the right; over the line the sky, its level just over the line and toward the apex,
  // and over how far. Then its one hot glint at the tip: how bright and how far it reaches.
  cap: {
    border: 2.8, groove: 0.2, dark: 0.35, rake: [0.75, 1.1],
    band: { at: 9.5, rise: -0.1, bow: 0.7, wander: 0.9, wave: 4.5, wide: 0.9, wideR: 1.6, power: 1.2, powerR: 1.8 },
    sky: [1.05, 0.55, 9],
    tip: [5, 2.2],
    // The desert under its horizon: how many times smaller than the face's, and how bright beside it.
    desert: [3.5, 0.8],
    // How much of the moon's light the capstone's face toward the moon keeps under its horizon, so it is the brightest
    // stone without being one cream plateau.
    lobe: 0.22,
  },
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

export function frag(N: Night): { PARS: string; COLOR: string; ROUGH: string; NORMAL: string; ENV: string; GRADE: string } {
  const L = N.lit, D = N.dark, G = N.glint, E = N.edges, K = N.cap, J = N.joint, T = N.tilt, TR = D.trees, M = N.moon, H = D.horizon, CI = D.city, DU = L.dunes;
  const capFoot = FORM.cap.from + FORM.cap.reveal;
  const capMid = capFoot + (TALL - capFoot) / 3;
  // The dune ridges' depths under the horizon, before each wanders.
  const ridges = DU.gaps.reduce((a, g) => [...a, a[a.length - 1] + g], [0]);
  const LOBE = M.body.power + M.heart.power;
  // The deep face's horizon in the frame where the city stands upright (x - UPRIGHT y): its height and its rise.
  const hzRise = H.rise / (1 - UPRIGHT * H.rise), hzAt = H.at / (1 - UPRIGHT * H.rise);
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
uniform vec4 uGradeAt;
uniform vec3 uRough;
uniform float uContact;
uniform float uMoonSpec;
uniform mat3 uToWorld;
float pSoft = 1.0, pWarm = 0.0, pEdge = 1e3, pArris = 0.0, pSky = 0.0, pFres = 1.0;
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
// The place on the face, so far across and so high, that a pixel at q mirrors, when its ray is turned by s from the
// stone's own (per unit off) and the thing stands D off.
#define PYR_AT( D ) ( q + ( D ) * s )
// The face toward the moon's mirrored horizon: how much of the pixel lies over it, and in d how far over it (under it,
// less than 0). fB is how far a pixel spans on the face and fT how far its ray turns, so the line is one pixel crisp at
// any size; each sheet's own lie moves it by a hair.
float pyrSky( vec2 q, vec2 s, float fB, float fT, out float d ) {
	vec2 k = PYR_AT( ${f(L.sky.D)} );
	float u = clamp( k.x / ${f(HALF)}, - 1.0, 1.0 );
	d = k.y - ( ${f(L.sky.mid)} + ${f(L.sky.slope)} * k.x + ${f(L.sky.bow)} * ( 1.0 - u * u ) + ${f(L.sky.wander)} * ( pyrNoise( vec2( k.x / 17.0, 6.0 ) ) - 0.5 ) );
	return clamp( 0.5 + d / max( fB + ${f(L.sky.D)} * fT, 1e-4 ), 0.0, 1.0 );
}
// One dune ridge, t of the way from its crest down to the next: its lit back at the crest falling into the hollow,
// and the trough darker just over the next crest. n is how near it is, 0 to 1.
float pyrRidge( float t, float n, float x ) {
	float crest = mix( ${f(DU.crest[0])}, ${f(DU.crest[1])}, n ), hollow = mix( ${f(DU.hollow[0])}, ${f(DU.hollow[1])}, n );
	float v = mix( hollow, crest, exp( - max( t, 0.0 ) / ${f(DU.fall)} ) );
	v *= 1.0 - ${f(DU.trough)} * smoothstep( 0.55, 1.0, t );
	// Ripples run along the backs, faint and broken.
	float w = ${f(DU.ripple[1])} * ( 1.0 + n );
	v *= 1.0 + ${f(DU.ripple[0])} * ( 1.0 - smoothstep( 0.0, 0.7, t ) ) * ( pyrNoise( vec2( x / 7.0, t * 12.0 / w + x / 23.0 ) ) - 0.5 );
	return v;
}
// What the face toward the moon mirrors under the horizon: the desert, ridge behind ridge, d being how far over the
// horizon the pixel is (under it, less than 0). Each crest is one pixel crisp.
float pyrDesert( vec2 q, vec2 s, float fB, float fT, float d ) {
	vec2 k = PYR_AT( ${f(L.sky.D)} );
	float u = - d, fp = max( fB + ${f(L.sky.D)} * fT, 1e-4 );
	float band = ${f(DU.band[0])} * exp( - max( u, 0.0 ) / ${f(DU.band[1])} );
	float v = pyrRidge( u / ${f(DU.gaps[0])}, 0.0, k.x ) + band;
	${DU.gaps.map((g, i) => i === 0 ? '' : `{
		float cr = ${f(ridges[i])} + ${f(DU.gaps[i - 1] * DU.wander)} * 2.0 * ( pyrNoise( vec2( k.x / ${f(DU.waves[0] + DU.waves[1] * i)}, ${f(3.1 * i + 1)} ) ) - 0.5 );
		float cov = clamp( 0.5 + ( u - cr ) / fp, 0.0, 1.0 );
		v = mix( v, pyrRidge( ( u - cr ) / ${f(g)}, ${f(i / (DU.gaps.length - 1))}, k.x + ${f(i * 37)} ), cov );
	}`).join('\n\t')}
	return v;
}
// The court and the land at the foot of the face toward the moon: the field under its edge is darkened, and the land's
// lit edge lies just over it.
float pyrCourt( vec2 q, vec2 s, float fB, float fT, float v ) {
	vec2 k = PYR_AT( ${f(L.court.D)} );
	float fp = max( fB + ${f(L.court.D)} * fT, 1e-4 );
	float e = k.y - ( ${f(L.court.at)} + ${f(L.court.rise)} * ( k.x + ${f(HALF)} ) + 1.2 * pyrNoise( vec2( k.x / 31.0, 4.0 ) ) );
	float under = clamp( 0.5 - e / fp, 0.0, 1.0 );
	return mix( v, v * ${f(L.court.level)}, under ) + ${f(L.court.edge)} * pyrLine( e - 0.5 * ${f(L.court.edgeTall)}, ${f(L.court.edgeTall)}, fp ) * ( 0.6 + 0.4 * pyrNoise( vec2( k.x / 9.0, 2.0 ) ) );
}
// What the face toward the moon mirrors over the horizon: the moon's side of the sky, brightest along the horizon and
// round the moon, and the moon itself.
float pyrMoonSky( vec2 q, vec2 s, float fB, float fT, float d ) {
	vec2 k = PYR_AT( ${f(L.sky.D)} );
	float fp = max( fB + ${f(L.sky.D)} * fT, 1e-4 );
	float v = mix( ${f(L.over.glow)}, ${f(L.over.top)}, smoothstep( 0.0, ${f(L.over.rise)}, d ) );
	// Seen so foreshortened, the moon is drawn taller up the face than across it, so it is round as the view has it.
	vec2 m = vec2( k.x - ${f(L.moon.at[0])}, ( d - ${f(L.moon.at[1])} ) * ${f(L.moon.squash)} );
	float r = length( m );
	v *= ( 1.0 + ${f(L.over.halo)} * exp( - r * r / ${f(L.moon.reach * L.moon.reach)} ) ) * ( 0.93 + 0.14 * pyrNoise( vec2( k.x / 21.0, 8.0 ) ) );
	return v + ${f(L.moon.power)} * clamp( 0.5 - ( r - ${f(L.moon.r)} ) / fp, 0.0, 1.0 ) + ${f(L.moon.glow[0])} * exp( - max( r - ${f(L.moon.r)}, 0.0 ) / ${f(L.moon.glow[1])} );
}
// A soft box at c, half size h, as a share of the pixel it covers, its edges e soft.
float pyrBox( vec2 p, vec2 c, vec2 h, float e ) {
	vec2 o = abs( p - c ) - h;
	return clamp( 0.5 - max( o.x, o.y ) / max( e, 1e-4 ), 0.0, 1.0 );
}
// What the face turned from the moon mirrors: the night, near black high up; a horizon that meets the other face's at
// the front arris, with the city's glow along it; on it the low buildings of the city's left end with their windows
// lit; and low down the trees before its foot as soft crowns, and the land's strip under them. lo and hi are the
// piece's foot and top. fB and fT as for pyrSky.
float pyrDarkNight( vec2 q, vec2 s, float lo, float hi, float fB, float fT ) {
	vec2 k = PYR_AT( ${f(D.night.D)} );
	float h = clamp( ( k.y - lo ) / max( hi - lo, 1.0 ), 0.0, 1.0 );
	float l = mix( ${f(D.night.low)}, ${f(D.night.top)}, smoothstep( 0.0, 1.0, h ) );
	// Upright as the view has it, the city and its horizon.
	vec2 t = PYR_AT( ${f(H.D)} );
	t.x -= ${f(UPRIGHT)} * t.y;
	float hz = ${f(hzAt)} + ${f(hzRise)} * ( t.x + ${f(HALF)} ) + ${f(H.wander)} * ( pyrNoise( vec2( t.x / 13.0, 6.0 ) ) - 0.5 );
	float sd = ( t.y - hz ) / ${f(H.wide)};
	l *= 1.0 + ${f(H.power)} * exp( - sd * sd ) * ( 0.75 + 0.25 * pyrNoise( vec2( t.x / 23.0, 5.0 ) ) );
	float base = l, warm = 0.0;
	if ( hi < ${f(TALL - 1)} ) {
		float e = fB + ${f(H.D)} * fT + ${f(CI.blur)};
		float c0 = floor( t.x / ${f(CI.lot)} );
		for ( int i = - 1; i <= 1; i++ ) {
			float c = c0 + float( i ), h1 = pyrHash( vec2( c, 1.7 ) ), h2 = pyrHash( vec2( c, 4.3 ) ), h3 = pyrHash( vec2( c, 9.1 ) );
			float w = ${f(CI.lot)} * mix( ${f(CI.wide[0])}, ${f(CI.wide[1])}, h1 ), cx = ( c + 0.5 ) * ${f(CI.lot)} + ( ${f(CI.lot)} - w ) * ( h2 - 0.5 );
			float top = mix( ${f(CI.tall[0])}, ${f(CI.tall[1])}, h3 * h3 );
			vec2 p = vec2( t.x - cx, t.y - hz );
			float on = pyrBox( p, vec2( 0.0, 0.5 * top - 1.0 ), vec2( 0.5 * w, 0.5 * top + 1.0 ), e );
			if ( on <= 0.0 ) continue;
			float bl = mix( ${f(CI.level[0])}, ${f(CI.level[1])}, pyrHash( vec2( c, 6.6 ) ) ) * ( 0.85 + 0.3 * smoothstep( 0.0, top, p.y ) );
			l = mix( l, bl, on );
			// Its windows, in a grid of cells from its foot, each lit or not and each its own brightness.
			vec2 g = vec2( ( p.x + 0.5 * w ) / ${f(CI.cell[0])}, ( p.y - 0.4 ) / ${f(CI.cell[1])} ), gi = floor( g );
			vec2 wc = ( gi + 0.5 ) * vec2( ${f(CI.cell[0])}, ${f(CI.cell[1])} ) + vec2( - 0.5 * w, 0.4 );
			float lit = step( 1.0 - ${f(CI.lit)}, pyrHash( gi + c * 7.13 ) ) * step( 0.0, gi.y ) * step( wc.y + 0.6, top ) * step( abs( wc.x ), 0.5 * w - 0.5 );
			float wl = mix( ${f(CI.light[0])}, ${f(CI.light[1])}, pyrHash( gi * 1.31 + c ) );
			float win = lit * pyrBox( p, wc, vec2( ${f(CI.win[0] / 2)}, ${f(CI.win[1] / 2)} ), e ) * on;
			l = mix( l, wl, win );
			warm = max( warm, win );
		}
		// The crowns, each a round top, the nearest of three, soft, dark in their shade and lit on their tops.
		vec2 p = PYR_AT( ${f(TR.D)} );
		float fp = fB + ${f(TR.D)} * fT + ${f(TR.blur)}, c0t = floor( p.x / ${f(TR.gap)} ), dd = p.y - 2.5 - 0.8 * pyrNoise( vec2( p.x / 9.0, 1.0 ) ), lift = 0.0;
		for ( int i = - 1; i <= 1; i++ ) {
			float c = c0t + float( i ), cx = ( c + 0.15 + 0.7 * pyrHash( vec2( c, 3.3 ) ) ) * ${f(TR.gap)};
			float r = mix( ${f(TR.r[0])}, ${f(TR.r[1])}, pyrHash( vec2( c, 5.9 ) ) );
			float top = mix( ${f(TR.tall[0])}, ${f(TR.tall[1])}, pyrHash( vec2( c, 8.1 ) ) );
			vec2 o = vec2( p.x - cx, ( p.y - ( top - r ) ) * 1.1 );
			float de = length( o ) - r;
			if ( de < dd ) { dd = de; lift = clamp( o.y / r, 0.0, 1.0 ); }
		}
		dd += 0.6 * ( pyrNoise( p * 0.8 ) - 0.5 ) + 0.3 * ( pyrNoise( p * 2.1 + 7.0 ) - 0.5 );
		float tree = clamp( 0.5 - dd / max( fp, 1e-4 ), 0.0, 1.0 );
		float tl = mix( ${f(TR.shade)}, ${f(TR.top)}, lift * lift ) * ( 0.8 + 0.4 * pyrNoise( p * 1.3 + 3.0 ) );
		l = mix( l, tl, tree );
		warm = max( warm, tree * lift );
		l += ${f(N.strip.dark)} * exp( - max( p.y, 0.0 ) / ${f(N.strip.tall)} ) * ( 0.8 + 0.2 * pyrNoise( vec2( p.x / 13.0, 9.0 ) ) );
	}
	// What is mirrored shows more toward grazing.
	l = mix( base, l, pFres );
	pWarm = warm;
	return l;
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

  // After <color_fragment>: how each stone is laid at this pixel (pKick: the kick and the bow; pTilt: the sheet's own
  // lie), and the casing's joints, kept for the later steps.
  const COLOR = `
vec2 pTilt = vec2( 0.0 ), pKick = vec2( 0.0 );
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
		vec2 rel = vec2( s, y * ${f(SLANT / TALL)} ) - ( cap ? vec2( 0.0, ${f(capMid * SLANT / TALL)} ) : vec2( ${f(N.bow.heart[0])}, ${f(N.bow.heart[1] * SLANT / TALL)} ) );
		pKick = ${v2(N.kick.at)} * clear + rel * ( cap ? vec2( ${f(N.bow.cap)} ) : ${v2(N.bow.per)} );
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
		// Seen from far off a row is a few pixels: a sheet's own lie fades out before it can alias.
		float big = smoothstep( 1.5, 4.0, R / fu );
		bool nearL = x - xL < xR - x;
		float ds = ( nearL ? x - xL : xR - x ) * P;
		float shows = smoothstep( ${f(J.shows[0])}, ${f(J.shows[1])}, pyrHash( vec2( nearL ? col : col + 1.0, seed + 0.5 ) ) );
		// The seams fade out before a row is so few pixels that they would read as ribbing. Each is its own depth.
		float hair = smoothstep( ${f(J.fade[0])}, ${f(J.fade[1])}, R / fu );
		float dLo = mix( ${f(J.line[0])}, ${f(J.line[1])}, pyrHash( vec2( lo, side + 9.0 ) ) ), dHi = mix( ${f(J.line[0])}, ${f(J.line[1])}, pyrHash( vec2( hi, side + 9.0 ) ) );
		pJoint = hair * max( max( dLo * pyrLine( y - yLo, ${f(C.line)}, fy ), dHi * pyrLine( y - yHi, ${f(C.line)}, fy ) ), ${f(J.plate)} * shows * pyrLine( ds, ${f(C.line)}, fs ) );
		// How the sheet lies: pillowed, so it turns out toward its edges; a few proud, a few dented.
		vec2 ab = vec2( ( x - xL ) / max( xR - xL, 1e-3 ), ( y - yLo ) / max( yHi - yLo, 1e-3 ) ) * 2.0 - 1.0;
		vec2 own = ab * ${f(T.pillow)} * ( 0.5 + h1 );
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
		float dR = ( hw - s ) * ${f(ACROSS)}, dL = ( hw + s ) * ${f(ACROSS)};
		vec3 nb = dR < dL ? vec3( a.x * hl, n.y, a.y * hl ) : vec3( - a.x * hl, n.y, - a.y * hl );
		pEdge = min( dR, dL );
		float w = 0.5 * ( 1.0 - min( dR, dL ) / ${f(FORM.round.seen.arris)} );
		float top = vKind < 0.125 ? 0.5 * ( 1.0 - ( ${f(FORM.cap.from)} - y ) / ${f(Math.sin(SLOPE) * FORM.round.seen.lip)} ) : 0.0;
		if ( top > w && top > 0.0 ) {
			pBend = normalize( mix( n, vec3( 0.0, 1.0, 0.0 ), top ) );
			pSpread = ${f(SLOPE)} / ${f(FORM.round.seen.lip)} * pix * min( 1.0, top * 10.0 );
			pBent = 1.0;
		} else if ( w > 0.0 ) {
			pBend = normalize( mix( n, nb, w ) );
			pArris = ( n.x + nb.x < 0.0 && n.z + nb.z > 0.0 ) ? 1.0 : 0.0;
			pSpread = ${f(TURN)} / ${f(FORM.round.seen.arris)} * pix * min( 1.0, w * 10.0 );
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

  // Before <lights_fragment_end>: what the gold mirrors and the lights it catches, in place of the stage's own. The
  // moon's highlight is worked out here, with the plates' own normals, and lit by the share of the moon the place
  // sees (baked): the stage's own light from the moon is left out (uMoonSpec). The world's light then takes some of
  // the night away where the place is shut in; a mirror is shut in only where what it mirrors is hidden, so most of
  // that is given back and a little contact shadow is kept.
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
	vec2 fq = fwidth( q ), fsv = fwidth( s );
	float fB = max( fq.x, fq.y ), fT = max( fsv.x, fsv.y );
	bool neck = abs( vKind - ${f(KIND.neck)} ) < 0.05, bevel = abs( vKind - ${f(KIND.bevel)} ) < 0.05;
	bool ledge = vKind < 0.1 && nL.y > 0.9;
	bool stone = ! neck && ! bevel && ! ledge;
	pFres = ${f(D.fresnel[0])} + ${f(D.fresnel[1])} * pow( 1.0 - clamp( dot( normal, geometryViewDir ), 0.0, 1.0 ), 2.0 );
	// The moon's own highlight, by each place's own normal: the broad body of the blaze and its narrow heart.
	vec3 nW = inverseTransformDirection( normal, viewMatrix ), vW = inverseTransformDirection( geometryViewDir, viewMatrix );
	vec3 mW = vec3( ${MOON.map(f).join(', ')} ), hW = normalize( mW + vW );
	float seen = 1.0;
	#ifdef WORLD_BAKED
		seen = smoothstep( ${f(M.seen[0])}, ${f(M.seen[1])}, wLight.y );
	#endif
	float lobe = 0.0;
	if ( ! neck ) {
		float c = dot( nW, hW ), polish = ( vKind > 0.875 ? ${f(M.cap)} : 1.0 ) * smoothstep( 0.0, 0.2, dot( nW, mW ) ) * seen;
		lobe = polish * ( ${f(M.body.power)} * pyrLobe( c, ${f(M.body.rough)} * pSoft ) + ${f(M.heart.power)} * pow( pyrLobe( c, ${f(M.heart.rough)} * pSoft ), ${f(M.heart.sharp)} ) );
	}
	if ( neck ) pLevel = ${f(E.neck)};
	else if ( ledge ) pLevel = mix( ${f(E.ledge[0])}, ${f(E.ledge[1])}, smoothstep( - 0.4, 0.6, rW.x ) );
	else if ( bevel ) pLevel = 0.03 + ${f(E.bevel)} * smoothstep( 0.45, 0.95, rW.y );
	else if ( toMoon && vKind < 0.1 ) {
		// The face toward the moon in two fields: the desert under the mirrored horizon, shaped by the moon's broad lobe,
		// with the court and the land at its foot; and over it the moon's side of the sky.
		float d, above = pyrSky( q, s, fB, fT, d );
		pSky = above;
		float m = clamp( lobe / ${f(LOBE)}, 0.0, 1.2 );
		float ground = pyrCourt( q, s, fB, fT, pyrDesert( q, s, fB, fT, d ) * mix( ${f(L.lobe[0])}, ${f(L.lobe[1])}, m ) );
		pLevel = mix( ground, pyrMoonSky( q, s, fB, fT, d ), above );
	}
	else if ( toMoon ) pLevel = lobe;
	else pLevel = ( vKind > 0.875 ? pyrDarkNight( q, s, ${f(capFoot)}, ${f(TALL)}, fB, fT ) : pyrDarkNight( q, s, 0.0, ${f(FORM.cap.from)}, fB, fT ) ) + lobe;
	// The capstone's face toward the moon is one flat stone polished harder than the faces: the moon's light rakes
	// along its upper slope, so it is brightest toward the apex, and it mirrors the same wavy horizon, at its own scale,
	// with the sky over it.
	if ( toMoon && vKind > 0.875 && stone ) {
		float hc = clamp( ( vQ.y - ${f(capFoot)} ) / ${f(TALL - capFoot)}, 0.0, 1.0 ), fy = max( fwidth( vQ.y ), 1e-4 );
		pLevel *= ${f(K.lobe)} * mix( ${f(K.rake[0])}, ${f(K.rake[1])}, smoothstep( 0.15, 0.95, hc ) );
		vec2 k = PYR_AT( ${f(L.sky.D / 4)} );
		float hw = ${f(HALF)} * ( 1.0 - vQ.y / ${f(TALL)} ), uc = clamp( k.x / max( hw, 1.0 ), - 1.0, 1.0 ), r = smoothstep( - hw, hw, q.x );
		float yb = ${f(capFoot + K.band.at)} + ${f(K.band.rise)} * k.x + ${f(K.band.bow)} * ( 1.0 - uc * uc ) + ${f(K.band.wander)} * ( pyrNoise( vec2( k.x / ${f(K.band.wave)}, 6.0 ) ) - 0.5 ), db = yb - k.y;
		float glow = mix( ${f(K.band.power)}, ${f(K.band.powerR)}, r ) * exp( - max( db, 0.0 ) / mix( ${f(K.band.wide)}, ${f(K.band.wideR)}, r ) );
		// Under its horizon, the same desert as the face's, drawn at the capstone's scale.
		float ks = ${f(K.desert[0])}, dunes = ${f(K.desert[1])} * pyrDesert( q * ks, s * ks, fB * ks, fT * ks, - db * ks );
		float sky = mix( ${f(K.sky[0])}, ${f(K.sky[1])}, smoothstep( 0.0, ${f(K.sky[2])}, - db ) );
		pSky = clamp( 0.5 - db / max( fy + ${f(L.sky.D / 4)} * fT, 1e-4 ), 0.0, 1.0 );
		pLevel = mix( pLevel + glow + dunes, sky, pSky );
	}
	// The front arris's line is brightest low and wavers along its length as a polished round does: of one weight from
	// top to foot it read as a drawn stroke. The outlines are kept faint, and uneven.
	// They are the rounds' own: the kicked plates of a face may turn to the same lights, and lit the whole face.
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
		// The cursor: its light mirrored as a short lamp on the flat face. Where the cursor's ray meets the face's plane,
		// across and up, is drawn in toward the face's middle (as a far light's reflection moves less than the light),
		// so the lamp is on the face wherever the pointer is over the top of the world and slides across it as the
		// pointer moves. Each sheet's own lie moves it by a hair, so it breaks a little at each seam.
		vec3 nF = normalize( ( viewMatrix * vec4( uToWorld * nL, 0.0 ) ).xyz );
		float gk = dot( nF, vRay ), gt = dot( nF, geometryPosition ) / ( abs( gk ) > 1e-6 ? gk : 1e-6 );
		vec3 gOff = ( vec4( geometryPosition - vRay * gt, 0.0 ) * viewMatrix ).xyz * uToWorld / uUnit;
		vec2 hit = q - vec2( dot( gOff, tA ), dot( gOff, tU ) * ${f(TALL / SLANT)} );
		vec2 gc = vec2( ${f(G.reach)} * tanh( hit.x / ${f(G.reach)} ), clamp( hit.y, ${f(G.rest[0])}, ${f(G.rest[1])} ) );
		vec2 gq = q + ${f(G.D)} * s * ( 1.0 - pBent );
		vec2 ge = vec2( gq.x - gc.x - ( toMoon ? ${f(UPRIGHT_LIT)} : ${f(UPRIGHT)} ) * ( gq.y - gc.y ), gq.y - gc.y );
		vec2 bo = abs( ge ) - ${v2(G.half)} + ${f(G.round)};
		float sdf = length( max( bo, 0.0 ) ) + min( max( bo.x, bo.y ), 0.0 ) - ${f(G.round)};
		float lamp = clamp( 0.5 - sdf / max( fB, 1e-3 ), 0.0, 1.0 ) + ${f(G.halo[1])} * exp( - max( sdf, 0.0 ) / ${f(G.halo[0])} );
		float on = step( 0.0, gt ) * min( uGlint.r, 1.0 ) * smoothstep( ${f(G.clear[0])}, ${f(G.clear[1])}, pEdge );
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
  // wear on the arrises and the foot course's edge, the capstone's faint groove and the foot course's shadow line are
  // drawn here.
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
	if ( face && vKind < 0.1 ) lv *= 1.0 - ${f(E.shadow)} * pyrBand( y, ${f(FORM.foot.tall)} - 0.5, ${f(FORM.foot.tall + E.shadowTall)}, 0.5 * fy );
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
	// The capstone's border: a faint groove so far in from its edges, deeper in some places than in others.
	if ( face && vKind > 0.875 ) {
		vec2 a = vec2( n.z, - n.x ) / hl;
		float s = dot( vQ.xz, a ), hw = ${f(HALF)} * ( 1.0 - y / ${f(TALL)} );
		float d = min( min( hw - s, hw + s ) * ${f(ACROSS)}, ( y - ${f(FORM.cap.from + FORM.cap.reveal)} ) * ${f(SLANT / TALL)} ), fd = max( fwidth( d ), 1e-5 );
		lv *= 1.0 - ${f(K.dark)} * pyrNoise( vec2( ( s + y ) / 5.0, 17.0 ) ) * pyrLine( d - ${f(K.border)}, ${f(K.groove)}, fd );
	}
	vec3 deep = mix( mix( uDeepC, uBodyC, smoothstep( uGradeLo.x, uGradeLo.y, lv ) ), uWarmC, pWarm );
	// The sky over the horizon in the face toward the moon keeps some of the body's saturated color.
	vec3 c = mix( mix( deep, uMidC, smoothstep( uGradeAt.x, uGradeAt.y, lv ) * ( 1.0 - ${f(L.over.rich)} * pSky ) ), uPaleC, smoothstep( uGradeAt.z, uGradeAt.w, lv ) ) * lv;
	outgoingLight = c;
}`;
  return { PARS, COLOR, ROUGH, NORMAL, ENV, GRADE };
}
