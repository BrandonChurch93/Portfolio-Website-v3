// GLSL for the stream. WebGL2.
// Positions are CSS pixels of the page, y down, z toward the eye. uView is the part of the page the canvas covers:
// left, top, width, height. Lengths that set the look are in stream units (uUnit CSS pixels each).
//
// Everything that glows is drawn first as an amount of light, into a buffer that keeps the larger where two things
// overlap, and is given its color once, by ramp(). Shards are solid and are lit, never tinted.

// How bright the light buffer can go. It is stored as a square root so faint light keeps its steps.
export const LIGHT_MAX = 4;
// Half the width of the ribbon the core is drawn on, in units.
export const CORE_HALF = 34;

const HEAD = `#version 300 es
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

const NOISE = `
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
uniform float uTime, uEnergy;
uniform vec2 uOwn;   // a shift that gives each side its own strands, and where along the route they begin
out vec4 frag;
${NOISE}
void main(){
  float x = vAlong.x, lead = vAlong.z, t = uTime;
  float begun = smoothstep(uOwn.y, uOwn.y + 34.0, vAlong.y), s = vAlong.y + uOwn.x;
  // It has a rhythm. Every few hundred units it gathers into a knot, thin and fierce, and between the knots it
  // opens into a loose braid of fine strands with almost nothing at its middle. Knots and braids travel slowly
  // down it. A line of one width and one brightness is a tube. This is never the same for long.
  float beat = 0.5 + 0.5 * sin(s / 52.0 - t * 0.3 + 0.9 * sin(s / 131.0 - t * 0.11));
  float tip = smoothstep(0.0, 110.0, lead);
  float open = smoothstep(0.0, 0.3, beat) * tip;
  float sum = 0.0;
  // Veils: three wide, faint ribbons of light that drift across the braid and feather its edge.
  for (int j = 0; j < 3; j++){
    float f = float(j), a = hash1(f + 31.0), b = hash1(f + 37.3), c = hash1(f + 43.9);
    float turn = s / mix(22.0, 46.0, b) + c * 6.283 + t * mix(-0.3, 0.3, a);
    float off = mix(4.0, 10.0, a) * open * sin(turn);
    float w = mix(2.6, 6.0, c) * (0.45 + 0.55 * open) * (1.0 + 0.3 * cos(turn));
    float life = 0.3 + 0.7 * smoothstep(-0.2, 0.7, sin(s / mix(70.0, 150.0, a) + f * 2.1 - t * 0.25));
    float d = (x - off) / w;
    sum += mix(0.05, 0.15, b) * life * exp(-d * d) * begun;
  }
  // Hairs: fine bright strands that swing out and cross back over the middle every few lengths of a shard, each
  // coming and going. None of them runs beside another for long, which is what would make it wire.
  for (int j = 0; j < ${strands}; j++){
    float f = float(j), a = hash1(f + 1.0), b = hash1(f + 7.3), c = hash1(f + 13.9), e = hash1(f + 21.7);
    float turn = s / mix(9.0, 24.0, b) + c * 6.283 + t * mix(-0.5, 0.5, e);
    float amp = mix(4.0, 16.0, a) * open;
    float off = amp * sin(turn) + amp * 0.3 * sin(s / mix(5.0, 9.0, c) + a * 6.283 - t * 0.7);
    float depth = cos(turn);
    // A strand passing behind is softer and dimmer than one passing in front.
    float w = mix(0.45, 0.85, e) * (1.25 - 0.4 * depth);
    float life = 0.25 + 0.75 * smoothstep(-0.3, 0.7, sin(s / mix(40.0, 110.0, a) + f * 2.4 - t * 0.33));
    float level = mix(0.34, 0.8, b) * life * (0.5 + 0.5 * depth);
    float d = (x - off) / w;
    sum += level * exp(-d * d) * begun;
  }
  // The heart of it: fierce in a knot, where its light falls away slowly through hot and flame to ember with no
  // edge, and only one strand among the others where the braid is open.
  float w0 = mix(1.5, 0.75, open);
  float q = x / w0;
  sum += mix(3.0, 0.8, open) / pow(1.0 + q * q, 1.6);
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
uniform vec3 uText, uEmber, uPale;
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
  float lit = amount.y * 6.0 + amount.x * 9.0;
  float face = max(dot(N, L), 0.0);
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  // Unlit it is a calm warm grey, easy to read. Where the stream is close it comes up to full and warms, and the
  // edges that face the stream burn.
  vec3 col = uText * 0.34;
  col += mix(uText, uPale, 0.7) * min(lit, 1.5) * (0.1 + 0.6 * face);
  col += uPale * pow(max(dot(N, H), 0.0), 10.0) * min(lit, 3.0) * 1.3 * edge;
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
  face += uFaceLit * 1.7 * min(lit, 3.5) * (0.25 + 1.2 * max(dot(N, L), 0.0)) * (1.0 + grain * 0.14);
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
in vec4 iPlace;   // x, y, z, size
in vec4 iTurn;    // which way it is turned, as a quaternion
in vec4 iCore;    // the nearest point of the core, and the way the core runs there
in vec4 iMore;    // its own random number, how much of the core's light reaches it, spare, how near the cursor is
uniform float uDeep;
out vec3 vP, vN, vEdge, vObj;
out float vTag;
flat out vec4 vCore, vMore;
flat out float vSize;
${CLIP}
vec3 turn(vec4 q, vec3 v){ return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
void main(){
  vec3 w = iPlace.xyz + turn(iTurn, aPos * iPlace.w);
  vP = w; vN = turn(iTurn, aNormal); vEdge = aEdge * iPlace.w; vObj = aPos; vTag = aTag;
  vCore = iCore; vMore = iMore; vSize = iPlace.w;
  gl_Position = clip(w.xy, -w.z / uDeep);
}`;

const SHARD_LIGHT = `
in vec3 vP, vN, vEdge, vObj;
in float vTag;
flat in vec4 vCore, vMore;
flat in float vSize;
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
  fall = vMore.y * 1.6 / (1.0 + near / (18.0 * uUnit));
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
`;

// Copper leaf. The same metal as the buttons, and like them a mirror: each facet of the crumpled leaf shows either
// the core, as a bright band that slides across it as it turns, or the dark of the room. There is almost nothing
// between the two, and that jump from facet to facet is what makes it metal and not paper.
export const COPPER_FRAG = `${HEAD}
uniform vec3 uF0, uCopper;
out vec4 frag;
${SHARD_LIGHT}
void main(){
  vec3 N = normalize(vN);
  float fall, lampI;
  vec3 plane, Ll;
  vec3 toward = coreFrom(fall, plane);
  lampI = lampLight(Ll);
  float glint = coreBand(N, toward, plane, 0.2) * 6.0;
  float sheen = coreBand(N, toward, plane, 0.62) * 1.3;
  float nll = max(dot(N, Ll), 0.0);
  float lamp = (ggx(max(dot(N, normalize(Ll + V)), 0.0), 0.2) * 0.7 + 0.05) * nll * lampI;
  float light = room(reflect(-V, N)) * (0.3 + 0.7 * min(fall, 1.0)) + fall * (glint + sheen + 0.03) + lamp;
  // A torn edge is bare metal: a thin line of it shows where the light reaches.
  float line = edgeLine(1.1 / uDpr + 0.2) * (1.0 - vTag);
  light += line * (0.02 + 0.3 * fall * (0.3 + sheen) + 0.5 * lampI);
  // Seen edge on, a leaf is a hair of metal, dim but never black against the glow.
  light = mix(light, 0.06 * fall + light * 0.5, vTag);
  vec3 col = mix(uCopper, uF0, 0.3 * clamp(light - 0.6, 0.0, 1.0)) * vec3(1.0, 0.92, 0.8) * light * 1.35;
  // Keep the hue as it gets bright, then let the heart of a highlight bleach to pale, as the buttons' highlights do.
  float mx = max(col.r, max(col.g, col.b));
  col *= (1.0 - exp(-mx * 1.15)) / (mx * 0.955 + 1e-5);
  col = mix(col, uPale, clamp((light - 1.7) * 0.4, 0.0, 0.85));
  frag = vec4(col, 1.0);
}`;

// Glass. On a dark page a piece of glass is invisible but for three things: its broken edges, which carry light,
// the bright thing behind it, which it shifts, and the glint of a light it mirrors. Its body is left almost clear.
export const glassFrag = (split: boolean) => `${HEAD}
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
  float band = vTag;
  // What is behind it, seen where the glass bends the eye's line to. Its faces are a little rounded, so the core
  // behind a splinter is not just moved but bent.
  vec2 shift = N.xy * vSize * mix(1.5, 2.4, band);
  vec2 uv = gl_FragCoord.xy / uRes, to = vec2(shift.x, -shift.y) * uDpr / uRes;
  vec4 mid = texture(uScene, uv + to);
  vec3 col = mid.rgb;
  float alpha = mid.a;
  ${split ? `
  // It splits what it bends, but only within the warm range: flame on one side, hot on the other.
  vec3 inner = texture(uScene, uv + to * 0.7).rgb, outer = texture(uScene, uv + to * 1.34).rgb;
  float lm = dot(mid.rgb, vec3(0.4, 0.45, 0.15)), li = dot(inner, vec3(0.4, 0.45, 0.15)), lo = dot(outer, vec3(0.4, 0.45, 0.15));
  col = col * 0.7 + (inner + outer) * 0.15 + uFlame * max(lo - lm, 0.0) * 0.9 + uHot * max(li - lm, 0.0) * 0.6;` : ''}
  col *= vec3(0.98, 0.95, 0.9);
  float fall, lampI;
  vec3 plane, Ll;
  vec3 toward = coreFrom(fall, plane);
  lampI = lampLight(Ll);
  float fres = 0.04 + 0.96 * pow(1.0 - abs(N.z), 5.0);
  // The glint: glass is smooth, so it mirrors the core as a thin hard line and the cursor as a point.
  float glint = coreBand(N, toward, plane, 0.05) * 2.2 * fall * (0.3 + 0.7 * fres + 0.5 * band);
  glint += ggx(max(dot(N, normalize(Ll + V)), 0.0), 0.08) * max(dot(N, Ll), 0.0) * 0.06 * lampI;
  // The light it carries shows on its broken edges, each by how squarely it faces the core: the near edge of a
  // splinter burns and the far edge is almost dark. That difference is what stops it reading as a drawn outline.
  float facing = pow(max(dot(N, toward), 0.0), 1.4);
  float carried = fall * (0.15 + 0.85 * facing) + 0.6 * lampI * max(dot(N, Ll), 0.0);
  float line = edgeLine(0.85 / uDpr + 0.1) * band;
  // Each part takes its color from its own amount of light and is laid in by how much of the pixel it covers,
  // so a thin edge stays pale and does not redden as it thins.
  float faceLight = 0.01 + 0.22 * room(reflect(-V, N)) + fall * 0.05 * fres;
  float bandLight = 0.05 + 1.3 * carried;
  col += ramp(mix(faceLight, bandLight, band)) * (1.0 - line) + ramp(0.3 + 3.4 * carried) * line + ramp(glint);
  frag = vec4(min(col, uPale), clamp(alpha + 0.04 + line * 0.6 + band * 0.3 + glint, 0.0, 1.0));
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
  col = pow(min(col, uPale), vec3(1.0 / 2.2)) + dither(gl_FragCoord.xy);
  frag = vec4(col, scene.a);
}`;
