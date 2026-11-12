import { HEAD, NOISE, SHARD_LIGHT } from './shaders';

// How the first round's shards are lit: copper leaf and glass. Kept so the two rounds can be compared.

// Copper leaf. The same metal as the buttons, and like them a mirror. Beaten leaf is crinkled into small facets,
// each leaning its own way, so the core shows in it as a scatter of facets that blaze beside facets that are dark,
// and the scatter runs across the leaf as it turns. That jump from one facet to the next is what makes it metal.
export const COPPER_FRAG = `${HEAD}
uniform vec3 uF0, uCopper;
out vec4 frag;
${NOISE}${SHARD_LIGHT}
void main(){
  vec3 flat_ = normalize(vN);
  // The crinkle: facets a few pixels across, however big the leaf is.
  float cells = clamp(vSize * uDpr / 1.9, 2.0, 8.0);
  vec2 g = vObj.xy * cells + vMore.x * 57.0;
  vec2 ip = floor(g), fp = fract(g), id = ip;
  float best = 9.0, next = 9.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 o = vec2(float(i), float(j));
    vec2 r = o + vec2(hash2(ip + o), hash2(ip + o + 17.3)) - fp;
    float d = dot(r, r);
    if (d < best){ next = best; best = d; id = ip + o; } else if (d < next) next = d;
  }
  vec3 lean = vec3(hash2(id + 3.1), hash2(id + 9.7), hash2(id + 5.3)) - 0.5;
  vec3 N = normalize(flat_ + (lean - flat_ * dot(lean, flat_)) * 0.3 * (1.0 - vTag));
  float crease = smoothstep(0.0, 0.16, sqrt(next) - sqrt(best));
  float fall, lampI;
  vec3 plane, Ll;
  vec3 toward = coreFrom(fall, plane);
  lampI = lampLight(Ll);
  float glint = coreBand(N, toward, plane, 0.14) * 9.0;
  float sheen = coreBand(flat_, toward, plane, 0.7) * 1.9;
  float nll = max(dot(N, Ll), 0.0);
  float lamp = (ggx(max(dot(N, normalize(Ll + V)), 0.0), 0.16) * 0.8 + 0.05) * nll * lampI;
  float light = room(reflect(-V, N)) * (0.25 + 0.75 * min(fall, 1.0)) + fall * (glint + sheen + 0.03) + lamp;
  light *= mix(0.72, 1.0, crease);
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
  // Its body is clear but not empty: it holds a faint light, more on the side turned to the core.
  float faceLight = min(0.02 + 0.25 * room(reflect(-V, N)) + fall * (0.015 + 0.07 * pow(max(dot(N, toward) + 0.35, 0.0), 2.0) + 0.06 * fres), 0.13);
  float bandLight = 0.05 + 1.3 * carried;
  col += ramp(mix(faceLight, bandLight, band)) * (1.0 - line) + ramp(0.3 + 3.4 * carried) * line + ramp(glint);
  frag = vec4(min(col, uPale), clamp(alpha + 0.04 + line * 0.6 + band * 0.3 + glint, 0.0, 1.0));
}`;
