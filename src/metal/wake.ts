// How a sleeping card changes into an awake one and back: a band of light that crosses the card, with the blank
// ahead of it and the card behind.
//
// A card has one band, and it sets out from one place: where the stream strikes the card, or, on a card the stream
// is not on, where the pointer was put onto it. He ruled it: a card "only ever opens from the first spot the surge
// touches and can't open from multiple spots". With a band for the stream and another for the pointer, a card under
// a pointer at rest opened from two places as the page was scrolled.
//
// A band is a front that spreads from the place it starts, as light does from a strike: an arc of a wide circle
// whose middle stands off the card, behind that place. So it first touches the card exactly there, and is bowed
// only a little as it crosses.
//
// The stream says how far across each band is (src/stream/stream.ts). The card's plate draws the blank, the card
// and the band's light (./shaders.ts), and the card's words wear a mask that uncovers them behind it.

export const WAKE = {
  // How long a band takes to cross when the stream wakes a card or draws back off it, in seconds.
  cross: 0.52,
  // And under the pointer or with keyboard focus, coming and going.
  pointer: [0.36, 0.28] as [number, number],
  // The band itself, in the card's units: how far its light reaches ahead of it over the blank, how wide its bright
  // line is, and how far it trails behind it over the card.
  lead: 26,
  core: 1.9,
  trail: 18,
  // How far from where it started its light has fallen to half.
  spend: 170,
  // How far behind the place it starts the middle of its circle stands, as a share of the card's width. Nearer,
  // and the band is plainly a circle. Further, and it is a straight line that no longer starts anywhere.
  back: 1.5,
  // The card's words come up behind the band's line, in its trailing light: how far behind the line they are
  // whole, and how far behind it the first of them shows, in the card's units. None is ever ahead of the line,
  // where the blank still is.
  words: [12, 3] as [number, number],
};

// Where a band starts on a card and which way is out of the card there: x, y from the card's middle and the way out,
// CSS px with y down.
export type Start = [x: number, y: number, outX: number, outY: number];

// The place on a card's edge nearest a point, and the way out of the card there. The point is from the card's
// middle, and hw and hh are half the card's size.
export function edge(x: number, y: number, hw: number, hh: number): Start {
  const cx = Math.max(-hw, Math.min(hw, x)), cy = Math.max(-hh, Math.min(hh, y));
  const sides: [number, Start][] = [[cy + hh, [cx, -hh, 0, -1]], [hh - cy, [cx, hh, 0, 1]], [cx + hw, [-hw, cy, -1, 0]], [hw - cx, [hw, cy, 1, 0]]];
  return sides.reduce((a, b) => (b[0] < a[0] ? b : a))[1];
}

// The band of one place: how far across the card it is, 0 to 1, where it set out from, and whether it is the
// stream that last kept the card awake or the pointer.
export interface Band {
  across: number;
  from: Start;
  stream: boolean;
}
export const asleep = (): Band => ({ across: 0, from: [0, 0, 0, -1], stream: true });

// Moves a band on by dt seconds. stream says the stream is on the card, and pointer that the pointer was put on it
// or it has keyboard focus. struck and entered are where each of the two would have a band set out from.
// Where it sets out from is chosen only while the card is wholly asleep or wholly awake, and holds until it is one
// or the other again. So whatever comes and goes while the band is crossing turns that one band round, and never
// starts a second.
export function advance(b: Band, stream: boolean, pointer: boolean, struck: Start, entered: Start, dt: number): void {
  const want = stream || pointer;
  if (stream) b.stream = true; else if (pointer) b.stream = false;
  if (b.across <= 0 ? want : b.across >= 1 && !want) b.from = b.stream ? struck : entered;
  const over = b.stream ? WAKE.cross : WAKE.pointer[want ? 0 : 1];
  b.across = Math.max(0, Math.min(1, b.across + (want ? dt : -dt) / over));
}

// A band, written into a card's three numbers: the middle of its circle, from the card's middle, and the circle's
// radius, in CSS px with y down. hw and hh are half the card's size and unit one of its own units, in CSS px.
// amount is how far across it is, 0 to 1. It returns how brightly the band burns.
// It leaves fast, as a strike sends it, and slows across the card. Run back, it gathers speed.
export function band(wipe: Float32Array, hw: number, hh: number, unit: number, from: Start, amount: number): number {
  const k = Math.max(0, Math.min(1, amount)), back = WAKE.back * 2 * hw, clear = (WAKE.lead + 8) * unit;
  // One that has not set out is no circle at all: wherever it would start from, it has woken nothing.
  if (k <= 0) { wipe[0] = 0; wipe[1] = 0; wipe[2] = -1e5; return 0; }
  const cx = from[0] + from[2] * back, cy = from[1] + from[3] * back;
  // It starts and ends clear of the card, so its light is never cut off at an edge.
  const far = Math.max(Math.hypot(cx - hw, cy - hh), Math.hypot(cx + hw, cy - hh), Math.hypot(cx - hw, cy + hh), Math.hypot(cx + hw, cy + hh));
  wipe[0] = cx;
  wipe[1] = cy;
  wipe[2] = back - clear + (far + clear - (back - clear)) * (1 - (1 - k) ** 1.7);
  return Math.min(1, k / 0.04) * Math.min(1, (1 - k) / 0.07) * (0.62 + 0.38 * (1 - k));
}

// The mask a card's words wear when none of them shows.
export const VEILED = 'linear-gradient(transparent, transparent)';

// The mask a card's words wear while its band is crossing it: shown behind the band and hidden ahead. The band is a
// circle, so the mask is a round gradient. With no band the card is wholly awake and wears none.
export function veil(wipe: Float32Array | null, hw: number, hh: number, unit: number): string {
  if (!wipe) return 'none';
  const cx = wipe[0], cy = wipe[1], r = wipe[2] - WAKE.words[1] * unit;
  // A circle that has not yet reached the card shows nothing of it.
  if (r <= Math.hypot(Math.max(Math.abs(cx) - hw, 0), Math.max(Math.abs(cy) - hh, 0))) return VEILED;
  const whole = Math.max(0, wipe[2] - WAKE.words[0] * unit);
  return `radial-gradient(circle at ${(cx + hw).toFixed(1)}px ${(cy + hh).toFixed(1)}px, #000 ${whole.toFixed(1)}px, transparent ${r.toFixed(1)}px)`;
}
