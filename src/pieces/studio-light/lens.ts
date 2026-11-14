import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { palette } from '../../config/palette';

// The Fresnel lens, in the head's millimetres: a flat back, a nearly flat middle and eight stepped rings round it,
// each ring a slice of the plano convex lens it stands in for, so the slope of each facet steepens toward the rim and
// each step is taller than the last. Its axis is the head's z.

export const LENS = { R: 74, CORE: 14, RINGS: 8, CURVE: 140, BASE: 66, BACK: 4 } as const;
const W = (LENS.R - LENS.CORE) / LENS.RINGS;
const sag = (r: number) => LENS.CURVE - Math.sqrt(LENS.CURVE ** 2 - r * r);

// The height of the front face over the base plane at radius r.
export function lensHeight(r: number): number {
  if (r <= LENS.CORE) return sag(LENS.CORE) - sag(r);
  const k = Math.min(LENS.RINGS - 1, Math.floor((r - LENS.CORE) / W));
  return sag(LENS.CORE + (k + 1) * W) - sag(r);
}

// The middle of the lens, where the stream leaves it.
export const LENS_MIDDLE = new THREE.Vector3(0, 0, LENS.BASE + lensHeight(0));

export function lensGeometry(seg = 288): THREE.BufferGeometry {
  const pts: [number, number][] = [];
  const facet = 5;
  for (let i = 0; i <= 3; i++) { const r = (LENS.CORE * i) / 3; pts.push([r, LENS.BASE + lensHeight(r)]); }
  for (let k = 0; k < LENS.RINGS; k++) {
    const r0 = LENS.CORE + k * W, r1 = r0 + W;
    // The riser: straight up from the foot of the last facet to the crest of this one.
    pts.push([r0 + 0.01, LENS.BASE + sag(r1) - sag(r0)]);
    for (let i = 1; i <= facet; i++) { const r = r0 + (W * i) / facet - (i === facet ? 0.01 : 0); pts.push([r, LENS.BASE + sag(r1) - sag(r)]); }
  }
  pts.push([LENS.R + 1.5, LENS.BASE]);
  pts.push([LENS.R + 1.5, LENS.BASE - LENS.BACK]);
  const g = new THREE.LatheGeometry(pts.slice().reverse().map(([r, z]) => new THREE.Vector2(r, z)), seg);
  g.rotateX(Math.PI / 2);
  return toCreasedNormals(g, (24 * Math.PI) / 180);
}

const lin = (hex: string) => { const c = new THREE.Color(hex); return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`; };

// Dark glass that takes the room and the cursor's light on its facets, and the lamp behind it shining through: each
// ring holds a line of light at its crest, hot in the middle, flame toward the rim, pale only at the very core. lit is
// how bright the lamp is, front how far out from the middle it has reached (in shares of the lens's radius), heat how
// hot it burns, which falls as it dies so a dying lamp goes deeper in color and draws in to its middle.
export function lensMaterial(): THREE.ShaderMaterial {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uLamp: { value: new THREE.Vector3() },
      uLampK: { value: 0 },
      uLit: { value: 0 },
      uFront: { value: 0 },
      uHeat: { value: 1 },
    },
    vertexShader: /* glsl */ `
varying vec3 vL; varying vec3 vW; varying vec3 vN; varying vec3 vAx; varying vec3 vAy; varying vec3 vAz;
void main(){
  vL = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vAx = normalize(mat3(modelMatrix) * vec3(1.0, 0.0, 0.0));
  vAy = normalize(mat3(modelMatrix) * vec3(0.0, 1.0, 0.0));
  vAz = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
  gl_Position = projectionMatrix * viewMatrix * w;
}`,
    fragmentShader: /* glsl */ `
uniform vec3 uLamp; uniform float uLampK, uLit, uFront, uHeat;
varying vec3 vL; varying vec3 vW; varying vec3 vN; varying vec3 vAx; varying vec3 vAy; varying vec3 vAz;
const float RL = ${LENS.R.toFixed(1)}, R0 = ${LENS.CORE.toFixed(1)}, RW = ${W.toFixed(4)}, CURVE = ${LENS.CURVE.toFixed(1)};
vec3 ramp(float t){
  vec3 ember = ${lin(palette.ember)}, flame = ${lin(palette.flame)}, hot = ${lin(palette.hot)}, pale = ${lin(palette.pale)};
  vec3 c = mix(ember, flame, smoothstep(0.0, 0.36, t));
  c = mix(c, hot, smoothstep(0.36, 0.78, t));
  return mix(c, pale, smoothstep(0.82, 1.0, t));
}
void main(){
  vec3 V = normalize(cameraPosition - vW);
  float r = length(vL.xy);
  // A step's wall seen edge on is a sliver under a pixel wide: shaded as itself it steps and crawls along the ring,
  // so there it takes the facet's own normal and looks like the facet beside it. Seen more face on it keeps its own,
  // which is what shows the rings when the lamp is dark.
  vec3 G = normalize(vN);
  if (dot(G, V) < 0.0) G = -G;
  float slope = r / sqrt(CURVE * CURVE - r * r);
  vec2 radial = r > 1e-3 ? vL.xy / r : vec2(0.0);
  vec3 nl = normalize(vec3(radial * slope, 1.0));
  vec3 F = normalize(vAx * nl.x + vAy * nl.y + vAz * nl.z);
  vec3 N = normalize(mix(F, G, smoothstep(0.12, 0.38, abs(dot(G, V)))));
  float rho = r / RL;
  float q = max(r - R0, 0.0) / RW;
  float f = fract(q);
  float core = 1.0 - step(R0, r);
  // How many rings a pixel spans: where the rings are finer than a few pixels they are drawn as their average, so
  // they never shimmer.
  float px = fwidth(q);
  float sharp = 1.0 - smoothstep(0.18, 0.45, px);
  // The crest just past each riser, softened by a pixel so its edge does not step.
  float e = max(px, 0.02);
  float crest = exp(-f * f / 0.007) * smoothstep(0.0, e, f);
  float facet = 0.1 + 0.4 * (1.0 - f) * (1.0 - f) * (1.0 - smoothstep(0.75, 1.0, f));

  // Unlit: dark glass, the room in it by Fresnel, the cursor's light caught on each ring's facet.
  vec3 R = reflect(-V, N);
  float nv = max(dot(N, V), 0.0);
  float fr = 0.04 + 0.96 * pow(1.0 - nv, 5.0);
  // The room: a soft glow overhead and two long strip lights, which each ring's facet catches at its own place.
  float room = smoothstep(0.0, 0.9, R.y) * 0.4
    + exp(-pow((R.x + 0.45) * 7.0, 2.0)) * smoothstep(-0.2, 0.5, R.y) * 0.9
    + exp(-pow((R.y - 0.55) * 8.0, 2.0)) * smoothstep(-0.1, 0.6, R.x) * 0.5;
  room *= mix(1.0, 0.75 + 0.5 * f, sharp);
  vec3 L = normalize(uLamp - vW);
  vec3 H = normalize(L + V);
  float nh = max(dot(N, H), 0.0);
  float spec = (pow(nh, 400.0) * 1.3 + pow(nh, 40.0) * 0.1) * uLampK;
  float body = max(dot(N, L), 0.0) * uLampK;
  vec3 glass = vec3(0.010, 0.0062, 0.0042) + ${lin(palette.copper)} * body * 0.02;
  vec3 col = glass + vec3(1.0, 0.78, 0.55) * (room * (fr + 0.03) * 0.5 + spec * 0.55);

  // Lit: the lamp's light through the rings, reaching out from the middle.
  float reach = 1.0 - smoothstep(uFront - 0.2, uFront, rho);
  float ring = mix(0.42, mix(facet, 1.0, crest), sharp);
  ring = mix(ring, 0.8, core);
  float fall = 1.0 - 0.62 * smoothstep(0.0, 1.0, rho);
  float hotCore = exp(-pow(rho / 0.11, 2.0));
  float I = uLit * reach * (fall * (0.12 + 0.95 * ring) + 0.55 * hotCore);
  float t = clamp((fall * (0.2 + 0.62 * ring) + 0.4 * hotCore) * uHeat, 0.0, 1.0);
  col += ramp(t * smoothstep(0.0, 0.35, uLit + 0.2)) * I * 1.25;
  gl_FragColor = vec4(col, 1.0);
}`,
  });
  m.name = 'slLens';
  return m;
}
