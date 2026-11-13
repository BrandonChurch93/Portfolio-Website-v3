// GLSL for the plate renderer. WebGL2.
// Coordinates inside a plate are device pixels from the top left. The bake runs once per plate size and writes
// everything that does not depend on the lamp; the light pass runs when the lamp, the scroll or the stream change.

export const VERT = `#version 300 es
in vec2 a;
void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

const COMMON = `
precision highp float;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
float sdBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
`;

// The window a picture sits in. A card's window may have other corners at its foot than at its head.
const WINDOW = `
uniform vec4 uWin;           // center x, y, half w, half h (device px)
uniform float uWinOn, uWinR, uWinRb, uWinDepth;
float winD(vec2 p){ vec2 q = p - uWin.xy; return sdBox(q, uWin.zw, q.y > 0.0 ? uWinRb : uWinR); }
`;

// ---- bake --------------------------------------------------------------------------------------

export const BAKE = `#version 300 es
${COMMON}
uniform sampler2D uSdf;      // r: words and lines, g: panel. Signed distance in device px, negative inside.
uniform vec2 uRes;           // plate size, device px
uniform float uS;            // device px per design unit
uniform float uRad, uInset, uThick, uBevel;
uniform int uFinish;         // 0 aged, 1 polished, 2 bronze, 3 panel, 4 card
uniform float uCutDepth, uCutWall, uPanelDepth, uRaise;
uniform float uGrain, uPatina, uSeed, uScratch, uPillow;
uniform float uRimW;         // design units the tarnish reaches in from the edge
uniform float uFaceClean;    // 0 to 1: how free of tarnish the open face stays
uniform vec4 uScrew[6];      // x, y, radius, slot angle (below -5: rivet, no slot)
uniform float uBead, uBezel;  // a card's edge and the frame round its window, device px
uniform float uRim;          // a card's edge: 0 a thin half round bead, 1 a wide rim that turns in to a lower face
uniform vec4 uStrip;         // a card's band of bronze: center x, y, half w, half h. No band when its width is 0
float stripD(vec2 p){ return uStrip.z > 0.0 ? sdBox(p - uStrip.xy, uStrip.zw, 1.2 * uS) : 1e5; }
${WINDOW}layout(location = 0) out vec4 o0; // normal x, normal y, cavity, wear
layout(location = 1) out vec4 o1; // second metal, enamel, grime, rough offset

vec2 sdf(vec2 p){ return texture(uSdf, p / uRes).rg; }

float plateD(vec2 p){ return sdBox(p - uRes * 0.5, uRes * 0.5 - uInset, uRad); }

float scratches(vec2 p){
  if (uScratch <= 0.0) return 0.0;
  float s = 0.0;
  for (int i = 0; i < 36; i++){
    float fi = float(i) + uSeed * 7.0;
    vec2 c = vec2(hash(vec2(fi, 1.3)), hash(vec2(fi, 7.9))) * uRes;
    float ang = (hash(vec2(fi, 3.1)) - 0.5) * (hash(vec2(fi, 9.4)) > 0.75 ? 2.6 : 0.35);
    float len = (12.0 + 70.0 * pow(hash(vec2(fi, 5.5)), 2.0)) * uS;
    vec2 d = vec2(cos(ang), sin(ang));
    vec2 q = p - c;
    float t = clamp(dot(q, d), -len * 0.5, len * 0.5);
    float dist = length(q - d * t);
    float fade = 1.0 - pow(abs(t) / (len * 0.5), 2.0);
    s = max(s, exp(-dist * dist / (0.09 * uS * uS + 0.06)) * fade * (0.2 + 0.5 * hash(vec2(fi, 2.2))));
  }
  return s * uScratch;
}

float height(vec2 p){
  float d = plateD(p);
  float x = clamp(-d / uBevel, 0.0, 1.0);
  float h = uThick * sqrt(1.0 - (1.0 - x) * (1.0 - x));
  // A card's edge is a half round bead, or a wide rim: rounded on the outside, flat along its crest, and cut at a
  // slant on the inside down to the face. Inside either the face lies flat and lower.
  if (uFinish == 4){
    float e = clamp(-d / uBead, 0.0, 1.0);
    if (uRim > 0.5){ float o = 1.0 - clamp(e / 0.34, 0.0, 1.0); h = 0.42 * uBead * min(sqrt(max(1.0 - o * o, 0.0)), clamp((1.0 - e) / 0.44, 0.0, 1.0)); }
    else { float t = e * 2.0 - 1.0; h = 0.5 * uBead * sqrt(max(1.0 - t * t, 0.0)); }
  }
  // A small control has a gently domed face, so it reflects a gradient of the room instead of one flat tone.
  if (uPillow > 0.0){
    vec2 c = (p - uRes * 0.5) / (uRes * 0.5);
    h += uPillow * (1.0 - min(1.0, c.x * c.x * 0.35 + c.y * c.y)) * x;
  }
  vec2 m = sdf(p);
  float cutT = clamp(-m.r / uCutWall, 0.0, 1.0);
  float cut = cutT * cutT * (3.0 - 2.0 * cutT);
  if (uFinish == 0 || uFinish == 1){
    h -= uCutDepth * cut;
  } else if (uFinish == 2){
    // Brass set flush into bronze: no step at all; the two metals meet by color and gloss alone.
    // The bronze is cast, so its face carries a faint broad unevenness that makes highlights wander.
    h += (fbm(p / uS * 0.014 + uSeed) - 0.5) * 0.55 * uS;
  } else if (uFinish == 3){
    float panT = clamp(-m.g / (uCutWall * 1.6), 0.0, 1.0);
    h -= uPanelDepth * panT * panT * (3.0 - 2.0 * panT);
    // Letters stand proud. Small strokes are only a few pixels wide, so the wall is narrow and centered on the glyph
    // edge: what reads is a flat bright top with a crisp rim, never a hollow inline letter.
    float rT = clamp((-m.r + 0.5) / max(0.5 * uS, 0.7) + 0.5, 0.0, 1.0);
    h += uRaise * 0.6 * rT * rT * (3.0 - 2.0 * rT) * panT;
  }
  h -= scratches(p) * 0.12 * uS;
  if (uWinOn > 0.5){
    float dw = winD(p);
    // A card's window has a flat topped frame with a chamfer on each side.
    if (uFinish == 4) h = max(h, 1.5 * uS * smoothstep(uBezel + 0.5 * uS, uBezel - 0.7 * uS, dw) * smoothstep(-0.3 * uS, 0.9 * uS, dw));
    else h += 1.4 * uS * smoothstep(9.0 * uS, 6.0 * uS, dw) * smoothstep(-0.6 * uS, 1.6 * uS, dw);
    h -= uWinDepth * clamp(-dw / (2.0 * uS), 0.0, 1.0);
  }
  // The band stands a little proud of the face, with a chamfer, and is cast, so its face is faintly uneven.
  if (uFinish == 4 && uStrip.z > 0.0){
    float ds = stripD(p);
    h = max(h, (1.1 * uS + (fbm(p / uS * 0.014 + uSeed) - 0.5) * 0.5 * uS) * smoothstep(0.4 * uS, -0.9 * uS, ds));
  }
  for (int i = 0; i < 6; i++){
    vec4 s = uScrew[i];
    if (s.z <= 0.0) continue;
    vec2 q = p - s.xy;
    float r = length(q) / s.z;
    if (r < 1.45){
      h -= smoothstep(1.42, 1.06, r) * 1.6 * uS;
      if (r < 1.0){
        h += 2.6 * uS * (1.0 - r * r * 0.82);
        if (s.w > -5.0){
          float y = abs(-q.x * sin(s.w) + q.y * cos(s.w)) / s.z;
          h -= smoothstep(0.19, 0.1, y) * smoothstep(0.98, 0.86, r) * 2.4 * uS;
        }
      }
    }
  }
  return h;
}

void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float e = 0.75;
  float hx = height(p + vec2(e, 0.0)) - height(p - vec2(e, 0.0));
  float hy = height(p + vec2(0.0, e)) - height(p - vec2(0.0, e));
  // y down in the plate, y up in the world: the normal's y takes the plate gradient as is.
  vec3 N = normalize(vec3(-hx, hy, 2.0 * e));

  vec2 q = p / uS;
  // Brushed grain: long thin streaks along x, in two scales, written into the normal's y.
  float g = (noise(vec2(q.x * 0.018 + uSeed, q.y * 2.6)) - 0.5) + (noise(vec2(q.x * 0.07, q.y * 6.3 + uSeed)) - 0.5) * 0.55;
  vec2 m = sdf(p);
  float inMetal2 = 0.0;
  float ink = 0.0;
  float cov = clamp(0.5 - m.r, 0.0, 1.0);
  if (uFinish == 0 || uFinish == 1) ink = cov;
  if (uFinish == 2) inMetal2 = cov;
  if (uFinish == 3) inMetal2 = clamp(0.5 - m.g, 0.0, 1.0) * (1.0 - cov);
  // A card's face is everything inside the bead but the window and its frame. It is not metal.
  float face = 0.0;
  float dwc = 1e5;
  if (uFinish == 4){
    if (uWinOn > 0.5) dwc = winD(p);
    float inStrip = clamp(0.5 - stripD(p), 0.0, 1.0) * clamp(-plateD(p) - uBead + 0.5, 0.0, 1.0);
    face = clamp(-plateD(p) - uBead + 0.5, 0.0, 1.0) * clamp(dwc - uBezel + 0.5, 0.0, 1.0) * (1.0 - inStrip);
    ink = face;
    inMetal2 = inStrip * clamp(dwc - uBezel + 0.5, 0.0, 1.0);
  }
  float blast = (uFinish == 3) ? inMetal2 : 0.0;
  vec2 bead = vec2(noise(q * 1.9 + 3.0) - 0.5, noise(q * 1.9 + 11.0) - 0.5) + vec2(hash(q * 5.3) - 0.5, hash(q * 5.3 + 4.0) - 0.5) * 0.6;
  float letterTop = (uFinish == 3) ? cov * clamp(0.5 - m.g, 0.0, 1.0) : 0.0;
  N = normalize(N + vec3(0.0, g * uGrain * mix(1.0, 0.35, inMetal2) * (1.0 - blast) * (1.0 - letterTop * 0.85) * (1.0 - face), 0.0) + vec3(hash(q * 3.7) - 0.5, hash(q * 3.7 + 9.0) - 0.5, 0.0) * 0.012 + vec3(bead * 0.09 * blast, 0.0) + vec3(bead * 0.022 * face, 0.0) + vec3(0.0, g * 0.05 * (uFinish == 4 ? inMetal2 : 0.0), 0.0));

  // Enamel fills the cut to a flat surface; only the metal lip around it keeps the groove wall.
  N = normalize(mix(N, vec3(0.0, 0.0, 1.0), smoothstep(0.0, 1.0, clamp(-m.r - 0.35 * uS, 0.0, 1.0)) * ink));
  float d = plateD(p);
  // Patina gathers where hands do not reach: the rim, the grooves, around fasteners. Over the open face it is a fine
  // oxidation speckle and a very gentle drift, never large clouds, which read as a smudge inside a highlight.
  float drift = fbm(q * 0.0045 + uSeed * 3.1);
  float speck = smoothstep(0.64, 0.92, noise(q * 0.34 + uSeed)) * 0.55 + smoothstep(0.72, 0.96, noise(q * 1.1 + uSeed * 2.0)) * 0.4;
  float pat = drift * 0.5 + speck * 0.5;
  float rim = smoothstep(uRimW, uRimW * 0.047, -d / uS);
  float groove = (uFinish < 2) ? exp(-pow((m.r + 1.2 * uS) / (1.8 * uS), 2.0)) : 0.0;
  float near = 0.0;
  for (int i = 0; i < 6; i++){ vec4 s = uScrew[i]; if (s.z > 0.0) near = max(near, smoothstep(2.6, 1.3, length(p - s.xy) / s.z)); }
  float grime = uPatina * clamp(rim * (0.9 + 0.4 * drift) + groove * 0.5 + near * 0.55 + (speck * 0.06 + (drift - 0.5) * 0.2) * (1.0 - uFaceClean), 0.0, 1.0) * (1.0 - inMetal2 * 0.65);
  float cavity = clamp(groove * 0.6 + smoothstep(1.0 * uS, -2.0 * uS, -d) * 0.0, 0.0, 1.0);
  // Wear: the crest of the bevel and the lips of the cuts are rubbed bright by hands.
  float crest = exp(-pow((-d - uBevel * 0.85) / (uBevel * 0.35), 2.0));
  float lip = exp(-pow((m.r - 0.6 * uS) / (0.9 * uS), 2.0));
  // Raised letter tops are rubbed bright by hands, like the bevel crest.
  float wear = clamp((crest * 0.8 + lip * 0.6) * (0.4 + 0.6 * uPatina) + letterTop * 0.7, 0.0, 1.0);
  if (uFinish == 4){
    // The frame's two edges are rubbed bright, and tarnish sits where it meets the face.
    wear = clamp(wear + 0.55 * exp(-pow((dwc - 0.5 * uS) / (0.7 * uS), 2.0)) + 0.4 * exp(-pow((dwc - uBezel + 0.6 * uS) / (0.6 * uS), 2.0)), 0.0, 1.0);
    grime = clamp(grime + uPatina * 0.5 * exp(-pow((dwc - uBezel * 0.55) / (uBezel * 0.3), 2.0)) * (0.5 + drift), 0.0, 1.0);
  }
  float head = 0.0;
  for (int i = 0; i < 6; i++){ vec4 s = uScrew[i]; if (s.z > 0.0) head = max(head, smoothstep(1.02, 0.9, length(p - s.xy) / s.z)); }
  float roughVar = (speck - 0.25) * 0.05 * uPatina + scratches(p) * 0.18 - head * 0.3;

  o0 = vec4(N.xy * 0.5 + 0.5, cavity, wear);
  o1 = vec4(inMetal2, ink, grime, roughVar * 0.5 + 0.5);
}`;

// ---- light -------------------------------------------------------------------------------------

// The room a piece of metal reflects and the way it throws a light back. The stream's posts and rail are lit by the
// same code (src/stream/shaders.ts), so they are the buttons' metal and not a likeness of it.
// studio() reads two uniforms, uSoft and uBand.
export const ROOM = `const float PI = 3.14159265;

float panel(vec2 d, vec2 lo, vec2 hi, float b){
  return smoothstep(lo.x - b, lo.x + b, d.x) * (1.0 - smoothstep(hi.x - b, hi.x + b, d.x)) * smoothstep(lo.y - b, lo.y + b, d.y) * (1.0 - smoothstep(hi.y - b, hi.y + b, d.y));
}

vec3 studio(vec3 R, float rough){
  // The room behind the viewer, as a photographer lights metal: a dark room with a large soft key above and to the
  // left, a tall strip on the right and a low warm bounce card. A plate near mid-screen reflects the key's lower edge,
  // so its face carries a band of light that slides as it scrolls. R is y up, z toward the viewer.
  float b = 0.025 + rough * 0.5;
  vec2 d = R.xy / max(R.z + 0.35, 0.2);
  float key = panel(d, vec2(-1.05, 0.05), vec2(0.28, 0.6), b);
  float keyCore = panel(d, vec2(-0.85, 0.16), vec2(0.1, 0.48), b * 1.6);
  float strip = panel(d, vec2(0.36, -0.7), vec2(0.5, 0.9), b);
  float card = panel(d, vec2(-1.0, -0.5), vec2(0.9, -0.05), b * 1.6);
  vec3 c = vec3(0.022, 0.019, 0.016) + vec3(0.15, 0.125, 0.1) * smoothstep(-0.4, 1.4, d.y);
  // One wide soft light straight in front, as polished bars are photographed. A domed face reflects it as a bright
  // band through its middle, where the words are, and reflects the dark room along its upper and lower edges.
  // The band stays over the words wherever the plate is on the screen.
  float bb = 0.04 + b * 0.7;
  float soft = smoothstep(-0.42 - bb, -0.42 + bb, d.y) * (1.0 - smoothstep(0.42 - bb, 0.42 + bb, d.y)) * (1.0 - smoothstep(1.1, 1.7, abs(d.x)));
  key = mix(key, soft * uBand, uSoft);
  keyCore *= 1.0 - uSoft;
  strip *= 1.0 - uSoft * 0.6;
  c += vec3(1.0, 0.93, 0.84) * (key * 0.95 + keyCore * 0.6);
  c += vec3(1.0, 0.82, 0.6) * strip * 0.8;
  c += vec3(0.62, 0.44, 0.25) * card * 0.4;
  return c;
}

`;

export const SPEC = `float D_aniso(vec3 H, vec3 N, vec3 T, vec3 B, float ax, float ay){
  float x = dot(H, T) / ax, y = dot(H, B) / ay, z = dot(H, N);
  float k = x * x + y * y + z * z;
  return 1.0 / (PI * ax * ay * k * k);
}

float V_smith(float nl, float nv, float a){
  float a2 = a * a;
  return 0.5 / max(nl * sqrt(nv * nv * (1.0 - a2) + a2) + nv * sqrt(nl * nl * (1.0 - a2) + a2), 1e-4);
}

vec3 spec(vec3 N, vec3 V, vec3 L, vec3 T, vec3 B, float rough, float aniso, vec3 F0){
  vec3 H = normalize(L + V);
  float nl = max(dot(N, L), 0.0), nv = max(dot(N, V), 1e-3);
  float a = max(rough * rough, 0.002);
  float ax = max(a * (1.0 - aniso * 0.7), 0.0015), ay = min(a * (1.0 + aniso * 2.2), 1.0);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - max(dot(H, V), 0.0), 5.0);
  return F * D_aniso(H, N, T, B, ax, ay) * V_smith(nl, nv, a) * nl;
}

`;

// The light pass, in two forms. A card's is the same light with one difference: most of a card is not metal, and
// where a point is wholly its face or wholly its picture, none of the metal's light is worked out for it. Every
// other plate is lit by the first form, which is letter for letter what the approved buttons were lit by.
const light = (card: boolean) => `#version 300 es
${COMMON}
uniform sampler2D uB0, uB1, uPhoto;
uniform vec2 uRes;
uniform float uS, uDpr;
uniform vec2 uOrigin;        // plate top left in the viewport, CSS px
uniform vec2 uView;          // viewport size, CSS px
uniform float uRad, uInset;
uniform vec3 uLamp;          // CSS px, x right, y down, z toward the viewer
uniform float uLampI;
uniform float uGlare;         // how strongly the glass over a photo glares, 0 to 1
uniform vec3 uStream;         // CSS px
uniform float uStreamI;
uniform vec2 uTilt;          // radians: about x, about y
uniform vec3 uF0a, uF0b, uInk;
uniform float uRa, uRb, uAniso;
uniform float uPhotoAspect, uPhotoOn;
uniform vec2 uPhotoFocus;
uniform float uPhotoZoom;
uniform float uHover;        // 0 to 1: the pointer is on the plate, or it has focus
uniform vec3 uGlow;          // the light's color, linear
uniform float uRing;         // design units from the edge to the cut border; 0 when the plate has none
uniform float uSoft;         // 0 to 1: the room holds one large soft light, as metal plates are photographed
uniform float uInlay;        // the least an inlaid word shows of its own metal, wherever the lamp is; 0 for none
uniform vec2 uPointer;       // the pointer, device px in the plate
uniform float uBand;         // how bright the one soft light is; 1 as photographed
uniform float uCoat;         // a clear coat over the metal: how strongly it throws the lamp back; 0 for bare metal
uniform float uCard;         // 1 on a project card: a dark face inside a metal bead, round a picture
uniform float uBead, uBezel;
uniform float uRimH;         // how far a card's edge stands above its face, device px
uniform int uReveal;         // how a card's picture gets its colors back: 0 a fade, 1 a sweep, 2 lights first
uniform float uPush;         // how far the picture comes closer while the card is awake, as a share of its size
uniform vec3 uFace, uFaceLit;
uniform vec3 uRamp[5];       // the tones a card's picture rests in, dark to light, linear
${card ? `uniform float uWarm;         // how far a strike of the stream has warmed a card's picture toward its own colors
uniform sampler2D uLoop;` : `uniform sampler2D uLoop;`}     // a card's loop: the picture in motion, shown in place of it while the card is awake
uniform float uLoopOn;
out vec4 frag;
${WINDOW}
${ROOM}${SPEC}// A picture's tones mapped onto the palette's metals, dark to light.
vec3 ramp(float l){
  vec3 c = mix(uRamp[0], uRamp[1], smoothstep(0.0, 0.3, l));
  c = mix(c, uRamp[2], smoothstep(0.3, 0.62, l));
  c = mix(c, uRamp[3], smoothstep(0.62, 0.86, l));
  return mix(c, uRamp[4], smoothstep(0.86, 1.0, l));
}

vec3 rotX(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(v.x, c * v.y - s * v.z, s * v.y + c * v.z); }
vec3 rotY(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }

void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float d = sdBox(p - uRes * 0.5, uRes * 0.5 - uInset, uRad);
  float cov = clamp(0.5 - d, 0.0, 1.0);
  if (cov <= 0.0){ frag = vec4(0.0); return; }
  vec2 uv = gl_FragCoord.xy / uRes;
  vec4 b0 = texture(uB0, uv), b1 = texture(uB1, uv);
  vec3 N = vec3(b0.xy * 2.0 - 1.0, 0.0);
  N.z = sqrt(max(1.0 - dot(N.xy, N.xy), 0.0));
  N = rotY(rotX(N, uTilt.x), uTilt.y);
  float metal2 = b1.x, ink = b1.y, grime = b1.z, roughVar = b1.w * 2.0 - 1.0;
  float cavity = b0.z, wear = b0.w;

  // World: CSS px, x right, y up, z toward the viewer. The camera floats over the viewport center.
  vec2 css = uOrigin + p / uDpr;
  vec3 P = vec3(css.x, -css.y, 0.0);
  vec3 cam = vec3(uView.x * 0.5, -uView.y * 0.5, max(uView.x, uView.y) * 1.25);
  vec3 V = normalize(cam - P);
  vec3 T = normalize(vec3(1.0, 0.0, 0.0) - N * N.x);
  vec3 B = cross(N, T);

  vec3 F0 = mix(uF0a, uF0b, metal2);
  // A card's band stays dark wherever the lamp is, so the words on it always read.
  F0 *= 1.0 - 0.5 * metal2 * uCard;
  F0 *= 1.0 - grime * 0.58;
  F0 = mix(F0, F0 * 1.12 + 0.02, wear * 0.5);
  float rough = clamp(mix(uRa, uRb, metal2) + grime * 0.26 + roughVar - wear * 0.1, 0.06, 0.95);
  float aniso = uAniso * (1.0 - metal2 * 0.6) * (1.0 - grime * 0.5);
  // A card's band is brushed along its length.
  aniso = mix(aniso, 0.55, metal2 * uCard);

${card ? `  // Most of a card is not metal: its face, and its picture under glass. Where a point is wholly one of those,
  // nothing of the metal's light is kept, so none of it is worked out. A card is about a million such points, and
  // lighting every one as metal first was most of what a card cost to draw.
  bool metal = true;
  if (uCard > 0.5) metal = !(ink > 0.9999 || (uWinOn > 0.5 && winD(p) < -2.2 * uS));

  // Under the one soft light the room is seen from straight in front, so the band it makes on a domed face stays
  // over the words wherever the plate is on the screen. The lamp still sees the plate from where the viewer is.
  vec3 R = reflect(-normalize(mix(V, vec3(0.0, 0.0, 1.0), uSoft)), N);
  vec3 col = vec3(0.0);
  vec3 Lv = vec3(uLamp.x, -uLamp.y, uLamp.z) - P;
  float ld = length(Lv);
  vec3 L = Lv / ld;
  // Under the pointer the lamp comes in close: the metal brightens where it is touched.
  float fall = uLampI * (1.0 + 0.9 * uHover) / (1.0 + pow(ld / (max(uView.x, uView.y) * 0.75), 2.0));
  if (metal){
    col = studio(R, rough) * F0 * (1.0 - cavity * 0.55);
    // Real brass is never a perfect mirror: micro scratches scatter a little of the whole room, so a plate that
    // reflects the dark floor still keeps enough light for its enamel words to read.
    col += F0 * vec3(0.16, 0.14, 0.12) * (1.0 - cavity * 0.55);
    col += spec(N, V, L, T, B, rough, aniso, F0) * fall * vec3(1.0, 0.94, 0.86);
    col += spec(N, V, L, T, B, min(1.0, rough * 1.8 + 0.1), aniso * 0.5, F0) * fall * 0.1 * vec3(1.0, 0.94, 0.86);
    // A clear coat, as polished copper is lacquered: it throws the lamp back pale and wide, so the cursor's light
    // shows crossing a face that is already bright, where the metal's own highlight is lost in the band.
    if (uCoat > 0.0) col += spec(N, V, L, T, B, 0.32, 0.5, vec3(1.0)) * fall * uCoat * uGlow * (1.0 - grime * 0.6);

    // Inlaid words keep a floor of their own color and brighten above it, so they read as far from the lamp as a
    // page can put them. The further below the floor the reflection falls, the more of the floor is added.
    if (uInlay > 0.0){
      vec3 least = uF0b * uInlay;
      vec3 W = vec3(0.2126, 0.7152, 0.0722);
      col += least * exp(-dot(col, W) / dot(least, W)) * metal2;
    }
  }

` : `  // Under the one soft light the room is seen from straight in front, so the band it makes on a domed face stays
  // over the words wherever the plate is on the screen. The lamp still sees the plate from where the viewer is.
  vec3 R = reflect(-normalize(mix(V, vec3(0.0, 0.0, 1.0), uSoft)), N);
  vec3 col = studio(R, rough) * F0 * (1.0 - cavity * 0.55);
  // Real brass is never a perfect mirror: micro scratches scatter a little of the whole room, so a plate that
  // reflects the dark floor still keeps enough light for its enamel words to read.
  col += F0 * vec3(0.16, 0.14, 0.12) * (1.0 - cavity * 0.55);

  vec3 Lv = vec3(uLamp.x, -uLamp.y, uLamp.z) - P;
  float ld = length(Lv);
  vec3 L = Lv / ld;
  // Under the pointer the lamp comes in close: the metal brightens where it is touched.
  float fall = uLampI * (1.0 + 0.9 * uHover) / (1.0 + pow(ld / (max(uView.x, uView.y) * 0.75), 2.0));
  col += spec(N, V, L, T, B, rough, aniso, F0) * fall * vec3(1.0, 0.94, 0.86);
  col += spec(N, V, L, T, B, min(1.0, rough * 1.8 + 0.1), aniso * 0.5, F0) * fall * 0.1 * vec3(1.0, 0.94, 0.86);
  // A clear coat, as polished copper is lacquered: it throws the lamp back pale and wide, so the cursor's light shows
  // crossing a face that is already bright, where the metal's own highlight is lost in the band.
  if (uCoat > 0.0) col += spec(N, V, L, T, B, 0.32, 0.5, vec3(1.0)) * fall * uCoat * uGlow * (1.0 - grime * 0.6);

  // Inlaid words keep a floor of their own color and brighten above it, so they read as far from the lamp as a
  // page can put them. The further below the floor the reflection falls, the more of the floor is added.
  if (uInlay > 0.0){
    vec3 least = uF0b * uInlay;
    vec3 W = vec3(0.2126, 0.7152, 0.0722);
    col += least * exp(-dot(col, W) / dot(least, W)) * metal2;
  }

`}  float spill = 0.0;
  float streamOn = 0.0;
  vec3 streamDir = vec3(0.0, 0.0, 1.0);
  if (uStreamI > 0.0){
    vec3 Wv = vec3(uStream.x, -uStream.y, uStream.z) - P;
    float wd = length(Wv);
    float wf = uStreamI / (1.0 + pow(wd / 170.0, 2.0));
    streamOn = wf;
    streamDir = Wv / wd;
${card ? `    if (metal){
      col += spec(N, V, Wv / wd, T, B, rough, aniso, F0) * wf * vec3(1.0, 0.5, 0.14);
      // The stream is a long bright source beside the plate: its light grazes the metal and warms the near side,
      // strongest on bevels that face it.
      col += mix(F0, vec3(dot(F0, vec3(0.33))), 0.5) * wf * vec3(1.0, 0.36, 0.05) * (0.3 + 1.3 * max(dot(N, Wv / wd), 0.0)) * (0.35 + 1.1 * exp(-wd / 80.0));
    }
` : `    col += spec(N, V, Wv / wd, T, B, rough, aniso, F0) * wf * vec3(1.0, 0.5, 0.14);
    // The stream is a long bright source beside the plate: its light grazes the metal and warms the near side,
    // strongest on bevels that face it.
    col += mix(F0, vec3(dot(F0, vec3(0.33))), 0.5) * wf * vec3(1.0, 0.36, 0.05) * (0.3 + 1.3 * max(dot(N, Wv / wd), 0.0)) * (0.35 + 1.1 * exp(-wd / 80.0));
`}    // Spill the plate's own exposure does not swallow: warm light that lands on it, strongest near the stream and
    // on the bevel facing it.
    spill = wf * (0.25 + 1.6 * pow(max(dot(N, Wv / wd), 0.0), 2.0)) * exp(-wd / 160.0) * 0.08;
  }

  // Enamel: a black glassy fill. Dark, with its own small sharp highlight.
${card ? `  if (uCard > 0.5 && ink > 0.0){
    // A card's face: almost black` : `  if (uCard > 0.5){
    // A card's face: almost black`}, lifting a little toward its top, with the cursor's light pooling on it and the
    // stream washing it warm. It sits a hair below the bead and the picture's frame, which shade it where they meet.
    float dwf = uWinOn > 0.5 ? winD(p) : 1e5;
    float seat = 1.0 - 0.45 * exp(-max(dwf - uBezel, 0.0) / (3.5 * uS)) - 0.35 * exp(-max(-d - uBead, 0.0) / (2.6 * uS));
    float grainF = noise(p / uS * 1.7) - 0.5;
    vec3 faceCol = uFace * mix(1.5, 0.8, p.y / uRes.y) * (1.0 + grainF * 0.07);
    float pool = 1.0 / (1.0 + pow(length(uLamp.xy - css) / (150.0 * uS / uDpr), 2.0));
    faceCol += uFaceLit * uLampI * (0.3 * pool + 0.015) * max(dot(N, L), 0.0) * (1.0 + 0.6 * uHover);
    faceCol += spec(N, V, L, T, B, 0.5, 0.0, vec3(0.04)) * fall * 0.2 * vec3(1.0, 0.84, 0.66);
    faceCol += uFaceLit * 1.7 * min(streamOn, 3.5) * (0.6 + 0.5 * max(dot(N, streamDir), 0.0)) * (1.0 + grainF * 0.14);
    // The edge stands above the face and throws a shadow onto it, on the side the light comes from.
    vec2 rimOff = vec2(L.x, -L.y) / max(L.z, 0.2) * uRimH * 1.5;
    float rimShade = smoothstep(-1.4 * uS, 1.4 * uS, sdBox(p + rimOff - uRes * 0.5, uRes * 0.5 - uInset - uBead, max(uRad - uBead, 0.0)));
    faceCol *= 1.0 - 0.6 * rimShade;
${card ? `    col = mix(col, faceCol * seat, ink);
  }
  if (uCard > 0.5){
    // Under the pointer the bead and the frame catch the light where the pointer is near, as the buttons' edges do.
    if (uHover > 0.0 && metal){
      vec2 qc = (p - uPointer) / (120.0 * uS);
      col += uGlow * F0 * (0.35 + 1.1 * wear) * exp(-dot(qc, qc)) * uHover * 1.6 * (1.0 - ink);
    }
` : `    col = mix(col, faceCol * seat, ink);
    // Under the pointer the bead and the frame catch the light where the pointer is near, as the buttons' edges do.
    if (uHover > 0.0){
      vec2 qc = (p - uPointer) / (120.0 * uS);
      col += uGlow * F0 * (0.35 + 1.1 * wear) * exp(-dot(qc, qc)) * uHover * 1.6 * (1.0 - ink);
    }
`}  } else {
    vec3 enamel = uInk + studio(R, 0.4) * 0.018 + spec(N, V, L, T, B, 0.42, 0.0, vec3(0.04)) * fall * 0.22;
    col = mix(col, enamel, ink);
  }

  // Under the pointer nothing plays. The cut border, the rubbed edges and inlaid words catch the light only where
  // the pointer is near them.
  if (uRing > 0.0 && uHover > 0.0){
    float edge = -d / uS;
    float inRing = 1.0 - smoothstep(uRing + 2.5, uRing + 4.5, edge);
    float line = max(ink, metal2) * inRing;
    float beside = exp(-pow((edge - uRing) / 3.4, 2.0)) * (1.0 - line);
    vec2 q = (p - uPointer) / (36.0 * uS);
    float near = exp(-dot(q, q)) * uHover;
    col = mix(col, uGlow * (1.3 + 1.5 * near), line * smoothstep(0.02, 0.55, near));
    col += uGlow * F0 * (beside * 0.9 + wear * 0.7) * near * (1.0 - ink);
    col = mix(col, uGlow * 1.3, metal2 * (1.0 - inRing) * smoothstep(0.1, 0.75, near));
  }

  if (uWinOn > 0.5){
    float dw = winD(p);
    float inside = clamp(-dw / (0.9 * uS) - 1.4, 0.0, 1.0);
    if (inside > 0.0){
      // Sight line: where the eye meets the glass floor, and whether the near wall hides it.
      // A card turns under the pointer, and the picture lies below its face, so the eye sees further under one wall.
      vec3 Vd = uCard > 0.5 ? rotX(rotY(V, -uTilt.y), -uTilt.x) : V;
      float depthPx = uWinDepth;
      vec2 seeOff = vec2(-Vd.x, Vd.y) / max(Vd.z, 0.3) * depthPx;
      float wallSeen = smoothstep(-0.6 * uS, 0.6 * uS, winD(p + seeOff));
      vec2 lampOff = vec2(L.x, -L.y) / max(L.z, 0.15) * depthPx * 3.2;
      float pen = 0.8 * uS + length(lampOff) * 0.1;
      float lit = 1.0 - smoothstep(-pen, pen, winD(p + lampOff) + 0.6 * uS);
      float ao = smoothstep(0.0, 14.0 * uS, -dw) * 0.3 + 0.7;
      vec3 photo = vec3(0.05, 0.045, 0.04);
      vec3 still = photo;
      if (uPhotoOn > 0.5){
        vec2 puv = (p - (uWin.xy - uWin.zw)) / (2.0 * uWin.zw);
        // Cover the window, zoomed by uPhotoZoom, centered on the focus point but never past the picture's edge.
        float wa = uWin.z / uWin.w;
        vec2 span = (wa > uPhotoAspect ? vec2(1.0, uPhotoAspect / wa) : vec2(wa / uPhotoAspect, 1.0)) / max(uPhotoZoom, 1.0);
        vec2 c = clamp(uPhotoFocus, span * 0.5, 1.0 - span * 0.5);
        puv = c + (puv - 0.5) * span / (1.0 + uPush * uHover);
        still = pow(texture(uPhoto, puv).rgb, vec3(2.2));
        photo = uLoopOn > 0.5 ? pow(texture(uLoop, puv).rgb, vec3(2.2)) : still;
      }
      float onPrint = fall * max(dot(vec3(0.0, 0.0, 1.0), L), 0.0);
      // A card's picture is lit by the lamp's own warm light, so its whites are the site's off white.
      vec3 under = photo * mix(vec3(1.0), vec3(1.0, 0.955, 0.895), uCard) * (0.42 + 0.95 * onPrint) * mix(0.12, 1.0, lit) * ao;
      if (uCard > 0.5 && uPhotoOn > 0.5){
        // At rest a card's picture is shown in the site's metals. Under the pointer its own colors come back.
        // Every picture rests at about the same weight: a light one is held down and a dark one lifted a little,
        // so a white page rests as bronze and not as a lamp. The picture's smallest mip is its average.
        float l = pow(dot(still, vec3(0.2126, 0.7152, 0.0722)), 1.0 / 2.2);
        float mean = pow(dot(pow(textureLod(uPhoto, vec2(0.5), 20.0).rgb, vec3(2.2)), vec3(0.2126, 0.7152, 0.0722)), 1.0 / 2.2);
        vec3 rest = ramp(l * clamp(0.4 / max(mean, 0.05), 0.56, 1.2)) * (0.45 + 0.8 * onPrint) * mix(0.12, 1.0, lit) * ao;
        float shown = uHover;
        if (uReveal == 1){
          // A soft slanted edge crosses the picture from its left.
          float across = (p.x - (uWin.x - uWin.z)) / (2.0 * uWin.z) + 0.18 * (p.y - uWin.y) / uWin.w;
          shown = 1.0 - smoothstep(-0.3, 0.0, across - mix(-0.35, 1.55, uHover));
        } else if (uReveal == 2){
          // The lights of the picture come back first and its darks last.
          shown = smoothstep(0.0, 0.35, uHover * 1.35 - (1.0 - l));
        }
${card ? `        under = mix(rest, under, max(shown, uWarm));` : `        under = mix(rest, under, shown);`}
      }
      // The wall: brass, facing into the window, lit by the lamp when it faces it.
      vec2 wn = normalize(p - uWin.xy + 1e-3);
      vec3 WN = normalize(vec3(-wn.x, wn.y, 0.25));
      // The wall faces into the window; the side that faces the lamp catches it, the far side falls into shade.
${card ? `      if (wallSeen > 0.0){
        vec3 wall = studio(reflect(-V, WN), 0.45) * uF0a * 0.25 + uF0a * max(dot(WN, L), 0.0) * fall * 0.55 + spec(WN, V, L, T, B, 0.4, 0.0, uF0a) * fall * 0.6;
        under = mix(under, wall, wallSeen);
      }
` : `      vec3 wall = studio(reflect(-V, WN), 0.45) * uF0a * 0.25 + uF0a * max(dot(WN, L), 0.0) * fall * 0.55 + spec(WN, V, L, T, B, 0.4, 0.0, uF0a) * fall * 0.6;
      under = mix(under, wall, wallSeen);
`}      // Glass: a faint reflection of the room, and a soft glare where the lamp catches it.
      vec3 G = vec3(0.0, 0.0, 1.0);
      float fr = 0.04 + 0.96 * pow(1.0 - max(dot(G, V), 0.0), 5.0);
      float smudge = 0.0;
      if (uCard < 0.5) smudge = fbm(p / uS * 0.03 + 4.0) * 0.08;
${card ? `      vec3 glass = studio(reflect(-V, G), 0.08 + smudge) * fr * 0.4;
      if (uGlare > 0.0) glass += spec(G, V, L, vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), 0.12 + smudge, 0.0, vec3(0.04)) * fall * 0.55 * uGlare * vec3(1.0, 0.84, 0.62);
` : `      vec3 glass = studio(reflect(-V, G), 0.08 + smudge) * fr * 0.4 + spec(G, V, L, vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), 0.12 + smudge, 0.0, vec3(0.04)) * fall * 0.55 * uGlare * vec3(1.0, 0.84, 0.62);
`}      col = mix(col, under + glass, inside);
    }
  }

  // Keep the hue as it gets bright: an exposure curve on the brightest channel scales all three together, so hot
  // brass rolls off smoothly toward full gold and never turns lemon or white, and has no flat clipped plateau.
  float mx = max(col.r, max(col.g, col.b));
  if (mx > 1e-5) col *= (1.0 - exp(-mx * 1.15)) / (mx * 0.955);
  col += vec3(1.0, 0.42, 0.07) * spill * (1.0 - ink * 0.7);
  col = pow(max(col, 0.0), vec3(1.0 / 2.2));
  frag = vec4(col * cov, cov);
}`;
export const LIGHT = light(false);
export const LIGHT_CARD = light(true);
