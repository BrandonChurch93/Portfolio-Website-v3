import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { lin, shade } from '../../../../world/surface';
import { ATLAS, ATLAS_PX, KNOB, SHARP, SOFT } from './layout';
import { gridAt, type KeyLight } from './light';

const f = (n: number) => n.toFixed(4);
// Reads a light kept as the square root of a quarter of its strength.
export const DECODE = 'vec3 kbDecode(vec3 c){ return c * c * 4.0; }';

// What each surface of the keyboard is. One material draws them all, so the board costs one shader program: each
// vertex carries its kind in the fourth number of its cell attribute, and the shader picks the finish from it.
export const KIND = { body: 0, cut: 1, plate: 2, housing: 3, cap: 4, knob: 5, dark: 6, rubber: 7, dot: 8 } as const;

// Each kind's color, roughness and metalness: the anodised case, its cut edge, the plate, the switches, the caps, the
// knob, the dark collar and the rubber.
const FINISH: [color: number, rough: number, metal: number][] = [
  [0x202020, 0.42, 1],
  [0x8e8a84, 0.24, 1],
  [0x151515, 0.55, 0.6],
  [0x1c1c1c, 0.32, 0],
  [0x1d1d1d, 0.82, 0],
  [hex('copper'), 0.28, 1],
  [0x1e1e1e, 0.5, 1],
  [0x0e0e0e, 0.92, 0],
  [0x000000, 0.5, 0],
];
// A choice by kind, written out as one expression for the shader.
export function byKind(rows: [number, number, number][], i: 0 | 1 | 2): string {
  const v = (n: number) => (i === 0 ? lin(rows[n][0]) : f(rows[n][i]));
  return rows.slice(1).map((_, n) => `kind == ${n + 1} ? ${v(n + 1)} : `).join('') + v(0);
}

export interface KeyMats {
  board: THREE.MeshStandardMaterial;
  // The three small lights on the rim, already scaled by how much each is on.
  dots: THREE.Vector3[];
}

export function keyMaterials(light: KeyLight, legends: THREE.Texture): KeyMats {
  const dots = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const board = shade(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0 }), 'kb-board', {
    vhead: `attribute vec4 cell; uniform highp sampler2D uKeys; varying vec4 vCell; varying vec3 vKeyE; ${DECODE}`,
    vert: `{ vCell = cell; int kind = int(cell.w + 0.5);
      vKeyE = (kind == ${KIND.housing} || kind == ${KIND.cap}) ? kbDecode(texelFetch(uKeys, ivec2(int(cell.x + 0.5), 0), 0).rgb) : vec3(0.0); }`,
    head: /* glsl */ `
uniform sampler2D uLegend, uSharp, uSoft;
uniform vec4 uSharpAt, uSoftAt;
uniform vec3 uDot[3];
varying vec4 vCell; varying vec3 vKeyE;
${DECODE}
int kind; float kbLg; float kbTop; float kbEdge;
float kbLegend(){
  vec2 uv = vec2((vObj.x - ${f(ATLAS.x0)}) * ${f(ATLAS_PX / ATLAS.w)}, 1.0 - (vObj.z - ${f(ATLAS.z0)}) * ${f(ATLAS_PX / ATLAS.h)});
  return texture2D(uLegend, uv).a;
}`,
    color: /* glsl */ `
  kind = int(vCell.w + 0.5);
  kbTop = smoothstep(0.72, 0.93, normalize(vObjN).y);
  kbLg = kind == ${KIND.cap} ? kbLegend() * kbTop : 0.0;
  // A cap's rounded top edge is smoother than its face, so it catches a crisp line of the light behind it.
  { float ny = normalize(vObjN).y; kbEdge = kind == ${KIND.cap} ? smoothstep(0.3, 0.55, ny) * (1.0 - smoothstep(0.8, 0.92, ny)) * (1.0 - vCell.z) : 0.0; }
  diffuseColor.rgb = ${byKind(FINISH, 0)};
  // The two accent caps are copper PBT.
  diffuseColor.rgb = mix(diffuseColor.rgb, ${lin(0x7a4220)}, vCell.z);
  if (kind == ${KIND.cap}) diffuseColor.rgb *= 0.94 + 0.12 * wNoise(vObj * 0.9) * (1.0 - smoothstep(0.08, 0.3, length(fwidth(vObj))));
  // A legend is frosted cream when its key is dark, and gives way to the light as the key comes on.
  diffuseColor.rgb = mix(diffuseColor.rgb, ${lin(0x9c8f7d)} * (1.0 - 0.8 * smoothstep(0.0, 0.35, dot(vKeyE, vec3(0.3, 0.6, 0.1)))), kbLg);`,
    rough: `roughnessFactor = mix(mix(mix(${byKind(FINISH, 1)}, 0.42, vCell.z), 0.4, kbLg), 0.3, kbEdge);`,
    metal: `metalnessFactor = ${byKind(FINISH, 2)};`,
    normal: /* glsl */ `
  // The knob: fine flutes round its side and turned rings on its top, each gone before it is finer than a pixel, so
  // its edge never glitters as the light moves.
  if (kind == ${KIND.knob}) {
    vec2 q = vObj.xz - vec2(${f(KNOB.x)}, ${f(KNOB.z)});
    float a = atan(q.y, q.x) * 36.0;
    float fine = 1.0 - smoothstep(0.25, 0.6, fwidth(a));
    float side = 1.0 - smoothstep(0.25, 0.55, abs(normalize(vObjN).y));
    vec3 tang = normalize(normalize(vAxX) * -q.y + normalize(cross(vAxX, vAxY)) * q.x);
    normal = normalize(normal + tang * sin(a) * 0.55 * fine * side);
    float r = length(q) * 3.0;
    float ring = (1.0 - smoothstep(0.3, 0.7, fwidth(r))) * smoothstep(0.85, 0.95, normalize(vObjN).y);
    normal = normalize(normal + tang * sin(r * 6.2832) * 0.08 * ring);
  }`,
    emissive: /* glsl */ `
  // A key the pointer has heated burns much brighter than one at rest, legend and skirt, so the patch round the
  // pointer can be seen at the page's size.
  if (kind == ${KIND.cap}) { float hot = smoothstep(0.12, 0.6, dot(vKeyE, vec3(0.3, 0.6, 0.1)));
    totalEmissiveRadiance += vKeyE * (kbLg * (1.7 + 4.5 * hot) + exp(-vCell.y / (0.45 + 0.9 * hot)) * (1.0 - kbTop) * (1.6 + 2.5 * hot)); }
  else if (kind == ${KIND.housing}) totalEmissiveRadiance += vKeyE * (0.6 + 1.7 * smoothstep(3.0, 5.4, vCell.y));
  else if (kind == ${KIND.plate}) totalEmissiveRadiance += kbDecode(texture2D(uSharp, (vObj.xz - uSharpAt.xy) * uSharpAt.zw).rgb) * 1.9;
  else if (kind == ${KIND.body}) totalEmissiveRadiance += kbDecode(texture2D(uSoft, (vObj.xz - uSoftAt.xy) * uSoftAt.zw).rgb) * 0.05 * smoothstep(0.6, 1.0, normalize(vObjN).y);
  else if (kind == ${KIND.dot}) totalEmissiveRadiance += uDot[int(vCell.x + 0.5)];`,
  });
  board.name = 'kb-board';
  board.userData.uniforms = {
    uKeys: { value: light.keyTex }, uLegend: { value: legends },
    uSharp: { value: light.sharpTex }, uSharpAt: { value: gridAt(SHARP) },
    uSoft: { value: light.softTex }, uSoftAt: { value: gridAt(SOFT) },
    uDot: { value: dots },
  };
  return { board, dots };
}
