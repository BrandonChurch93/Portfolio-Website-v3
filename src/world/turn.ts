import { clock } from './clock';

// On a screen that draws about 120 times a second a frame is too short for the desk and a row's thing both: with
// the two in view the page ran at half the screen's rate. So on such a screen the 3D things take turns, each drawn
// every other frame, the desk on one and the small things on the other. The page and the stream are still drawn
// every frame, and a thing whose turn it is not keeps what it has to draw for the next one. On a slower screen, and
// under a frozen clock, every frame is everybody's turn.
// A fast screen is known by its short frames. It stays known through a stretch of long ones, which on such a screen
// means the page is behind, and is forgotten only after some seconds with no short frame at all: the window has
// been moved to a slower screen.
const SHORT = 0.0105, KNOWN = 0.5, FORGET = 5;
let n = 0, share = 0, fast = false, since = 0;

clock.onFrame((_, dt) => {
  n++;
  if (dt <= 0) return;
  const short = dt < SHORT;
  share += ((short ? 1 : 0) - share) * 0.05;
  since = short ? 0 : since + dt;
  if (share > KNOWN) fast = true;
  else if (since > FORGET) fast = false;
});

export type Side = 0 | 1;
export const SIDE: { desk: Side; small: Side } = { desk: 0, small: 1 };
export const myTurn = (side: Side): boolean => !fast || clock.isFrozen() || n % 2 === side;
