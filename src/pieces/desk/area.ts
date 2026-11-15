import * as THREE from 'three';

// The monitor's light is an area light, which three lights by two tables it builds in RectAreaLightUniformsLib.init():
// one task of about a tenth of a second, which held a scrolling page still. They are made in a worker here, and the
// same textures are made from them as init() makes, so the picture is the same.

const LTC = ['LTC_FLOAT_1', 'LTC_FLOAT_2', 'LTC_HALF_1', 'LTC_HALF_2'] as const;
let ready: Promise<void> | null = null;

function table(data: Float32Array | Uint16Array, type: THREE.TextureDataType): THREE.DataTexture {
  const t = new THREE.DataTexture(data, 64, 64, THREE.RGBAFormat, type, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.NearestFilter, 1);
  t.needsUpdate = true;
  return t;
}

export function areaLightTables(): Promise<void> {
  const lib = THREE.UniformsLib as unknown as Record<string, unknown>;
  if (ready) return ready;
  ready = new Promise<void>((done) => {
    // Made already, by another piece that called init().
    if (lib.LTC_FLOAT_1) { done(); return; }
    const here = () => { import('three/addons/lights/RectAreaLightUniformsLib.js').then((m) => { m.RectAreaLightUniformsLib.init(); done(); }, () => done()); };
    if (typeof Worker === 'undefined') { here(); return; }
    let w: Worker;
    try { w = new Worker(new URL('./area.worker.ts', import.meta.url), { type: 'module' }); } catch { here(); return; }
    const fail = () => { w.terminate(); here(); };
    w.onerror = fail;
    w.onmessageerror = fail;
    w.onmessage = (e: MessageEvent<(Float32Array | Uint16Array)[]>) => {
      w.terminate();
      if (!lib.LTC_FLOAT_1) LTC.forEach((name, i) => { lib[name] = table(e.data[i], i < 2 ? THREE.FloatType : THREE.HalfFloatType); });
      done();
    };
  });
  return ready;
}
