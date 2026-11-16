import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { lin } from '../../../../world/surface';
import { ROCKET, STONE, TABLE, TAIL, VIEW, tail } from '../../layout';

// The engine's fire, drawn as light alone and added to what is behind it, so on the page's clear ground it lays its
// light on the page and leaves no shape of its own. Three sheets share one program: the plume, upright under the bell
// and facing the visitor; the jets the plume throws out to each side under the table and along the stone; and the
// fire spread over the stone round the table. Each is worked out from the burn, the climb, the launch's age and the
// clock alone, and each is gone to nothing well inside its own edges, so it never ends in a line.
// Ember is left out and the deep flame is held bright: added dimly over the dark ground, either reads as brown smoke.
// Stirred by round noise, or broken into puffs, the plume read as smoke: it is one column stirred by long streaks.

export const PLUME = { r0: 16.5, widen: 0.075, swell: 7, half: 90 } as const;
// At the page's size a unit is about a pixel, so each diamond is a mark a visitor can count.
export const THROAT = { long: 150, mouth: 12, flash: 19, pinch: 2.2, line: 1.4 } as const;
export const DIAMONDS = { n: 4, first: 26, gap: 28, w: 8, h: 9.5 } as const;
const STREAK = { along: [0.01, 0.018], fade: 0.2, foot: 0.14, thin: 0.45 } as const;
const TONGUES = { along: 0.008, pace: 9, pick: [0.45, 0.72], out: 0.8 } as const;
const BODY = { near: 2.4, far: 0.5, foot: 0.4 } as const;
const BAND = { w: 5, hot: 110, pale: 16, power: 1, hold: 0.8, among: 0.25 } as const;
const BURST = { at: 1, w: [26, 50], h: 13, core: 17 } as const;
// Taller, and pale, the splash was a flat bar lying across the front of the table. Brightest down its middle, the
// column was hidden by the table's middle front leg: it is brightest this far out from its middle.
const SPLASH = { w: [24, 26, 34], h: 4.5, jet: 25, flash: 3, side: 0.3 } as const;
// The jets stay lower than the stone's far edge is drawn, or their tips stand in the air over it.
export const JETS = { reach: 96, burst: 70, tall: 16, half: 300, high: 46 } as const;
// The fire on the stone is never pale.
export const SPREAD = { under: 240, lick: 80, half: 330, grow: [0.6, 0.4], root: 45, middle: 0.3 } as const;
// How long the fire takes to roll out from under the table, in seconds of the launch, how fast what is on the stone
// dies as the rocket leaves, and the climb by which it is gone.
export const ROLL = { out: 0.55, fade: 90, gone: 240 } as const;
// The jets go well under the stone's far rim as it is drawn: taller, their tips hung in the air over it.
const DISC = { gone: 10, from: 40, jets: [0.35, 0.6] } as const;
// The stage's bloom starts at 2.2.
const CAP = 2;
// The time the fire and the engine's flicker are held at when nothing may move.
export const STILL_T = 0.37;

const n = (x: number) => x.toFixed(2);

const FRAG = /* glsl */ `
uniform float uMode, uBurn, uClimb, uAge, uTime, uLen, uFlash;
varying vec2 vP;
float fh(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float fn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(fh(i), fh(i + vec2(1.0, 0.0)), f.x), mix(fh(i + vec2(0.0, 1.0)), fh(i + vec2(1.0, 1.0)), f.x), f.y); }
float ff(vec2 p){ return fn(p) * 0.55 + fn(p * 2.03 + 7.1) * 0.3 + fn(p * 4.1 + 3.3) * 0.15; }
const vec3 EMBER = ${lin(hex('ember'))};
const vec3 FLAME = ${lin(hex('flame'))};
const vec3 HOT = ${lin(hex('hot'))};
const vec3 PALE = ${lin(hex('pale'))};
const vec3 DEEP = mix(FLAME, EMBER, 0.55) * 1.6;
float sq(float x){ return x * x; }
float hard(float d){ float a = max(fwidth(d), 1e-4); return clamp(0.5 - d / a, 0.0, 1.0); }
// How much of the fire is on the stone: it rolls out from under the table and dies as the rocket climbs away. It dies
// by shrinking into its tongues and not by dimming, which would turn it brown.
float onStone(){ return uBurn * smoothstep(0.0, 0.25, uAge) * exp(-uClimb / ${n(ROLL.fade)}) * (1.0 - smoothstep(0.0, ${n(ROLL.gone)}, uClimb)); }
void main(){
  vec3 col = vec3(0.0);
  if (uMode < 0.5) {
    // m runs down from the bell's mouth, u across.
    float u = vP.x, m = -vP.y;
    float ground = ${n(ROCKET.mouth)} + uClimb + vP.y;
    if (m < -1.0 || ground < 0.0) discard;
    float L = max(uLen, 1.0), t = clamp(m / L, 0.0, 1.0), mm = max(m, 0.0), T = uTime;
    float w = (${n(PLUME.r0)} + ${n(PLUME.widen)} * mm + ${n(PLUME.swell)} * (1.0 - exp(-mm / 30.0))) * (0.8 + 0.2 * uBurn);
    float bend = (ff(vec2(mm * 0.006 - T * 1.3, 4.0)) - 0.5) * 0.22 * smoothstep(40.0, 220.0, mm);
    float x = u / (w * (1.0 - ${n(STREAK.thin)} * smoothstep(0.4, 1.0, t))) - bend, ax = abs(x);
    float s1 = ff(vec2(x * 5.0 + 2.0, mm * ${n(STREAK.along[0])} - T * 8.0));
    float s2 = ff(vec2(x * 7.0 + 9.0, mm * ${n(STREAK.along[1])} - T * 14.0));
    float fade = 1.0 - smoothstep(${n(STREAK.fade)}, 1.0, t);
    float body = (1.0 - x * x) * fade + 0.3 * (s1 - 0.5) * smoothstep(0.4, 1.0, ax) * fade + ${n(STREAK.foot)} * (s1 - 0.5) * smoothstep(0.35, 0.9, t);
    float tg = ff(vec2(ax * 6.0 - mm * 0.004 + step(x, 0.0) * 31.0, mm * ${n(TONGUES.along)} - T * ${n(TONGUES.pace)}));
    float tf = smoothstep(${n(TONGUES.pick[0])}, ${n(TONGUES.pick[1])}, tg) * clamp(1.0 - (ax - 0.6) / ${n(TONGUES.out)}, 0.0, 1.0) * smoothstep(0.55, 0.8, ax);
    tf *= (1.0 - smoothstep(0.3, 0.95, t)) * smoothstep(12.0, 50.0, mm);
    float field = max(body, tf * 0.45);
    float on = smoothstep(0.02, 0.22, field);
    float P = max(0.28 + 0.72 * pow(clamp(1.0 - ax, 0.0, 1.0), mix(0.7, 2.0, smoothstep(0.0, 120.0, mm))), tf * 0.95);
    float I = (${n(BODY.far)} + ${n(BODY.near)} * exp(-mm / (0.35 * L + 30.0))) * P * (0.7 + 0.6 * s2);
    vec3 c = mix(DEEP, FLAME, smoothstep(0.2, 0.6, I));
    c = mix(c, HOT, smoothstep(0.8, 1.4, I) * (1.0 - 0.7 * t));
    c = mix(c, PALE, smoothstep(1.4, 2.1, I) * (1.0 - smoothstep(0.0, 0.35, t)) * 0.8);
    c = mix(c, DEEP, smoothstep(0.35, 0.95, t) * 0.6);
    col = c * on * max(I, 0.45) * mix(1.0, ${n(BODY.foot)}, smoothstep(0.45, 1.0, t));
    float Lc = ${n(THROAT.long)} * (0.35 + 0.65 * uBurn) * (1.0 + 0.5 * uFlash);
    col *= 1.0 - ${n(BAND.hold)} * exp(-sq(u / 9.0)) * (1.0 - smoothstep(0.75 * Lc, Lc, mm)) * smoothstep(8.0, 22.0, mm);
    float bandW = ${n(BAND.w)} + 0.03 * mm;
    float band = exp(-sq(u / bandW)) * fade * on * mix(${n(BAND.among)}, 1.0, smoothstep(0.6 * Lc, Lc, mm));
    col += mix(FLAME, mix(HOT, PALE, exp(-mm / ${n(BAND.pale)})), exp(-mm / ${n(BAND.hot)})) * band * ${n(BAND.power)} * exp(-mm / (0.6 * L + 20.0));
    float pinchAt = ${n(DIAMONDS.first - DIAMONDS.h)};
    float cw = mix(mix(${n(THROAT.mouth)}, ${n(THROAT.flash)}, uFlash), ${n(THROAT.pinch)}, smoothstep(0.0, pinchAt * (1.0 + uFlash), mm));
    cw = max(cw, ${n(THROAT.line)} * (1.0 - smoothstep(0.7 * Lc, Lc, mm)));
    float throat = hard(abs(u) - cw) * (1.0 - smoothstep(0.85 * Lc, Lc, mm));
    float k = clamp(floor((mm - ${n(DIAMONDS.first - DIAMONDS.gap / 2)}) / ${n(DIAMONDS.gap)}), 0.0, ${n(DIAMONDS.n - 1)});
    float mk = ${n(DIAMONDS.first)} + k * ${n(DIAMONDS.gap)};
    float dd = abs(u) / (${n(DIAMONDS.w)} * (1.0 - 0.14 * k)) + abs(m - mk) / (${n(DIAMONDS.h)} * (1.0 - 0.08 * k)) - 1.0;
    float dia = hard(dd) * step(mk + ${n(DIAMONDS.h)}, Lc) * smoothstep(0.35, 0.7, uBurn);
    float mouthNear = exp(-mm / 10.0);
    col += HOT * throat * (0.8 + 0.8 * mouthNear) * (1.0 - 0.5 * smoothstep(0.0, Lc, mm));
    col += PALE * throat * mouthNear * (0.8 + 1.2 * uFlash);
    col += mix(HOT * 1.3, PALE * 2.4, 1.0 - smoothstep(-1.0, 0.0, dd)) * dia * (1.0 - 0.17 * k);
    // Each shrinks as the flash goes and does not dim, so it stays hard.
    float fa = atan(m - ${n(BURST.at)}, u);
    float bw = ${n(BURST.w[0])} + ${n(BURST.w[1])} * uFlash;
    // An even lens of pale read as the deck's plate turning pale.
    float blick = smoothstep(0.3, 0.75, ff(vec2(u * 0.16 - sign(u) * T * 30.0, T * 4.0)));
    float bcore = exp(-sq(u / ${n(BURST.core)}));
    float bh = ${n(BURST.h)} * mix(0.35 + 0.9 * blick, 1.0, bcore);
    float bd = length(vec2(u / bw, (m - ${n(BURST.at)}) / bh)) - 1.0 + 0.3 * (ff(vec2(fa * 5.0, T * 18.0)) - 0.5);
    float burst = hard(bd * min(bw, bh * 4.0) * 0.5) * step(0.02, uFlash) * smoothstep(0.0, 0.3, uFlash);
    float bin = 1.0 - smoothstep(-0.6, 0.0, bd);
    col += (mix(FLAME * 1.2, HOT * 1.3, bin * mix(0.4, 1.0, bcore)) + PALE * 2.4 * bcore * bin) * burst;
    float jw = ${n(SPLASH.jet)} + ${n(SPLASH.flash)} * uFlash + 3.0 * smoothstep(${n(TABLE.under)}, 0.0, ground);
    float jet = hard(abs(u) - jw) * step(${n(ROCKET.mouth - TABLE.top)}, m) * step(ground, ${n(TABLE.top)});
    float jc = clamp(1.0 - sq(u / jw), 0.0, 1.0), js = ff(vec2(u * 0.35, ground * 0.06 + T * 14.0));
    float sw = ${n(SPLASH.w[0])} + ${n(SPLASH.w[1])} * uFlash + ${n(SPLASH.w[2])} * uBurn;
    float sd = length(vec2(u / sw, ground / (${n(SPLASH.h)} * (1.0 + uFlash)))) - 1.0 + 0.35 * (ff(vec2(u * 0.08 - sign(u) * T * 6.0, T * 3.0)) - 0.5);
    float near = exp(-uClimb / 40.0) * smoothstep(0.0, 0.25, uBurn);
    float foot = hard(sd * sw * 0.4) * (1.0 - jet);
    float full = smoothstep(0.5, 1.0, uBurn) * (1.0 - smoothstep(10.0, 30.0, uClimb));
    float ja = abs(u) / jw;
    float jo = mix(jc, smoothstep(0.05, ${n(SPLASH.side)}, ja) * (1.0 - smoothstep(0.82, 1.0, ja)), full);
    col += (mix(FLAME, HOT, jo) * (0.75 + 0.5 * js) * (0.7 + 1.3 * uBurn) + PALE * 0.6 * uFlash * jc * jc
      + PALE * 1.1 * full * (0.25 + 1.5 * smoothstep(0.3, 0.7, js)) * jo * jo) * jet * near;
    col += mix(FLAME, HOT, 1.0 - smoothstep(-0.7, 0.0, sd)) * foot * near * (0.4 + 0.5 * uBurn + uFlash);
    col *= 1.0 - smoothstep(0.8, 1.0, abs(u) / ${n(PLUME.half)});
    col *= smoothstep(0.0, 0.25, uBurn);
  } else if (uMode < 1.5) {
    // The jets thrown out to each side along the stone: low, fast, in streaks along their way, licking up a little.
    float ax = abs(vP.x), y = vP.y, side = sign(vP.x);
    float past = ax - (side > 0.0 ? ${n(TABLE.r)} : ${n(-TABLE.l)});
    float reach = (8.0 + ${n(JETS.reach)} * smoothstep(0.0, ${n(ROLL.out)}, uAge) + ${n(JETS.burst)} * uFlash) * (0.6 + 0.4 * uBurn);
    float away = max(past + 30.0, 0.0) / (reach + 30.0);
    float n1 = ff(vec2(ax * 0.012 - uTime * 3.2, y * 0.22 + side * 5.0)), n2 = ff(vec2(ax * 0.04 - uTime * 6.0, y * 0.5 + side * 9.0));
    float tall = ${n(JETS.tall)} * (0.6 + 0.8 * n1) * (1.0 - 0.55 * min(away, 1.0)) * (1.0 + 0.6 * uFlash) + 3.0;
    float k = onStone();
    float field = max(1.0 - away, 0.0) * max(1.0 - y / tall, 0.0) * (0.4 + 0.6 * k) + 0.4 * (n1 - 0.5) + 0.2 * (n2 - 0.5) - 0.4 * (1.0 - k);
    float flame = smoothstep(0.06, 0.22, field), heat = smoothstep(0.35, 0.8, field);
    // Hot and pale inside: over the lit stone, flame alone does not show.
    col = FLAME * flame * (0.7 + 0.4 * n2) + HOT * heat * (1.0 + 0.7 * uBurn + 0.5 * uFlash)
      + PALE * heat * heat * (0.6 + 0.6 * uBurn + 0.6 * uFlash);
    col *= smoothstep(0.0, 0.12, k) * smoothstep(0.0, 1.5, y);
    col *= mix(0.03, 1.0, smoothstep(-20.0, 0.0, past)) * (1.0 - smoothstep(0.75, 0.95, ax / ${n(JETS.half)})) * (1.0 - smoothstep(0.6, 0.95, y / ${n(JETS.high)}));
    float back = sqrt(max(${n(STONE.r * STONE.r)} - ax * ax, 0.0));
    col *= 1.0 - smoothstep(${n(DISC.jets[0])} * back, ${n(DISC.jets[1])} * back + 1e-3, y / ${n(Math.tan(VIEW.el * Math.PI / 180))});
  } else {
    vec2 q = vec2(vP.x, -vP.y);
    vec2 c = q - vec2(${n((TABLE.l + TABLE.r) / 2)}, 0.0), e = abs(c) - vec2(${n((TABLE.r - TABLE.l) / 2)}, ${n(TABLE.deep / 2)});
    float sd = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0);
    float r = length(q), a = atan(q.y, q.x + 1e-4), roll = smoothstep(0.0, ${n(ROLL.out)}, uAge);
    float k = onStone();
    float n1 = ff(vec2(a * 14.0, r * 0.02 - uTime * 4.0)), n2 = ff(vec2(a * 31.0 + 5.0, r * 0.05 - uTime * 7.0));
    float run = 1.0 - r / (30.0 + ${n(SPREAD.under)} * roll);
    // Never a band along the table's edge.
    float lick = ${n(SPREAD.lick)} * roll * (0.4 + 0.9 * n2) * smoothstep(0.45, 0.75, n1) * (0.6 + 0.4 * uBurn) * k * (1.0 + 0.5 * uFlash);
    float past = 1.0 - max(sd, 0.0) / max(lick, 1.0);
    float field = min(run + 0.25 * (n2 - 0.5), mix(1.0, past, smoothstep(-6.0, 0.0, sd))) - 0.35 * (1.0 - k);
    float flame = smoothstep(0.04, 0.2, field), heat = smoothstep(0.25, 0.65, field);
    float rays = mix(1.0, 0.1 + 0.9 * smoothstep(0.35, 0.8, n1), smoothstep(0.0, 40.0, r));
    float grow = ${n(SPREAD.grow[0])} + ${n(SPREAD.grow[1])} * uBurn + 0.2 * uFlash;
    // Laid over the plate tops under the table it flooded the stone one color: the stone's cuts carry the heat there.
    float show = max(${n(SPREAD.middle)} * exp(-r / ${n(SPREAD.root)}), smoothstep(-6.0, 12.0, sd));
    col = (FLAME * flame * (0.45 + 0.3 * n2) + HOT * heat * grow) * rays * show * smoothstep(0.0, 0.12, k);
    // Shrunk alone as it dies, it ended as a thin line drawn round the table.
    col *= (1.0 - smoothstep(0.8, 0.98, r / ${n(SPREAD.half)})) * smoothstep(0.1, 0.45, k);
    col *= 1.0 - smoothstep(${n(STONE.r - DISC.from)}, ${n(STONE.r - DISC.gone)}, r);
  }
  // Over the bloom's threshold, the fire spread a soft round halo over the sky round the bell.
  col = max(col, vec3(0.0));
  col *= min(1.0, ${n(CAP)} / max(dot(col, vec3(0.2126, 0.7152, 0.0722)), 1e-4));
  gl_FragColor = vec4(col, 0.0);
}`;

export interface Fire { group: THREE.Group; set(s: { burn: number; climb: number; launch: number; flash: number; t: number; still: boolean }): void; dispose(): void }

export function makeFire(): Fire {
  const make = (mode: number) => new THREE.ShaderMaterial({
    name: 'rocketFire',
    uniforms: { uMode: { value: mode }, uBurn: { value: 0 }, uClimb: { value: 0 }, uAge: { value: 0 }, uTime: { value: 0 }, uLen: { value: TAIL.first }, uFlash: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true, side: THREE.DoubleSide,
  });
  const tall = TAIL.long + 4;
  const pg = new THREE.PlaneGeometry(2 * PLUME.half, tall).translate(0, 2 - tall / 2, 0);
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
    set({ burn, climb, launch, flash: fl, t, still }) {
      const len = tail(burn, climb);
      for (const m of mats) {
        const u = m.uniforms;
        u.uBurn.value = burn; u.uClimb.value = climb; u.uAge.value = Math.max(0, launch); u.uTime.value = still ? STILL_T : t; u.uLen.value = len; u.uFlash.value = fl;
      }
      plume.visible = burn > 0;
      low.visible = burn > 0 && climb < ROLL.gone;
      low.position.y = -ROCKET.mouth - climb;
    },
    dispose() { pg.dispose(); jg.dispose(); sg.dispose(); for (const m of mats) m.dispose(); },
  };
}
