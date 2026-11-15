import * as THREE from 'three';
import { shade } from '../../../../world/surface';

// Dark oiled timber, worked out per pixel from the desk's own millimetres. Every board, leg and peg carries its own
// tree in a `cell` attribute (see grain()): a seed, which way its grain runs, and where the pith of the log it was
// cut from lies across that grain. So each piece has its own rings, its own run of figure and its own tone, and the
// end grain on a cut end is the same rings seen the other way.
//
// Nothing finer than a pixel is drawn: rings, pores and the figure each fade to their own average before they get
// that fine, so the grain holds still while the light and the page move.

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

const v3 = (v: [number, number, number]) => `vec3(${v.map((x) => x.toFixed(1)).join(', ')})`;

// The glue lines where the top's boards are butted together: drawn, filtered over the pixel, not cut, since a groove
// that fine only shows the occlusion pass's noise.
export interface Glue { joints: number[]; below: number }

// Where the finish changes: the trestles, out from this far either side of the middle, are a plain rubbed oil, darker
// and duller than the top. The drawer fronts and their frame, from x l to r and in front of z, are waxed, a shade
// lighter and smoother.
export interface Finish { trestle: number; drawers: [number, number, number] }

export function timber(wear: Wear[], glue: Glue, finish: Finish): THREE.MeshPhysicalMaterial {
  // A high index with a low intensity: the oil's sheen face on is as strong as before, and what it mirrors at a
  // grazing angle, which is the room, stays faint. Three ties the grazing reflection to the intensity alone.
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.5, ior: 2.3, specularIntensity: 0.12, envMapIntensity: 0.3, specularColor: new THREE.Color(0xffd2a4) });
  m.name = 'bench-timber';
  const rubs = wear.map((w) => `rub += ${w.k.toFixed(2)} * wBox(p, ${v3(w.at)}, ${v3(w.r)})${w.up ? ' * smoothstep(0.6, 0.9, n.y)' : ''};`).join('\n    ');
  shade(m, 'bench-timber', {
    vhead: 'attribute vec4 cell; varying vec4 vCell; varying vec3 vGrainV;',
    vert: 'vCell = cell; vGrainV = normalize(mat3(modelViewMatrix) * (cell.y < 0.5 ? vec3(1.0, 0.0, 0.0) : cell.y < 1.5 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0)));',
    head: /* glsl */ `
varying vec4 vCell; varying vec3 vGrainV;
float tEnd, tRough, tTilt, tRub;
float wBox(vec3 p, vec3 c, vec3 r){ vec3 d = abs(p - c) / r; return 1.0 - smoothstep(0.55, 1.0, max(d.x, max(d.y, d.z))); }
`,
    color: /* glsl */ `
  {
    vec3 p = vObj, n = normalize(vObjN);
    float seed = vCell.x, axis = vCell.y;
    // u runs along the grain, a and b across it.
    vec3 g = axis < 0.5 ? p.xzy : axis < 1.5 ? p.yxz : p.zxy;
    vec3 ax = axis < 0.5 ? vec3(1.0, 0.0, 0.0) : axis < 1.5 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0);
    tEnd = smoothstep(0.6, 0.86, abs(dot(n, ax)));
    float px = max(max(fwidth(p.x), fwidth(p.y)), fwidth(p.z));
    // Every board comes from its own place in its log, so no figure is met twice.
    float u = g.x + seed * 3711.0;
    vec2 ab = g.yz - vCell.zw;
    // The rings round the pith. Most boards are sawn across the rings, so their faces show fine straight lines; a log
    // tapers and wanders a little, so here and there a line runs out of the face or a cathedral rises.
    float wob = (wFbm(vec3(u * 0.0007, seed * 17.0, 0.5)) - 0.5) * 3.5;
    float r = length(ab) + wob + u * 0.0018 * (fract(seed * 3.7) > 0.5 ? 1.0 : -1.0);
    float S = 3.0 + 1.8 * fract(seed * 7.3);
    // Some years grew more than others: the rings bunch and spread.
    float ph = r / S + 2.2 * wNoise(vec3(r * 0.03, seed * 11.0, 4.0));
    float fw = fwidth(ph);
    float x = fract(ph);
    // Early wood swells into the dark late wood, which ends hard at the next ring. The edges are never sharper
    // than the pixel, and a ring finer than about three pixels is its own average.
    float e = max(0.05, fw * 1.1);
    float late = smoothstep(0.74 - e, 0.84 + e, x) * (1.0 - smoothstep(1.0 - e, 1.0, x));
    late = mix(late, 0.2, smoothstep(0.16, 0.42, fw));
    late *= 0.6 + 0.4 * smoothstep(0.2, 0.8, wNoise(vec3(floor(ph) * 0.41, seed * 9.0, 1.0)));
    // Long quiet lines: runs of a few darker rings, which carry the grain from across the room.
    float lines = wNoise(vec3(ph * 0.17, u * 0.0005, seed * 7.0));
    float broad = wFbm(vec3(ph * 0.03, u * 0.0007, seed * 5.0));
    // Pores: short dark dashes along the grain, dots on an end. The rays: small pale flecks across it. Only up close.
    float near = 1.0 - smoothstep(0.35, 0.85, px);
    float pz = wNoise(vec3(u * 0.085, g.y * 1.7, g.z * 1.7));
    float pores = smoothstep(0.54, 0.76, pz) * (1.0 - 0.5 * late) * near;
    float fleck = smoothstep(0.8, 0.93, wNoise(vec3(u * 0.07, ph * 1.4, seed * 23.0))) * near * (1.0 - tEnd);
    float tone = 0.8 + 0.4 * fract(seed * 13.7);
    vec3 early = mix(vec3(0.0105, 0.005, 0.0029), vec3(0.03, 0.0136, 0.0068), 0.35 + 0.5 * broad);
    vec3 lateC = vec3(0.0032, 0.0016, 0.001);
    vec3 col = mix(early, lateC, late * 0.95);
    col *= (0.86 + 0.28 * broad) * (0.88 + 0.24 * lines) * tone * (1.0 + 0.3 * fleck);
    // Now and then a dark mineral streak runs with the grain for a hand's length.
    col *= 1.0 - 0.3 * smoothstep(0.74, 0.88, wNoise(vec3(u * 0.0017, g.y * 0.045 + seed * 31.0, g.z * 0.045)));
    col *= 1.0 - pores * 0.62;
    // An end drinks the oil: darker, duller, with the rings as arcs.
    col *= mix(1.0, 0.62, tEnd);
    // Rubbed: where hands and feet go, and along every arris.
    float rub = 0.0;
    ${rubs}
    // An arris narrower than a couple of pixels would be a bright line that stair steps: there it is left alone.
    float arris = smoothstep(0.06, 0.22, 1.0 - max(abs(n.x), max(abs(n.y), abs(n.z)))) * (1.0 - smoothstep(0.2, 0.5, length(fwidth(n))));
    tRub = clamp(rub + arris * 0.7, 0.0, 1.0);
    col *= 1.0 + 0.75 * tRub + 0.6 * arris;
    if (axis < 0.5 && p.y > ${glue.below.toFixed(1)}) {
      float jd = 1e4;
      ${glue.joints.map((z) => `jd = min(jd, abs(p.z - (${z.toFixed(1)})));`).join(' ')}
      float jw = max(fwidth(p.z), 1e-3);
      float line = clamp((min(jd + 0.5 * jw, 0.5) - max(jd - 0.5 * jw, -0.5)) / jw, 0.0, 1.0) * (1.0 - smoothstep(0.6, 0.95, abs(n.z)));
      col *= 1.0 - 0.88 * line;
    }
    float trestle = smoothstep(${(finish.trestle - 20).toFixed(1)}, ${finish.trestle.toFixed(1)}, abs(p.x)) * step(p.y, -60.0);
    float waxed = step(${finish.drawers[0].toFixed(1)}, p.x) * step(p.x, ${finish.drawers[1].toFixed(1)}) * step(${finish.drawers[2].toFixed(1)}, p.z) * step(p.y, -58.5);
    col *= mix(1.0, 0.78, trestle) * mix(1.0, 1.12, waxed);
    col = mix(col, vec3(dot(col, vec3(0.3, 0.59, 0.11))), 0.18 * trestle);
    diffuseColor.rgb = col;
    // The oil sits in the dense late wood and the dark streaks and polishes there, and the open early wood stays
    // dull: the sheen shows the figure.
    // Up close the sheen shows the figure. From across the room that would be stripes, so it is its average.
    float figureSeen = 1.0 - smoothstep(1.0, 2.6, px);
    tRough = 0.46 + figureSeen * (0.18 * (1.0 - late) - 0.09 + 0.08 * (lines - 0.5)) - 0.1 * fleck
      + 0.16 * pores + 0.3 * tEnd - 0.12 * tRub - 0.16 * arris;
    tRough += 0.14 * trestle - 0.08 * waxed;
    // Where the face turns within a pixel its highlight would be a stepped line one pixel wide: spread it instead.
    tRough = max(tRough, 0.3 + 1.6 * length(fwidth(n)));
    // The fibres dip in and out of the face: the sheen moves along the grain in soft bands as the light moves. Three's
    // anisotropic highlight did this better and once in a while divided by nothing, which blacks out the canvas.
    tTilt = (1.0 - tEnd) * (0.008 + 0.008 * figureSeen) * sin(u * (0.018 + 0.012 * fract(seed * 4.3)) + 6.0 * wNoise(vec3(u * 0.003, ph * 0.04, seed * 3.0)));
  }`,
    rough: 'roughnessFactor = clamp(tRough, 0.2, 0.95);',
    normal: 'normal = normalize(normal + vGrainV * tTilt);',
  });
  return m;
}
