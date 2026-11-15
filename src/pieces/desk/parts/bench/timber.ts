import * as THREE from 'three';
import { shade } from '../../../../world/surface';

// Dark oiled walnut under a satin coat, worked out per pixel from the desk's own millimetres. Every board, leg and peg
// carries its own tree in a `cell` attribute (see grain()): a seed, which way its grain runs, and where the pith of the
// log it was cut from lies across that grain. The rings are the distance from that pith, and the pith wanders and the
// log tapers along the board, so a face sawn above the pith rises in cathedral arches over its middle and runs out in
// straight lines toward its edges, as a flat sawn board does. The end of a board shows the same rings as arcs.
//
// Two scales of figure: the year rings, seen close, and bands of good and lean years a few rings wide, which carry the
// arches from across the room. Each fades to its own average before it is finer than a pixel, so nothing crawls.

export type Axis = 'x' | 'y' | 'z';
const AXES: Record<Axis, number> = { x: 0, y: 1, z: 2 };

// Tags a piece of timber with its tree. pa and pb are where the pith lies across the grain, in the desk's
// millimetres: (z, y) for grain along x, (x, z) along y, (x, y) along z.
export function grain(g: THREE.BufferGeometry, seed: number, axis: Axis, pa: number, pb: number): THREE.BufferGeometry {
  const n = g.getAttribute('position').count, cell = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) cell.set([seed, AXES[axis], pa, pb], i * 4);
  g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
  return g;
}

// Where hands and feet have rubbed the oil to a shine: places in the desk's millimetres, each a box it fades out of.
export interface Wear { at: [number, number, number]; r: [number, number, number]; k: number; up?: boolean }

// A knot in the top: where a branch left the trunk, in the desk's millimetres, and its radius across the grain.
export interface Knot { at: [number, number, number]; r: number }

const v3 = (v: [number, number, number]) => `vec3(${v.map((x) => x.toFixed(1)).join(', ')})`;

// The joints where the top's boards are butted together, across the depth, and the height below which a face is not
// the top's. Drawn, filtered over the pixel, not cut: a groove that fine only shows the occlusion pass's noise.
export interface Glue { joints: number[]; below: number }

// Where the finish changes: the trestles, out from this far either side of the middle, are a plain rubbed oil with
// less of the coat. The drawer fronts and their frame, from x l to r and in front of z, are waxed, a shade lighter.
export interface Finish { trestle: number; drawers: [number, number, number] }

// How much of the room the oil mirrors, against the lights.
const ROOM = 0.3;

export function timber(wear: Wear[], glue: Glue, finish: Finish, knots: Knot[]): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.6, ior: 1.5, specularIntensity: 0.5, envMapIntensity: 0.18, specularColor: new THREE.Color(0xffdcbc) });
  m.name = 'bench-timber';
  const rubs = wear.map((w) => `rub += ${w.k.toFixed(2)} * wBox(p, ${v3(w.at)}, ${v3(w.r)})${w.up ? ' * smoothstep(0.6, 0.9, n.y)' : ''};`).join('\n    ');
  const knotsGl = knots.map((k) => `{ vec3 kv = p - ${v3(k.at)}; float al = dot(kv, ax), ac = length(kv - al * ax);
      kd = min(kd, length(vec2(al / 1.5, ac)) / ${k.r.toFixed(1)}); kf = min(kf, length(vec2(al / 4.0, ac)) / ${k.r.toFixed(1)}); }`).join('\n    ');
  shade(m, 'bench-timber', {
    vhead: 'attribute vec4 cell; varying vec4 vCell;',
    vert: 'vCell = cell;',
    head: /* glsl */ `
varying vec4 vCell;
float tEnd, tRough, tArris, tSpec, tRub;
float wBox(vec3 p, vec3 c, vec3 r){ vec3 d = abs(p - c) / r; return 1.0 - smoothstep(0.55, 1.0, max(d.x, max(d.y, d.z))); }
// A band of width w at distance d, as much of it as falls inside a pixel f wide.
float tLine(float d, float w, float f){ f = max(f, 1e-3); return clamp((min(d + 0.5 * f, 0.5 * w) - max(d - 0.5 * f, -0.5 * w)) / f, 0.0, 1.0); }
`,
    color: /* glsl */ `
  {
    vec3 p = vObj, n = normalize(vObjN);
    float seed = vCell.x, axis = vCell.y;
    // g.x runs along the grain, g.yz across it, in the same order as the pith's pa and pb.
    vec3 g = axis < 0.5 ? p.xzy : axis < 1.5 ? p.yxz : p.zxy;
    vec3 ax = axis < 0.5 ? vec3(1.0, 0.0, 0.0) : axis < 1.5 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0);
    tEnd = smoothstep(0.6, 0.86, abs(dot(n, ax)));
    float px = max(max(fwidth(p.x), fwidth(p.y)), fwidth(p.z));
    float u = g.x + seed * 3711.0;
    // The pith wanders as the tree grew and the log tapers, so the face cuts the rings at a depth that changes along
    // the board: that is what raises the arches.
    // A piece sawn far from its pith (the legs, the rails) shows straight grain, and the arches are the top's.
    float flatSawn = clamp(170.0 / max(length(g.yz - vCell.zw), 1.0), 0.2, 1.0);
    vec2 wander = (vec2(wNoise(vec3(u * 0.0011, seed * 13.0, 1.0)) - 0.5, wNoise(vec3(u * 0.0008, seed * 7.0, 5.0)) - 0.5) * vec2(18.0, 16.0)
      + vec2(0.0, wNoise(vec3(u * 0.004, seed * 5.0, 2.0)) - 0.5) * 3.0) * flatSawn;
    vec2 ab = g.yz - vCell.zw + wander;
    float r = length(ab) + u * (0.026 + 0.016 * fract(seed * 5.9)) * flatSawn * (fract(seed * 3.7) > 0.5 ? 1.0 : -1.0);
    // A knot: the rings swell round it and it is its own dark eye, ringed, with a dark rim where the bark was.
    float kd = 1e4, kf = 1e4;
    ${knotsGl}
    // The rings part round a knot and close again behind it, so it sits in an eye drawn out along the grain.
    r -= 7.0 * exp(-kf * kf * 0.2);
    float S = 3.2 + 1.4 * fract(seed * 7.3);
    // Some years grew more than others: the rings bunch and spread.
    float ph = r / S + 1.6 * wNoise(vec3(r * 0.05, seed * 11.0, 4.0)) + 3.0 * wNoise(vec3(r * 0.011, seed * 17.0, 6.0));
    float fw = fwidth(ph);
    float x = fract(ph);
    float e = max(0.035, fw * 1.1);
    float late = smoothstep(0.62 - e, 0.8 + e, x) * (1.0 - smoothstep(1.0 - e, 1.0, x));
    // A ring's late wood is not one unbroken line: it fades and comes back along the board.
    late *= 0.45 + 0.55 * smoothstep(0.25, 0.65, wNoise(vec3(u * 0.011, floor(ph) * 0.71, seed * 5.0)));
    late = mix(late, 0.3, smoothstep(0.18, 0.45, fw));
    // Bands of good and lean years, a few rings wide: the figure as it reads from across the room.
    float bp = r / (S * 4.6) + 0.8 * wNoise(vec3(r * 0.018, seed * 3.0, 9.0));
    float bw = fwidth(bp);
    float band = smoothstep(0.22, 0.78, wNoise(vec3(bp * 1.3, seed * 3.0, 9.0)));
    band = mix(band, 0.5, smoothstep(0.22, 0.5, bw));
    float broad = wFbm(vec3(u * 0.0016, r * 0.01, seed * 5.0));
    // Pores: short dark dashes along the grain, dots on an end. Rays: small pale flecks across it. Only up close.
    float near = 1.0 - smoothstep(0.3, 0.8, px);
    float pores = smoothstep(0.6, 0.85, wNoise(vec3(u * 0.018, r * 0.9, seed * 13.0))) * (1.0 - smoothstep(0.32, 0.55, 0.9 * max(fwidth(r), 1e-4)));
    float fleck = smoothstep(0.8, 0.93, wNoise(vec3(u * 0.07, ph * 1.4, seed * 23.0))) * near * (1.0 - tEnd);
    // The grain itself: fine dark streaks of pores along each ring, at three sizes, each left out before it is finer
    // than a pixel.
    float rw = max(fwidth(r), 1e-4), uw = max(fwidth(u), 1e-4), fib = 0.0;
    for (int i = 0; i < 3; i++) {
      float fa = 0.2 * pow(2.4, float(i));
      float k = (1.0 - smoothstep(0.22, 0.45, fa * rw)) * (1.0 - smoothstep(0.22, 0.45, fa * uw / 9.0));
      fib += (wNoise(vec3(u * fa / 9.0, r * fa, seed * 7.0 + float(i) * 3.1)) - 0.5) * k * (0.55 - 0.1 * float(i));
    }
    fib *= 1.0 - tEnd;
    float tone = 0.8 + 0.4 * fract(seed * 13.7);
    // Each board its own shade of walnut: one a little redder, one a little greyer.
    float hue = fract(seed * 29.3) - 0.5;
    vec3 pale = vec3(0.0235, 0.0152 - 0.0017 * hue, 0.0099 + 0.0013 * hue), deep = vec3(0.0102, 0.0065, 0.0043), lateC = vec3(0.0036, 0.0023, 0.0016);
    vec3 col = mix(deep, pale, 0.12 + 0.75 * band * (0.6 + 0.8 * broad));
    col = mix(col, lateC, late * (0.3 + 0.65 * wNoise(vec3(floor(ph) * 0.37, seed * 9.0, 1.0))));
    // Heartwood and the odd paler, greyer streak, a hand's width, running the board's length.
    float streak = wNoise(vec3(u * 0.0006, r * 0.035, seed * 19.0));
    col *= 0.78 + 0.44 * streak;
    col *= tone * (0.9 + 0.2 * broad) * (1.0 + 0.25 * fleck) * (1.0 - 0.3 * pores) * (1.0 + 1.1 * fib);
    // Now and then a dark mineral streak runs with the grain for a hand's length.
    col *= 1.0 - 0.32 * smoothstep(0.74, 0.88, wNoise(vec3(u * 0.0017, g.y * 0.045 + seed * 31.0, g.z * 0.045)));
    float knot = 1.0 - smoothstep(0.92, 1.08, kd);
    float kr = 0.5 + 0.5 * sin(kd * 15.0);
    kr = mix(kr, 0.5, smoothstep(0.15, 0.4, fwidth(kd * 2.4)));
    col = mix(col, vec3(0.0085, 0.0049, 0.0034) * (0.85 + 0.3 * kr) * (0.8 + 0.4 * wNoise(vec3(p * 0.4))), knot);
    col *= 1.0 - 0.25 * exp(-pow((kd - 1.0) * 5.0, 2.0)) * (1.0 - smoothstep(0.3, 0.6, fwidth(kd)));
    // An end drinks the oil: darker, with the rings as arcs.
    col *= mix(1.0, 0.7, tEnd);
    // Rubbed: where hands and feet go.
    float rub = 0.0;
    ${rubs}
    tRub = clamp(rub, 0.0, 1.0);
    // Every arris is worn through the oil to paler wood and polished by hands, and holds a line of light.
    float flatN = 1.0 - max(abs(n.x), max(abs(n.y), abs(n.z)));
    // An arris narrower than a pixel or two would be a bright line that stair steps: there it is left alone.
    // A slope cut across the grain (the feet's and bearers' ends) is end grain, not an arris.
    tArris = smoothstep(0.05, 0.2, flatN) * (1.0 - smoothstep(0.25, 0.55, length(fwidth(n)))) * (1.0 - smoothstep(0.75, 0.9, abs(dot(n, ax))));
    col *= 1.0 + 0.5 * tRub;
    col = mix(col, col * 2.3 + vec3(0.014, 0.0095, 0.0066), 0.85 * tArris);
    if (axis < 0.5 && p.y > ${glue.below.toFixed(1)}) {
      float jd = 1e4;
      ${glue.joints.map((z) => `jd = min(jd, abs(p.z - (${z.toFixed(1)})));`).join(' ')}
      float fz = fwidth(p.z);
      float on = 1.0 - smoothstep(0.6, 0.95, abs(n.z));
      // The joint itself, and either side of it each board's arris eased a little, which takes less light.
      col *= 1.0 - 0.85 * tLine(jd, 1.4, fz) * on;
      col *= 1.0 - 0.3 * tLine(jd, 5.0, fz) * on;
    }
    float trestle = smoothstep(${(finish.trestle - 20).toFixed(1)}, ${finish.trestle.toFixed(1)}, abs(p.x)) * step(p.y, -60.0);
    float waxed = step(${finish.drawers[0].toFixed(1)}, p.x) * step(p.x, ${finish.drawers[1].toFixed(1)}) * step(${finish.drawers[2].toFixed(1)}, p.z) * step(p.y, -58.5);
    col *= mix(1.0, 0.86, trestle) * mix(1.0, 1.1, waxed);
    diffuseColor.rgb = col;
    // The oil sits in the dense late wood and polishes there, and the open early wood stays duller: up close the sheen
    // shows the figure. From across the room that would be stripes, so it is its average.
    float figureSeen = 1.0 - smoothstep(1.0, 2.6, px);
    tRough = 0.44 + figureSeen * 0.12 * (0.5 - late) + 0.06 * (band - 0.5) + 0.14 * pores + 0.22 * tEnd - 0.18 * tRub - 0.3 * tArris + 0.1 * trestle + 0.15 * knot;
    tSpec = (1.0 + 4.0 * tArris) * (1.0 - 0.35 * trestle) * (1.0 - 0.5 * tEnd) * (1.0 - 0.4 * knot);
  }`,
    rough: 'roughnessFactor = clamp(tRough, 0.2, 0.95);',
  });
  const own = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    own.call(m, sh, r);
    sh.fragmentShader = sh.fragmentShader
      // The oil's satin is the lights' sheen dragged across the top, which moves with them. What it mirrors of the
      // room, at this grazing view, was a grey haze over the whole top that hid the figure, so little of it is kept.
      .replace('#include <lights_fragment_maps>', `#include <lights_fragment_maps>
  radiance *= ${ROOM.toFixed(2)};`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
  material.specularColor *= tSpec; material.specularColorBlended *= tSpec; material.specularF90 = min(1.0, material.specularF90 * tSpec);
`);
  };
  return m;
}
