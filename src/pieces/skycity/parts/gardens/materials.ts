import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { NOISE, lin } from '../../../../world/surface';
import { SCALE } from '../../layout';

// One program draws the whole forest, every kind drawn many times over: needles, leaves, bark and stone, each
// vertex saying which it is.

export const U = {
  // The cursor's light, in the world's units.
  uLamp: { value: new THREE.Vector3(0, 300, 1200) },
};

const f1 = (x: number) => x.toFixed(3);
// Where the moon stands from the world (the stage's key light, from the upper right and a little in front). The
// edges of crowns turned to it catch it.
const MOON = new THREE.Vector3(0.56, 0.6, 0.57).normalize();

const COMMON = /* glsl */ `
uniform vec3 uLamp;
${NOISE}
vec3 heat(float k){
  vec3 c = mix(${lin(hex('ember'))}, ${lin(hex('flame'))}, smoothstep(0.0, 0.45, k));
  c = mix(c, ${lin(hex('hot'))}, smoothstep(0.45, 0.85, k));
  return mix(c, ${lin(hex('pale'))}, smoothstep(0.85, 1.0, k));
}
// What the room and the lights reflect is held under pale, so a glint stays a glint and never blooms.
vec3 heldUnder(vec3 c){ float m = max(c.r, max(c.g, c.b)); if (m <= 0.9) return c; float e = m - 0.9; return c * (0.9 + e / (1.0 + e / 0.45)) / m; }
// A bump from a height worked out in the fragment, in view space.
vec3 gBump(vec3 n, float h, float k){
  vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
  float hx = dFdx(h), hy = dFdy(h);
  vec3 r1 = cross(dpy, n), r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec3 g = sign(det) * (hx * r1 + hy * r2);
  vec3 m = abs(det) * n - g * k;
  return dot(m, m) > 1e-20 ? normalize(m) : n;
}
`;
const HOLD = 'outgoingLight = heldUnder(outgoingLight - totalEmissiveRadiance) + totalEmissiveRadiance;\n#include <opaque_fragment>';
// The cursor's light is the only light that moves, so the forest answers it a little more strongly than it would.
// Not much more: lit strongly, leaves read as paper.
const LAMP_GAIN = 1.3;

// leaf (per vertex): x what it is (0 bark, 1 leaves in a crown, 2 needles in a conifer's skirt, 4 stone, 5 a
// lantern's glass), y how far
// up its crown or skirt it is, z how far out, w a number of its own. tint (per thing): the color of its leaves.
// tree (per thing): x a seed, y how much of a lantern's light reaches it from below, z its bark's tone, from dark to
// the aspen's pale.
export function leafMaterial(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0, side: THREE.DoubleSide });
  m.name = 'forest';
  // Leaves and bark are matte: the room's long lights laid over them as a grey sheen took every dark away.
  m.envMapIntensity = 0.25;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 leaf;\nattribute vec3 tint;\nattribute vec4 tree;\nvarying vec4 vLeaf;\nvarying vec3 vTint;\nvarying vec4 vTree;\nvarying vec3 vLoc;\nvarying vec3 vLocN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLeaf = leaf;\nvTint = tint;\nvTree = tree;\nvLoc = position;\nvLocN = normal;');
    let f = sh.fragmentShader.replace('#include <common>', `#include <common>\n${COMMON}\nvarying vec4 vLeaf;\nvarying vec3 vTint;\nvarying vec4 vTree;\nvarying vec3 vLoc;\nvarying vec3 vLocN;\nfloat lPart; float lPx; float lClump = 0.5;`);
    f = f.replace('#include <color_fragment>', `#include <color_fragment>
{
  lPart = floor(vLeaf.x + 0.5);
  lPx = length(fwidth(vLoc));
  vec3 q = vLoc + vTree.x * 37.0;
  vec3 c;
  float fine = mix(0.5, wNoise(q * 3.4), 1.0 - smoothstep(0.3, 0.8, lPx * 3.4));
  if (lPart < 0.5) {
    // Bark: a dark warm grey, weathered paler on the dead, and on the aspen pale with dark marks across it.
    c = mix(${lin(0x110c08)}, ${lin(0x5e574e)}, vTree.z);
    float mark = smoothstep(0.62, 0.8, wNoise(vec3(q.x * 2.0, q.y * 1.6, q.z * 2.0)));
    c *= 1.0 - 0.6 * mark * smoothstep(0.7, 1.0, vTree.z) * (1.0 - smoothstep(0.3, 0.8, lPx * 2.0));
    c *= 0.85 + 0.3 * mix(0.5, wNoise(vec3(q.x * 3.0, q.y * 0.5, q.z * 3.0)), 1.0 - smoothstep(0.3, 0.8, lPx * 3.0));
  } else if (lPart > 4.5) {
    // A lantern's glass.
    c = ${lin(0x1a120a)};
  } else if (lPart > 3.5) {
    // Stone: a warm grey, darker in its hollows, with paler crusts.
    float s = wFbm(q * 0.7);
    c = ${lin(0x2e2924)} * (0.6 + 0.6 * s) * (0.85 + 0.3 * fine) * (0.8 + 0.4 * wNoise(q * 0.25));
    lClump = s;
  } else {
    // Leaves and needles: in clusters with dark gaps between them, gone to their average before a cluster is finer
    // than a pixel. A crown is lit on its top and dark under; a conifer's every skirt is.
    float far = smoothstep(0.35, 0.9, lPx * 1.1);
    // Where a crown turns from the eye its edge breaks into clusters of leaves with sky between, so no crown shows the
    // polygons it is built of. The view never moves, so the edge holds still.
    float face = abs(dot(normalize(vNormal), normalize(vViewPosition)));
    float lace = wNoise(q * (lPart > 1.5 ? 2.4 : 1.5)) * 0.7 + wNoise(q * 4.1) * 0.3;
    if (lPart < 2.5 && lace < (0.42 - face) * 1.9) discard;
    float clump = mix(smoothstep(0.32, 0.68, wFbm(q * (lPart > 1.5 ? 1.6 : 1.25))), 0.55, far);
    // A coarser clumping that still shows when the crown is small on the screen.
    float coarse = mix(smoothstep(0.3, 0.7, wNoise(q * 0.42)), 0.55, smoothstep(0.5, 1.2, lPx * 0.42));
    clump = mix(clump * 0.6 + coarse * 0.4, coarse, far * 0.8);
    float up = smoothstep(0.0, 1.0, vLeaf.y), out1 = clamp(vLeaf.z, 0.0, 1.0);
    float shade = lPart > 1.5 ? mix(0.1, 0.9, up * up) : mix(0.16, 1.0, up * up) * mix(0.3, 1.0, out1);
    c = vTint * shade * mix(0.3, 1.2, clump) * (0.8 + 0.4 * fine) * (0.85 + 0.3 * vLeaf.w);
    lClump = clump;
  }
  diffuseColor.rgb = c;
}`);
    f = f.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = lPart > 4.5 ? 0.3 : lPart > 3.5 ? 0.9 : lPart < 0.5 ? 0.95 : 0.8;');
    f = f.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
if (lPart > 0.5 && lPart < 4.5) normal = gBump(normal, (lClump + 0.3 * wNoise((vLoc + vTree.x * 37.0) * 3.4)) * (lPart > 3.5 ? 0.8 : 0.9) * (1.0 - smoothstep(0.35, 0.9, lPx * 1.1)), ${SCALE.toFixed(5)});`);
    f = f.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
  vec3 V = normalize(vViewPosition);
  vec3 N = normal;
  float fres = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), 2.5);
  vec3 lw = (viewMatrix * vec4(uLamp * ${SCALE.toFixed(5)}, 1.0)).xyz + vViewPosition;
  vec3 L = dot(lw, lw) > 1e-12 ? normalize(lw) : vec3(0.0, 0.0, 1.0);
  vec3 Mo = normalize(mat3(viewMatrix) * vec3(${f1(MOON.x)}, ${f1(MOON.y)}, ${f1(MOON.z)}));
  float toLamp = clamp(dot(N, L), 0.0, 1.0), toMoon = clamp(dot(N, Mo) * 0.7 + 0.3, 0.0, 1.0);
  float leafy = step(0.5, lPart) * (1.0 - step(3.5, lPart));
  float up = smoothstep(0.1, 1.0, vLeaf.y);
  // Edges catch the light: the cursor's where they face it, and the moon's on the side turned to it.
  vec3 edge = mix(${lin(hex('copper-light'))}, ${lin(hex('pale'))}, 0.35 + 0.4 * toLamp);
  totalEmissiveRadiance += edge * diffuseColor.rgb * leafy * fres * (1.4 * toLamp + 1.5 * toMoon * up) * (0.4 + 0.8 * lClump);
  // A lantern burns.
  totalEmissiveRadiance += heat(0.66) * 2.6 * step(4.5, lPart);
  // A lantern's light reaches the trees nearest it, from below.
  float under = clamp(0.5 - vLocN.y * 0.6, 0.0, 1.0);
  totalEmissiveRadiance += heat(0.5) * diffuseColor.rgb * vTree.y * under * exp(-max(vLoc.y, 0.0) / 6.0) * 1.6 * step(0.5, lPart);
}`);
    // Leaves and needles keep little of the sheen a smooth surface has at a grazing angle: seen from above, a skirt of
    // needles is all grazing angles, and the sheen turned every dark conifer grey.
    f = f.replace('#include <lights_fragment_end>', `  float sheen = lPart > 4.5 ? 1.0 : lPart > 3.5 ? 0.5 : lPart < 0.5 ? 0.25 : 0.2;\n  reflectedLight.directDiffuse *= ${f1(LAMP_GAIN)};\n  reflectedLight.directSpecular *= ${f1(LAMP_GAIN)} * sheen;\n  reflectedLight.indirectSpecular *= sheen;\n#include <lights_fragment_end>`);
    sh.fragmentShader = f.replace('#include <opaque_fragment>', HOLD);
  };
  m.customProgramCacheKey = () => 'forest';
  return m;
}
