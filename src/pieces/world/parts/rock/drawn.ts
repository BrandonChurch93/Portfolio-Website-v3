import * as THREE from 'three';
import { unshown } from '../../../../world/tone';
import { CORE, DRAWN, HOST, SCALE, SOURCE, SPIRE, VIEW, drawn } from '../../layout';
import { load } from '../../files';
import { WARM, color, world } from '../../light';
import type { PartFactory } from '../../part';
import { falls } from './falls';
import { CE, EYE, SE, SWING_GLSL, letGo, picture, sheet as laid, texture } from './sheet';
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
// Sculpt S's file is still fetched, for its shape alone: the moon's shadows are cast by it.

export const isDrawn = (query: URLSearchParams): boolean => query.get('look') === 'd';

// Nothing of the picture is brighter than this as light, which is under what the world's glow starts at (GLOW in
// ../../index.ts): the picture's brightest places do not bloom at rest.
const MOST = 1.4;
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
// The sand thins out over the city's ground in grains this many to a unit.
const GRAINS = 4;

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

export const build: PartFactory = async () => {
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

  try {
    const l = (await load('rock-s.bin')).meshes.get('break');
    if (l) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', (l.geometry.getAttribute('position') as THREE.BufferAttribute).onUpload(letGo));
      g.setIndex(l.geometry.index?.onUpload(letGo) ?? null);
      g.boundingBox = l.geometry.boundingBox;
      g.boundingSphere = l.geometry.boundingSphere;
      const plain = new THREE.MeshBasicMaterial(), shade = new THREE.Mesh(g, plain);
      shade.position.copy(l.at);
      shade.scale.setScalar(l.size);
      shade.updateMatrix();
      shade.matrixAutoUpdate = false;
      shade.castShadow = true;
      castsOnly(shade);
      group.add(shade);
      made.push(g, l.geometry, plain);
    }
  } catch (e) {
    console.warn(String(e));
  }

  return {
    group,
    alone: { at: [CORE.at[0], CORE.at[1] - 30, CORE.at[2] - 60], r: 700 },
    update(s) {
      uniforms.uTime.value = s.t;
      uniforms.uSurge.value.set(s.stream.on, s.stream.since);
      const on = s.pointer.led;
      uniforms.uLamp.value.set(s.pointer.x * HOST.wide, s.pointer.y * HOST.tall, on * on * (3 - 2 * on));
      return !s.still;
    },
    dispose() { for (const d of made) d.dispose(); },
  };
};
