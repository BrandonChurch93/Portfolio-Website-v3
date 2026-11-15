import { RectAreaLightTexturesLib } from 'three/addons/lights/RectAreaLightTexturesLib.js';

// The tables an area light is lit by, made off the page's thread (./area.ts).
const lib = RectAreaLightTexturesLib.init();
const data = [lib.LTC_FLOAT_1, lib.LTC_FLOAT_2, lib.LTC_HALF_1, lib.LTC_HALF_2].map((t) => t.image.data as Float32Array | Uint16Array);
postMessage(data, { transfer: data.map((d) => d.buffer as ArrayBuffer) });
