// The world's one view, for the slice's scripts: the eye, the ray through a place of the host, and the planes that
// hold the eye, which cut a solid along a line of the picture without the cut ever being seen.
//
//   EYE                       where the visitor looks from
//   through(hx, hy, out)      the ray through a place of the host (units from its top left)
//   toward(x, y, z)           how far toward the visitor a place is
//   VIEWWARD                  the way to the visitor at the core
//   seen(px, py)              the ray through a place of picture 9 (its pixels): [a point on it, its direction]
//   held(a, b)                the plane that holds the eye and two places of the picture ([px, py] each), as [n, d]:
//                             n · p <= d on the left of the way from a to b as the picture is looked at
//   at(px, py, n, d)          the point of a plane (n · p = d) seen at a place of the picture
import { L } from '../lib/plan.mjs';

const E = L.VIEW.el * L.D2R, SE = Math.sin(E), CE = Math.cos(E), B = L.VIEW.back;
const Y0 = L.SPIRE.tall - (L.HOST.tall / 2 - L.HOST.over) / CE;
export const EYE = [0, Y0 + B * SE, B * CE];
export function through(hx, hy, out) {
  const a = hx - L.HOST.wide / 2, u = L.HOST.tall / 2 - hy;
  const tx = a, ty = Y0 + u * CE, tz = -u * SE;
  const dx = tx - EYE[0], dy = ty - EYE[1], dz = tz - EYE[2], l = Math.hypot(dx, dy, dz);
  out[0] = dx / l; out[1] = dy / l; out[2] = dz / l;
  return out;
}
export const toward = (x, y, z) => (y - Y0) * SE + z * CE;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

export function seen(px, py) {
  const a = L.fromPicture(px, py, 0), b = L.fromPicture(px, py, 500);
  return [a, norm(sub(b, a))];
}
export const VIEWWARD = seen(...L.pictured(...L.CORE.at))[1];
export function held(a, b) {
  const [p, u] = seen(a[0], a[1]), [q] = seen(b[0], b[1]);
  // (way) x (toward the visitor) points across the picture to the right of the way from a to b, so what is kept is
  // on its left. ./blocks.mjs turns the plane to the side it wants (heldWith).
  const n = norm(cross(sub(q, p), u));
  return [n, dot(n, p)];
}
export function at(px, py, n, d) {
  const [p, u] = seen(px, py), k = dot(u, n);
  const t = (d - dot(p, n)) / (Math.abs(k) < 1e-9 ? 1e-9 : k);
  return [p[0] + u[0] * t, p[1] + u[1] * t, p[2] + u[2] * t];
}
