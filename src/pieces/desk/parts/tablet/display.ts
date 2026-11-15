import * as THREE from 'three';
import { CHROME, SCREEN_PX, SHEET, screenTextures } from './screen';

// The picture behind the tablet's glass, drawn by one shader. It is not a flat picture: the tool's ground, the sheet
// with the drawing on it, the stroke being drawn and the tool's panels each stand at their own depth behind the glass,
// so the line of sight finds each at its own place, and each throws a soft shadow on what is behind it. The display's
// surface is in the tablet's own millimetres, its uv from the picture's lower left.

export const AREA = [264.8, 198.6] as const;
// How far behind the glass each layer stands, in millimetres. Deeper than a real panel's, so the depth reads at the
// page's size.
const DEPTH = { chrome: 2.6, sheet: 1.6, now: 0.8, ui: 0.3 } as const;
// The way the shadows fall across the picture, per millimetre between a layer and what is behind it: away from the
// desk's lamp, toward the lower right.
const SUN: [number, number] = [-0.55, 1.15];

const f = (n: number) => n.toFixed(3);
const mm = AREA[0] / SCREEN_PX.w;
const SH = [SHEET.x * mm, (SCREEN_PX.h - SHEET.y - SHEET.h) * mm, (SHEET.x + SHEET.w) * mm, (SCREEN_PX.h - SHEET.y) * mm].map(f).join(', ');

const vertexShader = /* glsl */ `
uniform vec3 uAx, uAy, uAn;
varying vec2 vS;
varying vec3 vV;
void main(){
  vS = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vec3 L = transpose(mat3(modelMatrix)) * (cameraPosition - w.xyz);
  vV = vec3(dot(L, uAx), dot(L, uAy), dot(L, uAn));
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const fragmentShader = /* glsl */ `
uniform sampler2D tSheet, tNow, tUi;
uniform float uK;
uniform vec2 uSun;
uniform vec3 uChrome;
varying vec2 vS;
varying vec3 vV;
const vec2 AREA = vec2(${f(AREA[0])}, ${f(AREA[1])});
const vec4 SH = vec4(${SH});

float sdBox(vec2 p, vec4 r, float rad){
  vec2 c = 0.5 * (r.xy + r.zw), h = 0.5 * (r.zw - r.xy) - rad;
  vec2 q = abs(p - c) - h;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad;
}
float cover(float sd){ float w = max(fwidth(sd), 1e-3) * 0.7; return 1.0 - smoothstep(-w, w, sd); }
float inside01(vec2 u){ return step(0.0, u.x) * step(u.x, 1.0) * step(0.0, u.y) * step(u.y, 1.0); }
// Where the line of sight through this point of the glass meets a layer d millimetres behind it.
vec2 at(float d){ return vS - vV.xy / max(vV.z, 1e-3) * d; }
vec2 onSheet(vec2 p){ return (p - SH.xy) / (SH.zw - SH.xy); }

void main(){
  float dC = ${f(DEPTH.chrome)}, dS = ${f(DEPTH.sheet)}, dN = ${f(DEPTH.now)}, dU = ${f(DEPTH.ui)};
  vec2 pc = at(dC), ps = at(dS), pn = at(dN), pu = at(dU);

  // The tool's ground, a little lighter toward the top.
  vec3 col = uChrome * (0.85 + 0.3 * smoothstep(0.0, AREA.y, pc.y));
  // The sheet over it, and the soft shadow it throws.
  float gapS = dC - dS, blurS = 0.6 + gapS * 1.8;
  float sdS = sdBox(pc + uSun * gapS, SH, 0.6);
  col *= 1.0 - (1.0 - smoothstep(-blurS, blurS * 1.5, sdS)) * 0.8;
  float inS = cover(sdBox(ps, SH, 0.3));
  col = mix(col, texture2D(tSheet, onSheet(ps)).rgb, inS);
  // The stroke being drawn, nearer the glass, with its shadow on the sheet.
  vec2 su = onSheet(ps + uSun * (dS - dN));
  col *= 1.0 - texture2D(tNow, su, 3.0).a * inside01(su) * 0.6 * inS;
  vec2 nu = onSheet(pn);
  vec4 nw = texture2D(tNow, nu);
  col = mix(col, nw.rgb, nw.a * inside01(nu));
  // The panels, nearest, with their shadows on the sheet or the ground, whichever is behind them.
  vec2 behind = mix(pc, ps, inS);
  float gapU = mix(dC, dS, inS) - dU;
  vec2 uu = (behind + uSun * gapU) / AREA;
  col *= 1.0 - texture2D(tUi, uu, 2.0 + gapU * 1.2).a * inside01(uu) * 0.75;
  vec2 pu01 = pu / AREA;
  vec4 ui = texture2D(tUi, pu01);
  col = mix(col, ui.rgb, ui.a * inside01(pu01));

  float edge = cover(sdBox(vS, vec4(0.0, 0.0, AREA), 10.0));
  gl_FragColor = vec4(col * uK * edge, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export interface Display { material: THREE.ShaderMaterial; geometry: THREE.BufferGeometry; dispose(): void }

// The display's surface and its material. axes are the tablet's own x, y and out of the screen, in the frame the
// surface is built in.
export function makeDisplay(z: number, axes: [THREE.Vector3, THREE.Vector3, THREE.Vector3]): Display {
  const t = screenTextures(16);
  const geometry = new THREE.PlaneGeometry(AREA[0], AREA[1]);
  geometry.translate(0, 0, z);
  const p = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) + AREA[0] / 2, p.getY(i) + AREA[1] / 2);
  const material = new THREE.ShaderMaterial({
    name: 'tablet-display',
    uniforms: {
      tSheet: { value: t.sheet }, tNow: { value: t.now }, tUi: { value: t.ui },
      uK: { value: 0 }, uSun: { value: new THREE.Vector2(...SUN) }, uChrome: { value: new THREE.Color(CHROME) },
      uAx: { value: axes[0] }, uAy: { value: axes[1] }, uAn: { value: axes[2] },
    },
    vertexShader,
    fragmentShader,
  });
  return { material, geometry, dispose: () => { t.sheet.dispose(); t.now.dispose(); t.ui.dispose(); } };
}
