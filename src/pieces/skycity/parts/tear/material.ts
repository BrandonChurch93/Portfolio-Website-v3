import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { lin, shade } from '../../../../world/surface';
import { FOREST, HEART, PLANET, ROAD, SCALE } from '../../layout';
import { KIND, LAYER } from './layers';

// The one material of the torn underside. What each triangle is comes in its cell (KIND in ./layers.ts): the rock of
// each layer, the set back surface in the joints, the paving and soil under the edge, the light in a vent's split,
// and what was made on the ground and cut through. The beds inside a layer, the veins of metal and the grain of each
// stuff are worked out from where the point is, so they run on across one block into the next, and each fades to its
// average before it is finer than a pixel.

export interface TearUniforms { uT: { value: number }; uCore: { value: number } }

const H = `vec3(${HEART.map((v) => v.toFixed(1)).join(', ')})`;
const f = (v: number) => v.toFixed(1);

export function tearMaterial(u: TearUniforms): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
  m.name = 'tear';
  m.userData.uniforms = u;
  shade(m, 'tear', {
    vhead: 'attribute vec4 cell;\nvarying vec4 vCell;',
    vert: 'vCell = cell;',
    head: `varying vec4 vCell; uniform float uT; uniform float uCore;
float tRough, tMetal, tSpec, tH, tOcc; vec3 tEmi;
float tHash(float x){ return fract(sin(x * 91.17 + 7.3) * 43758.5453); }
vec3 tRamp(float t){
  vec3 e = ${lin(hex('ember'))}, fl = ${lin(hex('flame'))}, h = ${lin(hex('hot'))}, p = ${lin(hex('pale'))};
  return t < 0.333 ? mix(e, fl, t * 3.0) : t < 0.667 ? mix(fl, h, t * 3.0 - 1.0) : mix(h, p, t * 3.0 - 2.0);
}
vec3 tBump(vec3 n, float h, float k){
  vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
  float hx = dFdx(h), hy = dFdy(h);
  vec3 r1 = cross(dpy, n), r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec3 g = sign(det) * (hx * r1 + hy * r2);
  vec3 mm = abs(det) * n - g * k;
  return dot(mm, mm) > 1e-20 ? normalize(mm) : n;
}
// How much of a pattern this fine survives at this pixel: 1 when it is several pixels across, 0 when it is finer
// than one.
float tKeep(float size, float px){ return 1.0 - smoothstep(1.2, 3.0, px / max(size, 1e-4) * 2.0); }
// How deep into the planet a point lies, in its own shells, with the beds folded a little.
float tBed(vec3 p){
  return ${f(PLANET.r)} - length(p + vec3(0.0, ${f(PLANET.r)}, 0.0)) + 9.0 * sin(dot(p, vec3(0.011, 0.004, 0.008)) + 1.3) + 6.0 * sin(dot(p, vec3(-0.006, 0.012, 0.017)) + 4.0) + 5.0 * wNoise(p * 0.018);
}`,
    color: `{
  float kd = floor(vCell.w + 0.5), lay = floor(vCell.y + 0.5), tone = vCell.x, wear;
  vec3 p = vObj;
  float px = length(fwidth(p));
  float b = tBed(p);
  float fine = tKeep(1.5, px), mid = tKeep(5.0, px);
  vec3 c; tRough = 0.9; tMetal = 0.0; tSpec = 0.3; tH = 0.0; tEmi = vec3(0.0);
  float sunk = floor(max(vCell.z, 0.0) * 0.5 + 0.01) / 9.0;
  wear = clamp(vCell.z - 2.0 * floor(vCell.z * 0.5 + 0.01), 0.0, 1.0) * step(0.0, vCell.z - floor(vCell.z));
  vec3 on = normalize(vObjN + 1e-5);
  tOcc = mix(0.55, 1.0, smoothstep(-0.7, 0.4, on.y)) * mix(1.0, 0.7, smoothstep(${f(HEART[1] + 140)}, ${f(HEART[1] - 60)}, p.y)) * (kd == ${f(KIND.strip)} ? 1.0 : mix(1.0, 0.45, sunk));
  float grain = wFbm(p * 0.45) - 0.5, blot = wFbm(p * 0.06) - 0.5;
  if (kd == ${f(KIND.rock)} || kd == ${f(KIND.back)}) {
    if (lay == ${f(LAYER.made)}) {
      // The weathered top of the rock and what was dug into it: broken stone in a warm grey earth, a few pale stones.
      float cl = wNoise(p * 0.32 + 3.1), cl2 = wNoise(p * 0.75 + 8.0);
      c = mix(${lin(0x332d27)}, ${lin(0x403830)}, smoothstep(0.35, 0.6, cl));
      c = mix(c, ${lin(0x6a5f52)}, smoothstep(0.8, 0.86, cl2) * mid * 0.8);
      c *= 0.82 + 0.3 * tone + 0.2 * blot;
      tRough = 0.95; tSpec = 0.25; tH = (cl - 0.5) * 0.8 * mid;
    } else if (lay == ${f(LAYER.crust)}) {
      // The crust: beds of grey sandstone, dark shale, a warm ochre and a pale limestone, each its own thickness.
      float k = floor(b / 11.0 + 0.4 * sin(b * 0.13)), h = tHash(k);
      c = h < 0.22 ? ${lin(0x7a6d5e)} : h < 0.5 ? ${lin(0x544c43)} : h < 0.78 ? ${lin(0x2c2926)} : ${lin(0x6a5038)};
      c *= 1.0 + 0.07 * sin(b * 1.7) * tKeep(3.7, px * 1.5);
      c *= 0.88 + 0.24 * tone;
      tH = (h < 0.5 ? 0.5 : -0.4) * mid + blot * 2.0 * mid;
      tRough = h < 0.5 ? 0.92 : 0.8; tSpec = h < 0.5 ? 0.28 : 0.4;
    } else if (lay == ${f(LAYER.basalt)}) {
      // Basalt in columns: near black, its fresh breaks glossy.
      c = ${lin(0x232220)} * (0.85 + 0.3 * tone) * (1.0 + 0.25 * blot);
      tRough = 0.62 + 0.1 * blot; tSpec = 0.55;
      tH = blot * 3.0 * mid;
    } else if (lay == ${f(LAYER.mantle)}) {
      // The deep rock: dense, a dark rust umber stained by the iron below it, mottled, with dark crystals in it.
      c = mix(${lin(0x41352c)}, ${lin(0x4f4034)}, smoothstep(-0.2, 0.25, blot)) * (0.75 + 0.4 * tone);
      float streak = wNoise(vec3(p.x * 0.05, p.y * 0.012, p.z * 0.05));
      c = mix(c, ${lin(0x6a3c22)}, smoothstep(0.55, 0.75, streak) * 0.7);
      float xt = wNoise(p * 0.7 + 2.0);
      c = mix(c, ${lin(0x140e0b)}, smoothstep(0.8, 0.88, xt) * fine * 0.8);
      tRough = 0.82; tSpec = 0.35;
      tH = (wFbm(p * 0.08) - 0.5) * 3.5 * mid;
    } else {
      // The metal of the deep: iron, as a cut meteorite is, polished where it broke, its crystals in faint bands
      // that cross at three angles, each block cut across them at its own angle, darkened by rust in its hollows.
      float a = tone * 6.2832;
      vec3 d1 = normalize(vec3(0.8 * cos(a), 0.5, 0.8 * sin(a))), d2 = normalize(vec3(-0.3, 0.7 * cos(a), 0.6 + 0.3 * sin(a))), d3 = normalize(vec3(sin(a), -0.2, cos(a)));
      float w = 4.5;
      float l1 = abs(fract(dot(p, d1) / w + 0.3 * wNoise(p * 0.05)) - 0.5);
      float l2 = abs(fract(dot(p, d2) / (w * 1.4)) - 0.5);
      float l3 = abs(fract(dot(p, d3) / (w * 0.8)) - 0.5);
      float lam = smoothstep(0.36, 0.42, max(l1, max(l2, l3))) * tKeep(w * 0.3, px);
      float rust = smoothstep(0.05, 0.3, blot + 0.15 * (tone - 0.5));
      c = ${lin(0xa79d92)} * (0.85 + 0.25 * tone);
      c = mix(c, ${lin(0x6e665e)}, lam * 0.3);
      c = mix(c, ${lin(0x3a2418)}, rust * 0.85);
      tMetal = 1.0 - 0.8 * rust; tRough = mix(0.3, 0.38, lam) + 0.45 * rust; tSpec = 1.0;
      tH = lam * 0.2 + rust * 0.6 * mid;
    }
    // Veins of metal, gold, bronze and copper, running through every layer, polished where the rock broke across
    // them: of uneven width, with the rock round each altered dark, and catching light only where they face it.
    if (lay > ${f(LAYER.made)} + 0.5 && lay < ${f(LAYER.metal)} - 0.5) {
      vec3 vd = normalize(vec3(0.62, 0.35, 0.7) + 0.5 * vec3(sin(floor(dot(p, vec3(0.004, 0.003, 0.004)) + 2.0) * 3.1), 0.0, cos(floor(dot(p, vec3(0.004, 0.003, 0.004)) + 2.0) * 2.3)));
      float vn = fract(dot(p, vd) / 55.0 + 0.18 * wFbm(p * 0.01));
      float deep = lay >= ${f(LAYER.mantle)} ? 1.0 : 0.6;
      float vw = (0.006 + 0.012 * pow(wNoise(p * 0.02), 2.0)) * deep, fw = max(fwidth(vn), 1e-5);
      float d = abs(vn - 0.5);
      float gate = smoothstep(0.55, 0.65, wNoise(p * 0.006 + 7.0));
      float vein = (1.0 - smoothstep(vw - fw, vw + fw, d)) * min(1.0, vw / fw) * gate;
      float halo = (1.0 - smoothstep(vw, vw * 4.0 + fw, d)) * gate * mid;
      float which = wNoise(p * 0.004 + 11.0);
      vec3 mc = which < 0.3 ? ${lin(hex('copper'))} : which < 0.65 ? ${lin(hex('bronze'))} : ${lin(0xf0ad66)};
      c *= 1.0 - 0.45 * halo;
      c = mix(c, mc * 0.8, vein);
      tMetal = mix(tMetal, 1.0, vein); tRough = mix(tRough, 0.3, vein); tSpec = mix(tSpec, 0.8, vein);
      tH += vein * 0.5 - halo * 0.3;
    }
    // A cut edge is worn pale and catches the light.
    c *= 1.0 + 0.12 * wear;
    tRough = mix(tRough, tRough * 0.8, wear);
    tSpec = mix(tSpec, min(1.0, tSpec + 0.25), wear);
    if (kd == ${f(KIND.back)}) { c *= 0.3; tSpec = 0.05; tRough = 1.0; tMetal = 0.0; tH = 0.0; }
  } else if (kd == ${f(KIND.strip)}) {
    // Under the edge: the dark topsoil, full of roots, then the subsoil, paler and stony, and where the way to the
    // spire reached the edge, the beds of its road.
    float q = vCell.z;
    float pebble = wNoise(p * 0.8);
    float along = atan(p.x, p.z) * length(p.xz), deg = mod(degrees(atan(p.x, p.z)) + 360.0, 360.0);
    float wild = smoothstep(${f(FOREST.from - 6)}, ${f(FOREST.from + 2)}, deg) * (1.0 - smoothstep(${f(FOREST.to - 2)}, ${f(FOREST.to + 6)}, deg));
    float rootN = wNoise(vec3(along * 0.7, p.y * 0.05, 3.0)), roots = (1.0 - smoothstep(0.025, 0.025 + fwidth(rootN) * 1.5, abs(rootN - 0.5))) * mid * smoothstep(0.4, 0.6, wNoise(vec3(along * 0.05, 1.0, 1.0)));
    vec3 top = ${lin(0x2a2018)} * (0.85 + 0.3 * blot);
    vec3 sub = mix(${lin(0x41372d)}, ${lin(0x5c5146)}, smoothstep(0.72, 0.8, pebble) * fine) * (0.85 + 0.3 * blot);
    c = mix(top, sub, smoothstep(1.0, 3.5, q + 3.0 * (wNoise(vec3(along * 0.04, 0.0, 5.0)) - 0.5)));
    c = mix(c, ${lin(0x15100c)}, roots * 0.8 * wild);
    // Under the soil, the top of the rock, weathered and broken by joints, darker in its cracks.
    float rockQ = smoothstep(9.0, 13.0, q + 4.0 * (wNoise(vec3(along * 0.06, 0.0, 9.0)) - 0.5));
    vec2 jq = vec2(along / 9.0, p.y / 5.5 + 0.4 * sin(along * 0.11));
    vec2 jf = abs(fract(jq) - 0.5);
    float joint = (1.0 - smoothstep(0.38, 0.47, max(jf.x * (0.9 + 0.2 * wNoise(vec3(floor(jq), 1.0))), jf.y))) ;
    vec3 rk = mix(${lin(0x4f463d)}, ${lin(0x6a5e50)}, wNoise(vec3(floor(jq), 4.0))) * (0.85 + 0.3 * blot);
    rk *= mix(0.35, 1.0, joint * mid + (1.0 - mid));
    c = mix(c, rk, rockQ);
    float road = 0.0;
    for (int i = 0; i < 3; i++) {
      float a = radians(float(i) * 45.0);
      float dd = abs(p.x * cos(a) - p.z * sin(a));
      road = max(road, (1.0 - smoothstep(${f(ROAD / 2 + 1)}, ${f(ROAD / 2 + 3)}, dd)) * step(0.0, p.x * sin(a) + p.z * cos(a)));
    }
    road *= 1.0 - wild;
    vec3 rb = q < 2.2 ? ${lin(0x141312)} : q < 5.5 ? ${lin(0x51493f)} * (0.8 + 0.4 * pebble * fine) : ${lin(0x2c2824)};
    c = mix(c, rb, road);
    tRough = 0.97; tSpec = 0.15;
    tH = (pebble - 0.5) * 0.8 * fine + roots * 0.4 * wild + rockQ * (joint - 1.0) * 1.5 * mid;
  } else if (kd == ${f(KIND.vent)}) {
    // The split a vent's light leaves from: bright at the tip, spent a little way up.
    // On the rock round the opening (vCell.z under 1) the same light only spills, close to the foot.
    float h = max(0.0, p.y - vCell.y), inner = step(0.9, vCell.z);
    float k = exp(-h / mix(3.5, 14.0, inner));
    c = mix(${lin(0x1e1b18)} * (0.85 + 0.3 * tone + 0.2 * blot), ${lin(0x0d0b0a)}, inner); tRough = mix(0.85, 0.6, inner); tSpec = mix(0.35, 0.2, inner);
    tEmi = tRamp(clamp(0.25 + 0.75 * k, 0.0, 1.0)) * (0.15 + 2.6 * k * k) * mix(0.35, 1.3, inner) * uCore * smoothstep(42.0, 20.0, h);
    wear = 0.0;
  } else if (kd == ${f(KIND.concrete)}) {
    c = ${lin(0x5a544c)} * (0.8 + 0.35 * tone) * (0.9 + 0.2 * (wNoise(p * 0.6) - 0.5) * fine) * (1.0 + 0.3 * wear);
    tRough = 0.88; tSpec = 0.35; tH = (wNoise(p * 0.9) - 0.5) * 0.3 * fine;
  } else if (kd == ${f(KIND.hole)}) {
    c = ${lin(0x060505)}; tRough = 1.0; tSpec = 0.05;
  } else {
    c = kd == ${f(KIND.copper)} ? ${lin(hex('copper'))} : kd == ${f(KIND.bronze)} ? ${lin(hex('bronze'))} : ${lin(0xf0ad66)};
    c *= 0.9 + 0.15 * blot;
    tMetal = 1.0; tRough = 0.24 + 0.1 * grain + 0.15 * smoothstep(0.1, 0.4, blot); tSpec = 1.0;
  }
  diffuseColor.rgb = c;
}`,
    normal: `normal = tBump(normal, tH, ${SCALE});`,
    rough: 'roughnessFactor = clamp(tRough, 0.05, 1.0);',
    metal: 'metalnessFactor = tMetal;',
    emissive: 'totalEmissiveRadiance = tEmi;',
  });
  const own = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    own.call(m, sh, r);
    // At the view's grazing angle every rough face took the room's whole sheen and the break read as one pale
    // sheet: rock reflects little of it, metal all of it.
    // The core's light is a point at its middle, and the roof of the opening lies almost on the core's own surface:
    // there it burned white while a little further out the rock went black. What the rock gives back of direct light
    // is eased, so the hollow is bright but holds its form and the light carries out across the break.
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_end>', 'radiance *= tSpec;\nreflectedLight.directSpecular *= tSpec;\n{ vec3 dd = reflectedLight.directDiffuse, ds = reflectedLight.directSpecular; reflectedLight.directDiffuse = dd * 1.7 / (1.0 + dd / 0.5); reflectedLight.directSpecular = ds / (1.0 + ds / 1.5); }\n#include <lights_fragment_end>');
    // Under the planet little of the room's light reaches: less the more a face turns down, the deeper it lies, and
    // the further it is sunk among the blocks round it.
    sh.fragmentShader = sh.fragmentShader.replace('#include <aomap_fragment>', '#include <aomap_fragment>\n{ float occ = tOcc; reflectedLight.indirectDiffuse *= occ; reflectedLight.indirectSpecular *= mix(occ, 1.0, 0.35); }');
  };
  return m;
}
