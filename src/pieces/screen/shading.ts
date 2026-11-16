import * as THREE from 'three';
import { hex } from '../../config/palette';
import { NOISE, lin } from '../../world/surface';
import { ART, BUNDLE_COUNT, CABLE_ID, D_MAX, L_MAX, PULSE_PX_MM, ART_PX_MM } from './art';
import { BEZEL, DB, RUN, SPEED, TRAY } from './layout';

// Everything solid in the screen is drawn by one program. Each vertex carries what it is made of (its color, how
// rough, how metal, which way it was brushed, and what it does that plain material does not) and the number of its
// part. A small float texture holds each part's transform, heat and fold for this frame, so the whole piece moves
// part by part from one draw call. The boards' copper, ink and pads, and the parts' printed tops, come from one sheet
// laid over the whole back, read only on faces that look straight back.

export interface Shared {
  uParts: { value: THREE.DataTexture };
  uArt: { value: THREE.Texture };
  uPulse: { value: THREE.Texture };
  uTime: { value: number };
  // The stream's power in the boards, 0 to 1, and the clock time it came on.
  uGlow: { value: number };
  uLit: { value: number };
  uStatic: { value: number };
  // The backlight leaking round the rim, the front's light, and the standby light, each 0 to 1.
  uLeak: { value: number };
  uScreen: { value: number };
  uStandby: { value: number };
  // The band: the middle of its circle on the back (x, y), its radius and how brightly it burns.
  uBand: { value: THREE.Vector4 };
  uBandOn: { value: number };
  // Where the eye is, in the piece's millimetres.
  uEye: { value: THREE.Vector3 };
  // The rim light, as the eye sees it: the way to it in view space, and how strong it is.
  uRim: { value: THREE.Vector4 };
}

export const PARTS_MAX = 256;
export const PART_TEXELS = 5;

// What a vertex is made of beyond color, roughness and metal.
export const SPECIAL = { none: 0, board: 1, print: 2, leak: 3, glass: 4, flex: 5, wire: 6, led: 7 } as const;
// Which way a metal was brushed, by its own axes.
export const BRUSH = { none: 0, x: 1, y: 2, z: 3, radial: 4 } as const;

export function shared(art: THREE.Texture, pulse: THREE.Texture): Shared {
  const tex = new THREE.DataTexture(new Float32Array(PART_TEXELS * PARTS_MAX * 4), PART_TEXELS, PARTS_MAX, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return {
    uParts: { value: tex }, uArt: { value: art }, uPulse: { value: pulse }, uTime: { value: 0 }, uGlow: { value: 0 }, uLit: { value: -1e4 }, uStatic: { value: 0 },
    uLeak: { value: 0 }, uScreen: { value: 0 }, uStandby: { value: 0 },
    uBand: { value: new THREE.Vector4(0, 0, -1e5, 0) }, uBandOn: { value: 0 }, uEye: { value: new THREE.Vector3(0, 0, 1500) }, uRim: { value: new THREE.Vector4(0, 1, 0, 0) },
  };
}

const C = (n: Parameters<typeof hex>[0]) => lin(hex(n));
const f = (v: number) => v.toFixed(3);

const VHEAD = /* glsl */ `
attribute vec4 look;
attribute vec4 feel;
attribute float part;
uniform highp sampler2D uParts;
varying vec3 vObj;
varying vec3 vObjN;
varying vec3 vScP;
varying vec3 vScN;
varying vec4 vLook;
varying vec4 vFeel;
varying vec2 vScUv;
varying float vHeat;
float scVh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float scVn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(scVh(i), scVh(i + vec3(1,0,0)), f.x), mix(scVh(i + vec3(0,1,0)), scVh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(scVh(i + vec3(0,0,1)), scVh(i + vec3(1,0,1)), f.x), mix(scVh(i + vec3(0,1,1)), scVh(i + vec3(1,1,1)), f.x), f.y), f.z); }
vec3 scCrumple(vec3 p){ p *= 0.3; return vec3(scVn(p), scVn(p + 17.1), scVn(p + 31.7)) * 2.0 - 1.0; }`;

const MOVE = /* glsl */ `
  int scI = int(part + 0.5);
  vec4 scR0 = texelFetch(uParts, ivec2(0, scI), 0), scR1 = texelFetch(uParts, ivec2(1, scI), 0), scR2 = texelFetch(uParts, ivec2(2, scI), 0);
  vec4 scT3 = texelFetch(uParts, ivec2(3, scI), 0), scT4 = texelFetch(uParts, ivec2(4, scI), 0);
  vec3 scQ = transformed;
  if (scT3.y < 0.999) {
    float o = scT3.y;
    scQ = scT4.xyz + (scQ - scT4.xyz) * mix(scT3.w, 1.0, o) + scCrumple(scQ) * scT3.z * (1.0 - o) * (1.0 - o);
  }
  transformed = vec3(dot(scR0.xyz, scQ) + scR0.w, dot(scR1.xyz, scQ) + scR1.w, dot(scR2.xyz, scQ) + scR2.w);
  vScP = transformed;
  vHeat = scT3.x;`;

const VERT = /* glsl */ `
vObj = position;
vObjN = normal;
vLook = look;
vFeel = feel;
vScUv = uv;
{
${MOVE}
  vec3 scN = normalize(vec3(dot(scR0.xyz, objectNormal), dot(scR1.xyz, objectNormal), dot(scR2.xyz, objectNormal)) + 1e-6);
  vScN = scN;
  #ifndef FLAT_SHADED
  vNormal = normalize(normalMatrix * scN);
  #endif
}`;

const CABLE_D0 = [RUN.ribbon, RUN.thin, RUN.pair, RUN.harness];

export const FHEAD = /* glsl */ `
uniform sampler2D uArt;
uniform sampler2D uPulse;
uniform float uTime, uGlow, uLit, uStatic, uBandOn, uLeak, uScreen, uStandby;
uniform vec4 uBand, uRim;
uniform vec3 uEye;
varying vec3 vObj;
varying vec3 vObjN;
varying vec3 vScP;
varying vec3 vScN;
varying vec4 vLook;
varying vec4 vFeel;
varying vec2 vScUv;
varying float vHeat;
${NOISE}
vec3 scRamp(float i){
  vec3 c = mix(${C('ember')}, ${C('flame')}, smoothstep(0.04, 0.42, i));
  c = mix(c, ${C('hot')}, smoothstep(0.42, 0.85, i));
  return mix(c, ${C('pale')}, smoothstep(0.95, 1.4, i));
}
float scH(float n){ n = fract(n * 0.1031); n *= n + 33.33; n *= n + n; return fract(n); }
vec2 scArtUv(vec2 p){ return (p - vec2(${f(ART.x0)}, ${f(ART.y0)})) / vec2(${f(ART.w)}, ${f(ART.h)}); }
// A point taken down the eye's ray to the tray's back.
vec2 scOnBack(vec3 p){ return uEye.xy + (p.xy - uEye.xy) * (uEye.z / max(uEye.z - p.z, 1.0)); }
// The power at D millimetres along its way and L along its own bundle b: a front that runs out from the input and
// leaves the way lit low behind it, then each bundle's own traffic, uneven, some beats skipped, each wave dying.
float scPower(float D, float L, float b){
  float since = uTime - uLit;
  if (since < 0.0) return 0.0;
  if (uStatic > 0.5) return 0.34;
  float ahead = D + 34.0 * scH(b * 3.7 + 1.0) - since * ${f(SPEED)};
  if (ahead > 0.0) return 1.15 * exp(-pow(ahead / 10.0, 2.0));
  float v = 0.08 + 1.05 * exp(ahead / 34.0) * (0.55 + 0.45 * exp(ahead / 8.0));
  float rate = 0.7 + 0.8 * scH(b * 7.13 + 1.0), phase = scH(b * 3.31 + 2.0) * 7.0;
  float k0 = floor(uTime * rate + phase), reached = uLit + (D - L) / ${f(SPEED)} + 0.35;
  for (int j = 0; j < 3; j++) {
    float k = k0 - float(j), key = k * 1.618 + b * 17.0;
    float at = (k + 0.6 * scH(key + 0.5) - phase) / rate;
    if (at < reached || scH(key + 2.5) < 0.28) continue;
    float s = (uTime - at) * (190.0 + 170.0 * scH(key + 3.5)), a = L - s;
    float crest = a > 0.0 ? exp(-pow(a / 5.0, 2.0)) : exp(a / 20.0) * 0.6;
    v += (0.45 + 0.55 * scH(key + 1.5)) * crest * exp(-s / 140.0);
  }
  return v;
}
const float SC_CABLE_D0[4] = float[4](${CABLE_D0.map(f).join(', ')});
float scCableD0(float id){
  if (id > ${f(CABLE_ID.cof - 0.5)}) return ${f(RUN.driver + 4)} + abs(vObj.x - ${f(DB.ribbon[0])}) * 0.9;
  return SC_CABLE_D0[int(clamp(id - ${f(BUNDLE_COUNT + 1)}, 0.0, 3.0))];
}
// What the front shows, as light only: a header along the top, a column of items down the side, rows of text.
float scUi(vec2 p){
  if (p.y > 86.0) return 0.34 + 0.2 * step(0.55, fract((p.x + 160.0) / 41.0)) * step(p.x, 120.0);
  if (p.x < -128.0) { float r = fract((p.y + 100.0) / 13.0), k = floor((p.y + 100.0) / 13.0); return r > 0.28 && r < 0.72 ? 0.2 + 0.32 * scH(k + 3.0) : 0.04; }
  float r = fract(p.y / 6.5), k = floor(p.y / 6.5);
  return 0.05 + step(0.38, r) * step(r, 0.62) * step(0.25, scH(k + 9.0)) * (0.12 + 0.2 * scH(k));
}
// The light the band throws: a hot line on the cut, and the parts just behind it lit by it.
float scCutA;
vec3 scEdgeLight(){
  if (uBandOn < 0.5 || uBand.w <= 0.0) return vec3(0.0);
  float w = max(0.4, fwidth(scCutA) * 1.3);
  float line = exp(-pow(scCutA / w, 2.0)) * uBand.w;
  vec2 o = scOnBack(vScP) - uBand.xy;
  vec3 toLine = normalize(vec3(o / max(length(o), 1e-3), 0.55));
  float facing = max(dot(normalize(vScN), toLine), 0.0);
  float trail = exp(-scCutA / 6.0) * smoothstep(0.0, 1.5, scCutA / w) * uBand.w * facing * facing * 1.6;
  return mix(${C('hot')}, ${C('pale')}, 0.6 * uBand.w) * line * 6.0 + scRamp(trail) * trail * 4.0;
}
// A part opening out of its shard burns along its edges and cools as it opens.
vec3 scHeatLight(){
  if (vHeat <= 0.001) return vec3(0.0);
  float side = smoothstep(0.55, 0.95, 1.0 - abs(normalize(vScN).z));
  return scRamp(vHeat) * vHeat * 2.2 * (0.35 + 0.65 * side);
}
vec3 scRimLight(vec3 n, vec3 v){
  if (uRim.w <= 0.0) return vec3(0.0);
  float graze = 1.0 - clamp(dot(n, v), 0.0, 1.0);
  float toward = clamp(dot(n, uRim.xyz), 0.0, 1.0);
  return ${C('pale')} * pow(graze, 6.0) * pow(toward, 2.0) * uRim.w;
}
// How far a point is inside the tray's outline: the leak's light falls on what is near the rim.
float scRimDist(vec2 p){ return min(min(p.x - ${f(TRAY.x0)}, ${f(TRAY.x1)} - p.x), min(p.y - ${f(TRAY.y0)}, ${f(TRAY.y1)} - p.y)); }
float scTop(){ return step(0.95, vObjN.z); }`;

export const CUT = /* glsl */ `
  scCutA = uBand.z - length(scOnBack(vScP) - uBand.xy);
  if (uBandOn > 0.5 && scCutA < 0.0) discard;`;

const PULSE_MM = f(PULSE_PX_MM), ARTMM = f(ART_PX_MM);

const COLOR = /* glsl */ `
${CUT}
  float scSp = floor(vFeel.w + 0.5);
  vec3 scCol = vLook.rgb;
  float scRough = vFeel.x, scMetal = vFeel.y;
  float scBr = floor(vFeel.z + 0.5);
  if (scBr > 0.5) {
    vec3 q = scBr < 1.5 ? vec3(vObj.x * 0.05, vObj.y * 6.0, vObj.z * 6.0) : scBr < 2.5 ? vec3(vObj.x * 6.0, vObj.y * 0.05, vObj.z * 6.0) : scBr < 3.5 ? vec3(vObj.x * 6.0, vObj.y * 6.0, vObj.z * 0.05) : vec3(length(vObj.xy) * 6.0, atan(vObj.y, vObj.x) * 0.5, vObj.z * 0.2);
    float px = length(fwidth(vObj)), a1 = 1.0 - smoothstep(0.3, 0.7, 6.0 * px), a2 = 1.0 - smoothstep(0.3, 0.7, 16.0 * px), a0 = 1.0 - smoothstep(0.3, 0.7, 1.4 * px);
    float br = (wNoise(q * 0.23) - 0.5) * 0.42 * a0 + (wNoise(q) - 0.5) * 0.5 * a1 + (wNoise(q * 2.7) - 0.5) * 0.35 * a2;
    scCol *= 1.0 + 0.16 * br;
    scRough = clamp(scRough + 0.14 * br, 0.04, 1.0);
  }
  if (vLook.w > 0.0 && scSp < 4.5) scCol *= 1.0 - vLook.w + 2.0 * vLook.w * wFbm(vObj * 0.35 + 3.0);
  vec4 scA = vec4(0.0);
  float scInk = 0.0;
  if ((scSp == 1.0 || scSp == 2.0) && scTop() > 0.5) {
    scA = texture2D(uArt, scArtUv(vObj.xy));
    if (scSp == 1.0) {
      scCol = mix(scCol, scCol * 1.5 + ${C('copper')} * 0.045, scA.r);
      scCol = mix(scCol, ${lin(new THREE.Color(hex('text-2')).multiplyScalar(0.8).getHex())}, scA.g);
      scCol = mix(scCol, ${lin(new THREE.Color(hex('copper')).multiplyScalar(0.82).getHex())}, scA.b);
      scRough = mix(mix(scRough, 0.82, scA.g), 0.3, scA.b);
      scMetal = scA.b;
    } else if (scA.a > 0.5) {
      scCol = mix(${lin(new THREE.Color(hex('text-2')).multiplyScalar(0.62).getHex())}, ${lin(new THREE.Color(hex('bg')).getHex())}, scA.g);
      scRough = 0.7; scMetal = 0.0;
    } else {
      scCol = mix(scCol, ${lin(new THREE.Color(hex('text-2')).multiplyScalar(0.72).getHex())}, scA.g * (1.0 - scMetal * 0.3));
      scCol *= 1.0 - 0.7 * scA.b;
      scRough = mix(scRough, 0.8, max(scA.g, scA.b));
      scMetal = mix(scMetal, 0.0, scA.g);
    }
  }
  if (scSp == 5.0) {
    // Flat flex: copper conductors under a dark amber film, and bare at the ends.
    float x = fract(vScUv.x), fw = fwidth(vScUv.x);
    float wire = 1.0 - smoothstep(0.17 - fw, 0.17 + fw, abs(x - 0.5));
    wire = mix(wire, 0.34, smoothstep(0.3, 0.7, fw));
    scCol = mix(${lin(new THREE.Color(hex('bronze-deep')).multiplyScalar(0.36).getHex())}, ${lin(new THREE.Color(hex('copper')).multiplyScalar(0.5).getHex())}, wire * 0.7);
    scRough = mix(0.22, 0.34, wire); scMetal = wire * 0.6;
    scInk = wire;
  }
  diffuseColor.rgb = scCol;`;

const NORMAL = /* glsl */ `
  if (floor(vFeel.w + 0.5) == 1.0 && scTop() > 0.5) {
    float e = 0.09;
    vec4 ax0 = texture2D(uArt, scArtUv(vObj.xy + vec2(-e, 0.0))), ax1 = texture2D(uArt, scArtUv(vObj.xy + vec2(e, 0.0)));
    vec4 ay0 = texture2D(uArt, scArtUv(vObj.xy + vec2(0.0, -e))), ay1 = texture2D(uArt, scArtUv(vObj.xy + vec2(0.0, e)));
    float gx = dot(ax1.rgb - ax0.rgb, vec3(0.5, 0.25, 0.25)), gy = dot(ay1.rgb - ay0.rgb, vec3(0.5, 0.25, 0.25));
    normal = normalize(normal - (gx * vAxX + gy * vAxY) * 0.8);
  }`;

const EMISSIVE = /* glsl */ `
  {
    float sp = floor(vFeel.w + 0.5);
    totalEmissiveRadiance += scHeatLight() + scEdgeLight() + scRimLight(normal, normalize(vViewPosition));
    if (uGlow > 0.001 && sp == 1.0 && scTop() > 0.5) {
      vec2 uv = scArtUv(vObj.xy);
      float lod = log2(max(length(fwidth(vObj.xy)) * ${PULSE_MM}, 1e-4));
      vec4 s = textureLod(uPulse, uv, max(lod, 0.0));
      if (s.r > 0.02) {
        float far = smoothstep(0.0, 2.0, lod);
        float D = s.g / s.r * ${f(D_MAX)}, b = floor(s.b / s.r * 255.0 + 0.5), L = s.a / s.r * ${f(L_MAX)};
        float g = min(scPower(D, L, b), 1.3) * uGlow * pow(s.r, mix(1.0, 0.5, far));
        totalEmissiveRadiance += scRamp(g) * g * (3.6 + 1.6 * far);
      }
    }
    if (sp == 5.0 || sp == 6.0) {
      float id = vLook.w, L = vScUv.y, D = scCableD0(id) + L;
      float g = min(scPower(D, L, id), 1.3) * uGlow;
      float k = sp == 5.0 ? 0.1 + 0.9 * scInk : 0.26;
      totalEmissiveRadiance += scRamp(g) * g * k * 3.2;
    }
    if (sp == 3.0) {
      float along = vObj.x * 0.13 + vObj.y * 0.11;
      float k = uLeak * (0.82 + 0.18 * sin(along) * sin(along * 0.37 + 1.3)) * (1.0 + 0.35 * smoothstep(-80.0, -100.0, vObj.y)) + uStandby * 0.05;
      totalEmissiveRadiance += scRamp(0.55 + 0.5 * k) * k * 2.6;
    }
    if (sp == 4.0) {
      vec2 p = clamp(vObj.xy, vec2(-156.0, -96.0), vec2(156.0, 96.0));
      float c = scUi(p) * uScreen;
      totalEmissiveRadiance += scRamp(0.25 + 1.4 * c) * c * 3.0 + scRamp(0.5) * uLeak * 0.08;
    }
    if (sp == 7.0) totalEmissiveRadiance += ${C('ember')} * uStandby * 6.0 + scRamp(0.9) * uGlow * 3.0;
    if (sp != 1.0) {
      // The lit traces' light on what stands beside them, and the leak's on what is near the rim.
      vec4 s = textureLod(uPulse, scArtUv(vObj.xy), 4.6);
      float side = 0.3 + 0.7 * (1.0 - max(normalize(vScN).z, 0.0));
      if (uGlow > 0.001 && s.r > 0.01) {
        float D = s.g / s.r * ${f(D_MAX)}, b = floor(s.b / s.r * 255.0 + 0.5), L = s.a / s.r * ${f(L_MAX)};
        float k = min(scPower(D, L, b) * min(s.r * 3.0, 1.0), 0.8) * uGlow * side * 0.9;
        totalEmissiveRadiance += scRamp(k) * k * (0.35 + 0.65 * diffuseColor.rgb * 3.0);
      }
      float r = scRimDist(vObj.xy);
      if (uLeak + uStandby > 0.001 && r < 12.0) {
        float k = (uLeak + uStandby * 0.05) * exp(-max(r, 0.0) / 2.2) * exp(-max(vObj.z - ${f(BEZEL.z1)}, 0.0) / 3.0) * 0.8;
        totalEmissiveRadiance += scRamp(0.6) * k * (0.4 + diffuseColor.rgb * 2.0);
      }
    }
  }`;

// The one material every solid part is drawn with.
export function solidMaterial(u: Shared): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 1, metalness: 1 });
  m.name = 'screenSolid';
  m.envMapIntensity = 0.5;
  m.specularIntensity = 0.5;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    const pre = 'varying vec3 vAxX;\nvarying vec3 vAxY;';
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${pre}\n${VHEAD}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvAxX = normalize(mat3(modelViewMatrix) * vec3(1.0, 0.0, 0.0));\nvAxY = normalize(mat3(modelViewMatrix) * vec3(0.0, 1.0, 0.0));\n${VERT}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${pre}\n${FHEAD}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${COLOR}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = scRough;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = scMetal;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${NORMAL}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${EMISSIVE}`);
  };
  m.customProgramCacheKey = () => 'screen-solid';
  return m;
}

// Shadows are drawn from where each part is now, folded as it is, and nothing the band has not reached casts one.
export function depthMaterial(u: Shared): THREE.MeshDepthMaterial {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${VHEAD}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n{\n${MOVE}\n}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uBandOn;
uniform vec4 uBand;
uniform vec3 uEye;
varying vec3 vScP;
float scCutA;
vec2 scOnBack(vec3 p){ return uEye.xy + (p.xy - uEye.xy) * (uEye.z / max(uEye.z - p.z, 1.0)); }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${CUT}`);
  };
  m.customProgramCacheKey = () => 'screen-depth';
  return m;
}

// The front's light past the panel's edge: the rows the screen shows, read only as light spilling round its rim,
// and the backlight's leak. Additive on the clear ground.
export function spillMaterial(u: Shared): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { ...u, uShow: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
    vertexShader: /* glsl */ `
varying vec3 vScP;
void main(){ vScP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
uniform float uScreen, uLeak, uStandby, uShow, uBandOn;
uniform vec4 uBand;
uniform vec3 uEye;
varying vec3 vScP;
float scH(float n){ n = fract(n * 0.1031); n *= n + 33.33; n *= n + n; return fract(n); }
vec3 scRamp(float i){
  vec3 c = mix(${C('ember')}, ${C('flame')}, smoothstep(0.04, 0.42, i));
  c = mix(c, ${C('hot')}, smoothstep(0.42, 0.85, i));
  return mix(c, ${C('pale')}, smoothstep(0.95, 1.4, i));
}
float scUi(vec2 p){
  if (p.y > 86.0) return 0.34 + 0.2 * step(0.55, fract((p.x + 160.0) / 41.0)) * step(p.x, 120.0);
  if (p.x < -128.0) { float r = fract((p.y + 100.0) / 13.0), k = floor((p.y + 100.0) / 13.0); return r > 0.28 && r < 0.72 ? 0.2 + 0.32 * scH(k + 3.0) : 0.04; }
  float r = fract(p.y / 6.5), k = floor(p.y / 6.5);
  return 0.05 + step(0.38, r) * step(r, 0.62) * step(0.25, scH(k + 9.0)) * (0.12 + 0.2 * scH(k));
}
vec2 scOnBack(vec3 p){ return uEye.xy + (p.xy - uEye.xy) * (uEye.z / max(uEye.z - p.z, 1.0)); }
void main(){
  if (uShow < 0.5) discard;
  if (uBandOn > 0.5 && length(scOnBack(vScP) - uBand.xy) > uBand.z) discard;
  vec2 lo = vec2(${f(TRAY.x0 - BEZEL.out)}, ${f(TRAY.y0 - BEZEL.out)}), hi = -lo;
  vec2 q = clamp(vScP.xy, lo, hi);
  float d = length(vScP.xy - q);
  if (d <= 0.0) discard;
  vec2 inward = normalize(q - vScP.xy + 1e-4);
  // Down the sides the rows the screen shows read as light; along the top and the foot only a soft wash.
  float c = 0.0;
  for (int i = 0; i < 4; i++) c += scUi(q + inward * (2.0 + float(i) * 5.0)) * (0.4 - float(i) * 0.08);
  c = (0.2 + 0.18 * mix(0.5, c / 0.4, abs(inward.x))) * uScreen;
  float fade = 1.0 - smoothstep(6.0, 20.0, d);
  float rows = c * exp(-d / 3.0) * 0.8 * fade;
  float leak = (uLeak + uStandby * 0.04) * exp(-d / 1.2) * 0.28 * fade;
  vec3 col = scRamp(0.2 + 1.2 * c) * rows + scRamp(0.6) * leak;
  gl_FragColor = vec4(col, 0.0);
}`,
  });
}

// A soft dark pool under the cut neck, on the line the row's border draws.
export function shadowMaterial(u: Shared): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { ...u, uShadow: { value: 1 } },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
varying vec3 vScP;
void main(){ vScP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
uniform float uShadow, uBandOn;
uniform vec4 uBand;
uniform vec3 uEye;
varying vec3 vScP;
uniform vec2 uC, uR;
vec2 scOnBack(vec3 p){ return uEye.xy + (p.xy - uEye.xy) * (uEye.z / max(uEye.z - p.z, 1.0)); }
void main(){
  if (uBandOn > 0.5 && length(scOnBack(vScP) - uBand.xy) > uBand.z) discard;
  vec2 q = (vScP.xz - uC) / uR;
  float a = exp(-dot(q, q) * 2.2) * 0.62 * uShadow;
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}`,
  });
}
