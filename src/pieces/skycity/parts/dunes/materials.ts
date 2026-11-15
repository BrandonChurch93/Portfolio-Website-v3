import * as THREE from 'three';
import { NOISE, lin } from '../../../../world/surface';
import { polished } from '../../polish';
import { WIND } from './plan';
import { POOL, SAND, THING } from './colors';

// Three programs: the sand, the pool, and what stands in the sand.

// The wind ripples: how far apart, in units, and how tall. They run across the wind, and fade to the sand's mean
// before they are finer than a pixel, so nothing crawls as the page scrolls.
const RIPPLE = { gap: 6.5, tall: 0.16 };
// The pool's swells: each runs at a bearing (radians from the map's z toward its x), with a number of waves to the
// unit, and turns the face at most this far (a slope).
const SWELLS: [number, number, number][] = [[0.1, 0.26, 0.36], [-0.45, 0.47, 0.12], [0.7, 0.8, 0.06]];

const C = (k: keyof typeof SAND) => lin(SAND[k]);

export function sandMaterial(): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0, sheen: 0.3, sheenRoughness: 0.4, sheenColor: new THREE.Color(SAND.sheen) });
  m.name = 'dunes-sand';
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 sand;\nattribute float level;\nvarying vec4 vSand;\nvarying float vLevel;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSand = sand;\nvLevel = level;');
    let f = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec4 vSand;
varying float vLevel;
${NOISE}
float dRipple = 0.0;
vec2 dGrad = vec2(0.0);`);
    f = f.replace('#include <color_fragment>', `#include <color_fragment>
{
  vec2 mp = vSand.xy;
  float side = vSand.z, hf = clamp(vSand.w, 0.0, 1.0);
  float big = wFbm(vec3(mp * 0.011, 1.7));
  vec3 c = mix(${C('hollow')}, ${C('body')}, smoothstep(0.06, 0.4, hf + (big - 0.5) * 0.3));
  c = mix(c, ${C('crest')}, smoothstep(0.45, 1.0, hf) * (1.0 - 0.4 * max(side, 0.0)));
  c *= 0.93 + 0.14 * wNoise(vec3(mp * 0.06, 4.2));
  // Slip faces are the coarser sand an avalanche leaves, darker and redder than the wind sorted windward faces.
  c = mix(c, c * vec3(0.8, 0.7, 0.62), max(side, 0.0) * smoothstep(0.85, 0.7, vLevel));
  diffuseColor.rgb = c;
  {
    vec2 w = vec2(${WIND[0].toFixed(3)}, ${WIND[1].toFixed(3)});
    vec2 q = vec2(dot(mp, w), dot(mp, vec2(-w.y, w.x)));
    float warp = 10.0 * wNoise(vec3(mp * 0.016, 2.0)) + 3.2 * wNoise(vec3(q.x * 0.05, q.y * 0.11, 5.0)) + 1.2 * wNoise(vec3(q.x * 0.12, q.y * 0.3, 9.0));
    float ph = (q.x + warp) / ${RIPPLE.gap.toFixed(2)};
    float fade = 1.0 - smoothstep(0.16, 0.36, fwidth(ph));
    float th = 6.2831853 * ph;
    float slope = cos(th + 0.6 * sin(th)) * (1.0 + 0.6 * cos(th)) * 6.2831853 * ${RIPPLE.tall.toFixed(3)} / ${RIPPLE.gap.toFixed(2)};
    float lull = smoothstep(0.25, 0.75, wNoise(vec3(mp * 0.03, 6.0)));
    dGrad = w * slope * fade * mix(0.35, 1.0, lull) * smoothstep(0.8, 0.93, vLevel) * (1.0 - max(side, 0.0));
  }
}`);
    f = f.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  vec3 tx = (viewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz, tz = (viewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz;
  tx = tx - normal * dot(normal, tx);
  tz = tz - normal * dot(normal, tz);
  vec3 nn = normal - dGrad.x * tx - dGrad.y * tz;
  normal = dot(nn, nn) > 1e-8 ? normalize(nn) : normal;
}`);
    // The room's strips are there for polished metal to reflect, and sand that took their light from every side had
    // its slip faces lit nearly as the moon lights the windward ones, so the crests were lost. Sand takes little of
    // them, least in the hollows and the lee.
    f = f.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
reflectedLight.indirectDiffuse *= mix(0.12, 0.3, clamp(vSand.w, 0.0, 1.0)) * (1.0 - 0.3 * max(vSand.z, 0.0));
reflectedLight.indirectSpecular *= 0.5;`);
    sh.fragmentShader = f;
  };
  m.customProgramCacheKey = () => 'dunes-sand';
  return m;
}

// The sand as the moon's shadow map sees it: let down a little under itself. A slip face lies nearly edge on to the
// moon, and tested against its own depth it drew bands of false shadow down every one, which read as melted sand. A
// crest still throws its shadow on the hollow beyond it.
export function sandDepth(): THREE.MeshDepthMaterial {
  const d = new THREE.MeshDepthMaterial();
  d.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed -= normal * 2.5;');
  };
  d.customProgramCacheKey = () => 'dunes-sand-depth';
  return d;
}

// The pool: a mirror of polished gold. It is drawn by what it reflects and nothing else.
export function poolMaterial(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: POOL, metalness: 1, roughness: 0.035 });
  m.name = 'dunes-pool';
  // Slow swells cross its face, steep enough that each turns it from the glow behind the world to the dark above and
  // below it and back: so it carries bands of bright beside dark, as a calm lake does a sunset. Level, it showed the
  // glow alone, as one flat warm color, and read as lava. Each fades before it is finer than a pixel.
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 map;\nvarying vec2 vMap;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMap = map;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vMap;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  vec2 g = vec2(0.0), d;
  float ph;
${SWELLS.map(([b, k, t], i) => `  d = vec2(${Math.sin(b).toFixed(4)}, ${Math.cos(b).toFixed(4)});
  ph = dot(vMap, d) * ${k.toFixed(3)} + 2.4 * sin(dot(vMap, vec2(-d.y, d.x)) * 0.09 + ${(i * 2.1).toFixed(2)}) + 1.2 * sin(dot(vMap, d) * 0.13 + ${(i * 1.3).toFixed(2)});
  g += d * cos(ph) * ${t.toFixed(3)} * (1.0 - smoothstep(0.6, 1.4, fwidth(ph)));`).join('\n')}
  vec3 tx = (viewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz, tz = (viewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz;
  tx -= normal * dot(normal, tx);
  tz -= normal * dot(normal, tz);
  vec3 nn = normal - g.x * tx - g.y * tz;
  normal = dot(nn, nn) > 1e-8 ? normalize(nn) : normal;
}`);
  };
  m.customProgramCacheKey = () => 'dunes-pool';
  return polished(m);
}

// What stands in the sand, told apart by a number on each point (look.w): 0 old stone, 1 dark rock, 2 polished
// bronze, 3 polished gold, 4 a lamp's flame. look.rgb is how far its color is varied.
export const KIND = { stone: 0, dark: 1, bronze: 2, gold: 3, lamp: 4 } as const;
const T = (k: keyof typeof THING) => lin(THING[k]);

export function thingsMaterial(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0 });
  m.name = 'dunes-things';
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 look;\nvarying vec4 vLook;\nvarying vec3 vAt;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLook = look;\nvAt = position;');
    let f = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec4 vLook;
varying vec3 vAt;
${NOISE}
float tKind = 0.0;`);
    f = f.replace('#include <color_fragment>', `#include <color_fragment>
tKind = floor(vLook.w + 0.5);
{
  float n = wFbm(vAt * 0.21);
  vec3 c = tKind < 0.5 ? ${T('stone')} * (0.8 + 0.4 * n) : tKind < 1.5 ? ${T('dark')} * (0.75 + 0.5 * n) : tKind < 2.5 ? ${T('bronze')} : tKind < 3.5 ? ${T('gold')} : ${T('lamp')};
  diffuseColor.rgb = c * vLook.rgb;
}`);
    f = f.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = tKind < 0.5 ? 0.82 : tKind < 1.5 ? 0.34 : tKind < 2.5 ? 0.16 : 0.07;`);
    f = f.replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
metalnessFactor = tKind > 1.5 && tKind < 3.5 ? 1.0 : 0.0;`);
    f = f.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
if (tKind > 3.5) totalEmissiveRadiance = ${T('lamp')} * 3.0;`);
    sh.fragmentShader = f;
  };
  m.customProgramCacheKey = () => 'dunes-things';
  return polished(m);
}
