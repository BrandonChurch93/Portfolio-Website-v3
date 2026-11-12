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

const RAMP = `
uniform vec3 uEmber, uFlame, uHot, uPale;
// An amount of light to its color: nothing, ember, flame, hot, pale. Never white, and it fades all the way to nothing.
vec3 ramp(float a){
  vec3 c = uEmber * clamp(a / 0.11, 0.0, 1.0);
  c = mix(c, uFlame, smoothstep(0.07, 0.42, a));
  c = mix(c, uHot, smoothstep(0.34, 0.85, a));
  c = mix(c, uPale, smoothstep(0.7, 1.6, a));
  return c;
}
`;

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

export const coreFrag = (strands: number) => `${HEAD}
in vec3 vAlong;
uniform float uTime, uEnergy, uHeart, uBody;
uniform vec2 uOwn;   // a shift that gives each side its own strands, and where along the route they begin
out vec4 frag;
${NOISE}
void main(){
  float x = vAlong.x, lead = vAlong.z, t = uTime;
  float begun = smoothstep(uOwn.y, uOwn.y + 34.0, vAlong.y), s = vAlong.y + uOwn.x;
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
  sum += 0.1 * uBody * smoothstep(span + 2.6, span * 0.55, abs(x)) * (0.35 + 0.65 * abs(face)) * begun;
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
  float flash = coreBand(N, toward, plane, 0.22) * 8.0;
  float sheen = coreBand(N, toward, plane, 0.5) * 1.0;
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
  // An edge burns only where its bevel catches the core or the cursor. The rest are left to the body beside them, so
  // the piece is never an outline.
  float edge = fall * 2.8 * coreBand(B, toward, plane, 0.42) + lampI * 0.4 * toLamp * toLamp * toLamp;
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

export const finalFrag = (float: boolean) => `${HEAD}
${packing(float)}
in vec2 vUv;
uniform sampler2D uScene;
uniform vec4 uCard;
uniform float uCardR, uPage, uRelief;
out vec4 frag;
${CLIP}${LIT}${RAMP}${NOISE}${TITLE_FIELD}
float shapes(vec2 p){
  float d = sdBox(p - uCard.xy, uCard.zw, uCardR);
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
  vec3 page = ramp(amount * uPage * mix(0.16, 1.0, shade)) * (0.8 + 0.4 * grain);
  vec3 col = scene.rgb + page * (1.0 - scene.a);
  col = max(pow(min(col, uPale), vec3(1.0 / 2.2)) + dither(gl_FragCoord.xy), 0.0);
  // Light is laid over the page, not added to it: WebKit throws away any color brighter than its own alpha, so every
  // pixel of light carries the alpha of its brightest channel. Over a page this dark the two look the same.
  frag = vec4(col, max(scene.a, max(col.r, max(col.g, col.b))));
}`;
