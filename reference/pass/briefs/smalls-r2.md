# Your pieces: the CPU, the reflector and the studio light. Round 2

## What you own this round
src/pieces/cpu/, src/pieces/reflector/, src/pieces/studio-light/, and ONE new shared file if you need it: src/world/glint.ts (the reflector now imports the glint from the studio light's folder: a piece may not reach into another piece, so what both use moves there). Stills in shots/pass/smalls/ with the prefix r2-. Report: shots/pass/smalls/r2-report.md. Read first: smalls-r1.md (which still holds), shots/pass/smalls/r1-report.md and its two reviews.

## Where it stands
Round 1 scored 6 and 6.5. Kept: the CPU's frosted copper etch, legible across the lid's dark half. The studio light's blooming bezel spot gone, and the glints held under the glow's threshold. The studio light's form untouched.

Two things came out worse than they were, and these are pieces Brandon has seen: nothing may be left worse than it is in git (git diff HEAD -- src/pieces/studio-light src/pieces/reflector src/pieces/cpu shows everything round 1 changed, and http://127.0.0.1:5331 serves the site as it was). The rule: at the end each thing is plainly better than it was, shown side by side, or put back as it was.

## FIRST: what came out worse
1. With the lamp low and to the left, the studio light's lower barn door is now "a pale tan board", about (148, 117, 90), the palest flat thing on the light. The doors are dark metal: the palette's bronze or copper, deep, with tight lines of light on their rolled edges and their hinge pins. Never a lit board.
2. With the lamp up and to the right, the front of the studio light is darker than it was. Bring it back at least to what it was.

## THEN
3. THE GLINT STOPS SLIDING. The studio light's glint eases by tanh(dx / 0.13), so it flips across the light within about 190 pixels of pointer travel and is pinned at one extreme everywhere else, and at the page's size it reads as the whole light changing sides. Widen the ease to about 0.35 to 0.5 of the screen, so a narrow glint keeps sliding along the drum, the yoke and the doors' edges wherever the pointer is on the page, including to the light's left, where the pointer mostly is.
4. THE REFLECTOR LOOKS THE SAME AS BEFORE in place. Its arm's links, its wall plate and its rim take a lit line that slides with the pointer and reads at its size on the page (220 pixels) beside the stream. Prove it in real frames of the pointer crossing.
5. THE REFLECTOR'S GIVE when the stream strikes it (5 degrees at 6 Hz) cannot be seen at the page's size. Make it seen, as weight (it gives, swings back, settles), or leave it as it was.
6. THE CPU: the lid still has a broad strip highlight that washes the etch. A tighter one, or a clear coat with its own tight highlight. The stream's line on the near edge is about 1 pixel at the page's size: about 2, so it reads.
7. NOT YOURS TO CHANGE, but say what you see: the reflector's dish throws a soft halo past its rim while the stream is on it. It was there before round 1 and it is Brandon's to rule on. Leave it exactly as it is, and put one still of it in your report.

## Measure
Frame times, fairly: npm run perf -- "/lab/skills?ui=0" --scroll 560 on the dev server and then at once the same with --url http://127.0.0.1:5331 (the pieces as they were), three times each, alternating, so the machine's load is the same for both. Report the count of frames over 25 ms for each run.
