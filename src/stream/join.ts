import type { Branch, Route } from './route';

// One stream through several sections: the route of a section put on the end of the route of the section before
// it. Each section's planner makes a route of its own, from where things are on the page, and starts where the one
// before it ended. This joins two of them into one, so one stream, with one leading end, runs through both.
// The first route may have two sides, as Work's has. They have met by its end, and from there only the first side
// goes on: the second route is put on the end of that side alone, and the other side is left as it was.
// Everything the second route knows by how far along it is (its landings, its cues, the stretches it is not drawn)
// is moved along by the first route's length. Things a route holds once for all of itself are kept apart: each
// landing keeps how far its own route lets a thrown shard fall, and each rail keeps its own route's bounce.

const append = (a: Float32Array, b: Float32Array): Float32Array => { const out = new Float32Array(a.length + b.length - 1); out.set(a); out.set(b.subarray(1), a.length); return out; };

function carry(a: Branch, b: Branch): Branch {
  const zeros = (n: number) => new Float32Array(n);
  // The second route's first point is the first route's last.
  const ride = append(a.ride, b.ride.map((v) => v + a.rideLen)), floor = append(a.floor, b.floor);
  // A height on the page still gives one distance along the whole route.
  for (let i = a.n; i < floor.length; i++) floor[i] = Math.max(floor[i], floor[i - 1]);
  const out: Branch = {
    n: a.n + b.n - 1, len: a.len + b.len, step: a.step,
    x: append(a.x, b.x), y: append(a.y, b.y), tx: append(a.tx, b.tx), ty: append(a.ty, b.ty), floor,
    hold: append(a.hold, b.hold), calm: append(a.calm, b.calm), level: append(a.level, b.level), bend: append(a.bend, b.bend),
    apart: append(a.apart, b.apart), roomA: append(a.roomA, b.roomA), roomB: append(a.roomB, b.roomB),
    ride, rideLen: a.rideLen + b.rideLen,
  };
  if (a.fx || b.fx) { out.fx = append(a.fx ?? a.tx, b.fx ?? b.tx); out.fy = append(a.fy ?? a.ty, b.fy ?? b.ty); }
  if (a.haste || b.haste) out.haste = append(a.haste ?? zeros(a.n), b.haste ?? zeros(b.n));
  return out;
}

export function join(a: Route, b: Route): Route {
  const first = a.branches[0], by = first.len, whole = carry(first, b.branches[0]);
  const fall = Math.max(a.fall, b.fall);
  const lands = (r: Route, shift: number) => r.landings.map((L) => ({ ...L, s: L.s + shift, side: shift ? 0 : L.side, fall: L.fall ?? (r.fall === fall ? undefined : r.fall) }));
  const rails = (r: Route) => r.rails.map((rail) => (r.soft === undefined || rail.soft !== undefined ? rail : { ...rail, soft: r.soft }));
  // A route with one side has the same line for both. When neither has parted, the whole is still one line.
  const single = a.branches[1] === first || (a.join[0] === Infinity && a.split > first.len);
  return {
    branches: [whole, single ? whole : a.branches[1]],
    split: single ? whole.len + 1e6 : a.split,
    join: a.join,
    landings: [...lands(a, 0), ...lands(b, by)],
    boxes: [...a.boxes, ...b.boxes], posts: [...a.posts, ...b.posts], rails: [...rails(a), ...rails(b)],
    fins: [...a.fins, ...b.fins], flows: [...a.flows, ...b.flows],
    fall, unit: a.unit,
    cues: [...(a.cues ?? []), ...(b.cues ?? []).map((c) => ({ ...c, s: c.s + by }))],
    dark: [...(a.dark ?? []), ...(b.dark ?? []).map((d) => ({ ...d, from: d.from + by, to: d.to + by }))],
  };
}
