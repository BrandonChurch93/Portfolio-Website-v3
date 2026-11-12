import { ASPECT } from '../stream-ideas/route';

const TO_CLIP = `vec4(p.x * 2.0 / ${ASPECT}, p.y * 2.0, 0.0, 1.0)`;

// How many halo widths out a strand's ribbon reaches.
export const REACH = 4.5;

const HEAT = `
uniform vec3 uEmber, uFlame, uHot, uPale;
vec3 heat(float x){
  vec3 c = x < 0.3 ? mix(uEmber, uFlame, x / 0.3) : x < 0.62 ? mix(uFlame, uHot, (x - 0.3) / 0.32) : mix(uHot, uPale, clamp((x - 0.62) / 0.3, 0.0, 1.0));
  return c * (0.35 + 2.4 * x * x);
}
vec3 show(vec3 col){
  float mx = max(col.r, max(col.g, col.b));
  if (mx > 1e-5) col *= (1.0 - exp(-mx * 1.15)) / (mx * 0.955);
  return pow(max(col, 0.0), vec3(1.0 / 2.2));
}`;

// Everything that glows is first drawn as an amount of light, not a color: sharp light in red, soft light in green,
// both stored as square roots and joined by keeping the larger. Color comes once, from the total.

// ---- strands of the core: ribbons along the route

export const STRAND_VERT = `#version 300 es
in vec3 aPos; in vec4 aStrand;
out vec4 vStrand; out float vHalo;
void main(){ vec2 p = aPos.xy; vStrand = aStrand; vHalo = aPos.z; gl_Position = ${TO_CLIP}; }`;

export const STRAND_FRAG = `#version 300 es
precision highp float;
in vec4 vStrand;   // how far across, the core's width, its brightness, the halo's width
in float vHalo;
out vec4 frag;
void main(){
  float x = abs(vStrand.x), w = vStrand.y, hw = vStrand.w;
  float core = vStrand.z * exp(-(x * x) / (w * w));
  float edge = clamp(1.0 - x / (hw * ${REACH.toFixed(1)}), 0.0, 1.0);
  float halo = vHalo * exp(-x / hw) * edge * edge;
  frag = vec4(sqrt(core), sqrt(halo), 0.0, 1.0);
}`;

// ---- sparks and forks: thin soft streaks

export const STREAK_VERT = `#version 300 es
in vec2 aPos; in vec2 aHot;
out vec2 vHot;
void main(){ vec2 p = aPos; vHot = aHot; gl_Position = ${TO_CLIP}; }`;

export const STREAK_FRAG = `#version 300 es
precision highp float;
in vec2 vHot;   // how hot, and how far across the streak
out vec4 frag;
void main(){ frag = vec4(sqrt(max(vHot.x, 0.0) * exp(-vHot.y * vHot.y * 2.6)), 0.0, 0.0, 1.0); }`;

// ---- shards: copper and glass, riding round the core and lit by it

const SHARD_IN = `#version 300 es
in vec2 aCorner; in vec4 aShard; in vec4 aTurn; in vec3 aCore;
// aShard: x, y, size, turn in the page. aTurn: tilt, its own random number, 1 for glass. aCore: from it to the core, z toward the eye.
vec3 facing(){
  float tilt = aTurn.x, ang = aShard.w;
  vec3 n = vec3(-sin(ang) * sin(tilt), cos(ang) * sin(tilt), cos(tilt));
  return n.z < 0.0 ? -n : n;
}`;

export const SHARD_VERT = SHARD_IN + `
uniform vec2 uLight;
out float vBright; out vec2 vUv; out vec2 vKind;
void main(){
  float glass = aTurn.z;
  vec3 n = facing(), V = vec3(0.0, 0.0, 1.0);
  float d2 = dot(aCore, aCore);
  vec3 L = aCore * inversesqrt(d2 + 1e-9);
  float power = 1.0 / (1.0 + d2 / 0.0005);
  float lit = max(dot(n, L), 0.0);
  float spec = pow(max(dot(n, normalize(L + V)), 0.0), 22.0);
  vec2 toLight = uLight - aShard.xy;
  float near = 1.0 / (1.0 + dot(toLight, toLight) / 0.02);
  float flash = pow(max(dot(n, normalize(normalize(vec3(toLight, 0.16)) + V)), 0.0), 26.0) * 4.0 * near;
  // Copper is dark until the core or the cursor lights its face. Glass carries a little of the core's light in its body.
  float copper = 0.05 + 0.2 * power + 1.25 * lit * power + 0.8 * spec * power + flash;
  float clear = 0.02 + 0.2 * power + 0.5 * spec * power + flash;
  vec2 l = aCorner * aShard.z * vec2(1.0 + glass * 0.5 * aTurn.y, 0.22 + 0.78 * abs(cos(aTurn.x)));
  vec2 r = vec2(cos(aShard.w) * l.x - sin(aShard.w) * l.y, sin(aShard.w) * l.x + cos(aShard.w) * l.y);
  // The side of a shard that is toward the core is its bright side.
  float toward = dot(r, aCore.xy) * inversesqrt(dot(aCore.xy, aCore.xy) + 1e-9) / max(aShard.z, 1e-6);
  vBright = mix(copper, clear, glass) * max(1.0 + 0.9 * clamp(toward, -1.0, 1.0), 0.12);
  vec2 p = aShard.xy + r;
  vUv = aCorner; vKind = vec2(glass, aTurn.y);
  gl_Position = ${TO_CLIP};
}`;

// Both kinds take their color from how brightly they are lit and nothing else, so every shard stays on the palette:
// copper runs from dark bronze through copper to pale, and glass through the same heat as the light itself.
export const SHARD_FRAG = `#version 300 es
precision highp float;
uniform vec3 uBronze, uCopperDeep, uCopper;
in float vBright; in vec2 vUv; in vec2 vKind;
out vec4 frag;
${HEAT}
vec3 metal(float b){
  b = clamp(b, 0.0, 1.0);
  return b < 0.4 ? mix(uBronze * 0.1, uCopperDeep * 0.8, b / 0.4) : b < 0.75 ? mix(uCopperDeep * 0.8, uCopper, (b - 0.4) / 0.35) : mix(uCopper, uPale, (b - 0.75) / 0.25);
}
void main(){
  float aa = fwidth(vUv.x) + fwidth(vUv.y) + 0.02, a;
  vec3 c;
  if (vKind.x < 0.5){
    // Copper leaf: torn, not square. One corner is cut away by a different amount on each.
    float cut = 0.75 + vKind.y * 0.5 - vUv.x * (vKind.y - 0.5) * 1.6 - vUv.y * 0.9;
    a = smoothstep(0.0, aa, min(1.0 - max(abs(vUv.x), abs(vUv.y)), cut));
    c = pow(metal(vBright), vec3(1.0 / 2.2));
  } else {
    // Glass: a splinter with three sides. Two faces meet along a ridge from its tip, one catching more light, and
    // its edges are the brightest part of it.
    float tip = (vKind.y - 0.5) * 1.3;
    float left = (vUv.x + 1.0) * 1.9 - (vUv.y + 0.9) * (tip + 1.0);
    float right = (1.0 - vUv.x) * 1.9 - (vUv.y + 0.9) * (1.0 - tip);
    float in_ = min(vUv.y + 0.9, min(left, right) * 0.45);
    float ridge = vUv.x - tip * (vUv.y * 0.5 + 0.5);
    a = smoothstep(0.0, aa, in_);
    float b = vBright * (0.5 + 2.6 * (1.0 - smoothstep(0.0, 0.16 + aa, in_)) + 0.9 * smoothstep(-aa, aa, ridge) + 1.2 * (1.0 - smoothstep(0.0, 0.05 + aa, abs(ridge))));
    c = show(heat(clamp(b, 0.0, 1.0)) * min(1.0, b / 0.22));
  }
  // Copper hides what is behind it. Glass adds its light to it.
  frag = vec4(c * a, a * (1.0 - vKind.x));
}`;

// ---- the light, turned into color and laid over the page

export const LIGHT_SHOW = `#version 300 es
precision highp float;
uniform sampler2D uLit;
uniform vec2 uRes, uOrigin, uScale;
uniform vec4 uGlow[4];   // the leading ends and the landings: x, y, size, brightness
${HEAT}
out vec4 frag;
void main(){
  vec2 q = gl_FragCoord.xy - uOrigin, uv = q / uRes * uScale, px = uScale / uRes;
  vec2 p = (q - 0.5 * uRes) / uRes.y;
  vec2 c = texture(uLit, uv).rg;
  float sharp = c.r * c.r, soft = c.g * c.g, bloom = 0.0;
  for (int i = 0; i < 6; i++){
    float a = float(i) * 1.0472;
    vec2 d = vec2(cos(a), sin(a));
    float n = texture(uLit, uv + d * px * 2.5).r, f = texture(uLit, uv + d.yx * px * 6.5).r;
    bloom += n * n * 0.05 + f * f * 0.022;
  }
  for (int i = 0; i < 4; i++){
    float d = length(p - uGlow[i].xy), r = uGlow[i].z;
    sharp = max(sharp, uGlow[i].w * exp(-(d * d) / (r * r)));
    soft = max(soft, uGlow[i].w * 0.42 * exp(-d / (r * 1.5)));
  }
  float light = sharp + bloom + soft;
  // A little grain, in proportion, so a wide faint glow does not show steps.
  light *= 1.0 + (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.06;
  // Faint light fades all the way to nothing, so a glow has no edge.
  frag = vec4(show(heat(clamp(light, 0.0, 1.0)) * min(1.0, light / 0.22)), 1.0);
}`;
