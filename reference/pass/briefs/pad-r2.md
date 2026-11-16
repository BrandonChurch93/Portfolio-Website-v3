# Your piece: the launch pad in Contact (src/pieces/pad/). Round 2

## What you own this round
Only src/pieces/pad/ (its index.ts included). Stills in shots/pass/pad/ with the prefix r2-. Report: shots/pass/pad/r2-report.md. Read first: pad-r1.md (which still holds: what may not be touched, and his rulings), shots/pass/pad/r1-report.md and its two reviews (r1-report-review-1.md and -2.md, with their stills).

## Where it stands
Round 1 scored 5.5 and 5.5. Its clearest gain is kept: the stone near black before the landing and lighting ring by ring from its rim to its boss with a flare (LOOK.dark, LOOK.flare). The landing reads now. The fire's palette (no white, no blue). The tower's form. The reduced motion state.

But round 1 made the fire WORSE, and this is a section Brandon has seen and built on: nothing in it may be left worse than it was. The fire as it was is in git: git show HEAD:src/pieces/pad/parts/rocket/fire.ts (and the other pad files the same way: git diff HEAD -- src/pieces/pad shows everything round 1 changed). THE RULE FOR THIS ROUND: at its end, each thing is either plainly better than it was in git, shown side by side in real frames, or it is put back as it was in git. Say which, for each.

## FIRST: what broke
1. THE FIRE IS POURED PAINT. Before, it was a luminous smear, brightest at the bell, that read as light. Now it is "an opaque flat orange column with straight dripping streaks, reading as poured liquid or an orange pole", one flat orange through its whole length. Fire is light: additive, hottest and palest in a narrow column at the throat, falling off along it and across it, flame orange tongues as brighter licks at its edges, ember at its outer edge breaking into flakes. And it LIGHTS things: the bell, the fins, the deck, the tower's near side, the stone.
2. A COLUMN OF FIRE HANGS IN THE SKY WITH NO ROCKET. The tail is drawn up faster than the rocket leaves, so after the rocket has gone a detached slab of fire with dripping ends floats on the screen (worst on an iPad). The brief asked for "a tail that grows past the foot of the screen as the rocket climbs". The fire is always joined to the bell. While the rocket is on the screen its tail runs down from the bell as far as it has climbed, thinning with distance from the bell, its foot fading out, never ending in a blob or a drip. When the rocket has left the top of its host the fire leaves with it. If index.ts hides the rocket at a height that makes the last of the tail vanish in one frame, fix that in index.ts (it is yours): nothing pops.
3. IGNITION IS WEAKER THAN IT WAS. At 1.0 s nothing comes out of the bell, only a glow in the deck's hole, and at 1.4 s it is "a small pale bulb behind the deck", where before the engine's light plainly struck the stone. Ignition is the event of the section: a hard pale flash at the bell, a short bright jet from its mouth, light slamming onto the deck and the stone, tongues past the table's ends, all read at the page's size, before the lift.
4. THE SHOCK DIAMONDS are soft four point glows with halos: "soft round spots of light" fail on sight. Hard edged lozenges strung along the pale throat, no halo, no star.

## THEN
5. THE STONE'S MIDDLE AT IGNITION is still a smeared orange wash with glaring streaks on the plate tops. The carving stays readable: tops dark, the cuts carrying the heat.
6. READYING THE ROCKET shows as one pixel orange outlines and hatch squares, "a drawing on the body", gone at the page's size. Light its bands and rims in countable steps from its foot as the stone fills, each a band wide enough to read at the page's size.
7. THE ARMS swing 92 degrees about a vertical hinge, turn edge on and vanish into stubs within 0.3 s, so the spring is never seen, and at rest they stop about 10 units short of the rocket's skin. A swing the camera can see, eased and settling, and at rest they reach the skin.
8. THE ROCKET'S BODY AND FINS, only if all of the above is right: fins that are not flat black plates, a body that is not plain gloss black.

## Measure
Contact at its foot against the piece as it was: npm run perf -- "/lab/contact?ui=0" --scroll 100% on the dev server, and the same with --url http://127.0.0.1:5331, which serves the site as it was before round 1, one after the other so the machine's load is the same for both. Say both.

## How to look
Real frames first (npm run live) of the landing, the fill and the launch on /lab/contact?ui=0, at the page's size and on an iPad held sideways (1366 by 1024), beside the same from http://127.0.0.1:5331. Then three times alone.
