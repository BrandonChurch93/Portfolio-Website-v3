import { ROOM, SPEC } from '../metal/shaders';
import { STREAM } from './config';
import { STONE, STONE_BAKE, STONE_TALL } from './stone';

// GLSL for the stream. WebGL2.
// Positions are CSS pixels of the page, y down, z toward the eye. uView is the part of the page the canvas covers:
// left, top, width, height. Lengths that set the look are in stream units (uUnit CSS pixels each).
//
// Everything that glows is drawn first as an amount of light, into a buffer that keeps the larger where two things
// overlap, and is given its color once, by ramp(). Shards are solid and are lit, never tinted.

// How bright the light buffer can go. It is stored as a square root so faint light keeps its steps.
export const LIGHT_MAX = 8;
// Half the width of the ribbon the core is drawn on, in units.
export const CORE_HALF = 34;

export const HEAD = `#version 300 es
precision highp float;
`;

const CLIP = `
uniform vec4 uView;
vec4 clip(vec2 p, float z){ return vec4((p.x - uView.x) / uView.z * 2.0 - 1.0, 1.0 - (p.y - uView.y) / uView.w * 2.0, z, 1.0); }
`;

const RAMP_OF = `// An amount of light to its color: nothing, ember, flame, hot, pale. Never white, and it fades all the way to nothing.
vec3 ramp(float a){
  vec3 c = uEmber * clamp(a / 0.11, 0.0, 1.0);
  c = mix(c, uFlame, smoothstep(0.07, 0.42, a));
  c = mix(c, uHot, smoothstep(0.34, 0.85, a));
  c = mix(c, uPale, smoothstep(0.7, 1.6, a));
  return c;
}
`;
const RAMP = `
uniform vec3 uEmber, uFlame, uHot, uPale;
${RAMP_OF}`;

export const NOISE = `
float hash1(float n){ return fract(sin(n * 127.1) * 43758.5453); }
float hash2(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float hash3(vec3 p){ p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
float noise2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x), f.y); }
// One least step of an 8 bit channel, as noise with a triangular spread, so a slow fade shows no bands.
float dither(vec2 p){ float a = hash2(p * 0.61 + 0.37), b = hash2(p * 0.83 + 7.13); return (a + b - 1.0) / 255.0; }
`;

export const FULL_VERT = `${HEAD}
in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

// ---- the core: one ribbon to each side of the route, and a bundle of strands of light worked out across it

export const CORE_VERT = `${HEAD}
in vec2 aPos;
in vec3 aAlong;   // across the core, along it, and behind its leading end, all in units
out vec3 vAlong;
${CLIP}
void main(){ vAlong = aAlong; gl_Position = clip(aPos, 0.0); }`;

// ends: the route has a place where the two sides meet again, and a side's own strands fade out there as they faded
// in where the sides parted. Without it the shader is the test shot's, letter for letter.
export const coreFrag = (strands: number, ends = false) => `${HEAD}
in vec3 vAlong;
uniform float uTime, uEnergy, uHeart;
uniform vec2 uOwn;   // a shift that gives each side its own strands, and where along the route they begin${ends ? `
uniform float uEnd;  // where along the route they end` : ''}
out vec4 frag;
${NOISE}
void main(){
  float x = vAlong.x, lead = vAlong.z, t = uTime;
  float begun = smoothstep(uOwn.y, uOwn.y + 34.0, vAlong.y)${ends ? ' * (1.0 - smoothstep(uEnd - 34.0, uEnd, vAlong.y))' : ''}, s = vAlong.y + uOwn.x;
  // The core is a ribbon of light: a band of fine fibres lying side by side, which turns slowly as it runs. Seen
  // flat it is a wide soft band with every fibre showing. Seen on edge all of it gathers into one fierce line.
  // So its width and its brightness are never the same for long, and the fibres always make one smooth form.
  float tip = smoothstep(0.0, 120.0, lead);
  float twist = s / 58.0 - t * 0.36 + 1.3 * sin(s / 143.0 - t * 0.12);
  float face = cos(twist), depth = sin(twist);
  float wide = mix(10.0, 20.0, 0.5 + 0.5 * sin(s / 97.0 - t * 0.21 + 1.0)) * mix(0.25, 1.0, tip);
  float span = wide * abs(face) + 0.6;
  float sum = 0.0;
  // The sheet between the fibres: a faint body, feathered at its edge.
  sum += 0.1 * smoothstep(span + 2.6, span * 0.55, abs(x)) * (0.35 + 0.65 * abs(face)) * begun;
  for (int j = 0; j < ${strands}; j++){
    float f = float(j), a = hash1(f + 1.0), b = hash1(f + 7.3), c = hash1(f + 13.9);
    // The fibres crowd toward the middle of the band and thin out toward its edges, and no two are the same
    // distance apart, the same width or the same strength. Evenly spaced, they would be a cable.
    float u0 = (f + 0.5) / ${strands}.0 * 2.0 - 1.0 + (a - 0.5) * 0.5;
    float u = sign(u0) * pow(abs(u0), 1.7);
    float off = u * wide * face + 1.5 * sin(s / mix(17.0, 31.0, b) + c * 6.283 - t * 0.4);
    // A fibre on the far side of the ribbon is softer and dimmer than one on the near side.
    float dz = u * depth;
    float w = mix(0.38, 1.05, c * c) * (1.2 - 0.35 * dz);
    float life = 0.12 + 0.88 * smoothstep(-0.4, 0.6, sin(s / mix(50.0, 150.0, a) + f * 2.4 - t * 0.3));
    float level = mix(0.24, 1.0, b * b) * life * (0.6 + 0.4 * dz);
    float d = (x - off) / w;
    sum += level * exp(-d * d) * begun;
  }
  // The heart of it, one fibre in the middle of the band: fierce where the ribbon is on edge, and there its light
  // falls away slowly through hot and flame to ember. A sharp even edge is what makes a tube.
  float gather = 1.0 - abs(face);
  float q = x / mix(0.8, 1.4, gather);
  sum += mix(1.7, 3.0, gather * gather) * uHeart / pow(1.0 + q * q, 1.6);
  // Light runs down it, and it burns hotter toward its leading end.
  float run = 0.84 + 0.16 * sin(s / 83.0 - t * 2.1) * sin(s / 211.0 - t * 0.9 + 0.8);
  float head = 1.0 - smoothstep(0.0, 120.0, lead);
  sum *= run * (1.0 + (0.6 + 1.3 * uEnergy) * head * head) * smoothstep(0.0, 5.0, lead) * smoothstep(${CORE_HALF}.0, 22.0, abs(x));
  frag = vec4(sqrt(min(sum, ${LIGHT_MAX}.0) / ${LIGHT_MAX}.0), 0.0, 0.0, 1.0);
}`;

// ---- sparks, forks of arc and the hot point at each leading end: thin streaks and small round lights

export const STREAK_VERT = `${HEAD}
in vec2 aPos;
in vec3 aLight;   // across (-1 to 1), amount, along (-1 to 1, used by round lights only)
out vec3 vLight;
${CLIP}
void main(){ vLight = aLight; gl_Position = clip(aPos, 0.0); }`;

export const STREAK_FRAG = `${HEAD}
in vec3 vLight;
out vec4 frag;
void main(){
  float d2 = vLight.x * vLight.x + vLight.z * vLight.z;
  float a = max(vLight.y, 0.0) * exp(-d2 * 3.2);
  frag = vec4(sqrt(min(a, ${LIGHT_MAX}.0) / ${LIGHT_MAX}.0), 0.0, 0.0, 1.0);
}`;

// ---- the glow: the light buffer made smaller step by step, then built back up

// With no float targets the glow is stored as a square root in 8 bits.
export const packing = (float: boolean) => float
  ? '#define PACK(v) (v)\n#define UNPACK(v) (v)\n'
  : '#define PACK(v) sqrt(max(v, 0.0) / 8.0)\n#define UNPACK(v) ((v) * (v) * 8.0)\n';

export const downFrag = (float: boolean) => `${HEAD}
${packing(float)}
in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uFirst;
out vec4 frag;
float take(vec2 o){
  float v = texture(uSrc, vUv + o * uTexel).r;
  return uFirst > 0.5 ? v * v * ${LIGHT_MAX}.0 : UNPACK(v);
}
void main(){
  float a = take(vec2(-2.0, 2.0)), b = take(vec2(0.0, 2.0)), c = take(vec2(2.0, 2.0));
  float d = take(vec2(-2.0, 0.0)), e = take(vec2(0.0, 0.0)), f = take(vec2(2.0, 0.0));
  float g = take(vec2(-2.0, -2.0)), h = take(vec2(0.0, -2.0)), i = take(vec2(2.0, -2.0));
  float j = take(vec2(-1.0, 1.0)), k = take(vec2(1.0, 1.0)), l = take(vec2(-1.0, -1.0)), m = take(vec2(1.0, -1.0));
  float b0 = (j + k + l + m) * 0.25, b1 = (a + b + d + e) * 0.25, b2 = (b + c + e + f) * 0.25, b3 = (d + e + g + h) * 0.25, b4 = (e + f + h + i) * 0.25;
  float v;
  if (uFirst > 0.5){
    // One very bright pixel, a spark, must not flicker through the whole glow.
    float w0 = 0.5 / (1.0 + b0), w1 = 0.125 / (1.0 + b1), w2 = 0.125 / (1.0 + b2), w3 = 0.125 / (1.0 + b3), w4 = 0.125 / (1.0 + b4);
    v = (b0 * w0 + b1 * w1 + b2 * w2 + b3 * w3 + b4 * w4) / (w0 + w1 + w2 + w3 + w4);
  } else v = b0 * 0.5 + (b1 + b2 + b3 + b4) * 0.125;
  frag = vec4(PACK(v), 0.0, 0.0, 1.0);
}`;

// Red carries the glow that hugs the light, green the wide light that reaches across the page, and blue the light
// close by, which falls off steeply and lights what the stream touches.
export const upFrag = (float: boolean) => `${HEAD}
${packing(float)}
in vec2 vUv;
uniform sampler2D uLevel, uWider;
uniform vec2 uTexel;     // of the wider level
uniform vec3 uWeight;
uniform float uTop;      // 1 when there is no wider level
out vec4 frag;
vec3 wide(vec2 o){ vec3 v = texture(uWider, vUv + o * uTexel).rgb; return UNPACK(v); }
void main(){
  vec3 sum = vec3(0.0);
  if (uTop < 0.5){
    sum = wide(vec2(0.0)) * 4.0 + (wide(vec2(1.0, 0.0)) + wide(vec2(-1.0, 0.0)) + wide(vec2(0.0, 1.0)) + wide(vec2(0.0, -1.0))) * 2.0
      + wide(vec2(1.0, 1.0)) + wide(vec2(-1.0, 1.0)) + wide(vec2(1.0, -1.0)) + wide(vec2(-1.0, -1.0));
    sum /= 16.0;
  }
  float v = UNPACK(texture(uLevel, vUv).r);
  frag = vec4(PACK(sum + v * uWeight), 1.0);
}`;

// ---- shared by everything that is lit

const LIT = `
uniform sampler2D uGlow;
uniform float uUnit, uDpr;
uniform vec3 uLamp;      // page pixels, and its height over the page
uniform float uLampI;
vec2 glowUv(vec2 p){ return vec2((p.x - uView.x) / uView.z, 1.0 - (p.y - uView.y) / uView.w); }
vec3 glowAt(vec2 p){ vec3 v = texture(uGlow, glowUv(p)).rgb; return UNPACK(v); }
// The stream's light at a point of the page: which way it comes from, how much of the wide light is there (x) and
// how much of the close light (y).
vec3 streamLight(vec2 p, out vec2 amount){
  float g = 8.0 * uUnit;
  vec3 c = glowAt(p);
  amount = c.gb;
  vec3 ex = glowAt(p + vec2(g, 0.0)) - glowAt(p - vec2(g, 0.0)), ey = glowAt(p + vec2(0.0, g)) - glowAt(p - vec2(0.0, g));
  vec2 grad = vec2(ex.b, ey.b) + vec2(ex.g, ey.g) * 2.0;
  vec2 dir = grad / ((c.b + c.g * 2.0) * 0.6 + length(grad) + 1e-5);
  return normalize(vec3(dir, 0.45));
}
float sdBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float ggx(float nh, float a){ float a2 = a * a, d = nh * nh * (a2 - 1.0) + 1.0; return a2 / (3.14159 * d * d); }
`;

// ---- the title and the card: raised shapes that catch the stream's light on the edges that face it

export const RELIEF_VERT = `${HEAD}
in vec2 aPos;
uniform vec4 uRect;
out vec2 vP;
${CLIP}
void main(){ vP = uRect.xy + (aPos * 0.5 + 0.5) * uRect.zw; gl_Position = clip(vP, 0.0); }`;

const TITLE_FIELD = `
uniform sampler2D uSdf;    // red: distance near the edge, finely. green: distance far out, coarsely
uniform vec4 uSdfRect;     // the part of the page the field covers
uniform vec3 uSdfRange;    // pixels of the field: fine reach, coarse reach outward, coarse reach inward
uniform vec2 uSdfTexel;
// Distance to the letters in CSS pixels, negative inside.
float titleFine(vec2 p){
  vec2 uv = (p - uSdfRect.xy) / uSdfRect.zw;
  return (texture(uSdf, uv).r * 2.0 - 1.0) * uSdfRange.x / uDpr;
}
float titleFar(vec2 p){
  vec2 uv = clamp((p - uSdfRect.xy) / uSdfRect.zw, 0.0, 1.0);
  vec2 q = uSdfRect.xy + uv * uSdfRect.zw;
  return (texture(uSdf, uv).g * (uSdfRange.y + uSdfRange.z) - uSdfRange.z) / uDpr + length(p - q);
}
`;

export const titleFrag = (float: boolean) => `${HEAD}
${packing(float)}
in vec2 vP;
uniform vec3 uText, uEmber, uFlame, uHot, uPale;
out vec4 frag;
${CLIP}${LIT}${TITLE_FIELD}
void main(){
  float d = titleFine(vP);
  float cov = clamp(0.5 - d * uDpr, 0.0, 1.0);
  if (cov <= 0.0){ frag = vec4(0.0); return; }
  vec2 px = uSdfTexel * uSdfRect.zw;
  vec2 grad = vec2(titleFine(vP + vec2(px.x, 0.0)) - titleFine(vP - vec2(px.x, 0.0)), titleFine(vP + vec2(0.0, px.y)) - titleFine(vP - vec2(0.0, px.y)));
  grad /= max(length(grad), 1e-4);
  // Each letter stands a little proud of the page, with a rounded shoulder.
  float edge = smoothstep(-2.6 * uUnit, 0.0, d);
  vec3 N = normalize(vec3(grad * edge * 1.9, 1.0));
  vec2 amount;
  vec3 L = streamLight(vP, amount);
  float lit = amount.y * 11.0 + amount.x * 9.0;
  float face = max(dot(N, L), 0.0);
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  // Unlit it is a calm warm grey, easy to read. Where the stream is close it comes up to full and warms, and the
  // edges that face the stream burn.
  vec3 col = uText * 0.27;
  col += mix(uHot, uFlame, 0.35) * min(lit, 1.8) * (0.12 + 0.7 * face);
  col += mix(uPale, uHot, 0.3) * pow(max(dot(N, H), 0.0), 8.0) * min(lit, 3.5) * 1.7 * edge;
  col *= 1.0 - 0.55 * edge * (1.0 - face) * clamp(lit * 2.0, 0.0, 1.0);
  vec3 Lv = vec3(uLamp.xy - vP, uLamp.z);
  float ld = length(Lv);
  float lamp = uLampI / (1.0 + pow(length(Lv.xy) / (230.0 * uUnit), 2.0));
  vec3 Ll = Lv / ld;
  col += uText * lamp * 0.3 * max(dot(N, Ll), 0.0);
  col += uPale * pow(max(dot(N, normalize(Ll + vec3(0.0, 0.0, 1.0))), 0.0), 26.0) * lamp * 1.3 * edge;
  frag = vec4(min(col, vec3(1.0)) * cov, cov);
}`;

export const cardFrag = (float: boolean) => `${HEAD}
${packing(float)}
in vec2 vP;
uniform vec4 uCard;        // center and half size
uniform float uCardR;
uniform vec3 uFace, uFaceLit, uF0, uPale;
out vec4 frag;
${CLIP}${LIT}${NOISE}
void main(){
  vec2 q = vP - uCard.xy;
  float d = sdBox(q, uCard.zw, uCardR);
  float cov = clamp(0.5 - d * uDpr, 0.0, 1.0);
  if (cov <= 0.0){ frag = vec4(0.0); return; }
  float e = 0.5;
  vec2 grad = normalize(vec2(sdBox(q + vec2(e, 0.0), uCard.zw, uCardR) - sdBox(q - vec2(e, 0.0), uCard.zw, uCardR), sdBox(q + vec2(0.0, e), uCard.zw, uCardR) - sdBox(q - vec2(0.0, e), uCard.zw, uCardR)) + 1e-5);
  float rimW = 2.4 * uUnit;
  float rim = smoothstep(-rimW - 0.6, -rimW + 0.2, d);
  // The edge is a rounded copper bead. The face is dark and flat, and dips a hair just inside the bead.
  float across = clamp(-d / rimW, 0.0, 1.0);
  vec3 N = normalize(vec3(grad * (1.0 - 2.0 * across) * 1.6 * rim - grad * 0.25 * (1.0 - rim) * smoothstep(-7.0 * uUnit, -rimW, d), 1.0));
  vec2 amount;
  vec3 L = streamLight(vP, amount);
  float lit = amount.y * 6.0 + amount.x * 8.0;
  vec3 V = vec3(0.0, 0.0, 1.0), H = normalize(L + V);
  vec3 Lv = vec3(uLamp.xy - vP, uLamp.z);
  float lamp = uLampI / (1.0 + pow(length(Lv.xy) / (230.0 * uUnit), 2.0));
  vec3 Ll = normalize(Lv), Hl = normalize(Ll + V);
  float grain = noise2(vP * 1.7 / uUnit) - 0.5;
  // The face: almost black, lifting a little toward its top. The stream washes it warm from where it runs.
  float down = clamp((q.y + uCard.w) / (2.0 * uCard.w), 0.0, 1.0);
  vec3 face = uFace * mix(1.5, 0.75, down) * (1.0 + grain * 0.07);
  face += uFaceLit * 1.7 * min(lit, 3.5) * (0.6 + 0.5 * max(dot(N, L), 0.0)) * (1.0 + grain * 0.14);
  face += uFaceLit * lamp * 0.5 * max(dot(N, Ll), 0.0);
  vec3 bead = uF0 * (0.03 + min(lit, 3.0) * (0.05 + 0.22 * max(dot(N, L), 0.0) + 1.3 * ggx(max(dot(N, H), 0.0), 0.3) * max(dot(N, L), 0.0)));
  bead += uF0 * lamp * (0.25 * max(dot(N, Ll), 0.0) + 3.0 * ggx(max(dot(N, Hl), 0.0), 0.24) * max(dot(N, Ll), 0.0));
  bead = mix(bead, uPale, clamp((max(bead.r, bead.g) - 0.9) * 0.9, 0.0, 0.85));
  vec3 col = mix(face, bead, rim);
  frag = vec4(min(col, vec3(1.0)) * cov, cov);
}`;

// ---- a project card. It is a lit plate of its own, in the page under the stream's canvas (src/metal). The stream
// does two things where one stands. It cuts itself off: nothing behind the card shows through it, and the light ends
// cleanly at its rim, which is what makes the stream lie on it. And it lays its own light on the card: on the metal
// of its rim, its frame and its band, and as a warm wash on its face and its picture. The card's own relief, read
// out of its bake, says which way each part of it faces.
// A card turns and grows a little under the pointer. uTurn is that, as a map of the card's own plane.

export const PLATE_VERT = `${HEAD}
in vec2 aPos;
uniform vec4 uBox;       // the card at rest: its center and half its size
uniform mat3 uTurn;
out vec2 vAt;            // a point of the card as it lies at rest, from its center
${CLIP}
void main(){
  vAt = aPos * uBox.zw;
  vec3 t = uTurn * vec3(vAt, 1.0);
  vec4 c = clip(uBox.xy + t.xy / t.z, 0.0);
  gl_Position = vec4(c.xy * t.z, 0.0, t.z);
}`;

// The card's outline. Alone, it brings what the lit shaders already have.
const plateEdge = (alone: boolean) => `
uniform vec4 uBox;
uniform vec2 uRound;     // how far inside its box the card's metal begins, and the radius of its corners${alone ? `
uniform float uDpr;
float sdBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }` : ''}
float plateCover(vec2 at){ return clamp(0.5 - sdBox(at, uBox.zw - uRound.x, uRound.y) * uDpr, 0.0, 1.0); }
`;

// How much of this pixel the card covers.
export const PLATE_HOLE_FRAG = `${HEAD}
in vec2 vAt;
out vec4 frag;
${plateEdge(true)}
void main(){ frag = vec4(plateCover(vAt)); }`;

// The most of the stream's light a part of the card takes, as amounts of it: the rim and the frame round the
// picture, the picture, the face close inside the rim, the face where the card's words are, and the band. The
// words begin about eighteen units in from the card's edge. The wash is gone by sixteen, so the stream takes no
// contrast from any word, in the brightest frame of a strike or out of it: that is measured, not judged by eye.
// The canvas is laid over the card as it is shown, not added to its light before that, so a little light laid on a
// dark face counts for more than its amount: under the words there is none.
export const PLATE_MOST = { rim: 4, picture: 1.6, face: 1.25, words: 0, band: 0.4 };

export const plateLightFrag = (float: boolean) => `${HEAD}
${packing(float)}
in vec2 vAt;
uniform sampler2D uB0, uB1;   // the card's bake: normal x, normal y, cavity, wear. Second metal, face, grime, roughness
uniform vec4 uWin;            // the picture's window, from the card's center: its center and half its size
uniform vec3 uFrame;          // the width of the frame round the window, of the card's rim, and of one of the card's own units
uniform vec2 uTilt;           // how the card is turned: about x, about y
uniform vec3 uMetalA, uMetalB, uFaceLit, uFlame, uHot, uPale;
uniform vec3 uRough;          // of the metal, of the band, and how brushed the metal is
uniform vec3 uFlare;          // how hard a leading end has just struck the card, 0 to 1, and where, from its center
out vec4 frag;
${CLIP}${LIT}${plateEdge(false)}${NOISE}
const float PI = 3.14159265;
${SPEC}vec3 rotX(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(v.x, c * v.y - s * v.z, s * v.y + c * v.z); }
vec3 rotY(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }
void main(){
  float cov = plateCover(vAt);
  vec2 p = uView.xy + vec2(gl_FragCoord.x / uDpr, uView.w - gl_FragCoord.y / uDpr);
  vec2 amount;
  vec3 L = streamLight(p, amount);
  float lit = amount.y * 6.0 + amount.x * 8.0;
  if (cov <= 0.0 || lit < 0.003){ frag = vec4(0.0); return; }
  vec2 uv = vec2(vAt.x / (2.0 * uBox.z) + 0.5, 0.5 - vAt.y / (2.0 * uBox.w));
  vec4 b0 = texture(uB0, uv), b1 = texture(uB1, uv);
  // The bake's normals have y up, as the metal's own light has. The card's turn is its page's, with y down.
  vec3 N = vec3(b0.xy * 2.0 - 1.0, 0.0);
  N.z = sqrt(max(1.0 - dot(N.xy, N.xy), 0.0));
  N = rotY(rotX(N, -uTilt.x), uTilt.y);
  float band = b1.x, face = b1.y, grime = b1.z, wear = b0.w, roughVar = b1.w * 2.0 - 1.0;
  vec3 ls = vec3(L.x, -L.y, L.z), V = vec3(0.0, 0.0, 1.0);
  vec3 T = normalize(vec3(1.0, 0.0, 0.0) - N * N.x), B = cross(N, T);
  float toward = max(dot(N, ls), 0.0);
  vec3 warm = mix(uFlame, uHot, 0.5);
  float dw = sdBox(vAt - uWin.xy, uWin.zw, 0.5);
  float picture = clamp(-dw * uDpr - 0.5, 0.0, 1.0);
  // A strike is the strongest thing that happens to a card: for a moment its rim takes more of the light.
  float most = mix(${PLATE_MOST.rim.toFixed(1)}, ${PLATE_MOST.band.toFixed(2)}, band) * (1.0 + 0.8 * uFlare.x);
  float m = min(lit * (1.0 + 1.4 * uFlare.x * (1.0 - band)), most);
  // The rim is brightest where the stream is nearest and falls off steeply from there: the close light counts for
  // far more than the wide. Lit evenly all round, the rim did not show where the stream was.
  float close = min(amount.y * 9.0, 3.0) * (1.0 - band);
  vec3 F0 = mix(uMetalA, uMetalB, band) * (1.0 - 0.5 * band) * (1.0 - grime * 0.58);
  F0 = mix(F0, F0 * 1.12 + 0.02, wear * 0.5);
  float rough = clamp(mix(uRough.x, uRough.y, band) + grime * 0.26 + roughVar - wear * 0.1, 0.06, 0.95);
  float aniso = mix(uRough.z * (1.0 - grime * 0.5), 0.55, band);
  vec3 metal = spec(N, V, ls, T, B, rough, aniso, F0) * m * 0.3 * warm;
  metal += spec(N, V, ls, T, B, min(1.0, rough * 2.2 + 0.2), aniso * 0.4, F0) * m * 0.22 * warm;
  metal += F0 * warm * m * (0.04 + 0.34 * toward * toward);
  metal += mix(uFlame, uPale, 0.55) * F0 * close * close * (0.5 + 0.9 * toward);
  // Where a leading end has just struck, the rim flares along a stretch of itself, and dies away.
  vec2 hit = (vAt - uFlare.yz) / (52.0 * uFrame.z);
  metal += mix(uHot, uPale, 0.7) * uFlare.x * exp(-dot(hit, hit)) * 1.5 * (1.0 - band);
  float mx = max(metal.r, max(metal.g, metal.b));
  if (mx > 1e-5) metal *= (1.0 - exp(-mx * 1.15)) / (mx * 0.955);
  metal = mix(metal, uPale, clamp((mx - 1.6) * 0.3, 0.0, 0.8));
  // The face: washed warm from where the stream is, and in the rim's shade on the side the light comes from.
  float grain = noise2(vAt * 1.7 / uUnit) - 0.5;
  vec2 from = L.xy / max(L.z, 0.2) * uFrame.y * 0.63;
  float shade = smoothstep(-1.4, 1.4, sdBox(vAt + from, uBox.zw - uRound.x - uFrame.y, max(uRound.y - uFrame.y, 0.0)));
  float inFrom = -sdBox(vAt, uBox.zw - uRound.x, uRound.y) / uFrame.z;
  float mostOnFace = mix(${PLATE_MOST.face.toFixed(2)}, ${PLATE_MOST.words.toFixed(2)}, smoothstep(7.0, 16.0, inFrom));
  vec3 wash = uFaceLit * 1.7 * min(lit, mostOnFace) * (0.6 + 0.5 * toward) * (1.0 + grain * 0.14) * (1.0 - 0.6 * shade);
  // The picture lies under glass at the foot of its window. Light reaches it past the window's wall, less of it
  // close under the wall on the side the light comes from.
  vec2 over = L.xy / max(L.z, 0.2) * uFrame.x * 2.2;
  float reach = 1.0 - smoothstep(-2.0, 2.0, sdBox(vAt - uWin.xy + over, uWin.zw, 0.5));
  vec3 print = uFaceLit * 1.5 * min(lit, ${PLATE_MOST.picture.toFixed(2)}) * (0.35 + 0.65 * reach) * (1.0 + grain * 0.1);
  vec3 col = mix(mix(metal, wash, face), print, picture);
  frag = vec4(col * cov, 0.0);
}`;

// ---- the posts and the rail: the buttons' metal, standing in the page, for the stream to meet
//
// Each is worked out as a surface with real form, as a height and the way it slopes, and lit by the same code the
// buttons are lit by (src/metal/shaders.ts): the room they reflect, the cursor, and with them the stream.

const FITTING = `
uniform vec3 uF0, uCopper, uPale, uHot, uFlame;
const vec3 INK = vec3(0.006, 0.005, 0.004);
float bell(float x){ return exp(-x * x); }
// N is the way the surface faces and T the way it was turned or brushed, both with y down the page. shade is how
// much of each light reaches the point past whatever stands round it: the room's, the cursor's and the stream's.
vec3 fitting(vec2 p, vec3 N, vec3 T, vec3 F0, float rough, float aniso, vec3 shade){
  vec3 V = vec3(0.0, 0.0, 1.0);
  // The metal's own code works with y up.
  vec3 n = vec3(N.x, -N.y, N.z), t0 = vec3(T.x, -T.y, T.z), t = normalize(t0 - n * dot(t0, n)), b = cross(n, t);
  // At rest it is dark metal in a dark room: enough to be found, and to be read as a made thing.
  vec3 col = (studio(reflect(-V, n), rough) * 0.75 + vec3(0.16, 0.14, 0.12) * 0.3) * F0 * shade.x;
  // The cursor: close, it flares. From across the screen it still finds the turning marks.
  vec3 Lv = vec3(uLamp.xy - p, uLamp.z);
  float away = length(Lv.xy);
  float lamp = uLampI * (2.6 / (1.0 + (away / (230.0 * uUnit)) * (away / (230.0 * uUnit))) + 0.45 / (1.0 + (away / (900.0 * uUnit)) * (away / (900.0 * uUnit))));
  vec3 Ll = normalize(vec3(Lv.x, -Lv.y, Lv.z));
  col += (spec(n, V, Ll, t, b, rough, aniso, F0) + spec(n, V, Ll, t, b, min(1.0, rough * 1.8 + 0.1), aniso * 0.5, F0) * 0.2) * lamp * 0.6 * vec3(1.0, 0.94, 0.86) * shade.y;
  // The stream: a long warm light lying beside it, low over the page.
  vec2 amount;
  vec3 Ls = streamLight(p, amount);
  float lit = (amount.y * 6.0 + amount.x * 8.0) * shade.z;
  vec3 ls = vec3(Ls.x, -Ls.y, Ls.z);
  vec3 warm = mix(uFlame, uHot, 0.5);
  float toward = max(dot(n, ls), 0.0);
  col += spec(n, V, ls, t, b, rough, aniso, F0) * min(lit, 4.0) * 0.26 * warm;
  col += spec(n, V, ls, t, b, min(1.0, rough * 2.2 + 0.2), aniso * 0.4, F0) * min(lit, 4.0) * 0.2 * warm;
  col += F0 * warm * min(lit, 3.5) * (0.035 + 0.3 * toward * toward);
  // Keep the hue as it gets bright, then let the heart of a highlight bleach to pale, as the buttons' do.
  float mx = max(col.r, max(col.g, col.b));
  if (mx > 1e-5) col *= (1.0 - exp(-mx * 1.15)) / (mx * 0.955);
  return mix(col, uPale, clamp((mx - 2.2) * 0.3, 0.0, 0.8));
}
vec3 fitting(vec2 p, vec3 N, vec3 T, vec3 F0, float rough, float aniso){ return fitting(p, N, T, F0, rough, aniso, vec3(1.0)); }
`;

export const STONE_BAKE_FRAG = `${HEAD}${STONE_BAKE}`;

// The sun stone, lit from its carving (stone.ts). The carving says which way each point faces, how high it stands,
// how shut in it is, how rubbed and how tarnished. Here it is lit by the room, the cursor and the stream, and each
// of the two moving lights throws real shadows across the carving, found by walking toward the light over the heights.
// Its eyes and its mouth go through to a hollow behind the face. From off to one side the far wall of each shows,
// as it would. Lit, the hollow glows in the stream's colors, hottest at its heart, and a little of that light spills
// onto the lids and the lips.
export const stoneFrag = (float: boolean) => `${HEAD}
${packing(float)}
in vec2 vP;
uniform vec4 uPost;        // its center, its radius, and 1, or -1 for the one that is the other in a mirror
uniform sampler2D uT0, uT1;
uniform float uLit;        // how far its face is lit from inside, 0 to 1
uniform vec3 uEmber;
out vec4 frag;
uniform float uSoft, uBand;   // read by the buttons' room
${CLIP}${LIT}${NOISE}${ROOM}${SPEC}${FITTING}${RAMP_OF}
const float FILL = ${(STONE.fill * 0.5).toFixed(3)}, TALL = ${STONE_TALL.toFixed(2)};
vec2 where(vec2 r){ return vec2(r.x, -r.y) * FILL + 0.5; }
// How much of a light reaches a point, the light being Ld away with y down the page. Each point starts its walk
// toward the light a different part of a step out: started together, the steps show as teeth along a shadow's edge.
float reach(vec2 r, float h, vec3 Ld, float start){
  float flat_ = length(Ld.xy);
  if (flat_ < 0.04) return 1.0;
  vec2 dir = Ld.xy / flat_ * vec2(uPost.w, 1.0);
  float climb = Ld.z / flat_, lit = 1.0;
  for (int i = 0; i < 9; i++){
    float t = 0.013 * (float(i) + 0.35 + start);
    lit = min(lit, clamp((h + t * climb - texture(uT0, where(r + dir * t)).b * TALL) / 0.014 + 1.0, 0.0, 1.0));
  }
  return lit;
}
void main(){
  vec2 q = vP - uPost.xy;
  float R = uPost.z, d = length(q);
  float cov = clamp(0.5 - (d - R) * uDpr, 0.0, 1.0);
  if (cov <= 0.0){ frag = vec4(0.0); return; }
  vec2 r = q / R * vec2(uPost.w, 1.0);
  vec4 t0 = texture(uT0, where(r)), t1 = texture(uT1, where(r));
  vec3 N = vec3((t0.xy * 2.0 - 1.0) * vec2(uPost.w, 1.0), 0.0);
  N.z = sqrt(max(1.0 - dot(N.xy, N.xy), 0.0));
  float h = t0.b * TALL, ao = t0.a, wear = t1.r, grime = t1.g, open = t1.b, near = t1.a;
  vec2 er = q / max(d, 1e-4);
  vec3 Lv = vec3(uLamp.xy - vP, uLamp.z);
  vec2 amount;
  vec3 Ls = streamLight(vP, amount);
  float start = hash2(floor(q * uDpr) + 0.5);
  float past = reach(r, h, Ls, start);
  vec3 shade = vec3(0.2 + 0.8 * ao, 1.9 * reach(r, h, normalize(Lv), start) * (0.45 + 0.55 * ao), 1.7 * past * (0.4 + 0.6 * ao));
  // Raised tops and edges are rubbed to bright, polished copper. The channels hold a dark patina.
  vec3 F0 = mix(uCopper, uF0, 0.25 + 0.75 * wear) * (1.0 + 0.4 * wear) * (1.0 - grime * 0.72);
  float rough = clamp(0.3 + 0.24 * grime - 0.21 * wear, 0.07, 0.9);
  vec3 col = fitting(vP, N, vec3(-er.y, er.x, 0.0), F0, rough, 0.2, shade);
  // The stream's light lands on the stone: the side toward it is flooded warm, most on what stands proud, and the
  // light dies away across the carving with the shadows it throws.
  float lit = amount.y * 6.0 + amount.x * 8.0;
  col += F0 * mix(uFlame, uHot, 0.5) * min(lit, 3.4) * past * (0.3 + 0.7 * ao) * (0.2 + 0.7 * wear);
  // The hollow behind the eyes and the mouth, seen past the edge of each: the eye stands over the middle of the screen.
  vec3 eye = vec3(uView.xy + uView.zw * 0.5 - vP, max(uView.z, uView.w) * 1.25);
  vec2 back = r - eye.xy / eye.z * vec2(uPost.w, 1.0) * 0.035;
  float through = smoothstep(0.3, 0.7, texture(uT1, where(back)).b);
  // The light is deep inside, so it is hottest at the heart of each opening and only embers at its edges, and the
  // upper lid keeps the top of it in shade.
  float heart = smoothstep(0.3, 0.9, textureLod(uT1, where(back + vec2(0.0, 0.012)), 3.2).b);
  float glow = uLit * uLit * (through * (0.05 + 0.62 * heart * heart) + (1.0 - through) * 0.24);
  vec3 hollow = INK * (1.0 + 2.0 * (1.0 - through)) + ramp(glow);
  col = mix(col, hollow, smoothstep(0.35, 0.65, open));
  // What spills out of them onto the lids, the cheeks, the lips and the tongue. It is this that shows the light
  // comes from inside: without it the eyes and the mouth were three flat shapes of light.
  float halo = max(near, textureLod(uT1, where(r), 3.6).a);
  col += ramp(uLit * uLit * halo * 0.85) * (0.25 + 2.8 * F0) * (1.0 - smoothstep(0.35, 0.65, open)) * (0.45 + 0.55 * ao);
  frag = vec4(min(col, vec3(1.0)) * cov, cov);
}`;

// The rail, seen from the front: a slim bar with a section to it. Along its top a round bead, polished, which the
// stream lies on. Below that a flat web set a little back, brushed along its length, with one fine line cut in and
// filled with enamel. Along its foot a smaller bead.
// Its ends are finished as a fine curtain rod's are. An outer end has a collar, turned: a bead, a cove, a wide ring
// with a line cut round it, a bead. Beyond the collar a blade: a leaf in outline, full near its root and drawn out
// to a point, its two faces rounded and meeting in a raised rib, like one of the stream's own shards grown large.
// An inner end, where the stream leaves the rail, stands no higher than the bar: two lines cut round it and a cap.
// The rail is carried on brackets. Each is a strap that hooks round the bar's foot, on a plate fixed flat to the
// page below the bar: a short blade of the same family, point down, with a rib. Nothing stands above the bar,
// where the stream runs.
// Everything is worked out in the rail's own directions, along it and across it, so the rail on the right is the
// one on the left in a mirror.
const RAIL_COLLAR = STREAM.work.finial.collar;
export const railFrag = (float: boolean) => `${HEAD}
${packing(float)}
in vec2 vP;
uniform vec4 uRail;        // the line down its middle: its high end, then its low end
uniform vec2 uRailSize;    // half its thickness, and a number that moves its marks
uniform vec4 uEnds;        // a blade's length and half its width, in halves of the thickness. Then whether the high end has one, and the low end
uniform vec3 uKeel;        // how far along from the high end each of the two brackets is, in halves of the thickness, and how large a bracket is against the rail's own. No brackets when that is nothing
out vec4 frag;
uniform float uSoft, uBand;   // read by the buttons' room
${CLIP}${LIT}${NOISE}${ROOM}${SPEC}${FITTING}
float dome(float x){ return sqrt(max(1.0 - x * x, 0.0)); }
// The collar's radius, a being how far out from the end of the bar.
float turned(float a){
  float r = 1.0 - 0.1 * dome((a - 0.575) / 0.175);
  r = max(r, 1.0 + 0.28 * dome((a - 0.2) / 0.2));
  r = max(r, 1.0 + 0.55 * pow(dome((a - 1.12) / 0.37), 0.6) - 0.07 * bell((a - 1.12) / 0.045));
  return max(r, 1.0 + 0.2 * dome((a - 1.62) / 0.13));
}
// A leaf's half width, u running from its root to its point: full a quarter of the way along, then drawn out.
float leaf(float u){ return u <= 0.0 || u >= 1.0 ? -0.2 : pow(sin(3.14159 * pow(u, 0.55)), 0.85); }
// An end with a blade. a runs outward from the end of the bar and c across. How high it stands and how far outside
// it this point is, with the dark of its cut line and how much of it is the blade.
float finish(float a, float c, out float sd, out float ink, out float part){
  float y = abs(c);
  ink = 0.0; part = 0.0;
  if (a < ${RAIL_COLLAR.toFixed(2)}){
    float r = turned(a);
    sd = max(y - r, -a);
    ink = smoothstep(0.06, 0.025, abs(a - 1.12)) + smoothstep(0.05, 0.02, abs(a - 0.4)) + smoothstep(0.05, 0.02, abs(a - 0.75));
    return 0.64 * r * dome(c / r);
  }
  float u = (a - ${RAIL_COLLAR.toFixed(2)}) / uEnds.x, w = uEnds.y * leaf(u), v = y / max(w, 0.01);
  sd = y - w;
  part = 1.0;
  // Two rounded faces, a bevel at the edge, and a rib down the middle that dies away toward the point.
  return 0.28 + 0.62 * pow(max(1.0 - v * v, 0.0), 0.55) * smoothstep(0.0, 0.1, u) + 0.4 * bell(y / 0.13) * smoothstep(0.02, 0.14, u) * (1.0 - 0.75 * u);
}
// The whole rail at a point: how high it stands, in halves of its thickness. sd: how far outside it the point is, in
// pixels. more: the dark of its cut lines, how much of it is the bar's web, and how much a blade or a bracket's plate.
float rail(vec2 p, out float sd, out vec3 more){
  vec2 a = uRail.xy, ab = uRail.zw - a;
  float len = length(ab), W = uRailSize.x, L = len / W;
  vec2 e = ab / len, n = e.x >= 0.0 ? vec2(e.y, -e.x) : vec2(-e.y, e.x);
  vec2 q = (p - a) / W;
  float along = dot(q, e), c = dot(q, n), ink, part;
  more = vec3(0.0);
  float h = 0.0;
  sd = 1e3;
  float out_ = along < 0.0 ? -along : along - L;
  if (out_ > 0.0 && (along < 0.0 ? uEnds.z : uEnds.w) > 0.5){
    h = finish(out_, c, sd, ink, part);
    more = vec3(ink, 0.0, part);
  } else {
    // The bar, and past an end with no blade a cap that rounds it off.
    float cap = max(out_, 0.0) / 0.5, round_ = dome(min(cap, 1.0));
    sd = max(abs(c) - (0.72 + 0.28 * round_), (cap - 1.0) * 0.5);
    float top = smoothstep(0.16, 0.24, c), foot = 1.0 - smoothstep(-0.6, -0.52, c);
    h = (0.12 + 0.4 * dome(clamp((c - 0.6) / 0.4, -1.0, 1.0)) * top + 0.16 * dome(clamp((c + 0.78) / 0.22, -1.0, 1.0)) * foot) * (0.35 + 0.65 * round_);
    h -= 0.05 * smoothstep(0.1, 0.05, abs(c + 0.2)) * step(out_, 0.0);
    // Two lines cut round an end with no blade.
    float lines = (along < 0.0 ? uEnds.z : uEnds.w) > 0.5 ? 0.0 : smoothstep(0.07, 0.03, abs(L - along - 0.55)) + smoothstep(0.07, 0.03, abs(L - along - 1.05));
    more = vec3(max(smoothstep(0.06, 0.04, abs(c + 0.2)) * step(out_, 0.0), lines), (1.0 - top) * (1.0 - foot) * step(out_, 0.0), 0.0);
  }
  // The brackets, below the bar.
  if (uKeel.z > 0.0 && c < -0.42){
    for (int i = 0; i < 2; i++){
      float s = abs(along - (i == 0 ? uKeel.x : uKeel.y)), k = uKeel.z, down = (-c - 0.9) / (3.3 * k);
      float w = 1.05 * k * leaf(0.2 + 0.8 * down) * step(0.0, down);
      float plate = max(s - w, -c - 0.9 - 3.3 * k), strap = max(s - 0.82, max(-c - 1.48, c + 0.44)) - 0.12;
      if (plate < min(sd, 0.0) && c < -0.95){
        sd = plate;
        h = 0.2 + 0.36 * clamp(1.0 - s / max(w, 0.01), 0.0, 1.0);
        more = vec3(0.0, 0.0, 1.0);
      }
      if (strap < 0.0){
        sd = min(sd, strap);
        h = max(h, 0.2 + 0.52 * dome(s / 1.0) * dome(clamp((-c - 0.96) / 0.66, -1.0, 1.0)));
        more = vec3(smoothstep(0.06, 0.025, abs(s - 0.62)) * step(c, -0.5), 0.0, 0.0);
      }
    }
  }
  sd *= W;
  return h;
}
void main(){
  float sd, skip;
  vec3 more, m2;
  float h = rail(vP, sd, more);
  float cov = clamp(0.5 - sd * uDpr, 0.0, 1.0);
  if (cov <= 0.0){ frag = vec4(0.0); return; }
  float W = uRailSize.x, g = 0.75 / uDpr;
  vec2 slope = vec2(rail(vP + vec2(g, 0.0), skip, m2) - rail(vP - vec2(g, 0.0), skip, m2), rail(vP + vec2(0.0, g), skip, m2) - rail(vP - vec2(0.0, g), skip, m2)) * W / (2.0 * g);
  vec2 ab = uRail.zw - uRail.xy, e = normalize(ab), n = e.x >= 0.0 ? vec2(e.y, -e.x) : vec2(-e.y, e.x);
  vec2 q = vP - uRail.xy;
  float along = dot(q, e), across = dot(q, n), web = more.y, blade = more.z;
  // Brushed along its length: long fine streaks on the web. A blade is ground along its own length.
  float grain = (noise2(vec2(along * 0.05 / uUnit + uRailSize.y, across * 2.6 / uUnit)) - 0.5) + 0.5 * (noise2(vec2(along * 0.16 / uUnit, across * 6.0 / uUnit + uRailSize.y)) - 0.5);
  vec3 N = normalize(vec3(-slope - n * grain * 0.22 * web - n * grain * 0.1 * blade, 1.0));
  // Crests are rubbed bright: the top bead, the rings, a blade's ridge. Patina keeps to the web and the grooves.
  float wear = clamp(smoothstep(0.34, 0.9, h) * (1.0 - web) + blade * (0.15 + 0.85 * smoothstep(0.62, 0.95, h)), 0.0, 1.0);
  float grime = clamp(web * (0.5 + 0.4 * noise2(vec2(along * 0.02 / uUnit, uRailSize.y * 9.0))) + 0.5 * (1.0 - smoothstep(0.1, 0.36, h)) * (1.0 - web), 0.0, 1.0);
  vec3 F0 = mix(uCopper, uF0, 0.4 + 0.55 * wear) * (1.0 - grime * 0.45);
  float rough = clamp(0.27 + 0.2 * grime - 0.16 * wear, 0.08, 0.9);
  vec3 col = fitting(vP, N, vec3(e, 0.0), F0, rough, 0.8 - 0.35 * blade);
  col = mix(col, INK + col * 0.05, clamp(more.x, 0.0, 1.0) * 0.95);
  frag = vec4(min(col, vec3(1.0)) * cov, cov);
}`;

// ---- shards

export const SHARD_VERT = `${HEAD}
in vec3 aPos;
in vec3 aNormal;
in vec3 aEdge;
in float aTag;
in vec3 aBevel0, aBevel1, aBevel2;
in vec4 iPlace;   // x, y, z, size
in vec4 iTurn;    // which way it is turned, as a quaternion
in vec4 iCore;    // the nearest point of the core, and the way the core runs there
in vec4 iMore;    // its own random number, how much of the core's light reaches it, spare, how near the cursor is
uniform float uDeep;
out vec3 vP, vN, vEdge, vObj;
out float vTag;
flat out vec4 vCore, vMore;
flat out float vSize;
flat out vec3 vB0, vB1, vB2;
${CLIP}
vec3 turn(vec4 q, vec3 v){ return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
void main(){
  vec3 w = iPlace.xyz + turn(iTurn, aPos * iPlace.w);
  vP = w; vN = turn(iTurn, aNormal); vEdge = aEdge * iPlace.w; vObj = aPos; vTag = aTag;
  vCore = iCore; vMore = iMore; vSize = iPlace.w;
  vB0 = turn(iTurn, aBevel0); vB1 = turn(iTurn, aBevel1); vB2 = turn(iTurn, aBevel2);
  gl_Position = clip(w.xy, -w.z / uDeep);
}`;

export const SHARD_LIGHT = `
in vec3 vP, vN, vEdge, vObj;
in float vTag;
flat in vec4 vCore, vMore;
flat in float vSize;
flat in vec3 vB0, vB1, vB2;
uniform float uUnit, uDpr;
uniform vec3 uLamp;
uniform float uLampI;
uniform vec3 uPale;
float ggx(float nh, float a){ float a2 = a * a, d = nh * nh * (a2 - 1.0) + 1.0; return a2 / (3.14159 * d * d); }
const vec3 V = vec3(0.0, 0.0, 1.0);
// The core as the shard sees it. It is a long line of light, so what a mirror shows of it is not a spot but a
// band across the face, and the band slides over the face as the shard turns. This gives how much of the core's light
// arrives, which way it comes from, and coreBand() how squarely a face looking N mirrors it to the eye.
vec3 coreFrom(out float fall, out vec3 plane){
  vec3 C = vec3(vCore.xy, 0.0) - vP, T = vec3(vCore.zw, 0.0);
  vec3 across = C - T * dot(C, T);
  float near = length(across);
  vec3 toward = across / max(near, 1e-3);
  fall = vMore.y * 2.2 / (1.0 + pow(near / (14.0 * uUnit), 1.5));
  plane = normalize(cross(T, toward));
  return toward;
}
float coreBand(vec3 N, vec3 toward, vec3 plane, float wide){
  vec3 R = reflect(-V, N);
  float off = dot(R, plane);
  return exp(-off * off / (wide * wide)) * smoothstep(-0.2, 0.35, dot(R, toward));
}
float lampLight(out vec3 Ll){
  vec3 Lv = vec3(uLamp.xy - vP.xy, uLamp.z - vP.z);
  Ll = normalize(Lv);
  return uLampI * (0.5 + 1.6 * vMore.w) / (1.0 + pow(length(Lv.xy) / (150.0 * uUnit), 2.0));
}
// A dark room with one soft warm panel above and a dim one low on the other side: what a shard mirrors when it
// faces neither the core nor the cursor.
float room(vec3 R){
  vec2 d = vec2(R.x, -R.y) / max(R.z + 0.4, 0.25);
  float key = smoothstep(0.1, 0.5, d.y) * (1.0 - smoothstep(0.9, 1.5, d.y)) * (1.0 - smoothstep(0.5, 1.2, abs(d.x + 0.3)));
  float low = smoothstep(-0.3, -0.7, d.y) * (1.0 - smoothstep(0.4, 1.3, abs(d.x - 0.5)));
  return 0.02 + 0.34 * key + 0.1 * low;
}
float edgeLine(float wide){
  float e = min(vEdge.x, min(vEdge.y, vEdge.z));
  return 1.0 - smoothstep(wide * 0.35, wide, e);
}
// Where two faces of a facet meet there is a bevel too fine to see, looking halfway between them. This gives the
// bevel of the edge nearest this point, and how much of a hairline along that edge the point is in.
// How far out toward a point of the facet this is: nothing through its body, 1 at its farthest tip.
float tipAt(){ return pow(smoothstep(0.68, 1.0, length(vObj)), 3.0); }
vec3 bevelAt(out float line){
  line = edgeLine(1.15 / uDpr + 0.12);
  vec3 b = vEdge.x <= vEdge.y && vEdge.x <= vEdge.z ? vB0 : (vEdge.y <= vEdge.z ? vB1 : vB2);
  return normalize(b);
}
`;

// A solid facet. Every face is a flat mirror of dark metal, the same metal as the buttons. The core is a line, so a
// face shows either none of it or all of it: it is dark until it turns to the light, and then the whole face flashes.
// Nothing is drawn on the surface. What there is to find is in the light: each face its own tone, a hairline where
// the bevel of an edge catches the core, and a glint on the points.
export const SOLID_FRAG = `${HEAD}
uniform vec3 uF0, uCopper;
out vec4 frag;
${SHARD_LIGHT}
void main(){
  vec3 N = normalize(vN);
  float fall, line;
  vec3 plane, Ll;
  vec3 toward = coreFrom(fall, plane);
  float lampI = lampLight(Ll);
  vec3 B = bevelAt(line);
  float flash = coreBand(N, toward, plane, 0.2) * 9.0;
  float sheen = coreBand(N, toward, plane, 0.34) * 0.45;
  float turned = max(dot(N, toward), 0.0);
  // The cursor is a small light, so a flat face mirrors it only when it lines up almost exactly. Turned toward it,
  // a few faces flash and the rest only warm, and the faces beside them stay dark: the shape is never lost.
  float lamp = (ggx(max(dot(N, normalize(Ll + V)), 0.0), 0.1) * 0.11 + 0.07) * max(dot(N, Ll), 0.0) * lampI;
  float light = room(reflect(-V, N)) * (0.16 + 0.6 * min(fall, 1.0)) + fall * (flash + sheen + 0.06 * turned + 0.03) + 0.015 + lamp;
  float edge = fall * (coreBand(B, toward, plane, 0.45) * 3.4 + 0.1) + (ggx(max(dot(B, normalize(Ll + V)), 0.0), 0.22) * 0.35 + 0.1) * max(dot(B, Ll), 0.0) * lampI + 0.03;
  light = mix(light, max(light, edge), line) + tipAt() * (1.8 * fall + 0.6 * lampI);
  vec3 col = mix(uCopper, uF0, 0.3 * clamp(light - 0.6, 0.0, 1.0)) * vec3(1.0, 0.92, 0.8) * light * 1.35;
  // Keep the hue as it gets bright, then let the heart of a flash bleach to pale, as the buttons' highlights do.
  float mx = max(col.r, max(col.g, col.b));
  col *= (1.0 - exp(-mx * 1.15)) / (mx * 0.955 + 1e-5);
  col = mix(col, uPale, clamp((light - 1.7) * 0.4, 0.0, 0.85));
  frag = vec4(col, 1.0);
}`;

// A clear facet: the same shape, carrying light and not throwing it back. What is behind it shows through, dimmed and
// moved a little by each flat face. It holds light through its body: each face its own amount, most in the faces
// turned from the core, where the light that came in on the near side comes back out, and deepest in the middle of a
// face. It is brightest on its edges. All of its light is an amount, colored by the ramp, and its parts are joined by
// keeping the brighter, never by adding, so it cannot leave the warm range.
export const CLEAR_FRAG = `${HEAD}
uniform sampler2D uScene;
uniform vec2 uRes;
uniform vec3 uEmber, uFlame, uHot;
out vec4 frag;
${SHARD_LIGHT}
vec3 ramp(float a){
  vec3 c = uEmber * clamp(a / 0.11, 0.0, 1.0);
  c = mix(c, uFlame, smoothstep(0.07, 0.42, a));
  c = mix(c, uHot, smoothstep(0.34, 0.85, a));
  c = mix(c, uPale, smoothstep(0.7, 1.6, a));
  return c;
}
void main(){
  vec3 N = normalize(vN);
  float fall, line;
  vec3 plane, Ll;
  vec3 toward = coreFrom(fall, plane);
  float lampI = lampLight(Ll);
  vec3 B = bevelAt(line);
  vec2 shift = N.xy * vSize * 0.9;
  vec4 mid = texture(uScene, gl_FragCoord.xy / uRes + vec2(shift.x, -shift.y) * uDpr / uRes);
  vec3 col = mid.rgb * vec3(0.8, 0.74, 0.66);
  // How deep into the face this is: nothing at its edge, 1 in its middle. Looking through the middle of a face the
  // eye passes through the most of the piece, and that is where the light it holds shows.
  float deep = pow(smoothstep(0.0, 0.34 * vSize, min(vEdge.x, min(vEdge.y, vEdge.z))), 1.3);
  float away = 0.5 - 0.5 * dot(N, toward);
  float graze = pow(1.0 - abs(N.z), 3.0);
  // Light spreads inside it, so what it holds falls off with distance more slowly than what a solid face is lit by.
  float held = min(sqrt(fall), 1.2) * (0.16 + 0.5 * pow(away, 1.5) + 0.08 * graze) + 0.22 * lampI * max(dot(N, Ll), 0.0);
  // Somewhere inside each face the core shows, wide and soft, as it would in a lens.
  held += 0.55 * fall * coreBand(N, toward, plane, 0.36);
  held = 0.8 * (1.0 - exp(-held * (0.22 + 0.78 * deep) / 0.42)) + 0.03 * room(reflect(-V, N));
  float toLamp = max(dot(B, Ll), 0.0);
  float glint = coreBand(N, toward, plane, 0.07) * 2.8 * fall + ggx(max(dot(N, normalize(Ll + V)), 0.0), 0.1) * max(dot(N, Ll), 0.0) * 0.1 * lampI;
  // It is brightest along its edges. Round its outline, where a face turns away from the eye, the edge is a step
  // brighter than the body beside it. A ridge between two faces that both look at the eye burns only where its bevel
  // catches the core or the cursor: lit all the time, those ridges read as folds in paper.
  float rim = 1.0 - smoothstep(0.1, 0.55, B.z);
  float edge = (held * 1.5 + 0.1 * min(fall, 1.0)) * rim + fall * 2.8 * coreBand(B, toward, plane, 0.42) + lampI * 0.4 * toLamp * toLamp * toLamp;
  float point = tipAt() * (1.6 * fall + 0.7 * lampI);
  col = max(col, ramp(held));
  col = max(col, ramp(glint + point));
  col = mix(col, max(col, ramp(edge + point)), line);
  frag = vec4(min(col, uPale), clamp(mid.a + 0.1 + 0.6 * line * min(edge, 1.0) + 1.6 * held + glint, 0.0, 1.0));
}`;

// ---- the light, given its color and laid into the picture between the shards behind the core and those in front

export const lightFrag = (float: boolean) => `${HEAD}
${packing(float)}
in vec2 vUv;
uniform sampler2D uLight, uGlow;
uniform float uNear;
out vec4 frag;
${RAMP}${NOISE}
void main(){
  float sharp = texture(uLight, vUv).r;
  float a = sharp * sharp * ${LIGHT_MAX}.0 + UNPACK(texture(uGlow, vUv).rg).r * uNear;
  vec3 c = ramp(a);
  // This is written into 8 bits before the last pass, so it is dithered here, in the form it is stored in.
  c = pow(max(pow(c, vec3(1.0 / 2.2)) + dither(gl_FragCoord.xy), 0.0), vec3(2.2));
  frag = vec4(c, 0.0);
}`;

// ---- the last pass: the picture, the stream's light on the page with the shadows of the title and the card in it

// How many of each thing stand on the page for the stream to light. One card and nothing else is the test shot,
// and its shaders are then the test shot's, letter for letter.
// rails counts every straight solid that throws a shadow. drawn says whether any rail is drawn at all.
export interface Shapes { cards: number; posts: number; rails: number; plates?: number; drawn?: number }
const plain = (n: Shapes) => n.cards <= 1 && !n.posts && !n.rails;

const RAIL_FIELD = `
float sdRail(vec2 p, vec4 r, float thick){ vec2 e = r.zw - r.xy; float k = clamp(dot(p - r.xy, e) / dot(e, e), 0.0, 1.0); return length(p - r.xy - e * k) - thick; }
`;

export const finalFrag = (float: boolean, n: Shapes = { cards: 1, posts: 0, rails: 0 }) => `${HEAD}
${packing(float)}
in vec2 vUv;
uniform sampler2D uScene;
${plain(n) ? `uniform vec4 uCard;
uniform float uCardR, uPage, uRelief;` : `uniform vec4 uCards[${Math.max(1, n.cards)}];
uniform float uCardRs[${Math.max(1, n.cards)}];
uniform vec3 uPosts[${Math.max(1, n.posts)}];
uniform vec4 uRails[${Math.max(1, n.rails)}];
uniform float uRailHalves[${Math.max(1, n.rails)}];
uniform float uPage, uRelief;
uniform sampler2D uMask;   // how much of each pixel a project card covers`}
out vec4 frag;
${CLIP}${LIT}${RAMP}${NOISE}${TITLE_FIELD}${plain(n) ? '' : RAIL_FIELD}
float shapes(vec2 p){
  ${plain(n) ? 'float d = sdBox(p - uCard.xy, uCard.zw, uCardR);' : `float d = 1e6;
  for (int i = 0; i < ${n.cards}; i++) d = min(d, sdBox(p - uCards[i].xy, uCards[i].zw, uCardRs[i]));
  for (int i = 0; i < ${n.posts}; i++) d = min(d, length(p - uPosts[i].xy) - uPosts[i].z);
  for (int i = 0; i < ${n.rails}; i++) d = min(d, sdRail(p, uRails[i], uRailHalves[i]));`}
  if (p.x > uSdfRect.x - 90.0 && p.x < uSdfRect.x + uSdfRect.z + 90.0 && p.y > uSdfRect.y - 90.0 && p.y < uSdfRect.y + uSdfRect.w + 90.0) d = min(d, titleFar(p));
  return d;
}
void main(){
  vec4 scene = texture(uScene, vUv);
  vec2 p = uView.xy + vec2(vUv.x, 1.0 - vUv.y) * uView.zw;
  vec2 light;
  vec3 L = streamLight(p, light);
  float amount = light.x + light.y * 0.35;
  // The title and the card stand in the stream's light and throw soft shadows away from it across the page.
  float shade = 1.0;
  if (uRelief > 0.5 && amount > 0.002 && shapes(p) < 60.0 * uUnit){
    vec2 dir = L.xy / max(length(L.xy), 1e-4) * smoothstep(0.02, 0.3, length(L.xy));
    float reach = 34.0 * uUnit;
    for (int i = 1; i <= 6; i++){
      float t = reach * float(i) / 6.0;
      shade = min(shade, clamp(shapes(p + dir * t) / (t * 0.42) + 0.5, 0.0, 1.0));
    }
    shade = mix(1.0, shade, smoothstep(0.02, 0.3, length(L.xy)));
  }
  // The page is not a mirror: its grain shows only where light falls on it.
  float grain = noise2(p * 2.3 / uUnit) * 0.6 + hash2(floor(p * uDpr)) * 0.4;
  vec3 page = ramp(amount * uPage * mix(0.16, 1.0, shade)) * (0.8 + 0.4 * grain);${plain(n) ? '' : `
  // A project card is not the page: its own light is laid on it elsewhere.
  page *= 1.0 - texture(uMask, vUv).r;`}
  vec3 col = scene.rgb + page * (1.0 - scene.a);
  col = max(pow(min(col, uPale), vec3(1.0 / 2.2)) + dither(gl_FragCoord.xy), 0.0);
  // Light is laid over the page, not added to it: WebKit throws away any color brighter than its own alpha, so every
  // pixel of light carries the alpha of its brightest channel. Over a page this dark the two look the same.
  frag = vec4(col, max(scene.a, max(col.r, max(col.g, col.b))));
}`;
