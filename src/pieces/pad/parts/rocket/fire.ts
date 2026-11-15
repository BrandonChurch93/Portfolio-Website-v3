import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { lin } from '../../../../world/surface';
import { ROCKET } from '../../layout';
import { BELL } from './form';

// The engine's fire, drawn as light alone and added to what is behind it, so on the page's clear ground it lays its
// light on the page and leaves no shape of its own. Three sheets share one program: the plume, upright under the bell
// and facing the visitor; the jets the plume throws out to each side under the table and along the stone; and the
// fire spread over the stone round the table. Each is worked out from the burn, the climb, the launch's age and the
// clock alone, and each is gone to nothing well inside its own edges, so it never ends in a line.
// It is drawn in layers of the stream's colors, flame at its edge, hot inside it, pale only in its core. Ember is
// left out: added dimly over the dark ground it reads as brown smoke.

// The plume: how long it is at full thrust and at the first light, in units under the mouth, its half width at the
// mouth and how it widens, and how far its sheet reaches across and down.
export const PLUME = { full: 230, first: 60, r0: 16.5, widen: 0.075, swell: 6, half: 110, long: 320 } as const;
// The jets along the stone: how far out to each side they reach at full thrust, how high they lick, and how far their
// sheet reaches. They stay lower than the stone's far edge is drawn, or their tips stand in the air over it.
export const JETS = { reach: 200, tall: 11, half: 260, high: 40 } as const;
// The fire over the stone: how far it has rolled out at full thrust, and how far its sheet reaches.
export const SPREAD = { reach: 150, half: 250 } as const;
// How long the fire takes to roll out from under the table, in seconds of the launch, how fast what is on the stone
// dies as the rocket leaves, and the climb by which it is gone.
export const ROLL = { out: 0.55, fade: 90, gone: 240 } as const;
// The time the fire and the engine's flicker are held at when nothing may move.
export const STILL_T = 0.37;

const n = (x: number) => x.toFixed(2);

const FRAG = /* glsl */ `
uniform float uMode, uBurn, uClimb, uAge, uTime, uLen;
varying vec2 vP;
float fh(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float fn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(fh(i), fh(i + vec2(1.0, 0.0)), f.x), mix(fh(i + vec2(0.0, 1.0)), fh(i + vec2(1.0, 1.0)), f.x), f.y); }
float ff(vec2 p){ return fn(p) * 0.55 + fn(p * 2.03 + 7.1) * 0.3 + fn(p * 4.1 + 3.3) * 0.15; }
const vec3 FLAME = ${lin(hex('flame'))};
const vec3 HOT = ${lin(hex('hot'))};
const vec3 PALE = ${lin(hex('pale'))};
float sq(float x){ return x * x; }
// How much of the fire is on the stone: it rolls out from under the table and dies as the rocket climbs away. It dies
// by shrinking into its tongues and not by dimming, which would turn it brown.
float onStone(){ return uBurn * smoothstep(0.0, 0.25, uAge) * exp(-uClimb / ${n(ROLL.fade)}) * (1.0 - smoothstep(0.0, ${n(ROLL.gone)}, uClimb)); }
void main(){
  vec3 col = vec3(0.0);
  if (uMode < 0.5) {
    // The plume. s runs down from just inside the bell, u across.
    float u = vP.x, s = ${n(BELL[BELL.length - 1][1] - 6)} - vP.y;
    float ground = ${n(ROCKET.mouth)} + uClimb + vP.y;
    if (s < 0.0 || ground < 0.0) discard;
    float L = max(uLen, 1.0), t = clamp(s / L, 0.0, 1.0);
    float w = (${n(PLUME.r0)} + ${n(PLUME.widen)} * s + ${n(PLUME.swell)} * (1.0 - exp(-s / 25.0))) * (0.75 + 0.25 * uBurn);
    // A field of how much fire is at each place: full down its middle, thinning to its edge and its tail, and stirred
    // by streaks that run down it fast. The fire is where the field is over a threshold, so it ends in crisp tongues
    // and stays bright to its edge.
    float x = u / w;
    float n1 = ff(vec2(x * 2.4, s * 0.016 - uTime * 11.0)), n2 = ff(vec2(x * 6.0 + 3.0, s * 0.045 - uTime * 19.0));
    float shape = (1.0 - x * x) * (1.0 - pow(t, 1.4));
    // The stir is held to the body, so a tongue stays joined to the flame and nothing breaks off into loose islands.
    float field = shape + (0.42 * (n1 - 0.5) * smoothstep(0.0, 60.0, s) + 0.18 * (n2 - 0.5)) * clamp(shape * 3.0, 0.0, 1.0);
    float flame = smoothstep(0.04, 0.2, field), heat = smoothstep(0.32, 0.85, field) * (1.0 - 0.6 * t);
    // The core: narrow and pale, pinched into shock diamonds down its first part.
    float dm = pow(max(0.5 + 0.5 * cos(s * 0.23 - 0.7), 0.0), 4.0) * (1.0 - smoothstep(0.05, 0.42, t));
    float core = exp(-sq(u / ((5.5 + 0.035 * s) * (1.0 - 0.3 * dm)))) * exp(-s / (0.24 * L)) * (0.55 + 0.9 * dm);
    float white = smoothstep(0.62, 1.0, field) * (1.0 - smoothstep(0.0, 0.55, t));
    // Pale only inside the flame and only in its first part: dim pale left in the air is greyed by the white balance.
    core *= flame * (1.0 - smoothstep(0.2, 0.5, t));
    // Hottest at the bell and thinning down its length, so the dark shows through its tail.
    float thin = 1.0 - 0.35 * smoothstep(0.1, 0.9, t);
    col = (FLAME * flame * (0.32 + 0.3 * n2) + HOT * heat * 0.6) * thin + PALE * (white * 0.7 + core * 3.4);
    // Where it meets the stone it burns brighter, while the rocket is close.
    col *= smoothstep(0.0, 4.0, ground) + exp(-ground / 8.0) * exp(-uClimb / 60.0) * 1.5;
    col *= (1.0 - smoothstep(0.4, 0.9, abs(u) / ${n(PLUME.half)})) * (1.0 - smoothstep(${n(PLUME.long * 0.76)}, ${n(PLUME.long * 0.96)}, s));
    col *= smoothstep(0.0, 0.25, uBurn);
  } else if (uMode < 1.5) {
    // The jets thrown out to each side along the stone: low, fast, in streaks along their way, licking up a little.
    float ax = abs(vP.x), y = vP.y, side = sign(vP.x);
    float reach = (40.0 + ${n(JETS.reach)} * smoothstep(0.0, ${n(ROLL.out)}, uAge)) * (0.6 + 0.4 * uBurn);
    float away = ax / reach;
    float n1 = ff(vec2(ax * 0.012 - uTime * 3.2, y * 0.22 + side * 5.0)), n2 = ff(vec2(ax * 0.04 - uTime * 6.0, y * 0.5 + side * 9.0));
    float tall = ${n(JETS.tall)} * (0.6 + 0.8 * n1) * (1.0 - 0.55 * min(away, 1.0)) + 3.0;
    float k = onStone();
    float field = max(1.0 - away, 0.0) * max(1.0 - y / tall, 0.0) * (0.4 + 0.6 * k) + 0.4 * (n1 - 0.5) + 0.2 * (n2 - 0.5) - 0.4 * (1.0 - k);
    float flame = smoothstep(0.06, 0.22, field), heat = smoothstep(0.35, 0.8, field);
    // Hot and pale inside: over the lit stone, flame alone does not show.
    col = (FLAME * flame * (0.6 + 0.4 * n2) + HOT * heat * 1.3 + PALE * heat * heat * 0.9) * smoothstep(0.0, 0.12, k) * smoothstep(0.0, 1.5, y);
    col *= (1.0 - smoothstep(0.75, 0.95, ax / ${n(JETS.half)})) * (1.0 - smoothstep(0.6, 0.95, y / ${n(JETS.high)}));
  } else {
    // The fire over the stone round the table, seen from in front and a little above: tongues running out from under it.
    vec2 q = vec2(vP.x, -vP.y);
    float r = length(q), a = atan(q.y, q.x + 1e-4);
    float reach = (30.0 + ${n(SPREAD.reach)} * smoothstep(0.0, ${n(ROLL.out)}, uAge)) * (0.6 + 0.4 * uBurn);
    float n1 = ff(vec2(a * 7.0, r * 0.02 - uTime * 3.0)), n2 = ff(vec2(a * 16.0 + 5.0, r * 0.05 - uTime * 5.0));
    float k = onStone();
    float field = (1.0 - r / reach) * (0.4 + 0.6 * k) + 0.45 * (n1 - 0.5) + 0.2 * (n2 - 0.5) - 0.4 * (1.0 - k);
    float flame = smoothstep(0.05, 0.22, field), heat = smoothstep(0.4, 0.85, field);
    col = (FLAME * flame * (0.55 + 0.45 * n2) + HOT * heat * 1.1 + PALE * heat * heat * 0.7) * smoothstep(0.0, 0.12, k);
    col *= 1.0 - smoothstep(0.6, 0.95, r / ${n(SPREAD.half)});
  }
  gl_FragColor = vec4(max(col, vec3(0.0)), 0.0);
}`;

export interface Fire { group: THREE.Group; set(s: { burn: number; climb: number; launch: number; t: number; still: boolean }): void; dispose(): void }

export function makeFire(): Fire {
  const make = (mode: number) => new THREE.ShaderMaterial({
    name: 'rocketFire',
    uniforms: { uMode: { value: mode }, uBurn: { value: 0 }, uClimb: { value: 0 }, uAge: { value: 0 }, uTime: { value: 0 }, uLen: { value: PLUME.first } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true, side: THREE.DoubleSide,
  });
  const top = BELL[BELL.length - 1][1], tall = PLUME.long + 6;
  const pg = new THREE.PlaneGeometry(2 * PLUME.half, tall).translate(0, top - tall / 2, 0);
  const plume = new THREE.Mesh(pg, make(0));
  const jg = new THREE.PlaneGeometry(2 * JETS.half, JETS.high).translate(0, JETS.high / 2, 0);
  const jets = new THREE.Mesh(jg, make(1));
  // The sheet over the stone is drawn in its own plane and laid flat: its y is then toward the visitor, turned.
  const sg = new THREE.PlaneGeometry(2 * SPREAD.half, 2 * SPREAD.half);
  const spread = new THREE.Mesh(sg, make(2));
  spread.rotation.x = -Math.PI / 2;
  // What is on the stone stays on the stone while the rocket climbs.
  const low = new THREE.Group();
  jets.position.y = 0.5;
  spread.position.y = 0.8;
  low.add(jets, spread);
  const group = new THREE.Group();
  group.add(plume, low);
  for (const m of [plume, jets, spread]) { m.frustumCulled = false; m.renderOrder = 6; m.userData.noAO = true; m.userData.noWire = true; }
  const mats = [plume, jets, spread].map((m) => m.material as THREE.ShaderMaterial);
  return {
    group,
    set({ burn, climb, launch, t, still }) {
      const len = burn > 0 ? PLUME.first + (PLUME.full - PLUME.first) * Math.pow(burn, 1.6) : 0;
      for (const m of mats) {
        const u = m.uniforms;
        u.uBurn.value = burn; u.uClimb.value = climb; u.uAge.value = Math.max(0, launch); u.uTime.value = still ? STILL_T : t; u.uLen.value = len;
      }
      plume.visible = burn > 0;
      low.visible = burn > 0 && climb < ROLL.gone;
      low.position.y = -ROCKET.mouth - climb;
    },
    dispose() { pg.dispose(); jg.dispose(); sg.dispose(); for (const m of mats) m.dispose(); },
  };
}
