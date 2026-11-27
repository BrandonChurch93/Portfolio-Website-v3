import * as THREE from 'three';
import { unshown } from '../../../../world/tone';
import { CORE, DRAWN, HOST, SCALE, SOURCE, SPIRE, VIEW, drawn, isDrawn } from '../../layout';
import { load } from '../../files';
import { WARM, color, world } from '../../light';
import type { PartFactory, PartState } from '../../part';
import { embers } from './embers';
import { CHANCE, GLINTS, SAND_EDGE, falls } from './falls';
import { CE, EYE, MOST, SE, SWING_GLSL, letGo, picture, seen, sheet as laid, texture } from './sheet';
import { STREAM } from './stone';

// The world as picture 10 has it (?look=d): the torn planet under the land, and the dunes, as that picture drew
// them, lit by the page.
//
// scripts/world/drawn.mjs lays the picture's rock and sand into the host and stores, for each pixel, its color as
// the screen shows it at rest, which way it is turned and how high it stands, how much of its light is the core's,
// where a lit crack or a lit rim is, where the sand is, how far off it is, and how much of the pixel it covers
// (DRAWN in ../../layout.ts). This draws them on one sheet behind the world. At rest the sheet is the picture. Over
// that the page moves the light: the core's with its level, its slow drift and its surge when the stream sets off,
// the stream's own on what is near its line, and the cursor's, which falls with distance, is shaded by the turn of
// each place and is hidden behind what stands in its way. Each pixel writes its own depth, so the core, the land,
// the city and what broke away stand in front of the picture and behind it.
//
// Sculpt S's file is still fetched, for its shape alone: the moon's shadows are cast by it (shade, below).

export { isDrawn };

// How many times the swing of the core's light shows on what the core lights.
const SWING = 1.6;
// The stream's light on the picture: how far across the host it reaches from the stream's line and how fast it
// falls, as the rock's own (STREAM in ./stone.ts), how deep the rock is taken to lie behind the line, in units, and
// how strong it is on the picture's own color and on anything at all.
const NEAR_STREAM = { deep: 30, own: 2.2, any: 0.012 } as const;
// The cursor's light. It stands `lift` units over the picture where the cursor is and falls by half its strength
// squared at `near` units. `own` is its strength on the picture's own color, `turn` is how much of that is given
// in the palette's hot and not in the color itself, so that rock, sand and the pale crust all brighten toward the
// one hue and none toward red or yellow, and `any` is its strength on anything that is there at all, which is
// taken to be there where the picture, seen coarsely, is brighter than `matter`. A place is hidden
// from it by what stands more than `clear` units over the line to the light, in full at `hid`, looked for in
// `steps` places along that line. `shine` is the glint on bright places, how sharp and how strong. `flare` is how
// much a lit crack or rim near the cursor brightens and within how many units. It is there while a real cursor
// leads the page's lamp and gone while the lamp drifts on its own, so at rest the moon and the core light the world.
const LAMP = { lift: 114, near: 174, own: 2.4, turn: 0.7, any: 0.114, matter: [0.02, 0.1], clear: 1.9, hid: 8.5, most: 0.92, steps: 10, shine: [48, 0.45, 0.3, 0.7], flare: [1.8, 152] } as const;
// The lit cracks on the planet's left side run with the core's heat. `box` is where they are on the host, across
// from and to and down from and to, and `eases` over how many units that comes in. The heat leaves the core in
// surges, one every `long` units out from it, `rate` of them a second, and finer ones, `fine` times as many, count
// for this `share` of it. Between the two `edge`s of that a crack goes from `low` times as bright as the picture
// has it to `full` times. The glow on the rock round a crack follows it: it is what the picture's cracks are when
// seen `soft` times coarser, `glow` times over. A crack's own middle is paler than the core's light, so the
// picture's maps do not count it as the core's: a crack is taken to be the core's where the core's light is round
// it, which is that light seen `fed[0]` times coarser, `fed[1]` times over. Without it the middles stood still
// while the glow round them moved, and the heat could not be seen. A crack's middle is so bright that on the screen
// it hardly dims when its light is cut by half, so as it cools its color turns as well, `turns` of the way from
// the picture's pale to the palette's flame at the same brightness: pale where the heat is, orange where it is not.
const HEAT = { box: [140, 268, 430, 730], eases: 10, long: 50, rate: 0.4, fine: 2.7, share: 0.35, edge: [0.25, 0.75], low: 0.55, full: 1.15, soft: 5, glow: 4, fed: [4, 2.5], turns: 0.85 } as const;
// The sand thins out over the city's ground in grains this many to a unit.
const GRAINS = 4;
// The dunes glitter under the cursor: grains this many to a unit, this share of them able to. A
// grain glints while the light comes from the way it faces, the more exactly the higher `sharp`, so the glitter
// changes as the cursor moves, soonest near it; within about `calm` units of the cursor none do. Each grain turns
// by itself too, `drift` times a second. How strong a glint is, and how far up the sand from its front edge they
// begin. Where the light is, between which shares of it, is the falls' (GLINTS in ./falls.ts).
const GLITTER = { grains: 1, share: 0.4, sharp: 60, calm: 5, drift: 0.05, strong: 0.8, in: 3 } as const;

const f = (n: number): string => n.toFixed(4);
const v3 = (a: readonly number[]): string => `vec3( ${a.map(f).join(', ')} )`;
const [, CORE_DOWN] = drawn(...CORE.at), [, SOURCE_DOWN] = drawn(...SOURCE);
const BOX = [HOST.wide / 2 + DRAWN.window[0], CORE_DOWN + DRAWN.window[1], DRAWN.window[2], DRAWN.window[3]] as const;
const LAMP_LIGHT = color('pale').lerp(color('hot'), 0.4);
const LUMA = [0.2126, 0.7152, 0.0722] as const;
const HOT = ((c: THREE.Color) => c.multiplyScalar(1 / (c.r * LUMA[0] + c.g * LUMA[1] + c.b * LUMA[2])))(color('hot'));
const ANY = color('copper').multiplyScalar(1.4);

// Where the land gives way to the picture's sand: for the land's own shader (../land.ts), which is handed the place
// of each pixel in the world's units as vUnit.
export const GIVES_WAY = /* glsl */ `
{
	float dy = vUnit.y - ${f(SPIRE.tall - (HOST.tall / 2 - HOST.over) / CE)};
	if ( vUnit.x * ${f(VIEW.back)} / ( ${f(VIEW.back)} - dy * ${f(SE)} - vUnit.z * ${f(CE)} ) > ${f(DRAWN.sand[1])} ) discard;
}`;

// Where a place of the world, in units, is drawn in the host, for another part's shader: `drawn` in ../../layout.ts.
export const HOSTED = /* glsl */ `
vec2 hosted( vec3 unit ) {
	float dy = unit.y - ${f(SPIRE.tall - (HOST.tall / 2 - HOST.over) / CE)}, k = ${f(VIEW.back)} / ( ${f(VIEW.back)} - dy * ${f(SE)} - unit.z * ${f(CE)} );
	return vec2( ${f(HOST.wide / 2)} + unit.x * k, ${f(HOST.tall / 2)} - ( dy * ${f(CE)} - unit.z * ${f(SE)} ) * k );
}`;
// What a built face takes of the cursor's light, for another part's shader: of its own color `own`, turned as
// `facing` in the world, standing at `here` in the host, with the light as lampOf gives it.
export const LAMPED = /* glsl */ `
vec3 lamped( vec3 own, vec3 facing, vec2 here, vec3 lamp ) {
	vec3 q = vec3( lamp.x - here.x, ( here.y - lamp.y ) * ${f(CE)} + ${f(LAMP.lift * SE)}, ( lamp.y - here.y ) * ${f(SE)} + ${f(LAMP.lift * CE)} );
	float d = length( q ), fall = 1.0 / ( 1.0 + ( d / ${f(LAMP.near)} ) * ( d / ${f(LAMP.near)} ) );
	return mix( own, dot( own, ${v3(LUMA)} ) * ${v3(HOT.toArray())}, ${f(LAMP.turn)} ) * ( max( dot( facing, q / d ), 0.0 ) * fall * lamp.z );
}`;
// What the city's ground takes of the cursor's light, for the land's shader and for its kept pictures (../../kept.ts),
// which hold a place's color and not its turn. The ground lies flat and is seen nearly edge on: by its own turn it
// would stay dark under the cursor and be lit far below it. So it is taken to be turned `facing`, half up and half
// toward the visitor, and it takes `share` of its color as it stands lit at rest.
const GROUND = { facing: [0, Math.SQRT1_2, Math.SQRT1_2], share: 0.7 } as const;
export const GROUNDED = /* glsl */ `
vec3 grounded( vec3 own, vec2 here, vec3 lamp ) {
	return ${f(GROUND.share)} * lamped( own, ${v3(GROUND.facing)}, here, lamp );
}`;
// The cursor's light as every part of this look takes it: where it is in the host, in units, and how much of it is there.
export const lampOf = (s: PartState, into: THREE.Vector3): THREE.Vector3 => {
  const on = s.pointer.led;
  return into.set(s.pointer.x * HOST.wide, s.pointer.y * HOST.tall, on * on * (3 - 2 * on));
};

// A mesh that is drawn nowhere and still casts the moon's shadow.
export function castsOnly(o: THREE.Mesh): void {
  const g = o.geometry, all = g.index?.count ?? g.getAttribute('position').count;
  g.setDrawRange(0, 0);
  o.onBeforeShadow = () => g.setDrawRange(0, all);
  o.onAfterShadow = () => g.setDrawRange(0, 0);
}

const VERT = /* glsl */ `
attribute vec3 aim;
uniform sampler2D uForm;
uniform vec3 uLamp;
varying vec2 vUv;
varying vec3 vAim;
varying float vLampHigh;
void main() {
	vUv = uv;
	vAim = aim;
	vec2 at = ( uLamp.xy - ${`vec2( ${f(BOX[0])}, ${f(BOX[1])} )`} ) / ${`vec2( ${f(BOX[2])}, ${f(BOX[3])} )`};
	vLampHigh = textureLod( uForm, clamp( at, 0.0, 1.0 ), 5.0 ).b * ${f(DRAWN.relief)} + ${f(LAMP.lift)};
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

const FRAG = /* glsl */ `
uniform sampler2D uTone;
uniform sampler2D uForm;
uniform sampler2D uLight;
uniform sampler2D uCut;
uniform float uCoreLevel;
uniform vec2 uStream;
uniform vec2 uProject;
uniform float uTime;
uniform vec2 uSurge;
uniform vec3 uLamp;
varying vec2 vUv;
varying vec3 vAim;
varying float vLampHigh;
const vec3 EYE = ${v3([EYE.x, EYE.y, EYE.z])};
const vec3 CORE = ${v3(CORE.at)};
const vec3 LUMA = ${v3(LUMA)};
const vec4 BOX = vec4( ${BOX.map(f).join(', ')} );
const float SE = ${f(SE)}, CE = ${f(CE)};
${unshown(WARM, MOST)}
${SWING_GLSL}
${CHANCE}
${SAND_EDGE}
float grain( vec2 p ) { vec3 q = fract( vec3( p.xyx ) * 0.1031 ); q += dot( q, q.yzx + 33.33 ); return fract( ( q.x + q.y ) * q.z ); }
void main() {
	vec4 cut = texture2D( uCut, vUv );
	if ( cut.g < 0.5 ) discard;
	vec2 at = BOX.xy + vUv * BOX.zw;
	if ( cut.b < 0.996 && cut.b < 0.02 + 0.98 * grain( floor( at * ${f(GRAINS)} ) ) ) discard;
	float toward = mix( ${f(DRAWN.depth[0])}, ${f(DRAWN.depth[1])}, cut.r );
	vec3 ray = normalize( vAim - EYE );
	vec3 p = EYE + ray * ( ( toward - ${f(VIEW.back)} ) / ( ray.y * SE + ray.z * CE ) );
	float zv = ( ${f(VIEW.back)} - toward ) * ${f(SCALE)};
	gl_FragDepth = ( ( uProject.x * - zv + uProject.y ) / zv ) * 0.5 + 0.5;

	vec3 shown = texture2D( uTone, vUv ).rgb;
	vec3 c = unshown( shown );
	vec3 light = texture2D( uLight, vUv ).rgb;
	vec3 form = texture2D( uForm, vUv ).rgb;
	vec2 nv = form.xy * 2.0 - 1.0;
	vec3 n = vec3( nv, sqrt( max( 0.0, 1.0 - dot( nv, nv ) ) ) );
	float matter = smoothstep( ${f(LAMP.matter[0])}, ${f(LAMP.matter[1])}, dot( textureLod( uTone, vUv, 3.0 ).rgb, LUMA ) );

	vec3 out3 = p - CORE;
	float dist = length( out3 );
	c *= 1.0 + ${f(SWING)} * light.r * ( uCoreLevel * coreSwing( out3 / max( dist, 1e-3 ), dist ) - 1.0 );
	{
		vec2 from = smoothstep( ${`vec2( ${f(HEAT.box[0] - HEAT.eases)}, ${f(HEAT.box[2] - HEAT.eases)} )`}, ${`vec2( ${f(HEAT.box[0])}, ${f(HEAT.box[2])} )`}, at ), to = 1.0 - smoothstep( ${`vec2( ${f(HEAT.box[1])}, ${f(HEAT.box[3])} )`}, ${`vec2( ${f(HEAT.box[1] + HEAT.eases)}, ${f(HEAT.box[3] + HEAT.eases)} )`}, at );
		float within = from.x * from.y * to.x * to.y;
		float fed = min( 1.0, ${f(HEAT.fed[1])} * max( light.r, textureLod( uLight, vUv, ${f(HEAT.fed[0])} ).r ) );
		float middle = within * min( 1.0, light.g * fed );
		float crack = max( middle, within * min( 1.0, ${f(HEAT.glow)} * textureLod( uLight, vUv, ${f(HEAT.soft)} ).g * light.r ) );
		if ( crack > 0.0 ) {
			float run = dist / ${f(HEAT.long)} - uTime * ${f(HEAT.rate)};
			float heat = smoothstep( ${f(HEAT.edge[0])}, ${f(HEAT.edge[1])}, mix( wave( run ), wave( run * ${f(HEAT.fine)} + 17.0 ), ${f(HEAT.share)} ) );
			c *= 1.0 + crack * ( mix( ${f(HEAT.low)}, ${f(HEAT.full)}, heat ) - 1.0 );
			vec3 flame = unshown( ${v3(seen('flame'))} );
			c = mix( c, flame * ( max( c.r, max( c.g, c.b ) ) / max( flame.r, max( flame.g, flame.b ) ) ), middle * ( 1.0 - heat ) * ${f(HEAT.turns)} );
			c *= mix( 1.0, min( 1.0, ${f(MOST)} / max( c.r, max( c.g, c.b ) ) ), min( 1.0, crack * 8.0 ) );
		}
	}
	{
		float below = at.y - ${f(SOURCE_DOWN)};
		vec3 q = vec3( ${f(HOST.wide / 2)} - at.x, clamp( below, 0.0, uStream.y ) - below, ${f(NEAR_STREAM.deep)} );
		float d = length( q ), k = clamp( 1.0 - d / ${f(STREAM.reach)}, 0.0, 1.0 );
		float fall = k * k / ( 1.0 + ( d / ${f(STREAM.near)} ) * ( d / ${f(STREAM.near)} ) ) * ( 1.0 - smoothstep( uStream.y - 12.0, uStream.y, below ) );
		c += ( c * ${f(NEAR_STREAM.own)} + matter * ${f(NEAR_STREAM.any)} ) * ${v3(STREAM.color.toArray())} * ( uStream.x * fall * clamp( ( dot( n, q / d ) + 0.3 ) / 1.3, 0.0, 1.0 ) );
	}
	if ( uLamp.z > 0.0 ) {
		float z = form.b * ${f(DRAWN.relief)};
		vec3 q = vec3( uLamp.xy - at, vLampHigh - z );
		float d = length( q ), fall = 1.0 / ( 1.0 + ( d / ${f(LAMP.near)} ) * ( d / ${f(LAMP.near)} ) );
		fall *= fall;
		if ( fall > 0.003 ) {
			float hid = 0.0;
			for ( int i = 1; i <= ${LAMP.steps}; i ++ ) {
				float t = float( i ) * ${f(LAMP.most / (LAMP.steps + 1))};
				float zz = texture2D( uForm, vUv + q.xy * t / BOX.zw ).b * ${f(DRAWN.relief)};
				hid = max( hid, clamp( ( zz - z - q.z * t - ${f(LAMP.clear)} ) / ${f(LAMP.hid - LAMP.clear)}, 0.0, 1.0 ) );
			}
			float lit = max( dot( n, q / d ), 0.0 ) * fall * ( 1.0 - ${f(LAMP.most)} * hid );
			vec3 add = ( mix( c, dot( c, LUMA ) * ${v3(HOT.toArray())}, ${f(LAMP.turn)} ) * ${f(LAMP.own)} + matter * ${f(LAMP.any)} * ${v3(ANY.toArray())} ) * lit;
			vec3 h = normalize( q / d + vec3( 0.0, 0.0, 1.0 ) );
			add += ${v3(LAMP_LIGHT.toArray())} * ( pow( max( dot( n, h ), 0.0 ), ${f(LAMP.shine[0])} ) * fall * ( 1.0 - hid ) * smoothstep( ${f(LAMP.shine[2])}, ${f(LAMP.shine[3])}, dot( shown, LUMA ) ) * ${f(LAMP.shine[1])} );
			add += c * ( light.g * exp( - dot( q.xy, q.xy ) / ${f(2 * LAMP.flare[1] * LAMP.flare[1])} ) * ${f(LAMP.flare[0])} );
			c += add * uLamp.z;
			float dune = smoothstep( ${f(HOST.wide / 2 + DRAWN.sand[0])}, ${f(HOST.wide / 2 + DRAWN.sand[1])}, at.x ) * ( 1.0 - smoothstep( ${f(-GLITTER.in - 3)}, ${f(-GLITTER.in)}, at.y - sandEdge( at.x ) ) );
			float near = dune * uLamp.z * ( 1.0 - hid ) * smoothstep( ${f(GLINTS.edge[0])}, ${f(GLINTS.edge[1])}, fall * ${f((1 + (LAMP.lift / LAMP.near) ** 2) ** 2)} );
			if ( near > 0.0 ) {
				vec2 g = at * ${f(GLITTER.grains)}, cell = floor( g );
				float pick = chance( cell ), turn = chance( cell + 31.7 ) * 6.2832 + uTime * ${f(2 * Math.PI * GLITTER.drift)};
				float on = step( ${f(1 - GLITTER.share)}, pick ) * pow( max( dot( vec2( cos( turn ), sin( turn ) ), normalize( vec3( q.xy, ${f(GLITTER.calm)} ) ).xy ), 0.0 ), ${f(GLITTER.sharp)} ) * ( 1.0 - smoothstep( 0.2, 0.5, length( fract( g ) - 0.5 ) ) );
				float top = max( ${f(MOST)}, max( c.r, max( c.g, c.b ) ) );
				c += ${v3(LAMP_LIGHT.toArray())} * ( on * near * ${f(GLITTER.strong)} );
				c *= min( 1.0, top / max( c.r, max( c.g, c.b ) ) );
			}
		}
	}
	gl_FragColor = vec4( c, 1.0 );
}`;

const MADE_BY = 'node scripts/world/drawn.mjs';

async function shown(file: string): Promise<THREE.Texture> {
  const t = await new THREE.TextureLoader().loadAsync(`/world/${file}?v=${process.env.NEXT_PUBLIC_BUILD ?? 'dev'}`).catch(() => { throw new Error(`The world's picture ${file} is missing. Make it with: ${MADE_BY}`); });
  t.colorSpace = THREE.NoColorSpace;
  t.flipY = false;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

// What casts the moon's shadow for the picture, which is flat and casts none: sculpt S's file, read for its shape
// alone and drawn nowhere. It is the largest file of the world and nothing on the first screen is seen by it, so it
// is not made with the picture: the skin's part, which is made once the first screen is shown, asks for it.
export async function shade(): Promise<{ mesh: THREE.Mesh; dispose(): void } | null> {
  const l = (await load('rock-s.bin')).meshes.get('break');
  if (!l) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', (l.geometry.getAttribute('position') as THREE.BufferAttribute).onUpload(letGo));
  g.setIndex(l.geometry.index?.onUpload(letGo) ?? null);
  g.boundingBox = l.geometry.boundingBox;
  g.boundingSphere = l.geometry.boundingSphere;
  const plain = new THREE.MeshBasicMaterial(), mesh = new THREE.Mesh(g, plain);
  mesh.position.copy(l.at);
  mesh.scale.setScalar(l.size);
  mesh.updateMatrix();
  mesh.matrixAutoUpdate = false;
  mesh.castShadow = true;
  castsOnly(mesh);
  return { mesh, dispose() { g.dispose(); l.geometry.dispose(); plain.dispose(); } };
}

export const build: PartFactory = async (ctx) => {
  const group = new THREE.Group(), made: { dispose(): void }[] = [];
  const names = DRAWN.files, [tone, form, light, cut] = await Promise.all([shown(names.tone), shown(names.form), shown(names.light), picture(names.cut, MADE_BY)]);
  const cutMap = texture(cut, false);
  cutMap.magFilter = cutMap.minFilter = THREE.LinearFilter;
  made.push(tone, form, light, cutMap);

  const sheet = laid(DRAWN.window), shared = world.uniforms;
  const uniforms = {
    uTone: { value: tone }, uForm: { value: form }, uLight: { value: light }, uCut: { value: cutMap },
    uCoreLevel: shared.uCoreLevel, uStream: shared.uStream,
    uProject: { value: new THREE.Vector2() }, uTime: { value: 0 }, uSurge: { value: new THREE.Vector2(0, 60) },
    uLamp: { value: new THREE.Vector3() },
  };
  const m = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, depthFunc: THREE.LessEqualDepth });
  const face = new THREE.Mesh(sheet, m);
  face.frustumCulled = false;
  face.renderOrder = -1e6 + 1;
  face.onBeforeRender = (_r, _s, camera) => { const e = camera.projectionMatrix.elements; uniforms.uProject.value.set(e[10], e[14]); };
  group.add(face);
  made.push(sheet, m);

  const sand = falls(uniforms, { near: LAMP.near, lift: LAMP.lift, hot: HOT }, BOX);
  group.add(sand.group);
  made.push(sand);
  const sparks = embers(uniforms);
  group.add(sparks.group);
  made.push(sparks);

  return {
    group,
    alone: { at: [CORE.at[0], CORE.at[1] - 30, CORE.at[2] - 60], r: 700 },
    update(s) {
      uniforms.uTime.value = s.t;
      uniforms.uSurge.value.set(s.stream.on, s.stream.since);
      lampOf(s, uniforms.uLamp.value);
      return !s.still;
    },
    dispose() { for (const d of made) d.dispose(); },
  };
};
