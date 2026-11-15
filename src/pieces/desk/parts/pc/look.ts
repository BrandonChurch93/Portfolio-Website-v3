import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { NOISE, lin } from '../../../../world/surface';

// The PC's materials, in the site's palette in place of the PC Builder's own: near neutral blacks and warm dark steel
// for the case and its parts, copper only where the real thing is copper and only as an accent, and every light ember
// to pale, varied from part to part.
// A shader program is what a visitor waits for on a first visit, so the part keeps to seven: the plain solids differ
// only in their numbers and share one; the printed faces share one; the lights, the perforated sheets, the woven
// sleeves and the fan blades are one patched material each; and everything drawn as light alone (the glass, the light
// one part lays on the next, the floor's glow and the case's shadow) is one shader, told what to be by each vertex.

const solid = (name: string, color: number, roughness: number, metalness = 0) => {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  m.name = name;
  return m;
};

// The light ramp every lit thing reads its tone from: ember, flame, hot, pale.
const RAMP = /* glsl */ `
vec3 pcTone(float t){
  return t < 0.33 ? mix(${lin(hex('ember'))} * 2.6, ${lin(hex('flame'))}, t / 0.33)
       : t < 0.66 ? mix(${lin(hex('flame'))}, ${lin(hex('hot'))}, (t - 0.33) / 0.33)
       : mix(${lin(hex('hot'))}, ${lin(hex('pale'))}, (t - 0.66) / 0.34);
}`;

// Patches a standard material: chunks after the color, and in place of the emissive, with the model's own position.
function patch<M extends THREE.MeshStandardMaterial>(m: M, key: string, c: { vhead?: string; vert?: string; head?: string; color?: string; emissive?: string }, uniforms: Record<string, THREE.IUniform> = {}): M {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vObj;\nvarying vec3 vObjN;\n${c.vhead ?? ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvObj = position;\nvObjN = normal;\n${c.vert ?? ''}`);
    let f = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vObj;\nvarying vec3 vObjN;\n${NOISE}\n${RAMP}\n${c.head ?? ''}`);
    if (c.color) f = f.replace('#include <color_fragment>', `#include <color_fragment>\n${c.color}`);
    if (c.emissive) f = f.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${c.emissive}`);
    sh.fragmentShader = f;
  };
  m.customProgramCacheKey = () => key;
  return m;
}

export interface Look {
  shell: THREE.MeshStandardMaterial;
  inner: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
  plastic: THREE.MeshStandardMaterial;
  satin: THREE.MeshStandardMaterial;
  pcb: THREE.MeshStandardMaterial;
  sink: THREE.MeshStandardMaterial;
  sinkDark: THREE.MeshStandardMaterial;
  copper: THREE.MeshStandardMaterial;
  fin: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  void: THREE.MeshStandardMaterial;
  frit: THREE.MeshStandardMaterial;
  edge: THREE.MeshStandardMaterial;
  sleeve: THREE.MeshStandardMaterial;
  hose: THREE.MeshStandardMaterial;
  led: THREE.MeshStandardMaterial;
  perf: THREE.MeshStandardMaterial;
  bladeLit: THREE.MeshStandardMaterial;
  // Printed faces: the board's traces and the parts' marks.
  board: THREE.MeshStandardMaterial;
  print: THREE.MeshStandardMaterial;
  // Light alone, added; and the dark it leaves: the glass's tint and the case's shadow.
  fx: THREE.ShaderMaterial;
  fxDark: THREE.ShaderMaterial;
  // 0 to 1: how far the PC's own light is up.
  level: { value: number };
  lamp: { value: THREE.Vector3 };
  cursor: { value: THREE.Vector3 };
  // The middle of the case, in the world, which the glass's sheen is placed from.
  center: { value: THREE.Vector3 };
  lampK: { value: number };
}

// The woven sleeve: a diamond braid in the tube's own millimetres (u along it, v round it), fading to its mean tone
// once a strand is finer than a pixel.
const BRAID = /* glsl */ `
  { vec2 b = vUv / 1.15; float px = length(fwidth(b));
    float w = sin((b.x + b.y) * 3.14159) * sin((b.x - b.y) * 3.14159);
    float k = 1.0 - smoothstep(0.25, 0.6, px);
    diffuseColor.rgb *= mix(0.82, 0.62 + 0.55 * smoothstep(-0.6, 0.6, w), k); }`;

// What the light shader is told by each vertex, in its cell attribute: tone, strength, a shape value, and the mode.
export const FX = { glass: 0, ring: 1, fade: 2, text: 3, pool: 4, shadow: 5, tint: 6, spot: 7, flat: 8, mesh: 9 } as const;

export function makeLook(print: THREE.Texture, board: THREE.Texture): Look {
  const level = { value: 0 };
  const lamp = { value: new THREE.Vector3() };
  const lampK = { value: 1 };
  const cursor = { value: new THREE.Vector3() };
  const center = { value: new THREE.Vector3() };
  const shell = solid('pc-shell', 0x232221, 0.4, 1);
  const inner = solid('pc-inner', 0x121111, 0.72);
  const accent = solid('pc-accent', 0x2f2d2b, 0.42, 1);
  const plastic = solid('pc-plastic', 0x141312, 0.58);
  const satin = solid('pc-satin', 0x171615, 0.42);
  const pcb = solid('pc-pcb', 0x111012, 0.5);
  const sink = solid('pc-sink', 0x3a3836, 0.42, 1);
  const sinkDark = solid('pc-sink-dark', 0x201f1e, 0.42, 1);
  const copper = solid('pc-copper', hex('copper'), 0.28, 1);
  const fin = solid('pc-fin', 0x34322f, 0.45, 1);
  const rubber = solid('pc-rubber', 0x0e0d0d, 0.85);
  const voidM = solid('pc-void', 0x030303, 1);
  const frit = solid('pc-frit', 0x090909, 0.7);
  const edge = solid('pc-glass-edge', 0x8a847c, 0.15);

  const sleeve = patch(new THREE.MeshStandardMaterial({ color: 0x1a1918, roughness: 0.55 }), 'pc-braid', { color: BRAID });
  sleeve.name = 'pc-sleeve';
  sleeve.defines = { USE_UV: '' };
  const hose = patch(new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 0.45 }), 'pc-braid', { color: BRAID });
  hose.name = 'pc-hose';
  hose.defines = { USE_UV: '' };

  // The lit diffusers: frosted smoke when off, and their light by tone when on.
  const led = patch(new THREE.MeshStandardMaterial({ color: 0x24221f, roughness: 0.45, emissive: 0xffffff }), 'pc-led', {
    vhead: 'attribute vec4 cell; varying vec2 vLed;',
    vert: 'vLed = cell.xy;',
    head: 'uniform float uLevel; varying vec2 vLed;',
    emissive: 'totalEmissiveRadiance = pcTone(vLed.x) * vLed.y * uLevel * 1.6;',
  }, { uLevel: level });
  led.name = 'pc-led';

  // A perforated sheet: a staggered grid of round holes with an edge a pixel wide, and its mean coverage once the
  // holes are finer than a pixel, so nothing sparkles. Each sheet carries its pitch, its mean cover and how pale its
  // metal is (perfOf), so a fine top and a coarse shelf share one program.
  const perf = patch(new THREE.MeshStandardMaterial({ color: 0x232220, roughness: 0.55, metalness: 0.3, transparent: true }), 'pc-perf', {
    vhead: 'attribute vec4 cell; varying vec3 vPerf;',
    vert: 'vPerf = cell.xyz;',
    head: 'varying vec3 vPerf;\nvec2 perfP(){ vec3 n = abs(vObjN); return n.y > n.x && n.y > n.z ? vObj.xz : n.x > n.z ? vObj.zy : vObj.xy; }',
    color: `
  { float k = max(vPerf.x, 0.5); vec2 p = perfP() / k; vec2 T = vec2(3.0, 5.196);
    vec2 a = mod(p, T) - 0.5 * T; vec2 b = mod(p + 0.5 * T, T) - 0.5 * T;
    float d = min(length(a), length(b)) - 0.9;
    float far = smoothstep(0.5, 1.1, length(fwidth(p)));
    float solid = clamp(d / max(fwidth(d), 1e-4) + 0.5, 0.0, 1.0);
    diffuseColor.rgb *= max(vPerf.z, 0.2);
    diffuseColor.a = mix(mix(0.06, 1.0, solid), vPerf.y, far); }`,
  });
  perf.name = 'pc-perf';

  // The fans' blades: smoked plastic that carries the light of the fan's rings in from its rim, brightest by the hub's
  // ring, as the PC Builder's Aureole blades do. Each fan's tone and strength come in its instance color.
  const bladeLit = patch(new THREE.MeshStandardMaterial({ color: 0x161514, roughness: 0.38, emissive: 0xffffff }), 'pc-blade', {
    vhead: 'varying float vFanR;',
    vert: 'vFanR = length(position.xy);',
    head: 'uniform float uLevel; varying float vFanR;',
    color: `diffuseColor.rgb = ${lin(0x161514)} * (0.9 + 0.2 * wNoise(vObj * 0.3));`,
    emissive: 'totalEmissiveRadiance = pcTone(vColor.r) * vColor.g * uLevel * (0.03 + 0.16 * (1.0 - smoothstep(18.0, 40.0, vFanR)) + 0.12 * smoothstep(48.0, 56.0, vFanR));',
  }, { uLevel: level });
  bladeLit.name = 'pc-blade';

  const boardM = new THREE.MeshStandardMaterial({ map: board, roughness: 0.6 });
  boardM.name = 'pc-board-face';
  const printM = new THREE.MeshStandardMaterial({ map: print, roughness: 0.5, metalness: 0.4 });
  printM.name = 'pc-print';

  // Light alone. The glass adds a soft reflection of the room by Fresnel and one long reflection of the cursor's light
  // that slides along the long side as the light moves; it takes no light from inside the case, as real glass shows
  // none. The rest is the light a lit part lays on the next: a ring, a fade away from a bar, a lit wordmark, the floor's
  // glow round the base; and, drawn darkening, the glass's tint and the case's shadow.
  const uniforms = { uLevel: level, uLamp: lamp, uCursor: cursor, uLampK: lampK, uSheen: { value: 0.03 }, uCenter: center, uMap: { value: print }, uHalf: { value: new THREE.Vector2(227.5, 145) } };
  const fxShader = {
    vertexShader: `attribute vec4 cell; varying vec4 vCell; varying vec2 vUv; varying vec3 vW; varying vec3 vN; varying vec3 vP;
void main(){ vCell = cell; vUv = uv; vP = position; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uLevel, uLampK, uSheen; uniform vec3 uLamp, uCursor, uCenter; uniform sampler2D uMap; uniform vec2 uHalf;
varying vec4 vCell; varying vec2 vUv; varying vec3 vW; varying vec3 vN; varying vec3 vP;
${RAMP}
void main(){
  int mode = int(vCell.w + 0.5);
  vec3 tone = pcTone(vCell.x) * vCell.y;
  if (mode == 0) {
    vec3 N = normalize(vN), V = normalize(cameraPosition - vW), R = reflect(-V, N);
    float fr = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
    float room = smoothstep(-0.2, 0.9, R.y) * 0.45;
    // A soft, broad sheen slanting across the sheet, as glass shows the room, which moves a little with the cursor's
    // light. Low, so it never competes with what is behind it.
    vec3 across = normalize(cross(N, vec3(0.0, 1.0, 0.0)));
    vec3 q = vW - uCenter;
    float u = dot(q, across) * 0.8 + q.y * 0.6 - dot(uCursor - uCenter, across) * 0.2;
    float sheen = exp(-pow((u - uSheen) / 0.07, 2.0)) * 0.05 + exp(-pow((u - uSheen - 0.11) / 0.025, 2.0)) * 0.025;
    gl_FragColor = vec4(vec3(1.0, 0.89, 0.76) * (room * fr * 0.6 + sheen * uLampK), 0.0);
    return;
  }
  if (mode == 5 || mode == 6) {
    float a = vCell.y;
    if (mode == 5) { vec2 q = max(abs(vP.xz) - uHalf + 6.0, 0.0); a *= exp(-length(q) / 22.0); }
    gl_FragColor = vec4(0.0, 0.0, 0.0, a);
    return;
  }
  float a = 0.0;
  if (mode == 1) { float d = length(vUv * 2.0 - 1.0); a = exp(-pow((d - vCell.z) / 0.16, 2.0)) * (1.0 - smoothstep(0.85, 1.0, d)); }
  else if (mode == 2) { a = pow(1.0 - vUv.y, 2.0) * smoothstep(0.0, 0.08, vUv.x) * (1.0 - smoothstep(0.92, 1.0, vUv.x)); }
  else if (mode == 3) { a = texture2D(uMap, vUv).g; }
  else if (mode == 7) { float d = length(vUv * 2.0 - 1.0); a = pow(max(1.0 - d, 0.0), 2.0); }
  else if (mode == 9) {
    // A ring of light seen through a perforated sheet: only through its holes up close, and their mean further off.
    float d = length(vUv * 2.0 - 1.0); a = (exp(-pow((d - vCell.z) / 0.11, 2.0)) + 0.25 * exp(-pow((d - vCell.z) / 0.35, 2.0))) * (1.0 - smoothstep(0.85, 1.0, d));
    vec2 p = vP.xz, T = vec2(3.0, 5.196);
    vec2 h0 = mod(p, T) - 0.5 * T, h1 = mod(p + 0.5 * T, T) - 0.5 * T;
    float hd = min(length(h0), length(h1)) - 0.9;
    float far = smoothstep(0.5, 1.1, length(fwidth(p)));
    a *= mix(1.0 - clamp(hd / max(fwidth(hd), 1e-4) + 0.5, 0.0, 1.0), 0.34, far);
  }
  else if (mode == 8) { vec2 e = min(vUv, 1.0 - vUv); a = smoothstep(0.0, 0.03, min(e.x, e.y) * 2.0 + 0.0); }
  else if (mode == 4) {
    vec2 q = max(abs(vP.xz) - uHalf, 0.0); float d = length(q);
    float side = smoothstep(-uHalf.y, uHalf.y, vP.z) * 0.6 + smoothstep(-uHalf.x, uHalf.x, vP.x) * 0.25 + 0.15;
    // Close by the strip, and a long soft reach beyond it that lands on what lies near: the title's nearest letters.
    a = (exp(-d / 55.0) * 0.75 + exp(-d / 210.0) * 0.25) * smoothstep(0.0, 6.0, d) * (1.0 - smoothstep(0.45, 1.0, d / vCell.z)) * side;
  }
  gl_FragColor = vec4(tone * a * uLevel, 0.0);
}`,
  };
  const fx = new THREE.ShaderMaterial({ ...fxShader, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true });
  fx.name = 'pc-fx';
  const fxDark = new THREE.ShaderMaterial({ ...fxShader, uniforms, transparent: true, depthWrite: false, blending: THREE.NormalBlending, premultipliedAlpha: true });
  fxDark.name = 'pc-fx-dark';

  return { shell, inner, accent, plastic, satin, pcb, sink, sinkDark, copper, fin, rubber, void: voidM, frit, edge, sleeve, hose, led, perf, bladeLit, board: boardM, print: printM, fx, fxDark, level, lamp, cursor, center, lampK };
}

// Marks a perforated sheet: its pitch against the fine one, its cover once the holes are lost, how pale its metal.
export function perfOf(g: THREE.BufferGeometry, pitch = 1, cover = 0.66, pale = 1): THREE.BufferGeometry {
  const n = g.getAttribute('position').count;
  const c = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) c.set([pitch, cover, pale, 0], i * 4);
  g.setAttribute('cell', new THREE.Float32BufferAttribute(c, 4));
  return g;
}

// Marks a geometry for the light shader: tone, strength, a shape value, and the mode.
export function fxOf(g: THREE.BufferGeometry, mode: number, tone = 0, gain = 1, shape = 0): THREE.BufferGeometry {
  const n = g.getAttribute('position').count;
  const c = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) c.set([tone, gain, shape, mode], i * 4);
  g.setAttribute('cell', new THREE.Float32BufferAttribute(c, 4));
  return g;
}
