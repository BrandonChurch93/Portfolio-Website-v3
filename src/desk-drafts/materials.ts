import * as THREE from 'three';
import { hex } from '../config/palette';
import { metal, shade, withObj } from '../world/surface';

// Surfaces for the rough desks, worked out in the shader from the model's own millimetres.

// A dark timber, smoked nearly to black: straight grain with the odd arch, open pores, a hand rubbed sheen. The grain
// runs along x for a top or a rail, along y for a leg, along z for a bearer.
export function timber(grain: 'x' | 'y' | 'z'): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.46, clearcoat: 0.3, clearcoatRoughness: 0.34 });
  m.name = `timber-${grain}`;
  const p = grain === 'x' ? 'vObj' : grain === 'y' ? 'vObj.yxz' : 'vObj.zyx';
  return withObj(m, `desk-timber-${grain}`, /* glsl */ `
vec3 timberAt(vec3 p){
  float board = floor((p.z + 4000.0) / 196.0);
  float bs = wHash(vec3(board, 3.1, 7.7));
  vec2 c = vec2(-90.0 - bs * 160.0, (board - 20.0) * 196.0 + (bs - 0.5) * 150.0);
  float skew = (0.02 + 0.03 * bs) * (bs > 0.5 ? 1.0 : -1.0);
  vec2 q = vec2(p.y + p.x * skew * 0.7, p.z + p.x * skew * 0.3) - c;
  float wob = wFbm(vec3(p.x * 0.0022, bs * 9.0, 0.0)) * 18.0 + wFbm(p * 0.012) * 2.5;
  float r = length(q) + wob;
  float spacing = 2.6 + 1.4 * wNoise(vec3(r * 0.01, bs * 5.0, 0.0));
  float ring = fract(r / spacing);
  // Rings finer than a pixel fade out, so the grain never turns to bands at a distance.
  float fine = 1.0 - smoothstep(0.22, 0.55, fwidth(r) / spacing);
  float late = smoothstep(0.5, 0.9, ring) * (1.0 - smoothstep(0.9, 1.0, ring)) * fine;
  // How much of the model one pixel covers, in millimetres. Detail finer than that is left out, or it sparkles.
  float px = max(fwidth(p.x), max(fwidth(p.y), fwidth(p.z)));
  float close = 1.0 - smoothstep(0.2, 0.6, px);
  float pores = smoothstep(0.6, 0.9, wNoise(vec3(p.x * 0.05, p.y * 1.8, p.z * 1.8))) * close;
  // Broad bands of early and late growth, wide enough to read from across the page.
  float broad = 0.5 + 0.5 * sin(r / (spacing * 1.15) + 4.0 * wNoise(vec3(p.x * 0.006, bs * 7.0, 1.3)));
  broad *= 1.0 - smoothstep(4.0, 10.0, px);
  float figure = wFbm(vec3(p.x * 0.003, p.z * 0.018, bs * 3.0));
  vec3 early = mix(vec3(0.03, 0.0146, 0.0082), vec3(0.058, 0.0285, 0.0152), figure);
  vec3 col = mix(early, vec3(0.005, 0.0024, 0.0013), late * 0.8);
  col = mix(col, early * 0.66, 1.0 - fine);
  col *= 0.74 + 0.42 * broad;
  col *= 1.0 - pores * 0.4;
  col += smoothstep(0.86, 0.95, wNoise(vec3(p.x * 0.08, r * 0.6, bs * 13.0))) * vec3(0.012, 0.007, 0.004);
  return col;
}`, /* glsl */ `
  diffuseColor.rgb = timberAt(${p});`, /* glsl */ `
  { vec3 tp = ${p}; float tpx = max(fwidth(tp.x), max(fwidth(tp.y), fwidth(tp.z)));
    roughnessFactor = roughnessFactor + 0.1 * (wNoise(tp * 0.6) - 0.5) * (1.0 - smoothstep(0.3, 0.9, tpx)) + 0.05; }`);
}

const BROWN: [number, number, number] = [0.5, 0.36, 0.26];

export interface Mats {
  top: THREE.Material;
  post: THREE.Material;
  cross: THREE.Material;
  // The front edge the stream rides: the brightest metal on the desk.
  edge: THREE.Material;
  bronze: THREE.Material;
  cast: THREE.Material;
  steel: THREE.Material;
  coal: THREE.Material;
  glass: THREE.Material;
  ember: THREE.MeshBasicMaterial;
  floor: THREE.Material;
}

export function materials(): Mats {
  const coal = new THREE.MeshPhysicalMaterial({ color: 0x100d0b, roughness: 0.62 });
  coal.name = 'coal';
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0c0806, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.22, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false });
  glass.name = 'glass';
  const ember = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex('flame')).multiplyScalar(1.15) });
  ember.name = 'ember';
  // The floor is the page's own ground: it takes light and shadow under the desk and is gone a little way out, so
  // the piece never sits in a rectangle.
  const floor = shade(new THREE.MeshStandardMaterial({ color: 0x0e0a08, roughness: 0.94 }), 'desk-floor', {
    color: 'diffuseColor.rgb *= 1.0 - smoothstep(700.0, 1900.0, length(vObj.xz - vec2(0.0, 150.0)));',
    rough: 'roughnessFactor = 1.0;',
  });
  floor.name = 'floor';
  return {
    top: timber('x'),
    post: timber('y'),
    cross: timber('z'),
    edge: metal({ name: 'desk-edge', color: hex('copper'), rough: 0.22, brush: 'x', tarnish: 0.2, patina: BROWN }),
    bronze: metal({ name: 'desk-bronze', color: hex('bronze'), rough: 0.34, brush: 'x', tarnish: 0.55, patina: BROWN }),
    cast: metal({ name: 'desk-cast', color: hex('copper'), rough: 0.3, brush: 'none', tarnish: 0.7, patina: BROWN, cast: 0.7 }),
    steel: metal({ name: 'desk-steel', color: 0x4a4038, rough: 0.42, brush: 'y', tarnish: 0.3, patina: BROWN }),
    coal, glass, ember, floor,
  };
}
