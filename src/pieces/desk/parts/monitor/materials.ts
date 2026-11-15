import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { glassLayer, metal, shade } from '../../../../world/surface';

// The ultrawide's surfaces: one dark steel, satin on the panel, a little rougher on the back shell, and polished on
// the stand so its rounded edges carry the cursor's light; copper for the few small accents; and the glass.

// What tarnish pulls copper toward, and the dark steel: grey, so the steel stays plainly grey beside copper.
const BROWN: [number, number, number] = [0.5, 0.36, 0.26];
const GREY: [number, number, number] = [0.88, 0.88, 0.88];

export interface MonitorMats {
  body: THREE.Material;
  shell: THREE.Material;
  stand: THREE.Material;
  pad: THREE.Material;
  copper: THREE.Material;
  glass: THREE.MeshPhysicalMaterial;
}

// How strongly the glass mirrors the room, off and with the picture fully up.
export const GLASS_SPEC = { off: 0.4, on: 0.04 } as const;

// The body, the shell, the stand and the pads are one program: the same dark steel, differing only in color and
// roughness.
// Each mirrors the room only weakly (env), so the cursor's light, which moves, is what its highlights show.
// Satin steel also spreads a small light into a broad soft sheen round its tight glint: a second, rougher lobe from
// each spot light, the cursor's among them, so its highlights slide plainly along the edges and the stand.
const SHEEN = /* glsl */ `
  #if NUM_SPOT_LIGHTS > 0
  { vec3 Vv = normalize(vViewPosition);
    for (int i = 0; i < NUM_SPOT_LIGHTS; i++){
      vec3 toL = spotLights[i].position + vViewPosition;
      vec3 Lv = toL / max(length(toL), 1e-4);
      vec3 Hv = Lv + Vv;
      Hv = Hv / max(length(Hv), 1e-4);
      float nh = max(dot(normal, Hv), 0.0), nl = max(dot(normal, Lv), 0.0);
      float fall = getDistanceAttenuation(length(toL), spotLights[i].distance, spotLights[i].decay) * getSpotAttenuation(spotLights[i].coneCos, spotLights[i].penumbraCos, dot(Lv, spotLights[i].direction));
      totalEmissiveRadiance += spotLights[i].color * fall * nl * pow(nh, 12.0) * diffuseColor.rgb * 1.4;
    }
  }
  #endif`;
const steel = (color: number, rough: number, env = 0.35) => { const m = metal({ name: 'monitor-steel', color, rough, brush: 'none', tarnish: 0.08, patina: GREY, extra: { emissive: SHEEN } }); m.envMapIntensity = env; return m; };

export function monitorMats(): MonitorMats {
  // The glass adds only what it reflects, and keeps it low: the room's soft sheen below, and the cursor's light as a
  // plain mirror would show it. A broad glare of the cursor's light greyed the whole picture.
  const glass = shade(glassLayer('monitor-glass', 0.05), 'monitor-glass', {
    head: 'uniform float uRoom; uniform float uOn;',
    emissive: /* glsl */ `
  { vec3 Vv = normalize(vViewPosition);
    vec3 Rw = (vec4(reflect(-Vv, normal), 0.0) * viewMatrix).xyz;
    float fr = 0.04 + 0.96 * pow(1.0 - max(dot(normal, Vv), 0.0), 5.0);
    // A soft, broad, slanted sheen: a tall light in the room, seen in the glass. It hangs on the view, not on the
    // cursor's light, so scrolling the page never sweeps it across the screen.
    float u = Rw.x + 0.6 * Rw.y - 0.2;
    float room = 0.012 * smoothstep(-0.95, 0.1, Rw.y) + 0.4 * exp(-u * u * 55.0) * smoothstep(-0.9, -0.35, Rw.y);
    totalEmissiveRadiance += vec3(1.0, 0.89, 0.76) * room * fr * uRoom * mix(1.6, 0.12, uOn);
  }`,
  });
  glass.color.setHex(0x000000);
  glass.specularIntensity = GLASS_SPEC.off;
  glass.userData.uniforms = { uRoom: { value: 1 }, uOn: { value: 0 } };
  return {
    body: steel(0x4a4846, 0.28),
    shell: steel(0x3c3a38, 0.34),
    stand: steel(0x2c2a29, 0.32, 0.25),
    pad: steel(0x0c0b0b, 0.8, 1),
    copper: metal({ name: 'monitor-copper', color: hex('copper'), rough: 0.26, brush: 'none', tarnish: 0.3, patina: BROWN }),
    glass,
  };
}
