import * as THREE from 'three';
import { CORE, HOST, LIGHT, PICTURED, SCALE, SOURCE, VIEW } from '../../layout';
import { load } from '../../files';
import { color, world } from '../../light';
import type { PartFactory } from '../../part';
import { CE, EYE, SE, SWING_GLSL, aimed, letGo, picture, sheet as laid, texture } from './sheet';
import { CURVE_GLSL, STREAM } from './stone';

// The torn rock as pictures of the one view the world is ever seen from (?rock=p), lit by the page.
//
// scripts/world/slice/ builds the hollow as solid rock, far finer than a page can draw, follows the core's light
// through it, and stores what it found for each pixel as four pictures (PICTURED in ../../layout.ts, and pack.mjs
// there for what each byte is): the stone's color, which way each face is turned, how much of the core each place
// sees, the light that has bounced, and how far off it is. This draws them on one sheet behind the world and lights
// every pixel from those: the core's light with its level, a slow drift of it across the walls, a surge when the
// stream sets off, the stream's own light on what is near its line, and with ?lamp=1 the cursor. The moon is not
// among them: picture 9's hollow has none of it, and a grey face under the lip read as a fault.
// Each pixel also writes its own depth, so the core, the land and what broke away stand in front of the rock and
// behind it as they do with the rock as a mesh.
//
// The pictures are read by the page's own reader (./sheet.ts) and not by the browser's.
// Sculpt S's file is still fetched, for its shape alone: the moon's shadows are cast by it, and it is drawn
// nowhere else.

// How the pictures are lit. level is the core's strength on the rock. turn is how fast a face darkens as it turns
// from the core: at 1 a face lit at a slant is nearly as bright as one lit square on, and the hollow is one even tan.
// From 2 up each block has a lit face and a side in shadow, which is picture 9's light. rise is how much more of the
// core's light and of the bounce reaches the far walls than the falloff gives, which is what keeps the hollow's
// outer faces from going black. pale is how far the core's light is eased toward the palette's pale on a face that
// sees the core in full, and by which shares of the core seen it comes on: a face the core grazes stays at its
// orange. bounce is the strength of the light that has bounced, how much more of it reaches the far walls, and how
// far it is eased toward grey, which keeps the darks a brown and not a rust. fill is the least light anything has.
// contrast deepens the darks and lifts the lights about a middle grey. The hue is not the light's own: it is set
// last of all from how bright a place is and how far from the core, to picture 9's rock (stoneCurve in ./stone.ts,
// as Sculpt S's is). With the light's own hue the hollow was the palette's orange from the ball to its far walls,
// where the picture's goes from a pale tan to a dark red brown.
const LOOK = { level: 0.44, turn: 4, rise: [1.9, 4.2, 8] as const, bounce: [0.4, 8, 0.2] as const, pale: [0.2, 0.05, 0.5] as const, fill: 0.1, contrast: [0.3, 0.18] as const } as const;
// The cursor's light on the rock (?lamp=1): how far toward the visitor it stands from the plane the view is aimed
// at, how fast it falls with distance, in units, and its strength.
const LAMP = { toward: 520, near: 150, power: 2.6 } as const;
const MADE_BY = 'node scripts/world/slice/pack.mjs';
const f = (n: number): string => n.toFixed(4);
const v3 = (a: readonly number[]): string => `vec3( ${a.map(f).join(', ')} )`;

const VERT = /* glsl */ `
attribute vec3 aim;
varying vec2 vUv;
varying vec3 vAim;
void main() {
	vUv = uv;
	vAim = aim;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

const FRAG = /* glsl */ `
uniform sampler2D uTone;
uniform sampler2D uForm;
uniform sampler2D uBounce;
uniform sampler2D uDepth;
uniform vec3 uCoreColor;
uniform vec3 uCorePale;
uniform float uCoreLevel;
uniform vec2 uStream;
uniform vec2 uProject;
uniform float uTime;
uniform vec2 uSurge;
uniform vec3 uLampAt;
uniform float uLamp;
varying vec2 vUv;
varying vec3 vAim;
const vec3 EYE = ${v3([EYE.x, EYE.y, EYE.z])};
const vec3 CORE = ${v3(CORE.at)};
const vec3 LUMA = vec3( 0.2126, 0.7152, 0.0722 );
const float SE = ${f(SE)}, CE = ${f(CE)};
${CURVE_GLSL}
${SWING_GLSL}
void main() {
	vec4 form = texture2D( uForm, vUv );
	if ( form.a < 0.5 ) discard;
	vec4 tone = texture2D( uTone, vUv ), glow = texture2D( uBounce, vUv ), deep = texture2D( uDepth, vUv );
	float toward = mix( ${f(PICTURED.depth[0])}, ${f(PICTURED.depth[1])}, ( deep.r * 65280.0 + deep.g * 255.0 ) / 65535.0 );
	vec3 ray = normalize( vAim - EYE );
	vec3 p = EYE + ray * ( ( toward - ${f(VIEW.back)} ) / ( ray.y * SE + ray.z * CE ) );
	float zv = ( ${f(VIEW.back)} - toward ) * ${f(SCALE)};
	gl_FragDepth = ( ( uProject.x * - zv + uProject.y ) / zv ) * 0.5 + 0.5;

	vec2 nv = form.xy * 2.0 - 1.0;
	float nz = sqrt( max( 0.0, 1.0 - dot( nv, nv ) ) );
	vec3 n = vec3( nv.x, nv.y * CE + nz * SE, nz * CE - nv.y * SE );
	vec3 albedo = tone.rgb * tone.rgb;
	float seen = form.b * form.b;

	vec3 out3 = p - CORE;
	float dist = length( out3 ), far = dist / ${f(CORE.r)};
	vec3 dir = out3 / max( dist, 1e-3 );
	float rise = smoothstep( ${f(LOOK.rise[0])}, ${f(LOOK.rise[1])}, far );

	float level = ${f(LOOK.level)} * uCoreLevel * coreSwing( dir, dist );

	float pale = ${f(LOOK.pale[0])} * smoothstep( ${f(LOOK.pale[1])}, ${f(LOOK.pale[2])}, seen );
	// What the pictures keep of the core is its share seen, the falloff and the slant together. Times far, it is
	// the slant alone, which is what turn sharpens.
	float facing = clamp( seen * far, 0.0, 1.0 );
	vec3 light = mix( uCoreColor, uCorePale, pale ) * ( level * pow( facing, ${f(LOOK.turn)} ) / far * ( 1.0 + ${f(LOOK.rise[2])} * rise ) );
	vec3 back = glow.rgb * glow.rgb;
	light += mix( back, vec3( dot( back, LUMA ) ), ${f(LOOK.bounce[2])} ) * ( ${f(LIGHT.bounce * LOOK.bounce[0])} * level * ( 1.0 + ${f(LOOK.bounce[1])} * rise ) );
	light += ${v3(LIGHT.warm)} * ( ${f(LOOK.fill)} * tone.a );
	{
		float below = ${f(SOURCE[1])} - p.y;
		float t = clamp( below, 0.0, uStream.y );
		vec3 q = vec3( ${f(SOURCE[0])}, ${f(SOURCE[1])} - t, ${f(SOURCE[2])} ) - p;
		float d = max( length( q ), 1e-3 ), k = clamp( 1.0 - d / ${f(STREAM.reach)}, 0.0, 1.0 );
		float fall = k * k / ( 1.0 + ( d / ${f(STREAM.near)} ) * ( d / ${f(STREAM.near)} ) ) * ( 1.0 - smoothstep( uStream.y - 12.0, uStream.y, below ) );
		light += ${v3(STREAM.color.toArray())} * ( ${f(STREAM.power)} * uStream.x * fall * clamp( ( dot( n, q / d ) + 0.3 ) / 1.3, 0.0, 1.0 ) * deep.b );
	}
	if ( uLamp > 0.0 ) {
		vec3 q = uLampAt - p;
		float d = max( length( q ), 1e-3 );
		light += ${v3(color('pale').toArray())} * ( uLamp * max( dot( n, q / d ), 0.0 ) / ( 1.0 + ( d / ${f(LAMP.near)} ) * ( d / ${f(LAMP.near)} ) ) );
	}
	vec3 c = albedo * light * ${f(1 / Math.PI)};
	c *= pow( max( dot( c, LUMA ) / ${f(LOOK.contrast[1])}, 1e-4 ), ${f(LOOK.contrast[0])} );
	stoneQH = 0.0;
	c = stoneCurve( max( c, 0.0 ), p );
	gl_FragColor = vec4( c, 1.0 );
}`;

export const build: PartFactory = async ({ query }) => {
  const group = new THREE.Group(), made: { dispose(): void }[] = [];
  const names = PICTURED.files, [tone, form, bounce, depth] = await Promise.all([names.tone, names.form, names.bounce, names.depth].map((n) => picture(n, MADE_BY)));
  const maps = { uTone: texture(tone, true), uForm: texture(form, true), uBounce: texture(bounce, true), uDepth: texture(depth, false) };
  made.push(...Object.values(maps));

  const sheet = laid(PICTURED.window);
  const shared = world.uniforms;
  const uniforms = {
    uTone: { value: maps.uTone }, uForm: { value: maps.uForm }, uBounce: { value: maps.uBounce }, uDepth: { value: maps.uDepth },
    uCoreColor: shared.uCoreColor, uCorePale: shared.uCorePale, uCoreLevel: shared.uCoreLevel, uStream: shared.uStream,
    uProject: { value: new THREE.Vector2() }, uTime: { value: 0 }, uSurge: { value: new THREE.Vector2(0, 60) },
    uLampAt: { value: new THREE.Vector3() }, uLamp: { value: 0 },
  };
  const m = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, depthFunc: THREE.LessEqualDepth });
  const face = new THREE.Mesh(sheet, m);
  face.frustumCulled = false;
  // Under everything else of the world and over its kept pictures (../../kept.ts), which are drawn first of all.
  face.renderOrder = -1e6 + 1;
  face.onBeforeRender = (_r, _s, camera) => { const e = camera.projectionMatrix.elements; uniforms.uProject.value.set(e[10], e[14]); };
  group.add(face);
  made.push(sheet, m);

  // The rock's shape, for the moon's shadows alone: drawn into the shadow map and nowhere else.
  try {
    const l = (await load('rock-s.bin')).meshes.get('break');
    if (l) {
      const g = new THREE.BufferGeometry(), all = l.geometry.index?.count ?? l.geometry.getAttribute('position').count;
      g.setAttribute('position', (l.geometry.getAttribute('position') as THREE.BufferAttribute).onUpload(letGo));
      g.setIndex(l.geometry.index?.onUpload(letGo) ?? null);
      g.boundingBox = l.geometry.boundingBox;
      g.boundingSphere = l.geometry.boundingSphere;
      g.setDrawRange(0, 0);
      const plain = new THREE.MeshBasicMaterial(), shade = new THREE.Mesh(g, plain);
      shade.position.copy(l.at);
      shade.scale.setScalar(l.size);
      shade.updateMatrix();
      shade.matrixAutoUpdate = false;
      shade.castShadow = true;
      shade.onBeforeShadow = () => g.setDrawRange(0, all);
      shade.onAfterShadow = () => g.setDrawRange(0, 0);
      group.add(shade);
      made.push(g, l.geometry, plain);
    }
  } catch (e) {
    console.warn(String(e));
  }

  const lamp = query.get('lamp') === '1';
  return {
    group,
    alone: { at: [CORE.at[0], CORE.at[1] - 30, CORE.at[2] - 60], r: 560 },
    update(s) {
      uniforms.uTime.value = s.t;
      uniforms.uSurge.value.set(s.stream.on, s.stream.since);
      if (lamp) {
        const ray = aimed((s.pointer.x - 0.5) * HOST.wide, s.pointer.y * HOST.tall).sub(EYE).normalize();
        uniforms.uLampAt.value.copy(EYE).addScaledVector(ray, (LAMP.toward - VIEW.back) / (ray.y * SE + ray.z * CE));
        uniforms.uLamp.value = LAMP.power;
      }
      return true;
    },
    dispose() { for (const d of made) d.dispose(); },
  };
};
