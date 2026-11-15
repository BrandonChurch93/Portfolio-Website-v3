import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { lin, shade } from '../../../../world/surface';
import { KIND } from './model';
import { DPI, GRIP, INLAY, LED, WHEEL } from './shape';

const f = (n: number) => n.toFixed(4);
// How sharply a surface must turn, in radians a metre, to count as a crease, and how much coat a flat face keeps.
const TURN = [60, 220] as const;
const COAT_FLAT = 0.12;

// Each kind's color, roughness, metalness, clear coat, how much of the room it reflects and its specular strength: the
// satin black shell, its chamfers, the dark inside of every gap, the matte graphite frame, the thumb's buttons in satin
// graphite, the rubber tread, the copper, the light, and the satin lip and shelf of the thumb's rest.
const FINISH: [color: number, rough: number, metal: number, coat: number, env: number, spec: number][] = [
  [0x090909, 0.45, 0, 1, 0.3, 0.15],
  [0x161616, 0.25, 0, 1, 0.9, 1],
  [0x030303, 0.92, 0, 0, 0.15, 0.3],
  [0x1f1e1d, 0.82, 0, 0, 0.45, 0.3],
  [0x2c2b2a, 0.4, 0, 0.5, 0.6, 0.45],
  [0x0c0c0c, 0.82, 0, 0, 0.35, 0.5],
  [hex('copper'), 0.24, 1, 0, 1, 1],
  [0x000000, 0.6, 0, 0, 0, 0],
  [0x2a2928, 0.5, 0, 0.3, 0.6, 0.5],
];
const by = (i: 0 | 1 | 2 | 3 | 4 | 5) => {
  const v = (n: number) => (i === 0 ? lin(FINISH[n][0]) : f(FINISH[n][i]));
  return FINISH.slice(1).map((_, n) => `kind == ${n + 1} ? ${v(n + 1)} : `).join('') + v(0);
};
// How much of the light's glow each kind gives back: the copper bezel most.
const BACK = [0.05, 0.12, 0.03, 0.1, 0.06, 0.12, 0.3, 0, 0.1];

export interface MouseMats {
  mouse: THREE.MeshPhysicalMaterial;
  // The light's color, already scaled by how much it is on.
  led: { value: THREE.Color };
}

export function mouseMaterials(axle: number, ledY: number): MouseMats {
  const mouse = shade(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.5, specularIntensity: 0.999, clearcoat: 1, clearcoatRoughness: 0.14 }), 'mouse', {
    vhead: 'attribute vec4 cell; varying float vKind;',
    vert: 'vKind = cell.w;',
    head: /* glsl */ `
uniform vec3 uLed;
varying float vKind;
int kind; vec3 msTilt; float msCoat; float msEnv; float msRub; float msSpec;
// How far outside the palm's panel a point of the plan is, in millimetres.
float msInlay(vec2 p){
  float w = min(${f(INLAY.half)}, (p.y - ${f(INLAY.tip)}) * ${f(INLAY.spread)});
  float back = (length(vec2(p.x / ${f(INLAY.half)}, max(p.y - ${f(INLAY.round)}, 0.0) / ${f(INLAY.cap)})) - 1.0) * ${f(INLAY.half)};
  return max((abs(p.x) - w) / ${f(Math.sqrt(1 + INLAY.spread * INLAY.spread))}, back);
}
float msBox(vec2 p, vec2 h, float r){ vec2 q = abs(p) - h + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
// The light that reaches a point from the ring: from the nearest point of the patch it bounds, by how squarely the
// surface faces it, falling off over a few millimetres.
float msLedFrom(vec3 p, vec3 n){
  vec3 q = vec3(clamp(p.x, ${f(-DPI.half - LED.ring)}, ${f(DPI.half + LED.ring)}), ${f(ledY)}, clamp(p.z, ${f(DPI.z0 - LED.ring)}, ${f(DPI.z1 + LED.ring)}));
  vec3 L = q - p; float d = length(L) + 1e-3;
  return max(dot(n, L / d), 0.0) / (1.0 + d * d / 3.0) * (1.0 - smoothstep(4.0, 9.0, d));
}`,
    color: /* glsl */ `
  kind = int(vKind + 0.5);
  msTilt = vec3(0.0); msRub = 0.0;
  diffuseColor.rgb = ${by(0)};
  vec3 ax = normalize(vAxX), ay = normalize(vAxY), az = normalize(cross(vAxX, vAxY));
  vec3 p = vObj;
  if (kind == ${KIND.top} && p.z > 0.0) {
    // The palm's panel: matte where the shell round it is satin, set in by a fine groove whose far lip catches light.
    float d = msInlay(p.xz);
    float da = max(fwidth(d), 1e-4);
    float near = 1.0 - smoothstep(0.35, 1.0, da);
    float groove = (1.0 - smoothstep(0.18, 0.18 + da * 1.5, abs(d + 0.2))) * mix(0.35, 1.0, near);
    vec2 gq = vec2(dFdx(d), dFdy(d));
    vec3 gv = normalize(dFdx(vObj) * gq.x + dFdy(vObj) * gq.y + 1e-6);
    vec3 gview = normalize(ax * gv.x + ay * gv.y + az * gv.z);
    float lip = (1.0 - smoothstep(0.2, 0.75, abs(d + 0.2))) * smoothstep(0.08, 0.2, abs(d + 0.2));
    msTilt -= sign(d + 0.2) * gview * lip * 0.6 * near;
    msRub = (1.0 - smoothstep(-da, da, d + 0.4)) * 0.85;
    diffuseColor.rgb = mix(diffuseColor.rgb, ${lin(0x171717)}, msRub) * (1.0 - 0.85 * groove);
  } else if (kind == ${KIND.frame}) {
    // The grip: a rubber panel set into each flank, with a fine diamond knurl that is gone before it is finer than a
    // pixel.
    vec2 gq = vec2(p.z - ${f(GRIP.z)}, p.y - ${f(GRIP.y)});
    float gd = msBox(gq, vec2(${f(GRIP.hz)}, ${f(GRIP.hy)}), ${f(GRIP.r)});
    float ga = max(fwidth(gd), 1e-4);
    float panel = 1.0 - smoothstep(-ga, ga, gd);
    float rim = (1.0 - smoothstep(0.0, 0.5 + ga, abs(gd + 0.25))) * (1.0 - smoothstep(0.35, 1.0, ga));
    float u = (p.z + p.y) * 2.0, v = (p.z - p.y) * 2.0;
    // Gone before a quarter of its period is finer than a pixel.
    float fine = 1.0 - smoothstep(0.9, 1.6, max(fwidth(u), fwidth(v)));
    float su = sin(u), cu = cos(u), sv = sin(v), cv = cos(v);
    msTilt += (az * (cu * sv + su * cv) + ay * (cu * sv - su * cv)) * 0.8 * fine * panel;
    msRub = panel;
    diffuseColor.rgb *= mix(1.0, 0.6 + 0.5 * (0.5 - 0.5 * su * sv) * fine, panel) * (1.0 - 0.75 * rim);
  } else if (kind == ${KIND.tread}) {
    // Ribs across the tread.
    vec3 q = p - vec3(0.0, ${f(axle)}, ${f(WHEEL.z)});
    float a = atan(q.y, q.z) * 42.0 / 6.2831853;
    float fine = 1.0 - smoothstep(0.25, 0.6, fwidth(a));
    float rr = length(q.yz) + 1e-4;
    vec3 tang = ay * (q.z / rr) - az * (q.y / rr);
    float s = sin(6.2831853 * a);
    msTilt += tang * s * 0.7 * fine;
    diffuseColor.rgb *= 1.0 - 0.35 * fine * smoothstep(0.3, 1.0, -cos(6.2831853 * a));
  } else if (kind == ${KIND.copper}) {
    // The turning's fine rings on the hubs' faces.
    vec3 q = p - vec3(0.0, ${f(axle)}, ${f(WHEEL.z)});
    float rr = length(q.yz) + 1e-4;
    float ring = (1.0 - smoothstep(0.25, 0.7, fwidth(rr * 3.0))) * smoothstep(0.85, 0.97, abs(normalize(vObjN).x));
    vec3 rad = ay * (q.y / rr) + az * (q.z / rr);
    msTilt += rad * sin(rr * 18.85) * 0.05 * ring;
  }
  msCoat = ${by(3)};
  msEnv = ${by(4)};
  msSpec = ${by(5)};`,
    rough: `roughnessFactor = mix(${by(1)}, 0.9, msRub);`,
    metal: `metalnessFactor = ${by(2)};`,
    normal: 'normal = normalize(normal + msTilt);',
    emissive: /* glsl */ `
  {
    float back = ${BACK.map((b, i) => (i < BACK.length - 1 ? `kind == ${i} ? ${f(b)} : ` : f(b))).join('')};
    vec3 n = normalize(vObjN);
    float lit = msLedFrom(vObj, n);
    totalEmissiveRadiance += uLed * (kind == ${KIND.led} ? 1.0 : lit * back);
  }`,
  });
  mouse.name = 'mouse';
  const before = mouse.onBeforeCompile.bind(mouse);
  mouse.onBeforeCompile = (sh, r) => {
    before(sh, r);
    // The chunk is still an include here, so it is written out to reach the lines inside it.
    const physical = THREE.ShaderChunk.lights_physical_fragment
      .replace('float specularIntensityFactor = specularIntensity;', 'float specularIntensityFactor = specularIntensity * msSpec;')
      .replace('material.clearcoat = clearcoat;', `material.clearcoat = clearcoat * msCoat * (1.0 - msRub);
  // On the shell the coat is kept where the surface turns sharply under the pixel, a crease or a chamfer, and taken
  // off its flat faces: the cursor's light then gathers on the creases as lines and not as a spot on a face.
  if (kind == ${KIND.top}) {
    float msTurn = length(fwidth(normalize(vNormal))) / max(length(fwidth(vViewPosition)), 1e-6);
    material.clearcoat *= mix(${f(COAT_FLAT)}, 1.0, smoothstep(${f(TURN[0])}, ${f(TURN[1])}, msTurn));
  }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <lights_physical_fragment>', physical)
      .replace('#include <lights_fragment_maps>', `#include <lights_fragment_maps>
#if defined( RE_IndirectSpecular )
  radiance *= msEnv;
  #ifdef USE_CLEARCOAT
  clearcoatRadiance *= msEnv;
  #endif
#endif
  iblIrradiance *= msEnv;`);
  };
  const led = { value: new THREE.Color(0, 0, 0) };
  mouse.userData.uniforms = { uLed: led };
  return { mouse, led };
}
