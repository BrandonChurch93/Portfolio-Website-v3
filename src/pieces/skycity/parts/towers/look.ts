import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { lin } from '../../../../world/surface';
import { KIND } from './shape';

// One material draws every tower: a standard material worked out in the shader, so all of them share one program.
// What each face is made of comes from its kind (./shape.ts), and how a tower's facade is laid out, how many of its
// rooms are lit and how warm they are from the tower's own numbers (look and look2, one per tower).
//
// A facade is bays across and floors up, in units, from where the fragment is on its face: a window is a box filtered
// pulse in both, so a mullion finer than a pixel comes out as its share of the window and never as a stair or a
// sparkle. Whether a room is lit is decided per room, a run of bays on one floor, at the pixel's middle: the room
// changes only across a mullion or a spandrel, which the pulse has already made dark. Once a single bay or floor is
// under two pixels, the pattern gives way to its average.

// The facades, as [bay width in units, mullion as a share of the bay, sill and head as shares of the floor].
export const SKIN = { curtain: 0, ribbon: 1, fins: 2, diagrid: 3, punched: 4 } as const;

// How strong a lit room is at its brightest, and the light thrown up the foot of every tower by the street and onto
// the faces turned to the spire by its lights.
// Nothing on a tower is ever brighter than this, under the glow's threshold, so no tower can bloom: a glint on a
// spike that mirrors one of the room's lights stays a glint.
const PEAK = 1.45;
// How much of the room the towers reflect: a night city's glass shows a dim room.
const ROOM = 0.4;
// How dark the streets are: the share of the room left at the street, and how high, in units, it takes to come
// back in the middle of the city and at its rim, and where the middle gives way to the rim.
// The moon: where it is, as a direction from the city, and how strong its light is.
const MOON = { at: [0.75, 0.55, 0.38], k: 2.2 };
// The back of the city is seen through more night: toward it, a tower gives way to this share of the dark air.
const AIR = { from: 60, to: -520, most: 0.32 };
const OPEN = { low: 0.25, deep: 150, shallow: 50, r0: 300, r1: 600 };
const GAIN = { room: 1.3, lobby: 0.25, street: 0.035, spire: 0.05, band: 0.8, line: 0.7, spill: 0.14, rim: 0.16 };

const HEAD = /* glsl */ `
uniform float uTime;
varying vec3 vFace;
varying float vKind;
varying vec4 vLook;
varying vec4 vLook2;
varying vec3 vCity;
varying vec3 vCityN;
varying vec3 vTan;
float tRough; float tMetal; vec3 tEmit; float tEdge; vec2 tTilt; float tOcc; float tRim; float tSky;

float th(vec3 p){
  uvec3 v = uvec3(ivec3(floor(p))) * uvec3(1597334673u, 3812015801u, 2798796415u);
  uint n = (v.x ^ v.y ^ v.z) * 1597334677u;
  n ^= n >> 16u; n *= 2246822519u; n ^= n >> 13u;
  return float(n) * (1.0 / 4294967295.0);
}
// The share of [x - w/2, x + w/2] that lies in [a, b], the pattern repeating every 1.
float tPulse(float x, float a, float b, float w){
  w = max(w, 1e-4);
  float x0 = x - 0.5 * w, x1 = x + 0.5 * w, s = b - a;
  float f1 = floor(x1) * s + clamp(fract(x1) - a, 0.0, s);
  float f0 = floor(x0) * s + clamp(fract(x0) - a, 0.0, s);
  return clamp((f1 - f0) / w, 0.0, 1.0);
}
vec3 tTone(float t){
  return t < 0.33 ? mix(${lin(hex('ember'))} * 2.2, ${lin(hex('flame'))}, t / 0.33)
       : t < 0.66 ? mix(${lin(hex('flame'))}, ${lin(hex('hot'))}, (t - 0.33) / 0.33)
       : mix(${lin(hex('hot'))}, ${lin(hex('pale'))}, (t - 0.66) / 0.34);
}
`;

const VHEAD = /* glsl */ `
attribute vec3 add;
attribute vec4 face;
attribute vec4 look;
attribute vec4 look2;
varying vec3 vFace;
varying float vKind;
varying vec4 vLook;
varying vec4 vLook2;
varying vec3 vCity;
varying vec3 vCityN;
varying vec3 vTan;
`;

const VERT = /* glsl */ `
#ifdef USE_INSTANCING
  vec3 tSc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  mat4 tIm = instanceMatrix;
#else
  vec3 tSc = vec3(1.0);
  mat4 tIm = mat4(1.0);
#endif
  transformed += add / tSc;
  float tW = face.y * mix(tSc.x, tSc.z, face.z);
  vFace = vec3(face.x * tW, transformed.y * tSc.y, tW);
  vKind = face.w;
  vLook = look;
  vLook2 = look2;
  vCity = (tIm * vec4(transformed, 1.0)).xyz;
  vCityN = normalize(mat3(tIm) * (objectNormal / (tSc * tSc)));
  vec3 tUp = normalize(mat3(viewMatrix) * vec3(0.0, 1.0, 0.0));
  vec3 tT = cross(tUp, transformedNormal);
  vTan = length(tT) > 1e-4 ? normalize(tT) : vec3(0.0);
`;

const COLOR = /* glsl */ `
{
  float kind = mod(vKind, 16.0);
  bool round = vKind > 15.5;
  vec3 alb = vec3(0.04); tRough = 0.6; tMetal = 0.3; tEmit = vec3(0.0); tEdge = 0.0; tTilt = vec2(0.0); tSky = 1.0;
  float seed = floor(vLook.x * 65536.0);
  if (kind < 1.5 || kind > 6.5) {
    // A facade: glass, stone, a lobby, or a plant floor of louvres.
    float skin = kind > 0.5 && kind < 1.5 ? ${SKIN.punched.toFixed(1)} : vLook.y;
    // A roof that slopes is glass without rooms behind it.
    bool sloped = abs(vCityN.y) > 0.45;
    vec4 sk = skin < 0.5 ? vec4(2.2, 0.08, 0.1, 0.92)
            : skin < 1.5 ? vec4(2.2, 0.04, 0.42, 0.93)
            : skin < 2.5 ? vec4(2.2, 0.22, 0.07, 0.95)
            : skin < 3.5 ? vec4(2.2, 0.07, 0.1, 0.92)
            :              vec4(2.2, 0.26, 0.3, 0.8);
    float fh = vLook2.x;
    float lobbyTop = kind > 6.5 && kind < 7.5 ? 1e5 : 1.9 * fh;
    bool lobby = vFace.y < lobbyTop;
    if (lobby) { fh = lobbyTop < 1e4 ? lobbyTop : fh; sk = vec4(3.4, 0.05, 0.06, 0.94); }
    float bays = max(1.0, floor(vFace.z / sk.x + 0.5));
    float bu = vFace.x / max(vFace.z, 1e-3) * bays;
    float fy = vFace.y / fh;
    vec2 fw = vec2(fwidth(bu), fwidth(fy)) * 1.15;
    float floorI = floor(fy), bayI = floor(bu);
    float cov = tPulse(bu, sk.y, 1.0 - sk.y, fw.x) * tPulse(fy, sk.z, sk.w, fw.y);
    float covAvg = (1.0 - 2.0 * sk.y) * (sk.w - sk.z);

    // The frame round the glass: dark steel, a pale spandrel, stone piers or stone.
    vec3 frame = vec3(0.03, 0.029, 0.028); float fRough = 0.34, fMetal = 0.85;
    if (skin > 0.5 && skin < 1.5) { frame = vec3(0.06, 0.058, 0.056); fRough = 0.3; fMetal = 0.6; }
    else if (skin > 1.5 && skin < 2.5) { frame = vec3(0.045, 0.043, 0.041); fRough = 0.5; fMetal = 0.4; }
    else if (skin > 3.5) { frame = vec3(0.05, 0.047, 0.044); fRough = 0.82; fMetal = 0.0; }
    frame *= mix(0.8, 1.2, vLook2.z);
    if (skin > 2.5 && skin < 3.5 && !lobby) {
      // A diagrid: steel crossing the glass on the diagonal, a crossing every four floors.
      float per = 4.0 * fh, d1 = (vFace.x + vFace.y) / per, d2 = (vFace.x - vFace.y) / per;
      float wd = 0.9 / per, fd = fwidth(d1) * 1.15;
      float lines = max(tPulse(d1, 0.0, wd, fd), tPulse(d2, 0.0, wd, fd));
      cov *= 1.0 - lines; covAvg *= 1.0 - 2.0 * wd;
    }

    // A plant floor every so many floors: louvres, never lit.
    float every = 9.0 + floor(th(vec3(seed, 3.0, 0.0)) * 9.0);
    bool plant = kind > 7.5 || (!lobby && floorI > 3.0 && mod(floorI + seed, every) < 1.0);
    // Floors are let in blocks of a few, a tenant to a block: a block is dark, partly lit, mostly lit or lit
    // through, in one light of its own. Rooms are runs of bays on a floor; within a block they follow its state.
    float bSize = 2.0 + floor(th(vec3(seed, 4.0, 0.0)) * 5.0);
    float blockI = floor((floorI + floor(th(vec3(seed, 6.0, 0.0)) * bSize)) / bSize);
    float bh = th(vec3(blockI, seed, 31.0));
    float share = vLook.z;
    float state = bh < 0.55 - 0.4 * share ? 0.02 : bh < 0.9 - 0.15 * share ? 0.12 + 0.6 * share : bh < 0.97 ? 0.8 : 1.0;
    // Each floor of a block is let a little differently: one floor of a lit block may be dark, one of a dark
    // block lit late.
    float fj = th(vec3(floorI, seed, 33.0));
    state = fj < 0.12 ? state * 0.15 : fj > 0.95 ? max(state, 0.7) : clamp(state * mix(0.6, 1.3, fj), 0.0, 1.0);
    float roomW = 3.0 + floor(th(vec3(floorI, seed, 1.0)) * 7.0);
    float roomI = floor((bayI + floor(th(vec3(floorI, seed, 2.0)) * roomW)) / roomW);
    float rh = th(vec3(roomI, floorI, seed + 5.0));
    float lit = step(1.0 - state, rh);
    // Some rooms change now and then, each on its own slow clock.
    float sw = th(vec3(roomI, floorI, seed + 9.0));
    if (sw < 0.12) {
      float slot = floor(uTime / (60.0 + 1500.0 * sw) + rh * 11.0);
      lit = step(1.0 - state, th(vec3(roomI + slot * 7.0, floorI, seed + 11.0)));
    }
    float tone = th(vec3(blockI, seed, 13.0));
    tone = clamp(mix(0.5, 0.9, tone) + (vLook.w - 0.5) * 0.25 + 0.08 * (th(vec3(roomI, floorI, seed + 14.0)) - 0.5), 0.4, 0.92);
    float amp = mix(0.3, 0.85, th(vec3(blockI, seed, 17.0))) * mix(0.75, 1.1, th(vec3(roomI, floorI, seed + 17.0)));
    // Inside the window: brighter under the ceiling, a blind drawn part way in some rooms.
    float inY = clamp((fract(fy) - sk.z) / (sk.w - sk.z), 0.0, 1.0);
    float fine = 1.0 - smoothstep(0.12, 0.3, fw.y);
    float blind = th(vec3(roomI, floorI, seed + 19.0)) < 0.3 ? step(0.62, inY) : 0.0;
    // What is in the room: lit from the ceiling, the floor and what stands on it darker, each bay a little
    // different, a blind drawn part way in some.
    float bayV = 0.78 + 0.34 * th(vec3(bayI, floorI, seed + 29.0));
    float furn = step(inY, 0.24) * (0.35 + 0.4 * th(vec3(bayI, floorI, seed + 37.0)));
    float inside = mix(1.0, (0.68 + 0.45 * inY) * bayV * (1.0 - furn) * (1.0 - 0.6 * blind), fine);
    if (lobby) { lit = 1.0; tone = 0.72 + 0.2 * th(vec3(bayI, seed, 23.0)); amp = ${GAIN.lobby.toFixed(2)}; inside = 1.0; }
    if (plant || sloped) { lit = 0.0; }
    vec3 room = tTone(tone) * amp * lit * inside * ${GAIN.room.toFixed(2)};
    vec3 roomAvg = tTone(mix(0.66, 0.82, vLook.w)) * 0.55 * (0.06 + 0.45 * share) * ${GAIN.room.toFixed(2)};
    if (plant || sloped) roomAvg = vec3(0.0);
    if (lobby) roomAvg = tTone(0.8) * ${GAIN.lobby.toFixed(2)};
    // Past two pixels a bay, each floor's own average, which is what its block lets it be; past two pixels a
    // floor, the tower's average. A face seen at a slant keeps its lit and dark floors.
    float farX = smoothstep(0.5, 1.0, fw.x), farY = smoothstep(0.5, 1.0, fw.y);
    float far = max(farX, farY);
    float covRow = (1.0 - 2.0 * sk.y) * tPulse(fy, sk.z, sk.w, fw.y);
    vec3 row = tTone(tone) * amp * state * 0.85 * ${GAIN.room.toFixed(2)};
    if (lobby) row = tTone(0.8) * ${GAIN.lobby.toFixed(2)};
    if (plant || sloped) row = vec3(0.0);
    // A lit room lights the frame round its own glass a little: the room glows, its mullions against it.
    float sp = ${GAIN.spill.toFixed(2)};
    vec3 glow = mix(mix(room * (cov + sp * (1.0 - cov)), row * (covRow + sp * (1.0 - covRow)), farX), roomAvg * (covAvg + sp * (1.0 - covAvg)), farY);
    float glass = mix(mix(cov, covRow, farX), covAvg, farY);
    vec3 gAlb = vec3(0.075, 0.073, 0.071);
    if (plant) {
      float slat = tPulse(fy * 6.0, 0.0, 0.5, fwidth(fy * 6.0) * 1.15);
      gAlb = vec3(0.03 + 0.03 * slat); glass = 0.0;
      frame = vec3(0.028 + 0.03 * slat, 0.027 + 0.029 * slat, 0.026 + 0.028 * slat); fRough = 0.45; fMetal = 0.75;
    }
    // No two panes of a curtain wall lie quite flat or reflect quite alike: each is tilted a little and its
    // coating differs, so a reflection breaks up pane by pane. Gone once a pane is under two pixels.
    float near = 1.0 - far;
    float pane = th(vec3(bayI, floorI, seed + 41.0));
    gAlb *= mix(1.0, 0.7 + 0.6 * pane, near);
    tTilt = (vec2(th(vec3(bayI, floorI, seed + 43.0)), th(vec3(bayI, floorI, seed + 47.0))) - 0.5) * 0.09 * glass * near;
    if (sloped) { gAlb *= 0.45; frame *= 0.6; tSky = 0.3; }
    // The glass is set back in the wall: its head is in shadow, its sill catches a little light.
    gAlb *= 1.0 - fine * near * smoothstep(0.84, 0.97, inY) * 0.55;
    alb = mix(frame, gAlb, glass);
    glow *= mix(1.0, 1.0 - smoothstep(0.86, 0.98, inY) * 0.45, fine * near);
    tRough = mix(fRough, sloped ? 0.3 : 0.1, glass);
    tMetal = mix(fMetal, 0.9, glass);
    tEmit = glow;
    tEdge = round ? 0.0 : 1.0;
    if (!round && vLook2.z > 0.8) {
      // A line of light up every corner, on a few towers: at least a pixel wide, as bright in all.
      float lw = max(0.3, fwidth(vFace.x) * 1.5);
      float line = (1.0 - smoothstep(0.0, lw, vFace.x)) + (1.0 - smoothstep(0.0, lw, vFace.z - vFace.x));
      tEmit += tTone(0.85) * ${GAIN.line.toFixed(2)} * line * (0.3 / lw) * smoothstep(2.0 * fh, 3.0 * fh, vFace.y);
    }
  } else if (kind < 2.5) {
    alb = vec3(0.026, 0.025, 0.024); tRough = 0.55; tMetal = 0.5;
  } else if (kind < 3.5) {
    alb = vec3(0.42, 0.405, 0.39); tRough = 0.24; tMetal = 1.0;
  } else if (kind < 4.5) {
    // Copper on a tower that carries it, and dark bronze steel on one that does not.
    alb = vLook2.y > 0.5 ? ${lin(hex('copper'))} * 0.8 : vec3(0.07, 0.065, 0.06); tRough = vLook2.y > 0.5 ? 0.42 : 0.45; tMetal = 1.0;
  } else if (kind < 5.5) {
    alb = vec3(0.05); tRough = 0.4; tMetal = 0.2;
    float breathe = 0.8 + 0.2 * sin(uTime * (0.35 + 0.3 * vLook.x) + vLook.x * 40.0);
    tEmit = tTone(0.55 + 0.4 * vLook.w) * ${GAIN.band.toFixed(2)} * breathe;
  } else {
    alb = vec3(0.034, 0.03, 0.022); tRough = 0.9; tMetal = 0.0;
  }
  // Light thrown up from the street, and onto the faces turned toward the spire.
  float upright = 1.0 - abs(vCityN.y);
  vec2 toMid = -normalize(vCity.xz + vec2(1e-3));
  float facing = max(0.0, dot(normalize(vCityN.xz + vec2(1e-4)), toMid)) * upright;
  vec3 thrown = ${lin(hex('hot'))} * (${GAIN.street.toFixed(3)} * exp(-vCity.y / 9.0) * upright
    + ${GAIN.spire.toFixed(3)} * facing * exp(-length(vCity.xz) / 170.0) * smoothstep(0.0, 120.0, vCity.y));
  tEmit += thrown * (0.25 + 2.5 * (alb.r * (1.0 - tMetal) + 0.3 * tMetal));
  // Deep in the streets the room is hidden by the towers round about: what is reflected and what the sky gives
  // falls away toward the street, more in the middle of the city than at its rim.
  float open = smoothstep(${OPEN.r0.toFixed(1)}, ${OPEN.r1.toFixed(1)}, length(vCity.xz));
  tOcc = mix(${OPEN.low.toFixed(2)}, 1.0, smoothstep(0.0, mix(${OPEN.deep.toFixed(1)}, ${OPEN.shallow.toFixed(1)}, open), vCity.y));
  tRim = kind > 4.5 && kind < 6.5 ? 0.0 : smoothstep(0.0, 140.0, vCity.y) * 0.6 + 0.4;
  // The moon of the page's sky, high at its right, gives every tower a lit side and a side in shade, and a sheen
  // on the glass turned to it. It is weaker in the streets, where the towers round about hide it.
  vec3 toMoon = normalize(vec3(${MOON.at.map((v) => v.toFixed(2)).join(', ')}));
  float ndl = max(0.0, dot(vCityN, toMoon));
  float lowFall = mix(0.35, 1.0, smoothstep(0.0, 110.0, vCity.y));
  tEmit += ${lin(hex('pale'))} * ${MOON.k.toFixed(2)} * ndl * lowFall * (alb * (1.0 - tMetal) + 0.12 * tMetal * alb + 0.004);
  diffuseColor.rgb = alb * lowFall;
}
`;

const NORMAL = /* glsl */ `
{
  // A corner catches the light as a rounded one does: the normal turns round it over most of a unit, never less
  // than a pixel and a half.
  float eW = max(0.6, 1.5 * fwidth(vFace.x));
  float eL = 1.0 - smoothstep(0.0, eW, vFace.x), eR = 1.0 - smoothstep(0.0, eW, vFace.z - vFace.x);
  vec3 up = cross(normal, vTan);
  normal = normalize(normal + vTan * ((eR - eL) * 1.1 * tEdge + tTilt.x) + up * tTilt.y);
}
`;

// The glow in the sky behind the city lights the edges that turn away from the eye: a pale line along every ledge
// and up every corner, strongest on the tops, which see most of the sky.
const RIM = /* glsl */ `
{
  float nv = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
  totalEmissiveRadiance += tTone(0.85) * ${GAIN.rim.toFixed(2)} * pow(1.0 - nv, 7.0) * tRim;
}`;

export interface TowerLook {
  material: THREE.MeshStandardMaterial;
  time: { value: number };
}

export function makeLook(): TowerLook {
  const time = { value: 0 };
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.5 });
  m.name = 'towers';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${VHEAD}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${HEAD}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${COLOR}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = tRough;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = tMetal;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${NORMAL}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance = tEmit;\n${RIM}`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= tOcc; reflectedLight.indirectSpecular *= tOcc * tSky * ${ROOM.toFixed(2)}; reflectedLight.directSpecular *= tSky;`)
      .replace('#include <opaque_fragment>', `outgoingLight = mix(outgoingLight, ${lin(hex('bg-2'))}, ${AIR.most.toFixed(2)} * smoothstep(${AIR.from.toFixed(1)}, ${AIR.to.toFixed(1)}, vCity.z));\n{ float pk = max(outgoingLight.r, max(outgoingLight.g, outgoingLight.b)); outgoingLight *= min(1.0, ${PEAK.toFixed(2)} / max(pk, 1e-4)); }\n#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'skycity-towers';
  return { material: m, time };
}

export { KIND };
