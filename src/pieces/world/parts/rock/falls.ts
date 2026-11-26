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
// how far round it they set off and how fast they stray to either side, in units and units a second.
interface Kind { strands: number; long: readonly [number, number]; wide: readonly [number, number]; strength: readonly [number, number]; most: readonly [number, number]; least: number; pace: number; holds: number; lines: number; grains: number; round: number; strays: number }
// The veils that run down the cratered side: where each leaves the rim, across the host, and within how many
// units of there its strands are. The first is this share as long as the last, which is nearest the corner.
const VEILS = { at: [1247, 1272, 1298, 1318, 1343, 1362, 1380], within: 6, strands: 3, long: [100, 250], wide: [1.8, 4.6], strength: [0.5, 0.9], most: [50, 72], least: 0.4, pace: 0.23, holds: 0.3, lines: 0.3, grains: 170, round: 2.2, strays: 2.2, grows: 0.45 } as const;
// The fall off the planet's corner: from where to where along the rim it leaves.
const CORNER = { from: [1377, 1395], strands: 8, long: [280, 560], wide: [2.2, 6], strength: [0.55, 0.92], most: [56, 90], least: 0.6, pace: 0.17, holds: 0.45, lines: 0.32, grains: 620, round: 3, strays: 3.2 } as const;
// The sheet draped over the rim all along it, from where to where: short wide strands that lie over one another.
// It sets off this many units up the sand from the rim, is longest, widest and strongest within about `gathers`
// units of where a veil leaves, and at the corner, and comes in over its first `eases` units along the rim.
const DRAPE = { from: [1236, 1395], strands: 60, long: [10, 62], wide: [8, 15], strength: [0.14, 0.62], most: [34, 52], least: 0.5, pace: 0.4, holds: 0.1, lines: 0.1, grains: 22, round: 4, strays: 1.5, over: 2.5, gathers: 7, eases: 36 } as const;
// A strand narrows to this share of its width at its end, and leans by as much as this many units over its length.
const STRAND = { thins: 0.4, leans: 4, parts: 40 } as const;
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
const SAND = { pale: [246, 200, 144], lip: 26, lit: [232, 168, 100], dim: 0.55, by: 300, glints: 0.14, glint: 1.5, most: 1.35 } as const;
// The cursor parts the falling sand: it is moved off its way by as much as `far` units, within about `wide` units
// of the cursor. And the cursor's light is this strong on it.
const PARTED = { far: 14, wide: 46, light: 2.2 } as const;

const f = (n: number): string => n.toFixed(4);
const v3 = (a: readonly number[]): string => `vec3( ${a.map(f).join(', ')} )`;
// How long sand whose most speed is this takes to fall this far, near enough: right at the start, where it only
// gathers speed, and far down, where the air holds it.
const takes = (far: number, most: number): number => Math.sqrt(2 * far / MOVES.pull + (far / most) ** 2);

const CHANCE = /* glsl */ `
float chance( float p ) { p = fract( p * 0.1031 ); p *= p + 33.33; p *= p + p; return fract( p ); }
float chance( vec2 p ) { vec3 q = fract( vec3( p.xyx ) * 0.1031 ); q += dot( q, q.yzx + 33.33 ); return fract( ( q.x + q.y ) * q.z ); }
float wave( float x ) { float i = floor( x ), k = fract( x ); k = k * k * ( 3.0 - 2.0 * k ); return mix( chance( i ), chance( i + 1.0 ), k ); }
// How much of a fall there is in what left the rim at this time: each has its own number and thins to its least.
float flowing( float left, float which, float least, float pace ) { return mix( least, 1.0, smoothstep( 0.3, 0.75, wave( left * pace + which * 7.31 ) ) ); }`;
// What a ribbon and a grain have alike: how the falls waver, how the cursor parts them, and the sand's color at a
// place with the cursor's light on it.
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
vec2 parted( vec2 at ) {
	vec2 off = at - uLamp.xy;
	float d2 = dot( off, off );
	return at + off * ( ${f(PARTED.far)} * uLamp.z * exp( - d2 / ${f(2 * PARTED.wide * PARTED.wide)} ) / sqrt( d2 + 4.0 ) );
}
vec3 sand( vec2 at, float fallen, float lip ) {
	vec3 c = unshown( mix( ${v3(SAND.lit.map((x) => x / 255))}, ${v3(SAND.pale.map((x) => x / 255))}, lip * ( 1.0 - smoothstep( 0.0, ${f(SAND.lip)}, fallen ) ) ) ) * mix( 1.0, ${f(SAND.dim)}, smoothstep( 0.0, ${f(SAND.by)}, fallen ) );
	vec2 off = at - uLamp.xy;
	float d = sqrt( dot( off, off ) + LAMP_LIFT * LAMP_LIFT ) / LAMP_NEAR, reach = 1.0 / ( 1.0 + d * d );
	return c + dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ) * LAMP_HOT * ( ${f(PARTED.light)} * uLamp.z * reach * reach );
}`;

const RIBBON_VERT = /* glsl */ `
attribute vec4 aFrom;
attribute vec4 aBody;
attribute vec4 aFlow;
attribute vec2 aHolds;
varying vec2 vAt;
varying vec4 vFlow;
varying vec4 vColor;
varying vec3 vOwn;
${SHARED}
void main() {
	float share = position.y, fallen = share * aFrom.w;
	vec2 at = aFrom.xy + vec2( aBody.w * share * share, fallen );
	at.x += swayed( fallen, at.y, aFlow.x );
	at = parted( at );
	float full = aBody.x * mix( 1.0, ${f(STRAND.thins)}, share ), wide = max( full, 1.5 * uPixel );
	vec3 c = sand( at, fallen, 1.0 );
	at.x += position.x * wide;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( placed( at, aFrom.z ), 1.0 );
	vAt = vec2( position.x * 2.0, share );
	vFlow = vec4( sqrt( 2.0 * fallen / ${f(MOVES.pull)} + fallen * fallen / ( aFlow.w * aFlow.w ) ), aFlow.xyz );
	vColor = vec4( min( c, vec3( ${f(SAND.most)} ) ), aBody.y * full / wide );
	vOwn = vec3( aBody.z, aHolds );
}`;

const RIBBON_FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vAt;
varying vec4 vFlow;
varying vec4 vColor;
varying vec3 vOwn;
${CHANCE}
void main() {
	float u = vAt.x, left = uTime - vFlow.x, vSeed = vOwn.x;
	float across = exp( - 3.5 * u * u ) * ( 1.0 - smoothstep( 0.7, 1.0, abs( u ) ) );
	float thread = 1.0 - vOwn.z + vOwn.z * wave( u * 2.6 + vSeed * 37.0 + 0.8 * wave( left * 0.6 + vSeed * 11.0 ) );
	float column = floor( u * 2.5 + vSeed * 91.0 ), speck = chance( column + 0.5 );
	float grains = mix( 1.0 - vOwn.z, 1.0, chance( vec2( column, floor( left * ( 28.0 + 18.0 * speck ) + speck * 7.0 ) ) ) );
	float along = smoothstep( 0.0, 0.02, vAt.y ) * ( 1.0 - smoothstep( vOwn.y, 1.0, vAt.y ) );
	float a = vColor.a * flowing( left, vFlow.y, vFlow.z, vFlow.w ) * across * thread * grains * along;
	if ( a < 0.003 ) discard;
	gl_FragColor = vec4( vColor.rgb * a, a );
}`;

const GRAIN_VERT = /* glsl */ `
attribute vec4 aFrom;
attribute vec4 aGoes;
attribute vec4 aLooks;
attribute vec4 aFlow;
attribute vec4 aMore;
varying vec2 vAt;
varying vec4 vColor;
varying float vSoft;
${SHARED}
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
	at = parted( at );
	vec3 c = sand( at, fallen, step( 1.5, aMore.w ) );

	float soft = aLooks.z, wide = max( aLooks.x, 1.5 * uPixel ), streak = wide * aMore.y + ( 1.0 - soft ) * length( goes ) * ${f(MOVES.shutter)};
	vec2 way = normalize( goes + vec2( 0.0, 1e-3 ) );
	at += way * ( position.y * streak ) + vec2( way.y, - way.x ) * ( position.x * wide );
	gl_Position = projectionMatrix * modelViewMatrix * vec4( placed( at, aFrom.z ), 1.0 );
	vAt = position.xy * 2.0;
	vSoft = soft;

	float lived = age / life;
	float shows = aLooks.y * flowing( uTime - age, aFlow.x, aFlow.z, aFlow.w ) * smoothstep( 0.0, 0.07, lived ) * ( 1.0 - smoothstep( 0.4, 1.0, lived ) ) * ( aLooks.x / wide ) * min( 1.0, 1.6 * wide * aMore.y / streak );
	c *= 1.0 + ( 1.0 - soft ) * step( ${f(1 - SAND.glints)}, r.z ) * ${f(SAND.glint)} * pow( max( sin( age * ( 5.0 + 9.0 * r.w ) + r.x * 6.2832 ), 0.0 ), 12.0 );
	vColor = vec4( min( c, vec3( ${f(SAND.most)} ) ), shows );
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

// The falls, on the clock and the cursor's light the picture they fall from is on (./drawn.ts): the cursor's light
// falls by half its strength squared at `near` units, stands `lift` units over the picture and is of this color.
export function falls(uniforms: { uTime: THREE.IUniform<number>; uLamp: THREE.IUniform<THREE.Vector3> }, lamp: { near: number; lift: number; hot: THREE.Color }): Falls {
  const R = seeded(90210), between = (a: readonly [number, number], k = R()): number => a[0] + (a[1] - a[0]) * k;
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
  // drawn, and the lean and length of the strand it falls with.
  const grain = (o: { at: [number, number, number]; life: number; most: number; quick?: number; wind?: number; strays: number; wide: number; strength: number; soft?: number; which: number; least: number; pace: number; up?: number; long?: number; lean?: number; strand?: number }): void => {
    grains.push([...o.at, o.life, o.most, o.quick ?? MOVES.pull / o.most, o.wind ?? 0, o.strays, o.wide, o.strength * (0.6 + 0.8 * R()), o.soft ?? 0, R(), o.which, R(), o.least, o.pace, -(o.up ?? 0), o.long ?? 1, o.lean ?? 0, o.strand ?? 1]);
  };
  // One strand of a fall, leaving the rim at x, with its grains: `k` is how much of a main strand it is, 0 to 1,
  // and `share` how much of its kind's length and strength it has.
  const strand = (kind: Kind, x: number, k: number, which: number, share = { long: 1, strength: 1 }): void => {
    const x0 = Math.min(x, corner + 1), y0 = rim(x0) - DRAPE.over, long = share.long * between(kind.long, 0.25 * R() + 0.75 * k), wide = between(kind.wide, 0.3 * R() + 0.7 * k), most = between(kind.most), lean = (R() * 2 - 1) * STRAND.leans, deep = toward(x0);
    ribbons.push([x0, y0, deep, long, wide, share.strength * between(kind.strength, 0.3 * R() + 0.7 * k), R(), lean, which, kind.least, kind.pace, most, kind.holds, kind.lines]);
    for (let i = 0; i < kind.grains * (0.5 + k); i++) {
      const loose = R() < GRAIN.loose, own = between(kind.most), gx = x0 + (R() + R() - 1) * kind.round * (loose ? GRAIN.out : 1) * (0.4 + 0.6 * wide / kind.wide[1]);
      grain({ at: [gx, rim(Math.min(gx, corner)) - 1, deep], life: takes(long * (0.55 + 0.6 * R()), own), most: own, strays: kind.strays * (loose ? 2 : 1), wide: between(GRAIN.wide), strength: GRAIN.strength * (loose ? 0.7 : 1), which, least: kind.least, pace: kind.pace, lean, strand: long });
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
          wide: streak ? between(WISPS.wide) : between(GRAIN.wide), strength: streak ? WISPS.strength : WISPS.grain, soft: streak ? 1 : 0, long: streak ? WISPS.long : 1, which: 23 + k * 5 + x / 700, least: WISPS.least, pace: WISPS.pace,
        });
      }
    });
  }
  for (let i = 0; i < DUST.grains; i++) {
    const far = R() < 0.6, x = far ? between(CORNER.from) + (R() - 0.5) * 16 : VEILS.at[Math.floor(R() * VEILS.at.length)] + (R() - 0.5) * 14;
    grain({ at: [x, rim(Math.min(x, corner)) + R() * 30, toward(x)], life: between(DUST.life), most: between(DUST.most), strays: DUST.strays, wide: between(DUST.wide), strength: DUST.strength, soft: 1, which: far ? 7.2 : 40 + x / 60, least: DUST.least, pace: DUST.pace });
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
  const own = { uTime: uniforms.uTime, uLamp: uniforms.uLamp, uPixel: { value: 0.5 } };
  const defines = { LAMP_NEAR: f(lamp.near), LAMP_LIFT: f(lamp.lift), LAMP_HOT: v3(lamp.hot.toArray()) };
  const look = { uniforms: own, defines, transparent: true, depthWrite: false, premultipliedAlpha: true, side: THREE.DoubleSide } as const;

  const strip = new THREE.InstancedBufferGeometry(), rungs: number[] = [], faces: number[] = [];
  for (let i = 0; i <= STRAND.parts; i++) rungs.push(-0.5, i / STRAND.parts, 0, 0.5, i / STRAND.parts, 0);
  for (let i = 0; i < STRAND.parts; i++) faces.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
  strip.setAttribute('position', new THREE.Float32BufferAttribute(rungs, 3));
  strip.setIndex(faces);
  listed(strip, ribbons, [['aFrom', 4], ['aBody', 4], ['aFlow', 4], ['aHolds', 2]]);
  const quad = new THREE.InstancedBufferGeometry();
  quad.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 0], 3));
  quad.setIndex([0, 2, 1, 1, 2, 3]);
  listed(quad, grains, [['aFrom', 4], ['aGoes', 4], ['aLooks', 4], ['aFlow', 4], ['aMore', 4]]);

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
