import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { glassLayer, metal, shade } from '../../../../world/surface';
import { MID, PANEL } from './frame';
import { SHELL } from './shape';

// The ultrawide's surfaces: a satin dark steel for the panel and its chin, a finer blasted finish for the back shell
// with its vents cut in, a brushed dark steel for the stand, copper for the few small accents, and the glass.

// What tarnish pulls the dark steels toward: grey, so they stay plainly grey beside copper.
const BROWN: [number, number, number] = [0.5, 0.36, 0.26];
const GREY: [number, number, number] = [0.88, 0.88, 0.88];
const f = (n: number) => n.toFixed(3);

export interface MonitorMats {
  body: THREE.Material;
  shell: THREE.Material;
  stand: THREE.Material;
  foot: THREE.Material;
  copper: THREE.Material;
  glass: THREE.MeshPhysicalMaterial;
}

// How strongly the glass mirrors the room, off and with the picture fully up.
export const GLASS_SPEC = { off: 0.4, on: 0.16 } as const;

// The body, the stand and the foot are one program: the same dark steel, differing only in color and roughness.
const steel = (color: number, rough: number) => metal({ name: 'monitor-steel', color, rough, brush: 'none', tarnish: 0.08, patina: GREY });

export function monitorMats(): MonitorMats {
  const V = SHELL.vents;
  const vents = /* glsl */ `
float gVent;
float ventMask(){
  vec3 l = vObj - vec3(${f(MID[0])}, ${f(MID[1])}, ${f(MID[2])});
  float zr = ${f(PANEL.R)} - l.z;
  float xp = atan(l.x, zr) * ${f(PANEL.R)};
  float d = ${f(PANEL.back + 1)} - (${f(PANEL.R)} - length(vec2(l.x, zr)));
  float row = floor((d - ${f(V.from)}) / ${f(V.row)} + 0.5);
  float dy = d - ${f(V.from)} - row * ${f(V.row)};
  float u = xp / ${f(V.pitch)} + 0.5 * mod(row, 2.0);
  float dx = (fract(u) - 0.5) * ${f(V.pitch)};
  float r = ${f(V.slot / 2)};
  float sd = length(vec2(max(abs(dx) - ${f(V.len / 2 - V.slot / 2)}, 0.0), dy)) - r;
  float w = fwidth(sd) + 1e-4;
  float rows = step(-0.5, row) * step(row, ${f(Math.round((V.to - V.from) / V.row) + 0.5)});
  float sharp = (1.0 - smoothstep(-w, w, sd)) * rows;
  float mean = ${f((V.len * V.slot) / (V.pitch * V.row))} * step(${f(V.from - V.row / 2)}, d) * step(d, ${f(V.to + V.row / 2)});
  // Slots narrower than a pixel or two are drawn as the shade they average to, so the grille never crawls.
  float far = smoothstep(0.35, 0.9, max(fwidth(d), fwidth(xp)) / ${f(V.slot)});
  float ax = abs(xp);
  float bank = smoothstep(${f(V.inner - 1)}, ${f(V.inner + 1)}, ax) * (1.0 - smoothstep(${f(V.outer - 1)}, ${f(V.outer + 1)}, ax));
  float region = smoothstep(0.55, 0.75, normalize(vObjN).y) * step(178.0, l.y) * bank;
  return mix(sharp, mean, far) * region;
}`;
  const shell = metal({
    name: 'monitor-shell', color: 0x1d1c1b, rough: 0.32, brush: 'none', tarnish: 0.05, patina: GREY,
    extra: {
      head: vents,
      color: 'gVent = ventMask(); diffuseColor.rgb *= 1.0 - 0.8 * gVent;',
      rough: 'roughnessFactor = mix(roughnessFactor, 1.0, gVent);',
    },
  });
  // The glass keeps its reflection low and tight: a broad one lays a haze over the whole picture. It adds only what it
  // reflects: the cursor's light, and a dim room of the desk below and a tall soft light to the right, which the
  // panel's curve sweeps across its width.
  const glass = shade(glassLayer('monitor-glass', 0.05), 'monitor-glass', {
    head: 'uniform float uRoom; uniform float uOn;',
    emissive: /* glsl */ `
  { vec3 Vv = normalize(vViewPosition);
    vec3 Rw = (vec4(reflect(-Vv, normal), 0.0) * viewMatrix).xyz;
    float fr = 0.04 + 0.96 * pow(1.0 - max(dot(normal, Vv), 0.0), 5.0);
    float room = 0.035 * smoothstep(-0.95, 0.1, Rw.y) + 1.1 * exp(-pow((Rw.x - 0.5) * 10.0, 2.0)) * smoothstep(-0.8, -0.4, Rw.y);
    totalEmissiveRadiance += vec3(1.0, 0.89, 0.76) * room * fr * uRoom * mix(0.32, 0.1, uOn);
    #if NUM_SPOT_LIGHTS > 0
    // The spot lights, the cursor's among them: the soft patch an anti-glare coat scatters a light into, brightest where
    // the curve faces the light, so it slides as the light moves, and a glint where it mirrors one.
    vec3 Rv = reflect(-Vv, normal);
    for (int i = 0; i < NUM_SPOT_LIGHTS; i++){
      vec3 toL = spotLights[i].position + vViewPosition, Lv = normalize(toL);
      float a = max(dot(Rv, Lv), 0.0), nl = max(dot(normal, Lv), 0.0);
      vec3 irr = spotLights[i].color * getDistanceAttenuation(length(toL), spotLights[i].distance, spotLights[i].decay) * getSpotAttenuation(spotLights[i].coneCos, spotLights[i].penumbraCos, dot(Lv, spotLights[i].direction));
      totalEmissiveRadiance += irr * (pow(nl, 6.0) * mix(0.009, 0.003, uOn) + pow(a, 30.0) * 0.05);
      // One thin upright streak where the glass mirrors the light across: it slides along the curve as the light moves,
      // and stays when the screen is lit, enough to say glass.
      vec3 Lw = (vec4(Lv, 0.0) * viewMatrix).xyz;
      float across = max(dot(normalize(Rw.xz), normalize(Lw.xz)), 0.0);
      float streak = pow(across, 30000.0) * smoothstep(-0.95, -0.2, Rw.y);
      totalEmissiveRadiance += spotLights[i].color * getSpotAttenuation(spotLights[i].coneCos, spotLights[i].penumbraCos, dot(Lv, spotLights[i].direction)) * streak * 0.03;
    }
    #endif
  }`,
  });
  glass.color.setHex(0x000000);
  glass.specularIntensity = GLASS_SPEC.off;
  glass.userData.uniforms = { uRoom: { value: 1 }, uOn: { value: 0 } };
  return {
    body: steel(0x232220, 0.2),
    shell,
    stand: steel(0x262422, 0.26),
    // The foot is blasted, not polished: lying flat, a polished face mirrors the room's lights as a pale slab.
    foot: steel(0x1c1b1a, 0.46),
    copper: metal({ name: 'monitor-copper', color: hex('copper'), rough: 0.26, brush: 'none', tarnish: 0.3, patina: BROWN }),
    glass,
  };
}
