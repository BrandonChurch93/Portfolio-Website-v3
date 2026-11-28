import * as THREE from 'three';
import { unshown } from '../../../../world/tone';
import { VIEW, seeded } from '../../layout';
import { WARM } from '../../light';
import { CHANCE } from './falls';
import { MOST, PLACED_GLSL, seen } from './sheet';

// The embers the lit cracks on the planet's left side shed, as picture 10 has them (?look=d).
//
// Each is one small quad. The list of them is written once: where on a crack each leaves, how long it lives and
// how it looks. The graphics card works out where each is from the clock alone, as it does for the sand
// (./falls.ts), so nothing is rewritten while they drift. An ember leaves its crack quickly, slows into the slow
// air off the rock, wanders, cools and goes out. Each time round it leaves a little elsewhere, another way and at
// another speed, and most times it does not leave at all, so nothing is seen to repeat.

// Where the cracks are lit as the page draws them, in the host's units from its top left, and how far toward the
// eye the picture has the rock there.
const CRACKS = [
  [196.8, 453.3, 418], [200.8, 468.9, 418], [202.4, 482.5, 415], [206.0, 500.5, 415], [191.2, 516.1, 383], [204.0, 517.3, 403], [145.2, 523.8, 289], [178.8, 528.5, 356],
  [160.0, 536.1, 313], [172.4, 539.0, 336], [176.0, 552.5, 332], [195.2, 569.8, 352], [263.6, 579.8, 411], [210.4, 583.3, 367], [249.2, 583.8, 422], [226.8, 592.1, 383],
  [212.4, 593.3, 360], [238.8, 593.8, 399], [219.2, 606.5, 360], [160.8, 613.0, 211], [216.4, 617.8, 344], [183.6, 619.8, 269], [205.6, 620.5, 320], [168.4, 625.0, 215],
  [194.0, 626.1, 285], [220.8, 629.3, 336], [226.8, 649.0, 324], [232.8, 666.5, 309], [237.2, 686.5, 285], [239.2, 703.0, 258], [214.0, 714.5, 77], [226.0, 717.3, 164],
] as const;
// How many embers there are and, of the times one could leave its crack, the share it does. How long one lives,
// in seconds. Within how many units of its place on the crack it leaves, how fast, in units a second, and how fast
// it loses that, in shares a second. `way` is which way it leaves, in radians up from straight left. `air` is the
// slow air it ends in, across the host and down it, in units a second, so it rises to the left. It wanders by
// this many units to either side, this many times a second. How wide it is, in units, how strong it shows, how
// much of that flickers, how far in front of the rock it stands, and how long it is drawn along its own way, in
// seconds: picture 10's embers are short bright strokes, about twice as long as they are wide.
const EMBERS = { many: 56, sheds: 0.36, life: [3.2, 7.5], round: 4, leaves: [6, 22], slows: 1.4, way: [-0.5, 1.6], air: [[-9, -3], [-12, -4]], wanders: [1.5, 4.5], turns: [0.2, 0.55], wide: [1.5, 2.8], strength: [0.9, 1], flickers: 0.2, ahead: 12, shutter: 0.2 } as const;
// How one looks, as picture 10 has them: a small bright middle with a deeper glow close round it and nothing past
// that. The middle is the palette's flame at its brightest, never its pale or its hot, which read as white at this
// size. It cools to the glow's color over these shares of its life and goes out over the last of it, from `fades`
// on. The glow is the flame with this much of the palette's ember in it, turned `red` degrees toward red, which is
// where the picture's own embers and the rock they light have theirs, and is this strong beside the middle.
// `tight` is how fast the middle and the glow fall off from the ember's own middle: the larger, the smaller.
const COAL = { cools: [0.5, 0.95], fades: 0.7, deep: 0.55, red: 7, glow: 0.45, tight: [16, 5] } as const;
// The cursor stirs them: an ember is moved off its way by as much as `far` units, within about `wide` units of
// the cursor.
const STIRRED = { far: 10, wide: 40 } as const;

const f = (n: number): string => n.toFixed(4);
const v2 = (a: readonly number[]): string => `vec2( ${a.map(f).join(', ')} )`;
const v3 = (a: readonly number[]): string => `vec3( ${a.map(f).join(', ')} )`;
const span = (a: readonly [number, number], k: string): string => `mix( ${f(a[0])}, ${f(a[1])}, ${k} )`;
// An orange turned toward red: its green, which is what its hue is told by, is brought down toward its blue.
const redder = ([r, g, b]: number[], degrees: number): number[] => [r, Math.max(b, g - (r - b) * degrees / 60), b];
const DEEP = redder(seen('flame').map((x, i) => x + (seen('ember')[i] - x) * COAL.deep), COAL.red);
const BRIGHT = seen('flame').map((x) => x / Math.max(...seen('flame')));

const VERT = /* glsl */ `
attribute vec4 aFrom;
attribute vec4 aLooks;
uniform float uTime;
uniform vec3 uLamp;
uniform float uPixel;
varying vec2 vAt;
varying vec4 vColor;
${PLACED_GLSL}
${CHANCE}
${unshown(WARM, MOST)}
void main() {
	float life = aFrom.w, turn = uTime / life + aLooks.z, nth = floor( turn ), age = ( turn - nth ) * life, lived = age / life;
	float seed = aLooks.w * 977.0 + nth * 7.31;
	vec4 r = vec4( chance( seed ), chance( seed + 13.7 ), chance( seed + 29.3 ), chance( seed + 47.9 ) );
	vec4 q = vec4( chance( seed + 61.1 ), chance( seed + 71.3 ), chance( seed + 83.9 ), chance( seed + 97.7 ) );
	float sheds = chance( seed + 113.3 );

	float way = ${span(EMBERS.way, 'r.x')}, e = exp( - ${f(EMBERS.slows)} * age ), glide = ( 1.0 - e ) / ${f(EMBERS.slows)};
	vec2 leaves = vec2( - cos( way ), - sin( way ) ) * ${span(EMBERS.leaves, 'r.y')}, air = mix( ${v2(EMBERS.air.map((a) => a[0]))}, ${v2(EMBERS.air.map((a) => a[1]))}, r.zw );
	vec2 at = aFrom.xy + ( q.xy - 0.5 ) * ${f(2 * EMBERS.round)} + leaves * glide + air * ( age - glide );
	float turns = 6.2832 * ${span(EMBERS.turns, 'q.z')};
	at += vec2( sin( age * turns + r.x * 6.2832 ), cos( age * turns * 0.8 + r.y * 6.2832 ) ) * ( ${span(EMBERS.wanders, 'q.w')} * smoothstep( 0.0, 1.5, age ) );
	vec2 off = at - uLamp.xy;
	float d2 = dot( off, off );
	at += off * ( ${f(STIRRED.far)} * uLamp.z * exp( - d2 / ${f(2 * STIRRED.wide * STIRRED.wide)} ) / sqrt( d2 + 4.0 ) );

	vec2 goes = leaves * e + air * ( 1.0 - e );
	float wide = max( aLooks.x, 1.5 * uPixel ), streak = wide + length( goes ) * ${f(EMBERS.shutter)};
	vec2 along = normalize( goes + vec2( 0.0, 1e-3 ) );
	at += ( along * ( position.y * streak ) + vec2( along.y, - along.x ) * ( position.x * wide ) ) * 3.0;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( placed( at, aFrom.z ), 1.0 );
	vAt = position.xy * 2.0;

	float shows = step( sheds, ${f(EMBERS.sheds)} ) * smoothstep( 0.0, 0.03, lived ) * ( 1.0 - smoothstep( ${f(COAL.fades)}, 1.0, lived ) ) * ( aLooks.x / wide );
	shows *= 1.0 - ${f(EMBERS.flickers)} * ( 0.5 + 0.5 * sin( age * ( 9.0 + 8.0 * r.x ) + r.y * 6.2832 ) );
	vec3 c = unshown( mix( ${v3(BRIGHT)}, ${v3(DEEP)}, smoothstep( ${f(COAL.cools[0])}, ${f(COAL.cools[1])}, lived ) ) );
	vColor = vec4( c, aLooks.y * shows );
}`;

const FRAG = /* glsl */ `
varying vec2 vAt;
varying vec4 vColor;
${unshown(WARM, MOST)}
void main() {
	float d = dot( vAt, vAt );
	float middle = exp( - ${f(COAL.tight[0])} * d ), glow = ${f(COAL.glow)} * exp( - ${f(COAL.tight[1])} * d ) * ( 1.0 - smoothstep( 0.45, 1.0, d ) ) * ( 1.0 - middle );
	float a = vColor.a * ( middle + glow );
	if ( a < 0.003 ) discard;
	gl_FragColor = vec4( ( vColor.rgb * middle + unshown( ${v3(DEEP)} ) * glow ) * vColor.a, a );
}`;

export interface Embers { group: THREE.Group; dispose(): void }

// The embers, on the clock and the cursor's light the picture they leave is on (./drawn.ts).
export function embers(uniforms: { uTime: THREE.IUniform<number>; uLamp: THREE.IUniform<THREE.Vector3> }): Embers {
  const R = seeded(31337), between = (a: readonly [number, number]): number => a[0] + (a[1] - a[0]) * R();
  const from = new Float32Array(EMBERS.many * 4), looks = new Float32Array(EMBERS.many * 4);
  for (let i = 0; i < EMBERS.many; i++) {
    const [x, y, toward] = CRACKS[(i * 13) % CRACKS.length];
    from.set([x, y, toward + EMBERS.ahead, between(EMBERS.life)], i * 4);
    looks.set([between(EMBERS.wide), between(EMBERS.strength), R(), R()], i * 4);
  }
  const quad = new THREE.InstancedBufferGeometry();
  quad.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 0], 3));
  quad.setIndex([0, 2, 1, 1, 2, 3]);
  quad.setAttribute('aFrom', new THREE.InstancedBufferAttribute(from, 4));
  quad.setAttribute('aLooks', new THREE.InstancedBufferAttribute(looks, 4));
  quad.instanceCount = EMBERS.many;

  const own = { uTime: uniforms.uTime, uLamp: uniforms.uLamp, uPixel: { value: 0.5 } };
  const material = new THREE.ShaderMaterial({ uniforms: own, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, premultipliedAlpha: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(quad, material), group = new THREE.Group(), size = new THREE.Vector2();
  mesh.frustumCulled = false;
  mesh.renderOrder = 12;
  // How many units one pixel of what is being drawn into covers: an ember is never drawn narrower than a pixel and
  // a half, and one that would be is drawn that wide and fainter, so the smallest do not flicker on and off.
  mesh.onBeforeRender = (renderer, _s, camera) => {
    const into = renderer.getRenderTarget(), tall = into ? into.height : renderer.getDrawingBufferSize(size).y;
    own.uPixel.value = 2 * VIEW.back / (camera.projectionMatrix.elements[5] * tall);
  };
  group.add(mesh);
  return { group, dispose() { quad.dispose(); material.dispose(); } };
}
