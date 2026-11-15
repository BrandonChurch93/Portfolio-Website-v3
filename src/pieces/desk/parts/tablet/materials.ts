import * as THREE from 'three';
import { hex, type PaletteName } from '../../../../config/palette';
import { shade } from '../../../../world/surface';

// The tablet's surfaces: its warm dark steel, the polished edges, the glass in front of the picture, and the picture
// itself; the stand and the pencil; and the soft shadows and the screen's light on the mat, which are planes and not
// lights. Every lit surface is a plain material that differs only in its numbers, so they all share one shader
// program: the glass, the picture and the planes on the mat are the only others.

const tone = (name: PaletteName, k: number) => new THREE.Color(hex(name)).multiplyScalar(k);
const P = (name: string, o: THREE.MeshPhysicalMaterialParameters) => { const m = new THREE.MeshPhysicalMaterial(o); m.name = name; return m; };

export function tabletMaterials() {
  // The shell: a warm dark steel, close to grey, blasted to a soft satin.
  const shell = P('tabShell', { color: tone('text-3', 0.36), metalness: 1, roughness: 0.3 });
  // Every cut edge, on the tablet and on its stand, is left bright and pale: the chamfer line round the tablet, the
  // bevels round the stand's cheeks and slots, the corners of its lip, the screws' heads.
  const chamfer = P('tabChamfer', { color: tone('text-2', 0.55), metalness: 1, roughness: 0.24 });
  // One dark polymer for the seam, the antenna lines, the port's mouth, the speaker holes and the screws' sockets.
  const band = P('tabBand', { color: tone('text-3', 0.1), metalness: 0, roughness: 0.6 });
  // The glass's edge, which is solid and catches its own line.
  const glassEdge = P('tabGlassEdge', { color: tone('bg', 0.55), metalness: 0, roughness: 0.12, specularIntensity: 0.6 });
  // Under the glass: the black of the border. The picture is ./display.ts.
  // The black is lit like any surface, so the room's occlusion pass sees the tablet's face and not the stand behind it.
  const ink = P('tabInk', { color: tone('bg', 0.25), metalness: 0, roughness: 1, specularIntensity: 0 });
  // The glass in front of it all, drawn as the light it reflects, added over the picture. It is an etched glass,
  // so the room is a soft sheen on it and never a mirror: a long light lies across it as a soft streak, and the
  // cursor's light is a broad pool that slides across it with the cursor. uCur is where the cursor's light is over
  // the glass, in the tablet's own millimetres, and uSheen how much of the room is lit.
  const glass = shade(P('tabGlass', {
    color: 0x000000, metalness: 0, roughness: 0.09, ior: 1.5, specularIntensity: 0.6,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }), 'tablet-glass', {
    vhead: 'varying vec2 vTabUv;',
    vert: 'vTabUv = uv;',
    head: `varying vec2 vTabUv;\nuniform vec2 uCur;\nuniform float uSheen;\nuniform vec3 uSheenColor;`,
    emissive: /* glsl */ `
  {
    vec3 tgV = normalize(vViewPosition);
    float tgF = 0.04 + 0.96 * pow(1.0 - clamp(dot(normal, tgV), 0.0, 1.0), 5.0);
    vec2 tgP = vTabUv;
    vec2 tgQ = abs(tgP) - vec2(132.4, 99.3) + 10.0;
    float tgIn = 1.0 - smoothstep(-0.3, 0.3, length(max(tgQ, 0.0)) + min(max(tgQ.x, tgQ.y), 0.0) - 10.0);
    vec2 tgU = (uCur - vec2(300.0, 0.0)) * 0.6;
    float tgD = dot(tgP - vec2(clamp(tgU.x, -130.0, 130.0), 0.0), normalize(vec2(1.0, 0.62)));
    float streak = exp(-tgD * tgD / (2.0 * 9.0 * 9.0)) * 1.4 + exp(-tgD * tgD / (2.0 * 40.0 * 40.0)) * 0.35;
    vec2 tgC = tgP - tgU;
    float pool = exp(-dot(tgC, tgC) / (2.0 * 110.0 * 110.0));
    float base = (0.06 + 0.08 * smoothstep(-110.0, 110.0, tgP.y)) * mix(0.5, 1.0, tgIn);
    totalEmissiveRadiance += uSheenColor * uSheen * (base + streak * (0.4 + 0.6 * pool) + pool * 0.35) * (0.4 + tgF * 4.0);
  }`,
  });
  glass.userData.uniforms = { uCur: { value: new THREE.Vector2(0, 0) }, uSheen: { value: 0.03 }, uSheenColor: { value: tone('pale', 1) } };
  // The camera in the border: its lens.
  const lens = P('tabLens', { color: tone('bg', 0.4), metalness: 0, roughness: 0.04, specularIntensity: 1 });
  // The stand: warm dark steel with a satin coat, machined, its rod in copper, its pads in rubber, its channel lined in a dark cloth.
  const bronze = P('tabStand', { color: tone('text-3', 0.24), metalness: 0.8, roughness: 0.45 });
  const screw = P('tabScrew', { color: tone('text-3', 0.3), metalness: 1, roughness: 0.3 });
  const rubber = P('tabRubber', { color: tone('text-3', 0.1), metalness: 0, roughness: 0.85 });
  // The pencil: one matte white piece with a soft even sheen, its tip a shade greyer. Its white is the palette's text
  // white turned down and leaning a little cool: its lit side is too bright for the white balance to reach, and a plain
  // white there came out cream to fresh eyes. Brighter, it also went past the tablet's screen.
  const text = new THREE.Color(hex('text-2'));
  const white = new THREE.Color().setScalar(((text.r + text.g + text.b) / 3) * 0.16).multiply(new THREE.Color(0.9, 0.98, 1.12));
  const pencil = P('tabPencil', { color: white, metalness: 0, roughness: 0.5, specularIntensity: 0.5 });
  // Copper is the one accent: the stand's rod.
  const copper = P('tabCopper', { color: hex('copper'), metalness: 1, roughness: 0.5 });
  const nib = P('tabNib', { color: white.clone().multiplyScalar(0.78), metalness: 0, roughness: 0.6, specularIntensity: 0.4 });

  // What lies on the mat, both from one shader so they are one program. A shadow (uMode 0) is a short soft dark
  // under each thing: a rounded rectangle in its own millimetres (uv), its half sizes, corner and strength in the cell
  // attribute. The spill (uMode 1) is the screen's light on the mat, added: strongest at the stand's lip and gone a
  // hand's width out, across the plane's uv.
  const MAT_SHADER = {
    vertexShader: /* glsl */ `
attribute vec4 cell;
varying vec2 vP; varying vec4 vC;
void main(){ vP = uv; vC = cell; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
uniform float uMode, uK; uniform vec3 uColor;
varying vec2 vP; varying vec4 vC;
void main(){
  if (uMode < 0.5) {
    vec2 q = abs(vP) - vC.xy + vC.z;
    float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - vC.z;
    float core = 1.0 - smoothstep(-1.2, 1.4, sd);
    float soft = 1.0 - smoothstep(-4.0, 12.0, sd);
    gl_FragColor = vec4(0.0, 0.0, 0.0, (core * 0.55 + soft * soft * 0.45) * vC.w);
  } else {
    float x = vP.x * 2.0 - 1.0, t = 1.0 - vP.y;
    float across = 1.0 - smoothstep(0.25, 1.0, abs(x));
    float out_ = exp(-t * 3.6) * smoothstep(0.0, 0.05, t);
    vec3 c = uColor * across * across * out_ * uK;
    gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)));
  }
}`,
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
  };
  const shadow = new THREE.ShaderMaterial({ ...MAT_SHADER, uniforms: { uMode: { value: 0 }, uK: { value: 0 }, uColor: { value: new THREE.Color() } } });
  shadow.name = 'tabShadow';
  // The spill's strength at full is set where it is turned up (SPILL in tablet.ts).
  const spill = new THREE.ShaderMaterial({
    ...MAT_SHADER, uniforms: { uMode: { value: 1 }, uK: { value: 0 }, uColor: { value: tone('hot', 1).lerp(tone('pale', 1), 0.55) } },
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
  });
  spill.name = 'tabSpill';

  return { shell, chamfer, band, glassEdge, ink, glass, lens, bronze, copper, screw, rubber, pencil, nib, shadow, spill };
}

export type TabletMaterials = ReturnType<typeof tabletMaterials>;
