import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { COPPER, COPPER_LIGHT } from '../../../../metal/finishes';
import { STREAM } from '../../../../stream/config';
import { VERTEX_FLOATS, buildShards, facetKind } from '../../../../stream/shards';
import { CORE, HEART, SOURCE } from '../../layout';
import { MOVE_ATTRS, MOVE_GLSL, type Move, packMove } from './motion';

// The smallest pieces are the stream's own shards: the very meshes buildShards makes from the stream's seed, at the
// stream's sizes, in its two materials, solid and clear, lit as the stream lights them (SOLID_FRAG and CLEAR_FRAG in
// src/stream/shaders.ts, carried into the world's frame). The stream lights a shard from its core, a line on the
// page. Here two things light it: the core's ball, and the line of the stream that falls from its underside.
// Everything else in the sum is the stream's, number for number.

// The stream's shards, as made for the stream.
const MESHES = buildShards(STREAM.seed);
// A stream unit in the world's units on a screen 1460 wide (unitFor in src/stream/config.ts).
export const STREAM_UNIT = STREAM.scale;
// The stream's riders: many small, a few large enough to show every face.
export function riderSize(r: () => number): { size: number; kind: number } {
  const pick = r(), big = r() ** 3.4, [lo, hi] = STREAM.sizes.facets;
  return { size: (lo + (hi - lo) * big) * STREAM_UNIT * GROW, kind: facetKind(big, pick) };
}
export const CLEAR_SHARE = STREAM.shards.clear;
const BALL = { flash: 6, hold: 0.6 };
// The stream's riders ride within a few units of its line, so all of them are lit as if beside it. The shards here
// are spread round the fall and among the debris, further from any light: they are lit from this far out as the
// stream's own are from beside its line, so they come out as bright and as pale as those do.
const REACH = { line: 3.2, ball: 150 };
// The stream draws its riders a little larger than their size, by their depth and the page's presence.
export const GROW = 1.3;

export interface Shard { move: Move; kind: number; clear: boolean }

const lin = (name: Parameters<typeof hex>[0]) => new THREE.Color(hex(name)).convertSRGBToLinear();

// One geometry for many shards: each shard's own vertices carry how it moves.
export function bake(list: Shard[]): THREE.BufferGeometry {
  let count = 0;
  for (const s of list) count += MESHES.kinds[s.kind].count;
  const pos = new Float32Array(count * 3), nrm = new Float32Array(count * 3), edge = new Float32Array(count * 3);
  const bev = [new Float32Array(count * 3), new Float32Array(count * 3), new Float32Array(count * 3)];
  const mv = MOVE_ATTRS.map(() => new Float32Array(count * 4));
  let at = 0;
  for (const s of list) {
    const k = MESHES.kinds[s.kind], packed = packMove(s.move);
    for (let v = 0; v < k.count; v++, at++) {
      const o = (k.first + v) * VERTEX_FLOATS, d = MESHES.data;
      pos.set([d[o], d[o + 1], d[o + 2]], at * 3);
      nrm.set([d[o + 3], d[o + 4], d[o + 5]], at * 3);
      edge.set([d[o + 6], d[o + 7], d[o + 8]], at * 3);
      for (let b = 0; b < 3; b++) bev[b].set([d[o + 10 + b * 3], d[o + 11 + b * 3], d[o + 12 + b * 3]], at * 3);
      packed.forEach((p, i) => mv[i].set(p, at * 4));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('aEdge', new THREE.BufferAttribute(edge, 3));
  bev.forEach((b, i) => g.setAttribute(`aBevel${i}`, new THREE.BufferAttribute(b, 3)));
  MOVE_ATTRS.forEach((n, i) => g.setAttribute(n, new THREE.BufferAttribute(mv[i], 4)));
  return g;
}

export function shardTriangles(kind: number): number { return MESHES.kinds[kind].count / 3; }

export interface ShardUniforms {
  uT: { value: number };
  uCore: { value: number };
  uEye: { value: THREE.Vector3 };
  uLamp: { value: THREE.Vector3 };
  uLampI: { value: number };
  uDpr: { value: number };
}

const VERT = /* glsl */ `
attribute vec3 aEdge, aBevel0, aBevel1, aBevel2;
attribute vec4 iC, iU, iV, iS, iQ, iK;
uniform float uT;
varying vec3 vP, vN, vEdge, vObj, vB0, vB1, vB2;
varying float vSize;
${MOVE_GLSL}
void main(){
  vec4 q; vec3 at;
  dMove(uT, q, at);
  vec3 w = at + dRot(q, position * iK.x);
  vP = w; vN = dRot(q, normal); vEdge = aEdge * iK.x; vObj = position; vSize = iK.x;
  vB0 = dRot(q, aBevel0); vB1 = dRot(q, aBevel1); vB2 = dRot(q, aBevel2);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(w, 1.0);
}`;

// The stream's own light on a shard (SHARD_LIGHT in src/stream/shaders.ts), from the world's two lights of the
// stream's kind: the core's ball, and the line of the stream under it.
const LIGHT = /* glsl */ `
varying vec3 vP, vN, vEdge, vObj, vB0, vB1, vB2;
varying float vSize;
uniform float uCore, uDpr, uLampI;
uniform vec3 uEye, uLamp, uPale;
uniform vec3 uHeart; uniform float uCoreR; uniform vec2 uLine;
const float UNIT = ${STREAM_UNIT.toFixed(3)};
// The core is a ball, and seen from under it, it fills a wide cone: far more faces mirror it than mirror the stream's
// line. So a face that mirrors it flashes less, and a clear shard holds less of it, or the cloud under the core burns.
const float BALL_FLASH = ${BALL.flash.toFixed(2)}, BALL_HOLD = ${BALL.hold.toFixed(2)}, REACH_LINE = ${REACH.line.toFixed(2)}, REACH_BALL = ${REACH.ball.toFixed(1)};
vec3 V;
float ggx(float nh, float a){ float a2 = a * a, d = nh * nh * (a2 - 1.0) + 1.0; return a2 / (3.14159 * d * d); }
// The core's ball: how much of its light reaches the shard, which way it lies, and how far round its rim is.
vec3 ballFrom(out float fall, out float cosA){
  vec3 C = uHeart - vP;
  float d = max(length(C), 1e-3);
  float sinA = clamp(uCoreR / d, 0.0, 0.999);
  cosA = sqrt(1.0 - sinA * sinA);
  fall = uCore * 1.1 / (1.0 + pow(max(d - uCoreR, 0.0) / REACH_BALL, 1.5));
  return C / d;
}
float ballBand(vec3 N, vec3 toward, float cosA, float wide){
  vec3 R = reflect(-V, N);
  float soft = wide * 0.2;
  return smoothstep(cosA - soft, cosA + soft * 0.3, dot(R, toward));
}
// The stream's line falling from the core: a band across a face, as the stream's own core makes one.
vec3 lineFrom(out float fall, out vec3 plane){
  vec3 near = vec3(0.0, clamp(vP.y, uLine.y, uLine.x), 0.0);
  vec3 across = near - vP, T = vec3(0.0, 1.0, 0.0);
  float d = length(across);
  vec3 toward = across / max(d, 1e-3);
  fall = uCore * 1.8 / (1.0 + pow(d / (14.0 * UNIT * REACH_LINE), 1.5)) * step(vP.y, uLine.x + 30.0);
  plane = normalize(cross(T, toward) + vec3(1e-5));
  return toward;
}
float lineBand(vec3 N, vec3 toward, vec3 plane, float wide){
  vec3 R = reflect(-V, N);
  float off = dot(R, plane);
  return exp(-off * off / (wide * wide)) * smoothstep(-0.2, 0.35, dot(R, toward));
}
float lampLight(out vec3 Ll){
  vec3 Lv = vec3(uLamp.xy - vP.xy, 120.0 * UNIT);
  Ll = normalize(Lv);
  float near = exp(-dot(Lv.xy, Lv.xy) / pow(170.0 * UNIT, 2.0));
  return uLampI * (0.5 + 1.6 * near) / (1.0 + pow(length(Lv.xy) / (150.0 * UNIT), 2.0));
}
float room(vec3 R){
  vec2 d = vec2(R.x, R.y) / max(R.z + 0.4, 0.25);
  float key = smoothstep(0.1, 0.5, d.y) * (1.0 - smoothstep(0.9, 1.5, d.y)) * (1.0 - smoothstep(0.5, 1.2, abs(d.x + 0.3)));
  float low = smoothstep(-0.3, -0.7, d.y) * (1.0 - smoothstep(0.4, 1.3, abs(d.x - 0.5)));
  return 0.02 + 0.34 * key + 0.1 * low;
}
float edgeLine(float wide){
  float e = min(vEdge.x, min(vEdge.y, vEdge.z));
  return 1.0 - smoothstep(wide * 0.35, wide, e);
}
float tipAt(){ return pow(smoothstep(0.68, 1.0, length(vObj)), 3.0); }
vec3 bevelAt(out float line){
  line = edgeLine(1.15 / uDpr + 0.12);
  vec3 b = vEdge.x <= vEdge.y && vEdge.x <= vEdge.z ? vB0 : (vEdge.y <= vEdge.z ? vB1 : vB2);
  return normalize(b + vec3(1e-5));
}
// The stage balances its picture for a warm light before its tone curve. The stream's shards are drawn on a canvas
// of their own with no such step, so the shards here are given its inverse, to come out as the stream's do.
vec3 unbalance(vec3 c){
  float peak = max(c.r, max(c.g, c.b));
  float k = 1.0 - smoothstep(0.3, 0.85, peak);
  return c / mix(vec3(1.0), vec3(0.96, 1.21, 1.59), k);
}
`;

const SOLID = /* glsl */ `
uniform vec3 uF0, uCopper;
${LIGHT}
void main(){
  V = normalize(uEye - vP);
  vec3 N = normalize(vN);
  if (dot(N, V) < -0.2) N = -N;
  float fb, cosA, fl, line;
  vec3 plane, Ll;
  vec3 tb = ballFrom(fb, cosA), tl = lineFrom(fl, plane);
  float lampI = lampLight(Ll);
  vec3 B = bevelAt(line);
  float fall = fb + fl;
  float flash = fb * (ballBand(N, tb, cosA, 0.2) * BALL_FLASH + ballBand(N, tb, cosA, 0.34) * 0.45 + 0.06 * max(dot(N, tb), 0.0))
              + fl * (lineBand(N, tl, plane, 0.2) * 9.0 + lineBand(N, tl, plane, 0.34) * 0.45 + 0.06 * max(dot(N, tl), 0.0));
  float lamp = (ggx(max(dot(N, normalize(Ll + V)), 0.0), 0.1) * 0.11 + 0.07) * max(dot(N, Ll), 0.0) * lampI;
  float light = room(reflect(-V, N)) * (0.16 + 0.6 * min(fall, 1.0)) + flash + fall * 0.03 + 0.015 + lamp;
  float edge = fb * (ballBand(B, tb, cosA, 0.45) * 3.4 + 0.1) + fl * (lineBand(B, tl, plane, 0.45) * 3.4 + 0.1)
             + (ggx(max(dot(B, normalize(Ll + V)), 0.0), 0.22) * 0.35 + 0.1) * max(dot(B, Ll), 0.0) * lampI + 0.03;
  light = mix(light, max(light, edge), line) + tipAt() * (1.8 * fall + 0.6 * lampI);
  vec3 col = mix(uCopper, uF0, 0.3 * clamp(light - 0.6, 0.0, 1.0)) * vec3(1.0, 0.92, 0.8) * light * 1.35;
  float mx = max(col.r, max(col.g, col.b));
  col *= (1.0 - exp(-mx * 1.15)) / (mx * 0.955 + 1e-5);
  col = mix(col, uPale, clamp((light - 1.7) * 0.4, 0.0, 0.85));
  gl_FragColor = vec4(unbalance(col), 1.0);
}`;

const CLEAR = /* glsl */ `
uniform vec3 uEmber, uFlame, uHot;
${LIGHT}
vec3 ramp(float a){
  vec3 c = uEmber * clamp(a / 0.11, 0.0, 1.0);
  c = mix(c, uFlame, smoothstep(0.07, 0.42, a));
  c = mix(c, uHot, smoothstep(0.34, 0.85, a));
  c = mix(c, uPale, smoothstep(0.7, 1.6, a));
  return c;
}
void main(){
  V = normalize(uEye - vP);
  vec3 N = normalize(vN);
  if (dot(N, V) < -0.2) N = -N;
  float fb, cosA, fl, line;
  vec3 plane, Ll;
  vec3 tb = ballFrom(fb, cosA), tl = lineFrom(fl, plane);
  float lampI = lampLight(Ll);
  vec3 B = bevelAt(line);
  float fall = fb * BALL_HOLD + fl;
  vec3 toward = normalize(tb * fb + tl * fl + vec3(1e-5));
  float deep = pow(smoothstep(0.0, 0.34 * vSize, min(vEdge.x, min(vEdge.y, vEdge.z))), 1.3);
  float away = 0.5 - 0.5 * dot(N, toward);
  float graze = pow(1.0 - abs(dot(N, V)), 3.0);
  float held = min(sqrt(fall), 1.2) * (0.16 + 0.5 * pow(away, 1.5) + 0.08 * graze) + 0.22 * lampI * max(dot(N, Ll), 0.0);
  held += 0.55 * (fb * ballBand(N, tb, cosA, 0.36) + fl * lineBand(N, tl, plane, 0.36));
  held = 0.8 * (1.0 - exp(-held * (0.22 + 0.78 * deep) / 0.42)) + 0.03 * room(reflect(-V, N));
  float toLamp = max(dot(B, Ll), 0.0);
  float glint = (fb * ballBand(N, tb, cosA, 0.07) + fl * lineBand(N, tl, plane, 0.07)) * 2.8 + ggx(max(dot(N, normalize(Ll + V)), 0.0), 0.1) * max(dot(N, Ll), 0.0) * 0.1 * lampI;
  float rim = 1.0 - smoothstep(0.1, 0.55, abs(dot(B, V)));
  float edge = (held * 1.5 + 0.1 * min(fall, 1.0)) * rim + 2.8 * (fb * ballBand(B, tb, cosA, 0.42) + fl * lineBand(B, tl, plane, 0.42)) + lampI * 0.4 * toLamp * toLamp * toLamp;
  float point = tipAt() * (1.6 * fall + 0.7 * lampI);
  vec3 col = ramp(held);
  col = max(col, ramp(glint + point));
  col = mix(col, max(col, ramp(edge + point)), line);
  col = min(col, uPale);
  // What is behind shows through it, dimmed as the stream's clear shards dim it.
  float a = clamp(0.24 + 0.6 * line * min(edge, 1.0) + 1.6 * held + glint, 0.0, 1.0);
  gl_FragColor = vec4(unbalance(col), a);
}`;

export function shardMaterials(u: ShardUniforms): { solid: THREE.ShaderMaterial; clear: THREE.ShaderMaterial } {
  const shared = {
    uHeart: { value: new THREE.Vector3(...HEART) },
    uCoreR: { value: CORE.r },
    uLine: { value: new THREE.Vector2(SOURCE[1], SOURCE[1] - 600) },
    uPale: { value: lin('pale') },
  };
  const solid = new THREE.ShaderMaterial({
    name: 'debris-shard',
    uniforms: { ...u, ...shared, uF0: { value: new THREE.Vector3(...COPPER_LIGHT) }, uCopper: { value: new THREE.Vector3(...COPPER) } },
    vertexShader: VERT,
    fragmentShader: SOLID,
  });
  const clear = new THREE.ShaderMaterial({
    name: 'debris-clear',
    uniforms: { ...u, ...shared, uEmber: { value: lin('ember') }, uFlame: { value: lin('flame') }, uHot: { value: lin('hot') } },
    vertexShader: VERT,
    fragmentShader: CLEAR,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  return { solid, clear };
}
