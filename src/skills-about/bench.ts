import type { Pt } from '../page-sketch/plan';
import { CX } from './plan';

// The desk for the fuller draft, worked out from real sizes so it has a real desk's proportions. Sizes are in
// metres. It is seen from the front left and above with nothing vanishing, so its front edge runs down to the left
// and carries the stream.
const UNITS = 400, YAW = 24, PITCH = 30, RAD = Math.PI / 180;
const cy = Math.cos(YAW * RAD), sy = Math.sin(YAW * RAD), cp = Math.cos(PITCH * RAD), sp = Math.sin(PITCH * RAD);

// land is how far along the front edge the stream comes down, and top is how far down Skills the desk's near left
// corner is.
export const BENCH = { long: 2, deep: 0.78, tall: 0.74, thick: 0.045, land: 1.12, top: 560 };
const LEFT = CX - BENCH.land * UNITS * cy;

// A place on the desk as a place in Skills: along from its left end, up from its top, back from its front edge.
export const put = (along: number, up: number, back: number): Pt => [
  LEFT + UNITS * (along * cy - back * sy),
  BENCH.top - UNITS * (along * sy * sp + back * cy * sp + up * cp),
];

// The top of the lamp's shade, where the stream can strike it: along, up and back.
export const LAMP: [number, number, number] = [0.29, 0.42, 0.52];

// The lowest thing in the scene, the foot of the near left leg.
export const FLOOR = put(0.04, -BENCH.tall, 0.04)[1];
