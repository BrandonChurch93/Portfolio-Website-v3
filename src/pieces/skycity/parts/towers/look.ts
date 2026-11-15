import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { lin } from '../../../../world/surface';
import { PLANET } from '../../layout';
import { BAY, K } from './shape';

// One material draws every tower: a standard material worked out in the shader, so the whole city is one program.
// What a face is made of rides on its vertices (its kind, ./shape.ts), and each tower's own numbers (its skin, how
// many of its rooms are lit, its metals) are read from a small table by the tower's index.
//
// A facade is bays across and floors up: a window is a box filtered pulse in both, so a mullion finer than a pixel
// comes out as its share of the window and never as a stair or a sparkle. Whether a room is lit is decided per room,
// a run of bays on one floor, from the tower's tenants, a block of floors at a time. Close up, behind each window is
// a room worked out from the eye: a floor, a back wall, side walls, a ceiling with a light in it, and what stands on
// the floor, different from room to room. Once a bay or a floor is under two pixels, the pattern gives way to its
// average.

// The skins of a glass tower.
export const SKIN = { curtain: 0, ribbon: 1, fins: 2 } as const;
// What frames the glass of a glass tower.
export const FRAME = { steel: 0, stone: 1, metal: 2 } as const;
// The metals, as the table names them.
export const METAL = { gold: 0, bronze: 1, copper: 2 } as const;

// Nothing on a tower is ever brighter than this, under the glow's threshold, so no tower can bloom.
const PEAK = 1.45;
// How much of the room the glass reflects, and the metals.
const ROOM = { glass: 0.9, metal: 1.9 };
// How much of the cursor's light the glass gives back: enough to slide across it pane by pane, not so much that
// a pane it catches reads as a lit room.
const GLASS_SPEC = 0.22;
// The back of the city is seen through more night: toward it, a tower gives way to this share of the dark air.
const AIR = { from: 120, to: -300, most: 0.42 };
const OPEN = { low: 0.3, deep: 90, shallow: 30, r0: 300, r1: 600 };
const GAIN = { room: 1.25, lobby: 0.15, street: 0.035, spire: 0.05, light: 0.85, spill: 0.12, rim: 0.08, pod: 0.9 };
// The dark where one mass stands on another: how deep, and over how many units it comes back.
const MEET = { k: 0.6, over: 2.6 };

const gold = new THREE.Color(hex('copper-light')).lerp(new THREE.Color(hex('hot')), 0.85).getHex();
const f2 = (x: number) => x.toFixed(2);

const HEAD = /* glsl */ `
uniform float uTime;
varying vec3 vFace;
varying float vKind;
varying vec4 vLook;
varying vec4 vLook2;
varying vec3 vCity;
varying vec3 vCityN;
varying vec3 vTan;
varying float vFoot;
float tRough; float tMetal; vec3 tEmit; vec2 tTilt; float tOcc; float tRim; float tSky; float tRoom; float tMeet; float tSpec;

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
// A metal by the table's number: its colour and how rough it is.
vec4 tMetalOf(float m){
  return m < 0.5 ? vec4(${lin(gold)}, 0.07) : m < 1.5 ? vec4(${lin(hex('bronze'))} * 0.5, 0.36) : vec4(${lin(hex('copper'))} * 0.62, 0.42);
}
// The room behind a window: where in the opening the eye looks in (0 to 1 across and up), the eye's ray in the
// face's frame (across, up, into the wall), the room's size in units, and two numbers of the room's own. What is seen
// there, as a share of the room's light.
float tInside(vec2 w, vec3 rv, vec3 S, float h1, float h2){
  rv.z = max(rv.z, 0.05);
  vec3 p = vec3(w * S.xy, 0.0);
  float tx = (rv.x > 0.0 ? S.x - p.x : p.x) / max(abs(rv.x), 1e-4);
  float ty = (rv.y > 0.0 ? S.y - p.y : p.y) / max(abs(rv.y), 1e-4);
  float tz = S.z / rv.z;
  float t = min(tx, min(ty, tz));
  vec3 q = p + rv * t;
  float v;
  if (tz <= tx && tz <= ty) {
    v = 0.85 + 0.3 * h1;
    // A picture or a screen on the back wall in some rooms, a shelf in others.
    vec2 b = q.xy / S.xy;
    if (h2 > 0.6) v *= mix(1.0, 0.45, step(abs(b.x - (0.3 + 0.4 * h1)), 0.14) * step(abs(b.y - 0.55), 0.13));
    else if (h2 < 0.25) v *= mix(1.0, 0.55, step(abs(b.y - 0.42), 0.03));
  } else if (ty < tx) {
    if (rv.y > 0.0) {
      vec2 c = vec2(q.x / S.x - 0.5, q.z / S.z - 0.42);
      v = 1.0 + 0.9 * (1.0 - smoothstep(0.1, 0.16, abs(c.y))) * (1.0 - smoothstep(0.3, 0.38, abs(c.x)));
    } else v = 0.3 + 0.15 * h2;
  } else v = 0.65 + 0.15 * h1;
  // What stands in the room: a desk, a sofa, a counter, partway in.
  float zf = S.z * (0.35 + 0.3 * h2), tf = zf / rv.z;
  vec3 f = p + rv * tf;
  if (h2 > 0.35 && tf < t && f.y < S.y * (0.22 + 0.12 * h1) && abs(f.x / S.x - 0.25 - 0.5 * h1) < 0.08 + 0.12 * h2) v = 0.12;
  // Toward the window, the room is lit less by its ceiling.
  return v * mix(0.8, 1.05, clamp(t * rv.z / S.z, 0.0, 1.0));
}
`;

const VHEAD = /* glsl */ `
attribute vec4 face;
attribute float foot;
attribute vec3 plan;
uniform sampler2D uTowers;
varying vec3 vFace;
varying float vKind;
varying vec4 vLook;
varying vec4 vLook2;
varying vec3 vCity;
varying vec3 vCityN;
varying vec3 vTan;
varying float vFoot;
`;

const VERT = /* glsl */ `
  int tId = int(face.w + 0.5);
  vLook = texelFetch(uTowers, ivec2(tId * 2, 0), 0);
  vLook2 = texelFetch(uTowers, ivec2(tId * 2 + 1, 0), 0);
  vFace = vec3(face.x, plan.y, face.y);
  vKind = face.z;
  vCity = plan;
  vFoot = foot;
  // The tower stands straight out from the dome: its own upright, and its normal as it was before it was seated.
  float tFar = length(plan.xz), tA = tFar / ${PLANET.r.toFixed(1)};
  vec3 tOwnUp = tFar > 1e-3 ? vec3(sin(tA) * plan.x / tFar, cos(tA), sin(tA) * plan.z / tFar) : vec3(0.0, 1.0, 0.0);
  vec3 tAx = tFar > 1e-3 ? vec3(plan.z / tFar, 0.0, -plan.x / tFar) : vec3(1.0, 0.0, 0.0);
  float tc = cos(-tA), ts = sin(-tA);
  vCityN = normal * tc + cross(tAx, normal) * ts + tAx * dot(tAx, normal) * (1.0 - tc);
  vec3 tUp = normalize(normalMatrix * tOwnUp);
  vec3 tT = cross(tUp, transformedNormal);
  vTan = length(tT) > 1e-4 ? normalize(tT) : vec3(0.0);
`;

const COLOR = /* glsl */ `
{
  float kind = floor(vKind + 0.5);
  vec3 alb = vec3(0.04); tRough = 0.6; tMetal = 0.3; tEmit = vec3(0.0); tTilt = vec2(0.0); tSky = 1.0; tRoom = ${f2(ROOM.glass)}; tSpec = 1.0;
  float seed = floor(vLook.x * 65536.0);
  vec4 accentM = tMetalOf(vLook2.x), cladM = tMetalOf(vLook2.y);
  vec3 stoneC = vec3(0.075, 0.066, 0.054) * mix(0.85, 1.12, th(vec3(seed, 51.0, 0.0)));
  float upright = 1.0 - abs(vCityN.y);
  bool isFacade = kind == ${K.glass}.0 || kind == ${K.stone}.0 || kind == ${K.clad}.0 || kind == ${K.pod}.0;
  if (isFacade && vFace.z > 0.5) {
    // [mullion as a share of the bay on each side, sill, head]: glass in its skin, stone's tall narrow windows,
    // clad metal's narrower slots, a pod's bands.
    float skin = vLook.y;
    vec3 sk = kind == ${K.stone}.0 ? vec3(0.34, 0.04, 0.97)
            : kind == ${K.clad}.0 ? vec3(0.37, 0.1, 0.9)
            : kind == ${K.pod}.0 ? vec3(0.05, 0.3, 0.78)
            : skin < 0.5 ? vec3(0.015, 0.05, 0.965) : skin < 1.5 ? vec3(0.02, 0.38, 0.94) : vec3(0.19, 0.05, 0.965);
    float bayW = kind == ${K.stone}.0 ? ${f2(BAY.stone)} : kind == ${K.clad}.0 ? ${f2(BAY.clad)} : kind == ${K.pod}.0 ? ${f2(BAY.pod)} : ${f2(BAY.glass)};
    float fh = vLook2.w;
    bool lobby = vFoot < 0.5 && vFace.y < 1.9 * fh && kind != ${K.pod}.0;
    if (lobby) sk = vec3(0.05, 0.06, 0.94);
    float bu = vFace.x * vFace.z;
    float fy = lobby ? vFace.y / (1.9 * fh) : vFace.y / fh;
    vec2 fw = vec2(fwidth(bu), fwidth(fy)) * 1.15;
    float floorI = floor(fy), bayI = floor(bu);
    float cov = tPulse(bu, sk.x, 1.0 - sk.x, fw.x) * tPulse(fy, sk.y, sk.z, fw.y);
    float covAvg = (1.0 - 2.0 * sk.x) * (sk.z - sk.y);

    // The frame round the glass.
    vec3 frame = vec3(0.03, 0.029, 0.028); float fRough = 0.34, fMetal = 0.85;
    if (kind == ${K.stone}.0) { frame = stoneC; fRough = 0.72; fMetal = 0.0; }
    else if (kind == ${K.clad}.0) { frame = cladM.rgb; fRough = cladM.a + 0.03; fMetal = 1.0; }
    else if (kind == ${K.pod}.0) { frame = vec3(0.035, 0.033, 0.03); fRough = 0.3; fMetal = 0.8; }
    else if (vLook2.z > 1.5) { frame = accentM.rgb * 0.85; fRough = accentM.a + 0.04; fMetal = 1.0; }
    else if (vLook2.z > 0.5) { frame = stoneC; fRough = 0.7; fMetal = 0.0; }
    bool metalFrame = fMetal > 0.95;

    // Floors are let in blocks of a few, a tenant to a block: a block is dark, partly lit, mostly lit or lit
    // through. Rooms are runs of bays on a floor; within a block they follow its state.
    float bSize = 2.0 + floor(th(vec3(seed, 4.0, 0.0)) * 5.0);
    float blockI = floor((floorI + floor(th(vec3(seed, 6.0, 0.0)) * bSize)) / bSize);
    float bh = th(vec3(blockI, seed, 31.0));
    float share = kind == ${K.pod}.0 ? 0.75 : vLook.z;
    float state = bh < 0.7 - 0.45 * share ? 0.0 : bh < 0.86 - 0.2 * share ? 0.15 + 0.3 * share : bh < 0.97 ? 0.8 : 1.0;
    float fj = th(vec3(floorI, seed, 33.0));
    // Floors are lit or dark more than rooms are: a floor of a dark block may be lit through, one of a lit block dark.
    state = fj < 0.2 ? state * 0.1 : fj > 0.93 ? max(state, 0.85) : clamp(state * mix(0.8, 1.2, fj), 0.0, 1.0);
    float roomW = 2.0 + floor(th(vec3(floorI, seed, 1.0)) * 7.0);
    float roomO = floor(th(vec3(floorI, seed, 2.0)) * roomW), roomI = floor((bayI + roomO) / roomW);
    float rh = th(vec3(roomI, floorI, seed + 5.0));
    float lit = step(1.0 - state, rh);
    float sw = th(vec3(roomI, floorI, seed + 9.0));
    if (sw < 0.12) {
      float slot = floor(uTime / (60.0 + 1500.0 * sw) + rh * 11.0);
      lit = step(1.0 - state, th(vec3(roomI + slot * 7.0, floorI, seed + 11.0)));
    }
    float tone = th(vec3(blockI, seed, 13.0));
    tone = clamp(mix(0.3, 0.66, tone) + (vLook.w - 0.5) * 0.2 + 0.3 * (th(vec3(roomI, floorI, seed + 14.0)) - 0.5), 0.22, 0.8);
    float amp = mix(0.3, 0.75, th(vec3(blockI, seed, 17.0))) * mix(0.6, 1.3, th(vec3(roomI, floorI, seed + 17.0)));
    if (kind == ${K.pod}.0) amp *= ${f2(GAIN.pod)};

    // The room behind the glass, seen from the eye, while a bay is wide enough to see into.
    float far = max(smoothstep(0.35, 0.8, fw.x), smoothstep(0.35, 0.8, fw.y));
    float near = 1.0 - far;
    // At a middle distance, where a room cannot be seen into, a lit window is still brighter under its ceiling
    // than at its sill, and no two rooms are quite the same light.
    float inY0 = clamp((fract(fy) - sk.y) / (sk.z - sk.y), 0.0, 1.0), mid = 1.0 - smoothstep(0.25, 0.55, fw.y);
    float inside = mix(1.0, mix(0.62, 1.25, inY0 * inY0) * mix(0.8, 1.15, th(vec3(roomI, floorI, seed + 53.0))), mid);
    if (near > 0.0 && !lobby) {
      vec3 N = normalize(vNormal), T = vTan, U = cross(N, T);
      vec3 rd = -normalize(vViewPosition);
      vec3 rv = vec3(dot(rd, T), dot(rd, U), -dot(rd, N));
      float ow = (1.0 - 2.0 * sk.x), oh = (sk.z - sk.y);
      // A room runs across its bays: the mullions only stand in front of it.
      float k = bayI + roomO - roomI * roomW;
      vec2 w = vec2((k + fract(bu)) / roomW, (fract(fy) - sk.y) / oh);
      vec3 S = vec3(bayW * roomW, fh * oh, fh * 1.7);
      inside = mix(inside, tInside(clamp(w, 0.0, 1.0), rv, S, th(vec3(roomI, floorI, seed + 29.0)), th(vec3(roomI, floorI, seed + 37.0))), near);
    }
    if (lobby) { lit = step(0.35, th(vec3(bayI, seed, 23.0))); tone = 0.45 + 0.2 * th(vec3(bayI, seed, 24.0)); amp = ${f2(GAIN.lobby)}; inside = 1.0; }
    // Glass that faces the sky has no rooms seen behind it.
    bool sloped = abs(vCityN.y) > 0.5;
    if (sloped) lit = 0.0;
    vec3 room = tTone(tone) * amp * lit * inside * ${f2(GAIN.room)};
    vec3 roomAvg = tTone(mix(0.45, 0.65, vLook.w)) * 0.55 * (0.06 + 0.45 * share) * ${f2(GAIN.room)};
    if (lobby) roomAvg = tTone(0.55) * ${f2(GAIN.lobby)} * 0.65;
    float farX = smoothstep(0.5, 1.0, fw.x), farY = smoothstep(0.5, 1.0, fw.y);
    float covRow = (1.0 - 2.0 * sk.x) * tPulse(fy, sk.y, sk.z, fw.y);
    vec3 row = tTone(tone) * amp * state * 0.85 * ${f2(GAIN.room)};
    if (lobby) row = tTone(0.55) * ${f2(GAIN.lobby)} * 0.65;
    if (sloped) { row = vec3(0.0); roomAvg = vec3(0.0); }
    float sp = ${f2(GAIN.spill)} * (metalFrame ? 0.3 : 1.0);
    vec3 glow = mix(mix(room * (cov + sp * (1.0 - cov)), row * (covRow + sp * (1.0 - covRow)), farX), roomAvg * (covAvg + sp * (1.0 - covAvg)), farY);
    float glass = mix(mix(cov, covRow, farX), covAvg, farY);
    vec3 gAlb = vec3(0.07, 0.068, 0.066);
    // No two panes lie quite flat: each is tilted a little and its coating differs, so a reflection breaks up
    // pane by pane. Gone once a pane is under two pixels.
    float pane = th(vec3(bayI, floorI, seed + 41.0));
    gAlb *= mix(1.0, 0.7 + 0.6 * pane, near);
    tTilt = (vec2(th(vec3(bayI, floorI, seed + 43.0)), th(vec3(bayI, floorI, seed + 47.0))) - 0.5) * 0.08 * glass * near;
    // Metal cladding is fluted: four flutes to a bay, so the cursor's light runs up it in long lines. Finer than
    // a pixel, the flutes are left out and the metal is a little rougher instead.
    if (kind == ${K.clad}.0) {
      float fu = bu * 4.0, fl = 1.0 - smoothstep(0.2, 0.45, fwidth(fu));
      tTilt.x += sin(fract(fu) * 6.2832) * 0.45 * fl * (1.0 - glass);
      fRough += 0.1 * (1.0 - fl);
    }
    if (sloped) { gAlb *= 0.5; tSky = 0.5; }
    // The glass is set back in the wall: its head is in shadow.
    float inY = clamp((fract(fy) - sk.y) / (sk.z - sk.y), 0.0, 1.0);
    gAlb *= 1.0 - near * smoothstep(0.84, 0.97, inY) * 0.5;
    alb = mix(frame, gAlb, glass);
    tRough = mix(fRough, sloped ? 0.25 : 0.08, glass);
    tMetal = mix(fMetal, 0.9, glass);
    tRoom = mix(metalFrame ? ${f2(ROOM.metal)} : ${f2(ROOM.glass)}, ${f2(ROOM.glass)}, glass);
   
    tSpec = mix(1.0, ${f2(GLASS_SPEC)}, glass);
    tEmit = glow;
  } else if (kind == ${K.plain}.0 || (kind == ${K.stone}.0)) {
    // Solid stone, laid in courses, each block a little different.
    // Blocks two units high and about four long, each course set over the joints of the one below, each block a
    // little different in tone. Finer than a pixel, the joints and the blocks give way to the stone's average.
    float cy = vFace.y / 2.2, cfw = fwidth(cy) * 1.15;
    float cx = vFace.x * vFace.z / 4.0 + 0.5 * mod(floor(cy), 2.0), cxw = fwidth(cx) * 1.15;
    float fineB = 1.0 - smoothstep(0.25, 0.55, max(cfw, cxw));
    float joint = max(tPulse(cy, 0.0, 0.06, cfw), vFace.z > 0.5 ? tPulse(cx, 0.0, 0.05, cxw) : 0.0) * fineB;
    float blk = th(vec3(floor(cx), floor(cy), seed + 61.0));
    // Faint streaks where rain has run down it, a little darker toward the foot.
    float sx = vFace.x * vFace.z * 1.4, sfw = fwidth(sx);
    float streak = th(vec3(floor(sx), seed, 81.0)) * (1.0 - smoothstep(0.3, 0.7, sfw)) * (0.6 + 0.4 * th(vec3(floor(sx), floor(vFace.y / 9.0), seed + 83.0)));
    alb = stoneC * (1.0 - 0.16 * joint) * mix(1.0, 0.92 + 0.16 * blk, fineB) * (1.0 - 0.12 * streak);
    tRough = 0.78; tMetal = 0.0; tRoom = 0.6;
  } else if (kind == ${K.dark}.0) {
    alb = vec3(0.085, 0.082, 0.078); tRough = 0.45; tMetal = 0.6; tRoom = 0.8;
  } else if (kind == ${K.gold}.0 || kind == ${K.bronze}.0 || kind == ${K.copper}.0 || kind == ${K.accent}.0) {
    vec4 m = kind == ${K.accent}.0 ? accentM : tMetalOf(kind == ${K.gold}.0 ? 0.0 : kind == ${K.bronze}.0 ? 1.0 : 2.0);
    alb = m.rgb; tRough = m.a; tMetal = 1.0; tRoom = ${f2(ROOM.metal)};
  } else if (kind == ${K.light}.0) {
    alb = vec3(0.05); tRough = 0.4; tMetal = 0.2;
    float breathe = 0.85 + 0.15 * sin(uTime * (0.3 + 0.25 * vLook.x) + vLook.x * 40.0);
    tEmit = tTone(0.6 + 0.3 * vLook.w) * ${f2(GAIN.light)} * breathe;
  } else if (kind == ${K.lobby}.0) {
    alb = vec3(0.06); tRough = 0.1; tMetal = 0.9;
    tEmit = tTone(0.55) * ${f2(GAIN.lobby)} * 1.2;
  } else if (kind == ${K.louvre}.0) {
    float slat = tPulse(vFace.y * 1.6, 0.0, 0.5, fwidth(vFace.y * 1.6) * 1.15);
    alb = vec3(0.03 + 0.03 * slat); tRough = 0.45; tMetal = 0.75;
  } else if (kind == ${K.glyph}.0) {
    // A column of marks, one to a square cell, each chosen by its cell: a ring, a disc, a staff, two bars, a
    // pyramid. Under three pixels a cell, the marks give way to their share of gold.
    float wdt = max(vFace.z, 1.0), u = vFace.x * wdt, cellH = clamp(wdt * 0.8, 1.6, 3.2);
    vec2 q = vec2(u, vFace.y - vFoot) / cellH;
    float row = floor(q.y);
    vec2 c = vec2((u - 0.5 * wdt) / cellH, fract(q.y) - 0.5);
    float g = th(vec3(row, seed, 71.0)), d;
    if (g < 0.2) d = abs(length(c) - 0.24) - 0.06;
    else if (g < 0.4) d = length(c) - 0.2;
    else if (g < 0.6) d = max(abs(c.x) - 0.07, abs(c.y) - 0.34);
    else if (g < 0.8) d = max(abs(abs(c.y) - 0.14) - 0.06, abs(c.x) - 0.26);
    else d = max(abs(c.x) * 0.85 + c.y * 0.5 - 0.17, -c.y - 0.24);
    d = min(d, (min(u, wdt - u) - 0.22) / cellH);
    float px = max(fwidth(q.y), fwidth(q.x));
    float mark = 1.0 - smoothstep(-px, px, d);
    mark = mix(mark, 0.3, smoothstep(0.1, 0.3, px));
    alb = mix(${lin(hex('bronze-deep'))} * 0.5, ${lin(gold)}, mark); tRough = mix(0.45, 0.14, mark); tMetal = 1.0; tRoom = ${f2(ROOM.metal)};
  } else if (kind == ${K.sky}.0) {
    alb = vec3(0.05, 0.048, 0.046); tRough = 0.12; tMetal = 0.9; tRoom = 0.8;
  } else {
    alb = vec3(0.045, 0.043, 0.04); tRough = 0.82; tMetal = 0.0;
  }
  // Light thrown up from the street, and onto the faces turned toward the spire.
  vec2 toMid = -normalize(vCity.xz + vec2(1e-3));
  float facing = max(0.0, dot(normalize(vCityN.xz + vec2(1e-4)), toMid)) * upright;
  vec3 thrown = ${lin(hex('hot'))} * (${GAIN.street.toFixed(3)} * exp(-vCity.y / 9.0) * upright
    + ${GAIN.spire.toFixed(3)} * facing * exp(-length(vCity.xz) / 170.0) * smoothstep(0.0, 70.0, vCity.y));
  tEmit += thrown * (0.25 + 2.5 * (alb.r * (1.0 - tMetal) + 0.3 * tMetal));
  float open = smoothstep(${OPEN.r0.toFixed(1)}, ${OPEN.r1.toFixed(1)}, length(vCity.xz));
  tOcc = mix(${OPEN.low.toFixed(2)}, 1.0, smoothstep(0.0, mix(${OPEN.deep.toFixed(1)}, ${OPEN.shallow.toFixed(1)}, open), vCity.y));
  // Where one mass stands on another, or on the street, the foot of the wall is in the dark of the corner.
  tMeet = 1.0 - ${f2(MEET.k)} * exp(-max(0.0, vCity.y - vFoot) / ${f2(MEET.over)}) * upright;
  tOcc *= tMeet;
  tRim = kind == ${K.light}.0 || kind == ${K.lobby}.0 ? 0.0 : smoothstep(0.0, 80.0, vCity.y) * 0.6 + 0.4;
  // Deep in the streets less of any light reaches a wall.
  float lowFall = mix(0.45, 1.0, smoothstep(0.0, 60.0, vCity.y)) * tMeet;
  diffuseColor.rgb = alb * lowFall;
}
`;

const NORMAL = /* glsl */ `
{
  vec3 up = cross(normal, vTan);
  normal = normalize(normal + vTan * tTilt.x + up * tTilt.y);
}
`;

// The glow the page draws in the sky behind the world shows on the edges that turn away from the eye, as a
// reflection of it, faint.
const EMIT = /* glsl */ `
totalEmissiveRadiance = tEmit;
{
  float nv = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
  totalEmissiveRadiance += tTone(0.85) * ${f2(GAIN.rim)} * pow(1.0 - nv, 7.0) * tRim * tMeet;
}
`;

export interface TowerLook {
  material: THREE.MeshStandardMaterial;
  time: { value: number };
}

// table holds two texels for each tower: [seed, skin, the share of it lit, its light's warmth] and [its accent
// metal, its clad metal, what frames its glass, its floor height].
export function makeLook(table: THREE.DataTexture): TowerLook {
  const time = { value: 0 };
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.5 });
  m.name = 'towers';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time;
    sh.uniforms.uTowers = { value: table };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${VHEAD}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${HEAD}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${COLOR}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = tRough;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = tMetal;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${NORMAL}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${EMIT}`)
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= tOcc; reflectedLight.indirectSpecular *= tOcc * tSky * tRoom; reflectedLight.directSpecular *= tSky * tSpec; reflectedLight.directDiffuse *= tMeet;')
      .replace('#include <opaque_fragment>', `outgoingLight = mix(outgoingLight, ${lin(hex('bg-2'))}, ${AIR.most.toFixed(2)} * smoothstep(${AIR.from.toFixed(1)}, ${AIR.to.toFixed(1)}, vCity.z));\n{ float pk = max(outgoingLight.r, max(outgoingLight.g, outgoingLight.b)); outgoingLight *= min(1.0, ${PEAK.toFixed(2)} / max(pk, 1e-4)); }\n#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'skycity-towers-2';
  return { material: m, time };
}

export function towerTable(rows: [number, number, number, number, number, number, number, number][]): THREE.DataTexture {
  const a = new Float32Array(rows.length * 8);
  rows.forEach((r, i) => a.set(r, i * 8));
  const t = new THREE.DataTexture(a, rows.length * 2, 1, THREE.RGBAFormat, THREE.FloatType);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}
