import * as THREE from 'three';
import { unshown } from '../../../../world/tone';
import { LAND, VIEW, seeded } from '../../layout';
import { WARM } from '../../light';
import { PLACED_GLSL } from './sheet';

// The sand that leaves the dunes of picture 10 (?look=d): it drapes over the planet's right rim, runs down the
// cratered side in thin veils and off its corner in long strands, and the wind lifts it off the dunes' crests.
//
// A fall is made of strands. Each strand is one ribbon from the rim down, with a texture of grains that runs down
// it at the speed sand falls, and with grains of its own, one small quad each, that fall along it and round it.
// The lists of ribbons and grains are written once: where each sets off, how it moves and how it looks. The
// graphics card works out where each is from the clock alone, so nothing is rewritten while they run. A grain
// lives for its own length of time and then sets off again, each time a little elsewhere and at another speed, and
// every strand thins and thickens by itself, so nothing is seen to repeat.

// The front edge of the sand on the cratered side as the page draws it, from left to right, in the host's units
// from its top left, and how far toward the eye the picture has the sand there. The last is the planet's corner.
const RIM = [[1101.1, 415.8, 611], [1137.4, 422.3, 587], [1173.8, 425.2, 560], [1210.2, 425.6, 528], [1246.6, 422.3, 497], [1283.0, 415.8, 454], [1319.4, 404.9, 403], [1355.8, 390.3, 332], [1373.9, 381.2, 285], [1394.0, 365.9, 211]] as const;
// The sand's front edge all along the dunes: the two places left of the cratered side are read off the picture.
const EDGE = [[1003, 383], [1050, 393], ...RIM.map(([x, y]) => [x, y])];
// How far down the host that edge is at a place across it.
export const SAND_EDGE = /* glsl */ `
float sandEdge( float x ) {
	float y = ${EDGE[0][1].toFixed(4)};
	${EDGE.slice(1).map((e, i) => `y += ${(e[1] - EDGE[i][1]).toFixed(4)} * clamp( ( x - ${EDGE[i][0].toFixed(4)} ) / ${(e[0] - EDGE[i][0]).toFixed(4)}, 0.0, 1.0 );`).join('\n\t')}
	return y;
}`;
// The dunes' crests as the page draws them, each from one end to the other, in the same units. The hollow face of
// each is to its left and under it.
const CRESTS = [
  [[1141.2, 341.9], [1158.1, 333.7], [1177.5, 326.0], [1198.0, 323.0], [1216.7, 328.5], [1231.9, 341.8], [1234.6, 364.2], [1218.9, 380.2], [1201.8, 390.5]],
  [[1071.9, 323.6], [1086.7, 319.3], [1098.4, 315.2], [1110.6, 312.5], [1120.4, 330.5], [1106.9, 342.7], [1100.0, 355.6]],
  [[1051.5, 380.5], [1068.4, 379.5], [1086.5, 379.4], [1099.8, 382.4], [1106.5, 387.9]],
  [[1242.0, 336.5], [1249.1, 334.2], [1257.7, 332.2], [1267.1, 333.9], [1280.9, 336.3]],
  [[1300.9, 345.9], [1316.2, 341.3], [1331.9, 336.2], [1344.3, 337.9], [1352.6, 342.6], [1357.1, 347.7]],
] as const;

// How sand moves. `pull` is how fast a grain gathers speed, in units a second each second, until the air holds it
// at its own most speed. `takes` is how fast it takes up the wind, in shares a second. `shutter` is for how long a
// grain is drawn along its own way, in seconds. `sways` is how the falls waver in the air: by how many units, once
// the sand has fallen `by` units, in how many turns a unit of height, running down at this many turns a second.
const MOVES = { pull: 34, takes: 1.6, shutter: 0.045, sways: { far: 4.5, by: 150, turns: 0.011, rate: 0.5 } } as const;
// A kind of fall: how many strands (of a veil, the first is its main one, the longest and widest), how long a
// strand is, how wide at the rim, how strong it shows, the most speed of its sand, the least it thins to (1 never
// thins) and how fast it changes, in changes a second, over what share of its length it shows in full before it
// fades, how much it breaks into lines along its length (0 is a smooth sheet), how many grains fall with a strand,
// how far round it they set off and how fast they stray to either side, in units and units a second. A kind with
// a `tongue` leaves the rim that many units wide and is drawn in to its strand within about `draws` units.
interface Kind { strands: number; long: readonly [number, number]; wide: readonly [number, number]; strength: readonly [number, number]; most: readonly [number, number]; least: number; pace: number; holds: number; lines: number; grains: number; round: number; strays: number; tongue?: readonly [number, number]; draws?: readonly [number, number] }
// The veils that run down the cratered side: where each leaves the rim, across the host, and within how many
// units of there its strands are. The first is this share as long as the last, which is nearest the corner.
const VEILS = { at: [1247, 1272, 1298, 1318, 1343, 1362, 1380], within: 6, strands: 3, long: [100, 250], wide: [3, 6.5], strength: [1.2, 1.6], most: [50, 72], least: 0.6, pace: 0.23, holds: 0.4, lines: 0.2, grains: 170, round: 2.2, strays: 2.2, grows: 0.45, tongue: [22, 46], draws: [10, 20] } as const;
// The fall off the planet's corner: from where to where along the rim it leaves.
const CORNER = { from: [1377, 1395], strands: 8, long: [280, 560], wide: [2.2, 6], strength: [0.55, 0.92], most: [56, 90], least: 0.6, pace: 0.17, holds: 0.45, lines: 0.32, grains: 620, round: 3, strays: 3.2, tongue: [10, 22], draws: [14, 24] } as const;
// The sheet draped over the rim all along it, from where to where: short wide strands that lie over one another.
// It sets off this many units up the sand from the rim, is longest, widest and strongest within about `gathers`
// units of where a veil leaves, and at the corner, and comes in over its first `eases` units along the rim.
const DRAPE = { from: [1236, 1395], strands: 60, long: [10, 62], wide: [8, 15], strength: [0.15, 0.6], most: [34, 52], least: 0.5, pace: 0.4, holds: 0.1, lines: 0.2, grains: 6, round: 4, strays: 1.5, over: 2.5, gathers: 7, eases: 36 } as const;
// A strand narrows to this share of its width at its end, and leans by as much as this many units over its length.
// Its ribbon has this many parts, shorter toward the rim, where a tongue changes width fastest, by this power.
const STRAND = { thins: 0.4, leans: 4, parts: 40, top: 1.6 } as const;
// Sand comes over the rim in surges, and it is by them that a strand is seen to run. How full the sand runs, 0 to
// 1, is made of slow surges, this many a second, and of clumps, `fine` times as many, which count for this `share`
// of it. Between the two `edge`s of that a strand goes from its least to whole: at its least it shows this share
// as strong and, under its tongue, is this share as wide. The surges fall with the sand, the strand's middle this
// many seconds ahead of its edges.
const SURGES = { rate: 2.2, fine: 3.4, share: 0.45, edge: [0.42, 0.58], least: 0.5, narrow: 0.65, lags: 0.12 } as const;
// Where a tongue is at its widest its sand is spread thin: it shows this share as strong. Its grain is in lines
// this many units wide.
const TONGUE = { thin: 0.85, grain: 1.3 } as const;
// Sand that lies on the cratered side runs in soft streaks, as wide as the lines of its grain, and it is by them
// most of all that it is seen to run. Between this many and this many pass a place each second, so a streak is
// longer the faster its sand runs. The faintest show this share as strong and this share as light, and of a
// streak's own chance, 0 to 1, it comes in between the two `edge`s.
const STREAKS = { rate: [3.2, 4.8], low: 0.35, dark: 0.8, edge: [0.36, 0.64] } as const;
// Sand on the cratered side lies on it, so it takes the wall's light: it is gone where the picture has the wall as
// dark as `dark`, as in a crater's hollow, and whole where it is as light as `lit`.
const WALL = { dark: 0.08, lit: 0.2 } as const;
// How much of the sand at a place on the host shows, for sand that lies on the cratered side (1) and sand that
// does not (0).
const WALLED = /* glsl */ `
uniform sampler2D uTone;
uniform sampler2D uCut;
float walled( vec2 at, float lies ) {
	vec2 p = ( at - WALL_BOX.xy ) / WALL_BOX.zw, in01 = step( vec2( 0.0 ), p ) * step( p, vec2( 1.0 ) );
	float on = lies * in01.x * in01.y * step( 0.5, textureLod( uCut, p, 0.0 ).g );
	return mix( 1.0, smoothstep( ${WALL.dark.toFixed(4)}, ${WALL.lit.toFixed(4)}, dot( textureLod( uTone, p, 3.0 ).rgb, vec3( 0.2126, 0.7152, 0.0722 ) ) ), on );
}`;
// A grain: how wide, in units, and how strong it shows. This share of a strand's grains set off round it and not
// in it, this many times as far out.
const GRAIN = { wide: [0.6, 1.2], strength: 0.55, loose: 0.3, out: 5 } as const;
// What the wind lifts off the crests. The wind, in units a second across the host (to the left, over the hollow
// faces). How fast the sand leaves a crest upward, and how slowly it comes to its most speed down, in shares a
// second. It is thin streaks of dust (how many, how wide, how many times as long, how strong) and grains in them.
const WISPS = { wind: -26, lift: [0, 4], quick: 1.2, most: [7, 13], life: [0.6, 1.5], strays: 5, least: 0.12, pace: 0.55, streaks: 1100, wide: [1.4, 3], long: 9, strength: 0.07, grains: 1300, grain: 0.22 } as const;
// The fine dust that hangs round the corner's fall and the veils: soft, wide and faint.
const DUST = { grains: 900, most: [18, 38], life: [5, 9], strays: 5, wide: [2, 5], strength: 0.06, least: 0.5, pace: 0.2 } as const;
// How far in front of the sand's edge the falls stand, and the wisps in front of the planet's nearest point, in units.
const AHEAD = 12;
// The sand's color where the moon lights it, as the screen shows it: `pale` as it goes over the rim, `lit` once it
// has fallen `lip` units. Sand keeps `dim` of that once it has fallen `by` units under the rim. This share of the
// grains glint as they turn, by this much. Nothing of it is brighter than `most` as light, which is under what
// the world's glow starts at.
const SAND = { pale: [250, 192, 122], lip: 26, lit: [232, 168, 100], dim: 0.55, by: 300, glints: 0.14, glint: 1.5, most: 1.35 } as const;
// The cursor parts the falling sand: it is moved off its way by as much as `far` units, within about `wide` units
// of the cursor. And the cursor's light is this strong on it.
const PARTED = { far: 14, wide: 46, light: 2.2 } as const;
// What the falling sand does under the cursor (?sand=): as it was built, or one of the three he chooses between.
// In those three nothing is pushed out of the cursor's way and the wisps off the crests take none of its light.
// Sand that lies on the cratered side takes the light as the wall does, sand in the air `air` of that and the fine
// dust round the falls `dust` of it, so a lit fall is one soft body.
export const ANSWERS = ['built', 'calm', 'glint', 'part'] as const;
export type Answer = (typeof ANSWERS)[number];
export const answerOf = (query: URLSearchParams): Answer => ANSWERS.find((a) => a === query.get('sand')) ?? 'built';
const CALM = { air: 0.55, dust: 1.6 } as const;
// `glint`: between this little and this much of the cursor's light a share of a fall's grains come to glint as
// they turn, where SAND.glints of them do at rest, this many times as strong, and a glinting grain is drawn this
// many times as wide.
export const GLINTS = { edge: [0.25, 0.8], share: 0.7, strong: 2.2, wide: 1.6 } as const;
// `part`: the fall off the corner turns aside as one body. All of its sand at a height is moved across by the same
// amount, never apart: by as much as `far` units when the cursor is `beside` units to one side of the fall's
// middle, by nothing when it is on the middle. The turn is made within `over` units above and below the cursor,
// and the sand stays aside under it, as a stream turned aside does. Sand within `by` units of the rim stays put,
// and a cursor more than `above` units over the rim turns nothing.
const TURNED = { far: 14, beside: 28, over: 70, by: 60, above: 50 } as const;

const f = (n: number): string => n.toFixed(4);
const v3 = (a: readonly number[]): string => `vec3( ${a.map(f).join(', ')} )`;
// How long sand whose most speed is this takes to fall this far, near enough: right at the start, where it only
// gathers speed, and far down, where the air holds it.
const takes = (far: number, most: number): number => Math.sqrt(2 * far / MOVES.pull + (far / most) ** 2);

export const CHANCE = /* glsl */ `
float chance( float p ) { p = fract( p * 0.1031 ); p *= p + 33.33; p *= p + p; return fract( p ); }
float chance( vec2 p ) { vec3 q = fract( vec3( p.xyx ) * 0.1031 ); q += dot( q, q.yzx + 33.33 ); return fract( ( q.x + q.y ) * q.z ); }
float wave( float x ) { float i = floor( x ), k = fract( x ); k = k * k * ( 3.0 - 2.0 * k ); return mix( chance( i ), chance( i + 1.0 ), k ); }
float wave( vec2 p ) { vec2 i = floor( p ), k = fract( p ); k = k * k * ( 3.0 - 2.0 * k ); return mix( mix( chance( i ), chance( i + vec2( 1.0, 0.0 ) ), k.x ), mix( chance( i + vec2( 0.0, 1.0 ) ), chance( i + vec2( 1.0, 1.0 ) ), k.x ), k.y ); }
// How much of a fall there is in what left the rim at this time: each has its own number and thins to its least.
float flowing( float left, float which, float least, float pace ) { return mix( least, 1.0, smoothstep( 0.3, 0.75, wave( left * pace + which * 7.31 ) ) ); }`;
// What a ribbon and a grain have alike: how the falls waver, what the cursor does to them, and the sand's color at
// a place with the cursor's light on it.
const SHARED = /* glsl */ `
uniform float uTime;
uniform vec3 uLamp;
uniform float uPixel;
${unshown(WARM, SAND.most)}
${PLACED_GLSL}
${CHANCE}
float swayed( float fallen, float y, float which ) {
	return ${f(MOVES.sways.far)} * smoothstep( 0.0, ${f(MOVES.sways.by)}, fallen ) * ( wave( y * ${f(MOVES.sways.turns)} - uTime * ${f(MOVES.sways.rate)} + which * 3.7 ) * 2.0 - 1.0 );
}
// Where the cursor moves sand to. The last is 1 for the sand of the fall off the corner, which is in the air.
vec2 moved( vec2 at, float fallen, float free ) {
#if SAND_ANSWER == 0
	vec2 off = at - uLamp.xy;
	float d2 = dot( off, off );
	return at + off * ( ${f(PARTED.far)} * uLamp.z * exp( - d2 / ${f(2 * PARTED.wide * PARTED.wide)} ) / sqrt( d2 + 4.0 ) );
#elif SAND_ANSWER == 3
	float side = ( ${f((CORNER.from[0] + CORNER.from[1]) / 2)} - uLamp.x ) / ${f(TURNED.beside)};
	float turn = side * exp( 0.5 - 0.5 * side * side ) * smoothstep( uLamp.y - ${f(TURNED.over)}, uLamp.y + ${f(TURNED.over)}, at.y ) * smoothstep( 0.0, ${f(TURNED.by)}, fallen ) * smoothstep( ${f(RIM[RIM.length - 1][1] - TURNED.above)}, ${f(RIM[RIM.length - 1][1])}, uLamp.y );
	return at + vec2( ${f(TURNED.far)} * uLamp.z * free * turn, 0.0 );
#else
	return at;
#endif
}
// How much of the cursor's light is at a place: 1 right under it.
float lamped( vec2 at ) {
	vec2 off = at - uLamp.xy;
	float d = sqrt( dot( off, off ) + LAMP_LIFT * LAMP_LIFT ) / LAMP_NEAR, reach = 1.0 / ( 1.0 + d * d ), full = 1.0 / ( 1.0 + LAMP_LIFT * LAMP_LIFT / ( LAMP_NEAR * LAMP_NEAR ) );
	return uLamp.z * reach * reach / ( full * full );
}
// The sand's color at a place, with this share of the cursor's light on it.
vec3 sand( vec2 at, float fallen, float lip, float takes ) {
	vec3 c = unshown( mix( ${v3(SAND.lit.map((x) => x / 255))}, ${v3(SAND.pale.map((x) => x / 255))}, lip * ( 1.0 - smoothstep( 0.0, ${f(SAND.lip)}, fallen ) ) ) ) * mix( 1.0, ${f(SAND.dim)}, smoothstep( 0.0, ${f(SAND.by)}, fallen ) );
	vec2 off = at - uLamp.xy;
	float d = sqrt( dot( off, off ) + LAMP_LIFT * LAMP_LIFT ) / LAMP_NEAR, reach = 1.0 / ( 1.0 + d * d );
	return c + dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ) * LAMP_HOT * ( ${f(PARTED.light)} * uLamp.z * reach * reach * takes );
}
// Brought down whole to the most it may be: cut channel by channel, lit sand lost its red first and went yellow.
vec3 kept( vec3 c ) { return c * min( 1.0, ${f(SAND.most)} / max( c.r, max( c.g, c.b ) ) ); }`;

const RIBBON_VERT = /* glsl */ `
attribute vec4 aFrom;
attribute vec4 aBody;
attribute vec4 aFlow;
attribute vec4 aShape;
attribute vec2 aLies;
varying vec2 vAt;
varying vec4 vFlow;
varying vec4 vColor;
varying vec3 vOwn;
varying vec2 vWide;
varying vec3 vWall;
${SHARED}
void main() {
	float share = position.y, fallen = share * aFrom.w;
	vec2 at = aFrom.xy + vec2( aBody.w * share * share, fallen );
	at.x += swayed( fallen, at.y, aFlow.x );
	at = moved( at, fallen, 1.0 - aLies.y );
	float more = aShape.z * exp( - fallen / max( aShape.w, 1.0 ) );
	float full = aBody.x * mix( 1.0, ${f(STRAND.thins)}, share ) + more, wide = max( full, 1.5 * uPixel );
#if SAND_ANSWER == 0
	vec3 c = sand( at, fallen, 1.0, 1.0 );
#else
	vec3 c = sand( at, fallen, 1.0, mix( ${f(CALM.air)}, 1.0, aLies.y ) );
#endif
	at += vec2( 1.0, aLies.x ) * ( position.x * wide );
	gl_Position = projectionMatrix * modelViewMatrix * vec4( placed( at, aFrom.z ), 1.0 );
	vAt = vec2( position.x * 2.0, share );
	vFlow = vec4( sqrt( 2.0 * fallen / ${f(MOVES.pull)} + fallen * fallen / ( aFlow.w * aFlow.w ) ), aFlow.xyz );
	vColor = vec4( kept( c ), aBody.y * full / wide * mix( 1.0, ${f(TONGUE.thin)}, more / full ) );
	vOwn = vec3( aBody.z, aShape.xy );
	vWide = vec2( full, more / full );
	vWall = vec3( at, aLies.y );
}`;

const RIBBON_FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vAt;
varying vec4 vFlow;
varying vec4 vColor;
varying vec3 vOwn;
varying vec2 vWide;
varying vec3 vWall;
${CHANCE}
${WALLED}
void main() {
	float u = vAt.x, left = uTime - vFlow.x - ${f(SURGES.lags)} * u * u, vSeed = vOwn.x, rate = ${f(SURGES.rate)} * ( 0.75 + 0.5 * chance( vSeed * 53.0 ) );
	float runs = smoothstep( ${f(SURGES.edge[0])}, ${f(SURGES.edge[1])}, mix( wave( left * rate + vSeed * 173.0 ), wave( left * rate * ${f(SURGES.fine)} + vSeed * 291.0 ), ${f(SURGES.share)} ) );
	float narrow = mix( mix( ${f(SURGES.narrow)}, 1.0, runs ), 1.0, vWide.y );
	float across = exp( - mix( 3.5, 1.8, vWide.y ) * u * u / ( narrow * narrow ) ) * ( 1.0 - smoothstep( 0.7, 1.0, abs( u ) ) );
	float thread = 1.0 - vOwn.z + vOwn.z * wave( u * 2.6 + vSeed * 37.0 + 0.8 * wave( left * 0.6 + vSeed * 11.0 ) );
	float surge = mix( ${f(SURGES.least)}, 1.0, runs );
	float lines = ( u * 0.5 + 0.5 ) * max( 1.0, floor( vWide.x / ${f(TONGUE.grain)} ) ) + floor( vSeed * 91.0 ), column = floor( lines ), speck = chance( column + 0.5 );
	float streak = smoothstep( ${f(STREAKS.edge[0])}, ${f(STREAKS.edge[1])}, wave( vec2( lines, left * ( ${f(STREAKS.rate[0])} + ${f(STREAKS.rate[1] - STREAKS.rate[0])} * chance( vSeed * 29.0 ) ) + vSeed * 61.0 ) ) );
	float grains = mix( mix( 1.0 - vOwn.z, 1.0, chance( vec2( column, floor( left * ( 14.0 + 9.0 * speck ) + speck * 7.0 ) ) ) ), mix( ${f(STREAKS.low)}, 1.0, streak ), vWall.z );
	float along = smoothstep( 0.0, 0.02, vAt.y ) * ( 1.0 - smoothstep( vOwn.y, 1.0, vAt.y ) );
	float a = vColor.a * flowing( uTime - vFlow.x, vFlow.y, vFlow.z, vFlow.w ) * across * thread * surge * grains * along;
	a = min( 1.0, a * walled( vWall.xy, vWall.z ) );
	if ( a < 0.003 ) discard;
	gl_FragColor = vec4( vColor.rgb * ( mix( 1.0, mix( ${f(STREAKS.dark)}, 1.0, streak ), vWall.z ) * a ), a );
}`;

const GRAIN_VERT = /* glsl */ `
attribute vec4 aFrom;
attribute vec4 aGoes;
attribute vec4 aLooks;
attribute vec4 aFlow;
attribute vec4 aMore;
attribute vec2 aLies;
varying vec2 vAt;
varying vec4 vColor;
varying float vSoft;
${SHARED}
${WALLED}
void main() {
	float life = aFrom.w, turn = uTime / life + aFlow.y, nth = floor( turn ), age = ( turn - nth ) * life;
	float seed = aLooks.w * 977.0 + nth * 7.31;
	vec4 r = vec4( chance( seed ), chance( seed + 13.7 ), chance( seed + 29.3 ), chance( seed + 47.9 ) );

	float most = aGoes.x * mix( 0.85, 1.2, r.x ), quick = aGoes.y, e = exp( - quick * age ), first = aMore.x * mix( 0.6, 1.4, r.w );
	float fallen = most * ( age - ( 1.0 - e ) / quick ) + first * ( 1.0 - e ) / quick;
	float side = aGoes.z + ( r.y - 0.5 ) * 2.0 * aGoes.w, ex = exp( - ${f(MOVES.takes)} * age );
	float lean = fallen / max( aMore.w, 1.0 );
	vec2 at = aFrom.xy + vec2( ( r.z - 0.5 ) * 1.2 + side * ( age - ( 1.0 - ex ) / ${f(MOVES.takes)} ) + aMore.z * lean * lean, fallen );
	vec2 goes = vec2( side * ( 1.0 - ex ), most * ( 1.0 - e ) + first * e );
	at.x += swayed( fallen, at.y, aFlow.x );
	float wisp = step( 0.5, aLies.y ) * step( aLies.y, 1.5 ), soft = aLooks.z, glints = step( ${f(1 - SAND.glints)}, r.z ), glint = ${f(SAND.glint)};
	at = moved( at, fallen, ( 1.0 - aLies.x ) * ( 1.0 - wisp ) );
#if SAND_ANSWER == 0
	vec3 c = sand( at, fallen, step( 1.5, aMore.w ), 1.0 );
#else
	vec3 c = sand( at, fallen, step( 1.5, aMore.w ), mix( mix( ${f(CALM.air)}, 1.0, aLies.x ), ${f(CALM.air * CALM.dust)}, step( 1.5, aLies.y ) ) * ( 1.0 - wisp ) );
#endif
	float lies = walled( at, aLies.x ), flash = ( 1.0 - soft ) * pow( max( sin( age * ( 5.0 + 9.0 * r.w ) + r.x * 6.2832 ), 0.0 ), 12.0 ), wider = 1.0;
#if SAND_ANSWER == 2
	float near = smoothstep( ${f(GLINTS.edge[0])}, ${f(GLINTS.edge[1])}, lamped( at ) ) * step( 1.5, aMore.w );
	glints = step( 1.0 - mix( ${f(SAND.glints)}, ${f(GLINTS.share)}, near ), r.z );
	glint *= mix( 1.0, ${f(GLINTS.strong)}, near );
	wider += ${f(GLINTS.wide - 1)} * near * glints * flash;
#endif

	float wide = max( aLooks.x, 1.5 * uPixel ) * wider, streak = wide * aMore.y + ( 1.0 - soft ) * length( goes ) * ${f(MOVES.shutter)};
	vec2 way = normalize( goes + vec2( 0.0, 1e-3 ) );
	at += way * ( position.y * streak ) + vec2( way.y, - way.x ) * ( position.x * wide );
	gl_Position = projectionMatrix * modelViewMatrix * vec4( placed( at, aFrom.z ), 1.0 );
	vAt = position.xy * 2.0;
	vSoft = soft;

	float lived = age / life;
	float shows = aLooks.y * flowing( uTime - age, aFlow.x, aFlow.z, aFlow.w ) * smoothstep( 0.0, 0.07, lived ) * ( 1.0 - smoothstep( 0.4, 1.0, lived ) ) * ( aLooks.x * wider / wide ) * min( 1.0, 1.6 * wide * aMore.y / streak ) * lies;
	c *= 1.0 + glints * glint * flash;
	vColor = vec4( kept( c ), shows );
}`;

const GRAIN_FRAG = /* glsl */ `
varying vec2 vAt;
varying vec4 vColor;
varying float vSoft;
void main() {
	float d = dot( vAt, vAt );
	float a = vColor.a * mix( 1.0 - smoothstep( 0.3, 1.0, d ), exp( - 3.5 * d ) * ( 1.0 - smoothstep( 0.7, 1.0, d ) ), vSoft );
	if ( a < 0.003 ) discard;
	gl_FragColor = vec4( vColor.rgb * a, a );
}`;

export interface Falls { group: THREE.Group; dispose(): void }

// The falls, on the clock and the cursor's light the picture they fall from is on (./drawn.ts), with that picture
// as it is shown and its cover, and where on the host it is (across, down, wide, tall): the cursor's light falls by
// half its strength squared at `near` units, stands `lift` units over the picture and is of this color. And what
// the sand does under the cursor.
type Shared = { uTime: THREE.IUniform<number>; uLamp: THREE.IUniform<THREE.Vector3>; uTone: THREE.IUniform<THREE.Texture>; uCut: THREE.IUniform<THREE.Texture> };
export function falls(uniforms: Shared, lamp: { near: number; lift: number; hot: THREE.Color }, box: readonly [number, number, number, number], answer: Answer): Falls {
  const R = seeded(90210), T = seeded(4711), between = (a: readonly [number, number], k = R()): number => a[0] + (a[1] - a[0]) * k;
  const corner = RIM[RIM.length - 1][0];
  const rim = (x: number, which: 1 | 2 = 1): number => {
    const j = RIM.findIndex((p) => p[0] >= x), i = j < 0 ? RIM.length - 1 : Math.max(1, j), a = RIM[i - 1], b = RIM[i];
    return a[which] + (b[which] - a[which]) * Math.min(1, Math.max(0, (x - a[0]) / (b[0] - a[0])));
  };
  const toward = (x: number): number => rim(x, 2) + AHEAD;

  const ribbons: number[][] = [], grains: number[][] = [];
  // One grain: where it sets off and how far toward the eye, how long it lives, its most speed and how fast it
  // comes to it, the wind on it and how it strays, how wide and strong and soft it is, which fall it thins with,
  // the least that thins to and how fast it changes, its first speed down, how many times as long as wide it is
  // drawn, the lean and length of the strand it falls with, whether it lies on the cratered side, and whether it is
  // a wisp's or the dust's and not a fall's own.
  const grain = (o: { at: [number, number, number]; life: number; most: number; quick?: number; wind?: number; strays: number; wide: number; strength: number; soft?: number; which: number; least: number; pace: number; up?: number; long?: number; lean?: number; strand?: number; lies?: boolean; of?: 'wisp' | 'dust' }): void => {
    grains.push([...o.at, o.life, o.most, o.quick ?? MOVES.pull / o.most, o.wind ?? 0, o.strays, o.wide, o.strength * (0.6 + 0.8 * R()), o.soft ?? 0, R(), o.which, R(), o.least, o.pace, -(o.up ?? 0), o.long ?? 1, o.lean ?? 0, o.strand ?? 1, o.lies ? 1 : 0, o.of === 'wisp' ? 1 : o.of === 'dust' ? 2 : 0]);
  };
  // One strand of a fall, leaving the rim at x, with its grains: `k` is how much of a main strand it is, 0 to 1,
  // and `share` how much of its kind's length and strength it has.
  const strand = (kind: Kind, x: number, k: number, which: number, share = { long: 1, strength: 1 }): void => {
    const x0 = Math.min(x, corner + 1), y0 = rim(x0) - DRAPE.over, long = share.long * between(kind.long, 0.25 * R() + 0.75 * k), wide = between(kind.wide, 0.3 * R() + 0.7 * k), most = between(kind.most), lean = (R() * 2 - 1) * STRAND.leans, deep = toward(x0);
    const tongue = kind.tongue ? Math.min(between(kind.tongue, T()) * k * k, 2 * (corner + 1 - x0)) : 0, draws = kind.draws ? between(kind.draws, T()) : 1;
    const a = Math.min(x0, corner) - 3, b = Math.min(x0 + 3, corner), slope = (rim(b) - rim(a)) / (b - a);
    ribbons.push([x0, y0, deep, long, wide, share.strength * between(kind.strength, 0.3 * R() + 0.7 * k), R(), lean, which, kind.least, kind.pace, most, kind.holds, kind.lines, Math.max(0, tongue), draws, slope, kind === CORNER ? 0 : 1]);
    for (let i = 0; i < kind.grains * (0.5 + k); i++) {
      const loose = R() < GRAIN.loose, own = between(kind.most), gx = x0 + (R() + R() - 1) * kind.round * (loose ? GRAIN.out : 1) * (0.4 + 0.6 * wide / kind.wide[1]);
      grain({ at: [gx, rim(Math.min(gx, corner)) - 1, deep], life: takes(long * (0.55 + 0.6 * R()), own), most: own, strays: kind.strays * (loose ? 2 : 1), wide: between(GRAIN.wide), strength: GRAIN.strength * (loose ? 0.7 : 1), which, least: kind.least, pace: kind.pace, lean, strand: long, lies: kind !== CORNER });
    }
  };

  VEILS.at.forEach((x, v) => { for (let i = 0; i < VEILS.strands; i++) strand(VEILS, x + (i ? (R() * 2 - 1) * VEILS.within : 0), i ? 0.6 * R() : 1, v, { long: VEILS.grows + (1 - VEILS.grows) * v / (VEILS.at.length - 1), strength: 1 }); });
  for (let i = 0; i < CORNER.strands; i++) strand(CORNER, between(CORNER.from), i < 3 ? 1 - 0.15 * i : 0.6 * R(), 7 + i * 0.37);
  for (let i = 0; i < DRAPE.strands; i++) {
    const x = between(DRAPE.from, (i + R()) / DRAPE.strands), gathered = Math.max(x > CORNER.from[0] ? 1 : 0, ...VEILS.at.map((v) => Math.exp(-(((x - v) / DRAPE.gathers) ** 2))));
    strand(DRAPE, x, 0.2 * R() + 0.8 * gathered, 11 + x / 80, { long: 1, strength: Math.min(1, (x - DRAPE.from[0]) / DRAPE.eases) });
  }
  {
    const long = CRESTS.map((c) => c.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - c[i][0], p[1] - c[i][1]), 0)), all = long.reduce((s, l) => s + l, 0);
    CRESTS.forEach((c, k) => {
      for (let i = 0, many = Math.round((WISPS.streaks + WISPS.grains) * long[k] / all); i < many; i++) {
        // More leave the middle of a crest, which stands highest in the wind, than its ends.
        const s = (R() + R() + R()) / 3 * (c.length - 1), j = Math.min(c.length - 2, Math.floor(s)), u = s - j, streak = i % 2 === 0;
        const x = c[j][0] + (c[j + 1][0] - c[j][0]) * u, y = c[j][1] + (c[j + 1][1] - c[j][1]) * u;
        grain({
          at: [x, y - 0.5, LAND.rim + AHEAD], life: between(WISPS.life), most: between(WISPS.most), quick: WISPS.quick, wind: WISPS.wind * (0.75 + 0.5 * R()), strays: WISPS.strays, up: between(WISPS.lift),
          wide: streak ? between(WISPS.wide) : between(GRAIN.wide), strength: streak ? WISPS.strength : WISPS.grain, soft: streak ? 1 : 0, long: streak ? WISPS.long : 1, which: 23 + k * 5 + x / 700, least: WISPS.least, pace: WISPS.pace, of: 'wisp',
        });
      }
    });
  }
  for (let i = 0; i < DUST.grains; i++) {
    const far = R() < 0.6, x = far ? between(CORNER.from) + (R() - 0.5) * 16 : VEILS.at[Math.floor(R() * VEILS.at.length)] + (R() - 0.5) * 14;
    grain({ at: [x, rim(Math.min(x, corner)) + R() * 30, toward(x)], life: between(DUST.life), most: between(DUST.most), strays: DUST.strays, wide: between(DUST.wide), strength: DUST.strength, soft: 1, which: far ? 7.2 : 40 + x / 60, least: DUST.least, pace: DUST.pace, lies: !far, of: 'dust' });
  }

  const listed = (g: THREE.InstancedBufferGeometry, rows: number[][], names: readonly (readonly [string, number])[]): void => {
    let from = 0;
    for (const [name, size] of names) {
      const a = new Float32Array(rows.length * size);
      rows.forEach((r, i) => { for (let k = 0; k < size; k++) a[i * size + k] = r[from + k]; });
      g.setAttribute(name, new THREE.InstancedBufferAttribute(a, size));
      from += size;
    }
    g.instanceCount = rows.length;
  };
  const own = { uTime: uniforms.uTime, uLamp: uniforms.uLamp, uTone: uniforms.uTone, uCut: uniforms.uCut, uPixel: { value: 0.5 } };
  const defines = { LAMP_NEAR: f(lamp.near), LAMP_LIFT: f(lamp.lift), LAMP_HOT: v3(lamp.hot.toArray()), WALL_BOX: `vec4( ${box.map(f).join(', ')} )`, SAND_ANSWER: ANSWERS.indexOf(answer) };
  const look = { uniforms: own, defines, transparent: true, depthWrite: false, premultipliedAlpha: true, side: THREE.DoubleSide } as const;

  const strip = new THREE.InstancedBufferGeometry(), rungs: number[] = [], faces: number[] = [];
  for (let i = 0; i <= STRAND.parts; i++) { const y = (i / STRAND.parts) ** STRAND.top; rungs.push(-0.5, y, 0, 0.5, y, 0); }
  for (let i = 0; i < STRAND.parts; i++) faces.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
  strip.setAttribute('position', new THREE.Float32BufferAttribute(rungs, 3));
  strip.setIndex(faces);
  listed(strip, ribbons, [['aFrom', 4], ['aBody', 4], ['aFlow', 4], ['aShape', 4], ['aLies', 2]]);
  const quad = new THREE.InstancedBufferGeometry();
  quad.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 0], 3));
  quad.setIndex([0, 2, 1, 1, 2, 3]);
  listed(quad, grains, [['aFrom', 4], ['aGoes', 4], ['aLooks', 4], ['aFlow', 4], ['aMore', 4], ['aLies', 2]]);

  const ribbon = new THREE.ShaderMaterial({ ...look, vertexShader: RIBBON_VERT, fragmentShader: RIBBON_FRAG }), loose = new THREE.ShaderMaterial({ ...look, vertexShader: GRAIN_VERT, fragmentShader: GRAIN_FRAG });
  const group = new THREE.Group(), size = new THREE.Vector2();
  [new THREE.Mesh(strip, ribbon), new THREE.Mesh(quad, loose)].forEach((mesh, i) => {
    mesh.frustumCulled = false;
    mesh.renderOrder = 10 + i;
    group.add(mesh);
  });
  // How many units one pixel of what is being drawn into covers: nothing is drawn narrower than a pixel and a half,
  // and what would be is drawn that wide and fainter, so the finest sand does not flicker.
  group.children[0].onBeforeRender = (renderer, _s, camera) => {
    const into = renderer.getRenderTarget(), tall = into ? into.height : renderer.getDrawingBufferSize(size).y;
    own.uPixel.value = 2 * VIEW.back / (camera.projectionMatrix.elements[5] * tall);
  };
  return { group, dispose() { strip.dispose(); quad.dispose(); ribbon.dispose(); loose.dispose(); } };
}
