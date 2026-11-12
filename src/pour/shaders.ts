// GLSL for the pour. WebGL2. Positions are in the scene's units, y down, until the last step.

// The field value at which the body's surface is drawn. In the middle of a body the field is about 1.
const LEVEL = '0.2';

const COMMON = `
precision highp float;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
float sdBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
// How brightly metal at a temperature glows. Steep, like real heat: a little cooler is a lot dimmer.
float glow(float t){ t = clamp(t, 0.0, 1.25); return 4.0 * t * t * t * sqrt(t); }
`;

export const FULL_VERT = `#version 300 es
in vec2 a;
out vec2 vUv;
void main(){ vUv = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }`;

// Each particle adds a soft dot to a field. Where dots overlap the field is high, and the surface is drawn where it
// crosses a level: that is what makes many particles one body.
export const FIELD_VERT = `#version 300 es
in vec2 aPos;
in vec4 aData;
uniform vec2 uView;
uniform float uPoint;
out vec4 vData;
void main(){
  vData = aData;
  gl_Position = vec4(aPos.x / uView.x * 2.0 - 1.0, 1.0 - aPos.y / uView.y * 2.0, 0.0, 1.0);
  gl_PointSize = uPoint * aData.w;
}`;

export const FIELD_FRAG = `#version 300 es
precision highp float;
in vec4 vData;
out vec4 o;
void main(){
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(p, p);
  if (r2 >= 1.0) discard;
  float w = (1.0 - r2) * (1.0 - r2) * vData.y;
  o = vec4(w, w * vData.x, w * vData.z, 0.0);
}`;

// Where the field crosses the surface level, as plain coverage. Blurred, this says how deep inside a body a pixel is,
// which is what gives the body a round back instead of a flat face.
export const COVER_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uField;
out vec4 o;
void main(){
  float f = texture(uField, vUv).r;
  float edge = max(fwidth(f), 1e-4);
  o = vec4(smoothstep(${LEVEL} - edge, ${LEVEL} + edge, f), 0.0, 0.0, 1.0);
}`;

// The body's shape and its own light, worked out once per pixel: r is what it emits, g how much of the pixel it covers,
// b and a its surface normal.
export const BODY_FRAG = `#version 300 es
${COMMON}
in vec2 vUv;
uniform sampler2D uField;
uniform sampler2D uDeep;
uniform sampler2D uHeat;
uniform vec2 uPx;
uniform vec2 uDeepPx;
uniform float uBulge;
uniform float uRipple;
uniform vec2 uView;
uniform vec4 uSlab[2];
uniform float uSlabR;
uniform int uSlabs;
uniform vec4 uHeatMap[2];
out vec4 o;

void main(){
  vec4 f = texture(uField, vUv);
  float edge = max(fwidth(f.r), 1e-4);
  float cover = smoothstep(${LEVEL} - edge, ${LEVEL} + edge, f.r);

  // The round of the body, from how deep inside it this pixel is, with the fine ripples of the field laid over it.
  float deep = texture(uDeep, vUv).r;
  vec2 round = vec2(texture(uDeep, vUv + vec2(uDeepPx.x, 0.0)).r - texture(uDeep, vUv - vec2(uDeepPx.x, 0.0)).r,
                    texture(uDeep, vUv + vec2(0.0, uDeepPx.y)).r - texture(uDeep, vUv - vec2(0.0, uDeepPx.y)).r);
  vec2 fine = vec2(texture(uField, vUv + vec2(uPx.x, 0.0)).r - texture(uField, vUv - vec2(uPx.x, 0.0)).r,
                   texture(uField, vUv + vec2(0.0, uPx.y)).r - texture(uField, vUv - vec2(0.0, uPx.y)).r);
  vec3 n = normalize(vec3(-(round * uBulge + fine * uRipple), 1.0));

  float t = f.g / max(f.r, 1e-4);
  float skin = f.b / max(f.r, 1e-4);
  // Metal is hottest at its heart. Its skin is cooler, and cooler again where a film of oxide rides on it.
  float heart = smoothstep(0.3, 0.92, deep);
  float film = smoothstep(0.3, 0.8, skin) * smoothstep(0.35, 0.8, t);
  float seen = t * (0.9 + 0.1 * heart) - 0.2 * film;
  float limb = 0.05 + 0.95 * pow(max(n.z, 0.0), 1.7);
  float light = glow(seen) * limb * cover;

  // A slab the metal has touched glows where it was touched, and that glow fades as the slab cools.
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uView;
  for (int i = 0; i < 2; i++){
    if (i >= uSlabs) break;
    vec4 s = uSlab[i];
    float d = sdBox(p - s.xy, s.zw, uSlabR);
    if (d < 0.0){
      vec2 q = (p - (s.xy - s.zw)) / (s.zw * 2.0);
      float warm = texture(uHeat, uHeatMap[i].xy + q * uHeatMap[i].zw).r;
      light += glow(0.18 + 0.34 * warm) * smoothstep(0.015, 0.35, warm) * smoothstep(0.0, -1.2, d) * (1.0 - cover);
    }
  }
  o = vec4(light, cover, n.xy);
}`;

// A spark is a streak: where it is now back to where it was when the shutter opened.
export const SPARK_VERT = `#version 300 es
in vec2 aCorner;
in vec4 aSpark;
in vec2 aHeat;
uniform vec2 uView;
uniform float uShutter;
uniform float uThin;
out vec2 vAt;
out float vHeat;
void main(){
  vec2 vel = aSpark.zw;
  float speed = length(vel);
  vec2 dir = speed > 1.0 ? vel / speed : vec2(0.0, 1.0);
  vec2 side = vec2(-dir.y, dir.x);
  float r = max(aHeat.y, uThin);
  float tail = speed * uShutter;
  vec2 p = aSpark.xy + dir * (r - aCorner.x * (tail + 2.0 * r)) + side * aCorner.y * r;
  vAt = vec2(aCorner.x * (tail + 2.0 * r) / r, aCorner.y);
  vHeat = aHeat.x * min(1.0, aHeat.y / uThin) / (1.0 + tail / (9.0 * r));
  gl_Position = vec4(p.x / uView.x * 2.0 - 1.0, 1.0 - p.y / uView.y * 2.0, 0.0, 1.0);
}`;

export const SPARK_FRAG = `#version 300 es
${COMMON}
in vec2 vAt;
in float vHeat;
out vec4 o;
void main(){
  float across = 1.0 - vAt.y * vAt.y;
  float head = smoothstep(0.0, 1.0, vAt.x);
  float w = across * across * head;
  o = vec4(glow(vHeat) * w, 0.0, 0.0, 0.0);
}`;

export const DOWN_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uPx;
out vec4 o;
void main(){
  float s = texture(uSrc, vUv + uPx * vec2(-1.0, -1.0)).r + texture(uSrc, vUv + uPx * vec2(1.0, -1.0)).r
          + texture(uSrc, vUv + uPx * vec2(-1.0, 1.0)).r + texture(uSrc, vUv + uPx * vec2(1.0, 1.0)).r;
  o = vec4(s * 0.25, 0.0, 0.0, 1.0);
}`;

export const UP_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uPx;
uniform float uGain;
out vec4 o;
void main(){
  float s = texture(uSrc, vUv).r * 4.0;
  s += (texture(uSrc, vUv + uPx * vec2(-1.0, 0.0)).r + texture(uSrc, vUv + uPx * vec2(1.0, 0.0)).r
      + texture(uSrc, vUv + uPx * vec2(0.0, -1.0)).r + texture(uSrc, vUv + uPx * vec2(0.0, 1.0)).r) * 2.0;
  s += texture(uSrc, vUv + uPx * vec2(-1.0, -1.0)).r + texture(uSrc, vUv + uPx * vec2(1.0, -1.0)).r
     + texture(uSrc, vUv + uPx * vec2(-1.0, 1.0)).r + texture(uSrc, vUv + uPx * vec2(1.0, 1.0)).r;
  o = vec4(s / 16.0 * uGain, 0.0, 0.0, 1.0);
}`;

// The picture: the page and the slab as surfaces the pour lights, the body over them, and every glow through one ramp
// of the palette's light colors, so nothing the pour emits is ever off the palette.
export const FINAL_FRAG = `#version 300 es
${COMMON}
in vec2 vUv;
uniform sampler2D uBody;
uniform sampler2D uGlow;
uniform sampler2D uRamp;
uniform vec2 uView;
uniform float uUnitPx;
uniform vec4 uSlab[2];
uniform float uSlabR;
uniform int uSlabs;
uniform vec3 uLamp;
uniform vec3 uBg;
uniform vec3 uPage;
uniform vec3 uBronze;
uniform vec3 uBronzeDeep;
uniform vec3 uCopper;
uniform vec3 uLight;
uniform vec3 uPale;
uniform vec2 uGlowPx;
uniform float uGlowNorm;
out vec4 o;

vec3 ramp(float x){ return texture(uRamp, vec2(x / (1.0 + x), 0.5)).rgb; }
vec2 toUv(vec2 p){ return vec2(p.x / uView.x, 1.0 - p.y / uView.y); }

void main(){
  // p is in units with y down, and so is every direction below.
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uView;
  vec4 body = texture(uBody, vUv);
  // The pour's light as it spreads: wide and soft, and always smooth.
  float lit = texture(uGlow, vUv).r * uGlowNorm;
  vec2 lean = vec2(texture(uGlow, vUv + vec2(uGlowPx.x, 0.0)).r - texture(uGlow, vUv - vec2(uGlowPx.x, 0.0)).r,
                   texture(uGlow, vUv - vec2(0.0, uGlowPx.y)).r - texture(uGlow, vUv + vec2(0.0, uGlowPx.y)).r) * uGlowNorm;
  // Which way that light arrives from: up the slope of the glow. Where the slope is slight it arrives head on.
  vec3 from = normalize(vec3(lean * 2.2, lit * 0.6 + 0.004));
  vec3 lampFrom = normalize(vec3(uLamp.xy - p, uLamp.z));
  vec3 lampHalf = normalize(lampFrom + vec3(0.0, 0.0, 1.0));
  float lampFall = 1.0 / (1.0 + dot(uLamp.xy - p, uLamp.xy - p) / (uLamp.z * uLamp.z));

  // The page: near black, with a grain fine enough to catch light without ever reading as a pattern.
  float grain = noise(p * 1.7) * 0.55 + noise(p * 4.9) * 0.45;
  vec3 pageN = normalize(vec3(vec2(noise(p * 2.3 + 11.0), noise(p * 2.3 + 47.0)) - 0.5, 1.8));
  vec3 col = uBg * (0.9 + 0.2 * grain);
  vec3 pageLight = uPage * uLight * lit * 6.0 * (0.55 + 0.45 * max(dot(pageN, from), 0.0)) * (0.72 + 0.56 * grain);

  for (int i = 0; i < 2; i++){
    if (i >= uSlabs) break;
    vec4 s = uSlab[i];
    vec2 q = p - s.xy;
    float d = sdBox(q, s.zw, uSlabR);
    // The slab keeps the light of what lies on it off the page beneath, and rests on its own soft shadow.
    float shadow = sdBox(q - vec2(0.0, s.w + 84.0), vec2(max(s.z - 34.0, 4.0), 84.0), 44.0);
    pageLight *= 1.0 - 0.72 * smoothstep(34.0, -44.0, shadow);
    col *= 1.0 - 0.45 * smoothstep(16.0, 0.0, d) * smoothstep(-s.w, s.w * 1.4, q.y);
    float inside = smoothstep(0.75, -0.75, d * uUnitPx);
    if (inside > 0.0){
      float e = 0.5;
      vec2 away = vec2(sdBox(q + vec2(e, 0.0), s.zw, uSlabR) - sdBox(q - vec2(e, 0.0), s.zw, uSlabR),
                       sdBox(q + vec2(0.0, e), s.zw, uSlabR) - sdBox(q - vec2(0.0, e), s.zw, uSlabR));
      float bevel = smoothstep(-5.0, -0.4, d);
      float brushed = noise(vec2(p.x * 0.16, p.y * 6.5)) * 0.6 + noise(vec2(p.x * 0.7, p.y * 21.0)) * 0.4;
      float tarnish = noise(p * 0.045 + 3.0) * 0.6 + noise(p * 0.17 + 9.0) * 0.4;
      vec3 n = normalize(vec3(away * bevel * 1.5 + vec2(0.0, (brushed - 0.5) * 0.16), 1.0));
      // Dark polished bronze: brushed along its length, a little tarnished, brighter where its edge is worn.
      vec3 metal = mix(uBronzeDeep, uBronze, 0.1 + 0.16 * brushed + 0.5 * bevel * bevel) * (0.62 + 0.55 * tarnish);
      // The lamp glints only where the surface turns: on the bevel. A flat face square to the lamp would mirror it
      // whole and wash out.
      vec3 face = metal * (0.07 + 0.42 * max(dot(n, lampFrom), 0.0) * lampFall)
                + uCopper * pow(max(dot(n, lampHalf), 0.0), 54.0) * lampFall * 0.9 * smoothstep(0.004, 0.12, 1.0 - n.z);
      // The pour's light on the slab: on the edge that faces it, as a glint along the bevel, and as the mirror of
      // the hot metal lying along its top, brightest just under it and fading down the face.
      vec3 pourHalf = normalize(from + vec3(0.0, 0.0, 1.0));
      float above = 0.0;
      for (int k = 0; k < 4; k++) above += texture(uBody, toUv(vec2(p.x, s.y - s.w - 3.0 - float(k) * 5.0))).r;
      float down = (q.y + s.w) / (2.0 * s.w);
      float mirror = above * 0.25 * exp(-down * 4.5) * (0.55 + 0.45 * brushed);
      face += metal * uLight * lit * 9.0 * (0.25 + 0.75 * max(dot(n, from), 0.0))
            + uLight * pow(max(dot(n, pourHalf), 0.0), 26.0) * lit * 7.0
            + (uBronze + uCopper * 0.5) * uLight * mirror * 0.3;
      col = mix(col, face, inside);
      pageLight *= 1.0 - inside;
    }
  }
  col += pageLight;

  // Metal that has gone cold is dark copper, lit by the lamp and by the metal that is still hot. Metal that is hot
  // shows only its own light: what it reflects is drowned.
  vec3 n = normalize(vec3(body.b, -body.a, sqrt(max(0.0, 1.0 - dot(body.ba, body.ba)))));
  float hot = smoothstep(0.03, 0.5, body.r);
  vec3 cold = uBronzeDeep * (0.35 + 0.7 * max(dot(n, lampFrom), 0.0) * lampFall)
            + uCopper * pow(max(dot(n, lampHalf), 0.0), 48.0) * lampFall
            + uBronze * uLight * lit * 22.0 * (0.3 + 0.7 * max(dot(n, from), 0.0));
  col = mix(col, cold * (1.0 - hot), body.g);

  // Everything that glows goes through the one ramp: the body, with a highlight where its surface turns to the lamp,
  // the warm slab, the sparks, and a little of the air around the metal, as in a lens.
  float shine = pow(max(dot(n, lampHalf), 0.0), 22.0) * body.g * lampFall;
  col += ramp(body.r * (1.0 + 0.7 * shine) + lit * 0.22);
  col = min(col, uPale);
  vec3 srgb = pow(max(col, 0.0), vec3(1.0 / 2.2));
  srgb += (hash(gl_FragCoord.xy + 0.37) - 0.5) / 255.0;
  o = vec4(srgb, 1.0);
}`;
