import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { lin, shade } from '../../../../world/surface';
import { KIND } from './model';
import { LED, LEN, MARK, zAt } from './shape';

const f = (n: number) => n.toFixed(4);
// The palette's pale in linear light, scaled to a luminance of one, and how far the neutral surfaces' highlights are
// taken to it.
const PALE = (() => {
  const c = new THREE.Color(hex('pale'));
  const l = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return `vec3(${f(c.r / l)}, ${f(c.g / l)}, ${f(c.b / l)})`;
})();
const NEUTRAL = 0.9;

// Each kind's color, roughness, metalness, how much of the room it reflects and its specular strength, in the order of
// KIND: the black nose, the buttons, the palm in soft touch, the anodised graphite side, the dark skirt, the polished
// trim at the lip in warm dark steel, the dark of every seam, the line of light, the copper, the wheel's rubber,
// the thumb's buttons, the button behind the wheel, and the glossy lip on the button's side of each seam.
const FINISH: [color: number, rough: number, metal: number, env: number, spec: number][] = [
  [0x0a0a0a, 0.5, 0, 0.26, 0.45],
  [0x090909, 0.36, 0, 0.26, 0.55],
  [0x0b0b0b, 0.48, 0, 0.2, 0.5],
  [0x55524e, 0.48, 1, 0.72, 0.85],
  [0x161616, 0.6, 0, 0.45, 0.45],
  [0x7d7873, 0.32, 1, 0.8, 0.8],
  [0x020202, 0.9, 0, 0.1, 0.15],
  [0x000000, 0.6, 0, 0, 0],
  [hex('copper'), 0.26, 1, 1, 1],
  [0x101010, 0.8, 0, 0.35, 0.4],
  [0x121212, 0.36, 0, 0.7, 0.75],
  [0x141414, 0.34, 0, 0.75, 0.75],
  [0x161616, 0.16, 0, 1, 1],
];
// The grip set into each flank: its middle along the length and up the side, and its half sizes, in millimetres.
const GRIP = { z: 11, y: 18, hz: 10, hy: 4, r: 2.5 };
const by = (i: 0 | 1 | 2 | 3 | 4) => {
  const v = (n: number) => (i === 0 ? lin(FINISH[n][0]) : f(FINISH[n][i]));
  return FINISH.slice(1).map((_, n) => `kind == ${n + 1} ? ${v(n + 1)} : `).join('') + v(0);
};

export interface MouseMats {
  mouse: THREE.MeshPhysicalMaterial;
  // The light's color, already scaled by how much it is on.
  led: { value: THREE.Color };
  core: { value: THREE.Color };
}

export function mouseMaterials(axle: number, wheelZ: number): MouseMats {
  const mouse = shade(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.5, specularIntensity: 1 }), 'mouse', {
    vhead: 'attribute vec4 cell; varying float vKind; varying float vAcross;',
    vert: 'vKind = cell.w; vAcross = cell.x;',
    head: /* glsl */ `
uniform vec3 uLed; uniform vec3 uLedCore;
varying float vKind; varying float vAcross;
int kind; float metalnessFactorGrip; vec3 msTilt; float msEnv; float msSpec; float msRough;
float msMark;
float msBox(vec2 p, vec2 h, float r){ vec2 q = abs(p) - h + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }`,
    color: /* glsl */ `
  kind = int(vKind + 0.5);
  msTilt = vec3(0.0);
  diffuseColor.rgb = ${by(0)};
  vec3 ax = normalize(vAxX), ay = normalize(vAxY), az = normalize(cross(vAxX, vAxY));
  msRough = 0.0; msMark = 0.0; metalnessFactorGrip = 0.0;
  vec3 p = vObj;
  if (kind == ${KIND.skirt}) diffuseColor.rgb *= 1.0 - 0.6 * smoothstep(0.45, 1.0, vAcross);
  if (kind <= ${KIND.palm}) {
    // Soft touch: a fine uneven grain in tone and sheen, gone before it is finer than a pixel.
    float fine = 1.0 - smoothstep(0.12, 0.35, length(fwidth(p)) * 3.0);
    float gr = wNoise(p * 3.0) - 0.5;
    diffuseColor.rgb *= 1.0 + 0.5 * gr * fine;
    msRough = 0.14 * gr * fine;
    if (kind == ${KIND.palm}) {
      // The mark: a slit of light along the spine, its ends drawn to points.
      float u = clamp((p.z - ${f(zAt(MARK.from))}) / ${f(zAt(MARK.to) - zAt(MARK.from))}, 0.0, 1.0);
      float hw = ${f(MARK.stroke / 2)} * sqrt(max(0.0, 1.0 - pow(2.0 * u - 1.0, 8.0)));
      float d = abs(p.x) - hw;
      float aa = max(fwidth(p.x), 1e-4);
      msMark = (1.0 - smoothstep(-aa, aa, d)) * step(0.001, hw);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02), msMark);
    }
  } else if (kind == ${KIND.side}) {
    // Anodised graphite brushed along its length, with a knurled rubber grip set into it.
    float px = length(fwidth(p));
    float fine = 1.0 - smoothstep(0.08, 0.25, px * 6.0);
    float br = wNoise(vec3(p.x * 6.0, p.y * 6.0, p.z * 0.12)) - 0.5;
    msRough = 0.16 * br * fine;
    diffuseColor.rgb *= 1.0 + 0.12 * br * fine;
    vec2 gq = vec2(p.z - ${f(GRIP.z)}, p.y - ${f(GRIP.y)});
    float gd = msBox(gq, vec2(${f(GRIP.hz)}, ${f(GRIP.hy)}), ${f(GRIP.r)});
    float ga = max(fwidth(gd), 1e-4);
    float panel = 1.0 - smoothstep(-ga, ga, gd);
    float rim = (1.0 - smoothstep(0.0, 0.4 + ga, abs(gd + 0.2))) * (1.0 - smoothstep(0.35, 1.0, ga));
    float u = (p.z + p.y) * 3.6, v = (p.z - p.y) * 3.6;
    float kn = 1.0 - smoothstep(0.9, 1.6, max(fwidth(u), fwidth(v)));
    float su = sin(u), cu = cos(u), sv = sin(v), cv = cos(v);
    msTilt += (az * (cu * sv + su * cv) + ay * (cu * sv - su * cv)) * 0.45 * kn * panel;
    diffuseColor.rgb *= mix(1.0, 0.25 + 0.1 * (0.5 - 0.5 * su * sv) * kn, panel) * (1.0 - 0.7 * rim);
    msRough += panel * 0.45;
    metalnessFactorGrip = panel;
  }
  if (kind == ${KIND.tread}) {
    vec3 q = p - vec3(0.0, ${f(axle)}, ${f(wheelZ)});
    float a = atan(q.y, q.z) * 40.0 / 6.2831853;
    float fine = 1.0 - smoothstep(0.25, 0.6, fwidth(a));
    float rr = length(q.yz) + 1e-4;
    vec3 tang = ay * (q.z / rr) - az * (q.y / rr);
    float s = sin(6.2831853 * a);
    msTilt += tang * s * 0.7 * fine;
    diffuseColor.rgb *= 1.0 - 0.4 * fine * smoothstep(0.3, 1.0, -cos(6.2831853 * a));
  }
  msEnv = ${by(3)};
  msSpec = ${by(4)};`,
    rough: `roughnessFactor = clamp(${by(1)} + msRough, 0.05, 1.0);`,
    metal: `metalnessFactor = ${by(2)} * (1.0 - metalnessFactorGrip);`,
    normal: 'normal = normalize(normal + msTilt);',
    emissive: /* glsl */ `
  {
    // The line of light, and what it lays on the graphite just above and below it.
    float near = exp(-abs(vObj.y - ${f((LED.y0 + LED.y1) / 2)}) / 1.6);
    float back = kind == ${KIND.side} ? 0.1 : kind == ${KIND.skirt} ? 0.14 : 0.0;
    // The line itself: a hot core along the middle of its height, falling to its color at its edges, and a little
    // brighter toward the tail.
    float c = 1.0 - abs(vObj.y - ${f((LED.y0 + LED.y1) / 2)}) / ${f((LED.y1 - LED.y0) / 2)};
    float run = 0.78 + 0.22 * smoothstep(${f(-LEN / 2)}, ${f(LEN / 2)}, vObj.z);
    vec3 line = mix(uLed * 0.8, uLedCore, smoothstep(0.2, 0.9, c)) * run;
    totalEmissiveRadiance += kind == ${KIND.led} ? line : uLed * back * near;
    totalEmissiveRadiance += uLedCore * 0.7 * msMark;
  }`,
  });
  mouse.name = 'mouse';
  const before = mouse.onBeforeCompile.bind(mouse);
  mouse.onBeforeCompile = (sh, r) => {
    before(sh, r);
    // The chunk is still an include here, so it is written out to reach the line inside it.
    const physical = THREE.ShaderChunk.lights_physical_fragment
      .replace('float specularIntensityFactor = specularIntensity;', 'float specularIntensityFactor = specularIntensity * msSpec;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <lights_physical_fragment>', physical)
      .replace('#include <lights_fragment_maps>', `#include <lights_fragment_maps>
#if defined( RE_IndirectSpecular )
  radiance *= msEnv;
#endif
  iblIrradiance *= msEnv;`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
  // The monitor behind it is one hot panel of light where the real screen is mostly dark, and the black shell held
  // it as a brown sheen. The neutral surfaces take their highlights in the room's pale, which reads neutral.
  if (kind <= ${KIND.chamfer} || kind >= ${KIND.tread}) {
    vec3 ds = reflectedLight.directSpecular;
    reflectedLight.directSpecular = mix(ds, dot(ds, vec3(0.2126, 0.7152, 0.0722)) * ${PALE}, ${f(NEUTRAL)});
  }`);
  };
  const led = { value: new THREE.Color(0, 0, 0) }, core = { value: new THREE.Color(0, 0, 0) };
  mouse.userData.uniforms = { uLed: led, uLedCore: core };
  return { mouse, led, core };
}
