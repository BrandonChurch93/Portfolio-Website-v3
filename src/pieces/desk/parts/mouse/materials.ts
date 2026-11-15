import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { lin, shade } from '../../../../world/surface';
import { byKind } from '../keyboard/materials';
import { GRIP, MOUSE, SEAM, THUMB } from './model';

const f = (n: number) => n.toFixed(4);

// What each surface of the mouse is. One material draws them all, so the mouse costs one shader program: each vertex
// carries its kind in the fourth number of its cell attribute.
export const KIND = { shell: 0, thumb: 1, wheel: 2, cradle: 3, skate: 4 } as const;
const FINISH: [color: number, rough: number, metal: number][] = [
  [0x181b1f, 0.7, 0],
  [0x1b1e22, 0.48, 0],
  [hex('copper'), 0.26, 1],
  [0x0f1012, 0.7, 0],
  [0x272a2e, 0.3, 0],
];

export interface MouseMats {
  mouse: THREE.MeshPhysicalMaterial;
  // The light's color, already scaled by how much it is on.
  led: { value: THREE.Color };
  // The height of the wheel's axle.
  wheelY: { value: number };
}

export function mouseMaterials(): MouseMats {
  const { z: wz } = MOUSE.wheel;
  // The shell has two finishes. Above the parting line a matte top under a thin clear coat, whose one long highlight
  // shows its curve and slides as the cursor's light moves; under it a satin band, smoother and a shade lighter. Its
  // seams, the wheel's slot, the gaps round the thumb buttons, the grip panels and the light in the split behind the
  // wheel are worked out here, each as a cut with lit lips that fades to a faint line before it is finer than a pixel.
  const mouse = shade(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.7, specularIntensity: 0.45, clearcoat: 0.32, clearcoatRoughness: 0.3 }), 'mouse', {
    vhead: 'attribute vec4 cell; varying float vKind;',
    vert: 'vKind = cell.w;',
    head: /* glsl */ `
uniform vec3 uLed; uniform float uWheelY;
varying float vKind;
int kind; float msCut; vec3 msTilt; float msSlot; float msGlow; float msBand; float msGrip; float msPit; float msCoat;
void msSeam(float d, vec3 gv, float on){
  float aa = max(fwidth(d), 1e-4);
  float near = 1.0 - smoothstep(0.35, 1.1, aa);
  float g = 1.0 - smoothstep(0.22, 0.22 + aa * 1.5, abs(d));
  msCut = max(msCut, g * on * mix(0.3, 1.0, near));
  float lip = (1.0 - smoothstep(0.22, 0.85, abs(d))) * smoothstep(0.1, 0.24, abs(d));
  msTilt -= sign(d) * normalize(gv) * lip * 0.55 * near * on;
}
float msBox(vec2 p, vec2 h, float r){ vec2 q = abs(p) - h + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
vec2 msBoxDir(vec2 p, vec2 h, float r){ vec2 k = abs(p) - h + r; return max(k.x, k.y) > 0.0 ? normalize(max(k, 0.0) + 1e-4) * sign(p) : (k.x > k.y ? vec2(sign(p.x), 0.0) : vec2(0.0, sign(p.y))); }`,
    color: /* glsl */ `
  kind = int(vKind + 0.5);
  msCut = 0.0; msTilt = vec3(0.0); msGlow = 0.0; msPit = 0.0; msSlot = 0.0; msBand = 0.0; msGrip = 0.0;
  diffuseColor.rgb = ${byKind(FINISH, 0)};
  vec3 ax = normalize(vAxX), ay = normalize(vAxY), az = normalize(cross(vAxX, vAxY));
  vec3 p = vObj;
  if (kind == ${KIND.shell}) {
    float back = ${f(SEAM.back)} - 6.5 * (p.x / 28.0) * (p.x / 28.0);
    float side = ${f(SEAM.side)} + 0.1 * (p.z + 5.0);
    float front = 1.0 - smoothstep(-0.6, 0.6, p.z - back);
    float slot = msBox(p.xz - vec2(0.0, ${f(wz)}), vec2(5.4, 12.6), 4.2);
    // The split between the buttons, from the front to the end of the buttons, broken by the wheel's slot.
    msSeam(p.x, ax, front * smoothstep(${f(SEAM.base + 14)}, ${f(SEAM.base + 20)}, p.y) * smoothstep(-0.2, 0.6, slot));
    // Where the buttons end at the back, and where their sides meet the flanks.
    msSeam(p.z - back, az + ax * (13.0 * p.x / 784.0), smoothstep(side - 1.0, side + 1.0, p.y));
    msSeam(p.y - side, ay - az * 0.1, front);
    // The parting line between the top shell and the band.
    msSeam(p.y - ${f(SEAM.base)}, ay, 1.0);
    // The gaps round the thumb's two buttons, on the left flank.
    float left = step(p.x, 0.0);
    for (int i = 0; i < 2; i++) {
      vec2 c = vec2(i == 0 ? ${f(THUMB.at[0])} : ${f(THUMB.at[1])}, ${f(THUMB.y)});
      vec2 hh = vec2((i == 0 ? ${f(THUMB.len[0])} : ${f(THUMB.len[1])}) * 0.5 + 0.9, ${f(THUMB.tall / 2 + 0.9)});
      vec2 q = vec2(p.z, p.y) - c;
      vec2 dir = msBoxDir(q, hh, 3.2);
      msSeam(msBox(q, hh, 3.2), az * dir.x + ay * dir.y, left);
    }
    float sa = max(fwidth(slot), 1e-4);
    msSlot = 1.0 - smoothstep(-sa, sa, slot);
    float lip = (1.0 - smoothstep(0.0, 0.9, abs(slot))) * (1.0 - smoothstep(0.4, 1.2, sa));
    msTilt += normalize(az * (p.z - ${f(wz)}) / 12.6 + ax * p.x / 5.4) * lip * 0.4 * sign(slot);
    // The light: a short slit in the split behind the wheel, and the little it lays on the shell round it.
    float lp = msBox(p.xz - vec2(0.0, ${f(MOUSE.light)}), vec2(0.7, 3.4), 0.7);
    float la = max(fwidth(lp), 1e-4);
    msGlow = (1.0 - smoothstep(-la, la, lp)) + 0.22 * exp(-max(lp, 0.0) / 2.2);
    // The grip panels: rubber with a diamond knurl that is seen as texture up close, set in with a seam round each.
    vec2 gq = vec2(p.z - ${f(GRIP.z)}, p.y - ${f(GRIP.y)}), gh = vec2(${f(GRIP.hz)}, ${f(GRIP.hy)});
    float grip = msBox(gq, gh, ${f(GRIP.r)});
    vec2 g2 = msBoxDir(gq, gh, ${f(GRIP.r)});
    msSeam(grip, az * g2.x + ay * g2.y, 1.0);
    float ga = max(fwidth(grip), 1e-4);
    msGrip = 1.0 - smoothstep(-ga, ga, grip + 0.35);
    float u = (p.z + p.y) * 2.1, v = (p.z - p.y) * 2.1;
    float fine = 1.0 - smoothstep(0.35, 0.9, max(fwidth(u), fwidth(v)));
    float su = sin(u), cu = cos(u), sv = sin(v), cv = cos(v);
    msTilt += (az * (cu * sv + su * cv) + ay * (cu * sv - su * cv)) * 0.6 * fine * msGrip;
    msPit = (0.5 - 0.5 * su * sv) * fine * msGrip;
    msBand = 1.0 - smoothstep(${f(SEAM.base - 0.2)}, ${f(SEAM.base + 0.2)}, p.y);
    diffuseColor.rgb *= (1.0 - 0.82 * msCut) * (1.0 - 0.9 * msSlot) * (1.0 - 0.45 * msGrip) * (1.0 - 0.35 * msPit);
    diffuseColor.rgb = mix(diffuseColor.rgb, ${lin(0x25282c)}, msBand);
  } else if (kind == ${KIND.wheel}) {
    // The wheel: a diamond knurl on each band, and the turning's fine rings on its sides, each gone before it is
    // finer than a pixel.
    vec3 q = p - vec3(0.0, uWheelY, ${f(wz)});
    float rr = length(q.yz) + 1e-4;
    float band = (1.0 - smoothstep(0.3, 0.55, abs(normalize(vObjN).x))) * step(0.75, abs(q.x));
    float arc = atan(q.y, q.z) * rr;
    float u = (arc + q.x) * 3.0, v = (arc - q.x) * 3.0;
    float fine = 1.0 - smoothstep(0.35, 0.9, max(fwidth(u), fwidth(v)));
    vec3 tang = normalize(ay * (q.z / rr) - az * (q.y / rr));
    msTilt += (tang * (cos(u) * sin(v) + sin(u) * cos(v)) + ax * (cos(u) * sin(v) - sin(u) * cos(v))) * 0.5 * fine * band;
    float ring = (1.0 - smoothstep(0.3, 0.8, fwidth(rr * 4.0))) * smoothstep(0.8, 0.95, abs(normalize(vObjN).x));
    msTilt += tang * sin(rr * 25.0) * 0.06 * ring;
  }
  // The clear coat lies on the matte top and the thumb buttons only.
  msCoat = kind == ${KIND.shell} ? 1.0 - max(msBand, max(msGrip, max(msCut, msSlot))) : kind == ${KIND.thumb} ? 0.6 : 0.0;`,
    rough: `roughnessFactor = mix(mix(${byKind(FINISH, 1)}, 0.32, msBand), 0.9, max(max(msCut, msSlot), msGrip * 0.9));`,
    metal: `metalnessFactor = ${byKind(FINISH, 2)};`,
    normal: 'normal = normalize(normal + msTilt);',
    emissive: 'totalEmissiveRadiance += uLed * msGlow;',
  });
  mouse.name = 'mouse';
  const before = mouse.onBeforeCompile.bind(mouse);
  mouse.onBeforeCompile = (sh, r) => {
    before(sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('material.clearcoat = clearcoat;', 'material.clearcoat = clearcoat * msCoat;');
    // The shell is mostly the warm room reflected, which read as olive. Its plain surfaces take part of the color out
    // of the dim light they reflect; the copper wheel, the light and the highlights keep theirs, so a glint stays pale.
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
  if (kind != ${KIND.wheel}) {
    vec3 refl = max(outgoingLight - totalEmissiveRadiance, 0.0);
    float lum = dot(refl, vec3(0.2126, 0.7152, 0.0722));
    outgoingLight = mix(refl, vec3(lum), 0.6 * (1.0 - smoothstep(0.08, 0.5, lum))) + totalEmissiveRadiance;
  }
#include <opaque_fragment>`);
  };
  const led = { value: new THREE.Color(0, 0, 0) }, wheelY = { value: 0 };
  mouse.userData.uniforms = { uLed: led, uWheelY: wheelY };
  return { mouse, led, wheelY };
}
