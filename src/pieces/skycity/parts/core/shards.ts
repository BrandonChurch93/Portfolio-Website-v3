import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { COPPER, COPPER_LIGHT } from '../../../../metal/finishes';
import { seeded } from '../../../../world/build';
import { lin } from '../../../../world/surface';
import { VERTEX_FLOATS, buildShards, facetKind } from '../../../../stream/shards';
import { STREAM } from '../../../../stream/config';
import { KNOT, PATHS, UNBALANCE, strandPace } from './knot';

// The stream's own shards (buildShards, the very meshes the stream draws), circling the kernel in shells and riding
// the strands that gather into the source. Solid ones are dark mirrors of copper, lit by the knot on the side that
// faces it, so those in front of it are dark shapes against its light with their rims burning, and those behind it
// flash toward the visitor. Clear ones carry its light in their bodies. Their paths and their tumbling are worked
// out from the clock in the vertex shader.

const VERT = /* glsl */ `
attribute vec3 aEdge, aB0, aB1, aB2;
attribute vec4 aOrb;     // how far out it circles, how fast, where it starts, its size
attribute vec4 aPlane;   // which it is (0 loose in a shell, 1 riding a ribbon, 2 riding a strand into the source), and three numbers for its path
attribute vec4 aSpin;    // the axis it tumbles about, and how fast
varying vec3 vL, vN, vB0, vB1, vB2, vEdge, vObj, vEye, vRide, vRideT;
varying float vSize, vRideK;
${PATHS}
void main(){
  float t = uT, size = aOrb.w, mode = aPlane.w;
  vec3 c;
  vRideT = vec3(0.0); vRide = vec3(0.0); vRideK = 0.0;
  if (mode > 1.5) {
    // Riding a strand down into the source, circling it closer as it goes, and gone into the stream there.
    int i = int(aPlane.x + 0.5);
    float u = fract(t * aOrb.y + aPlane.y);
    float k = u * NECK * 0.99;
    vec3 p = funnelAt(i, k, t), q = funnelAt(i, k + 0.004, t) - p;
    vec3 along = normalize(q + vec3(0.0, -1e-4, 0.0));
    vec3 side = normalize(cross(along, normalize(p + vec3(1e-3))));
    float a = aOrb.z + t * aPlane.z, r = aOrb.x * (1.0 - 0.7 * u * u);
    c = p + (side * cos(a) + cross(along, side) * sin(a)) * r;
    size *= smoothstep(0.02, 0.12, u) * (1.0 - smoothstep(0.62, 0.86, u));
    vRide = p; vRideT = along; vRideK = uF1[i].w * smoothstep(0.0, 0.05, u);
  } else if (mode > 0.5) {
    // Riding a ribbon of the knot as the stream's shards ride its core: carried along it, circling it.
    int i = int(aPlane.x + 0.5);
    float th = aPlane.y + aOrb.y * t;
    vec3 p = strandAt(i, th, t), q = strandAt(i, th + 0.01, t) - strandAt(i, th - 0.01, t);
    vec3 along = normalize(q + vec3(1e-5));
    vec3 side = normalize(cross(along, normalize(p + vec3(1e-3))));
    float a = aOrb.z + aPlane.z * t;
    c = p + (side * cos(a) + cross(along, side) * sin(a)) * aOrb.x;
    float seed = uS3[i].y, k = 1.0 + floor(seed * 3.0);
    vRide = p; vRideT = along;
    vRideK = uS3[i].z * (0.03 + 0.97 * smoothstep(-0.1, 0.85, sin(k * th + seed * 6.28 - t * 0.9 * uS3[i].x)));
  } else {
    float a = aOrb.y * t + aOrb.z;
    vec3 p = vec3(aOrb.x * cos(a), aPlane.z * sin(2.0 * a + aOrb.z), aOrb.x * sin(a));
    c = shape(turnAbout(p, vec3(cos(aPlane.x), 0.0, sin(aPlane.x)), aPlane.y));
  }
  vec3 axis = normalize(aSpin.xyz + vec3(1e-4));
  float ang = aSpin.w * t + aOrb.z * 3.0;
  vec3 lp = c + turnAbout(position * size, axis, ang);
  vL = lp;
  vN = turnAbout(normal, axis, ang);
  vB0 = turnAbout(aB0, axis, ang); vB1 = turnAbout(aB1, axis, ang); vB2 = turnAbout(aB2, axis, ang);
  vEdge = aEdge * size; vObj = position; vSize = size;
  // The knot is only scaled and moved, never turned, so the eye in its own units is this.
  vEye = (cameraPosition - modelMatrix[3].xyz) / length(modelMatrix[0].xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(lp, 1.0);
}
`;

const LIGHT = /* glsl */ `
uniform float uCore;
${UNBALANCE}
uniform vec3 uLamp;
varying vec3 vL, vN, vB0, vB1, vB2, vEdge, vObj, vEye, vRide, vRideT;
varying float vSize, vRideK;
const vec3 PALE = ${lin(hex('pale'))};
float ggx(float nh, float a){ float a2 = a * a, d = nh * nh * (a2 - 1.0) + 1.0; return a2 / (3.14159 * d * d); }
// The light a shard is lit by is the line it rides (as coreFrom in the stream's shaders), and the kernel, which is
// small and fierce and falls off fast. A mirror shows a line of light as a band across a face, and the kernel as a
// spot.
vec3 lineFrom(out float fall, out vec3 plane){
  vec3 C = vRide - vL, T = vRideT;
  vec3 across = C - T * dot(C, T);
  float near = length(across);
  vec3 toward = across / max(near, 1e-3);
  fall = uCore * vRideK * 2.2 / (1.0 + pow(near / 14.0, 1.5));
  plane = normalize(cross(T, toward) + vec3(1e-5));
  return toward;
}
float band(vec3 N, vec3 V, vec3 toward, vec3 plane, float wide){
  vec3 R = reflect(-V, N);
  float off = dot(R, plane);
  return exp(-off * off / (wide * wide)) * smoothstep(-0.2, 0.35, dot(R, toward));
}
float kernelFrom(out vec3 toward){
  float d = max(length(vL), 1.0);
  toward = -vL / d;
  return uCore * 3.0 / (1.0 + pow(d / 30.0, 2.0));
}
float spot(vec3 N, vec3 V, vec3 toward, float spread){
  float m = dot(reflect(-V, N), toward);
  return exp(-2.0 * (1.0 - m) / (spread * spread));
}
float room(vec3 R){
  vec2 d = vec2(R.x, -R.y) / max(R.z + 0.4, 0.25);
  float key = smoothstep(0.1, 0.5, d.y) * (1.0 - smoothstep(0.9, 1.5, d.y)) * (1.0 - smoothstep(0.5, 1.2, abs(d.x + 0.3)));
  float low = smoothstep(-0.3, -0.7, d.y) * (1.0 - smoothstep(0.4, 1.3, abs(d.x - 0.5)));
  return 0.02 + 0.34 * key + 0.1 * low;
}
float lampLight(out vec3 Ll){
  vec3 Lv = uLamp - vL;
  Ll = normalize(Lv);
  return 0.35 / (1.0 + pow(length(Lv) / 600.0, 2.0));
}
float tipAt(){ return pow(smoothstep(0.68, 1.0, length(vObj)), 3.0); }
vec3 bevelAt(out float line){
  float e = min(vEdge.x, min(vEdge.y, vEdge.z));
  line = 1.0 - smoothstep(0.25, 0.75, e);
  vec3 b = vEdge.x <= vEdge.y && vEdge.x <= vEdge.z ? vB0 : (vEdge.y <= vEdge.z ? vB1 : vB2);
  return normalize(b);
}
`;

// A solid facet: every face a flat mirror of dark metal, as the stream's are (SOLID_FRAG in its shaders). It is
// dark until a face turns to the light, and then the whole face flashes; a hairline where the bevel of an edge
// catches it; a glint on the points.
const SOLID = /* glsl */ `
uniform vec3 uMetal, uCopper;
${LIGHT}
void main(){
  vec3 N = normalize(vN), V = normalize(vEye - vL), Ll, plane, K;
  float fall, line, kf = kernelFrom(K), kd = max(length(vL), 1.0);
  vec3 toward = lineFrom(fall, plane);
  float lampI = lampLight(Ll);
  vec3 B = bevelAt(line);
  float flash = band(N, V, toward, plane, 0.2) * 9.0 + band(N, V, toward, plane, 0.34) * 0.45;
  float kflash = spot(N, V, K, clamp(10.0 / kd, 0.05, 0.5)) * 9.0;
  float turned = max(dot(N, toward), 0.0);
  float lamp = (ggx(max(dot(N, normalize(Ll + V)), 0.0), 0.1) * 0.11 + 0.07) * max(dot(N, Ll), 0.0) * lampI;
  vec3 Rv = mat3(viewMatrix) * reflect(-V, N);
  float lit = min(fall + kf, 1.0);
  float light = room(Rv) * (0.12 + 0.5 * lit) + fall * (flash + 0.06 * turned + 0.03) + kf * (kflash + 0.04 * max(dot(N, K), 0.0)) + 0.008 + lamp;
  float edge = fall * band(B, V, toward, plane, 0.45) * 3.4 + kf * spot(B, V, K, 0.5) * 2.0 + 0.02;
  light = mix(light, max(light, edge), line) + tipAt() * (1.8 * fall + 1.2 * kf);
  vec3 col = mix(uCopper, uMetal, 0.3 * clamp(light - 0.6, 0.0, 1.0)) * vec3(1.0, 0.92, 0.8) * light * 1.35;
  float mx = max(col.r, max(col.g, col.b));
  col *= (1.0 - exp(-mx * 1.15)) / (mx * 0.955 + 1e-5);
  col = mix(col, PALE, clamp((light - 1.7) * 0.4, 0.0, 0.85));
  gl_FragColor = vec4(unbalance(col), 1.0);
}
`;

// A clear facet carries light and does not throw it back: it holds the light through its body, brightest along its
// edges, dims a little of what is behind it and lays its own light over that (CLEAR_FRAG in the stream's shaders).
const CLEAR = /* glsl */ `
const vec3 EMBER = ${lin(hex('ember'))};
const vec3 FLAME = ${lin(hex('flame'))};
const vec3 HOT = ${lin(hex('hot'))};
${LIGHT}
vec3 ramp(float a){
  vec3 c = EMBER * clamp(a / 0.11, 0.0, 1.0);
  c = mix(c, FLAME, smoothstep(0.07, 0.42, a));
  c = mix(c, HOT, smoothstep(0.34, 0.85, a));
  c = mix(c, PALE, smoothstep(0.7, 1.6, a));
  return c;
}
void main(){
  vec3 N = normalize(vN), V = normalize(vEye - vL), Ll, plane, K;
  float fall, line, kf = kernelFrom(K);
  vec3 toward = lineFrom(fall, plane);
  fall += kf;
  float lampI = lampLight(Ll);
  vec3 B = bevelAt(line);
  float deep = pow(smoothstep(0.0, 0.34 * vSize, min(vEdge.x, min(vEdge.y, vEdge.z))), 1.3);
  float away = 0.5 - 0.5 * dot(N, toward);
  float graze = pow(1.0 - abs(dot(N, V)), 3.0);
  float held = min(sqrt(fall), 1.2) * (0.16 + 0.5 * pow(away, 1.5) + 0.08 * graze) + 0.2 * lampI * max(dot(N, Ll), 0.0);
  held += 0.55 * fall * band(N, V, toward, plane, 0.36);
  held = 0.8 * (1.0 - exp(-held * (0.22 + 0.78 * deep) / 0.42)) + 0.03 * room(mat3(viewMatrix) * reflect(-V, N));
  float glint = band(N, V, toward, plane, 0.07) * 2.8 * fall;
  float rim = 1.0 - smoothstep(0.1, 0.55, abs(dot(B, V)));
  float edge = (held * 1.5 + 0.1 * min(fall, 1.0)) * rim + fall * 2.8 * band(B, V, toward, plane, 0.42);
  float point = tipAt() * 1.6 * fall;
  vec3 col = max(ramp(held), ramp(glint + point));
  col = mix(col, max(col, ramp(edge + point)), line);
  float a = clamp(0.2 + 0.5 * line * min(edge, 1.0) + 0.9 * held, 0.0, 0.9);
  gl_FragColor = vec4(unbalance(min(col, PALE)), a);
}
`;

export interface Shards { solid: THREE.Mesh; clear: THREE.Mesh; materials: THREE.ShaderMaterial[]; triangles: number }

export function makeShards(uniforms: Record<string, THREE.IUniform>): Shards {
  const meshes = buildShards(STREAM.seed + 11), r = seeded(5521), S = KNOT.shards;
  const lots = { solid: [] as number[][], clear: [] as number[][] };
  const push = (into: number[][], kind: number, orb: number[], plane: number[], spin: number[]) => {
    const { first, count } = meshes.kinds[kind];
    for (let v = 0; v < count; v++) {
      const o = (first + v) * VERTEX_FLOATS, d = meshes.data;
      into[0].push(d[o], d[o + 1], d[o + 2]);
      into[1].push(d[o + 3], d[o + 4], d[o + 5]);
      into[2].push(d[o + 6], d[o + 7], d[o + 8]);
      into[3].push(d[o + 10], d[o + 11], d[o + 12]);
      into[4].push(d[o + 13], d[o + 14], d[o + 15]);
      into[5].push(d[o + 16], d[o + 17], d[o + 18]);
      into[6].push(...orb);
      into[7].push(...plane);
      into[8].push(...spin);
    }
  };
  const fresh = () => Array.from({ length: 9 }, () => [] as number[]);
  const solid = fresh(), clear = fresh();
  const spin = () => { const z = r() * 2 - 1, a = r() * 6.283, s = Math.sqrt(1 - z * z); return [s * Math.cos(a), s * Math.sin(a), z, (0.4 + 2.2 * r()) * (r() < 0.5 ? -1 : 1)]; };
  const sized = () => { const big = r() ** 3; return { big, size: S.size[0] + (S.size[1] - S.size[0]) * big }; };
  // Most ride the ribbons, as the stream's ride its core: circling each at the stream's distances, carried along it.
  const ribbons = Array.from({ length: KNOT.ribbons }, (_, i) => KNOT.tight + i);
  const pace = strandPace();
  for (let n = 0; n < S.ride; n++) {
    const i = ribbons[n % ribbons.length], { big, size } = sized(), into = r() < S.clear ? clear : solid;
    const sheath = STREAM.shards.near + (STREAM.shards.far - STREAM.shards.near) * r() ** 1.4;
    push(into, facetKind(big, r()), [sheath * STREAM.scale, pace[i] * (0.7 + 0.6 * r()), r() * 6.283, size], [i, r() * 6.283, (0.8 + 1.4 * r()) * (r() < 0.5 ? -1 : 1), 1], spin());
  }
  // A few circle loose in the outer shells, lit by the kernel alone: dark shapes in front of the knot.
  const bands = Array.from({ length: 3 }, () => [r() * 6.283, Math.acos(1 - 2 * r())]);
  for (let n = 0; n < S.shells; n++) {
    const band = bands[n % 3], rho = S.near + (S.far - S.near) * r(), { big, size } = sized();
    const into = r() < S.clear ? clear : solid;
    push(into, facetKind(big, r()), [rho, 0.16 * (r() < 0.3 ? -1 : 1) * (0.8 + 0.4 * r()), r() * 6.283, size], [band[0] + (r() - 0.5) * 0.4, band[1] + (r() - 0.5) * 0.4, (r() - 0.5) * 18, 0], spin());
  }
  for (let n = 0; n < S.riders; n++) {
    const { big, size } = sized(), into = r() < S.clear ? clear : solid;
    const sheath = STREAM.shards.near + (STREAM.shards.far - STREAM.shards.near) * r() ** 1.4;
    push(into, facetKind(big, r()), [sheath * STREAM.scale, 0.05 + 0.04 * r(), r() * 6.283, size], [n % 3 === 2 ? KNOT.heroes + (n % (KNOT.funnels - KNOT.heroes)) : n % KNOT.heroes, r(), (0.8 + 1.4 * r()) * (r() < 0.5 ? -1 : 1), 2], spin());
  }
  const geometry = (a: number[][]) => {
    const g = new THREE.BufferGeometry();
    const names: [string, number][] = [['position', 3], ['normal', 3], ['aEdge', 3], ['aB0', 3], ['aB1', 3], ['aB2', 3], ['aOrb', 4], ['aPlane', 4], ['aSpin', 4]];
    names.forEach(([name, n], i) => g.setAttribute(name, new THREE.Float32BufferAttribute(a[i], n)));
    return g;
  };
  const shared = { ...uniforms, uLamp: { value: new THREE.Vector3(0, 0, 900) } };
  const solidMat = new THREE.ShaderMaterial({
    name: 'coreSolid', vertexShader: VERT, fragmentShader: SOLID,
    uniforms: { ...shared, uMetal: { value: new THREE.Vector3(...COPPER_LIGHT) }, uCopper: { value: new THREE.Vector3(...COPPER) } },
  });
  const clearMat = new THREE.ShaderMaterial({
    name: 'coreClear', vertexShader: VERT, fragmentShader: CLEAR, uniforms: shared,
    transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, premultipliedAlpha: true,
  });
  const sm = new THREE.Mesh(geometry(solid), solidMat), cm = new THREE.Mesh(geometry(clear), clearMat);
  for (const m of [sm, cm]) { m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.userData.noAO = true; }
  cm.renderOrder = 6;
  return { solid: sm, clear: cm, materials: [solidMat, clearMat], triangles: (solid[0].length + clear[0].length) / 9 };
}
