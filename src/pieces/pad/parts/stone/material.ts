import * as THREE from 'three';
import { hex, type PaletteName } from '../../../../config/palette';
import type { Carving } from './bake';
import { DEEP, LANDS, LEVEL, LIP, MARCH, OVER, R, RINGS, TOP } from './form';

// The stone's top, drawn on a shell that encloses its carving: each pixel walks down through the carving's heights
// from where it meets the shell to the face it lands on, and is lit there, so every wall, channel and figure stands
// where it would and hides what is behind it. The cursor's light is walked toward again from that face, for the
// shadows the carving throws into its own channels, and the stage's shadow map is read at that face and not at the
// shell. The depth written is that face's, so what stands on the stone meets it where it is.
// It is lit as the Work stones are: raised tops and edges rubbed to bright copper, a dark patina in the channels, the
// room and the cursor reflected. The stream's light runs in what is cut into it, ring by ring from the rim in.

const f = (x: number) => x.toFixed(5);
const col = (n: PaletteName) => new THREE.Color(hex(n));

export const U = {
  uT0: { value: null as THREE.Texture | null },
  uT1: { value: null as THREE.Texture | null },
  // The camera and the cursor's light, in the stone's units.
  uCam: { value: new THREE.Vector3(0, 500, 3000) },
  uLamp: { value: new THREE.Vector3(0, 400, 700) },
  // How far it is lit, 0 to 1, as the pad's fill.
  uFill: { value: 0 },
  // The stream where it lands: how much it is on, the seconds since its strike, and how alive the full stone is.
  uOn: { value: 0 },
  uSince: { value: 60 },
  uLive: { value: 0 },
  uTime: { value: 0 },
  uHeat: { value: 0 },
  uSteady: { value: 0 },
  uSpread: { value: 0 },
  uFront: { value: 0 },
  // How much of the engine's heat is left on the stone as the rocket climbs away. It is taken off what the heat
  // added, after the caps: inside them the stone held its full heat long after the lift.
  uLeave: { value: 1 },
  // For looking at one thing alone: 0 the stone, 1 the light in its cuts, 2 how shut in each place is, 3 how cut.
  uShow: { value: 0 },
  uEmber: { value: col('ember') },
  uFlame: { value: col('flame') },
  uHot: { value: col('hot') },
  uPale: { value: col('pale') },
  uCopper: { value: col('copper') },
  uCopperLight: { value: col('copper-light') },
};

// The look, in one place. How steep the carving's walls are drawn, against the heights they truly have here.
export const LOOK = {
  steep: 0.85,
  // The brightest the cursor's light is reflected, so a glint on polished copper never blooms.
  glint: 1.4,
  // The glint itself: how sharp and how bright.
  sharp: 160,
  spark: 8,
  // How strongly the room is reflected, against the stage's level, where the copper is tarnished and where it is
  // rubbed bright. The stage sets the level of every material that reflects its room and not the material, so the
  // stone scales what it reflects itself.
  room: [0.1, 0.7],
  // The brightest the room is reflected.
  sheen: 0.8,
  // How rough the copper is where it is neither rubbed nor tarnished: satin, as the Work stones are.
  satin: 0.38,
  // The light in the cuts: how bright, how wide the front that runs in across a ring, and the flash at the strike.
  glow: 1.9,
  front: 0.018,
  flash: 2.2,
  // The most light a place in the cuts takes: hot going to pale, never past it.
  most: 1.15,
  // The long light low behind the stone that the room is: how high it stands, in radians, and how bright.
  strip: [0.2, 0.22],
  // How much the stream's light, once in the cuts, warms the room's sheen on the tops.
  warm: 0.7,
  // How much of the cursor's light the stone takes, tarnished and rubbed bright.
  lamp: [0.6, 4.5],
  // Lit by the room alone the unlit stone stayed a bright copper and the landing barely read.
  dark: 0.05,
  flare: [0.75, 4.0],
  heat: [0.65, 80, 0.9],
  // Pale all over, the cuts under the table ran together into one sunburst.
  heatTop: [1.25, 0.72, 60],
  fire: [1.0, 2.4],
  // The fire lies on the stone, so it lights what faces it and hardly the flat tops.
  low: [6, 1.6, 1.6],
  hold: [150, 190],
  // Past the table's edges the heat is in the cuts alone: on the tops there it was a soft orange wash.
  glowTop: [3.4, 1.0, 150, 3.7],
  // Lit as they were, the tops and the cuts under the table were one peach wash.
  shade: 0.85,
  engine: 0.22,
  tops: 0.07,
};

const HEAD = /* glsl */ `
varying vec3 vLocal;
uniform sampler2D uT0, uT1;
uniform vec3 uCam, uLamp;
uniform float uFill, uOn, uSince, uLive, uTime, uShow, uHeat, uSteady, uSpread, uFront, uLeave;
uniform vec3 uEmber, uFlame, uHot, uPale, uCopper, uCopperLight;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 modelMatrix;
uniform mat3 normalMatrix;
#if NUM_SPOT_LIGHT_COORDS > 0
uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
#endif
const float S_R = ${f(R)}, S_DEEP = ${f(DEEP)}, S_HIGH = ${f(LEVEL.high)}, S_TALL = ${f(LEVEL.tall)}, S_FILL = ${f(LEVEL.fill * 0.5)};
const float S_TOP = ${f(TOP)}, S_LIP = ${f(LIP)};
const float S_FLOOR = ${f(LEVEL.floor)}, S_GROUND = ${f(LEVEL.ground)};
// How much of what stands over the high tops is kept, at a share of the radius.
float sOver(float rho){ return mix(${f(OVER.middle)}, ${f(OVER.rays)}, smoothstep(${f(OVER.from)}, ${f(OVER.to)}, rho)); }
const float S_TAU = 6.2831853;
vec2 sUv(vec2 xz){ vec2 r = xz / S_R; return vec2(r.x, -r.y) * S_FILL + 0.5; }
// How high the carving stands at a place, in units. Off the stone it is nothing at all.
float sHeight(vec2 xz){
  if (dot(xz, xz) >= S_R * S_R) return -1e4;
  float h = textureLod(uT0, sUv(xz), 0.0).b * S_TALL - S_HIGH;
  return h * S_DEEP * (h > 0.0 ? sOver(length(xz) / S_R) : 1.0);
}
float sHash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float sNoise(vec2 p){ vec2 i = floor(p), u = fract(p); u = u * u * (3.0 - 2.0 * u);
  return mix(mix(sHash(i), sHash(i + vec2(1.0, 0.0)), u.x), mix(sHash(i + vec2(0.0, 1.0)), sHash(i + vec2(1.0, 1.0)), u.x), u.y); }
vec3 sRamp(float a){
  vec3 c = uEmber * clamp(a / 0.11, 0.0, 1.0);
  c = mix(c, uFlame, smoothstep(0.07, 0.42, a));
  c = mix(c, uHot, smoothstep(0.34, 0.85, a));
  c = mix(c, uPale, smoothstep(0.7, 1.6, a));
  return c;
}
// How far the rings are lit at a place, from the rim in. Each ring takes an equal share of the fill: its light runs in
// from its outer edge over the first part of that share and then holds, so the rings come on one after another. The
// rim's light runs round from where the stream lands, both ways.
const float S_RINGS[6] = float[6](${RINGS.map(f).join(', ')});
float sFlare(float q){ return ${f(LOOK.flare[0])} * smoothstep(0.55, 1.0, q) * exp(-max(q - 1.0, 0.0) * ${f(LOOK.flare[1])}); }
float sLit(float rho, float th, out float edge, out float flare){
  flare = 0.0;
  if (uFill <= 0.0){ edge = 0.0; return 0.0; }
  float n = 5.0, k = uFill * n;
  edge = 0.0;
  if (rho >= S_RINGS[1]){
    float q = k / 0.75, p = clamp(q, 0.0, 1.0);
    float a = abs(mod(th - ${f(LANDS.angle)} + 3.14159265, S_TAU) - 3.14159265) / 3.14159265;
    float run = p * 1.08 - a;
    edge = exp(-run * run / 0.002) * step(0.0, run) * (1.0 - p * p);
    flare = sFlare(q);
    return smoothstep(0.0, 0.05, run);
  }
  float lit = 0.0;
  for (int i = 1; i < 5; i++){
    float hi = S_RINGS[i], lo = S_RINGS[i + 1];
    if (rho < lo) continue;
    float q = (k - float(i)) / 0.7, p = clamp(q, 0.0, 1.0);
    flare = sFlare(q) * (1.0 - smoothstep(0.985, 1.0, uFill));
    p = 1.0 - (1.0 - p) * (1.0 - p);
    float front = mix(hi + 2.5 * ${f(LOOK.front)}, lo, p);
    float w = ${f(LOOK.front)};
    lit = smoothstep(front - w, front + w, rho);
    float d = (rho - front) / w;
    edge = exp(-d * d * 0.4) * lit * (1.0 - p);
    break;
  }
  return lit;
}
`;

const MAIN = /* glsl */ `
  vec3 sP0 = vLocal, sD = normalize(vLocal - uCam);
  float sEnd = (S_LIP - 0.3 - sP0.y) / min(sD.y, -1e-3);
  float sDt = sEnd / float(${MARCH.steps});
  float sA = 0.0, sB = 0.0;
  bool sHit = false;
  for (int i = 1; i <= ${MARCH.steps}; i++){
    sB = sDt * float(i);
    vec3 q = sP0 + sD * sB;
    if (sHeight(q.xz) >= q.y){ sHit = true; break; }
    sA = sB;
  }
  if (!sHit) discard;
  for (int i = 0; i < ${MARCH.refine}; i++){
    float m = 0.5 * (sA + sB);
    vec3 q = sP0 + sD * m;
    if (sHeight(q.xz) >= q.y) sB = m; else sA = m;
  }
  vec3 sP = sP0 + sD * sB;
  vec2 sUV = sUv(sP.xz), sGx = dFdx(sUv(vLocal.xz)), sGy = dFdy(sUv(vLocal.xz));
  vec4 sT0 = textureGrad(uT0, sUV, sGx, sGy), sT1 = textureGrad(uT1, sUV, sGx, sGy);
  float sH = sT0.b * S_TALL, sAo = sT0.a, sWear = sT1.r, sGrime = sT1.g, sOpen = smoothstep(0.35, 0.65, sT1.b), sNear = sT1.a;
  vec2 sNxy = sT0.xy * 2.0 - 1.0;
  // Seen this low, a wall takes many pixels from a few texels across it, and the cast's faint unevenness on it was
  // drawn out into upright streaks: a wall is read softened along the screen. On what is flat the same unevenness is
  // drawn out sideways, so there the surface is read from a softer copy, and only the cut edges keep every texel.
  vec2 sAlong = textureGrad(uT0, sUV, sGx * 4.0, sGy).xy * 2.0 - 1.0;
  vec2 sSoft = textureGrad(uT0, sUV, sGx * 5.0, sGy * 5.0).xy * 2.0 - 1.0;
  float sSteep = smoothstep(0.3, 0.6, length(sNxy));
  sNxy = mix(sSoft, sAlong, sSteep);
  float sNz = sqrt(max(1.0 - dot(sNxy, sNxy), 0.0));
  float sRho = length(sP.xz) / S_R;
  float sKeep = ${f(LOOK.steep)} * mix(1.0, mix(0.55, 1.0, step(${f(OVER.from)}, sRho)), smoothstep(S_HIGH + 0.002, S_HIGH + 0.008, sH));
  vec3 sNl = normalize(vec3(sNxy.x * sKeep, max(sNz, 0.05), sNxy.y * sKeep));
  vec3 sView = (modelViewMatrix * vec4(sP, 1.0)).xyz;
  vec3 sN = normalize(normalMatrix * sNl);
  vec4 sClip = projectionMatrix * vec4(sView, 1.0);
  gl_FragDepth = clamp(sClip.z / sClip.w * 0.5 + 0.5, 0.0, 1.0);
  vec4 sWorld = modelMatrix * vec4(sP, 1.0);

  // The shadows the carving throws into itself from the cursor's light, walked toward the light over the heights.
  float sSelf = 1.0;
  {
    vec3 L = normalize(uLamp - sP);
    float j = sHash(floor(gl_FragCoord.xy) + 0.5);
    for (int i = 1; i <= ${MARCH.shadow}; i++){
      float s = (float(i) - 0.5 + 0.5 * j) * (0.8 + 0.07 * float(i));
      vec3 q = sP + L * s;
      if (q.y > S_TOP) break;
      sSelf = min(sSelf, clamp((q.y - sHeight(q.xz)) / 0.9 + 1.0, 0.0, 1.0));
    }
  }

  // The metal: rubbed bright copper on what stands proud, a dark patina in the channels.
  vec3 sF0 = min(mix(uCopper, uCopperLight, 0.1 + 0.55 * sWear) * (1.0 + 0.4 * sWear) * (1.0 - sGrime * 0.9), vec3(1.0));
  float sRough = clamp(${f(LOOK.satin)} + 0.24 * sGrime - 0.3 * sWear, 0.08, 0.9);
  // The room, as the Work stones are lit by theirs: a long soft light low behind the stone, which the tops reflect as a
  // satin sheen and the channels, tarnished and shut in, hardly at all. Its lobe is narrow, so it is read off a smoother
  // surface still, or the cast's unevenness came out as streaks.
  vec2 sCalm = textureGrad(uT0, sUV, sGx * 14.0, sGy * 14.0).xy * 2.0 - 1.0;
  vec2 sRxy = mix(sCalm, sNxy, sSteep) * sKeep;
  vec3 sRv = reflect(sD, normalize(vec3(sRxy.x, sqrt(max(1.0 - dot(sRxy, sRxy), 0.05)), sRxy.y)));
  float sUp = asin(clamp(sRv.y, -1.0, 1.0)), sWide = 0.1 + 0.55 * sRough;
  float sRoom = exp(-pow((sUp - ${f(LOOK.strip[0])}) / sWide, 2.0)) * smoothstep(0.0, 0.4, -sRv.z) * ${f(LOOK.strip[1])};

  // The stream's light, in what is cut: the floors of the channels and of the cut marks, hottest where they are
  // deepest and against the walls, and up each wall only a little way, cooling to ember.
  float sTh = atan(sP.z, sP.x), sEdge, sFl_;
  float sL = sLit(sRho, sTh, sEdge, sFl_);
  float sBoost = 1.0 + sFl_;
  float sRc = length(sP.xz);
  float sIn = smoothstep(uSpread + 7.0, uSpread - 7.0, sRc);
  float sBurn = uHeat * sIn * (mix(${f(LOOK.heat[0])}, 1.0, exp(-sRc / ${f(LOOK.heat[1])})) + 0.8 * uFront * exp(-pow((sRc - uSpread + 10.0) / 16.0, 2.0)));
  float sCap = mix(${f(LOOK.heatTop[1])}, mix(${f(LOOK.heatTop[1])}, ${f(LOOK.heatTop[0])}, smoothstep(1.2, 2.6, uHeat)), exp(-sRc / ${f(LOOK.heatTop[2])}));
  float sSunk = textureLod(uT0, sUV, 4.5).b * S_TALL - sH;
  // Outside the face what is cut is what lies at the carving's ground or under it, and inside the face, what is sunk
  // under what is round it.
  float sFace = 1.0 - step(0.456, sRho);
  float sCut = mix(smoothstep(S_GROUND + 0.012, S_GROUND + 0.003, sH), smoothstep(0.003, 0.014, sSunk), sFace) * smoothstep(0.965, 0.95, sRho);
  sCut = max(sCut, smoothstep(0.932, 0.936, sRho) * smoothstep(0.952, 0.948, sRho) * smoothstep(S_HIGH - 0.004, S_HIGH - 0.012, sH));
  // The far wall of a cut, which is what this low a view sees of it: lit from the foot, where the light lies, and
  // cooling up it.
  float sWall = sSteep * smoothstep(-0.006, 0.012, sSunk) * smoothstep(0.965, 0.95, sRho);
  sCut = max(sCut, sWall * 0.7);
  float sHeat = mix(smoothstep(S_GROUND + 0.006, S_FLOOR, sH), smoothstep(0.01, 0.03, sSunk), sFace) * 0.6 + 0.4 * smoothstep(0.0, 0.016, sSunk);
  // The light is not even along a channel: it lies thicker in some places than others.
  float sVar = 0.78 + 0.44 * sNoise(sP.xz * 0.045 + 7.0);
  vec2 sLd = sP.xz - vec2(${f(LANDS.x)}, ${f(LANDS.z)});
  float sDl = length(sLd);
  // The strike: a flash that spreads from where the stream lands and is gone in a third of a second, and while the
  // stream is on, a place a little brighter than the rest of the band.
  float sFl = uSince < 1.5 ? exp(-uSince * 7.0) * smoothstep(0.0, 0.02, uSince) * smoothstep(0.0, 0.1, uOn) : 0.0;
  float sReach = 34.0 + 300.0 * min(uSince, 0.4);
  float sSpot = uOn * exp(-sDl * sDl / 2400.0) * 0.6 + sFl * exp(-sDl * sDl / (sReach * sReach)) * ${f(LOOK.flash)};
  float sSpotTop = uOn * exp(-sDl * sDl / 1600.0) * 0.3 + sFl * exp(-sDl * sDl / (0.6 * sReach * sReach)) * ${f(LOOK.flash)} * 0.8;
  float sMove = 1.0;
  if (uLive > 0.0){
    float n = sNoise(vec2(sRho * 22.0 + uTime * 0.55, sTh * 7.0 + 0.15 * uTime)) * 0.6 + sNoise(vec2(sRho * 51.0 + uTime * 0.9, sTh * 19.0 - 0.1 * uTime)) * 0.4;
    sMove = mix(1.0, 0.72 + 0.56 * n, uLive);
  }
  float sA0 = ((sL * sVar * sMove * (0.32 + 0.9 * sHeat) + sEdge * 0.5) * sBoost + sSpot) * sCut * ${f(LOOK.glow)};
  float sAE = sBurn * ${f(LOOK.heat[2])} * (0.5 + 0.7 * sHeat) * sVar * sCut * ${f(LOOK.glow)};
  // Further out the engine brings a cut up only as far as hot, so the stream's pale there is not added to.
  float sHold = smoothstep(0.0, 0.5, uHeat) * sIn * smoothstep(${f(LOOK.hold[1])}, ${f(LOOK.hold[0])}, sRc);
  float sA_ = min(mix(min(sA0 + sAE, max(sA0, sCap)), min(min(sA0, sCap) + sAE, sCap), sHold), ${f(LOOK.most)});
  sA_ = mix(min(sA0, ${f(LOOK.most)}), sA_, uLeave);
  vec3 sEmit = sRamp(sA_);
  float sFlick = 0.6 + 0.8 * sNoise(vec2(sRc * 0.04 - uTime * 2.5, sTh * 9.0));
  sEmit += uHot * min(sAE * sFlick, 1.0) * ${f(LOOK.fire[0])} * min(1.0, uHeat / ${f(LOOK.fire[1])}) * sHold * uLeave;
  vec3 sToF = normalize(vec3(0.0, ${f(LOOK.low[0])}, 0.0) - sP);
  float sLow = pow(clamp(dot(sNl, sToF), 0.0, 1.0), ${f(LOOK.low[1])}) * (1.0 - sCut) * sAo;
  sEmit += sRamp(min(sBurn * sLow * ${f(LOOK.low[2])}, sCap)) * (0.6 + 0.4 * sFlick) * uLeave;
  float sRays = 0.4 + 0.8 * smoothstep(0.3, 0.8, sNoise(vec2(sTh * 13.0, sRc * 0.035 - uTime * 3.0)));
  vec3 sGlow = mix(uFlame, uHot, exp(-sRc / 70.0) * smoothstep(0.8, 2.6, uHeat));
  float sTable = smoothstep(${f(LOOK.glowTop[2])}, ${f(LOOK.glowTop[2] - 25)}, sRc);
  // Held to hot where it is strongest: over that, the middle went to one pale spot.
  float sGlowK = sBurn * (uSteady + 0.4 * (uHeat - uSteady)) / max(uHeat, 1e-3)
    * ${f(LOOK.glowTop[0])} * mix(${f(LOOK.glowTop[1])}, 1.0, exp(-sRc / 70.0));
  sEmit += sGlow * min(sGlowK, ${f(LOOK.glowTop[3])}) * sRays * sTable * (1.0 - sCut) * sAo * uLeave;
  // Once the stream's light is in the cuts it lands on the tops beside them too, warm, as the stream's light lands on
  // the Work stones: most on what stands proud, and never so much that the light in the cuts is not the brighter.
  float sTake = (1.0 - 0.85 * sGrime) * sAo * sAo * (1.0 - sCut * sL);
  float sRoomK = mix(${f(LOOK.dark)}, 1.0, sL) * (1.0 - ${f(LOOK.shade)} * clamp(sBurn, 0.0, 1.0) * (1.0 - sCut) * sTable);
  sEmit += sF0 * sRoom * sTake * sRoomK;
  sEmit += sF0 * sRamp(0.42) * sRoom * sL * sMove * sTake * ${f(LOOK.warm)} * (0.4 + 0.6 * sWear) * sBoost;
  sEmit += (0.35 + sF0) * sRamp(sSpotTop) * (1.0 - sCut) * 0.6;
  // The eyes and the mouth go through, to a hollow the light lies deep in.
  sOpen = max(sOpen, smoothstep(0.35, 0.65, textureLod(uT1, sUV, 0.0).b));
  sEmit = mix(sEmit, sRamp(max(sL * (0.25 + 0.6 * sNear), min(sBurn * (0.25 + 0.6 * sNear), sCap) * uLeave)), sOpen);
  sF0 = mix(sF0, vec3(0.02, 0.016, 0.012), sOpen);
  sRough = mix(sRough, 1.0, sOpen);
  if (uShow > 0.5){ sF0 = vec3(0.0); sEmit = uShow < 1.5 ? sEmit : vec3(uShow < 2.5 ? sAo : sCut); }
`;

// The cursor's light caught on the rubbed edges: a small, sharp glint that goes to pale, as polished copper's does seen
// this low, added after the light's own reflection in the spot light's loop.
const DIRECT = 'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
function glint(chunk: string): string {
  const at = chunk.indexOf(DIRECT, chunk.indexOf('getSpotLightInfo('));
  if (at < 0) return chunk;
  const add = `\n\t\t{ vec3 sHv = normalize( directLight.direction + geometryViewDir ); float sNl = saturate( dot( geometryNormal, directLight.direction ) );
\t\treflectedLight.directSpecular += directLight.color * sNl * pow( saturate( dot( geometryNormal, sHv ) ), ${f(LOOK.sharp)} ) * sWear * sWear * ${f(LOOK.spark)} * vec3( 1.0, 0.86, 0.7 ); }`;
  return chunk.slice(0, at + DIRECT.length) + add + chunk.slice(at + DIRECT.length);
}

const SPOT = 'getSpotLightInfo( spotLight, geometryPosition, directLight );';
const POINT = 'getPointLightInfo( pointLight, geometryPosition, directLight );';
const END = '#include <lights_fragment_end>';
const SPEC = 'reflectedLight.directSpecular', ROOM = 'reflectedLight.indirectSpecular';
const most = (v: string) => `max(1e-4, max(${v}.r, max(${v}.g, ${v}.b)))`;

export function stoneMaterial(c: Carving): THREE.MeshStandardMaterial {
  U.uT0.value = c.t0;
  U.uT1.value = c.t1;
  const m = new THREE.MeshStandardMaterial({ color: hex('copper'), metalness: 1, roughness: 0.4 });
  m.name = 'pad-stone';
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
    const lights = glint(THREE.ShaderChunk.lights_fragment_begin)
      .replace('vec3 geometryPosition = - vViewPosition;', 'vec3 geometryPosition = sView;')
      .replace('normalize( vViewPosition )', 'normalize( - sView )')
      .replace('spotLightShadow.shadowRadius, vSpotLightCoord[ i ] )', 'spotLightShadow.shadowRadius, spotLightMatrix[ i ] * ( sWorld + vec4( 0.0, spotLightShadow.shadowNormalBias, 0.0, 0.0 ) ) )')
      .replace(SPOT, `${SPOT}\n\t\tdirectLight.color *= sSelf * ( 0.45 + 0.55 * sAo ) * mix( ${f(LOOK.lamp[0])}, ${f(LOOK.lamp[1])}, sWear );`)
      .replace(POINT, `${POINT}\n\t\tdirectLight.color *= ${f(LOOK.engine)} * ( 0.4 + 0.6 * sAo ) * mix( ${f(LOOK.tops)}, 1.0, sCut );`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${HEAD}`)
      .replace('void main() {', `void main() {\n${MAIN}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\n\tdiffuseColor.rgb = sF0;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n\troughnessFactor = sRough;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n\tnormal = sN;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance = sEmit;')
      .replace('#include <lights_fragment_begin>', lights)
      .replace(END, `${END}\n\t${SPEC} *= min(1.0, ${f(LOOK.glint)} / ${most(SPEC)});`
        + `\n\t${ROOM} *= (0.2 + 0.8 * sAo) * mix(${f(LOOK.room[0])}, ${f(LOOK.room[1])}, sWear) * sRoomK;`
        + `\n\t${ROOM} *= min(1.0, ${f(LOOK.sheen)} / ${most(ROOM)});\n\treflectedLight.indirectDiffuse *= sAo;`);
  };
  m.customProgramCacheKey = () => 'pad-stone';
  return m;
}

// The edge under the rim, turned: the same copper, its patina darker where it turns down to the page.
export function edgeMaterial(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex('copper')).multiplyScalar(0.3), metalness: 1, roughness: 0.38 });
  m.name = 'pad-stone-edge';
  return m;
}
