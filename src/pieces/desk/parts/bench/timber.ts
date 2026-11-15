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

export function timber(wear: Wear[], glue: Glue): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.5, specularIntensity: 0.32, specularColor: new THREE.Color(0xffd6ae) });
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
    float u = g.x;
    vec2 ab = g.yz - vCell.zw;
    // The rings: round the pith, wandering slowly along the board, and running out of its face a little.
    // The log tapers, so a face cut along it crosses the rings in nested arches. The wander is kept gentle enough
    // never to close a ring on itself, which reads as plywood.
    float wob = (wFbm(vec3(u * 0.0009, seed * 17.0, 0.5)) - 0.5) * 7.0 + (wNoise(vec3(u * 0.005, seed * 5.0, 2.0)) - 0.5) * 0.5;
    float r = length(ab) + wob + u * (0.003 + 0.006 * fract(seed * 5.1)) * (fract(seed * 3.7) > 0.5 ? 1.0 : -1.0);
    float S = 2.4 + 1.2 * fract(seed * 7.3);
    // Some years grew more than others: the rings bunch and spread.
    float ph = r / S + 3.0 * wNoise(vec3(r * 0.02, seed * 11.0, 4.0));
    float fw = fwidth(ph);
    float x = fract(ph);
    // Early wood swells into the dark late wood, which ends hard at the next ring. The edges are never sharper
    // than the pixel, and a ring finer than about three pixels is its own average.
    float e = max(0.05, fw * 1.1);
    float late = smoothstep(0.42 - e, 0.86 + e, x) * (1.0 - smoothstep(1.0 - e, 1.0, x));
    late = mix(late, 0.3, smoothstep(0.16, 0.42, fw));
    late *= 0.35 + 0.65 * smoothstep(0.2, 0.8, wNoise(vec3(floor(ph) * 0.41, seed * 9.0, 1.0)));
    // The figure, a few rings wide, and long streaks of colour along the grain: what carries it from across the room.
    float broad = wFbm(vec3(ph * 0.06, u * 0.0016, seed * 7.0));
    float sa = wFbm(vec3(u * 0.0012, g.y * 0.07, g.z * 0.07 + seed * 13.0));
    float sb = wNoise(vec3(u * 0.004, g.y * 0.32, g.z * 0.32 + seed * 5.0));
    float streak = sa + (sb - 0.5) * 0.5 * (1.0 - smoothstep(0.6, 1.6, px));
    // Pores: short dark dashes along the grain, dots on an end. Only up close.
    float pz = wNoise(vec3(u * 0.085, g.y * 1.7, g.z * 1.7));
    float pores = smoothstep(0.62, 0.86, pz) * (1.0 - 0.6 * late) * (1.0 - smoothstep(0.22, 0.6, px));
    float tone = 0.78 + 0.44 * fract(seed * 13.7);
    vec3 early = mix(vec3(0.0082, 0.0049, 0.0035), vec3(0.0235, 0.0134, 0.0086), broad);
    vec3 lateC = vec3(0.0034, 0.0019, 0.0013);
    vec3 col = mix(early, lateC, late * 0.92);
    col *= (0.8 + 0.4 * broad) * (0.7 + 0.6 * streak) * tone;
    col *= 1.0 - pores * 0.5;
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
    diffuseColor.rgb = col;
    // The oil sits in the dense late wood and the dark streaks and polishes there, and the open early wood stays
    // dull: the sheen shows the figure.
    // Up close the sheen shows the figure. From across the room that would be stripes, so it is its average.
    float figureSeen = 1.0 - smoothstep(0.5, 1.3, px);
    tRough = 0.4 + figureSeen * (0.2 * (1.0 - late) - 0.08 + 0.16 * smoothstep(0.35, 0.75, broad) * (1.0 - 0.5 * late) + 0.1 * smoothstep(0.45, 0.8, streak) - 0.17)
      + 0.16 * pores + 0.3 * tEnd - 0.12 * tRub - 0.16 * arris;
    // Where the face turns within a pixel its highlight would be a stepped line one pixel wide: spread it instead.
    tRough = max(tRough, 0.3 + 1.6 * length(fwidth(n)));
    // The fibres dip in and out of the face: the sheen moves along the grain in soft bands as the light moves. Three's
    // anisotropic highlight did this better and once in a while divided by nothing, which blacks out the canvas.
    tTilt = (1.0 - tEnd) * (0.035 + 0.025 * figureSeen) * sin(u * 0.022 + 5.0 * wNoise(vec3(u * 0.003, ph * 0.04, seed * 3.0)));
  }`,
    rough: 'roughnessFactor = clamp(tRough, 0.2, 0.95);',
    normal: 'normal = normalize(normal + vGrainV * tTilt);',
  });
  return m;
}
