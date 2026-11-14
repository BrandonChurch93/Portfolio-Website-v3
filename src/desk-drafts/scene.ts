import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { COLORS, type Tier } from '../config/site';
import { hex } from '../config/palette';
import { buildBench } from '../pieces/workbench/model';
import { clock } from '../world/clock';
import { Stage } from '../world/stage';
import { BAY, DESK, EDGE, LAND, PLACES, SCREEN, buildDesk } from './desks';
import { materials } from './materials';

// The stage the rough desk is shown on: the bench, the scene on it, the PC under its far end, and the desk's own
// lights. The lamp, the tablet with its pencil and the camera are borrowed from the carried workbench as stand ins.
// The view is the one the fuller draft of Skills is drawn from: from the front left and above.

const D2R = Math.PI / 180, M = DESK.SCALE;
export const REST = { az: -24, el: 30 };
const AIM = new THREE.Vector3(0.02, -0.23, 0);
const FOV = 20;
// What is still borrowed from the carried workbench. Its monitor, keyboard and mouse are not: this draft has its own.
const CARRIED = ['lamp', 'tablet', 'camera', 'lens', 'cap'];
let areaLib = false;

// How much each of the desk's lights is on, 0 to 1. room is the light the desk is seen by before any of its own is
// on. The page that stands the bench in for the desk in Skills brings them up as the stream arrives.
export interface DeskLights { room: number; lamp: number; tablet: number; monitor: number; keys: number; pc: number }

export interface DeskScene {
  // A line of light along the front edge, standing in for the stream.
  stream(on: boolean): void;
  light(l: DeskLights): void;
  // Where a point of the scene is drawn in the host, across and down, 0 to 1. The point is in the desk's own
  // millimetres.
  where(x: number, y: number, z: number): [number, number];
  // The cursor's light, as places across and down the host, 0 to 1.
  lamp(x: number, y: number): void;
  // Turn the view by these degrees from where it rests. null puts it back.
  turn(az: number | null, el?: number): void;
  dispose(): void;
}

export async function mountDesk(host: HTMLElement, tier: Tier): Promise<DeskScene> {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  host.appendChild(canvas);
  if (!areaLib) { RectAreaLightUniformsLib.init(); areaLib = true; }
  const stage = new Stage(host, canvas, { tier, fov: FOV, near: 0.2, far: 40, bloom: { strength: 0.16, threshold: 1.9, radius: 0.3 }, ao: 0.02, aoIntensity: 1, envIntensity: 0.3, env: 'studio', lampTarget: [0, -0.05, 0.1], lampAngle: 0.9 });
  const s = stage.scene;
  s.background = new THREE.Color(COLORS.bg);
  s.fog = new THREE.Fog(COLORS.bg, 6, 11);

  const mats = materials();
  const root = new THREE.Group();
  root.scale.setScalar(M);
  s.add(root);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2), mats.floor);
  floor.position.y = -DESK.H;
  floor.receiveShadow = true;
  floor.userData.noWire = true;
  root.add(floor);
  const desk = buildDesk(mats);
  root.add(desk.root);

  // The lamp, the tablet and the camera are the carried workbench's, moved to their places on a longer top.
  const bench = await buildBench();
  for (const tl of bench.tools) {
    const to = PLACES[tl.name];
    if (!to || !CARRIED.includes(tl.name)) continue;
    bench.root.remove(tl.group);
    tl.group.position.set(to[0], tl.name === 'lamp' || tl.name === 'lens' ? 0 : 4, to[1]);
    tl.group.rotation.set(0, to[2] * D2R, 0);
    root.add(tl.group);
  }
  bench.root.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
  bench.lampBulb.color.setRGB(1, 0.82, 0.63).multiplyScalar(2.4);
  for (const m of bench.screens) m.emissiveIntensity = 0.32;

  // The desk's own lights: the lamp over the tablet, the monitor, and the PC's ember under the far end.
  const [lx, lz] = PLACES.lamp;
  const deskLamp = new THREE.SpotLight(0xffc98f, 5.5, 0, 58 * D2R, 0.85, 2);
  deskLamp.position.set((lx + 190) * M, 438 * M, (lz + 196) * M);
  deskLamp.target.position.set((lx + 430) * M, 0, (lz + 330) * M);
  deskLamp.castShadow = true;
  deskLamp.shadow.mapSize.set(2048, 2048);
  deskLamp.shadow.bias = -0.0006;
  deskLamp.shadow.normalBias = 0.004;
  deskLamp.shadow.radius = 5;
  deskLamp.shadow.camera.near = 0.05;
  deskLamp.shadow.camera.far = 3;
  const monLight = new THREE.RectAreaLight(0xffc48a, 2.4, (SCREEN.w - 20) * M, (SCREEN.h - 30) * M);
  monLight.position.set(SCREEN.x * M, (SCREEN.low + SCREEN.h / 2) * M, (SCREEN.z + 24) * M);
  monLight.lookAt(SCREEN.x * M, 120 * M, (SCREEN.z + 560) * M);
  const pcLight = new THREE.PointLight(hex('flame'), 0.4, 1.8, 2);
  pcLight.position.set((BAY.l - 90) * M, (-DESK.H + 280) * M, ((BAY.back + BAY.front) / 2 + 60) * M);
  const rim = new THREE.RectAreaLight(0xffe0c4, 8, 2.6, 0.6);
  rim.position.set(1.4, 1.2, -1.8);
  rim.lookAt(0, -0.1, 0);
  const fill = new THREE.RectAreaLight(0xffd9b8, 5.5, 2.6, 1.4);
  fill.position.set(-1.6, 0.9, 2.4);
  fill.lookAt(0, -0.3, 0);
  s.add(deskLamp, deskLamp.target, monLight, pcLight, rim, fill, new THREE.HemisphereLight(0x4a3526, 0x120c08, 0.55));

  // The stream's stand in: a line that comes down onto the front edge, runs it to the near end and falls away, with a
  // long low light beside it so the edge and the timber show what the stream's light does to them.
  const line = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex('hot')).multiplyScalar(2.6) });
  const flow = new THREE.Group();
  {
    const [y, z] = EDGE, end = -DESK.W / 2;
    const path = new THREE.CurvePath<THREE.Vector3>();
    const v = (x: number, yy: number, zz = z) => new THREE.Vector3(x, yy, zz);
    path.add(new THREE.LineCurve3(v(LAND, 1500), v(LAND, y + 8)));
    path.add(new THREE.QuadraticBezierCurve3(v(LAND, y + 8), v(LAND, y), v(LAND - 10, y)));
    path.add(new THREE.LineCurve3(v(LAND - 10, y), v(end + 20, y)));
    path.add(new THREE.QuadraticBezierCurve3(v(end + 20, y), v(end - 70, y, z + 10), v(end - 110, y - 160, z + 40)));
    path.add(new THREE.LineCurve3(v(end - 110, y - 160, z + 40), v(end - 190, -DESK.H, z + 110)));
    const g = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.TubeGeometry(path, 240, 3.2, 8), line);
    tube.userData.noAO = true;
    g.add(tube);
    g.scale.setScalar(M);
    // A light's size is not scaled with what holds it, so the light is placed in metres.
    const glow = new THREE.RectAreaLight(hex('flame'), 2.6, (LAND - end) * M, 0.05);
    glow.position.set(((LAND + end) / 2) * M, (y + 14) * M, (z + 12) * M);
    glow.lookAt(((LAND + end) / 2) * M, (y - 60) * M, (z - 300) * M);
    flow.add(g, glow);
    flow.visible = false;
    s.add(flow);
  }

  // Each light, with what it is at when it is fully on. The lit parts of the keyboard, the mouse, the monitor and
  // the PC share three materials, so each group is given its own copies to be turned up and down by.
  const dial = <T,>(read: () => T, write: (k: number, full: T) => void) => { const full = read(); return (k: number) => write(k, full); };
  const power = (l: THREE.Light) => dial(() => l.intensity, (k, full) => { l.intensity = full * k; });
  const tint = (m: { color: THREE.Color }) => dial(() => m.color.clone(), (k, full) => { m.color.copy(full).multiplyScalar(k); });
  const own = (group: string) => {
    const copies = new Map<THREE.Material, THREE.MeshBasicMaterial>(), dials: ((k: number) => void)[] = [];
    desk.root.getObjectByName(group)?.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const m = o.material as THREE.Material;
      if (m === mats.ember || m === mats.deep || m === mats.hot) {
        let c = copies.get(m);
        if (!c) { c = (m as THREE.MeshBasicMaterial).clone(); copies.set(m, c); dials.push(tint(c)); }
        o.material = c;
      } else if (m instanceof THREE.ShaderMaterial && (m.name === 'glow' || m.name === 'halo')) {
        if (!m.uniforms.uOn) {
          m.uniforms.uOn = { value: 1 };
          m.fragmentShader = `uniform float uOn; ${m.fragmentShader.replace(/\}\s*$/, ' gl_FragColor.rgb *= uOn; }')}`;
          m.needsUpdate = true;
        }
        dials.push((k) => { m.uniforms.uOn.value = k; });
      }
    });
    return (k: number) => { for (const d of dials) d(k); };
  };
  const hemi = s.children.find((o) => o instanceof THREE.HemisphereLight) as THREE.HemisphereLight;
  const lights: Record<keyof DeskLights, ((k: number) => void)[]> = {
    room: [power(rim), power(fill), power(hemi), dial(() => s.environmentIntensity, (k, full) => { s.environmentIntensity = full * k; })],
    lamp: [power(deskLamp), tint(bench.lampBulb)],
    tablet: bench.screens.map((m) => dial(() => m.emissiveIntensity, (k, full) => { m.emissiveIntensity = full * k; })),
    monitor: [dial(() => desk.screen.emissiveIntensity, (k, full) => { desk.screen.emissiveIntensity = full * k; }), power(monLight), own('monitor')],
    keys: [own('keyboard'), own('mouse')],
    pc: [power(pcLight), own('pc')],
  };
  let room = 1;
  const was: DeskLights = { room: 1, lamp: 1, tablet: 1, monitor: 1, keys: 1, pc: 1 };

  let view = { ...REST }, lampUV = { x: 0.62, y: 0.3 }, alive = true, seen = true;
  const right = new THREE.Vector3(), up = new THREE.Vector3(), back = new THREE.Vector3();
  const place = () => {
    const a = view.az * D2R, e = view.el * D2R;
    const asp = stage.width / Math.max(1, stage.height), half = Math.tan((FOV / 2) * D2R);
    // Far enough back for the whole desk, its lamp and its legs, whatever the host's shape.
    const d = Math.max(1.46 / (half * asp), 1.02 / half);
    stage.camera.position.set(AIM.x + d * Math.cos(e) * Math.sin(a), AIM.y + d * Math.sin(e), AIM.z + d * Math.cos(e) * Math.cos(a));
    stage.camera.lookAt(AIM);
    stage.camera.updateMatrixWorld(true);
    stage.camera.matrixWorld.extractBasis(right, up, back);
    stage.lamp.position.copy(AIM).addScaledVector(right, (lampUV.x - 0.5) * 2.8).addScaledVector(up, (0.5 - lampUV.y) * 1.5 + 0.35).addScaledVector(back, 1.25);
    stage.lamp.intensity = 16 * room;
  };
  // Under a held clock, which is how a still is taken, a frame is drawn only when something has changed.
  let stale = true;
  const frame = () => {
    if (!alive || !seen) return;
    if (clock.isFrozen() && !stale) return;
    stale = false;
    const t = clock.now();
    bench.tablet.draw(t);
    desk.glow.uniforms.uTime.value = t;
    place();
    stage.render();
  };
  stage.resize();
  place();
  await stage.warm();
  const watch = new ResizeObserver(() => { stage.resize(); stale = true; frame(); });
  watch.observe(host);
  const near = new IntersectionObserver((es) => { seen = es.some((e) => e.isIntersecting); });
  near.observe(host);
  const off = clock.onFrame(frame);
  frame();

  return {
    stream(on) { flow.visible = on; stale = true; frame(); },
    light(l) {
      for (const key of Object.keys(lights) as (keyof DeskLights)[]) {
        if (l[key] === was[key]) continue;
        was[key] = l[key];
        for (const set of lights[key]) set(l[key]);
        stale = true;
      }
      room = was.room;
    },
    where(x, y, z) {
      place();
      const v = new THREE.Vector3(x * M, y * M, z * M).project(stage.camera);
      return [(v.x + 1) / 2, (1 - v.y) / 2];
    },
    lamp(x, y) { if (Math.abs(x - lampUV.x) + Math.abs(y - lampUV.y) > 0.002) stale = true; lampUV = { x, y }; },
    turn(az, el = 0) { view = az === null ? { ...REST } : { az: REST.az + az, el: Math.min(62, Math.max(6, REST.el + el)) }; stale = true; frame(); },
    dispose() { alive = false; off(); watch.disconnect(); near.disconnect(); stage.dispose(); canvas.remove(); },
  };
}
