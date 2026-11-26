import * as THREE from 'three';
import { unshown } from '../../../../world/tone';
import { HOST, LAND, VIEW, seeded } from '../../layout';
import { WARM } from '../../light';
import { PLACED_GLSL } from './sheet';

// The sand that leaves the dunes of picture 10 (?look=d): it runs over the planet's right rim, down the cratered
// side and off its corner, and the wind lifts it off the dunes' crests.
//
// Every grain is one small quad. The list of them is written once: where each sets off, how it moves and how it
// looks. The graphics card works out where each is from the clock alone, so nothing is rewritten while they run.
// A grain lives for its own length of time and then sets off again, each time a little elsewhere and at another
// speed, and each fall thins and thickens by itself, so nothing is seen to repeat.

// The front edge of the sand on the cratered side as the page draws it, from left to right, in the host's units
// from its top left. The last is the planet's corner.
const RIM = [[1101.1, 415.8], [1137.4, 422.3], [1173.8, 425.2], [1210.2, 425.6], [1246.6, 422.3], [1283.0, 415.8], [1319.4, 404.9], [1355.8, 390.3], [1373.9, 381.2], [1394.0, 365.9]] as const;
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
// a grain has fallen `by` units, in how many turns a unit of height, running down at this many turns a second.
const MOVES = { pull: 34, takes: 1.6, shutter: 0.045, sways: { far: 4.5, by: 150, turns: 0.011, rate: 0.5 } } as const;
// Every kind of grain has: how many, its most speed, its life in seconds, how many units a second it strays to
// either side, how wide a grain is in units, how strong it shows, the least its fall thins to (1 never thins), and
// how fast the fall changes, in changes a second.
// The veils that run down the cratered side: where each leaves the rim, across the host, and the threads each is
// made of within this many units.
const VEILS = { at: [1247, 1272, 1298, 1318, 1343, 1362, 1380], threads: 4, within: 5, grains: 520, most: [46, 78], life: [3.2, 5.2], strays: 2.2, wide: [0.7, 1.3], strength: 0.5, least: 0.3, pace: 0.23 } as const;
// The fall off the planet's corner: from where to where along the rim it leaves.
const CORNER = { from: [1376, 1395], threads: 7, within: 2.2, grains: 2200, most: [50, 95], life: [6, 10], strays: 3.2, wide: [0.7, 1.4], strength: 0.55, least: 0.65, pace: 0.17 } as const;
// What trickles over the rim all along it, from where to where.
const TRICKLE = { from: [1236, 1394], grains: 900, most: [30, 55], life: [1, 2.2], strays: 1.5, wide: [0.7, 1.2], strength: 0.45, least: 0.2, pace: 0.4 } as const;
// What the wind lifts off the crests: the wind, in units a second across the host (to the left, over the hollow
// faces), how fast a grain leaves the crest upward, and how slowly it comes to its most speed down, in shares a
// second.
const WISPS = { grains: 2000, wind: -34, lift: [8, 20], quick: 1.2, most: [7, 13], life: [1.3, 2.8], strays: 9, wide: [0.6, 1], strength: 0.36, least: 0, pace: 0.55 } as const;
// The fine dust that hangs round the corner's fall and the veils: soft, wide and faint.
const DUST = { grains: 420, most: [18, 38], life: [5, 9], strays: 5, wide: [8, 16], strength: 0.05, least: 0.5, pace: 0.2 } as const;
// How far in front of the rim the falls stand, and the wisps in front of the planet's nearest point, in units.
const AHEAD = 12;
// The sand's color where the moon lights it, as the screen shows it. A grain keeps `dim` of that once it has
// fallen `by` units under the rim. This share of the grains glint as they turn, by this much. Nothing of it is
// brighter than `most` as light, which is under what the world's glow starts at.
const SAND = { lit: [213, 148, 86], dim: 0.5, by: 260, glints: 0.14, glint: 1.5, most: 1.35 } as const;
// The cursor parts the falling sand: a grain is moved off its way by as much as `far` units, within about `wide`
// units of the cursor. And its light is this strong on a grain.
const PARTED = { far: 14, wide: 46, light: 2.2 } as const;

const f = (n: number): string => n.toFixed(4);
const v3 = (a: readonly number[]): string => `vec3( ${a.map(f).join(', ')} )`;

const VERT = /* glsl */ `
attribute vec4 aFrom;
attribute vec4 aGoes;
attribute vec4 aLooks;
attribute vec4 aFlow;
attribute float aFirst;
uniform float uTime;
uniform vec3 uLamp;
uniform float uPixel;
varying vec2 vAt;
varying vec4 vColor;
varying float vSoft;
${unshown(WARM, SAND.most)}
${PLACED_GLSL}
float chance( float p ) { p = fract( p * 0.1031 ); p *= p + 33.33; p *= p + p; return fract( p ); }
float wave( float x ) { float i = floor( x ), k = fract( x ); k = k * k * ( 3.0 - 2.0 * k ); return mix( chance( i ), chance( i + 1.0 ), k ); }
void main() {
	float life = aFrom.w, turn = uTime / life + aFlow.y, nth = floor( turn ), age = ( turn - nth ) * life;
	float seed = aLooks.w * 977.0 + nth * 7.31;
	vec4 r = vec4( chance( seed ), chance( seed + 13.7 ), chance( seed + 29.3 ), chance( seed + 47.9 ) );

	float most = aGoes.x * mix( 0.8, 1.25, r.x ), quick = aGoes.y, e = exp( - quick * age ), first = aFirst * mix( 0.6, 1.4, r.w );
	float fallen = most * ( age - ( 1.0 - e ) / quick ) + first * ( 1.0 - e ) / quick;
	float side = aGoes.z + ( r.y - 0.5 ) * 2.0 * aGoes.w, ex = exp( - ${f(MOVES.takes)} * age );
	vec2 at = aFrom.xy + vec2( ( r.z - 0.5 ) * 1.6 + side * ( age - ( 1.0 - ex ) / ${f(MOVES.takes)} ), fallen );
	vec2 goes = vec2( side * ( 1.0 - ex ), most * ( 1.0 - e ) + first * e );
	at.x += ${f(MOVES.sways.far)} * smoothstep( 0.0, ${f(MOVES.sways.by)}, fallen ) * ( wave( at.y * ${f(MOVES.sways.turns)} - uTime * ${f(MOVES.sways.rate)} + aFlow.x * 3.7 ) * 2.0 - 1.0 );

	vec2 off = at - uLamp.xy;
	float d2 = dot( off, off );
	at += off * ( ${f(PARTED.far)} * uLamp.z * exp( - d2 / ${f(2 * PARTED.wide * PARTED.wide)} ) / sqrt( d2 + 4.0 ) );

	float soft = aLooks.z, wide = max( aLooks.x, 1.5 * uPixel ), streak = wide + ( 1.0 - soft ) * length( goes ) * ${f(MOVES.shutter)};
	vec2 way = normalize( goes + vec2( 0.0, 1e-3 ) );
	at += way * ( position.y * streak ) + vec2( way.y, - way.x ) * ( position.x * wide );
	gl_Position = projectionMatrix * modelViewMatrix * vec4( placed( at, aFrom.z ), 1.0 );
	vAt = position.xy * 2.0;
	vSoft = soft;

	float flow = mix( aFlow.z, 1.0, smoothstep( 0.3, 0.75, wave( ( uTime - age ) * aFlow.w + aFlow.x * 7.31 ) ) );
	float lived = age / life;
	float shows = aLooks.y * flow * smoothstep( 0.0, 0.07, lived ) * ( 1.0 - smoothstep( 0.4, 1.0, lived ) ) * ( aLooks.x / wide ) * min( 1.0, 1.6 * wide / streak );

	vec3 c = unshown( ${v3(SAND.lit.map((x) => x / 255))} ) * mix( 1.0, ${f(SAND.dim)}, smoothstep( 0.0, ${f(SAND.by)}, fallen ) );
	c *= 1.0 + ( 1.0 - soft ) * step( ${f(1 - SAND.glints)}, r.z ) * ${f(SAND.glint)} * pow( max( sin( age * ( 5.0 + 9.0 * r.w ) + r.x * 6.2832 ), 0.0 ), 12.0 );
	float d = sqrt( d2 + LAMP_LIFT * LAMP_LIFT ) / LAMP_NEAR, reach = 1.0 / ( 1.0 + d * d );
	c += dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ) * LAMP_HOT * ( ${f(PARTED.light)} * uLamp.z * reach * reach );
	vColor = vec4( min( c, vec3( ${f(SAND.most)} ) ), shows );
}`;

const FRAG = /* glsl */ `
varying vec2 vAt;
varying vec4 vColor;
varying float vSoft;
void main() {
	float d = dot( vAt, vAt );
	float a = vColor.a * mix( 1.0 - smoothstep( 0.3, 1.0, d ), exp( - 3.5 * d ) * ( 1.0 - smoothstep( 0.7, 1.0, d ) ), vSoft );
	if ( a < 0.003 ) discard;
	gl_FragColor = vec4( vColor.rgb * a, a );
}`;

export interface Falls { mesh: THREE.Mesh; dispose(): void }

// The falls, on the clock and the cursor's light the picture they fall from is on (./drawn.ts): the cursor's light
// falls by half its strength squared at `near` units, stands `lift` units over the picture and is of this color.
export function falls(uniforms: { uTime: THREE.IUniform<number>; uLamp: THREE.IUniform<THREE.Vector3> }, lamp: { near: number; lift: number; hot: THREE.Color }): Falls {
  const R = seeded(90210), between = (a: readonly [number, number]): number => a[0] + (a[1] - a[0]) * R();
  const rim = (x: number): number => {
    const j = RIM.findIndex((p) => p[0] >= x), i = j < 0 ? RIM.length - 1 : Math.max(1, j), a = RIM[i - 1], b = RIM[i];
    return a[1] + (b[1] - a[1]) * Math.min(1, Math.max(0, (x - a[0]) / (b[0] - a[0])));
  };
  const toward = (x: number): number => Math.sqrt(Math.max(0, LAND.rim * LAND.rim - (x - HOST.wide / 2) ** 2)) + AHEAD;
  const count = VEILS.at.length * VEILS.grains + CORNER.grains + TRICKLE.grains + WISPS.grains + DUST.grains;
  const from = new Float32Array(count * 4), goes = new Float32Array(count * 4), looks = new Float32Array(count * 4), flow = new Float32Array(count * 4), first = new Float32Array(count);
  let n = 0;
  type Kind = { most: readonly [number, number]; life: readonly [number, number]; strays: number; wide: readonly [number, number]; strength: number; least: number; pace: number };
  const put = (k: Kind, x: number, y: number, deep: number, channel: number, o: { quick?: number; wind?: number; up?: number; soft?: number } = {}): void => {
    const most = between(k.most);
    from.set([x, y, deep, between(k.life)], n * 4);
    goes.set([most, o.quick ?? MOVES.pull / most, o.wind ?? 0, k.strays], n * 4);
    looks.set([between(k.wide), k.strength * (0.6 + 0.8 * R()), o.soft ?? 0, R()], n * 4);
    flow.set([channel, R(), k.least, k.pace], n * 4);
    first[n++] = -(o.up ?? 0);
  };
  const threads = (many: number, within: number): number[] => Array.from({ length: many }, () => (R() * 2 - 1) * within);

  VEILS.at.forEach((x0, v) => {
    const t = threads(VEILS.threads, VEILS.within);
    for (let i = 0; i < VEILS.grains; i++) {
      const x = x0 + t[Math.floor(R() * R() * t.length)] + (R() - 0.5) * 1.2;
      put(VEILS, x, rim(x) - 1, toward(x), v);
    }
  });
  {
    const [a, b] = CORNER.from, t = threads(CORNER.threads, (b - a) / 2);
    for (let i = 0; i < CORNER.grains; i++) {
      const x = (a + b) / 2 + t[Math.floor(R() * R() * t.length)] + (R() - 0.5) * 2 * CORNER.within;
      put(CORNER, x, rim(x) - 1, toward(x), 7 + (i % 3) * 0.37);
    }
  }
  for (let i = 0; i < TRICKLE.grains; i++) {
    const x = TRICKLE.from[0] + (TRICKLE.from[1] - TRICKLE.from[0]) * Math.sqrt(R());
    put(TRICKLE, x, rim(x) - 1, toward(x), 11 + x / 80);
  }
  {
    const long = CRESTS.map((c) => c.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - c[i][0], p[1] - c[i][1]), 0)), all = long.reduce((s, l) => s + l, 0);
    CRESTS.forEach((c, k) => {
      const many = Math.round(WISPS.grains * long[k] / all);
      for (let i = 0; i < many && n < count - DUST.grains; i++) {
        // More leave the middle of a crest, which stands highest in the wind, than its ends.
        const s = (R() + R() + R()) / 3 * (c.length - 1), j = Math.min(c.length - 2, Math.floor(s)), u = s - j;
        const x = c[j][0] + (c[j + 1][0] - c[j][0]) * u, y = c[j][1] + (c[j + 1][1] - c[j][1]) * u;
        put(WISPS, x, y - 0.5, LAND.rim + AHEAD, 23 + k * 5 + x / 700, { quick: WISPS.quick, wind: WISPS.wind * (0.75 + 0.5 * R()), up: between(WISPS.lift) });
      }
    });
  }
  while (n < count) {
    const corner = R() < 0.6, x = corner ? between(CORNER.from) + (R() - 0.5) * 16 : VEILS.at[Math.floor(R() * VEILS.at.length)] + (R() - 0.5) * 14;
    put(DUST, x, rim(Math.min(x, RIM[RIM.length - 1][0])) + R() * 30, toward(Math.min(x, RIM[RIM.length - 1][0])), corner ? 7.2 : 40 + x / 60, { soft: 1 });
  }

  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 0], 3));
  g.setIndex([0, 2, 1, 1, 2, 3]);
  g.setAttribute('aFrom', new THREE.InstancedBufferAttribute(from, 4));
  g.setAttribute('aGoes', new THREE.InstancedBufferAttribute(goes, 4));
  g.setAttribute('aLooks', new THREE.InstancedBufferAttribute(looks, 4));
  g.setAttribute('aFlow', new THREE.InstancedBufferAttribute(flow, 4));
  g.setAttribute('aFirst', new THREE.InstancedBufferAttribute(first, 1));
  g.instanceCount = count;

  const own = { uTime: uniforms.uTime, uLamp: uniforms.uLamp, uPixel: { value: 0.5 } };
  const m = new THREE.ShaderMaterial({
    uniforms: own, vertexShader: VERT, fragmentShader: FRAG,
    defines: { LAMP_NEAR: f(lamp.near), LAMP_LIFT: f(lamp.lift), LAMP_HOT: v3(lamp.hot.toArray()) },
    transparent: true, depthWrite: false, premultipliedAlpha: true, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(g, m), size = new THREE.Vector2();
  mesh.frustumCulled = false;
  mesh.renderOrder = 10;
  // How many units one pixel of what is being drawn into covers: no grain is drawn narrower than a pixel and a
  // half, and one that would be is drawn that wide and fainter, so the finest sand does not flicker.
  mesh.onBeforeRender = (renderer, _s, camera) => {
    const into = renderer.getRenderTarget(), tall = into ? into.height : renderer.getDrawingBufferSize(size).y;
    own.uPixel.value = 2 * VIEW.back / (camera.projectionMatrix.elements[5] * tall);
  };
  return { mesh, dispose() { g.dispose(); m.dispose(); } };
}
